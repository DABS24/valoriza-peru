-- ============================================================================
-- 0080 · Perfil del EMPRESARIO — el prestatario (contratista) con login + dashboard
-- ============================================================================
-- CONTEXTO
--   El contratista que creamos y evaluamos (`portal_prestatarios`) pasa de ser un
--   registro gestionado por el staff a tener su PROPIA cuenta con un dashboard de
--   solo-ver: sus operaciones (vigentes / aprobadas / antiguas) y un botón para
--   mandarnos una oferta por WhatsApp. NO ve el lado inversionista, ni su scoring
--   interno, ni notas. La cuenta la crea el ADMIN.
--
-- MODELO (SSOT)
--   · Nuevo rol `empresario` en portal_rol.
--   · `portal_prestatarios.user_id` liga el prestatario a su cuenta auth (nullable:
--     no todo prestatario tiene login).
--   · La membresía va en portal_miembros (rol='empresario'), como todos los roles.
--   · La lectura de SUS operaciones se hace por función server acotada (service_role
--     + columnas explícitas, sin notas_internas), mismo patrón que el catálogo del
--     cliente. Por eso NO se agregan policies de lectura de empresario sobre
--     portal_oportunidades (evita exponer columnas sensibles fila-completa).
--
-- ⚠️ El `alter type ... add value` puede fallar si el editor lo envuelve en una
--    transacción junto con el resto. Si eso pasa, corré ESTA primera línea sola y
--    después el resto.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi. Correr DESPUÉS de 0077 (prestatarios).
-- ============================================================================

-- 1 · Nuevo rol
alter type portal_rol add value if not exists 'empresario';

-- 2 · Link prestatario ↔ cuenta auth
alter table public.portal_prestatarios
  add column if not exists user_id uuid references auth.users(id) on delete set null;

comment on column public.portal_prestatarios.user_id is
  'Cuenta auth del empresario (login al dashboard read-mostly). Nullable: no todo prestatario tiene cuenta.';

-- Un prestatario por cuenta (y viceversa). Índice parcial: solo cuando hay cuenta.
create unique index if not exists portal_prestatarios_user_idx
  on public.portal_prestatarios(user_id) where user_id is not null;

-- 3 · Helper: id del prestatario del empresario logueado (para RLS/funciones).
create or replace function public.portal_mi_prestatario_id(p_portal text) returns uuid
  language sql stable security definer set search_path = public as $$
  select id from public.portal_prestatarios
  where portal = p_portal and user_id = auth.uid();
$$;

revoke execute on function public.portal_mi_prestatario_id(text) from anon;
grant execute on function public.portal_mi_prestatario_id(text) to authenticated;

-- 4 · RLS: el empresario lee SU propia ficha de prestatario (datos básicos). El
--     scoring/notas NO se le muestran vía la función server (columnas explícitas);
--     pero como RLS es por-fila, esta policy deja leer la fila propia completa — por
--     eso la lectura del empresario SIEMPRE debe ir por la función server acotada,
--     nunca por select directo a portal_prestatarios desde el cliente.
--     (La incluimos para que el guard/dashboard pueda resolver "quién soy" sin
--     service_role si hace falta; el staff ya lee todo por su policy.)
drop policy if exists portal_prest_empresario_lee_suyo on public.portal_prestatarios;
create policy portal_prest_empresario_lee_suyo on public.portal_prestatarios
  for select to authenticated using (user_id = (select auth.uid()));

-- ── Verificación ──────────────────────────────────────────────────────────────
do $$
begin
  if public.portal_mi_prestatario_id('contratista') is not null then
    raise exception 'portal_mi_prestatario_id devolvió algo sin sesión';
  end if;
  raise notice 'OK · 0080 aplicada · rol empresario + prestatario.user_id + helper listos.';
end $$;
