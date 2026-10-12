import { boolean, date, text, time, timestamp, uuid } from 'drizzle-orm/pg-core'
import { pgSchema } from 'drizzle-orm/pg-core'

export const app = pgSchema('app')

export const themeEnum = app.enum('theme', ['light', 'dark', 'system'])
export const weekStartEnum = app.enum('week_start', ['monday', 'sunday'])
export const hourFormatEnum = app.enum('hour_format', ['12h', '24h'])

// id = auth.users.id: lo pone la API al crear el perfil (cuando se acepta la invitación),
// no una default de la base. Sin FK a auth.users: ese esquema es de Supabase y kairo_api
// no tiene permiso para referenciarlo (ver docs/guides/security.md #5); la integridad la
// garantiza la API, que siempre crea el profile junto con el usuario de Auth.
// Sin deleted_at: borrar la cuenta borra la fila de una vez (security.md #9), no hay papelera de perfiles.
export const profiles = app
  .table('profiles', {
    id: uuid('id').primaryKey(),
    name: text('name'),
    avatarPath: text('avatar_path'),
    timezone: text('timezone').notNull().default('America/Mexico_City'),
    weekStart: weekStartEnum('week_start').notNull().default('monday'),
    hourFormat: hourFormatEnum('hour_format').notNull().default('12h'),
    currency: text('currency').notNull().default('MXN'),
    theme: themeEnum('theme').notNull().default('light'),
    quietFrom: time('quiet_from'),
    quietTo: time('quiet_to'),
    decorationsOn: boolean('decorations_on').notNull().default(true),
    birthday: date('birthday'),
    diaryPinHash: text('diary_pin_hash'),
    onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  })
  .enableRLS()

// Forma común de toda tabla de usuario (docs/guides/data-model.md, "Convenciones").
// login_codes es la única excepción (sin deleted_at) y no la usa.
export const userColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}
