-- ============================================================================
-- 0090 · El ASESOR bloquea a nombre de alguien (incluido quien todavía no tiene
--        cuenta): PROSPECTOS + titular dual en reservas y notas
-- ============================================================================
-- POR QUÉ
--   El producto estaba construido como marketplace self-service —el inversionista
--   entra, mira y reserva él mismo—, pero el negocio real (docs-internal/portales/
--   ENCUADRE_LEGAL.md §2) es presencial: el cliente va a la oficina, el asesor barre
--   el pool y CIERRA POR TELÉFONO, y **el asesor bloquea la operación, no el
--   cliente**. Además, la regla del negocio es que **solo se le crea cuenta a quien
--   ya hizo una operación**: en el momento del bloqueo el titular puede no existir
--   en `auth.users`.
--
--   Consecuencia hasta hoy: el asesor NO podía ejecutar el acto central de su
--   trabajo desde la app. Solo miraba. Operaba por WhatsApp, y la reserva —que es
--   el único registro de quién es la contraparte— quedaba fuera del sistema.
--
-- LA DECISIÓN QUE ESTA MIGRACIÓN TOMA: prospecto ≠ miembro
--   `portal_miembros` responde UNA pregunta: quién entra al portal y con qué rol.
--   Su PK es (portal, user_id) y de ella cuelgan TODOS los guards (portal_mi_rol,
--   portal_es_staff, la RLS de cada tabla) y la FK compuesta de `portal_notas`.
--   Meter ahí a alguien sin cuenta obligaría a volver `user_id` nullable, o sea a
--   rehacer la PK de la tabla de la que depende toda la autorización del portal —
--   y AUN ASÍ habría que tocar `portal_reservas`, porque su `cliente_id` apunta a
--   `auth.users`, donde el prospecto tampoco existe.
--
--   Además sería MENTIR sobre el dominio: `listarMiembros`, la cartera de asesores,
--   los KPIs de "inversionistas" y "clientes sin asesor" cuentan miembros. Un
--   prospecto que aparece ahí es alguien que no puede iniciar sesión contado como
--   usuario del portal.
--
--   Por eso el prospecto vive en su propia tabla, con identidad propia, historial
--   propio (reservas y notas) y un camino de conversión explícito. Es la misma
--   intención del "miembro sin acceso" —tener ficha, notas y trazabilidad— sin
--   tocar la PK de la que cuelga la seguridad.
--
-- TITULAR DUAL (reservas y notas)
--   `cliente_id` (miembro con cuenta) pasa a ser nullable y aparece `prospecto_id`.
--   El check exige AL MENOS UNO — no exactamente uno — a propósito: al convertir,
--   la MISMA fila gana `cliente_id` y CONSERVA `prospecto_id` como procedencia. Así
--   el historial no se duplica ni se pierde: la reserva que hizo el asesor cuando
--   el cliente no tenía cuenta sigue siendo la misma fila, ahora también suya.
--   La coherencia entre los dos titulares la garantiza que NADIE escribe estas
--   tablas directamente: `portal_reservas` no tiene policy de insert/update (0078)
--   y las únicas escrituras son las funciones security-definer de acá.
--
-- LO QUE NO CAMBIA (líneas rojas, ENCUADRE_LEGAL.md §3 y §7)
--   · El invariante de 0088 sigue intacto: UNA sola reserva viva por oportunidad.
--     Una operación = un inversionista. Esto NO abre co-inversión ni montos
--     parciales; el asesor registra a nombre de UNA persona.
--   · No se toca nada de dinero: no hay saldos, ni cuentas, ni abonos.
--   · No se crea registro público ni self-service: el prospecto NO tiene acceso.
--     Solo existe como registro interno del staff; su cuenta la sigue creando el
--     admin, y recién cuando ya operó.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi. Correr DESPUÉS de 0089.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · portal_prospectos · el titular que todavía no tiene cuenta
--
--   MÍNIMO EXIGIDO: nombre + teléfono. El documento queda OPCIONAL a propósito:
--   el bloqueo se decide en una llamada de teléfono y el hold dura 24 h sin mover
--   dinero; exigir un DNI que el asesor puede no tener encima lo devolvería a
--   WhatsApp, que es justo el problema que se está arreglando. El documento se
--   completa después (y es obligatorio de hecho al crear la cuenta).
--
--   `asesor_id` sin FK, igual que `portal_miembros.asesor_id` (0076): la PK de
--   aquella es compuesta y, además, si algún día se borra la cuenta del asesor el
--   prospecto NO debe irse con ella — es un registro del negocio, no suyo.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.portal_prospectos (
  id             uuid primary key default gen_random_uuid(),
  portal         text not null check (portal ~ '^[a-z][a-z0-9_]{1,31}$'),
  nombre         text not null check (length(trim(nombre)) between 2 and 120),
  -- Obligatorio: sin teléfono no hay forma de cerrar por teléfono, que es el flujo.
  telefono       text not null check (telefono ~ '^\+?\d{6,15}$'),
  tipo_documento text check (tipo_documento in ('dni', 'ce', 'pasaporte', 'ruc')),
  documento      text check (documento is null or documento ~ '^[A-Za-z0-9-]{6,20}$'),
  -- Staff dueño de la relación. La RLS acota por acá: la cartera del asesor.
  asesor_id      uuid not null,
  notas_contacto text check (notas_contacto is null or length(notas_contacto) <= 2000),
  -- Conversión: cuando el admin le crea la cuenta, acá queda a qué usuario quedó
  -- ligado este prospecto. `on delete set null` para no perder el registro si la
  -- cuenta se borra: el prospecto y su historial siguen existiendo.
  convertido_user_id uuid references auth.users(id) on delete set null,
  convertido_en      timestamptz,
  creado_por     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Los dos campos de conversión van juntos o no van: nunca "convertido a nadie".
  constraint portal_prospectos_conversion_chk
    check ((convertido_user_id is null) = (convertido_en is null))
);

