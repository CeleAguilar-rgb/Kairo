import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common'
import type { ZodType } from 'zod'

// docs/guides/conventions.md: "la validación usa los esquemas Zod de @kairo/shared
// mediante un pipe; no duplicar con class-validator". Se usa por parámetro:
// @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput.
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message:
          result.error.issues[0]?.message ??
          'Los datos enviados no son válidos.',
      })
    }

    return result.data
  }
}
