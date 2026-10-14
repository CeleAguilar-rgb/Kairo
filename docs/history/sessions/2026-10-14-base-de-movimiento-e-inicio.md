# 2026-10-14 · Base de movimiento e Inicio

**Hecho en:** Claude Code

## Qué se hizo
- **Base de movimiento:** `lib/motion.ts` junta curvas y duraciones (las mismas que `--ease-*`/`--duration-*`), resortes con nombre por uso (`panel`, `pop`, `slide`, `soft`) y variantes compartidas (`fadeUp`, `staggerList`, `listItem`, `popover`). Las 5 copias de `const EASE` en auth y Bienvenida ahora importan `EASE_OUT` de ahí.
- **Componentes nuevos en `components/ui/`:** `Drawer` (panel lateral, entra con resorte y sale sin rebote), `Modal` (confirmación, `alertdialog` en tono `danger`), `Toast` + `useToast()` con "Deshacer" y una barrita de tiempo que se pausa con el mouse o el foco, `ProgressBar`/`ProgressRing`/`CountUp`, `Skeleton`, `Doodle` (los 8 doodles del canvas), `EmptyState` (pantalla Vacios). `Checkbox` ahora dibuja la palomita (`pathLength`) con rebote y onda. `Card` ganó el tono `accent`, `CardHeader`, `CardLink` y `LineIcon`.
- **Hooks:** `useDialogFocus` (Escape, foco atrapado, scroll bloqueado y foco de regreso; compartido por Drawer y Modal) y `useMounted` (portales sin desajuste de hidratación).
- **Shell:** fondo con el brillo del canvas, `ToastProvider` en el layout, `template.tsx` para la entrada de cada página, y el Topnav con la píldora de la sección activa que se desliza entre enlaces (`layoutId`) y el menú de cuenta animado.
- **Manifiestos de módulo** en `features/<id>/module.ts` para los 9 módulos con ruta; el registro solo los junta. `inNav: false` para Recordatorios (no va en la barra).
- **Datos de ejemplo:** cada módulo tiene `types.ts` (forma de su tabla en camelCase), `mock.ts` (datos del canvas, relativos a "hoy" en la zona del perfil) y `api.ts` (la función que hoy devuelve el mock y después llamará a la API). `lib/mock/context.ts` da `today`, `day(n)` y `at(n, 'HH:MM')`.
- **Utilidades:** `lib/dates.ts` (días sueltos como `AAAA-MM-DD`, momentos en UTC mostrados en la zona del perfil, sin librerías) y `lib/money.ts` (centavos → texto).
- **Inicio (`Main`) completo:** saludo que se escribe a mano con la línea ondulada y el sol, estadísticas que cuentan, bandeja de doodles (se pegan con rebote y se arrastran), y las 8 tarjetas: Pendientes de hoy (con anillo, tachado animado y panel de detalle), Esta semana (día elegido que se desliza y eventos que entran por el lado), Ahora en tu rutina (punto en vivo y avance del bloque), Metas, Menú de hoy, Próximos pagos, Proyectos y Recordatorios ("Listo" con aviso para deshacer). "Ajustar mi Inicio" prende y apaga tarjetas, y las demás se reacomodan con `layout`. Solo se ofrecen tarjetas de secciones prendidas; si una falla, solo cae esa tarjeta.
- `loading.tsx` con esqueleto de la forma real que solo aparece si la carga pasa de 400 ms.
- Páginas provisionales (`SectionPlaceholder`) en `/tareas`, `/proyectos`, `/agenda`, `/finanzas`, `/escritos`, `/dia-a-dia`, `/escuela` y `/recordatorios` para que el Topnav no lleve a un 404.
- Se borró `DemoShowcase` (vista temporal de tokens; ya existe el Inicio real).

## Decisiones tomadas
- Ninguna nueva en `docs/guides/decisions.md`. De estructura: el `index.ts` de cada módulo exporta componentes y tipos; las funciones de datos se importan de `features/<id>/api.ts` (solo servidor), porque mezclar ambos en `index.ts` metería código `server-only` en componentes de cliente.

## Archivos o partes importantes que se tocaron
- `apps/web/src/lib/motion.ts`, `lib/dates.ts`, `lib/money.ts`, `lib/mock/context.ts`, `lib/use-dialog-focus.ts`, `lib/use-mounted.ts`
- `apps/web/src/components/ui/` (Drawer, Modal, Toast, Progress, Skeleton, Doodle, EmptyState, Checkbox, Card)
- `apps/web/src/features/{home,tasks,agenda,daily,finance,projects,reminders}/`, más manifiestos de `writings` y `school`
- `apps/web/src/app/(dashboard)/` (layout, template, loading, page, Topnav, rutas provisionales)
- Tokens nuevos en `styles/tokens.css` (radios 16/18/22, sombras toast/dialog/featured, capas z-index, anchos de panel, `--ink-850`, `--cream-25`, tintes) y semánticos nuevos en `semantic.css` + `modes/light.css`: `--bg-glow`, `--surface-glass`, `--surface-inverted-glass`, `--surface-inverted-sunken`, `--accent-glow`, `--accent-strong`, `--text-on-inverted-soft`, `--border-inverted`, `--scrim`.

## Quedó pendiente
- Lo que se marca en Inicio (pendientes, comidas, recordatorios, tarjetas ocultas) vive solo en memoria: se pierde al recargar hasta que existan los endpoints.
- El botón de doodles quedó en el saludo, no en el header como en el canvas (ahí van también buscar y avisos, que llegan con `Atajos`).
- La pantalla `Tareas` del canvas tiene 4 columnas (incluye "Revisión") y prioridad Alta/Media/Baja, pero `tasks.status` solo tiene `todo`, `in_progress`, `done`. Decidir con el usuario al construir Tareas.
- `loading.tsx` está en la raíz de `(dashboard)`, así que otras rutas (Perfil) muestran el esqueleto de Inicio mientras cargan; cada sección puede traer el suyo.
- No se pudo probar en el navegador: en esta máquina no hay `.env` de web ni de API. Se verificó con `typecheck`, `lint` y `next build` (las 18 rutas compilan).

## Notas para la siguiente sesión
- Para levantar el proyecto en esta máquina: `corepack pnpm install` (pnpm no está instalado globalmente; corepack usa la versión de `packageManager`) y copiar los `.env` de web y API.
- Siguiente pantalla: `Tareas` + `TareaNueva` (lista/tablero, filtros por proyecto, panel lateral para crear). Reutilizar `TaskDetailDrawer`, `Drawer`, `Toast` y `listTasks()` de `features/tasks/api.ts`.
