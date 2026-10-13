import 'server-only'
import { z } from 'zod'

// Variables de servidor que no son seguras para el navegador (regla #12:
// nada sensible con prefijo NEXT_PUBLIC_). Separado de lib/env.ts porque ese
// archivo lo importa también código de cliente (lib/supabase/client.ts).
const serverEnvSchema = z.object({
  API_URL: z.string().url(),
})

export const serverEnv = serverEnvSchema.parse({
  API_URL: process.env.API_URL,
})
