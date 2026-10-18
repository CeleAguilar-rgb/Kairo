import { NotesView } from '@/features/writings'
import { getNotes } from '@/features/writings/api'

// Escritos → Notas: las notas rápidas como tarjetas, de la más nueva a la más vieja.
export default async function WritingsNotesPage() {
  const notes = await getNotes()
  return <NotesView notes={notes} />
}
