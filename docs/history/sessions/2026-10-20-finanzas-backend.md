# 2026-10-20 · Variables de entorno y Finanzas conectado a su backend real

**Hecho en:** Claude Code

## Qué se hizo

- **Variables de entorno (`.env`).** La usuaria había perdido sus `.env` (están en `.gitignore`: `apps/api/.env` y `apps/web/.env.local`). Se crearon desde los `.env.example` y se le guio, paso a paso, para sacar cada valor del dashboard de Supabase (Connect → pooler de transacción y de sesión, Project Settings → API Keys). Se comprobó con un script que no imprime secretos: URL y llaves aceptadas por Supabase, las dos URLs de la base conectan como `kairo_api`, y los 61 tests e2e pasan. Lección que conviene recordar: la contraseña de `kairo_api` **no se puede ver** en Supabase (Postgres solo guarda un hash); si se pierde hay que ponerle una nueva con `ALTER ROLE kairo_api WITH PASSWORD '…'` en el SQL Editor, y no es la misma que la del usuario `postgres`. `DIRECT_URL` **no** es la opción "Direct connection" de Supabase (solo IPv6): es el pooler en modo sesión (puerto 5432).
- **Finanzas reconectado a su backend real** (quinto módulo de Fase 1b), a pedido explícito: "hazlo tú todo, yo verifico al final". Las 5 pestañas (Resumen, Movimientos, Ahorros y deudas, Membresías, Presupuesto).
  - **Base de datos:** migración `0007_finance_tables.sql` (7 tablas: `cards`, `categories`, `savings_goals`, `debts`, `memberships`, `transactions`, `finance_settings`; 9 enums nativos; CHECKs; RLS). Aplicada a la base de desarrollo y verificada. Ver `docs/guides/data-model.md`.
  - **API** (`apps/api/src/modules/finance/`): un módulo de Nest con un controller/service por pestaña (`transactions`, `savings-debts`, `memberships` —con tarjetas—, `budget`, `records` —las lecturas—) y un Deshacer compartido (`POST /finance/undo`), más un repositorio por tabla. La API devuelve hechos crudos y solo calcula lo ahorrado y lo pagado (SUM sobre todos los movimientos). Valida lo que no se le puede confiar al front: que la cuenta, la categoría, el ahorro y la deuda que nombra un movimiento existan **y sean de la persona**, que no se retire más de lo ahorrado, que no se pague de más una deuda.
  - **Front:** `api.ts` y las 4 `*-actions.ts` reescritos (mismo contrato `FinanceActionResult`, así que los componentes casi no cambiaron: solo `BudgetView`, por `key` en vez de id para reconocer "Otros"); `mock-store.ts` borrado; `mock.ts` queda para el modo demo. `finance-utils.ts` casi intacto (`savingView`/`debtView` leen lo ya sumado).
  - **Tests:** `test/finance.e2e-spec.ts` nuevo, 47 tests (lectura y categorías de arranque, tarjetas incluido el CHECK de la base contra números completos, movimientos, ahorros, deudas, membresías, borrar tarjeta con sus membresías, presupuesto, cada tipo de Deshacer, un token alterado, aislamiento entre usuarios incluso al **referirse** a la tarjeta/categoría/ahorro/deuda de otro, y el contrato exacto de cada respuesta con el front). Los 108 (6 Cuenta + 11 Tareas + 9 Recordatorios + 13 Agenda + 22 Día a día + 47 Finanzas) pasan contra la base de desarrollo real.
- **Arreglo en el cliente HTTP del front (`lib/api-client.ts`):** los endpoints que responden con el cuerpo vacío (el Deshacer de Día a día y el de Finanzas responden `201` sin cuerpo) hacían fallar `response.json()`: el deshacer funcionaba en el servidor pero la pantalla decía "Ya no se puede deshacer". Ya lee el cuerpo como texto y lo parsea solo si hay algo. Esto corrige también el Deshacer de Día a día, que tenía ese defecto sin que lo viera ningún test (los e2e no pasan por este cliente).
- **Prueba en navegador real** (Edge headless con CDP, contra la API y el front reales, con un usuario de prueba temporal que se borró al terminar): login → Resumen vacío; tarjetas (débito, crédito con corte y pago, efectivo sin números, "últimos 4" inválido); gasto e ingreso (totales del Resumen y centavos en la base); ahorro (aportar, retirar, retirar de más rechazado con el mensaje de la API, borrar y deshacer); deuda (pago, pago de más recortado, "Deuda liquidada" con su fecha, el Resumen resta ahorro y pago de deuda); membresía (aparece en Inicio y en la Agenda); borrar tarjeta con su membresía y deshacer; presupuesto (límite, "Otros" sin botón de borrar, borrar categoría y deshacer, "Usar lo real" y deshacer, categoría nueva y nombre repetido); editar y borrar un movimiento con Deshacer. Sin errores de consola. No se probó en 390 px.

