# 2026-10-12 · Base de datos: Supabase, rol de la API y tablas de Cuenta

**Hecho en:** Claude Code

## Qué se hizo
- Fase 0, paso 3 de la hoja de ruta: proyecto de Supabase creado, esquema `app`, rol `kairo_api` con permisos mínimos (dueño de `app`, sin nada en `public` más allá del `USAGE` por defecto), Drizzle conectado.
- `apps/api/src/common/db/db.module.ts`: `DbModule` de Nest que expone el cliente de Drizzle (token `DB`) usando el pooler de Supabase en modo transacción (`prepare: false`, necesario en ese modo).
- `apps/api/src/common/env.ts`: variables de entorno validadas con Zod al arrancar (`conventions.md`).
- `apps/api/src/db/schema/`: `_shared.ts` (el `pgSchema('app')`, la tabla `profiles` y el helper `userColumns` común a toda tabla de usuario) y `account.ts` (las otras 7 tablas de Cuenta: `user_sections`, `home_cards`, `connections`, `notifications`, `push_subscriptions`, `login_codes`, `verified_sessions`). Todas con RLS activado (`.enableRLS()`), sin políticas (la protección real es el filtro por `userId` en la API; RLS es la red de seguridad).
- Dos migraciones en `apps/api/src/drizzle/`: `0000_bootstrap_role_and_schema.sql` (crea el rol y el esquema) y `0001_account_tables.sql` (las 8 tablas). Ambas aplicadas y verificadas contra la base real.
- El usuario escribió la tabla `home_cards` (TODO(human) del molde de `account.ts`); las demás las escribí yo siguiendo el mismo patrón.

## Decisiones tomadas
- También en `docs/guides/decisions.md` (#23 y #24):
  - Enums de la base de datos: nativos de Postgres (`pgEnum`), no `text` + `CHECK`.
  - Proveedor de correo (invitaciones, código de login, recuperar contraseña): SMTP propio de Supabase.
- `profiles.id` no tiene FK a `auth.users`: el rol `kairo_api` no tiene permiso sobre ese esquema (ni falta que hace). La integridad la garantiza la API.
- `user_sections.section` usa un enum cerrado (mismos ids que `MODULE_IDS`); `home_cards.card` es `text` porque cada módulo registra las suyas por su cuenta — no vive en un solo lugar.
- Dos conexiones separadas en `.env`: `DATABASE_URL` (pooler modo transacción, puerto 6543, la usa la API) y `DIRECT_URL` (pooler modo sesión, puerto 5432, solo para `drizzle-kit`). La conexión "directa" normal de Supabase es IPv6-only y esta red no tiene salida IPv6.

## Problemas encontrados (y por qué importan para la próxima migración)
- `CREATE SCHEMA ... AUTHORIZATION otro_rol` exige poder `SET ROLE` a ese rol primero; crear el rol no alcanza.
- El migrator de `drizzle-orm` corre `CREATE SCHEMA IF NOT EXISTS "drizzle"` **cada vez** que se migra, sin importar quién lo ejecute. Como la migración 0000 (corrida por `postgres`, antes de que existiera `kairo_api`) ya creó ese esquema, `kairo_api` necesitaba permiso de crear esquemas a nivel de toda la base (`GRANT CREATE ON DATABASE`) y que se le traspasara el dueño del esquema/tabla/secuencia de bookkeeping. Todo esto quedó documentado con comentarios al inicio de `0001_account_tables.sql`, así que una base nueva desde cero no debería tropezar con esto.
- `drizzle-kit migrate` (la CLI) **no muestra el error** cuando una migración falla: se traga el motivo y solo sale con código 1. Para diagnosticar hubo que llamar a `migrate()` de `drizzle-orm` directamente en un script aparte.

## Archivos o partes importantes que se tocaron
- `apps/api/drizzle.config.ts`, `apps/api/.env.example` (nuevos).
- `apps/api/src/common/db/db.module.ts`, `apps/api/src/common/env.ts` (nuevos).
- `apps/api/src/db/schema/_shared.ts`, `apps/api/src/db/schema/account.ts` (nuevos).
- `apps/api/src/drizzle/0000_bootstrap_role_and_schema.sql`, `0001_account_tables.sql` (nuevos).
- `apps/api/src/app.module.ts`: importa `DbModule`.
- `apps/api/package.json`: `drizzle-orm`, `drizzle-kit`, `postgres`, `zod`; scripts `db:generate` y `db:migrate`.
- `docs/guides/security.md`, `docs/guides/data-model.md`: reflejan las decisiones #23 y #24.

## Quedó pendiente
- Nada pendiente del paso 3. Falta commitear este trabajo junto con lo de la sesión anterior (tokens/componentes), que seguía sin subir.

## Notas para la siguiente sesión
- Siguiente paso: Fase 0, punto 4 — Auth completa (invitación, contraseña, código por correo, guard global, sesiones de 30 días, cerrar todas las sesiones, recuperar contraseña). Leer `docs/guides/security.md` antes de empezar.
- `apps/api/.env` tiene las credenciales reales de `kairo_api` (contraseña generada al azar, nunca escrita en el chat). Sigue fuera de git.
