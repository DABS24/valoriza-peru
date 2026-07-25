-- ============================================================================
-- 0078 · Flujo de RESERVA (cliente reserva 24h → asesor confirma o expira)
-- ============================================================================
-- CONTEXTO
--   El inversionista puede RESERVAR una oportunidad disponible. Es un compromiso:
--   la saca del pool y se la guarda 24h. Al asesor asignado le aparece en su cola
--   con cuenta regresiva; tiene 24h para continuar el proceso y CONFIRMAR (o
--   liberar). Si nadie confirma en 24h, vuelve sola al pool.
--
-- CONCURRENCIA (dongato-patterns §2)
--   La reserva es un UPDATE ATÓMICO CONDICIONAL dentro de una función
--   security-definer: `... where estado='disponible'` + chequeo de row_count. Dos
--   clientes NUNCA se quedan con la misma: el segundo recibe 'no_disponible'.
--   Nada de check-then-act desde el cliente.
--
-- ESTADOS (reusa el enum portal_estado_oportunidad, sin cambios):
--   disponible → (cliente reserva)        → reservada   (hold 24h)
--   reservada  → (asesor confirma)         → cerrada     (adjudicada / en proceso)
--   reservada  → (asesor libera / 24h)     → disponible  (vuelve al pool)
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · Columnas de hold en la oportunidad (para el claim atómico y el filtro del pool)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.portal_oportunidades
  add column if not exists reservado_por   uuid references auth.users(id) on delete set null;
alter table public.portal_oportunidades
  add column if not exists reservado_hasta timestamptz;

comment on column public.portal_oportunidades.reservado_hasta is
  'Vencimiento del hold de 24h. Si pasa y sigue reservada, portal_liberar_vencidas la devuelve al pool.';

