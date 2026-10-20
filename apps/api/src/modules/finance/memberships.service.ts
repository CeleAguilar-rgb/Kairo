import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { FINANCE_CURRENCY, type CardInput, type MembershipInput } from '@kairo/shared'
import { CardsRepository } from './cards.repository'
import { toCard, toMembership } from './finance-mappers'
import { encodeFinanceUndo } from './finance-undo'
import { MembershipsRepository } from './memberships.repository'

// Membresías y tarjetas. Las membresías con cobro salen en "Próximos pagos" de Inicio y en la Agenda: esas
// pantallas leen `GET /finance/memberships` (records.controller.ts) y calculan el próximo cobro con el día.
@Injectable()
export class MembershipsService {
  constructor(
    @Inject(MembershipsRepository) private readonly repository: MembershipsRepository,
    @Inject(CardsRepository) private readonly cardsRepository: CardsRepository,
  ) {}

  // Crea una membresía (membershipId null) o edita una existente (incluida pausarla o retomarla). El próximo
  // cobro no se guarda: se calcula al leer con el día de cobro.
  async save(userId: string, membershipId: string | null, input: MembershipInput) {
    if (input.cardId !== null && !(await this.cardsRepository.findOne(userId, input.cardId))) {
      throw new BadRequestException({ code: 'CARD_NOT_FOUND', message: 'Elige con qué se paga.' })
    }

    const data = {
      name: input.name,
      amountCents: input.amountCents,
      currency: FINANCE_CURRENCY,
      cadence: input.cadence,
      // Solo cuenta lo que pide cada frecuencia: lo demás no se guarda.
      chargeDay: input.cadence === 'weekly' ? null : input.chargeDay,
      chargeMonth: input.cadence === 'yearly' ? input.chargeMonth : null,
      chargeWeekday: input.cadence === 'weekly' ? input.chargeWeekday : null,
      cardId: input.cardId,
      notify: input.notify,
      status: input.status,
    }

    if (membershipId === null) return toMembership(await this.repository.create(userId, data))
    const row = await this.repository.update(userId, membershipId, data)
    if (!row) throw this.membershipNotFound()
    return toMembership(row)
  }

  // Va a la papelera: el aviso trae "Deshacer".
  async delete(userId: string, id: string) {
    const removed = await this.repository.softDelete(userId, id)
    if (!removed) throw this.membershipNotFound()
    return { id, undoToken: encodeFinanceUndo({ type: 'membership', id }) }
  }

  // Solo alias y últimos 4 dígitos (regla 9 de CLAUDE.md): el efectivo no lleva números, y solo el crédito
  // lleva día de corte y de pago. La base misma rechaza un `last4` que no sean 4 dígitos (CHECK).
  async createCard(userId: string, input: CardInput) {
    const row = await this.cardsRepository.create(userId, {
      name: input.name,
      kind: input.kind,
      last4: input.kind === 'cash' ? null : input.last4,
      color: input.color,
      cutDay: input.kind === 'credit' ? input.cutDay : null,
      dueDay: input.kind === 'credit' ? input.dueDay : null,
    })
    return toCard(row)
  }

  // Borra una tarjeta junto con sus membresías (la pantalla ya las mostró en la confirmación). Los movimientos
  // pasados se quedan y siguen diciendo con cuál se pagaron. Va a la papelera: "Deshacer" devuelve las dos cosas.
  async deleteCard(userId: string, id: string) {
    const removed = await this.cardsRepository.deleteWithMemberships(userId, id)
    if (!removed) throw new NotFoundException({ code: 'CARD_NOT_FOUND', message: 'No encontramos esa tarjeta.' })
    return { id, undoToken: encodeFinanceUndo({ type: 'card', id, membershipIds: removed.membershipIds }) }
  }

  private membershipNotFound() {
    return new NotFoundException({ code: 'MEMBERSHIP_NOT_FOUND', message: 'No encontramos esa membresía.' })
  }
}
