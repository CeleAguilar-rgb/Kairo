import type { MatrixRow, Story, World, WorldGap, WorldHeaderView } from './types'
import { plural } from './writing-utils'

// La lógica de la página de un mundo que no es de pantalla ni de servidor: la matriz "Dónde y cuándo", los
// "huecos por llenar" y las cifras de la portada. Todo son funciones puras, así se prueban sin abrir nada.

// "a", "a y b", "a, b y c"
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

// Lo que se dice bajo el nombre de una región en la matriz: "4 reinos · humanos y hadas".
export function regionSub(world: World, regionId: string): string {
  const region = world.regions.find((item) => item.id === regionId)
  if (!region) return ''
  const peoples = joinList(region.peoples.map(lower))
  return region.kingdoms.length ? `${plural(region.kingdoms.length, 'reino', 'reinos')} · ${peoples}` : peoples
}

// La matriz del Resumen (Escritos.dc.html): una fila por región y una primera de "todo el mundo", una columna por
// era. En cada celda van los escritos de lore, las historias y las ideas por escribir que caen en esa región y era.
export function matrixOf(world: World, stories: Story[], hrefs: { timeline: (eraId: string) => string; stories: string }): MatrixRow[] {
  const rowOf = (id: string, name: string, sub: string, regionId: string | null): MatrixRow => ({
    id,
    name,
    sub,
    cells: world.eras.map((era) => ({
      eraId: era.id,
      items: [
        ...world.lore.filter((lore) => lore.eraId === era.id && lore.regionId === regionId).map((lore) => ({ id: lore.id, label: lore.title, kind: 'lore' as const, href: hrefs.timeline(era.id) })),
        ...stories.filter((story) => story.eraId === era.id && story.regionId === regionId).map((story) => ({ id: story.id, label: story.title, kind: 'story' as const, href: hrefs.stories })),
        ...world.ideas.filter((idea) => idea.eraId === era.id && idea.regionId === regionId).map((idea) => ({ id: idea.id, label: idea.title, kind: 'idea' as const, href: hrefs.stories })),
      ],
    })),
  })
  return [rowOf('all', `Todo ${world.name}`, 'El mundo entero', null), ...world.regions.map((region) => rowOf(region.id, region.name, regionSub(world, region.id), region.id))]
}

// "Huecos por llenar": lo que le falta al mundo, sacado de lo que ya tiene (regiones sin página, eras sin eventos,
// el mapa sin subir). En el canvas salen de las notas de Notion; aquí se calculan de los datos.
export function gapsOf(world: World): WorldGap[] {
  const gaps: WorldGap[] = []
  for (const region of world.regions.filter((item) => !item.hasPage)) {
    gaps.push({ id: `page-${region.id}`, title: `Página de ${region.name}`, detail: 'Esta región todavía no tiene su página.' })
  }
  const empty = world.eras.filter((era) => era.events.length === 0)
  if (empty.length > 0) {
    gaps.push({
      id: 'eras-empty',
      title: `Eventos de ${empty.length > 1 ? 'las Eras' : 'la Era'} ${joinList(empty.map((era) => era.number))}`,
      detail: empty.length === 1 ? 'Todavía no tiene eventos.' : empty.length === 2 ? 'Las dos están sin eventos todavía.' : 'Están sin eventos todavía.',
    })
  }
  if (!world.hasMap) gaps.push({ id: 'map', title: 'Mapa épico', detail: 'Todavía no subes el mapa del mundo.' })
  return gaps
}

// Las cifras de la portada: eras, regiones, reinos, especies y personajes.
export function worldHeaderOf(world: World, characterCount: number): WorldHeaderView {
  const kingdoms = world.regions.reduce((sum, region) => sum + region.kingdoms.length, 0)
  return {
    id: world.id,
    name: world.name,
    description: world.description,
    stats: [
      { value: world.eras.length, label: world.eras.length === 1 ? 'era' : 'eras' },
      { value: world.regions.length, label: world.regions.length === 1 ? 'región' : 'regiones' },
      { value: kingdoms, label: kingdoms === 1 ? 'reino' : 'reinos' },
      { value: world.species.length, label: world.species.length === 1 ? 'especie' : 'especies' },
      { value: characterCount, label: characterCount === 1 ? 'personaje' : 'personajes' },
    ],
  }
}
