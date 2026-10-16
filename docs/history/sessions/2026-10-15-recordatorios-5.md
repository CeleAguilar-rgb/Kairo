# 2026-10-15 · Recordatorios (Para hoy, nuevo, posponer y Más adelante)

**Hecho en:** Claude Code

## Qué se hizo
La pantalla de Recordatorios en el front, con datos de ejemplo, según `Recordatorios.dc.html`. La escribió Claude completa (Celeste lo pidió así y revisa el front al final).

- **Para hoy (`/recordatorios`):** tarjeta lavanda con lo de hoy y lo atrasado ordenado por hora. Cada fila trae la casilla de "listo", el mensaje, cuándo ("09:05 · hace 40 min" en rojo si ya pasó, "Todo el día", "Pospuesto · 09:55") y el chip de origen (Manual, Rutina, Evento · Daily, Membresía · ••4417, Tarea · …). "Listo" saca la fila al instante y avisa con "Deshacer".
- **Posponer:** el reloj de cada fila abre un menú (10 minutos, 1 hora, Mañana) con foco en la primera opción, flechas arriba/abajo, Escape (devuelve el foco al reloj) y clic fuera. "Mañana" avisa a las 9:00 y la fila pasa a "Más adelante".
- **Nuevo:** formulario dentro de la tarjeta (mensaje, día, hora, repetir: Una vez / Cada día / Lunes a viernes). Abre con hoy y la próxima media hora (o mañana a las 8 si ya es tarde). Valida con `createReminderSchema` y rechaza una hora que ya pasó, con el foco en el campo con error.
- **Series que se repiten:** al marcar listo un recordatorio "Cada día" o "Lunes a viernes" nace la siguiente vez (el viernes salta al lunes); "Deshacer" borra esa siguiente y reabre la original.
- **Todo al día:** cuando no queda nada para hoy, el texto dice cuál es el siguiente aviso ("El siguiente aviso es mañana a las 09:00: …") y trae el botón "Nuevo recordatorio".
- **Más adelante:** segunda tarjeta (clara) con los recordatorios de otros días, con las mismas acciones. **No está en el canvas** (el canvas solo muestra "Para hoy"); se agregó para que lo que Inicio enseña (dentista, dominio, inscripción) tenga dónde verse.
- **Inicio:** la tarjeta "Recordatorios" lee de la misma lista y usa las mismas acciones, así lo que marcas allá queda marcado aquí. Muestra los 3 que tocan primero.
- **Reloj vivo:** la pantalla se actualiza cada 30 s (lo que se atrasa se pone en rojo; a medianoche lo de mañana pasa a "Para hoy").

## Decisiones tomadas
- **Lo no atendido se queda en "Para hoy"** (regla de `features.md`: "lo no atendido pasa al día siguiente"): lo de ayer sin atender sigue en la lista de hoy y solo cambia su hora a rojo.
- **`Reminder` se extendió, no se reemplazó:** se sumaron `source` (de dónde viene) y `repeat`. Inicio sigue leyendo el mismo tipo.
- **Posponer "Mañana" = mañana a las 9:00** (constante `TOMORROW_AT` en `reminder-utils.ts`).
- **No se construyeron** las tarjetas del canvas "Aviso emergente" y "Semana sin eventos" ni el botón de campana "Simular un aviso": son documentación de estados del canvas (el popup real depende de Web Push y jobs, y la semana vacía es de la Agenda). Tampoco hay "Borrar": el canvas no lo trae; "listo" es la salida.
- **Datos de ejemplo relativos a la hora de ahora** (redondeada a 5 min): siempre hay uno atrasado y los demás por venir, como en el canvas. Los tiempos se mueven un poco al recargar; lo que haces (hecho, pospuesto, creado) se conserva mientras el servidor de desarrollo siga encendido.
- **`useOptimistic` + `revalidatePath`:** la fila reacciona al instante y, cuando la acción de servidor termina, la lista real la reemplaza. No hace falta `router.refresh()`. Se quitó un `useMemo` manual porque el React Compiler lo rechazaba (memoiza solo).
- **`timeOfDay` pasó a `packages/shared/src/time.ts`** (interno, no exportado del paquete) para compartirlo entre eventos y recordatorios.

