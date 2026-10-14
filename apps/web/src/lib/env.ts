import { z } from 'zod'
import { DEMO_MODE } from '@/lib/demo'

// process.env.NEXT_PUBLIC_* se tiene que referenciar así, uno por uno: Next.js las
// reemplaza en el bundle del navegador buscando exactamente ese patrón en el código,
// no funcionaría pasándole todo `process.env` junto a Zod.
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

// En modo demo (lib/demo.ts) no hay .env: valores de relleno que nunca se
// llegan a usar, porque el demo no habla con Supabase.
export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? (DEMO_MODE ? 'http://demo.invalid' : undefined),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? (DEMO_MODE ? 'demo' : undefined),
})
