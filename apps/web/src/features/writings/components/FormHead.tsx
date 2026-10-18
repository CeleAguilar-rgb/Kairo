import { LineIcon } from '@/components/ui/Card'

import { WRITING_ICON } from '../writing-meta'

import styles from './WritingForm.module.css'

// El encabezado de los paneles de Escritos: el título visible y la X para cerrar sin guardar. El título que
// leen los lectores de pantalla lo pone el Drawer; este es solo visual.
export function FormHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className={styles.head}>
      <p className={styles.heading} aria-hidden="true">
        {title}
      </p>
      <button type="button" className={styles.close} aria-label="Cerrar sin guardar" onClick={onClose}>
        <LineIcon d={WRITING_ICON.close} size={20} />
      </button>
    </header>
  )
}
