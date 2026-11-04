import { z } from 'zod'

import { TRASH_KINDS } from './constants'

// Restaurar o borrar para siempre una cosa de la papelera: su tipo y su id. Que sea de la persona y que de verdad
// esté en la papelera lo revisa el adaptador de su módulo.
export const trashRefSchema = z.object({
  kind: z.enum(TRASH_KINDS),
  id: z.uuid(),
})

export type TrashRef = z.infer<typeof trashRefSchema>
