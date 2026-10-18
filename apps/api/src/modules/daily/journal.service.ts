import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { JournalEntryInput } from '@kairo/shared'
import { AccountService } from '../../account/account.service'
import type { journalEntries } from '../../db/schema/daily'
import { todayIn } from './daily-utils'
import { encodeDailyUndo } from './daily-undo'
import { JournalRepository } from './journal.repository'

type EntryRow = typeof journalEntries.$inferSelect

@Injectable()
export class JournalService {
  constructor(
    @Inject(JournalRepository) private readonly repository: JournalRepository,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {}

  async findAll(userId: string) {
    const rows = await this.repository.findAll(userId)
    return rows.map(toJournalEntry)
  }

  // Solo se puede escribir la entrada de hoy (saveJournalAction). El cuerpo se guarda sin cifrar y sin
  // PIN (decisión #38, a pedido explícito de la usuaria): security.md pedía argon2 + AES-256-GCM para
  // esto, pero por ahora el Diario queda al mismo nivel que cualquier otro texto del usuario.
  async save(userId: string, input: JournalEntryInput & { summary: string[] }) {
    const { profile } = await this.accountService.getMe(userId)
    const today = todayIn(profile.timezone)
    if (input.date !== today) {
      throw new BadRequestException({ code: 'JOURNAL_NOT_TODAY', message: 'Solo puedes escribir la entrada de hoy.' })
    }
    const row = await this.repository.upsert(userId, input.date, {
      mood: input.mood,
      body: input.body,
      gratitude: input.gratitude.filter(Boolean),
      tags: input.tags,
      summary: input.summary,
    })
    if (!row) throw new Error('No se pudo guardar la entrada.')
    return toJournalEntry(row)
  }

  async delete(userId: string, entryDate: string) {
    const row = await this.repository.softDelete(userId, entryDate)
    if (!row) throw new NotFoundException({ code: 'JOURNAL_ENTRY_NOT_FOUND', message: 'No encontramos esa entrada.' })
    return { id: row.id, undoToken: encodeDailyUndo({ type: 'journal', id: row.id }) }
  }

  async restore(userId: string, id: string) {
    await this.repository.restore(userId, id)
  }
}

function toJournalEntry(row: EntryRow) {
  return {
    id: row.id,
    entryDate: row.entryDate,
    mood: row.mood,
    body: row.body,
    gratitude: row.gratitude,
    tags: row.tags,
    summary: row.summary,
    savedAt: row.savedAt.toISOString(),
  }
}
