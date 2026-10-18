import { notFound, redirect } from 'next/navigation'

import { ProjectFiles } from '@/features/projects'
import { getProject, getProjectFiles } from '@/features/projects/api'
import { getMe } from '@/lib/account/api'
import { todayIn } from '@/lib/dates'

type ProjectFilesPageProps = { params: Promise<{ id: string }> }

// Pestaña Archivos. Los enlaces son los mismos del proyecto (project_links); los archivos
// vienen de su propia lista (attachments).
export default async function ProjectFilesPage({ params }: ProjectFilesPageProps) {
  const { id } = await params
  const [me, project, data] = await Promise.all([getMe(), getProject(id), getProjectFiles(id)])
  if (!me) redirect('/bienvenida')
  if (!project) notFound()

  return <ProjectFiles data={data} links={project.links} today={todayIn(me.profile.timezone)} />
}
