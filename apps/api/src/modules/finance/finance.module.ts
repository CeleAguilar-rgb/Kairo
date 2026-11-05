import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { BudgetController } from './budget.controller.js'
import { BudgetService } from './budget.service.js'
import { CardsRepository } from './cards.repository.js'
import { CategoriesRepository } from './categories.repository.js'
import { DebtsRepository } from './debts.repository.js'
import { FinanceUndoController } from './finance-undo.controller.js'
import { FinanceUndoService } from './finance-undo.service.js'
import { MembershipsController } from './memberships.controller.js'
import { MembershipsRepository } from './memberships.repository.js'
import { MembershipsService } from './memberships.service.js'
import { RecordsController } from './records.controller.js'
import { RecordsService } from './records.service.js'
import { SavingsDebtsController } from './savings-debts.controller.js'
import { SavingsDebtsService } from './savings-debts.service.js'
import { SavingsRepository } from './savings.repository.js'
import { SettingsRepository } from './settings.repository.js'
import { TransactionsController } from './transactions.controller.js'
import { TransactionsRepository } from './transactions.repository.js'
import { TransactionsService } from './transactions.service.js'
import { FinanceJobs } from './finance.jobs.js'
import { FinanceTrash } from './finance.trash.js'
import { FinanceSearch } from './finance.search.js'

// Un solo módulo de Nest para las 5 pestañas de Finanzas (movimientos, ahorros y deudas, membresías y
// tarjetas, presupuesto, más las lecturas del Resumen): modules.md habla de módulos por sección de la UI, y
// las cinco viven bajo una sola ("finance" en el registro del front), con su propio controller/service cada
// una para no amontonar todo en un archivo (mismo criterio que DailyModule). Exporta FinanceJobs para las tareas
// programadas (src/jobs): los cobros de membresías y los avisos de presupuesto.
@Module({
  imports: [AccountModule, NotificationsModule],
  controllers: [
    RecordsController,
    TransactionsController,
    SavingsDebtsController,
    MembershipsController,
    BudgetController,
    FinanceUndoController,
  ],
  providers: [
    RecordsService,
    TransactionsService,
    SavingsDebtsService,
    MembershipsService,
    BudgetService,
    FinanceUndoService,
    TransactionsRepository,
    CardsRepository,
    CategoriesRepository,
    SavingsRepository,
    DebtsRepository,
    MembershipsRepository,
    SettingsRepository,
    FinanceTrash,
    FinanceSearch,
    FinanceJobs,
  ],
  exports: [FinanceJobs],
})
export class FinanceModule {}
