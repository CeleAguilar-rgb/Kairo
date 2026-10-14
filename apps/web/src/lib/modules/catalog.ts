import type { ModuleId } from '@kairo/shared'

export type ModuleCatalogEntry = {
  id: ModuleId
  name: string
  description: string
  icon: string
}

// Metadatos de las secciones que la persona elige en Bienvenida y prende/
// ordena en Perfil → Mis secciones. 'home', 'reminders' y 'focus' quedan
// fuera a propósito: no son opciones en ninguna de las dos pantallas (ver
// ALWAYS_ENABLED en apps/api/src/account/account.service.ts).
export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    id: 'tasks',
    name: 'Tareas',
    description: 'Pendientes que se marcan, en lista o tablero',
    icon: 'M4 4h16v16H4zM8.5 12l2.5 2.5 4.5-5',
  },
  {
    id: 'projects',
    name: 'Proyectos',
    description: 'Galería con portada, objetivos y sus tareas',
    icon: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
  },
  {
    id: 'agenda',
    name: 'Agenda',
    description: 'Eventos por semana y mes, con avisos',
    icon: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  },
  {
    id: 'finance',
    name: 'Finanzas',
    description: 'Ingresos, gastos, ahorros, deudas y membresías',
    icon: 'M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7zM4 7l11-3v3',
  },
  {
    id: 'daily',
    name: 'Día a día',
    description: 'Rutina por horarios, menú, diario y metas',
    icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  },
  {
    id: 'writings',
    name: 'Escritos',
    description: 'Páginas y bases de datos, como un cuaderno',
    icon: 'M14 4l6 6L9 21H3v-6L14 4zM12 6l6 6',
  },
  {
    id: 'school',
    name: 'Escuela',
    description: 'Horario de clases, materias, entregas y calificaciones',
    icon: 'M3 9l9-5 9 5-9 5-9-5zM7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5',
  },
]
