// Lo que devuelven las acciones de servidor de Finanzas. Va en un archivo aparte porque un archivo 'use server'
// solo puede exportar funciones asíncronas, y este tipo lo usan todas.
export type FinanceActionResult =
  // `undoToken` es para el "Deshacer" del aviso; `liquidated` avisa que una deuda se acaba de pagar por completo.
  | { ok: true; id?: string; undoToken?: string; liquidated?: boolean }
  // `errors` va por campo ("amountCents", "name"); `message` es un error general.
  | { ok: false; errors: Record<string, string>; message?: string }

export const failure = (message: string): FinanceActionResult => ({ ok: false, errors: {}, message })
