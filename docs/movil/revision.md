# Revisión de la versión de teléfono

**Fecha:** 2026-11-18 · **Rama:** `movil` · **Estado:** abierta, se tacha conforme se arregla.

> Copia de trabajo de la revisión. Al arreglar algo, marca su casilla (`- [x]`) en el mismo commit.
> Si aparece algo nuevo, agrégalo en su pantalla con su prioridad.
>
> Capturas del estado inicial: `antes.md` (carpeta `antes/`). Las del después van en `despues.md` (carpeta `despues/`), con el mismo número.

## Cómo se probó

En un Samsung S24 Ultra con Chrome, por Wi-Fi contra `pnpm dev:demo` (datos de ejemplo), rama `movil`. Inicio y Perfil se revisaron en el teléfono real (Enlace Móvil); las demás pantallas, en el navegador simulando 360 y 320 px de ancho, con un script que mide qué se sale o se corta. El botón naranja "N" es el aviso de Next.js en desarrollo: no cuenta como falla.

- **Alta:** impide usar la pantalla o tapa contenido.
- **Media:** se ve mal o cuesta trabajo, pero se puede usar.
- **Baja:** detalle visual.

## Problemas generales

A 320 y 360 px de ancho ninguna pantalla se desborda de la página; lo que se ve "cortado" son filas que se deslizan sin avisar, columnas demasiado angostas y los botones flotantes encima del contenido.

| Problema | Dónde aparece | Prioridad | Pista para arreglarlo |
| --- | --- | --- | --- |
| Botones flotantes (pomodoro "25" y +) tapan contenido | Casi todas: Perfil, Membresías, Recordatorios, Sprints, Tareas, Inicio | Resuelto | Dejar espacio al final de cada lista o subir los botones sobre la barra; `FocusPlayer.module.css` y `QuickCapture.module.css` |
| Pestañas que se salen por la derecha sin pista de que se deslizan | Perfil, Finanzas, Día a día, Escritos, Proyecto | Media (hecho con ScrollTabs) | Degradado o flecha al borde, y llevar la pestaña activa a la vista |
| Texto de pestañas partido en dos renglones | Perfil ("Mi perfil", "Mis secciones") | Media (hecho) | `white-space: nowrap` en las pestañas |
| Cada módulo resuelve las pestañas distinto (unas se deslizan, otras bajan de renglón) | Escuela y Proyectos bajan de renglón; los demás se deslizan | Baja (hecho: todas se deslizan en una línea) | Elegir un solo comportamiento |
| Casillas y enlaces chicos para el dedo (24–32 px) | Casillas de tareas y rutina, "Ver todos", "Mover de hora", "Día a día" en Rutina | Media (hecho: área de toque de 44 px con `::after` y `@media (pointer: coarse)`) | Área de toque de 44 px aunque el ícono siga chico |
| Escuela y Recordatorios no aparecen en la barra ni en "Más" | Menú "Más" (solo Proyectos, Finanzas y Escritos) | Media (hecho en móvil) | Están con `inNav: false`; confirmar con Celeste si es a propósito |
| El tamaño de letra grande del teléfono empeora todo lo anterior | Todo | Media | Probar siempre también con letra grande |

## Pantalla por pantalla

Las fallas graves están en Tareas, Papelera y el horario de Escuela. Lo demás se puede usar.

### Inicio

- [x] Media — Las tarjetas de números (pendientes, proyectos, $ por pagar) quedan dos arriba y una abajo, con huecos. (Una fila de 3 columnas con el contenido en vertical.)
- [ ] Media — El "25" del pomodoro queda encima de "Pendientes de hoy" y de las flechas de las tareas.
- [ ] Baja — Los títulos de tareas largos se cortan en la tarjeta.

### Tareas

