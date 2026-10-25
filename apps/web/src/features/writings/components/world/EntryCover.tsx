'use client'

import { COVER_COLORS, type CoverColor } from '@kairo/shared'

import { LineIcon } from '@/components/ui/Card'

import { confirmEntryUploadAction, signEntryUploadAction, updateEntryAction } from '../../entry-actions'
import type { Entry } from '../../types'
import { homeRegionOf, isDarkPlace, placesOf, speciesDoodleOf, templateOfEntry } from '../../world-utils'

import styles from './EntryCover.module.css'
import { RegionArt, SectionArt, sectionDoodleOf, SpeciesArt } from './WorldArt'
import { useWorld } from './WorldContext'
import { useImageUpload } from './useImageUpload'

const COLOR_LABEL: Record<CoverColor, string> = { sand: 'arena', lavender_soft: 'lavanda suave', lavender: 'lavanda', sage: 'salvia', peach: 'calabaza', ink: 'tinta' }

// La portada de la página completa de una ficha (EscritosPortada.dc.html): el dibujo automático de su tipo (el
// paisaje de una región, el dibujo de una especie o de su sección), un color de la paleta, una imagen subida que se
// puede subir o bajar dentro de la franja, o ninguna. `editing` muestra la barra para cambiarla.
export function EntryCover({ entry, editing }: { entry: Entry; editing: boolean }) {
  const { bundle, run } = useWorld()
  const cover = entry.cover
  const upload = useImageUpload({
    sign: (file) => signEntryUploadAction(entry.kind, entry.id, 'cover', file),
    confirm: (path) => confirmEntryUploadAction(entry.kind, entry.id, 'cover', path),
    success: 'Portada guardada.',
  })
  const setCover = (patch: Partial<{ mode: typeof cover.mode; color: CoverColor | null; position: number }>) =>
    run(() => updateEntryAction(entry.kind, entry.id, { cover: { mode: cover.mode, color: cover.color, position: cover.position, ...patch } }))

  if (cover.mode === 'none') {
    return editing ? (
      <button type="button" className={styles.addCover} onClick={() => setCover({ mode: 'auto', color: null })}>
        <LineIcon d={['M3 5h18v14H3z', 'M3 16l5-5 4 4 3-3 6 6']} size={16} />
        Agregar portada
      </button>
    ) : null
  }

  const isRegion = entry.kind === 'note' && placesOf(bundle).some((note) => note.id === entry.id) && !entry.parentId
  const tall = cover.mode === 'image' || (cover.mode === 'auto' && isRegion)

  return (
    <div className={[styles.band, tall ? styles.tall : null, cover.mode === 'color' && cover.color ? styles[`color_${cover.color}`] : null, cover.mode === 'auto' ? autoClass() : null].filter(Boolean).join(' ')}>
      {cover.mode === 'image' && cover.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL firmada de corta duración, no un asset que next/image deba optimizar
        <img src={cover.url} alt="" className={[styles.image, styles[`position_${cover.position}`]].join(' ')} />
      ) : null}
      {cover.mode === 'auto' ? <AutoArt entry={entry} isRegion={isRegion} /> : null}

      {editing ? (
        <div className={styles.bar} role="group" aria-label="Portada">
          <button type="button" className={styles.barButton} disabled={upload.uploading} onClick={upload.pick}>
            <LineIcon d={['M3 5h18v14H3z', 'M3 16l5-5 4 4 3-3 6 6']} size={16} />
            {upload.uploading ? 'Subiendo…' : cover.mode === 'image' ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
          {cover.mode === 'image' ? (
            <>
              <button type="button" className={styles.barIcon} disabled={cover.position === 0} aria-label="Mover la imagen hacia arriba" onClick={() => setCover({ position: cover.position - 1 })}>
                <LineIcon d="M12 19V5M6 11l6-6 6 6" size={16} strokeWidth={2} />
              </button>
              <button type="button" className={styles.barIcon} disabled={cover.position === 2} aria-label="Mover la imagen hacia abajo" onClick={() => setCover({ position: cover.position + 1 })}>
                <LineIcon d="M12 5v14M6 13l6 6 6-6" size={16} strokeWidth={2} />
              </button>
            </>
          ) : null}
          {COVER_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={[styles.swatch, styles[`color_${color}`], cover.mode === 'color' && cover.color === color ? styles.swatchOn : null].filter(Boolean).join(' ')}
              aria-label={`Portada color ${COLOR_LABEL[color]}`}
              aria-pressed={cover.mode === 'color' && cover.color === color}
              onClick={() => setCover({ mode: 'color', color })}
            />
          ))}
          {cover.mode !== 'auto' ? (
            <button type="button" className={styles.barButton} onClick={() => setCover({ mode: 'auto', color: null })}>
              Dibujo
            </button>
          ) : null}
          <button type="button" className={styles.barButton} onClick={() => setCover({ mode: 'none', color: null })}>
            Quitar
          </button>
        </div>
      ) : null}
    </div>
  )

  // El fondo del dibujo automático: oscuro para lo que vive de noche, el color de su plantilla para lo demás.
  function autoClass() {
    const template = templateOfEntry(bundle, entry)
    const night = isDarkPlace(entry.kind === 'note' ? entry : null) || (template?.key === 'species' && isDarkPlace(homeRegionOf(bundle, entry)))
    if (night) return styles.autoNight
    if (template?.key === 'character') return styles.auto_warm
    return styles[`auto_${template?.color ?? 'muted'}`]
  }
}

function AutoArt({ entry, isRegion }: { entry: Entry; isRegion: boolean }) {
  const { bundle } = useWorld()
  const template = templateOfEntry(bundle, entry)
  if (isRegion && entry.kind === 'note') return <RegionArt dark={isDarkPlace(entry)} className={styles.region} />
  const ink = 'var(--text)'
  let art
  if (template?.key === 'species') art = <SpeciesArt kind={speciesDoodleOf(entry.name)} size={120} ink={isDarkPlace(homeRegionOf(bundle, entry)) ? 'var(--text-on-inverted)' : ink} />
  else if (template?.key === 'character') art = <SectionArt kind="person" size={120} />
  else if (template?.key === 'place') art = <SectionArt kind="place" size={120} />
  else art = <SectionArt kind={sectionDoodleOf(template?.name ?? '')} size={120} ink={template?.color === 'ink' ? 'var(--text-on-inverted)' : ink} />
  return <div className={styles.doodle}>{art}</div>
}

