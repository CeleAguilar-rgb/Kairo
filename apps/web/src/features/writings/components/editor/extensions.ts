import { isSafeLinkHref, type TiptapNode } from '@kairo/shared'
import { Extension, mergeAttributes, Node, type Editor, type Range } from '@tiptap/react'
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details'
import Image from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import Placeholder from '@tiptap/extension-placeholder'
import type { DOMOutputSpec } from '@tiptap/pm/model'
import { PluginKey } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'

// Los bloques del editor de Kairo (Pagina.dc.html). Son los mismos que acepta el esquema de `shared`
// (TIPTAP_NODE_TYPES): si aquí se agrega un tipo de bloque, también hay que permitirlo allá, o el servidor
// rechazará la página al guardar.

// Un "Aviso": un recuadro lavanda que resalta una nota. Su estrella es del CSS (WritingEditor.module.css).
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  parseHTML: () => [{ tag: 'div[data-callout]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0],
})

// Una "Galería": varias imágenes juntas, en una cuadrícula de tres columnas.
export const Gallery = Node.create({
  name: 'gallery',
  group: 'block',
  content: 'image+',
  draggable: true,
  parseHTML: () => [{ tag: 'div[data-gallery]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-gallery': '' }), 0],
})

// Una imagen con su pie de foto (el `alt`), como en el canvas. Solo se acepta una dirección https o un archivo
// de la propia app: lo mismo que revisa el esquema de `shared` al guardar.
export const CaptionedImage = Image.extend({
  renderHTML: ({ HTMLAttributes }): DOMOutputSpec => {
    const picture: DOMOutputSpec = ['img', mergeAttributes(HTMLAttributes)]
    const caption = typeof HTMLAttributes.alt === 'string' ? HTMLAttributes.alt : ''
    return caption ? ['figure', { 'data-figure': '' }, picture, ['figcaption', caption]] : ['figure', { 'data-figure': '' }, picture]
  },
})

// --- El menú "/" ----------------------------------------------------------------------------------

export type SlashItem = {
  id: 'text' | 'heading1' | 'heading' | 'heading3' | 'todo' | 'bullets' | 'numbers' | 'toggle' | 'quote' | 'callout' | 'divider' | 'database' | 'image' | 'gallery'
  name: string
  description: string
  // Otras palabras con las que se busca ("checklist", "viñetas"): lo que escribe quien no sabe cómo se llama el bloque.
  keywords: string
  // El trazo del ícono (24×24), del canvas.
  icon: string
}

