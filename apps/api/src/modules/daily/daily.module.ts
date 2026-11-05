import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module.js'
import { ProjectsModule } from '../projects/projects.module.js'
import { DailyUndoController } from './daily-undo.controller.js'
import { DailyUndoService } from './daily-undo.service.js'
import { GoalsController } from './goals.controller.js'
import { GoalsRepository } from './goals.repository.js'
import { GoalsService } from './goals.service.js'
import { JournalController } from './journal.controller.js'
import { JournalRepository } from './journal.repository.js'
import { JournalService } from './journal.service.js'
import { MealsController } from './meals.controller.js'
import { MealsRepository } from './meals.repository.js'
import { MealsService } from './meals.service.js'
import { RoutinesController } from './routines.controller.js'
import { RoutinesRepository } from './routines.repository.js'
import { RoutinesService } from './routines.service.js'
import { DailyTrash } from './daily.trash.js'
import { DailySearch } from './daily.search.js'

// Un solo módulo de Nest para las 4 áreas de Día a día (rutina, menú, diario, metas): modules.md habla
// de módulos por sección de la UI, y las 4 viven bajo una sola ("daily" en el registro del front), con
// su propio controller/service/repository cada una para no amontonar todo en un archivo.
@Module({
  imports: [AccountModule, ProjectsModule],
  controllers: [RoutinesController, MealsController, JournalController, GoalsController, DailyUndoController],
  providers: [
    RoutinesService,
    RoutinesRepository,
    MealsService,
    MealsRepository,
    JournalService,
    JournalRepository,
    GoalsService,
    GoalsRepository,
    DailyUndoService,
    DailyTrash,
    DailySearch,
  ],
})
export class DailyModule {}
