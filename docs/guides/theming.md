# Estilos, temas y animación

## Principios

- **CSS Modules + variables CSS.** Sin Tailwind ni librerías utilitarias.
- **Los componentes solo usan variables semánticas** (`var(--surface)`, `var(--text-muted)`, `var(--radius-card)`). Nunca un hex, px de espaciado o nombre de fuente directo en un componente.
- Los valores salen del canvas de diseño (`docs/guides/design.md`).

## Capas de variables

```
apps/web/src/styles/
├── tokens.css          # Primitivos: paleta cruda, escala de espacios, radios, fuentes, sombras, duraciones
├── semantic.css        # Lo que usan los componentes: --bg, --surface, --text, --accent…
├── modes/
│   ├── light.css       # [data-mode="light"] → asigna primitivos a semánticos
│   └── dark.css        # Fase posterior; ver "Modo oscuro"
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

## Modo oscuro (preparado, no construido)

- Desde el inicio, `<html>` lleva `data-mode="light"` y todos los colores pasan por semánticos. Con eso, el modo oscuro será solo escribir `modes/dark.css`.
- La preferencia (`light`, `dark`, `system`) ya existe en `profiles.theme`.
- Cuando llegue: tonos café cálidos, la lavanda solo como acento, todo el texto con contraste 4.5:1 (ver pantallas `ModoOscuro` y `Oscuro*`).

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

Las preferencias visuales (modo, adornos) se guardan en el perfil y también en una cookie. El layout del servidor lee la cookie y pone los atributos en `<html>` antes de enviar la página.

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
