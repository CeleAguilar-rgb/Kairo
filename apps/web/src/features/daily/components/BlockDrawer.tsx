'use client'

import { ROUTINE_ICONS, ROUTINE_KINDS, ROUTINE_NAGS, routineBlockSchema, type RoutineIcon, type RoutineKind, type RoutineNag } from '@kairo/shared'
import { useState, useTransition, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { fieldErrors } from '@/lib/form-errors'

import { deleteBlockAction, saveBlockAction, undoRoutineAction } from '../routine-actions'
import { nagMessage } from '../routine-utils'
import { ROUTINE_ICON_META } from '../routine-meta'
import { ROUTINE_KIND_HINT, ROUTINE_KIND_LABEL, type FocusLink, type RoutineBlock } from '../types'

import styles from './BlockDrawer.module.css'

type BlockDrawerProps = {
  open: boolean
  routineId: string
  // El bloque que se edita; null = bloque nuevo.
  block: RoutineBlock | null
  links: FocusLink[]
  onClose: () => void
}

export function BlockDrawer({ open, block, ...rest }: BlockDrawerProps) {
  return (
    <Drawer open={open} onClose={rest.onClose} title={block ? 'Editar bloque' : 'Nuevo bloque'} hideTitle width="lg">
      {/* El formulario es un componente aparte a propósito: Drawer lo desmonta al cerrarse, así cada vez
          que se abre empieza con el bloque que toca sin limpiarlo a mano. */}
      <BlockForm key={block?.id ?? 'new'} block={block} {...rest} />
    </Drawer>
  )
}

const NAG_LABEL: Record<RoutineNag, string> = { 0: 'No', 15: '15 min', 30: '30 min', 60: '1 hora' }

type FormProps = Omit<BlockDrawerProps, 'open'>

function BlockForm({ routineId, block, links, onClose }: FormProps) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const editing = block !== null

  const [title, setTitle] = useState(block?.title ?? '')
  const [startsAt, setStartsAt] = useState(block?.startsAt ?? '09:00')
  const [endsAt, setEndsAt] = useState(block?.endsAt ?? '')
  const [kind, setKind] = useState<RoutineKind>(block?.kind ?? 'habit')
  const [icon, setIcon] = useState<RoutineIcon>(block?.icon ?? 'sun')
  const [link, setLink] = useState(block?.link ?? links[0]?.value ?? '')
  const [alert, setAlert] = useState(block?.alert ?? true)
  const [nag, setNag] = useState<RoutineNag>(block?.nagMinutes ?? 0)
  const [counts, setCounts] = useState(block?.countsForReport ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const preview = links.find((item) => item.value === link)?.preview

  // El error de un campo se quita en cuanto se toca: nada de seguir regañando.
  const clearError = (field: string) => setErrors((current) => (current[field] ? { ...current, [field]: '' } : current))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = routineBlockSchema.safeParse({
      title,
      startsAt,
      endsAt: endsAt || null,
      kind,
      icon,
      link: kind === 'focus' ? link || null : null,
      alert,
      nagMinutes: nag,
      countsForReport: kind === 'free' ? false : counts,
    })
    if (!parsed.success) {
      const found = fieldErrors(parsed.error.issues)
      setErrors(found)
      const first = ['title', 'startsAt', 'endsAt'].find((key) => found[key])
      if (first) document.getElementById(`block-${first}`)?.focus()
      return
    }
    startTransition(async () => {
      const result = await saveBlockAction(routineId, block?.id ?? null, parsed.data)
      if (!result.ok) {
        setErrors(result.errors)
        if (result.message) toast.show({ message: result.message, icon: 'info' })
        return
      }
      toast.show({ message: editing ? 'Bloque actualizado.' : 'Bloque agregado.', icon: 'check' })
      onClose()
    })
  }

  function handleDelete() {
    if (!block) return
    startTransition(async () => {
      const result = await deleteBlockAction(block.id)
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo borrar el bloque.', icon: 'info' })
      onClose()
      const token = result.undoToken
      toast.show({ message: `Se borró el bloque "${block.title}"`, icon: 'trash', onUndo: token ? () => void undoRoutineAction(token) : undefined })
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <header className={styles.head}>
        {/* El título real (para lectores de pantalla) lo pone el Drawer; este es solo visual */}
        <p className={styles.heading} aria-hidden="true">
          {editing ? 'Editar bloque' : 'Nuevo bloque'}
        </p>
        <button type="button" className={styles.close} aria-label="Cerrar sin guardar" onClick={onClose}>
          <LineIcon d="M6 6l12 12M18 6L6 18" size={20} />
        </button>
      </header>

      <div className={styles.fields}>
        <Input
          id="block-title"
          label="Título"
          value={title}
          maxLength={80}
          autoComplete="off"
          autoFocus
          className={styles.titleInput}
          error={errors.title}
          onChange={(event) => {
            setTitle(event.target.value)
            if (event.target.value.trim()) clearError('title')
          }}
        />

        <div className={styles.times}>
          <Input id="block-startsAt" type="time" label="Hora" value={startsAt} error={errors.startsAt} onChange={(event) => {
              setStartsAt(event.target.value)
              clearError('startsAt')
              clearError('endsAt')
            }}
          />
          <span className={styles.dash} aria-hidden="true">
            –
          </span>
          <Input
            id="block-endsAt"
            type="time"
            label="Termina"
            labelExtra={<span className={styles.optional}>(opcional)</span>}
            value={endsAt}
            error={errors.endsAt}
            onChange={(event) => {
              setEndsAt(event.target.value)
              clearError('endsAt')
            }}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Clase</span>
          <Segmented
            label="Clase"
            mode="radio"
            tone="raised"
            value={kind}
            onChange={setKind}
            options={ROUTINE_KINDS.map((value) => ({ value, label: ROUTINE_KIND_LABEL[value] }))}
          />
          <span className={styles.hint}>{ROUTINE_KIND_HINT[kind]}</span>
        </div>

        {kind === 'focus' ? (
          <div className={styles.field}>
            <Select id="block-link" label="Ligado a" value={link} onChange={(event) => setLink(event.target.value)} options={links} />
            {errors.link ? <span className={styles.error}>{errors.link}</span> : null}
            {preview ? (
              <div className={styles.preview}>
                <LineIcon d="M5 12h14M13 6l6 6-6 6" size={16} strokeWidth={2} />
                <span>
                  Hoy mostraría: <b>{preview}</b>
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={styles.field}>
          <span className={styles.label} id="block-icon-label">
            Ícono
          </span>
          <div role="radiogroup" aria-labelledby="block-icon-label" className={styles.icons}>
            {ROUTINE_ICONS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={icon === value}
                aria-label={ROUTINE_ICON_META[value].label}
                className={[styles.icon, icon === value ? styles.iconOn : null].filter(Boolean).join(' ')}
                onClick={() => setIcon(value)}
              >
                <LineIcon d={ROUTINE_ICON_META[value].d} size={20} />
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Avisos</span>
          <div className={styles.switch}>
            <Toggle checked={alert} onToggle={() => setAlert((current) => !current)} label="Avisarme a la hora" />
            <span>Avisarme a la hora del bloque</span>
          </div>
          <div className={styles.field}>
            <span className={styles.sub} id="block-nag-label">
              Si no lo marco, insistir
            </span>
            <Segmented
              label="Si no lo marco, insistir"
              mode="radio"
              tone="raised"
              value={String(nag) as `${RoutineNag}`}
              onChange={(value) => setNag(Number(value) as RoutineNag)}
              options={ROUTINE_NAGS.map((value) => ({ value: String(value) as `${RoutineNag}`, label: NAG_LABEL[value] }))}
            />
            {nag > 0 ? <span className={styles.hint}>Te llegará: “{nagMessage(kind, title || 'esto')}”</span> : null}
          </div>
          <div className={styles.switch}>
            <Toggle checked={kind === 'free' ? false : counts} onToggle={() => kind !== 'free' && setCounts((current) => !current)} label="Cuenta para el reporte" />
            <span>Cuenta para el reporte</span>
          </div>
        </div>
      </div>

      <footer className={styles.actions}>
        {editing ? (
          <Button variant="ghost" iconOnly className={styles.trash} aria-label="Borrar este bloque" onClick={handleDelete} disabled={pending}>
            <LineIcon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit} disabled={pending}>
          Guardar bloque
        </Button>
      </footer>
    </form>
  )
}
