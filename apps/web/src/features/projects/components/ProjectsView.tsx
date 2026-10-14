'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { PageHeading } from '@/components/layout/PageHeading'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import { Segmented } from '@/components/ui/Segmented'
import { formatDueLabel, type IsoDate } from '@/lib/dates'
import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'
import { useEntering } from '@/lib/use-entering'

import { PROJECT_KIND_LABEL, type Project, type ProjectKind } from '../types'

import { ProjectCard } from './ProjectCard'
import styles from './ProjectsView.module.css'

type KindFilter = 'all' | ProjectKind

type ProjectsViewProps = {
  projects: Project[]
  today: IsoDate
  weekEnd: IsoDate
}

// "6 activos y 1 en pausa", "2 activos, 1 en pausa y 1 terminado"
function joinSpanish(parts: string[]) {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
}

function summaryText(projects: Project[]) {
  const total = projects.length
  if (total === 0) return 'Todavía no tienes proyectos.'
  const active = projects.filter((project) => project.status === 'active').length
  const paused = projects.filter((project) => project.status === 'paused').length
  const done = projects.filter((project) => project.status === 'done').length
  const archived = projects.filter((project) => project.status === 'archived').length
  const parts = [`${active} ${active === 1 ? 'activo' : 'activos'}`]
  if (paused > 0) parts.push(`${paused} en pausa`)
  if (done > 0) parts.push(`${done} ${done === 1 ? 'terminado' : 'terminados'}`)
  if (archived > 0) parts.push(`${archived} ${archived === 1 ? 'archivado' : 'archivados'}`)
  return `${total} ${total === 1 ? 'proyecto' : 'proyectos'}, ${joinSpanish(parts)}.`
}

// Proyectos (Proyectos.dc.html): la galería de tarjetas con filtro por tipo. Hoy los datos son
// de ejemplo y "Nuevo proyecto" avisa que el formulario llega pronto.
export function ProjectsView({ projects, today, weekEnd }: ProjectsViewProps) {
  const [kind, setKind] = useState<KindFilter>('all')
  // Al entrar, las tarjetas llegan escalonadas; al filtrar, las nuevas aparecen sin ese retraso.
  const entering = useEntering()

  const shown = useMemo(
    () => projects.filter((project) => kind === 'all' || project.kind === kind),
    [projects, kind],
  )

  const countOf = (value: KindFilter) =>
    value === 'all' ? projects.length : projects.filter((project) => project.kind === value).length

  const filters: { value: KindFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'work', label: PROJECT_KIND_LABEL.work },
    { value: 'personal', label: PROJECT_KIND_LABEL.personal },
    { value: 'school', label: PROJECT_KIND_LABEL.school },
  ]

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <PageHeading title="Proyectos" doodle="star" doodleRotate={12} squiggleWidth={240}>
          <motion.p
            className={styles.summary}
            aria-live="polite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.14 }}
          >
            {summaryText(projects)}
          </motion.p>
        </PageHeading>

        <motion.div
          className={styles.controls}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.1 }}
        >
          <Segmented
            label="Filtrar por tipo"
            value={kind}
            onChange={setKind}
            options={filters.map((filter) => ({
              value: filter.value,
              label: (
                <>
                  {filter.label}
                  <span className={styles.count}>{countOf(filter.value)}</span>
                </>
              ),
            }))}
          />
          <ButtonLink href="/proyectos/nuevo">
            <LineIcon d="M12 5v14M5 12h14" size={16} strokeWidth={2} />
            Nuevo proyecto
          </ButtonLink>
        </motion.div>
      </section>

      <div className={styles.gallery}>
        <AnimatePresence mode="popLayout">
          {shown.map((project, index) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.45, ease: EASE_OUT, delay: entering ? 0.2 + index * 0.045 : 0 },
              }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: DURATION.fast } }}
              transition={SPRING.panel}
            >
              <ProjectCard
                project={project}
                nextText={project.nextDueOn ? `Próxima: ${formatDueLabel(project.nextDueOn, today, weekEnd)}` : 'Sin fecha'}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <motion.div
          layout
          initial={{ opacity: 0, y: 14 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.45, ease: EASE_OUT, delay: entering ? 0.2 + shown.length * 0.045 : 0 },
          }}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING.panel}
        >
          <Link href="/proyectos/nuevo" className={styles.newTile}>
            <Doodle kind="spiral" size={56} strokeWidth={2} />
            <span className={styles.newTitle}>Nuevo proyecto</span>
            <span className={styles.newHint}>Elige un nombre, un tipo y una portada</span>
          </Link>
        </motion.div>
      </div>
    </main>
  )
}
