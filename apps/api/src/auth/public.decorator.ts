import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

// Marca una ruta como excepción al guard global (auth/jwt.guard.ts). Las rutas son
// privadas por defecto (docs/guides/security.md); esto hace explícita la excepción.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
