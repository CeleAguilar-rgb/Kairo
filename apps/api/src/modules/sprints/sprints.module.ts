import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module'
import { ProjectsModule } from '../projects/projects.module'
import { TasksModule } from '../tasks/tasks.module'
import { SprintsController } from './sprints.controller'
import { SprintsRepository } from './sprints.repository'
import { SprintsService } from './sprints.service'

// Sprints depende de Proyectos (¿existe el proyecto y es de la persona?) y de Tareas (qué tareas son de qué
// proyecto y si están hechas), y ninguno de los dos depende de él: sin dependencias circulares. Por eso es un
// módulo de Nest aparte aunque la pantalla viva dentro de Proyectos.
@Module({
  imports: [AccountModule, ProjectsModule, TasksModule],
  controllers: [SprintsController],
  providers: [SprintsService, SprintsRepository],
})
export class SprintsModule {}
