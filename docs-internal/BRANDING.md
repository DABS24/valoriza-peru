# Branding · ValorizaPeru

> Fuente de verdad de la identidad. Los **valores** viven en código
> (`lib/portales/tema.ts`, `lib/portales/fuente.ts`, `tailwind.config.ts`);
> este documento explica **por qué** son esos y cómo se usan.
>
> Si el código y este documento se contradicen, **manda el código** — y este
> documento se corrige en el mismo cambio.

---

## 1. Qué es la marca

**ValorizaPeru documenta operaciones de financiamiento entre contratistas del
Estado e inversionistas.** No mueve el dinero: lo registra.

Eso define el tono entero. La marca no vende una oportunidad — **da la
tranquilidad de que la operación está bien documentada.** Todo lo visual sirve a
eso: si algo se ve promocional, está mal.

| La marca ES | La marca NO ES |
|---|---|
| Sobria, precisa, verificable | Aspiracional, promocional |
| Institucional | Startup de finanzas personales |
| Adulta — habla con contratistas e inversionistas | Juvenil, "fintech divertida" |
| Discreta: es privada, por invitación | Masiva |

🔴 **El límite regulatorio es también un límite de diseño.** Una landing que
publica rentabilidades sería oferta pública y cambiaría el régimen (SMV). Por eso
en la superficie pública **no hay números de retorno, ni tasas, ni oportunidades,
ni registro abierto** — y eso no es una carencia de diseño: es la identidad.

---

## 2. Color

**Un solo acento: teal.** Ni azul corporativo (genérico), ni verde dinero
(promete rendimiento), ni dorado (aspiracional). El teal lee institucional y
sobrio, y se distingue del verde de Don Gato Efectivo.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `primary` | `13 148 136` | `45 212 191` | Acción principal, acento tipográfico |
| `primary-hover` | `15 118 110` | `94 234 212` | Hover |
| `primary-soft` | `204 251 241` | `19 78 74` | Fondos de énfasis |
| `primary-ink` | `17 94 89` | `153 246 228` | Texto sobre `primary` |

**Los valores viven en `lib/portales/tema.ts`.** Se declaran en canales RGB
sueltos para poder aplicar opacidad (`bg-portal-primary/10`), y se inyectan como
variables CSS scopeadas en `.portal-theme`.

⚠️ **Fuera de `PortalTema` los tokens no existen.** Toda pantalla —incluida la
pública— tiene que colgar de ese wrapper. Que la landing no lo hiciera es
exactamente por qué se veía sin identidad.

**Reglas de uso:**
- **El acento se usa poco.** Un acento que está en todos lados no acentúa nada.
- Los grises (`ink`, `ink2`, `muted`, `line`) hacen el 90% del trabajo.
- `positive` / `warning` / `danger` son **de estado**, nunca decorativos.
- **Cero hex sueltos en JSX.** Si hace falta un color que no está, se agrega al tema.

---

## 3. Tipografía

**Plus Jakarta Sans**, self-hosted vía `next/font` (cero requests externos).
Geométrica y amigable sin ser informal — distinta de la de Efectivo a propósito.

- **Títulos:** peso 800, `tracking-tight`. La contundencia viene del peso y del
  tamaño, no de mayúsculas ni de decoración.
- **Cuerpo:** peso 400-500, interlineado holgado. Se lee mucho texto explicativo.
- **Cifras:** `tabular-nums` siempre que se alineen o cambien.
- **Escala fluida** con `clamp()`, incluidos `2xs`/`3xs` para etiquetas.

---

## 4. Forma

- **Radios generosos:** `portal` (20px) en tarjetas, `portal-sm` (14px) en
  controles. Comunica cercanía sin infantilizar.
- **Sombras suaves y tintadas** con el ink de marca, nunca negro puro.
- **Espacio en blanco generoso.** Es lo que más comunica "documentado y ordenado".
- **Bordes finos** en vez de sombras fuertes para separar: se ve más preciso.

---

## 5. Movimiento

**El movimiento sirve para orientar, no para llamar la atención.**

- **Aparición al entrar al viewport**, sutil (10-16px de desplazamiento, 400-600ms).
- **Escalonado** entre elementos de una misma lista (60-80ms), para que se lea el orden.
- **Transiciones de estado** de 150-200ms, con la curva de salida del tema.
- 🔴 **`prefers-reduced-motion` se respeta siempre.** Sin excepción.
- **Nada que se repita en loop**, nada que se mueva solo sin que el usuario haya hecho algo.

---

## 6. Imágenes

**Decisión: no se usan fotos de stock.**

Tres motivos, y ninguno es estético: **(a)** una foto de stock de "gente de
negocios dándose la mano" es exactamente el lenguaje promocional que la marca
evita; **(b)** hotlinkear a un banco de imágenes es una dependencia externa que
se cae y que hay que licenciar; **(c)** cada imagen externa es una petición más
y un `remotePatterns` más en la configuración.

**En su lugar:** composiciones geométricas en CSS y SVG inline — degradados
suaves del acento, retículas, y tipografía grande. Pesan casi nada, se adaptan al
tema claro/oscuro, y se ven propias en vez de compradas.

**Las únicas imágenes reales del producto** son las que suben los usuarios: fotos
de garantías y documentos del expediente. Esas sí son fotos, y son el contenido.

---

## 7. Voz

Detalle completo en el estándar (`09-copy-voz`). Lo específico de esta marca:

- **Explicar, no vender.** El producto se entiende o no se usa.
- **Decir qué NO hacemos** es parte del argumento, no letra chica.
- **Números honestos:** si falta un dato, *"por definir"*. Nunca el escenario favorable.
- **Español neutro Perú**, sin voceo.
- **Nunca** prometer recuperación, rentabilidad o ausencia de riesgo.

---

## 8. Checklist antes de publicar una pantalla nueva

- [ ] ¿Cuelga de `PortalTema`? (si no, no tiene marca)
- [ ] ¿Usa tokens, sin un solo hex suelto?
- [ ] ¿El acento se usa poco y con intención?
- [ ] ¿Las animaciones orientan, y respetan `prefers-reduced-motion`?
- [ ] ¿375px sin scroll horizontal, y 1440px sin líneas eternas?
- [ ] ¿Todo el texto en `lib/copy.ts`?
- [ ] Si es pública: ¿cero tasas, cero rentabilidades, cero registro abierto?
