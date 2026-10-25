import type { FieldValue } from '@kairo/shared'

import { formatDayMonth, type IsoDate } from '@/lib/dates'

import type { CharacterRow, FieldOption, TemplateField } from './types'

// La lógica de la base de datos de personajes que no es de pantalla: cómo se muestra el valor de cada columna (un
// campo "de vista corta" de la plantilla Personaje) y qué va debajo del nombre. Son funciones puras.

// La opción que eligió una fila en una columna de selección (null si no hay).
export function optionFor(field: TemplateField, value: FieldValue | undefined): FieldOption | null {
  if (field.type !== 'select' || typeof value !== 'string') return null
  return field.options.find((option) => option.id === value) ?? null
}

// El valor de una columna como texto: la etiqueta de la opción, los nombres de lo vinculado, la era, la fecha
// escrita ("8 de octubre de 2026") o el texto o número tal cual. Vacío si no tiene valor. `names` dice cómo se llama
// cada id (personajes, notas y eras del mundo).
export function displayValue(field: TemplateField, value: FieldValue | undefined, names: Record<string, string>): string {
  if (value === null || value === undefined || value === '') return ''
  if (field.type === 'select') return optionFor(field, value)?.label ?? ''
  if (field.type === 'link') return Array.isArray(value) ? value.flatMap((id) => (names[id] ? [names[id]] : [])).join(', ') : ''
  if (field.type === 'era') return typeof value === 'string' ? (names[value] ?? '') : ''
  if (field.type === 'date' && typeof value === 'string') return `${formatDayMonth(value as IsoDate)} de ${value.slice(0, 4)}`
  return String(value)
}

// La línea de debajo del nombre en una tarjeta del tablero o la galería: el rol (el campo `role` de la plantilla).
export function subline(row: CharacterRow, fields: TemplateField[]): string {
  const role = fields.find((field) => field.key === 'role')
  const value = role ? row.values[role.id] : null
  return typeof value === 'string' ? value : ''
}
