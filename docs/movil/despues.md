# Después: versión de teléfono al 2026-11-23

Las mismas pantallas de `antes.md`, tomadas después de los arreglos de la rama `movil` (hasta el commit `d227162`). Cada fila pone el antes a la izquierda y el después a la derecha, con el mismo número.

- **Cómo se tomaron:** Edge sin ventana simulando un teléfono (pantalla táctil, al doble de resolución) contra `pnpm dev:demo`. Las del teléfono real del antes (04 y 05) se repitieron a 412 px, que es el ancho del S24 Ultra, no en el teléfono.
- **Tema:** igual que en el antes: Inicio y Perfil › Preferencias en claro, lo demás en oscuro.
- **Datos:** el antes es del miércoles 18 de noviembre y el después del lunes 23, así que fechas, días y algunos números del modo demo no coinciden.
- El aviso "N" de Next.js en desarrollo se escondió para estas capturas: no es parte de la app.
- La 02 y la 03 (arreglo del modo demo por Wi-Fi) no tienen después: la 03 ya era el después de la 02.

## Lo que cambió en todas las pantallas

- **El pomodoro "25" ya no flota:** pasó al reloj del encabezado, junto a la lupa. Solo queda el + flotante, y las listas dejan espacio al final para que no tape lo último.
- **Barra de abajo:** las primeras cinco secciones del orden de la persona (en el demo: Inicio, Tareas, Proyectos, Agenda y Finanzas). Ya no hay botón "Más": las demás secciones están en el menú del avatar (23).
- **Pestañas en una sola fila:** la activa muestra ícono y nombre, las demás solo el ícono (Perfil, Finanzas, Proyectos, Escuela, Escritos, Día a día). Las que son texto (proyecto y mundo) se deslizan con un desvanecido en el borde.
- **Encabezados y títulos fijos al hacer scroll:** el logo y los íconos se quedan arriba, y los títulos largos bajan de renglón en lugar de cortarse.

## Inicio

| # | Antes | Después | Qué cambió |
| --- | --- | --- | --- |
| 01 | <img src="antes/01-inicio-375px.jpg" width="220"> | <img src="despues/01-inicio-375px.jpg" width="220"> | Las tres tarjetas de números quedan en una fila de tres. Ya no aparece el "25" sobre "Pendientes de hoy". |
| 04 | <img src="antes/04-inicio-telefono-pendientes.jpg" width="220"> | <img src="despues/04-inicio-telefono-pendientes.jpg" width="220"> | Se ven las cinco tareas de hoy con sus flechas y "Ver todas en Tareas". Nada flota encima de la tarjeta. |

## Perfil

| # | Antes | Después | Qué cambió |
| --- | --- | --- | --- |
| 05 | <img src="antes/05-perfil-telefono-preferencias.png" width="220"> | <img src="despues/05-perfil-telefono-preferencias.jpg" width="220"> | "Preferencias" se lee completa y las otras pestañas quedan como íconos. Los 14 temas de color se ven sin nada encima. |
| 06 | <img src="antes/06-perfil-360px.jpg" width="220"> | <img src="despues/06-perfil-360px.jpg" width="220"> | "Mi perfil" ya no se parte en dos renglones. "Guardar cambios" queda solo, sin el "25" al lado. |

## Tareas

| # | Antes | Después | Qué cambió |
| --- | --- | --- | --- |
| 07 | <img src="antes/07-tareas-360px.jpg" width="220"> | <img src="despues/07-tareas-360px.jpg" width="220"> | Los nombres se leen completos (en dos renglones si hace falta) y la prioridad y la fecha bajan debajo del nombre. |
| 08 | <img src="antes/08-tareas-360px-lista.jpg" width="220"> | <img src="despues/08-tareas-360px-lista.jpg" width="220"> | En toda la lista se lee el nombre de cada tarea en lugar de 5 o 6 letras. |
| 09 | <img src="antes/09-tareas-320px-lista.jpg" width="220"> | <img src="despues/09-tareas-320px-lista.jpg" width="220"> | A 320 px se siguen leyendo los nombres completos, no "T…". Mientras se desliza, el + puede quedar sobre el bote de basura de una fila. |

## Agenda y Día a día

