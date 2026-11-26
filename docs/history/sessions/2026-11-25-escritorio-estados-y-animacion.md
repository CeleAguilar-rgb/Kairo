# 2026-11-25 · Escritorio: colores en sus estados y animación

**Hecho en:** Claude Code (rama `feat/escritorio-estados-y-animacion`, que parte de `movil` en `fa5a5ac`; 9 commits, uno por tema, subidos a GitHub. No se juntó con `main`: lo hace Celeste)

## Qué se hizo
- Revisión de colores, estados y movimiento en escritorio (claro y oscuro), con capturas por el protocolo de DevTools de Edge sin ventana. Lo que fallaba:
  - En oscuro, lo elegido y lo que tiene el mouse encima se veían iguales.
  - Los hovers aclaraban o no se notaban en oscuro.
  - Los campos no tenían hover.
  - Había 4 opacidades de deshabilitado y 9 escalas de presionar.
  - 238 transiciones usaban la curva genérica `ease` con duraciones sueltas.
- Con el visto bueno del usuario, se aplicaron los 11 puntos de `docs/escritorio/colores-y-animacion.md`. Esa bitácora dice, punto por punto, qué era, qué es, por qué y cómo volver. Pidieron dejarla así para que Celeste pueda revertir lo que no le guste.
  - `styles/states.css` (nuevo), `--selected` y `--on-selected`, rojo suave y `dangerSolid`, el morado de oscuro mezclado hacia el neutro, el foco con halo en los campos y el hover de los campos.
  - Tokens de movimiento (`--ease-in-out`, `--ease-celebrate`, `--duration-press`, `--press-scale*`, `--lift-*`, `--opacity-disabled`), y `PRESS` y `SPRING.celebrate` en `lib/motion.ts`.
  - El barrido de las transiciones en 88 archivos.
- 15 capturas de antes y después en `docs/escritorio/antes/` y `despues/`.
- Las 6 animaciones más visibles, grabadas antes y después en `docs/escritorio/animaciones/` (`comparar.html` y una tira de cuadros por escena), con lo que se pasa cada una medido en la app. La bitácora tiene la lista completa de animaciones que cambiaron. Corregido: `--ease-spring` se pasaba 11 %, no 60 %.
- `tsc` y `eslint` pasan. Consola sin errores. Visto en claro, oscuro, Salvia + Teñido y Lavanda + Intenso.
- **Segunda revisión** (puntos 12 a 15 de la bitácora), por lo que vio el usuario al probar:
  - "Esta semana": el día elegido se oscurece en su lugar (antes la píldora viajaba con `layoutId` y tapaba los otros días). Los eventos de antes salen y luego entran los nuevos (`mode="wait"`).
  - La tarjeta se estiraba al cambiar de alto porque la cuadrícula de Inicio usaba `layout` completo de Motion. Ahora usa `layout="position"`. Luego, a pedido, el largo de la tarjeta cambia suave al pasar a un día con más o menos eventos: se anima el alto de la zona de eventos (no una escala), contando el mínimo que pone "Pendientes de hoy" en la misma fila. Se probó reservar siempre el alto del día más lleno y se descartó: dejaba mucho espacio vacío.
  - El aro y las barras de avance ya no repiten el retraso de su entrada en cada cambio. El aro arranca ~40 ms después del clic (antes ~250 ms).
  - Componente nuevo `Swap`: un número o texto que cambia en su lugar se desvanece con un desenfoque leve. Está en 9 lugares, y la regla quedó en `theming.md`.
  - El menú de arriba va siempre en una fila. `Topnav.tsx` mide si cabe centrado; si no, lo pone entre el logo y los íconos, y lo que no cabe pasa al menú del avatar. En el escritorio, Escuela y Recordatorios también están ahí. ⚠ para Celeste.
  - El menú de arriba se queda fijo al bajar también en el escritorio. Arriba de todo es transparente; al bajar toma el color de la página y el desvanecido (`data-scrolled`). Capa nueva `--z-topnav: 40`, `--topnav-height` de 74 px en el escritorio y `scroll-padding-top`. ⚠ para Celeste.
  - Tiras de antes y después de "Esta semana" y del aro en `docs/escritorio/animaciones/` (07 y 08).
  - En `docs/movil/para-celeste.md` se corrigieron el punto 2 (el menú de secciones se resolvió con el menú del avatar, no con un deslizador) y el 15 (`--topnav-height` ya vale 74 px en el escritorio).
