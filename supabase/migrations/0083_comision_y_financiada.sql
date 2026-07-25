-- ============================================================================
-- 0083 · Comisión de intermediación + marca de "financiada" (ciclo post-reserva)
-- ============================================================================
-- CONTEXTO
--   Don Gato es intermediario: no toca el dinero, cobra COMISIÓN por conectar.
--   `comision_pct` guarda ese % por operación (para el KPI de ingresos del admin;
--   el valor lo decide el negocio). `financiada_en` cierra el ciclo post-reserva:
--   tras confirmar ('cerrada'), el asesor marca cuándo la operación quedó
--   FINANCIADA (el inversionista transfirió directo al prestatario, fuera de la
--   plataforma). El timeline del inversionista refleja ese paso.
--
--   Ambas columnas las escribe el STAFF (RLS de portal_oportunidades ya lo cubre:
--   update por `portal_es_staff`). No hace falta función nueva.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi.
-- ============================================================================

alter table public.portal_oportunidades
  add column if not exists comision_pct numeric(6,3)
    check (comision_pct is null or (comision_pct >= 0 and comision_pct <= 100));

alter table public.portal_oportunidades
  add column if not exists financiada_en timestamptz;

comment on column public.portal_oportunidades.comision_pct is
  '% de comisión de intermediación de Don Gato sobre el monto. Lo decide el negocio; alimenta el KPI de ingresos del admin. No se cobra en la plataforma (somos intermediarios).';
comment on column public.portal_oportunidades.financiada_en is
  'Cuándo el asesor marcó la operación como FINANCIADA (transferencia directa inversionista→prestatario, fuera de la plataforma). Cierra el ciclo post-reserva.';

do $$
begin
  raise notice 'OK · 0083 aplicada · comision_pct + financiada_en en portal_oportunidades.';
end $$;
