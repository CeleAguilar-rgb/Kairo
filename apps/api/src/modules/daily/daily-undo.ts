// El "token" de Deshacer no vive guardado en el servidor (decisión #36/#37, mismo motivo: una Server
// Action no sobrevive entre llamadas). Es la acción exacta a deshacer, codificada en el string mismo.
// Un solo tipo para las 4 áreas de Día a día porque el front también comparte una sola acción pública
// (undoRoutineAction, en routine-actions.ts) para las cuatro.
export type DailyUndoAction =
  | { type: 'routine'; id: string }
  | { type: 'block'; id: string }
  | { type: 'journal'; id: string }
  | { type: 'mealPlans'; ids: string[] }
  | { type: 'goal'; id: string }

export function encodeDailyUndo(action: DailyUndoAction): string {
  return JSON.stringify(action)
}

export function decodeDailyUndo(token: string): DailyUndoAction | null {
  try {
    const action = JSON.parse(token) as DailyUndoAction
    if (action && typeof action === 'object' && 'type' in action) return action
    return null
  } catch {
    return null
  }
}