- [x] **Alta** — (hecho: dos renglones; falta probarlo en el teléfono) En la lista, el nombre de la tarea se reduce a 1–6 letras ("T…", "Termin…"). La fila móvil reserva 56 px para la prioridad, pero el chip "Media" mide más y se come el nombre (`features/tasks/components/TaskList.module.css`, `.rowButton` dentro de `@media (max-width: 720px)`). Pasar prioridad y fecha a un segundo renglón.
- [ ] Media — El texto "Agregar tarea… escribe y presiona Enter" se corta.
- [x] Media — (descartado: el + ya no es problema en ninguna parte, según el usuario) El botón + tapa la fecha y el bote de basura de las filas de abajo.
- [ ] Pendiente — Revisar la vista Tablero en teléfono.

### Agenda

- [x] Media — (hecho, falta probar en el teléfono) Las tareas de "Todo el día" se cortan ("Terminar el diseño del dashb…"). Ya se ven completas en la vista Día (los chips se parten en renglones).
- [x] Media — (descartado: el + ya no es problema en ninguna parte, según el usuario) Los botones flotantes tapan la columna de horas.
- [x] Pendiente — (hecho, falta probar en el teléfono) Vistas Semana y Mes revisadas: la semana se desliza con desvanecido a la orilla de la tarjeta, el mes ya era una cuadrícula de barritas (ahora "+3" en vez de "+3 más" en dos renglones) y el cajón "Nuevo evento" ya no se sale de la pantalla (hora de fin) ni dibuja barra vertical en "Tipo".

- [x] Media — (hecho, falta probar en el teléfono) Centrados la barra Día/Semana/Mes, las flechas con "Hoy" y "Nuevo evento"; "Todo el día" en la vista Día va arriba de los chips (ya no rompe la vista).
- [x] Media — (hecho, falta probar en el teléfono) La semana en el teléfono es una lista por día (lo de todo el día primero, días vacíos plegados) en vez de la rejilla de 7 columnas; la rejilla queda para pantallas grandes.
- [x] Media — (hecho, falta probar en el teléfono) Mes: "Mostrar" sube arriba del calendario como chips con conteo (en Día, Semana y Mes), y la tarjeta del panel se oculta en el teléfono.

### Día a día

- [x] Media — Las pestañas (Hoy, Menú, Reporte, Diario, Metas) se salen por la derecha.
- [x] Media — (hecho: en ≤720px se ve un día a la vez, empezando por hoy, con botón de íconos para la semana; falta probarlo en el teléfono) Menú semanal: se ven 2 de 7 días y el resto se desliza; las comidas largas quedan de 4 renglones. Valorar una vista de un día a la vez.
- [x] Media — (hecho: sigue deslizándose pero con desvanecido a los lados y los días con más espacio; falta probarlo en el teléfono) Reporte: la semana también se desliza de lado.
- [x] Baja — Rutina: el enlace para volver a "Día a día" y el interruptor son chicos.
- [x] Media — (hecho, falta probar en el teléfono) El resto de Día a día con lo ya hecho: filtro de Metas con scroll, pestañas de Rutinas en una línea con desvanecido, días de la rutina y botones de confirmar a 44 px con dedo, y las 5 caritas del Diario en una sola fila. Además, el texto de la franja (fecha + rutina, mes del diario) con jerarquía: texto principal y pastilla.

### Finanzas

- [x] Media — Pestañas cortadas ("Ahorros y deu…"); hay 5 y solo caben 2 y media.
- [x] Media — (hecho: en ≤720px cada fila es una tarjeta con CSS grid; falta probarlo en el teléfono) Membresías: la tabla mide más del doble del ancho y se desliza; mejor como tarjetas.
- [x] Media — (descartado: el + ya no es problema en ninguna parte, según el usuario) Membresías: el + tapa "$0 al mes" de la tarjeta de efectivo.
- [x] Baja — (hecho, falta probar en el teléfono) Movimientos: descripciones cortadas ("Comida fuera · Débito ••4417 · hoy").
- [x] Baja — Presupuesto: los interruptores son chicos.

### Proyectos

