# 2026-10-14 · Molde de Tareas, tests, y cambio de orden en Fase 1

**Hecho en:** Claude Code

## Qué se hizo

- Se revisó y commiteó el shell del dashboard que ya estaba sin subir de la sesión anterior: layout protegido en `app/(dashboard)/`, Topnav armado desde `lib/modules/registry.ts`, y Perfil básico con pestañas "Mi perfil" y "Mis secciones".
- Bug real corregido: el botón "Cerrar sesión" del Topnav llamaba a `signOut()` sin argumentos, y el *default* de ese método es `scope: 'global'` — cerraba la sesión en todos los dispositivos, no solo en el navegador actual. Ahora usa `{ scope: 'local' }`. Se agregó "Cerrar todas las sesiones" en Perfil → Mi perfil, con `scope: 'global'` explícito para ese caso.
- Primeros tests del proyecto (cierra el paso 6 de Fase 0): Jest + Supertest en `apps/api/test/`, contra la app de Nest completa y la base real (sin mocks). Cubren guard global (rechaza sin token / con token inválido), aislamiento entre usuarios en `AccountController`, y validaciones de los esquemas Zod. `test/helpers/test-users.ts` crea y borra usuarios reales de Supabase Auth con la Admin API en cada corrida.
- Complicaciones al montar Jest: NestJS 12 es ESM-only (`@nestjs/common`, `@nestjs/testing` no tienen build CommonJS) — hubo que correr Jest en modo ESM real (`--experimental-vm-modules`, `useESM` en ts-jest, globals importados de `@jest/globals`), con un `tsconfig.spec.json` separado del de producción. El hook `beforeAll` también necesitó más de los 5s default (crear 2 usuarios reales por red tarda).
- **Molde Inicio + Tareas construido completo**, de punta a punta: esquema compartido (`packages/shared/src/tasks/schemas.ts`, con `TASK_STATUSES`/`TASK_PRIORITIES` como listas cerradas), tabla `tasks` + migración aplicada, `apps/api/src/modules/tasks/` (controller/service/repository, con `position` calculado por el service y `where: {id, userId}` en la acción de completar), `apps/web/src/features/tasks/` (lista con quick-add, checkbox para marcar hecha, "mostrar hechas"), y la tarjeta "Pendientes de hoy" en Inicio.
- Dos errores encontrados y corregidos a media sesión, antes de seguir:
  - Los archivos de Tareas se habían puesto en `apps/api/src/tasks/` y `apps/web/src/lib/tasks/` en vez de `apps/api/src/modules/tasks/` y `apps/web/src/features/tasks/`, como dicen `architecture.md`/`modules.md` — se movieron.
  - Al conectar la tarjeta de Inicio, `/` tronaba con 500: el Topnav (`'use client'`) importa `lib/modules/registry.ts`, y ese archivo cargó un componente de Inicio que arrastraba código `server-only`. Se separó en dos archivos: `registry.ts` (ligero, lo usa el Topnav) y `lib/modules/home-cards.ts` (con `import 'server-only'`, solo lo usa Inicio).
- **Cambio de rumbo para el resto de Fase 1 (decisión #27):** desde Recordatorios, primero se construye todo el front del módulo (datos dummy con la forma de `data-model.md`, animaciones de Motion reales) y después su backend y conexión — antes era el molde completo por módulo de una vez. Lo pidió el usuario: la calidad del front le importa más porque es quien usa la app a diario, y prefiere ajustar el modelo de datos a lo que el front termine pidiendo, no al revés.

## Decisiones tomadas

(también en `docs/guides/decisions.md`)

- #27: Fase 1 desde Recordatorios, front primero y backend después, módulo por módulo.
- #28: los tests de la API corren contra el mismo proyecto de Supabase que desarrollo, con usuarios temporales por la Admin API — no un proyecto de Supabase aparte.

## Archivos o partes importantes que se tocaron

- `apps/api/src/modules/tasks/`, `apps/web/src/features/tasks/`, `packages/shared/src/tasks/schemas.ts`, `apps/api/src/db/schema/tasks.ts` + migración `0002_elite_carlie_cooper.sql`.
- `apps/web/src/lib/modules/registry.ts` (ligero) y `home-cards.ts` (nuevo, server-only).
- `apps/api/test/` (nuevo: `jest-e2e.json`, `account.e2e-spec.ts`, `helpers/test-users.ts`), `apps/api/tsconfig.spec.json`.
- Docs: `roadmap.md`, `decisions.md`, `CLAUDE.md` (plan del molde), `modules.md` (pasos para agregar un módulo), `data-model.md` (nota de que las tablas sin backend todavía son punto de partida, no molde fijo).

## Quedó pendiente

- Front de Recordatorios (primer módulo con el nuevo orden): pantallas de `docs/design/screens/`, datos dummy, animaciones reales.
- Dos tareas de Auth que son del usuario, no de código: pegar `recover-password.html` en el dashboard de Supabase, y confirmar ahí que la sesión dura 30 días.
- `apps/api/package.json` no tiene `"type": "module"`; nunca se probó `pnpm build && pnpm start` (solo `tsx watch` en dev). Como `@nestjs/common` es ESM-only, revisar antes de desplegar.
- Select y el grupo segmentado (`Lista/Tablero`, `Prioridad`) de `components/ui/` siguen pendientes para cuando haga falta un selector de verdad.

## Notas para la siguiente sesión

- Empezar leyendo `docs/guides/roadmap.md` (Fase 1a) y `docs/design/screens/` para Recordatorios antes de tocar código.
- El molde de Tareas (ya construido) sirve de referencia de estilo/estructura para el front, pero el ORDEN de capas que usó (back antes que front) ya no aplica a los módulos que siguen.
