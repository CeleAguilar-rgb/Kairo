# 2026-11-23 · Capturas del "después" del teléfono

**Hecho en:** Claude Code

## Qué se hizo
- `docs/movil/despues.md`: tabla por pantalla con la captura de antes, la de después y qué cambió, más un resumen de lo que cambió en todas las pantallas (pomodoro en el encabezado, barra de 5 secciones sin "Más", pestañas de íconos, encabezado fijo).
- `docs/movil/despues/`: 21 capturas con el mismo nombre que las de `antes/` (la 02 y la 03, del arreglo del Wi-Fi, no tienen después).

## Cómo se tomaron
- `pnpm dev:demo` y Edge sin ventana manejado por el protocolo de DevTools desde un script de Node (sin dependencias nuevas; el script no se guardó en el repo).
- Teléfono simulado: táctil, al doble de resolución y al mismo ancho que el antes (375, 360 o 320 px; 412 px para las que en el antes eran del S24 Ultra).
- Tema con la cookie `kairo_theme`: claro en 01, 04 y 05, oscuro en las demás, como en el antes. El aviso "N" de Next se escondió.

## Quedó pendiente
- Repetir la 04 y la 05 en el teléfono real si se quiere la comparación exacta.
- En algunas pantallas el + flotante queda sobre un ícono de una fila mientras se desliza (09 Tareas a 320 px, 16 tablero del sprint, 21 Recordatorios). Está anotado en `despues.md`; según el usuario ya no se considera falla.
