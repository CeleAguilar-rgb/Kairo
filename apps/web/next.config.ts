import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Sin la cabecera "X-Powered-By: Next.js": no le dice a nadie qué tecnología usamos.
  poweredByHeader: false,
}

export default nextConfig
