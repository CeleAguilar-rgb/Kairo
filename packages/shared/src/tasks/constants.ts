// Constantes de tareas, SIN zod a propósito: el front las importa para pintar
// columnas y opciones, y si vivieran junto al esquema, cada pantalla que solo
// quiere la lista de estados descargaría también la librería de validación.

// 'review' (Revisión) está en el canvas (Tareas y TareaNueva); el enum de
// Postgres lo suma con su migración cuando se haga el módulo de tareas en la API.
export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const
export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]
