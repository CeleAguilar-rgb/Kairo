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
| projects | name, kind (`work`, `personal`, `school`), status, description, cover_path, started_on, goal_on, notes | |
| project_objectives | text, done, position | → projects |
| project_links | title, url | → projects |
| sprints | number, goal, starts_on, ends_on, status (`active`, `closed`), notes, closed_at | → projects |
| tasks | title, notes, status (`todo`, `in_progress`, `review`, `done`), priority, due_on, done_at, position, project_id, parent_task_id | → projects (opcional; la columna existe pero sin FK todavía — Proyectos no tiene tabla ni service en la API, así que el service de Tareas devuelve `project: null` hasta que le toque su turno en Fase 1b, decisión #35), → sprints (opcional; vacío = backlog; columna todavía sin agregar, se suma cuando Proyectos tenga sprints), → tasks como padre (subtareas, vía `parent_task_id`). Las **notas rápidas** del Inicio son tareas: pendientes marcables que se abren con más detalle. |
| attachments | name, storage_path, mime, size_bytes | → projects **o** pages (exactamente una, con check). |

## Agenda

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| events | title, kind (`work`, `personal`, `school`), date, all_day, start_min, end_min, place, notes, repeat (`none`, `daily`, `weekdays`, `weekly`, `monthly`, `yearly`), until, skip (arreglo de días), reminder (`none`, `10m`, `1h`, `1d`) | → projects (opcional, sin FK todavía — decisión #37). Una fila es un evento **o una serie completa**, no una vez que ocurre: `date` es su primer día, `start_min`/`end_min` son minutos desde medianoche en la zona del perfil (no un momento UTC — lo necesita igual en cada vez de la serie), `until` es hasta cuándo llega (null = sin fin) y `skip`, los días sueltos que se borraron ("solo este"). Expandir una serie a sus ocurrencias de un rango es lógica del front (front-first: así terminó pidiéndolo `Agenda.dc.html`), no de la API. |
| reminders | title, remind_at, done_at, snoozed_to, notified_at, repeat (`none`, `daily`, `weekdays`), spawned_from_id | → tasks, events o memberships (opcional, uno a la vez; sin columnas todavía — nada los crea ligados aún, decisión #36). Lo no atendido pasa al día siguiente. Al completar uno que se repite nace la siguiente vez como otra fila, con `spawned_from_id` apuntando a este; "Deshacer" la borra y reabre la original. |

## Día a día

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| routines | name, days (arreglo de 7 booleanos, lunes a domingo), active | |
| routine_blocks | starts_at, ends_at (`time`, opcional: un hábito es un momento, no un rango), title, kind (`habit`, `meal`, `focus`, `free`), icon, position, alert, nag_minutes, counts_for_report, link, note | → routines. `link`: área fija (`school`/`work`/`personal`) o id de proyecto, sin FK todavía — igual que `project_id` en Tareas/Agenda (decisión #35/#37), aplicado aquí como decisión #39. `note` existe en la tabla pero el formulario de bloque todavía no lo edita (sigue solo de ejemplo). |
| routine_logs | log_date, done_at, late, focus_done | → routine_blocks (sin cascada visible: borrar la rutina o el bloque va a su papelera, `deleted_at`, nunca borra de verdad, así que el historial del reporte no se pierde). Un registro por bloque por día; `focus_done` solo aplica a bloques de enfoque. |
| meal_plans | plan_date, meal (`breakfast`, `lunch`, `dinner`), dish, done, prep, note | `has_event` (si cae un evento de la Agenda en esa comida) no es columna: se deriva al leer, igual que `project` en Tareas/Agenda — hoy siempre `false`, Agenda todavía no tiene datos reales que consultar (decisión #39). |
| journal_entries | entry_date, mood, body, gratitude (arreglo), tags (arreglo), summary (arreglo), saved_at | Una por día por usuario (sin UNIQUE en la base, igual que el resto del módulo: la aplicación ya lo garantiza). `body` **sin cifrar y sin PIN** (decisión #39, en contra de lo que pedía `docs/guides/security.md` #6 — pendiente de reforzar si se decide más adelante). `summary` ("Tu día en resumen") lo arma y congela el front al guardar, no la API. |
| goals | title, area (`work`/`personal`/`school`/`health`/`money`), kind (`milestones`/`number`/`habit`/`project`), status, target, current, unit, block_id, project_id, due_on, why, achieved_on | `block_id` → routine_blocks (FK, mismo módulo); `project_id` sin FK (Proyectos sin tabla todavía). Para `milestones`/`project`/`habit`, `target`/`current`/`unit` guardados no se usan: el front los recalcula siempre al leer (igual que `project: null` en Tareas/Agenda, decisión #37/#39). |
| goal_milestones | text, done | → goals |
| goal_log_entries | log_date, amount | → goals. El registro de avance de una meta de tipo Número. |

## Finanzas

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| cards | name, kind (`debit`, `credit`), last4, color | **Solo** últimos 4 dígitos. |
| categories | name, icon, color, monthly_limit_cents | Al borrar una, sus movimientos pasan a "Otros". |
| transactions | kind (`income`, `expense`, `saving_deposit`, `saving_withdrawal`, `debt_payment`), amount_cents, currency, occurred_on, note | → categories, cards, savings_goals, debts, memberships (cada una opcional) |
| savings_goals | name, target_cents, currency, due_on | Lo ahorrado se calcula de sus transactions. |
| debts | name, lender, total_cents, currency, interest_rate, next_payment_on, paid_off_at | Lo pagado se calcula de sus transactions. |
| memberships | name, amount_cents, currency, cadence (`monthly`, `yearly`), charge_day, next_charge_on | → cards. Al borrar una tarjeta se pregunta qué hacer con sus membresías. |

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
