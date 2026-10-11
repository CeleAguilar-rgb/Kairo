# Decisiones

Registro de decisiones tomadas con el usuario. **No las cambies sin que el usuario lo pida.** Si una decisión nueva reemplaza a otra, agrégala abajo y marca la anterior como reemplazada.

| # | Fecha | Decisión | Por qué / alternativas descartadas |
|---|---|---|---|
| 1 | 2026-10-10 | Frontend y backend separados en un monorepo (pnpm + Turborepo) | Separar responsabilidades y compartir tipos y validaciones. Una sola app con Next.js descartada. |
| 2 | 2026-10-10 | Backend con NestJS | Su estructura de módulos encaja con las secciones. Descartados Hono/Fastify (menos estructura) y Laravel (no comparte tipos con el front). |
| 3 | 2026-10-10 | Frontend con Next.js (App Router) + TypeScript, CSS Modules + variables CSS, Motion | Sin Tailwind: al usuario no le gusta el HTML lleno de clases. |
| 4 | 2026-10-10 | Supabase para Postgres, Auth y Storage; Drizzle como ORM en la API, con migraciones de drizzle-kit | Consultas explícitas y cercanas a SQL: el usuario quiere aprender fundamentos de bases de datos, y los filtros explícitos reducen el riesgo de "ORM leak". Prisma descartado (más magia, filtros muy flexibles). Solo la API toca la base. |
| 5 | 2026-10-10 | Datos totalmente aislados por usuario | Más simple y seguro. Compartir queda para más adelante. |
| 6 | 2026-10-10 | Registro solo por invitación | Es privado; nadie debe poder crear cuenta por su cuenta. |
| 7 | 2026-10-10 | Login: correo + contraseña + código de 6 dígitos al correo | Descartados: app autenticadora (no la quiere) y enlace mágico (falla al cambiar de dispositivo). |
| 8 | 2026-10-10 | Sesión de 30 días, con "cerrar sesión en todos los dispositivos" | El usuario deja la app abierta y no quiere entrar seguido. |
| 9 | 2026-10-10 | Avisos dentro de la app y Web Push en el navegador; nunca por correo | Preferencia del usuario. |
| 10 | 2026-10-10 | Finanzas solo en pesos (MXN); columna `currency` preparada | Conversión de monedas descartada por ahora. |
| 11 | 2026-10-10 | Temporadas: una festividad por mes, automática; solo cambian adornos | Lo más sencillo. Descartados cambios de paleta y animaciones por estación. |
| 12 | 2026-10-10 | El canvas de diseño es la fuente de verdad visual | El usuario lo seguirá editando. |
| 13 | 2026-10-10 | Primera versión en PC con todos los módulos; teléfono, modo oscuro, varios usuarios, sin conexión, exportar e integraciones después | Ver `docs/guides/roadmap.md`. |
| 14 | 2026-10-10 | Tests solo de lo crítico (seguridad, auth, cálculos) | Balance entre avanzar y no romper lo importante. |
| 15 | 2026-10-10 | ~~Tareas programadas en la API con `@nestjs/schedule`~~ **Reemplazada por la 17.** | — |
| 16 | 2026-10-10 | "Trabajo" y "situaciones personales" no son módulos | Viven en proyectos, eventos y el diario, como en el diseño. |
| 17 | 2026-10-10 | Web y API desplegadas en Vercel (plan gratis). Tareas programadas: lógica en la API, disparadas cada minuto por Supabase Cron con un secreto | En Vercel la API no corre todo el tiempo, y el cron de Vercel gratis solo corre una vez al día. Descartados Railway, Render y Fly.io para no mantener otro servicio. |
| 18 | 2026-10-10 | El proyecto también es para aprender: estilo Learning de Claude Code activado y registro en `docs/learning/` | El usuario quiere aprender estructura y buenas prácticas construyéndolo. Ver la sección "Aprendizaje" de `CLAUDE.md`. |
| 19 | 2026-10-10 | GitHub Flow: `main` solo con lo revisado y funcionando, todo trabajo en ramas y Pull Requests; Conventional Commits con la descripción en español; commits y push solo con autorización del usuario | El usuario quiere controlar qué entra a `main` y usa la extensión Conventional Commits de VS Code. |
