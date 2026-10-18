import { notFound, redirect } from 'next/navigation'

import { ProjectSummary } from '@/features/projects'
import { getProject } from '@/features/projects/api'
import { getMe } from '@/lib/account/api'
import { addDays, startOfWeek, todayIn } from '@/lib/dates'

type ProjectPageProps = { params: Promise<{ id: string }> }

// Resumen del proyecto. getProject está cacheado por petición: el layout y esta página lo
// piden y la API se llama una sola vez.
export default async function ProjectSummaryPage({ params }: ProjectPageProps) {
  const { id } = await params
  const [me, project] = await Promise.all([getMe(), getProject(id)])
  if (!me) redirect('/bienvenida')
  if (!project) notFound()

  const today = todayIn(me.profile.timezone)
  const weekEnd = addDays(startOfWeek(today, me.profile.weekStart), 6)

  return <ProjectSummary project={project} today={today} weekEnd={weekEnd} />
}
