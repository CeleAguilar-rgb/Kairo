# Dónde nos quedamos

> Léelo al empezar cada sesión. Actualízalo al terminar. Máximo ~60 líneas: es un resumen, no un diario. El detalle va en `sessions/`.

**Última actualización:** 2026-10-18 · Tareas reconectada a su backend real — primer módulo de Fase 1b

## Fase actual

**Fase 0 (base): completa. Fase 1a (front de cada módulo, con datos dummy fieles al canvas): completa** — los 8 módulos tienen su pantalla (Tareas, Proyectos, Agenda, Recordatorios, Día a día, Finanzas, Escritos, Enfoque y Escuela). Falta "lo global" (Buscar Ctrl+K, avisos, captura rápida, Papelera), que el propio `docs/guides/roadmap.md` agrupa con la Fase 1b, no con la 1a. **Fase 1b: Tareas ya está reconectada** (ver abajo); el resto de los módulos (orden de `roadmap.md`, empezando por Recordatorios) sigue sin empezar.

## Lo último que se hizo

- **2026-10-18 · Tareas reconectada a su backend real.** Su controller/service/repository/migración ya existían (molde de antes de la decisión #27) pero habían quedado desconectados del front de `feature/fase1` (decisión #33), con un esquema que no tenía `review`, `project_id` ni las subtareas. Se agregó el estado `review` al enum, `project_id` (sin FK: Proyectos no tiene tabla en la API todavía, el service de Tareas devuelve siempre `project: null` — decisión #35) y `parent_task_id` (una subtarea es una fila más de `tasks`, auto-referenciada). El `complete` de un solo endpoint se volvió `PATCH /tasks/:id` genérico (sirve para tarea o subtarea, para el tablero y para el detalle). Front: `TasksView`, `TodayTasksCard` y `TaskCreateDrawer` ya llaman a la API real con actualización optimista (como `SeccionesTab`), salvo crear, que sí espera el id real antes de cerrar el formulario. `mock.ts` se queda como respaldo del modo demo (sin Supabase). Se agregó `test/tasks.e2e-spec.ts` (aislamiento entre usuarios, cascada de subtareas) siguiendo el patrón de `account.e2e-spec.ts`; los 13 tests (6 + 7) pasan contra la base de desarrollo real.
- **2026-10-18 · Escuela (solo front) — Fase 1a queda completa.** El último módulo pendiente: "Antes de empezar" (cuenta regresiva, checklist) y "Durante el semestre" (horario semanal, materias, entregas agrupadas por fecha, calificaciones), más el formulario de nueva materia. El canvas aclara que una materia nace como un Proyecto tipo Escuela (sus entregas, tareas; sus clases, eventos) — por ahora son datos propios del módulo, sin tocar Proyectos/Tareas/Agenda todavía. Detalle en `sessions/2026-10-18-escuela-10.md`.
- **2026-10-18 · Auditoría de las 7 pantallas previas contra el canvas + módulo de Enfoque (solo front).** Se revisó todo lo construido contra `docs/design/screens/`; se arreglaron 6 discrepancias reales (ver `sessions/2026-10-18-enfoque-9.md`) y se borró código huérfano del merge del 17 de octubre. Después, `features/focus/`: el reproductor flotante de pomodoro + mock de Spotify (decisión #34: vive en Context, no en `mock-store.ts`, porque es el primer estado que debe seguir corriendo al cambiar de pantalla). El botón "Pomodoro" de Tareas ya lo abre enfocado en la tarea real.
- **2026-10-17 · Merge de `feature/fase1` a `main`.** Se integraron los módulos front-primero (Agenda, Día a día, Finanzas, Proyectos, Recordatorios, Escritos) con la base de `main`. Tareas se quedó con el front de `feature/fase1` (tablero, subtareas, filtro por proyecto); su backend ya escrito quedó sin conectar (decisión #33).
- **2026-10-14 a 16 · El resto de los módulos de Fase 1a, cada uno solo con front y datos de ejemplo:** Escritos, Finanzas, Día a día (+ decisión #30: cambiar de pestaña ya no se siente como cambiar de pantalla), Recordatorios, Agenda, Proyectos, Tareas, y la base compartida (`lib/motion.ts`, `Drawer`/`Modal`/`Toast`/`Doodle`, Inicio con sus 8 tarjetas, modo demo). Cada uno dejó pendientes de base de datos específicos para cuando le toque su Fase 1b — el detalle completo está en su nota de sesión (`sessions/2026-10-1{4,5,6}-*.md`), no se repite aquí.
- **2026-10-13/14 · Shell del dashboard y primeros tests.** Layout protegido en `app/(dashboard)/`, Topnav, Perfil, y los primeros tests del proyecto (Jest + Supertest contra la base real).
- **Fase 0:** login completo (invitación, entrar, recuperar contraseña, guard global por JWKS), Motion integrado por primera vez. Decisión #26: código por correo pasó a "Después". Detalle en `sessions/2026-10-10-*.md` a `2026-10-13-*.md`.

## Siguiente paso

Probar Tareas reconectada en un navegador real (crear, marcar, subtareas, tablero) — no se pudo hacer en el chat. Después, seguir con Fase 1b en el orden de `roadmap.md` (Recordatorios primero) o con "lo global" (Buscar Ctrl+K, avisos, captura rápida +, Papelera).

## Pendientes de decidir con el usuario

- Correo para enviar invitaciones a otras personas: por ahora SMTP de Resend sin dominio propio (`onboarding@resend.dev`, solo entrega al correo con el que te registraste en Resend). Más adelante: Gmail dedicado a Kairo o un dominio propio.
- Tareas que se repiten, o si eso vive solo en Recordatorios.
- Día a día: si los 30 minutos de gracia para marcar "a tiempo" un bloque sin "insistir" y sin hora de fin (decisión #29) son los que quieres.
- Finanzas: si "Te queda" debe restar también los pagos de deuda, como lo dejamos (decisión #31), o ignorarlos como el canvas.
- Agenda: mostrar la rutina detrás de los eventos y arrastrar eventos.
- Proteger `main` en GitHub (pedir Pull Request para hacer merge).
- En la Fase 0: si se agrega commitlint + husky para validar los mensajes de commit, y GitHub Actions para revisar cada Pull Request.
- Proyecto (Resumen): si vale la pena el banner de portada + "Cambiar portada" que pide el canvas, o basta con cambiarla desde "Editar proyecto" (por ahora: no se construye).
- Página de Escritos: el menú "···" le faltan "Convertir en plantilla" y "Mover a otro espacio" — necesitan un concepto de plantillas/espacios que no existe todavía (por ahora: después).

## Bloqueos o problemas abiertos

- `@nestjs/cli` (generadores `nest generate`, etc.) no se puede usar: bug de `@angular-devkit/schematics` + Node 22. Mientras tanto, los archivos de `apps/api` se escriben a mano. Revisar si una versión futura lo arregla.
- `drizzle-kit migrate` (la CLI) no muestra el error cuando una migración falla; hay que diagnosticar llamando a `migrate()` de `drizzle-orm` directamente en un script aparte si vuelve a pasar. Revisar si una versión futura lo arregla.
- `tsx`/esbuild (el toolchain de `apps/api`) no siempre emite la metadata de tipos que Nest usa para inyectar un parámetro de constructor sin `@Inject()` explícito — falla en tiempo de ejecución (`UndefinedDependencyException`) aunque `tsc --noEmit` no marque nada. Pasó con `Reflector` en `jwt.guard.ts`; se resolvió con `@Inject(Reflector)` explícito. Si se escribe otro guard/interceptor/pipe a mano, probarlo corriendo la API, no solo con `tsc`.
- `apps/api/package.json` no tiene `"type": "module"` y nunca se probó `pnpm build && pnpm start` (solo `tsx watch` en dev). Como `@nestjs/common` es ESM-only, el build de producción probablemente necesite ese campo. Revisar antes de desplegar.
- Dos tareas de Auth que son del usuario, no de código: pegar `recover-password.html` en el dashboard de Supabase (Authentication → Email Templates), y confirmar ahí que la sesión dura 30 días (decisión #8).

## Pendiente dentro del paso 2 (componentes de `components/ui/`)

- `modes/dark.css` no existe (fase posterior), aunque el PDF ya trae los valores oscuros documentados.
