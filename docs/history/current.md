# Dónde nos quedamos

> Léelo al empezar cada sesión. Actualízalo al terminar. Máximo ~60 líneas: es un resumen, no un diario. El detalle va en `sessions/`.

**Última actualización:** 2026-10-10 · sesión `2026-10-10-monorepo-setup.md`

## Fase actual

Fase 0 (base), **en progreso**. Paso 1 de 6 (monorepo) listo, en la rama `chore/monorepo-setup` (todavía sin commit: lo hace el usuario).

## Lo último que se hizo

- Monorepo armado: `apps/web` (Next 16, sin Tailwind), `apps/api` (Nest 12, escrito a mano), `packages/shared` (esqueleto vacío). pnpm workspaces + Turborepo, TypeScript estricto, ESLint y Prettier.
- `apps/api` sin `@nestjs/cli`: tiene un bug con Node 22 (`ERR_REQUIRE_CYCLE_MODULE`). Dev con `tsx watch`, build con `tsc`. Ver decisión #20.
- Verificado con `pnpm lint`/`typecheck`/`build` y levantando ambas apps en dev.
- Comandos documentados en `docs/guides/architecture.md` → "Desarrollo local".

## Siguiente paso

Fase 0, punto 2 de `docs/guides/roadmap.md`: `tokens.css` y `semantic.css` extraídos del diseño, fuentes, `globals.css`, componentes base de `components/ui/`.

## Pendientes de decidir con el usuario

- Proveedor para enviar correos (código de login, invitaciones): SMTP de Supabase o un servicio como Resend.
- Pascua: fija todo abril o según la fecha real.
- Tareas que se repiten, o si eso vive solo en Recordatorios.
- Agenda: mostrar la rutina detrás de los eventos y arrastrar eventos.

- Proteger `main` en GitHub (pedir Pull Request para hacer merge).
- En la Fase 0: si se agrega commitlint + husky para validar los mensajes de commit, y GitHub Actions para revisar cada Pull Request.

## Bloqueos o problemas abiertos

- `@nestjs/cli` (generadores `nest generate`, etc.) no se puede usar: bug de `@angular-devkit/schematics` + Node 22. Mientras tanto, los archivos de `apps/api` se escriben a mano. Revisar si una versión futura lo arregla.
