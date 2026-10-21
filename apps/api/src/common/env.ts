import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  // El bucket privado de Storage (docs/guides/security.md #7). Se crea una sola vez con
  // `pnpm run storage:create-bucket` (src/common/storage/create-bucket.ts).
  SUPABASE_STORAGE_BUCKET: z.string().min(1),
})

export const env = envSchema.parse(process.env)
