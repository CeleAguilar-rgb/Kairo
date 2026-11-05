import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module.js'
import { ProjectsModule } from '../projects/projects.module.js'
import { TasksModule } from '../tasks/tasks.module.js'
import { SprintsController } from './sprints.controller.js'
import { SprintsRepository } from './sprints.repository.js'
import { SprintsService } from './sprints.service.js'
import { SprintsTrash } from './sprints.trash.js'

// Sprints depende de Proyectos (¿existe el proyecto y es de la persona?) y de Tareas (qué tareas son de qué
// proyecto y si están hechas), y ninguno de los dos depende de él: sin dependencias circulares. Por eso es un
// módulo de Nest aparte aunque la pantalla viva dentro de Proyectos.
// Escuela le pide a SprintsService mandar a la papelera los sprints de una materia que se borra; por eso lo exporta.
@Module({
  imports: [AccountModule, ProjectsModule, TasksModule],
  controllers: [SprintsController],
  providers: [SprintsService, SprintsRepository, SprintsTrash],
  exports: [SprintsService],
})
export class SprintsModule {}
