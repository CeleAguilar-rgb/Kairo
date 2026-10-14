'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useState } from 'react'

import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import { useToast } from '@/components/ui/Toast'
import { dateOfMoment, formatRelativeDay, formatTime, type IsoDate } from '@/lib/dates'
import { DURATION, EASE_OUT, listItem, staggerList } from '@/lib/motion'

import type { Reminder } from '../types'

import styles from './RemindersCard.module.css'

type RemindersCardProps = {
  reminders: Reminder[]
  today: IsoDate
  timeZone: string
  hourFormat: '12h' | '24h'
}

// "Recordatorios" de Inicio (Main.dc.html). "Listo" lo quita de la lista con
// un aviso para deshacer; la fila de abajo sube a ocupar su lugar (layout).
export function RemindersCard({ reminders: initial, today, timeZone, hourFormat }: RemindersCardProps) {
  const [reminders, setReminders] = useState(initial)
  const toast = useToast()

  function complete(reminder: Reminder) {
    setReminders((current) => current.filter((r) => r.id !== reminder.id))
    toast.show({
      message: `"${reminder.title}" quedó listo.`,
      icon: 'check',
      onUndo: () => setReminders((current) => [...current, reminder].sort((a, b) => a.remindAt.localeCompare(b.remindAt))),
    })
  }

  function when(reminder: Reminder) {
    const day = dateOfMoment(reminder.remindAt, timeZone)
    if (reminder.precision === 'month') {
      const month = new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone }).format(new Date(reminder.remindAt))
      return month.charAt(0).toUpperCase() + month.slice(1)
    }
    if (reminder.precision === 'day') return formatRelativeDay(day, today)
    return `${formatRelativeDay(day, today)}, ${formatTime(reminder.remindAt, timeZone, hourFormat)}`
  }

  return (
    <Card as="section" tone="accent" className={styles.card} aria-labelledby="home-reminders">
      <motion.span
        className={styles.spiral}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      >
        <Doodle kind="spiral" size={48} stroke="accent-ink" strokeWidth={2} />
      </motion.span>

      <CardHeader
        id="home-reminders"
        title={
          <Link href="/recordatorios" className={styles.titleLink}>
            Recordatorios
          </Link>
        }
        iconTone="surface"
        icon={<LineIcon d={['M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0']} />}
      />

      <motion.ul className={styles.list} variants={staggerList(0.06, 0.1)} initial="hidden" animate="show">
        <AnimatePresence initial={false} mode="popLayout">
          {reminders.map((reminder) => (
            <motion.li
              key={reminder.id}
              layout
              className={styles.row}
              variants={listItem}
              exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: DURATION.base, ease: EASE_OUT } }}
            >
              <LineIcon d={['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2']} />
              <div className={styles.text}>
                <span>{reminder.title}</span>
                <span className={styles.when}>{when(reminder)}</span>
              </div>
              <button type="button" className={styles.done} onClick={() => complete(reminder)} aria-label={`Marcar como listo: ${reminder.title}`}>
                <LineIcon d="M5 12l5 5L20 7" size={16} strokeWidth={2.4} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
        {reminders.length === 0 ? (
          <motion.li key="empty" className={styles.empty} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Nada pendiente por recordar.
          </motion.li>
        ) : null}
      </motion.ul>
    </Card>
  )
}
