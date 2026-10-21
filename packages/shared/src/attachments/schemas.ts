import { z } from 'zod'

import { PROJECT_FILE_MAX_BYTES } from '../projects/constants'
import { COVER_IMAGE_MAX_BYTES } from './constants'

// Paso 1 de subir un archivo: pedir la URL firmada. La API vuelve a revisar tipo y tamaño antes de
// firmar (security.md #7); esto solo evita firmar una subida que ya se sabe que se va a rechazar.
export const signAttachmentUploadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ponle un nombre al archivo.')
    .max(200, 'Máximo 200 caracteres.'),
  mime: z.string().trim().min(1).max(127),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(PROJECT_FILE_MAX_BYTES, 'El archivo pesa más de lo permitido.'),
})

export type SignAttachmentUploadInput = z.infer<
  typeof signAttachmentUploadSchema
>

// Paso 2: ya se subió. La API no confía en `path`: antes de crear la fila, vuelve a preguntarle a
// Storage qué hay realmente ahí (tamaño y tipo reales).
export const confirmAttachmentUploadSchema = z.object({
  path: z.string().trim().min(1).max(500),
  name: z
    .string()
    .trim()
    .min(1, 'Ponle un nombre al archivo.')
    .max(200, 'Máximo 200 caracteres.'),
})

export type ConfirmAttachmentUploadInput = z.infer<
  typeof confirmAttachmentUploadSchema
>

// La portada subida de un proyecto: mismo patrón en dos pasos, con el límite más chico de una imagen de portada.
// El tipo se valida igual que un archivo de la pestaña Archivos (classifyProjectFile(name) === 'image').
export const signCoverUploadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Elige una imagen.')
    .max(200, 'Máximo 200 caracteres.'),
  mime: z.string().trim().min(1).max(127),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(COVER_IMAGE_MAX_BYTES, 'La imagen pesa más de lo permitido.'),
})

export type SignCoverUploadInput = z.infer<typeof signCoverUploadSchema>

export const confirmCoverUploadSchema = z.object({
  path: z.string().trim().min(1).max(500),
})

export type ConfirmCoverUploadInput = z.infer<typeof confirmCoverUploadSchema>
