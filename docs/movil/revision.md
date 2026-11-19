# Revisión de la versión de teléfono

**Fecha:** 2026-11-18 · **Rama:** `movil` · **Estado:** abierta, se tacha conforme se arregla.

> Copia de trabajo de la revisión. Al arreglar algo, marca su casilla (`- [x]`) en el mismo commit.
> Si aparece algo nuevo, agrégalo en su pantalla con su prioridad.

## Cómo se probó

En un Samsung S24 Ultra con Chrome, por Wi-Fi contra `pnpm dev:demo` (datos de ejemplo), rama `movil`. Inicio y Perfil se revisaron en el teléfono real (Enlace Móvil); las demás pantallas, en el navegador simulando 360 y 320 px de ancho, con un script que mide qué se sale o se corta. El botón naranja "N" es el aviso de Next.js en desarrollo: no cuenta como falla.

- **Alta:** impide usar la pantalla o tapa contenido.
- **Media:** se ve mal o cuesta trabajo, pero se puede usar.
- **Baja:** detalle visual.

## Problemas generales

A 320 y 360 px de ancho ninguna pantalla se desborda de la página; lo que se ve "cortado" son filas que se deslizan sin avisar, columnas demasiado angostas y los botones flotantes encima del contenido.

| Problema | Dónde aparece | Prioridad | Pista para arreglarlo |
| --- | --- | --- | --- |
| Botones flotantes (pomodoro "25" y +) tapan contenido | Casi todas: Perfil, Membresías, Recordatorios, Sprints, Tareas, Inicio | Alta | Dejar espacio al final de cada lista o subir los botones sobre la barra; `FocusPlayer.module.css` y `QuickCapture.module.css` |
| Pestañas que se salen por la derecha sin pista de que se deslizan | Perfil, Finanzas, Día a día, Escritos, Proyecto | Media | Degradado o flecha al borde, y llevar la pestaña activa a la vista |
| Texto de pestañas partido en dos renglones | Perfil ("Mi perfil", "Mis secciones") | Media | `white-space: nowrap` en las pestañas |
| Cada módulo resuelve las pestañas distinto (unas se deslizan, otras bajan de renglón) | Escuela y Proyectos bajan de renglón; los demás se deslizan | Baja | Elegir un solo comportamiento |
| Casillas y enlaces chicos para el dedo (24–32 px) | Casillas de tareas y rutina, "Ver todos", "Mover de hora", "Día a día" en Rutina | Media | Área de toque de 44 px aunque el ícono siga chico |
| Escuela y Recordatorios no aparecen en la barra ni en "Más" | Menú "Más" (solo Proyectos, Finanzas y Escritos) | Media | Están con `inNav: false`; confirmar con Celeste si es a propósito |
| El tamaño de letra grande del teléfono empeora todo lo anterior | Todo | Media | Probar siempre también con letra grande |

## Pantalla por pantalla

Las fallas graves están en Tareas, Papelera y el horario de Escuela. Lo demás se puede usar.

### Inicio

- [ ] Media — Las tarjetas de números (pendientes, proyectos, $ por pagar) quedan dos arriba y una abajo, con huecos.
- [ ] Media — El "25" del pomodoro queda encima de "Pendientes de hoy" y de las flechas de las tareas.
- [ ] Baja — Los títulos de tareas largos se cortan en la tarjeta.

### Tareas

- [ ] **Alta** — En la lista, el nombre de la tarea se reduce a 1–6 letras ("T…", "Termin…"). La fila móvil reserva 56 px para la prioridad, pero el chip "Media" mide más y se come el nombre (`features/tasks/components/TaskList.module.css`, `.rowButton` dentro de `@media (max-width: 720px)`). Pasar prioridad y fecha a un segundo renglón.
- [ ] Media — El texto "Agregar tarea… escribe y presiona Enter" se corta.
- [ ] Media — El botón + tapa la fecha y el bote de basura de las filas de abajo.
- [ ] Pendiente — Revisar la vista Tablero en teléfono.

### Agenda

- [ ] Media — Las tareas de "Todo el día" se cortan ("Terminar el diseño del dashb…").
- [ ] Media — Los botones flotantes tapan la columna de horas.
- [ ] Pendiente — Revisar las vistas Semana y Mes.

### Día a día

- [ ] Media — Las pestañas (Hoy, Menú, Reporte, Diario, Metas) se salen por la derecha.
- [ ] Media — Menú semanal: se ven 2 de 7 días y el resto se desliza; las comidas largas quedan de 4 renglones. Valorar una vista de un día a la vez.
- [ ] Media — Reporte: la semana también se desliza de lado.
- [ ] Baja — Rutina: el enlace para volver a "Día a día" y el interruptor son chicos.

### Finanzas

- [ ] Media — Pestañas cortadas ("Ahorros y deu…"); hay 5 y solo caben 2 y media.
- [ ] Media — Membresías: la tabla mide más del doble del ancho y se desliza; mejor como tarjetas.
- [ ] Media — Membresías: el + tapa "$0 al mes" de la tarjeta de efectivo.
- [ ] Baja — Movimientos: descripciones cortadas ("Comida fuera · Débito ••4417 · hoy").
- [ ] Baja — Presupuesto: los interruptores son chicos.

