# ValorizaPeru — proyecto (portal `contratista`)

> Plan de negocio profundo: [`PLAN_CONTRATISTAS.md`](PLAN_CONTRATISTAS.md).
> Encuadre legal y líneas rojas: [`ENCUADRE_LEGAL.md`](ENCUADRE_LEGAL.md).
> Última actualización: 2026-07-25 (separación a su propio repo).

## Qué es
Portal secreto de **financiamiento a contratistas del Estado**: inversionistas financian
a contratistas que ganan obras/contratos públicos y necesitan liquidez corta (2/4/6
meses) mientras el Estado les paga. Don Gato es **intermediario** (no toca el dinero;
cobra comisión). El nombre "Valoriza" viene de las **valorizaciones** de obra pública.

## Marca (single-source)
- **Nombre:** ValorizaPeru — `lib/constants.ts` (`BRAND`), que `lib/portales/config.ts` lee. *(Provisional; verificar dominio + Indecopi.)*
- **Color:** teal `#0D9488` — `lib/portales/tema.ts` (`ACENTOS.contratista`).
- Tipografía Plus Jakarta Sans, **sin mascota**, wordmark de texto, pie "Operado por Don Gato Servicios SAC". Tema siempre claro (blanco).

## Ruta y accesos
- URLs: `/login`, `/{cliente,asesor,admin,empresario}/…` (el portal está montado en la RAÍZ de su dominio).
- Sin auto-registro, sin KYC en el alta: **el admin crea todas las cuentas**.

## Roles
- **Admin:** crea usuarios, **contratistas** y oportunidades; pone el scoring.
- **Asesor:** cartera de inversionistas + cola de reservas (confirmar/liberar).
- **Inversionista (cliente):** catálogo, reserva 24h, historial, WhatsApp a su asesor.
- **Contratista (prestatario):** registro gestionado por el staff (NO login), con scoring de pagador e historial ("N.ª operación").

## Producto
- **Oportunidad** = contratista pidiendo financiamiento. `datos` jsonb: entidad_estatal, tipo_contrato, ruc, monto_contrato, avance_obra, plazo.
- **Garantías** (`portal_garantias`, 1..N, tipo abierto): hipoteca, factoring, cuentas por cobrar, cheque, pagaré, aval, cesión de flujos, mobiliaria, mutuo.
- **Prestatario** (`portal_prestatarios`): contratista recurrente con scoring de pagador (color) + nº de operaciones. Al cliente se le muestra nombre + "N.ª operación", NUNCA el scoring/notas.
- **Tasa:** ganancia mensual → TNA/TEA derivadas.

## Flujo de reserva (sin dinero)
Igual que GarantizaPeru: `disponible` → Reservar (hold 24h atómico) → `reservada` → asesor confirma/libera → expira a 24h. Bitácora `portal_reservas`.

## Base de datos
`portal_*` con `portal='contratista'` + `portal_prestatarios` (usado solo por esta vertical, vía flag `prestatarios` en config). Helpers `portal_es_admin/staff/mi_rol('contratista')`. Migraciones 0076-0078. Bucket `portal-media` (path `contratista/…`).

## Diferenciador y riesgos (de la investigación)
Hueco real: **nadie especializado en contratistas del Estado** con scoring propio sobre
data OSCE/SEACE. Está vacío por una razón dura: **cobrar al Estado es lento/litigioso**
→ el foso es resolver la cobranza (cesión de derecho de cobro notificada, Art. 65 Ley
32069). 🔴 El encuadre "intermediario que no toca dinero" NO está confirmado exento —
exige opinión SMV+SBS. Detalle en el plan.

## Correr local
Mismo seed y cuentas que GarantizaPeru (ver [`GARANTIZAPERU.md`](GARANTIZAPERU.md)); el
seed crea 5 contratistas demo con historial.

## Estado
Core funcionando. Pendiente: notificaciones, ciclo post-reserva, gate legal.
