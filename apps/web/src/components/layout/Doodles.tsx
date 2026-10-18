'use client'

import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { LineIcon } from '@/components/ui/Card'
import { Doodle, DOODLE_KINDS, DOODLE_LABEL, type DoodleKind } from '@/components/ui/Doodle'
import { popover, SPRING, staggerList } from '@/lib/motion'

import styles from './Doodles.module.css'

// Doodles pegables de Main.dc.html. La bandeja vive en el header (Topnav) y
// los doodles pegados se dibujan alrededor del saludo (Inicio): dos lugares
// distintos del árbol, por eso comparten el estado con un contexto.
type Placed = { id: number; kind: DoodleKind; slot: number }

type DoodlesApi = {
  placed: Placed[]
  add: (kind: DoodleKind) => void
  clear: () => void
}

const DoodlesContext = createContext<DoodlesApi | null>(null)

// Dónde caen alrededor del saludo (posiciones del canvas). Luego se arrastran.
const SLOTS = [
  { left: '58%', top: '0px', rotate: -10 },
  { left: '2%', top: '108px', rotate: 0 },
  { left: '74%', top: '92px', rotate: 12 },
  { left: '40%', top: '-14px', rotate: 8 },
  { left: '88%', top: '30px', rotate: 0 },
  { left: '22%', top: '-22px', rotate: -14 },
  { left: '60%', top: '120px', rotate: 6 },
  { left: '94%', top: '120px', rotate: -8 },
]

export function DoodlesProvider({ children }: { children: ReactNode }) {
  const [placed, setPlaced] = useState<Placed[]>([])
  const nextId = useRef(0)

  const add = useCallback((kind: DoodleKind) => {
    setPlaced((current) => {
      // Como en el canvas: con todos los lugares ocupados, el más viejo se va.
      const kept = current.length >= SLOTS.length ? current.slice(1) : current
      const used = new Set(kept.map((p) => p.slot))
      const slot = SLOTS.findIndex((_, i) => !used.has(i))
      return [...kept, { id: nextId.current++, kind, slot: slot === -1 ? 0 : slot }]
    })
  }, [])

  const clear = useCallback(() => setPlaced([]), [])
  const api = useMemo(() => ({ placed, add, clear }), [placed, add, clear])

  return <DoodlesContext.Provider value={api}>{children}</DoodlesContext.Provider>
}

function useDoodles() {
  const context = useContext(DoodlesContext)
  if (!context) throw new Error('Los doodles necesitan estar dentro de <DoodlesProvider>.')
  return context
}

// Botón del lápiz + bandeja (header).
export function DoodleTray({ buttonClassName, openClassName }: { buttonClassName: string; openClassName: string }) {
  const { placed, add, clear } = useDoodles()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={styles.trayWrap} ref={wrapRef}>
      <motion.button
        type="button"
        className={[buttonClassName, open ? openClassName : null].filter(Boolean).join(' ')}
        aria-label="Agregar doodles"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        whileHover={{ rotate: -10 }}
        whileTap={{ scale: 0.9 }}
        transition={SPRING.pop}
      >
        <LineIcon
          size={22}
          d={['M3.5 20.5c1-3 2.2-4.6 4-5.6', 'M7.5 14.9L17.8 4.6a2 2 0 0 1 2.8 2.8L10.3 17.7l-3.6 1 .8-3.8z', 'M4 7c1.2-1.4 2.4-1.4 3 0s1.8 1.4 3 0']}
        />
      </motion.button>
      <AnimatePresence>
        {open ? (
          <motion.div className={styles.tray} role="group" aria-label="Doodles" variants={popover} initial="hidden" animate="show" exit="exit">
            <div className={styles.trayHead}>
              <span className={styles.trayTitle}>Doodles</span>
              <span className={styles.trayHint}>Toca para pegarlo</span>
            </div>
            <motion.div className={styles.trayGrid} variants={staggerList(0.03, 0.05)} initial="hidden" animate="show">
              {DOODLE_KINDS.map((kind) => (
                <motion.button
                  key={kind}
                  type="button"
                  className={styles.doodleButton}
                  aria-label={`Agregar ${DOODLE_LABEL[kind].toLowerCase()}`}
                  onClick={() => add(kind)}
                  variants={{ hidden: { opacity: 0, scale: 0.6 }, show: { opacity: 1, scale: 1, transition: SPRING.pop } }}
                  whileHover={{ rotate: -6, scale: 1.06 }}
                  whileTap={{ scale: 0.85 }}
                >
                  <Doodle kind={kind} size={38} />
                </motion.button>
              ))}
            </motion.div>
            <AnimatePresence>
              {placed.length > 0 ? (
                <motion.button
                  type="button"
                  className={styles.clear}
                  onClick={clear}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  Quitar doodles
                </motion.button>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

// Capa de doodles pegados (alrededor del saludo). Decorativa: solo los propios
// doodles reciben el puntero, para poder arrastrarlos.
export function PlacedDoodles() {
  const { placed } = useDoodles()
  const areaRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={areaRef} className={styles.placedArea} aria-hidden="true">
      <AnimatePresence>
        {placed.map((p) => {
          const slot = SLOTS[p.slot]
          return (
            <motion.div
              key={p.id}
              className={styles.placed}
              style={{ left: slot.left, top: slot.top }}
              initial={{ scale: 0, rotate: slot.rotate - 20, opacity: 0 }}
              animate={{ scale: 1, rotate: slot.rotate, opacity: 1, transition: SPRING.pop }}
              exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
              drag
              dragConstraints={areaRef}
              dragElastic={0.2}
              dragMomentum={false}
              whileDrag={{ scale: 1.2, rotate: slot.rotate + 10, cursor: 'grabbing' }}
              whileHover={{ scale: 1.08 }}
            >
              <Doodle kind={p.kind} size={40} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
