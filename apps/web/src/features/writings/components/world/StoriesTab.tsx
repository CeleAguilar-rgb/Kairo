'use client'

import { STORY_STATUSES } from '@kairo/shared'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { LineIcon } from '@/components/ui/Card'
import { fadeUp, staggerList } from '@/lib/motion'

import { createChapterAction, createStoryAction, deleteStoryAction, updateStoryAction } from '../../story-actions'
import { PAGE_STATUS_LABEL, STORY_STATUS_LABEL, type PageRecord, type StoryRecord } from '../../types'
import { chapterStatusTone, pagesOfStory, plural, splitTitle } from '../../writing-utils'
import { displayName, eraLabel, kingdomOf, kingdomTone, placesOf, romanOf } from '../../world-utils'
import { Avatar } from '../Tone'
import colors from '../WritingColors.module.css'

import styles from './World.module.css'
import tab from './StoriesTab.module.css'
import { useDraft, useWorld } from './WorldContext'

// Mundo → Historias (EscritosHistoria.dc.html): las historias del mundo como tarjetas para elegir cuál ver, y de la
// elegida su portada, era y lugar, sus capítulos agrupados en arcos, sus protagonistas y su material. "Editar" cambia
// sus datos; un capítulo se abre en el editor de páginas (EscritosCapitulo), donde se elige su arco.
export function StoriesTab({ initialStoryId }: { initialStoryId: string | null }) {
  const { bundle, run } = useWorld()
  const [selected, setSelected] = useState(initialStoryId)
  const story = bundle.stories.find((item) => item.id === selected) ?? bundle.stories[0] ?? null

  function addStory() {
    run(() => createStoryAction({ title: 'Historia nueva', kind: 'story', summary: '', color: 'sand', wordGoal: null }, { worldId: bundle.world.id, status: 'idea' }), {
      onDone: (result) => result.id && setSelected(result.id),
    })
  }

  return (
    <motion.div className={tab.wrap} variants={staggerList(0.05)} initial="hidden" animate="show">
      <motion.div className={tab.cards} variants={fadeUp}>
        {bundle.stories.map((item) => {
          const on = item.id === story?.id
          return (
            <button key={item.id} type="button" className={[tab.card, on ? tab.cardOn : null].filter(Boolean).join(' ')} aria-pressed={on} onClick={() => setSelected(item.id)}>
              <span className={[tab.miniCover, item.status === 'idea' ? tab.miniCoverIdea : colors[`spine_${item.color}`]].join(' ')}>{item.title.trim().charAt(0).toUpperCase() || '?'}</span>
              <span className={tab.cardText}>
                <span className={tab.cardName}>{item.title}</span>
                <span className={styles.hint}>
                  {STORY_STATUS_LABEL[item.status]}
                  {eraShort(item) ? ` · ${eraShort(item)}` : ''}
                </span>
              </span>
            </button>
          )
        })}
        <button type="button" className={[tab.card, tab.cardAdd].join(' ')} onClick={addStory}>
          <LineIcon d="M12 5v14M5 12h14" size={16} strokeWidth={2} />
          Nueva historia
        </button>
      </motion.div>

      {story ? (
        <motion.div key={story.id} className={styles.split} variants={fadeUp}>
          <StoryMain story={story} />
          <aside className={styles.side}>
            <Material story={story} />
          </aside>
        </motion.div>
      ) : (
        <motion.div className={[styles.empty, styles.emptyDashed].join(' ')} variants={fadeUp}>
          <span>Todavía no hay historias en {bundle.world.name}. Crea la primera con “Nueva historia”: nace como idea hasta que la empieces.</span>
        </motion.div>
      )}
    </motion.div>
  )

  function eraShort(item: StoryRecord) {
    const position = bundle.eras.findIndex((era) => era.id === item.eraId)
    return position >= 0 ? `Era ${romanOf(position)}` : ''
  }
}

