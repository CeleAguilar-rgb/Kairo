import { formatDayMonth, type IsoDate } from '@/lib/dates'

import type { CharacterField, CharacterRow, CharacterValue, FieldOption } from './types'

// La lógica de la base de datos de personajes que no es de pantalla: cómo se muestra el valor de cada columna y qué
// va en la línea de debajo del nombre. Son funciones puras, así se prueban sin abrir nada.

// La opción que eligió una fila en una columna de selección (null si no hay).
export function optionFor(field: CharacterField, value: CharacterValue | undefined): FieldOption | null {
  if (field.type !== 'select' || typeof value !== 'string') return null
  return field.options.find((option) => option.id === value) ?? null
}

// El valor de una columna como texto: la etiqueta de la opción, la fecha escrita ("8 de octubre de 2026") o el
// texto o número tal cual. Vacío si no tiene valor.
export function displayValue(field: CharacterField, value: CharacterValue | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  if (field.type === 'select') return optionFor(field, value)?.label ?? ''
  if (field.type === 'date' && typeof value === 'string') return `${formatDayMonth(value as IsoDate)} de ${value.slice(0, 4)}`
  return String(value)
}

// Lo que se escribe en el campo del panel: para una selección, el texto de la opción; para una fecha, la fecha ISO.
export function inputValue(field: CharacterField, value: CharacterValue | undefined): string {
  if (value === null || value === undefined) return ''
  if (field.type === 'select') return optionFor(field, value)?.label ?? ''
  return String(value)
}

// La línea de debajo del nombre en una tarjeta del tablero o la galería: el rol y la era, si los tiene.
export function subline(row: CharacterRow, fields: CharacterField[]): string {
  return fields
    .filter((field) => field.type === 'text' && (field.name === 'Rol' || field.name === 'Era'))
    .map((field) => displayValue(field, row.values[field.id]))
    .filter(Boolean)
    .join(' · ')
}
