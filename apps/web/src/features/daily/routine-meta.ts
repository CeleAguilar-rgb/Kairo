import type { GoalArea, GoalKind, MoodLevel, RoutineIcon } from './types'

// Lo visual de Día a día que viene del canvas: los trazos de los íconos de bloque, las caritas del ánimo y los
// nombres de áreas y tipos de meta. Sin colores aquí: los colores van en los CSS Modules con variables.

export const ROUTINE_ICON_META: Record<RoutineIcon, { label: string; d: string }> = {
  sun: { label: 'Sol', d: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' },
  drop: { label: 'Gota', d: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z' },
  pill: { label: 'Pastilla', d: 'M8.5 3.5a5 5 0 0 1 7 7l-5 5a5 5 0 0 1-7-7l5-5zM6 11l7 7' },
  food: { label: 'Cubiertos', d: 'M4 3v8a3 3 0 0 0 3 3v7M7 3v5M10 3v8a3 3 0 0 1-3 3M17 21V3c-2 1-3 4-3 8h3' },
  cap: { label: 'Birrete', d: 'M3 9l9-5 9 5-9 5-9-5zM7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5' },
  code: { label: 'Código', d: 'M8 8l-4 4 4 4M16 8l4 4-4 4' },
  pen: { label: 'Pluma', d: 'M14 4l6 6L9 21H3v-6L14 4z' },
  work: { label: 'Maletín', d: 'M4 8h16v11H4zM9 8V5h6v3' },
  moon: { label: 'Luna', d: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z' },
}

// Las cinco caritas del Diario (Diario.dc.html): nombre y la boca; el color sale de --mood-N.
export const MOOD_META: Record<MoodLevel, { label: string; mouth: string }> = {
  0: { label: 'Muy mal', mouth: 'M13 27c4-4 10-4 14 0' },
  1: { label: 'Mal', mouth: 'M14 26c3-2 9-2 12 0' },
  2: { label: 'Normal', mouth: 'M14 25h12' },
  3: { label: 'Bien', mouth: 'M14 24c3 2.5 9 2.5 12 0' },
  4: { label: 'Muy bien', mouth: 'M13 23c3 5 11 5 14 0' },
}

export const GOAL_AREA_LABEL: Record<GoalArea, string> = {
  work: 'Trabajo',
  personal: 'Personal',
  school: 'Escuela',
  health: 'Salud',
  money: 'Dinero',
}

export const GOAL_KIND_LABEL: Record<GoalKind, string> = {
  milestones: 'Logro',
  number: 'Número',
  habit: 'Hábito',
  project: 'Proyecto',
}

// Debajo del nombre en "Cómo se mide" (la nueva meta).
export const GOAL_KIND_DESCRIPTION: Record<GoalKind, string> = {
  milestones: 'Se cumple o no; con hitos',
  number: 'Llegar a una cantidad',
  habit: 'Ligada a tu rutina',
  project: 'Ligada a un proyecto',
}

// En el detalle de la meta, bajo el avance.
export const GOAL_KIND_LONG: Record<GoalKind, string> = {
  milestones: 'Se mide por hitos',
  number: 'Vas sumando avance',
  habit: 'Sale de tu rutina',
  project: 'Sale del avance del proyecto',
}

export const GOAL_KIND_ICON: Record<GoalKind, string> = {
  milestones: 'M5 12l5 5L20 7',
  number: 'M4 19h16M7 16V9M12 16V5M17 16v-4',
  habit: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  project: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
}
