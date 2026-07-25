# Objetivos de marca · ValorizaPeru

> **La vara contra la que se audita este producto.** No es un documento de diseño:
> es la intersección de **modelo de negocio + manifiesto + encuadre legal +
> contable**. Todo scoring se mide contra estos objetivos y contra nada más.
>
> Creado 2026-07-25. Origen de cada objetivo citado — nada acá está inventado.
> Los `⚠️ POR DEFINIR` son huecos reales que **solo Diego puede cerrar**; hasta
> que se cierren, esos objetivos puntúan **0 = no evaluable**, no "aprobado".

---

## 1. Qué es esta marca (manifiesto)

**ValorizaPeru documenta operaciones de financiamiento entre contratistas del
Estado e inversionistas. No mueve el dinero: lo registra.**

De ahí sale todo lo demás. La marca no vende una oportunidad — da la tranquilidad
de que la operación está bien documentada. Si algo se ve promocional, está mal.

| ES | NO ES |
|---|---|
| Intermediario que evalúa, publica y registra | Prestamista, custodio o administrador de fondos |
| Privado, por invitación | Marketplace abierto |
| Institucional y sobrio | Aspiracional, promocional |
| Herramienta del **asesor** primero | Autoservicio del inversionista primero |

Fuente: `ENCUADRE_LEGAL.md` §1-2 · `BRANDING.md` §1.

---

## 2. Los objetivos, y cómo se verifica cada uno

Cada uno es **verificable**. "Transmitir confianza" no es un objetivo; "identidad
legal verificable en toda página pública" sí.

### A · Negocio

| # | Objetivo | Cómo se verifica | Fuente |
|---|---|---|---|
| **N1** | El producto **nunca** toca, custodia ni transfiere dinero | Sin wallet, saldo, escrow ni "cuenta de la operación" en el código | `ENCUADRE_LEGAL.md` §1 |
| **N2** | El acceso es **por invitación**: no existe registro público | Sin ruta de alta pública; el admin crea todas las cuentas | `ENCUADRE_LEGAL.md` §1 |
| **N3** | La herramienta principal es la del **asesor**, no el autoservicio | El asesor bloquea la operación, no el cliente | `ENCUADRE_LEGAL.md` §2 |
| **N4** | El ingreso es **comisión de intermediación pagada por la empresa** | Se descuenta al desembolso; el inversionista no paga comisión | `PLAN_CONTRATISTAS.md` §2 |
| **N5** | ⚠️ **POR DEFINIR** — meta medible del portal a 12 meses | *¿Nº de operaciones cerradas? ¿Monto intermediado? ¿Comisión generada?* | Hoy solo hay KPIs que mirar (`PLAN` §12), no una meta |

### B · Legal — 🔴 no se promedia con el resto

| # | Objetivo | Cómo se verifica | Fuente |
|---|---|---|---|
| **L1** | Ninguna de las **7 líneas rojas** está cruzada en el código | Barrido por cada una | `ENCUADRE_LEGAL.md` §3 |
| **L2** | **Nunca** afirmar supervisión SBS/SMV que no se tiene | La negación explícita está en el pie público | `ENCUADRE_LEGAL.md` §8 |
| **L3** | Cero promesas de rendimiento, recuperación o ausencia de riesgo (YMYL) | El riesgo se declara **antes** de que lo pregunten | `ENCUADRE_LEGAL.md` §9 |
| **L4** | Las 4 páginas legales existen como **web real**, no PDF | Términos · Privacidad · Cookies · Libro de Reclamaciones | Ley 29571 · 29733 |
| **L5** | Identidad legal **verificable** en toda página pública | Razón social + enlace a la consulta de RUC de SUNAT | Ley 29571 |
| **L6** | 🔴 **Gate absoluto**: sin opinión legal escrita no se opera con dinero real | Es un papel, no código. Bloquea el lanzamiento, no el desarrollo | `PLAN_CONTRATISTAS.md` §2 |

