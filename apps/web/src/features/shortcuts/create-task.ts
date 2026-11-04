import { createTask } from '@/features/tasks'

// Una tarea rápida: solo el título y, si se eligió, el día. Lo demás con los valores de "Nueva tarea" (TareaNueva:
// pendiente, prioridad media, sin proyecto). La usan el "+" y la acción "Crear tarea" de Ctrl+K.
export async function createQuickTask(title: string, dueOn: string | null): Promise<string | null> {
  const result = await createTask({ title, projectId: null, status: 'todo', priority: 'medium', dueOn, subtasks: [], notes: null })
  return 'error' in result ? result.error : null
}
