# Plan · Área de Contratistas (Don Gato)

> Portal secreto de inversión para financiar a contratistas del Estado.
> Documento vivo. Última actualización: 2026-07-23. Rama de trabajo: `feat/portales`.

---

## 1. Qué es

Plataforma donde **inversionistas** financian a **contratistas que trabajan con el Estado** y necesitan liquidez de corto plazo (2 / 4 / 6 meses) mientras cobran sus contratos/valorizaciones. Cada contratista se hace más atractivo ofreciendo las **garantías que tenga**. El inversionista evalúa, elige y **reserva** la operación que le conviene.

- **URL:** `dongatoefectivo.com/contratista` (portal secreto, `noindex`, sin auto-registro).
- **Marca:** Don Gato + Mochi, línea Editorial Trust (navy + verde dinero + cream).
- **Gemelo:** comparte el mismo motor que el portal de Garantía Hipotecaria (`/garantiahipotecaria`); solo cambia el producto.

---

## 2. Modelo de negocio — intermediario puro

**Don Gato es intermediario. NUNCA toca el dinero, NO recauda fondos.** Solo **conecta** al inversionista con el contratista y **cobra una comisión por la intermediación** (modelo tipo G Inversiones).

- El dinero fluye **directo inversionista → contratista**. La garantía se formaliza a nombre del inversionista (ej. hipoteca inscrita a su favor), no de Don Gato.
- **Ingreso de Don Gato:** comisión de intermediación por operación cerrada (% a definir; se negocia por acuerdo).
- **Implicancia regulatoria (ventaja):** al no mover ni custodiar dinero, quedamos **fuera** del riel de pagos (Circular BCRP) y del crowdfunding con pool (FPF/SBS). El ángulo que sí hay que cuidar es la **intermediación/recomendación** (SMV): el "matching" se enmarca como *filtro por preferencias declaradas*, nunca como asesoría de inversión.

> 🔴 **Gate legal (absoluto):** antes de operar con inversionistas y dinero reales se necesita opinión de abogado que confirme el encuadre como intermediario. Hoy todo corre con **data demo**, así que no bloquea construir, sí bloquea el lanzamiento.

---

## 3. Actores y roles

| Actor | Qué es | Cómo entra |
|---|---|---|
| **Admin** | Opera el portal. Crea usuarios, contratistas y oportunidades; pone el scoring. | Cuenta creada por Don Gato. |
| **Asesor** | Tiene su cartera de inversionistas asignados. Gestiona reservas, hace seguimiento, cierra. | Cuenta creada por el admin. |
| **Inversionista** (cliente) | Financia. Ve el catálogo, reserva, firma directo con el contratista. | Cuenta creada por el admin + correo de acceso. Sin auto-registro, sin KYC en el alta. |
| **Contratista** (prestatario) | Pide el financiamiento. Es un **registro gestionado por el staff**, con scoring de pagador e historial. **No** es un login (hoy). | Lo crea el admin. |

- **Sin KYC en el alta** (decisión de producto). El KYC/verificación de origen de fondos entra cuando el gate legal lo exija, del lado del inversionista y del contratista.
- **Asignación asesor→inversionista:** la hace el admin. El asesor solo ve/gestiona su cartera.

---

## 4. El activo y las garantías

La "oportunidad" es un **contratista del Estado pidiendo financiamiento corto**, respaldado por una o varias garantías. Datos de la ficha: entidad estatal, tipo de contrato (obra / bienes / servicios / consultoría), RUC, monto del contrato, avance de obra, plazo.

**Garantías (una o varias por contratista, lista abierta):**

- Hipotecaria · Factoring · Cuentas por cobrar · Garantía mobiliaria · Cheque · Pagaré · Aval · Cesión de flujos · Mutuo con garantía.

Cuantas más y mejores garantías ofrece un contratista, más atractivo es su perfil. El inversionista compara mezclas de garantía entre operaciones.

---

## 5. Scoring de riesgo (lo pone el staff)

Dos scorings distintos, ambos con color (verde → rojo):

1. **Riesgo de la operación** — por oportunidad. 5 niveles: bajo · medio-bajo · medio · medio-alto · alto. + rating opcional A–G + notas internas (solo staff).
2. **Scoring del contratista (pagador)** — por contratista, sobrevive entre operaciones. Refleja si es buen o mal pagador. Se acumula con su **historial ("N.ª operación")**: un contratista que ya cumplió 3 veces se muestra como "3.ª operación", igual que inversiones.io.

---

## 6. Tasa — el staff ingresa solo la mensual

- El staff ingresa **una sola tasa: la ganancia mensual (%)**.
- El sistema deriva y muestra, sin guardarlas (fuente única = mensual):
  - **TNA** (tasa nominal anual) = mensual × 12.
  - **TEA** (tasa efectiva anual) = ((1 + mensual/100)^12 − 1) × 100.
- Ejemplo: 2% mensual → TNA 24% · TEA 26.82%. La card muestra la TEA como "rentabilidad anual".

---

## 7. Flujo end-to-end

