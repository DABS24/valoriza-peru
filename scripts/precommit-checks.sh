#!/usr/bin/env bash
# ============================================================================
# ValorizaPeru · Pre-commit checks (gate obligatorio)
# Scans:
#   1. Voceo argentino — bloquea commit si encuentra.
#   2. Strings hardcoded en JSX — bloquea commit.
#   3. console.log/debug olvidados — warning.
#   4. TODO/FIXME — warning.
#   5. Verifica que app/components/lib no importen desde docs-internal.
#   6. Suite de tests (vitest run) — bloquea commit si algún test falla.
#
# El voceo se detecta SOLO por formas con tilde aguda final (calculá, podés,
# escribime, etc.) — formas neutras sin tilde (calcula, ten, escribe) pasan OK.
# ============================================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

ERRORS=0
WARNINGS=0

echo -e "${BLUE}▶ ValorizaPeru precommit checks${RESET}"
echo ""

# ─── LOCALE: sin esto el gate marca español neutro como voceo ────────────────
# Sin un locale UTF-8, BSD grep (el de /usr/bin, que es el que corre acá dentro)
# compara BYTES: el `\b` que cierra `salí` cae DENTRO de `salía` y el scan
# bloquea un imperfecto correcto. Igual con elegí/elegía y seguí/seguía. Falla
# solo cuando el término del patrón TERMINA en vocal acentuada y el texto sigue
# con letras — por eso pasa desapercibido durante meses.
#
# Verificado el 2-ago-2026 en don-gato, que tenía el mismo hueco: con
# LC_ALL=en_US.UTF-8 el hit desaparece; con LC_ALL=C reaparece.
#
# ⚠️ Reproducirlo en la terminal puede dar vacío y no significa que no exista:
# ahí `grep` suele ser ugrep (Homebrew, o el shim de Claude Code), que maneja
# UTF-8 bien. El binario que corre acá dentro es otro.
LOCALES=$(locale -a 2>/dev/null || true)
if grep -qi '^en_US\.UTF-*8$' <<<"$LOCALES"; then
  export LC_ALL=en_US.UTF-8
else
  UTF=$(grep -i 'UTF-*8$' <<<"$LOCALES" | head -1)
  [ -n "$UTF" ] && export LC_ALL="$UTF"
fi

# ─── AVISO: este gate NO es igual en todas las máquinas ──────────────────────
# Los scans usan `\b` con vocales acentuadas, y ahí GNU grep (el del CI, Ubuntu)
# y ugrep (el que trae Homebrew en varias Mac) NO coinciden: el mismo patrón da
# distinto resultado. Consecuencia real, ya ocurrida: el gate local pasó en
# verde, se pusheó, y el CI marcó voceo en una línea que acá nunca se reportó.
# Un gate que dice OK cuando el de verdad va a fallar es peor que no tenerlo,
# así que si el grep local no es GNU se avisa en vez de fingir equivalencia.
if ! grep --version 2>/dev/null | head -1 | grep -qi "GNU grep"; then
  echo -e "${YELLOW}⚠ Tu 'grep' no es GNU grep ($(grep --version 2>/dev/null | head -1 | cut -c1-40)).${RESET}"
  echo -e "${YELLOW}  Los scans de texto pueden dar distinto que el CI (Ubuntu usa GNU grep).${RESET}"
  echo -e "${YELLOW}  Si el CI marca algo que acá salió verde, es esto. Verde local ≠ verde en CI.${RESET}"
  echo ""
fi

# ─── SCAN 1: Voceo argentino (formas con tilde aguda) ───
# Lista explícita de imperativos y presentes vos típicos.
# Español neutro Perú, sin voceo. La lista es explícita a propósito.
VOCEO_WORDS='tenés|tené|sumá|sumás|cargá|cargás|podés|podé|querés|queré|vení|mirá|mirás|mandá|mandás|andá|andás|hacé|hacés|entrá|entrás|salí|sentí|sentís|registrate|registráte|encontrá|encontrás|conseguí|conseguís|entendés|entendé|escribime|escribíme|arrancá|arrancás|decime|decíme|avisá|avisás|calculá|calculás|mové|movés|pegá|pegás|confirmá|confirmás|compartí|compartís|agrandá|agrandás|pegale|pegále|sentate|sentáte|fijate|fijáte|tomate|tomá|tomás|comprá|comprás|venilo|aprendé|aprendés|elegí|elegís|seguí|seguís|disfrutá|disfrutás|abrí|abrís|sabé|sabés|cobrá|cobrás|llevá|llevás|llegá|llegás|leé|leés|usá|usás|probá|probás|recordá|recordás|considerá|considerás|aplicá|aplicás|enviá|enviás|vos|seguila|seguilas|seguinos|pegalo|pegala|preguntá|preguntás|preguntale|cerrá|cerrale|contale|escribí|escribinos|mandale'

