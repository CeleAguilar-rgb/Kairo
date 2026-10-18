'use client'

import { motion } from 'motion/react'
import Link from 'next/link'

import { Card, CardHeader, CardLink, LineIcon } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/Progress'
import { fadeUp, SPRING, staggerList } from '@/lib/motion'

import type { Project } from '../types'

import styles from './ProjectsCard.module.css'

const MAX_ROWS = 4

// "Proyectos" de Inicio (Main.dc.html): los activos con su avance. El
// cuadrito con la inicial alterna lavanda y cálido como en el canvas.
export function ProjectsCard({ projects }: { projects: Project[] }) {
  const rows = projects.slice(0, MAX_ROWS)

  return (
    <Card as="section" className={styles.card} aria-labelledby="home-projects">
      <CardHeader
        id="home-projects"
        title="Proyectos"
        iconTone="accent"
        icon={
          <LineIcon
            d={[
              'M4.5 4h2a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 6.5 20h-2A1.5 1.5 0 0 1 3 18.5v-13A1.5 1.5 0 0 1 4.5 4z',
              'M11.5 4h2A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 10 12.5v-7A1.5 1.5 0 0 1 11.5 4z',
              'M18.5 4h1A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 18.5 4z',
            ]}
          />
        }
        action={<CardLink href="/proyectos">Ver proyectos</CardLink>}
      />
      {rows.length === 0 ? (
        <p className={styles.empty}>Sin proyectos activos. Crea uno en Proyectos.</p>
      ) : (
        <motion.ul className={styles.list} variants={staggerList(0.07, 0.1)} initial="hidden" animate="show">
          {rows.map((project, index) => (
            <motion.li key={project.id} variants={fadeUp}>
              <Link href={`/proyectos/${project.id}`} className={styles.row}>
                <motion.span
                  className={[styles.initial, index % 2 === 0 ? styles.initialAccent : styles.initialWarm].join(' ')}
                  whileHover={{ rotate: -8, scale: 1.08 }}
                  transition={SPRING.pop}
                >
                  {project.name.charAt(0).toUpperCase()}
                </motion.span>
                <div className={styles.text}>
                  <div className={styles.head}>
                    <span className={styles.name}>{project.name}</span>
                    <span className={styles.pct}>{Math.round(project.progress * 100)}%</span>
                  </div>
                  <ProgressBar value={project.progress} tone="ink" label={`Avance de ${project.name}`} delay={0.15 + index * 0.07} />
                </div>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </Card>
  )
}
