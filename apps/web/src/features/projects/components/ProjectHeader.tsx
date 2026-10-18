'use client'

import { motion } from 'motion/react'
import Link from 'next/link'

import { PageHeading } from '@/components/layout/PageHeading'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { LineIcon } from '@/components/ui/Card'
import { EASE_OUT } from '@/lib/motion'

import { PROJECT_KIND_LABEL, PROJECT_STATUS_LABEL, type ProjectKind, type ProjectStatus } from '../types'

import styles from './ProjectHeader.module.css'

type ProjectHeaderProps = {
  id: string
  name: string
  kind: ProjectKind
  status: ProjectStatus
  // "Desde el 7 de octubre" (null si el proyecto no tiene fecha de inicio).
  startedText: string | null
}

// La cabecera del proyecto (Proyecto.dc.html): nombre a mano, sus tres etiquetas (tipo, estado
// y desde cuándo) y las dos acciones. Vive en el layout del proyecto, así que no se vuelve a
// animar al cambiar de pestaña (Resumen, Sprints, Archivos).
export function ProjectHeader({ id, name, kind, status, startedText }: ProjectHeaderProps) {
  return (
    <section className={styles.header}>
      <PageHeading title={name} squiggleWidth={280}>
        <motion.div
          className={styles.chips}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.14 }}
        >
          <span className={[styles.chip, styles.kind].join(' ')}>{PROJECT_KIND_LABEL[kind]}</span>
          <span className={[styles.chip, styles[`status_${status}`]].join(' ')}>
            <span className={styles.dot} />
            {PROJECT_STATUS_LABEL[status]}
          </span>
          {startedText ? <span className={[styles.chip, styles.since].join(' ')}>{startedText}</span> : null}
        </motion.div>
      </PageHeading>

      <motion.div
        className={styles.actions}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.1 }}
      >
        <Link href={`/tareas?proyecto=${id}`} className={styles.boardLink}>
          <LineIcon
            d={[
              'M4.5 4h2A1.5 1.5 0 0 1 8 5.5v13A1.5 1.5 0 0 1 6.5 20h-2A1.5 1.5 0 0 1 3 18.5v-13A1.5 1.5 0 0 1 4.5 4z',
              'M11.5 4h2A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 10 12.5v-7A1.5 1.5 0 0 1 11.5 4z',
              'M18.5 4h1A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 18.5 4z',
            ]}
            size={16}
            strokeWidth={2}
          />
          Ver en el tablero
        </Link>
        <ButtonLink href={`/proyectos/${id}/editar`}>
          <LineIcon d={['M14 4l6 6L9 21H3v-6L14 4z', 'M12 6l6 6']} size={16} />
          Editar proyecto
        </ButtonLink>
      </motion.div>
    </section>
  )
}
