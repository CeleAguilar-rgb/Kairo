import type { FieldType, NoteTemplateFieldType, StoryColor, StoryKind } from '@kairo/shared'

// Lo visual de Escritos que no es lógica: los trazos de los íconos (del canvas) y las etiquetas. Los colores no
// están aquí: cada pieza los toma de una variable semántica según su clave (WritingColors.module.css).

type IconKey = 'pencil' | 'plus' | 'close' | 'trash' | 'image' | 'external' | 'check' | 'table' | 'grid' | 'board' | 'more' | 'map' | 'moon' | 'chevron' | 'globe'

export const WRITING_ICON: Record<IconKey, string | string[]> = {
  pencil: ['M14 4l6 6L9 21H3v-6L14 4z', 'M12 6l6 6'],
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  image: ['M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z', 'M3 16l5-5 4 4 3-3 6 6'],
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  check: 'M5 12l5 5L20 7',
  table: ['M3 5h18v14H3z', 'M3 10h18M9 10v9'],
  grid: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',
  board: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  map: ['M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z', 'M9 4v14M15 6v14'],
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  chevron: 'M9 6l6 6-6 6',
  globe: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M3 12h18M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3z'],
}

export const STORY_COLOR_LABEL: Record<StoryColor, string> = {
  ink: 'Tinta',
  lavender: 'Lavanda',
  sand: 'Arena',
}

export const STORY_KIND_OPTION_LABEL: Record<StoryKind, string> = {
  story: 'Historia',
  notebook: 'Cuaderno',
}

// Cómo se llama cada tipo de columna de la base de personajes: en el menú "Propiedad" y como nombre de la columna nueva.
export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: 'Texto',
  number: 'Número',
  select: 'Selección',
  date: 'Fecha',
}

// El trazo del ícono de cada tipo de columna (BaseDatos.dc.html).
export const FIELD_TYPE_ICON: Record<FieldType, string> = {
  text: 'M4 6h16M4 12h16M4 18h10',
  number: 'M5 9h14M5 15h14M10 4L8 20M16 4l-2 16',
  select: 'M9 6l6 6-6 6',
  date: 'M3 5h18v16H3zM3 10h18',
}

// Cómo se llama cada tipo de campo en el editor de plantillas (EscritosPlantilla.dc.html, decisión #45).
export const NOTE_TEMPLATE_FIELD_TYPE_LABEL: Record<NoteTemplateFieldType, string> = {
  text: 'Texto corto',
  link: 'Vínculo a otra nota',
  era: 'Era',
  select: 'Selección',
  number: 'Número',
  date: 'Fecha',
}