comment on table public.portal_prospectos is
  'Inversionista SIN cuenta a nombre de quien el asesor bloquea una operación. NO es miembro del portal (no tiene acceso ni rol): la cuenta se le crea recién cuando ya operó, y ahí se marca convertido_user_id y su historial pasa a colgar también de esa cuenta. Espejo TS: lib/portales/data.ts';
comment on column public.portal_prospectos.asesor_id is
  'Staff del portal dueño de la relación (su cartera). Es la columna de la RLS: un asesor solo ve/opera sus prospectos; el admin del portal los ve todos.';
comment on column public.portal_prospectos.documento is
  'DNI/CE/pasaporte/RUC. OPCIONAL en el bloqueo (se cierra por teléfono, sin mover dinero) y se completa al crear la cuenta.';
comment on column public.portal_prospectos.convertido_user_id is
  'Cuenta a la que se convirtió este prospecto. Mientras sea null, el prospecto sigue vivo y se puede bloquear a su nombre; una vez convertido se reserva por su membresía, no por acá.';

-- Índices de los DOS filtros reales. `id` (la PK) no cubre ninguno:
--   a) la cartera del asesor y la RLS filtran por (portal, asesor_id);
--   b) el alta evita registrar dos veces a la misma persona por documento.
create index if not exists portal_prospectos_asesor_idx
  on public.portal_prospectos(portal, asesor_id, created_at desc);

-- Unicidad del documento DENTRO del portal e insensible a mayúsculas: dos asesores
-- registrando al mismo humano son dos "contrapartes" del mismo DNI, y al convertir
-- no habría forma de saber cuál historial es el bueno. Parcial: sin documento no
-- estorba (varios prospectos pueden estar sin DNI todavía).
create unique index if not exists portal_prospectos_documento_uq
  on public.portal_prospectos(portal, upper(documento))
  where documento is not null;

drop trigger if exists portal_prospectos_updated_at on public.portal_prospectos;
create trigger portal_prospectos_updated_at before update on public.portal_prospectos
  for each row execute function public.tg_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · RLS de portal_prospectos — staff del portal Y de SU cartera
--
--   Ser staff NO alcanza (mismo criterio que `portal_notas` en 0086): el prospecto
--   es la relación privada de un asesor. Otro asesor del mismo portal no tiene por
--   qué ver sus contactos; el ADMIN sí (supervisión). `portal_es_staff` /
--   `portal_es_admin` son security definer con coalesce(...,false): sin sesión dan
--   false, NUNCA null (lección 0073: un guard que devuelve NULL falla ABIERTO).
--
--   A diferencia de `portal_miembros`, acá SÍ hay policies de escritura: el alta la
--   hace el ASESOR con SU sesión, jamás service_role. La autoría no se puede
--   falsificar porque el with check exige `asesor_id = auth.uid()`.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.portal_prospectos enable row level security;

