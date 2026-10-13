# 2026-10-13 · Recuperar contraseña

**Hecho en:** Claude Code / chat

## Qué se hizo

- Se construyó "olvidé mi contraseña", siguiendo el mismo patrón que invitación: `resetPasswordForEmail()` desde el navegador → `/confirmar` (ya genérico, acepta `type=recovery`) → pantalla para la contraseña nueva.
- `/recuperar`: pantalla con el layout partido de `/entrar` (siguiendo el estado `vForgot`/`vSent` de `Entrar.dc.html`). Pide el correo, muestra "revisa tu correo" al enviar — **sin revisar si el correo existe**, a propósito, para no dejar adivinar qué cuentas hay (comentado en el código). Incluye reenviar con un enfriamiento de 60 s.
- `/restablecer-contrasena`: mismo patrón que `/aceptar-invitacion`. Al guardar la contraseña nueva, **cierra las demás sesiones** (`supabase.auth.signOut({ scope: 'others' })`) — lo pide `docs/guides/security.md` sección 2 y no estaba implementado en ningún lado todavía.
- Se agregó el enlace "La olvidé" de vuelta en `/entrar` (se había dejado fuera antes porque esta pantalla no existía). Para esto, `Input` ganó una prop `labelExtra` (slot junto a la etiqueta, reusable).
- Se extrajeron a `app/(auth)/` (compartido entre pantallas, ya no solo de `/entrar`):
  - `BrandPanel.tsx` + `.module.css` (el panel oscuro).
  - `split-layout.module.css` (el grid de dos columnas).
  - `centered-card.module.css` (la tarjeta centrada de `/aceptar-invitacion` y `/restablecer-contrasena`).
  - `SetPasswordForm.tsx`: ahora toma `title`, `subtitle`, `submitLabel`, `savingLabel` y `kind: 'invite' | 'recovery'` por props, en vez de estar fijo a la copia de invitación.
- Nueva plantilla de correo `auth/email-templates/recover-password.html`, con el formato de enlace correcto (`{{ .TokenHash }}`) desde el inicio — no repite el bug que tuvo la de invitación.
- Probado con un enlace real generado con `admin.generateLink({ type: 'recovery', email })`: `/confirmar` verifica el `token_hash` de tipo `recovery` y crea la sesión correctamente. No se probó el envío del formulario de contraseña nueva en navegador real (la parte de servidor ya se confirmó; la de cliente reusa el mismo código ya probado con invitación).

## Decisiones tomadas

- Ninguna nueva.

## Archivos o partes importantes que se tocaron

- Nuevo: `app/(auth)/recuperar/` (`page.tsx`, `RecoverForm.tsx`, `.module.css`), `app/(auth)/restablecer-contrasena/page.tsx`.
- Movidos a `app/(auth)/` (antes vivían dentro de `entrar/` o `aceptar-invitacion/`): `BrandPanel.tsx`, `SetPasswordForm.tsx` y sus `.module.css`.
- Nuevos compartidos: `split-layout.module.css`, `centered-card.module.css`.
- `components/ui/Input.tsx`: prop `labelExtra`.
- `apps/api/src/auth/email-templates/recover-password.html`.
- `packages/shared/src/auth/schemas.ts`: `requestPasswordResetSchema`.

## Quedó pendiente

- Probar "restablecer contraseña" con el formulario de verdad en el navegador (solo se probó la parte de servidor).
- **Falta pedirle a Supabase que mande el correo de recuperación con esta plantilla**: hay que pegar `recover-password.html` en el dashboard (Authentication → Email Templates → Reset Password), igual que se hizo con la de invitación.
- Del paso 4 de Auth solo queda: confirmar que la sesión dura 30 días (configuración de Supabase, no código) y "cerrar todas las sesiones" (espera a que exista Perfil, punto 5).

## Notas para la siguiente sesión

- El patrón para pantallas de auth ya está bien establecido: `app/(auth)/` tiene las piezas compartidas (`BrandPanel`, `SetPasswordForm`, los layouts), cada pantalla nueva solo agrega su propio formulario. Reusar esto para lo que falte en vez de volver a armar el layout desde cero.