# Buscamos las palabras case-insensitive (-i) pero con tildes específicas
# `--include="*.tsx"` y `--include="*.ts"` solo, excluyendo precommit y docs-internal
# ⚠️ OJO al depurar este scan: son DOS greps distintos, y por eso un hit no se
# reproduce a mano. En la terminal, `grep` suele ser ugrep (Homebrew, o el shim
# de Claude Code), que maneja UTF-8 bien y no marca nada. Acá adentro corre
# /usr/bin/grep (BSD), que sin el LC_ALL de arriba compara bytes y SÍ marca.
# Para reproducir un hit: `LC_ALL=C /usr/bin/grep -Eni ...`.
#
# Algunas formas son AMBIGUAS: "conseguí", "escribí", "seguí", "salí", "elegí"
# son a la vez imperativo voseante Y pretérito de 1ª persona, que es español
# neutro correcto ("Conseguí mercadería barata" en un testimonio de cliente).
# Ninguna regex las distingue. En vez de sacarlas de la lista (que abriría la
# puerta al voceo real), la línea legítima se marca con `gate-ok:voceo`, que deja
# el permiso explícito, visible en el diff y auditable.
VOCEO_HITS=$(grep -rEni --include="*.tsx" --include="*.ts" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs-internal \
    --exclude-dir=_backup --exclude-dir=.claude --exclude="precommit-checks.sh" \
    "\b(${VOCEO_WORDS})\b" . 2>/dev/null | grep -vE 'gate-ok:voceo' || true)

if [ -n "$VOCEO_HITS" ]; then
  echo -e "${RED}✖ Voceo argentino detectado:${RESET}"
  echo "$VOCEO_HITS" | head -20
  echo ""
  echo -e "${RED}  → Reemplazar por español neutro Perú.${RESET}"
  echo -e "${RED}  → Ver .claude/00_Resources/localization-rules.md${RESET}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ Sin voceo argentino${RESET}"
fi

# ─── SCAN 2: Strings hardcoded en JSX ───
HARDCODED=$(grep -rEn --include="*.tsx" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs-internal \
    '>\s*[A-ZÁÉÍÓÚÑa-záéíóúñ¿¡][a-záéíóúñ ,.;:¡¿!?\-]{18,}\s*<' . 2>/dev/null \
    | grep -vE "(COPY\.|className=|aria-|fontFamily|data-|placeholder=|title=)" || true)

if [ -n "$HARDCODED" ]; then
  echo -e "${RED}✖ Texto hardcoded en JSX (debería estar en lib/copy.ts):${RESET}"
  echo "$HARDCODED" | head -15
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ Sin strings hardcoded en JSX${RESET}"
fi

# ─── SCAN 3: console.log/debug olvidados ───
CONSOLE_HITS=$(grep -rn --include="*.tsx" --include="*.ts" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs-internal \
    --exclude="precommit-checks.sh" \
    -E "console\.(log|debug)\(" . 2>/dev/null | grep -v "eslint-disable" || true)

if [ -n "$CONSOLE_HITS" ]; then
  echo -e "${YELLOW}⚠ console.log/debug encontrados:${RESET}"
  echo "$CONSOLE_HITS" | head -5
  WARNINGS=$((WARNINGS + 1))
fi

# ─── SCAN 4: TODO/FIXME ───
TODO_COUNT=$(grep -rn --include="*.tsx" --include="*.ts" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs-internal \
    -E "(TODO|FIXME|XXX):" . 2>/dev/null | wc -l | tr -d ' ')
if [ "$TODO_COUNT" -gt "0" ]; then
  echo -e "${YELLOW}⚠ ${TODO_COUNT} TODO/FIXME en el código.${RESET}"
fi

