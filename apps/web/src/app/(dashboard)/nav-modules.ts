import type { UserSection } from '@/lib/account/api'
import { modules, type ModuleManifest } from '@/lib/modules/registry'

// Las secciones que ve la persona, en su orden (user_sections). La usan el menú de arriba (Topnav) y la
// barra de abajo del teléfono (BottomTabs): las dos tienen que mostrar exactamente lo mismo.
export function navModules(sections: UserSection[]): ModuleManifest[] {
  const sectionByModule = new Map(sections.map((section) => [section.section, section]))
  return modules
    .filter((module) => module.inNav !== false)
    .filter((module) => module.id === 'home' || sectionByModule.get(module.id)?.enabled)
    .sort((a, b) => (sectionByModule.get(a.id)?.position ?? -1) - (sectionByModule.get(b.id)?.position ?? -1))
}

// '/' solo es Inicio exacto; las demás rutas cuentan también sus subrutas
// (/proyectos/abc sigue marcando Proyectos).
export function findActive(list: ModuleManifest[], pathname: string) {
  const match = list.find((module) =>
    module.href === '/' ? pathname === '/' : pathname === module.href || pathname.startsWith(`${module.href}/`),
  )
  return match?.id ?? null
}

// Las pestañas fijas de la barra del teléfono (AppMas.dc.html): Inicio, Tareas, Agenda y Día a día.
// Lo demás va en "Más". Si alguna de las fijas está apagada, su lugar lo toma la siguiente sección.
const PINNED = ['home', 'tasks', 'agenda', 'daily'] as const
const TAB_SLOTS = 4

export function splitTabs(visible: ModuleManifest[]): { tabs: ModuleManifest[]; more: ModuleManifest[] } {
  const pinned = PINNED.map((id) => visible.find((module) => module.id === id)).filter((module) => module !== undefined)
  const others = visible.filter((module) => !pinned.includes(module))
  const ordered = [...pinned, ...others]
  // Con una sola sección de sobra no hace falta "Más": va directo como quinta pestaña.
  if (ordered.length <= TAB_SLOTS + 1) return { tabs: ordered, more: [] }
  return { tabs: ordered.slice(0, TAB_SLOTS), more: ordered.slice(TAB_SLOTS) }
}
