# Módulos

Cada sección de Kairo es un **módulo independiente**. El usuario quiere poder cambiar el orden, agregar o quitar secciones sin romper las demás; esta estructura existe para eso.

## Módulos actuales

| id | Nombre en la UI | Ruta | Incluye |
|---|---|---|---|
| `home` | Inicio | `/` | Tarjetas de los demás módulos, saludo, adornos |
| `tasks` | Tareas | `/tareas` | Tareas, subtareas, notas rápidas (pendientes marcables), captura rápida |
| `reminders` | Recordatorios | `/recordatorios` | Recordatorios, avisos en la app y Web Push |
| `agenda` | Agenda | `/agenda` | Eventos (trabajo y personales) y la vista que junta fechas de otros módulos |
| `daily` | Día a día | `/dia-a-dia` | Rutina, reporte, menú semanal, diario con PIN, metas |
| `finance` | Finanzas | `/finanzas` | Movimientos, ahorros, deudas, tarjetas, membresías, presupuesto |
| `school` | Escuela | `/escuela` | Periodos, materias, horario, entregas, calificaciones, preparación |
| `projects` | Proyectos | `/proyectos` | Proyectos, objetivos, enlaces, sprints, archivos |
| `writings` | Escritos | `/escritos` | Mundos, historias, páginas estilo Notion, personajes |
| `focus` | Música y enfoque | (flotante) | Pomodoro; Spotify en fase posterior |

"Trabajo" y "situaciones personales" no son módulos: el trabajo vive como tipo en proyectos y eventos, y lo personal en el diario.

Además hay piezas **globales** que no son módulos: perfil, papelera, búsqueda (Ctrl+K), panel de avisos y botón de captura rápida (+).

## Qué tiene un módulo

**Compartido** (`packages/shared/src/<id>/`)
- `schemas.ts`: esquemas Zod de entrada y salida.

**Backend** (`apps/api/src/modules/<id>/`)
- `module`, `controller`, `service`, `repository` (ver `docs/guides/architecture.md`).
- El `service` es su API pública para otros módulos. Si aporta a otras vistas, implementa las que apliquen:
  - `getAgendaItems(userId, range)` para la Agenda
  - `getHomeCard(userId)` para Inicio
  - `search(userId, query)` para la búsqueda global
  - `getTrashItems(userId)` / `restore(userId, id)` para la papelera

**Frontend** (`apps/web/src/features/<id>/`)
- `components/`, `api.ts`, `actions.ts`, `index.ts`.
- `module.ts`: el manifiesto.

```ts
// apps/web/src/features/finance/module.ts
export const financeModule = {
  id: 'finance',
  label: 'Finanzas',
  icon: 'wallet',
  href: '/finanzas',
  homeCards: [UpcomingPaymentsCard],   // tarjetas que puede aportar a Inicio
} satisfies ModuleManifest
```

```ts
// apps/web/src/lib/modules/registry.ts
export const modules = [homeModule, tasksModule, remindersModule, /* … */]
```

El sidebar, Inicio y la bienvenida se arman recorriendo el registro y filtrando por `user_sections` (activos y en qué orden).

## Agregar un módulo nuevo

Desde Recordatorios, primero el front (con datos dummy) y después el backend (decisión #27, `docs/guides/roadmap.md`):

1. Describir qué hace en `docs/guides/features.md`.
2. Agregar su id a `MODULE_IDS` en `packages/shared/src/modules.ts`.
3. Crear la carpeta en `features/`, su manifiesto, sus componentes (datos dummy con la forma que sugiere `docs/guides/data-model.md`, sin forzarla) y registrarlo.
4. Crear sus rutas en `app/(dashboard)/`.
5. Cuando toque el backend: ajustar sus tablas en `docs/guides/data-model.md` según lo que terminó pidiendo el front, con una migración de Drizzle (`apps/api/src/db/schema/<modulo>.ts`).
6. Crear el módulo en la API, en `apps/api/src/modules/<modulo>/` (con sus tests de aislamiento entre usuarios).
7. Conectar: sustituir los datos dummy por la API real. Si aporta a Agenda, Inicio, búsqueda o papelera, implementar esas funciones.

Ningún otro módulo debería necesitar cambios. Si los necesita, revisa si se está rompiendo la regla de no importar internos de otro módulo.

## Reglas

- Un módulo **no importa archivos internos** de otro: solo su `index.ts` (front) o su `service` exportado por su módulo de Nest (back).
- Un módulo **no lee tablas** de otro: su repository solo importa las tablas de su propio archivo de esquema. Si las tablas se relacionan (una tarea apunta a un proyecto), la relación existe en la base, pero el código pide datos al service del otro módulo.
- Desactivar un módulo en `user_sections` lo oculta; **no borra** sus datos.
