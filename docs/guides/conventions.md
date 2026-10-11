# Convenciones

Reglas de estilo y forma de trabajar. Si algo no está aquí, sigue el estilo del código que ya existe en el repo; si tampoco hay ejemplo, pregunta.

## Idioma

- **Inglés:** código, nombres de archivos y carpetas, tablas, columnas, valores de enums, códigos de error, nombres de ramas, y el tipo y alcance de los commits (`feat(tasks)`).
- **Español:** descripción y cuerpo de los mensajes de commit, textos de la interfaz, mensajes de error para el usuario, rutas visibles (`/tareas`), documentación en `docs/`, explicaciones al usuario.
- Comentarios en el código: en español, porque los lee el usuario mientras aprende.

## Nombres

| Qué | Formato | Ejemplo |
|---|---|---|
| Componentes React | PascalCase | `TaskItem.tsx` + `TaskItem.module.css` |
| Hooks | `use` + PascalCase | `useQuickCapture` |
| Funciones y variables | camelCase | `getUpcomingPayments` |
| Booleanos | `is`, `has`, `can`, `should` | `isDone`, `hasPin` |
| Manejadores de eventos | `handle` + evento; props `on` + evento | `handleSubmit`, `onToggle` |
| Constantes globales | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| Tipos e interfaces | PascalCase, sin prefijo `I` | `Task`, `CreateTaskInput` |
| Archivos que no son componentes | kebab-case | `api-client.ts` |
| Archivos de Nest | `<nombre>.<tipo>.ts` | `tasks.service.ts` |
| Esquemas Zod | `<acción><Entidad>Schema` | `createTaskSchema` |
| Tablas | snake_case, plural | `tasks`, `savings_goals` |
| Columnas | snake_case | `due_on`, `amount_cents` |
| Clases CSS | camelCase dentro del módulo CSS | `.cardHeader` |
| Variables CSS | kebab-case | `--text-muted` |
| Variables de entorno | UPPER_SNAKE_CASE | `SUPABASE_URL`, `ENCRYPTION_KEY` |

Sufijos con significado fijo:
- `_on`: fecha sin hora (`due_on`). `_at`: momento exacto (`remind_at`).
- `_cents`: dinero en centavos. `_path`: ruta en Storage. `_hash`: valor hasheado. `_encrypted`: valor cifrado.

## TypeScript

- `strict: true`. Sin `any`; si no hay otra opción, `unknown` y se valida.
- Tipos de datos derivados de los esquemas Zod (`z.infer`), no escritos a mano dos veces.
- **Exports con nombre**, no `export default` (salvo donde Next.js lo exige: `page.tsx`, `layout.tsx`).
- Imports con alias: `@/` dentro de cada app (`@/components/ui/Button`), `@kairo/shared` para el paquete compartido. Nada de `../../../`.
- Orden de imports: librerías externas → `@kairo/shared` → `@/` → relativos → estilos. Prettier y ESLint lo aplican solos.
- Funciones cortas y con un solo propósito. Si un archivo pasa de ~300 líneas, probablemente hay que separarlo.

## Formato

- Prettier con su configuración por defecto, salvo: comillas simples y sin punto y coma al final.
- ESLint sin advertencias en el código que se sube.
- No dejes `console.log` de depuración ni código comentado.

## Frontend

- **Un componente por archivo**, con su `.module.css` al lado.
- Props tipadas con un `type` arriba del componente (`type TaskItemProps = {…}`).
- Server Component por defecto. Si un archivo necesita `'use client'`, que sea el componente más pequeño posible, no la página entera.
- Los componentes de `components/ui/` no conocen los datos de ningún módulo; solo reciben props.
- Textos de la interfaz escritos directo en español, con verbos claros en botones ("Guardar tarea", no "OK" ni "Enviar").
- Formularios: etiqueta visible en cada campo; validación al salir del campo; el error se quita en cuanto se corrige.

## CSS

