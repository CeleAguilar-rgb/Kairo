# Kairo

Dashboard personal para organizar la vida en un solo lugar: tareas, agenda, recordatorios, rutina diaria, finanzas, escuela, proyectos con Scrum, escritos estilo Notion y enfoque (pomodoro). Cada usuario tiene su perfil y elige qué secciones (módulos) activar.

La información es **privada y sensible** (finanzas, diario, escritos). La seguridad no es opcional: lee `docs/guides/security.md` antes de tocar auth, endpoints, base de datos o archivos.

## Antes de hacer cualquier cosa

1. Lee `docs/history/current.md`: dice en qué fase vamos, qué se hizo la última vez y cuál es el siguiente paso.
2. Lee solo las guías que pida la tarea (tabla de "Documentación" abajo). No leas todo `docs/` ni las notas viejas de `docs/history/sessions/` si no hace falta.
3. Al terminar la sesión, actualiza el historial como dice `docs/history/README.md`.

## Stack

| Capa | Tecnología |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend (`apps/web`) | Next.js (App Router) + TypeScript, CSS Modules + variables CSS, Motion, Tiptap, Recharts |
| Backend (`apps/api`) | NestJS + TypeScript, Drizzle ORM |
| Compartido (`packages/shared`) | Esquemas Zod, tipos, constantes (ids de módulos) |
| Datos | Supabase: Postgres, Auth, Storage |
| Deploy | Web y API en Vercel (plan gratis); tareas programadas disparadas por Supabase Cron |

**No usar Tailwind** ni librerías de estilos utilitarios. Los estilos van en CSS Modules con variables CSS.

## Estructura

```
apps/web/          Frontend. Solo UI. Nunca se conecta a la base de datos.
apps/api/          Backend. Única pieza que toca Postgres.
packages/shared/   Esquemas Zod y tipos usados por web y api.
docs/
├── guides/        Arquitectura, seguridad, base de datos, estilos, decisiones…
├── design/        Copia de las pantallas del canvas de diseño
├── history/       Dónde nos quedamos y una nota por sesión
└── learning/      Notas del usuario sobre lo que va aprendiendo
```

## Reglas no negociables

1. **Solo `apps/api` accede a la base de datos.** El frontend nunca importa Drizzle ni el esquema de la base, nunca usa la `service_role` key y nunca consulta tablas con el cliente de Supabase (que en el front solo se usa para auth).
2. **El `userId` sale siempre del token verificado**, nunca del body, query ni params.
3. **Toda consulta a datos de usuario filtra por `userId`**, también al editar y borrar (`where: { id, userId }`).
4. **Toda entrada se valida** con los esquemas de `packages/shared`, en el front (formularios) y en el back (requests). **Nunca** se pasan datos de la petición directo a `where`, `select` o `include` del ORM.
5. **Los componentes nunca usan colores, tamaños ni fuentes directos**, solo variables semánticas (`var(--accent)`, `var(--space-4)`). Ver `docs/guides/theming.md`.
6. **El diseño visual sale del canvas de diseño** (`docs/guides/design.md`). No inventes paletas, tipografías ni estilos de componentes.
7. **Dinero en enteros (centavos)** con columna de moneda. Nunca `float`.
8. **Fechas:** momentos en `timestamptz` (UTC), días sueltos en `date`; se muestran en la zona horaria del perfil.
9. **Nunca guardar números de tarjeta completos**: solo alias y últimos 4 dígitos.
10. **Contenido de Escritos se guarda como JSON de Tiptap**, nunca como HTML. Prohibido `dangerouslySetInnerHTML`.
11. **Borrar = papelera** (`deleted_at`) salvo la cuenta. Las consultas normales filtran `deleted_at IS NULL`.
12. **Secretos solo en variables de entorno del servidor.** Nada sensible con prefijo `NEXT_PUBLIC_`.
13. **Un módulo no importa archivos internos de otro módulo**, solo su API pública. Ver `docs/guides/modules.md`.

## Documentación

