# 2026-11-06 · Recorrido estético y modo oscuro

**Hecho en:** Claude Code

## Qué se hizo

- Recorrido de las pantallas en modo demo a 1440 px, en claro y en oscuro, con una auditoría automática de contraste.
- Corregido en claro:
  - Papelera no tenía márgenes laterales: el título chocaba con la barra y "Vaciar papelera" se cortaba.
  - El reproductor y el botón "+" tapaban el final de las páginas largas.
  - Los eventos de Agenda tenían un borde oscuro que el canvas no trae: `border: 1px solid` en `EntryParts` pisaba el `border-color` de cada tipo.
  - "Días" desalineado con "Nombre" en Mis rutinas.
  - "Auralun" en vez de "Aurelun" en los datos demo.
  - El anillo de foco pegado al texto en "Marcar todo como leído".
- Modo oscuro:
  - `modes/dark.css` con la paleta de `ModoOscuro.dc.html`.
  - Variables nuevas donde un color de claro cumplía dos funciones.
  - Cookie `kairo_theme` y `public/theme-init.js`.
  - Nueva pestaña Perfil → Preferencias → Apariencia.
  - Guardado en `profiles.theme` (la columna ya existía desde la migración `0001`, no hizo falta migrar) con `PATCH /v1/me/theme`. La cookie es la copia del perfil en el dispositivo, y `ThemeSync` la corrige si no coinciden.
- Archivos dañados en disco: 2 del repo, restaurados desde git, y 11 de `node_modules`, reparados con `touch` + `pnpm install --force` (ver Bloqueos en `current.md`). El `touch` hace falta: pnpm solo vuelve a verificar un archivo de su tienda si cambió su fecha.

## Decisiones tomadas

- #57: el tema se guarda en el perfil y la cookie es su copia; si no coinciden, gana el perfil.

## Qué se probó

- Demo en Edge headless: el selector, la cookie, recargar, "Como el sistema" y su cambio en vivo. Sin errores de consola.
- Paneles en oscuro: nueva tarea, tablero, búsqueda y avisos.
- App real con un usuario temporal, ya borrado (21 comprobaciones): guardar en perfil y cookie, entrar sin cookie, un cambio hecho desde otro dispositivo, "Como el sistema", y apagar la API para ver el aviso de error y que se revierta.
- `test/account.e2e-spec.ts`: 11 tests, 4 nuevos del tema. **No se corrió el resto de los e2e.**
- `tsc` limpio en `apps/web` y `apps/api`.
- ESLint solo en los archivos tocados del tema y de cuenta.

## Qué no se probó

- Con la cuenta real de la usuaria.
- Las demás rutas profundas de Escritos y Proyectos, y los demás cajones y modales en oscuro.
- `Temporadas` en oscuro: los adornos no están construidos.
- A 390 px solo se revisaron Inicio, Tareas y Papelera. No hay desborde de página, pero el reproductor se corta por la izquierda. No se corrigió: el teléfono es de una fase posterior.
- La captura rápida: el script no llegó a abrirla.

## Siguiente paso

Agregar las dos variables de Storage que faltan en los `.env` locales y revisar el disco. Para las pruebas se pasaron solo al proceso; los `.env` no se tocaron.
