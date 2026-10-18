'use client'

import { classifyProjectFile, fileExtensionOf, PROJECT_FILE_EXTENSIONS, PROJECT_FILE_MAX_BYTES, projectLinkSchema } from '@kairo/shared'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { formatBytes } from '@/lib/bytes'
import { dayOfMonth, formatMonthShort, type IsoDate } from '@/lib/dates'
import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'

import type { ProjectFile, ProjectFiles as ProjectFilesData, ProjectLink } from '../types'

import styles from './ProjectFiles.module.css'

type ProjectFilesProps = {
  data: ProjectFilesData
  links: ProjectLink[]
  today: IsoDate
}

type Filter = 'all' | 'image' | 'doc'

// Un archivo de esta sesión puede traer la vista previa real de la imagen (una URL local del
// navegador); los de ejemplo se dibujan. Con Storage, todas serán URLs firmadas de la API.
type LocalFile = ProjectFile & { previewUrl?: string; blob?: File }

type Upload = { id: string; name: string; sizeBytes: number; duration: number }

const ACCEPT = PROJECT_FILE_EXTENSIONS.map((extension) => `.${extension}`).join(',')

// Cada tarjeta entra un poco después de la anterior, de arriba hacia abajo. Si se llegó por una pestaña
// (`calm`), nacen ya en su lugar: la pantalla se siente la misma (ver SectionPanel).
const enter = (position: number, calm: boolean) => ({
  initial: calm ? (false as const) : { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT, delay: 0.1 + position * 0.07 } },
})