1. **Admin** crea el contratista (registro + scoring) y la oportunidad (garantías, monto, plazo, tasa mensual, fotos, riesgo) y la publica (`disponible`).
2. **Inversionista** entra a su catálogo, filtra/busca, compara y abre la ficha (condiciones, garantías, riesgo, contratista + N.ª operación).
3. **Reserva** — pulsa "Reservar": popup de compromiso → **hold de 24h SIN dinero**. La operación sale del pool (`reservada`); nadie más puede reservarla (claim atómico, dos inversionistas nunca toman la misma).
4. El inversionista puede **escribirle a su asesor por WhatsApp** para coordinar.
5. **Asesor** ve la reserva en su cola con cuenta regresiva, contacta al inversionista y **confirma** (o **libera** si el inversionista desiste). Si pasan 24h sin confirmar, vuelve sola al pool.
6. **Cierre directo (fuera de Don Gato):** inversionista y contratista formalizan (firma, garantía a nombre del inversionista, transferencia directa). **Don Gato solo cobra su comisión de intermediación.**
7. **Seguimiento:** el asesor hace tracking del repago; la operación pasa a `financiada` / al día / cancelada (estados a completar en el ciclo post-reserva).

---

## 8. Estados de la operación

`borrador` → `disponible` → `reservada` (hold 24h) → `cerrada` (confirmada por el asesor) → *[por construir]* `financiada` → seguimiento de repago.

- `reservada` → `disponible` si el asesor libera o expira el hold.
- Bitácora de reservas (`activa` / `confirmada` / `expirada` / `cancelada`) alimenta el **historial del inversionista** y la **cola del asesor**.

---

## 9. Compliance del área

- **Encuadre intermediario** (no tocamos dinero) — reduce la carga, pero requiere el papel legal.
- **SMV / intermediación:** el matching y las "inversiones personalizadas" se presentan como filtro por preferencias, **no** como asesoría.
- **PLAFT ligero:** cuando haya dinero real, verificar identidad y origen de fondos del inversionista, y antecedentes del contratista. Conservar evidencia.
- **Transparencia de riesgos** (copiado de InversionNPL): declarar abiertamente los riesgos — mora del Estado (pagos lentos), ejecución de garantías, incumplimiento de obra, iliquidez. Va con la voz honesta de Mochi.
- **Riesgos propios del producto contratista:** el pagador final suele ser el Estado (plazos largos), riesgo de que el contratista no termine la obra, calidad real de la garantía (una cesión de flujos no es lo mismo que una hipoteca de primer rango).

---

## 10. Estado actual del código (2026-07-23)

**Construido en `feat/portales`** (migraciones 0076-0078 aplicadas a prod):

- Núcleo multi-vertical `portal_*`, login secreto por portal, panel admin (usuarios, oportunidades, **contratistas** con scoring e historial, **Tablero con KPIs**).
- Catálogo del inversionista + ficha con condiciones (TNA/TEA), garantías y contratista + N.ª operación.
- Tasa mensual → TNA/TEA. Reserva (hold 24h, claim atómico, bitácora) a nivel de base.
- **En construcción (batch en curso):** sidebar por rol, popup de reserva, cola de reservas del asesor, WhatsApp al asesor, Configuración (contraseña + 2FA), dashboard del inversionista, guía rápida y filtros en el catálogo.

**Cuentas demo:** `admin | asesor | cliente .portales.demo@dongato.pe` (miembros de ambos portales). La contraseña **no se versiona**: vive en `.env.local` como `PORTALES_DEMO_PASSWORD`.

---

## 11. Roadmap

**Fase A — Core del portal** *(casi listo)*
Cuentas por admin · contratistas con scoring · oportunidades con garantías · catálogo · reserva 24h · tasa mensual · Tablero admin.

**Fase B — Cerrar el loop** *(siguiente)*
Notificaciones/correos entre roles (reserva→asesor, confirma→inversionista) reusando Resend · ciclo post-reserva (firma → transferencia directa → financiada) con tracking del asesor · registro de la comisión de intermediación por operación cerrada.

**Fase C — Respaldo y confianza**
Documentos por oportunidad (contrato, tasación, cesión) tipo data room · auditoría de seguridad de `portal_*` + bitácora de auditoría cableada · transparencia de riesgos en la ficha.

**Fase D — Retención y producto**
Perfilado del inversionista + inversiones personalizadas (matching como filtro) · PWA instalable + push · mapa/comparables (opcional).

**Fase E — Salida a producción**
Tests Vitest (tasa, claim atómico de reserva, guards) · auditoría de performance · merge `feat/portales` → main + deploy (noindex) · **gate legal SBS/SMV resuelto** antes de inversionistas reales.

---

## 12. KPIs a mirar (Tablero)

Operaciones por estado (disponibles / reservadas / cerradas) · monto intermediado · **comisión generada** · nº de inversionistas y asesores · nº de contratistas y su tasa de repago · reservas que expiran vs. que se confirman (calidad del pool).

---

## 13. Decisiones abiertas

- **% de comisión de intermediación** (cómo y cuánto cobramos por operación cerrada).
- ¿El contratista tendrá **login** en algún momento (subir sus papeles), o sigue siendo registro gestionado por staff?
- Mecanismo de desempate cuando **varios inversionistas** quieren la misma operación (hoy: primero-en-reservar con hold; opción futura: ventana de interés + regla publicada).
- ¿Ciclo de repago dentro del producto o solo tracking del asesor?
