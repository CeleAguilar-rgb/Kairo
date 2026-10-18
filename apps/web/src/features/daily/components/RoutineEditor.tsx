'use client'

import { ROUTINE_DAYS_COUNT, routineSchema } from '@kairo/shared'
import { LayoutGroup, motion } from 'motion/react'
import Link from 'next/link'
import { useId, useOptimistic, useState, useTransition } from 'react'

import { PageHeading } from '@/components/layout/PageHeading'
import { Button } from '@/components/ui/Button'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Card, LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { formatWallTime } from '@/lib/dates'
import { EASE_OUT, SPRING, fadeUp, staggerList } from '@/lib/motion'
import { useEntering } from '@/lib/use-entering'

import {
  copyBlocksAction,
  createRoutineAction,
  deleteRoutineAction,
  undoRoutineAction,
  updateRoutineAction,
} from '../routine-actions'
import { ROUTINE_ICON_META } from '../routine-meta'
import { blockSummary, daysRangeText } from '../routine-utils'
import { ROUTINE_KIND_LABEL, type FocusLink, type Routine, type RoutineBlock } from '../types'

import { BlockDrawer } from './BlockDrawer'
import styles from './RoutineEditor.module.css'

type RoutineEditorProps = {
  routines: Routine[]
  // Los bloques de todas las rutinas, en el orden del día.
  blocks: RoutineBlock[]
  links: FocusLink[]
  hourFormat: '12h' | '24h'
}

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

type Drawer = { block: RoutineBlock | null } | null

