// `pnpm dev:demo`: levanta solo el front con datos de ejemplo, sin .env (ver src/lib/demo.ts).
// Es un script de Node y no `NEXT_PUBLIC_KAIRO_DEMO=1 next dev` porque esa sintaxis no
// funciona en Windows, y así no hace falta agregar una dependencia como cross-env.
//
// Además PRECALIENTA las rutas: en desarrollo Next compila cada pantalla la primera vez que
// se visita (1–2 s), y durante ese rato la pantalla vieja se queda quieta sin que pase nada.
// Apenas el servidor está listo pedimos cada ruta una vez en segundo plano (como página
// completa y como navegación), así cuando haces clic ya está compilada. Se apaga con KAIRO_NO_WARMUP=1.
import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

// Un solo string con shell: true (así Windows encuentra el `next` de node_modules/.bin).
// stdout va por pipe (y se reenvía tal cual) para poder detectar el puerto y el "Ready".
const child = spawn('next dev', {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    NEXT_PUBLIC_KAIRO_DEMO: '1',
    // Con stdout por pipe Next dejaría de usar colores; se fuerzan salvo que pidas NO_COLOR
    ...(process.env.NO_COLOR ? {} : { FORCE_COLOR: process.env.FORCE_COLOR ?? '1' }),
  },
})

let port = null
let warmupStarted = false
const localUrl = new RegExp('http://localhost:([0-9]+)')

child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk)
  if (warmupStarted || process.env.KAIRO_NO_WARMUP === '1') return
  const text = chunk.toString()
  if (port === null) port = localUrl.exec(text)?.[1] ?? null
  if (port !== null && text.includes('Ready')) {
    warmupStarted = true
    warmUp(port).catch(() => {})
  }
})

child.on('exit', (code) => process.exit(code ?? 0))

// Las pantallas del dashboard son las carpetas de src/app/(dashboard) (sin los grupos "(x)"
// ni los segmentos dinámicos "[x]"). Inicio (/) va primero porque es la que se abre antes.
function dashboardRoutes() {
  const dir = join(import.meta.dirname, '..', 'src', 'app', '(dashboard)')
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !'([_@'.includes(entry.name[0]))
    .map((entry) => `/${entry.name}`)
  return ['/', ...names]
}

async function warmUp(port) {
  const base = `http://localhost:${port}`
  const routes = dashboardRoutes()
  const started = Date.now()
  console.log()
  console.log(`[kairo] Precalentando ${routes.length} pantallas para que la primera visita no espere a compilar...`)
  const scriptSrc = new RegExp('src="(/_next/[^"]+[.]js[^"]*)"', 'g')
  for (const route of routes) {
    try {
      const html = await (await fetch(base + route, { redirect: 'manual' })).text()
      // En desarrollo los scripts de la ruta también se compilan al pedirlos
      const scripts = [...html.matchAll(scriptSrc)].map((match) => match[1].replaceAll('&amp;', '&'))
      await Promise.all(scripts.map((src) => fetch(base + src).then((res) => res.arrayBuffer()).catch(() => {})))
      // Y la misma petición que hace el navegador al cambiar de pantalla (RSC): sin ella la
      // primera navegación real todavía compilaba algo (1–3 s en algunas rutas)
      await fetch(`${base}${route}?_rsc`, { headers: { RSC: '1' } }).then((res) => res.arrayBuffer())
    } catch {
      // Una ruta que falla no debe frenar a las demás ni al servidor
    }
  }
  console.log(`[kairo] Listo: ${routes.length} pantallas precalentadas en ${((Date.now() - started) / 1000).toFixed(1)} s`)
}
