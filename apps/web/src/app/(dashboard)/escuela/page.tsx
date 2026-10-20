import { redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { SchoolView } from '@/features/school'
import { getSchoolData } from '@/features/school/api'
import { getMe } from '@/lib/account/api'

// Escuela: antes de empezar (cuenta regresiva y preparación) o durante el
// semestre (horario, materias, entregas, calificaciones). Esta página solo
// junta los datos (de la API; de ejemplo en modo demo); la pantalla es
// SchoolView.
export default async function SchoolPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const data = await getSchoolData()

  return (
    <PageEnter>
      <SchoolView {...data} />
    </PageEnter>
  )
}
