-- ============================================================================
-- 0084 · Solicitudes de financiamiento del EMPRESARIO (prestatario in-app)
-- ============================================================================
-- CONTEXTO
--   Hoy el empresario solo puede mandarnos una oferta por WhatsApp. Esta migración
--   le da un canal IN-APP: crea una SOLICITUD (monto, plazo, moneda, descripción) y
--   le adjunta documentos de respaldo. El staff la evalúa en el admin y, si va,
--   la CONVIERTE en una oportunidad publicable (link `oportunidad_id`).
--
-- MODELO (SSOT) — mismo criterio que el resto del empresario (0080/0081):
--   · La solicitud pertenece a un `portal_prestatarios` (la empresa del empresario).
--   · El empresario NO tiene policy de RLS sobre esta tabla: lee/escribe por
--     funciones/route handlers server con service_role que REIMPLEMENTAN la authz
--     (acotando a SU prestatario). Así nunca expone columnas de otro ni de staff.
--   · El STAFF sí gestiona por RLS (portal_es_staff): lista y resuelve
--     (aprobar/rechazar/convertir) con su sesión.
--   · Los documentos reusan `portal_oportunidad_docs`: ahora un doc cuelga de UNA
--     oportunidad O de UNA solicitud (exactamente uno), no de ambas.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi. Correr DESPUÉS de 0082 y 0083.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · portal_solicitudes
--     estado como texto + CHECK (no enum): más simple de versionar y basta acá.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.portal_solicitudes (
  id             uuid primary key default gen_random_uuid(),
  portal         text not null check (portal ~ '^[a-z][a-z0-9_]{1,31}$'),
  prestatario_id uuid not null references public.portal_prestatarios(id) on delete cascade,
  -- Cuenta del empresario que la creó (auditoría; nullable si se borra el usuario).
  creado_por     uuid references auth.users(id) on delete set null,
  monto          numeric(14,2) check (monto is null or monto >= 0),
  moneda         text not null default 'USD' check (moneda in ('PEN', 'USD')),
  plazo_meses    int check (plazo_meses is null or (plazo_meses between 1 and 120)),
  descripcion    text check (descripcion is null or length(descripcion) <= 4000),
  estado         text not null default 'en_evaluacion'
                   check (estado in ('en_evaluacion', 'aprobada', 'rechazada', 'convertida')),
  motivo_rechazo text check (motivo_rechazo is null or length(motivo_rechazo) <= 2000),
  -- Quién resolvió (aprobó/rechazó/convirtió) y cuándo.
  revisado_por   uuid references auth.users(id) on delete set null,
  revisado_en    timestamptz,
  -- Al convertir, se liga la oportunidad creada.
  oportunidad_id uuid references public.portal_oportunidades(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.portal_solicitudes is
  'Solicitud de financiamiento creada IN-APP por el empresario (prestatario). El staff la evalúa y, si va, la convierte en una oportunidad. El empresario lee/escribe por funciones server (service_role), no por RLS. Espejo TS: lib/portales/data.ts';

-- Índices: el listado del staff filtra por portal+estado; la lectura del empresario
-- filtra por su prestatario. Ambos son filtros frecuentes en tablas que crecen.
create index if not exists portal_solicitudes_estado_idx
  on public.portal_solicitudes(portal, estado);
create index if not exists portal_solicitudes_prestatario_idx
  on public.portal_solicitudes(prestatario_id);

drop trigger if exists portal_solicitudes_updated_at on public.portal_solicitudes;
create trigger portal_solicitudes_updated_at before update on public.portal_solicitudes
  for each row execute function public.tg_updated_at();

-- RLS: solo STAFF por sesión. El empresario va por service_role con authz a mano
-- (mismo criterio del hardening 0081: nada de policies que expongan filas al empresario).
alter table public.portal_solicitudes enable row level security;

drop policy if exists portal_solic_staff_lee on public.portal_solicitudes;
create policy portal_solic_staff_lee on public.portal_solicitudes
  for select to authenticated using (public.portal_es_staff(portal));
drop policy if exists portal_solic_staff_actualiza on public.portal_solicitudes;
create policy portal_solic_staff_actualiza on public.portal_solicitudes
  for update to authenticated using (public.portal_es_staff(portal)) with check (public.portal_es_staff(portal));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · portal_oportunidad_docs: un doc cuelga de UNA oportunidad O de UNA solicitud.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.portal_oportunidad_docs
  alter column oportunidad_id drop not null;

alter table public.portal_oportunidad_docs
  add column if not exists solicitud_id uuid references public.portal_solicitudes(id) on delete cascade;

-- Exactamente uno de los dos padres (xor). Idempotente: solo se agrega si falta.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'portal_docs_un_solo_padre'
      and conrelid = 'public.portal_oportunidad_docs'::regclass
  ) then
    alter table public.portal_oportunidad_docs
      add constraint portal_docs_un_solo_padre
      check ((oportunidad_id is not null) <> (solicitud_id is not null));
  end if;
end $$;

create index if not exists portal_docs_solicitud_idx
  on public.portal_oportunidad_docs(solicitud_id, orden) where solicitud_id is not null;

comment on column public.portal_oportunidad_docs.solicitud_id is
  'Solicitud a la que pertenece el doc (data room de la solicitud del empresario). Exactamente uno de oportunidad_id / solicitud_id es no-nulo.';

-- ── Verificación ──────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'portal_docs_un_solo_padre'
  ) then
    raise exception '0084: falta el check portal_docs_un_solo_padre';
  end if;
  raise notice 'OK · 0084 aplicada · portal_solicitudes + docs por solicitud listos.';
end $$;