### Proyectos

- [ ] Baja — Los filtros (Todos, Trabajo, Personal, Escuela) bajan de renglón.
- [ ] Media — En un proyecto, el "25" y el + tapan el progreso y la fecha de la tarjeta.
- [ ] Baja — Pestañas del proyecto (Resumen, Sprints, Archivos) apenas se salen.
- [ ] Media — Sprints: el tablero se apila en columnas verticales y funciona, pero el + tapa las tarjetas.

### Escuela

- [ ] **Alta** — El horario de clases mide 720 px y solo se ven Lunes y Martes. Mejor una vista por día en teléfono.
- [ ] Media — Pestañas en dos renglones (Calificaciones baja sola).
- [ ] Media — No se llega a Escuela desde la barra ni desde "Más".

### Escritos

- [ ] Media — Las pestañas del mundo miden 804 px (más del doble del ancho) y se deslizan sin pista.
- [ ] Media — El resumen del mundo tiene otra fila que se desliza (782 px).
- [ ] Pendiente — Revisar el editor de páginas, las fichas y el mapa con el teclado abierto.

### Recordatorios

- [ ] Media — El "25" y el + tapan los íconos de alarma de la derecha.
- [ ] Media — No se llega a Recordatorios desde la barra ni desde "Más" (solo por la campana o Inicio).

### Perfil

- [ ] Media — Pestañas cortadas ("Preferencias") y con el texto partido en dos renglones.
- [ ] Media — El + tapa los temas de color de la derecha (Bosque, Arena).

### Papelera

- [ ] **Alta** — Los nombres se reducen a una letra ("B…") y la descripción queda de una palabra por renglón, porque "Restaurar" ocupa casi toda la fila (`features/trash/components/TrashView.module.css`, `.row` en móvil). Poner "Restaurar" debajo o como ícono.
- [ ] Baja — Los filtros ocupan 3 renglones.

### Menú "Más", captura rápida y avisos

- [ ] Pendiente — Con el + abierto, revisar que la hoja quepa entera con el teclado arriba.
- [ ] Pendiente — Revisar el panel de avisos y la búsqueda en teléfono.

## Segunda ronda (2026-11-18, dicho por la usuaria)

Nota sobre los botones flotantes: hoy el contenido ya deja espacio al final de la lista y el "25" se mete debajo del "Más" al hacer scroll, así que **baja a Media** y no es lo más urgente.

- [ ] **Alta** — Barra inferior sin "Más": mostrar en ella solo 5 secciones elegidas y encontrar otra forma de llegar a las demás (ver "Opciones" abajo). Resuelve de paso que Escuela y Recordatorios no tengan acceso.
- [x] **Alta** — (hecho: `position: sticky` + degradado + `viewport-fit=cover`; falta probarlo en el teléfono) La barra superior se esconde con un poco de scroll en el teléfono. Debe quedarse fija, sin sobreponerse a la cámara ni a la hora del sistema (zona segura: `env(safe-area-inset-top)` y `viewport-fit=cover`).
- [ ] Media — Al cambiar de pestaña y volver, no se conserva dónde se había dejado el scroll. Guardar la posición por pantalla. Es complicado: probar primero en una pantalla.
- [ ] Media — Quitar los textos de atajos de teclado de PC (por ejemplo "Ctrl+K" y las teclas en la búsqueda) cuando se usa el teléfono. Decidir si la función de esos atajos hace falta como botón táctil y cómo se implementa.

**Opciones para la barra inferior** (por decidir):
1. Barra con 4 secciones fijas + un botón que abre una hoja con todas (es "Más" otra vez, pero con todo adentro).
2. Barra de 5 con las más usadas (Inicio, Tareas, Agenda, Día a día, Finanzas) y el resto en el menú del perfil, arriba.
3. Barra que se desliza de lado mostrando todas las secciones con ícono (como las pestañas), con la activa siempre a la vista.

## Orden sugerido

Empezar por lo que arregla varias pantallas a la vez, todo en la rama `movil`.

1. Botones flotantes: que no tapen contenido en ninguna pantalla.
2. Filas de Tareas y Papelera: nombre completo, con los datos en un segundo renglón.
3. Un solo componente de pestañas para el teléfono: un renglón, con pista de que se desliza.
4. Horario de Escuela y Menú semanal: vista de un día a la vez.
5. Tabla de Membresías como tarjetas.
6. Áreas de toque de 44 px.
7. Decidir con Celeste cómo se llega a Escuela y Recordatorios.
8. Revisar lo marcado como Pendiente, con letra grande y en modo oscuro.

Ya corregido: `apps/web/next.config.ts` permite abrir el modo demo desde el teléfono por Wi-Fi (`allowedDevOrigins`). Sin eso las pantallas cargaban vacías.
