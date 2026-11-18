import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { PageEnter } from '@/components/layout/PageEnter'
import { SectionPanel } from '@/components/layout/SectionPanel'
import { ProjectHeader, ProjectTabs } from '@/features/projects'
import { getProject } from '@/features/projects/api'
import { formatDayMonth } from '@/lib/dates'

import styles from './layout.module.css'

type ProjectLayoutProps = {
  children: ReactNode
  params: Promise<{ id: string }>
}

// La cabecera y las pestañas son comunes a Resumen, Sprints y Archivos: viven en el layout, así
// que al cambiar de pestaña solo cambia el contenido de abajo y la cabecera no se vuelve a animar. Ese
// contenido va en un SectionPanel: al elegir una pestaña lo atenúa si tarda y lo cambia con un fundido
// corto, para que se sienta la misma pantalla (igual que en Día a día).
// La pestaña dice el nombre del proyecto ("EXANI-III | Preparación Maestría UANL · Kairo"). getProject se
// llama dos veces (aquí y en el layout), pero es la misma petición GET en el mismo render y Next la
// reutiliza en vez de volver a pedirla a la API.
export async function generateMetadata({ params }: Pick<ProjectLayoutProps, 'params'>): Promise<Metadata> {
  const { id } = await params
  const project = await getProject(id)
  return { title: project?.name ?? 'Proyectos' }
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()

  return (
    <PageEnter>
      {/* <main>: el contenido principal de la página, para quien navega por regiones con lector de pantalla
          (las demás pantallas ya lo tenían; aquí faltaba). */}
      <main className={styles.wrap}>
        {/* De regreso a la galería: el mismo "‹" con su destino que usa el canvas del teléfono ("Volver a Más"). */}
        <Link href="/proyectos" className={styles.back}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Proyectos
        </Link>
        <ProjectHeader
          id={project.id}
          name={project.name}
          kind={project.kind}
          status={project.status}
          startedText={project.startedOn ? `Desde el ${formatDayMonth(project.startedOn)}` : null}
          taskTitles={project.tasks.map((task) => task.title)}
        />
        <ProjectTabs projectId={project.id} />
        <SectionPanel className={styles.panel}>{children}</SectionPanel>
      </main>
    </PageEnter>
  )
}
