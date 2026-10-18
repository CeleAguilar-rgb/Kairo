// Modo demo: ver el front sin .env, sin Supabase y sin la API (`pnpm dev:demo`).
// Se salta el login y usa un perfil de ejemplo, así que tiene DOS candados:
// 1. NODE_ENV === 'development': `next build` / producción siempre es 'production',
//    así que en un despliegue esto es false aunque alguien ponga la bandera.
// 2. La bandera explícita NEXT_PUBLIC_KAIRO_DEMO=1, que solo pone scripts/dev-demo.mjs.
// No es un secreto (solo dice "estoy en demo"), por eso puede ser NEXT_PUBLIC_:
// el navegador también necesita saberlo (lib/env.ts lo importa código de cliente).
export const DEMO_MODE = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_KAIRO_DEMO === '1'
