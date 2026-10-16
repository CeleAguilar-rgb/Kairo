import { z } from 'zod'

import { timeOfDay } from '../time'

import {
  GOAL_AREAS,
  GOAL_KINDS,
  JOURNAL_TAGS,
  MEALS,
  ROUTINE_DAYS_COUNT,
  ROUTINE_ICONS,
  ROUTINE_KINDS,
  ROUTINE_NAGS,
} from './constants'

// Un id que llega de la pantalla. En los datos de ejemplo no son uuid (igual que en Recordatorios); con la
// API serán `z.uuid()` y cada consulta llevará `where: { id, userId }`.
export const idSchema = z.string().min(1).max(64)

// Un día suelto ('AAAA-MM-DD'). También el día de inicio de una semana en la dirección de la pantalla
// (`?semana=2026-10-05`): se valida como cualquier otra entrada aunque venga de la barra de direcciones.
export const isoDateSchema = z.iso.date()

// --- Rutina ---------------------------------------------------------------------------------------

// Formulario de un bloque (RutinaEditar.dc.html): sirve para crear y editar.
export const routineBlockSchema = z
  .object({
    title: z.string().trim().min(1, 'Ponle un nombre al bloque, como "Tomar agua".').max(80, 'Máximo 80 caracteres.'),
    startsAt: timeOfDay,
    endsAt: timeOfDay.nullable(),
    kind: z.enum(ROUTINE_KINDS),
    icon: z.enum(ROUTINE_ICONS),
    // Solo para el enfoque: de qué área o proyecto sale la siguiente tarea.
    link: z.string().min(1).max(64).nullable(),
    alert: z.boolean(),
    nagMinutes: z.literal(ROUTINE_NAGS),
    countsForReport: z.boolean(),
  })
  .superRefine((block, context) => {
    if (block.endsAt && block.endsAt <= block.startsAt) {
      context.addIssue({ code: 'custom', path: ['endsAt'], message: 'Tiene que terminar después de empezar.' })
    }
  })

export type RoutineBlockInput = z.infer<typeof routineBlockSchema>

// Nombre, días y si está activa (la parte de arriba de "Mis rutinas").
export const routineSchema = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre a la rutina.').max(40, 'Máximo 40 caracteres.'),
  days: z.array(z.boolean()).length(ROUTINE_DAYS_COUNT),
  active: z.boolean(),
})

export type RoutineInput = z.infer<typeof routineSchema>

// Marcar o desmarcar un bloque de hoy. La hora de la marca (y si fue "tarde") la pone el servidor con su
// reloj, no la pantalla: el usuario no decide si llegó a tiempo.
export const toggleRoutineBlockSchema = z.object({
  blockId: idSchema,
  done: z.boolean(),
})

export type ToggleRoutineBlockInput = z.infer<typeof toggleRoutineBlockSchema>

// --- Menú semanal ---------------------------------------------------------------------------------

// Un platillo de la semana (MenuSemanal.dc.html). Sin platillo, el espacio queda vacío.
export const mealSlotSchema = z.object({
  date: z.iso.date(),
  meal: z.enum(MEALS),
  dish: z.string().trim().max(80, 'Máximo 80 caracteres.'),
  prep: z.boolean(),
  note: z.string().trim().max(120, 'Máximo 120 caracteres.'),
})

export type MealSlotInput = z.infer<typeof mealSlotSchema>

// Una comida de un día: para quitarla, repetirla de lunes a viernes o marcarla como comida.
export const mealRefSchema = z.object({
  date: z.iso.date(),
  meal: z.enum(MEALS),
})

export type MealRefInput = z.infer<typeof mealRefSchema>

// Una semana completa, por su primer día: vaciarla o empezarla en blanco.
export const weekSchema = z.object({ week: z.iso.date() })

export type WeekInput = z.infer<typeof weekSchema>

// Copiar el menú de una semana a otra.
export const copyWeekSchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
})

export type CopyWeekInput = z.infer<typeof copyWeekSchema>

// --- Diario ---------------------------------------------------------------------------------------

// La entrada del día (Diario.dc.html). El ánimo es obligatorio; lo demás, no.
export const journalEntrySchema = z.object({
  date: z.iso.date(),
  mood: z.number('Elige una carita para guardar tu ánimo de hoy.').int().min(0).max(4),
  body: z.string().max(5000, 'Máximo 5000 caracteres.'),
  gratitude: z.array(z.string().trim().max(140, 'Máximo 140 caracteres.')).max(3),
  tags: z.array(z.enum(JOURNAL_TAGS)).max(JOURNAL_TAGS.length),
})

export type JournalEntryInput = z.infer<typeof journalEntrySchema>

// --- Metas ----------------------------------------------------------------------------------------

// Formulario de meta (Metas.dc.html). Cada tipo pide lo suyo: una cantidad, un bloque de la rutina…
export const goalSchema = z
  .object({
    title: z.string().trim().min(1, 'Ponle un nombre a tu meta para poder guardarla.').max(120, 'Máximo 120 caracteres.'),
    area: z.enum(GOAL_AREAS),
    kind: z.enum(GOAL_KINDS),
    // Solo para "Número": la cantidad a alcanzar y su unidad ("12" y "libros").
    target: z.number().positive('La cantidad tiene que ser mayor a cero.').max(1_000_000_000).nullable(),
    unit: z.string().trim().max(24, 'Máximo 24 caracteres.'),
    // Solo para "Hábito": el bloque de la rutina del que sale el avance.
    blockId: idSchema.nullable(),
    // Solo para "Proyecto": el proyecto del que sale el avance.
    projectId: idSchema.nullable(),
    dueOn: z.iso.date().nullable(),
    why: z.string().trim().max(160, 'Máximo 160 caracteres.'),
  })
  .superRefine((goal, context) => {
    if (goal.kind === 'number' && goal.target === null) {
      context.addIssue({ code: 'custom', path: ['target'], message: 'Escribe la cantidad que quieres alcanzar, como "12 libros".' })
    }
    if (goal.kind === 'habit' && goal.blockId === null) {
      context.addIssue({ code: 'custom', path: ['blockId'], message: 'Elige el bloque de tu rutina.' })
    }
    if (goal.kind === 'project' && goal.projectId === null) {
      context.addIssue({ code: 'custom', path: ['projectId'], message: 'Elige el proyecto.' })
    }
  })

export type GoalInput = z.infer<typeof goalSchema>

// Sumar avance a una meta de tipo Número.
export const addGoalProgressSchema = z.object({
  amount: z.number('Escribe cuánto avanzaste.').positive('Escribe cuánto avanzaste.').max(1_000_000_000),
})

export type AddGoalProgressInput = z.infer<typeof addGoalProgressSchema>

// Un hito de una meta de tipo Logro.
export const milestoneSchema = z.object({
  text: z.string().trim().min(1, 'Escribe el hito.').max(120, 'Máximo 120 caracteres.'),
})

export type MilestoneInput = z.infer<typeof milestoneSchema>