// Los bloques que se pueden insertar. Los diez del canvas más las listas con viñetas y numerada y los tres tamaños de
// título (el canvas solo trae uno): una página de verdad los necesita, y el esquema de `shared` ya los acepta.
export const SLASH_ITEMS: SlashItem[] = [
  { id: 'text', name: 'Texto', description: 'Escribe normal', keywords: 'parrafo normal', icon: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'heading1', name: 'Título grande', description: 'El encabezado más grande', keywords: 'titulo h1 encabezado', icon: 'M5 5v14M13 5v14M5 12h8M17 9l3-2v12' },
  { id: 'heading', name: 'Título', description: 'Un encabezado de sección', keywords: 'titulo h2 encabezado', icon: 'M6 4v16M18 4v16M6 12h12' },
  { id: 'heading3', name: 'Subtítulo', description: 'Un encabezado pequeño', keywords: 'titulo h3 encabezado subtitulo', icon: 'M4 6v12M12 6v12M4 12h8M16 10h4l-3 3a2 2 0 1 1-1 3' },
  { id: 'todo', name: 'Casilla', description: 'Lista de casillas que se marcan', keywords: 'checklist check tareas pendientes lista casillas', icon: 'M4 4h16v16H4zM8 12l3 3 5-6' },
  { id: 'bullets', name: 'Viñetas', description: 'Lista con puntos', keywords: 'vinetas bullets puntos lista', icon: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01' },
  { id: 'numbers', name: 'Lista numerada', description: 'Pasos en orden: 1, 2, 3', keywords: 'numerada numeros pasos orden lista', icon: 'M10 6h10M10 12h10M10 18h10M4 4.5l1.5-1V9M4 14.5h3L4 18h3' },
  { id: 'toggle', name: 'Desplegable', description: 'Se abre y se cierra', keywords: 'toggle plegable acordeon', icon: 'M9 6l6 6-6 6' },
  { id: 'quote', name: 'Cita', description: 'Un diálogo o frase', keywords: 'dialogo frase', icon: 'M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6' },
  { id: 'callout', name: 'Aviso', description: 'Resalta una nota', keywords: 'nota destacar recuadro', icon: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z' },
  { id: 'divider', name: 'Divisor', description: 'Una línea para separar', keywords: 'linea separador', icon: 'M4 12h16' },
  { id: 'database', name: 'Base de datos', description: 'Enlaza la tabla de personajes', keywords: 'tabla personajes', icon: 'M3 5h18v14H3zM3 10h18M9 10v9' },
  { id: 'image', name: 'Imagen', description: 'Una foto, dibujo o captura', keywords: 'foto dibujo captura imagen', icon: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9h.01' },
  { id: 'gallery', name: 'Galería', description: 'Varias imágenes juntas', keywords: 'imagenes fotos', icon: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z' },
]

const plain = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Lo que se escribe después de "/" filtra los bloques por su nombre (desde el principio), por lo que dice su descripción o por
// sus otras palabras; sin importar mayúsculas ni acentos ("vinetas" encuentra "Viñetas").
export function filterSlashItems(query: string): SlashItem[] {
  const text = plain(query.trim())
  return SLASH_ITEMS.filter((item) => !text || plain(item.name).startsWith(text) || plain(item.description).includes(text) || plain(item.keywords).includes(text))
}

// Los que piden datos antes de insertarse (un enlace de imagen) los resuelve el editor con un diálogo; el resto
// se inserta directo con esta función. Devuelve false si el bloque no es de los directos.
const TOGGLE_TITLE = 'Desplegable'

export function insertSimpleBlock(editor: Editor, range: Range | null, id: SlashItem['id']): boolean {
  const base = editor.chain().focus()
  // Desde "Insertar" no hay un "/" que borrar: el bloque va después de lo que esté elegido, no encima (si no, borraría el texto elegido).
  const chain = range ? base.deleteRange(range) : base.setTextSelection(editor.state.selection.to)
  switch (id) {
    case 'text':
      chain.setParagraph().run()
      return true
    case 'heading1':
      chain.setNode('heading', { level: 1 }).run()
      return true
    case 'heading':
      chain.setNode('heading', { level: 2 }).run()
      return true
    case 'heading3':
      chain.setNode('heading', { level: 3 }).run()
      return true
    case 'todo':
      chain.toggleTaskList().run()
      return true
    case 'bullets':
      chain.toggleBulletList().run()
      return true
    case 'numbers':
      chain.toggleOrderedList().run()
      return true
    case 'quote':
      chain.setBlockquote().run()
      return true
    case 'callout':
      chain.insertContent({ type: 'callout', content: [{ type: 'paragraph' }] } satisfies TiptapNode).run()
      return true
    case 'divider':
      chain.setHorizontalRule().run()
      return true
    case 'toggle':
      chain
        .insertContent({
          type: 'details',
          attrs: { open: true },
          content: [
            { type: 'detailsSummary', content: [{ type: 'text', text: TOGGLE_TITLE }] },
            { type: 'detailsContent', content: [{ type: 'paragraph' }] },
          ],
        } satisfies TiptapNode)
        .run()
      return true
    case 'database':
      chain
        .insertContent({
          type: 'paragraph',
          content: [{ type: 'text', text: 'Personajes (base de datos)', marks: [{ type: 'link', attrs: { href: '/escritos/personajes/tabla' } }] }],
        } satisfies TiptapNode)
        .run()
      return true
    default:
      return false
  }
}

// Lo que el menú "/" le pide al editor para mostrarse y moverse: el componente de React lo recibe por aquí.
export type SlashState = {
  range: Range
  query: string
  // Dónde está el cursor en pantalla, para colocar el menú.
  rect: DOMRect | null
}

export type SlashController = {
  onChange: (state: SlashState | null) => void
  // Teclas del menú abierto (flechas, Enter, Escape). true si el menú se comió la tecla.
  onKey: (event: KeyboardEvent) => boolean
}

const slashKey = new PluginKey('kairoSlash')

// El menú "/" de Tiptap (extensión Suggestion): al escribir "/" al inicio de un bloque avisa al componente de
// React cuál es la búsqueda y dónde está el cursor; el componente pinta el menú y decide qué hacer al elegir.
export const SlashCommand = Extension.create<{ controller: SlashController }>({
  name: 'slashCommand',
  addOptions: () => ({ controller: { onChange: () => undefined, onKey: () => false } }),
  addProseMirrorPlugins() {
    const { controller } = this.options
    return [
      Suggestion({
        pluginKey: slashKey,
        editor: this.editor,
        char: '/',
        startOfLine: true,
        allowSpaces: true,
        items: () => [],
        render: () => {
          const toState = (props: SuggestionProps): SlashState => ({ range: props.range, query: props.query, rect: props.clientRect?.() ?? null })
          return {
            onStart: (props) => controller.onChange(toState(props)),
            onUpdate: (props) => controller.onChange(toState(props)),
            onExit: () => controller.onChange(null),
            onKeyDown: ({ event }: SuggestionKeyDownProps) => controller.onKey(event),
          }
        },
      }),
    ]
  },
})

// Los bloques que puede producir el editor: el conjunto del esquema de `shared`. El bloque de código no entra
// (el esquema no lo acepta), y las direcciones de los enlaces pasan por el mismo filtro que valida el servidor.
export function buildExtensions(controller: SlashController) {
  return [
    StarterKit.configure({
      codeBlock: false,
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
        isAllowedUri: (url) => isSafeLinkHref(url),
      },
    }),
    Placeholder.configure({ placeholder: 'Escribe, o usa / para insertar un bloque', showOnlyCurrent: true }),
    TaskList,
    TaskItem.configure({ nested: false }),
    Details.configure({ persist: true }),
    DetailsSummary,
    DetailsContent,
    CaptionedImage.configure({ allowBase64: false }),
    Callout,
    Gallery,
    SlashCommand.configure({ controller }),
  ]
}
