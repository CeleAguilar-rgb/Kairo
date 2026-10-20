# Dónde nos quedamos

> Léelo al empezar cada sesión. Actualízalo al terminar. Máximo ~60 líneas: es un resumen, no un diario. El detalle va en `sessions/`.

**Última actualización:** 2026-10-20 · Proyectos reconectado a su backend real — sexto módulo de Fase 1b (después de Finanzas y de recuperar los `.env`)

## Fase actual

**Fase 0 (base): completa. Fase 1a (front de cada módulo, con datos dummy fieles al canvas): completa** — los 8 módulos tienen su pantalla (Tareas, Proyectos, Agenda, Recordatorios, Día a día, Finanzas, Escritos, Enfoque y Escuela). Falta "lo global" (Buscar Ctrl+K, avisos, captura rápida, Papelera), que el propio `docs/guides/roadmap.md` agrupa con la Fase 1b, no con la 1a. **Fase 1b: Tareas, Recordatorios, Agenda, Día a día, Finanzas y Proyectos ya están reconectados** (ver abajo). Orden que sigue (decisión #41): **Escuela → Archivos (Storage) → Escritos → Enfoque**.

## Lo último que se hizo

- **2026-10-20 · Proyectos reconectado a su backend real (sin archivos) y Escuela pasa después.** Sexto módulo de Fase 1b, a pedido explícito ("hazlo tú todo"). La usuaria notó que Escuela depende de Proyectos (una materia es un proyecto `school`, sus entregas son tareas y sus clases eventos) y el orden cambió (decisión #41). Migración `0008` (`projects`, `project_objectives`, `project_links`, `sprints`, `sprint_tasks`, más llaves foráneas en `tasks`, `events` y `goals`); módulos de Nest `projects/` y `sprints/`. **Tareas, Agenda y Metas piden el nombre del proyecto al service de Proyectos y revisan que sea de la misma persona** (antes devolvían `project: null`). Sprints usa una tabla intermedia `sprint_tasks` en vez de `tasks.sprint_id`: cerrar un sprint es **una transacción** sobre tablas propias y el sprint cerrado guarda la foto de lo hecho; un solo sprint activo por proyecto lo garantiza la base (decisión #42). El avance, el tablero y el backlog se siguen armando en el Next.js con la lista de Tareas (`project-utils.ts`). Los enlaces del proyecto se guardan; **los archivos no**: la pestaña avisa "llegan pronto" hasta que exista Storage. `test/projects.e2e-spec.ts` (27 tests); los 135 pasan. **Probado en Edge real**: crear el proyecto, el Resumen completo, los Sprints (empezar, backlog, mover, cerrar), Archivos, Tareas, galería, Inicio, editar y una meta de tipo Proyecto. Detalle en `sessions/2026-10-20-proyectos-backend.md`.
- **2026-10-20 · Finanzas reconectado a su backend real + `.env` recuperados.** Quinto módulo de Fase 1b: migración `0007` (7 tablas), módulo de Nest `finance/` con un Deshacer compartido, la API devuelve hechos crudos y solo suma lo ahorrado y lo pagado, y valida que todo lo que nombra un movimiento sea de la persona (decisión #40). Las categorías de arranque las crea la API (con `key`, sin límites). Probado en Edge real. De paso se arregló `lib/api-client.ts`: un `201` con cuerpo vacío (el Deshacer) hacía fallar `response.json()`, lo que dejaba roto el Deshacer de Día a día en pantalla. Los `.env` se recrearon (la contraseña de `kairo_api` no se puede ver en Supabase: se le puso una nueva). Detalle en `sessions/2026-10-20-finanzas-backend.md`.
- **2026-10-18 · Fase 1b: Tareas (+ papelera), Recordatorios, Agenda y Día a día reconectados.** Cada uno con su migración, su módulo de Nest (controller/service/repository), tests e2e de aislamiento y el front sobre la API real; el modo demo conserva sus `mock.ts`. Decisiones: #35 (Tareas), #36 (Recordatorios: sin `source`/`precision`, Deshacer sin estado en el servidor), #37 (Agenda: una fila = un evento o una serie completa), #38 (la API devuelve hechos crudos y el Next.js arma reportes, rachas y totales) y #39 (el Diario sin PIN ni cifrado, decisión explícita de la usuaria). Detalle en `sessions/2026-10-18-fase1b-11.md` y `-12.md`.
- **2026-10-18 · Escuela (solo front) — Fase 1a queda completa**, y la **auditoría de las 7 pantallas previas contra el canvas + módulo de Enfoque (solo front, decisión #34: el reproductor vive en Context)**. Detalle en `sessions/2026-10-18-escuela-10.md` y `-enfoque-9.md`.
- **2026-10-17 · Merge de `feature/fase1` a `main`.** Se integraron los módulos front-primero con la base de `main`. Tareas se quedó con el front de `feature/fase1`; su backend ya escrito quedó sin conectar hasta el 18 (decisión #33).
- **2026-10-14 a 16 · El resto de los módulos de Fase 1a, cada uno solo con front y datos de ejemplo** (Escritos, Finanzas, Día a día —decisión #30: cambiar de pestaña no se siente como cambiar de pantalla—, Recordatorios, Agenda, Proyectos, Tareas) y la base compartida (`lib/motion.ts`, `Drawer`/`Modal`/`Toast`/`Doodle`, Inicio con sus 8 tarjetas, modo demo). Detalle en `sessions/2026-10-1{4,5,6}-*.md`.
- **2026-10-13/14 · Shell del dashboard y primeros tests** (Jest + Supertest contra la base real). **Fase 0:** login completo (invitación, entrar, recuperar contraseña, guard global por JWKS), Motion integrado. Decisión #26: código por correo pasó a "Después". Detalle en `sessions/2026-10-10-*.md` a `2026-10-13-*.md`.

## Siguiente paso

Revisar Finanzas y Proyectos en el navegador por su cuenta (ya se probaron con Edge, pero no en 390 px ni con datos reales suyos) y, sobre todo, probar Tareas, Recordatorios, Agenda y Día a día reconectados (crear, marcar, subtareas, tablero, borrar/deshacer, posponer, series que se repiten, mover y duplicar eventos, rutina del día, menú semanal, reporte, diario, metas): solo se probaron contra la API directo con los e2e. Después, **Escuela** (una materia es un proyecto `school`: decidir qué parte de su front necesita tablas propias y qué se arma con Proyectos, Tareas y Agenda; leer `sessions/2026-10-18-escuela-10.md`) o el resto de "lo global" (Buscar Ctrl+K, avisos, captura rápida +; la Papelera como pantalla para ver y restaurar lo borrado de cualquier módulo todavía no existe — por ahora los módulos conectados solo tienen el "Deshacer" inmediato del aviso).

## Pendientes de decidir con el usuario

- Correo para enviar invitaciones a otras personas: por ahora SMTP de Resend sin dominio propio (`onboarding@resend.dev`, solo entrega al correo con el que te registraste en Resend). Más adelante: Gmail dedicado a Kairo o un dominio propio.
- Tareas que se repiten, o si eso vive solo en Recordatorios.
- Día a día: si los 30 minutos de gracia para marcar "a tiempo" un bloque sin "insistir" y sin hora de fin (decisión #29) son los que quieres.
- Finanzas: si "Te queda" debe restar también los pagos de deuda, como lo dejamos (decisión #31), o ignorarlos como el canvas.
- Finanzas: los cobros de membresías aún no se anotan solos como gasto (llega con las tareas programadas, decisión #40); mientras, se anotan a mano.
- Agenda: mostrar la rutina detrás de los eventos y arrastrar eventos.
- Proteger `main` en GitHub (pedir Pull Request para hacer merge).
- En la Fase 0: si se agrega commitlint + husky para validar los mensajes de commit, y GitHub Actions para revisar cada Pull Request.
- Proyectos: borrar un proyecto (y recuperarlo de la papelera) no está en el canvas todavía; la regla de cascada ya está en `data-model.md`. El banner de portada y "subir mi imagen" dependen de Storage.
- Proyectos: los archivos (tabla `attachments`, Storage) son un paso aparte, después de Escuela y antes de Escritos (decisión #41).
- Página de Escritos: el menú "···" le faltan "Convertir en plantilla" y "Mover a otro espacio" — necesitan un concepto de plantillas/espacios que no existe todavía (por ahora: después).

## Bloqueos o problemas abiertos

- `@nestjs/cli` (generadores `nest generate`, etc.) no se puede usar: bug de `@angular-devkit/schematics` + Node 22. Mientras tanto, los archivos de `apps/api` se escriben a mano. Revisar si una versión futura lo arregla.
- `drizzle-kit migrate` (la CLI) no muestra el error cuando una migración falla; hay que diagnosticar llamando a `migrate()` de `drizzle-orm` directamente en un script aparte si vuelve a pasar. Revisar si una versión futura lo arregla.
- `tsx`/esbuild (el toolchain de `apps/api`) no siempre emite la metadata de tipos que Nest usa para inyectar un parámetro de constructor sin `@Inject()` explícito — falla en tiempo de ejecución (`UndefinedDependencyException`) aunque `tsc --noEmit` no marque nada. Pasó con `Reflector` en `jwt.guard.ts`; se resolvió con `@Inject(Reflector)` explícito. Si se escribe otro guard/interceptor/pipe a mano, probarlo corriendo la API, no solo con `tsc`.
- `apps/api/package.json` no tiene `"type": "module"` y nunca se probó `pnpm build && pnpm start` (solo `tsx watch` en dev). Como `@nestjs/common` es ESM-only, el build de producción probablemente necesite ese campo. Revisar antes de desplegar.
- Dos tareas de Auth que son del usuario, no de código: pegar `recover-password.html` en el dashboard de Supabase (Authentication → Email Templates), y confirmar ahí que la sesión dura 30 días (decisión #8).

## Pendiente dentro del paso 2 (componentes de `components/ui/`)

- `modes/dark.css` no existe (fase posterior), aunque el PDF ya trae los valores oscuros documentados.
