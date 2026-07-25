-- ============================================================================
-- 0085 · Alinear portal_solicitudes al código final del empresario
-- ============================================================================
-- La 0084 se aplicó a prod con una versión PREVIA del esquema (columna
-- `monto_solicitado`, con `titulo`, sin policy de UPDATE del staff, y el check de
-- docs con otro nombre). El código final del empresario usa `monto`, no usa
-- `titulo`, y el staff resuelve (aprobar/rechazar/convertir) POR SESIÓN → necesita
-- la policy de update. La tabla `portal_solicitudes` está VACÍA, así que el rename
-- es seguro. Todo idempotente y con guardas.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Proyecto: wgoypefflbxxvyscovfi.
-- ============================================================================

-- 1 · monto_solicitado → monto (solo si aplica; tabla vacía)
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='portal_solicitudes' and column_name='monto_solicitado')
     and not exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='portal_solicitudes' and column_name='monto') then
    alter table public.portal_solicitudes rename column monto_solicitado to monto;
  end if;
end $$;

-- 2 · quitar `titulo` (el código no la usa)
alter table public.portal_solicitudes drop column if exists titulo;

-- 3 · default de moneda USD (coherente con el código)
alter table public.portal_solicitudes alter column moneda set default 'USD';

-- 4 · policy de UPDATE del staff (aprobar / rechazar / convertir por sesión)
drop policy if exists portal_solic_staff_actualiza on public.portal_solicitudes;
create policy portal_solic_staff_actualiza on public.portal_solicitudes
  for update to authenticated using (public.portal_es_staff(portal))
  with check (public.portal_es_staff(portal));

-- 5 · alinear el nombre del check de docs (mismo efecto xor)
do $$ begin
  if exists (select 1 from pg_constraint where conname='portal_docs_uno_dueno')
     and not exists (select 1 from pg_constraint where conname='portal_docs_un_solo_padre') then
    alter table public.portal_oportunidad_docs
      rename constraint portal_docs_uno_dueno to portal_docs_un_solo_padre;
  end if;
end $$;

do $$ begin raise notice 'OK · 0085 · portal_solicitudes alineada al código (monto + policy update staff).'; end $$;
