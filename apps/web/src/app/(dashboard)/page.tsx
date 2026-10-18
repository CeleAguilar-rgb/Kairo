import { getMe } from '@/lib/account/api'
import { HOME_CARDS_BY_MODULE } from '@/lib/modules/home-cards'
import { modules } from '@/lib/modules/registry'
import styles from './page.module.css'

// "Ajustar mi Inicio" (home_cards: prender/apagar y ordenar tarjetas suelta)
// es de un incremento posterior. Por ahora se muestran todas las tarjetas
// que aportan los módulos activos, en el orden de sus secciones.
export default async function DashboardHome() {
  const me = await getMe()
  const sectionByModule = new Map((me?.sections ?? []).map((section) => [section.section, section]))

  const activeModules = modules
    .filter((module) => sectionByModule.get(module.id)?.enabled)
    .sort(
      (a, b) =>
        (sectionByModule.get(a.id)?.position ?? 0) - (sectionByModule.get(b.id)?.position ?? 0),
    )

  const homeCards = activeModules.flatMap((module) => HOME_CARDS_BY_MODULE[module.id] ?? [])

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Inicio</h1>

      {homeCards.length > 0 ? (
        <div className={styles.grid}>
          {homeCards.map((HomeCard, index) => (
            <HomeCard key={index} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Activa secciones desde tu perfil para ver sus tarjetas aquí.</p>
      )}
    </div>
  )
}