- Solo CSS Modules + variables semánticas (ver `docs/guides/theming.md`).
- Sin estilos en línea, salvo valores calculados en tiempo de ejecución (por ejemplo, el ancho de una barra de avance).
- Espacios en múltiplos de 4 px, siempre por variable (`var(--space-2)`).
- Mobile-friendly aunque la primera versión sea de PC: flex y grid, sin anchos fijos.

## Backend (NestJS)

- Un módulo de Nest por sección, con la forma de `docs/guides/architecture.md`: controller → service → repository.
- La validación usa los esquemas Zod de `@kairo/shared` mediante un pipe; no duplicar con `class-validator`.
- Los services lanzan excepciones de Nest (`NotFoundException`, etc.) con un código propio; el filtro global les da el formato de error.
- Un service de un módulo puede usar el service de otro, nunca su repository.

## API REST

- Prefijo `/v1`. Recursos en inglés, plural y kebab-case: `/v1/tasks`, `/v1/savings-goals`.
- Métodos: `GET` leer, `POST` crear, `PATCH` cambiar parcialmente, `DELETE` mandar a la papelera. Acciones que no son CRUD: `POST /v1/tasks/:id/complete`, `POST /v1/trash/:id/restore`.
- Códigos de respuesta: `200` ok, `201` creado, `204` sin contenido, `400` validación, `401` sin sesión, `404` no existe **o no es tuyo**, `409` conflicto, `429` demasiados intentos.
- Formato de error, siempre igual: `{ "error": { "code": "TASK_NOT_FOUND", "message": "No encontramos esa tarea." } }`. `code` en inglés y estable; `message` en español para mostrarse tal cual.
- Listas paginadas por cursor: `{ "items": [...], "nextCursor": "..." | null }`.
- JSON en camelCase. Fechas en ISO 8601 (`2026-10-10`, `2026-10-10T18:30:00Z`). Dinero como entero en centavos más `currency`.
- Los filtros y ordenamientos que acepta cada endpoint se declaran en su esquema como lista cerrada (ver `docs/guides/security.md`).

## Base de datos (Drizzle)

- Llave primaria `id` uuid en todas las tablas.
- Llaves foráneas `<tabla_en_singular>_id` (`project_id`, `user_id`) con índice.
- Índice en `user_id` en toda tabla de usuario, y compuestos según las consultas reales (`user_id, due_on`).
- `created_at` y `updated_at` con valor por defecto `now()`; `updated_at` lo mantiene un trigger.
- Cada cambio de esquema es una migración nueva generada con `drizzle-kit generate`, con nombre descriptivo. Se revisa el SQL antes de aplicarlo. **Nunca** se edita una migración que ya se aplicó.
- El esquema de Drizzle va un archivo por módulo en `apps/api/src/db/schema/`.

## Errores y logs

- No uses `try/catch` para esconder errores: si se atrapa uno, se maneja o se registra.
- El front muestra mensajes que no culpan al usuario, conservan lo escrito y ofrecen reintentar (ver `docs/guides/design.md`).
- Logs estructurados (JSON) en la API, con nivel (`info`, `warn`, `error`) y un id de petición. **Nunca** datos personales, montos, contenidos, contraseñas, códigos ni tokens.

## Dependencias

- No agregues una dependencia sin preguntar. Explica para qué es, qué tan mantenida está y si hay una alternativa sin dependencia.
- Versiones fijadas con el lockfile de pnpm, que se sube al repo.

## Variables de entorno

- Cada app tiene su `.env.example` con todas las variables, sin valores reales y con un comentario de para qué sirve cada una.
- Se validan al arrancar con un esquema Zod; si falta una, la app no arranca y dice cuál falta.
- En `apps/web`, solo lleva `NEXT_PUBLIC_` lo que de verdad puede ver cualquiera (URL pública de Supabase, llave anon).

## Tests

Solo lo crítico (decisión del usuario), pero eso sí siempre:
- Aislamiento entre usuarios en cada endpoint (ver `docs/guides/security.md`).
- Flujo de login con código y PIN del diario.
- Lógica con cálculos: saldos de ahorro y deuda, "te queda" del mes, presupuesto, conteo de palabras.

