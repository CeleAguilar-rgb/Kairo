import type { ModuleId } from '@kairo/shared'

import { agendaModule } from '@/features/agenda/module'
import { dailyModule } from '@/features/daily/module'
import { financeModule } from '@/features/finance/module'
import { homeModule } from '@/features/home/module'
import { projectsModule } from '@/features/projects/module'
import { remindersModule } from '@/features/reminders/module'
import { schoolModule } from '@/features/school/module'
import { tasksModule } from '@/features/tasks/module'
import { writingsModule } from '@/features/writings/module'

export type ModuleManifest = {
  id: ModuleId
  label: string
  href: string
  // Paths de <path d="…">; algunos íconos del canvas son más de uno (p. ej. Inicio: techo + casa).
  icon: string[]
  // false para módulos con ruta propia que no van en la barra de secciones.
  inNav?: boolean
}

// El topnav recorre esta lista y la filtra por user_sections (ver
// docs/guides/modules.md). Cada módulo declara su manifiesto en
// features/<id>/module.ts; aquí solo se juntan, sin tocar el componente del Shell.
export const modules: ModuleManifest[] = [
  homeModule,
  tasksModule,
  projectsModule,
  agendaModule,
  financeModule,
  writingsModule,
  dailyModule,
  schoolModule,
  remindersModule,
]
