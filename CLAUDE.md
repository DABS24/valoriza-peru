# Instrucciones para Claude · ValorizaPeru

> Este archivo se lee al abrir el repo. Define contexto, reglas y preferencias.
> Si solo leés un archivo de instrucciones, leé este.

## 📌 Sobre el proyecto

**ValorizaPeru** es un portal **privado, por invitación** de financiamiento a
contratistas del Estado, operado por **Don Gato Servicios SAC**. Inversionistas
financian a empresas que ganaron obras o contratos públicos y necesitan liquidez
corta (2/4/6 meses) mientras el Estado les paga.

**Qué somos:** intermediario puro. La plataforma **nunca toca ni custodia el
dinero** — el inversionista transfiere directo a la empresa. Cobramos una
**comisión de intermediación que paga la empresa**. Cada operación es un
**contrato bilateral** entre inversionista y empresa; ValorizaPeru **no es parte**.

**Cómo opera de verdad:** el negocio es **presencial y por teléfono**. El asesor
le muestra oportunidades al cliente y **cierra por teléfono**; bloquea la
operación, y **el cliente entra a la plataforma cuando ya compró**. La app es
herramienta de **gestión y seguimiento**, no un canal de captación. Por eso la
herramienta del asesor manda sobre el self-service del inversionista.

- **Owner:** Diego Balarezo (CTO). **Socio:** Gerente General y representante legal.
- **Marca:** una sola fuente — `BRAND` en `lib/constants.ts`. Nunca hardcodear el
  nombre en JSX ni en copy. El nombre es **provisional**: falta verificar dominio
  e Indecopi.

## 🚨 LÍNEAS ROJAS — leer `docs-internal/ENCUADRE_LEGAL.md` antes de construir

Estas features parecen inocentes y **cambian el régimen regulatorio entero**. No
se construyen sin opinión legal escrita:

- ❌ Reserva con **monto parcial** o varios inversionistas por operación (→ financiamiento participativo, SMV).
- ❌ Cualquier **"cuenta de la operación"**, saldo, wallet, escrow o abono a una cuenta nuestra (→ custodia).
- ❌ Que la plataforma **recaude los repagos** y los reparta.
- ❌ **Mercado secundario**, recompra o retiro anticipado.
- ❌ **Registro abierto** o landing pública ofreciendo rentabilidades.
- ❌ **Promesa de rendimiento**, garantía de recompra o "fondo de protección".
- ❌ **Reinversión automática** o portafolio diversificado.

**Invariantes en SQL, no en la UI:** una oportunidad = **un solo inversionista**
(0088) · bitácora propia (0089) · el inversionista no lee las notas del asesor (0086).

**Comisión — asimetría deliberada:** el **empresario** ve todo su desglose (la
paga él) y el **staff** también; al **inversionista** NO se le muestra el monto ni
el %, porque no sale de su retorno — solo se le explica el modelo
(`components/portales/FlujoDinero.tsx`).

**Redacción YMYL:** nunca prometer recuperación garantizada ni rentabilidad
asegurada; nunca publicar plazos operativos sin procedimiento documentado detrás;
si falta un dato, "por definir" — jamás asumir 0 ni mostrar el escenario más favorable.

🔴 **Todo el contenido legal es BORRADOR hasta que lo revise el abogado.**

## 🚨 REGLAS DURAS (gate de commit)

Se chequean en `scripts/precommit-checks.sh`. Si fallan, no se commitea.

1. **CERO voceo argentino.** Solo español neutro Perú. Si dudás, infinitivo o forma neutra.
2. **CERO strings hardcoded en JSX.** TODO texto visible vive en `lib/copy.ts` bajo su namespace.
3. **CERO PII en el código.** El equipo se describe con roles ("CTO", "Gerente General"), nunca con nombre propio.
4. **CERO fechas hardcoded** en footer/copyright: `new Date().getFullYear()`.
5. **CERO imports desde `docs-internal/`.** Es planning humano, no código.
6. **CERO jerga de cumplimiento** en pantallas del inversionista (tipping-off).

### Léxico prohibido (también en docs internos y en el chat)

| ❌ Nunca usar | ✅ Alternativa |
| --- | --- |
| plata | **dinero** |
| ruletear / ruleteo | operar · mover la línea · procesamiento de pagos |
| monetizar | usar · sacar liquidez |

Al **guardar, pegar o reescribir cualquier documento** —incluidas plantillas
externas— normalizar el léxico automáticamente y sin preguntar, y adaptar la
plantilla a la realidad del repo antes de dejarla.

## ⚙️ Reglas técnicas

1. **Cada cambio explicar QUÉ y POR QUÉ** antes de hacerlo.
2. **Gate antes de cada commit:** `bash scripts/precommit-checks.sh && npm run typecheck && npm run lint && npm run build`.
3. **TypeScript estricto** siempre.
4. **Modularidad ⇒ buscar antes de crear:** `grep -rln` primero. Montos y fechas
   SIEMPRE con `lib/formatters`; UI con el kit `components/portales/ui/*` (P*).
5. **Mobile-first** 375px → 810px → 1440px, sin scroll horizontal.
6. **RLS obligatoria** en toda tabla nueva. `service_role` solo en server. Rol
   desde SQL, nunca desde el cliente. Guards que **fallan cerrado**.
