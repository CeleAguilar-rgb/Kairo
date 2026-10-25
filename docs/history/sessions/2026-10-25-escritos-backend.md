# 2026-10-25 · Escritos completo: backend, front del canvas nuevo y conexión

**Hecho en:** Claude Code

## Qué se hizo

- A pedido explícito de la usuaria ("aplica todos los cambios de escritos, tanto del frontend como del backend… deja funcional esta parte"), se construyó Escritos de punta a punta en una sola sesión, en vez de los 11 pasos de front que quedaban del plan de 13 (Pasos 1 y 2 en `2026-10-25-escritos-plantillas.md`).
- **Compartido** (`packages/shared/src/writings/`): constantes nuevas (estados de historia, pestañas y contadores de un mundo, modos y colores de portada, campos especiales `role`/`home`/`place_type`), `templates.ts` con las plantillas de fábrica (Personaje, Especie, Lugar) y los ejemplos de secciones extra (las usan la API al crear un mundo y el demo), y los esquemas Zod de todo lo que se guarda. `FIELD_TYPES`/`characterSchema` se fueron: las columnas de personajes son ahora campos de su plantilla.
- **Base** (`apps/api/src/db/schema/writings.ts`): migración `0011` (9 tablas: `worlds`, `note_templates`, `characters`, `world_notes`, `world_eras`, `world_events`, `stories`, `pages`, `writing_days`, todas con RLS) y `0012` (`extras` y `url` en personajes y notas). Las dos aplicadas.
- **API** (`apps/api/src/modules/writings/`): un módulo con cuatro áreas (mundos y plantillas, fichas, línea del tiempo, historias y páginas), cada una con controller/service/repository. `WorldsService.refs()` da lo que existe en un mundo y con eso los demás services revisan cada id que llega (vínculos, quién/dónde de un evento, elenco, era, lugar, punto de vista). `mergeValues` revisa cada valor contra el tipo de su campo en la plantilla. Fotos, portadas y mapa en dos pasos con URL firmada (mismo `StorageService`, que ganó `createSignedDownloadUrls` para firmar varias a la vez). `test/writings.e2e-spec.ts`: 26 tests (aislamiento por endpoint, validaciones, cascadas y "Deshacer"), todos pasan.
- **Front** (`apps/web/src/features/writings/`):
  - `api.ts` lee una sola vez la biblioteca (`GET /writings/library`, con `cache`) y arma Inicio, la página de un mundo, el editor y la base de datos. `mock.ts` es ahora el mundo Aurelun del canvas con la forma de la API, solo para mirar en modo demo (`mock-store.ts` se fue).
  - Acciones nuevas que llaman a la API: `world-actions`, `entry-actions`, `timeline-actions`, `story-actions`, `page-actions` (con el "Deshacer" genérico `"<tipo>:<id>"`).
  - La página de un mundo se rehízo completa sobre el canvas (`components/world/`): `WorldShell` en el layout carga el mundo una vez y lo reparte por contexto (`WorldContext`); portada con contadores elegibles, barra de pestañas personalizable con menú "Más" y "Nueva sección", y un único panel lateral para fichas, eras, eventos, plantillas, pestañas y contadores. Pestañas: Resumen (sinopsis, "Dónde y cuándo", huecos, reglas, recuadros), Línea del tiempo, Regiones (lugares dentro de lugares, mapa), Historias (arcos, capítulos, elenco, material), Personajes, Especies y cada sección extra. Páginas completas de ficha (portada automática/color/imagen, secciones y bloques Tiptap con "/") y de evento. `world-utils.ts` tiene toda la lógica pura (menciones, tabla región × era, huecos, reinos, contadores).
  - Base de datos de personajes y su panel adaptados a los campos de plantilla (ahora con vínculo y era); el editor de páginas muestra arco, era y punto de vista de un capítulo.
  - Tokens nuevos de portada: `--cover-sage` y `--cover-peach` (salvia y calabaza del canvas).
- Documentación: `data-model.md` (columnas nuevas y `writing_days`), decisión #47, `roadmap.md`.

## Decisiones tomadas

- **Decisión #47** (en `docs/guides/decisions.md`): una sola lectura de la biblioteca; columnas que pidió el canvas (`stories.status`/`resources`, `pages.tag`, `extras`/`url`, `writing_days`); `attachments` sin `page_id` todavía; borrar con la misma marca de tiempo y `restore` por tipo; lo que se calcula y no se guarda (menciones, tabla, huecos, contadores, reino de un personaje, lugar "de noche" = portada tinta); el demo de Escritos solo se mira.

## Archivos o partes importantes que se tocaron

- `packages/shared/src/writings/{constants,schemas,templates}.ts`, `packages/shared/src/index.ts`.
- `apps/api/src/db/schema/writings.ts`, `apps/api/src/drizzle/0011_writings_tables.sql`, `0012_writings_entry_extras.sql` (+ snapshots), `apps/api/src/modules/writings/*`, `apps/api/src/app.module.ts`, `apps/api/src/common/storage/storage.service.ts`, `apps/api/test/writings.e2e-spec.ts`.
- `apps/web/src/features/writings/` casi entero; `components/world/` es nuevo; se borraron los `World*.tsx` viejos, `TemplateEditorDrawer`, `mock-store.ts`, `character-actions.ts` y `template-actions.ts`.
- Rutas en `apps/web/src/app/(dashboard)/escritos/mundos/[id]/`: las pestañas, y nuevas `seccion/[templateId]`, `ficha/[entryId]` y `evento/[eventId]`.
- `apps/web/src/styles/{tokens,semantic}.css`, `modes/light.css`.

## Quedó pendiente

- **Probar todo en el navegador con una cuenta real.** No se pudo en esta sesión: la pantalla pide entrar y Claude no escribe contraseñas. Lo verificado: typecheck y lint de los tres paquetes y los 26 e2e de Escritos. La suite completa de la API pasó salvo un test de Proyectos ("el contrato con el front") que venía roto de antes (esperaba la forma de un proyecto sin `coverUrl`, de la decisión #44); se actualizó `test/projects.e2e-spec.ts` y sus 27 tests pasan. Hay que recorrer: crear un mundo, cada pestaña, el panel (ver/editar/vincular/borrar/deshacer), plantillas, pestañas y contadores, una sección nueva, eras y eventos (mover, cambiar de era), historias (arcos, capítulos, elenco, material), fotos, portadas y mapa, la página completa de una ficha (bloques), la base de datos de personajes y las palabras de la semana al escribir.
- El mundo de ejemplo de Aurelun **no se pasa solo a la cuenta real**: en modo real se empieza de cero (crear el mundo y llenarlo).
- La gráfica del Resumen ("Dónde y cuándo") muestra cada evento sin "dónde" en la fila "Todo <mundo>": con muchos eventos se ve llena (las celdas muestran 3 y "+N más").

## Notas para la siguiente sesión

- Para cambiar algo de Escritos, el mapa es: `world-utils.ts` (lógica pura), `components/world/WorldContext.tsx` (panel y `run()` con avisos y "Deshacer"), y un archivo por pestaña o panel en `components/world/`.
- El modo demo de Escritos ahora solo se mira; si se quiere probar guardando, hay que usar la app real.
