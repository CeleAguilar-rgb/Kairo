// `pnpm dev:demo`: levanta solo el front con datos de ejemplo, sin .env (ver src/lib/demo.ts).
// Es un script de Node y no `NEXT_PUBLIC_KAIRO_DEMO=1 next dev` porque esa sintaxis no
// funciona en Windows, y así no hace falta agregar una dependencia como cross-env.
import { spawn } from 'node:child_process'

// Un solo string con shell: true (así Windows encuentra el `next` de node_modules/.bin).
const child = spawn('next dev', {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_KAIRO_DEMO: '1' },
})

child.on('exit', (code) => process.exit(code ?? 0))