# ─── SCAN 4b: léxico prohibido ───
# Regla Diego 2026-06-29 (+ avance de/en efectivo 2026-06-30, + plata→dinero
# 2026-07-11): nunca en código, ni en comentarios, ni en SQL.
# "plata" solo como dinero: el metal se escribe "plateado" (ver AvatarBorder).
# \bplata\b no captura "plataforma" ni "plateado".
LEXICO_PROHIBIDO='ruletear|ruleteo|cash advance|monetizar (tu|la) línea|monetizar (tu|la) linea|avance (de|en) efectivo|\bplata\b|\bplatas\b'
LEXICO_HITS=$(grep -rEni --include="*.tsx" --include="*.ts" --include="*.sql" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs-internal \
    --exclude-dir=_backup --exclude-dir=.claude --exclude="precommit-checks.sh" \
    "(${LEXICO_PROHIBIDO})" . 2>/dev/null || true)

if [ -n "$LEXICO_HITS" ]; then
  echo -e "${RED}✖ Léxico prohibido detectado (ruletear/cash advance/monetizar tu línea/plata):${RESET}"
  echo "$LEXICO_HITS" | head -10
  echo -e "${RED}  → 'plata' → 'dinero' SIEMPRE (regla Diego 2026-07-11).${RESET}"
  echo -e "${RED}  → El resto → 'operar con tu propia tarjeta' / 'mover tu línea' / 'disposición de fondos'.${RESET}"
  echo -e "${RED}  → Ver CLAUDE.md sección 'Léxico prohibido'.${RESET}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ Sin léxico prohibido${RESET}"
fi

# ─── SCAN 4d: tipping-off — jerga PLAFT en superficies del cliente ───
# El inversionista NUNCA debe ver jerga de cumplimiento. Escanea sus superficies.
# Ver CLAUDE.md, "Lo que NUNCA se hace" (tipping off).
TIPPING_HITS=$(grep -rEni --include="*.tsx" \
    --exclude-dir=node_modules --exclude-dir=.next \
    "Oficial de Cumplimiento|Escalada a OC|escalada al OC|calificada como OS|tipping|\bROS\b|\bUIF\b|\bPLAFT\b" \
    "./app/(app)/cliente" ./components/portales/cliente 2>/dev/null | grep -vE '^\s*//|^\s*\*' || true)
if [ -n "$TIPPING_HITS" ]; then
  echo -e "${RED}✖ Tipping-off: jerga PLAFT en pantalla del cliente:${RESET}"
  echo "$TIPPING_HITS" | head -10
  echo -e "${RED}  → Al inversionista se le explica el estado en español llano, sin jerga.${RESET}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ Sin jerga PLAFT en superficies del cliente${RESET}"
fi

# ─── SCAN 5: import desde docs-internal ───
BAD_IMPORTS=$(grep -rEn --include="*.tsx" --include="*.ts" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs-internal \
    'from\s+["\x27].*docs-internal' . 2>/dev/null || true)

if [ -n "$BAD_IMPORTS" ]; then
  echo -e "${RED}✖ import desde docs-internal detectado:${RESET}"
  echo "$BAD_IMPORTS"
  ERRORS=$((ERRORS + 1))
fi

# ─── SCAN 6: Suite de tests (Vitest, modo run — hermético, sin red/DB) ───
# Los tests son el guardián anti-drift (dinero TS↔SQL, transiciones). Si uno
# falla, el gate falla. `npm test` = `vitest run` (no interactivo, no watch).
# El `if` exime a este comando del `set -e` de arriba, así podemos reportar.
echo ""
echo -e "${BLUE}▶ Tests (vitest run)${RESET}"
if npm test --silent > /tmp/valorizaperu-vitest.log 2>&1; then
  echo -e "${GREEN}✓ Tests OK${RESET}"
else
  echo -e "${RED}✖ Tests fallando:${RESET}"
  tail -25 /tmp/valorizaperu-vitest.log
  ERRORS=$((ERRORS + 1))
fi

# ─── RESUMEN ───
echo ""
if [ "$ERRORS" -gt "0" ]; then
  echo -e "${RED}✖ ${ERRORS} error(es). Commit bloqueado.${RESET}"
  exit 1
fi

if [ "$WARNINGS" -gt "0" ]; then
  echo -e "${YELLOW}⚠ ${WARNINGS} warning(s).${RESET}"
fi

echo -e "${GREEN}✓ Precommit OK${RESET}"
