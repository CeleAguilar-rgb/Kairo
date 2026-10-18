import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module'
import { DailyUndoController } from './daily-undo.controller'
import { DailyUndoService } from './daily-undo.service'
import { GoalsController } from './goals.controller'
import { GoalsRepository } from './goals.repository'
import { GoalsService } from './goals.service'
import { JournalController } from './journal.controller'
import { JournalRepository } from './journal.repository'
import { JournalService } from './journal.service'
import { MealsController } from './meals.controller'
import { MealsRepository } from './meals.repository'
import { MealsService } from './meals.service'
import { RoutinesController } from './routines.controller'
import { RoutinesRepository } from './routines.repository'
import { RoutinesService } from './routines.service'

// Un solo módulo de Nest para las 4 áreas de Día a día (rutina, menú, diario, metas): modules.md habla
// de módulos por sección de la UI, y las 4 viven bajo una sola ("daily" en el registro del front), con
// su propio controller/service/repository cada una para no amontonar todo en un archivo.
@Module({
  imports: [AccountModule],
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
  ],
})
export class DailyModule {}
