# Dónde nos quedamos

> Léelo al empezar cada sesión. Actualízalo al terminar. Máximo ~60 líneas: es un resumen, no un diario. El detalle va en `sessions/`.

**Última actualización:** 2026-10-13 · sesión `2026-10-13-guard-global-y-aceptar-invitacion-3.md`

## Fase actual

Fase 0 (base), **en progreso**. Dentro del paso 4 de 6 (Auth completa).

## Lo último que se hizo

- Infraestructura de Supabase Auth: cliente admin en la API (`common/supabase/`), script para invitar al primer usuario, clientes de `@supabase/ssr` y middleware de refresco de sesión en el front.
- Guard global de la API (`auth/jwt.guard.ts`): verifica el JWT de Supabase (`getClaims()`, local por JWKS) y pone `userId` en el request. Registrado en `app.module.ts`. Decisión #25.
- **Decisión #26: código por correo pasa a "Después"** (reemplaza la #7). Construirlo exigía infraestructura de correo propia en la API que no existe todavía, más una pantalla nueva y cambios al guard. Por ahora el login es solo correo + contraseña — razonable para una cuenta de un solo usuario invitado. Las tablas `login_codes` y `verified_sessions` quedan listas sin usarse. Actualizado en `security.md`, `architecture.md` y `roadmap.md`.
- Pantalla de aceptar invitación en el front (`app/(auth)/confirmar/` + `app/(auth)/aceptar-invitacion/`): cambia el código del correo por una sesión y deja poner la contraseña. Primer uso de `packages/shared` (esquema de contraseña).
- Probado de punta a punta con una invitación real: funciona. En el camino se encontró y arregló un bug real — la plantilla de correo usaba `{{ .ConfirmationURL }}`, que pierde el token en el fragmento de la URL (nunca llega al servidor). Ahora usa `{{ .TokenHash }}` + `verifyOtp()`. La plantilla del dashboard de Supabase se actualiza pegando el HTML a mano; no hay sincronización automática todavía. Detalle en la sesión `-2`.
- `SetPasswordForm` ahora valida al salir del campo y quita el error en cuanto se corrige (regla de `docs/guides/conventions.md` que la primera versión no cumplía).
- `/entrar` (login) construido y luego **rehecho** para seguir `docs/design/screens/Entrar.dc.html` (se había armado sin revisar el canvas primero). Nuevo componente reusable `components/ui/PasswordInput.tsx` (ojo de mostrar/ocultar). Se integró `Motion` por primera vez en el proyecto (ya estaba en el stack, no se había usado): entrada escalonada en los formularios de auth, banners de error animados, y `whileTap` en el `Button` compartido (aplica a toda la app). Detalle en la sesión `-3`.

## Siguiente paso

Seguir en Fase 0, punto 4 de `docs/guides/roadmap.md`: **recuperar contraseña** — mismo patrón que aceptar invitación (`/confirmar` con `type=recovery` + `verifyOtp()`, una pantalla para poner la contraseña nueva). "Cerrar todas las sesiones" queda para cuando exista Perfil (punto 5, necesita una pantalla). También falta confirmar en el dashboard de Supabase que la sesión dura 30 días (decisión #8) — es configuración, no código.

## Pendientes de decidir con el usuario

- `/entrar`: el usuario pidió animar también "el fondo" y no quedó claro qué quería decir (¿doodles del lado del formulario también? ¿un degradado como el de `Bienvenida.dc.html`? ¿el color no se veía bien?). Preguntar antes de tocarlo — `Entrar.dc.html` no trae nada ahí, así que cualquier cosa que se agregue sería una extensión, no algo que ya esté en el canvas.
- Correo para enviar invitaciones a otras personas: por ahora SMTP de Resend sin dominio propio (`onboarding@resend.dev`, solo entrega al correo con el que te registraste en Resend — sirve para probar, no para invitar a nadie más todavía). Más adelante: crear un Gmail dedicado a Kairo (decidir si se usa como SMTP o solo como cuenta de Resend) o comprar un dominio.
- Tareas que se repiten, o si eso vive solo en Recordatorios.
- Agenda: mostrar la rutina detrás de los eventos y arrastrar eventos.
- Proteger `main` en GitHub (pedir Pull Request para hacer merge).
- En la Fase 0: si se agrega commitlint + husky para validar los mensajes de commit, y GitHub Actions para revisar cada Pull Request.

## Bloqueos o problemas abiertos

- `@nestjs/cli` (generadores `nest generate`, etc.) no se puede usar: bug de `@angular-devkit/schematics` + Node 22. Mientras tanto, los archivos de `apps/api` se escriben a mano. Revisar si una versión futura lo arregla.
- `drizzle-kit migrate` (la CLI) no muestra el error cuando una migración falla; hay que diagnosticar llamando a `migrate()` de `drizzle-orm` directamente en un script aparte si vuelve a pasar. Revisar si una versión futura lo arregla.
- `tsx`/esbuild (el toolchain de `apps/api`) no siempre emite la metadata de tipos que Nest usa para inyectar un parámetro de constructor sin `@Inject()` explícito — falla en tiempo de ejecución (`UndefinedDependencyException`) aunque `tsc --noEmit` no marque nada. Pasó con `Reflector` en `jwt.guard.ts`; se resolvió con `@Inject(Reflector)` explícito. Si se escribe otro guard/interceptor/pipe a mano, probarlo corriendo la API, no solo con `tsc`.

## Pendiente dentro del paso 2 (componentes de `components/ui/`)

- Select, Toggle y el grupo segmentado (Lista/Tablero, Prioridad) quedan para cuando se construya `TareaNueva` en Fase 1 — no eran necesarios todavía.
- `modes/dark.css` no existe (fase posterior), aunque el PDF ya trae los valores oscuros documentados.
