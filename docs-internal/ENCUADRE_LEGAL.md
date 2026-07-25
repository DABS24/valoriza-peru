# Portales de inversión · Encuadre legal y líneas rojas

> **Este es el documento que define QUÉ PODEMOS SER y qué no.** Última actualización:
> 2026-07-24. Aplica a **GarantizaPeru** (`cgh`) y **ValorizaPeru** (`contratista`).
>
> Si vas a construir una feature nueva en los portales, leé la sección **Líneas rojas**
> antes de escribir código. Varias features que parecen inocentes cambian el régimen
> regulatorio del negocio entero.

---

## 1 · Qué somos

**Intermediario puro.** Modelo tipo G Inversiones:

- Don Gato **nunca toca ni custodia el dinero**. El inversionista transfiere **directo a
  la empresa** que recibe el financiamiento.
- Don Gato **evalúa, publica, presenta y hace seguimiento**, y cobra una **comisión de
  intermediación** que **paga la empresa** (se descuenta al desembolso).
- Cada operación termina en un **contrato bilateral privado** entre el inversionista y
  la empresa. **Don Gato no es parte de ese contrato.**
- Los portales son **privados y por invitación**. El admin crea todas las cuentas. **No
  existe registro público** y nunca debe existir.

## 2 · Cómo opera de verdad el negocio (esto define el producto)

El negocio es **presencial**, no un marketplace self-service. La app existe para
**gestión interna, seguimiento y apoyo**, no para captar:

1. El cliente va a la **oficina**. El asesor le explica y le muestra oportunidades.
2. El asesor barre el pool, sabe a quién llamar, y **cierra por teléfono**.
3. **El asesor bloquea la operación**, no el cliente.
4. **El cliente entra a la plataforma recién cuando ya compró.** Regla del negocio: solo
   se le crea cuenta a quien hizo una operación.
5. Después, el asesor le hace seguimiento por la plataforma.

**Consecuencia de producto:** el catálogo NO es una oferta al público — quien lo ve ya
es cliente. Esa es una de las razones más fuertes por las que el portal no es una
plataforma de financiamiento participativo.

**Consecuencia de diseño:** la herramienta principal es la del **asesor**. El
self-service del inversionista es secundario.

## 3 · Líneas rojas — no construir sin opinión legal escrita

Estas features **cambian el régimen regulatorio**. No son "mejoras": son cruces de
frontera. Ninguna se implementa sin consultar antes.

| Feature | Por qué cruza |
|---|---|
| **Reserva con monto parcial elegida por el inversionista en la web** | Deja de ser un mutuo bilateral y se parece a una colecta → régimen de Financiamiento Participativo Financiero (autorización SMV). Ver §4 — ojo: la sindicación **registrada por el asesor** es otra cosa. |
| **Cualquier "cuenta de la operación", saldo, wallet, escrow o abono a cuenta de Don Gato** | Es custodia. Rompe el núcleo del encuadre. |
| **Que la plataforma recaude los repagos y los reparta al inversionista** | Custodia + administración de fondos de terceros. |
| **Mercado secundario, recompra o "retiro anticipado"** | Negociación de valores. |
| **Registro abierto de inversionistas o landing pública ofreciendo rentabilidades** | Oferta pública. Es lo contrario de "privado por invitación". |
| **Promesa de rendimiento, garantía de recompra o "fondo de protección"** | Convierte el retorno en obligación nuestra. |
| **Reinversión automática o portafolio diversificado** | Administración discrecional de cartera. |

## 4 · El caso de la co-inversión (pendiente de definir)

En la operación real de G Inversiones a veces **un inversionista no toma toda la
propiedad**, y el asesor tiene unos días para juntar a otros — pueden ser **5 personas
con un % de participación** cada una.

Eso **hoy no está implementado**, y **la migración 0088 lo bloquea a propósito** (índice
único: una sola reserva viva por oportunidad). Razón: sin un modelo de participaciones,
dos reservas activas no son co-inversión, son **corrupción de datos** — dos personas
creyéndose la contraparte.

