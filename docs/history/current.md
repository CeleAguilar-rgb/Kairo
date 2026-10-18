# Dónde nos quedamos

> Léelo al empezar cada sesión. Actualízalo al terminar. Máximo ~60 líneas: es un resumen, no un diario. El detalle va en `sessions/`.

**Última actualización:** 2026-10-14 · sesión `2026-10-13-shell-dashboard-y-tests.md`

## Fase actual

**Fase 0 (base): completa.** Fase 1 en progreso: el molde Inicio + Tareas ya está construido completo.

## Lo último que se hizo

- Shell del dashboard: layout protegido en `app/(dashboard)/` (sin sesión → `/entrar`, sin perfil → `/bienvenida`), Topnav armado desde `lib/modules/registry.ts`, y Perfil básico con dos pestañas ("Mi perfil", "Mis secciones").
- "Cerrar todas las sesiones" en Perfil → Mi perfil. De paso se corrigió que "Cerrar sesión" normal revocaba la sesión en **todos** los dispositivos por accidente (scope `'global'` es el default de `signOut()`); ahora usa `'local'`.
- Primeros tests del proyecto (paso 6, cierra Fase 0): Jest + Supertest en `apps/api/test/`, contra la app de Nest completa y la base real. `test/helpers/test-users.ts` crea y borra usuarios reales de Supabase Auth con la Admin API en cada corrida. NestJS 12 es ESM-only (`@nestjs/common`, `@nestjs/testing`): Jest corre en modo ESM real (`--experimental-vm-modules`, `useESM`), con `tsconfig.spec.json` separado del de producción.
- **Molde Inicio + Tareas, completo de punta a punta**: esquema compartido, tabla `tasks` + migración, `modules/tasks/` (controller/service/repository) en la API, `features/tasks/` en el front (lista, agregar, marcar hecha), y la tarjeta "Pendientes de hoy" en Inicio. Los módulos van en `apps/api/src/modules/<id>/` y `apps/web/src/features/<id>/` — no donde se pusieron al principio; corregido a media sesión.
- Bug real encontrado probando en el navegador (no solo con `tsc`/`eslint`): el Topnav (`'use client'`) importaba el registro de módulos, y ese registro cargó sin querer un componente de Inicio que arrastraba código `server-only` → 500 en `/`. Se separó `lib/modules/registry.ts` (ligero, lo usa el Topnav) de `lib/modules/home-cards.ts` (`server-only`, solo lo usa Inicio).
- **Decisión #27: desde Recordatorios, primero todo el front de cada módulo (datos dummy, animaciones reales) y después su backend y conexión** — antes era el molde completo por módulo de una vez. Lo pidió el usuario: la calidad del front le importa más (es quien va a usar la app), y prefiere ajustar `data-model.md` a lo que el front termine pidiendo, no al revés. Roadmap, `modules.md` y el plan del molde en este archivo ya están actualizados con el nuevo orden.

## Siguiente paso

**Fase 1a: front de Recordatorios** (datos dummy, animaciones de Motion reales, fiel a `docs/design/screens/`). Después de Recordatorios y los demás módulos del front (Fase 1a completa), se construye el backend de todos, módulo por módulo (Fase 1b) — ver `docs/guides/roadmap.md`.

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
- `apps/api/package.json` no tiene `"type": "module"` y nunca se probó `pnpm build && pnpm start` (solo `tsx watch` en dev). Como `@nestjs/common` es ESM-only, el build de producción probablemente necesite ese campo. Revisar antes de desplegar.
- Dos tareas de Auth que son del usuario, no de código: pegar `recover-password.html` en el dashboard de Supabase (Authentication → Email Templates), y confirmar ahí que la sesión dura 30 días (decisión #8).

## Pendiente dentro del paso 2 (componentes de `components/ui/`)

- Select y el grupo segmentado (Lista/Tablero, Prioridad) quedan para cuando se construya `TareaNueva` en Fase 1 — no eran necesarios todavía. (Toggle ya se construyó, para "Mis secciones" en Perfil.)
- `modes/dark.css` no existe (fase posterior), aunque el PDF ya trae los valores oscuros documentados.
