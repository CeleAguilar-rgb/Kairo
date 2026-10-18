import type { TiptapDoc, TiptapNode } from '@kairo/shared'

// Ayudas para armar a mano el contenido de las páginas de ejemplo (JSON de Tiptap). Con la API, el contenido
// viene guardado tal cual lo escribió el editor: este archivo desaparece junto con mock.ts.

export const para = (value = ''): TiptapNode => (value ? { type: 'paragraph', content: [{ type: 'text', text: value }] } : { type: 'paragraph' })

export const heading = (value: string, level = 2): TiptapNode => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text: value }] })

export const quote = (value: string): TiptapNode => ({ type: 'blockquote', content: [para(value)] })

export const callout = (value: string): TiptapNode => ({ type: 'callout', content: [para(value)] })

export const divider = (): TiptapNode => ({ type: 'horizontalRule' })

export const tasks = (items: [text: string, checked: boolean][]): TiptapNode => ({
  type: 'taskList',
  content: items.map(([text, checked]) => ({ type: 'taskItem', attrs: { checked }, content: [para(text)] })),
})

export const toggle = (summary: string, inner: string, open = false): TiptapNode => ({
  type: 'details',
  attrs: { open },
  content: [
    { type: 'detailsSummary', content: [{ type: 'text', text: summary }] },
    { type: 'detailsContent', content: [para(inner)] },
  ],
})

export const picture = (src: string, caption: string): TiptapNode => ({ type: 'image', attrs: { src, alt: caption, title: caption } })

export const gallery = (sources: string[]): TiptapNode => ({
  type: 'gallery',
  content: sources.map((src, index) => picture(src, `Imagen ${index + 1}`)),
})

export const doc = (...blocks: TiptapNode[]): TiptapDoc => ({ type: 'doc', content: blocks.length ? blocks : [para()] })
