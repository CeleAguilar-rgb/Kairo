# 2026-10-20 · Escuela conectada a su backend real

**Hecho en:** Claude Code

## Qué se hizo

- **Escuela reconectada a su backend real** (séptimo módulo de Fase 1b), a pedido explícito ("hazlo tú todo"). Antes de construir se resolvió qué necesita tabla propia y qué se arma con otros módulos (decisión #43): la materia **es** un proyecto `school`, sus clases son **eventos semanales de Agenda** (uno por día de clase) y sus entregas son **tareas** de ese proyecto. Solo hay dos tablas propias: `school_terms` (periodo) y `subjects` (profesor, color y las tres calificaciones). Se descartaron `class_sessions`, `assignments` y `prep_items` del `data-model.md` anterior.
  - **Base de datos:** migración `0009_school_tables.sql` (`school_terms`, `subjects`, enum `subject_color`, checks de fechas y de calificaciones 0–10, índice único del proyecto de cada materia). Aplicada (10 migraciones).
  - **API:** `modules/school/` (periodos: listar, crear, editar; materias: listar, crear, calificaciones, borrar). Crear una materia **orquesta tres módulos** (Proyectos → fila propia → una serie de Agenda por día) y, si falla a medias, manda a la papelera lo ya creado. Las clases empiezan con el periodo y terminan con él. Borrar una materia manda a la papelera sus tareas con subtareas, sus eventos, sus sprints, su proyecto y su fila (idempotente: volver a pedirlo termina un borrado interrumpido). Para eso se agregaron métodos públicos a los services de los otros módulos: `AgendaService.create(..., until)` y `.deleteByProject`, `TasksService.deleteByProject`, `SprintsService.deleteByProject` y `ProjectsService.softDelete` (sin ruta `DELETE /projects/:id`). Agenda y Sprints ahora exportan su service.
  - **Esquemas compartidos:** `createSubjectSchema` pide al menos un día de clase; nuevos `createSubjectBodySchema` (con `termId`), `subjectGradesSchema` (una casilla a la vez) y `termSchema`.
  - **Front:** `api.ts` junta Escuela, Agenda, Tareas y Proyectos; `school-utils.ts` arma el periodo actual, las clases (desde los eventos), las entregas y la preparación (decisión #38); acciones reales; `mock-store.ts` borrado (el demo conserva `mock.ts`). Cambios de pantalla: cuenta regresiva y lista de preparación reales, botón y cajón **"Periodo"**, **calificaciones editables** en la tabla, entregas sin tipo ni fecha, y un grupo "Sin fecha". Al abrir, si el periodo no ha empezado, arranca en "Antes de empezar".
  - **Tests:** `test/school.e2e-spec.ts` nuevo, 29 tests (periodos, materias con sus series de Agenda, un periodo o proyecto ajeno, la compensación cuando Agenda falla, calificaciones, borrar con todo lo que arrastra, borrado interrumpido y aislamiento).
- **Probado en Edge real** (API y front reales, usuario temporal que se borró al terminar): pantalla vacía, validación del cajón de materia, crear el periodo (con su validación), cuenta regresiva y casillas de preparación (marcar y desmarcar cambia la tarea), crear dos materias (proyecto, fila, series semanales, fechas, salón, horario en las columnas correctas, tarjetas), entregas (grupos, atrasada en rojo, hecha hace más de 14 días fuera, marcar y desmarcar), calificaciones (coma decimal, redondeo, rechazar 11 y texto, vaciar, promedios) y borrar una materia con su confirmación.
- **Dos hallazgos de la pantalla del 18 de octubre, que nunca se había visto en un navegador real:** los cuadritos de color del cajón "Nueva materia" salían en blanco (el `all: unset` del botón borraba el `background` de la clase de color) y, en las casillas nuevas de calificación, Escape descartaba el texto pero el `blur` posterior lo guardaba igual. Los dos corregidos.

## Decisiones tomadas

- **#43** (Escuela: dos tablas propias, la materia es un proyecto, clases = eventos de Agenda, entregas = tareas, orquestación con compensación, borrado en cascada a la papelera, calificaciones en tres columnas, y los dos huecos del canvas que se llenaron). En `docs/guides/decisions.md`.

## Archivos o partes importantes que se tocaron

- `packages/shared/src/school/schemas.ts`.
- `apps/api/src/db/schema/school.ts` (nuevo), `src/drizzle/0009_*`, `src/modules/school/` (nuevo), `agenda/`, `tasks/`, `projects/`, `sprints/` (métodos públicos), `app.module.ts`, `test/school.e2e-spec.ts`.
- `apps/web/src/features/school/` (`types.ts`, `mock.ts`, `school-utils.ts`, `api.ts`, `actions.ts`, `SchoolView`, `SchoolHeader`, `PrepView`, `SubjectsGrid`, `AssignmentsList`, `GradesTable`, `SubjectDrawer`, `TermDrawer` nuevo; `mock-store.ts` borrado), `features/agenda/api.ts` (`listEventRecords`), `app/(dashboard)/escuela/page.tsx`.
- `docs/guides/data-model.md`, `decisions.md`, `roadmap.md`.

## Quedó pendiente

- **Revisión de ella:** Escuela en el navegador (no se probó en 390 px) y, sobre todo, los dos huecos que se llenaron sin estar en el canvas (botón "Periodo" y calificaciones editables): si no le gustan, se quitan o se cambian.
- **Sin lugar fijo:** editar una materia (profesor, color, días), el tipo de entrega (pediría un campo nuevo en Tareas) y que cambiar las fechas de un periodo ajuste el fin de las clases ya creadas (hoy se cambia en Agenda).
- Las clases ya salen en Agenda, pero no se probó que aparezcan en la rutina de Día a día (el canvas lo promete; Día a día enlaza bloques por área o proyecto, sin leer Agenda).
- Los pendientes de Finanzas y Proyectos de la sesión anterior (botón "Repetir", 390 px, archivos) siguen igual.

## Notas para la siguiente sesión

- Siguiente en el orden (decisión #41): **Archivos (Storage)**, paso propio y delicado (`security.md`): tabla `attachments`, bucket privado con URLs firmadas, límites y cuota; conecta la pestaña Archivos de Proyectos (`getProjectFiles` ya devuelve `storageReady`) y la portada subida. Después Escritos, Enfoque y lo global.
- Al borrar una materia no hay "Deshacer" (el canvas solo trae la confirmación): recuperarla llega con la Papelera.
- Si se vuelven a correr los e2e, correrlos solos: comparten conexión con las pruebas de navegador.