| # | Antes | Después | Qué cambió |
| --- | --- | --- | --- |
| 10 | <img src="antes/10-agenda-360px.jpg" width="220"> | <img src="despues/10-agenda-360px.jpg" width="220"> | Las tareas de "Todo el día" se leen completas. Día, Semana y Mes comparten fila con "Filtrar". La columna de horas ya no tiene botones encima. |
| 11 | <img src="antes/11-dia-a-dia-menu-semanal-360px.jpg" width="220"> | <img src="despues/11-dia-a-dia-menu-semanal-360px.jpg" width="220"> | El menú semanal se ve día por día: se elige el día arriba y sus comidas salen en tarjetas anchas, de un renglón. El botón de cuadrícula vuelve a la vista de la semana. Las pestañas ya no se cortan. |

## Finanzas

| # | Antes | Después | Qué cambió |
| --- | --- | --- | --- |
| 12 | <img src="antes/12-finanzas-resumen-360px.jpg" width="220"> | <img src="despues/12-finanzas-resumen-360px.jpg" width="220"> | Las pestañas caben (Resumen y cuatro íconos). Las cuatro tarjetas van en 2 × 2, sin el "25" encima. |
| 13 | <img src="antes/13-finanzas-membresias-360px.jpg" width="220"> | <img src="despues/13-finanzas-membresias-360px.jpg" width="220"> | Las tarjetas se deslizan de lado y ya no se apilan. El + no tapa el monto de ninguna, y las membresías aparecen justo abajo. |

## Proyectos

| # | Antes | Después | Qué cambió |
| --- | --- | --- | --- |
| 14 | <img src="antes/14-proyectos-360px.jpg" width="220"> | <img src="despues/14-proyectos-360px.jpg" width="220"> | Los filtros van en una sola fila (Todos y tres íconos). La tarjeta del proyecto no tiene botones encima. |
| 15 | <img src="antes/15-proyecto-sprints-360px.jpg" width="220"> | <img src="despues/15-proyecto-sprints-360px.jpg" width="220"> | Resumen, Sprints y Archivos caben completas. "Cerrar Sprint 2" ocupa todo el ancho. |
| 16 | <img src="antes/16-proyecto-tablero-sprint-360px.jpg" width="220"> | <img src="despues/16-proyecto-tablero-sprint-360px.jpg" width="220"> | El tablero va por columnas apiladas (Por hacer, En curso, Hecho) con flechas para mover cada tarea. El + roza el contador de "Hecho". |

## Escuela

| # | Antes | Después | Qué cambió |
| --- | --- | --- | --- |
| 17 | <img src="antes/17-escuela-horario-360px.jpg" width="220"> | <img src="despues/17-escuela-horario-360px.jpg" width="220"> | El horario es una lista por día (Lunes, Martes, Miércoles…) en lugar de una tabla con dos días a la vista. Las pestañas caben en una línea, y "Calificaciones" ya no baja sola de renglón. |

## Escritos

| # | Antes | Después | Qué cambió |
| --- | --- | --- | --- |
| 18 | <img src="antes/18-escritos-mundos-360px.jpg" width="220"> | <img src="despues/18-escritos-mundos-360px.jpg" width="220"> | Las pestañas de Escritos caben: "Mundos 1" con su nombre y las demás como íconos. |
| 19 | <img src="antes/19-escritos-mundo-resumen-360px.jpg" width="220"> | <img src="despues/19-escritos-mundo-resumen-360px.jpg" width="220"> | Las pestañas del mundo se quedan pegadas arriba al hacer scroll y se nota que se deslizan. La sinopsis se lee completa, sin el + encima. |
| 20 | <img src="antes/20-escritos-linea-del-tiempo-360px.jpg" width="220"> | <img src="despues/20-escritos-linea-del-tiempo-360px.jpg" width="220"> | La pestaña activa ("Línea del tiempo") queda centrada a la vista. |

## Recordatorios, Papelera y menú "Más"

| # | Antes | Después | Qué cambió |
| --- | --- | --- | --- |
| 21 | <img src="antes/21-recordatorios-320px.jpg" width="220"> | <img src="despues/21-recordatorios-320px.jpg" width="220"> | Ya no está el "25", así que las alarmas de las primeras filas se ven. Mientras se desliza, el + puede quedar cerca de la alarma de una fila. |
| 22 | <img src="antes/22-papelera-320px.jpg" width="220"> | <img src="despues/22-papelera-320px.jpg" width="220"> | Nombre y descripción ocupan el ancho y "Restaurar" baja a su propia línea. Los filtros por tipo pasaron a "Filtrar". |
| 23 | <img src="antes/23-menu-mas-360px.jpg" width="220"> | <img src="despues/23-menu-mas-360px.jpg" width="220"> | La hoja "Más" se reemplazó por el menú del avatar, que ahora sí trae Escuela y Recordatorios, además de Escritos, Día a día, Mi perfil y Papelera. |
