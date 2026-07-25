import { NextResponse, type NextRequest } from "next/server";

import { SESS_COOKIE } from "@/lib/auth/session";
import { updateSession, borrarCookiesAuth } from "@/lib/supabase/middleware";

const isProd = process.env.NODE_ENV === "production";

/** Tope duro de sesión: 1 hora desde el login (marca httpOnly, no reseteable por JS). */
const MAX_SESION_MS = 60 * 60 * 1000;

/**
 * Pantallas PÚBLICAS del portal. Todo lo demás es zona protegida: acá no hay
 * landing ni marketing —el portal entero es privado, por invitación—, así que el
 * default es "protegido" y esta lista es la excepción, no al revés. Olvidar sumar
 * una pantalla nueva acá la deja detrás del login (falla cerrado), que es el lado
 * correcto del error.
 *
 * Son estáticas (prerenderadas), así que tampoco pueden llevar nonce: sus <script>
 * se emiten en build y 'strict-dynamic' los bloquearía.
 *
 * ⚠️ "/" es la landing institucional y es pública A PROPÓSITO, pero el match es
 * exacto: `esPublica` solo abre la raíz, no todo lo que cuelga de ella. Verificado
 * con /cliente, /admin, /asesor y /empresario, que siguen cerrados.
 */
const PUBLICAS: readonly string[] = [
  "/", // landing institucional
  "/login",
  "/nueva-clave",
  "/legal", // términos, privacidad, cookies
  "/libro-reclamaciones",
];

/** ¿El path es una de las pantallas públicas? */
function esPublica(path: string): boolean {
  return PUBLICAS.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * CSP por request. Dos posturas:
 *
 * 1. Estándar (las dos pantallas públicas): script-src 'self' 'unsafe-inline'.
 *    Necesario porque se prerenderan sin conocer un nonce de runtime — un nonce +
 *    'strict-dynamic' bloquearía sus <script>. No manejan PII y las cookies de
 *    auth (Supabase) son httpOnly.
 *
 * 2. Estricta (todo el resto): nonce + 'strict-dynamic'. Ahí vive la información
 *    de los inversionistas y las operaciones. Esas páginas son dinámicas (los
 *    guards leen cookies), así que Next inyecta el nonce en sus scripts y el
 *    estricto funciona. Cierra el hueco de 'unsafe-inline'.
 *
 * style-src mantiene 'unsafe-inline' (Tailwind/next-font); no es vector de
 * ejecución de código como script-src.
 */
function buildCsp(nonce: string | null): string {
  let scriptSrc: string;
  if (nonce) {
    scriptSrc = `'self' 'nonce-${nonce}' 'strict-dynamic'`;
  } else if (isProd) {
    scriptSrc = "'self' 'unsafe-inline'";
  } else {
    scriptSrc = "'self' 'unsafe-eval' 'unsafe-inline'"; // turbopack/HMR en dev
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Nonce base64 aleatorio, edge-safe (sin Buffer). */
function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // El portal completo es zona protegida salvo las dos pantallas públicas: maneja
  // dinero e identidad de inversionistas, y no hay ninguna superficie abierta que
  // proteger de menos.
  const esApi = path.startsWith("/api");
  // El tope de sesión aplica también a /api: un atacante con la cookie robada que
  // solo golpee la API mantenía la sesión viva para siempre, porque updateSession
  // refresca el JWT y este bloque nunca corría. Auditoría 2026-07-25.
  const zonaProtegida = !esPublica(path);

  // Estricto (nonce + strict-dynamic) donde vive la información sensible. Solo en
  // páginas dinámicas: las estáticas se prerenderan sin nonce y quedarían rotas.
  // El nonce sigue siendo solo de páginas: una respuesta JSON no lleva <script>.
  const usarNonce = isProd && zonaProtegida && !esApi;
  const nonce = usarNonce ? makeNonce() : null;
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  if (nonce) {
    // Next lee estos headers del request para inyectar el nonce en sus <script>.
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", csp);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);

  // Prefetch de Next (hover/viewport sobre un <Link>): NO validamos sesión acá.
  // Cada prefetch dispararía un getUser() de red — pasar el mouse por el nav sería
  // una tormenta de validaciones. El render REAL (no-prefetch) sí pasa por el gate,
  // y los guards de layout (requirePortalSesion, con getUser validado) siguen
  // siendo la barrera autoritativa. Defensa en profundidad intacta.
  if (request.headers.get("Next-Router-Prefetch") === "1") {
    return response;
  }

  // Refresca la sesión Supabase (inerte si no hay env) y nos dice si hay usuario.
  const { response: res, hayUser } = await updateSession(request, response);

  // ── Gate de la zona protegida: defensa en profundidad sobre los guards por
  // layout, y tope de sesión de 1h server-side (no en localStorage).
  if (zonaProtegida && hayUser === true) {
    const marca = Number(request.cookies.get(SESS_COOKIE)?.value);
    if (Number.isFinite(marca) && marca > 0) {
      if (Date.now() - marca > MAX_SESION_MS) {
        // Sesión vencida. La API contesta 401: un fetch no sabe seguir un redirect
        // a una pantalla de login, y el JSON deja al cliente manejarlo.
        if (esApi) {
          const j = NextResponse.json({ error: "sesion_expirada" }, { status: 401 });
          borrarCookiesAuth(request, j);
          j.cookies.set(SESS_COOKIE, "", { maxAge: 0, path: "/" });
          return j;
        }
        // Página: cerrar duro (borrar cookies de auth) y mandar a login.
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.search = "?sesion=expirada";
        const redir = NextResponse.redirect(url);
        borrarCookiesAuth(request, redir);
        redir.cookies.set(SESS_COOKIE, "", { maxAge: 0, path: "/" });
        return redir;
      }
    } else {
      // Primera visita autenticada: estampar el inicio de sesión (httpOnly).
      res.cookies.set(SESS_COOKIE, String(Date.now()), {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60, // la cookie sobrevive; el corte lo decide la marca de 1h
      });
    }
  } else if (zonaProtegida && hayUser === false) {
    // Sin sesión no se entra, ni siquiera al cascarón. Los guards de cada handler
    // ya devuelven 401; acá se corta antes y con la misma forma.
    if (esApi) return NextResponse.json({ error: "sin_sesion" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    // Todo salvo assets estáticos de Next y archivos con extensión conocida.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|txt|xml)$).*)",
  ],
};
