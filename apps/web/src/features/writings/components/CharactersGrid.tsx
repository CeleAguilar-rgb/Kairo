'use client'

import { motion } from 'motion/react'
import Link from 'next/link'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { fadeUp, staggerList } from '@/lib/motion'

import type { CharacterChip } from '../types'

import { Avatar, Chip } from './Tone'
import styles from './CharactersGrid.module.css'

// Personajes (EscritosInicio, pestaña Personajes): una tarjeta por personaje con su círculo, su nombre y su reino.
// Tocar uno lo abre en la base de datos de personajes, donde se ven todos como tabla, galería o tablero.
export function CharactersGrid({ characters }: { characters: CharacterChip[] }) {
  const calm = useCalmEntry()

  if (characters.length === 0) {
    return (
      <EmptyState
        id="writings-characters-empty"
        title="Todavía no hay personajes"
        description="Los personajes de tus historias viven en una base de datos: nombre, reino, rol y lo que quieras agregar."
        doodle="heart"
        actions={
          <Link href="/escritos/personajes/tabla" className={styles.link}>
            Abrir la base de personajes
          </Link>
        }
      />
    )
  }

  return (
    <div className={styles.wrap}>
      <motion.div className={styles.grid} variants={staggerList(0.04, 0.05)} initial={calm ? false : 'hidden'} animate="show">
        {characters.map((character) => (
          <motion.div key={character.id} variants={fadeUp}>
            <Link href={`/escritos/personajes/tabla?abrir=${character.id}`} className={styles.card}>
              <Avatar initial={character.initial} tone={character.tone} size={64} />
              <span className={styles.name}>{character.shortName}</span>
              {character.kingdomLabel ? <Chip tone={character.tone}>{character.kingdomLabel}</Chip> : null}
            </Link>
          </motion.div>
        ))}
      </motion.div>
      <Link href="/escritos/personajes/tabla" className={styles.link}>
        Ver todos como tabla
      </Link>
    </div>
  )
}
