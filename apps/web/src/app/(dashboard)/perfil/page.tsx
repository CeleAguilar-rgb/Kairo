import { redirect } from 'next/navigation'
import { getMe } from '@/lib/account/api'
import { PerfilView } from './PerfilView'

// getMe() está envuelto en cache() (lib/account/api.ts): este llamado no
// repite la petición a la API, reusa la que ya hizo el layout del dashboard.
export default async function PerfilPage() {
  const me = await getMe()
  if (!me) redirect('/bienvenida')

  return <PerfilView profile={me.profile} sections={me.sections} />
}
