'use client'

import { LayoutGroup, motion } from 'motion/react'
import Link from 'next/link'

import { SPRING } from '@/lib/motion'

import { LineIcon } from './Card'
import styles from './IconTabs.module.css'
import responsive from './responsive.module.css'
import { ScrollTabs } from './ScrollTabs'

export type IconTabItem = {
  key: string
  label: string
  // Etiqueta más corta para el teléfono ("Ahorros" en vez de "Ahorros y deudas"). Si falta, se usa `label`.
  shortLabel?: string
  icon: string | string[]
  // Con `href` la pestaña es una ruta (un enlace); sin `href` es un botón y avisa con `onSelect`.
  href?: string
  // Una cuenta chiquita junto al nombre (Escritos).
  count?: number
}

type IconTabsProps = {
  // Id propio del grupo: cada barra de pestañas tiene su píldora (layoutId) y no se la roba a otra.
  id: string
  label: string
  items: IconTabItem[]
  activeKey: string
  onSelect?: (key: string) => void
  // Solo se ve en el teléfono: para un filtro que en escritorio es otra cosa (un Segmented con los nombres completos)
  // y en el teléfono pasa a ser esta barra de iconos.
  phoneOnly?: boolean
}

// Las pestañas de un módulo (Finanzas, Día a día, Escritos, Escuela). En escritorio se ven como siempre: el
// nombre sobre la píldora que se desliza. En el teléfono (≤ 720px) las que no están elegidas se quedan solo con
// su icono y la elegida muestra icono + nombre, igual que la barra de abajo: así caben cinco sin esconder
// ninguna a la derecha. El aspecto vive en IconTabs.module.css; ScrollTabs queda como último recurso si aun
// así no caben (letra grande del sistema, por ejemplo).
export function IconTabs({ id, label, items, activeKey, onSelect, phoneOnly }: IconTabsProps) {
  const routes = items.every((item) => item.href)

  return (
    <LayoutGroup id={id}>
      <ScrollTabs
        as={routes ? 'nav' : 'div'}
        className={[styles.tabs, phoneOnly ? responsive.phoneOnly : null].filter(Boolean).join(' ')}
        aria-label={label}
        role={routes ? undefined : 'group'}
        // `data-tab-switch` le dice a la navegación que esto es cambiar de pestaña, no de pantalla
        // (ver Navigation.tsx y SectionPanel.tsx). Solo aplica cuando las pestañas son rutas.
        data-tab-switch={routes ? true : undefined}
      >
        {items.map((item) => {
          const active = item.key === activeKey
          const className = [styles.tab, active ? styles.active : null].filter(Boolean).join(' ')
          const content = (
            <>
              {active ? <motion.span layoutId={`${id}-pill`} className={styles.pill} transition={SPRING.slide} /> : null}
              <span className={styles.content}>
                <span className={styles.icon}>
                  <LineIcon d={item.icon} size={20} />
                </span>
                <span className={styles.text}>
                  <span className={styles.textInner}>
                    {item.shortLabel ? (
                      <>
                        <span className={styles.long}>{item.label}</span>
                        <span className={styles.short}>{item.shortLabel}</span>
                      </>
                    ) : (
                      item.label
                    )}
                    {item.count !== undefined ? <span className={styles.count}>{item.count}</span> : null}
                  </span>
                </span>
              </span>
            </>
          )

          return item.href ? (
            <Link key={item.key} href={item.href} className={className} aria-current={active ? 'page' : undefined} aria-label={item.label} title={item.label}>
              {content}
            </Link>
          ) : (
            <button key={item.key} type="button" className={className} aria-pressed={active} aria-label={item.label} title={item.label} onClick={() => onSelect?.(item.key)}>
              {content}
            </button>
          )
        })}
      </ScrollTabs>
    </LayoutGroup>
  )
}
