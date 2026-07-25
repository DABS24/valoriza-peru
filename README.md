# ValorizaPeru

Portal **privado, por invitación** de financiamiento a contratistas del Estado.
Inversionistas financian a empresas que ganaron obras o contratos públicos y
necesitan liquidez corta (2/4/6 meses) mientras el Estado les paga.

Operado por **Don Gato Servicios SAC**. Somos **intermediarios**: la plataforma
nunca toca ni custodia el dinero — el inversionista transfiere directo a la
empresa, y la comisión de intermediación la paga la empresa.

- Qué es y cómo opera: [`docs-internal/VALORIZAPERU.md`](docs-internal/VALORIZAPERU.md)
- 🔴 **Encuadre legal y líneas rojas** (leer antes de construir cualquier feature):
  [`docs-internal/ENCUADRE_LEGAL.md`](docs-internal/ENCUADRE_LEGAL.md)
- Plan de negocio: [`docs-internal/PLAN_CONTRATISTAS.md`](docs-internal/PLAN_CONTRATISTAS.md)
- Reglas de ingeniería del repo: [`CLAUDE.md`](CLAUDE.md)

## Stack

Next.js 15 (App Router) · React 19 · TypeScript estricto · Tailwind v3 ·
Supabase (Postgres + Auth + Storage, con RLS) · Vitest · Resend.

## Correr en local

```bash
npm install
```

Copia `.env.example` a `.env.local` y completa las claves (Supabase, Resend). Después:

```bash
npm run dev
```

## Gate antes de cada commit

```bash
bash scripts/precommit-checks.sh && npm run typecheck && npm run lint && npm run build
```

`precommit-checks.sh` corre los tests y bloquea voceo argentino, strings
hardcodeados en JSX, léxico prohibido y jerga de cumplimiento en pantallas del
inversionista.

## Estructura

```
app/                      ← rutas: /login, /cliente, /asesor, /admin, /empresario, /api/*
components/portales/      ← pantallas por rol + kit de UI propio (P*)
lib/portales/             ← núcleo: config de la vertical, data, guards, tasas, auditoría
lib/copy.ts               ← TODO el texto visible
lib/constants.ts          ← marca (BRAND) y contacto
supabase/migrations/      ← esquema (tablas portal_*)
scripts/                  ← gate de precommit + seed/limpieza de datos demo
docs-internal/            ← negocio y encuadre legal (no es código, no se importa)
```

## De dónde salió este repo

El código nació dentro del monorepo de Don Gato (2026-07-23) y se separó a su
propio repo el **2026-07-25**, quedándose solo con esta vertical. Dos cosas que
conviene saber al leerlo:

1. **Comparte el proyecto Supabase** con el otro producto de la SAC. Las tablas
   `portal_*` y `portal_miembros` siempre estuvieron aisladas (auth propia, RLS
   propia, bucket propio), así que no hubo que migrar datos. Si algún día se
   separa la base, hay que duplicar los usuarios de `auth.users`.
2. Algunos comentarios explican decisiones **por contraste con ese otro
   producto** ("no hereda la marca de…", "esto se colaba en…"). Son historia real
   del código, no código muerto: describen por qué una pantalla no hereda tema,
   título o contacto de nadie.
