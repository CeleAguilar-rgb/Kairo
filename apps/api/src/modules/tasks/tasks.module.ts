import { Module } from '@nestjs/common'
import { ProjectsModule } from '../projects/projects.module.js'
import { TasksController } from './tasks.controller.js'
import { TasksRepository } from './tasks.repository.js'
import { TasksService } from './tasks.service.js'
import { TasksTrash } from './tasks.trash.js'
import { TasksSearch } from './tasks.search.js'

// Sprints le pide a TasksService las tareas por id y cambiarles el estado; por eso lo exporta. Tareas le pide a
// Proyectos el nombre del proyecto de cada tarea (y que sea de la persona).
@Module({
  imports: [ProjectsModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository, TasksTrash, TasksSearch],
  exports: [TasksService],
})
export class TasksModule {}
