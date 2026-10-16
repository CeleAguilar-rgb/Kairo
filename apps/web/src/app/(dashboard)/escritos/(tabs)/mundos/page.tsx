import { WorldsView } from '@/features/writings'
import { getWorldCards } from '@/features/writings/api'

// Escritos → Mundos: una tarjeta por mundo; cada uno abre su propia página con regiones, eras y especies.
export default async function WritingsWorldsPage() {
  const worlds = await getWorldCards()
  return <WorldsView worlds={worlds} />
}
