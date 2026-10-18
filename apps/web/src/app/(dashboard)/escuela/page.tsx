import { redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { SchoolView } from '@/features/school'
import { getSchoolData } from '@/features/school/api'
import { getMe } from '@/lib/account/api'

// Escuela: antes de empezar (cuenta regresiva y preparación) o durante el
// semestre (horario, materias, entregas, calificaciones). Esta página solo
// junta los datos (de ejemplo por ahora); la pantalla es SchoolView.
export default async function SchoolPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  const { subjects, assignments, prepItems, prepDaysLeft, today } =
    await getSchoolData()

  return (
    <PageEnter>
      <SchoolView
        subjects={subjects}
        assignments={assignments}
        prepItems={prepItems}
        prepDaysLeft={prepDaysLeft}
        today={today}
      />
    </PageEnter>
  )
}
