'use client'

import { useState, type ReactNode } from 'react'

import { Button } from './Button'
import { LineIcon } from './Card'
import { Drawer } from './Drawer'
import styles from './FilterSheet.module.css'

const FUNNEL = 'M3 5h18l-7 8.5V20l-4-2v-4.5z'
const CHECK = 'M5 12l5 5L20 7'

type FilterSheetProps = {
  // Título del cajón ("Filtrar movimientos").
  title: string
  // Cuántos filtros están puestos: se muestra en el botón para que se note aunque el cajón esté cerrado.
  badge?: number
  className?: string
  // El contenido del cajón. Si es una función, recibe `close` para cerrarlo al elegir (filtros de una sola opción).
  children: ReactNode | ((close: () => void) => ReactNode)
}

// El filtro del teléfono: un solo botón "Filtrar" (con la cuenta de filtros puestos) que abre un cajón con todas
// las opciones. Con muchas opciones las chips no caben ni se ven todas; aquí caben las que sean. En escritorio se
// siguen usando los chips de cada pantalla, por eso quien lo use decide dónde mostrarlo (ver responsive.module.css).
export function FilterSheet({ title, badge = 0, className, children }: FilterSheetProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <Button
        variant="secondary"
        className={[styles.trigger, badge > 0 ? styles.triggerOn : null, className].filter(Boolean).join(' ')}
        aria-haspopup="dialog"
        aria-label={badge > 0 ? `${title} (${badge} activo${badge === 1 ? '' : 's'})` : title}
        onClick={() => setOpen(true)}
      >
        <LineIcon d={FUNNEL} size={16} strokeWidth={2} />
        Filtrar
        {badge > 0 ? <span className={styles.badge}>{badge}</span> : null}
      </Button>
      <Drawer open={open} onClose={close} title={title}>
        <div className={styles.body}>{typeof children === 'function' ? children(close) : children}</div>
        <Button onClick={close}>Listo</Button>
      </Drawer>
    </>
  )
}

export type FilterOption = {
  value: string
  label: string
  count?: number
  // Lo que va antes del nombre: el color de un calendario, un punto de proyecto.
  leading?: ReactNode
}

type FilterOptionsProps = {
  // Encabezado del grupo ("Proyecto", "Mostrar").
  label: string
  options: FilterOption[]
  // 'single': una sola opción elegida (radio). 'multi': cada una se prende o se apaga (casilla).
  mode: 'single' | 'multi'
  isSelected: (value: string) => boolean
  onSelect: (value: string) => void
}

// Un grupo de opciones dentro de FilterSheet, en filas grandes fáciles de tocar.
export function FilterOptions({ label, options, mode, isSelected, onSelect }: FilterOptionsProps) {
  return (
    <div className={styles.group} role={mode === 'single' ? 'radiogroup' : 'group'} aria-label={label}>
      <span className={styles.groupLabel}>{label}</span>
      {options.map((option) => {
        const selected = isSelected(option.value)
        return (
          <button
            key={option.value}
            type="button"
            role={mode === 'single' ? 'radio' : 'checkbox'}
            aria-checked={selected}
            className={[styles.option, selected ? styles.optionOn : null].filter(Boolean).join(' ')}
            onClick={() => onSelect(option.value)}
          >
            {option.leading}
            <span className={styles.optionLabel}>{option.label}</span>
            {option.count !== undefined ? <span className={styles.optionCount}>{option.count}</span> : null}
            <span className={styles.tick} aria-hidden="true">
              {selected ? <LineIcon d={CHECK} size={16} strokeWidth={2.4} /> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
