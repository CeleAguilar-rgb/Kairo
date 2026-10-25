'use client'

import { motion } from 'motion/react'
import { useState } from 'react'

import { LineIcon } from '@/components/ui/Card'
import { fadeUp, staggerList } from '@/lib/motion'

import { createCharacterAction, createWorldNoteAction } from '../../entry-actions'
import { characterGroups, characterPlace, displayName, filledSections, homeRegionOf, isDarkPlace, kingdomOf, kingdomTone, sectionEntries, speciesDoodleOf, templateByKey, templateOfEntry } from '../../world-utils'
import { plural } from '../../writing-utils'
import { Avatar } from '../Tone'

import styles from './World.module.css'
import tab from './EntryTabs.module.css'
import { SectionArt, sectionDoodleOf, SpeciesArt } from './WorldArt'
import { useWorld } from './WorldContext'

// Las pestañas que son una lista de fichas: Personajes (EscritosPersonaje), Especies (EscritosEspecie) y cada sección
// extra (EscritosMagia). Picar una tarjeta la abre en el panel; "+ Nuevo…" la crea y la abre en modo editar.

// Mundo → Personajes: filtros por reino y una tarjeta por personaje (foto o inicial del color de su reino).
export function CharactersTab({ initialGroup }: { initialGroup: string | null }) {
  const { bundle, open, run } = useWorld()
  const groups = characterGroups(bundle)
  const [group, setGroup] = useState(groups.some((item) => item.id === initialGroup) ? initialGroup! : 'all')
  const visible = bundle.characters.filter((character) => {
    if (group === 'all') return true
    const kingdom = kingdomOf(bundle, character)?.id ?? 'others'
    return kingdom === group
  })

  function add() {
    run(() => createCharacterAction(bundle.world.id, { name: 'Personaje nuevo' }), { onDone: (result) => result.id && open({ kind: 'entry', id: result.id, edit: true }) })
  }

  return (
    <motion.div className={tab.wrap} variants={staggerList(0.03)} initial="hidden" animate="show">
      <motion.div className={styles.row} variants={fadeUp}>
        <div className={[styles.chips, styles.spacer].join(' ')} role="group" aria-label="Filtrar personajes">
          {groups.map((item) => (
            <button key={item.id} type="button" className={[tab.filter, group === item.id ? tab.filterOn : null].filter(Boolean).join(' ')} aria-pressed={group === item.id} onClick={() => setGroup(item.id)}>
              {item.label}
              <span className={tab.filterCount}>{item.count}</span>
            </button>
          ))}
        </div>
        <button type="button" className={tab.addDark} onClick={add}>
          <LineIcon d="M12 5v14M5 12h14" size={16} strokeWidth={2} />
          Nuevo personaje
        </button>
      </motion.div>
      <div className={tab.people}>
        {visible.map((character) => {
          const kingdom = kingdomOf(bundle, character)
          return (
            <motion.button key={character.id} type="button" variants={fadeUp} className={tab.person} onClick={() => open({ kind: 'entry', id: character.id, edit: false })}>
              <Avatar initial={displayName({ kind: 'character', ...character }).charAt(0)} tone={kingdomTone(bundle, kingdom?.id ?? null)} size={44} imageUrl={character.imageUrl} />
              <span className={tab.personText}>
                <span className={tab.personName}>{displayName({ kind: 'character', ...character })}</span>
                <span className={styles.hint}>{characterPlace(bundle, character)}</span>
              </span>
            </motion.button>
          )
        })}
      </div>
      {bundle.characters.length === 0 ? (
        <div className={[styles.empty, styles.emptyDashed].join(' ')}>Todavía no hay personajes en {bundle.world.name}. Crea el primero con “Nuevo personaje”.</div>
      ) : null}
    </motion.div>
  )
}

