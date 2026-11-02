// Un servidor mínimo para la prueba del Web Playback SDK de Spotify (tools/spotify-prueba/README.md).
// Sirve index.html en cualquier ruta (incluida /callback, a donde Spotify te regresa después de iniciar sesión).
// Escucha SOLO en 127.0.0.1: Spotify no acepta "localhost" como dirección de retorno, pero sí esta IP.
// No usa dependencias, no guarda nada y no es parte de Kairo.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const PORT = Number(process.env.PORT ?? 8765)
const page = join(import.meta.dirname, 'index.html')

createServer(async (request, response) => {
  try {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end(await readFile(page))
  } catch {
    response.writeHead(500)
    response.end('No se pudo leer index.html')
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Prueba de Spotify lista: abre http://127.0.0.1:${PORT}`)
  console.log(`Dirección de retorno para el panel de Spotify: http://127.0.0.1:${PORT}/callback`)
})
