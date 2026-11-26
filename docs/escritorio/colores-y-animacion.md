# Colores, estados y animación (versión de escritorio)

Bitácora de los cambios del 2026-11-25 (rama `feat/escritorio-estados-y-animacion`, un commit por tema). La meta que pidió Celeste: que la app se sienta **de confianza y con calidez**. La paleta crema, tinta y lavanda ya iba por ahí; lo que fallaba era que los estados no eran parejos (pasar el mouse, foco, elegido, deshabilitado, presionar) y que el movimiento no era el mismo en CSS y en Motion.

**Cada cambio dice qué era, qué es, por qué, dónde y cómo volver atrás.** Los marcados con ⚠ se apartan del canvas o de una decisión registrada: son los primeros que Celeste debe revisar. Casi todo vive en una sola variable, así que volver atrás es cambiar una línea.

## Capturas

`antes/` y `despues/` tienen las mismas pantallas con el mismo número (1366 px de ancho, demo).

| # | Qué muestra | Cambios |
|---|---|---|
| 01 | Menú de arriba en oscuro, con "Tareas" activa y el mouse sobre "Proyectos" | 3 |
| 02 | Tareas en oscuro: "Lista" elegida | 3 |
| 03 · 04 | Campo "Nombre" con foco, claro y oscuro | 4 |
| 05 · 06 | "Cerrar todas las sesiones" en Perfil, claro y oscuro | 1 |
| 07 · 08 | Presupuesto del mes ("te pasaste"), claro y oscuro | 1 |
| 09 · 10 | Eventos de la semana y Agenda en oscuro | 2, 3 |
| 11 | Botón secundario "Hoy" con el mouse encima | 6 |
| 12 · 13 | Inicio completo, claro y oscuro (para ver que lo demás no cambió) | — |
| 14 · 15 | Tema Salvia + Teñido (claro) y Lavanda + Intenso (oscuro) | 2, 3 |

Lo que se mueve (rebotes, presionar) no sale en una captura. Por eso está grabado en `animaciones/` (ver "Animaciones grabadas"). Para sentirlo a mano: levanta el demo de antes y el de ahora lado a lado (ver "Comparar a mano" al final).

### Animaciones grabadas

`animaciones/comparar.html` se abre con doble clic, sin servidor (pesa 2,2 MB porque lleva los cuadros adentro). Muestra antes y después lado a lado, a velocidad normal, a ½ o a ¼, con una barra para ir cuadro por cuadro. Cada `.png` de la carpeta es la misma escena como tira de cuadros: los cuadros a los 0, 40, 80… 600 ms, con «Antes» arriba y «Después» abajo.

Se grabó en el demo (claro, 1366 px) con el screencast de Edge, a unos 100 cuadros por segundo y con acercamiento de 4×. El giro, la escala o el desplazamiento se midieron en la página cuadro por cuadro, y coinciden con la fórmula de cada curva:

| # | Escena | Qué cambió | Antes | Después |
|---|---|---|---|---|
| 01 | Interruptor (Finanzas › Movimiento) | Punto 11: 200 ms `ease` → 380 ms `--ease-spring` | sin pasarse, quieta a ~290 ms | se pasa 3 %, quieta a ~430 ms |
| 02 | «+» de Pendientes de hoy (gira 90°) | Punto 10: `SPRING.pop` | se pasa 18 % (106°), quieto a ~390 ms | se pasa 4,5 % (94°), quieto a ~300 ms |
| 03 | Logo (gira -25°) | Punto 10: `SPRING.pop` | se pasa 18 % (-29°), ~400 ms | se pasa 4,5 % (-26°), ~300 ms |
| 04 | Ícono del menú de arriba (se inclina 6°) | Punto 10: `--ease-spring` | se pasa 11 %, ~170 ms | se pasa 3 %, ~170 ms |
| 05 | «X» de un cajón (gira 90°) | Punto 10: `--ease-spring` | se pasa 11 % (100°), ~170 ms | se pasa 3 % (92°), ~170 ms |
| 06 | Marcar un pendiente | Puntos 8 y 11: presionar y hover | se hunde a 0.86 | se hunde a 0.92, borde con acento al pasar el mouse; el check igual |

"Quieto" es cuando ya no se aleja más de 2 % de donde termina. Se midió con una muestra cada ~30 ms, así que esos tiempos son aproximados.

De la segunda revisión (puntos 12 y 13) hay dos tiras más, en `.jpg` y fuera de `comparar.html`. Aquí "Antes" es esta misma rama antes del arreglo, no `fa5a5ac`:

| # | Escena | Antes | Después |
|---|---|---|---|
| 07 | Esta semana: tocar otro día (punto 12) | la píldora cruza tapando los otros días, las dos listas se enciman y la tarjeta se estira | el día se oscurece en su lugar; salen los eventos de antes y luego entran los nuevos (los dos días ocupan el mismo alto) |
| 08 | Pendientes de hoy: marcar uno (punto 13) | el aro arranca ~250 ms después del clic y los números saltan | el aro arranca ~40 ms después y los números se desvanecen |
| 09 | Esta semana: de un día con 4 eventos a uno con 1, con la vecina y la fila de abajo (punto 12) | — (solo "Después") | las dos tarjetas se acortan juntas en ~380 ms y la fila de abajo sube con ellas; el encabezado y los días no se mueven |

