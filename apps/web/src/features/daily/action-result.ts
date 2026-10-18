// Lo que devuelven las acciones de servidor de Día a día. Va en un archivo aparte porque un archivo
// 'use server' solo puede exportar funciones asíncronas, y este tipo lo usan las cuatro de acciones.
export type DailyActionResult =
  // `undoToken` es para el "Deshacer" del aviso; `achieved` avisa que una meta se acaba de lograr.
  | { ok: true; id?: string; undoToken?: string; achieved?: boolean }
  // `errors` va por campo ("title", "endsAt"); `message` es un error general.
  | { ok: false; errors: Record<string, string>; message?: string }

export const failure = (message: string): DailyActionResult => ({ ok: false, errors: {}, message })
