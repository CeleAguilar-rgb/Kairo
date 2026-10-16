import { StoriesView } from '@/features/writings'
import { getBooks } from '@/features/writings/api'

// Escritos → Historias: los libros (historias y cuadernos) y el elegido con sus capítulos o páginas.
export default async function WritingsStoriesPage() {
  const books = await getBooks()
  return <StoriesView books={books} />
}
