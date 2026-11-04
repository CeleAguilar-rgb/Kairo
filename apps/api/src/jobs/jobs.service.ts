import { Inject, Injectable, Logger } from '@nestjs/common'
import { AccountService } from '../account/account.service'
import { FinanceJobs } from '../modules/finance/finance.jobs'
import { RemindersJobs } from '../modules/reminders/reminders.jobs'
import { TrashService } from '../modules/trash/trash.service'

export const JOB_NAMES = ['minute', 'daily'] as const
export type JobName = (typeof JOB_NAMES)[number]

// Las tareas programadas no tienen lógica propia: le piden a cada módulo su parte por su API pública
// (`<módulo>.jobs.ts` o su service) y juntan lo que hicieron. Cada parte corre aparte: si una falla, las demás
// siguen y la siguiente vuelta la reintenta (todas son idempotentes).
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name)

  constructor(
    @Inject(RemindersJobs) private readonly remindersJobs: RemindersJobs,
    @Inject(FinanceJobs) private readonly financeJobs: FinanceJobs,
    @Inject(TrashService) private readonly trashService: TrashService,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {}

  run(name: JobName, now = new Date()) {
    return name === 'minute' ? this.minute(now) : this.daily(now)
  }

  // Cada minuto: los recordatorios que ya tocan.
  async minute(now = new Date()) {
    return { reminders: await this.step('reminders', () => this.remindersJobs.notifyDue(now)) }
  }

  // Una vez al día: la papelera de más de 30 días, los cobros y avisos de Finanzas y los códigos de login vencidos.
  async daily(now = new Date()) {
    return {
      trash: await this.step('trash', () => this.trashService.purgeExpired(now)),
      finance: await this.step('finance', () => this.financeJobs.runDaily(now)),
      loginCodes: await this.step('loginCodes', () => this.accountService.purgeExpiredLoginCodes(now)),
    }
  }

  private async step<T>(name: string, work: () => Promise<T>): Promise<T | { error: true }> {
    try {
      return await work()
    } catch (error) {
      this.logger.error(`La tarea "${name}" falló: ${error instanceof Error ? error.message : String(error)}`)
      return { error: true }
    }
  }
}
