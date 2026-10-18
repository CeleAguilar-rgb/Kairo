import { getTasks } from '@/features/tasks/api'
import { HomePendingCardView } from './HomePendingCardView'

const MAX_ROWS = 5

// Tarjeta que Tareas aporta a Inicio (module.ts → homeCards). Se consigue
// sus propios datos: Inicio no sabe nada de tareas, solo pinta esta
// tarjeta donde le toque en la rejilla.
export async function HomePendingCard() {
  const tasks = await getTasks()
  const pending = tasks.filter((task) => task.status !== 'done')
  const done = tasks.length - pending.length

  return (
    <HomePendingCardView
      tasks={pending.slice(0, MAX_ROWS)}
      pendingCount={pending.length}
      doneCount={done}
      totalCount={tasks.length}
    />
  )
}
