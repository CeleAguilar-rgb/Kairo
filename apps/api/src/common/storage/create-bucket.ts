import { createClient } from '@supabase/supabase-js'
import { PROJECT_FILE_EXTENSIONS, PROJECT_FILE_MAX_BYTES } from '@kairo/shared'
import { env } from '../env'

// Script de una sola vez (igual que auth/invite-initial-user.ts): crea el bucket privado de
// Storage. Correrlo con `pnpm run storage:create-bucket`. Si el bucket ya existe, Supabase
// responde con un error que esto reporta sin tronar (no hay nada que rehacer).
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Límite y tipos a nivel de bucket: una segunda capa además de la validación de la API
// (docs/guides/security.md #7), por si algún día algo firma una subida sin pasar por ahí.
const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  md: 'text/markdown',
  txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

async function main() {
  // Los mismos tipos que aceptan los archivos de un proyecto (classifyProjectFile): la portada
  // subida es, de hecho, una imagen de ese mismo conjunto.
  const allowedMimeTypes = PROJECT_FILE_EXTENSIONS.map(
    (extension) => MIME_BY_EXTENSION[extension],
  ).filter((mime): mime is string => Boolean(mime))

  const { error } = await admin.storage.createBucket(
    env.SUPABASE_STORAGE_BUCKET,
    {
      public: false,
      fileSizeLimit: PROJECT_FILE_MAX_BYTES,
      allowedMimeTypes,
    },
  )

  if (error) {
    console.error('Error al crear el bucket:', error.message)
    process.exit(1)
  }

  console.log(`Bucket privado "${env.SUPABASE_STORAGE_BUCKET}" creado.`)
}

main()
