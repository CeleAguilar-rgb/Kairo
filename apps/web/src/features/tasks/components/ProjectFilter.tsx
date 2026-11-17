'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'

import { projectTone } from '@/features/projects'
import { SPRING } from '@/lib/motion'

import styles from './ProjectFilter.module.css'

export type ProjectFilterOption = {
  id: string
  name: string
  // Tareas pendientes de ese proyecto (o de todos, en "Todos los proyectos").
  count: number
}

type ProjectFilterProps = {
  options: ProjectFilterOption[]
  value: string
  onChange: (id: string) => void
}

// El filtro por proyecto de Tareas, en un solo botón con menú: ocupa lo mismo con 3 proyectos que con
// 30 (antes cada proyecto era una píldora y la fila crecía sin parar). El menú es un listbox con
// teclado: ↑/↓ mueven, Enter elige, Escape cierra y devuelve el foco al botón.
export function ProjectFilter({ options, value, onChange }: ProjectFilterProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find((option) => option.id === value) ?? options[0]
  const selectedIndex = Math.max(0, options.findIndex((option) => option.id === value))

  const openMenu = () => {
    setActiveIndex(selectedIndex)
    setOpen(true)
  }

  const close = (returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }

  const choose = (id: string) => {
    onChange(id)
    close(true)
  }

  // Al abrir, el foco pasa a la lista (para el teclado) y la opción activa se asoma si había scroll.
  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  // Clic fuera: cierra sin quitarle el foco a lo que la persona acaba de tocar.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const handleListKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => Math.min(index + 1, options.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(options[activeIndex]!.id)
        break
      case 'Escape':
        event.preventDefault()
        close(true)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Filtrar por proyecto: ${selected?.name}`}
        onClick={() => (open ? close(false) : openMenu())}
      >
        {selected && selected.id !== 'all' ? <span className={styles.dot} style={{ background: projectTone(selected.id) }} aria-hidden="true" /> : null}
        <span className={styles.name}>{selected?.name}</span>
        <span className={styles.count}>{selected?.count}</span>
        <svg className={[styles.chevron, open ? styles.chevronOpen : null].filter(Boolean).join(' ')} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            ref={listRef}
            id={listId}
            className={styles.menu}
            role="listbox"
            aria-label="Proyectos"
            aria-activedescendant={`${listId}-${activeIndex}`}
            tabIndex={-1}
            onKeyDown={handleListKeyDown}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: SPRING.panel }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            style={{ transformOrigin: 'top left' }}
          >
            {options.map((option, index) => (
              <li
                key={option.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.id === value}
                className={[styles.option, index === activeIndex ? styles.optionActive : null, option.id === value ? styles.optionSelected : null].filter(Boolean).join(' ')}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => choose(option.id)}
              >
                {option.id !== 'all' ? <span className={styles.dot} style={{ background: projectTone(option.id) }} aria-hidden="true" /> : <span className={styles.dotSpace} aria-hidden="true" />}
                <span className={styles.optionName}>{option.name}</span>
                <span className={styles.count}>{option.count}</span>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
