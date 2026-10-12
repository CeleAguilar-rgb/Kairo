# 2026-10-11 · Tokens, fuentes y componentes base

**Hecho en:** Claude Code

## Qué se hizo
- Fase 0, paso 2 de la hoja de ruta: `tokens.css`, `semantic.css` y `modes/light.css` en `apps/web/src/styles/`, extraídos del diseño.
- Fuentes con `next/font/google` (Outfit 300–600, Gochi Hand 400) y `globals.css` (reset, tipografía base, `<html data-mode="light">`).
- Primeros 4 componentes de `components/ui/`: `Button` (variants `solid`/`secondary`/`ghost`/`danger`/`plain`), `Card` (`surface`/`inverted`), `Input`, `Checkbox`. Ninguno lleva `'use client'`: no usan hooks, así que se comportan según quién los renderice.
- A media sesión el usuario agregó `docs/guides/Kairo-Sistema-de-diseno.pdf` (sistema de diseño formal) y los logos en `apps/web/public/kairo-logo/`. Se releyeron los tokens recién hechos contra el PDF y se corrigieron varias cosas (ver "Decisiones tomadas").
- Fix aparte: `apps/api/tsconfig.json` usaba `moduleResolution: "node"` (alias de `node10`, deprecado en TypeScript 7) y le faltaba `rootDir` explícito. Se cambió a `nodenext` + `rootDir: "./src"`.
- Verificado con `pnpm lint`/`typecheck`/`build` y con una captura real del navegador (Edge en modo headless, ya que no había `chromium-cli` instalado) comparada contra el PDF y las pantallas del canvas.

## Decisiones tomadas
- También en `docs/guides/decisions.md` (#21 y #22):
  - El PDF del sistema de diseño manda sobre los valores aproximados de `theming.md`.
  - Las variables CSS semánticas se quedan en inglés (`--surface`, `--accent-soft`…), no con los nombres en español del PDF.
- Alcance de componentes de este paso: solo Button, Card, Input, Checkbox. Select, Toggle y el grupo segmentado quedan para cuando se construya `TareaNueva` en Fase 1 (decisión de alcance, no de arquitectura — no se registró en `decisions.md`).

## Archivos o partes importantes que se tocaron
- `apps/web/src/styles/` (nuevo): `tokens.css`, `semantic.css`, `modes/light.css`.
- `apps/web/src/components/ui/` (nuevo): `Button`, `Card`, `Input`, `Checkbox` con su `.module.css`.
- `apps/web/src/app/`: `globals.css`, `layout.tsx`, `page.tsx` y `page.module.css` (vista temporal para probar los componentes; se reemplaza cuando se construya el Inicio real).
- `apps/api/tsconfig.json`.
- `docs/guides/design.md` y `docs/guides/theming.md`: apuntan al PDF como fuente exacta.

## Quedó pendiente
- Select, Toggle y el grupo segmentado (Lista/Tablero, Prioridad) de `components/ui/`, para cuando se construya `TareaNueva`.
- `modes/dark.css` no existe todavía (fase posterior), aunque el PDF ya trae todos los valores oscuros documentados por si acelera esa fase cuando toque.
- Proteger `main` en GitHub y decidir si se agrega commitlint + husky + GitHub Actions en esta fase.

## Notas para la siguiente sesión
- Siguiente paso: Fase 0, punto 3 — base de datos (proyecto de Supabase, esquema `app`, rol de la API, Drizzle conectado, tablas de Cuenta). Leer `docs/guides/security.md` y `docs/guides/data-model.md` antes de tocar nada.
- Si se necesita un color de nuevo (ej. "success"/verde), revisar primero si el PDF ya lo define antes de inventarlo — no lo traía en la revisión de hoy.
