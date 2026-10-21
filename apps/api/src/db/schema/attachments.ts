import { bigint, text, uuid } from 'drizzle-orm/pg-core'
import { app, userColumns } from './_shared'
import { projects } from './projects'

// Archivos de la pestaña Archivos de un proyecto (paso de Storage, decisión #41/#44). `data-model.md`
// prevé también `page_id` hacia Escritos (`pages`, exactamente una de las dos con un CHECK), pero esa
// tabla no existe todavía: llega con su propia migración cuando le toque su turno a Escritos.
export const attachments = app
  .table('attachments', {
    ...userColumns,
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    storagePath: text('storage_path').notNull(),
    mime: text('mime').notNull(),
    // bigint con mode 'number': un archivo nunca pesa cerca de los 9 mil billones de bytes que
    // desbordarían un number de JS, y así se puede sumar con el resto de la aritmética normal.
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  })
  .enableRLS()
