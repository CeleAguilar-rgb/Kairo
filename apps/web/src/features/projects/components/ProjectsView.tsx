'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { PageHeading } from '@/components/layout/PageHeading'
import { AddButton } from '@/components/ui/AddButton'
import { Doodle } from '@/components/ui/Doodle'
import { IconTabs } from '@/components/ui/IconTabs'
import responsive from '@/components/ui/responsive.module.css'
import { Segmented } from '@/components/ui/Segmented'
import { formatDueLabel, type IsoDate } from '@/lib/dates'
import { DURATION, EASE_OUT, PRESS, SPRING } from '@/lib/motion'
import { useEntering } from '@/lib/use-entering'

import { PROJECT_KIND_LABEL, type Project, type ProjectKind } from '../types'

import { ProjectCard } from './ProjectCard'
import styles from './ProjectsView.module.css'

type KindFilter = 'all' | ProjectKind

// Un icono por tipo para el teléfono: ahí las cuatro opciones no caben con nombre, y en vez de esconder "Escuela"
// a la derecha las que no están elegidas se quedan con su icono (ver IconTabs.tsx).
const KIND_ICON: Record<KindFilter, string | string[]> = {
  all: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  work: ['M3 8h18v12H3z', 'M9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3', 'M3 13h18'],
  personal: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4 21c0-4 3.6-7 8-7s8 3 8 7'],
  school: ['M12 4L2 9l10 5 10-5z', 'M6 11.5V16c0 1 2.7 3 6 3s6-2 6-3v-4.5'],
}

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
          {/* Escritorio: los cuatro tipos en una píldora. Teléfono: la misma barra de iconos de Finanzas, con la cuenta
              en la elegida, así se ven las cuatro secciones sin deslizar. */}
          <div className={responsive.hideOnPhone}>
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
          </div>
          <IconTabs
            phoneOnly
            id="projects-kind"
            label="Filtrar por tipo"
            items={filters.map((filter) => ({ key: filter.value, label: filter.label, icon: KIND_ICON[filter.value], count: countOf(filter.value) }))}
            activeKey={kind}
            onSelect={(key) => setKind(key as KindFilter)}
          />
          <AddButton href="/proyectos/nuevo" label="Nuevo proyecto" className={styles.newButton} />
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
                nextText={
                  !project.nextDueOn
                    ? 'Sin fecha'
                    : `${project.nextDueOn < today ? 'Vencida' : 'Próxima'}: ${formatDueLabel(project.nextDueOn, today, weekEnd)}`
                }
                overdue={project.nextDueOn !== null && project.nextDueOn < today}
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
          whileTap={PRESS.card}
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
