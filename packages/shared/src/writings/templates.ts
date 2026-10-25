import type { FieldKind, NoteTemplateFieldType, NoteTemplateKey, OptionTone, TemplateFieldKey } from './constants'
import { PLACE_TYPE_KINGDOM, PLACE_TYPE_REGION } from './constants'

// Las plantillas con las que nace cada mundo (decisión #45), tomadas de EscritosPlantilla.dc.html. Las usa la API
// al crear un mundo y el front para armar el mundo de ejemplo del modo demo: así las dos partes siembran lo
// mismo. Aquí no hay ids: cada mundo genera los suyos al crearse (un campo conserva su id para siempre, y los
// valores de cada nota se guardan por ese id).

export type FieldOptionSeed = { id: string; label: string; tone: OptionTone }

export type TemplateFieldSeed = {
  kind: FieldKind
  key: TemplateFieldKey | null
  name: string
  type: NoteTemplateFieldType
  hint: string
  options: FieldOptionSeed[]
}

export type TemplateSeed = { key: NoteTemplateKey | null; name: string; color: OptionTone; fields: TemplateFieldSeed[] }

const field = (name: string, type: NoteTemplateFieldType, key: TemplateFieldKey | null = null, options: FieldOptionSeed[] = []): TemplateFieldSeed => ({
  kind: 'field',
  key,
  name,
  type,
  hint: '',
  options,
})

const section = (name: string, hint: string): TemplateFieldSeed => ({ kind: 'section', key: null, name, type: 'text', hint, options: [] })

// "Tipo de lugar" es un campo más de la plantilla Lugar (decisión #46). Región y Reino tienen id fijo porque la
// app los reconoce (tarjetas de Regiones y contador de reinos); los demás son solo sugerencias.
export const PLACE_TYPE_OPTIONS: FieldOptionSeed[] = [
  { id: PLACE_TYPE_REGION, label: 'Región', tone: 'ink' },
  { id: PLACE_TYPE_KINGDOM, label: 'Reino', tone: 'warm' },
  { id: 'forest', label: 'Bosque', tone: 'muted' },
  { id: 'castle', label: 'Castillo', tone: 'soft' },
  { id: 'market', label: 'Mercado', tone: 'accent' },
  { id: 'place', label: 'Lugar', tone: 'muted' },
]

export const DEFAULT_TEMPLATES: TemplateSeed[] = [
  {
    key: 'character',
    name: 'Personaje',
    color: 'warm',
    fields: [
      field('Nombre completo', 'text'),
      field('Edad', 'text'),
      field('Especie', 'link'),
      field('Lugar de origen', 'link'),
      field('Rol en la historia', 'text', 'role'),
      field('Era', 'era'),
      section('Qué quiere', '¿Qué busca en la historia?'),
      section('Qué lo mueve', '¿Por qué lo quiere?'),
      section('A qué le teme', 'Su miedo más grande'),
      section('Personalidad', 'Lo bueno y lo malo, en pocas palabras'),
      section('Relaciones', 'Familia, pareja, amigos y enemigos'),
    ],
  },
  {
    key: 'species',
    name: 'Especie',
    color: 'muted',
    fields: [
      field('Dónde vive', 'link', 'home'),
      field('Cuánto vive', 'text'),
      field('Poderes', 'text'),
      field('Debilidad', 'text'),
      section('Origen', '¿De dónde vienen? ¿Quién los creó?'),
      section('Ciclo de vida', 'Nacimiento, crecimiento, reproducción y muerte'),
      section('Apariencia', 'Altura, rasgos, coloración'),
      section('Sociedad y cultura', 'Organización, líderes, festividades, rituales'),
      section('Rol en el mundo', '¿Aliados, enemigos, dioses, civilización antigua?'),
    ],
  },
  {
    key: 'place',
    name: 'Lugar',
    color: 'soft',
    fields: [
      field('Tipo de lugar', 'select', 'place_type', PLACE_TYPE_OPTIONS),
      field('Quién gobierna', 'text'),
      field('Quién vive', 'link'),
      field('Clima', 'text'),
      field('Fundado en', 'era'),
      section('Historia', '¿Qué ha pasado aquí?'),
      section('Cultura y costumbres', 'Cómo vive la gente, qué celebra'),
      section('Lugares importantes', 'Castillos, mercados, bosques…'),
    ],
  },
]

// Lo que trae una "Sección nueva" del menú Más: un campo y una sección para empezar. Se cambia con el editor de
// plantilla, que se abre solo al crearla.
export const NEW_SECTION_TEMPLATE: TemplateSeed = {
  key: null,
  name: 'Sección nueva',
  color: 'muted',
  fields: [field('Tipo', 'text'), section('Notas', '')],
}

// Las secciones extra del canvas (Magia, Objetos, Linajes, Deidades, Religión). Un mundo nuevo no las trae: las
// usa el mundo de ejemplo del modo demo y sirven de referencia para quien quiera armarlas a mano.
export const SECTION_TEMPLATE_EXAMPLES: TemplateSeed[] = [
  {
    key: null,
    name: 'Magia',
    color: 'soft',
    fields: [field('Origen', 'text'), field('Quién la usa', 'link'), field('Costo o límite', 'text'), section('Cómo funciona', '¿Qué se necesita para usarla?'), section('Reglas', 'Lo que puede y no puede hacer'), section('Debilidades', '')],
  },
  {
    key: null,
    name: 'Objetos',
    color: 'warm',
    fields: [field('Quién lo tiene', 'link'), field('Poder', 'text'), field('Era', 'era'), section('Historia del objeto', '¿Quién lo hizo y por qué?')],
  },
  { key: null, name: 'Linajes', color: 'muted', fields: [field('Miembros', 'link'), field('Dónde', 'link'), field('Símbolo', 'text'), section('Origen', ''), section('Árbol familiar', 'Padres, hijos, herederos')] },
  { key: null, name: 'Deidades', color: 'ink', fields: [field('Qué domina', 'text'), field('Qué creó', 'link'), section('Cómo actúa', '¿Interviene o solo observa?'), section('Mitos', 'Lo que se cuenta de ella')] },
  { key: null, name: 'Religión', color: 'accent', fields: [field('Cree en', 'link'), field('Quién la sigue', 'link'), section('Creencias', ''), section('Rituales y festividades', '')] },
]
