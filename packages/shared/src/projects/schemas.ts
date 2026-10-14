import { z } from 'zod'

import { PROJECT_COVER_KEYS, PROJECT_KINDS, PROJECT_STATUSES } from './constants'

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
