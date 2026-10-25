// Lo que devuelven las acciones de servidor de Escritos. Va en un archivo aparte porque un archivo 'use server'
// solo puede exportar funciones asíncronas, y este tipo lo usan todas (también componentes del navegador).
export type WritingActionResult =
  // `id` es lo que se acaba de crear o guardar; `undoToken` es para el "Deshacer" del aviso; `savedAt` es el
  // momento (UTC) en que quedó guardada una página.
  | { ok: true; id?: string; undoToken?: string; savedAt?: string }
  // `errors` va por campo ("title", "wordGoal"); `message` es un error general.
  | { ok: false; errors: Record<string, string>; message?: string }

export const failure = (message: string): WritingActionResult => ({ ok: false, errors: {}, message })

// El primer paso de subir una imagen (foto, portada o mapa): la ruta y el token que firmó la API.
export type SignedUploadResult = { ok: true; path: string; token: string } | { ok: false; message: string }

// Lo que se puede deshacer en Escritos, con su ruta de "restaurar" en la API. El token del aviso es
// "<tipo>:<id>": no guarda nada en el servidor (igual que el "Deshacer" de Archivos, decisión #44).
export const UNDO_KINDS = ['worlds', 'templates', 'characters', 'notes', 'eras', 'events', 'stories', 'pages'] as const
export type UndoKind = (typeof UNDO_KINDS)[number]

export const undoTokenOf = (kind: UndoKind, id: string) => `${kind}:${id}`
