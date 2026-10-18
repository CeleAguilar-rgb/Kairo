'use client'

import { isSafeImageSrc } from '@kairo/shared'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'

import styles from './ImageDialog.module.css'

export type ImageDialogKind = 'image' | 'gallery'

// Las más que cabe en una galería: tres columnas por tres filas.
const MAX_GALLERY_IMAGES = 9

type ImageDialogProps = {
  kind: ImageDialogKind | null
  onClose: () => void
  // La imagen (o las imágenes de la galería) ya validadas, con su descripción.
  onInsert: (kind: ImageDialogKind, sources: string[], caption: string) => void
}

// Para insertar una imagen o una galería. Todavía no se pueden subir archivos (hace falta el almacenamiento de la
// API y sus reglas de seguridad), así que se pega el enlace: solo se acepta una dirección https, que es lo mismo
// que valida el servidor al guardar la página.
export function ImageDialog({ kind, onClose, onInsert }: ImageDialogProps) {
  const [links, setLinks] = useState('')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')

  const isGallery = kind === 'gallery'

  function close() {
    setLinks('')
    setCaption('')
    setError('')
    onClose()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!kind) return
    const sources = links
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (sources.length === 0) {
      setError(isGallery ? 'Pega al menos un enlace.' : 'Pega el enlace de la imagen.')
      return
    }
    if (sources.length > MAX_GALLERY_IMAGES || (!isGallery && sources.length > 1)) {
      setError(isGallery ? `Máximo ${MAX_GALLERY_IMAGES} imágenes.` : 'Pega un solo enlace.')
      return
    }
    if (!sources.every((source) => /^https:\/\//i.test(source) && isSafeImageSrc(source))) {
      setError('El enlace tiene que empezar con https://.')
      return
    }
    onInsert(kind, sources, caption.trim())
    close()
  }

  return (
    <Modal
      open={kind !== null}
      onClose={close}
      title={isGallery ? 'Insertar una galería' : 'Insertar una imagen'}
      description="Por ahora se agregan con un enlace; subir archivos desde tu equipo llega con el servidor."
      actions={
        <>
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" form="image-dialog-form">
            Insertar
          </Button>
        </>
      }
    >
      <form id="image-dialog-form" className={styles.form} onSubmit={handleSubmit} noValidate>
        {isGallery ? (
          <Textarea
            id="img-links"
            label="Enlaces de las imágenes"
            value={links}
            rows={4}
            hint="Uno por línea."
            placeholder="https://…"
            error={error || undefined}
            onChange={(event) => {
              setLinks(event.target.value)
              setError('')
            }}
          />
        ) : (
          <Input
            id="img-links"
            label="Enlace de la imagen"
            value={links}
            placeholder="https://…"
            autoComplete="off"
            error={error || undefined}
            onChange={(event) => {
              setLinks(event.target.value)
              setError('')
            }}
          />
        )}
        <Input id="img-caption" label="Descripción (opcional)" value={caption} maxLength={120} autoComplete="off" hint="Se ve debajo de la imagen y la leen los lectores de pantalla." onChange={(event) => setCaption(event.target.value)} />
      </form>
    </Modal>
  )
}