// Mundo → Especies: una tarjeta por especie con su dibujo, su región y cuántas secciones lleva llenas. Las que viven
// en un lugar de noche (portada tinta, como Nocturnia) van en tarjeta oscura.
export function SpeciesTab() {
  const { bundle, open, run } = useWorld()
  const template = templateByKey(bundle, 'species')
  const species = template ? bundle.notes.filter((note) => note.templateId === template.id) : []

  function add() {
    if (!template) return
    run(() => createWorldNoteAction(bundle.world.id, { templateId: template.id, parentId: null, name: 'Especie nueva' }), { onDone: (result) => result.id && open({ kind: 'entry', id: result.id, edit: true }) })
  }

  return (
    <motion.div className={styles.grid} variants={staggerList(0.04)} initial="hidden" animate="show">
      {species.map((note) => {
        const entry = { kind: 'note' as const, ...note }
        const region = homeRegionOf(bundle, entry)
        const dark = isDarkPlace(region)
        const { filled, total } = filledSections(entry, template)
        return (
          <motion.button key={note.id} type="button" variants={fadeUp} className={[styles.tile, dark ? styles.tileDark : styles.tileLight, tab.tall].join(' ')} onClick={() => open({ kind: 'entry', id: note.id, edit: false })}>
            <span className={tab.tileTop}>
              <SpeciesArt kind={speciesDoodleOf(note.name)} ink={dark ? 'var(--text-on-inverted)' : 'var(--text)'} />
              <span className={[styles.tag, dark ? tab.tagDark : tab.tagWarm].join(' ')}>{region?.name ?? 'Sin región'}</span>
            </span>
            <span className={tab.tileName}>{note.name}</span>
            <span className={tab.tileText}>{note.summary || 'Sin descripción todavía.'}</span>
            {total > 0 ? <span className={[tab.tileFoot, dark ? tab.tileFootDark : null].filter(Boolean).join(' ')}>{`${filled} de ${plural(total, 'sección llena', 'secciones llenas')}`}</span> : null}
          </motion.button>
        )
      })}
      <motion.button type="button" variants={fadeUp} className={[styles.tile, styles.tileAdd, tab.tall].join(' ')} onClick={add}>
        <SpeciesArt kind="other" size={40} />
        Nueva especie
      </motion.button>
    </motion.div>
  )
}

// Mundo → una sección extra (Magia, Objetos…): sus notas como tarjetas, "Editar plantilla" y "+ Nueva nota".
export function SectionTab({ templateId }: { templateId: string }) {
  const { bundle, open, run } = useWorld()
  const template = bundle.templates.find((item) => item.id === templateId && !item.key)
  if (!template) return <div className={[styles.empty, styles.emptyDashed].join(' ')}>Esta sección ya no existe.</div>

  const entries = sectionEntries(bundle, template.id)
  const doodle = sectionDoodleOf(template.name)
  const dark = template.color === 'ink'

  function add() {
    run(() => createWorldNoteAction(bundle.world.id, { templateId: template!.id, parentId: null, name: 'Nota nueva' }), { onDone: (result) => result.id && open({ kind: 'entry', id: result.id, edit: true }) })
  }

  return (
    <motion.div className={tab.wrap} variants={staggerList(0.04)} initial="hidden" animate="show">
      <motion.div className={styles.row} variants={fadeUp}>
        <h2 className={tab.sectionTitle}>{template.name}</h2>
        <span className={styles.hint}>{plural(entries.length, 'nota', 'notas')}</span>
        <span className={styles.spacer} />
        <button type="button" className={styles.ghost} onClick={() => open({ kind: 'template', id: template.id, backEntryId: null })}>
          Editar plantilla
        </button>
        <button type="button" className={tab.addDark} onClick={add}>
          Nueva nota de {template.name.toLowerCase()}
        </button>
      </motion.div>
      <div className={styles.grid}>
        {entries.map((entry) => {
          const own = templateOfEntry(bundle, entry)?.id === template.id
          return (
            <motion.button key={entry.id} type="button" variants={fadeUp} className={[styles.tile, dark ? styles.tileDark : styles.tileLight, tab.mid].join(' ')} onClick={() => open({ kind: 'entry', id: entry.id, edit: false })}>
              <span className={tab.tileTop}>
                <SectionArt kind={own ? doodle : 'person'} ink={dark ? 'var(--text-on-inverted)' : 'var(--text)'} />
                {entry.draft ? <span className={[styles.tag, styles.tagDraft].join(' ')}>En borrador</span> : null}
              </span>
              <span className={tab.tileName}>{displayName(entry)}</span>
              <span className={tab.tileText}>{entry.summary || 'Sin resumen todavía.'}</span>
            </motion.button>
          )
        })}
      </div>
      {entries.length === 0 ? (
        <div className={[styles.empty, styles.emptyDashed].join(' ')}>
          <SectionArt kind={doodle} size={40} />
          <span>Todavía no hay nada en {template.name}. Edita la plantilla para decidir qué lleva cada nota y luego crea la primera.</span>
        </div>
      ) : null}
    </motion.div>
  )
}
