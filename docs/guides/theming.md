# Estilos, temas y animación

## Principios

- **CSS Modules + variables CSS.** Sin Tailwind ni librerías utilitarias.
- **Los componentes solo usan variables semánticas** (`var(--surface)`, `var(--text-muted)`, `var(--radius-card)`). Nunca un hex, px de espaciado o nombre de fuente directo en un componente.
- Los valores salen del canvas de diseño (`docs/guides/design.md`).

## Capas de variables

```
apps/web/src/styles/
├── tokens.css          # Primitivos: paleta cruda, escala de espacios, radios, fuentes, sombras, duraciones
├── palettes.css        # Primitivos del tema de color: --p-50 … --p-950 y neutros teñidos; ver "Temas de color"
├── semantic.css        # Lo que usan los componentes: --bg, --surface, --text, --accent…
├── modes/
│   ├── light.css       # [data-mode="light"] → asigna primitivos a semánticos
│   ├── dark.css        # [data-mode="dark"] → la misma lista; ver "Modo oscuro"
│   └── intensity.css   # [data-intensity] → Teñido e Intenso sobrescriben algunos semánticos
├── seasons/            # Adornos por mes (ver "Temporadas")
└── globals.css         # Reset, tipografía base, fuentes
```

- **Primitivos** (`tokens.css`): nombres que describen el valor, no el uso. Ejemplo: `--cream-100`, `--ink-900`, `--lavender-300`.
- **Semánticos** (`semantic.css` + `modes/`): nombres que describen el uso. Ejemplo: `--bg`, `--surface`, `--surface-raised`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-soft`, `--accent-ink`, `--danger`, `--success`.
- Un componente nunca usa un primitivo; siempre un semántico.

## Paleta y tipografía observadas en el diseño

Valores aproximados — la referencia exacta es `docs/guides/Kairo-Sistema-de-diseno.pdf` (tokens con nombre, valores de claro/oscuro y specs de componentes). Lo de acá queda como resumen rápido, no se vuelve a actualizar valor por valor:

- **Base cálida crema y tinta casi negra:** tinta `#1f1c19`; fondos `#f3eee6`, `#f7f2ea`, `#fffdf9`; bordes `#e6ded2`; texto secundario `#6b645b`.
- **Acento lavanda:** `#cbc6f5`, `#e9e7fb`, `#6a62d6`, y `#3a3480` para texto sobre lavanda.
- **Cálido de apoyo:** `#f3e3c3`.
- **Tipografía:** `Outfit` (300–600) para la interfaz; `Gochi Hand` (letra a mano) solo para acentos (saludo, títulos decorativos, adornos). No usar la letra a mano en texto largo ni en datos.
- **Radios:** tarjetas grandes 28 px, medianas 20 px, controles 14 px, pequeños 8 px; botones píldora (999 px).
- **El usuario no quiere amarillo** como color principal.

## Modo oscuro

- `modes/dark.css` tiene la misma lista que `modes/light.css`: lo que se agregue a uno va también al otro. Valores de `ModoOscuro.dc.html`: neutros cálidos casi negros, la lavanda solo en lo principal y lo activo, bordes finos en lugar de sombras duras.
- **Un color que en claro servía para dos cosas, en oscuro puede necesitar dos variables.** Antes de usar una, fíjate para qué es:
  - Botón principal: `--action` + `--on-action`, no `--surface-inverted`.
  - Texto o trazo de acento: `--accent-line`, no `--accent` (que es un relleno).
  - Texto dorado: `--warm-line`, no `--accent-warm` (que es un fondo).
  - Barra neutra: `--progress-ink`. Figura rellena de una ilustración: `--art-ink`.
- **Dónde se guarda:** en `profiles.theme` (`light`, `dark`, `system`), con `PATCH /v1/me/theme`. El selector es Perfil → Preferencias → Apariencia.
- **La cookie `kairo_theme` es una copia del perfil en este dispositivo.** Existe para que el layout raíz ponga `data-mode` y `data-theme-pref` en `<html>` sin esperar a la API, también en `/entrar`, donde no hay perfil que leer. Primero se guarda el perfil y después la cookie: si la API falla, la cookie no cambia y el selector vuelve a como estaba. Si al entrar no coinciden (otro dispositivo, otro navegador), gana el perfil: el layout del dashboard monta `lib/theme/ThemeSync.tsx`, que aplica el tema y actualiza la cookie. En ese caso sí hay un parpadeo, una sola vez. `lib/theme/apply.ts` cambia el modo sin recargar.
- **"Como el sistema":** el servidor no puede saber qué dice el sistema operativo y manda `light`. `public/theme-init.js` (bloqueante, en `<head>`) lo resuelve antes de pintar, sigue los cambios del sistema y corrige `data-mode` si Next vuelve a renderizar el layout.
- En modo demo no hay base de datos: `getMe()` toma el tema de la cookie.

