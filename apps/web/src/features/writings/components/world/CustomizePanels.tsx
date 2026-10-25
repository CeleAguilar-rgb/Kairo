'use client'

import { DEFAULT_WORLD_STATS } from '@kairo/shared'
import type { ReactNode } from 'react'

import { LineIcon } from '@/components/ui/Card'
import { Toggle } from '@/components/ui/Toggle'

import { updateWorldAction } from '../../world-actions'
import { formatCount } from '../../writing-utils'
import { allTabs, splitTabs, statCatalog } from '../../world-utils'
import colors from '../WritingColors.module.css'

import panelStyles from './EntryPanel.module.css'
import styles from './CustomizePanels.module.css'
import { useWorld } from './WorldContext'
import { PanelLayout } from './WorldSidePanel'

// "Personalizar pestañas" y "Contadores" (EscritosPestanas, EscritosContadores): una lista con interruptor y flechas.
// Cada mundo guarda los suyos (`worlds.tabs` y `worlds.stats`, decisión #46): un arreglo de ids en orden.

type RowProps = {
  label: string
  detail: string
  leading: ReactNode
  on: boolean
  fixed?: boolean
  canUp: boolean
  canDown: boolean
  onToggle: () => void
  onUp: () => void
  onDown: () => void
}

function Row({ label, detail, leading, on, fixed = false, canUp, canDown, onToggle, onUp, onDown }: RowProps) {
  return (
    <div className={styles.row}>
      {leading}
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        <span className={styles.detail}>{detail}</span>
      </span>
      {on ? (
        <>
          <button type="button" className={styles.arrow} disabled={!canUp} aria-label={`Mover antes: ${label}`} onClick={onUp}>
            <LineIcon d="M12 19V5M6 11l6-6 6 6" size={16} strokeWidth={2} />
          </button>
          <button type="button" className={styles.arrow} disabled={!canDown} aria-label={`Mover después: ${label}`} onClick={onDown}>
            <LineIcon d="M12 5v14M6 13l6 6 6-6" size={16} strokeWidth={2} />
          </button>
        </>
      ) : null}
      {fixed ? <span className={styles.fixed}>Fija</span> : <Toggle checked={on} onToggle={onToggle} label={on ? `Quitar ${label}` : `Mostrar ${label}`} />}
    </div>
  )
}

const swap = (list: string[], at: number, to: number) => {
  const next = [...list]
  ;[next[at], next[to]] = [next[to]!, next[at]!]
  return next
}

export function TabsPanel() {
  const { bundle, close, run } = useWorld()
  const { bar, more } = splitTabs(bundle)
  const ids = bar.map((tab) => tab.id)
  const save = (tabs: string[]) => run(() => updateWorldAction(bundle.world.id, { tabs }))
  const byId = new Map(allTabs(bundle).map((tab) => [tab.id, tab]))

  return (
    <PanelLayout
      kicker="Personalizar"
      footer={
        <button type="button" className={panelStyles.primary} onClick={close}>
          Listo
        </button>
      }
    >
      <h2 id="world-panel-title" className={panelStyles.name}>
        Pestañas de {bundle.world.name}
      </h2>
      <p className={styles.intro}>Elige cuáles se ven en la barra y en qué orden. Las apagadas quedan en “Más”. Cada mundo guarda la suya.</p>
      <div className={styles.list}>
        {ids.map((id, position) => {
          const tab = byId.get(id)!
          return (
            <Row
              key={id}
              label={tab.label}
              detail={id === 'resumen' ? 'Siempre visible' : 'En la barra'}
              leading={<span className={[styles.icon, colors[`tone_${tab.template?.color ?? 'muted'}`]].join(' ')}>{tab.label.charAt(0)}</span>}
              on
              fixed={id === 'resumen'}
              // El Resumen va siempre primero: lo de después no puede subir por encima de él.
              canUp={position > 1}
              canDown={position > 0 && position < ids.length - 1}
              onToggle={() => save(ids.filter((item) => item !== id))}
              onUp={() => save(swap(ids, position, position - 1))}
              onDown={() => save(swap(ids, position, position + 1))}
            />
          )
        })}
        {more.map((tab) => (
          <Row
            key={tab.id}
            label={tab.label}
            detail="En Más"
            leading={<span className={[styles.icon, colors[`tone_${tab.template?.color ?? 'muted'}`]].join(' ')}>{tab.label.charAt(0)}</span>}
            on={false}
            canUp={false}
            canDown={false}
            onToggle={() => save([...ids, tab.id])}
            onUp={() => undefined}
            onDown={() => undefined}
          />
        ))}
      </div>
    </PanelLayout>
  )
}

export function StatsPanel() {
  const { bundle, close, run } = useWorld()
  const catalog = statCatalog(bundle)
  const byId = new Map(catalog.map((stat) => [stat.id, stat]))
  const ids = (bundle.world.stats ?? [...DEFAULT_WORLD_STATS]).filter((id) => byId.has(id))
  const save = (stats: string[]) => run(() => updateWorldAction(bundle.world.id, { stats }))
  const title = (label: string) => label.charAt(0).toUpperCase() + label.slice(1)

  return (
    <PanelLayout
      kicker="Personalizar"
      footer={
        <button type="button" className={panelStyles.primary} onClick={close}>
          Listo
        </button>
      }
    >
      <h2 id="world-panel-title" className={panelStyles.name}>
        Contadores
      </h2>
      <p className={styles.intro}>Elige qué contar arriba, junto al nombre del mundo, y en qué orden.</p>
      <div className={styles.list}>
        {ids.map((id, position) => {
          const stat = byId.get(id)!
          return (
            <Row
              key={id}
              label={title(stat.label)}
              detail="Se muestra"
              leading={<span className={styles.number}>{formatCount(stat.value)}</span>}
              on
              canUp={position > 0}
              canDown={position < ids.length - 1}
              onToggle={() => save(ids.filter((item) => item !== id))}
              onUp={() => save(swap(ids, position, position - 1))}
              onDown={() => save(swap(ids, position, position + 1))}
            />
          )
        })}
        {catalog
          .filter((stat) => !ids.includes(stat.id))
          .map((stat) => (
            <Row
              key={stat.id}
              label={title(stat.label)}
              detail="Oculto"
              leading={<span className={styles.number}>{formatCount(stat.value)}</span>}
              on={false}
              canUp={false}
              canDown={false}
              onToggle={() => save([...ids, stat.id])}
              onUp={() => undefined}
              onDown={() => undefined}
            />
          ))}
      </div>
    </PanelLayout>
  )
}
