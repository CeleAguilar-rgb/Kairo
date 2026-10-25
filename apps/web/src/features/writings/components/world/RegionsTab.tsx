'use client'

import { PLACE_TYPE_KINGDOM, PLACE_TYPE_REGION } from '@kairo/shared'
import { motion } from 'motion/react'

import { LineIcon } from '@/components/ui/Card'
import { fadeUp, staggerList } from '@/lib/motion'

import { createWorldNoteAction } from '../../entry-actions'
import { confirmMapUploadAction, signMapUploadAction } from '../../world-actions'
import type { NoteRecord } from '../../types'
import { plural } from '../../writing-utils'
import { childrenOf, fieldByKey, isDarkPlace, kingdomOf, otherTopPlaces, placeAndInside, placeTypeOf, regionsOf, templateByKey } from '../../world-utils'

import styles from './World.module.css'
import tab from './RegionsTab.module.css'
import { RegionArt } from './WorldArt'
import { useWorld } from './WorldContext'
import { useImageUpload } from './useImageUpload'

// Mundo → Regiones (EscritosRegion.dc.html): una tarjeta por región con su paisaje (de noche si su portada es tinta),
// de qué trata, sus reinos (con cuántos personajes) y quién vive ahí; "Ver detalles" la abre en el panel. Los
// lugares de primer nivel que no son región (La Muralla) van arriba como "otros lugares". Abajo, el mapa.
export function RegionsTab() {
  const { bundle, open, run, go } = useWorld()
  const regions = regionsOf(bundle)
  const others = otherTopPlaces(bundle)
  const placeTemplate = templateByKey(bundle, 'place')

  function addRegion() {
    if (!placeTemplate) return
    run(() => createWorldNoteAction(bundle.world.id, { templateId: placeTemplate.id, parentId: null, name: 'Región nueva' }), {
      onDone: (result) => result.id && open({ kind: 'entry', id: result.id, edit: true }),
    })
  }

  return (
    <motion.div className={tab.wrap} variants={staggerList(0.05)} initial="hidden" animate="show">
      <motion.div className={styles.row} variants={fadeUp}>
        <span className={[styles.hint, styles.spacer].join(' ')}>Toca una región o un reino para ver sus detalles.</span>
        {others.map((place) => (
          <button key={place.id} type="button" className={[styles.chip, styles.chipDashed].join(' ')} onClick={() => go({ kind: 'entry', id: place.id })}>
            {place.name}
            {place.draft ? ' · borrador' : ''}
          </button>
        ))}
        <button type="button" className={tab.add} onClick={addRegion}>
          <LineIcon d="M12 5v14M5 12h14" size={16} strokeWidth={2} />
          Nueva región
        </button>
      </motion.div>

      <div className={tab.grid}>
        {regions.map((region) => (
          <motion.div key={region.id} variants={fadeUp}>
            <RegionCard region={region} />
          </motion.div>
        ))}
        {regions.length === 0 ? (
          <motion.div variants={fadeUp} className={[styles.empty, styles.emptyDashed].join(' ')}>
            <span>Todavía no hay regiones. Pícale a “Nueva región” para crear la primera; adentro puedes poner reinos, bosques o castillos.</span>
          </motion.div>
        ) : null}
        <motion.div variants={fadeUp} className={tab.fullRow}>
          <MapCard />
        </motion.div>
      </div>
    </motion.div>
  )
}

