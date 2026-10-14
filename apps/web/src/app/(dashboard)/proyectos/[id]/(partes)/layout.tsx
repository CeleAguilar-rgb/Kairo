import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { PageEnter } from '@/components/layout/PageEnter'
import { ProjectHeader, ProjectTabs } from '@/features/projects'
import { getProject } from '@/features/projects/api'
import { formatDayMonth } from '@/lib/dates'

import styles from './layout.module.css'

type ProjectLayoutProps = {
  children: ReactNode
  params: Promise<{ id: string }>
}

// La cabecera y las pestañas son comunes a Resumen, Sprints y Archivos: viven en el layout, así
// que al cambiar de pestaña solo cambia el contenido de abajo y la cabecera no se vuelve a animar.
export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()

  return (
    <PageEnter>
      <div className={styles.wrap}>
        <ProjectHeader
          id={project.id}
          name={project.name}
          kind={project.kind}
          status={project.status}
          startedText={project.startedOn ? `Desde el ${formatDayMonth(project.startedOn)}` : null}
        />
        <ProjectTabs projectId={project.id} />
        {children}
      </div>
    </PageEnter>
  )
}
