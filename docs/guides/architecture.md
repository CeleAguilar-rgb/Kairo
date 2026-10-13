# Arquitectura

## Visión general

```
Navegador ──► Next.js (apps/web) ──► API NestJS (apps/api) ──► Postgres (Supabase)
                 │                         │
         Login con Supabase Auth     Verifica el JWT en cada petición
         Sesión en cookie httpOnly   Filtra todos los datos por userId
```

- El **navegador no llama a la API directamente**. Las lecturas se hacen en Server Components y las mutaciones en Server Actions; ambas llaman a la API desde el servidor de Next adjuntando el access token de la sesión. Así el token nunca queda expuesto al JavaScript del cliente.
- Si un componente cliente necesita datos (por ejemplo, para refrescar una lista), llama a una Server Action o a un Route Handler de Next, que a su vez llama a la API.
- Excepción: subida y descarga de archivos usan **URLs firmadas** de corta duración que genera la API y que el navegador usa directamente contra Supabase Storage.

## Monorepo

```
kairo/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── shared/
├── docs/
├── turbo.json
├── pnpm-workspace.yaml
└── CLAUDE.md
```

## Desarrollo local

Todos los comandos se corren desde la raíz del repo; `turbo` reparte cada tarea al paquete (o paquetes) que corresponda.

| Comando | Qué hace |
|---|---|
| `pnpm install` | Instala las dependencias de todo el workspace. |
| `pnpm dev` | Levanta `apps/web` (`localhost:3000`) y `apps/api` (`localhost:3001`) juntos, en paralelo. |
| `pnpm --filter web dev` | Levanta solo el front. |
| `pnpm --filter api dev` | Levanta solo la API (no tiene nada visual: es JSON). |
| `pnpm build` | Build de producción de todos los paquetes. |
| `pnpm lint` | ESLint en todos los paquetes. |
| `pnpm typecheck` | `tsc --noEmit` en todos los paquetes. |
| `pnpm format` | Prettier sobre todo el repo. |
| `pnpm --filter <paquete> add <dependencia>` | Agrega una dependencia solo a ese paquete (`web`, `api` o `@kairo/shared`). |
| `pnpm add -D -w <dependencia>` | Agrega una dependencia de desarrollo compartida, a la raíz del workspace. |

Parar un servidor de `dev`: `Ctrl+C` en la terminal donde está corriendo.

## Frontend: `apps/web`

```
src/
├── app/
│   ├── (auth)/                  # entrar, código por correo, aceptar invitación, olvidé contraseña
│   ├── (dashboard)/
│   │   ├── layout.tsx           # Shell: sidebar, header, adornos de temporada, transiciones
│   │   ├── page.tsx             # Inicio: tarjetas de los módulos activos
│   │   └── <ruta-del-modulo>/   # tareas, agenda, finanzas, escritos… (rutas en español)
│   └── manifest.ts              # PWA (fase posterior)
├── features/
│   └── <modulo>/
│       ├── components/          # Componentes propios del módulo
│       ├── api.ts               # Funciones que llaman a la API (import 'server-only')
│       ├── actions.ts           # Server Actions (mutaciones)
│       ├── module.ts            # Manifiesto del módulo (ver docs/guides/modules.md)
│       └── index.ts             # API pública del módulo
├── components/
│   ├── ui/                      # Design system: Button, Card, Modal, Checkbox, Input, Panel…
│   └── layout/                  # Sidebar, Header, QuickCapture (+), Search (Ctrl+K)…
├── lib/
│   ├── api-client.ts            # fetch a la API con token y manejo uniforme de errores
│   ├── supabase/                # Clientes de Supabase SOLO para auth (@supabase/ssr)
│   ├── modules/registry.ts      # Lista de manifiestos de módulos
│   └── preferences/             # Lectura de preferencias (tema, temporada) desde cookie
└── styles/                      # Ver docs/guides/theming.md
```

Reglas:
- `app/` contiene solo rutas: obtiene datos con funciones de `features/` y renderiza. Sin lógica de negocio.
- **Server Components por defecto.** `'use client'` solo donde hay interacción, estado local o animación con Motion.
- Rutas visibles en español (`/tareas`, `/finanzas`); nombres de carpetas de `features/` en inglés (`tasks`, `finance`).

## Backend: `apps/api`

