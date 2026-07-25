/**
 * LIMPIA todo lo que sembró seed-portales.mjs — para no dejar rastro en prod.
 *
 * Borra, en el portal:
 *   1. Las fotos de Storage de las oportunidades del admin demo.
 *   2. Las oportunidades del admin demo (cascade → garantías + filas de fotos).
 *   3. Los prestatarios (contratistas) demo del admin demo.
 *   4. Las membresías de las 3 cuentas demo.
 *   5. Las 3 cuentas de auth demo.
 *
 * Idempotente: si algo ya no existe, sigue. NO toca ninguna otra cuenta ni
 * oportunidad que no sea del set demo.
 *
 * ⚠️ Apunta a la base de `.env.local`. Uso:
 *   node --env-file=.env.local scripts/limpiar-portales.mjs
 */

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SVC) {
  console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const db = createClient(URL, SVC, { auth: { persistSession: false } });
const c = { verde: "\x1b[32m", ama: "\x1b[33m", gris: "\x1b[90m", cyan: "\x1b[36m", off: "\x1b[0m" };

const BUCKET = "portal-media";
const PORTALES = ["contratista"];
const EMAILS = [
  "admin.portales.demo@dongato.pe",
  "asesor.portales.demo@dongato.pe",
  "cliente.portales.demo@dongato.pe",
  "empresario.portales.demo@dongato.pe",
];

async function buscarUsuario(email) {
  const objetivo = email.toLowerCase();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === objetivo);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  console.log(`${c.cyan}▶ Limpieza de portales · base ${URL}${c.off}\n`);

  const ids = {};
  for (const email of EMAILS) ids[email] = await buscarUsuario(email);
  const adminId = ids["admin.portales.demo@dongato.pe"];

  // 0 · Reservas demo (por cliente demo). El cascade al borrar la op también las
  // limpia, pero se borran explícitas por si la op ya no existiera.
  const demoIds = EMAILS.map((e) => ids[e]).filter(Boolean);
  if (demoIds.length) {
    await db.from("portal_reservas").delete().in("cliente_id", demoIds);
    console.log(`${c.verde}  ✓ reservas demo eliminadas${c.off}`);
  }

  // 1-2 · Oportunidades del admin demo + sus fotos de Storage.
  if (adminId) {
    for (const portal of PORTALES) {
      const { data: ops } = await db
        .from("portal_oportunidades")
        .select("id")
        .eq("portal", portal)
        .eq("creado_por", adminId);
      const opIds = (ops ?? []).map((o) => o.id);
      if (opIds.length) {
        const { data: fotos } = await db.from("portal_oportunidad_fotos").select("path").in("oportunidad_id", opIds);
        const paths = (fotos ?? []).map((f) => f.path).filter(Boolean);
        if (paths.length) await db.storage.from(BUCKET).remove(paths);
        await db.from("portal_oportunidades").delete().in("id", opIds);
        console.log(`${c.verde}  ✓ ${portal}: ${opIds.length} oportunidades + ${paths.length} fotos${c.off}`);
      } else {
        console.log(`${c.gris}  · ${portal}: sin oportunidades demo${c.off}`);
      }
    }
    // Prestatarios (contratistas) demo del admin demo.
    for (const portal of PORTALES) {
      const { data: prest } = await db
        .from("portal_prestatarios")
        .select("id")
        .eq("portal", portal)
        .eq("creado_por", adminId);
      const pids = (prest ?? []).map((p) => p.id);
      if (pids.length) {
        await db.from("portal_prestatarios").delete().in("id", pids);
        console.log(`${c.verde}  ✓ ${portal}: ${pids.length} contratistas${c.off}`);
      } else {
        console.log(`${c.gris}  · ${portal}: sin contratistas demo${c.off}`);
      }
    }
  } else {
    console.log(`${c.ama}  ⚠ no se encontró el admin demo; se omite la limpieza de oportunidades${c.off}`);
  }

  // 3 · Membresías de las cuentas demo.
  for (const email of EMAILS) {
    const uid = ids[email];
    if (!uid) continue;
    await db.from("portal_miembros").delete().eq("user_id", uid);
  }
  console.log(`${c.verde}  ✓ membresías demo eliminadas${c.off}`);

  // 4 · Cuentas de auth demo.
  for (const email of EMAILS) {
    const uid = ids[email];
    if (!uid) {
      console.log(`${c.gris}  · ${email}: no existe${c.off}`);
      continue;
    }
    const { error } = await db.auth.admin.deleteUser(uid);
    if (error) console.log(`${c.ama}  ⚠ ${email}: ${error.message}${c.off}`);
    else console.log(`${c.verde}  ✓ ${email} eliminado${c.off}`);
  }

  console.log(`\n${c.verde}✓ Limpieza completa${c.off}`);
}

main().catch((e) => {
  console.error(`\n✖ ${e.message}`);
  process.exit(1);
});