- **Tercera revisión** (puntos 16 y 17 de la bitácora):
  - Los temas de color son solo círculos también en el escritorio: los 12 en una fila desde 1081 px, 6 × 2 más angosto, con el nombre del elegido abajo. ⚠ para Celeste (choca con `Temas.dc.html`). El "+" ya era lavanda en el escritorio; no se cambió nada. Ambos quedaron anotados en `para-celeste.md` (puntos 3 y 16).
  - La píldora del menú aparecía a media pantalla y subía a su lugar al abrir otra página estando abajo (por ejemplo, "Día a día" desde Inicio). Era un error, no algo a propósito. Motion mide en coordenadas de la página y la barra está fija: el repintado de la ruta nueva medía la píldora antes y después de que Next subiera la página. Se arregló con `layoutDependency` en la píldora de `Topnav.tsx` y en la de `BottomTabs.tsx`. En el escritorio el error llegó con el menú fijo (punto 15); en el teléfono ya pasaba en `movil`. `layoutRoot` se probó y no sirve con `layoutId`.

## Decisiones tomadas
- #60: estados y movimiento parejos (también en `docs/guides/decisions.md`). Se aparta del canvas en el rojo de borrar, la sección activa en oscuro y el foco de los campos, y ajusta la #58 (el morado de oscuro). Lo aprobó el usuario; **falta que Celeste lo revise**.
- #61: el menú de arriba del escritorio en una fila (lo que no cabe, al menú del avatar) y fijo al bajar, más la regla de que nada cambia de golpe (`Swap`). También falta que Celeste lo revise.

## Archivos o partes importantes que se tocaron
- `apps/web/src/styles/` (`tokens.css`, `states.css`, `semantic.css`, `modes/light.css`, `modes/dark.css`) y `app/globals.css`.
- `apps/web/src/lib/motion.ts`.
- `components/ui/`: Button, Input, Select, Textarea, Segmented, Toggle, Checkbox, Progress, IconTabs, Drawer y Modal.
- Unos 100 `.module.css` de `features/` y `app/` (curvas, elegido, hovers y deshabilitado), más 12 componentes con `whileTap`.
- Docs: `docs/escritorio/colores-y-animacion.md` (nuevo), `docs/guides/theming.md` ("Estados" y "Animación") y `decisions.md`.
- Segunda revisión: `app/(dashboard)/Topnav.tsx` y `Topnav.module.css`, `components/ui/Swap.tsx` (nuevo) y `Progress.tsx`, `features/agenda/components/WeekCard.tsx`, `features/home/components/HomeView.tsx`, los 9 lugares con `Swap`, `styles/tokens.css`, `app/globals.css`, y el `top` de `MenuWeek.module.css` y `ProjectForm.module.css`.
- Tercera revisión: `app/(dashboard)/perfil/PreferenciasTab.tsx` y `PreferenciasTab.module.css`, `Topnav.tsx` y `BottomTabs.tsx` (la píldora), `docs/movil/para-celeste.md` (puntos 2, 3, 15 y 16).

## Quedó pendiente
- **Sentir el rebote a mano** antes de decidir (punto 10 de la bitácora): demo de antes y de después lado a lado, o `docs/escritorio/animaciones/comparar.html`. Ojo con el interruptor: ahora tarda más que antes (punto 11).
- Que Celeste revise los puntos marcados con ⚠ en la bitácora, ahora también el 14 (menú en una fila), el 15 (menú fijo) y el 16 (temas como círculos).
- Ver el panel del Menú semanal pegado al bajar (en el demo la página casi no baja).
- Decidir si el interruptor vuelve a 200 ms (punto 11): se preguntó y sigue sin respuesta.
- Revisar abiertos los paneles y cajones (captura rápida, búsqueda, avisos, cajones de tarea y evento), Bienvenida y el interior de un mundo de Escritos: les llegó el barrido, pero no se han visto. (La barra de abajo del teléfono ya usa `--selected`, a pedido.)
- (Hecho) Se quitaron la entrada temporal `web-antes` de `.claude/launch.json` y la copia `.claude/worktrees/antes-escritorio` antes de los commits.

## Notas para la siguiente sesión
- Para hover o elegido, no inventes otro color: usa las variables de `states.css` y la sección "Estados" de `theming.md`.
- Una píldora con `layoutId` dentro de algo fijo (`position: fixed` o `sticky`) necesita `layoutDependency`, o cruza la pantalla cuando la página se mueve entre dos medidas de Motion (por ejemplo, al cambiar de página estando abajo).
- Un texto que cambia en su lugar va con `<Swap>`. Un contenedor de Motion cuyo alto cambia por el contenido va con `layout="position"`, no con `layout` (el completo estira el texto).
- Ojo al quitar reglas del menú de arriba en `@media (max-width: 1140px)`: también le aplicaban al teléfono. Las dos columnas del teléfono ahora viven en el bloque de ≤720 px.
- Los scripts de capturas no se guardaron en el repo; el método es el mismo de la nota del 2026-11-23.
- Para grabar una animación: `Page.startScreencast` da ~100 cuadros por segundo, pero sale a 1× aunque se pida otra densidad. Para acercar, se usa `Emulation.setDeviceMetricsOverride` con `viewport: { x, y, width, height, scale: 4 }`, que la página no nota y que no rompe el mouse. Para medir, se lee `getComputedStyle(el).transform` en cada `requestAnimationFrame`.
