# Prueba del Web Playback SDK de Spotify

Una página aparte, **no es parte de Kairo**: sirve para ver, con tu cuenta Premium, si el reproductor de Spotify dentro de una página funciona en modo desarrollo antes de decidir si Kairo lo usa (ver `docs/history/sessions/2026-10-25-enfoque-backend.md`). No guarda nada y no usa el Client Secret.

## Pasos

1. Entra a <https://developer.spotify.com/dashboard> con tu cuenta Premium y crea una app. Marca **Web Playback SDK** y **Web API**.
2. En la app, agrega esta **dirección de retorno** (tiene que ser exacta; `localhost` no sirve, hay que usar la IP):

   ```
   http://127.0.0.1:8765/callback
   ```

3. Arranca el servidor:

   ```bash
   node tools/spotify-prueba/server.mjs
   ```

4. Abre <http://127.0.0.1:8765> (con la IP, no con `localhost`), pega el **Client ID** y pulsa "Iniciar sesión con Spotify".
5. Pega el enlace de una playlist tuya y pulsa "Reproducir aquí". Pulsa también los dos botones de la Web API.

## Cómo leer el resultado

La página marca ✓ o ✗ en cada paso. Lo importante para Kairo:

- **El dispositivo aparece (ready) y la música suena aquí** → el reproductor propio es viable.
- **`connect()` no responde** → es el problema que alguien reportó en la comunidad de Spotify en 2026; entonces conviene el enlace o embed de la playlist.
- **GET /me/playlists falla** → no se podría listar tus playlists dentro de Kairo (la lista del canvas); habría que pegar el enlace a mano.
- **Todo sale ✓ pero el dispositivo no aparece y el paso de DRM sale ✗** → el navegador no trae Widevine (pasa en el navegador integrado de algunas apps). Abre la dirección en Chrome o Edge.
- Si ves un `account_error`, la cuenta no es Premium o Spotify no la aceptó.

Para parar el servidor: `Ctrl+C`. Al terminar, puedes borrar la app en el panel de Spotify.
