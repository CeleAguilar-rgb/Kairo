import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import type { Response } from 'express'

const DEFAULT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'TOO_MANY_REQUESTS',
}

// docs/guides/conventions.md: formato de error siempre { error: { code, message } }.
// Los services lanzan excepciones de Nest pasando { code, message } como respuesta
// (p. ej. new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: '…' })); este
// filtro las deja en ese formato, o pone un código por defecto si no lo traen.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR
    const body =
      exception instanceof HttpException ? exception.getResponse() : null

    const code =
      body && typeof body === 'object' && 'code' in body
        ? String((body as { code: unknown }).code)
        : (DEFAULT_CODES[status] ?? 'INTERNAL_ERROR')

    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : 'Algo salió mal. Intenta de nuevo.'

    // Nunca datos personales, montos, contenidos, contraseñas, códigos ni tokens (conventions.md).
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error(JSON.stringify({ level: 'error', code, status }))
    }

    response.status(status).json({ error: { code, message } })
  }
}
