'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { Button } from '@/components/ui/Button'
import { Card, LineIcon } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { fadeUp, staggerList } from '@/lib/motion'

import { startIdeaAction } from '../world-actions'
import type { StoriesTabView } from '../types'
import { WRITING_ICON } from '../writing-meta'

import { Avatar, Chip } from './Tone'
import styles from './WorldStories.module.css'
import colors from './WritingColors.module.css'

// Historias del mundo (Escritos.dc.html): la historia con su lomo, su era y su región, sus capítulos y sus
// protagonistas; al lado el material de la historia y la próxima historia por escribir ("Empezar historia" la
// convierte en una historia de verdad). Con varias historias se elige cuál ver.
export function WorldStories({ view }: { view: StoriesTabView }) {
  const calm = useCalmEntry()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState(view.stories[0]?.id ?? null)

  const story = view.stories.find((item) => item.id === selectedId) ?? view.stories[0] ?? null

  function startIdea(ideaId: string, title: string) {
    startTransition(async () => {
      const result = await startIdeaAction(view.worldId, ideaId)
      if (!result.ok) {
        toast.show({ message: result.message ?? 'No se pudo empezar la historia.', icon: 'info' })
        return
      }
      if (result.id) setSelectedId(result.id)
      toast.show({ message: `Empezaste "${title}".`, icon: 'check' })
    })
  }

  if (!story && view.ideas.length === 0) {
    return <EmptyState id="world-stories-empty" title="Todavía no hay historias" description="Las historias de este mundo aparecen aquí con sus capítulos. Empieza una desde Escritos." doodle="spiral" />
  }

  return (
    <motion.div className={styles.stack} variants={staggerList(0.08, 0.05)} initial={calm ? false : 'hidden'} animate="show">
      {view.stories.length > 1 ? (
        <motion.div variants={fadeUp}>
          <Segmented label="Historia" value={story?.id ?? ''} onChange={setSelectedId} options={view.stories.map((item) => ({ value: item.id, label: item.title }))} />
        </motion.div>
      ) : null}

      <div className={styles.split}>
        {story ? (
          <motion.div className={styles.grow} variants={fadeUp}>
            <Card as="section" className={styles.card} aria-labelledby="world-story">
              <div className={styles.top}>
                <div className={[styles.spine, colors[`spine_${story.color}`]].join(' ')} aria-hidden="true">
                  {story.initial}
                </div>
                <div className={styles.topText}>
                  <div className={styles.chips}>
                    {story.eraLabel ? <Chip tone="warm">{story.eraLabel}</Chip> : null}
                    {story.regionName ? <Chip tone="soft">{story.regionName}</Chip> : null}
                  </div>
                  <h2 id="world-story" className={styles.title}>
                    {story.title}
                  </h2>
                  {story.summary ? <p className={styles.summary}>{story.summary}</p> : null}
                </div>
              </div>

              <div className={styles.list}>
                <h3 className={styles.subtitle}>Capítulos</h3>
                {story.chapters.map((chapter) => (
                  <Link key={chapter.id} href={`/escritos/paginas/${chapter.id}`} className={styles.row}>
                    <span className={styles.rowLabel}>{chapter.label}</span>
                    <span className={styles.rowTitle}>{chapter.title}</span>
                    <Chip tone={chapter.chipTone}>{chapter.chipText}</Chip>
                  </Link>
                ))}
                {story.chapters.length === 0 ? <p className={styles.noRows}>Esta historia todavía no tiene capítulos.</p> : null}
              </div>

              {story.leads.length > 0 ? (
                <div className={styles.people}>
                  <h3 className={styles.subtitle}>Protagonistas</h3>
                  <div className={styles.chips}>
                    {story.leads.map((lead) => (
                      <Link key={lead.id} href={`/escritos/personajes/tabla?abrir=${lead.id}`} className={styles.person}>
                        <Avatar initial={lead.initial} tone={lead.tone} size={40} />
                        <span className={styles.personText}>
                          <span className={styles.personName}>{lead.shortName}</span>
                          <span className={styles.personPlace}>{lead.kingdomLabel}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
          </motion.div>
        ) : null}

        <motion.aside className={styles.side} variants={fadeUp} aria-label="Material e ideas">
          {story && story.resources.length > 0 ? (
            <Card as="section" className={styles.resources} aria-labelledby="world-resources">
              <h2 id="world-resources" className={styles.cardTitle}>
                Material de la historia
              </h2>
              {story.resources.map((resource) => (
                <a key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  <span className={[styles.linkIcon, colors[`tone_${resource.tone}`]].join(' ')} aria-hidden="true">
                    {resource.initial}
                  </span>
                  <span className={styles.linkName}>{resource.name}</span>
                  <LineIcon d="M14 4h6v6M20 4l-9 9" size={14} strokeWidth={2} />
                </a>
              ))}
            </Card>
          ) : null}

          {view.ideas.map((idea) => (
            <section key={idea.id} className={styles.idea}>
              <span className={styles.ideaKicker}>Próxima historia{idea.eraLabel ? ` · ${idea.eraLabel}` : ''}</span>
              <span className={styles.ideaTitle}>{idea.title}</span>
              <span className={styles.ideaSummary}>{idea.summary}</span>
              <Button disabled={pending} onClick={() => startIdea(idea.id, idea.title)}>
                <LineIcon d={WRITING_ICON.plus} size={14} strokeWidth={2.2} />
                Empezar historia
              </Button>
            </section>
          ))}
        </motion.aside>
      </div>
    </motion.div>
  )
}
