import { Module } from '@nestjs/common'
import { TasksModule } from '../tasks/tasks.module'
import { FocusController } from './focus.controller'
import { FocusRepository } from './focus.repository'
import { FocusService } from './focus.service'

// Enfoque es una hoja del grafo de módulos: depende de Tareas (para saber si la tarea es de la persona) y ninguno
// depende de él, así no hay dependencias circulares.
@Module({
  imports: [TasksModule],
  controllers: [FocusController],
  providers: [FocusService, FocusRepository],
})
export class FocusModule {}
