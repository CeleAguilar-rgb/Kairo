'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { useState } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { fadeUp, staggerList } from '@/lib/motion'

import type { CharactersTabView } from '../types'

import { Avatar } from './Tone'
import styles from './WorldCharacters.module.css'

// Personajes del mundo (Escritos.dc.html): filtros por reino, una lista de personajes y, a un lado, la ficha del
// elegido en una tarjeta oscura. Filtrar y elegir son cambios dentro de la misma pantalla.
export function WorldCharacters({ view }: { view: CharactersTabView }) {
  const calm = useCalmEntry()
  const [group, setGroup] = useState(view.initialGroup)
  const [selectedId, setSelectedId] = useState(view.initialCharacterId)

  if (view.characters.length === 0) {
    return (
      <EmptyState
        id="world-characters-empty"
        title="Todavía no hay personajes"
        description="Los personajes de este mundo viven en la base de personajes, con su reino, su rol y lo que quieras agregar."
        doodle="heart"
        actions={
          <Link href="/escritos/personajes/tabla" className={styles.link}>
            Abrir la base de personajes
          </Link>
        }
      />
    )
  }

  const shown = view.characters.filter((character) => group === 'all' || character.groupId === group)
  const current = view.characters.find((character) => character.id === selectedId) ?? shown[0] ?? view.characters[0]

  return (
    <motion.div className={styles.split} variants={staggerList(0.08, 0.05)} initial={calm ? false : 'hidden'} animate="show">
      <motion.div className={styles.grow} variants={fadeUp}>
        <div className={styles.filters} role="group" aria-label={`Filtrar personajes por ${view.groupLabel.toLowerCase()}`}>
          {view.groups.map((item) => (
            <button key={item.id} type="button" className={[styles.filter, group === item.id ? styles.filterOn : null].filter(Boolean).join(' ')} aria-pressed={group === item.id} onClick={() => setGroup(item.id)}>
              {item.label}
              <span className={styles.filterCount}>{item.count}</span>
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          {shown.map((character) => {
            const on = character.id === current.id
            return (
              <button key={character.id} type="button" className={[styles.character, on ? styles.characterOn : null].filter(Boolean).join(' ')} aria-pressed={on} onClick={() => setSelectedId(character.id)}>
                <Avatar initial={character.initial} tone={character.tone} size={40} />
                <span className={styles.characterText}>
                  <span className={styles.characterName}>{character.shortName}</span>
                  <span className={styles.characterPlace}>{character.placeText}</span>
                </span>
              </button>
            )
          })}
        </div>
        {shown.length === 0 ? <p className={styles.none}>Nadie en este grupo todavía.</p> : null}
      </motion.div>

      <motion.aside className={styles.sheet} variants={fadeUp} aria-labelledby="world-sheet">
        <div className={styles.sheetHead}>
          <Avatar initial={current.initial} tone={current.tone} size={64} />
          <div className={styles.sheetTitles}>
            <h2 id="world-sheet" className={styles.sheetName}>
              {current.name}
            </h2>
            <span className={styles.sheetMeta}>{current.metaText}</span>
          </div>
        </div>
        {current.tags.length > 0 ? (
          <div className={styles.tags}>
            {current.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <p className={styles.sheetText}>{current.description || 'Todavía no hay descripción. Escribe su ficha desde la base de personajes.'}</p>
        <Link href={`/escritos/personajes/tabla?abrir=${current.id}`} className={styles.open}>
          Abrir ficha
        </Link>
      </motion.aside>
    </motion.div>
  )
}
