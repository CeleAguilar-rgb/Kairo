import type { ModuleId } from '@kairo/shared'

// Las tarjetas que puede tener Inicio (tabla home_cards, "Ajustar mi Inicio").
// Cada una pertenece a un módulo: si la persona apaga ese módulo en su perfil,
// la tarjeta ni siquiera se ofrece ("Solo salen tarjetas de las secciones que
// tienes prendidas", Main.dc.html).
export type HomeCardId = 'tasks' | 'agenda' | 'routine' | 'goals' | 'menu' | 'payments' | 'projects' | 'reminders'

export type HomeCardMeta = {
  id: HomeCardId
  name: string
  module: ModuleId
  // Columnas de la cuadrícula de 12 (tamaños del canvas: 5 + 7, luego de 4 en 4).
  span: 4 | 5 | 7
}

export const HOME_CARDS: HomeCardMeta[] = [
  { id: 'tasks', name: 'Pendientes de hoy', module: 'tasks', span: 5 },
  { id: 'agenda', name: 'Esta semana', module: 'agenda', span: 7 },
  { id: 'routine', name: 'Ahora en tu rutina', module: 'daily', span: 4 },
  { id: 'goals', name: 'Metas', module: 'daily', span: 4 },
  { id: 'menu', name: 'Menú de hoy', module: 'daily', span: 4 },
  { id: 'payments', name: 'Próximos pagos', module: 'finance', span: 4 },
  { id: 'projects', name: 'Proyectos', module: 'projects', span: 4 },
  { id: 'reminders', name: 'Recordatorios', module: 'reminders', span: 4 },
]