- [x] Baja — (hecho, falta probar en el teléfono) Los filtros (Todos, Trabajo, Personal, Escuela) ya van en una línea que se desliza, con "Nuevo proyecto" a todo lo ancho debajo.
- [x] Media — (hecho, falta probar en el teléfono) Proyecto: cabecera compacta ("Editar proyecto" y "···" en una fila, "Ver en el tablero" debajo), Avance arriba del Resumen, botón de Sprints y Archivos a todo lo ancho, portadas más bajas en la galería y sin barra vertical en el filtro de Archivos.
- [x] Media — (descartado: el + ya no es problema en ninguna parte, según el usuario) En un proyecto, el "25" y el + tapan el progreso y la fecha de la tarjeta.
- [x] Baja — Pestañas del proyecto (Resumen, Sprints, Archivos) apenas se salen.
- [x] Media — (descartado: el + ya no es problema en ninguna parte, según el usuario) Sprints: el tablero se apila en columnas verticales y funciona, pero el + tapa las tarjetas.

### Escuela

- [ ] **Alta** — El horario de clases mide 720 px y solo se ven Lunes y Martes. Mejor una vista por día en teléfono.
- [x] Media — Pestañas en dos renglones (Calificaciones baja sola).
- [x] Media — No se llega a Escuela desde la barra ni desde "Más".

### Escritos

- [x] Media — Las pestañas del mundo miden 804 px (más del doble del ancho) y se deslizan sin pista.
- [ ] Media — El resumen del mundo tiene otra fila que se desliza (782 px).
- [ ] Pendiente — Revisar el editor de páginas, las fichas y el mapa con el teclado abierto.

### Recordatorios

- [x] Media — (descartado: el + ya no es problema en ninguna parte, según el usuario) El "25" y el + tapan los íconos de alarma de la derecha.
- [x] Media — No se llega a Recordatorios desde la barra ni desde "Más" (solo por la campana o Inicio).

### Perfil

- [x] Media — Pestañas cortadas ("Preferencias") y con el texto partido en dos renglones.
- [x] Media — (descartado: el + ya no es problema en ninguna parte, según el usuario) El + tapa los temas de color de la derecha (Bosque, Arena).

### Papelera

- [x] **Alta** — (hecho: botones en un segundo renglón; falta probarlo en el teléfono) Los nombres se reducen a una letra ("B…") y la descripción queda de una palabra por renglón, porque "Restaurar" ocupa casi toda la fila (`features/trash/components/TrashView.module.css`, `.row` en móvil). Poner "Restaurar" debajo o como ícono.
- [ ] Baja — Los filtros ocupan 3 renglones.

### Menú "Más", captura rápida y avisos

- [ ] Pendiente — Con el + abierto, revisar que la hoja quepa entera con el teclado arriba.
- [ ] Pendiente — Revisar el panel de avisos y la búsqueda en teléfono.

## Segunda ronda (2026-11-18, dicho por la usuaria)

Nota sobre los botones flotantes: **ya no es un problema en ninguna parte** (confirmado por el usuario): el contenido deja espacio al final de la lista y el "25" se mete debajo del "Más" al hacer scroll. Los pendientes de abajo que solo hablaban del + o del "25" tapando algo se marcaron como descartados.

- [x] **Alta** — (hecho, opción A; falta probarlo en el teléfono) Barra inferior sin "Más": muestra las primeras 5 secciones del orden de la persona (Perfil → Mis secciones); las demás van en el menú del avatar. Con 5 o menos se muestran todas, y con 1 sola no hay barra. Resuelve de paso que Escuela y Recordatorios no tengan acceso.
- [x] **Alta** — (hecho: `position: sticky` + degradado + `viewport-fit=cover`; falta probarlo en el teléfono) La barra superior se esconde con un poco de scroll en el teléfono. Debe quedarse fija, sin sobreponerse a la cámara ni a la hora del sistema (zona segura: `env(safe-area-inset-top)` y `viewport-fit=cover`).
- [ ] Media — Al cambiar de pestaña y volver, no se conserva dónde se había dejado el scroll. Guardar la posición por pantalla. Es complicado: probar primero en una pantalla.
- [x] Media — (hecho: la búsqueda oculta Esc, Enter y flechas en pantallas táctiles con `@media (hover: none)`; "Ctrl+K" pasó de la etiqueta a un tooltip) Quitar los textos de atajos de teclado de PC (por ejemplo "Ctrl+K" y las teclas en la búsqueda) cuando se usa el teléfono. Decidir si la función de esos atajos hace falta como botón táctil y cómo se implementa.

