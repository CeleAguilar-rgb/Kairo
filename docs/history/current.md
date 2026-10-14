# Dónde nos quedamos

> Léelo al empezar cada sesión. Actualízalo al terminar. Máximo ~60 líneas: es un resumen, no un diario. El detalle va en `sessions/`.

**Última actualización:** 2026-10-14 · sesión `2026-10-14-tareas-2.md`

## Fase actual

Fase 0 (base), **en progreso**. Paso 4 de 6 (Auth) casi listo.

## Lo último que se hizo

- **2026-10-14 · Tareas (solo front, con datos de ejemplo).** `/tareas` completa: lista por fechas con captura rápida, tablero de 4 columnas (arrastrar o con la flecha), panel de nueva tarea validado con `createTaskSchema` (`packages/shared`), detalle con Estado, filtros por proyecto. Componentes nuevos `Segmented` y `Select`. Se suma el estado `review` (Revisión) y no se construye la hora de la tarea. **Pendiente de base de datos:** agregar `review` al enum `tasks.status` con migración y actualizar `data-model.md`. Siguiente pantalla: `Proyectos`.
- **2026-10-14 · Base de movimiento e Inicio (solo front, con datos de ejemplo).** `lib/motion.ts` (curvas, resortes y variantes compartidas), componentes `Drawer`, `Modal`, `Toast` con "Deshacer", `Progress`, `Skeleton`, `Doodle`, `EmptyState`; Topnav con píldora activa que se desliza; transición de página (`template.tsx`). Inicio (`Main`) completo con sus 8 tarjetas, "Ajustar mi Inicio" y bandeja de doodles. Cada módulo tiene `types.ts`/`mock.ts`/`api.ts`: cuando llegue su endpoint solo cambia `api.ts`. Rutas provisionales para las secciones que faltan. Modo demo para ver el front sin `.env` (`pnpm dev:demo` en `apps/web`, solo en desarrollo); el header y el saludo se ajustaron contra el canvas en el navegador. Siguiente pantalla: `Tareas` + `TareaNueva`. Detalle y pendientes en la nota de sesión.
- Login completo: invitación (`/aceptar-invitacion`), entrar (`/entrar`), recuperar contraseña (`/recuperar` + `/restablecer-contrasena`), guard global de la API (`auth/jwt.guard.ts`, `getClaims()` por JWKS). Las tres pantallas comparten layout y piezas en `app/(auth)/` (`BrandPanel`, `SetPasswordForm`, los `.module.css` de layout). Detalle de cada una en las sesiones `-1` a `-5` de hoy.
- **Decisión #26 (reemplaza la #7): código por correo pasa a "Después".** Exigía correo propio en la API, que no existe. Por ahora el login es solo correo + contraseña. `login_codes`/`verified_sessions` quedan listas sin usarse.
- Se integró `Motion` por primera vez en el proyecto (ya estaba en el stack): entrada escalonada en los formularios de auth, banners de error animados, `whileTap` en el `Button` compartido (toda la app).
- Bug real encontrado y arreglado: las plantillas de correo no pueden usar `{{ .ConfirmationURL }}` (pierde el token en el fragmento de la URL) — van con `{{ .TokenHash }}` + `verifyOtp()`. Ambas plantillas (`invite-user.html`, `recover-password.html`) se pegan a mano en el dashboard de Supabase; no hay sincronización automática.
- Las cuatro pantallas de auth (`entrar`, `recuperar`, `aceptar-invitacion`, `restablecer-contrasena`) ahora comparten el mismo panel de marca (logo + doodles animados) — las dos últimas antes eran una tarjeta simple y sin eso. Probado de punta a punta en el navegador: invitación, login y recuperar/restablecer contraseña funcionan de verdad.

## Siguiente paso

El paso 4 de Auth está prácticamente terminado. Falta, del lado del usuario (no código):
- Pegar `recover-password.html` en el dashboard de Supabase (Authentication → Email Templates → Reset Password) — la de invitación ya se pegó, esta todavía no se confirmó.
- Confirmar que la sesión dura 30 días en el dashboard de Supabase (decisión #8).

"Cerrar todas las sesiones" espera a que exista Perfil (punto 5). Con eso, Fase 0 pasa al punto 5: Shell del dashboard (layout, sidebar desde el registro de módulos, perfil básico, bienvenida).

## Pendientes de decidir con el usuario

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
