-- 1001 · Invariantes que la auditoría del 2026-07-25 encontró viviendo solo en TS.
--
-- QUÉ: cierra cinco huecos donde la aplicación era la única barrera. El estándar
--      es claro: si la regla vive en la app, cualquier camino nuevo la salta — y
--      acá el camino nuevo ya existe, porque el browser habla directo con
--      PostgREST usando la anon key.
--
-- POR QUÉ CADA UNO: en el bloque de cada sección.
--
-- Idempotente: se puede correr dos veces sin daño.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · La policy de UPDATE de notas se quedó en 0086, sin la cartera.
--
-- 0090 endureció el INSERT para exigir que el sujeto sea de TU cartera, y dejó
-- el UPDATE con la condición vieja: solo autoría. Un asesor podía mover una nota
-- suya a la ficha del cliente de otro asesor con un PATCH directo a PostgREST.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists portal_notas_staff_actualiza on public.portal_notas;
create policy portal_notas_staff_actualiza on public.portal_notas
  for update to authenticated
  using (
    public.portal_es_staff(portal)
    and (autor_id = (select auth.uid()) or public.portal_es_admin(portal))
  )
  with check (
    public.portal_es_staff(portal)
    and autor_id = (select auth.uid())
    and (
      public.portal_es_admin(portal)
      or exists (
        select 1 from public.portal_miembros m
         where m.portal = portal_notas.portal
           and m.user_id = portal_notas.cliente_id
           and m.asesor_id = (select auth.uid())
      )
      or exists (
        select 1 from public.portal_prospectos p
         where p.id = portal_notas.prospecto_id
           and p.portal = portal_notas.portal
           and p.asesor_id = (select auth.uid())
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · Un prospecto no se marca convertido a mano.
--
-- La policy de INSERT de 0090 prohíbe nacer convertido; la de UPDATE no repetía
-- la restricción. Un asesor podía sellar `convertido_user_id` con cualquier uuid
-- y con eso sacar el prospecto de su lista y bloquear su conversión real.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists portal_prospectos_asesor_actualiza on public.portal_prospectos;
create policy portal_prospectos_asesor_actualiza on public.portal_prospectos
  for update to authenticated
  using (
    public.portal_es_staff(portal)
    and (asesor_id = (select auth.uid()) or public.portal_es_admin(portal))
  )
  with check (
    public.portal_es_staff(portal)
    and (asesor_id = (select auth.uid()) or public.portal_es_admin(portal))
    -- La conversión la hace SOLO `portal_convertir_prospecto` (admin, 0090).
    and (convertido_user_id is null or public.portal_es_admin(portal))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · `check (x >= 0)` NO rechaza NaN.
--
-- En `numeric`, NaN se ordena como el valor MÁS ALTO y `NaN >= 0` es TRUE. Un
-- NaN en un monto no explota: encabeza cualquier `order by`, contamina los
-- agregados y hace que la moneda dominante se elija mal. Falla silenciosa.
-- `comision_pct` estaba protegida por accidente, porque tiene cota superior.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.portal_oportunidades
  drop constraint if exists portal_oportunidades_monto_solicitado_check,
  add  constraint portal_oportunidades_monto_solicitado_check
    check (monto_solicitado is null
           or (monto_solicitado >= 0 and monto_solicitado <> 'NaN'::numeric));

alter table public.portal_oportunidades
  drop constraint if exists portal_oportunidades_tasa_mensual_check,
  add  constraint portal_oportunidades_tasa_mensual_check
    check (tasa_mensual is null
           or (tasa_mensual >= 0 and tasa_mensual <> 'NaN'::numeric));

alter table public.portal_garantias
  drop constraint if exists portal_garantias_valor_estimado_check,
  add  constraint portal_garantias_valor_estimado_check
    check (valor_estimado is null
           or (valor_estimado >= 0 and valor_estimado <> 'NaN'::numeric));

alter table public.portal_solicitudes
  drop constraint if exists portal_solicitudes_monto_check,
  add  constraint portal_solicitudes_monto_check
    check (monto is null or (monto >= 0 and monto <> 'NaN'::numeric));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · Las transiciones de una solicitud tienen guard.
--
-- 0087 declara que `retirada` es TERMINAL, y ese invariante vivía solo en TS.
-- La policy de staff da UPDATE de la fila completa, así que un PATCH directo
-- devolvía a `en_evaluacion` una solicitud que la empresa ya había retirado —
-- sin que la empresa lo supiera y sin evento en la bitácora.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.portal_solicitud_transicion()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado then
    if not (
      (old.estado = 'en_evaluacion' and new.estado in ('aprobada','rechazada','convertida','retirada'))
      or (old.estado = 'aprobada' and new.estado in ('convertida','rechazada'))
    ) then
      raise exception 'transicion_invalida: % -> %', old.estado, new.estado
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists portal_solicitud_transicion on public.portal_solicitudes;
create trigger portal_solicitud_transicion
  before update on public.portal_solicitudes
  for each row execute function public.portal_solicitud_transicion();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · Confirmar una reserva exige que EXISTA una reserva viva.
--
-- `portal_confirmar_reserva` (0079) hacía el claim sobre la OPORTUNIDAD primero
-- y después tocaba la reserva sin verificar cuántas filas afectó. Con la op
-- puesta en 'reservada' a mano, devolvía 'ok' y cerraba una operación SIN
-- contraparte — y la contraparte es el único registro del contrato bilateral.
-- Se invierte el orden: la reserva es la condición real.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.portal_confirmar_reserva(p_portal text, p_op uuid)
  returns text
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_n int;
begin
  if not coalesce(public.portal_es_staff(p_portal), false) then
    return 'sin_acceso';
  end if;

  update public.portal_reservas
     set estado = 'confirmada', resuelto_en = now(), resuelto_por = auth.uid()
   where oportunidad_id = p_op and portal = p_portal and estado = 'activa';
  get diagnostics v_n = row_count;
  if v_n = 0 then return 'no_reservada'; end if;

  update public.portal_oportunidades
     set estado_publicacion = 'cerrada', reservado_hasta = null
   where id = p_op and portal = p_portal and estado_publicacion = 'reservada';

  return 'ok';
end $$;

revoke execute on function public.portal_confirmar_reserva(text, uuid) from anon;
grant execute on function public.portal_confirmar_reserva(text, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificación: que quedó como se esperaba, no como se supone.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n from pg_policies
   where schemaname = 'public' and tablename = 'portal_notas'
     and policyname = 'portal_notas_staff_actualiza';
  if n <> 1 then raise exception '1001: falta la policy de notas'; end if;

  select count(*) into n from pg_trigger
   where tgname = 'portal_solicitud_transicion' and not tgisinternal;
  if n <> 1 then raise exception '1001: falta el trigger de transiciones'; end if;

  if (select 'NaN'::numeric >= 0) is not true then
    raise notice '1001: NaN ya no se ordena como el mayor — revisar los checks';
  end if;
end $$;
