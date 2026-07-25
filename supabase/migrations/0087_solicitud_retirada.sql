-- ============================================================================
-- 0087 · El empresario puede RETIRAR su propia solicitud
-- ============================================================================
-- CONTEXTO
--   Hoy el empresario manda la solicitud y ya no puede tocarla: si se equivocó en
--   el monto, su única salida es WhatsApp. Se le habilita editarla y retirarla,
--   SOLO mientras está en 'en_evaluacion' (después es inmutable para él).
--
--   Editar no necesita esquema nuevo (son columnas que ya existen). Retirar sí:
--   el CHECK de `estado` solo admitía en_evaluacion|aprobada|rechazada|convertida.
--   Se agrega 'retirada' — un ESTADO, no un borrado: la solicitud y sus documentos
--   quedan para auditoría, y el staff ve que la empresa se echó atrás.
--
-- AUTORIZACIÓN (sin cambios): el empresario NO tiene policy de RLS sobre
--   portal_solicitudes (hardening 0081). Sus escrituras van por route handlers con
--   service_role que REIMPLEMENTAN la authz acotando a SU prestatario, con el
--   estado dentro del mismo UPDATE condicional (nada de check-then-act).
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi. Correr DESPUÉS de 0084 y 0085.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · CHECK de `estado` + 'retirada'
--     Se busca el check vigente por su DEFINICIÓN (no por un nombre asumido): la
--     0084 pudo aplicarse con el nombre que le puso Postgres. Si ya admite
--     'retirada', no se toca nada.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  c record;
begin
  for c in
    select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
    where conrelid = 'public.portal_solicitudes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%en_evaluacion%'
      and pg_get_constraintdef(oid) not like '%retirada%'
  loop
    execute format('alter table public.portal_solicitudes drop constraint %I', c.conname);
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_solicitudes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%retirada%'
  ) then
    alter table public.portal_solicitudes
      add constraint portal_solicitudes_estado_check
      check (estado in ('en_evaluacion', 'aprobada', 'rechazada', 'convertida', 'retirada'));
  end if;
end $$;

comment on column public.portal_solicitudes.estado is
  'en_evaluacion (nace acá) · aprobada / rechazada (las resuelve el staff) · convertida (ya es una oportunidad) · retirada (la retiró la propia empresa). Una retirada NO se aprueba, NO se rechaza y NO se convierte: es terminal.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · Verificación
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_solicitudes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%retirada%'
  ) then
    raise exception '0087: el CHECK de portal_solicitudes.estado no admite retirada';
  end if;
  raise notice 'OK · 0087 aplicada · el empresario puede retirar su solicitud.';
end $$;
