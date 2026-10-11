# Funcionalidades por sección

Fuente: el documento "Mi tablero · Funcionalidades y base de datos" del usuario. Las decisiones de `docs/guides/decisions.md` mandan sobre este archivo cuando no coinciden (por ejemplo, el login). Lo marcado como **fase posterior** no se construye todavía (ver `docs/guides/roadmap.md`).

## Cuenta y perfil

- **Entrar:** correo + contraseña, luego código de 6 dígitos al correo. Olvidé mi contraseña. Sin registro abierto: solo por invitación.
- **Bienvenida** en 4 pasos: nombre → qué secciones quieres → orden de las secciones → listo.
- **Perfil:** nombre y avatar; Mis secciones (prender, apagar, reordenar); Preferencias; Cuenta. Conexiones (Notion, Canva, Spotify, Claude) es **fase posterior**.
- **Preferencias:** zona horaria, la semana empieza lunes o domingo, formato de hora, apariencia (claro, oscuro, sistema; **oscuro es fase posterior**), horas de silencio, adornos de temporada, fecha de cumpleaños.
- **Cuenta:** PIN del diario, cambiar contraseña, sesiones abiertas y cerrar todas, borrar la cuenta escribiendo BORRAR. Respaldo y exportar es **fase posterior**.

## Inicio

- Saludo con la fecha, conteo de pendientes y pagos de la semana; cambia con la temporada.
- Tarjetas que se prenden o apagan con "Ajustar mi Inicio": Pendientes de hoy, Esta semana, Ahora en tu rutina, Metas, Menú de hoy, Próximos pagos, Proyectos, Recordatorios.
- Pendientes marcables con un clic; al picarlos se abre su panel de detalle.

## Tareas y proyectos

- Tareas en lista o tablero (Por hacer, En curso, Hecho), con prioridad, fecha, proyecto, subtareas y filtro por proyecto.
- Las **notas rápidas** son tareas: pendientes marcables que se abren con más detalle.
- Nueva tarea en panel lateral; captura rápida desde cualquier pantalla con el botón +.
- Proyectos con portada, tipo (trabajo, personal, escuela), estado, objetivos, avance, fecha meta, enlaces y notas.
- Pestañas del proyecto: Resumen; Sprints (sprint activo con meta y días, tablero, backlog, cerrar sprint pasando lo pendiente al siguiente o al backlog, notas, historial); Archivos (subir, filtrar, descargar, borrar, enlaces, espacio usado).

## Agenda y recordatorios

- Vistas Día, Semana y Mes. El día muestra la línea de "ahora" y los huecos libres para agregar algo.
- En la misma agenda: eventos de trabajo y personales, pagos de membresías y tareas con fecha, con filtros.
- Nuevo evento, detalle, mover de día y borrar.
- Recordatorios con fecha y hora; avisos en la app y en el navegador (nunca por correo); lo no atendido pasa al día siguiente; respetan las horas de silencio.

## Día a día

- Hoy: la rutina en bloques, el bloque actual y el siguiente, marcar lo hecho.
- Editar rutina por día de la semana y fin de semana.
- Reporte del día y de la semana.
- Menú semanal: desayuno, comida y cena por día.
- Diario con estado de ánimo, protegido con PIN.
- Metas con avance en porcentaje.

## Finanzas (solo pesos)

- Pestañas: Resumen, Movimientos, Ahorros y deudas, Membresías, Presupuesto.
- Ingresos y gastos con categoría y tarjeta; "te queda" del mes y gráfica de 6 meses.
- Ahorros con meta y aportes o retiros; deudas con pagos y aviso cuando se liquidan.
- Membresías con la tarjeta que las paga, cobro mensual o anual y próximos cobros. Borrar una tarjeta pregunta qué hacer con sus membresías.
- Presupuesto con límite por categoría y aviso al pasarse.

## Escritos

- Estilo de libro: Historias (lomos con capítulos y estado), Notas (tarjetas con imágenes), Personajes y Mundos.
- Páginas con bloques al estilo Notion (Tiptap): menú "/", encabezados, listas, imagen, galería y portada.
- Base de datos de personajes en tabla, galería o tablero, con propiedades propias.
- Palabras escritas en la semana contra una meta.

## Escuela

- Antes de empezar: cuenta regresiva y lista de preparación.
- Durante el semestre: horario, materias, entregas y calificaciones.

## Música, enfoque y atajos

- Reproductor flotante con el pomodoro y la tarea en curso. Spotify es **fase posterior** (integraciones).
- Buscar con Ctrl+K, panel de avisos y captura rápida.

## Lo que aplica a todo

Borrar con papelera de 30 días, estados vacíos con acción, reglas de carga y de errores: ver `docs/guides/design.md`. Adornos de temporada: ver `docs/guides/theming.md`.
