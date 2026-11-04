# Diferencias entre el front y el canvas

Lo que el front hace y las pantallas de `screens/` **no dibujan** (o dibujan distinto). Sirve para llevarlo al canvas en claude.ai y que vuelva a mandar él. Al subirlo al canvas, bórralo de aquí.

## Lo global (2026-11-02 y 03, decisiones #49 a #52)

**Papelera**
- Sin el **contador del menú** del avatar (el canvas lo dibuja; aquí es solo el enlace "Papelera").
- Un quinto filtro, **"Otros"**, para lo de Agenda, Recordatorios y Día a día (el canvas solo trae Proyectos, Tareas, Escritos y Finanzas).
- Lo que se borró junto con otra cosa se cuenta dentro de ella ("y sus 4 tareas") y vuelve junto.
- **Borrar proyecto**: el menú "···" del detalle tiene "Borrar proyecto" con diálogo, y después lleva a la galería de Proyectos (el canvas dibuja una tarjeta "está en la papelera"). **Sin "Duplicar" ni "Archivar"**.
- Las rutinas y sus bloques no van a la papelera (conservan su "Deshacer").

**Avisos (la campana)**
- Fila **"Avisos en este navegador"** con "Activar" / "Desactivar" para Web Push (el canvas no la dibuja).
- Estados que el canvas no trae: **vacío** ("No tienes avisos todavía…"), **cargando** y el aviso de que el navegador los bloqueó.
- Cada aviso puede llevar una segunda línea con el detalle ("$2,340 de $2,000 este mes.").
- Picar un aviso lo marca leído y **lleva a su pantalla**.

**Buscar y captura rápida (+)**
- El reproductor de Enfoque se corrió a la **izquierda del "+"** para que no se encimen.
- El gasto rápido ("Tacos 250") cae en la categoría **"Otros"**; el recordatorio rápido, en la siguiente hora en punto o mañana a las 9:00.

## Escritos (2026-10-25, decisiones #45 a #47)

**Mundo: portada y pestañas**
- El lápiz de los contadores y "Personalizar pestañas" guardan de verdad por mundo.
- "Más" ya no solo lista: cada fila tiene el alfiler para fijar la pestaña en la barra.
- En el panel de una plantilla de sección extra hay **"Borrar sección"** (con "Deshacer").

**Resumen**
- Las **reglas del mundo** se editan ahí mismo ("Editar", "+ Agregar regla", quitar).
- Las celdas de "Dónde y cuándo" muestran 3 elementos y un **"+N más"** que las expande.
- Los **huecos por llenar se calculan** (eras sin eventos, regiones sin descripción, fichas en borrador, mapa) y los que apuntan a una ficha se pueden picar.

**Línea del tiempo**
- Panel de era con **"Borrar era"** y panel de evento con **"Borrar evento"**, los dos con "Deshacer".
- **Página completa del evento** (ruta propia) además del panel.

**Regiones**
- **"Subir mapa" es real**: la imagen se sube y se ve a todo lo ancho, con "Cambiar mapa".
- Una región "de noche" (tarjeta oscura) es la que tiene **portada de color tinta**; no hay un campo "es de noche".

**Historias**
- Barra de tarjetas con **"Nueva historia"** (nace como *idea*, punteada) y botón **"Empezar historia"** para pasarla a en curso.
- Modo **Editar** de la historia: título, sinopsis, estado, era, lugar, elenco (agregar/quitar personajes) y **"Borrar historia"**.
- **"+ Capítulo"** además de "+ Nuevo arco"; un arco se puede quitar.
- "Material de la historia": formulario **"+ Agregar enlace"** (nombre y dirección) y quitar.
- En el editor de un capítulo, **Arco, Era y Punto de vista** son selectores (EscritosCapitulo los trae como texto).

**Fichas (panel y página completa)**
- Casilla **"En borrador"** y campo **"Enlace para profundizar"** (el canvas solo dibuja el botón "Notion ↗").
- **"También aparece en"**: secciones extra donde se ve un personaje (la Luna en Deidades).
- "Otra sección solo para esta nota" y "Dentro de…" funcionan igual que el canvas, más **"Borrar"** con confirmación y "Deshacer".
- **Foto de un personaje**: subir, cambiar y "Quitar foto" son reales (el canvas solo alterna foto/inicial).
- **Portada** (`EscritosPortada`): además de subir imagen, subirla/bajarla y los 6 colores, hay **"Dibujo"** (volver al automático) y **"Quitar"**, y **"Agregar portada"** si no tiene.
- En la página completa hay una sección **"Más bloques"** con el editor de bloques (menú "/").

**Plantillas** (decisión #46)
- "Tipo de lugar" es un **campo de selección** de la plantilla Lugar (Región, Reino, Bosque, Castillo, Mercado, Lugar).
- El tipo de campo ofrece **los 6** (texto, vínculo, era, selección, número, fecha), no solo 4.
- Un campo de selección muestra sus **opciones** debajo, para agregar y quitar.
- Quitar un campo da **"Deshacer"**.

**Base de datos de personajes**
- "+ Propiedad" agrega un campo a la plantilla Personaje (aparece también en la ficha). Hay propiedades de **vínculo y era**, que el canvas no ofrece.

**Avisos y estados que el canvas no trae**
- Todo borrado lleva aviso **"Deshacer"**; los errores salen como aviso.
- Estados vacíos: sin mundos, sin eras, sin regiones, sin personajes, sin historias.
- En modo demo, guardar avisa que no se guarda nada.

**Color nuevo**
- Salvia (`#b9d8bf`) y calabaza (`#f2b48a`) pasaron a variables (`--cover-sage`, `--cover-peach`) porque las usa la portada y el punto de los arcos.
