'use client'

import { motion } from 'motion/react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

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
  const statsRef = useRef<HTMLDivElement>(null)
  // En teléfono las tarjetas van en una fila de columnas iguales; si el número más largo no cabe en una
  // columna (por ejemplo "$12,450"), pasan a ser una tarjeta horizontal por renglón, de todo el ancho, en vez
  // de encoger la cifra. Solo tiene efecto en teléfono: el CSS ignora la clase arriba de 720px.
  const [stacked, setStacked] = useState(false)
  const moneyText = dueThisWeekCents !== null ? formatMoney(Math.round(dueThisWeekCents / 100) * 100, currency) : null

  useLayoutEffect(() => {
    const stats = statsRef.current
    if (!stats) return
    const texts = [String(pendingCount), activeProjects !== null ? String(activeProjects) : null, moneyText].filter((text): text is string => text !== null)

    function measure() {
      if (!stats) return
      const values = Array.from(stats.querySelectorAll<HTMLElement>('[data-stat-value]'))
      const cards = Array.from(stats.querySelectorAll<HTMLElement>('[data-stat]'))
      const context = document.createElement('canvas').getContext('2d')
      if (!context || values.length === 0 || cards.length === 0) return
      // Se mide el texto FINAL (el número va subiendo animado, su ancho cambia mientras tanto) con la misma
      // tipografía del número, no el contenido que haya en ese instante.
      context.font = getComputedStyle(values[0]).font
      const widest = Math.max(...texts.map((text) => context.measureText(text).width))
      const cardStyle = getComputedStyle(cards[0])
      // El relleno de la tarjeta EN COLUMNA (el de arriba, igual en las dos disposiciones): el de los lados cambia
      // al apilar y haría que el resultado oscilara entre las dos.
      const padding = parseFloat(cardStyle.paddingTop) * 2
      const gap = parseFloat(getComputedStyle(stats).columnGap) || 0
      const column = (stats.clientWidth - gap * (cards.length - 1)) / cards.length
      setStacked(widest + padding > column)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stats)
    return () => observer.disconnect()
  }, [pendingCount, activeProjects, moneyText])

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
            transition={{ ...SPRING.celebrate, delay: 0.9 }}
          >
            <span className={styles.sunSpin}><Doodle kind="sun" size={62} strokeWidth={2} /></span>
          </motion.span>
        </div>
        <svg className={styles.squiggle} width="300" height="16" viewBox="0 0 300 16" fill="none" aria-hidden="true">
          <motion.path
            d="M3 10c22-8 40 6 64-1s40-8 62 0 44 7 66-1 46-6 72 3 30-3 30-3"
            stroke="var(--accent-line)"
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

      <motion.div ref={statsRef} className={[styles.stats, stacked ? styles.statsStacked : null].filter(Boolean).join(' ')} variants={staggerList(0.08, 0.5)} initial="hidden" animate="show">
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
    <motion.div className={styles.stat} data-stat="" variants={fadeUp} whileHover={{ y: -2 }}>
      <span className={[styles.statIcon, styles[`statIcon_${tone}`]].join(' ')} aria-hidden="true">
        <LineIcon d={icon} strokeWidth={2} />
      </span>
      <div className={styles.statText}>
        <span className={styles.statValue} data-stat-value="">{children}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </motion.div>
  )
}