drop policy if exists portal_prospectos_staff_lee on public.portal_prospectos;
create policy portal_prospectos_staff_lee on public.portal_prospectos
  for select to authenticated using (
    public.portal_es_staff(portal)
    and (asesor_id = (select auth.uid()) or public.portal_es_admin(portal))
  );

drop policy if exists portal_prospectos_staff_crea on public.portal_prospectos;
create policy portal_prospectos_staff_crea on public.portal_prospectos
  for insert to authenticated
  with check (
    public.portal_es_staff(portal)
    and asesor_id = (select auth.uid())
    -- Nadie nace convertido: la conversión es un acto del admin, por función.
    and convertido_user_id is null
  );

-- UPDATE: corregir nombre/teléfono/documento del prospecto propio (o cualquiera si
-- es admin). El `with check` repetido impide mover la fila a otro portal o a la
-- cartera de otro asesor... salvo que quien lo mueve sea admin (reasignar cartera
-- es una atribución suya legítima).
drop policy if exists portal_prospectos_staff_actualiza on public.portal_prospectos;
create policy portal_prospectos_staff_actualiza on public.portal_prospectos
  for update to authenticated
  using (
    public.portal_es_staff(portal)
    and (asesor_id = (select auth.uid()) or public.portal_es_admin(portal))
  )
  with check (
    public.portal_es_staff(portal)
    and (asesor_id = (select auth.uid()) or public.portal_es_admin(portal))
  );

drop policy if exists portal_prospectos_staff_borra on public.portal_prospectos;
create policy portal_prospectos_staff_borra on public.portal_prospectos
  for delete to authenticated
  using (
    public.portal_es_staff(portal)
    and (asesor_id = (select auth.uid()) or public.portal_es_admin(portal))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · portal_reservas · titular dual (miembro con cuenta O prospecto)
--
--   `on delete restrict` en prospecto_id NO es un detalle: una reserva es el
--   registro de quién es la contraparte de un contrato bilateral. Borrar al
--   prospecto no puede llevarse ese registro por delante — primero hay que
--   resolver la reserva. (Las notas sí cascadean: son seguimiento, no contrato.)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.portal_reservas
  add column if not exists prospecto_id uuid
    references public.portal_prospectos(id) on delete restrict;

comment on column public.portal_reservas.prospecto_id is
  'Titular SIN cuenta de esta reserva (bloqueada por el asesor). Al convertirlo se completa cliente_id y esta columna QUEDA como procedencia: la fila es la misma, no se duplica el historial.';

-- Las filas que ya existen en producción tienen todas cliente_id (era not null),
-- así que soltar el not null no rompe ninguna: solo permite las nuevas.
alter table public.portal_reservas alter column cliente_id drop not null;

-- Al menos un titular. NO "exactamente uno": tras convertir, la misma fila lleva
-- los dos (cuenta + procedencia). Ver el encabezado.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'portal_reservas_titular_chk'
      and conrelid = 'public.portal_reservas'::regclass
  ) then
    alter table public.portal_reservas
      add constraint portal_reservas_titular_chk
      check (cliente_id is not null or prospecto_id is not null);
  end if;
end $$;

-- La ficha del prospecto lista SUS reservas: filtro real, sin cubrir por la PK.
create index if not exists portal_reservas_prospecto_idx
  on public.portal_reservas(portal, prospecto_id)
  where prospecto_id is not null;

-- El inversionista lee sus reservas con `cliente_id = auth.uid()` (0078). Con
-- cliente_id nullable esa policy sigue siendo correcta: null = uid da NULL, y una
-- policy que evalúa NULL no deja pasar la fila. O sea, las reservas de prospectos
-- son invisibles para cualquier inversionista. Se deja dicho para que nadie
-- "simplifique" esa policy a algo permisivo.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · portal_notas · la libreta también sobre un prospecto
--
--   La FK compuesta (portal, cliente_id) → portal_miembros sigue vigente y NO
--   estorba: en MATCH SIMPLE (el default de Postgres), si alguna columna de la
--   referencia es NULL la restricción se da por satisfecha. Con cliente_id null la
--   nota es de un prospecto y nadie exige que sea miembro.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.portal_notas
  add column if not exists prospecto_id uuid
    references public.portal_prospectos(id) on delete cascade;

