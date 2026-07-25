-- ============================================================================
-- 0088 · UNA sola reserva viva por oportunidad (invariante del modelo bilateral)
-- ============================================================================
-- POR QUÉ
--   Todo el encuadre del portal depende de que una operación tenga UN solo
--   inversionista: el contrato es bilateral (mutuo entre el inversionista y la
--   empresa) y Don Gato solo intermedia. Si dos inversionistas quedaran con una
--   reserva viva sobre la misma oportunidad, no habría forma de decir cuál de los
--   dos es la contraparte, ambos la verían en "Mi cartera", y el producto dejaría
--   de representar un contrato bilateral.
--
--   Hasta ahora ese invariante lo sostenía SOLO el claim atómico de
--   `portal_reservar` (0078/0079), que exige `estado_publicacion = 'disponible'`.
--   Pero hay OTRO camino: el staff edita la oportunidad y la devuelve a
--   'disponible' a mano (`actualizarOportunidad` → UPDATE directo, sin mirar
--   `portal_reservas` ni cerrar la reserva vigente). Con eso, la reserva anterior
--   sigue `activa` y un segundo inversionista puede reservar encima.
--
--   La regla no puede vivir en la aplicación, porque cualquier camino nuevo la
--   volvería a saltar. Vive acá: mientras exista una reserva `activa` o
--   `confirmada` sobre una oportunidad, la base RECHAZA una segunda. No importa
--   quién ni por dónde lo intente (app, PostgREST, SQL a mano).
--
-- QUÉ NO HACE
--   No impide que el staff cambie el estado de publicación (eso sigue siendo una
--   decisión suya, y a veces legítima: cancelar y republicar). Lo que impide es la
--   CONSECUENCIA corrupta: que se acumulen dos contrapartes sobre la misma
--   operación. Para republicar limpio, primero hay que cerrar la reserva vigente.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi. Correr DESPUÉS de 0087.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · Chequeo previo: si YA hubiera duplicados, el índice no se puede crear.
--     Mejor fallar acá con un mensaje claro que con un error opaco de Postgres.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  duplicadas int;
begin
  select count(*) into duplicadas from (
    select oportunidad_id
    from public.portal_reservas
    where estado in ('activa', 'confirmada')
    group by oportunidad_id
    having count(*) > 1
  ) d;

  if duplicadas > 0 then
    raise exception
      '0088: hay % oportunidad(es) con más de una reserva viva. Resolvé cuál es la contraparte real (cancelá las otras) y volvé a correr esta migración.',
      duplicadas;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · El invariante: máximo UNA reserva viva por oportunidad.
--     Índice único PARCIAL: solo mira las reservas que comprometen la operación
--     (activa = hold vivo, confirmada = cerrada pendiente de financiar). Las
--     expiradas y canceladas no estorban, así que una oportunidad puede volver al
--     pool y ser reservada por otro sin problema — que es el flujo normal.
-- ─────────────────────────────────────────────────────────────────────────────
create unique index if not exists portal_reservas_una_viva_por_op
  on public.portal_reservas(oportunidad_id)
  where estado in ('activa', 'confirmada');

comment on index public.portal_reservas_una_viva_por_op is
  'Invariante del modelo bilateral: una oportunidad tiene como máximo UNA reserva viva (activa/confirmada), o sea UN solo inversionista como contraparte. Sostiene el encuadre de contrato bilateral + intermediación, no solo la consistencia de la UI.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Verificación
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'portal_reservas'
      and indexname = 'portal_reservas_una_viva_por_op'
  ) then
    raise exception '0088: no se creó el índice portal_reservas_una_viva_por_op';
  end if;

  raise notice 'OK · 0088 aplicada · una oportunidad = un inversionista, garantizado por la base.';
end $$;
