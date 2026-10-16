'use client'

import { journalEntrySchema, JOURNAL_TAGS, MOOD_LEVELS, type JournalTag } from '@kairo/shared'
import { AnimatePresence, motion } from 'motion/react'
import { useOptimistic, useState, useTransition } from 'react'

import { Button } from '@/components/ui/Button'
import { Card, LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { formatDayMonth, formatLongDay, formatMonthYear, formatTime, type IsoDate } from '@/lib/dates'
import { fieldErrors } from '@/lib/form-errors'
import { EASE_OUT, fadeUp, listItem, staggerList } from '@/lib/motion'

import { deleteJournalAction, saveJournalAction } from '../journal-actions'
import { averageMood, calendarWeekdays, monthCalendar } from '../journal-utils'
import { MOOD_META } from '../routine-meta'
import { undoRoutineAction } from '../routine-actions'
import type { JournalEntry, MoodLevel } from '../types'

import styles from './JournalView.module.css'
import { MoodFace } from './MoodFace'

const TAG_LABEL: Record<JournalTag, string> = {
  work: 'trabajo',
  school: 'escuela',
  projects: 'proyectos',
  friends: 'amigos',
  family: 'familia',
  health: 'salud',
  writing: 'escritura',
}

type JournalViewProps = {
  entries: JournalEntry[]
  today: IsoDate
  // "Tu día en resumen": lo que se cumplió hoy, armado por el servidor.
  daySummary: string[]
  timeZone: string
  hourFormat: '12h' | '24h'
  weekStart: 'monday' | 'sunday'
}

const GRATITUDE_SLOTS = 3

// Diario (Diario.dc.html): la entrada de hoy (ánimo, texto, gratitud y etiquetas), el mapa de ánimo del mes y
// los días anteriores. El PIN y el cifrado de la entrada llegan con la API (docs/guides/security.md).
export function JournalView({ entries, today, daySummary, timeZone, hourFormat, weekStart }: JournalViewProps) {
  const toast = useToast()
  const [, startTransition] = useTransition()
  const [saving, startSaving] = useTransition()

  const todayEntry = entries.find((entry) => entry.entryDate === today) ?? null
  const [mood, setMood] = useState<MoodLevel | null>(todayEntry?.mood ?? null)
  const [body, setBody] = useState(todayEntry?.body ?? '')
  const [gratitude, setGratitude] = useState<string[]>(() => Array.from({ length: GRATITUDE_SLOTS }, (_, index) => todayEntry?.gratitude[index] ?? ''))
  const [tags, setTags] = useState<JournalTag[]>(todayEntry?.tags ?? [])
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState<IsoDate | null>(null)

  // Borrar quita la tarjeta al instante; cuando la acción termina, la lista real la reemplaza.
  const [visible, hide] = useOptimistic(entries, (current, date: IsoDate) => current.filter((entry) => entry.entryDate !== date))
  const previous = visible.filter((entry) => entry.entryDate !== today)

  const edit = (apply: () => void) => {
    apply()
    setDirty(true)
    setErrors({})
  }

  function handleSave() {
    const parsed = journalEntrySchema.safeParse({ date: today, mood, body, gratitude, tags })
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues))
    startSaving(async () => {
      const result = await saveJournalAction(parsed.data)
      if (!result.ok) return setErrors({ form: result.message ?? 'No se pudo guardar. Intenta de nuevo.' })
      setDirty(false)
    })
  }

  function handleDelete(entry: JournalEntry) {
    startTransition(async () => {
      hide(entry.entryDate)
      setConfirming(null)
      const result = await deleteJournalAction(entry.entryDate)
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo borrar la entrada.', icon: 'info' })
      const token = result.undoToken
      toast.show({
        message: `Se borró la entrada del ${formatDayMonth(entry.entryDate)}`,
        icon: 'trash',
        onUndo: token ? () => void undoRoutineAction(token) : undefined,
      })
    })
  }

  const cells = monthCalendar(today, visible, weekStart)
  const monthMoods = visible.filter((entry) => entry.entryDate.slice(0, 7) === today.slice(0, 7)).map((entry) => entry.mood)
  const average = averageMood(monthMoods)
  const monthName = formatMonthYear(today).split(' ')[0].toLowerCase()
  const savedAt = todayEntry && !dirty ? formatTime(todayEntry.savedAt, timeZone, hourFormat) : null

  return (
    <div className={styles.grid}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.12 }}>
        <Card as="section" className={styles.today} aria-labelledby="journal-today">
          <span className={styles.corner} aria-hidden="true">
            <Doodle kind="star" size={56} strokeWidth={2} />
          </span>
          <div className={styles.todayHead}>
            <span className={styles.hint}>{formatLongDay(today)}</span>
            <h2 id="journal-today" className={styles.question}>
              ¿Cómo estuvo tu día?
            </h2>
          </div>

          <div role="radiogroup" aria-label="Ánimo" className={styles.moods}>
            {MOOD_LEVELS.map((level) => (
              <motion.button
                key={level}
                type="button"
                role="radio"
                aria-checked={mood === level}
                className={[styles.mood, mood === level ? styles.moodOn : null].filter(Boolean).join(' ')}
                onClick={() => edit(() => setMood(level))}
                whileTap={{ scale: 0.94 }}
              >
                <motion.span animate={mood === level ? { scale: 1.15, rotate: -6 } : { scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }} className={styles.face}>
                  <MoodFace level={level} />
                </motion.span>
                <span className={styles.moodLabel}>{MOOD_META[level].label}</span>
              </motion.button>
            ))}
          </div>

          <Textarea
            id="journal-body"
            label="Escribe lo que quieras"
            rows={6}
            maxLength={5000}
            value={body}
            error={errors.body}
            className={styles.body}
            onChange={(event) => edit(() => setBody(event.target.value))}
          />

          <fieldset className={styles.gratitude}>
            <legend className={styles.label}>
              Hoy agradezco <span className={styles.optional}>(opcional)</span>
            </legend>
            {gratitude.map((value, index) => (
              <div key={index} className={styles.thanks}>
                <span className={styles.thanksNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <label htmlFor={`journal-thanks-${index}`} className={styles.srOnly}>
                  Agradezco {index + 1}
                </label>
                <input
                  id={`journal-thanks-${index}`}
                  className={styles.input}
                  type="text"
                  maxLength={140}
                  autoComplete="off"
                  value={value}
                  onChange={(event) => edit(() => setGratitude((current) => current.map((item, at) => (at === index ? event.target.value : item))))}
                />
              </div>
            ))}
          </fieldset>

          <div className={styles.field}>
            <span className={styles.label} id="journal-tags-label">
              Etiquetas
            </span>
            <div role="group" aria-labelledby="journal-tags-label" className={styles.tags}>
              {JOURNAL_TAGS.map((tag) => {
                const on = tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={on}
                    className={[styles.tag, on ? styles.tagOn : null].filter(Boolean).join(' ')}
                    onClick={() => edit(() => setTags((current) => (on ? current.filter((item) => item !== tag) : [...current, tag])))}
                  >
                    {TAG_LABEL[tag]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.summary}>
            <span className={styles.hint}>Tu día en resumen</span>
            {daySummary.map((item, index) => (
              <span key={item} className={styles.chip}>
                {index === 0 ? <LineIcon d="M5 12l5 5L20 7" size={12} strokeWidth={2.4} /> : null}
                {item}
              </span>
            ))}
          </div>

          <div className={styles.saveRow}>
            <Button onClick={handleSave} disabled={saving}>
              <LineIcon d="M5 12l5 5L20 7" size={16} strokeWidth={2.2} />
              Guardar entrada
            </Button>
            <AnimatePresence mode="wait" initial={false}>
              {errors.mood || errors.form ? (
                <motion.span key="error" className={styles.error} role="status" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {errors.mood ?? errors.form}
                </motion.span>
              ) : savedAt ? (
                <motion.span key="saved" className={styles.saved} role="status" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  Guardada a las {savedAt}. La puedes editar cuando quieras.
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>

      <motion.div className={styles.side} variants={staggerList(0.08, 0.2)} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <Card as="section" className={styles.calendar} aria-labelledby="journal-month">
            <div className={styles.calendarHead}>
              <h2 id="journal-month" className={styles.cardTitle}>
                Ánimo de {monthName}
              </h2>
              <span className={styles.hint}>{average === null ? 'Sin entradas todavía' : `Promedio: ${MOOD_META[average].label.toLowerCase()}`}</span>
            </div>
            <div className={styles.cal}>
              {calendarWeekdays(weekStart).map((letter, index) => (
                <span key={index} className={styles.dow}>
                  {letter}
                </span>
              ))}
              {cells.map((cell, index) =>
                cell === null ? (
                  <span key={`blank-${index}`} />
                ) : (
                  <span
                    key={cell.date}
                    className={[
                      styles.day,
                      cell.mood !== null ? styles[`mood_${cell.mood}`] : cell.isFuture ? styles.dayFuture : styles.dayEmpty,
                      cell.isToday ? styles.dayToday : null,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={`${formatDayMonth(cell.date)}${cell.mood !== null ? `: ${MOOD_META[cell.mood].label}` : ''}`}
                  >
                    {cell.day}
                  </span>
                ),
              )}
            </div>
            <div className={styles.scale}>
              <span>Muy mal</span>
              {MOOD_LEVELS.map((level) => (
                <span key={level} className={[styles.swatch, styles[`mood_${level}`]].join(' ')} />
              ))}
              <span>Muy bien</span>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card as="section" className={styles.previous} aria-labelledby="journal-previous">
            <h2 id="journal-previous" className={styles.cardTitle}>
              Días anteriores
            </h2>
            {previous.length === 0 ? (
              <p className={styles.empty}>Todavía no hay entradas de otros días. Lo que escribas hoy se queda aquí.</p>
            ) : (
              <ul className={styles.entries}>
                <AnimatePresence initial={false} mode="popLayout">
                  {previous.map((entry) => {
                    const shortDate = formatDayMonth(entry.entryDate)
                    return (
                      <motion.li key={entry.id} layout variants={listItem} initial="hidden" animate="show" exit="exit" className={styles.entry}>
                        <article aria-label={formatLongDay(entry.entryDate)} className={styles.entryBody}>
                          <div className={styles.entryHead}>
                            <MoodFace level={entry.mood} size={30} strokeWidth={2.2} />
                            <div className={styles.entryTitles}>
                              <span className={styles.entryDate}>{formatLongDay(entry.entryDate)}</span>
                              <span className={styles.entryMood}>{MOOD_META[entry.mood].label}</span>
                            </div>
                            <button type="button" className={styles.trash} aria-label={`Borrar la entrada del ${shortDate}`} onClick={() => setConfirming(entry.entryDate)}>
                              <LineIcon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={16} />
                            </button>
                          </div>
                          <p className={styles.entryText}>{entry.body}</p>
                          {entry.summary.length > 0 ? (
                            <div className={styles.sums}>
                              {entry.summary.map((item) => (
                                <span key={item} className={styles.chip}>
                                  {item}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {confirming === entry.entryDate ? (
                            <div role="alertdialog" aria-label={`¿Borrar tu entrada del ${shortDate}?`} className={styles.confirm}>
                              <span className={styles.confirmText}>¿Borrar tu entrada del {shortDate}? Va a la papelera.</span>
                              <Button variant="ghost" className={styles.confirmCancel} onClick={() => setConfirming(null)}>
                                Cancelar
                              </Button>
                              <Button variant="danger" className={styles.confirmDo} onClick={() => handleDelete(entry)}>
                                Borrar entrada
                              </Button>
                            </div>
                          ) : null}
                        </article>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
