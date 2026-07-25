-- ============================================================================
-- 0081 · Hardening del EMPRESARIO — cierra dos huecos que dejó 0080
-- ============================================================================
-- CONTEXTO
--   El browser habla DIRECTO a PostgREST con la anon key: una guard en el route
--   handler NO alcanza, la barrera real está en SQL (RLS + funciones). 0080 dejó
--   dos caminos por los que un empresario logueado podía cruzar al lado que NO
--   debe tocar:
--
--   1) RESERVAR como inversionista. `portal_reservar` (0078) solo exigía membresía
--      activa (`v_rol is null`), así que un empresario —que ES miembro— podía
--      llamar el RPC directo y apartar oportunidades. El empresario NUNCA reserva.
--
--   2) LEER su propio scoring/notas. La policy `portal_prest_empresario_lee_suyo`
--      (0080) daba `select` de la FILA COMPLETA de su prestatario a authenticated,
--      y PostgREST deja pedir cualquier columna → el empresario podía leer
--      `scoring_pago` y `notas_internas` (datos internos) con un select directo.
--      El dashboard ya lee su ficha por función server acotada (service_role,
--      columnas explícitas), así que esta policy no hace falta: se elimina.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente.
--               Proyecto: wgoypefflbxxvyscovfi. Correr DESPUÉS de 0080.
-- ============================================================================

-- 1 · portal_reservar: rechazar al empresario (además de "sin membresía").
create or replace function public.portal_reservar(p_portal text, p_op uuid)
  returns text language plpgsql security definer set search_path = public as $$
declare v_rol text; v_asesor uuid; v_n int;
begin
  select rol, asesor_id into v_rol, v_asesor
    from public.portal_miembros
   where portal = p_portal and user_id = auth.uid() and estado = 'activo';
  -- El empresario (prestatario con cuenta) NO es inversionista: no reserva.
  if v_rol is null or v_rol = 'empresario' then return 'sin_acceso'; end if;

  -- Housekeeping: libera holds vencidos antes de intentar (por si este es uno).
  perform public.portal_liberar_vencidas(p_portal);

  update public.portal_oportunidades
     set estado_publicacion = 'reservada', reservado_por = auth.uid(),
         reservado_hasta = now() + interval '24 hours'
   where id = p_op and portal = p_portal and estado_publicacion = 'disponible';
  get diagnostics v_n = row_count;
  if v_n = 0 then return 'no_disponible'; end if;

  insert into public.portal_reservas (portal, oportunidad_id, cliente_id, asesor_id, estado, vence_en)
    values (p_portal, p_op, auth.uid(), v_asesor, 'activa', now() + interval '24 hours');
  return 'ok';
end $$;

-- 2 · Quitar la policy que exponía la fila completa del prestatario al empresario.
--     Su ficha se lee SOLO por la función server acotada (getMiEmpresa, service_role
--     + columnas explícitas). Sin esta policy, un select directo del empresario a
--     portal_prestatarios no devuelve nada (no es staff) → scoring/notas blindados.
drop policy if exists portal_prest_empresario_lee_suyo on public.portal_prestatarios;

-- ── Verificación ──────────────────────────────────────────────────────────────
do $$
begin
  if public.portal_reservar('contratista', gen_random_uuid()) <> 'sin_acceso' then
    raise exception 'portal_reservar sin sesión no devolvió sin_acceso';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'portal_prestatarios'
      and policyname = 'portal_prest_empresario_lee_suyo'
  ) then
    raise exception 'la policy portal_prest_empresario_lee_suyo sigue existiendo';
  end if;
  raise notice 'OK · 0081 aplicada · empresario no reserva + scoring/notas blindados.';
end $$;
