import Link from 'next/link'

import { ProgressBar } from '@/components/ui/Progress'

import { coverKeyOf, PROJECT_KIND_LABEL, PROJECT_STATUS_LABEL, type Project } from '../types'

import { ProjectCover } from './ProjectCover'
import styles from './ProjectCard.module.css'

type ProjectCardProps = {
  project: Project
  // "Próxima: Hoy", "Próxima: Vie 16" o "Sin fecha" (la arma quien conoce la fecha de hoy).
  nextText: string
}

// La tarjeta de la galería de Proyectos (Proyectos.dc.html): portada ilustrada con el tipo y,
// si está en pausa, su etiqueta; nombre, descripción, avance y la próxima fecha.
export function ProjectCard({ project, nextText }: ProjectCardProps) {
  const coverKey = coverKeyOf(project.coverPath)

  return (
    <Link href={`/proyectos/${project.id}`} className={styles.card} aria-label={`Abrir ${project.name}`}>
      <div className={styles.cover}>
        {coverKey ? (
          <ProjectCover coverKey={coverKey} className={styles.art} />
        ) : project.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada de corta duración, no un asset que next/image deba optimizar
          <img src={project.coverUrl} alt="" className={styles.art} />
        ) : null}
        <span className={[styles.kind, styles[`kind_${project.kind}`]].join(' ')}>{PROJECT_KIND_LABEL[project.kind]}</span>
        {project.status !== 'active' ? (
          <span className={styles.status}>
            {project.status === 'paused' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : project.status === 'archived' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 7h18v4H3zM5 11v9h14v-9M10 15h4" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
            )}
            {PROJECT_STATUS_LABEL[project.status]}
          </span>
        ) : null}
      </div>
      <div className={styles.body}>
        <h2 className={styles.name}>{project.name}</h2>
        {project.description ? <p className={styles.description}>{project.description}</p> : null}
        <div className={styles.footer}>
          <ProgressBar value={project.progress} label={`Avance de ${project.name}`} tone="ink" />
          <div className={styles.meta}>
            <span>
              {project.doneCount} de {project.taskCount} tareas
            </span>
            <span className={styles.next}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              {nextText}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
