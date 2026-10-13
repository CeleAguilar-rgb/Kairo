# Seguridad

Kairo guarda finanzas, un diario, escritos y la vida diaria de cada persona. La regla general: **la API es la única puerta a los datos, y cada puerta verifica quién eres y que solo toques lo tuyo**. Las capas de abajo se apoyan entre sí: si una falla, la siguiente cubre.

## 1. Cuentas: solo por invitación

- El registro público está **desactivado** en Supabase Auth. No existe "crear cuenta".
- Una persona solo entra si alguien con permiso la invita. La API crea la invitación con `auth.admin.inviteUserByEmail` (usa la `service_role` key, solo en el servidor). La persona abre el enlace, define su contraseña y completa la bienvenida.
- Mientras sea un solo usuario, la invitación inicial se puede crear con un script de la API. La pantalla para invitar a otros es de una fase posterior (ver `docs/guides/roadmap.md`).
- Confirmación de correo obligatoria.

## 2. Inicio de sesión: contraseña + código al correo

> **En pausa (decisión #26):** por ahora el login es solo correo + contraseña, sin este segundo paso — falta infraestructura de correo propia en la API. El diseño de abajo queda para cuando se retome; el guard global (sección 4) hoy **no** hace el paso 4 de este flujo.

Flujo:
1. La persona escribe correo y contraseña → `signInWithPassword` de Supabase.
2. Con esa sesión recién creada, el front pide a la API un código. La API genera un **código de 6 dígitos**, guarda solo su hash, y lo envía al correo.
3. La persona escribe el código. La API lo verifica y marca **esa sesión** (por el `session_id` del JWT) como verificada.
4. El guard global de la API rechaza toda petición de una sesión no verificada, salvo los endpoints del propio flujo de código.

Reglas del código:
- Caduca en **10 minutos**, sirve **una sola vez** y permite **5 intentos**; después hay que pedir otro.
- Se guarda hasheado, nunca en claro. Comparación en tiempo constante.
- Límite de envíos por usuario (por ejemplo, 3 cada 15 minutos) para que no se use para llenar el correo.

> Supabase no trae "código por correo como segundo paso" listo para usar; esta parte se construye en `apps/api/src/auth/email-code/`. Enviar correos usa el SMTP propio de Supabase (decisión #24 en `docs/guides/decisions.md`). Verifica en la documentación actual de Supabase cualquier detalle de su API de Auth antes de implementarlo.

Otros:
- "Olvidé mi contraseña" con el flujo de recuperación de Supabase. Después de cambiarla, se cierran las demás sesiones.
- El correo se usa **solo** para la cuenta (invitaciones, código de entrada, recuperar contraseña), **nunca** para recordatorios.

## 3. Sesiones

- Duración: **30 días**. El usuario deja la app abierta en segundo plano y no quiere entrar seguido.
- En el front, la sesión vive en **cookies httpOnly, Secure y SameSite=Lax** (con `@supabase/ssr`). Nunca en `localStorage`.
- En Perfil › Cuenta: lista de sesiones abiertas y botón **"Cerrar sesión en todos los dispositivos"**.
- Cambiar la contraseña cierra todas las demás sesiones.

## 4. Autorización en la API (lo más importante)

- **Guard global** en NestJS: verifica en cada petición la firma del JWT con las llaves públicas de Supabase (JWKS), su expiración y audiencia (hoy con `getClaims()`, decisión #25). La revisión de "sesión verificada con el código" queda en pausa junto con la sección 2 (decisión #26). Las rutas son privadas por defecto; las públicas se marcan con `@Public()` y son la excepción.
- El `userId` **siempre** sale del token. Nunca del body, query ni params.
- Los repositorios filtran por `userId` en **cada** consulta. Editar y borrar usan `where: { id, userId }`; si no hay fila, responde 404 (no 403, para no revelar que existe).
- Al recibir ids de otras entidades (por ejemplo, `projectId` al crear una tarea), verifica que también pertenezcan al usuario.
- Toda entrada se valida con los esquemas Zod de `packages/shared`. Campos no declarados se rechazan.
- **Nunca pasar datos de la petición directo a las opciones del ORM** (`where`, `select`, `include`, `orderBy`). Los filtros y ordenamientos que acepta un endpoint se declaran en una lista cerrada, y el repositorio construye la consulta a partir de esa lista. Si no, alguien podría filtrar por campos ocultos o relaciones y sacar datos letra por letra ("ORM leak").
- Nada de SQL armado concatenando texto. Si hace falta SQL a mano, solo con parámetros (en Drizzle, con la plantilla etiquetada ``sql`...` ``, que parametriza los valores; **prohibido** `sql.raw()` con datos que vengan del usuario).

## 5. Base de datos

- Solo la API se conecta a Postgres, con un **rol propio con permisos mínimos** (no el superusuario `postgres`). Ese rol tiene permisos sobre el esquema `app` y nada más.
- Las tablas viven en el esquema `app`, que **no** está expuesto por la Data API de Supabase.
- **RLS activado en todas las tablas, sin políticas para los roles `anon` y `authenticated`.** Así, aunque alguien consiga la llave pública de Supabase, no puede leer nada directamente. RLS es la red de seguridad; la protección principal es el filtro por `userId` en la API.
- La `service_role` key, la URL de la base y las llaves de cifrado viven **solo** en variables de entorno de `apps/api`.

## 6. Datos sensibles

| Dato | Cómo se guarda |
|---|---|
| Tarjetas | Solo nombre, tipo, últimos 4 dígitos y color. **Nunca** el número completo, fecha de vencimiento ni CVV. |
| PIN del diario | Hash con argon2. Al desbloquear, la API da un permiso de corta duración (15 minutos). Tras 5 intentos fallidos, bloqueo temporal. |
| Entradas del diario | Cifradas a nivel de aplicación (AES-256-GCM, llave en variable de entorno). |
| Tokens de integraciones | Cifrados (Supabase Vault o AES-256-GCM). Nunca se envían al front. |
| Códigos de login | Solo el hash, con expiración. |
| Escritos | JSON de Tiptap en `jsonb`. Se renderizan con Tiptap; **prohibido** `dangerouslySetInnerHTML`. |

## 7. Archivos (Storage)

- Buckets **privados**. Ruta por usuario: `<user_id>/<modulo>/<archivo>`.
- Subir y descargar con **URLs firmadas** que genera la API después de verificar que el archivo es del usuario. Expiran en minutos.
- La API valida tipo y tamaño antes de firmar una subida.

## 8. Endurecimiento

- **Endpoints internos de jobs** (`/v1/internal/jobs/*`): solo aceptan el header `X-Job-Secret` correcto (comparación en tiempo constante); sin él responden 404. El secreto vive solo en variables de entorno de la API y en Supabase.
- **API:** CORS que solo acepta el dominio del front; `helmet`; rate limiting con `@nestjs/throttler` (más estricto en login, código y PIN); límite de tamaño de las peticiones.
- **Web:** Content Security Policy, HSTS, `X-Frame-Options: DENY`.
- **Errores:** en producción, mensajes genéricos hacia afuera; el detalle solo en logs.
- **Logs:** nunca incluyen montos, contenido de notas, diario o escritos, contraseñas, códigos ni tokens.

## 9. Borrar

- Todo va a la papelera (`deleted_at`) 30 días; luego un job lo borra definitivamente, incluidos sus archivos en Storage.
- Borrar la cuenta (escribiendo BORRAR) elimina **todo de inmediato**: filas, archivos y el usuario de Supabase Auth.

## 10. Operación

- Respaldos automáticos de Supabase (revisar cuántos días guarda el plan contratado).
- Dependabot o `pnpm audit` para dependencias vulnerables.
- Registro de inicios de sesión (fecha, dispositivo aproximado) visible en Perfil.

## Tests obligatorios

El usuario pidió tests **solo de lo crítico**. Estos sí son obligatorios, en cada módulo:
- Un usuario **no puede leer, editar ni borrar** datos de otro (por cada endpoint de ese módulo).
- Peticiones sin token, con token inválido o con sesión sin código verificado son rechazadas.
- Las validaciones rechazan entradas inválidas.
- Flujo del código por correo: expira, no se reutiliza, bloquea tras los intentos.
- PIN del diario: bloquea tras los intentos.
