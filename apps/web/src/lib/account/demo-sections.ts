import 'server-only'
import { MODULE_IDS, updateSectionsSchema, type ModuleId, type UpdateSectionsInput } from '@kairo/shared'
import { cookies } from 'next/headers'
import type { UserSection } from './api'

// Solo para el modo demo (lib/demo.ts): no hay base de datos que guarde qué secciones se prendieron
// ni en qué orden, así que se guardan en una cookie, como ya se hace con el tema. En la app real
// esto no se usa: las secciones viven en user_sections y las guarda la API.
export const DEMO_SECTIONS_COOKIE = 'kairo_demo_sections'

// Una sola cookie con la lista en orden; una sección apagada lleva "-" delante: 'home,tasks,-finance'.
export function encodeDemoSections(sections: UpdateSectionsInput['sections']): string {
  return [...sections]
    .sort((a, b) => a.position - b.position)
    .map((item) => (item.enabled ? item.section : `-${item.section}`))
    .join(',')
}

// Aplica la cookie sobre las secciones de ejemplo. Lo que la cookie no nombra (o trae mal) se queda
// como estaba, para que un valor raro nunca deje a la persona sin secciones.
export async function applyDemoSections(base: UserSection[]): Promise<UserSection[]> {
  const store = await cookies()
  const raw = store.get(DEMO_SECTIONS_COOKIE)?.value
  if (!raw) return base

  const validIds = new Set<string>(MODULE_IDS)
  const listed: { section: ModuleId; enabled: boolean }[] = []
  for (const token of raw.split(',')) {
    const enabled = !token.startsWith('-')
    const id = enabled ? token : token.slice(1)
    if (validIds.has(id) && !listed.some((item) => item.section === id)) {
      listed.push({ section: id as ModuleId, enabled })
    }
  }

  const unlisted = base.filter((item) => !listed.some((entry) => entry.section === item.section))
  const merged = [...listed, ...unlisted.map(({ section, enabled }) => ({ section, enabled }))]
  const result = merged.map((item, position) => ({ ...item, position }))

  // Nunca todas apagadas: el esquema real también exige al menos una.
  return updateSectionsSchema.safeParse({ sections: result }).success && result.some((item) => item.enabled)
    ? result
    : base
}
