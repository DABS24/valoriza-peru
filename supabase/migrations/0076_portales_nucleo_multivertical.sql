-- ============================================================================
-- 0076 · Núcleo multi-vertical de PORTALES (reemplaza el gh_* de 0075)
-- ============================================================================
-- CONTEXTO
--   Arrancamos con dos portales secretos casi gemelos:
--     · /garantiahipotecaria (cgh)  → publica PROPIEDADES con garantía hipotecaria.
--     · /contratista        (contratista) → publica CONTRATISTAS del Estado que
--       piden financiamiento corto (2/4/6 meses) y ofrecen 1..N garantías (hipoteca,
--       factoring, cuentas por cobrar, cheque, pagaré, aval, cesión de flujos, mutuo…).
--   Comparten TODO menos el objeto publicado: mismas cuentas/roles (el admin crea
--   todo, sin KYC), misma reserva, mismo scoring con colores. CGH resulta ser un
--   caso particular de Contratista (garantía = hipotecaria).
--
-- DECISIÓN
--   En vez de dos silos (gh_* + ct_*) que dupliquen auth/CRUD/cards, un ÚNICO motor
--   parametrizado por `portal` (texto). Alineado con "nunca hardcodear la vertical"
--   del CLAUDE.md. Cada portal es una config en TS (lib/portales/*); la base es
--   genérica. Sumar una vertical futura = una fila de config, sin migración.
--
--   0075 creó gh_* (vacías). Esta migración las DESCARTA y las sustituye por el
--   esquema genérico. No hay datos que perder.
--
-- MODELO
--   portal_miembros           → quién es de cada portal y con qué rol (+ asesor).
--   portal_oportunidades      → el ítem publicado. Campos de lending comunes +
--                               `datos jsonb` para lo específico de la vertical.
--   portal_garantias          → 1..N respaldos por oportunidad. `tipo` ABIERTO.
--   portal_oportunidad_fotos  → metadata + hash; binario en bucket portal-media.
--   Helpers portal_mi_rol(p)/portal_es_staff(p)/portal_es_admin(p): un admin de un
--   portal NO manda en otro. coalesce(...,false) → nunca fallan abierto (lección 0073).
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0 · Descartar el gh_* de 0075 — idempotente
--     ORDEN IMPORTA: las policies de storage dependen de gh_es_staff(), así que
--     se dropean ANTES que las funciones. `cascade` en las funciones es el
--     cinturón por si quedó algún otro dependiente.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists gh_storage_insert on storage.objects;
drop policy if exists gh_storage_select on storage.objects;
drop policy if exists gh_storage_update on storage.objects;
drop policy if exists gh_storage_delete on storage.objects;
-- El bucket gh-propiedades NO se borra acá: Supabase bloquea el DELETE directo de
-- storage.buckets (usa la Storage API). Se elimina por API en el setup.

drop table if exists public.gh_propiedad_fotos cascade;
drop table if exists public.gh_propiedades     cascade;
drop table if exists public.gh_miembros        cascade;

drop function if exists public.gh_es_admin() cascade;
drop function if exists public.gh_es_staff() cascade;
drop function if exists public.gh_mi_rol() cascade;

drop type if exists gh_estado_propiedad;
drop type if exists gh_tipo_propiedad;
drop type if exists gh_nivel_riesgo;
drop type if exists gh_estado_miembro;
drop type if exists gh_rol;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · Enums genéricos (espejo TS en lib/portales/constants.ts)
--     `portal` y `garantia.tipo` NO son enums: texto abierto para escalar sin
--     migración. El set válido vive en TS.
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin create type portal_rol as enum ('cliente', 'asesor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin create type portal_estado_miembro as enum ('activo', 'inactivo');
exception when duplicate_object then null; end $$;

do $$ begin create type portal_nivel_riesgo as enum
  ('bajo', 'medio_bajo', 'medio', 'medio_alto', 'alto');
exception when duplicate_object then null; end $$;

do $$ begin create type portal_estado_oportunidad as enum
  ('borrador', 'disponible', 'reservada', 'cerrada');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · portal_miembros · membresía + rol por portal
--     PK compuesta (portal, user_id): un mismo user puede ser cliente en un portal
--     y asesor en otro. Escritura SOLO por service_role (el admin crea vía API):
--     sin policy de insert/update = nadie se auto-crea ni se auto-asciende.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.portal_miembros (
  portal      text not null check (portal ~ '^[a-z][a-z0-9_]{1,31}$'),
  user_id     uuid not null references auth.users(id) on delete cascade,
  rol         portal_rol not null,
  nombre      text not null check (length(trim(nombre)) between 2 and 120),
  telefono    text check (telefono is null or telefono ~ '^\+?\d{6,15}$'),
  -- Asesor asignado (cartera). Solo para clientes. uuid sin FK a propósito: la PK
  -- es compuesta y la app valida que el asesor exista y sea del MISMO portal.
  asesor_id   uuid,
  estado      portal_estado_miembro not null default 'activo',
  creado_por  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (portal, user_id)
);

comment on table public.portal_miembros is
  'Membresía de un portal secreto (cgh, contratista, …). Rol propio por portal, aislado de perfiles.rol de Efectivo. Espejo TS: lib/portales/roles.ts';
comment on column public.portal_miembros.asesor_id is
  'Asesor asignado al cliente (cartera). Debe ser un miembro del mismo portal; lo enforcea la app.';

create index if not exists portal_miembros_asesor_idx
  on public.portal_miembros(portal, asesor_id) where asesor_id is not null;
create index if not exists portal_miembros_rol_idx
  on public.portal_miembros(portal, rol);

drop trigger if exists portal_miembros_updated_at on public.portal_miembros;
create trigger portal_miembros_updated_at before update on public.portal_miembros
  for each row execute function public.tg_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Helpers portal-aware (security definer, coalesce = no falla abierto)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.portal_mi_rol(p_portal text) returns text
  language sql stable security definer set search_path = public as $$
  select rol::text from public.portal_miembros
  where portal = p_portal and user_id = auth.uid() and estado = 'activo';
$$;

create or replace function public.portal_es_staff(p_portal text) returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(public.portal_mi_rol(p_portal) in ('asesor', 'admin'), false);
$$;

create or replace function public.portal_es_admin(p_portal text) returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(public.portal_mi_rol(p_portal) = 'admin', false);
$$;

revoke execute on function
  public.portal_mi_rol(text), public.portal_es_staff(text), public.portal_es_admin(text)
  from anon;
grant execute on function
  public.portal_mi_rol(text), public.portal_es_staff(text), public.portal_es_admin(text)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · portal_oportunidades · el ítem publicado (propiedad / contratista)
--     Columnas comunes a todo lending; `datos jsonb` para lo específico de la
--     vertical (CGH: area_m2/valor_mercado/ltv/rango_hipoteca; Contratista:
--     entidad_estatal/tipo_contrato/ruc…). Cada portal valida `datos` con Zod server.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.portal_oportunidades (
  id                uuid primary key default gen_random_uuid(),
  portal            text not null check (portal ~ '^[a-z][a-z0-9_]{1,31}$'),
  titulo            text not null check (length(trim(titulo)) between 3 and 160),
  descripcion       text check (descripcion is null or length(descripcion) <= 8000),

  -- Ubicación (aplica a varias verticales)
  direccion         text check (direccion is null or length(trim(direccion)) <= 200),
  distrito          text check (distrito is null or length(trim(distrito)) <= 80),
  ciudad            text check (ciudad is null or length(trim(ciudad)) <= 80),

  -- Términos financieros comunes
  moneda            text not null default 'USD' check (moneda in ('PEN', 'USD')),
  monto_solicitado  numeric(14,2) check (monto_solicitado is null or monto_solicitado >= 0),
  plazo_meses_min   int check (plazo_meses_min is null or plazo_meses_min > 0),
  plazo_meses_max   int check (plazo_meses_max is null or plazo_meses_max > 0),
  tasa              numeric(6,2) check (tasa is null or tasa >= 0),
  rentabilidad_pct  numeric(6,2) check (rentabilidad_pct is null or rentabilidad_pct >= 0),
  tir_estimada      numeric(6,2) check (tir_estimada is null or tir_estimada >= 0),

  -- Scoring de riesgo (lo pone el staff)
  nivel_riesgo      portal_nivel_riesgo,
  rating            text check (rating is null or rating ~ '^[A-G]$'),
  notas_internas    text check (notas_internas is null or length(notas_internas) <= 8000),

  -- Específico de la vertical
  datos             jsonb not null default '{}'::jsonb,

  estado_publicacion portal_estado_oportunidad not null default 'borrador',
  creado_por        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  check (plazo_meses_max is null or plazo_meses_min is null or plazo_meses_max >= plazo_meses_min)
);

comment on table public.portal_oportunidades is
  'Ítem publicado en un portal (propiedad en cgh, contratista en contratista). Campos de lending comunes + datos jsonb por vertical. notas_internas NO se expone al cliente.';
comment on column public.portal_oportunidades.datos is
  'Campos específicos de la vertical. Validados por Zod en el server antes de escribir. Espejo: lib/portales/<portal>/schema.ts';

create index if not exists portal_op_portal_estado_idx
  on public.portal_oportunidades(portal, estado_publicacion);
create index if not exists portal_op_riesgo_idx
  on public.portal_oportunidades(portal, nivel_riesgo);
create index if not exists portal_op_creado_idx
  on public.portal_oportunidades(portal, created_at desc);

drop trigger if exists portal_oportunidades_updated_at on public.portal_oportunidades;
create trigger portal_oportunidades_updated_at before update on public.portal_oportunidades
  for each row execute function public.tg_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · portal_garantias · 1..N respaldos por oportunidad
--     `tipo` ABIERTO (texto): cada contratista ofrece lo que tenga. El set sugerido
--     vive en TS. `portal` denormalizado para RLS/índices simples (sin subqueries).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.portal_garantias (
  id             uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references public.portal_oportunidades(id) on delete cascade,
  portal         text not null check (portal ~ '^[a-z][a-z0-9_]{1,31}$'),
  tipo           text not null check (length(trim(tipo)) between 2 and 60),
  titulo         text check (titulo is null or length(trim(titulo)) <= 160),
  descripcion    text check (descripcion is null or length(descripcion) <= 4000),
  valor_estimado numeric(14,2) check (valor_estimado is null or valor_estimado >= 0),
  moneda         text not null default 'USD' check (moneda in ('PEN', 'USD')),
  datos          jsonb not null default '{}'::jsonb,
  orden          int not null default 0,
  created_at     timestamptz not null default now()
);

comment on table public.portal_garantias is
  'Respaldos que ofrece una oportunidad. En contratista son varios (hipoteca, factoring, cheque, pagaré, aval, cesión de flujos…); en cgh normalmente uno hipotecario. tipo es texto abierto.';

create index if not exists portal_garantias_op_idx
  on public.portal_garantias(oportunidad_id, orden);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6 · portal_oportunidad_fotos · metadata + hash (binario en Storage)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.portal_oportunidad_fotos (
  id             uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references public.portal_oportunidades(id) on delete cascade,
  garantia_id    uuid references public.portal_garantias(id) on delete cascade,
  portal         text not null check (portal ~ '^[a-z][a-z0-9_]{1,31}$'),
  bucket         text not null default 'portal-media',
  path           text not null,
  hash_sha256    text check (hash_sha256 is null or hash_sha256 ~ '^[a-f0-9]{64}$'),
  bytes          int check (bytes is null or bytes >= 0),
  mime           text,
  orden          int not null default 0,
  created_at     timestamptz not null default now(),
  unique (bucket, path)
);

comment on table public.portal_oportunidad_fotos is
  'Fotos de la oportunidad (o de una garantía si garantia_id no es null). Binario en Storage; acá metadata + hash. orden=0 es portada.';

create index if not exists portal_fotos_op_idx
  on public.portal_oportunidad_fotos(oportunidad_id, orden);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7 · RLS
--     · portal_miembros: cada uno lee lo suyo; staff del portal lee su portal.
--       Sin insert/update para authenticated (el admin escribe por service_role).
--     · oportunidades/garantias/fotos: staff del portal gestiona (CRUD); borrar
--       oportunidades solo el admin del portal. El catálogo del CLIENTE llegará
--       por función security-definer con gate de membresía (no toca la tabla base).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.portal_miembros          enable row level security;
alter table public.portal_oportunidades     enable row level security;
alter table public.portal_garantias         enable row level security;
alter table public.portal_oportunidad_fotos enable row level security;

-- portal_miembros
drop policy if exists portal_miembros_lee_suyo on public.portal_miembros;
create policy portal_miembros_lee_suyo on public.portal_miembros
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists portal_miembros_staff_lee on public.portal_miembros;
create policy portal_miembros_staff_lee on public.portal_miembros
  for select to authenticated
  using (public.portal_es_staff(portal));

-- portal_oportunidades
drop policy if exists portal_op_staff_lee on public.portal_oportunidades;
create policy portal_op_staff_lee on public.portal_oportunidades
  for select to authenticated using (public.portal_es_staff(portal));

drop policy if exists portal_op_staff_inserta on public.portal_oportunidades;
create policy portal_op_staff_inserta on public.portal_oportunidades
  for insert to authenticated with check (public.portal_es_staff(portal));

drop policy if exists portal_op_staff_actualiza on public.portal_oportunidades;
create policy portal_op_staff_actualiza on public.portal_oportunidades
  for update to authenticated
  using (public.portal_es_staff(portal)) with check (public.portal_es_staff(portal));

drop policy if exists portal_op_admin_borra on public.portal_oportunidades;
create policy portal_op_admin_borra on public.portal_oportunidades
  for delete to authenticated using (public.portal_es_admin(portal));

-- portal_garantias
drop policy if exists portal_gar_staff_lee on public.portal_garantias;
create policy portal_gar_staff_lee on public.portal_garantias
  for select to authenticated using (public.portal_es_staff(portal));

drop policy if exists portal_gar_staff_inserta on public.portal_garantias;
create policy portal_gar_staff_inserta on public.portal_garantias
  for insert to authenticated with check (public.portal_es_staff(portal));

drop policy if exists portal_gar_staff_actualiza on public.portal_garantias;
create policy portal_gar_staff_actualiza on public.portal_garantias
  for update to authenticated
  using (public.portal_es_staff(portal)) with check (public.portal_es_staff(portal));

drop policy if exists portal_gar_staff_borra on public.portal_garantias;
create policy portal_gar_staff_borra on public.portal_garantias
  for delete to authenticated using (public.portal_es_staff(portal));

-- portal_oportunidad_fotos
drop policy if exists portal_fotos_staff_lee on public.portal_oportunidad_fotos;
create policy portal_fotos_staff_lee on public.portal_oportunidad_fotos
  for select to authenticated using (public.portal_es_staff(portal));

drop policy if exists portal_fotos_staff_inserta on public.portal_oportunidad_fotos;
create policy portal_fotos_staff_inserta on public.portal_oportunidad_fotos
  for insert to authenticated with check (public.portal_es_staff(portal));

drop policy if exists portal_fotos_staff_actualiza on public.portal_oportunidad_fotos;
create policy portal_fotos_staff_actualiza on public.portal_oportunidad_fotos
  for update to authenticated
  using (public.portal_es_staff(portal)) with check (public.portal_es_staff(portal));

drop policy if exists portal_fotos_staff_borra on public.portal_oportunidad_fotos;
create policy portal_fotos_staff_borra on public.portal_oportunidad_fotos
  for delete to authenticated using (public.portal_es_staff(portal));

-- ─────────────────────────────────────────────────────────────────────────────
-- 8 · Storage · bucket único portal-media
--     Path = <portal>/<oportunidad_id>/<uuid>-<nombre>. La primera carpeta es el
--     portal → la policy exige ser staff de ESE portal. Solo imágenes, ≤2MB.
-- ─────────────────────────────────────────────────────────────────────────────

-- El bucket portal-media se crea por Storage API (Supabase bloquea DML directo de
-- storage.buckets en algunos proyectos). Acá solo las policies sobre storage.objects.

drop policy if exists portal_storage_insert on storage.objects;
create policy portal_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'portal-media'
    and public.portal_es_staff((storage.foldername(name))[1]));

drop policy if exists portal_storage_select on storage.objects;
create policy portal_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'portal-media'
    and public.portal_es_staff((storage.foldername(name))[1]));

drop policy if exists portal_storage_update on storage.objects;
create policy portal_storage_update on storage.objects for update to authenticated
  using (bucket_id = 'portal-media'
    and public.portal_es_staff((storage.foldername(name))[1]))
  with check (bucket_id = 'portal-media'
    and public.portal_es_staff((storage.foldername(name))[1]));

drop policy if exists portal_storage_delete on storage.objects;
create policy portal_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'portal-media'
    and public.portal_es_staff((storage.foldername(name))[1]));

-- ─────────────────────────────────────────────────────────────────────────────
-- 9 · Verificación incluida — aborta si algo quedó abierto
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if public.portal_es_admin('cgh') is not false then
    raise exception 'portal_es_admin() devolvió % sin sesión, se esperaba false', public.portal_es_admin('cgh');
  end if;
  if public.portal_es_staff('contratista') is not false then
    raise exception 'portal_es_staff() devolvió % sin sesión, se esperaba false', public.portal_es_staff('contratista');
  end if;
  raise notice 'OK · 0076 aplicada · núcleo portal_* (miembros, oportunidades, garantias, fotos, bucket portal-media) listo. gh_* de 0075 removido.';
end $$;
