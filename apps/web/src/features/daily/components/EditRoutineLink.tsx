import { ButtonLink } from '@/components/ui/ButtonLink'
import { LineIcon } from '@/components/ui/Card'

import styles from './EditRoutineLink.module.css'

// "Editar rutina": vive en la cabecera de Día a día, junto al título, porque es lo mismo en todas las partes
// (Hoy, Menú, Reporte, Diario, Metas) y por jerarquía pertenece a la pantalla y no a cada franja. En pantallas
// muy angostas se queda solo el ícono (el nombre accesible sigue en aria-label).
export function EditRoutineLink() {
  return (
    <ButtonLink variant="ghost" href="/dia-a-dia/rutina" className={styles.link} aria-label="Editar rutina">
      <LineIcon d="M14 4l6 6L9 21H3v-6L14 4z" size={16} />
      <span className={styles.label}>Editar rutina</span>
    </ButtonLink>
  )
}
