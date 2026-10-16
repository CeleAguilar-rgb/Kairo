import { LineIcon } from '@/components/ui/Card'

import type { SlashItem } from './extensions'
import styles from './SlashMenu.module.css'

type SlashMenuProps = {
  // El menú "/" y el de "Insertar" son el mismo componente con distinto id.
  id?: string
  items: SlashItem[]
  selected: number
  // Dónde va el menú, relativo a la página (debajo del cursor).
  top: number
  left: number
  onPick: (item: SlashItem) => void
}

// El menú "/" de Pagina.dc.html: los bloques que se pueden insertar, con su ícono y una línea que dice qué son. Se
// mueve con las flechas, se elige con Enter o con un toque y se cierra con Escape (lo maneja el editor).
export function SlashMenu({ id = 'slash-menu', items, selected, top, left, onPick }: SlashMenuProps) {
  return (
    <div className={styles.menu} id={id} role="listbox" aria-label="Tipos de bloque" style={{ top, left }}>
      <span className={styles.heading}>Bloques</span>
      {items.map((item, index) => (
        // El mousedown no hace nada (así el clic no le quita el foco al editor) y el bloque se inserta en el clic: así también
        // funciona con teclado (Tab hasta el bloque y Enter).
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={index === selected}
          className={[styles.item, index === selected ? styles.itemOn : null].filter(Boolean).join(' ')}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(item)}
        >
          <span className={styles.icon}>
            <LineIcon d={item.icon} />
          </span>
          <span className={styles.texts}>
            <span className={styles.name}>{item.name}</span>
            <span className={styles.description}>{item.description}</span>
          </span>
        </button>
      ))}
      {items.length === 0 ? <span className={styles.none}>Ningún bloque se llama así.</span> : null}
    </div>
  )
}