## Temas de color

Canvas: `Temas.dc.html` (12 temas × 3 intensidades, en claro y en oscuro) y `PaletaTonos.dc.html`. Decisión #58.

- **El acento ya no se llama lavanda en los modos.** `light.css` y `dark.css` piden un tono de la escala del tema activo (`--p-300`, `--p-100`…), y `palettes.css` llena esa escala según `data-palette` en `<html>`. Para agregar un tema basta un bloque en `palettes.css` y su id en `COLOR_THEMES` de `@kairo/shared`; los modos no cambian.
- **Qué tono hace qué:**
  - En claro: relleno 300, fondo suave 100, texto sobre él 800 y fuerte o foco 600. Con lavanda son los valores de siempre.
  - En oscuro: botón 300 con texto 950, trazos y foco 400, relleno 600. El fondo suave es el 900 con texto 200, como en `Temas.dc.html`; así se reemplaza el "sin morado de relleno" de `ModoOscuro.dc.html` (lo eligió la usuaria). El contraste va de 8:1 a 10:1.
- **Intensidad (`data-intensity`):**
  - `subtle` no toca nada más.
  - `tinted` cambia fondo, tarjetas, filas, bordes, texto secundario y tarjeta destacada por los neutros teñidos del tema (`--tl-*` en claro, `--td-*` en oscuro).
  - `vivid` además pinta la tarjeta destacada y el botón principal con la escala.
  - Lo que el canvas no da (`--surface-muted`, `--border-soft`, translúcidos) sale con `color-mix()` de lo que sí da.
- **Muestras del selector:** `--swatch-<tema>` (el tono 300 de cada tema), fijas, porque el selector pinta los 12 a la vez.
- **Dónde se guarda:** `profiles.color_theme` y `profiles.theme_intensity`, con `PATCH /v1/me/appearance` (los dos juntos). La cookie `kairo_appearance` (`sage.tinted`) es su copia, igual que `kairo_theme`, y `AppearanceSync` corrige si no coinciden. Las cuentas existentes y las nuevas arrancan en `lavender` + `subtle`.

## Temporadas (adornos por mes)

Una festividad por mes, elegida automáticamente por la fecha en la zona horaria del usuario:

| Mes | Festividad |
|---|---|
| Enero | Año nuevo |
| Febrero | San Valentín |
| Marzo | Primavera |
| Abril | Pascua |
| Mayo | Normal (sin adornos especiales) |
| Junio a agosto | Verano |
| Septiembre | Independencia |
| Octubre | Halloween |
| Noviembre | Día de Muertos |
| Diciembre | Navidad |

- La **semana del cumpleaños** del usuario (`profiles.birthday`) le gana a la festividad del mes.
- **Solo cambian adornos:** doodles, guirnalda y saludo. **Nunca** la paleta, la tipografía ni el layout.
- Se activan o desactivan con `profiles.decorations_on`.
- Implementación: `<html data-season="halloween">`, puesto por el layout del servidor. Cada festividad es un archivo en `seasons/` más sus SVG. Los adornos son decorativos (`aria-hidden="true"`) y no deben tapar contenido ni capturar clics.

## Evitar el parpadeo al cargar

Las preferencias visuales se guardan en el perfil y también en una cookie (ver "Modo oscuro"). El layout del servidor lee la cookie y pone los atributos en `<html>` antes de enviar la página.

## Animación (Motion)

Al usuario le importan mucho las animaciones; que se sientan cuidadas, no decorativas por relleno.

- Duraciones y curvas como tokens (`--duration-fast`, `--duration-base`, `--ease-out`…), también para Motion.
- Animar solo `transform` y `opacity` (y color en transiciones de estado). No animar `width`, `height`, `top` ni `left`.
- Paneles laterales y modales: entrada y salida sin saltos de layout.
- Listas: aparición escalonada corta al cargar; marcar un pendiente tiene su microanimación.
- **Respetar `prefers-reduced-motion`:** sin movimiento, solo cambios de opacidad o instantáneos.

## Responsive (preparado, no construido)

La primera versión es para PC, pero **sin anchos fijos**: flex y grid, `max-width` en contenedores, unidades relativas. Así la versión de teléfono (fase posterior) no obliga a rehacer pantallas.

## Accesibilidad mínima

- Elementos reales: `<button>`, `<a href>`, `<input>` con `<label>`.
- Foco visible en todo lo interactivo; todo se puede usar con teclado.
- `aria-label` en botones de solo icono.
- Contraste de texto 4.5:1 (3:1 para texto de 24 px o más).
