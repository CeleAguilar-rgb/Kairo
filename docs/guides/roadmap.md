# Hoja de ruta

## Fase 0: base (antes de cualquier módulo)

1. Monorepo: pnpm workspaces, Turborepo, `apps/web`, `apps/api`, `packages/shared`, TypeScript estricto, ESLint y Prettier.
2. Estilos: `tokens.css` y `semantic.css` extraídos del diseño, fuentes, `globals.css`, componentes base de `components/ui/`.
3. Base de datos: proyecto de Supabase, esquema `app`, rol de la API, Drizzle conectado, tablas de **Cuenta** (`docs/guides/data-model.md`).
4. Auth completa: invitación, contraseña, código por correo, guard global de la API, sesiones de 30 días, cerrar todas las sesiones, recuperar contraseña.
5. Shell: layout del dashboard, sidebar desde el registro de módulos, perfil básico, bienvenida.
6. Tests críticos de auth y aislamiento.

## Fase 1: módulos (en este orden, en PC)

1. **Inicio + tareas y notas rápidas.** Es el molde de todos los demás: valida el patrón completo (esquema compartido → controller → service → repository → api del front → componente → tarjeta de Inicio).
2. **Recordatorios** (avisos en la app y Web Push, jobs programados).
3. **Agenda.**
4. **Día a día** (rutina, menú, diario con PIN, metas).
5. **Finanzas.**
6. **Escuela.**
7. **Proyectos con Scrum.**
8. **Escritos.**
9. **Música y enfoque:** pomodoro (Spotify va en integraciones).

Junto con los módulos, lo global: papelera, búsqueda Ctrl+K, panel de avisos, captura rápida (+) y adornos de temporada.

El orden puede cambiar; la arquitectura de módulos existe para eso.

## Después (no construir sin que el usuario lo pida)

| Qué | Qué debe quedar preparado desde ya |
|---|---|
| Versión de teléfono (responsive, menú abajo, PWA) | Layouts sin anchos fijos |
| Modo oscuro | Todo color por variable semántica; `profiles.theme` |
| Varios usuarios (invitar a otros desde la app) | Todo filtrado por `user_id` (ya es regla de seguridad) |
| Ver y editar sin conexión | ids uuid, `updated_at` confiable, borrado suave |
| Exportar y respaldos propios | Nada especial |
| Integraciones: Notion, Canva, Spotify, Claude | Tabla `connections`, tokens cifrados, siempre desde el servidor |
| Otras monedas | Columna `currency` junto a cada monto |
| Compartir entre cuentas (agenda en común) | Nada; requiere decisión nueva |
