# Modelo de datos

Fuente: el documento "Mi tablero · Funcionalidades y base de datos" del usuario, ajustado a las decisiones de arquitectura y seguridad. Si cambias algo aquí, cámbialo con una migración de Drizzle y actualiza este archivo.

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
| tasks | title, notes, status (`todo`, `in_progress`, `done`), priority, due_on, done_at, position | → projects (opcional), → sprints (opcional; vacío = backlog), → tasks como padre (subtareas). Las **notas rápidas** del Inicio son tareas: pendientes marcables que se abren con más detalle. |
| attachments | name, storage_path, mime, size_bytes | → projects **o** pages (exactamente una, con check). |

## Agenda

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| events | title, kind (`work`, `personal`), starts_at, ends_at, all_day, notes | → projects (opcional) |
| reminders | title, remind_at, done_at, snoozed_to, notified_at | → tasks, events o memberships (opcional, uno a la vez). Lo no atendido pasa al día siguiente. |

## Día a día

| Tabla | Columnas | Relaciones / notas |
|---|---|---|
| routines | name, days (lunes a domingo) | |
| routine_blocks | starts_at, ends_at, title, kind, position | → routines. Horas del día (`time`). |
| routine_logs | log_date, done, note | → routine_blocks |
| meal_plans | plan_date, meal (`breakfast`, `lunch`, `dinner`), dish, done | |
| journal_entries | entry_date, mood, body_encrypted | Una por día por usuario (único). `body` cifrado (ver `docs/guides/security.md`). |
| goals | title, target, current, unit, due_on | |

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
