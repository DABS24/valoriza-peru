# Separar la base — runbook

> Hoy este portal **comparte el proyecto Supabase** con el otro producto de la SAC
> (Don Gato Efectivo), para no consumir otra cuota del plan gratis. La regla es:
> **comparten el proyecto, se comportan como bases separadas.**
>
> Este documento es el mapa para cortar el día que se quiera, sin arqueología.
> Última verificación contra la base real: **2026-07-25**.

## Por qué hoy es barato y mañana no

Lo único que NO se separa por prefijo es **`auth.users`**: es del proyecto, no de un
producto, y las 16 FKs del portal apuntan ahí. Mover usuarios entre proyectos
Supabase significa mover contraseñas hasheadas — no se copian desde el dashboard.

Hoy los únicos usuarios del portal son **las 4 cuentas demo del seed**, así que
"migrar" es en realidad: crear el proyecto, correr las migraciones, correr el seed.
**En cuanto entre el primer inversionista real, ese paso pasa a costar.** Si se
decide separar, conviene hacerlo antes de ese momento.

## Inventario — todo lo del portal (verificado)

**11 tablas** (todas con prefijo, ninguna excepción):

```
portal_miembros            portal_oportunidades       portal_garantias
portal_prestatarios        portal_reservas            portal_prospectos
portal_solicitudes         portal_notas               portal_oportunidad_fotos
portal_oportunidad_docs    portal_eventos_auditoria
```

**13 funciones:** `portal_mi_rol`, `portal_es_staff`, `portal_es_admin`,
`portal_reservar`, `portal_reservar_para`, `portal_confirmar_reserva`,
`portal_liberar_reserva`, `portal_liberar_vencidas`, `portal_convertir_prospecto`,
`portal_mi_prestatario_id`, `portal_auditoria_hash`, `portal_auditoria_encadenar`,
`portal_tg_updated_at`.

**4 enums:** `portal_rol`, `portal_estado_miembro`, `portal_estado_oportunidad`,
`portal_nivel_riesgo`.

**7 triggers:** los 6 `portal_*_updated_at` + `trg_portal_auditoria_encadenar`.

**1 bucket de Storage:** `portal-media` (con sus policies).

**Dependencias externas: solo `auth.users`.** Cero FKs a tablas del otro producto,
cero funciones ajenas (el último cruce —`tg_updated_at`— se cerró en la migración
`1000_frontera_base_compartida.sql`).

## Pasos del corte

1. **Crear el proyecto Supabase nuevo.** Misma región que el actual (São Paulo,
   `sa-east-1`) para no meter latencia.
2. **Correr las migraciones en orden** (`0076`→`0091`, después `1000`+) en el SQL
   Editor del proyecto nuevo. Son la fuente de verdad del esquema.
3. **Crear el bucket `portal-media`** por la Storage API — `storage.buckets` no
   acepta DML directo (se intentó; no funciona). Sus policies sí van por SQL, y
   **las policies se dropean antes que las funciones de las que dependen**.
4. **Usuarios.** Mientras sean solo cuentas demo: correr `scripts/seed-portales.mjs`
   contra el proyecto nuevo y listo. Si ya hay usuarios reales, hay que migrarlos con
   sus hashes (Admin API con `password_hash`, no `password`) o forzar a cada uno a
   establecer contraseña de nuevo — decisión de producto, no técnica.
5. **Datos.** Si hay que llevarlos: `pg_dump` acotado al prefijo, que ahora alcanza
   porque no hay nada fuera de él.
   ```bash
   pg_dump "$ORIGEN" --data-only --table='public.portal_*' > portal-data.sql
   ```
   Ojo con el orden de inserción: `portal_miembros` y `portal_oportunidades` antes de
   lo que las referencia. Y los `user_id` tienen que existir en el `auth.users`
   destino ANTES (paso 4) o las FKs rebotan.
6. **Archivos.** Copiar los objetos de `portal-media` (listar y re-subir con la
   service_role de cada lado). Los paths se conservan: la primera carpeta es el slug
   del portal y la RLS de storage depende de eso.
7. **Cambiar las claves**: `.env.local` local y las variables del site en Netlify
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).
8. **Verificar antes de cantar victoria**: login real de cada rol, una reserva de
   punta a punta, y que la bitácora encadene. No alcanza con que la app levante.
9. **Recién entonces, limpiar el proyecto viejo** (abajo).

## Limpieza del proyecto viejo (irreversible — al final y con OK explícito)

```sql
-- Policies primero (dependen de las funciones), después tablas, después funciones
-- y enums. El CASCADE de las tablas se lleva sus triggers e índices.
drop table if exists
  public.portal_eventos_auditoria, public.portal_notas, public.portal_prospectos,
  public.portal_oportunidad_docs, public.portal_oportunidad_fotos,
  public.portal_reservas, public.portal_solicitudes, public.portal_garantias,
  public.portal_oportunidades, public.portal_prestatarios, public.portal_miembros
  cascade;

drop function if exists
  public.portal_mi_rol(text), public.portal_es_staff(text), public.portal_es_admin(text),
  public.portal_reservar(uuid), public.portal_reservar_para(uuid, uuid),
  public.portal_confirmar_reserva(uuid), public.portal_liberar_reserva(uuid),
  public.portal_liberar_vencidas(), public.portal_convertir_prospecto(uuid, uuid),
  public.portal_mi_prestatario_id(text), public.portal_auditoria_hash(),
  public.portal_auditoria_encadenar(), public.portal_tg_updated_at()
  cascade;

drop type if exists
  public.portal_rol, public.portal_estado_miembro,
  public.portal_estado_oportunidad, public.portal_nivel_riesgo
  cascade;
```

⚠️ **Las firmas de las funciones hay que confirmarlas contra la base** antes de
correr esto (`\df portal_*` o la vista `pg_proc`): un `drop function` con la firma
equivocada falla, y con la equivocada-pero-válida borra otra cosa.

El bucket `portal-media` se borra por la **Storage API**, no por SQL.

Y los usuarios del portal en `auth.users` del proyecto viejo: se borran **uno por
uno y verificando**, nunca con un "borrá todos menos X" — ver la protección que se
agregó a `scripts/factory-reset.mjs` en el repo de Don Gato, que existe justamente
porque ese script borraba las cuentas de este portal sin saberlo.
