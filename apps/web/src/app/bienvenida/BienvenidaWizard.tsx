'use client'

import type { ModuleId } from '@kairo/shared'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { completeOnboarding } from '@/lib/account/actions'
import { AVATARS } from '@/lib/account/avatars'
import { MODULE_CATALOG } from '@/lib/modules/catalog'
import styles from './BienvenidaWizard.module.css'

const TOTAL_STEPS = 3
const EASE = [0.3, 0.7, 0.2, 1] as const

export function BienvenidaWizard() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [avatarId, setAvatarId] = useState<string>('star')
  const [selected, setSelected] = useState<Set<ModuleId>>(new Set())
  const [noneError, setNoneError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string>()

  const nameError =
    nameTouched && !name.trim()
      ? 'Escribe tu nombre o un apodo para seguir.'
      : undefined
  const firstName = name.trim().split(' ')[0] ?? ''
  const chosenNames = MODULE_CATALOG.filter((section) =>
    selected.has(section.id),
  ).map((section) => section.name)

  function toggleSection(id: ModuleId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setNoneError(false)
  }

  function handleBack() {
    setStep((current) => Math.max(1, current - 1))
    setNoneError(false)
  }

  async function handleNext() {
    if (step === 1) {
      if (!name.trim()) {
        setNameTouched(true)
        return
      }
      setStep(2)
      return
    }

    if (step === 2) {
      if (selected.size === 0) {
        setNoneError(true)
        return
      }
      setStep(3)
      return
    }

    setSubmitting(true)
    setFormError(undefined)
    const result = await completeOnboarding({
      name: name.trim(),
      avatarPath: avatarId,
      sections: Array.from(selected),
    })
    setSubmitting(false)
    if (result?.error) setFormError(result.error)
  }

  return (
    <div className={styles.box}>
      <div className={styles.topRow}>
        <span className={styles.logo}>
          <svg
            width="30"
            height="30"
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M 50 16 A 34 34 0 1 1 16 50"
              style={{ stroke: 'var(--text)' }}
              strokeWidth="12"
              strokeLinecap="round"
            />
            <circle
              cx="26"
              cy="26"
              r="9"
              style={{ fill: 'var(--accent)', stroke: 'var(--text)' }}
              strokeWidth="3.5"
            />
          </svg>
          kairo
        </span>
        <div
          className={styles.dots}
          role="progressbar"
          aria-label="Paso de la bienvenida"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step}
        >
          {[1, 2, 3].map((dot) => (
            <span
              key={dot}
              className={dot <= step ? styles.dotActive : styles.dot}
              style={{ width: dot === step ? '28px' : '8px' }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <Card aria-labelledby="b-t1">
              <div className={styles.heading}>
                <span className={styles.hint}>Paso 1 de {TOTAL_STEPS}</span>
                <h1 id="b-t1" className={styles.title}>
                  ¡Hola! ¿Cómo te llamas?
                </h1>
                <p className={styles.subtitle}>
                  Así te saludamos en tu Inicio.
                </p>
              </div>

              <Input
                id="b-name"
                label="Tu nombre"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => setNameTouched(true)}
                error={nameError}
                autoFocus
              />

              <div className={styles.field}>
                <span className={styles.label} id="b-av-label">
                  Elige tu doodle
                </span>
                <div
                  className={styles.avatars}
                  role="radiogroup"
                  aria-labelledby="b-av-label"
                >
                  {AVATARS.map((avatar) => {
                    const isSelected = avatarId === avatar.id
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={avatar.name}
                        className={
                          isSelected ? styles.avatarSelected : styles.avatar
                        }
                        onClick={() => setAvatarId(avatar.id)}
                      >
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 40 40"
                          fill="none"
                          style={{ stroke: 'var(--text)' }}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d={avatar.path} style={{ fill: avatar.fill }} />
                        </svg>
                      </button>
                    )
                  })}
                </div>
              </div>
            </Card>
          </motion.div>
        ) : null}

        {step === 2 ? (
          <motion.div
            key="step-2"
            className={styles.stepTwo}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            aria-labelledby="b-t2"
          >
            <div className={styles.heading}>
              <span className={styles.hint}>Paso 2 de {TOTAL_STEPS}</span>
              <h1 id="b-t2" className={styles.title}>
                {firstName
                  ? `${firstName}, ¿qué quieres agregar a tu dashboard?`
                  : '¿Qué quieres agregar a tu dashboard?'}
              </h1>
              <p className={styles.subtitle}>
                Elige las secciones que vas a usar. Puedes cambiarlas cuando
                quieras desde tu perfil.
              </p>
            </div>

            <div
              className={styles.sections}
              role="group"
              aria-label="Secciones"
            >
              {MODULE_CATALOG.map((section) => {
                const isOn = selected.has(section.id)
                return (
                  <button
                    key={section.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isOn}
                    className={isOn ? styles.sectionOn : styles.sectionOff}
                    onClick={() => toggleSection(section.id)}
                  >
                    <span className={isOn ? styles.checkOn : styles.checkOff}>
                      {isOn ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      ) : null}
                    </span>
                    <span
                      className={
                        isOn ? styles.sectionIconOn : styles.sectionIconOff
                      }
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d={section.icon} />
                      </svg>
                    </span>
                    <span className={styles.sectionName}>{section.name}</span>
                    <span className={styles.sectionDescription}>
                      {section.description}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className={styles.preview}>
              <span className={styles.hint}>Así se verá tu menú</span>
              <div className={styles.previewPills} aria-live="polite">
                <span className={styles.previewPillActive}>Inicio</span>
                {chosenNames.map((sectionName) => (
                  <span key={sectionName} className={styles.previewPill}>
                    {sectionName}
                  </span>
                ))}
              </div>
              {noneError ? (
                <span className={styles.error} role="status">
                  Elige al menos una sección para armar tu dashboard.
                </span>
              ) : null}
            </div>
          </motion.div>
        ) : null}

        {step === 3 ? (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <Card className={styles.doneCard} aria-labelledby="b-t3">
              <svg
                width="110"
                height="90"
                viewBox="0 0 110 90"
                fill="none"
                style={{ stroke: 'var(--text)' }}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect
                  x="14"
                  y="14"
                  width="38"
                  height="30"
                  rx="8"
                  style={{ fill: 'var(--accent)' }}
                />
                <rect x="58" y="14" width="38" height="18" rx="7" />
                <rect
                  x="58"
                  y="38"
                  width="38"
                  height="38"
                  rx="8"
                  style={{ fill: 'var(--accent-warm)' }}
                />
                <rect x="14" y="50" width="38" height="26" rx="8" />
              </svg>
              <h1 id="b-t3" className={styles.title}>
                Listo, {firstName}
              </h1>
              <p className={styles.subtitle}>
                Tu dashboard tiene {chosenNames.length + 1} secciones. Empieza
                vacío y se va llenando con lo que agregues.
              </p>
              <div className={styles.previewPills}>
                <span className={styles.previewPillActive}>Inicio</span>
                {chosenNames.map((sectionName) => (
                  <span key={sectionName} className={styles.previewPill}>
                    {sectionName}
                  </span>
                ))}
              </div>
              {formError ? (
                <span className={styles.error} role="alert">
                  {formError}
                </span>
              ) : null}
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className={styles.nav}>
        {step > 1 ? (
          <Button variant="ghost" onClick={handleBack} disabled={submitting}>
            Atrás
          </Button>
        ) : null}
        <span className={styles.spacer} />
        <Button onClick={handleNext} disabled={submitting}>
          {step === 3
            ? submitting
              ? 'Entrando…'
              : 'Entrar a mi dashboard'
            : 'Siguiente'}
        </Button>
      </div>
    </div>
  )
}
