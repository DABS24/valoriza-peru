-- ════════════════════════════════════════════════════════════════════════════
-- 1000 · FRONTERA con la base compartida — el portal deja de depender de nada
--        que no sea suyo.
--
-- CONTEXTO: este portal se separó a su propio repo el 2026-07-25, pero por ahora
-- sigue compartiendo el PROYECTO Supabase con el otro producto de la SAC (Don Gato
-- Efectivo) para no gastar otra cuota del plan gratis. La regla que se adopta es:
-- comparten el proyecto, pero se comportan como bases separadas.
--
-- QUÉ ARREGLA: al auditar la frontera apareció UN cruce real. Los 6 triggers
-- `portal_*_updated_at` ejecutaban `public.tg_updated_at()`, que es una función
-- DEL OTRO PRODUCTO (sus propias tablas la usan 10 veces). Eso traía dos problemas
-- concretos, ninguno visible hasta que doliera:
--
--   1. Si el otro repo renombra o dropea `tg_updated_at`, se rompen los updates de
--      6 tablas de ESTE portal. Un repo no debería poder romper al otro con un
--      cambio que en su propio código se ve inofensivo.
--   2. Al separar la base, `pg_dump -t 'portal_*'` NO se lleva esa función: el
--      restore quedaría con 6 triggers apuntando a algo que no existe. El corte
--      dejaba de ser un dump por prefijo y pasaba a ser arqueología.
--
-- Después de esta migración TODO lo del portal está bajo el prefijo `portal_*`
-- (11 tablas, 13 funciones, 4 enums, 7 triggers) y su única dependencia externa es
-- `auth.users`, que es del proyecto y no de ningún producto. Ver el runbook del
-- corte en docs-internal/SEPARAR_BASE.md.
--
-- NUMERACIÓN: arranca en 1000 a propósito. La base es una sola, así que la
-- secuencia de migraciones también: 0001–0091 ya están usadas y el otro repo sigue
-- en 0092. Este portal usa 1000+ para que nunca haya que coordinar un número entre
-- dos repos. Ver supabase/migrations/README.md.
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · Función propia de `updated_at`
--     Idéntica en comportamiento a la que se usaba; lo que cambia es de quién es.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.portal_tg_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.portal_tg_updated_at() is
  'Sella updated_at en las tablas portal_*. Propia del portal a propósito: antes se usaba la del otro producto de la base compartida, y eso ataba dos repos por un trigger. Ver 1000_frontera_base_compartida.sql';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · Los 6 triggers pasan a la función propia
--     `drop` + `create` porque un trigger no se puede reapuntar con ALTER.
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists portal_miembros_updated_at on public.portal_miembros;
create trigger portal_miembros_updated_at before update on public.portal_miembros
  for each row execute function public.portal_tg_updated_at();

drop trigger if exists portal_oportunidades_updated_at on public.portal_oportunidades;
create trigger portal_oportunidades_updated_at before update on public.portal_oportunidades
  for each row execute function public.portal_tg_updated_at();

drop trigger if exists portal_prestatarios_updated_at on public.portal_prestatarios;
create trigger portal_prestatarios_updated_at before update on public.portal_prestatarios
  for each row execute function public.portal_tg_updated_at();

drop trigger if exists portal_solicitudes_updated_at on public.portal_solicitudes;
create trigger portal_solicitudes_updated_at before update on public.portal_solicitudes
  for each row execute function public.portal_tg_updated_at();

drop trigger if exists portal_notas_updated_at on public.portal_notas;
create trigger portal_notas_updated_at before update on public.portal_notas
  for each row execute function public.portal_tg_updated_at();

drop trigger if exists portal_prospectos_updated_at on public.portal_prospectos;
create trigger portal_prospectos_updated_at before update on public.portal_prospectos
  for each row execute function public.portal_tg_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Verificación — que el resultado se pueda LEER, no suponer.
--     Devuelve una fila por trigger con la función que ejecuta: las 6 deben decir
--     `portal_tg_updated_at`. Si alguna dice otra cosa, la migración no terminó.
-- ─────────────────────────────────────────────────────────────────────────────
select
  c.relname                          as tabla,
  t.tgname                           as trigger,
  p.proname                          as funcion,
  (p.proname = 'portal_tg_updated_at') as ok
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and c.relname like 'portal_%'
  and t.tgname like '%updated_at'
order by c.relname;
