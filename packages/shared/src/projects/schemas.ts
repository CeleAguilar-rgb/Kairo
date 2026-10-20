import { z } from 'zod'

import { PROJECT_COVER_KEYS, PROJECT_KINDS, PROJECT_STATUSES, SPRINT_CLOSE_MOVES, SPRINT_WEEKS } from './constants'

// Un enlace del proyecto (tabla project_links). Solo http(s): un "javascript:" guardado como
// enlace no debe poder ejecutarse al abrirlo.
export const projectLinkSchema = z.object({
  title: z.string().trim().min(1, 'Ponle un nombre al enlace.').max(80, 'Máximo 80 caracteres.'),
  url: z
    .url({ protocol: /^https?$/, hostname: z.regexes.domain, error: 'Ese enlace no se ve completo. Empieza con https://' })
    .max(2048, 'El enlace es demasiado largo.'),
})

export type ProjectLinkInput = z.infer<typeof projectLinkSchema>

// Formulario de proyecto (ProyectoEditar.dc.html): sirve para crear y para editar. Los días son
// días sueltos (started_on, goal_on, 'AAAA-MM-DD'). `cover` es la clave de una portada ilustrada;
// cuando exista la subida de imágenes llevará también una ruta de Storage.
export const projectSchema = z
  .object({
    name: z.string().trim().min(1, 'Escribe un nombre para el proyecto.').max(80, 'Máximo 80 caracteres.'),
    kind: z.enum(PROJECT_KINDS),
    status: z.enum(PROJECT_STATUSES),
    description: z.string().trim().max(500, 'Máximo 500 caracteres.'),
    startedOn: z.iso.date().nullable(),
    goalOn: z.iso.date().nullable(),
    objectives: z.array(z.string().trim().min(1).max(200, 'Cada objetivo puede tener hasta 200 caracteres.')).max(30),
    links: z.array(projectLinkSchema).max(30),
    cover: z.enum(PROJECT_COVER_KEYS).nullable(),
  })
  .refine((project) => !project.startedOn || !project.goalOn || project.goalOn >= project.startedOn, {
    path: ['goalOn'],
    error: 'La fecha meta no puede ser antes del inicio.',
  })

export type ProjectInput = z.infer<typeof projectSchema>

// Las notas del proyecto (el cuadro del Resumen): se guardan solas al salir del campo, sin pasar por el
// formulario completo.
export const projectNotesSchema = z.object({
  notes: z.string().trim().max(5000, 'Máximo 5000 caracteres.'),
})

export type ProjectNotesInput = z.infer<typeof projectNotesSchema>

// La fecha meta que se elige desde el Resumen (también sin pasar por el formulario completo). La API revisa que
// no sea antes del inicio del proyecto.
export const projectGoalDateSchema = z.object({
  goalOn: z.iso.date().nullable(),
})

export type ProjectGoalDateInput = z.infer<typeof projectGoalDateSchema>

// --- Sprints ---------------------------------------------------------------------------------------

const sprintWeeks = z.union([z.literal(SPRINT_WEEKS[0]), z.literal(SPRINT_WEEKS[1])])

// "Empezar Sprint N": solo cuando el proyecto no tiene uno activo. Empieza hoy.
export const startSprintSchema = z.object({
  goal: z.string().trim().max(200, 'Máximo 200 caracteres.'),
  weeks: sprintWeeks,
})

export type StartSprintInput = z.infer<typeof startSprintSchema>

// "Cerrar Sprint N": qué hacer con lo que falta, cuánto dura el siguiente, su meta y las notas de este.
export const closeSprintSchema = z.object({
  move: z.enum(SPRINT_CLOSE_MOVES),
  weeks: sprintWeeks,
  notes: z.string().trim().max(2000, 'Máximo 2000 caracteres.'),
  nextGoal: z.string().trim().max(200, 'Máximo 200 caracteres.'),
})

export type CloseSprintInput = z.infer<typeof closeSprintSchema>

// Meter una tarea del backlog al sprint activo.
export const addSprintTaskSchema = z.object({
  taskId: z.uuid(),
})

export type AddSprintTaskInput = z.infer<typeof addSprintTaskSchema>
