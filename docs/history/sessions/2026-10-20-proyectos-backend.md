# 2026-10-20 · Proyectos conectado a su backend real (y Escuela pasa después)

**Hecho en:** Claude Code

## Qué se hizo

- **Cambio de orden de la Fase 1b (decisión #41).** La usuaria preguntó si Proyectos no debía ir antes que Escuela. Se comprobó: el canvas dice que una materia "se crea como proyecto de tipo Escuela: sus entregas son tareas y sus clases, eventos", y Tareas, Agenda y Metas guardaban un `project_id` sin llave foránea que devolvía siempre `project: null`. Orden resultante: **Proyectos → Escuela → Archivos (Storage) → Escritos → Enfoque**. Los archivos quedan como paso aparte (Storage es lo más delicado de `security.md` y lo comparte Escritos).
- **Proyectos reconectado a su backend real** (sexto módulo de Fase 1b), sin archivos. A pedido explícito: "hazlo tú todo".
  - **Base de datos:** migración `0008_projects_and_sprints.sql` con 5 tablas (`projects`, `project_objectives`, `project_links`, `sprints`, `sprint_tasks`), 3 enums, un CHECK (la fecha meta no es antes del inicio) y tres índices únicos, uno de ellos parcial: **un solo sprint activo por proyecto, garantizado por la base**. Además, llaves foráneas nuevas en `tasks.project_id`, `events.project_id` y `goals.project_id` (`ON DELETE SET NULL`). Aplicada a la base de desarrollo (antes se comprobó que no había filas con `project_id`).
  - **API:** `modules/projects/` (CRUD del proyecto con sus objetivos y enlaces, notas, fecha meta, marcar objetivo, agregar enlace; su `ProjectsService` exporta `exists` y `summaries` para los demás módulos) y `modules/sprints/` (listar, empezar, cerrar y meter una tarea al sprint). Tareas, Agenda y Metas ahora piden el nombre del proyecto a ese service y **revisan que el proyecto sea de la misma persona** (la FK solo garantiza que exista). Tareas exporta `findByIds` para Sprints.
  - **Modelo de sprints:** tabla intermedia `sprint_tasks` en lugar de `tasks.sprint_id` (decisión #42): así Sprints no escribe en la tabla de otro módulo (`modules.md`), cerrar un sprint es **una transacción** sobre tablas propias, y el sprint cerrado guarda la foto de lo hecho al cerrar ("3 de 5 hechas") aunque la tarea se termine después. El backlog no se guarda: son las tareas abiertas del proyecto fuera del sprint activo.
  - **Front:** `api.ts` reescrito y `project-utils.ts` nuevo (arma el avance, el resumen, el tablero y el backlog con la lista de Tareas, decisión #38); `actions.ts` con las acciones de Resumen y Sprints; `mock-store.ts` borrado (`mock*.ts` quedan para el demo). Resumen: marcar objetivos y tareas, agregar una tarea, notas y fecha meta se guardan de verdad (se ven al instante y vuelven atrás si falla). Sprints: empezar, cerrar y agregar del backlog esperan a la API; mover una tarjeta de columna es inmediato y se revierte si falla. Archivos: los enlaces se guardan; la subida avisa "llega pronto" en modo real y el demo conserva la de ejemplo.
  - **Tests:** `test/projects.e2e-spec.ts` nuevo, 27 tests (proyectos, aislamiento, edición que concilia listas, notas, fecha meta, objetivos, enlaces, el contrato con el front, lo que cruza a Tareas/Agenda/Metas incluido un proyecto ajeno o un id que no es uuid, y todo el ciclo de sprints: empezar, un solo activo —también contra la base—, agregar tareas, cerrar con "pasar al siguiente" y con "regresar al backlog", la foto del historial, tareas en la papelera, aislamiento). Los 135 de la API pasan (6 suites de antes + Finanzas 47 + Proyectos 27).
- **Probado en Edge real** (API y front reales, usuario temporal que se borró al terminar): galería vacía, crear un proyecto con objetivos, enlace, fechas y portada; el Resumen (marcar objetivo, agregar 3 tareas, marcar una hecha, notas, fecha meta, y todo sigue tras recargar con 1 de 3 = 33%); Sprints completo (empezar, traer 2 tareas del backlog, mover una a "En curso", cerrar pasando lo pendiente al siguiente: la base queda con el sprint 1 cerrado con sus notas y su foto, el sprint 2 activo y las tareas en "Por hacer"); Archivos (aviso de "llega pronto", enlace nuevo guardado, un `javascript:` rechazado); Tareas muestra el proyecto de cada tarea; la galería y Inicio muestran el proyecto; editar el formulario (el objetivo cumplido conserva su estado, el quitado va a la papelera, y el nombre nuevo llega a Tareas); una meta de tipo Proyecto muestra el avance real. Sin errores de consola.

## Decisiones tomadas

- **#41** (orden: Proyectos antes que Escuela; archivos como paso aparte) y **#42** (relaciones con otros módulos, sprints en módulo propio con tabla intermedia, cierre transaccional, un activo por proyecto en la base, portadas `preset:`, enlaces sí y archivos no). Ambas en `docs/guides/decisions.md`.

## Archivos o partes importantes que se tocaron

- `packages/shared/src/projects/` (`SPRINT_WEEKS`, `SPRINT_CLOSE_MOVES`, esquemas de notas, fecha meta, empezar y cerrar sprint, agregar tarea al sprint).
- `apps/api/src/db/schema/{projects,sprints}.ts` (nuevos), `tasks.ts`, `agenda.ts`, `daily.ts` (FK), `src/drizzle/0008_*`, `src/modules/projects/` y `src/modules/sprints/` (nuevos), `tasks/` (`findByIds`, proyecto resuelto y validado), `agenda/agenda.service.ts` y `daily/goals.service.ts` (proyecto resuelto y validado), `app.module.ts`, `test/projects.e2e-spec.ts`.
- `apps/web/src/features/projects/` (`api.ts`, `actions.ts`, `project-utils.ts` nuevo, `types.ts`, `mock-files.ts`, `ProjectSummary`, `ProjectSprints`, `ProjectFiles`; `mock-store.ts` borrado), las páginas `sprints` y `archivos`, y `features/daily/goal-actions.ts` (`PROJECT_NOT_FOUND`).
- `docs/guides/data-model.md`, `decisions.md`, `roadmap.md`.

## Quedó pendiente

- **Archivos de proyecto (Storage):** la tabla `attachments`, el bucket privado con URLs firmadas, límites de tamaño y tipo, la cuota. Paso aparte después de Escuela (decisión #41). Hasta entonces la pestaña Archivos no sube nada.
- **Borrar un proyecto** y recuperarlo de la papelera: el canvas no trae esa acción todavía. La regla de cascada (objetivos, enlaces, sprints, tareas, archivos juntos) sigue escrita en `data-model.md` para cuando se construya.
- **Minutos de pomodoro de la semana** del Resumen ("0 min con pomodoro"): vienen del módulo de Enfoque, que todavía no tiene backend.
- **Banner de portada y "subir mi imagen"** del formulario: dependen de Storage (el botón sigue avisando "llega pronto").
- **Quitar una tarea de un sprint** o editar su meta una vez empezado: el canvas no lo pide; hoy solo se agregan tareas y se cierra.
- El botón **"Repetir"** del presupuesto de Finanzas y la prueba en 390 px (de la sesión de Finanzas) siguen sin revisar.

## Notas para la siguiente sesión

- Siguiente módulo de Fase 1b: **Escuela**. Ya tiene lo que necesita: una materia es un proyecto con `kind: 'school'` (Proyectos), sus entregas son tareas con `project_id` (Tareas) y sus clases son eventos recurrentes con `project_id` (Agenda). Falta decidir con la usuaria qué parte del front de Escuela (periodos, calificaciones, lista de preparación) sí necesita tablas propias y cuál se arma con esas tres piezas. Leer `docs/design/screens/Escuela.dc.html` y `sessions/2026-10-18-escuela-10.md`.
- Cuando se tenga la tabla de archivos, la pestaña Archivos de un proyecto se conecta en el mismo paso que Escritos (`getProjectFiles` ya devuelve `storageReady`).
- Una sola conexión a la base se comparte entre tests y pruebas de navegador: correr los e2e mientras otra prueba usa la base puede agotar el tiempo de un test (pasó con uno de Día a día; solo, pasa).
