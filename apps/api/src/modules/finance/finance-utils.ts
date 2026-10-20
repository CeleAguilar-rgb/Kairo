// Lógica pura mínima que ya existe en apps/web/src/lib/dates.ts y lib/money.ts: se duplica aquí, mínima
// (mismo motivo que daily-utils.ts y reminder-utils.ts: la API no importa código de apps/web). El cálculo de
// totales, presupuesto, avance de ahorros y deudas y los textos de cada pantalla sigue viviendo en el Next.js
// de en medio (decisión #38 aplicada también a Finanzas): la API solo guarda, valida las reglas que no se le
// pueden confiar al front y devuelve hechos crudos.

export type IsoDate = string

export function todayIn(timeZone: string, now = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

// El primer día del mes que sigue: el "próximo pago" de una deuda con pago mensual recién creada (igual
// que firstOfNextMonth en features/finance/finance-utils.ts).
export function firstOfNextMonth(today: IsoDate): IsoDate {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  // `month` va de 1 a 12 y Date.UTC cuenta los meses desde 0: pasarle `month` ya es "el mes siguiente".
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
}

export const monthStartOf = (date: IsoDate): IsoDate => `${date.slice(0, 7)}-01`

// "$1,250" si no hay centavos, "$1,250.50" si sí: el mismo texto que formatMoney del front, para los mensajes
// de error que llevan un monto ("Solo tienes $500 en ese ahorro.").
export function formatMoney(cents: number, currency = 'MXN'): string {
  const hasCents = cents % 100 !== 0
  const text = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(Math.abs(cents) / 100)
  return cents < 0 ? `−${text}` : text
}

// "Usar lo real" (Presupuesto): lo gastado, redondeado hacia arriba a $50.
export const roundUpToFiftyPesos = (cents: number): number => Math.ceil(cents / 5_000) * 5_000
