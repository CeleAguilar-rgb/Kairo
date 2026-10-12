import { boolean, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { app, profiles, userColumns } from './_shared'

// Mismos ids que MODULE_IDS en packages/shared/src/modules.ts y la tabla de docs/guides/modules.md.
// Lista cerrada: agregar un módulo nuevo es una migración (ALTER TYPE ... ADD VALUE) en los dos lados.
export const moduleIdEnum = app.enum('module_id', [
  'home',
  'tasks',
  'reminders',
  'agenda',
  'daily',
  'finance',
  'school',
  'projects',
  'writings',
  'focus',
])

export const userSections = app
  .table('user_sections', {
    ...userColumns,
    section: moduleIdEnum('section').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    position: integer('position').notNull(),
    inBottomNav: boolean('in_bottom_nav').notNull().default(false),
  })
  .enableRLS()

// card es texto, no enum: a diferencia de los módulos (lista cerrada en moduleIdEnum), cada
// módulo registra sus propias tarjetas en su manifiesto (docs/guides/modules.md, homeCards: [...]);
// la lista crece sin tocar este archivo.
export const homeCards = app
  .table('home_cards', {
    ...userColumns,
    card: text('card').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    position: integer('position').notNull(),
  })
  .enableRLS()

export const connectionProviderEnum = app.enum('connection_provider', [
  'notion',
  'canva',
  'spotify',
  'claude',
])

export const connections = app
  .table('connections', {
    ...userColumns,
    provider: connectionProviderEnum('provider').notNull(),
    status: text('status').notNull(),
    tokenRef: text('token_ref'),
    connectedAt: timestamp('connected_at', { withTimezone: true }),
  })
  .enableRLS()

export const notifications = app
  .table('notifications', {
    ...userColumns,
    title: text('title').notNull(),
    body: text('body'),
    link: text('link'),
    readAt: timestamp('read_at', { withTimezone: true }),
    sourceType: text('source_type').notNull(),
    sourceId: uuid('source_id'),
  })
  .enableRLS()

export const pushSubscriptions = app
  .table('push_subscriptions', {
    ...userColumns,
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  })
  .enableRLS()

// Sin deleted_at: un job borra los vencidos (docs/guides/data-model.md).
export const loginCodes = app
  .table('login_codes', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    sessionId: text('session_id').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  })
  .enableRLS()

// deletedAt marca una sesión cerrada ("cerrar sesión en todos los dispositivos" = soft-delete de todas las propias).
export const verifiedSessions = app
  .table('verified_sessions', {
    ...userColumns,
    sessionId: text('session_id').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull().defaultNow(),
    userAgent: text('user_agent'),
    ipHint: text('ip_hint'),
  })
  .enableRLS()
