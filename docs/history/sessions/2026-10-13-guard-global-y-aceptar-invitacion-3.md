# 2026-10-13 · Rehacer /entrar según el canvas y meter Motion

**Hecho en:** Claude Code / chat

## Qué se hizo

- Construí `/entrar` (login con correo y contraseña) sin revisar primero `docs/design/screens/Entrar.dc.html` — violación directa de la regla 6 de `CLAUDE.md` ("el diseño visual sale del canvas"). El usuario lo notó y pidió revisarlo. Se reconstruyó desde el archivo del canvas:
  - Layout real de dos columnas: panel oscuro (`--surface-inverted`) con el logo, tres doodles flotantes animados y la frase grande, y el formulario a la derecha.
  - Se dejaron fuera a propósito: "Crear cuenta" y "Enviarme un enlace para entrar" (el canvas las trae, pero registro es solo por invitación y el enlace mágico está descartado — decisiones #6 y #7). "La olvidé" también se dejó fuera: esa pantalla no existe todavía, no quise poner un enlace muerto.
  - De paso se encontró que `Bienvenida.dc.html` existe en el canvas, pero es el wizard de *después* de entrar (nombre, avatar, elegir módulos) — punto 5 de Fase 0, no el 4.
  - Dos valores exactos del canvas (un gris y un rojo de error) no tienen variable semántica propia en `theming.md` todavía; se usó el token más cercano (`--text-muted`, `--danger`) en vez de inventar uno nuevo. Pendiente si se quiere exactitud de píxel.
- Se agregó `components/ui/PasswordInput.tsx`: envuelve `Input` con el botón de mostrar/ocultar contraseña (el "ojito" del diseño). Para esto, `Input.tsx` ganó una prop `trailing` (slot genérico, reusable para otros casos). Se usa en `/entrar` y en `/aceptar-invitacion`.
- El usuario pidió que la pantalla se sintiera "dinámica y fluida, no estática". Se instaló `motion` (ya estaba decidido en el stack de `CLAUDE.md`, pero nunca se había usado):
  - `MotionConfig reducedMotion="user"` una vez en `app/layout.tsx`: toda animación de Motion en la app respeta `prefers-reduced-motion` sin repetirlo por componente.
  - `Button` ahora es `motion.button` con `whileTap={{ scale: 0.97 }}` — aplica a **todos** los botones de la app, no solo estos dos formularios.
  - `LoginForm` y `SetPasswordForm`: entrada escalonada (encabezado, campos, botón aparecen uno tras otro) con `variants` + `staggerChildren`. Los banners de error usan `AnimatePresence` para entrar/salir animados en vez de aparecer de golpe.
  - El panel oscuro de `/entrar` se sacó a su propio componente (`BrandPanel.tsx`, cliente) para que el logo y la frase también tuvieran entrada animada — la primera versión solo animaba el formulario, no la página completa.

## Decisiones tomadas

- Ninguna nueva en `docs/guides/decisions.md`.

## Archivos o partes importantes que se tocaron

- `apps/web/src/app/(auth)/entrar/`: `page.tsx`, `BrandPanel.tsx`, `LoginForm.tsx` + sus `.module.css` (todo nuevo).
- `apps/web/src/components/ui/PasswordInput.tsx` (nuevo), `Input.tsx` (prop `trailing`), `Button.tsx` (motion.button).
- `apps/web/src/app/(auth)/aceptar-invitacion/SetPasswordForm.tsx` y `page.tsx`: mismo tratamiento de `PasswordInput` + Motion.
- `apps/web/src/app/layout.tsx`: `MotionConfig`.
- `packages/shared/src/auth/schemas.ts`: se agregó `loginSchema`.
- `apps/web/package.json`: nueva dependencia `motion`.

## Quedó pendiente

- **El usuario preguntó por animar "el fondo" de `/entrar`** y no se alcanzó a aclarar qué quería decir exactamente (¿doodles también del lado del formulario? ¿un degradado como el de `Bienvenida.dc.html`? ¿el color se veía mal?). Se dejó así por ahora a propósito — retomar la pregunta la próxima sesión antes de tocarlo, para no inventar un elemento visual que el canvas de `Entrar.dc.html` no trae.
- Lo del paso 4 de Auth sigue igual: código por correo, la parte del guard que revisa `verified_sessions`, cerrar todas las sesiones, recuperar contraseña.

## Notas para la siguiente sesión

- Antes de construir cualquier pantalla nueva, **revisar primero si existe en `docs/design/screens/`** (buscar por el nombre en español de la pantalla). Esta sesión costó una vuelta extra por no hacerlo desde el principio.
- Ahora que `Motion` ya está integrado (patrón: `container`/`item` con `staggerChildren`, `AnimatePresence` para banners), reusar el mismo patrón en vez de inventar uno nuevo cuando se construyan las siguientes pantallas de auth (código por correo, recuperar contraseña).
