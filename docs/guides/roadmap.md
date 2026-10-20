# Hoja de ruta

## Fase 0: base (antes de cualquier módulo)

1. Monorepo: pnpm workspaces, Turborepo, `apps/web`, `apps/api`, `packages/shared`, TypeScript estricto, ESLint y Prettier.
2. Estilos: `tokens.css` y `semantic.css` extraídos del diseño, fuentes, `globals.css`, componentes base de `components/ui/`.
3. Base de datos: proyecto de Supabase, esquema `app`, rol de la API, Drizzle conectado, tablas de **Cuenta** (`docs/guides/data-model.md`).
4. Auth completa: invitación, contraseña, guard global de la API, sesiones de 30 días, cerrar todas las sesiones, recuperar contraseña. (Código por correo pasó a "Después" — decisión #26.)
5. Shell: layout del dashboard, sidebar desde el registro de módulos, perfil básico, bienvenida.
6. Tests críticos de auth y aislamiento.

## Fase 1: módulos (en este orden, en PC)

**Inicio + tareas y notas rápidas** ya se construyó completo, de punta a punta (esquema compartido → controller → service → repository → componente → tarjeta de Inicio): fue el molde que validó el patrón.

**Desde Recordatorios, el orden se invierte (decisión #27): primero todo el front de cada módulo, con datos dummy y animaciones reales; el backend y la conexión vienen después, módulo por módulo.** La idea nació del front: el usuario quiere ver y usar pantallas con calidad real, no de relleno, y prefiere ajustar el diseño de datos a lo que el front termine pidiendo, no al revés.

### Fase 1a: front de todos los módulos

Para cada uno: pantallas tal como están en `docs/design/screens/`, animaciones de Motion de verdad (nada de placeholders), datos dummy con la forma que ya sugiere `docs/guides/data-model.md` — sin forzarla: si el front pide algo distinto, se ajusta el modelo de datos, no el front.

1. Recordatorios
2. Agenda
3. Día a día
4. Finanzas
5. Escuela
6. Proyectos con Scrum
7. Escritos
8. Música y enfoque

### Fase 1b: backend y conexión (mismo orden, después)

Por cada módulo: ajustar su tabla en `data-model.md` según lo que terminó pidiendo el front, migración de Drizzle, esquema compartido, controller → service → repository (con sus tests de aislamiento), y conectar sustituyendo los datos dummy por la API real.

**Hecho:** Tareas (reconectada a su molde de antes de la decisión #27, más papelera), Recordatorios, Agenda, Día a día (sus 4 partes: rutina, menú, diario —sin PIN ni cifrado, decisión #39— y metas), Finanzas (sus 5 pestañas; los cobros de membresías aún no se vuelven movimientos solos: eso es de las tareas programadas, decisión #40), Proyectos (Resumen y Sprints; sin archivos, decisión #42) y Escuela (periodo, materias con su horario, entregas, calificaciones y "Antes de empezar"; una materia es un proyecto, sus clases son eventos de Agenda y sus entregas tareas, decisión #43).

**Lo que sigue, en este orden** (cambia el de la lista de arriba: Proyectos y Escuela van antes que Escritos, decisión #41):

1. **Archivos (Storage).** Paso propio: tabla `attachments`, bucket privado con URLs firmadas, límites de tamaño y tipo, cuota. Conecta la pestaña Archivos de Proyectos y la portada subida por la persona (decisión #41).
2. **Escritos**, que reutiliza Storage para imágenes, portadas y galerías.
3. **Enfoque.** Con su backend, el Resumen de un proyecto muestra los minutos de pomodoro de la semana (hoy siempre "0 min").
4. **Lo global:** la Papelera como pantalla para ver y restaurar lo borrado (con ella llega **borrar un proyecto**, que arrastra objetivos, enlaces, sprints, tareas y archivos), búsqueda Ctrl+K, panel de avisos, captura rápida (+), adornos de temporada y las **tareas programadas** (que anotarían solos los cobros de membresías y mandarían los avisos del presupuesto y de los recordatorios). El roadmap original las agrupaba "junto con los módulos", sin fecha: se pueden adelantar, por ejemplo la Papelera, si hace falta.

Sin lugar fijo, porque ni el canvas los pide todavía: quitar una tarea de un sprint o editar su meta una vez empezado; editar una materia (profesor, color, días de clase); el tipo de entrega (examen, lectura…), que pediría un campo nuevo en Tareas; y que cambiar las fechas de un periodo ajuste el fin de las clases que ya se crearon (hoy se cambia en Agenda).

El orden puede cambiar; la arquitectura de módulos existe para eso.

## Después (no construir sin que el usuario lo pida)

| Qué | Qué debe quedar preparado desde ya |
|---|---|
| Versión de teléfono (responsive, menú abajo, PWA) | Layouts sin anchos fijos |
| Modo oscuro | Todo color por variable semántica; `profiles.theme` |
| Varios usuarios (invitar a otros desde la app) | Todo filtrado por `user_id` (ya es regla de seguridad) |
| Ver y editar sin conexión | ids uuid, `updated_at` confiable, borrado suave |
| Exportar y respaldos propios | Nada especial |
| Integraciones: Notion, Canva, Spotify, Claude | Tabla `connections`, tokens cifrados, siempre desde el servidor |
| Otras monedas | Columna `currency` junto a cada monto |
| Compartir entre cuentas (agenda en común) | Nada; requiere decisión nueva |
| Código por correo como segundo factor de login | `login_codes` y `verified_sessions` ya existen en la base sin usarse; el guard (`auth/jwt.guard.ts`) ya tiene la estructura (`@Public()`) para agregar la excepción cuando toque. Falta sobre todo infraestructura de correo propio en la API (SMTP o Resend) — decisión #26. |
