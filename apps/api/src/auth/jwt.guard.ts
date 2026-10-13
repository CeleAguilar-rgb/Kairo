import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ADMIN } from '../common/supabase/supabase.module'
import { IS_PUBLIC_KEY } from './public.decorator'

// Guard global (docs/guides/security.md, sección 4): rutas privadas por defecto,
// @Public() es la excepción. Todavía no revisa verified_sessions (eso llega con
// el flujo de código por correo); por ahora solo verifica el JWT de Supabase.
@Injectable()
export class JwtGuard implements CanActivate {
  // @Inject(Reflector) explícito: tsx/esbuild (ver docs/history/current.md, Bloqueos)
  // no siempre emite la metadata de tipos que Nest usa para inyectar por tipo solo.
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SUPABASE_ADMIN) private readonly supabaseAdmin: SupabaseClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest()
    const token = extractBearerToken(request.headers.authorization)

    if (!token) {
      throw new UnauthorizedException('Necesitas iniciar sesión para continuar.')
    }

    const { data, error } = await this.supabaseAdmin.auth.getClaims(token)

    if (error || !data) {
      throw new UnauthorizedException('Tu sesión no es válida o venció. Inicia sesión de nuevo.')
    }

    request.userId = data.claims.sub
    return true
  }
}

function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  if (!authorizationHeader?.startsWith('Bearer ')) return undefined
  return authorizationHeader.slice('Bearer '.length)
}
