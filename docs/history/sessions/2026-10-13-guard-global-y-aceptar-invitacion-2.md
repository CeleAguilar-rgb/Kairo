# 2026-10-13 · Probar la invitación de verdad y arreglar el enlace del correo

**Hecho en:** Claude Code / chat

## Qué se hizo

- Al probar el flujo de invitación con un correo real, la pantalla siempre mostraba "enlace inválido". Causa real: la plantilla `auth/email-templates/invite-user.html` usaba `{{ .ConfirmationURL }}`, que pasa por el servidor de verificación de Supabase y redirige con los tokens en el **fragmento de la URL** (`#access_token=...`) — el fragmento nunca llega al servidor, así que `/confirmar` siempre recibía la petición vacía. No era un bug del guard ni del router; era el formato de enlace equivocado para un enlace creado por la API (`admin.inviteUserByEmail`, sin navegador de por medio).
- Arreglado en dos partes:
  - La plantilla ahora arma el enlace a mano: `http://localhost:3000/confirmar?token_hash={{ .TokenHash }}&type=invite&next=/aceptar-invitacion`.
  - `(auth)/confirmar/route.ts` cambió de `exchangeCodeForSession(code)` a `verifyOtp({ type, token_hash })`, que sí se puede validar del lado del servidor.
- El archivo de la plantilla es solo la copia en el repo; lo que de verdad envía Supabase es lo que está pegado en su dashboard (Authentication → Email Templates), así que el usuario tuvo que copiar el HTML actualizado ahí a mano. No hay sincronización automática todavía.
- Para diagnosticar sin depender del correo (Gmail agrupa hilos y es fácil abrir un enlace viejo), se generaron enlaces directos con `admin.generateLink({ type: 'invite', email })`, que da el `token_hash` sin mandar nada por correo. Confirmó que el código ya funcionaba antes de tocar la plantilla.
- Se probó el flujo completo de verdad: invitación → `/confirmar` → `/aceptar-invitacion` → contraseña guardada → redirección a `/`. Confirmado con los logs del servidor y el `updated_at` del usuario en Supabase.
- Se corrigió `pnpm run invite:initial -- correo@ejemplo.com`: pnpm deja el `--` literal en `process.argv`, así que el script intentaba invitar a `--` como correo. Ahora lo filtra.
- Se mejoró `SetPasswordForm.tsx` para seguir la regla de `docs/guides/conventions.md` que no se estaba cumpliendo: validar al salir del campo (blur), no solo al enviar, y quitar el error en cuanto se corrige.

## Decisiones tomadas

- Ninguna nueva en `docs/guides/decisions.md`. La decisión #25 (sesión anterior) ya cubre usar `verifyOtp`/`getClaims` de Supabase en vez de una librería de JWT aparte.

## Archivos o partes importantes que se tocaron

- `apps/api/src/auth/email-templates/invite-user.html`
- `apps/api/src/auth/invite-initial-user.ts`
- `apps/web/src/app/(auth)/confirmar/route.ts`
- `apps/web/src/app/(auth)/aceptar-invitacion/SetPasswordForm.tsx`

## Quedó pendiente

- La plantilla de invitación en el dashboard de Supabase hay que volver a pegarla a mano si `invite-user.html` cambia — no hay script que las sincronice. Si se agregan más plantillas (recuperar contraseña, etc.), vale la pena un script con la Management API de Supabase.
- El resto de "código por correo", la parte del guard que revisa `verified_sessions`, cerrar todas las sesiones y recuperar contraseña siguen pendientes (igual que en la nota anterior).

## Notas para la siguiente sesión

- Cualquier flujo de correo nuevo (recuperar contraseña, por ejemplo) va a tener el mismo problema si se arma la plantilla con `{{ .ConfirmationURL }}`: usar siempre `{{ .TokenHash }}` + `type` + ruta propia.
- Para probar un flujo de correo sin esperar al correo de verdad: `admin.generateLink({ type, email })` da el `token_hash` directo.
