import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

// request.userId lo pone auth/jwt.guard.ts a partir del JWT verificado. Nunca viene
// del body, query ni params (docs/guides/security.md).
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest()
  return request.userId
})