## Decisiones tomadas

- **#40** (también en `docs/guides/decisions.md`): hechos crudos con la excepción de lo ahorrado y lo pagado; categorías de arranque creadas por la API con una `key` y sin límites; borrar una categoría no mueve sus movimientos (se cuentan en "Otros" al leer); el id compartido de Finanzas pasa a `z.uuid()`; el token de Deshacer se valida con Zod; los cobros de membresías aún no generan movimientos solos.

## Archivos o partes importantes que se tocaron

- `packages/shared/src/finance/constants.ts` (`CATEGORY_ICONS`, `DEFAULT_CATEGORIES`, `FALLBACK_CATEGORY_KEY` en lugar de `FALLBACK_CATEGORY_ID`) y `schemas.ts` (`id` uuid, `financeRecordsQuerySchema`, `financeUndoTokenSchema`).
- `apps/api/src/db/schema/finance.ts`, `src/drizzle/0007_finance_tables.sql` (+ meta), `src/modules/finance/` (nuevo), `src/app.module.ts`, `test/finance.e2e-spec.ts`.
- `apps/web/src/features/finance/` (`api.ts`, `action-errors.ts` nuevo, las 4 `*-actions.ts`, `types.ts`, `finance-utils.ts`, `mock.ts`, `components/BudgetView.tsx`; `mock-store.ts` borrado) y `apps/web/src/lib/api-client.ts`.
- `docs/guides/data-model.md`, `decisions.md`, `roadmap.md`.

## Quedó pendiente

- **Cobros de membresías como movimientos:** hoy una membresía sale en "Próximos pagos" y en la Agenda, pero su cobro no se anota solo como gasto (decisión #40). Llega con las tareas programadas (`apps/api/src/jobs`, Supabase Cron).
- **Avisos del presupuesto** (80% y pasarse): solo se guarda la preferencia; los avisos de verdad llegan con Recordatorios + tareas programadas.
- **Papelera:** como en los otros módulos, Finanzas solo tiene el "Deshacer" inmediato del aviso; la pantalla para ver y restaurar lo borrado no existe. Cuando la tarea que purga a los 30 días borre de verdad una categoría, tendrá que reasignar antes sus gastos a "Otros" (hoy se reasignan al leer).
- **Retirar de un ahorro y pagar una deuda** revisan el límite y luego insertan, sin transacción: dos peticiones simultáneas de la misma persona podrían pasarse del límite. Es una app de una sola persona por cuenta; si algún día importa, se envuelve en una transacción.
- El botón **"Repetir"** de "Para el próximo mes" (Presupuesto) viene del front de antes y no se revisó en esta sesión.
- `next-env.d.ts` aparece modificado en `git status` mientras corre `next dev` (Next lo reescribe solo); `pnpm run typecheck` lo deja como estaba. No hay que subirlo.

## Notas para la siguiente sesión

- Siguiente módulo de Fase 1b en el orden de `roadmap.md`: **Escuela** (después Proyectos, Escritos y Enfoque), o "lo global" (Buscar Ctrl+K, avisos, captura rápida y la Papelera como pantalla).
- Sigue pendiente la prueba manual de Tareas, Recordatorios, Agenda y Día a día en el navegador (la usuaria pidió dejarla para después). Esta sesión ya probó Finanzas y el Deshacer; Inicio y Agenda se vieron funcionando con el cobro de una membresía.
- En el servidor de desarrollo, tras una acción (borrar, deshacer) el aviso aparece primero y la pantalla se repinta unos segundos después (Turbopack); en producción no debería notarse.
- Para probar con Edge: `msedge --remote-debugging-port=9333 --headless=new …` y un cliente CDP mínimo (ver la nota de memoria `reference_edge-cdp-testing`). Los scripts de esta sesión vivieron en el scratchpad, no en el repo.
