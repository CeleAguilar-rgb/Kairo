import { Module } from '@nestjs/common'
import { ProjectsModule } from '../projects/projects.module'
import { TasksController } from './tasks.controller'
import { TasksRepository } from './tasks.repository'
import { TasksService } from './tasks.service'

// Sprints le pide a TasksService las tareas por id y cambiarles el estado; por eso lo exporta. Tareas le pide a
// Proyectos el nombre del proyecto de cada tarea (y que sea de la persona).
@Module({
  imports: [ProjectsModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
  exports: [TasksService],
})
export class TasksModule {}