function StoryMain({ story }: { story: StoryRecord }) {
  const { bundle, index, open, run } = useWorld()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const save = (patch: Parameters<typeof updateStoryAction>[1]) => run(() => updateStoryAction(story.id, patch))
  const title = useDraft(story.title, (next) => next && save({ title: next }))
  const summary = useDraft(story.summary, (next) => save({ summary: next }))

  const eraPosition = bundle.eras.findIndex((era) => era.id === story.eraId)
  const place = story.placeId ? index.get(story.placeId) : undefined
  const chapters = pagesOfStory(story, bundle.chapters)
  const cast = story.cast.flatMap((id) => {
    const character = bundle.characters.find((item) => item.id === id)
    return character ? [character] : []
  })

  return (
    <section className={[styles.card, styles.grow, tab.main].join(' ')} aria-labelledby="world-story">
      <div className={tab.head}>
        <div className={[tab.cover, story.status === 'idea' ? tab.coverIdea : colors[`spine_${story.color}`]].join(' ')}>{story.title.trim().charAt(0).toUpperCase() || '?'}</div>
        <div className={tab.headText}>
          <div className={styles.chips}>
            <span className={[styles.tag, colors.tone_ink].join(' ')}>{STORY_STATUS_LABEL[story.status]}</span>
            {eraPosition >= 0 ? <span className={[styles.tag, colors.tone_warm].join(' ')}>{eraLabel(bundle.eras[eraPosition]!, eraPosition)}</span> : null}
            {place ? <span className={[styles.tag, colors.tone_soft].join(' ')}>{place.name}</span> : null}
          </div>
          {editing ? (
            <input className={[styles.input, tab.titleInput].join(' ')} type="text" value={title.value} maxLength={80} aria-label="Título" onChange={(event) => title.onChange(event.target.value)} onBlur={title.commit} />
          ) : (
            <h2 id="world-story" className={tab.title}>
              {story.title}
            </h2>
          )}
          {editing ? (
            <textarea className={[styles.input, styles.textarea].join(' ')} value={summary.value} maxLength={1000} placeholder="De qué trata" aria-label="De qué trata" onChange={(event) => summary.onChange(event.target.value)} onBlur={summary.commit} />
          ) : (
            <p className={styles.muted}>{story.summary || 'Sin sinopsis todavía.'}</p>
          )}
        </div>
        <button type="button" className={styles.ghost} onClick={() => setEditing((value) => !value)}>
          {editing ? 'Listo' : 'Editar'}
        </button>
      </div>

      {editing ? (
        <div className={tab.editGrid}>
          <label className={styles.field}>
            Estado
            <select className={styles.input} value={story.status} onChange={(event) => save({ status: event.target.value as StoryRecord['status'] })}>
              {STORY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STORY_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Era
            <select className={styles.input} value={story.eraId ?? ''} onChange={(event) => save({ eraId: event.target.value || null })}>
              <option value="">Sin era</option>
              {bundle.eras.map((era, position) => (
                <option key={era.id} value={era.id}>
                  {eraLabel(era, position)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Dónde pasa
            <select className={styles.input} value={story.placeId ?? ''} onChange={(event) => save({ placeId: event.target.value || null })}>
              <option value="">Sin lugar</option>
              {placesOf(bundle).map((note) => (
                <option key={note.id} value={note.id}>
                  {note.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={[styles.ghost, styles.ghostDanger].join(' ')}
            onClick={() => run(() => deleteStoryAction(story.id), { success: `Se borró "${story.title}"`, onDone: () => router.refresh() })}
          >
            Borrar historia
          </button>
        </div>
      ) : null}

      {story.status === 'idea' && !editing ? (
        <button type="button" className={tab.start} onClick={() => save({ status: 'in_progress' })}>
          Empezar historia
        </button>
      ) : null}

      <Chapters story={story} chapters={chapters} />

      <div className={styles.fsec}>
        <h3 className={tab.subtitle}>Protagonistas</h3>
        <div className={styles.chips}>
          {cast.map((character) => {
            const kingdom = kingdomOf(bundle, character)
            return (
              <span key={character.id} className={tab.lead}>
                <button type="button" className={tab.leadButton} onClick={() => open({ kind: 'entry', id: character.id, edit: false })}>
                  <Avatar initial={displayName({ kind: 'character', ...character }).charAt(0)} tone={kingdomTone(bundle, kingdom?.id ?? null)} size={40} imageUrl={character.imageUrl} />
                  <span className={tab.leadText}>
                    <span className={tab.leadName}>{displayName({ kind: 'character', ...character })}</span>
                    <span className={styles.hint}>{kingdom?.name ?? 'Personaje'}</span>
                  </span>
                </button>
                {editing ? (
                  <button type="button" className={[styles.iconButton, styles.iconButtonDanger].join(' ')} aria-label={`Quitar a ${character.name}`} onClick={() => save({ cast: story.cast.filter((id) => id !== character.id) })}>
                    <LineIcon d="M6 6l12 12M18 6L6 18" size={14} strokeWidth={2} />
                  </button>
                ) : null}
              </span>
            )
          })}
          {cast.length === 0 && !editing ? <span className={styles.muted}>Sin protagonistas todavía.</span> : null}
          {editing ? (
            <select className={styles.linkSelect} value="" aria-label="Agregar un personaje" onChange={(event) => event.target.value && save({ cast: [...story.cast, event.target.value] })}>
              <option value="">+ Personaje…</option>
              {bundle.characters
                .filter((character) => !story.cast.includes(character.id))
                .map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
            </select>
          ) : null}
        </div>
      </div>
    </section>
  )
}

const ARC_DOTS = ['arcInk', 'arcAccent', 'arcPeach', 'arcSage'] as const

// Los capítulos agrupados en arcos ("Sin arco" al final). El nombre de un arco se cambia ahí mismo; a qué arco va un
// capítulo se elige al abrirlo.
function Chapters({ story, chapters }: { story: StoryRecord; chapters: PageRecord[] }) {
  const { run } = useWorld()
  const router = useRouter()
  const arcIds = new Set(story.arcs.map((arc) => arc.id))
  const groups = [
    ...story.arcs.map((arc, position) => ({ id: arc.id, name: arc.name, dot: ARC_DOTS[position % ARC_DOTS.length]!, items: chapters.filter((page) => page.arcId === arc.id) })),
    { id: 'none', name: 'Sin arco', dot: 'arcNone' as const, items: chapters.filter((page) => !page.arcId || !arcIds.has(page.arcId)) },
  ].filter((group) => group.id !== 'none' || group.items.length > 0 || story.arcs.length === 0)

  const addArc = () => run(() => updateStoryAction(story.id, { arcs: [...story.arcs, { id: crypto.randomUUID(), name: `Arco ${story.arcs.length + 1}` }] }))
  const addChapter = () => run(() => createChapterAction(story.id, story.kind), { onDone: (result) => result.id && router.push(`/escritos/paginas/${result.id}`) })

  return (
    <div className={styles.fsec}>
      <div className={styles.row}>
        <h3 className={[tab.subtitle, styles.spacer].join(' ')}>Capítulos</h3>
        <button type="button" className={styles.ghost} onClick={addArc}>
          + Nuevo arco
        </button>
        <button type="button" className={styles.ghost} onClick={addChapter}>
          + Capítulo
        </button>
      </div>
      {chapters.length === 0 && story.arcs.length === 0 ? <div className={[styles.empty, styles.emptyDashed].join(' ')}>Todavía sin capítulos. Cuando empieces, puedes agruparlos en arcos.</div> : null}
      {groups.map((group) => (
        <div key={group.id} className={tab.arc}>
          <div className={styles.row}>
            <span className={[tab.arcDot, tab[group.dot]].join(' ')} />
            {group.id === 'none' ? <span className={[tab.arcName, styles.spacer].join(' ')}>{group.name}</span> : <ArcName story={story} arcId={group.id} name={group.name} />}
            <span className={styles.hint}>{plural(group.items.length, 'capítulo', 'capítulos')}</span>
            {group.id !== 'none' ? (
              <button type="button" className={[styles.iconButton, styles.iconButtonDanger].join(' ')} aria-label={`Quitar el arco ${group.name}`} onClick={() => run(() => updateStoryAction(story.id, { arcs: story.arcs.filter((arc) => arc.id !== group.id) }))}>
                <LineIcon d="M6 6l12 12M18 6L6 18" size={14} strokeWidth={2} />
              </button>
            ) : null}
          </div>
          {group.items.map((page) => {
            const { label, name } = splitTitle(page.title)
            return (
              <Link key={page.id} href={`/escritos/paginas/${page.id}`} className={tab.chapter}>
                <span className={tab.chapterNumber}>{label}</span>
                <span className={tab.chapterName}>{name}</span>
                <span className={[styles.tag, colors[`tone_${chapterStatusTone(page.status)}`]].join(' ')}>{PAGE_STATUS_LABEL[page.status]}</span>
              </Link>
            )
          })}
          {group.items.length === 0 ? <p className={styles.hint}>Sin capítulos. Abre uno y elige este arco.</p> : null}
        </div>
      ))}
    </div>
  )
}

function ArcName({ story, arcId, name }: { story: StoryRecord; arcId: string; name: string }) {
  const { run } = useWorld()
  const draft = useDraft(name, (next) => next && run(() => updateStoryAction(story.id, { arcs: story.arcs.map((arc) => (arc.id === arcId ? { ...arc, name: next.slice(0, 60) } : arc)) })))
  return <input className={[tab.arcInput, styles.spacer].join(' ')} type="text" value={draft.value} maxLength={60} aria-label={`Nombre del arco ${name}`} onChange={(event) => draft.onChange(event.target.value)} onBlur={draft.commit} />
}

// El material de la historia: enlaces a lo que la inspira (su página en Notion, una playlist…).
function Material({ story }: { story: StoryRecord }) {
  const { run } = useWorld()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !url.trim()) return
    run(() => updateStoryAction(story.id, { resources: [...story.resources, { id: crypto.randomUUID(), name: name.trim(), url: url.trim() }] }), {
      onDone: () => {
        setName('')
        setUrl('')
        setAdding(false)
      },
    })
  }

  return (
    <section className={styles.card} aria-labelledby="world-material">
      <h2 id="world-material" className={styles.h2}>
        Material de la historia
      </h2>
      {story.resources.length === 0 ? <p className={styles.muted}>Nada todavía. Agrega la página, borradores o una playlist.</p> : null}
      {story.resources.map((resource) => (
        <span key={resource.id} className={tab.resource}>
          <a className={tab.resourceLink} href={resource.url} target="_blank" rel="noopener noreferrer">
            <span className={[tab.resourceIcon, colors.tone_warm].join(' ')}>{resource.name.charAt(0).toUpperCase()}</span>
            <span className={styles.spacer}>{resource.name}</span>
            <LineIcon d="M14 4h6v6M20 4l-9 9" size={14} strokeWidth={2} />
          </a>
          <button type="button" className={[styles.iconButton, styles.iconButtonDanger].join(' ')} aria-label={`Quitar ${resource.name}`} onClick={() => run(() => updateStoryAction(story.id, { resources: story.resources.filter((item) => item.id !== resource.id) }))}>
            <LineIcon d="M6 6l12 12M18 6L6 18" size={14} strokeWidth={2} />
          </button>
        </span>
      ))}
      {adding ? (
        <form className={styles.stack} onSubmit={submit} noValidate>
          <label className={styles.field}>
            Nombre
            <input className={styles.input} type="text" value={name} maxLength={80} placeholder="Playlist en Spotify" onChange={(event) => setName(event.target.value)} />
          </label>
          <label className={styles.field}>
            Enlace
            <input className={styles.input} type="url" value={url} placeholder="https://" onChange={(event) => setUrl(event.target.value)} />
          </label>
          <span className={styles.row}>
            <button type="submit" className={styles.ghost}>
              Agregar
            </button>
            <button type="button" className={styles.ghost} onClick={() => setAdding(false)}>
              Cancelar
            </button>
          </span>
        </form>
      ) : (
        <button type="button" className={styles.ghost} onClick={() => setAdding(true)}>
          + Agregar enlace
        </button>
      )}
    </section>
  )
}