**Si se implementa**, el matiz que hay que confirmar con el abogado es:

> ¿Un contrato de mutuo con **varios acreedores en participación**, armado **offline por
> nuestro asesor** y solo **registrado** en nuestra plataforma privada, requiere
> autorización?

La diferencia defendible: **crowdfunding** = la plataforma ofrece públicamente y agrega
aportes de desconocidos. **Sindicación privada** = el asesor arma un grupo por teléfono
y todos firman un contrato con participación proindiviso; la app solo lo registra.

**Hold de la sindicación: 5 días** (decisión de Diego, 2026-07-24). El hold normal de
una reserva es de 24 h, pero cuando el asesor está armando un grupo necesita días
para juntar a los participantes. Debe mostrarse como **cuenta regresiva visible**
(cuánto tiempo queda), no como una fecha suelta: ya existe `CuentaRegresiva` en el
repo, se reusa.

**Dependencia técnica:** la co-inversión debe decidirse **ANTES** del ciclo de repago.
Si 5 personas cobran proporcionalmente, el esquema de repago cambia entero. Construir
repago para un solo inversionista y agregar sindicación después = rehacerlo.

### 4.1 · Criterio de diseño (decidido 2026-07-24) — de qué lado de la línea se construye

La frontera **no** es "¿hay más de un inversionista?". Es **quién arma el grupo y por qué
canal**. Por eso ambas piezas delicadas se construyen así, y solo así:

| Pieza | ✅ Del lado correcto | ❌ Lo que la cruzaría |
|---|---|---|
| **Co-inversión** | El **asesor REGISTRA** un grupo que armó él, offline (por teléfono o en la oficina). La app documenta un contrato privado ya acordado. | Que el **inversionista elija un monto parcial en la web** y la plataforma agregue aportes. Eso es una colecta. |
| **Repago** | **Registro atestiguado**: alguien (inversionista o asesor) confirma que el pago ocurrió, y queda asentado con auditoría. La plataforma **observa**. | Que la plataforma **reciba** los repagos y los reparta. Eso es custodia. |

Regla mental: **registrar ≠ recaudar. Documentar ≠ intermediar aportes.** Mientras el
dinero y el armado del grupo ocurran fuera de la plataforma, la app es un tracker de un
contrato que las partes ya cerraron.

Esto **no reemplaza la opinión legal** — sigue siendo la consulta de §4. Es el criterio
que permite construirlo del lado defendible mientras esa respuesta llega.

## 5 · El ciclo de repago (no construido, a propósito)

Hoy el producto **termina en `financiada`**. No existe tabla de cuotas, mora ni estados
post-desembolso. Consecuencia: el inversionista no puede saber si le están pagando, el
cronograma del empresario es una simulación permanente, y el track record es un proxy
(operaciones `cerrada`), no historial de pago real.

Es **el techo de los 4 perfiles** (inversionista, empresario, asesor, admin).

**Por qué no se construyó:** registrar repagos acerca a Don Gato de "vitrina que conecta"
a **"administrador del crédito"**. Si la plataforma es un **tracker de un contrato
bilateral que las partes ya firmaron**, es defendible. Va en la misma consulta al
abogado que §4.

## 6 · Asimetría de la comisión (decisión de negocio, respetarla)

| Quién | Ve el monto/% de la comisión | Por qué |
|---|---|---|
| **Empresario** | **SÍ**, todo su desglose | La paga él. De ese número depende que acepte. |
| **Staff** (asesor/admin) | **SÍ** | Es intel interna del negocio. |
| **Inversionista** | **NO** | No sale de su retorno: para su decisión es ruido. La verá en los documentos al firmar. |

