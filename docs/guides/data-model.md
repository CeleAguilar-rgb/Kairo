# Modelo de datos

Fuente: el documento "Mi tablero · Funcionalidades y base de datos" del usuario, ajustado a las decisiones de arquitectura y seguridad. Si cambias algo aquí, cámbialo con una migración de Drizzle y actualiza este archivo.

Para los módulos que todavía no tienen backend (todos salvo Cuenta e Inicio + Tareas): esto es el punto de partida para el front con datos dummy, no un molde fijo — si al construir las pantallas el front termina pidiendo otra forma, se ajusta esto, no al revés (decisión #27).

## Convenciones

- PostgreSQL en Supabase, esquema **`app`**.
- Nombres de tablas y columnas en inglés, `snake_case` en la base (en el esquema de Drizzle: `dueOn: date('due_on')`; `camelCase` en TypeScript).
- **Todas las tablas de usuario** llevan:
  - `id` uuid (generado por la base, o por el cliente cuando llegue el modo sin conexión)
  - `user_id` uuid → `profiles.id`, con índice y `ON DELETE CASCADE`
  - `created_at`, `updated_at` timestamptz
  - `deleted_at` timestamptz nulo (papelera)
- **Dinero:** enteros en centavos (`*_cents`) y columna `currency` (por ahora siempre `'MXN'`). Nunca decimales.
- **Fechas:** momentos en `timestamptz`; días sueltos en `date`.
- **Enums:** enums nativos de Postgres (`pgEnum` de Drizzle, ver decisión #23); los valores en inglés (`todo`, `in_progress`, `done`), las etiquetas en español en la UI.
- Las columnas listadas abajo son las propias de cada tabla; las comunes no se repiten.

## Cuenta

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| profiles | name, avatar_path, timezone, week_start, hour_format, currency, theme (`light`, `dark`, `system`), quiet_from, quiet_to, decorations_on, birthday, diary_pin_hash, onboarded_at | `id` = `auth.users.id`. `theme` existe desde el inicio aunque el modo oscuro llegue después. |
| user_sections | section, enabled, position, in_bottom_nav | Qué módulos tiene activos cada usuario y en qué orden. `in_bottom_nav` es para el teléfono (fase posterior). |
| home_cards | card, enabled, position | Tarjetas de Inicio ("Ajustar mi Inicio"). |
| connections | provider (`notion`, `canva`, `spotify`, `claude`), status, token_ref, connected_at | Fase posterior. El token vive cifrado (Vault), aquí solo la referencia. |
| notifications | title, body, link, read_at, source_type, source_id | Avisos dentro de la app. |
| push_subscriptions | endpoint, p256dh, auth, user_agent, last_used_at | Suscripciones de Web Push del navegador. |
| login_codes | session_id, code_hash, expires_at, attempts, used_at | Segundo paso de login. Sin `deleted_at`; un job limpia los vencidos. |
| verified_sessions | session_id, verified_at, user_agent, ip_hint | Sesiones que ya pasaron el código. Base de la lista "sesiones abiertas". |

## Proyectos y tareas

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| projects | name, kind (`work`, `personal`, `school`), status (`active`, `paused`, `done`, `archived`), description, cover_path, started_on, goal_on, notes | CHECK: la fecha meta no es antes del inicio. `cover_path` guarda `preset:<clave>` para las portadas ilustradas (`PROJECT_COVER_KEYS` en `@kairo/shared`); la ruta de una imagen subida a Storage tendrá otro prefijo cuando llegue el paso de Archivos. El avance, el conteo de tareas y la próxima fecha **no son columnas**: salen de las tareas y los arma el Next.js (decisión #38). Una materia de Escuela es un proyecto de tipo `school` (decisión #41). Sin borrado desde la pantalla todavía (no existe en el canvas). |
| project_objectives | text, done, position | → projects. Editar el formulario del proyecto reemplaza la lista: los que conservan su texto conservan su fila (y si estaban cumplidos), los que se quitan van a la papelera. |
| project_links | title, url, position | → projects. Solo `http(s)` (lo valida `projectLinkSchema`). Se editan con el formulario del proyecto y se agregan sueltos desde la pestaña Archivos. |
| sprints | number, goal, starts_on, ends_on, status (`active`, `closed`), notes, closed_at | → projects. **Un solo sprint activo por proyecto** (índice único parcial) y `number` único por proyecto. Viven en su propio módulo de Nest (`modules/sprints/`). |
| sprint_tasks | sprint_id, task_id, done | → sprints, → tasks (índice único sprint + tarea). Qué tareas entraron a un sprint. Tabla intermedia **en lugar de la columna `tasks.sprint_id`** que decía este documento (decisión #42): Sprints no escribe en la tabla de Tareas, cerrar un sprint es una sola transacción sobre `sprints` y `sprint_tasks`, y una tarea que pasa al siguiente sprint queda en los dos. `done` es la foto de si la tarea estaba hecha **al cerrar** (nulo mientras el sprint sigue activo): el historial ("3 de 5 hechas") no cambia si se termina después. El backlog no se guarda: son las tareas abiertas del proyecto que no están en el sprint activo. |
| tasks | title, notes, status (`todo`, `in_progress`, `review`, `done`), priority, due_on, done_at, position, project_id, parent_task_id | → projects (opcional, **con FK** desde la decisión #41, `ON DELETE SET NULL`; la FK solo garantiza que el proyecto exista, así que `TasksService` le pregunta al service de Proyectos que sea de la misma persona y le pide el nombre para armar `project: { id, name }`), → tasks como padre (subtareas, vía `parent_task_id`). Sin columna de sprint (ver `sprint_tasks`). Las **notas rápidas** del Inicio son tareas: pendientes marcables que se abren con más detalle. |
| attachments | name, storage_path, mime, size_bytes | → projects **o** pages (exactamente una, con check). Todavía sin construir: llega como paso aparte, después de Escuela y antes de Escritos (decisión #41). |

## Agenda

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| events | title, kind (`work`, `personal`, `school`), date, all_day, start_min, end_min, place, notes, repeat (`none`, `daily`, `weekdays`, `weekly`, `monthly`, `yearly`), until, skip (arreglo de días), reminder (`none`, `10m`, `1h`, `1d`) | → projects (opcional, con FK `ON DELETE SET NULL` desde la decisión #41; `AgendaService` revisa con el service de Proyectos que sea de la misma persona y le pide el nombre). Una fila es un evento **o una serie completa**, no una vez que ocurre: `date` es su primer día, `start_min`/`end_min` son minutos desde medianoche en la zona del perfil (no un momento UTC — lo necesita igual en cada vez de la serie), `until` es hasta cuándo llega (null = sin fin) y `skip`, los días sueltos que se borraron ("solo este"). Expandir una serie a sus ocurrencias de un rango es lógica del front (front-first: así terminó pidiéndolo `Agenda.dc.html`), no de la API. |
| reminders | title, remind_at, done_at, snoozed_to, notified_at, repeat (`none`, `daily`, `weekdays`), spawned_from_id | → tasks, events o memberships (opcional, uno a la vez; sin columnas todavía — nada los crea ligados aún, decisión #36). Lo no atendido pasa al día siguiente. Al completar uno que se repite nace la siguiente vez como otra fila, con `spawned_from_id` apuntando a este; "Deshacer" la borra y reabre la original. |

## Día a día

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| routines | name, days (arreglo de 7 booleanos, lunes a domingo), active | |
| routine_blocks | starts_at, ends_at (`time`, opcional: un hábito es un momento, no un rango), title, kind (`habit`, `meal`, `focus`, `free`), icon, position, alert, nag_minutes, counts_for_report, link, note | → routines. `link`: área fija (`school`/`work`/`personal`) o id de proyecto, sin FK todavía — igual que `project_id` en Tareas/Agenda (decisión #35/#37), aplicado aquí como decisión #39. `note` existe en la tabla pero el formulario de bloque todavía no lo edita (sigue solo de ejemplo). |
| routine_logs | log_date, done_at, late, focus_done | → routine_blocks (sin cascada visible: borrar la rutina o el bloque va a su papelera, `deleted_at`, nunca borra de verdad, así que el historial del reporte no se pierde). Un registro por bloque por día; `focus_done` solo aplica a bloques de enfoque. |
| meal_plans | plan_date, meal (`breakfast`, `lunch`, `dinner`), dish, done, prep, note | `has_event` (si cae un evento de la Agenda en esa comida) no es columna: se deriva al leer, igual que `project` en Tareas/Agenda — hoy siempre `false`, Agenda todavía no tiene datos reales que consultar (decisión #39). |
| journal_entries | entry_date, mood, body, gratitude (arreglo), tags (arreglo), summary (arreglo), saved_at | Una por día por usuario (sin UNIQUE en la base, igual que el resto del módulo: la aplicación ya lo garantiza). `body` **sin cifrar y sin PIN** (decisión #39, en contra de lo que pedía `docs/guides/security.md` #6 — pendiente de reforzar si se decide más adelante). `summary` ("Tu día en resumen") lo arma y congela el front al guardar, no la API. |
| goals | title, area (`work`/`personal`/`school`/`health`/`money`), kind (`milestones`/`number`/`habit`/`project`), status, target, current, unit, block_id, project_id, due_on, why, achieved_on | `block_id` → routine_blocks (FK, mismo módulo); `project_id` → projects (FK `ON DELETE SET NULL` desde la decisión #41; `GoalsService` revisa con el service de Proyectos que sea de la misma persona). Para `milestones`/`project`/`habit`, `target`/`current`/`unit` guardados no se usan: el front los recalcula siempre al leer (igual que `project: null` en Tareas/Agenda, decisión #37/#39). |
| goal_milestones | text, done | → goals |
| goal_log_entries | log_date, amount | → goals. El registro de avance de una meta de tipo Número. |

## Finanzas

Dinero en centavos `bigint` (un monto puede pasar de los 2,100 millones de centavos de un `integer`; el tope de la app es `MAX_AMOUNT_CENTS`), cada monto con su `currency` (solo MXN, decisión #10). Todas con `deleted_at` (papelera) salvo `finance_settings`. Los enums son nativos de Postgres (decisión #23).

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| cards | name, kind (`debit`, `credit`, `cash`), last4, color (`ink`, `lavender`, `sand`, `lavender_soft`), cut_day, due_day | **Solo** últimos 4 dígitos: además de Zod, un CHECK de la base exige `last4` nulo o exactamente 4 dígitos (regla 9). El efectivo no lleva `last4`; solo el crédito lleva días de corte y de pago (1 a 31). Borrar una se lleva sus membresías (juntas a la papelera, y "Deshacer" devuelve las dos). Las borradas se siguen mandando al front como "archivadas": los movimientos viejos dicen con cuál se pagaron. |
| categories | key, name, kind (`expense`, `income`), color, icon, monthly_limit_cents, position | `key` solo en las que la API crea sola (`DEFAULT_CATEGORIES` en `@kairo/shared`: `groceries`, `dining`, `transport`, `memberships`, `outings`, `health`, `other`, `salary`, `extra`, `gift`, `income-other`), nulo en las que agrega la persona; índice único parcial (user_id, key). Se crean la primera vez que se abre Finanzas, **sin límites**. `other` ("Otros") no se puede borrar. Borrar una categoría de gasto **no toca sus movimientos**: ella va a la papelera y, al leer, un gasto cuya categoría no está vivo se cuenta en "Otros" (decisión #40). `monthly_limit_cents` nulo = sin límite. |
| transactions | kind (`expense`, `income`, `saving_deposit`, `saving_withdrawal`, `debt_payment`), amount_cents, currency, concept, note, occurred_on (`date`), repeat_monthly | → categories, cards, savings_goals, debts, memberships (cada una opcional, `ON DELETE SET NULL`). `concept` vacío = se llama como su categoría. Qué referencias pide cada tipo (ahorro para `saving_*`, deuda para `debt_payment`, categoría para gasto/ingreso) lo garantiza el service, no la base. Índice (user_id, occurred_on). |
| savings_goals | name, target_cents, currency, due_on | Lo ahorrado **no se guarda**: la API lo suma de sus `transactions` (aportes menos retiros, nunca negativo) sobre todos los movimientos. |
| debts | name, kind (`person`, `card`, `loan`, `other`), total_cents, currency, annual_interest_pct, monthly_payment_cents, next_payment_on | Lo pagado **no se guarda**: la API lo suma de los `debt_payment` (y manda el día del último, para "Deuda liquidada. Fue el…"). Sin `lender` ni `paid_off_at` (el nombre ya dice a quién; lo liquidado se deduce de lo pagado). Con pago mensual, `next_payment_on` nace como el primer día del mes que viene. |
| memberships | name, amount_cents, currency, cadence (`monthly`, `yearly`, `weekly`), charge_day, charge_month, charge_weekday, card_id, notify, status (`active`, `paused`) | → cards (`ON DELETE SET NULL`). El próximo cobro **no se guarda**: el front lo calcula con el día de cobro (así nunca queda en el pasado). `charge_day` mensual y anual, `charge_month` solo anual, `charge_weekday` solo semanal. Sus cobros **no se vuelven movimientos solos todavía** (viene con las tareas programadas, decisión #40). |
| finance_settings | budget_alert_at_80, budget_alert_over | Una fila por persona (única en `user_id`), sin papelera. Los dos avisos del presupuesto; sin fila valen ambos prendidos. Los avisos de verdad llegan con las tareas programadas: aquí solo se guarda la preferencia. |

## Escritos

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| worlds | name, description, cover_path | |
| stories | title, kind (`story`, `notebook`), summary, word_goal, color | → worlds (opcional) |
| pages | title, kind (`chapter`, `note`, `page`), content (jsonb de Tiptap), status, word_count, cover_path, position | → stories (opcional), → pages como padre. `word_count` se calcula en la API al guardar. |
| characters | name, role, image_path, fields (jsonb) | → worlds, stories (opcionales) |
| character_fields | name, type (`text`, `select`, `number`, `date`), options | Definen las columnas de la base de personajes. |

## Escuela

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| school_terms | name, starts_on, ends_on, status (`upcoming`, `ongoing`, `finished`) | |
| subjects | name, teacher, color | → school_terms |
| class_sessions | weekday, starts_at, ends_at, room | → subjects |
| assignments | title, due_at, done_at | → subjects |
| grades | name, score, weight | → subjects |
| prep_items | title, done, position | → school_terms |

## Enfoque y sistema

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| focus_sessions | kind (`work`, `break`), started_at, minutes | → tasks (opcional) |
| backups | kind (`automatic`, `manual`), sections, storage_path, size_bytes | Fase posterior (exportar y respaldo). |

## Reglas de datos

- **Aislamiento total:** cada fila pertenece a un usuario; nada se comparte entre cuentas. Compartir (por ejemplo, una agenda en común) es una idea para más adelante y requerirá una decisión nueva en `docs/guides/decisions.md`.
- **Papelera:** borrar pone `deleted_at`; las consultas normales filtran `deleted_at IS NULL`. Un job borra de verdad lo que lleve más de 30 días.
- **Cascada al borrar un proyecto:** se van sus objetivos, enlaces, sprints, tareas y archivos (a la papelera, juntos, y se recuperan juntos).
- **Archivos:** en Supabase Storage, ruta `<user_id>/...`; la tabla guarda solo la ruta.
- **Preparado para sin conexión (fase posterior):** ids uuid, `updated_at` confiable (lo pone la base con trigger) y borrado suave. No agregues lógica de sincronización todavía.

## Por definir (preguntar al usuario cuando toque)

- Pascua: por ahora, fecha real (no fija en abril); revisar si hace falta otra regla cuando se construyan las temporadas.
- Tareas que se repiten (pagar renta cada mes) o si eso vive solo en Recordatorios.
- Agenda: mostrar la rutina detrás de los eventos y arrastrar eventos para moverlos.
