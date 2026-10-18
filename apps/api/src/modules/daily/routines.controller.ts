import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import { type RoutineBlockInput, type RoutineInput, routineBlockSchema, routineSchema } from '@kairo/shared'
import { z } from 'zod'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { RoutinesService } from './routines.service'

// routineId no se comparte con el form (routineBlockSchema, en packages/shared): la pantalla lo manda
// aparte porque ya sabe en qué rutina está, igual que occurrence en Agenda.
const createBlockSchema = z.object({ routineId: z.uuid() }).and(routineBlockSchema)
const toggleSchema = z.object({ done: z.boolean() })
const copyBlocksSchema = z.object({ fromRoutineId: z.uuid(), toRoutineId: z.uuid() })
const logsRangeSchema = z.object({ from: z.iso.date(), to: z.iso.date() })

@Controller()
export class RoutinesController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(RoutinesService) private readonly routinesService: RoutinesService) {}

  @Get('routines')
  findAll(@CurrentUser() userId: string) {
    return this.routinesService.findAll(userId)
  }

  @Get('routines/logs')
  findLogs(@CurrentUser() userId: string, @Query(new ZodValidationPipe(logsRangeSchema)) query: z.infer<typeof logsRangeSchema>) {
    return this.routinesService.findLogs(userId, query.from, query.to)
  }

  @Post('routines')
  createRoutine(@CurrentUser() userId: string) {
    return this.routinesService.createRoutine(userId)
  }

  @Patch('routines/:id')
  updateRoutine(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(routineSchema)) body: RoutineInput,
  ) {
    return this.routinesService.updateRoutine(userId, id, body)
  }

  @Delete('routines/:id')
  deleteRoutine(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.routinesService.deleteRoutine(userId, id)
  }

  @Post('routine-blocks')
  createBlock(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(createBlockSchema)) body: RoutineBlockInput & { routineId: string },
  ) {
    const { routineId, ...input } = body
    return this.routinesService.createBlock(userId, routineId, input)
  }

  @Patch('routine-blocks/:id')
  updateBlock(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(routineBlockSchema)) body: RoutineBlockInput,
  ) {
    return this.routinesService.updateBlock(userId, id, body)
  }

  @Delete('routine-blocks/:id')
  deleteBlock(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.routinesService.deleteBlock(userId, id)
  }

  @Post('routine-blocks/copy')
  copyBlocks(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(copyBlocksSchema)) body: z.infer<typeof copyBlocksSchema>,
  ) {
    return this.routinesService.copyBlocks(userId, body.fromRoutineId, body.toRoutineId)
  }

  @Post('routine-blocks/:id/toggle')
  toggleBlock(
    @CurrentUser() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(toggleSchema)) body: z.infer<typeof toggleSchema>,
  ) {
    return this.routinesService.toggleBlock(userId, id, body.done)
  }

  @Post('routine-blocks/:id/complete-focus-task')
  completeFocusTask(@CurrentUser() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.routinesService.completeFocusTask(userId, id)
  }
}