**Opciones para la barra inferior** (por decidir):
1. Barra con 4 secciones fijas + un botón que abre una hoja con todas (es "Más" otra vez, pero con todo adentro).
2. Barra de 5 con las más usadas (Inicio, Tareas, Agenda, Día a día, Finanzas) y el resto en el menú del perfil, arriba.
3. Barra que se desliza de lado mostrando todas las secciones con ícono (como las pestañas), con la activa siempre a la vista.

## Orden sugerido

Empezar por lo que arregla varias pantallas a la vez, todo en la rama `movil`.

1. Botones flotantes: que no tapen contenido en ninguna pantalla.
2. Filas de Tareas y Papelera: nombre completo, con los datos en un segundo renglón.
3. (Hecho: `components/ui/ScrollTabs`, usado por Día a día, Finanzas, Proyectos, Escritos, Perfil y Escuela; falta probarlo en el teléfono.) Un solo componente de pestañas para el teléfono: un renglón, con pista de que se desliza.
4. Horario de Escuela y Menú semanal: vista de un día a la vez (hecho en los dos).
5. Tabla de Membresías como tarjetas (hecho).
6. Áreas de toque de 44 px.
7. (Hecho en móvil: entran con `navModules(sections, { mobile: true })`. Para el escritorio, propuesta a Celeste en `para-celeste.md`.)
8. Revisar lo marcado como Pendiente, con letra grande y en modo oscuro.

Ya corregido: `apps/web/next.config.ts` permite abrir el modo demo desde el teléfono por Wi-Fi (`allowedDevOrigins`). Sin eso las pantallas cargaban vacías.

## Cosas que solo se ven con hover (auditoría 2026-11-18)

En el teléfono no hay hover: todo lo que aparece solo al pasar el mouse hay que mostrarlo siempre. Regla: `@media (hover: none)` (ya la usa Recordatorios).

- [x] Flecha de los enlaces de tarjeta ("Día a día ›", `CardLink`) — se ve siempre en táctil.
- [x] Botón de borrar en la lista de Tareas (`TaskList.module.css`) y en el tablero (`TaskBoard.module.css`) — se ve siempre, a la derecha de la fila.
- [x] Botón "hecho" de Recordatorios — ya estaba resuelto.
- [ ] Revisar a mano en el teléfono: fondo de las filas y píldoras que cambian con `:hover` (solo estética, no esconden nada).
- [x] Media — (hecho, falta probar en el teléfono) Píldoras con varios botones (`Segmented`: Área, Estado, Repetir, Vista, Filtrar…) siempre en una línea que se desliza con desvanecido y 44 px de toque; y las barras de pestañas ya no hacen scroll vertical.
- [x] Media — (hecho, falta probar en el teléfono) Filas de chips (filtros de Papelera y Personajes, "¿Cuándo?" de captura rápida, prioridad de tareas, categoría de movimientos, etiquetas del diario, días de la materia, chips de Inicio) en una sola línea que se desliza con desvanecido (`ChipRow`) y 44 px de toque con el dedo.
- [x] Media — (hecho, falta probar en el teléfono) Finanzas completo con lo ya hecho: selector de mes centrado y acción ("Movimiento", "Agregar membresía") en su fila a todo el ancho; Resumen con las cuatro cifras en dos por dos; detalle de los movimientos en dos renglones en vez de cortarse; Ahorros y deudas con el monto y los botones repartidos; tarjetas de Membresías en una fila que se desliza con desvanecido; botes de basura, muestras de color y categorías a 44 px con el dedo.
- [x] Baja — (hecho, falta probar en el teléfono) Presupuesto: "Así vas" va primero en una sola columna (tableta y teléfono), antes de las categorías.
