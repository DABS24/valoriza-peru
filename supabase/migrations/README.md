# Migraciones

Numeración correlativa, **acumulativa**: una migración vieja puede haber sido
reemplazada por otra posterior. Antes de afirmar qué hace una función, verificar
cuál es su versión vigente — grepear esta carpeta puede devolver código MUERTO.

## ⚠️ Una base, dos repos: rangos repartidos

Este portal **comparte el proyecto Supabase** con el otro producto de la SAC (Don
Gato Efectivo), por decisión del 2026-07-25: no gastar otra cuota del plan gratis.
La base es una sola, así que la secuencia de migraciones también. Para no coordinar
números entre dos repos, el rango está repartido:

- **Don Gato Efectivo** → usó `0001`–`0075`. Su rango es `0092`–`0999`.
- **ValorizaPeru** (este repo) → usó `0076`–`0091` (el esquema `portal_*` nació dentro
  de ese monorepo). **Su rango es `1000`+.**

**La próxima migración de este repo va con `1000`+** (la primera es
`1000_frontera_base_compartida.sql`). Nunca se toma un número por debajo de 1000:
si los dos repos usaran "el siguiente libre", ambos escribirían `0092` sin verse y
el segundo choca o se saltea en silencio.

## Cómo se aplican

No hay conexión directa por script: **se pegan en el SQL Editor** del proyecto
Supabase, en orden. Cada migración termina con un `select` de verificación — se lee
el resultado, no se supone que funcionó.

## Frontera con la base compartida

Todo lo de este portal está bajo el prefijo **`portal_*`** (11 tablas, 13 funciones,
4 enums, 7 triggers) más el bucket `portal-media`. Su única dependencia externa es
`auth.users`, que es del proyecto y no de ningún producto.

Eso es lo que hace que el corte futuro sea un dump por prefijo en vez de arqueología
— y es una invariante que hay que mantener: **una tabla o función nueva de este
portal va con prefijo `portal_`, siempre.** El runbook del corte, con el inventario
verificado, está en [`docs-internal/SEPARAR_BASE.md`](../../docs-internal/SEPARAR_BASE.md).
