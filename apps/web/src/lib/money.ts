// El dinero viaja y se guarda en centavos enteros (regla 7 de CLAUDE.md). Solo
// aquí, al mostrarlo, se divide entre 100: nunca se hacen cuentas con decimales.

const formatters = new Map<string, Intl.NumberFormat>()

// "$1,250" si no hay centavos, "$1,250.50" si sí. Con signo opcional para movimientos ("+$500", "−$129").
export function formatMoney(cents: number, currency = 'MXN', options: { sign?: boolean } = {}): string {
  const hasCents = cents % 100 !== 0
  const key = `${currency}:${hasCents}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0,
    })
    formatters.set(key, formatter)
  }
  const text = formatter.format(Math.abs(cents) / 100)
  if (!options.sign) return cents < 0 ? `−${text}` : text
  return cents < 0 ? `−${text}` : `+${text}`
}
