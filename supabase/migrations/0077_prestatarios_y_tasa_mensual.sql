-- ============================================================================
-- 0077 · Prestatarios (contratistas) con scoring + historial · modelo tasa mensual
-- ============================================================================
-- CONTEXTO
--   Portal contratista (y a futuro otros): el que pide el crédito es una entidad
--   RECURRENTE — un contratista vuelve a pedir varias veces ("4ta. operación",
--   como inversiones.io). Necesitamos:
--     1) Un registro persistente del prestatario con su SCORING de pagador, para
--        evaluar si es buen o mal pagador entre operaciones. Lo gestiona el staff
--        (no es un login; el que loguea es el inversionista).
--     2) Ligar cada oportunidad a su prestatario → contamos su historial de
--        operaciones y mostramos "Nva. operación".
--     3) Simplificar las tasas: el staff ingresa SOLO la ganancia mensual (%). La
--        TNA (= mensual×12) y la TEA (= (1+mensual)^12 − 1) se DERIVAN en TS
--        (SSOT: no se guardan), y se muestran como inversiones.io.
--
--   No se borran las columnas viejas de tasa (rentabilidad_pct/tir_estimada/tasa)
--   para no romper nada en caliente; el código deja de usarlas. Se limpian luego.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · portal_prestatarios · el que pide el crédito (en contratista = el contratista)
--     Registro gestionado por el staff. nivel_riesgo acá = calificación de PAGADOR
--     (su color), distinta del riesgo de cada operación.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.portal_prestatarios (
  id             uuid primary key default gen_random_uuid(),
  portal         text not null check (portal ~ '^[a-z][a-z0-9_]{1,31}$'),
  nombre         text not null check (length(trim(nombre)) between 2 and 160),
  ruc            text check (ruc is null or ruc ~ '^\d{11}$'),
  -- Scoring de pagador (lo pone el staff). nivel = color; scoring_pago 0-100 opcional.
  nivel_riesgo   portal_nivel_riesgo,
  scoring_pago   int check (scoring_pago is null or (scoring_pago between 0 and 100)),
  rating         text check (rating is null or rating ~ '^[A-G]$'),
  notas_internas text check (notas_internas is null or length(notas_internas) <= 8000),
  estado         portal_estado_miembro not null default 'activo',
  creado_por     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.portal_prestatarios is
  'Prestatario recurrente (contratista) gestionado por el staff. Su scoring de pagador (nivel_riesgo/scoring_pago) sobrevive entre operaciones. NO es un login. Espejo TS: lib/portales/data.ts';
comment on column public.portal_prestatarios.nivel_riesgo is
  'Calificación de PAGADOR (color). Distinta del nivel_riesgo de cada oportunidad.';

create index if not exists portal_prestatarios_portal_idx on public.portal_prestatarios(portal);
create index if not exists portal_prestatarios_riesgo_idx on public.portal_prestatarios(portal, nivel_riesgo);

drop trigger if exists portal_prestatarios_updated_at on public.portal_prestatarios;
create trigger portal_prestatarios_updated_at before update on public.portal_prestatarios
  for each row execute function public.tg_updated_at();

-- RLS: solo staff del portal (el nombre del prestatario se expone al cliente vía la
-- oportunidad, no leyendo esta tabla; el scoring/notas son solo-staff).
alter table public.portal_prestatarios enable row level security;

drop policy if exists portal_prest_staff_lee on public.portal_prestatarios;
create policy portal_prest_staff_lee on public.portal_prestatarios
  for select to authenticated using (public.portal_es_staff(portal));
drop policy if exists portal_prest_staff_inserta on public.portal_prestatarios;
create policy portal_prest_staff_inserta on public.portal_prestatarios
  for insert to authenticated with check (public.portal_es_staff(portal));
drop policy if exists portal_prest_staff_actualiza on public.portal_prestatarios;
create policy portal_prest_staff_actualiza on public.portal_prestatarios
  for update to authenticated using (public.portal_es_staff(portal)) with check (public.portal_es_staff(portal));
drop policy if exists portal_prest_admin_borra on public.portal_prestatarios;
create policy portal_prest_admin_borra on public.portal_prestatarios
  for delete to authenticated using (public.portal_es_admin(portal));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · portal_oportunidades · link al prestatario + tasa mensual
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.portal_oportunidades
  add column if not exists prestatario_id uuid references public.portal_prestatarios(id) on delete set null;

alter table public.portal_oportunidades
  add column if not exists tasa_mensual numeric(6,3) check (tasa_mensual is null or tasa_mensual >= 0);

comment on column public.portal_oportunidades.tasa_mensual is
  'Ganancia mensual en %. FUENTE ÚNICA de las tasas: TNA (=mensual×12) y TEA (=(1+mensual/100)^12 − 1) se derivan en TS, NO se guardan. Reemplaza a rentabilidad_pct/tir_estimada/tasa (deprecadas).';

create index if not exists portal_op_prestatario_idx
  on public.portal_oportunidades(portal, prestatario_id) where prestatario_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Verificación
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if public.portal_es_staff('contratista') is not false then
    raise exception 'portal_es_staff() devolvió % sin sesión', public.portal_es_staff('contratista');
  end if;
  raise notice 'OK · 0077 aplicada · portal_prestatarios + oportunidades.prestatario_id + tasa_mensual listos.';
end $$;
