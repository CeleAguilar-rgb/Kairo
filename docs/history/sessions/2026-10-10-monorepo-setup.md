# 2026-10-10 · Monorepo (Fase 0, paso 1)

**Hecho en:** Claude Code / chat

## Qué se hizo

- Se instaló `pnpm` (no estaba disponible; `corepack enable` falló por permisos en `Program Files`, se usó `npm install -g pnpm`).
- Se creó la rama `chore/monorepo-setup` desde `main`.
- Se armó el esqueleto del monorepo: `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.prettierrc`, `.gitignore` (no existía).
- `packages/shared`: esqueleto vacío (`package.json`, `tsconfig.json`, `src/index.ts`), sin esquemas todavía.
- `apps/web`: scaffold con `pnpm create next-app` (Next 16, TypeScript, App Router, sin Tailwind). Se le quitaron las fuentes, colores y contenido de ejemplo de la plantilla (el diseño visual sale del canvas, no se inventa acá) y se apagaron dos flags experimentales de Next 16 (`cacheComponents`, `partialPrefetching`) que el scaffold activa por defecto.
- `apps/api`: escrito a mano (no con el generador de Nest). `main.ts` con helmet, CORS y prefijo `/v1`; `app.module.ts` vacío. Sin `ValidationPipe` todavía (la validación es con Zod, no `class-validator`, y no hay nada que validar hasta el primer endpoint).
- Se encontró que `@nestjs/cli` 12.0.8 no funciona en este entorno (Node 22): revienta con `ERR_REQUIRE_CYCLE_MODULE` por un bug de `@angular-devkit/schematics` (requiere `ora`, un paquete ESM, en un ciclo). Se reemplazó por `tsx` para dev (`tsx watch`) y `tsc` simple para build.
- Se fijó `typescript@5.9.3` (no la última, que ya resuelve a la 7.x, el compilador nativo recién salido) y `eslint@9.39.5` en todo el repo (para que coincida con lo que pide `eslint-config-next`, y no convivan dos ESLint mayores distintos).
- Verificado: `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm build` limpios en los tres paquetes. Se levantaron `apps/web` y `apps/api` en dev y se confirmó respuesta (`/` del front, `/v1` de la API) antes de apagarlos.
- Documentación: sección "Desarrollo local" nueva en `docs/guides/architecture.md` (tabla de comandos); nota `docs/learning/pnpm.md` y `docs/learning/explicacion-fase-0-paso-1.md` (esta última es temporal, el usuario la va a reemplazar por su propia nota); `docs/learning/*.md` ahora se ignora en git salvo `README.md` (son notas personales, no se suben).

## Decisiones tomadas

- `apps/api` sin `@nestjs/cli` (sin `nest generate`/`nest build` por ahora): se escriben los archivos a mano, build con `tsc`, dev con `tsx watch`. Motivo: bug de `@angular-devkit/schematics` + Node 22, no algo arreglable desde la config del repo. También en `docs/guides/decisions.md` (#20).

## Archivos o partes importantes que se tocaron

- Raíz: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.prettierrc`, `.prettierignore`, `.nvmrc`.
- `apps/web/`, `apps/api/`, `packages/shared/` completos (nuevos).
- `docs/guides/architecture.md` (sección "Desarrollo local").
- `docs/learning/README.md` (índice) y `docs/learning/pnpm.md` (nueva nota, no se sube a git).

## Quedó pendiente

- El commit y el push de todo este trabajo: el usuario los va a hacer directamente, no se comiteó nada en esta sesión.
- Fase 0, paso 2 del roadmap: `tokens.css`/`semantic.css` desde el diseño, fuentes, `globals.css` real, componentes base de `components/ui/`.
- Revisar si en el futuro aparece una versión de `@nestjs/cli` o `@angular-devkit/schematics` que arregle el `ERR_REQUIRE_CYCLE_MODULE`, para decidir si vale la pena volver a usar el CLI de Nest (generadores).

## Notas para la siguiente sesión

- Antes de usar `nest generate` para algo, confirmar que el bug de `@nestjs/cli` sigue ahí (probar un comando simple primero).
- `apps/web/tsconfig.json` y su `eslint.config.mjs` quedaron tal cual los genera Next (no extienden `tsconfig.base.json` ni comparten el `eslint.config.mjs` de `api`/`shared`) — es intencional, no un descuido.