### Todas las animaciones que cambiaron

- **Se pasan menos** (`SPRING.pop`, damping 22 → 32; punto 10):
  - El logo (gira -25°) y el avatar del menú de arriba.
  - El «+» de Pendientes de hoy (gira 90°).
  - La estrella de Pendientes de hoy al aparecer. Es adorno: si se prefiere que rebote, va con `SPRING.celebrate`. Al terminar todos los pendientes sigue celebrando igual.
  - El «+» flotante de Captura rápida y su anillo.
  - El ícono de "Ajustar" de Inicio, los íconos de sus chips y las iniciales de la tarjeta de Proyectos.
  - El ícono de los modales, el pomodoro compacto, los íconos de la barra del teléfono y el menú «Más secciones» de un mundo de Escritos.
- **Se pasan menos** (`--ease-spring`, de `(0.3, 1.6, 0.5, 1)` a `(0.34, 1.3, 0.64, 1)`; punto 10):
  - Los íconos del menú de arriba, que se inclinan al pasar el mouse.
  - La «X» de los 10 cajones con formulario: evento, bloque, meta (detalle y formulario), movimiento, sprint, materia, tarea (nueva y detalle) y escrito.
  - El botón de acción de Recordatorios al aparecer.
  - La perilla del interruptor, que además dura más (punto 11).
- **Siguen rebotando igual** (ahora con su propio nombre, `SPRING.celebrate` y `--ease-celebrate`):
  - El check de una casilla y el check del menú del día.
  - La estrella de una meta cumplida y "Liquidado" en Ahorros y deudas.
  - El rayo de Tareas, el sol del saludo, el doodle del título y los doodles.
- **Presionar** (punto 8): 12 lugares pasan a `PRESS`. Botones y chips 0.97, botones de ícono 0.92 y tarjetas 0.985. Entre ellos, la casilla (0.86 → 0.92). Además, los botones secundario, fantasma y simple y el segmentado se oscurecen al presionarlos.
- **Curva y duración de 238 transiciones de CSS** (punto 9): `ease` → `--ease-out`, y las duraciones sueltas a los tokens. Tres de 250 ms pasaron a 200 ms. Es la diferencia más fina: el cambio de color o borde llega un poco antes y se asienta más suave.
- **Detalles:**
  - El velo detrás de cajones y modales usa la curva de Kairo en vez de `easeOut`.
  - Al enfocar un campo, el halo de foco aparece con transición.
  - El botón principal sube 1 px y cambia un poco de tono al pasar el mouse.
  - La tarjeta de meta sube 2 px en vez de 3.
- **Segunda revisión** (puntos 12 a 15):
  - El día elegido de "Esta semana" se oscurece en su lugar, sin viajar. Los eventos de antes salen en 100 ms y luego entran los nuevos.
  - Las tarjetas de Inicio ya no se estiran al cambiar de alto. "Esta semana" se alarga o se acorta suave (380 ms) cuando el día nuevo tiene más o menos eventos.
  - El aro de Pendientes de hoy y las barras de avance responden sin esperar cuando cambian. Al cargar se dibujan igual que antes.
  - Los números que cambian en su lugar se desvanecen (`Swap`), en 9 lugares.
  - El menú de arriba se queda fijo al bajar y su fondo aparece con un desvanecido.

## Cambios

### 1. ⚠ Rojo suave para lo que se puede deshacer

