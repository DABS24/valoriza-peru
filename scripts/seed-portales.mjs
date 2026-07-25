/**
 * SEED del portal — datos de demo.
 *
 * Crea 3 cuentas demo (admin/asesor/inversionista), las hace miembros del
 * portales, y publica ~15 oportunidades repartidas entre los dos con garantías,
 * scoring de riesgo (los 5 colores) y fotos de stock (Unsplash) subidas al bucket
 * portal-media. Imprime al final los correos, la contraseña y las URLs de login.
 *
 * Idempotente: reusa las cuentas si ya existen y RE-siembra las oportunidades
 * (borra las de la corrida anterior — por creado_por del admin demo — incluidas
 * sus fotos de Storage — antes de insertar de nuevo).
 *
 * ⚠️ Apunta a la base de `.env.local` (PROD). NO lo corras sin querer.
 *
 * Uso:
 *   node --env-file=.env.local scripts/seed-portales.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID, createHash } from "node:crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://valorizaperu.com";

if (!URL || !SVC) {
  console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const db = createClient(URL, SVC, { auth: { persistSession: false } });
const c = { verde: "\x1b[32m", ama: "\x1b[33m", gris: "\x1b[90m", cyan: "\x1b[36m", off: "\x1b[0m" };

// Contraseña de las cuentas demo: SALE DEL ENTORNO, nunca del repo.
// Estuvo hardcodeada acá y quedó publicada en el historial de git; se rotó el
// 2026-07-24. Estas cuentas son ADMIN de un portal en la base real, así que una
// contraseña versionada es acceso de administración para cualquiera que lea el
// repo. Falla ruidoso a propósito: mejor no correr el seed que recrear el agujero.
const DEMO_PASSWORD = process.env.PORTALES_DEMO_PASSWORD;
if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 12) {
  console.error(
    `${c.ama}Falta PORTALES_DEMO_PASSWORD (mínimo 12 caracteres) en .env.local.${c.off}\n` +
      `La contraseña de las cuentas demo no se guarda en el repo. Defínela en .env.local y vuelve a correr.`,
  );
  process.exit(1);
}
const BUCKET = "portal-media";

const CUENTAS = {
  admin: { email: "admin.portales.demo@dongato.pe", nombre: "Admin Demo Portales", rol: "admin" },
  asesor: { email: "asesor.portales.demo@dongato.pe", nombre: "Asesor Demo Portales", rol: "asesor" },
  cliente: { email: "cliente.portales.demo@dongato.pe", nombre: "Inversionista Demo", rol: "cliente" },
};

const PORTALES = ["contratista"];

const FOTOS_OBRA = [
  "1503387762-592deb58ef4e",
  "1541888946425-d81bb19240f5",
  "1504307651254-35680f356dfd",
  "1590274853856-f22d5ee3d228",
  "1581094794329-c8112a89af12",
  "1531834685032-c34bf0d84c77",
  "1487875961445-47a00398c267",
  "1621905251189-08b45d6a269e",
  "1541976590-713941681591",
  "1503328427499-d92d1ac3d174",
];

const pick = (pool, i, n) => Array.from({ length: n }, (_, k) => pool[(i * 3 + k) % pool.length]);


const CT_OPS = [
  {
    titulo: "Contratista de obra vial — Provías",
    prestatarioKey: "andina",
    distrito: "Cusco", ciudad: "Cusco", moneda: "PEN",
    monto_solicitado: 250000, plazo_meses_min: 4, plazo_meses_max: 6, tasa_mensual: 1.8,
    nivel_riesgo: "bajo", rating: "A", estado_publicacion: "disponible",
    notas_internas: "Entidad seria, pagos verificados. Contrato con avance alto.",
    datos: { entidad_estatal: "Provías Nacional", tipo_contrato: "obra", ruc_contratista: "20501234567", monto_contrato: 1800000, avance_obra_pct: 65, plazo_contrato_meses: 8 },
    garantias: [
      { tipo: "hipotecaria", titulo: "Hipoteca sobre local del contratista", valor_estimado: 400000, moneda: "PEN" },
      { tipo: "cheque", titulo: "Cheque de garantía", valor_estimado: 100000, moneda: "PEN" },
      { tipo: "aval", titulo: "Aval del representante legal", moneda: "PEN" },
    ],
  },
  {
    titulo: "Proveedor de bienes — MINEDU",
    prestatarioKey: "pacifico",
    distrito: "Lima", ciudad: "Lima", moneda: "PEN",
    monto_solicitado: 180000, plazo_meses_min: 2, plazo_meses_max: 4, tasa_mensual: 2.1,
    nivel_riesgo: "medio_bajo", rating: "B", estado_publicacion: "disponible",
    notas_internas: "Factoring sobre orden de compra confirmada.",
    datos: { entidad_estatal: "Ministerio de Educación", tipo_contrato: "bienes", ruc_contratista: "20512345678", monto_contrato: 900000, avance_obra_pct: 40, plazo_contrato_meses: 5 },
    garantias: [{ tipo: "factoring", titulo: "Factoring de orden de compra", valor_estimado: 900000, moneda: "PEN" }],
  },
  {
    titulo: "Consultora de supervisión — Gobierno Regional",
    prestatarioKey: "vialnorte",
    distrito: "Arequipa", ciudad: "Arequipa", moneda: "PEN",
    monto_solicitado: 120000, plazo_meses_min: 2, plazo_meses_max: 6, tasa_mensual: 2.5,
    nivel_riesgo: "medio", rating: "C", estado_publicacion: "disponible",
    notas_internas: "Cesión de flujos del contrato de consultoría.",
    datos: { entidad_estatal: "Gobierno Regional de Arequipa", tipo_contrato: "consultoria", ruc_contratista: "20523456789", monto_contrato: 600000, avance_obra_pct: 30, plazo_contrato_meses: 6 },
    garantias: [
      { tipo: "cesion_flujos", titulo: "Cesión de flujos del contrato", valor_estimado: 600000, moneda: "PEN" },
      { tipo: "pagare", titulo: "Pagaré por el monto financiado", valor_estimado: 120000, moneda: "PEN" },
    ],
  },
  {
    titulo: "Contratista de servicios — EsSalud",
    prestatarioKey: "andina",
    distrito: "Trujillo", ciudad: "La Libertad", moneda: "PEN",
    monto_solicitado: 200000, plazo_meses_min: 4, plazo_meses_max: 6, tasa_mensual: 2.2,
    nivel_riesgo: "medio_bajo", rating: "B", estado_publicacion: "reservada",
    notas_internas: "Reservada. Cuentas por cobrar cedidas.",
    datos: { entidad_estatal: "EsSalud", tipo_contrato: "servicios", ruc_contratista: "20534567890", monto_contrato: 1100000, avance_obra_pct: 55, plazo_contrato_meses: 7 },
    garantias: [{ tipo: "cuentas_por_cobrar", titulo: "Cuentas por cobrar cedidas", valor_estimado: 700000, moneda: "PEN" }],
  },
  {
    titulo: "Obra de saneamiento — Municipalidad",
    prestatarioKey: "oriente",
    distrito: "Piura", ciudad: "Piura", moneda: "PEN",
    monto_solicitado: 300000, plazo_meses_min: 6, plazo_meses_max: 6, tasa_mensual: 2.9,
    nivel_riesgo: "medio_alto", rating: "D", estado_publicacion: "disponible",
    notas_internas: "Municipio con pagos más lentos; se cubre con garantía mobiliaria.",
    datos: { entidad_estatal: "Municipalidad Provincial de Piura", tipo_contrato: "obra", ruc_contratista: "20545678901", monto_contrato: 2200000, avance_obra_pct: 20, plazo_contrato_meses: 10 },
    garantias: [
      { tipo: "mobiliaria", titulo: "Garantía mobiliaria sobre maquinaria", valor_estimado: 500000, moneda: "PEN" },
      { tipo: "aval", titulo: "Aval solidario", moneda: "PEN" },
    ],
  },
  {
    titulo: "Contratista nuevo — obra menor",
    prestatarioKey: "unidos",
    distrito: "Iquitos", ciudad: "Loreto", moneda: "PEN",
    monto_solicitado: 80000, plazo_meses_min: 2, plazo_meses_max: 4, tasa_mensual: 3.5,
    nivel_riesgo: "alto", rating: "F", estado_publicacion: "disponible",
    notas_internas: "Primera operación del contratista. Solo pagaré + aval.",
    datos: { entidad_estatal: "Municipalidad Distrital de Belén", tipo_contrato: "obra", ruc_contratista: "20556789012", monto_contrato: 350000, avance_obra_pct: 10, plazo_contrato_meses: 4 },
    garantias: [
      { tipo: "pagare", titulo: "Pagaré", valor_estimado: 80000, moneda: "PEN" },
      { tipo: "aval", titulo: "Aval personal", moneda: "PEN" },
    ],
  },
  {
    titulo: "Proveedor de equipamiento — Hospital",
    prestatarioKey: "andina",
    distrito: "Chiclayo", ciudad: "Lambayeque", moneda: "PEN",
    monto_solicitado: 220000, plazo_meses_min: 4, plazo_meses_max: 6, tasa_mensual: 1.9,
    nivel_riesgo: "bajo", rating: "A", estado_publicacion: "disponible",
    notas_internas: "Factoring + cheque. Entidad con historial de pago puntual.",
    datos: { entidad_estatal: "Hospital Regional de Lambayeque", tipo_contrato: "bienes", ruc_contratista: "20567890123", monto_contrato: 1400000, avance_obra_pct: 50, plazo_contrato_meses: 6 },
    garantias: [
      { tipo: "factoring", titulo: "Factoring de facturas", valor_estimado: 800000, moneda: "PEN" },
      { tipo: "cheque", titulo: "Cheque diferido", valor_estimado: 220000, moneda: "PEN" },
    ],
  },
  {
    titulo: "Consultoría de ingeniería — Sedapal (borrador)",
    prestatarioKey: "pacifico",
    distrito: "Lima", ciudad: "Lima", moneda: "PEN",
    monto_solicitado: 160000, plazo_meses_min: 4, plazo_meses_max: 4, tasa_mensual: 2.5,
    nivel_riesgo: "medio", rating: "C", estado_publicacion: "borrador",
    notas_internas: "Falta confirmar la cesión de flujos antes de publicar.",
    datos: { entidad_estatal: "Sedapal", tipo_contrato: "consultoria", ruc_contratista: "20578901234", monto_contrato: 750000, avance_obra_pct: 15, plazo_contrato_meses: 6 },
    garantias: [{ tipo: "mutuo", titulo: "Contrato de mutuo con garantía", valor_estimado: 200000, moneda: "PEN" }],
  },
];

const DATA = { contratista: CT_OPS };
const FOTO_POOL = { contratista: FOTOS_OBRA };

// ── Prestatarios (contratistas) demo · SOLO portal contratista ────────────────
// El scoring de pagador lo pone el staff. "andina" reparte 3 operaciones (para
// ver "2da/3ra operación"); "pacifico" tiene 2; el resto, 1 cada uno.
const PRESTATARIOS_CT = [
  { key: "andina", nombre: "Constructora Andina del Sur SAC", ruc: "20601111117", nivel_riesgo: "bajo", scoring_pago: 88 },
  { key: "pacifico", nombre: "Servicios Generales Pacífico SAC", ruc: "20602222225", nivel_riesgo: "medio_bajo", scoring_pago: 74 },
  { key: "vialnorte", nombre: "Inversiones Vial Norte SAC", ruc: "20603333333", nivel_riesgo: "medio", scoring_pago: 62 },
  { key: "oriente", nombre: "Consorcio Oriente EIRL", ruc: "20604444441", nivel_riesgo: "medio_alto", scoring_pago: 48 },
  { key: "unidos", nombre: "Contratistas Unidos del Perú SAC", ruc: "20605555559", nivel_riesgo: "alto", scoring_pago: 33 },
];

// ── Empresario demo · a UNO de los contratistas se le da cuenta de acceso ─────
// "andina" reparte 3 operaciones (vigentes/cerradas/borrador según el estado de
// sus ops), ideal para ver el dashboard agrupado. Misma contraseña que las demás.
const EMPRESARIO = {
  email: "empresario.portales.demo@dongato.pe",
  key: "andina",
  nombre: PRESTATARIOS_CT.find((p) => p.key === "andina").nombre,
};

// ── Helpers ─────────────────────────────────────────────────────────────────
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

async function ensureUser(email, nombre) {
  const existente = await buscarUsuario(email);
  if (existente) {
    console.log(`${c.gris}  · reusa ${email}${c.off}`);
    return existente;
  }
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { nombres: nombre },
  });
  if (error || !data?.user) throw new Error(`No se pudo crear ${email}: ${error?.message}`);
  console.log(`${c.verde}  ✓ creado ${email}${c.off}`);
  return data.user.id;
}

async function subirFoto(portal, oportunidadId, unsplashId, orden) {
  const url = `https://images.unsplash.com/photo-${unsplashId}?w=1200&q=80&auto=format&fit=crop`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) throw new Error(`no es imagen (${ct})`);
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `${portal}/${oportunidadId}/${randomUUID()}.jpg`;
    const { error: eUp } = await db.storage.from(BUCKET).upload(path, buf, { contentType: "image/jpeg", upsert: false });
    if (eUp) throw eUp;
    const hash = createHash("sha256").update(buf).digest("hex");
    const { error: eRow } = await db.from("portal_oportunidad_fotos").insert({
      oportunidad_id: oportunidadId, portal, bucket: BUCKET, path, hash_sha256: hash, bytes: buf.length, mime: "image/jpeg", orden,
    });
    if (eRow) throw eRow;
    return true;
  } catch (e) {
    console.log(`${c.ama}    ⚠ foto ${unsplashId} omitida: ${e.message}${c.off}`);
    return false;
  }
}

async function limpiarSeedPrevio(adminId) {
  for (const portal of PORTALES) {
    const { data: ops } = await db
      .from("portal_oportunidades")
      .select("id")
      .eq("portal", portal)
      .eq("creado_por", adminId);
    const ids = (ops ?? []).map((o) => o.id);
    if (ids.length === 0) continue;
    // Borrar objetos de Storage de esas oportunidades (el cascade NO toca Storage).
    const { data: fotos } = await db.from("portal_oportunidad_fotos").select("path").in("oportunidad_id", ids);
    const paths = (fotos ?? []).map((f) => f.path).filter(Boolean);
    if (paths.length) await db.storage.from(BUCKET).remove(paths);
    // Borrar las oportunidades (cascade → garantías + filas de fotos).
    await db.from("portal_oportunidades").delete().in("id", ids);
    console.log(`${c.gris}  · limpió ${ids.length} oportunidades previas de ${portal}${c.off}`);
  }
  // Prestatarios demo (por creado_por del admin demo). Se borran DESPUÉS de las
  // oportunidades para no dejar filas colgando.
  for (const portal of PORTALES) {
    const { data: prest } = await db
      .from("portal_prestatarios")
      .select("id")
      .eq("portal", portal)
      .eq("creado_por", adminId);
    const pids = (prest ?? []).map((p) => p.id);
    if (pids.length) {
      await db.from("portal_prestatarios").delete().in("id", pids);
      console.log(`${c.gris}  · limpió ${pids.length} contratistas previos de ${portal}${c.off}`);
    }
  }
}

/** Crea los prestatarios demo del portal contratista. Devuelve un mapa key→id. */
async function sembrarPrestatarios(adminId) {
  const map = {};
  for (const p of PRESTATARIOS_CT) {
    const { key, ...fila } = p;
    const { data, error } = await db
      .from("portal_prestatarios")
      .insert({ portal: "contratista", creado_por: adminId, estado: "activo", ...fila })
      .select("id")
      .single();
    if (error || !data) throw new Error(`prestatario ${p.nombre}: ${error?.message}`);
    map[key] = data.id;
  }
  console.log(`${c.verde}  ✓ contratista: ${PRESTATARIOS_CT.length} contratistas (prestatarios)${c.off}`);
  return map;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`${c.cyan}▶ Seed de portales · base ${URL}${c.off}\n`);

  console.log("Cuentas demo:");
  const ids = {};
  for (const k of Object.keys(CUENTAS)) {
    ids[k] = await ensureUser(CUENTAS[k].email, CUENTAS[k].nombre);
  }

  // Membresías en AMBOS portales.
  console.log("\nMembresías:");
  for (const portal of PORTALES) {
    for (const k of Object.keys(CUENTAS)) {
      const cuenta = CUENTAS[k];
      const fila = {
        portal,
        user_id: ids[k],
        rol: cuenta.rol,
        nombre: cuenta.nombre,
        estado: "activo",
        asesor_id: cuenta.rol === "cliente" ? ids.asesor : null,
        creado_por: ids.admin,
      };
      const { error } = await db.from("portal_miembros").upsert(fila, { onConflict: "portal,user_id" });
      if (error) throw new Error(`membresía ${portal}/${k}: ${error.message}`);
    }
    console.log(`${c.verde}  ✓ ${portal}: admin + asesor + inversionista${c.off}`);
  }

  // Re-siembra de oportunidades.
  console.log("\nOportunidades:");
  await limpiarSeedPrevio(ids.admin);

  // Prestatarios (contratistas) demo — antes de las oportunidades para poder ligarlas.
  console.log("\nContratistas (prestatarios):");
  const prestIds = await sembrarPrestatarios(ids.admin);

  // Empresario demo: cuenta de acceso para UN contratista (dashboard de solo-ver).
  console.log("\nEmpresario (contratista con cuenta):");
  const empUserId = await ensureUser(EMPRESARIO.email, EMPRESARIO.nombre);
  {
    const { error: eMem } = await db.from("portal_miembros").upsert(
      {
        portal: "contratista",
        user_id: empUserId,
        rol: "empresario",
        nombre: EMPRESARIO.nombre,
        estado: "activo",
        creado_por: ids.admin,
      },
      { onConflict: "portal,user_id" },
    );
    if (eMem) throw new Error(`membresía empresario: ${eMem.message}`);
    const { error: eLink } = await db
      .from("portal_prestatarios")
      .update({ user_id: empUserId })
      .eq("id", prestIds[EMPRESARIO.key]);
    if (eLink) throw new Error(`link empresario: ${eLink.message}`);
    console.log(`${c.verde}  ✓ ${EMPRESARIO.email} → ${EMPRESARIO.nombre}${c.off}`);
  }

  // Primera oportunidad DISPONIBLE de cada portal → se reservará como demo abajo.
  const primerDisponible = {};

  for (const portal of PORTALES) {
    const ops = DATA[portal];
    for (let i = 0; i < ops.length; i++) {
      const o = ops[i];
      const { garantias, prestatarioKey, ...comun } = o;
      const prestatario_id = prestatarioKey ? prestIds[prestatarioKey] ?? null : null;
      const { data: op, error } = await db
        .from("portal_oportunidades")
        .insert({ portal, creado_por: ids.admin, prestatario_id, ...comun })
        .select("id")
        .single();
      if (error || !op) throw new Error(`oportunidad ${portal}/${o.titulo}: ${error?.message}`);
      if (comun.estado_publicacion === "disponible" && !primerDisponible[portal]) {
        primerDisponible[portal] = op.id;
      }

      if (garantias?.length) {
        const { error: eg } = await db.from("portal_garantias").insert(
          garantias.map((g, idx) => ({ oportunidad_id: op.id, portal, orden: idx, ...g })),
        );
        if (eg) throw new Error(`garantías ${o.titulo}: ${eg.message}`);
      }

      const fotoIds = pick(FOTO_POOL[portal], i, 2 + (i % 2)); // 2 o 3 fotos
      let orden = 0;
      for (const fid of fotoIds) {
        const ok = await subirFoto(portal, op.id, fid, orden);
        if (ok) orden++;
      }
      console.log(`${c.verde}  ✓ [${portal}] ${o.titulo} (${o.nivel_riesgo}, ${orden} fotos)${c.off}`);
    }
  }

  // ── Reservas demo ───────────────────────────────────────────────────────────
  // Pone una oportunidad DISPONIBLE de cada portal en 'reservada' por el cliente
  // demo (hold 24h) e inserta la fila en portal_reservas (asesor = asesor demo).
  // Así la cola del asesor y el Historial del cliente tienen datos. Nota: NO se
  // llama portal_reservar (esa exige la sesión del cliente); se replica su efecto
  // con service_role, respetando exactamente lo que deja esa función (0078).
  console.log("\nReservas demo:");
  for (const portal of PORTALES) {
    const opId = primerDisponible[portal];
    if (!opId) {
      console.log(`${c.gris}  · ${portal}: sin op disponible para reservar${c.off}`);
      continue;
    }
    const vence = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const { error: eOp } = await db
      .from("portal_oportunidades")
      .update({ estado_publicacion: "reservada", reservado_por: ids.cliente, reservado_hasta: vence })
      .eq("id", opId);
    if (eOp) throw new Error(`reserva op ${portal}: ${eOp.message}`);
    const { error: eRes } = await db.from("portal_reservas").insert({
      portal,
      oportunidad_id: opId,
      cliente_id: ids.cliente,
      asesor_id: ids.asesor,
      estado: "activa",
      vence_en: vence,
    });
    if (eRes) throw new Error(`reserva fila ${portal}: ${eRes.message}`);
    console.log(`${c.verde}  ✓ ${portal}: 1 reserva demo (vence en 24h)${c.off}`);
  }

  console.log(`\n${c.cyan}════════════════════════════════════════════${c.off}`);
  console.log(`${c.verde}✓ Seed completo${c.off}\n`);
  console.log("Cuentas demo (misma contraseña para todas):");
  console.log(`  Contraseña: ${c.ama}${DEMO_PASSWORD}${c.off}`);
  for (const k of Object.keys(CUENTAS)) console.log(`  · ${CUENTAS[k].rol.padEnd(11)} ${CUENTAS[k].email}`);
  console.log(`  · ${"empresario".padEnd(11)} ${EMPRESARIO.email}  ${c.gris}(solo /contratista)${c.off}`);
  console.log("\nLogins:");
  console.log(`  · Garantía hipotecaria: ${APP_URL}/garantiahipotecaria/login`);
  console.log(`  · Contratistas:         ${APP_URL}/contratista/login`);
}

main().catch((e) => {
  console.error(`\n✖ ${e.message}`);
  process.exit(1);
});
