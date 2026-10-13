# 2026-10-13 · Guard global y pantalla de aceptar invitación

**Hecho en:** Claude Code / chat

## Qué se hizo

- Al empezar la sesión había trabajo sin documentar de una sesión anterior: infraestructura de Supabase Auth (cliente admin en la API, script para invitar al primer usuario, clientes de `@supabase/ssr` en el front, middleware que refresca la sesión). Quedó registrado y se siguió desde ahí.
- Guard global de la API (`apps/api/src/auth/jwt.guard.ts`): verifica el JWT de Supabase con `getClaims()` (verificación local por JWKS, sin llamar al servidor de Supabase en cada petición) y pone `userId` en el request. Se registró globalmente en `app.module.ts` vía `APP_GUARD`.
  - Se decidió con el usuario dividirlo en dos pasos: por ahora solo verifica el JWT; la revisión de que la sesión esté verificada por código de correo (`verified_sessions`) se agrega cuando se construya ese flujo, porque todavía no existe nada que llene esa tabla.
  - Se agregaron también `@Public()` (marca rutas sin guard) y `@CurrentUser()` (lee `request.userId`).
- Pantalla de aceptar invitación en el front:
  - `packages/shared/src/auth/schemas.ts`: esquema Zod para la contraseña nueva (mínimo 8 caracteres, confirmación debe coincidir). Primer uso real de `packages/shared` — se le agregó `zod` como dependencia y se conectó como dependencia de workspace en `apps/web`.
  - `apps/web/src/app/(auth)/confirmar/route.ts`: recibe el `code` del enlace de invitación y lo cambia por una sesión real (`exchangeCodeForSession`).
  - `apps/web/src/app/(auth)/aceptar-invitacion/`: página que muestra el formulario si hay sesión, o "este enlace ya no es válido" si no.
  - `invite-initial-user.ts` actualizado para apuntar al nuevo flujo.
- Se probaron ambos servidores levantados con `pnpm dev`: la API bootea sin errores y la pantalla de invitación responde correctamente (probado el caso sin sesión; el caso con invitación real todavía no, porque no se envió un correo nuevo).

## Decisiones tomadas

- #25 en `docs/guides/decisions.md`: usar `getClaims()` de `@supabase/supabase-js` para verificar el JWT en vez de una librería de JWT/JWKS aparte (el proyecto ya usa llaves asimétricas).

## Archivos o partes importantes que se tocaron

- `apps/api/src/auth/`: `jwt.guard.ts`, `public.decorator.ts`, `current-user.decorator.ts`.
- `apps/api/src/app.module.ts`: registra el guard global.
- `packages/shared/src/auth/schemas.ts` (nuevo) y `index.ts`.
- `apps/web/src/app/(auth)/confirmar/route.ts` y `apps/web/src/app/(auth)/aceptar-invitacion/` (página + formulario).
- `apps/web/package.json` (agrega `@kairo/shared`), `packages/shared/package.json` (agrega `zod`).

## Quedó pendiente

- Dentro del paso 4 (Auth completa): código por correo (segundo factor), la parte del guard que revisa `verified_sessions`, cerrar todas las sesiones, recuperar contraseña.
- Probar el flujo de invitación de punta a punta con un correo real (se probó solo el caso "sin sesión").
- No existe todavía el filtro global de errores (`common/filters/`) que menciona `docs/guides/architecture.md`; por ahora el guard lanza excepciones normales de Nest.

## Notas para la siguiente sesión

- **Bug de entorno encontrado y resuelto:** con `tsx`/esbuild (el toolchain de `apps/api`, ver "Bloqueos" en `current.md`), un guard con un parámetro de constructor sin `@Inject()` explícito (ahí era `Reflector`) puede fallar en tiempo de ejecución con `UndefinedDependencyException`, aunque `tsc --noEmit` no marque ningún error. La solución fue agregar `@Inject(Reflector)` explícito. Vale la pena recordarlo para el próximo guard, interceptor o pipe que se escriba a mano: si inyecta algo sin `@Inject()`, probarlo corriendo la API, no solo con `tsc`.
- El siguiente paso lógico es código por correo (`apps/api/src/auth/email-code/`), que es lo que de verdad llena `verified_sessions` y permite terminar el guard.