Al inversionista **sí** se le dice **el modelo** (que Don Gato cobra una comisión a la
empresa, que no es parte del contrato y que no recibe su dinero) — nunca la cifra. Eso
vive en `components/portales/FlujoDinero.tsx`.

⚠️ Si alguna vez el código dice "la comisión NUNCA se muestra a nadie", está
desactualizado: esa afirmación ya fue corregida una vez por ser falsa.

## 7 · Invariantes garantizados por la base (no por la UI)

Estos sostienen el encuadre. Están en SQL **a propósito**: si vivieran en la aplicación,
cualquier camino nuevo los saltaría.

| Invariante | Dónde | Migración |
|---|---|---|
| Una oportunidad tiene **como máximo un inversionista** (una reserva viva) | Índice único parcial en `portal_reservas` | **0088** |
| La bitácora de los portales está **aislada** de la de Efectivo, con hash-chain propio por portal, y cada admin lee **solo la suya** | `portal_eventos_auditoria` | **0089** |
| El inversionista **no puede leer** las notas internas del asesor sobre él | RLS de `portal_notas` | **0086** |
| El empresario **no puede reservar** su propia operación | Guard | 0081 |
| Reserva atómica: el segundo que llega rebota | Claim condicional sobre `estado_publicacion` | 0078/0079 |

## 8 · Contenido legal visible al usuario

- **Términos por portal**: `/{portal}/terminos` (`components/portales/TerminosPage.tsx`),
  enlazado desde el pie del `PortalShell`.
- **Disclaimer de capital en riesgo**: `COPY.portales.disclaimerCapital`, en ficha y catálogo.
- **Proceso de recuperación ante impago**: por vertical, en `lib/portales/config.ts`
  (`recuperacion`). Es **obligatorio** en toda vertical nueva.
- **Pie legal**: "Operado por Don Gato Servicios SAC".

🔴 **PENDIENTE — todo lo legal es BORRADOR hasta que lo revise el abogado de Fase 0.**
Puntos que necesitan revisión:
- La caracterización "no constituye una oferta pública de inversión".
- "No capta depósitos del público, no otorga créditos por cuenta propia y no administra
  fondos de terceros" + la negativa SBS/SMV.
- El proceso de recuperación (describe la ejecución de garantías en Perú).
- Que la comisión la pague la empresa: **el contrato tipo debe decirlo**, porque al
  inversionista se le promete que "queda por escrito en los documentos que se firman".
- Lo que deliberadamente NO se inventó: jurisdicción, protección de datos, resolución de
  reclamos, plazos.

## 9 · Reglas de redacción (YMYL — dinero del usuario)

- **Nunca** prometer recuperación garantizada, rentabilidad asegurada ni "sin riesgo".
- **Nunca** publicar plazos operativos nuestros que no tengan un procedimiento documentado
  detrás. Ya pasó una vez: se publicó "el equipo contacta el mismo día / carta notarial
  entre 15 y 30 días / ejecución desde el día 60" sin que existiera ese procedimiento.
  Se reemplazó por la **secuencia** ("apenas hay atraso", "si el atraso continúa").
- Lo que depende de un juez, se dice que depende de un juez.
- **Números honestos**: si falta un dato, "por definir" — nunca asumir 0 ni mostrar el
  escenario más favorable. Con rango de plazo, el costo del empresario se muestra por el
  **techo**, no por el piso.

## 10 · Aislamiento de Don Gato Efectivo

Son negocios distintos y no deben compartir marca, datos ni registros legales. Estado y
costuras: la separación ya se hizo (2026-07-25); este repo ES el portal.

**Sí conviene compartir** (buena ingeniería, no es acoplamiento): `lib/formatters`,
`lib/cn.ts`, `lib/files.ts`, clientes de Supabase, componentes base sin marca, y el
generador de PDF (ya parametrizado por marca).

**No debe compartirse**: correos y su remitente, páginas de establecer contraseña,
bitácora de auditoría, contenido legal, favicon/JSON-LD/título, canal de soporte.