create index if not exists portal_op_reservado_por_idx
  on public.portal_oportunidades(reservado_por) where reservado_por is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · Bitácora de reservas · historial del cliente + cola del asesor
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.portal_reservas (
  id             uuid primary key default gen_random_uuid(),
  portal         text not null check (portal ~ '^[a-z][a-z0-9_]{1,31}$'),
  oportunidad_id uuid not null references public.portal_oportunidades(id) on delete cascade,
  cliente_id     uuid not null references auth.users(id) on delete cascade,
  asesor_id      uuid references auth.users(id) on delete set null,
  estado         text not null default 'activa'
                   check (estado in ('activa', 'confirmada', 'expirada', 'cancelada')),
  reservado_en   timestamptz not null default now(),
  vence_en       timestamptz not null,
  resuelto_en    timestamptz,
  resuelto_por   uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

comment on table public.portal_reservas is
  'Bitácora de reservas. Alimenta el Historial del cliente y la cola del asesor. La escritura va SOLO por las funciones security-definer de abajo.';

create index if not exists portal_reservas_cliente_idx on public.portal_reservas(portal, cliente_id, created_at desc);
create index if not exists portal_reservas_asesor_idx  on public.portal_reservas(portal, asesor_id) where asesor_id is not null;
create index if not exists portal_reservas_activa_idx  on public.portal_reservas(portal, estado) where estado = 'activa';

alter table public.portal_reservas enable row level security;

-- El cliente lee SUS reservas; el staff del portal lee todas. Sin insert/update
-- para authenticated → solo las funciones security-definer escriben.
drop policy if exists portal_reservas_cliente_lee on public.portal_reservas;
create policy portal_reservas_cliente_lee on public.portal_reservas
  for select to authenticated using (cliente_id = (select auth.uid()));
drop policy if exists portal_reservas_staff_lee on public.portal_reservas;
create policy portal_reservas_staff_lee on public.portal_reservas
  for select to authenticated using (public.portal_es_staff(portal));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Funciones de transición (security definer, atómicas)
-- ─────────────────────────────────────────────────────────────────────────────

-- Cliente reserva: claim atómico sobre 'disponible'. Devuelve 'ok' | 'no_disponible' | 'sin_acceso'.
create or replace function public.portal_reservar(p_portal text, p_op uuid)
  returns text language plpgsql security definer set search_path = public as $$
declare v_rol text; v_asesor uuid; v_n int;
begin
  select rol, asesor_id into v_rol, v_asesor
    from public.portal_miembros
   where portal = p_portal and user_id = auth.uid() and estado = 'activo';
  if v_rol is null then return 'sin_acceso'; end if;

  -- Housekeeping: libera holds vencidos antes de intentar (por si este es uno).
  perform public.portal_liberar_vencidas(p_portal);

  update public.portal_oportunidades
     set estado = 'reservada', reservado_por = auth.uid(),
         reservado_hasta = now() + interval '24 hours'
   where id = p_op and portal = p_portal and estado = 'disponible';
  get diagnostics v_n = row_count;
  if v_n = 0 then return 'no_disponible'; end if;

  insert into public.portal_reservas (portal, oportunidad_id, cliente_id, asesor_id, estado, vence_en)
    values (p_portal, p_op, auth.uid(), v_asesor, 'activa', now() + interval '24 hours');
  return 'ok';
end $$;

-- Asesor/admin confirma la reserva → 'cerrada'. Devuelve 'ok' | 'no_reservada' | 'sin_acceso'.
create or replace function public.portal_confirmar_reserva(p_portal text, p_op uuid)
  returns text language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not public.portal_es_staff(p_portal) then return 'sin_acceso'; end if;
  update public.portal_oportunidades
     set estado = 'cerrada', reservado_hasta = null
   where id = p_op and portal = p_portal and estado = 'reservada';
  get diagnostics v_n = row_count;
  if v_n = 0 then return 'no_reservada'; end if;
  update public.portal_reservas
     set estado = 'confirmada', resuelto_en = now(), resuelto_por = auth.uid()
   where oportunidad_id = p_op and portal = p_portal and estado = 'activa';
  return 'ok';
end $$;

-- Libera una reserva → vuelve al pool. La puede llamar el staff (cualquiera) o el
-- cliente dueño de esa reserva. Devuelve 'ok' | 'no_reservada' | 'sin_acceso'.
create or replace function public.portal_liberar_reserva(p_portal text, p_op uuid)
  returns text language plpgsql security definer set search_path = public as $$
declare v_n int; v_owner uuid;
begin
  select reservado_por into v_owner
    from public.portal_oportunidades where id = p_op and portal = p_portal;
  if not public.portal_es_staff(p_portal) and v_owner is distinct from auth.uid() then
    return 'sin_acceso';
  end if;
  update public.portal_oportunidades
     set estado = 'disponible', reservado_por = null, reservado_hasta = null
   where id = p_op and portal = p_portal and estado = 'reservada';
  get diagnostics v_n = row_count;
  if v_n = 0 then return 'no_reservada'; end if;
  update public.portal_reservas
     set estado = 'cancelada', resuelto_en = now(), resuelto_por = auth.uid()
   where oportunidad_id = p_op and portal = p_portal and estado = 'activa';
  return 'ok';
end $$;

-- Housekeeping: devuelve al pool los holds vencidos. Idempotente; se llama al
-- cargar el pool/catálogo. Solo toca filas realmente vencidas.
create or replace function public.portal_liberar_vencidas(p_portal text)
  returns void language plpgsql security definer set search_path = public as $$
begin
  update public.portal_oportunidades
     set estado = 'disponible', reservado_por = null, reservado_hasta = null
   where portal = p_portal and estado = 'reservada' and reservado_hasta < now();
  update public.portal_reservas
     set estado = 'expirada', resuelto_en = now()
   where portal = p_portal and estado = 'activa' and vence_en < now();
end $$;

revoke execute on function
  public.portal_reservar(text, uuid), public.portal_confirmar_reserva(text, uuid),
  public.portal_liberar_reserva(text, uuid), public.portal_liberar_vencidas(text)
  from anon;
grant execute on function
  public.portal_reservar(text, uuid), public.portal_confirmar_reserva(text, uuid),
  public.portal_liberar_reserva(text, uuid), public.portal_liberar_vencidas(text)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · Verificación
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  -- Sin sesión, reservar debe negar (sin_acceso), no reventar ni reservar.
  if public.portal_reservar('cgh', gen_random_uuid()) <> 'sin_acceso' then
    raise exception 'portal_reservar sin sesión no devolvió sin_acceso';
  end if;
  raise notice 'OK · 0078 aplicada · reservas (hold 24h, claim atómico, bitácora) listo.';
end $$;