// "7 oct"
const shortDay = (date: IsoDate) => `${dayOfMonth(date)} ${formatMonthShort(date)}`

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function isSafeUrl(url: string) {
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

// La miniatura de un archivo: la imagen real si es de esta sesión, el dibujo del canvas si es de
// ejemplo, o el icono de su tipo.
function Thumb({ file }: { file: LocalFile }) {
  if (file.previewUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- una URL local (blob:) que next/image no puede optimizar
    return <img src={file.previewUrl} alt="" className={styles.previewImage} />
  }
  if (file.look === 'sketch') {
    return (
      <svg width="150" height="96" viewBox="0 0 150 96" fill="none" stroke="var(--text)" strokeWidth="2" aria-hidden="true">
        <rect x="4" y="4" width="142" height="88" rx="12" fill="var(--surface)" />
        <path d="M16 22c10-4 18 3 28-1" strokeWidth="3" strokeLinecap="round" />
        <rect x="16" y="34" width="66" height="46" rx="8" fill="var(--surface-inverted)" />
        <rect x="90" y="34" width="44" height="20" rx="7" fill="var(--accent)" />
        <rect x="90" y="60" width="44" height="20" rx="7" />
        <path d="M24 48h40M24 58h30M24 68h36" stroke="var(--surface-inverted-muted)" strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  }
  if (file.look === 'palette') {
    return (
      <span className={styles.swatches} aria-hidden="true">
        <span className={[styles.swatch, styles.swatchCream].join(' ')} />
        <span className={[styles.swatch, styles.swatchPaper].join(' ')} />
        <span className={[styles.swatch, styles.swatchInk].join(' ')} />
        <span className={[styles.swatch, styles.swatchLavender].join(' ')} />
        <span className={[styles.swatch, styles.swatchSoft].join(' ')} />
      </span>
    )
  }
  if (file.kind === 'image') {
    return (
      <span className={styles.imageIcon} aria-hidden="true">
        <LineIcon d={['M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', 'M3 16l5-5 4 4 3-3 6 6', 'M9 9.5h.01']} size={34} strokeWidth={1.6} />
      </span>
    )
  }
  const extension = fileExtensionOf(file.name)
  return (
    <span className={styles.paper} aria-hidden="true">
      <span className={styles.paperLine} />
      <span className={[styles.paperLine, styles.paperLineShort].join(' ')} />
      <span className={styles.paperLine} />
      {extension ? <span className={[styles.badge, extension === 'PDF' ? styles.badgePdf : styles.badgeOther].join(' ')}>{extension}</span> : null}
    </span>
  )
}

// La pestaña Archivos (ProyectoArchivos.dc.html): los archivos del proyecto, sus enlaces y el espacio.
// Hoy todo vive en memoria: lo que subes de verdad se lee (nombre, tamaño, vista previa de una
// imagen), pero no se guarda en ningún lado y se pierde al recargar, hasta que exista Storage.
export function ProjectFiles({ data, links: initialLinks, today }: ProjectFilesProps) {
  const toast = useToast()
  const calm = useCalmEntry()
  const inputRef = useRef<HTMLInputElement>(null)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const previews = useRef(new Set<string>())

  const [files, setFiles] = useState<LocalFile[]>(data.files)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [dragging, setDragging] = useState(false)
  const [toDelete, setToDelete] = useState<LocalFile | null>(null)
  const [links, setLinks] = useState(initialLinks)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState('')

  // Al salir de la pantalla: se cancelan las subidas en curso y se liberan las vistas previas.
  useEffect(() => {
    const pending = timers.current
    const urls = previews.current
    return () => {
      pending.forEach((timer) => clearTimeout(timer))
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const usedByFiles = files.reduce((sum, file) => sum + file.sizeBytes, 0)
  const uploading = uploads.reduce((sum, upload) => sum + upload.sizeBytes, 0)
  const usedTotal = data.usedElsewhereBytes + usedByFiles
  const countOf = (value: Filter) => (value === 'all' ? files.length : files.filter((file) => file.kind === value).length)
  const shown = files.filter((file) => filter === 'all' || file.kind === filter)
  const showUploads = filter !== 'image'

  const finishUpload = (upload: Upload, source: File, kind: ProjectFile['kind']) => {
    timers.current.delete(upload.id)
    const previewUrl = kind === 'image' ? URL.createObjectURL(source) : undefined
    if (previewUrl) previews.current.add(previewUrl)
    setUploads((list) => list.filter((item) => item.id !== upload.id))
    setFiles((list) => [
      { id: upload.id, name: upload.name, kind, sizeBytes: upload.sizeBytes, uploadedOn: today, look: null, previewUrl, blob: source },
      ...list,
    ])
    toast.show({ message: `"${upload.name}" se subió`, icon: 'check' })
  }

  // Revisa cada archivo (tipo, tamaño y espacio) y empieza a "subir" los que pasan. La API vuelve a
  // validar esto antes de firmar la subida: aquí solo se evita subir lo que se va a rechazar.
  const addFiles = (list: FileList | File[]) => {
    let reserved = usedTotal + uploading
    for (const source of Array.from(list)) {
      const kind = classifyProjectFile(source.name)
      const reject = (reason: string) => toast.show({ message: `"${source.name}" no se puede subir: ${reason}`, icon: 'info' })
      if (!kind) {
        reject('ese tipo de archivo no está permitido')
        continue
      }
      if (source.size === 0) {
        reject('está vacío')
        continue
      }
      if (source.size > PROJECT_FILE_MAX_BYTES) {
        reject(`pesa más de ${formatBytes(PROJECT_FILE_MAX_BYTES)}`)
        continue
      }
      if (reserved + source.size > data.quotaBytes) {
        reject('no cabe en tu espacio')
        continue
      }
      reserved += source.size
      // La subida de ejemplo tarda más cuanto más pesa el archivo, entre 1.2 y 4 segundos.
      const duration = Math.min(4000, Math.max(1200, source.size / 1024 / 2))
      const upload: Upload = { id: `local-${crypto.randomUUID()}`, name: source.name, sizeBytes: source.size, duration }
      setUploads((current) => [upload, ...current])
      timers.current.set(upload.id, setTimeout(() => finishUpload(upload, source, kind), duration))
    }
  }

  const cancelUpload = (upload: Upload) => {
    clearTimeout(timers.current.get(upload.id))
    timers.current.delete(upload.id)
    setUploads((list) => list.filter((item) => item.id !== upload.id))
    toast.show({ message: 'Subida cancelada', icon: 'info' })
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files)
  }

  const handleDownload = (file: LocalFile) => {
    if (!file.blob) {
      toast.show({ message: `Descargando ${file.name}`, icon: 'info' })
      return
    }
    // Un archivo subido en esta sesión sí se puede descargar de verdad (es el mismo que se eligió).
    const url = URL.createObjectURL(file.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    URL.revokeObjectURL(url)
  }

  const confirmDelete = () => {
    if (!toDelete) return
    const removed = toDelete
    const position = files.findIndex((file) => file.id === removed.id)
    setFiles((list) => list.filter((file) => file.id !== removed.id))
    setToDelete(null)
    toast.show({
      message: `${removed.name} se fue a la papelera`,
      icon: 'trash',
      onUndo: () =>
        setFiles((list) => {
          const next = [...list]
          next.splice(Math.min(position, next.length), 0, removed)
          return next
        }),
    })
  }

  const handleAddLink = (event: FormEvent) => {
    event.preventDefault()
    const url = linkUrl.trim()
    const parsed = projectLinkSchema.safeParse({ title: hostOf(url), url })
    if (!parsed.success) {
      setLinkError(parsed.error.issues.find((issue) => issue.path[0] === 'url')?.message ?? 'Revisa el enlace.')
      return
    }
    setLinks((list) => [...list, { id: `local-${crypto.randomUUID()}`, ...parsed.data }])
    setLinkUrl('')
    setLinkError('')
    toast.show({ message: 'Enlace agregado', icon: 'check' })
  }

  const percentUsed = Math.min(100, (usedTotal / data.quotaBytes) * 100)
  const safeLinks = links.filter((link) => isSafeUrl(link.url))

  return (
    <>
      <motion.div {...enter(0, calm)} className={styles.toolbar}>
        <span className={styles.toolbarText}>Archivos y enlaces del proyecto</span>
        <Button onClick={() => inputRef.current?.click()}>
          <LineIcon d="M12 16V4M7 9l5-5 5 5M4 20h16" size={16} />
          Subir archivo
        </Button>
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className={styles.hiddenInput}
        aria-label="Elegir archivos para subir"
        tabIndex={-1}
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files)
          event.target.value = ''
        }}
      />

      <div className={styles.grid}>
        <div className={styles.main}>
          <motion.div {...enter(1, calm)}>
            <Card as="section" className={styles.card} aria-labelledby="files-title">
              <CardHeader
                id="files-title"
                title="Archivos"
                iconTone="dark"
                icon={<LineIcon d={['M6 3h8l4 4v14H6z', 'M14 3v4h4']} />}
                action={
                  <div className={styles.filterScroll}>
                  <Segmented
                    label="Filtrar"
                    tone="raised"
                    value={filter}
                    onChange={setFilter}
                    options={[
                      { value: 'all', label: <>Todos<span className={styles.segCount}>{countOf('all')}</span></> },
                      { value: 'image', label: <>Imágenes<span className={styles.segCount}>{countOf('image')}</span></> },
                      { value: 'doc', label: <>Documentos<span className={styles.segCount}>{countOf('doc')}</span></> },
                    ]}
                  />
                  </div>
                }
              />

              <LayoutGroup id="project-files">
                <div className={styles.fileGrid}>
                  <button
                    type="button"
                    className={[styles.drop, dragging ? styles.dropActive : null].filter(Boolean).join(' ')}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(event) => {
                      event.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                  >
                    <LineIcon d="M12 16V4M7 9l5-5 5 5M4 20h16" size={26} strokeWidth={1.8} />
                    <span className={styles.dropTitle}>Suelta archivos aquí</span>
                    <span className={styles.hint}>o toca para elegir · hasta {formatBytes(PROJECT_FILE_MAX_BYTES)}</span>
                  </button>

                  {/* `initial={!calm}`: al llegar por una pestaña los archivos ya están en su lugar; los que se
                      suben después siguen entrando con su animación. */}
                  <AnimatePresence mode="popLayout" initial={!calm}>
                    {showUploads
                      ? uploads.map((upload) => (
                          <motion.div
                            key={upload.id}
                            layout
                            className={styles.fileCard}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, transition: { duration: DURATION.fast } }}
                            transition={SPRING.panel}
                            aria-label={`Subiendo ${upload.name}`}
                          >
                            <div className={[styles.thumb, styles.thumbUploading].join(' ')}>
                              <span className={styles.hint}>Subiendo…</span>
                              <div className={styles.progressTrack}>
                                <div className={styles.progressFill} style={{ animationDuration: `${upload.duration}ms` }} />
                              </div>
                            </div>
                            <div className={styles.fileFoot}>
                              <div className={styles.fileText}>
                                <span className={styles.fileName}>{upload.name}</span>
                                <span className={styles.fileMeta}>{formatBytes(upload.sizeBytes)}</span>
                              </div>
                              <button type="button" className={styles.iconButton} aria-label={`Cancelar la subida de ${upload.name}`} onClick={() => cancelUpload(upload)}>
                                <LineIcon d="M6 6l12 12M18 6L6 18" size={16} strokeWidth={2} />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      : null}

                    {shown.map((file) => (
                      <motion.div
                        key={file.id}
                        layout
                        className={styles.fileCard}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, transition: { duration: DURATION.fast } }}
                        transition={SPRING.panel}
                      >
                        <div className={[styles.thumb, file.kind === 'image' ? styles.thumbImage : styles.thumbDoc].join(' ')}>
                          <Thumb file={file} />
                        </div>
                        <div className={styles.fileFoot}>
                          <div className={styles.fileText}>
                            <span className={styles.fileName} title={file.name}>
                              {file.name}
                            </span>
                            <span className={styles.fileMeta}>
                              {formatBytes(file.sizeBytes)} · {shortDay(file.uploadedOn)}
                            </span>
                          </div>
                          <button type="button" className={styles.iconButton} aria-label={`Descargar ${file.name}`} onClick={() => handleDownload(file)}>
                            <LineIcon d="M12 4v12M7 11l5 5 5-5M4 20h16" size={16} strokeWidth={2} />
                          </button>
                          <button type="button" className={[styles.iconButton, styles.iconDanger].join(' ')} aria-label={`Borrar ${file.name}`} onClick={() => setToDelete(file)}>
                            <LineIcon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={16} strokeWidth={2} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </LayoutGroup>

              {shown.length === 0 && !(showUploads && uploads.length > 0) ? (
                <p className={styles.empty}>
                  {filter === 'image'
                    ? 'No hay imágenes en este proyecto. Sube una arrastrándola aquí.'
                    : 'Todavía no hay archivos. Suelta uno arriba para empezar.'}
                </p>
              ) : null}
            </Card>
          </motion.div>
        </div>

        <aside className={styles.side}>
          <motion.div {...enter(2, calm)}>
            <Card as="section" className={styles.card} aria-labelledby="files-links">
              <CardHeader id="files-links" title="Enlaces" iconTone="accent" icon={<LineIcon d={['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1']} />} />
              {safeLinks.length === 0 ? (
                <p className={styles.empty}>Todavía no hay enlaces.</p>
              ) : (
                <ul className={styles.links}>
                  {safeLinks.map((link, index) => (
                    <li key={link.id}>
                      <a className={styles.link} href={link.url} target="_blank" rel="noopener noreferrer">
                        <span className={[styles.linkIcon, styles[`linkIcon${index % 3}`]].join(' ')} aria-hidden="true">
                          <LineIcon d={['M6 3h9l4 4v14H6z', 'M15 3v4h4']} size={16} />
                        </span>
                        <span className={styles.linkText}>
                          <span className={styles.linkTitle}>{link.title}</span>
                          <span className={styles.hint}>{hostOf(link.url)}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <form className={styles.linkForm} onSubmit={handleAddLink} noValidate>
                <label htmlFor="new-link" className={styles.label}>
                  Agregar enlace
                </label>
                <div className={styles.linkRow}>
                  <input
                    id="new-link"
                    type="url"
                    className={[styles.linkInput, linkError ? styles.linkInputBad : null].filter(Boolean).join(' ')}
                    placeholder="https://"
                    value={linkUrl}
                    aria-invalid={Boolean(linkError)}
                    aria-describedby={linkError ? 'new-link-error' : undefined}
                    onChange={(event) => {
                      setLinkUrl(event.target.value)
                      setLinkError('')
                    }}
                  />
                  <Button type="submit">Agregar</Button>
                </div>
                {linkError ? (
                  <span id="new-link-error" className={styles.error}>
                    {linkError}
                  </span>
                ) : null}
              </form>
            </Card>
          </motion.div>

          <motion.div {...enter(3, calm)}>
            <Card as="section" className={styles.card} aria-labelledby="files-space">
              <h2 id="files-space" className={styles.plainTitle}>
                Espacio
              </h2>
              <div className={styles.spaceRow}>
                <span className={styles.spaceValue}>{formatBytes(usedTotal)}</span>
                <span className={styles.hint}>de {formatBytes(data.quotaBytes)}</span>
              </div>
              <div className={styles.spaceTrack} role="progressbar" aria-label="Espacio usado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentUsed)}>
                <motion.div className={styles.spaceFill} initial={{ scaleX: 0 }} animate={{ scaleX: Math.max(percentUsed / 100, 0.01) }} transition={SPRING.soft} />
              </div>
              <span className={styles.hint}>Lo de todos tus proyectos y escritos cuenta aquí.</span>
            </Card>
          </motion.div>
        </aside>
      </div>

      <Modal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        tone="danger"
        title={toDelete ? `¿Borrar ${toDelete.name}?` : ''}
        description="Se va a la papelera. Puedes recuperarlo durante 30 días."
        icon={<LineIcon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={22} />}
        actions={
          <>
            <Button variant="danger" onClick={confirmDelete}>
              Borrar archivo
            </Button>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
          </>
        }
      />
    </>
  )
}
