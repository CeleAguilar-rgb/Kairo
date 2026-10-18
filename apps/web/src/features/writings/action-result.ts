// Lo que devuelven las acciones de servidor de Escritos. Va en un archivo aparte porque un archivo 'use server'
// solo puede exportar funciones asíncronas, y este tipo lo usan todas.
export type WritingActionResult =
  // `id` es lo que se acaba de crear o guardar; `undoToken` es para el "Deshacer" del aviso; `savedAt` es el
  // momento (UTC) en que quedó guardada una página.
  | { ok: true; id?: string; undoToken?: string; savedAt?: string }
  // `errors` va por campo ("title", "wordGoal"); `message` es un error general.
  | { ok: false; errors: Record<string, string>; message?: string }

export const failure = (message: string): WritingActionResult => ({ ok: false, errors: {}, message })
