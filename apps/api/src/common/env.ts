import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  // El bucket privado de Storage (docs/guides/security.md #7). Se crea una sola vez con
  // `pnpm run storage:create-bucket` (src/common/storage/create-bucket.ts).
  SUPABASE_STORAGE_BUCKET: z.string().min(1),
  // Web Push (avisos en el navegador). Opcionales: sin ellas los avisos solo salen en el panel de la app.
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z.string().min(1).optional(),
  // El header X-Job-Secret de las tareas programadas (architecture.md). Sin él, /v1/internal/jobs responde 404 siempre.
  JOB_SECRET: z.string().min(32).optional(),
})

export const env = envSchema.parse(process.env)
