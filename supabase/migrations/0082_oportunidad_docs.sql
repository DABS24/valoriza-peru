-- ============================================================================
-- 0082 · Documentos por oportunidad (data room) — respaldo verificable
-- ============================================================================
-- CONTEXTO
--   El inversionista serio hace due diligence: quiere ver la TASACIÓN, el TÍTULO /
--   partida registral, el CONTRATO con el Estado, la CARTA FIANZA, etc. Hoy solo
--   hay fotos. Esta tabla guarda el metadata de esos documentos; el binario va al
--   bucket `portal-media` (que ahora admite PDF, habilitado por Storage API).
--
--   MISMO patrón que portal_oportunidad_fotos: staff gestiona por RLS; el cliente
--   los ve por función server acotada (service_role + URLs firmadas), nunca por
--   select directo. `tipo` es texto abierto (contrato/tasacion/titulo/carta_fianza/
--   otro); el set sugerido vive en TS.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi.
-- ============================================================================

create table if not exists public.portal_oportunidad_docs (
  id             uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references public.portal_oportunidades(id) on delete cascade,
  portal         text not null check (portal ~ '^[a-z][a-z0-9_]{1,31}$'),
  tipo           text not null check (length(trim(tipo)) between 2 and 40),
  nombre         text check (nombre is null or length(trim(nombre)) <= 160),
  bucket         text not null default 'portal-media',
  path           text not null,
  hash_sha256    text check (hash_sha256 is null or hash_sha256 ~ '^[a-f0-9]{64}$'),
  bytes          int check (bytes is null or bytes >= 0),
  mime           text,
  orden          int not null default 0,
  created_at     timestamptz not null default now(),
  unique (bucket, path)
);

comment on table public.portal_oportunidad_docs is
  'Documentos de respaldo de una oportunidad (tasación, título, contrato, carta fianza…). Binario en Storage; acá metadata + hash. El cliente los ve por función server acotada + URL firmada.';

create index if not exists portal_docs_op_idx
  on public.portal_oportunidad_docs(oportunidad_id, orden);

alter table public.portal_oportunidad_docs enable row level security;

-- Solo staff del portal gestiona (igual que las fotos). El cliente NO lee directo.
drop policy if exists portal_docs_staff_lee on public.portal_oportunidad_docs;
create policy portal_docs_staff_lee on public.portal_oportunidad_docs
  for select to authenticated using (public.portal_es_staff(portal));
drop policy if exists portal_docs_staff_inserta on public.portal_oportunidad_docs;
create policy portal_docs_staff_inserta on public.portal_oportunidad_docs
  for insert to authenticated with check (public.portal_es_staff(portal));
drop policy if exists portal_docs_staff_actualiza on public.portal_oportunidad_docs;
create policy portal_docs_staff_actualiza on public.portal_oportunidad_docs
  for update to authenticated using (public.portal_es_staff(portal)) with check (public.portal_es_staff(portal));
drop policy if exists portal_docs_staff_borra on public.portal_oportunidad_docs;
create policy portal_docs_staff_borra on public.portal_oportunidad_docs
  for delete to authenticated using (public.portal_es_staff(portal));

do $$
begin
  raise notice 'OK · 0082 aplicada · portal_oportunidad_docs (data room) listo. Recordá habilitar PDF en el bucket portal-media (se hace por Storage API en el setup).';
end $$;
