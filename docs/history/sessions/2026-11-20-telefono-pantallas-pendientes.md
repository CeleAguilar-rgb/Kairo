# 2026-11-20 · Teléfono: pantallas a medias, teclado y scroll por pantalla (rama `movil`)

**Hecho en:** Claude Code

## Qué se hizo
- A pedido de la usuaria ("vamos a hacer lo de las pantallas que quedaron a medias, revisiones pendientes, y haz de una vez lo de conservar la posición del scroll… el tablero de personajes no, está en desarrollo"). Todo visto a 375 px en el demo (`web-demo`, puerto 3010). El teclado se simuló con una ventana de 375×480, que no es lo mismo que un teléfono real (en uno de verdad el teclado tapa la pantalla y no achica la página).
- **Revisadas sin cambios:** Inicio (el "25" y los títulos largos), Tablero de Tareas, filtros y filas de la Papelera, panel de avisos y búsqueda.
- **Tareas:** el campo rápido dice "Agregar tarea…" en el teléfono (no se "presiona Enter") y termina en puntos suspensivos si no cabe.
- **Captura rápida con teclado:** en ≤720px la hoja se alinea arriba mientras hay foco dentro (`:focus-within`); centrada, "Guardar" quedaba detrás del teclado.
- **Scroll por pantalla:** `lib/scroll-memory.ts` guarda el scroll en el clic del enlace y lo restaura al llegar (`NavigationProvider`). Visto: Tareas a 650 → Agenda arranca arriba → volver a Tareas deja en 650; las pestañas de Finanzas arrancan arriba.
- **Escritos con teclado:** el título de la página y el nombre de la ficha pasan de `<input>` a `textarea` con `field-sizing: content` (los nombres largos se cortaban); la barra de formato del editor va en una sola fila que se desliza y se pega debajo de la barra de arriba (antes quedaba detrás y envuelta medía 3 renglones); lo mismo para la barra de la ficha; "Guardado" y "···" van juntos. Token nuevo `--topnav-height`.
- Docs: `docs/movil/revision.md` (casillas), `docs/movil/para-celeste.md` (punto 15).

## Decisiones tomadas
- La posición del scroll vive solo en memoria y solo se restaura al llegar por un enlace: con "atrás" Next ya lo restaura, y un cambio de pestaña dentro de una pantalla debe empezar arriba. Si se guardara en `sessionStorage` sobreviviría a recargar, pero no hace falta y se arriesgaría a restaurar una posición de datos que ya cambiaron.
- La barra de formato como fila deslizable (no 3 renglones envueltos) es una decisión de interfaz del teléfono: es la forma más barata de que quepa con el teclado arriba. La alternativa (una barra fija encima del teclado con `visualViewport`) queda para cuando se pruebe en un teléfono real.
- `field-sizing: content` y no JS para crecer el título, igual que el resumen de la ficha. En Firefox (aún sin `field-sizing`) el título se verá de un renglón, con el resto escondido; es lo mismo que ya pasaba con el resumen.

## Archivos o partes importantes que se tocaron
- `apps/web/src/lib/scroll-memory.ts` (nuevo) y `components/layout/Navigation.tsx`.
- `apps/web/src/styles/tokens.css` (`--topnav-height`).
- `features/writings/components/editor/` (`EditorToolbar`, `PageEditor`) y `world/FullPages.*`.
- `features/shortcuts/components/QuickCapture.module.css`, `features/tasks/components/TaskList.*`.

## Quedó pendiente
- Tablero de la base de personajes: la usuaria pidió no tocarlo (en desarrollo).
- Probar en un teléfono real el teclado abierto (captura rápida, editor, fichas) y el scroll por pantalla; modo oscuro y letra grande.
- Una vez vi en consola "Applying a mismatched transaction" (Tiptap) al pulsar Enter en el título de la página; no se repitió en dos intentos más (probablemente por recarga en caliente). Si reaparece, mirar `editor.commands.focus('start')` en `PageEditor`.
- En el demo, guardar una página muestra "No encontramos esa página." porque sus ids (`pg-cap-0`) no son UUID y la validación de `page-actions.ts` los rechaza. Es del demo; con datos reales los ids son UUID.
- Menú de posponer de Recordatorios (180 px) sin abrir; fondo de filas con `:hover` a mano en el teléfono; pasar `movil` a `main` por Pull Request cuando la usuaria lo apruebe.
- Sin commit todavía.

## Notas para la siguiente sesión
- Rama de trabajo: `movil`. Nunca `main`.
- Cualquier `position: sticky` nuevo usa `top: var(--topnav-height)` (más lo que quiera de aire), o queda detrás de la barra de arriba en el teléfono.
- Para deslizar de lado: `ScrollFade`, `ChipRow` o `ScrollTabs`. Si el contenedor tiene sombra o borde propios, la máscara de `ScrollFade` los recortaría: se pone el `ScrollFade` dentro de la tarjeta, no en ella (como en `EditorToolbar`).
- No hay Python en esta máquina: los cambios a archivos se hacen con Edit.
