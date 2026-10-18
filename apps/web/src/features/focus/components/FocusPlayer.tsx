'use client'

import { AnimatePresence, motion } from 'motion/react'

import { SPRING } from '@/lib/motion'

import { useFocus } from '../FocusContext'
import { FOCUS_MAX_SESSIONS, FOCUS_PLAYLISTS, FOCUS_PRESETS } from '../mock'

import styles from './FocusPlayer.module.css'

// La vuelta completa del anillo (2 * PI * radio), para el `stroke-dasharray`/
// `stroke-dashoffset` de un círculo que se va llenando. Los radios son los
// mismos del canvas: 88 en el panel, 18 en la píldora.
const PANEL_RING = 2 * Math.PI * 88
const PILL_RING = 2 * Math.PI * 18

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// El reproductor flotante (Reproductor.dc.html): un modo Enfoque (pomodoro) y
// uno Música (mock de Spotify — la integración real es fase posterior). Lee
// todo de useFocus(), así que puede abrirse desde otras pantallas (el botón
// "Pomodoro" del detalle de tarea) sin perder lo que ya estaba corriendo.
export function FocusPlayer() {
  const focus = useFocus()
  const { timer, mode, setMode, expanded, setExpanded, task, cycleTask, withMusic, toggleWithMusic, song, playing, togglePlay, nextSong, prevSong, playPlaylist } = focus
  const { state, reset, skipToBreak, choosePreset, toggleRun } = timer

  const preset = FOCUS_PRESETS[state.presetIndex]
  const totalSeconds = (state.phase === 'work' ? preset.workMinutes : preset.breakMinutes) * 60
  const fractionDone = totalSeconds === 0 ? 0 : 1 - state.secondsLeft / totalSeconds
  const clock = formatClock(state.secondsLeft)

  const phaseText =
    state.phase === 'break'
      ? 'Descanso'
      : state.running
        ? `Enfoque · ${state.sessionsToday + 1} de ${FOCUS_MAX_SESSIONS}`
        : state.secondsLeft === 0
          ? '¡Listo! Toca para descansar'
          : 'En pausa'

  // La píldora muestra el pomodoro cuando ese es el modo elegido, o cuando
  // sigue corriendo aunque hayas cambiado a la pestaña Música mientras tanto
  // (Reproductor.dc.html: pillFocus).
  const pillFocus = mode === 'focus' || state.running
  const pillTitle = pillFocus ? `${clock} · ${task}` : song.title
  const pillSub = pillFocus ? (playing ? `♪ ${song.title} · ${song.playlist}` : state.running ? 'Enfoque' : 'Enfoque en pausa') : `${song.playlist} · Spotify`
  const pillActionPlaying = pillFocus ? state.running : playing

  return (
    <div className={styles.dock}>
      <AnimatePresence>
        {expanded ? (
          <motion.section
            className={styles.panel}
            role="dialog"
            aria-label="Música y enfoque"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: SPRING.panel }}
            exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
            style={{ transformOrigin: 'bottom right' }}
          >
            <div className={styles.panelHead}>
              <div className={styles.modeTabs} role="tablist" aria-label="Modo">
                <button type="button" role="tab" aria-selected={mode === 'music'} className={mode === 'music' ? styles.modeTabSelected : styles.modeTab} onClick={() => setMode('music')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  </svg>
                  Música
                </button>
                <button type="button" role="tab" aria-selected={mode === 'focus'} className={mode === 'focus' ? styles.modeTabSelected : styles.modeTab} onClick={() => setMode('focus')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 13a8 8 0 1 0 0-.1M12 9v4l2 2M10 2h4" />
                  </svg>
                  Enfoque
                </button>
              </div>
              <button type="button" className={styles.iconButton} aria-label="Minimizar" onClick={() => setExpanded(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            {mode === 'focus' ? (
              <>
                <div className={styles.ringWrap}>
                  <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
                    <circle cx="80" cy="80" r="70" fill="none" className={styles.ringTrack} strokeWidth="10" />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      className={state.phase === 'work' ? styles.ringWork : styles.ringBreak}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={PANEL_RING}
                      strokeDashoffset={PANEL_RING * (1 - fractionDone)}
                      transform="rotate(-90 80 80)"
                    />
                  </svg>
                  <div className={styles.ringCenter}>
                    <span className={styles.clock} role="timer" aria-live="off">
                      {clock}
                    </span>
                    <span className={styles.phase}>{phaseText}</span>
                  </div>
                </div>

                <div className={styles.dots} aria-label={`${state.sessionsToday} de ${FOCUS_MAX_SESSIONS} sesiones hechas hoy`}>
                  {Array.from({ length: FOCUS_MAX_SESSIONS }, (_, index) => (
                    <span
                      key={index}
                      className={index < state.sessionsToday ? styles.dotDone : index === state.sessionsToday ? styles.dotCurrent : styles.dotPending}
                    />
                  ))}
                </div>

                <button type="button" className={styles.taskButton} onClick={cycleTask}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="4" width="16" height="16" rx="4" />
                    <path d="M8.5 12l2.5 2.5 4.5-5" />
                  </svg>
                  <span className={styles.taskText}>
                    <span className={styles.taskLabel}>Enfocado en</span>
                    <span className={styles.taskName}>{task}</span>
                  </span>
                  <span className={styles.taskChange}>Cambiar</span>
                </button>

                <div role="radiogroup" aria-label="Duración" className={styles.presets}>
                  {FOCUS_PRESETS.map((p, index) => (
                    <button
                      key={index}
                      type="button"
                      role="radio"
                      aria-checked={state.presetIndex === index}
                      className={state.presetIndex === index ? styles.presetSelected : styles.preset}
                      onClick={() => choosePreset(index)}
                    >
                      <span className={styles.presetMinutes}>{p.workMinutes} min</span>
                      <span className={styles.presetBreak}>{p.breakMinutes} de descanso</span>
                    </button>
                  ))}
                </div>

                <div className={styles.controls}>
                  <button type="button" className={styles.iconButton} aria-label="Reiniciar" onClick={reset}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" />
                    </svg>
                  </button>
                  <button type="button" className={styles.playButton} aria-label={state.running ? 'Pausar' : 'Empezar'} onClick={toggleRun}>
                    {state.running ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <rect x="6" y="5" width="4" height="14" rx="1.5" />
                        <rect x="14" y="5" width="4" height="14" rx="1.5" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z" />
                      </svg>
                    )}
                  </button>
                  <button type="button" className={styles.iconButton} aria-label="Saltar al descanso" onClick={skipToBreak}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 5l9 7-9 7zM18 5v14" />
                    </svg>
                  </button>
                </div>

                <div className={styles.musicToggleRow}>
                  <button type="button" role="switch" aria-checked={withMusic} aria-label="Poner música al empezar" className={withMusic ? styles.switchOn : styles.switch} onClick={toggleWithMusic}>
                    <span className={styles.switchKnob} />
                  </button>
                  <span>Poner &ldquo;Para enfocarme&rdquo; al empezar</span>
                </div>
              </>
            ) : (
              <>
                <div className={styles.musicHead}>
                  <div className={styles.art} />
                  <div className={styles.musicInfo}>
                    <span className={styles.device}>{playing ? 'Sonando en tu celular' : 'En pausa · tu celular'}</span>
                    <span className={styles.songTitle}>{song.title}</span>
                    <span className={styles.songArtist}>{song.playlist}</span>
                  </div>
                </div>

                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: '44%' }} />
                </div>

                <div className={styles.controls}>
                  <button type="button" className={styles.iconButton} aria-label="Canción anterior" onClick={prevSong}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18 5v14l-10-7zM6 5h2v14H6z" />
                    </svg>
                  </button>
                  <button type="button" className={styles.playButton} aria-label={playing ? 'Pausar música' : 'Reproducir música'} onClick={togglePlay}>
                    {playing ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <rect x="6" y="5" width="4" height="14" rx="1.5" />
                        <rect x="14" y="5" width="4" height="14" rx="1.5" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z" />
                      </svg>
                    )}
                  </button>
                  <button type="button" className={styles.iconButton} aria-label="Siguiente canción" onClick={nextSong}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M6 5v14l10-7zM16 5h2v14h-2z" />
                    </svg>
                  </button>
                </div>

                <div className={styles.playlists}>
                  <span className={styles.playlistsLabel}>Tus listas</span>
                  {FOCUS_PLAYLISTS.map((playlist, index) => (
                    <button key={playlist.name} type="button" className={styles.playlist} onClick={() => playPlaylist(index)}>
                      <span className={styles.playlistCover} />
                      <span className={styles.playlistText}>
                        <span className={styles.playlistName}>{playlist.name}</span>
                        <span className={styles.playlistDescription}>{playlist.description}</span>
                      </span>
                    </button>
                  ))}
                </div>

                <span className={styles.spotifyNote}>Controla Spotify en tu celular o compu. Requiere Spotify Premium.</span>
              </>
            )}
          </motion.section>
        ) : null}
      </AnimatePresence>

      <button type="button" className={styles.pill} aria-expanded={expanded} aria-label={`${expanded ? 'Ocultar' : 'Abrir'} música y enfoque`} onClick={() => setExpanded(!expanded)}>
        {pillFocus ? (
          <span className={styles.pillRingWrap}>
            <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="18" fill="none" className={styles.ringTrack} strokeWidth="5" />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                className={styles.ringWork}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={PILL_RING}
                strokeDashoffset={PILL_RING * (1 - fractionDone)}
                transform="rotate(-90 22 22)"
              />
            </svg>
          </span>
        ) : (
          <span className={styles.pillArt} />
        )}
        <span className={styles.pillText}>
          <span className={styles.pillTitle}>{pillTitle}</span>
          <span className={styles.pillSub}>{pillSub}</span>
        </span>
        <span className={styles.pillAction} aria-hidden="true">
          {pillActionPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1.5" />
              <rect x="14" y="5" width="4" height="14" rx="1.5" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z" />
            </svg>
          )}
        </span>
      </button>
    </div>
  )
}