```
src/
├── main.ts                      # helmet, CORS, prefijo /v1, ValidationPipe global
├── app.module.ts
├── auth/
│   ├── jwt.guard.ts             # Guard global: verifica JWT de Supabase (código de correo en pausa, decisión #26)
│   ├── current-user.decorator.ts
│   ├── public.decorator.ts      # Marca explícita de rutas públicas
│   ├── email-code/              # (en pausa, decisión #26) Segundo paso de login: generar, enviar y verificar el código
│   └── invitations/             # Crear y aceptar invitaciones
├── common/
│   ├── filters/                 # Formato uniforme de errores
│   ├── crypto/                  # Cifrado de campos sensibles (AES-256-GCM) y hash de PIN/códigos
│   ├── db/                      # Conexión de Drizzle como proveedor de Nest (DbModule)
│   └── trash/                   # Utilidades de papelera (soft delete)
├── jobs/                        # Tareas programadas (ver abajo)
├── modules/
│   └── <modulo>/
│       ├── <modulo>.module.ts
│       ├── <modulo>.controller.ts   # HTTP: rutas, validación, @CurrentUser
│       ├── <modulo>.service.ts      # Reglas de negocio; API pública para otros módulos
│       └── <modulo>.repository.ts   # Acceso a datos (Drizzle), siempre con userId
├── db/
│   └── schema/                  # Una definición de tablas por módulo: tasks.ts, finance.ts…
└── drizzle/                     # Migraciones generadas con drizzle-kit (se suben al repo)
```

Capas y responsabilidades:
- **Controller**: recibe la petición, valida con el esquema de `shared`, obtiene el usuario con `@CurrentUser()` y llama al service. No toca la base de datos.
- **Service**: reglas de negocio. Recibe `userId` como primer parámetro. Es lo único que otros módulos pueden usar.
- **Repository**: único lugar con Drizzle. **Toda función recibe `userId`** y lo incluye en el `where` (`and(eq(t.userId, userId), isNull(t.deletedAt))` en lecturas normales). Un repository solo importa las tablas de su módulo.

API REST con prefijo `/v1`. Paginación por cursor en listados.

## Compartido: `packages/shared`

```
src/
├── modules.ts                   # MODULE_IDS y tipo ModuleId
├── <modulo>/schemas.ts          # Esquemas Zod de entrada y salida
└── index.ts
```

Un esquema se define una sola vez y lo usan el formulario del front y la validación del back. Los tipos se derivan con `z.infer`. Este paquete no importa nada de `apps/`.

## Datos

Ver `docs/guides/data-model.md`. Resumen:
- Tablas de la app en el esquema de Postgres **`app`**, que **no** se expone por la Data API de Supabase.
- Cada tabla de usuario lleva `user_id`, `created_at`, `updated_at` y `deleted_at`.

## Comunicación entre módulos

Un módulo no lee las tablas de otro. Si necesita información de otro módulo, usa una función pública de su service.

Caso Agenda: cada módulo con fechas (tareas con fecha, pagos de membresías, entregas de escuela, recordatorios) expone `getAgendaItems(userId, range)`. El módulo de Agenda las junta. Un módulo nuevo puede aportar elementos a la Agenda sin modificarla. Lo mismo para las tarjetas de Inicio (`getHomeCard`) y la búsqueda global (`search`).

## Despliegue

- **Web y API en Vercel, plan gratis (Hobby).** Cada app es un proyecto de Vercel distinto apuntando a su carpeta del monorepo.
- La API de NestJS corre como una función de Vercel: **no está prendida todo el tiempo**, se enciende con cada petición. Por eso:
  - nada de procesos en segundo plano, timers ni `@nestjs/schedule` dentro de la API;
  - cada petición debe terminar rápido (dentro del límite de tiempo de las funciones de Vercel);
  - la conexión a Postgres usa el pooler de Supabase (modo transacción), no conexiones directas largas.
- Base de datos, Auth, Storage y cron en Supabase (plan gratis).

## Tareas programadas (`apps/api/src/jobs`)

La lógica vive en la API, pero **quien la dispara es Supabase Cron** (`pg_cron` + `pg_net`), porque el cron de Vercel en plan gratis solo corre una vez al día y sin hora exacta.

- La API expone endpoints internos: `POST /v1/internal/jobs/<nombre>`.
- Supabase Cron los llama con un header secreto (`X-Job-Secret`, valor en variables de entorno de ambos lados). Sin ese header correcto, responden 404.
- **Cada minuto:** recordatorios y pagos que ya tocan → notificación en la app (tabla `notifications`) y Web Push al navegador. Respetan las horas de silencio del perfil.
- **Una vez al día:** borrar definitivamente lo que lleva más de 30 días en la papelera (y sus archivos); limpiar códigos de login vencidos.
- Cada ejecución procesa en lotes pequeños y termina rápido. Si quedan pendientes, los toma la siguiente.
- Deben ser **idempotentes**: si un aviso se dispara dos veces, no se envía dos veces (marcar `notified_at` dentro de la misma transacción).
- La configuración de `pg_cron` se guarda como migración SQL en el repo, nunca solo a mano en el panel.

## Integraciones (fase posterior)

Notion, Canva, Spotify y Claude viven en `apps/api/src/integrations/<nombre>/`. Siempre desde el servidor. Los tokens OAuth se guardan cifrados (ver `docs/guides/security.md`).
