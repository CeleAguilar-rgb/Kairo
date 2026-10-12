import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './src/drizzle',
  dialect: 'postgresql',
  schemaFilter: ['app'],
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
})
