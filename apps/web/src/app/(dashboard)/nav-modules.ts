import type { UserSection } from '@/lib/account/api'
import { modules, type ModuleManifest } from '@/lib/modules/registry'

// Las secciones que ve la persona, en su orden (user_sections). La usan el menú de arriba (Topnav) y la
// barra de abajo del teléfono (BottomTabs): las dos tienen que mostrar exactamente lo mismo.
//
// `mobile`: en el teléfono también entran los módulos con `inNav: false` (Escuela y Recordatorios). Esa bandera
// existe porque en el escritorio el nav no cabe con más de 7 secciones junto a los íconos; en el teléfono hay
// barra de 5 más el menú del avatar, así que no hay ese límite.
export function navModules(sections: UserSection[], { mobile = false }: { mobile?: boolean } = {}): ModuleManifest[] {
  const sectionByModule = new Map(sections.map((section) => [section.section, section]))
  return modules
    .filter((module) => mobile || module.inNav !== false)
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

// La barra del teléfono muestra las primeras 5 secciones del orden de la persona (Perfil → Mis secciones);
// las demás van en el menú del avatar (Topnav). Con 5 o menos, la barra las muestra todas.
export const TAB_SLOTS = 5

export function splitTabs(visible: ModuleManifest[]): { tabs: ModuleManifest[]; rest: ModuleManifest[] } {
  return { tabs: visible.slice(0, TAB_SLOTS), rest: visible.slice(TAB_SLOTS) }
}
