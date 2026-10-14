'use client'

import { motion, useInView, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'

import { EASE_OUT, SPRING } from '@/lib/motion'

import styles from './Progress.module.css'

type ProgressBarProps = {
  // 0 a 1
  value: number
  label: string
  // 'accent' (metas, lavanda fuerte), 'soft' (objetivos de un proyecto, lavanda) o 'ink' (proyectos, tinta).
  tone?: 'accent' | 'soft' | 'ink' | 'danger'
  // Retraso de la entrada, para escalonar varias barras seguidas.
  delay?: number
}

// Barra que se llena desde la izquierda la primera vez que entra a la pantalla
// y luego sigue al valor con un resorte suave. Anima scaleX, no width: así el
// navegador no recalcula el layout en cada cuadro.
export function ProgressBar({ value, label, tone = 'accent', delay = 0 }: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const clamped = Math.min(1, Math.max(0, value))

  return (
    <div
      ref={ref}
      className={styles.track}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <motion.div
        className={[styles.fill, styles[tone]].join(' ')}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: inView ? clamped : 0 }}
        transition={{ duration: 0.7, ease: EASE_OUT, delay }}
      />
    </div>
  )
}

type ProgressRingProps = {
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
  tone?: 'surface' | 'inverted'
}

// El anillo de "Pendientes de hoy". pathLength (0 a 1) es la forma de Motion de
// animar cuánto de un trazo SVG se dibuja, sin calcular stroke-dashoffset a mano.
export function ProgressRing({ value, size = 56, stroke = 5, children, tone = 'inverted' }: ProgressRingProps) {
  const radius = (size - stroke) / 2 - 1
  const center = size / 2

  return (
    <div className={styles.ring} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={styles.ringSvg}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={tone === 'inverted' ? styles.ringTrackInverted : styles.ringTrack}
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={styles.ringFill}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.min(1, Math.max(0.001, value)) }}
          transition={{ ...SPRING.soft, delay: 0.2 }}
        />
      </svg>
      <span className={styles.ringLabel}>{children}</span>
    </div>
  )
}

type CountUpProps = {
  value: number
  format?: (value: number) => string
}

// Número que sube hasta su valor con un resorte (estadísticas del saludo, montos).
// Lo que cambia es el texto de un motion value: React no vuelve a renderizar en
// cada cuadro, Motion escribe directo en el DOM.
export function CountUp({ value, format = (n) => String(Math.round(n)) }: CountUpProps) {
  const spring = useSpring(0, { stiffness: 90, damping: 20 })
  const text = useTransform(spring, (current) => format(current))

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return <motion.span>{text}</motion.span>
}
