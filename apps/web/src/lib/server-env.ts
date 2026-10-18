import 'server-only'
import { z } from 'zod'
import { DEMO_MODE } from '@/lib/demo'

// Variables de servidor que no son seguras para el navegador (regla #12:
// nada sensible con prefijo NEXT_PUBLIC_). Separado de lib/env.ts porque ese
// archivo lo importa también código de cliente (lib/supabase/client.ts).
const serverEnvSchema = z.object({
  API_URL: z.string().url(),
})

export const serverEnv = serverEnvSchema.parse({
  // En modo demo nadie llama a la API (getMe y los módulos usan datos de ejemplo).
  API_URL: process.env.API_URL ?? (DEMO_MODE ? 'http://demo.invalid' : undefined),
})
