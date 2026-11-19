import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Sin la cabecera "X-Powered-By: Next.js": no le dice a nadie qué tecnología usamos.
  poweredByHeader: false,
  // Solo en `next dev`: deja que un teléfono en la misma red Wi-Fi (192.168.x.x) cargue
  // el JavaScript de desarrollo. Sin esto Next lo bloquea, la página no se hidrata y las
  // animaciones de Motion se quedan en su estado inicial (todo invisible).
  allowedDevOrigins: ['192.168.*.*'],
}

export default nextConfig
