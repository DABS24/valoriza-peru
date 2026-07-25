#!/usr/bin/env node
/**
 * verificar-claves.mjs — ¿las claves de Supabase son del proyecto correcto?
 *
 * Uso:
 *   node scripts/verificar-claves.mjs                    # revisa .env.local
 *   node scripts/verificar-claves.mjs <url> <anon-key>   # revisa un par suelto
 *                                                        # (p.ej. lo de Netlify)
 *
 * 🔴 Existe por un incidente real (2026-07-25). En producción el login fallaba y
 * la pantalla decía "correo o contraseña incorrectos" con la contraseña
 * correcta. La URL apuntaba al proyecto `wgoypefflbxxvyscovfi`, pero la anon key
 * era del proyecto `mnfpmuxkoeagygwddebx`: la llave era de otra cerradura.
 * Supabase respondía `401 Invalid API key`, y eso llegaba al usuario disfrazado
 * de error de contraseña.
 *
 * Nada de esto se ve mirando: las dos cadenas "parecen bien". Pero el `ref` del
 * proyecto viaja DENTRO del token, en su parte pública — así que la
 * comprobación es exacta y toma un segundo.
 */

import { readFileSync } from 'node:fs';

const c = { rojo: '\x1b[31m', verde: '\x1b[32m', ama: '\x1b[33m', dim: '\x1b[2m', off: '\x1b[0m' };

/** Saca el payload de un JWT. Es la parte PÚBLICA: no revela ningún secreto. */
function payload(jwt) {
  try {
    const [, p] = String(jwt).split('.');
    return JSON.parse(Buffer.from(p, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function leerEnv(ruta) {
  try {
    return Object.fromEntries(
      readFileSync(ruta, 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
        .map((l) => {
          const i = l.indexOf('=');
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const [argUrl, argAnon] = process.argv.slice(2);
const env = argUrl ? {} : leerEnv('.env.local');
const url = argUrl ?? env.NEXT_PUBLIC_SUPABASE_URL;
const anon = argAnon ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = argUrl ? null : env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon) {
  console.log(`${c.rojo}✗ Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.${c.off}`);
  process.exit(2);
}

const refUrl = (url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) ?? [])[1];
console.log(`\nproyecto según la URL : ${c.dim}${refUrl ?? '¿?'}${c.off}\n`);

let fallos = 0;
for (const [nombre, jwt, rolEsperado] of [
  ['anon', anon, 'anon'],
  ['service_role', service, 'service_role'],
]) {
  if (!jwt) {
    console.log(`  ${c.ama}—${c.off} ${nombre.padEnd(13)} no definida`);
    continue;
  }
  const p = payload(jwt);
  if (!p) {
    console.log(`  ${c.rojo}✗${c.off} ${nombre.padEnd(13)} no es un token legible`);
    fallos++;
    continue;
  }
  const okRef = p.ref === refUrl;
  const okRol = p.role === rolEsperado;
  const vencida = p.exp && p.exp * 1000 < Date.now();

  if (okRef && okRol && !vencida) {
    console.log(`  ${c.verde}✓${c.off} ${nombre.padEnd(13)} ref=${p.ref} · rol=${p.role}`);
  } else {
    fallos++;
    console.log(`  ${c.rojo}✗${c.off} ${nombre.padEnd(13)} ref=${p.ref} · rol=${p.role}`);
    if (!okRef) console.log(`      ${c.rojo}es de OTRO proyecto${c.off} (la URL apunta a ${refUrl})`);
    if (!okRol) console.log(`      ${c.rojo}rol equivocado${c.off}: se esperaba ${rolEsperado}`);
    if (vencida) console.log(`      ${c.rojo}vencida${c.off}`);
  }
}

if (fallos) {
  console.log(
    `\n${c.rojo}✗ ${fallos} clave(s) no corresponden a este proyecto.${c.off}\n` +
      `${c.dim}  Copialas de Supabase → Settings → API Keys del proyecto ${refUrl}.\n` +
      `  Y si las cambiás en el hosting, RE-DESPLEGÁ: las NEXT_PUBLIC_* se\n` +
      `  incrustan al compilar.${c.off}\n`,
  );
  process.exit(1);
}
console.log(`\n${c.verde}✓ Las claves son del proyecto correcto.${c.off}\n`);
