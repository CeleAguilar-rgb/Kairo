import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module'
import { BudgetController } from './budget.controller'
import { BudgetService } from './budget.service'
import { CardsRepository } from './cards.repository'
import { CategoriesRepository } from './categories.repository'
import { DebtsRepository } from './debts.repository'
import { FinanceUndoController } from './finance-undo.controller'
import { FinanceUndoService } from './finance-undo.service'
import { MembershipsController } from './memberships.controller'
import { MembershipsRepository } from './memberships.repository'
import { MembershipsService } from './memberships.service'
import { RecordsController } from './records.controller'
import { RecordsService } from './records.service'
import { SavingsDebtsController } from './savings-debts.controller'
import { SavingsDebtsService } from './savings-debts.service'
import { SavingsRepository } from './savings.repository'
import { SettingsRepository } from './settings.repository'
import { TransactionsController } from './transactions.controller'
import { TransactionsRepository } from './transactions.repository'
import { TransactionsService } from './transactions.service'

// Un solo módulo de Nest para las 5 pestañas de Finanzas (movimientos, ahorros y deudas, membresías y
// tarjetas, presupuesto, más las lecturas del Resumen): modules.md habla de módulos por sección de la UI, y
// las cinco viven bajo una sola ("finance" en el registro del front), con su propio controller/service cada
// una para no amontonar todo en un archivo (mismo criterio que DailyModule).
@Module({
  imports: [AccountModule],
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
  ],
})
export class FinanceModule {}
