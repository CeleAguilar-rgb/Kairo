'use client'

import { motion } from 'motion/react'

import { Card, CardHeader, CardLink, LineIcon } from '@/components/ui/Card'
import { dayOfMonth, diffDays, formatMonthShort, type IsoDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { fadeUp, staggerList } from '@/lib/motion'

import { cardLabel } from '../finance-utils'
import type { Membership } from '../types'

import styles from './PaymentsCard.module.css'

// Un cobro dentro de estos días se marca oscuro ("ya viene").
const SOON_DAYS = 3
const MAX_ROWS = 4

// "Próximos pagos" de Inicio (Main.dc.html): membresías por fecha de cobro.
export function PaymentsCard({ payments, today }: { payments: Membership[]; today: IsoDate }) {
  const rows = payments.slice(0, MAX_ROWS)

  return (
    <Card as="section" className={styles.card} aria-labelledby="home-payments">
      <CardHeader
        id="home-payments"
        title="Próximos pagos"
        iconTone="warm"
        icon={<LineIcon d={['M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', 'M3 10h18M7 15h3']} />}
        action={<CardLink href="/finanzas/membresias">Ver membresías</CardLink>}
      />
      {rows.length === 0 ? (
        <p className={styles.empty}>Sin cobros próximos. Agrega tus membresías en Finanzas.</p>
      ) : (
        <motion.ul className={styles.list} variants={staggerList(0.06, 0.1)} initial="hidden" animate="show">
          {rows.map((payment) => {
            const soon = diffDays(today, payment.nextChargeOn) <= SOON_DAYS
            return (
              <motion.li key={payment.id} className={styles.row} variants={fadeUp} whileHover={{ x: 3 }}>
                <span className={[styles.date, soon ? styles.dateSoon : null].filter(Boolean).join(' ')}>
                  <span className={styles.dateDay}>{dayOfMonth(payment.nextChargeOn)}</span>
                  <span className={styles.dateMonth}>{formatMonthShort(payment.nextChargeOn)}</span>
                </span>
                <div className={styles.text}>
                  <span className={styles.name}>{payment.name}</span>
                  {payment.card ? (
                    <span className={styles.cardInfo}>
                      <LineIcon d={['M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', 'M3 10h18']} size={14} strokeWidth={2} />
                      {cardLabel(payment.card)}
                    </span>
                  ) : null}
                </div>
                <span className={styles.amount}>{formatMoney(payment.amountCents, payment.currency)}</span>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </Card>
  )
}
