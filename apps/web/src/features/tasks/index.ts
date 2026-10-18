// API pública del módulo para el resto de la app (docs/guides/modules.md).
// Las funciones de datos viven en ./api (solo servidor) y se importan desde ahí.
export { TodayTasksCard } from './components/TodayTasksCard'
export { TaskDetailDrawer } from './components/TaskDetailDrawer'
export { TasksView } from './components/TasksView'
export type { Task, TaskStatus, TaskPriority, Subtask } from './types'
export { tasksModule } from './module'
