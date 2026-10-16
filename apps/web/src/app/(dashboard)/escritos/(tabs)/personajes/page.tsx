import { CharactersGrid } from '@/features/writings'
import { getCharacterChips } from '@/features/writings/api'

// Escritos → Personajes: una tarjeta por personaje; la base de datos completa está en /escritos/personajes/tabla.
export default async function WritingsCharactersPage() {
  const characters = await getCharacterChips()
  return <CharactersGrid characters={characters} />
}
