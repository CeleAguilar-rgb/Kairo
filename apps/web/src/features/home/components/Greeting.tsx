'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { PlacedDoodles } from '@/components/layout/Doodles'
import { LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import { CountUp } from '@/components/ui/Progress'
import { formatMoney } from '@/lib/money'
import { EASE_OUT, fadeUp, SPRING, staggerList } from '@/lib/motion'

import styles from './Greeting.module.css'

type GreetingProps = {
  hello: string
  subtitle: string
  pendingCount: number
  activeProjects: number | null
  dueThisWeekCents: number | null
  currency: string
}

// Saludo de Inicio (Main.dc.html): a la izquierda el saludo escrito a mano, a la
// derecha las estadísticas, alineadas abajo. La bandeja de doodles está en el
// header (components/layout/Doodles.tsx); aquí solo se dibujan los pegados.
export function Greeting({ hello, subtitle, pendingCount, activeProjects, dueThisWeekCents, currency }: GreetingProps) {
  return (
    <section className={styles.hero} aria-labelledby="home-hello">
      <div className={styles.helloBlock}>
        <div className={styles.helloRow}>
          <h1 id="home-hello" className={styles.hello}>
            {hello}
          </h1>
          <motion.span
            className={styles.sun}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 8 }}
            transition={{ ...SPRING.pop, delay: 0.9 }}
          >
            <span className={styles.sunSpin}><Doodle kind="sun" size={62} strokeWidth={2} /></span>
          </motion.span>
        </div>
        <svg className={styles.squiggle} width="300" height="16" viewBox="0 0 300 16" fill="none" aria-hidden="true">
          <motion.path
            d="M3 10c22-8 40 6 64-1s40-8 62 0 44 7 66-1 46-6 72 3 30-3 30-3"
            stroke="var(--accent)"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.9, ease: 'easeOut' }}
          />
        </svg>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease: EASE_OUT }}
        >
          {subtitle}
        </motion.p>

        <PlacedDoodles />
      </div>

      <motion.div className={styles.stats} variants={staggerList(0.08, 0.5)} initial="hidden" animate="show">
        <Stat tone="inverted" icon="M5 12l5 5L20 7" label="pendientes hoy">
          <CountUp value={pendingCount} />
        </Stat>
        {activeProjects !== null ? (
          <Stat tone="accent" icon="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" label="proyectos activos">
            <CountUp value={activeProjects} />
          </Stat>
        ) : null}
        {dueThisWeekCents !== null ? (
          <Stat tone="warm" icon={['M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', 'M3 10h18M7 15h3']} label="por pagar esta semana">
            {/* El resorte cuenta en pesos enteros; formatMoney recibe centavos */}
            <CountUp value={dueThisWeekCents / 100} format={(n) => formatMoney(Math.round(n) * 100, currency)} />
          </Stat>
        ) : null}
      </motion.div>
    </section>
  )
}

type StatProps = {
  tone: 'inverted' | 'accent' | 'warm'
  icon: string | string[]
  label: string
  children: ReactNode
}

function Stat({ tone, icon, label, children }: StatProps) {
  return (
    <motion.div className={styles.stat} variants={fadeUp} whileHover={{ y: -2 }}>
      <span className={[styles.statIcon, styles[`statIcon_${tone}`]].join(' ')} aria-hidden="true">
        <LineIcon d={icon} strokeWidth={2} />
      </span>
      <div className={styles.statText}>
        <span className={styles.statValue}>{children}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </motion.div>
  )
}
