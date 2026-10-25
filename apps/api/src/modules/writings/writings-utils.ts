import { BadRequestException } from '@nestjs/common'
import type { FieldValue, TemplateFieldInput } from '@kairo/shared'

// Lógica pura de Escritos que usan varios services del módulo: la fecha de hoy en la zona de la persona, revisar
// los valores de una ficha contra su plantilla y revisar listas de ids contra lo que existe en el mundo.

export type IsoDate = string

// Misma función que school-utils.ts (no se importa: un módulo no usa archivos internos de otro).
export function todayIn(timeZone: string, now = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

// Lo que existe en un mundo y se puede nombrar desde otro lado: los ids de sus personajes, sus notas, sus eras y
// sus secciones extra. Lo arma WorldsService.refs() una vez por petición.
export type WorldRefs = {
  worldId: string
  characters: Set<string>
  notes: Set<string>
  eras: Set<string>
  sections: Set<string>
}

export function badRequest(code: string, message: string) {
  return new BadRequestException({ code, message })
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Revisa que cada id de la lista exista en el mundo (en alguno de los grupos que se permiten). Uno que no existe
// es un 400 con un mensaje que no dice si existe en otro lado (security.md #4: no revelar datos de otros).
export function assertIdsIn(ids: string[], groups: Set<string>[], message = 'Alguno de los elementos que nombraste no existe en este mundo.') {
  for (const id of ids) {
    if (!groups.some((group) => group.has(id))) throw badRequest('REFERENCE_NOT_FOUND', message)
  }
}

// Junta los valores que llegan (solo los que cambian, por id de campo) con los que ya tenía la ficha, revisando
// cada uno contra el tipo de su campo en la plantilla:
//   - texto y secciones: texto (los campos cortos hasta 300 caracteres) o vacío;
//   - número: un número; fecha: 'AAAA-MM-DD'; selección: el id de una de sus opciones;
//   - era: el id de una era del mundo; vínculo: ids de personajes o notas del mundo (no la propia ficha).
// Un campo que no está en la plantilla se rechaza: así no se acumula basura en el jsonb.
export function mergeValues(
  current: Record<string, unknown>,
  patch: Record<string, FieldValue>,
  fields: TemplateFieldInput[],
  refs: WorldRefs,
  selfId: string | null,
): Record<string, unknown> {
  const byId = new Map(fields.map((field) => [field.id, field]))
  const next: Record<string, unknown> = { ...current }

  for (const [fieldId, value] of Object.entries(patch)) {
    const field = byId.get(fieldId)
    if (!field) throw badRequest('FIELD_NOT_FOUND', 'Ese campo ya no está en la plantilla.')
    if (value === null || value === '') {
      next[fieldId] = null
      continue
    }
    const fieldName = field.name || 'Este campo'
    const type = field.kind === 'section' ? 'section' : field.type
    switch (type) {
      case 'section':
        if (typeof value !== 'string') throw badRequest('FIELD_INVALID', `${fieldName} lleva texto.`)
        break
      case 'text':
        if (typeof value !== 'string') throw badRequest('FIELD_INVALID', `${fieldName} lleva texto.`)
        if (value.length > 300) throw badRequest('FIELD_INVALID', `${fieldName}: máximo 300 caracteres.`)
        break
      case 'number':
        if (typeof value !== 'number') throw badRequest('FIELD_INVALID', `${fieldName} lleva un número.`)
        break
      case 'date':
        if (typeof value !== 'string' || !ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) throw badRequest('FIELD_INVALID', `${fieldName} lleva una fecha.`)
        break
      case 'select':
        if (typeof value !== 'string' || !field.options.some((option) => option.id === value)) throw badRequest('FIELD_INVALID', `Elige una opción de ${fieldName}.`)
        break
      case 'era':
        if (typeof value !== 'string' || !refs.eras.has(value)) throw badRequest('FIELD_INVALID', `Elige una era de este mundo en ${fieldName}.`)
        break
      case 'link':
        if (!Array.isArray(value)) throw badRequest('FIELD_INVALID', `${fieldName} lleva vínculos.`)
        if (selfId && value.includes(selfId)) throw badRequest('FIELD_INVALID', 'Una ficha no se puede vincular consigo misma.')
        assertIdsIn(value, [refs.characters, refs.notes])
        break
    }
    next[fieldId] = value
  }
  return next
}

// Lo que la API nunca le manda al front de una fila: de quién es y si está en la papelera.
export function publicFields<T extends { userId: string; deletedAt: Date | null }>(row: T): Omit<T, 'userId' | 'deletedAt'> {
  const copy: Partial<T> = { ...row }
  delete copy.userId
  delete copy.deletedAt
  return copy as Omit<T, 'userId' | 'deletedAt'>
}
