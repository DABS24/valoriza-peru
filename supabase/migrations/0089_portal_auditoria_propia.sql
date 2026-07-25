-- ============================================================================
-- 0089 · Bitácora PROPIA de los portales (aislada de Don Gato Efectivo)
-- ============================================================================
-- CONTEXTO
--   Los portales de inversión son un negocio distinto de Don Gato Efectivo:
--   otra marca, otros clientes, otro marco legal. Su bitácora, sin embargo,
--   caía en `eventos_auditoria`, la tabla de Efectivo. Eso trae tres problemas
--   concretos, todos verificados en el código:
--
--   1. MEZCLA. `listAuditoria()` no filtra por entidad, así que el admin de
--      Efectivo veía eventos de los portales — con user id, IP y user-agent de
--      inversionistas que no son sus clientes.
--   2. BITÁCORA CIEGA. La RLS de `eventos_auditoria` es `es_admin()`, que
--      resuelve por `perfiles.rol` (tabla de Efectivo). El admin de un PORTAL no
--      puede leer ni un evento del suyo: su bitácora es hoy write-only.
--   3. EVENTOS QUE SE PIERDEN. `eventos_auditoria.actor_id` tiene FK a
--      `perfiles`. Un miembro de portal NO existe en `perfiles`, así que su id no
--      cabe: `lib/portales/auditoria.ts` lo manda en null y lo guarda dentro de
--      `datos`. Peor: las rutas compartidas (cambiar clave, apagar 2FA) sí
--      mandan el `user.id` real y el insert VIOLA la FK — y como no se revisa el
--      error, falla EN SILENCIO. Hoy, cambiar la contraseña en un portal no deja
--      rastro.
--
-- QUÉ HACE
--   Tabla propia `portal_eventos_auditoria` con la MISMA garantía tamper-evident
--   que la de Efectivo (hash-chain encadenado por trigger, fórmula idéntica a la
--   de 0049), pero con: columna `portal`, actor con FK a `auth.users` (donde el
--   miembro de portal SÍ existe), y RLS `portal_es_admin(portal)` para que cada
--   portal lea SU bitácora y solo la suya.
--
--   La cadena de hash es POR PORTAL: cgh y contratista no comparten historia, así
--   que ninguna auditoría puede usarse para inferir el volumen de la otra.
--
-- NO TOCA la tabla de Efectivo: los eventos históricos que ya cayeron ahí se
-- quedan (borrarlos rompería su hash-chain). Desde acá, lo nuevo va a esta.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi. Correr DESPUÉS de 0088.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · Tabla + secuencia (la secuencia da el orden total de la cadena)
-- ─────────────────────────────────────────────────────────────────────────────
create sequence if not exists public.portal_eventos_auditoria_seq;

create table if not exists public.portal_eventos_auditoria (
  id         uuid primary key default gen_random_uuid(),
  portal     text not null check (portal ~ '^[a-z][a-z0-9_]{1,31}$'),
  -- Actor REAL: acá sí cabe, porque un miembro de portal vive en auth.users.
  -- on delete set null: si se borra la cuenta, el evento se conserva (la bitácora
  -- no se puede reescribir borrando usuarios).
  actor_id   uuid references auth.users(id) on delete set null,
  actor_rol  text,
  accion     text not null,
  entidad    text not null,
  entidad_id uuid,
  datos      jsonb,
  ip         text,
  user_agent text,
  created_at timestamptz not null default now(),
  -- Cadena tamper-evident (las escribe el trigger, nunca la aplicación).
  seq        bigint,
  prev_hash  text,
  hash       text
);

comment on table public.portal_eventos_auditoria is
  'Bitácora de los portales de inversión, AISLADA de eventos_auditoria (Don Gato Efectivo). Tamper-evident por hash-chain, encadenada POR PORTAL. Cada portal lee solo la suya (RLS portal_es_admin). Espejo TS: lib/portales/auditoria.ts';

create index if not exists portal_auditoria_portal_idx
  on public.portal_eventos_auditoria(portal, created_at desc);
create index if not exists portal_auditoria_entidad_idx
  on public.portal_eventos_auditoria(portal, entidad, entidad_id);
create index if not exists portal_auditoria_actor_idx
  on public.portal_eventos_auditoria(portal, actor_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · Hash-chain POR PORTAL
--     Misma fórmula que public.auditoria_hash (0049) + el portal, para que la
--     cadena de una vertical no se pueda injertar en la otra.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.portal_auditoria_hash(
  p_prev text, p_id uuid, p_portal text, p_actor_id uuid, p_actor_rol text,
  p_accion text, p_entidad text, p_entidad_id uuid, p_datos jsonb,
  p_created_at timestamptz, p_ip text, p_user_agent text
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

create or replace function public.portal_auditoria_encadenar() returns trigger
  language plpgsql security definer
  set search_path = public, extensions as $$
declare
  v_prev text;
begin
  -- Lock POR PORTAL: dos portales pueden auditar en paralelo sin serializarse
  -- entre sí, pero dentro de un portal la cadena queda estrictamente ordenada.
  perform pg_advisory_xact_lock(hashtext('portal_auditoria_chain_' || new.portal));
  new.seq := nextval('public.portal_eventos_auditoria_seq');
  select hash into v_prev
    from public.portal_eventos_auditoria
    where portal = new.portal
    order by seq desc limit 1;
  v_prev := coalesce(v_prev, ''); -- génesis de ESE portal
  new.prev_hash := v_prev;
  new.hash := public.portal_auditoria_hash(
    v_prev, new.id, new.portal, new.actor_id, new.actor_rol, new.accion,
    new.entidad, new.entidad_id, new.datos, new.created_at, new.ip, new.user_agent
  );
  return new;
end $$;

drop trigger if exists trg_portal_auditoria_encadenar on public.portal_eventos_auditoria;
create trigger trg_portal_auditoria_encadenar
  before insert on public.portal_eventos_auditoria
  for each row execute function public.portal_auditoria_encadenar();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · RLS — el ADMIN de cada portal lee SU bitácora. Nadie escribe por sesión:
--     los eventos entran por el server (service_role), nunca desde el navegador,
--     así ni el staff puede fabricar un evento a mano.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.portal_eventos_auditoria enable row level security;

drop policy if exists portal_auditoria_admin_lee on public.portal_eventos_auditoria;
create policy portal_auditoria_admin_lee on public.portal_eventos_auditoria
  for select to authenticated using (public.portal_es_admin(portal));

-- Sin policies de insert/update/delete a propósito: append-only desde el server.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · Verificación
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  n_policies int;
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'portal_eventos_auditoria' and c.relrowsecurity
  ) then
    raise exception '0089: portal_eventos_auditoria quedó SIN row level security';
  end if;

  select count(*) into n_policies from pg_policies
  where schemaname = 'public' and tablename = 'portal_eventos_auditoria';
  if n_policies <> 1 then
    raise exception '0089: se esperaba 1 sola policy (select del admin), hay %', n_policies;
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_portal_auditoria_encadenar'
  ) then
    raise exception '0089: falta el trigger de hash-chain';
  end if;

  -- El guard NUNCA debe devolver NULL sin sesión (lección 0073: falla abierto).
  if public.portal_es_admin('contratista') is not false then
    raise exception '0089: portal_es_admin() devolvió % sin sesión',
      public.portal_es_admin('contratista');
  end if;

  raise notice 'OK · 0089 aplicada · los portales tienen bitácora propia, aislada de Efectivo.';
end $$;