### C · Contable / fiscal

🔴 **Decisión de Diego (2026-07-25): lo contable vive FUERA de la app.** El portal
es una **herramienta interna de seguimiento**, no un sistema de facturación. Eso
no es un hueco pendiente: es el alcance del producto, y define un objetivo con
signo contrario — el éxito acá es **no** construir facturación.

| # | Objetivo | Cómo se verifica |
|---|---|---|
| **C1** | El producto **no emite** comprobantes (factura ni boleta) | Sin integración de facturación en el código |
| **C2** | Y **no simula** emitirlos: nada en la interfaz sugiere que un documento tributario salga de acá | La constancia de operación es un registro interno, no un comprobante de pago |
| **C3** | Los montos que muestra son **informativos de seguimiento**, no un estado de cuenta ni un saldo exigible | Coherente con N1: el dinero no pasa por el producto |

⚠️ El **% de comisión** sigue siendo una decisión abierta del negocio
(`PLAN_CONTRATISTAS.md` §13), pero **no es un objetivo del producto** mientras la
comisión se pacte y se facture fuera de la app. Si algún día se registra dentro,
vuelve acá — y con él, la pregunta del comprobante y del IGV.

### D · Marca y experiencia

| # | Objetivo | Cómo se verifica | Fuente |
|---|---|---|---|
| **M1** | Un solo acento (teal), usado poco; cero valores sueltos | Todo sale de los tokens del tema | `BRANDING.md` §2 |
| **M2** | **Toda** pantalla cuelga de `PortalTema` — sin él no hay marca | Incluida la pública | `BRANDING.md` §2 |
| **M3** | El movimiento **orienta**, no llama la atención; respeta `prefers-reduced-motion` | Y el contenido nunca depende de JS para existir | `BRANDING.md` §5 |
| **M4** | Cero fotos de stock; composición propia en CSS/SVG | Ninguna imagen enlazada a otro dominio | `BRANDING.md` §6 |
| **M5** | Todo texto visible en `lib/copy.ts`, español neutro Perú, bien escrito | Gate: `copy-jsx`, `voceo`, `tilde-*` | Estándar |
| **M6** | 375px y 1440px sin scroll horizontal | Medido, no estimado | Estándar |
| **M7** | La landing y las 4 legales **se indexan**; todo lo demás no | Decisión de Diego 2026-07-25: quien recibe una invitación tiene que poder verificar que la empresa existe. El grupo `(public)` abre `index:true`; `login`, `nueva-clave` y el portal heredan el `noindex` del raíz | `app/(public)/layout.tsx` |

### E · Técnica

| # | Objetivo | Cómo se verifica | Fuente |
|---|---|---|---|
| **T1** | La autorización es **server-side**, no del middleware | El middleware es conveniencia; el guard real está en el layout | Estándar · CVE-2025-29927 |
| **T2** | La zona privada **nunca** se indexa | `noindex` en la metadata, no solo en `robots.txt` | Estándar |
| **T3** | Los invariantes de dinero viven en **SQL**, no en la interfaz | Restricciones y disparadores, no validación de formulario | `ENCUADRE_LEGAL.md` §7 |
| **T4** | Una reserva viva por oportunidad, garantizada por índice único | Dos reservas activas serían corrupción de datos | Migración 0088 |
| **T5** | Gate sin bloqueantes · typecheck · lint · tests en verde | Comando, no opinión | Estándar |

---

## 3. Lo que este documento NO decide

- **El nombre.** `VALORIZAPERU.md` lo marca *provisional*, pendiente de verificar
  dominio e Indecopi. Hasta que se confirme, no se invierte en material de marca.
- **La co-inversión / sindicación.** Bloqueada a propósito en la base (0088).
  Cambiarla exige la consulta legal de `ENCUADRE_LEGAL.md` §4.
- **El ciclo de repago.** No construido a propósito — recaudarlo sería custodia.
