# Diseño visual

## Fuente de verdad

El diseño vive en el canvas **"Kairo"** que el usuario edita en claude.ai:
https://claude.ai/artifact/4bUuw6JPtK1D3dV1AhYbXG

Una copia de sus pantallas está en `docs/design/screens/` (un archivo `.dc.html` por pantalla, más `canvas.json` con el índice y los títulos). **El canvas manda**: cuando el usuario lo edite, actualizará esa carpeta. Si una pantalla del repo no coincide con lo que el usuario describe, pregunta cuál es la vigente.

`docs/guides/Kairo-Sistema-de-diseno.pdf` es el sistema de diseño formal (tokens de color con valores claro/oscuro, tipografía, espacio, radios, sombras y specs de componentes). Cuando haya diferencia con un valor aproximado que aparezca en `theming.md`, **manda el PDF** — `theming.md` describe la estructura de capas (primitivos → semánticos → modo), no los valores exactos.

Cómo usarlo:
- Los colores, tipografías, radios, sombras y espacios se **extraen** de las pantallas a `apps/web/src/styles/tokens.css` (ver `docs/guides/theming.md`). No se copian valores sueltos a los componentes.
- Las pantallas son una referencia de layout, jerarquía y comportamiento, **no código para pegar**. Los archivos `.dc.html` usan un formato propio del editor (`<x-dc>`, `{{…}}`, estilos en línea); se reescriben como componentes de React con CSS Modules. Cómo leer ese formato: `docs/design/README.md`.
- **Revisa todos los estados de una pantalla**, no solo lo que se ve al cargar: paneles, menús y vistas alternas están en bloques `<sc-if>`, y lo que los activa está en el script al final del archivo.
- No inventes estilos. Si falta algo en el diseño (un estado, un componente), propón una opción coherente con lo existente y pregunta.

## Mapa de pantallas

| Área | Pantallas |
|---|---|
| Inicio | `Main` (se arma con las secciones activas) |
| Tareas y proyectos | `Tareas`, `TareaNueva`, `Proyectos`, `Proyecto`, `ProyectoEditar`, `ProyectoSprints`, `ProyectoArchivos`, `Borrar`, `Papelera`, `Vacios` |
| Agenda y recordatorios | `Agenda`, `EventoNuevo`, `EventoDetalle`, `Recordatorios` |
| Día a día | `DiaADia`, `RutinaEditar`, `Reporte`, `MenuSemanal`, `Diario`, `Metas` |
| Finanzas | `FinResumen`, `FinMovimientos`, `FinAhorros`, `Finanzas` (membresías), `FinMembresia`, `FinPresupuesto` |
| Escritos | `EscritosInicio`, `Escritos`, `Pagina`, `BaseDatos` |
| Escuela | `Escuela` |
| Siempre a la mano | `Reproductor` (música y enfoque), `Atajos` (buscar con Ctrl+K, avisos, captura rápida +) |
| Cuenta | `Entrar`, `Bienvenida`, `Perfil` |
| Estados | `Estados` (cargando, guardando, sin conexión, errores), `Vacios` |
| Fase posterior | `Respaldo`, todas las `Tel*` y `Mas` (teléfono), `ModoOscuro` y todas las `Oscuro*` |
| Temporadas | `Temporadas` (adornos por mes) |

## Diferencias conocidas entre el diseño y las decisiones

Estas decisiones son posteriores al diseño y **mandan sobre él**:

- **`Entrar`:** el diseño muestra "crear cuenta" y "enlace por correo". Lo vigente es: correo + contraseña, después un **código de 6 dígitos al correo**, y **sin registro abierto** (solo por invitación). Ver `docs/guides/security.md`.
- **`Temporadas`:** solo cambian adornos (doodles, guirnalda y saludo), nunca la paleta de la app.
- **`Estados`:** el estado "sin conexión" se muestra como aviso, pero editar sin conexión es de una fase posterior.

## Patrones de interacción (del documento de funcionalidades)

- **Borrar:** confirmación que nombra la cosa y lo que arrastra; va a la papelera 30 días; aviso con "Deshacer".
- **Vacíos:** cada lista vacía dice qué hacer y trae su botón.
- **Cargas:** menos de 100 ms, nada; hasta 1 s, un indicador en el botón; más, esqueleto con la forma real.
- **Errores:** nunca culpan al usuario, conservan lo escrito y ofrecen "Intentar de nuevo". Si falla una sección, solo cae su tarjeta, no toda la página.
- **Detalle:** al picar un pendiente se abre su panel lateral; crear tarea también va en panel lateral.
