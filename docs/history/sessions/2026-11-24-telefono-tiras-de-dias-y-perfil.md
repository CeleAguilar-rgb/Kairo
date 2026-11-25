# 2026-11-24 · Teléfono: tiras de días centradas en hoy, Perfil y Finanzas

**Hecho en:** Claude Code

## Qué se hizo
- **Tiras de días** (pedido: "se ven apachurrados; que se vean menos, con degradado a los lados y hoy al centro"):
  - `ScrollTabs` ganó `centerEdges` (hueco en cada orilla de media tira menos medio día, `--center-item`) y toma `aria-current="date"` como activo.
  - Agenda › Día, solo en el teléfono: tira de 29 días seguidos alrededor de hoy (`rollingDays` en `DayView.tsx`); si el día elegido queda a más de 10 de hoy, se arma alrededor de él. Llega a las orillas de la tarjeta para que los días de los lados se asomen desvanecidos. En escritorio sigue la semana de 7 columnas.
  - Inicio ("Esta semana", `WeekCard`) y Menú semanal (`MenuWeek`): la semana con hueco en las orillas, hoy o el elegido al centro aunque sea lunes.
- **Mi perfil:** doodles en una fila de 5 columnas de hasta 56 px.
- **Preferencias:** temas como círculos en cuadrícula cerrada (`closedGridColumns`: 12 temas → 6 × 2), "Nombre · descripción" del elegido abajo, y los tres bloques centrados. `PerfilView` en ≤860px usa `minmax(0, 1fr)`: con `1fr` la tarjeta se salía a 320 px.
- **Finanzas:** la cabecera ocupa todo el renglón y el mes con sus flechas queda centrado.

## Decisiones tomadas
- El usuario eligió: días seguidos en Agenda, la semana con hueco en Inicio y el Menú; doodles en una fila; temas solo como círculos en cuadrícula cerrada, centrados con Apariencia. No son decisiones de `decisions.md`; el cambio respecto al canvas de los temas va en `docs/movil/para-celeste.md` (punto 16).

## Archivos o partes importantes que se tocaron
- `components/ui/ScrollTabs.*`, `features/agenda/components/DayView.*`, `WeekCard.*`, `features/daily/components/MenuWeek.module.css`, `app/(dashboard)/perfil/` (`PerfilTab.module.css`, `PreferenciasTab.*`, `PerfilView.module.css`), `features/finance/components/FinanceHeader.module.css`.

## Quedó pendiente
- Probarlo en el teléfono real (deslizar la tira con el dedo, que no pelee con el centrado).
- Las capturas de `docs/movil/despues.md` son de antes de estos cambios (Agenda 10, Perfil 05/06, Finanzas 12).

## Notas para la siguiente sesión
- `tsc` y `eslint` pasan. Visto en el demo a 375 y 320 px (Edge sin ventana y el navegador de la app) y en escritorio a 1280: escritorio sin cambios.