7. **Concurrencia:** UPDATE condicional atómico (nada de check-then-act), anti
   doble-submit, idempotencia en lo que mueve estado de dinero.
8. **Single source of truth:** lo durable vive en SQL; las migraciones son
   acumulativas (grepear `supabase/migrations/` puede devolver código MUERTO —
   verificar cuál es la versión vigente de una función antes de afirmar qué hace).
9. La **vertical no se hardcodea**: sale de `PORTAL_SLUG` / `PORTAL` en
   `lib/portales/config.ts`. Las rutas salen de `lib/portales/rutas.ts` (el portal
   está montado en la raíz del dominio, y ese es el único lugar que lo sabe).

## 🌿 Git — TODO va a `desarrollo` (regla, no preferencia)

Dos ramas, y una sola dirección de tráfico:

- **`desarrollo`** — donde se trabaja. Todo commit y todo push van acá, siempre,
  sin preguntar. Es la rama por defecto para cualquier cambio.
- **`main`** — lo que sale a la web. Solo recibe merges de `desarrollo`, y **solo
  con un OK explícito de Diego para ESE cambio**. Una autorización no se extiende
  al cambio siguiente.

```bash
git checkout desarrollo && git push origin desarrollo
```

Y solo tras un "sí, sube a main" para ese cambio puntual:

```bash
git checkout main && git merge desarrollo --ff-only && git push origin main
```

**Por qué:** `main` es la rama que se conecta al hosting, así que mergear ahí es
publicar. Diego decide qué se publica y cuándo, después de probarlo en desarrollo.

⚠️ **"Ya corrí la migración" NO es autorización para subir a `main`.** El SQL se
corre para poder PROBAR el cambio; el visto bueno del deploy es aparte y explícito.
Ante la duda: queda en `desarrollo` y se pregunta.

**Sin pull requests** — el merge es local (`desarrollo` → `main`).

## 👤 Sobre Diego (owner)

- No es desarrollador profesional pero entiende lógica de programación.
- Responder SIEMPRE en español (Perú). Bullets concisos + opción de desarrollar al final.
- Le gusta entender el "por qué" antes del "cómo". Despiadadamente honesto sobre riesgos.
- Fechas absolutas (`2026-07-25`). Soles = `S/`, dólares = `USD`.
- **NO corre comandos en terminal** — Claude los corre y reporta.

## 🗂 Contexto heredado

El código salió del monorepo de Don Gato el **2026-07-25**. Dos hechos que
importan al leerlo o modificarlo:

1. **Comparte el proyecto Supabase** con el otro producto de la SAC (ver la sección
   siguiente). El slug interno de la vertical sigue siendo `"contratista"` porque es
   el valor que ya tienen las filas — renombrarlo sería una migración de datos sin
   ninguna ganancia.
2. Varios comentarios explican decisiones **por contraste con ese otro producto**.
   Es historia real del código (por qué una pantalla no hereda tema, título ni
   contacto de nadie), no código muerto.

## 🧱 Base compartida — se comporta como separada

Decisión de Diego (2026-07-25): por ahora **el mismo proyecto Supabase** que Don Gato
Efectivo, para no gastar otra cuota del plan gratis. Las reglas que sostienen eso:

1. **Todo lo de este portal va con prefijo `portal_`.** Tabla, función, enum,
   trigger: sin excepción. Hoy son 11 tablas, 13 funciones, 4 enums, 7 triggers y el
   bucket `portal-media`. Esa invariante es lo que hace que separarse después sea un
   `pg_dump -t 'portal_*'` y no arqueología.
2. **Cero dependencias del otro producto.** Ni FKs a sus tablas, ni sus funciones.
   El último cruce —los triggers `updated_at` usaban una función suya— se cerró en
   `1000_frontera_base_compartida.sql`. Si aparece uno nuevo, se corta ahí mismo.
3. **Este repo no lee ni escribe nada de Efectivo** (`perfiles`, `operaciones`, sus
   buckets). Son dos negocios.
4. **`auth.users` es lo único de verdad compartido** (16 FKs). Por eso ningún script
   de ninguno de los dos repos borra usuarios "todos menos X" sin descartar antes a
   los del otro producto.
5. **Migraciones: este repo usa `1000`+.** Ver `supabase/migrations/README.md`.
6. **El corte está mapeado**: inventario verificado y pasos en
   [`docs-internal/SEPARAR_BASE.md`](docs-internal/SEPARAR_BASE.md). Hoy es barato
   porque los únicos usuarios son las 4 cuentas demo; cuando haya inversionistas
   reales, mover contraseñas hasheadas ya cuesta.

## 🚩 Pendientes conocidos

- **Sin site en Netlify ni dominio.** Cuando se conecte: *production branch* = `main`,
  y **branch deploys y deploy previews DESACTIVADOS**. Si se activan, cada push a
  `desarrollo` dispara un build y consume cuota de build minutes — iterar tiene que
  ser gratis: se prueba en `localhost` y solo el merge a `main` construye.
- **Dominio propio en Resend** sin verificar: los correos salen con la dirección
  heredada de la cuenta. Se corrige verificando el dominio y seteando `RESEND_FROM_PORTAL`.
- `tailwind.config.ts` conserva tokens de la paleta anterior que este repo no usa
  (inertes: Tailwind purga por uso). Limpieza cosmética pendiente.
- Sin monitoreo de errores. El enganche va en el `useEffect` de `app/error.tsx`.
