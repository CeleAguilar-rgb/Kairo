import { MAX_AMOUNT_CENTS } from '@kairo/shared'
import { z } from 'zod'

// El "token" de Deshacer no vive guardado en el servidor (decisión #36/#37/#38, mismo motivo: en Vercel cada
// llamada puede caer en una instancia distinta). Es la acción exacta a deshacer, codificada en el string
// mismo. Un solo tipo para todo Finanzas porque el front también comparte una sola acción pública
// (undoFinanceAction) para movimientos, ahorros, deudas, membresías, tarjetas y presupuesto.
//
// Como el token pasa por el navegador, la persona puede cambiarlo: por eso al decodificarlo se vuelve a
// validar entero con Zod (ids que sean uuid, listas con tope), y cada "restaurar" del repositorio lleva
// `where: { id, userId }` igual que cualquier otra consulta (reglas 3 y 4 de CLAUDE.md).
const id = z.uuid()

const undoActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('transaction'), id }),
  z.object({ type: z.literal('saving'), id }),
  z.object({ type: z.literal('debt'), id }),
  z.object({ type: z.literal('membership'), id }),
  // Borrar una tarjeta se lleva sus membresías: el token recuerda cuáles, para devolver solo esas.
  z.object({ type: z.literal('card'), id, membershipIds: z.array(id).max(200) }),
  z.object({ type: z.literal('category'), id }),
  // "Usar lo real" cambia varios límites a la vez: el token guarda cómo estaba cada uno.
  z.object({
    type: z.literal('limits'),
    before: z.array(z.object({ id, limitCents: z.number().int().positive().max(MAX_AMOUNT_CENTS).nullable() })).max(200),
  }),
])

export type FinanceUndoAction = z.infer<typeof undoActionSchema>

export function encodeFinanceUndo(action: FinanceUndoAction): string {
  return JSON.stringify(action)
}

export function decodeFinanceUndo(token: string): FinanceUndoAction | null {
  try {
    const parsed = undoActionSchema.safeParse(JSON.parse(token))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
