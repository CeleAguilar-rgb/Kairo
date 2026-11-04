// ¿Es hora de silencio para la persona? `from` y `to` son horas de pared del perfil ("22:00:00"); el rango puede
// cruzar la medianoche (22:00 a 7:00). Sin horas de silencio, nunca.
export function isQuietTime(now: Date, timeZone: string, from: string | null, to: string | null): boolean {
  if (!from || !to || from === to) return false
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  const current = hour * 60 + minute
  const start = toMinutes(from)
  const end = toMinutes(to)
  return start < end ? current >= start && current < end : current >= start || current < end
}

function toMinutes(time: string) {
  const [hours = '0', minutes = '0'] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}