// Mis rutinas (RutinaEditar.dc.html): una pestaña por rutina, su nombre, días y bloques, y el panel para
// crear o editar un bloque. Cambiar el nombre, los días o "activa" se guarda al instante.
export function RoutineEditor({ routines, blocks, links, hourFormat }: RoutineEditorProps) {
  const toast = useToast()
  const entering = useEntering()
  const [, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(routines[0]?.id ?? null)
  const [drawer, setDrawer] = useState<Drawer>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [nameDraft, setNameDraft] = useState<{ id: string; text: string } | null>(null)
  const [nameError, setNameError] = useState<string | undefined>()
  const tabsId = useId()

  // Los cambios de nombre, días y "activa" se ven al instante; la lista real los reemplaza.
  const [list, patch] = useOptimistic(routines, (current, change: { id: string; value: Partial<Routine> }) =>
    current.map((routine) => (routine.id === change.id ? { ...routine, ...change.value } : routine)),
  )

  const routine = list.find((item) => item.id === selectedId) ?? list[0] ?? null
  const ownBlocks = routine ? blocks.filter((block) => block.routineId === routine.id) : []
  const donor = routine ? list.find((item) => item.id !== routine.id && blocks.some((block) => block.routineId === item.id)) : undefined
  const linkLabel = (link: string | null) => {
    if (!link) return null
    const label = links.find((item) => item.value === link)?.label ?? null
    return label ? label.replace(/^Todo lo (de )?/, '').replace(/^Proyecto: /, '') : null
  }

  const save = (change: Partial<Pick<Routine, 'name' | 'days' | 'active'>>) => {
    if (!routine) return
    const next = { name: routine.name, days: routine.days, active: routine.active, ...change }
    const parsed = routineSchema.safeParse(next)
    if (!parsed.success) {
      setNameError(parsed.error.issues.find((issue) => issue.path[0] === 'name')?.message)
      return
    }
    setNameError(undefined)
    startTransition(async () => {
      patch({ id: routine.id, value: parsed.data })
      const result = await updateRoutineAction(routine.id, parsed.data)
      if (!result.ok) toast.show({ message: result.message ?? 'No se pudo guardar. Intenta de nuevo.', icon: 'info' })
    })
  }

  const commitName = () => {
    if (!routine || !nameDraft || nameDraft.id !== routine.id) return
    setNameDraft(null)
    if (nameDraft.text.trim() !== routine.name) save({ name: nameDraft.text })
  }

  const handleCreate = () =>
    startTransition(async () => {
      const result = await createRoutineAction()
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo crear la rutina.', icon: 'info' })
      if (result.id) setSelectedId(result.id)
    })

  const handleCopy = () => {
    if (!routine || !donor) return
    startTransition(async () => {
      const result = await copyBlocksAction(donor.id, routine.id)
      if (!result.ok) toast.show({ message: result.message ?? 'No se pudieron copiar los bloques.', icon: 'info' })
    })
  }

  const handleDelete = () => {
    if (!routine) return
    const { id, name } = routine
    const count = ownBlocks.length
    startTransition(async () => {
      const result = await deleteRoutineAction(id)
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo borrar la rutina.', icon: 'info' })
      setConfirmDelete(false)
      setSelectedId(null)
      const token = result.undoToken
      toast.show({
        message: `Se borró la rutina ${name}${count > 0 ? ` y sus ${count} bloques` : ''}`,
        icon: 'trash',
        onUndo: token ? () => void undoRoutineAction(token) : undefined,
      })
    })
  }

  return (
    <main className={styles.main}>
      <div className={styles.top}>
        <div className={styles.titleBlock}>
          <Link href="/dia-a-dia" className={styles.back}>
            <LineIcon d="M15 6l-6 6 6 6" size={16} strokeWidth={2} />
            Día a día
          </Link>
          <PageHeading title="Mis rutinas" doodle="sun" doodleRotate={8} squiggleWidth={260} />
        </div>
        <ButtonLink href="/dia-a-dia">
          <LineIcon d="M5 12l5 5L20 7" size={16} strokeWidth={2.2} />
          Listo
        </ButtonLink>
      </div>

      <LayoutGroup id={tabsId}>
        <div role="tablist" aria-label="Rutinas" className={styles.tabs}>
          {list.map((item) => {
            const active = item.id === routine?.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={[styles.tab, active ? styles.tabActive : null].filter(Boolean).join(' ')}
                onClick={() => {
                  setSelectedId(item.id)
                  setNameError(undefined)
                }}
              >
                {active ? <motion.span layoutId="routine-tab-pill" className={styles.tabPill} transition={SPRING.slide} /> : null}
                <span className={styles.tabContent}>
                  {item.name}
                  <span className={styles.tabDays}>{daysRangeText(item.days)}</span>
                </span>
              </button>
            )
          })}
          <button type="button" className={styles.newTab} onClick={handleCreate}>
            <LineIcon d="M12 5v14M5 12h14" size={14} strokeWidth={2.2} />
            Nueva rutina
          </button>
        </div>
      </LayoutGroup>

      {routine ? (
        <motion.div key={routine.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
          <Card as="section" className={styles.card} aria-label={`Rutina ${routine.name}`}>
            <div className={styles.settings}>
              <div className={styles.nameField}>
                <Input
                  id="routine-name"
                  label="Nombre"
                  value={nameDraft?.id === routine.id ? nameDraft.text : routine.name}
                  maxLength={40}
                  autoComplete="off"
                  error={nameError}
                  onChange={(event) => setNameDraft({ id: routine.id, text: event.target.value })}
                  onBlur={commitName}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                />
              </div>

              <div className={styles.field}>
                <span className={styles.label} id="routine-days-label">
                  Días
                </span>
                <div role="group" aria-labelledby="routine-days-label" className={styles.days}>
                  {Array.from({ length: ROUTINE_DAYS_COUNT }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-pressed={routine.days[index]}
                      aria-label={DAY_NAMES[index]}
                      className={[styles.day, routine.days[index] ? styles.dayOn : null].filter(Boolean).join(' ')}
                      onClick={() => save({ days: routine.days.map((on, at) => (at === index ? !on : on)) })}
                    >
                      {DAY_LETTERS[index]}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.active}>
                <Toggle checked={routine.active} onToggle={() => save({ active: !routine.active })} label="Rutina activa" />
                <span>Activa</span>
              </div>

              <Button variant="ghost" className={styles.deleteRoutine} onClick={() => setConfirmDelete(true)}>
                <LineIcon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={16} />
                Borrar rutina
              </Button>
            </div>

            {ownBlocks.length > 0 ? (
              <motion.ul className={styles.blocks} variants={staggerList(0.04, entering ? 0.15 : 0)} initial="hidden" animate="show">
                {ownBlocks.map((block) => (
                  <motion.li key={block.id} variants={fadeUp} className={styles.row}>
                    <span className={styles.time}>
                      {formatWallTime(block.startsAt, hourFormat)}
                      {block.endsAt ? ` – ${formatWallTime(block.endsAt, hourFormat)}` : ''}
                    </span>
                    <span className={[styles.icon, block.kind === 'focus' ? styles.iconFocus : null].filter(Boolean).join(' ')}>
                      <LineIcon d={ROUTINE_ICON_META[block.icon].d} size={20} />
                    </span>
                    <div className={styles.text}>
                      <span className={styles.title}>{block.title}</span>
                      <span className={styles.sub}>{blockSummary(block, linkLabel(block.link))}</span>
                    </div>
                    <span className={[styles.chip, styles[`kind_${block.kind}`]].join(' ')}>{ROUTINE_KIND_LABEL[block.kind]}</span>
                    <button type="button" className={styles.edit} aria-label={`Editar bloque: ${block.title} ${formatWallTime(block.startsAt, hourFormat)}`} onClick={() => setDrawer({ block })}>
                      <LineIcon d="M14 4l6 6L9 21H3v-6L14 4z" />
                    </button>
                  </motion.li>
                ))}
                <li>
                  <button type="button" className={styles.addBlock} onClick={() => setDrawer({ block: null })}>
                    <LineIcon d="M12 5v14M5 12h14" size={16} strokeWidth={2.2} />
                    Agregar bloque
                  </button>
                </li>
              </motion.ul>
            ) : (
              <div className={styles.blank}>
                <Doodle kind="sun" size={72} strokeWidth={2.2} />
                <span className={styles.blankTitle}>Tu {routine.name.toLowerCase()} está en blanco</span>
                <span className={styles.blankText}>
                  Agrega bloques como despertar, comidas o un rato para escribir.
                  {donor ? ` Puedes copiar los de ${donor.name} y ajustar las horas.` : ''}
                </span>
                <div className={styles.blankActions}>
                  <Button onClick={() => setDrawer({ block: null })}>
                    <LineIcon d="M12 5v14M5 12h14" size={16} strokeWidth={2} />
                    Agregar primer bloque
                  </Button>
                  {donor ? (
                    <Button variant="ghost" onClick={handleCopy}>
                      Copiar de {donor.name}
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      ) : (
        <Card as="section" className={styles.blank} aria-label="Sin rutinas">
          <Doodle kind="sun" size={72} strokeWidth={2.2} />
          <span className={styles.blankTitle}>Todavía no tienes rutinas</span>
          <span className={styles.blankText}>Una rutina es el orden de tu día: despertar, comidas, enfoque. Crea la primera y ponle sus bloques.</span>
          <div className={styles.blankActions}>
            <Button onClick={handleCreate}>
              <LineIcon d="M12 5v14M5 12h14" size={16} strokeWidth={2} />
              Nueva rutina
            </Button>
          </div>
        </Card>
      )}

      {routine ? <BlockDrawer open={drawer !== null} routineId={routine.id} block={drawer?.block ?? null} links={links} onClose={() => setDrawer(null)} /> : null}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        tone="danger"
        title={routine ? `¿Borrar la rutina ${routine.name}${ownBlocks.length > 0 ? ` y sus ${ownBlocks.length} bloques` : ''}?` : ''}
        description="También se quitan sus avisos. Va a la papelera 30 días."
        icon={<LineIcon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={22} />}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Borrar rutina{ownBlocks.length > 0 ? ` y ${ownBlocks.length} bloques` : ''}
            </Button>
          </>
        }
      >
        <div className={styles.keep}>
          <LineIcon d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" size={16} strokeWidth={2} />
          <span>Tu historial del reporte se conserva: lo que ya cumpliste no se borra.</span>
        </div>
      </Modal>
    </main>
  )
}
