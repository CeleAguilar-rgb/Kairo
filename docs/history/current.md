# Dónde nos quedamos

> Léelo al empezar cada sesión. Actualízalo al terminar. Máximo ~60 líneas: es un resumen, no un diario. El detalle va en `sessions/`.

**Última actualización:** 2026-10-10 · sesión `2026-10-10-planeacion.md`

## Fase actual

Fase 0 (base), **sin empezar**. El repo solo tiene documentación.

## Lo último que se hizo

- Se definieron arquitectura, seguridad, stack, modelo de datos, orden de módulos y reglas en `CLAUDE.md` y `docs/guides/`.
- Se copiaron las pantallas del diseño a `docs/design/screens/`.
- Despliegue definido: todo en Vercel (plan gratis) + Supabase Cron para tareas programadas.
- Modo aprendizaje: estilo Learning en `.claude/settings.json` y notas en `docs/learning/`.

## Siguiente paso

Fase 0, punto 1 de `docs/guides/roadmap.md`: crear el monorepo (pnpm workspaces + Turborepo) con `apps/web`, `apps/api` y `packages/shared`, TypeScript estricto, ESLint y Prettier. **Proponer el plan al usuario antes de crear archivos.**

## Pendientes de decidir con el usuario

- Proveedor para enviar correos (código de login, invitaciones): SMTP de Supabase o un servicio como Resend.
- Pascua: fija todo abril o según la fecha real.
- Tareas que se repiten, o si eso vive solo en Recordatorios.
- Agenda: mostrar la rutina detrás de los eventos y arrastrar eventos.

- Proteger `main` en GitHub (pedir Pull Request para hacer merge).
- En la Fase 0: si se agrega commitlint + husky para validar los mensajes de commit, y GitHub Actions para revisar cada Pull Request.

## Bloqueos o problemas abiertos

Ninguno.