## Archivos o partes importantes que se tocaron
- `packages/shared/src/reminders/` (`constants.ts`, `schemas.ts`: `createReminderSchema`, `snoozeReminderSchema`), `time.ts`, `agenda/schemas.ts` (usa `timeOfDay` de `time.ts`) e `index.ts`
- `apps/web/src/features/reminders/`: `types.ts`, `mock.ts`, `mock-store.ts`, `reminder-utils.ts` (lógica pura), `api.ts`, `actions.ts`, `index.ts`; componentes `RemindersView`, `ReminderRow`, `ReminderForm` y `RemindersCard` (Inicio, ahora con acciones)
- `apps/web/src/app/(dashboard)/recordatorios/page.tsx`

## Probado
- `tsc --noEmit` (web y shared) y `eslint` sin errores.
- La lógica pura (siguiente vez de una serie, posponer cerca de medianoche, serie atrasada atendida hoy, etiquetas, agrupar hoy/más adelante) y el almacén en memoria (crear, completar, deshacer, posponer) con aserciones sueltas en un script temporal (no quedó en el repo: el front aún no tiene tests).
- En un Edge real (controlado por su protocolo de depuración, a 1440 y 390 px): formulario (validación con foco, hora pasada, crear), marcar listo con "Deshacer", posponer 10 min y "Mañana", menú con teclado, serie "Cada día" (nace la siguiente y el deshacer la quita), "Todo al día", Inicio sincronizado en las dos direcciones. Sin errores en la consola ni desbordamiento horizontal en celular.
- **No se probó:** movimiento reducido, modo oscuro (aún no existe), ni arrastrar nada (no aplica).

## Quedó pendiente
- **Base de datos, cuando se haga el backend de recordatorios:** `reminders` hoy tiene `title, remind_at, done_at, snoozed_to, notified_at` y un vínculo opcional a tareas, eventos o membresías. Falta, con migración de Drizzle y reflejarlo en `docs/guides/data-model.md`:
  - **repetición** (`repeat`: none / daily / weekdays) y cómo nace la siguiente vez (hoy el mock crea otra fila al completar);
  - **origen "Rutina"** (los de la rutina de Día a día no tienen vínculo en el modelo);
  - **precisión** (mes / día / hora): hoy `precision` no es columna;
  - "Deshacer" debe ser `done_at = NULL` / restaurar `snoozed_to`, y borrar (si se agrega) debe ser `deleted_at` (regla 11).
- Los avisos de verdad (en la app y Web Push) los disparan las tareas programadas (Supabase Cron → API) y respetan las horas de silencio del perfil: no existen todavía.
- Pendiente de decidir: si "Más adelante" se queda o se quita al revisar contra el canvas; si Inicio debe mostrar solo lo que no es de hoy.

## Notas para la siguiente sesión
- Sugerido: la siguiente pantalla del canvas (Día a día, Finanzas, Escuela o Escritos).
- Para ver la pantalla: `pnpm dev:demo` en `apps/web` y abrir `/recordatorios`. Reiniciarlo vuelve a los datos de ejemplo.
- En esta sesión no había herramienta de navegador: se probó con Edge headless (`--remote-debugging-port`) y un cliente mínimo del protocolo de depuración en Node (el `WebSocket` global de Node 24). Los scripts quedaron fuera del repo.
- Las notas de `2026-10-14-tareas-2.md`, `-proyectos-3.md` y `-agenda-4.md` siguen aplicando (cada pantalla envuelta en `<PageEnter>`, sin `loading.tsx` propio, no usar `AnimatePresence initial={false}` sobre algo que deba tener entrada, no `useMemo` manual).