comment on column public.portal_notas.prospecto_id is
  'La nota es sobre un prospecto (sin cuenta). Al convertirlo se completa cliente_id y la nota sigue siendo la misma fila. Cascade: si se borra el prospecto, su seguimiento se va con él (no es un contrato).';

alter table public.portal_notas alter column cliente_id drop not null;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'portal_notas_sujeto_chk'
      and conrelid = 'public.portal_notas'::regclass
  ) then
    alter table public.portal_notas
      add constraint portal_notas_sujeto_chk
      check (cliente_id is not null or prospecto_id is not null);
  end if;
end $$;

create index if not exists portal_notas_prospecto_idx
  on public.portal_notas(portal, prospecto_id, created_at desc)
  where prospecto_id is not null;

-- La policy de SELECT de 0086 solo sabía resolver "es de mi cartera" mirando
-- portal_miembros. Se reemplaza agregando la rama del prospecto: si la nota es
-- sobre un prospecto MÍO, la puedo leer. Sin esta rama, un asesor no podría leer
-- las notas que él mismo escribió si otro las creó sobre el mismo prospecto.
drop policy if exists portal_notas_staff_lee on public.portal_notas;
create policy portal_notas_staff_lee on public.portal_notas
  for select to authenticated using (
    public.portal_es_staff(portal)
    and (
      autor_id = (select auth.uid())
      or public.portal_es_admin(portal)
      or exists (
        select 1
        from public.portal_miembros m
        where m.portal = portal_notas.portal
          and m.user_id = portal_notas.cliente_id
          and m.asesor_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.portal_prospectos p
        where p.id = portal_notas.prospecto_id
          and p.portal = portal_notas.portal
          and p.asesor_id = (select auth.uid())
      )
    )
  );