- **Antes:** todo botón de peligro era rojo lleno (`--danger` con texto `--on-danger`): confirmar borrar una tarea, un evento, un proyecto, una materia, una página, y también "Cerrar todas las sesiones". La barra de "te pasaste" en Finanzas era ladrillo puro (#8c2f1b).
- **Ahora:**
  - `variant="danger"` es **rojo suave**: fondo `--danger-soft`, texto `--danger` y un hover un paso más fuerte (`--danger-soft-hover`). Lo usan todas las confirmaciones de borrar, que mandan a la papelera y tienen "Deshacer", y "Cerrar todas las sesiones", que no borra nada.
  - El **rojo lleno** queda solo para lo irreversible, con la variante nueva `dangerSolid`: "Vaciar papelera" y "Borrar para siempre".
  - Las barras de error ("te pasaste" y los días que le quedan a algo en la papelera) usan `--danger-fill`, el rojo mezclado con un poco de la tarjeta. Es más cálido. El texto que lo explica sigue en `--danger`.
  - Los botones de "Borrar personaje" y "Sí, borrar" de Escritos pasaron al rojo suave por la misma razón.
- **Por qué:** el rojo lleno en algo que se puede deshacer se siente como alarma, no como confianza. La gravedad del color ahora coincide con la de la acción.
- **Dónde:** `components/ui/Button.module.css` y `Button.tsx`, `features/trash/components/TrashView.tsx` (las dos de `dangerSolid`), `components/ui/Progress.module.css`, `TrashView.module.css` (`.barSoon`), `CharacterPeek.module.css` y `world/EntryPanel.module.css`, y `--danger-fill` en `styles/states.css`.
- **Choca con:** `Borrar.dc.html` y `Perfil.dc.html`, que pintan el botón de borrar en rojo lleno.
- **Para volver:** en `Button.module.css`, dejar `.danger` como `.dangerSolid` (fondo `var(--danger)`, texto `var(--on-danger)`). En `states.css`, `--danger-fill: var(--danger)`.

### 2. ⚠ Morado más calmado en modo oscuro

- **Antes:** los rellenos de acento en oscuro usaban el tono puro del tema: `--accent-soft` el 900 (#28235c en lavanda: eventos, íconos de tarjetas, chips) y `--accent` el 600 (#6a62d6: casillas marcadas, "+", chips de Agenda). Sobre casi negro se veían morado eléctrico, fríos.
- **Ahora:** `--accent-soft` mezcla el 900 a la mitad con el neutro cálido de oscuro (`--night-200`), y queda #27243f en lavanda. `--accent` mezcla el 600 al 85 % con `--night-300`. El texto encima no cambió y sigue arriba de 8:1.
- **Por qué:** la calidez. Los mismos morados, un poco apagados hacia el café casi negro de la app.
- **Dónde:** `styles/modes/dark.css`. Sirve igual para los 12 temas, porque mezcla el tono del tema que esté activo.
- **Choca con:** la **decisión #58**: Celeste eligió el fondo suave en tono 900 con texto 200, como en `Temas.dc.html`.
- **Nota:** con **Intenso** en oscuro, la tarjeta destacada y los eventos de trabajo siguen en el 900 puro (eso es Intenso a propósito). Por eso ahora se distinguen más de los eventos con acento suave (captura 15).
- **Para volver:** en `dark.css`, `--accent-soft: var(--p-900)` y `--accent: var(--p-600)`.

### 3. ⚠ Lo elegido se distingue de lo que tiene el mouse encima (sobre todo en oscuro)

- **Antes:** lo elegido (la sección activa del menú, la opción de un segmentado, las pestañas, el día elegido, los chips marcados) usaba `--surface-inverted`, el fondo de la tarjeta destacada. En claro es tinta y se ve bien. En oscuro es #2a2824, casi igual que pasar el mouse (hueso al 6 %): "Tareas" activa y "Proyectos" con el mouse encima se veían iguales (captura 01, antes).
- **Ahora:** dos variables nuevas, `--selected` y `--on-selected`.
  - En claro valen lo mismo que antes (`--surface-inverted` y su texto), así que el modo claro no cambia.
  - En oscuro son un velo del acento al 16 % sobre la tarjeta, más el anillo fino `--selected-ring` (el mismo que ya usaba el segmentado).
  - Se cambiaron 28 reglas: menú de arriba, Segmented, IconTabs, pestañas de Proyectos, Escritos y la rutina, día elegido de Inicio y de Agenda, chips y filtros elegidos de Día a día, Finanzas, Captura rápida, Papelera, Escritos, Escuela, Perfil y Bienvenida.
- **Por qué:** saber dónde estás es lo más básico de la confianza. La regla del canvas oscuro ("la lavanda solo en lo principal y lo activo") ya lo pedía.
- **Dónde:** `styles/modes/light.css` y `dark.css` (las variables) y cada `.module.css` de la lista.
- **Choca con:** `OscuroTareas.dc.html` y `OscuroMain.dc.html`, que pintan la sección activa con #2a2824.
- **Para volver (solo oscuro):** en `dark.css`, `--selected: var(--surface-inverted)` y `--on-selected: var(--text-on-inverted)`.
- **También en el teléfono:** la barra de abajo (`BottomTabs`) tenía el mismo problema. La pestaña activa usaba `--surface-inverted` y en oscuro casi no se distinguía de la barra. Ahora usa `--selected` con su anillo, y presionar usa `PRESS.icon` (mismo 0.92 de antes). En claro no cambia. Se pidió aparte, después de la parte de escritorio.

### 4. Foco de los campos: halo pegado al campo

- **Antes:** al escribir en un campo (Input, Select, Textarea) salía un contorno de 2 px separado del campo por 1 a 3 px. Se veía técnico.
- **Ahora:** el borde del campo toma el color de foco (`--focus-ring`) con un halo suave de 3 px (`--focus-halo`, el mismo color al 24 %). Los botones y enlaces conservan el contorno separado del canvas.
- **Por qué:** más cálido y más claro dónde vas a escribir. Sigue siendo visible por teclado: el borde lavanda contrasta más de 3:1.
- **Dónde:** `components/ui/Input.module.css`, `Select.module.css`, `Textarea.module.css`.
- **Para volver:** cambiar el bloque `:focus-visible` de esos tres por `outline: 2px solid var(--focus-ring); outline-offset: 3px;` y quitar `box-shadow`.

### 5. Los campos responden al pasar el mouse

- **Antes:** Input y Textarea no cambiaban. Select cambiaba a `--text-subtle`, que es el mismo gris del borde, así que tampoco se notaba.
- **Ahora:** el borde se oscurece un paso (`--border-input-hover`; en oscuro, se aclara).
- **Dónde:** los mismos tres archivos.

### 6. Pasar el mouse: oscurecer, nunca aclarar (y que se note en oscuro)

- **Antes:** había cuatro tonos de hover según el componente. Además:
  - El botón **secundario** ("Hoy" en Agenda, "Periodo" en Escuela…) cambiaba su fondo por uno translúcido y se **aclaraba**.
  - En 13 lugares el hover cambiaba un fondo opaco por uno translúcido, que en oscuro quedaba **del mismo color**. Pasaba en los menús "···" de Proyectos y del editor, "Cancelar" del formulario de proyecto, las tarjetas del tablero de personajes, los cambios de vista de Menú y Horario, los botones suaves de Escritos, las acciones de la tarjeta oscura de Agenda y los avisos sin leer. Un aviso sin leer incluso perdía su tinte de "sin leer".
- **Ahora:** `styles/states.css` arma cada hover con la misma receta: la superficie de siempre con un poco del color de su texto. En claro oscurece; en oscuro aclara. Sirve para los 12 temas y las 3 intensidades sin repetir valores:
  - Variables: `--surface-card-hover`, `--surface-raised-hover`, `--surface-muted-hover`, `--surface-inverted-hover`, `--surface-inverted-muted-hover`, `--accent-soft-hover`, `--action-hover` y `--selected-hover`.
  - El botón principal ahora también aclara un poco su color al pasar el mouse (antes solo se levantaba).
- **Dónde:** `styles/states.css` (nuevo, importado en `app/globals.css` después de los modos) y las reglas de los 13 lugares.
- **Para volver:** cada variable es una línea en `states.css`.

### 7. Deshabilitado con una sola opacidad

- **Antes:** 0.35, 0.4, 0.5 o 0.6 según el archivo.
- **Ahora:** `--opacity-disabled: 0.45` en 14 lugares, en los botones y en los campos.
- **Dónde:** `styles/tokens.css`.
- **Corrección a la revisión:** "Mostrar hechas" en Tareas parecía deshabilitado y lo está a propósito: en la vista de Tablero las hechas ya salen en su columna. No se cambió.

### 8. Presionar: la misma respuesta en toda la app

- **Antes:** en Motion había 9 escalas distintas al presionar (de 0.85 a 0.99), y en CSS casi nada reaccionaba (una sola regla `:active`).
- **Ahora:**
  - Presets en `lib/motion.ts` (`PRESS`), que repiten `--press-scale` y `--press-scale-icon`: botones y chips 0.97, botones de ícono 0.92 y tarjetas grandes 0.985.
  - El botón secundario, el fantasma, el simple y el segmentado se oscurecen al presionarlos (`--surface-press`, `--surface-muted-press`).
  - Los doodles y las caritas del Diario conservan su presión más profunda: son adorno.
- **Dónde:** `Button.tsx`, `Checkbox.tsx` (0.86 → 0.92), Topnav (avatar), Captura rápida (+), Pendientes de hoy (+), Inicio, Tareas, Agenda (días), Metas, Menú y Proyectos.

### 9. Una sola familia de curvas (CSS y Motion se mueven igual)

- **Antes:** 238 transiciones de CSS usaban la curva genérica `ease` y unas 60 duraciones escritas a mano (150, 180, 200, 220, 250 ms…). Motion ya usaba la curva propia de Kairo, así que lo de CSS y lo de Motion no se sentían igual.
- **Ahora:**
  - Todas usan `--ease-out`, la curva del canvas para paneles, y `--duration-fast`, `--duration-base` o `--duration-slow`. Se agregaron `--duration-press` y `--ease-in-out` para lo que vaya de un lugar a otro.
  - Se respetaron los tiempos propios: las cuentas regresivas (`1s linear`) y los trucos de `visibility`.
  - Las subidas al pasar el mouse usan `--lift-sm` (-1 px), `--lift-md` (-2 px) y `--lift-lg` (-4 px, la tarjeta de proyecto, como en el canvas).
- **Choca con:** el canvas usa `ease` en sus transiciones de estado. La diferencia apenas se ve; lo que cambia es que todo se asienta igual.
- **Dónde:** 88 archivos `.module.css` y `styles/tokens.css`.

### 10. ⚠ Rebote: calmado en lo funcional, juguetón solo al celebrar

- **Antes:** `--ease-spring` se pasaba 11 % de largo y `SPRING.pop` (damping 22) 18 %. `SPRING.pop` rebotaba lo mismo para un ícono de la interfaz que para el check de un pendiente. Ahora se pasan 3 % y 4,5 %, medido en la app (ver "Animaciones grabadas", escenas 02 a 05).
- **Ahora:**
  - La regla: **lo funcional se mueve calmado y predecible (confianza); solo lo que celebra o adorna rebota (calidez).**
  - `--ease-spring` pasa a `(0.34, 1.3, 0.64, 1)` y `SPRING.pop` a damping 32. Lo usan los íconos que aparecen, los menús, los chips de los cajones y la perilla de los interruptores.
  - El rebote de antes vive en `--ease-celebrate` y `SPRING.celebrate`, y lo usan: el check de una casilla, una meta cumplida, el check del menú del día, "Liquidado" en Ahorros y deudas, los doodles, el sol del saludo y el rayo de Tareas.
- **Para volver:** en `styles/tokens.css`, `--ease-spring: cubic-bezier(0.3, 1.6, 0.5, 1)`. En `lib/motion.ts`, `pop` con `damping: 22`.
- **Pendiente:** falta sentirlo a mano antes de decidir si se queda. Ya está grabado lado a lado en `animaciones/comparar.html`.

### 11. Detalles de componentes

- **Interruptor (Toggle):** la perilla llega con el asentamiento leve (`--ease-spring`, 380 ms) y se levanta un poco al pasar el mouse.
  - Antes eran 200 ms con `ease`, así que ahora tarda más: se queda quieta a los ~430 ms, contra ~290 ms antes (escena 01).
  - Si se siente lenta, en `components/ui/Toggle.module.css` el `.knob` vuelve a `transition: transform var(--duration-base) var(--ease-out)`.
- **Casilla (Checkbox):** al pasar el mouse por una vacía, el borde toma el acento (invita a marcarla).

## Segunda revisión

Arreglos a lo que se vio al probar la primera parte: el menú de arriba bajaba a una segunda línea, el aro tardaba en arrancar, los números cambiaban de golpe, el menú de arriba se perdía al bajar y "Esta semana" se veía rota al tocar otro día.

### 12. "Esta semana": tocar otro día

- **Antes:**
  - La píldora oscura del día elegido viajaba al día nuevo (`layoutId`). Como cada día es una tarjetita aparte, al cruzar tapaba los números de los días de en medio.
  - Los eventos del día anterior y los del nuevo se encimaban medio transparentes durante ~200 ms (`AnimatePresence mode="popLayout"`).
  - La tarjeta cambiaba de alto con una escala: la cuadrícula de Inicio usaba `layout` completo de Motion. El texto de "Esta semana" y de su vecina se veía estirado unos ~370 ms (una fila de texto medía 69 px en vez de 62) hasta llegar a su tamaño real.
- **Ahora:**
  - Cada día tiene su píldora. La del día que deja de estar elegido se desvanece (150 ms) y la del nuevo aparece con `SPRING.pop`.
  - Los eventos de antes se van en 100 ms (`--duration-press`) y luego entran los nuevos (260 ms, escalonados 40 ms). Se desplazan 16 px en vez de 28.
  - La cuadrícula y sus tarjetas usan `layout="position"`: al prender o apagar una tarjeta las demás siguen moviéndose a su lugar, pero sin escalar su tamaño. Nada se estira.
  - Al pasar a un día con más o menos eventos, la tarjeta se alarga o se acorta suave (380 ms, `--ease-out`). Empieza cuando ya se fueron los eventos de antes, a los ~120 ms del clic. El encabezado y los días no se mueven ni se deforman: lo único que cambia es el alto de la zona de eventos.
  - En el escritorio, "Pendientes de hoy" comparte la fila y cambia de alto junto con ella; lo de abajo sube o baja con el mismo movimiento. Entre dos días que caben en el mismo alto (la vecina es más alta que los dos) no se mueve nada. En el teléfono la tarjeta pasa, por ejemplo, de 533 a 260 px.
  - Presionar un día usa `PRESS.button` (0.97, antes 0.94).
- **Por qué:** era la animación que más se veía rota. Lo que cambia de contenido se cambia sin encimarse, y el tamaño no se anima con una escala, que estira el texto. Se anima el alto de una sola zona: es la excepción a "no animar `height`" de `theming.md`, porque la tarjeta tiene que cambiar de largo.
- **Cómo:** al tocar un día, la zona de eventos guarda el alto que se ve en ese momento. Cuando llega la lista nueva se mide su alto y el mínimo que pone la vecina de la fila, y la zona anima su alto de uno a otro (`useMotionValue` + `animate` en `WeekCard.tsx`). Al terminar vuelve a `auto`. Sin contar ese mínimo, parte de la animación pasaba escondida: al encogerse se veía casi de golpe (~55 ms) y al crecer tardaba ~270 ms en arrancar. Con "Reducir movimiento" el alto cambia directo.
- **Dónde:** `features/agenda/components/WeekCard.tsx` y `WeekCard.module.css`, `features/home/components/HomeView.tsx`. Tiras 07 y 09 en `animaciones/`.
- **Probado y descartado:** reservar siempre el alto del día con más eventos de la semana. Nada cambiaba de tamaño, pero los días con pocos eventos dejaban mucho espacio vacío (~300 px en el teléfono).
- **Para volver:**
  - En `WeekCard.tsx`, la píldora vuelve a ser una sola: `{isSelected ? <motion.span layoutId="week-selected" className={styles.dayPill} transition={SPRING.slide} /> : null}`.
  - Los eventos vuelven a `mode="popLayout"`, con `x: dir * 28` al entrar, 0.35 s y `stagger(0.05)`, y al salir `x: dir * -28` en 0.2 s.
  - En `HomeView.tsx`, `layout="position"` vuelve a `layout` (en la cuadrícula y en cada tarjeta). Con eso regresa el estirado.
  - Para que el largo cambie de golpe en vez de suave: en `WeekCard.tsx`, quitar `style={{ height: viewportHeight }}` de la zona de eventos.

### 13. El aro y los números responden al instante

- **Antes:**
  - Al marcar un pendiente, el aro de Pendientes de hoy esperaba 200 ms (el `delay` de su entrada) y luego se movía con el resorte lento (`SPRING.soft`). Arrancaba ~250 ms después del clic.
  - Las barras de avance (Metas) también repetían su entrada de 0.7 s con retraso en cada cambio.
  - Los números ("1/5" → "2/5", "Tienes 4 pendientes" → "3") cambiaban de golpe.
- **Ahora:**
  - El aro y las barras se dibujan igual que antes la primera vez. Después, un cambio se ve de inmediato: el aro con `SPRING.slide` y las barras en 380 ms (`--duration-slow`). El aro arranca ~40 ms después del clic y llega en ~150 ms.
  - Componente nuevo `Swap` (`components/ui/Swap.tsx`): el texto de antes se desvanece hacia arriba y el nuevo entra con un desenfoque leve de 2 px, en 200 ms. Si el número baja, se mueven al revés, como un contador. Los lectores de pantalla leen solo el valor actual.
  - `Swap` está en 9 lugares:
    - Inicio: el saludo ("Tienes 3 pendientes"; al llegar a cero cambia la frase completa) y el "2/5" de Pendientes de hoy.
    - Tareas: el resumen de arriba y las subtareas "2/5" de cada tarea.
    - Día a día: "Vas 3 de 5" y el avance de la rutina.
    - Proyectos: "3 de 8 tareas hechas" y el % del sprint, y el resumen del proyecto.
    - Recordatorios: el contador de pendientes.
  - Regla nueva en `docs/guides/theming.md` (Animación): nada cambia de golpe, y el retraso es solo para la entrada.
- **Por qué:** lo que hace la persona tiene que contestar de inmediato (confianza), y un número que se desvanece se siente cuidado (calidez).
- **Dónde:** `components/ui/Progress.tsx`, `components/ui/Swap.tsx` y `Swap.module.css` (nuevos), `features/home/components/HomeView.tsx` y `Greeting.tsx`, `TodayTasksCard.tsx`, `TasksView.tsx`, `TaskBits.tsx`, `daily/components/TodayCards.tsx` y `RoutineTimeline.tsx`, `projects/components/ProjectSprints.tsx` y `ProjectSummary.tsx`, `reminders/components/RemindersView.tsx`. Tira 08 en `animaciones/`.
- **Para volver:**
  - En `Progress.tsx`, el aro vuelve a `transition={{ ...SPRING.soft, delay: 0.2 }}` y la barra a `transition={{ duration: 0.7, ease: EASE_OUT, delay }}` (sin `entered`).
  - Un número sin `Swap`: cambiar `<Swap value={n} />` por `{n}`.

### 14. ⚠ El menú de arriba en una sola fila; lo que no cabe va al menú del avatar

- **Antes:**
  - Desde 1241 px, el nav centrado. Entre 1141 y 1240 px, entre el logo y los íconos.
  - Debajo de 1140 px el nav bajaba a una segunda fila propia, con scroll de lado si no cabía.
  - Escuela y Recordatorios no salían en el menú del escritorio (`inNav: false`).
- **Ahora:**
  - `Topnav.tsx` mide el nav cada vez que cambia el ancho: si cabe centrado de verdad, va centrado. Si no, va entre el logo y los íconos. Si tampoco cabe ahí, las últimas secciones se esconden de una en una.
  - La sección en la que estás nunca se esconde.
  - Las secciones escondidas aparecen en el menú del avatar, debajo de las de siempre. Ahí también están, en el escritorio, Escuela y Recordatorios, igual que en el teléfono.
  - En el demo (7 secciones en el nav): a 1366 y 1240 px va centrado; a 1100 px se esconde Día a día; a 1024 px, Escritos y Día a día; a 820 px, Agenda, Finanzas, Escritos y Día a día.
- **Por qué:** la segunda fila se veía rara y bajaba toda la página. Lo pidió quien revisó.
- **Dónde:** `app/(dashboard)/Topnav.tsx` (la medición y el menú del avatar) y `Topnav.module.css` (`data-nav-mode`, `.navLink[data-overflow]`, `.menuSectionsDesktop`).
- **Choca con:** `Main.dc.html` y los demás canvas de escritorio, que muestran siempre todas las secciones en el nav. En pantallas de 1241 px o más se ve igual que el canvas.
- **Para volver a la segunda fila:**
  - En `Topnav.tsx`, borrar el `useLayoutEffect` que llama a `setNavLayout`. Sin medir, no se esconde nada.
  - En `Topnav.module.css`, borrar los bloques `.header[data-nav-mode='side']` y el `@media (min-width: 721px) and (max-width: 1240px)` que los sigue, y poner de nuevo los de antes:

    ```css
    @media (min-width: 1141px) and (max-width: 1240px) {
      .header { grid-template-columns: auto minmax(0, 1fr) auto; }
      .nav { justify-self: center; }
    }

    @media (max-width: 1140px) {
      .header { grid-template-columns: minmax(0, 1fr) auto; }
      .nav { grid-column: 1 / -1; grid-row: 2; justify-self: center; max-width: 100%; overflow-x: auto; }
    }
    ```

  - Si además el menú se queda fijo (punto 15), `--topnav-height` tendría que sumar la segunda fila debajo de 1140 px.

### 15. ⚠ El menú de arriba se queda fijo al bajar (escritorio)

- **Antes:** en el escritorio el menú de arriba se iba con la página al bajar. Solo en el teléfono se quedaba fijo.
- **Ahora:**
  - Se queda arriba también en el escritorio.
  - Arriba de todo es transparente, así no corta el brillo del fondo. Al bajar toma el color de la página y abajo un desvanecido de 24 px, el mismo del teléfono. Aparece en 200 ms.
  - Capa nueva `--z-topnav: 40`: encima de los doodles pegados del saludo (30), debajo de la barra del teléfono (50). En el teléfono la barra estaba en 20, y por eso un doodle pegado pasaba por encima de ella al bajar; ahora pasa por debajo.
  - `--topnav-height` vale 74 px en el escritorio (antes 0). Lo que ya se quedaba pegado al bajar queda debajo del menú y no escondido: el panel del Menú semanal, la columna de la derecha del formulario de Proyecto, la barra del editor de Escritos y las pestañas de las páginas de un mundo.
  - Al moverse con Tab o saltar a un ancla, lo enfocado queda debajo del menú (`scroll-padding-top` en `globals.css`, solo escritorio).
- **Por qué:** lo pidió quien revisó: el menú es más útil a la mano, como en el teléfono.
- **Dónde:** `app/(dashboard)/Topnav.module.css` y `Topnav.tsx` (`data-scrolled`), `styles/tokens.css` (`--z-topnav`, `--topnav-height`), `app/globals.css`, `features/daily/components/MenuWeek.module.css`, `features/projects/components/ProjectForm.module.css`, y los comentarios de `EditorToolbar.module.css` y `FullPages.module.css`.
- **Choca con:** los canvas de escritorio no muestran un menú fijo (son pantallas quietas). En el teléfono la app ya lo hacía así.
- **Para volver (solo escritorio):** en `tokens.css`, `--topnav-height: 0px` fuera del bloque del teléfono, y al final de `Topnav.module.css`:

  ```css
  @media (min-width: 721px) {
    .header { position: relative; }
    .header::before, .header::after { display: none; }
  }
  ```

## Tercera revisión

Lo que pidió el usuario después de probar la segunda: los temas de color como círculos también en el escritorio, y que la píldora del menú dejara de cruzar la pantalla al cambiar de página.

### 16. ⚠ Tema de color: solo círculos, también en el escritorio

- **Antes:** en el escritorio cada tema era un chip con su punto de color y su nombre (`Temas.dc.html`). Los 12 chips, de distinto ancho, ocupaban dos o tres renglones disparejos. En el teléfono ya eran solo círculos.
- **Ahora:**
  - En el escritorio cada tema es su círculo de 48 px (el color ocupa el 74 %). El elegido lleva el mismo anillo de 2 px que el chip, y al pasar el mouse sale un fondo suave detrás del círculo.
  - Desde 1081 px van los 12 en una fila. Más angosto, en 6 × 2, como en el teléfono, para que no quede uno solo en el último renglón.
  - Abajo se lee el nombre del elegido y su descripción ("**Lavanda** · El de siempre. Tranquilo y nocturno."). Al dejar el mouse encima de un círculo sale su nombre (`title`). El lector de pantalla sigue leyendo el nombre de cada uno.
  - En el teléfono no cambió nada: círculos de hasta 44 px, centrados.
- **Por qué:** lo pidió quien revisó: la versión del teléfono se ve más ordenada, y el nombre del elegido ya se lee abajo.
- **Dónde:** `app/(dashboard)/perfil/PreferenciasTab.module.css` (reescrito: los círculos ya no viven solo en el bloque del teléfono) y `PreferenciasTab.tsx` (`--theme-count` y el `title`).
- **Choca con:** `Temas.dc.html`, que muestra chips con nombre en el escritorio.
- **Para volver a los chips en el escritorio:** traer los dos archivos como estaban en `fa5a5ac` y cambiar `ease` por `var(--ease-out)` en la transición de `.theme` (punto 9):

  ```powershell
  git checkout fa5a5ac -- "apps/web/src/app/(dashboard)/perfil/PreferenciasTab.module.css" "apps/web/src/app/(dashboard)/perfil/PreferenciasTab.tsx"
  ```

### 17. La píldora del menú ya no cruza la pantalla al cambiar de página

- **Antes:** estando abajo en una página, al abrir otra (por ejemplo, el enlace "Día a día" de Inicio, o una sección del menú), la píldora oscura del menú aparecía a media pantalla y subía hasta su lugar en ~350 ms. En el teléfono pasaba igual con la píldora de la barra de abajo, que entraba desde fuera de la pantalla.
- **Por qué pasaba:** Motion mide en coordenadas de la página, y la barra está fija. Al llegar la ruta nueva, Topnav se volvía a pintar y Motion medía la píldora con la página todavía abajo. Luego Next subía la página y Motion la medía otra vez. Como la barra no se mueve con la página, Motion entendía que la píldora había subido lo mismo que la página (599 px en la prueba) y la animaba desde ahí. En el escritorio empezó con el punto 15 (antes el menú se iba con la página). En el teléfono ya pasaba en `movil`.
- **Ahora:** la píldora solo se mide cuando cambia de sección (`layoutDependency`). Se sigue deslizando de lado entre secciones igual que antes, y los repintados de la ruta nueva o del scroll ya no la mueven.
- **Probado y descartado:** `layoutRoot` en la barra. Motion lo ignora cuando la píldora viene de otro elemento (`layoutId`), y la píldora seguía cruzando.
- **Dónde:** `app/(dashboard)/Topnav.tsx` y `BottomTabs.tsx`.
- **Para volver:** quitar `layoutDependency` de las dos píldoras. Con eso regresa el error.

## Lo que no se tocó

- La entrada de las páginas (`PageEnter`, fundido corto sin desplazamiento, decisión #30), los paneles y modales (`SPRING.panel`, ya sin rebote) y las listas escalonadas.
- Lo demás que solo aplica al teléfono (≤720 px). La barra de abajo sí se cambió (puntos 3 y 17), y la de arriba ahora está en la capa 40 en vez de la 20 (punto 15).

## Cómo se verificó

- `tsc` y `eslint` pasan, y la consola está sin errores.
- Capturas en claro, oscuro, Salvia + Teñido y Lavanda + Intenso. Inicio, Tareas, Finanzas, Agenda, Perfil, Proyectos, Día a día, Escritos, Escuela, Recordatorios y Papelera vistas en oscuro. La barra del teléfono, a 375 px.
- **Movimiento reducido** (`prefers-reduced-motion: reduce`): las transiciones de CSS quedan instantáneas (1e-05 s en botones, campos y menú) y Motion no desplaza nada al cargar. A los 150 ms todo está ya en su lugar, contra 54 elementos todavía en movimiento sin la preferencia.
- **No revisado a mano:** los paneles y cajones abiertos (captura rápida, búsqueda, avisos, cajones de tarea y evento), Bienvenida y el interior de un mundo de Escritos. Les llegó el mismo barrido, pero nadie los ha visto abiertos.
- Los colores de categoría (evento de trabajo en tinta, colores de materias, portadas), los marcadores de "hoy" y la tarjeta destacada.
- **Segunda revisión:**
  - `tsc` y `eslint` pasan en los 28 archivos `.ts`/`.tsx` cambiados. La consola está sin errores en una pestaña limpia (Inicio, tocando otro día de la semana, Tareas, Día a día y Proyectos).
  - El menú de arriba se midió a 1366, 1240, 1100, 1024, 820 y 390 px. A 390 px no hay scroll de lado.
  - El menú fijo se revisó al bajar en claro y oscuro (Inicio y Tareas), en el formulario de Proyecto (la columna derecha queda 16 px debajo del menú), en el editor de Escritos (la barra del editor queda 8 px debajo) y en el teléfono a 390 y 360 px.
  - "Esta semana" y el aro se grabaron antes y después (tiras 07 y 08), y el cambio de largo de "Esta semana" en la tira 09.
  - El cambio de largo se midió cuadro por cuadro de viernes (4 eventos) a sábado (1) y de vuelta, a 1366 y a 390 px. El encabezado y los días quedan en el mismo lugar y del mismo tamaño en todos los cuadros, sin escala. La tarjeta empieza a cambiar a los ~120 ms y termina a los ~480 ms en los dos sentidos. Con clics rápidos entre días termina en el alto correcto, sin errores en la consola.
  - **No revisado a mano:** el panel del Menú semanal pegado al bajar (en el demo la página casi no baja). Usa la misma cuenta que el formulario de Proyecto.
- **Tercera revisión:**
  - `tsc` y `eslint` pasan.
  - Los temas se vieron a 1366 (claro, y oscuro con el mouse encima), 1100, 900, 390 y 320 px: una fila hasta 1081 px, 6 × 2 debajo; círculos de 48 px en el escritorio, 44 a 390 y 34 a 320. Sin scroll de lado.
  - La píldora se midió cuadro por cuadro en 4 casos: Inicio bajado 600 px → enlace "Día a día"; Inicio bajado → "Tareas" del menú; sin bajar → "Tareas" (sigue deslizándose); teléfono a 390 px bajado 900 px → "Tareas" de la barra de abajo. En los cuatro queda a la misma altura todo el tiempo y solo se mueve de lado. Antes, en el primero, saltaba a y = 627 y subía hasta 29; en el teléfono arrancaba en y = 1622 (fuera de la pantalla) y subía hasta 783.

## Comparar a mano

El demo de antes es el commit `fa5a5ac` (el último de `movil` al empezar):

```powershell
git worktree add --detach ..\antes fa5a5ac
```

Después, en esa carpeta: `pnpm install` y `pnpm --filter web dev:demo` (puerto 3000 o el que te dé), y en esta rama `pnpm --filter web dev:demo` en otro puerto. Para borrar la copia: `git worktree remove ..\antes`.
