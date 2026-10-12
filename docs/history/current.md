# Dónde nos quedamos

> Léelo al empezar cada sesión. Actualízalo al terminar. Máximo ~60 líneas: es un resumen, no un diario. El detalle va en `sessions/`.

**Última actualización:** 2026-10-12 · sesión `2026-10-12-base-de-datos-supabase.md`

## Fase actual

Fase 0 (base), **en progreso**. Paso 3 de 6 (base de datos) listo.

## Lo último que se hizo

- Proyecto de Supabase creado; esquema `app`; rol `kairo_api` (dueño de `app`, permisos mínimos fuera de ahí); Drizzle conectado (`DbModule`, env validada con Zod).
- Tablas de Cuenta (8): `profiles`, `user_sections`, `home_cards`, `connections`, `notifications`, `push_subscriptions`, `login_codes`, `verified_sessions`. Todas con RLS activado.
- Dos migraciones aplicadas (`0000_bootstrap_role_and_schema.sql`, `0001_account_tables.sql`). Ver `docs/history/sessions/2026-10-12-base-de-datos-supabase.md` para los problemas de permisos que salieron en el camino (quedaron resueltos y documentados en la propia migración 0001).
- Decisiones #23 y #24: enums nativos de Postgres; correo por SMTP de Supabase.

## Siguiente paso

Fase 0, punto 4 de `docs/guides/roadmap.md`: Auth completa (invitación, contraseña, código por correo, guard global de la API, sesiones de 30 días, cerrar todas las sesiones, recuperar contraseña). Leer `docs/guides/security.md` antes de empezar.

## Pendientes de decidir con el usuario

- Tareas que se repiten, o si eso vive solo en Recordatorios.
- Agenda: mostrar la rutina detrás de los eventos y arrastrar eventos.
- Proteger `main` en GitHub (pedir Pull Request para hacer merge).
- En la Fase 0: si se agrega commitlint + husky para validar los mensajes de commit, y GitHub Actions para revisar cada Pull Request.

## Bloqueos o problemas abiertos

- `@nestjs/cli` (generadores `nest generate`, etc.) no se puede usar: bug de `@angular-devkit/schematics` + Node 22. Mientras tanto, los archivos de `apps/api` se escriben a mano. Revisar si una versión futura lo arregla.
- `drizzle-kit migrate` (la CLI) no muestra el error cuando una migración falla; hay que diagnosticar llamando a `migrate()` de `drizzle-orm` directamente en un script aparte si vuelve a pasar. Revisar si una versión futura lo arregla.

## Pendiente dentro del paso 2 (componentes de `components/ui/`)

- Select, Toggle y el grupo segmentado (Lista/Tablero, Prioridad) quedan para cuando se construya `TareaNueva` en Fase 1 — no eran necesarios todavía.
- `modes/dark.css` no existe (fase posterior), aunque el PDF ya trae los valores oscuros documentados.
