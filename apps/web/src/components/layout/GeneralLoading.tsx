'use client'

import { useLayoutEffect, useRef } from 'react'

import { Doodle, type DoodleKind } from '@/components/ui/Doodle'

import styles from './GeneralLoading.module.css'

// Pantalla de carga GENERAL de todo el dashboard: tres doodles saltando y un "Cargando…".
// No copia la forma de ninguna pantalla (un esqueleto con la forma de una pantalla
// "saltaba" al llegar cualquier otra), solo avisa que la app está trabajando.
//
// La usan dos lugares, y se ve idéntica en ambos para que el relevo no se note:
// - PageFrame (Navigation.tsx): la muestra desde el cliente en cuanto haces clic. En
//   desarrollo Next no precarga rutas y el servidor tarda en responder (o en compilar),
//   y mientras tanto la pantalla vieja se quedaba quieta ("tiesa").
// - (dashboard)/loading.tsx: el respaldo de Next mientras la página nueva termina de llegar.
//
// No pongas otro loading.tsx dentro de una ruta: se vería primero este y luego el de la ruta.
const DOODLES: DoodleKind[] = ['star', 'sun', 'cloud']

export default function GeneralLoading() {
  const ref = useRef<HTMLDivElement>(null)

  // En el relevo entre las dos pantallas de carga este componente se monta de nuevo, y las
  // animaciones de CSS arrancarían otra vez desde cero: los doodles darían un tirón en
  // medio del salto. Alineamos todas al reloj del documento (startTime = 0) y así el
  // movimiento sigue exactamente donde iba, sin importar cuándo se montó.
  useLayoutEffect(() => {
    ref.current?.getAnimations({ subtree: true }).forEach((animation) => {
      animation.startTime = 0
    })
  }, [])

  return (
    <div ref={ref} className={styles.wrap} role="status" aria-busy="true" aria-label="Cargando">
      <div className={styles.doodles}>
        {DOODLES.map((kind, index) => (
          <span key={kind} className={styles.doodle} style={{ animationDelay: `${index * 0.18}s` }}>
            <Doodle kind={kind} size={48} />
          </span>
        ))}
      </div>
      <p className={styles.caption} aria-hidden="true">
        Cargando
        <span className={styles.dots}>
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>
    </div>
  )
}
