# Pantallas del diseño

**Para verlas:** abre el canvas en claude.ai → https://claude.ai/artifact/4bUuw6JPtK1D3dV1AhYbXG

**No abras estos archivos en el navegador.** Son la fuente del editor de diseño de claude.ai: sin el editor se ven "en crudo", con marcadores como `{{heading}}` sin rellenar.

## Para qué están aquí

Son para que Claude Code los **lea como código**. Cada archivo `.dc.html` tiene la pantalla completa:
- el layout y los estilos (colores, tamaños, radios, fuentes);
- **todos los estados**, también los que solo aparecen al interactuar: paneles que se abren al picar, menús, vistas alternas, errores, vacíos (bloques `<sc-if>`);
- la lógica de cada interacción (el bloque `<script type="text/x-dc">` al final de cada archivo).

Cómo leerlos (para Claude Code):
- `{{nombre}}` es un valor que calcula `renderVals()` en el script del final.
- `<sc-if value="{{x}}">` es un estado que se muestra solo cuando `x` es verdadero; revisa el script para saber qué acción lo activa.
- `<sc-for list="{{lista}}">` repite un bloque por cada elemento.
- Los datos que aparecen (nombres, montos, tareas) son de ejemplo, no reales.

`canvas.json` es el índice: el título de cada pantalla y cómo están agrupadas.

## Mantenerlos al día

El canvas manda. Cuando el usuario lo edite, hay que volver a copiar aquí las pantallas que cambiaron (se le puede pedir a Claude desde el chat de claude.ai, que sí tiene acceso al canvas).
