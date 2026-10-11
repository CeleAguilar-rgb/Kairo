# 2026-10-10 · Planeación de arquitectura y guías

**Hecho en:** chat de claude.ai (sin código)

## Qué se hizo

- Se revisaron el canvas de diseño "Kairo" (57 pantallas) y el documento "Mi tablero · Funcionalidades y base de datos".
- Se definió la arquitectura: monorepo, front Next.js y back NestJS separados, paquete compartido, solo la API toca la base.
- Se escribieron `CLAUDE.md` y `docs/guides/` (features, architecture, security, data-model, modules, theming, design, roadmap, conventions, decisions).
- Se copiaron las pantallas a `docs/design/screens/`.

## Decisiones tomadas

Las 16 de `docs/guides/decisions.md`. Las que cambiaron respecto al diseño o a ideas previas:
- Login: contraseña + código al correo (no app autenticadora ni enlace mágico); solo por invitación.
- Temporadas: solo adornos por mes, sin cambio de colores.
- ORM: Drizzle en lugar de Prisma.
- Despliegue: web y API en Vercel (plan gratis); las tareas programadas las dispara Supabase Cron.
- El proyecto también es para aprender: estilo Learning activado, plan del molde y `docs/learning/`.
- Primera versión solo en PC; teléfono, modo oscuro, varios usuarios y sin conexión quedan para después.
- "Trabajo" y "situaciones personales" no son módulos.

## Quedó pendiente

Ver "Pendientes de decidir" en `docs/history/current.md`.

## Notas para la siguiente sesión

- El usuario prefiere ir tema por tema, con preguntas cortas, y se confunde si llegan muchas preguntas de golpe.
- Cuando el usuario edite el canvas de diseño, hay que actualizar `docs/design/screens/`.
