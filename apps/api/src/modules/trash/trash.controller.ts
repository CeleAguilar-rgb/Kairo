import { Controller, Delete, Get, HttpCode, Inject, Param, Post } from '@nestjs/common'
import { type TrashRef, trashRefSchema } from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { TrashService } from './trash.service'

// Papelera.dc.html. El tipo y el id van en la ruta y se validan juntos con el esquema compartido (regla 4).
@Controller('trash')
export class TrashController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(TrashService) private readonly trashService: TrashService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.trashService.list(userId)
  }

  // "Vaciar papelera".
  @Delete()
  @HttpCode(204)
  async empty(@CurrentUser() userId: string) {
    await this.trashService.empty(userId)
  }

  // Mandar a la papelera con todo lo que arrastra (hoy solo un proyecto: Borrar.dc.html).
  @Post(':kind/:id')
  @HttpCode(204)
  async trash(@CurrentUser() userId: string, @Param(new ZodValidationPipe(trashRefSchema)) ref: TrashRef) {
    await this.trashService.trash(userId, ref)
  }

  @Post(':kind/:id/restore')
  @HttpCode(204)
  async restore(@CurrentUser() userId: string, @Param(new ZodValidationPipe(trashRefSchema)) ref: TrashRef) {
    await this.trashService.restore(userId, ref)
  }

  // "Borrar para siempre": solo funciona con algo que ya está en la papelera.
  @Delete(':kind/:id')
  @HttpCode(204)
  async purge(@CurrentUser() userId: string, @Param(new ZodValidationPipe(trashRefSchema)) ref: TrashRef) {
    await this.trashService.purge(userId, ref)
  }
}
