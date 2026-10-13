# 2026-10-13 · Panel de marca en las cuatro pantallas de auth y cierre

**Hecho en:** Claude Code / chat

## Qué se hizo

- El usuario probó `/restablecer-contrasena` de verdad en el navegador: funcionó. Se confirmó por dos lados — los logs del servidor muestran el `GET /` final (redirección de éxito) y el `updated_at` del usuario en Supabase cambió justo después de la prueba.
- `/aceptar-invitacion` y `/restablecer-contrasena` usaban una tarjeta centrada simple, sin el panel oscuro con el logo y los doodles que sí tienen `/entrar` y `/recuperar`. El usuario pidió que no fueran "tan simples" — se les puso el mismo panel de marca (`BrandPanel`) y el layout partido (`split-layout.module.css`), para que las cuatro pantallas de auth se vean como un solo sistema. Esto también responde la pregunta abierta de la sesión anterior sobre "el fondo" de `/entrar` (quería decir esto: logo y doodles, no un degradado).
- `centered-card.module.css` se volvió innecesario (nadie lo usaba ya) y se borró.
- El usuario commiteó este trabajo junto con el de "recuperar contraseña" de la sesión `-4` en un solo commit (`a76942e`), él mismo — Claude solo propuso el mensaje.

## Decisiones tomadas

- Ninguna nueva.

## Archivos o partes importantes que se tocaron

- `app/(auth)/aceptar-invitacion/page.tsx` y `app/(auth)/restablecer-contrasena/page.tsx`: pasan del layout de `Card` centrada al layout partido con `BrandPanel`.
- Se borró `app/(auth)/centered-card.module.css`.

## Quedó pendiente

- Pegar `recover-password.html` en el dashboard de Supabase (Authentication → Email Templates → Reset Password) — la de invitación ya se pegó, esta todavía no.
- Confirmar en el dashboard de Supabase que la sesión dura 30 días (decisión #8).
- "Cerrar todas las sesiones" espera a que exista Perfil (Fase 0, punto 5).

## Notas para la siguiente sesión

Con esto, el paso 4 de Auth (`docs/guides/roadmap.md`) está prácticamente completo — solo faltan los dos puntos de configuración de arriba, que no son código. El siguiente trabajo real es el **punto 5: Shell del dashboard** (layout, sidebar desde el registro de módulos, perfil básico, bienvenida — el wizard de `docs/design/screens/Bienvenida.dc.html` que se encontró de pasada en la sesión `-3`).
