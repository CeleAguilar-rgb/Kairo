// Color del puntito de cada proyecto (filtros y chips de Tareas). El modelo
// no tiene columna de color para proyectos, así que sale estable del id: el
// mismo proyecto siempre tiene el mismo color, en cualquier pantalla. Solo
// variables semánticas (regla 5), en el orden de los colores del canvas.
const TONES = [
  'var(--accent)',
  'var(--surface-inverted)',
  'var(--accent-ink)',
  'var(--accent-warm)',
  'var(--text-subtle)',
  'var(--accent-strong)',
  'var(--border-control)',
]

export function projectTone(projectId: string): string {
  let hash = 0
  for (let i = 0; i < projectId.length; i++) hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0
  return TONES[hash % TONES.length]
}
