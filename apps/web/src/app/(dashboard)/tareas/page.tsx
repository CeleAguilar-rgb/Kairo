import { getTasks } from '@/features/tasks/api'
import { TareasView } from '@/features/tasks/components/TareasView'

export default async function TareasPage() {
  const tasks = await getTasks()
  return <TareasView tasks={tasks} />
}
