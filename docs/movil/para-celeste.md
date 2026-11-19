# Para Celeste (versión de navegador)

Cosas que salieron de revisar la versión de teléfono y que **también conviene cambiar en la versión de escritorio**. Son propuestas: la versión de navegador es de Celeste y decide si las quiere. Cada una dice dónde se hizo ya en el teléfono, para copiarla.

## 1. Papelera: la confirmación de "Borrar para siempre" repite el texto

**Hoy:** al borrar para siempre aparece la pregunta "¿Borrar para siempre?" y, junto a ella, un botón que dice otra vez "Borrar para siempre". El texto sale dos veces y el renglón se alarga (en el teléfono llegaba a tres líneas).

**Cambio:** dejar la pregunta como está y que el botón diga solo **"Borrar"** (junto a "Cancelar"). La pregunta ya explica qué pasa, así que el botón no necesita repetirlo. Para lectores de pantalla, el botón conserva `aria-label="Borrar para siempre: <nombre>"`.

**Dónde:** `features/trash/components/TrashView.tsx` (ya hecho; vale para escritorio y teléfono porque es el mismo componente).

## 2. Menú de secciones: un deslizador horizontal con degradado si no caben todas

**Hoy:** el nav de arriba (`Topnav`) solo muestra las secciones con `inNav: true`. Escuela y Recordatorios se dejaron fuera (`inNav: false`) porque con 8 o 9 secciones el nav ya no cabe junto a los íconos en pantallas medianas.

**Propuesta:** que el nav se pueda **deslizar de lado** cuando no caben todas, con el mismo desvanecido que ya tienen las pestañas del teléfono: el borde se va difuminando poco a poco donde hay más elementos escondidos, y desaparece al llegar al final. Así Escuela y Recordatorios (y cualquier sección futura) podrían estar en el nav sin apretarlo.

**Cómo copiarlo:** el componente `components/ui/ScrollTabs.tsx` ya hace esto (una sola línea, desvanecido progresivo dentro de la píldora y la sección activa centrada). Bastaría envolver el `<nav>` del Topnav con él y quitar `inNav: false` de `features/school/module.ts` y `features/reminders/module.ts`.

**Mientras tanto:** en el teléfono, Escuela y Recordatorios ya aparecen (la barra de abajo y el menú del avatar usan `navModules(sections, { mobile: true })`); el escritorio queda como estaba.

## 3. Botón "+" (captura rápida) en lavanda

**Hoy:** el "+" es del color de `--action` (tinta en claro). Cuando flota sobre una tarjeta oscura (Pendientes de hoy, por ejemplo) se pierde: es casi del mismo color. Probamos un aro del color de la página, un filete semitransparente y un reflejo interior, y ninguno se veía bien sobre claro y oscuro a la vez.

**Cambio:** pintarlo de **lavanda** (`background: var(--accent)`, ícono con `color: var(--accent-ink)`) y dejar solo la sombra de siempre. Contrasta con el fondo claro y con las tarjetas oscuras sin bordes, sin detectar qué hay detrás y sin sombras especiales. Así quedó en el teléfono.

**Dónde:** `features/shortcuts/components/QuickCapture.module.css`, la regla `.fab` (ya hecho; aplica a escritorio y teléfono porque es el mismo botón). Es un cambio de diseño respecto al canvas (`Atajos.dc.html` lo pinta con `--action`), por eso conviene que lo vea ella antes de adoptarlo.