Backend con Jest de Nest y una base de pruebas real (sin simular la base de datos). Nombre de los archivos: `<archivo>.spec.ts` junto al código; tests de endpoints en `apps/api/test/`.

## Git

### Autorización (regla del usuario)

- **Nunca hagas commit ni push sin autorización explícita del usuario**, aunque te haya pedido el cambio.
- Al terminar un cambio: muestra qué archivos cambiaron, propón el mensaje de commit y la rama, y **espera su "sí"**. Un sí al commit no es un sí al push: pregunta por separado.
- Nunca hagas merge a `main`, `push --force`, `rebase` de ramas ya subidas ni borres ramas sin que lo pida.

### Ramas (GitHub Flow)

- **`main` = solo lo que ya funciona y fue revisado por el usuario.** Nunca se trabaja ni se hace commit directo en `main`.
- Todo trabajo nuevo va en su propia rama, creada desde `main` actualizada:

| Prefijo | Para qué | Ejemplo |
|---|---|---|
| `feat/` | Algo nuevo | `feat/tasks-subtasks` |
| `fix/` | Corregir un error | `fix/auth-code-expiry` |
| `refactor/` | Reordenar código sin cambiar lo que hace | `refactor/finance-repository` |
| `docs/` | Solo documentación | `docs/close-session` |
| `chore/` | Configuración, dependencias, herramientas | `chore/eslint-setup` |

- Una rama = un tema. Ramas cortas: mejor varias pequeñas que una enorme.
- Para llevar una rama a `main`: se sube la rama (con permiso), se abre un **Pull Request** en GitHub, el usuario lo revisa (y prueba la vista previa de Vercel de esa rama) y **el usuario** decide hacer el merge.
- Después del merge, la rama se borra.

### Mensajes de commit (Conventional Commits)

El usuario usa la extensión **Conventional Commits** de VS Code; los mensajes deben ser compatibles con ella.

Formato: `tipo(alcance): descripción`. **Tipo y alcance en inglés** (así los usa la extensión); **descripción en español**, en infinitivo ("agregar", "corregir"), en minúsculas, sin punto final, máximo ~72 caracteres. Si hace falta, un cuerpo en español después de una línea en blanco explicando el porqué.

**Tipos permitidos:**

| Tipo | Cuándo |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un error |
| `refactor` | Cambio de código que no agrega ni corrige nada |
| `style` | Formato del código (espacios, comillas), no estilos visuales |
| `test` | Agregar o corregir tests |
| `docs` | Documentación |
| `chore` | Configuración, dependencias, mantenimiento |
| `build` | Sistema de build, monorepo, empaquetado |
| `ci` | Integración continua (GitHub Actions) |
| `perf` | Mejora de rendimiento |
| `revert` | Deshacer un commit anterior |

**Alcances (scope):** el id del módulo (`home`, `tasks`, `reminders`, `agenda`, `daily`, `finance`, `school`, `projects`, `writings`, `focus`) o el área (`auth`, `ui`, `db`, `web`, `api`, `shared`, `jobs`, `deps`, `history`, `design`).

Cambio que rompe algo existente: `!` después del alcance (`feat(api)!: renombrar el endpoint de tareas`) y una línea `BREAKING CHANGE:` en el cuerpo.

Ejemplos: `feat(tasks): agregar subtareas`, `fix(auth): hacer que caduquen los códigos de correo`, `docs(history): cerrar sesión del 2026-10-12`.

### Antes de proponer un commit

- El código compila, ESLint pasa y los tests críticos del área tocada pasan.
- Commits pequeños, con un solo propósito.
- Nunca `.env` ni secretos.

## Explicar al usuario

El usuario está aprendiendo estructura y buenas prácticas. Al cerrar una tarea, explica en pocas líneas qué hiciste y por qué, sobre todo si hay una decisión no obvia. Si hay una forma más simple y otra más correcta, menciona las dos y por qué elegiste una.
