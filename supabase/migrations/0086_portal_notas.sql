-- ============================================================================
-- 0086 · NOTAS del asesor sobre un cliente de su cartera (la libreta interna)
-- ============================================================================
-- CONTEXTO
--   El asesor de los portales de inversión no tiene dónde anotar nada. Hoy el
--   seguimiento de un inversionista vive en su cabeza o en su WhatsApp: qué se
--   habló, qué quedó pendiente, cuándo volver a llamarlo. Esta migración le da la
--   LIBRETA: una nota de texto por cliente y, opcionalmente, una PRÓXIMA ACCIÓN
--   (`recordar_en`) que después le vuelve como pendiente en su panel de alertas.
--
-- MODELO (SSOT)
--   · La nota es INTERNA del staff. El cliente/inversionista NUNCA la ve: no hay
--     ninguna policy que se la exponga, y su lado no lee esta tabla por ningún
--     camino (ni por RLS ni por funciones server).
--   · `cliente_id` apunta al MIEMBRO del portal (FK compuesta a portal_miembros,
--     no a auth.users): una nota solo puede ser sobre alguien que es miembro de
--     ESE portal, y si se borra la membresía la nota se va con ella.
--   · `recordar_en` es la próxima acción; `hecha` la cierra. Ambos derivan el
--     pendiente que ve el asesor: recordar_en <= hoy AND hecha = false.
--   · La AUTORIZACIÓN FINA (que el cliente sea de SU cartera, `asesor_id = él`)
--     la reimplementa el server en lib/portales/data.ts antes de cada escritura:
--     el `cliente_id` del body NUNCA se confía. La RLS de acá es la barrera
--     GRUESA (staff del portal, jamás el inversionista); la fina es la cartera.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi. Correr DESPUÉS de 0085.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · portal_notas
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.portal_notas (
  id          uuid primary key default gen_random_uuid(),
  portal      text not null check (portal ~ '^[a-z][a-z0-9_]{1,31}$'),
  -- Miembro del portal sobre quien es la nota. FK COMPUESTA: garantiza que el
  -- cliente pertenece a este mismo portal (no basta con que exista en auth.users).
  cliente_id  uuid not null,
  -- Staff que la escribió. Si se borra la cuenta, la nota queda sin autor pero no
  -- se pierde el registro del seguimiento.
  autor_id    uuid references auth.users(id) on delete set null,
  texto       text not null check (length(trim(texto)) between 1 and 2000),
  -- Próxima acción: cuándo volver a este cliente. null = nota suelta, sin agenda.
  recordar_en timestamptz,
  hecha       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint portal_notas_cliente_fk
    foreign key (portal, cliente_id)
    references public.portal_miembros(portal, user_id) on delete cascade
);

comment on table public.portal_notas is
  'Libreta INTERNA del staff sobre un cliente del portal: nota de seguimiento + próxima acción (recordar_en/hecha). El inversionista NUNCA la ve. La cartera (asesor_id = autor) la acota el server. Espejo TS: lib/portales/data.ts';
comment on column public.portal_notas.recordar_en is
  'Próxima acción sobre este cliente. Con hecha = false y recordar_en <= hoy, aparece como pendiente en el panel de alertas del asesor que la escribió.';
comment on column public.portal_notas.hecha is
  'La próxima acción ya se ejecutó. Cierra el recordatorio sin borrar la nota (el seguimiento histórico se conserva).';

-- Índices de los DOS filtros reales (§6: la policy y el filtro corren en cada query):
--   a) la ficha 360 lista las notas de un cliente, de la más nueva a la más vieja;
--   b) el panel de alertas busca MIS recordatorios vencidos y sin cerrar.
-- Ninguna de las dos columnas está cubierta por la PK (que es solo `id`).
create index if not exists portal_notas_cliente_idx
  on public.portal_notas(portal, cliente_id, created_at desc);
create index if not exists portal_notas_recordatorio_idx
  on public.portal_notas(portal, autor_id, recordar_en)
  where recordar_en is not null and hecha = false;

drop trigger if exists portal_notas_updated_at on public.portal_notas;
create trigger portal_notas_updated_at before update on public.portal_notas
  for each row execute function public.tg_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · RLS — STAFF del portal y NADIE MÁS
--     `portal_es_staff` es security definer y usa coalesce(..., false): sin sesión
--     devuelve false, nunca NULL (lección 0073: un guard que devuelve NULL falla
--     ABIERTO porque `if not NULL` no dispara). Acá el efecto es el mismo: una
--     policy que evalúa NULL no deja pasar la fila, pero se deja dicho para que
--     nadie "simplifique" el helper a algo que sí pueda devolver NULL.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.portal_notas enable row level security;

-- SELECT: ser staff NO alcanza. Una nota es la libreta privada de un asesor sobre
-- SU cliente: otro asesor del mismo portal no tiene por qué leerla (segregación
-- entre carteras). Se puede leer solo si: la escribí yo, o el cliente es de MI
-- cartera, o soy admin del portal (supervisión). La barrera vive acá, en SQL —
-- si viviera solo en la UI, un GET directo a PostgREST la saltaría.
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
    )
  );

-- INSERT: además de ser staff, la AUTORÍA no se puede falsificar (autor_id = yo).
-- El server ya lo escribe desde el guard, nunca desde el body; esto lo ancla.
drop policy if exists portal_notas_staff_crea on public.portal_notas;
create policy portal_notas_staff_crea on public.portal_notas
  for insert to authenticated
  with check (public.portal_es_staff(portal) and autor_id = (select auth.uid()));

-- UPDATE / DELETE: la nota es de quien la escribió (marcar hecha, corregir,
-- borrar). El ADMIN del portal puede además limpiar las de un asesor que ya no
-- está. `with check` repetido para que un UPDATE no pueda mover la fila fuera de
-- su dueño ni a otro portal.
drop policy if exists portal_notas_staff_actualiza on public.portal_notas;
create policy portal_notas_staff_actualiza on public.portal_notas
  for update to authenticated
  using (
    public.portal_es_staff(portal)
    and (autor_id = (select auth.uid()) or public.portal_es_admin(portal))
  )
  with check (
    public.portal_es_staff(portal)
    and (autor_id = (select auth.uid()) or public.portal_es_admin(portal))
  );

drop policy if exists portal_notas_staff_borra on public.portal_notas;
create policy portal_notas_staff_borra on public.portal_notas
  for delete to authenticated
  using (
    public.portal_es_staff(portal)
    and (autor_id = (select auth.uid()) or public.portal_es_admin(portal))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Verificación
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  n_policies int;
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'portal_notas' and c.relrowsecurity
  ) then
    raise exception '0086: portal_notas quedó SIN row level security';
  end if;

  select count(*) into n_policies from pg_policies
  where schemaname = 'public' and tablename = 'portal_notas';
  if n_policies <> 4 then
    raise exception '0086: se esperaban 4 policies en portal_notas, hay %', n_policies;
  end if;

  -- El guard NUNCA debe devolver NULL sin sesión (si no, falla abierto).
  if public.portal_es_staff('contratista') is not false then
    raise exception '0086: portal_es_staff() devolvió % sin sesión',
      public.portal_es_staff('contratista');
  end if;

  raise notice 'OK · 0086 aplicada · portal_notas lista (libreta del asesor, staff-only).';
end $$;
