# 2026-10-25 · Enfoque: backend y conexión, y revisión de Spotify

**Hecho en:** Claude Code

## Qué se hizo

- A pedido de la usuaria ("va lo del enfoque y si se puede ir checando lo del spotify") se conectó el reproductor de Enfoque a una API real. Es el último paso de Fase 1b antes de "lo global".
- **Compartido** (`packages/shared/src/focus/`): `FOCUS_KINDS`, `MAX_FOCUS_MINUTES` (180), `FOCUS_DOTS` (4) y los esquemas `focusSessionSchema` (tipo, cuándo empezó, minutos enteros de 1 a 180, tarea opcional) y `focusSessionsQuerySchema` (desde cuándo).
- **Base:** migración `0013` aplicada: tabla `focus_sessions` (`kind`, `started_at`, `minutes`, `task_id` con `ON DELETE SET NULL`, índice por persona y fecha, CHECK de 1 a 180 minutos, RLS).
- **API** (`apps/api/src/modules/focus/`): `POST /v1/focus/sessions` y `GET /v1/focus/sessions?from=`. Revisa que la tarea sea de la persona con `TasksService.findByIds` (sin leer su tabla) y rechaza una sesión que empieza en el futuro (tolera 1 minuto de desfase). `test/focus.e2e-spec.ts`: 9 tests (token, forma exacta, orden y rango, aislamiento entre personas, tarea ajena o inexistente, tarea borrada, validaciones, futuro y `userId` en el cuerpo), todos pasan.
- **Front** (`features/focus/`): el reloj guarda cada tramo que **termina completo** (`recordFocusSessionAction`); pausar, reiniciar, cambiar de preset o saltar al descanso a medias no guarda nada. `use-focus-timer.ts` ahora recuerda cuándo empezó el tramo y publica `lastCompleted`; `FocusContext` lo guarda con un efecto. El layout del dashboard le pasa al reproductor los pomodoros de hoy y las tareas abiertas (`getFocusSetup`); si esa lectura falla, el reproductor sigue vacío en vez de tumbar el dashboard. "Cambiar" recorre tareas reales.
- **Conexiones con otros módulos:** el botón "Pomodoro" del detalle de una tarea guarda el tiempo en esa tarea (`focusOnTask({ id, title })`); el de un bloque de la rutina de Día a día **ya abre el reproductor** (antes decía "llega con Música y enfoque") enfocado en el siguiente pendiente del bloque, sin tarea (sus tareas todavía son de ejemplo); el Resumen de un proyecto suma los minutos de la semana de las tareas del proyecto (antes siempre "0 min").
- Documentación: `data-model.md`, decisión #48, `roadmap.md`, `features.md`, `current.md`.

## Decisiones tomadas

- **Decisión #48** (también en `docs/guides/decisions.md`): solo se guarda un tramo cuando termina completo; el tiempo se le guarda a una **tarea** (el proyecto se deduce al leer); los puntos del día y los minutos por proyecto los arma el Next.js (decisión #38); Spotify sigue en fase posterior.

## Spotify: qué encontré (no se construyó nada)

Revisado en la documentación de Spotify el 2026-10-25:

- **Desde febrero de 2026, una app en modo desarrollo exige que quien la creó tenga Spotify Premium** (nuevas desde el 11 de febrero, existentes desde el 9 de marzo), permite **un solo Client ID por desarrollador** y hasta **5 usuarios autorizados**. Para más personas hay que pedir "extended quota", con requisitos exigentes. Fuente: [Update on Developer Access and Platform Security](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security).
- Las restricciones de **endpoints** del Web API para integraciones existentes quedaron pospuestas; no confirmé si el **Web Playback SDK** (reproducir dentro de la página) sigue funcionando bien en modo desarrollo: hay un reporte de la comunidad de que `player.connect()` se queda esperando, pero es una sola persona y no es oficial.
- **Para uso personal de una sola persona** (la usuaria) el tope de 5 usuarios no estorba; lo que exige es **Premium y un solo Client ID**.
- **Alternativa sin cuenta de desarrollador: los embeds de Spotify** (iframe y su iFrame API). No piden login del desarrollador, pero quien escucha ve solo 30 segundos de cada canción si no tiene sesión iniciada en Spotify en ese navegador, y no se puede cambiar su estilo (es de otro dominio). Encaja mal con el diseño propio del reproductor flotante.
- Hay además una parte nuestra: `connections` (tokens cifrados en Vault, `docs/guides/security.md` #6) y el flujo OAuth, todo del lado de la API. Es trabajo propio de la "fase posterior".

**Para decidir con la usuaria:** si tiene Spotify Premium y quiere el reproductor propio (Web Playback SDK + OAuth + Vault), si le basta un enlace o embed de su playlist dentro del reproductor, o si lo dejamos como está. Antes de construir nada conviene una prueba de 15 minutos del Web Playback SDK en una app de desarrollo suya.

**Prueba armada (corrida y borrada el 2026-11-03: ver `2026-11-03-musica.md`):** `tools/spotify-prueba/` es una página aparte, **no es parte de Kairo** (`server.mjs` sin dependencias, solo en `127.0.0.1:8765`, e `index.html`). Inicia sesión con OAuth + PKCE (sin Client Secret), el token vive solo en la pestaña, y marca ✓/✗ en cada paso: DRM (Widevine), carga del SDK, `connect()`, dispositivo listo, que suene, `GET /me` y `GET /me/playlists`. Los pasos y cómo leer el resultado están en su `README.md`. Lo tiene que correr la usuaria con su cuenta Premium, en Chrome o Edge (el navegador integrado de algunas apps no trae Widevine).

## Archivos o partes importantes que se tocaron

- `packages/shared/src/focus/*`, `packages/shared/src/index.ts`.
- `apps/api/src/db/schema/focus.ts`, `apps/api/src/drizzle/0013_focus_sessions.sql` (+ snapshot), `apps/api/src/modules/focus/*`, `apps/api/src/app.module.ts`, `apps/api/test/focus.e2e-spec.ts`.
- `apps/web/src/features/focus/{types,use-focus-timer,FocusContext,api,actions,mock}.ts(x)` y `components/FocusPlayer.tsx`, `apps/web/src/app/(dashboard)/layout.tsx`.
- `features/tasks/components/TaskDetailDrawer.tsx`, `features/daily/components/{RoutineTimeline,TodayView}.tsx`, `features/projects/{api,project-utils}.ts`.

## Quedó pendiente

- **Probar en el navegador con una cuenta real**: dejar correr un pomodoro de 15 minutos (o cambiar el preset en `mock.ts` a 1 minuto para probar), ver que los puntos de hoy suben y que sobreviven a recargar, enfocarse desde el detalle de una tarea de un proyecto y ver los minutos en el Resumen del proyecto, y el botón "Iniciar pomodoro" de la rutina. No se pudo en esta sesión (la pantalla pide contraseña).
- Si la pestaña queda en segundo plano, el navegador puede atrasar el reloj (los `setInterval` se aceleran o frenan); un pomodoro puede tardar un poco más de lo marcado. Si molesta, el reloj debería calcularse con la hora de inicio y no contando segundos.
- Si una tarea cambia de proyecto, sus minutos de la semana se van con ella (decisión #48).
- Las tareas de los bloques de enfoque de la rutina siguen siendo de ejemplo, así que su pomodoro no guarda a qué tarea.

## Notas para la siguiente sesión

- Siguiente en el orden (decisión #41): **lo global** (Papelera, Ctrl+K, avisos, captura rápida y tareas programadas). Y antes de seguir, probar Escritos y Enfoque en el navegador.
