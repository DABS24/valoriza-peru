-- ============================================================================
-- 0079 · 🔴 FIX · las funciones de reserva usaban `estado` en vez de
--        `estado_publicacion` sobre portal_oportunidades
-- ============================================================================
-- EL BUG (introducido en 0078)
--   portal_oportunidades tiene la columna `estado_publicacion` (no `estado`). Las
--   cuatro funciones de reserva escribían/filtraban por `estado` sobre esa tabla →
--   `ERROR 42703: column "estado" does not exist`. Efecto:
--     · portal_reservar llama a portal_liberar_vencidas → revienta → RESERVAR FALLA.
--     · portal_confirmar_reserva hace update sobre esa columna → EL ASESOR AL
--       CONFIRMAR FALLA.
--   No se detectó antes porque probamos con service_role (sin auth.uid): las
--   funciones cortan en el guard de permisos ANTES de tocar la columna. El usuario
--   con sesión real sí llega. (Lección: probar reservas con sesión real, no service_role.)
--
--   `portal_miembros.estado` y `portal_reservas.estado` SÍ existen — esos quedan
--   igual. Solo cambia lo que toca portal_oportunidades: `estado` → `estado_publicacion`.
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run. Idempotente (create or replace).
--               Proyecto: wgoypefflbxxvyscovfi.
-- ============================================================================

-- Housekeeping: libera holds vencidos. (portal_oportunidades → estado_publicacion)
create or replace function public.portal_liberar_vencidas(p_portal text)
  returns void language plpgsql security definer set search_path = public as $$
begin
  update public.portal_oportunidades
     set estado_publicacion = 'disponible', reservado_por = null, reservado_hasta = null
   where portal = p_portal and estado_publicacion = 'reservada' and reservado_hasta < now();
  update public.portal_reservas
     set estado = 'expirada', resuelto_en = now()
   where portal = p_portal and estado = 'activa' and vence_en < now();
end $$;

-- Cliente reserva: claim atómico sobre 'disponible'.
create or replace function public.portal_reservar(p_portal text, p_op uuid)
  returns text language plpgsql security definer set search_path = public as $$
declare v_rol text; v_asesor uuid; v_n int;
begin
  select rol, asesor_id into v_rol, v_asesor
    from public.portal_miembros
   where portal = p_portal and user_id = auth.uid() and estado = 'activo';
  if v_rol is null then return 'sin_acceso'; end if;

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

-- Asesor/admin confirma → 'cerrada'.
create or replace function public.portal_confirmar_reserva(p_portal text, p_op uuid)
  returns text language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not public.portal_es_staff(p_portal) then return 'sin_acceso'; end if;
  update public.portal_oportunidades
     set estado_publicacion = 'cerrada', reservado_hasta = null
   where id = p_op and portal = p_portal and estado_publicacion = 'reservada';
  get diagnostics v_n = row_count;
  if v_n = 0 then return 'no_reservada'; end if;
  update public.portal_reservas
     set estado = 'confirmada', resuelto_en = now(), resuelto_por = auth.uid()
   where oportunidad_id = p_op and portal = p_portal and estado = 'activa';
  return 'ok';
end $$;

-- Libera una reserva → vuelve al pool (staff, o el cliente dueño).
create or replace function public.portal_liberar_reserva(p_portal text, p_op uuid)
  returns text language plpgsql security definer set search_path = public as $$
declare v_n int; v_owner uuid;
begin
  select reservado_por into v_owner
    from public.portal_oportunidades where id = p_op and portal = p_portal;
  if not public.portal_es_staff(p_portal) and v_owner is distinct from auth.uid() then
    return 'sin_acceso';
  end if;
  update public.portal_oportunidades
     set estado_publicacion = 'disponible', reservado_por = null, reservado_hasta = null
   where id = p_op and portal = p_portal and estado_publicacion = 'reservada';
  get diagnostics v_n = row_count;
  if v_n = 0 then return 'no_reservada'; end if;
  update public.portal_reservas
     set estado = 'cancelada', resuelto_en = now(), resuelto_por = auth.uid()
   where oportunidad_id = p_op and portal = p_portal and estado = 'activa';
  return 'ok';
end $$;

-- ── Verificación: liberar_vencidas ya NO debe reventar por la columna ──────────
do $$
begin
  perform public.portal_liberar_vencidas('cgh');
  perform public.portal_liberar_vencidas('contratista');
  raise notice 'OK · 0079 aplicada · funciones de reserva usan estado_publicacion. Reservar/confirmar/liberar arreglados.';
end $$;
