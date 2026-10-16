import { MAX_ATTR_LENGTH, MAX_DOC_DEPTH, MAX_DOC_NODES, MAX_TEXT_LENGTH } from './constants'

// El contenido de una página es el JSON de Tiptap, nunca HTML (regla 10 de CLAUDE.md, docs/guides/security.md).
// Un JSON no puede traer un <script> ni un onerror=: lo único peligroso que puede llevar son las direcciones
// (`src` de una imagen, `href` de un enlace) y un árbol enorme. Por eso aquí se revisa: qué tipos de bloque
// y de marca se aceptan, que los atributos sean datos simples, que las direcciones sean seguras y que el árbol
// no pase de cierto tamaño. Lo escribe aquí `shared` para que lo usen igual la pantalla y, cuando exista, la API.

export type TiptapMark = { type: string; attrs?: Record<string, unknown> }

export type TiptapNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  marks?: TiptapMark[]
  text?: string
}

export type TiptapDoc = { type: 'doc'; content: TiptapNode[] }

// Lo que el editor de Kairo sabe pintar (Pagina.dc.html): texto, títulos, listas, casillas, desplegable, cita,
// aviso, divisor, imagen y galería. Cualquier otro tipo se rechaza.
export const TIPTAP_NODE_TYPES = [
  'paragraph',
  'text',
  'hardBreak',
  'heading',
  'blockquote',
  'callout',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'horizontalRule',
  'details',
  'detailsSummary',
  'detailsContent',
  'image',
  'gallery',
] as const

export const TIPTAP_MARK_TYPES = ['bold', 'italic', 'underline', 'strike', 'code', 'link'] as const

const NODE_TYPES = new Set<string>(TIPTAP_NODE_TYPES)
const MARK_TYPES = new Set<string>(TIPTAP_MARK_TYPES)

// Un documento vacío: un párrafo sin texto (lo que Tiptap crea al abrir una página nueva).
export function emptyDoc(): TiptapDoc {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

// Una imagen solo puede venir de una dirección https o de un archivo propio de la app ("/escritos/mapa.svg").
// `//otro.sitio` (que el navegador toma como https) y `javascript:` o `data:` quedan fuera.
export function isSafeImageSrc(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ATTR_LENGTH) return false
  if (value.startsWith('/')) return !value.startsWith('//')
  return /^https:\/\/[^\s]+$/i.test(value)
}

// Un enlace puede ser web (http o https), un correo o una página de la propia app ("/escritos/personajes/tabla").
export function isSafeLinkHref(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ATTR_LENGTH) return false
  if (value.startsWith('/')) return !value.startsWith('//') && !/\s/.test(value)
  return /^(https?:\/\/|mailto:)[^\s]+$/i.test(value)
}

// Los atributos son datos simples (texto, número, casilla o vacío), con tope de largo. Nada de objetos
// anidados: un atributo no es un lugar para esconder otro árbol.
function attrsAreSimple(attrs: unknown): boolean {
  if (attrs === undefined) return true
  if (typeof attrs !== 'object' || attrs === null || Array.isArray(attrs)) return false
  return Object.values(attrs).every((value) => {
    if (value === null || typeof value === 'boolean') return true
    if (typeof value === 'number') return Number.isFinite(value)
    return typeof value === 'string' && value.length <= MAX_ATTR_LENGTH
  })
}

function markIsValid(mark: unknown): boolean {
  if (typeof mark !== 'object' || mark === null) return false
  const { type, attrs } = mark as TiptapMark
  if (typeof type !== 'string' || !MARK_TYPES.has(type) || !attrsAreSimple(attrs)) return false
  if (type === 'link') return isSafeLinkHref(attrs?.href)
  return true
}

function nodeIsValid(node: unknown, depth: number, counter: { nodes: number }): boolean {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return false
  if (depth > MAX_DOC_DEPTH) return false
  counter.nodes += 1
  if (counter.nodes > MAX_DOC_NODES) return false

  const { type, attrs, content, marks, text } = node as TiptapNode
  if (typeof type !== 'string' || !NODE_TYPES.has(type) || !attrsAreSimple(attrs)) return false

  if (text !== undefined && (typeof text !== 'string' || text.length > MAX_TEXT_LENGTH)) return false
  if (type === 'text' && typeof text !== 'string') return false
  if (marks !== undefined && (!Array.isArray(marks) || !marks.every(markIsValid))) return false

  if (type === 'image' && !isSafeImageSrc(attrs?.src)) return false
  if (type === 'heading' && ![1, 2, 3].includes(Number(attrs?.level))) return false

  if (content !== undefined) {
    if (!Array.isArray(content)) return false
    return content.every((child) => nodeIsValid(child, depth + 1, counter))
  }
  return true
}

export function isValidTiptapDoc(value: unknown): value is TiptapDoc {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const doc = value as TiptapDoc
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return false
  const counter = { nodes: 0 }
  return doc.content.every((child) => nodeIsValid(child, 1, counter))
}

// Recorre el árbol de arriba abajo. Lo usan las cuentas de palabras, imágenes y casillas.
export function walkTiptap(nodes: TiptapNode[], visit: (node: TiptapNode) => void): void {
  for (const node of nodes) {
    visit(node)
    if (node.content) walkTiptap(node.content, visit)
  }
}

// El texto de un bloque (un párrafo, un título…) sin mirar adentro de sus bloques hijos.
function inlineText(node: TiptapNode): string {
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'hardBreak') return ' '
  return (node.content ?? []).map(inlineText).join('')
}

const TEXT_BLOCKS = new Set(['paragraph', 'heading', 'detailsSummary'])

// El texto de cada bloque de texto, en orden. Una lista o un desplegable reparten su texto entre sus párrafos.
export function tiptapTextBlocks(doc: TiptapDoc): string[] {
  const blocks: string[] = []
  walkTiptap(doc.content, (node) => {
    if (TEXT_BLOCKS.has(node.type)) blocks.push(inlineText(node))
  })
  return blocks
}

// Cuántas palabras tiene la página. La API la vuelve a calcular al guardar (`pages.word_count`, data-model.md):
// el número que manda la pantalla nunca se guarda tal cual.
export function tiptapWordCount(doc: TiptapDoc): number {
  let words = 0
  for (const block of tiptapTextBlocks(doc)) {
    const trimmed = block.trim()
    if (trimmed) words += trimmed.split(/\s+/).length
  }
  return words
}
