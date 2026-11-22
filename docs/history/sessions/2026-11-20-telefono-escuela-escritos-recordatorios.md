# 2026-11-20 · Teléfono: Escuela, Escritos y Recordatorios (rama `movil`)

**Hecho en:** Claude Code

## Qué se hizo
- Se revisaron las tres pantallas de teléfono que faltaban, a pedido de la usuaria ("revisa todas las pantallas pendientes"). Solo CSS y marcado; sin cambios de datos ni de API.
- **Escuela:** el horario abre en "Por día" en el teléfono (`useNarrowScreen`, solo como valor por defecto; si la persona cambia de vista, esa manda). La tabla de Calificaciones pasa a tarjetas por materia en ≤720px (`data-label` en las celdas, encabezado oculto a la vista pero leído por lectores de pantalla); se quitó el `overflow-x` que dibujaba la barra vertical.
- **Escritos:** la matriz región × era del resumen y la tabla y el tablero de la base de personajes usan `ScrollFade`; las tarjetas de historias usan `ChipRow`. La matriz es más angosta en el teléfono (`112px` + eras de `140px`). `min-width: min(100%, 240px)` en el texto de la ficha de historia.
- **Recordatorios:** se quitó el `overflow-x` de `.segmentedWrap` en el formulario y los campos de fecha y hora no pasan del ancho de la tarjeta.
- `docs/movil/revision.md` (casillas) y `docs/movil/para-celeste.md` (punto 14).

## Decisiones tomadas
- Calificaciones en el teléfono como tarjetas, no como tabla que se desliza: son pocas columnas (3 parciales y promedio) y editar una casilla dentro de una tabla escondida a medias es incómodo. Es de interfaz; no toca `decisions.md`.
- La base de personajes (tabla y tablero) sí se queda como deslizable con `ScrollFade`: tiene columnas personalizables y no hay forma razonable de convertirla en tarjetas.

## Archivos o partes importantes que se tocaron
- `apps/web/src/features/school/components/`: `ScheduleGrid.tsx`, `GradesTable.tsx` y su CSS.
- `apps/web/src/features/writings/components/`: `CharactersDatabase`, `world/SummaryTab`, `world/StoriesTab` (tsx y CSS).
- `apps/web/src/features/reminders/components/ReminderForm.module.css`.

## Quedó pendiente
- Visto a 375 px en el demo (`web-demo`, puerto 3010): horario "Por día", calificaciones como tarjetas (se alineó el promedio con las casillas tras verlo), resumen de Escritos, tabla de personajes, historias y el formulario de Recordatorios, sin barra vertical ni desborde de página. **No se probó el tablero** de personajes: el demo no trae una propiedad de tipo Selección.
- Escritos: revisar el editor de páginas, las fichas y el mapa con el teclado abierto (no se tocó).
- Recordatorios: se vio la lista y el formulario; el menú de posponer (180 px) no se abrió.
- Probar todo en un teléfono real, en modo oscuro y con letra grande; luego pasar `movil` a `main` por Pull Request.
- Sin commit todavía.

## Notas para la siguiente sesión
- Rama de trabajo: `movil`. Nunca `main`.
- Para que algo se deslice de lado: `ScrollFade` (bloques, tablas), `ChipRow` (filas de chips o tarjetas) o `ScrollTabs`. Nunca un `overflow-x: auto` propio: fuerza `overflow-y` y dibuja una barra vertical. Si hace falta dejar espacio al aro de foco, padding vertical con margen negativo igual.
- No hay Python en esta máquina: los cambios a archivos se hacen con Edit.
