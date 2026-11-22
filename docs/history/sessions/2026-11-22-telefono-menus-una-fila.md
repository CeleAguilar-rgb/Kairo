# 2026-11-22 · Teléfono: el menú de arriba en una sola fila

**Hecho en:** Claude Code (rama `movil`, sin commit)

## Qué se hizo

Objetivo: que el menú de arriba de cada pantalla quepa en **una sola fila a 375 px**, sin esconder secciones a la derecha. Escuela y Escritos se dejaron como estaban (la usuaria los tiene "en proceso"); solo heredan el centrado.

- **Barra de iconos (`IconTabs`)** para las pestañas de Finanzas, Día a día, Escritos y Escuela: en el teléfono las pestañas sin elegir se quedan con su icono y la elegida muestra icono + nombre (con su cuenta, si la trae). En escritorio se ven igual que antes. La barra va **centrada** en el teléfono. Con la prop `phoneOnly` también sirve de filtro solo-teléfono (Proyectos y Metas).
- **"Filtrar" con cajón (`FilterSheet`)** en Agenda, Tareas, Movimientos y Papelera: un solo botón con la cuenta de filtros puestos y un cajón con las opciones. En escritorio siguen los chips de siempre.
- **El "+" flotante es contextual.** Cada pantalla declara su acción principal con `usePageAction` (lo hace por dentro `AddButton`) y en el teléfono el "+" flotante ejecuta *esa* acción ("Nuevo evento", "Movimiento", "Nueva meta"…). Sin acción declarada abre la captura rápida como siempre. El botón de arriba ("+ Nuevo…") no se ve en el teléfono.
- **Agenda:** la fecha es también la navegación (flechas a los lados; tocar la fecha lleva a hoy). En la vista de día solo dice el día ("Domingo 22 de noviembre"), sin "· N cosas": la lista ya está debajo.
- **Finanzas:** el selector de mes subió al encabezado (`FinanceMonthBar`, solo teléfono) y la franja de abajo ya no se ve en Resumen ni Movimientos. En Movimientos, "Filtrar" a la izquierda y lo que entró/salió apilado a la derecha.
- **Proyectos y Metas:** el filtro de tipo / estado pasa en el teléfono a una barra de iconos con la cuenta en la elegida, así se ven todas las secciones (antes "Escuela" y "En pausa" quedaban cortadas a la derecha). En escritorio sigue el `Segmented`.
- **Papelera:** "Vaciar papelera" va al lado de "Filtrar" en el teléfono (el mismo botón, con el mismo aviso de confirmación); en escritorio sigue en el encabezado.
- **Centrado:** pestañas de iconos, selector de mes, fecha y pastilla de rutina de Día a día quedan centrados en el teléfono.

## Decisiones tomadas

- Acción principal por pantalla en un registro (`PageActionProvider`, dos contextos: registrar es estable, leer solo lo hace el "+"). La limpieza solo quita la acción si sigue siendo la actual, para que al cambiar de pestaña no se borre la nueva.
- Mantener "Filtrar" + cajón para filtros con muchas opciones y barra de iconos para filtros con pocas (3 o 4) que se leen mejor a la vista.
- No se registró en `decisions.md`: es de presentación del teléfono, no cambia ninguna decisión registrada.

## Archivos o partes importantes que se tocaron

- Nuevos en `apps/web/src/components/`: `layout/PageAction.tsx`, `ui/IconTabs.*`, `ui/FilterSheet.*`, `ui/AddButton.*`, `ui/responsive.module.css`; y `features/finance/components/FinanceMonthBar.tsx`.
- `features/shortcuts/components/QuickCapture.tsx` (el "+" ejecuta la acción de la pantalla) y `app/(dashboard)/layout.tsx` (el proveedor).
- `FinanceTabs`, `DailyTabs`, `WritingsTabs`, `TermTabs` pasaron a envolver `IconTabs` (se borraron `FinanceTabs.module.css` y `DailyTabs.module.css`).
- Agenda, Tareas, Proyectos, Recordatorios, Finanzas (Resumen, Movimientos, Membresías), Día a día (Metas, `DailyToolbar`) y Papelera.

## Quedó pendiente

- **Probar en un teléfono real** (y modo oscuro, letra grande): todo se vio solo en el emulador de 375 px.
- Escuela: la fila de fases ("Antes de empezar / Durante el semestre / Período / + Materia") sigue en dos renglones y alineada a la izquierda; se dejó porque la usuaria pidió no moverla.
- Ahorros, Presupuesto, Metas de ahorro y "Agregar materia" no declaran acción: ahí el "+" flotante abre la captura rápida.
- Captura rápida de otros tipos (tarea, gasto, nota…) ya no está a un toque en las pantallas que tienen su propia acción; el toque largo del "+" lo usa el pomodoro.

## Notas para la siguiente sesión

- `tsc` y `eslint` pasan. Escritorio (1280 px) verificado: solo una versión de cada control es visible.
- Para Celeste (escritorio): si adopta estas pantallas, `AddButton` y `IconTabs` ya viven en `components/ui/`; no hay que cambiar su marcado, solo usarlos.
- Nada de esto está en `main`; falta que la usuaria apruebe y pasar `movil` a `main` por Pull Request.
