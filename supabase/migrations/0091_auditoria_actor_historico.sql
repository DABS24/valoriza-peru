-- ============================================================================
-- 0091 · El actor de la bitácora es un HECHO HISTÓRICO, no una referencia viva
-- ============================================================================
-- CONTEXTO — corrige un defecto de diseño de la propia 0089.
--
--   0089 creó `portal_eventos_auditoria.actor_id` como
--   `uuid references auth.users(id) on delete set null`. Suena prolijo, pero en
--   una BITÁCORA es un error, por dos razones:
--
--   1. 🔴 BORRAR UNA CUENTA BORRA EL RASTRO. Con `on delete set null`, cuando se
--      elimina el usuario todos SUS eventos quedan sin actor. Es decir: quien
--      quiera ocultar lo que hizo solo tiene que borrar su cuenta. Eso destruye
--      justo aquello para lo que existe el registro. Una auditoría tiene que
--      poder decir "esto lo hizo esta persona" incluso —sobre todo— después de
--      que la persona ya no está.
--
--   2. ROMPE LA VERIFICACIÓN DE INTEGRIDAD. El sello (hash) de cada evento se
--      calcula al insertarlo, con el `actor_id` de ese momento. Un `set null`
--      MODIFICA la fila después, sin recalcular el sello. Resultado: cualquier
--      verificación honesta marcaría como adulterados eventos perfectamente
--      legítimos, y el registro dejaría de servir como prueba.
--
-- QUÉ HACE
--   · Quita la FK: `actor_id` pasa a ser un dato plano. La bitácora no depende del
--     ciclo de vida de la cuenta — el evento sobrevive al usuario, que es el punto.
--   · Agrega `actor_nombre`: SNAPSHOT del nombre al momento del hecho. Hoy el
--     nombre se resuelve contra `portal_miembros`; si esa membresía se borra, el
--     evento quedaba mostrando un UUID o "cuenta eliminada". Guardarlo al escribir
--     conserva la respuesta a "¿quién fue?" para siempre.
--   · Recalcula la fórmula del sello para incluir `actor_nombre`.
--
-- SEGURO DE APLICAR: la tabla está VACÍA (verificado: 0 filas antes de esta
-- migración), así que cambiar la fórmula del hash no invalida ninguna cadena
-- existente. La verificación de abajo lo comprueba y ABORTA si ya hubiera
-- historia, en vez de romperla en silencio.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi. Correr DESPUÉS de 0089.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0 · Guarda: si ya hay eventos, cambiar la fórmula del sello rompería la cadena.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  n bigint;
begin
  select count(*) into n from public.portal_eventos_auditoria;
  if n > 0 then
    raise exception
      '0091: la bitácora ya tiene % evento(s). Cambiar la fórmula del sello invalidaría la cadena existente. Resolver a mano (re-encadenar) antes de aplicar.', n;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · Quitar la FK de actor_id (buscada por definición, no por nombre asumido)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.portal_eventos_auditoria'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) like '%auth.users%'
  loop
    execute format('alter table public.portal_eventos_auditoria drop constraint %I', c.conname);
  end loop;
end $$;

comment on column public.portal_eventos_auditoria.actor_id is
  'Quién ejecutó la acción. SIN FK a propósito: es un hecho histórico, no una referencia viva. Si la cuenta se borra, el evento debe seguir diciendo quién fue — si no, borrarse la cuenta sería una forma de borrar el rastro.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · Snapshot del nombre al momento del hecho
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.portal_eventos_auditoria
  add column if not exists actor_nombre text;

comment on column public.portal_eventos_auditoria.actor_nombre is
  'Nombre del actor AL MOMENTO del evento (snapshot). Resolver el nombre contra portal_miembros funciona solo mientras la membresía exista; esto conserva la respuesta a "quién fue" aunque después se borre.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · El sello incluye el nombre (si no, sería el único dato del actor sin sellar
--     y se podría editar sin que la verificación lo note)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.portal_auditoria_hash(
  p_prev text, p_id uuid, p_portal text, p_actor_id uuid, p_actor_rol text,
  p_accion text, p_entidad text, p_entidad_id uuid, p_datos jsonb,
  p_created_at timestamptz, p_ip text, p_user_agent text, p_actor_nombre text
) returns text
  language sql immutable
  set search_path = public, extensions as $$
  select encode(
    digest(
      coalesce(p_prev, '')             || '|' ||
      coalesce(p_id::text, '')         || '|' ||
      coalesce(p_portal, '')           || '|' ||
      coalesce(p_actor_id::text, '')   || '|' ||
      coalesce(p_actor_rol, '')        || '|' ||
      coalesce(p_actor_nombre, '')     || '|' ||
      coalesce(p_accion, '')           || '|' ||
      coalesce(p_entidad, '')          || '|' ||
      coalesce(p_entidad_id::text, '') || '|' ||
      coalesce(p_datos::text, '')      || '|' ||
      coalesce(p_created_at::text, '') || '|' ||
      coalesce(p_ip, '')               || '|' ||
      coalesce(p_user_agent, ''),
      'sha256'
    ),
    'hex'
  );
$$;

-- La firma vieja (12 args) queda huérfana: se elimina para que nadie la use por error.
drop function if exists public.portal_auditoria_hash(
  text, uuid, text, uuid, text, text, text, uuid, jsonb, timestamptz, text, text
);

create or replace function public.portal_auditoria_encadenar() returns trigger
  language plpgsql security definer
  set search_path = public, extensions as $$
declare
  v_prev text;
begin
  perform pg_advisory_xact_lock(hashtext('portal_auditoria_chain_' || new.portal));
  new.seq := nextval('public.portal_eventos_auditoria_seq');
  select hash into v_prev
    from public.portal_eventos_auditoria
    where portal = new.portal
    order by seq desc limit 1;
  v_prev := coalesce(v_prev, '');
  new.prev_hash := v_prev;
  new.hash := public.portal_auditoria_hash(
    v_prev, new.id, new.portal, new.actor_id, new.actor_rol, new.accion,
    new.entidad, new.entidad_id, new.datos, new.created_at, new.ip,
    new.user_agent, new.actor_nombre
  );
  return new;
end $$;

drop trigger if exists trg_portal_auditoria_encadenar on public.portal_eventos_auditoria;
create trigger trg_portal_auditoria_encadenar
  before insert on public.portal_eventos_auditoria
  for each row execute function public.portal_auditoria_encadenar();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · Verificación
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_eventos_auditoria'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) like '%auth.users%'
  ) then
    raise exception '0091: la FK a auth.users sigue ahí — borrar una cuenta seguiría borrando el rastro';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'portal_eventos_auditoria'
      and column_name = 'actor_nombre'
  ) then
    raise exception '0091: falta la columna actor_nombre';
  end if;

  raise notice 'OK · 0091 aplicada · el actor de la bitácora sobrevive al borrado de la cuenta.';
end $$;