| Si vas a… | Lee |
|---|---|
| Entender qué debe hacer una sección | `docs/guides/features.md` |
| Crear o mover carpetas, decidir dónde va algo | `docs/guides/architecture.md` |
| Tocar auth, sesiones, endpoints, base de datos, archivos o datos sensibles | `docs/guides/security.md` |
| Crear o cambiar tablas | `docs/guides/data-model.md` |
| Escribir estilos, componentes visuales o animaciones | `docs/guides/theming.md` y `docs/guides/design.md` |
| Agregar, quitar o cambiar una sección (módulo) | `docs/guides/modules.md` |
| Decidir qué construir ahora y qué después | `docs/guides/roadmap.md` |
| Nombrar cosas, manejar errores, escribir tests, hacer commits | `docs/guides/conventions.md` |
| Proponer cambiar una tecnología o patrón | `docs/guides/decisions.md` |
| Desplegar, configurar Vercel o tareas programadas | `docs/guides/architecture.md` (Despliegue y Tareas programadas) |
| Saber dónde nos quedamos, cerrar una sesión | `docs/history/current.md` y `docs/history/README.md` |

## Aprendizaje

El usuario construye Kairo **para aprender**: estructura, buenas prácticas y el stack completo. Terminar rápido no es el objetivo principal; que entienda lo que se construye, sí.

- El repo usa el estilo **Learning** de Claude Code (`.claude/settings.json`). En las partes con una decisión real (lógica de negocio, manejo de errores, cómo organizar datos, validaciones, consultas), **deja que el usuario escriba** el código con `TODO(human)` y una guía clara. Lo rutinario (configuración, boilerplate) lo puedes hacer tú.
- **Plan del molde:** Inicio + Tareas se construyó junto, de punta a punta, explicando cada capa: esquema compartido → controller → service → repository → componente. **Desde Recordatorios, el orden se invierte (decisión #27, `docs/guides/roadmap.md`): primero el front del módulo completo (componente con datos dummy fieles al canvas y a `data-model.md`, animaciones reales) y después esquema compartido → controller → service → repository, ajustando `data-model.md` si el front terminó pidiendo otra forma.** El usuario escribe esas capas siguiendo el molde y tú revisas, señalas errores y explicas, en lugar de escribirlas por él. Si te pide que las hagas tú, hazlo.
- Antes de resolver algo no trivial, pregúntale primero cómo lo haría. Después compara su idea con la tuya.
- Pasos pequeños. Nada de módulos completos en un solo cambio.
- Cuando aparezca un concepto nuevo importante, sugiérele escribir su nota en `docs/learning/` (ver su README). Si te pide revisarla, corrige y comenta, pero no la reescribas.
- Explica con ejemplos del propio proyecto, no con ejemplos genéricos.

## Cómo trabajar en este repo

- **Nunca hagas commit ni push sin autorización explícita del usuario.** Al terminar un cambio, muestra qué archivos cambiaron, propón el mensaje de commit y espera su "sí". El push se pregunta aparte.
- **Nunca trabajes en `main`.** `main` solo recibe lo que ya funciona y el usuario revisó, mediante Pull Request. Todo cambio va en su rama (`feat/…`, `fix/…`). Ramas y formato de commits (Conventional Commits): `docs/guides/conventions.md`.
- Para cambios que toquen varios archivos o ambas apps, **propón un plan antes de escribir código**.
- **No construyas nada marcado como "después"** en `docs/guides/roadmap.md` sin que el usuario lo pida. Sí respeta lo que dice que debe quedar *preparado*.
- **No agregues dependencias nuevas sin preguntar.** Explica por qué y qué alternativa hay.
- **No cambies decisiones registradas en `docs/guides/decisions.md`** sin que el usuario lo pida.
- Cambios al esquema de base de datos **siempre con migración de Drizzle** (`drizzle-kit generate`, revisar el SQL generado y subirlo al repo), nunca editando la BD a mano.
- Si una tarea choca con alguna regla de este archivo, detente y avisa en lugar de buscarle la vuelta.
- El usuario está aprendiendo buenas prácticas: cuando tomes una decisión de estructura no obvia, explícala en una o dos líneas.
- Idioma: código (variables, funciones, tablas, columnas) y nombres de ramas en inglés; textos de la interfaz, rutas visibles, comentarios para el usuario, documentación y mensajes de commit en español (el tipo y alcance del commit, como `feat(tasks)`, se quedan en inglés).