function RegionCard({ region }: { region: NoteRecord }) {
  const { bundle, open } = useWorld()
  const dark = isDarkPlace(region)
  const kingdoms = childrenOf(bundle, region.id).filter((note) => placeTypeOf(bundle, note) === PLACE_TYPE_KINGDOM)
  const otherKids = childrenOf(bundle, region.id).filter((note) => placeTypeOf(bundle, note) !== PLACE_TYPE_KINGDOM)

  // Quién vive aquí: lo que dice "Quién vive" de la región y las especies que viven en ella o en sus lugares.
  const lives = templateByKey(bundle, 'place')?.fields.find((field) => field.type === 'link' && /viv/i.test(field.name))
  const home = fieldByKey(templateByKey(bundle, 'species'), 'home')
  const inside = placeAndInside(bundle, region.id)
  const peopleIds = new Set<string>([...(lives && Array.isArray(region.values[lives.id]) ? (region.values[lives.id] as string[]) : [])])
  for (const note of bundle.notes) {
    const homes = home && Array.isArray(note.values[home.id]) ? (note.values[home.id] as string[]) : []
    if (homes.some((id) => inside.has(id))) peopleIds.add(note.id)
  }
  const peoples = bundle.notes.filter((note) => peopleIds.has(note.id))
  const charactersIn = (kingdomId: string) => bundle.characters.filter((character) => kingdomOf(bundle, character)?.id === kingdomId).length

  return (
    <section className={[tab.region, dark ? tab.regionDark : null].filter(Boolean).join(' ')} aria-labelledby={`region-${region.id}`}>
      <RegionArt dark={dark} className={tab.art} />
      <div className={tab.body}>
        <div className={tab.titleRow}>
          <h2 id={`region-${region.id}`} className={tab.name}>
            {region.name}
          </h2>
          {placeTypeOf(bundle, region) !== PLACE_TYPE_REGION ? <span className={tab.kind}>Lugar</span> : null}
        </div>
        {region.summary ? <p className={tab.description}>{region.summary}</p> : <p className={tab.description}>Sin descripción todavía.</p>}
        {kingdoms.length > 0 ? (
          <>
            <h3 className={tab.subtitle}>Reinos</h3>
            <div className={tab.kingdoms}>
              {kingdoms.map((kingdom) => (
                <button key={kingdom.id} type="button" className={tab.kingdom} onClick={() => open({ kind: 'entry', id: kingdom.id, edit: false })}>
                  <span className={tab.kingdomName}>{kingdom.name}</span>
                  <span className={tab.kingdomCount}>{plural(charactersIn(kingdom.id), 'personaje', 'personajes')}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}
        {otherKids.length > 0 ? (
          <div className={styles.chips}>
            {otherKids.map((kid) => (
              <button key={kid.id} type="button" className={[styles.chip, dark ? tab.chipDark : styles.chipNeutral].join(' ')} onClick={() => open({ kind: 'entry', id: kid.id, edit: false })}>
                {kid.name}
              </button>
            ))}
          </div>
        ) : null}
        {peoples.length > 0 ? (
          <div className={styles.chips}>
            {peoples.map((people) => (
              <button key={people.id} type="button" className={[styles.chip, dark ? tab.chipDark : null].filter(Boolean).join(' ')} onClick={() => open({ kind: 'entry', id: people.id, edit: false })}>
                {people.name}
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" className={dark ? tab.detailsLight : tab.details} onClick={() => open({ kind: 'entry', id: region.id, edit: false })}>
          Ver detalles
        </button>
      </div>
    </section>
  )
}

// "Aquí va tu mapa épico": se sube como imagen (dos pasos con URL firmada) y se ve en grande.
function MapCard() {
  const { bundle } = useWorld()
  const upload = useImageUpload({
    sign: (file) => signMapUploadAction(bundle.world.id, file),
    confirm: (path) => confirmMapUploadAction(bundle.world.id, path),
    success: 'Mapa guardado.',
  })
  if (bundle.world.mapUrl) {
    return (
      <section className={tab.mapFull} aria-label="Mapa">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de corta duración, no un asset que next/image deba optimizar */}
        <img src={bundle.world.mapUrl} alt={`Mapa de ${bundle.world.name}`} className={tab.mapImage} />
        <button type="button" className={tab.mapChange} disabled={upload.uploading} onClick={upload.pick}>
          {upload.uploading ? 'Subiendo…' : 'Cambiar mapa'}
        </button>
      </section>
    )
  }
  return (
    <section className={tab.map} aria-label="Mapa">
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
        <path d="M9 4v14M15 6v14" />
      </svg>
      <span className={tab.mapTitle}>Aquí va tu mapa épico</span>
      <span>Súbelo como imagen: se queda aquí, a la mano, para ver dónde queda cada lugar.</span>
      <button type="button" className={tab.details} disabled={upload.uploading} onClick={upload.pick}>
        {upload.uploading ? 'Subiendo…' : 'Subir mapa'}
      </button>
    </section>
  )
}
