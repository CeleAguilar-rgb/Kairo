import { z } from 'zod'

// Una hora de pared "HH:MM" de 24 horas ('09:30', '17:00'). La comparten los formularios que piden
// una hora (eventos de la Agenda, recordatorios). No se exporta del paquete: es un ladrillo interno.
export const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Escribe una hora válida.')
