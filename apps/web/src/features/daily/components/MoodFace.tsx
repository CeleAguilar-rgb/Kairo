import { MOOD_META } from '../routine-meta'
import type { MoodLevel } from '../types'

type MoodFaceProps = {
  level: MoodLevel
  size?: number
  strokeWidth?: number
}

// Las caritas del ánimo (Diario.dc.html): un círculo del color de su nivel (--mood-1 … --mood-5), dos ojos y
// una boca que va de triste a contenta.
export function MoodFace({ level, size = 40, strokeWidth = 2 }: MoodFaceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="var(--text)" strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden="true">
      <circle cx="20" cy="20" r="16" style={{ fill: `var(--mood-${level + 1})` }} />
      <circle cx="14.5" cy="17" r="1.6" fill="var(--text)" stroke="none" />
      <circle cx="25.5" cy="17" r="1.6" fill="var(--text)" stroke="none" />
      <path d={MOOD_META[level].mouth} />
    </svg>
  )
}
