import type { ProjectInput } from '@kairo/shared'
import { notFound } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { ProjectForm } from '@/features/projects'
import { getProject } from '@/features/projects/api'
import { coverKeyOf } from '@/features/projects/types'

type EditProjectPageProps = { params: Promise<{ id: string }> }

// "Editar proyecto": el mismo formulario, con los datos del proyecto. Vive fuera del grupo
// (partes) a propósito: no lleva la cabecera ni las pestañas del proyecto.
export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()

  const initial: ProjectInput = {
    name: project.name,
    kind: project.kind,
    status: project.status,
    description: project.description ?? '',
    startedOn: project.startedOn,
    goalOn: project.goalOn,
    objectives: project.objectives.map((objective) => objective.text),
    links: project.links.map((link) => ({ title: link.title, url: link.url })),
    cover: coverKeyOf(project.coverPath),
  }

  return (
    <PageEnter>
      <ProjectForm
        mode="edit"
        projectId={project.id}
        initial={initial}
        taskCounts={{ done: project.doneCount, total: project.taskCount }}
      />
    </PageEnter>
  )
}