-- INSERT: 0086 solo exigía "staff + la autoría es mía". La regla de CARTERA (que
-- el sujeto de la nota sea suyo) vivía únicamente en el server. Ahora que el
-- sujeto puede ser de dos tipos, se ancla también acá: un staff que hablara
-- directo con PostgREST no puede escribir en la libreta sobre un cliente o un
-- prospecto que no es suyo. El admin del portal sí (supervisión).
drop policy if exists portal_notas_staff_crea on public.portal_notas;
create policy portal_notas_staff_crea on public.portal_notas
  for insert to authenticated
  with check (
    public.portal_es_staff(portal)
    and autor_id = (select auth.uid())
    and (
      public.portal_es_admin(portal)
      or exists (
        select 1
        from public.portal_miembros m
        where m.portal = portal_notas.portal
          and m.user_id = portal_notas.cliente_id
          and m.asesor_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.portal_prospectos p
        where p.id = portal_notas.prospecto_id
          and p.portal = portal_notas.portal
          and p.asesor_id = (select auth.uid())
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · portal_reservar_para · el asesor bloquea A NOMBRE DE alguien
--
--   Espejo de `portal_reservar` (self-service del inversionista, vigente en 0081)
--   pero con el titular explícito. Mismas garantías, ninguna relajada:
--     · CLAIM ATÓMICO sobre `estado_publicacion = 'disponible'` + row_count. Nada
--       de check-then-act: si dos asesores empujan a la vez, el segundo rebota.
--     · ANTI-IDOR: el titular tiene que ser de SU cartera. El uuid que llega del
--       navegador NO autoriza; acá se re-resuelve contra la base. El admin del
--       portal puede sobre cualquiera (supervisión).
--     · GUARDS A PRUEBA DE NULL: todo lo que decide acceso pasa por
--       coalesce(..., false). Un `if not NULL` no dispara y dejaría pasar (0073).
--     · El hold sigue siendo de 24 h y la reserva entra a la MISMA cola: para todo
--       lo de aguas abajo (confirmar, liberar, expirar, financiar) es una reserva
--       normal.
--
--   `reservado_por` queda en NULL cuando el titular es un prospecto: esa columna
--   apunta a `auth.users` y no hay cuenta. No es un dato perdido — el titular vive
--   en `portal_reservas`, que es la fuente de verdad de la contraparte. Efecto
--   deseado en la UI del inversionista: la ve como "Reservada" (de otro), que es
--   exactamente lo que es.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.portal_reservar_para(
  p_portal text, p_op uuid, p_cliente uuid, p_prospecto uuid
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_es_admin boolean;
  v_asesor   uuid;
  v_rol      text;
  v_n        int;
begin
  -- 1 · Solo STAFF del portal. Un inversionista reserva por portal_reservar, no acá.
  if not public.portal_es_staff(p_portal) then return 'sin_acceso'; end if;
  v_es_admin := public.portal_es_admin(p_portal);

  -- 2 · UN solo titular por reserva. Los dos a la vez (o ninguno) es un llamado mal
  --     armado, no una co-inversión: eso está bloqueado a propósito (0088).
  if num_nonnulls(p_cliente, p_prospecto) <> 1 then return 'destinatario_invalido'; end if;

  -- 3 · ¿El titular es de SU cartera?
  if p_cliente is not null then
    select asesor_id, rol into v_asesor, v_rol
      from public.portal_miembros
     where portal = p_portal and user_id = p_cliente and estado = 'activo';
    -- Solo un INVERSIONISTA puede ser titular (el empresario no reserva, 0081).
    if v_rol is distinct from 'cliente' then return 'sin_acceso'; end if;
  else
    select asesor_id into v_asesor
      from public.portal_prospectos
     where id = p_prospecto and portal = p_portal and convertido_user_id is null;
    -- Prospecto inexistente, de otro portal o YA convertido (ese ya se reserva por
    -- su membresía): mismo 'sin_acceso', sin distinguir — anti-enumeración.
    if v_asesor is null then return 'sin_acceso'; end if;
  end if;

  if not coalesce(v_es_admin or v_asesor = auth.uid(), false) then
    return 'sin_acceso';
  end if;

  -- 4 · Housekeeping: soltar holds vencidos (por si esta operación es uno de ellos).
  perform public.portal_liberar_vencidas(p_portal);

  -- 5 · Claim atómico + bitácora, en un subbloque para poder revertir el claim.
  begin
    update public.portal_oportunidades
       set estado_publicacion = 'reservada',
           reservado_por      = p_cliente,   -- null si el titular no tiene cuenta
           reservado_hasta    = now() + interval '24 hours'
     where id = p_op and portal = p_portal and estado_publicacion = 'disponible';
    get diagnostics v_n = row_count;
    if v_n = 0 then return 'no_disponible'; end if;

    insert into public.portal_reservas
      (portal, oportunidad_id, cliente_id, prospecto_id, asesor_id, estado, vence_en)
    values
      (p_portal, p_op, p_cliente, p_prospecto,
       -- Cartera: el asesor del titular. Si no tiene (cliente huérfano y lo bloquea
       -- un admin), queda a nombre de quien actúa, para que aparezca en SU cola.
       coalesce(v_asesor, auth.uid()), 'activa', now() + interval '24 hours');
  exception when unique_violation then
    -- 0088: ya existe una reserva VIVA sobre esta oportunidad (el caso real: el
    -- staff la devolvió a 'disponible' a mano sin cerrar la reserva anterior). El
    -- subbloque revierte el claim, así la operación no queda 'reservada' con dos
    -- contrapartes ni con una contraparte que no se registró.
    return 'no_disponible';
  end;

  return 'ok';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6 · portal_convertir_prospecto · el prospecto ya tiene cuenta
--
--   Se llama DESPUÉS de crear la membresía (alta de usuario del admin), con la
--   SESIÓN del admin — no con service_role: acá `auth.uid()` tiene que existir para
--   que el guard signifique algo.
--
--   No copia nada: re-apunta las MISMAS filas. El historial que el prospecto
--   construyó (reservas y notas) pasa a colgar también de su cuenta, conservando
--   `prospecto_id` como procedencia. Cero duplicación (§3 dongato-patterns).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.portal_convertir_prospecto(
  p_portal text, p_prospecto uuid, p_user uuid
) returns text language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  -- La conversión crea el acceso de alguien: es acto de ADMIN del portal.
  if not public.portal_es_admin(p_portal) then return 'sin_acceso'; end if;

  -- El destino tiene que ser YA un inversionista activo de ESTE portal. Si no, la
  -- FK compuesta de portal_notas rebotaría a mitad de camino.
  if not exists (
    select 1 from public.portal_miembros
     where portal = p_portal and user_id = p_user and rol = 'cliente' and estado = 'activo'
  ) then
    return 'miembro_invalido';
  end if;

  -- Marca condicional: `convertido_user_id is null` dentro del UPDATE. Si dos
  -- altas simultáneas apuntan al mismo prospecto, la segunda recibe 'no_aplica'.
  update public.portal_prospectos
     set convertido_user_id = p_user, convertido_en = now()
   where id = p_prospecto and portal = p_portal and convertido_user_id is null;
  get diagnostics v_n = row_count;
  if v_n = 0 then return 'no_aplica'; end if;

  update public.portal_reservas
     set cliente_id = p_user
   where portal = p_portal and prospecto_id = p_prospecto and cliente_id is null;

  update public.portal_notas
     set cliente_id = p_user
   where portal = p_portal and prospecto_id = p_prospecto and cliente_id is null;

  -- Un hold TODAVÍA VIVO tiene que quedar a nombre de su cuenta. Si no, el
  -- inversionista entra por primera vez y ve su propia operación como "Reservada"
  -- por otro, sin poder ni descargar su constancia.
  update public.portal_oportunidades o
     set reservado_por = p_user
    from public.portal_reservas r
   where r.oportunidad_id = o.id
     and r.portal = p_portal
     and r.prospecto_id = p_prospecto
     and r.estado = 'activa'
     and o.estado_publicacion = 'reservada'
     and o.reservado_por is null;

  return 'ok';
end $$;

revoke execute on function
  public.portal_reservar_para(text, uuid, uuid, uuid),
  public.portal_convertir_prospecto(text, uuid, uuid)
  from anon;
grant execute on function
  public.portal_reservar_para(text, uuid, uuid, uuid),
  public.portal_convertir_prospecto(text, uuid, uuid)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7 · Verificación — aborta si algo quedó abierto o a medias
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare n_policies int;
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'portal_prospectos' and c.relrowsecurity
  ) then
    raise exception '0090: portal_prospectos quedó SIN row level security';
  end if;

  select count(*) into n_policies from pg_policies
  where schemaname = 'public' and tablename = 'portal_prospectos';
  if n_policies <> 4 then
    raise exception '0090: se esperaban 4 policies en portal_prospectos, hay %', n_policies;
  end if;

  -- Se reemplazaron 2 de las 4 policies de portal_notas (select + insert); tienen
  -- que seguir siendo 4: si quedaron 3, una se dropeó y no se volvió a crear.
  select count(*) into n_policies from pg_policies
  where schemaname = 'public' and tablename = 'portal_notas';
  if n_policies <> 4 then
    raise exception '0090: se esperaban 4 policies en portal_notas, hay %', n_policies;
  end if;

  -- El invariante del modelo bilateral (0088) NO se relajó.
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'portal_reservas'
      and indexname = 'portal_reservas_una_viva_por_op'
  ) then
    raise exception '0090: desapareció el índice de 0088 (una reserva viva por oportunidad)';
  end if;

  -- Ninguna fila puede quedar sin titular.
  if exists (
    select 1 from public.portal_reservas where cliente_id is null and prospecto_id is null
  ) then
    raise exception '0090: hay reservas sin titular (ni cliente_id ni prospecto_id)';
  end if;

  -- Los guards NUNCA devuelven NULL sin sesión (si no, fallan ABIERTO — 0073).
  if public.portal_es_staff('cgh') is not false then
    raise exception '0090: portal_es_staff() devolvió % sin sesión', public.portal_es_staff('cgh');
  end if;
  if public.portal_reservar_para('cgh', gen_random_uuid(), gen_random_uuid(), null) <> 'sin_acceso' then
    raise exception '0090: portal_reservar_para sin sesión no devolvió sin_acceso';
  end if;
  if public.portal_convertir_prospecto('cgh', gen_random_uuid(), gen_random_uuid()) <> 'sin_acceso' then
    raise exception '0090: portal_convertir_prospecto sin sesión no devolvió sin_acceso';
  end if;

  raise notice 'OK · 0090 aplicada · el asesor bloquea a nombre de un cliente o de un prospecto sin cuenta; el historial se conserva al convertirlo.';
end $$;
