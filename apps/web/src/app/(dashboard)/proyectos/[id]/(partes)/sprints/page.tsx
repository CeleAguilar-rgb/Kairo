import { notFound, redirect } from 'next/navigation'

import { ProjectSprints } from '@/features/projects'
import { getProject, getProjectSprints } from '@/features/projects/api'
import { getMe } from '@/lib/account/api'
import { addDays, startOfWeek, todayIn } from '@/lib/dates'

type ProjectSprintsPageProps = { params: Promise<{ id: string }> }

// Pestaña Sprints. getProject está cacheado por petición (el layout ya lo pidió).
export default async function ProjectSprintsPage({ params }: ProjectSprintsPageProps) {
  const { id } = await params
  const [me, project, sprints] = await Promise.all([getMe(), getProject(id), getProjectSprints(id)])
  if (!me) redirect('/bienvenida')
  if (!project) notFound()

  const today = todayIn(me.profile.timezone)
  const weekEnd = addDays(startOfWeek(today, me.profile.weekStart), 6)

  return <ProjectSprints projectId={project.id} sprints={sprints} today={today} weekEnd={weekEnd} />
}
