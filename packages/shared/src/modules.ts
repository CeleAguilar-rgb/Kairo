// Lista cerrada: coincide con moduleIdEnum en apps/api/src/db/schema/account.ts
// y con la tabla de docs/guides/modules.md. Agregar un módulo nuevo es una
// migración (ALTER TYPE ... ADD VALUE) además de agregarlo aquí.
export const MODULE_IDS = [
  'home',
  'tasks',
  'reminders',
  'agenda',
  'daily',
  'finance',
  'school',
  'projects',
  'writings',
  'focus',
] as const

export type ModuleId = (typeof MODULE_IDS)[number]
