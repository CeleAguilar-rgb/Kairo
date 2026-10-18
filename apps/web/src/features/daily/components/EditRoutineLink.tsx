import { ButtonLink } from '@/components/ui/ButtonLink'
import { LineIcon } from '@/components/ui/Card'

// "Editar rutina": el botón de la esquina de Hoy, Menú, Reporte y Diario (en el canvas vive en el encabezado).
export function EditRoutineLink() {
  return (
    <ButtonLink variant="ghost" href="/dia-a-dia/rutina">
      <LineIcon d="M14 4l6 6L9 21H3v-6L14 4z" size={16} />
      Editar rutina
    </ButtonLink>
  )
}
