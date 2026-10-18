// Constantes de proyectos, SIN zod a propósito (igual que tasks/constants.ts): el front las
// importa para pintar opciones, filtros y portadas sin descargar la librería de validación.

export const PROJECT_KINDS = ['work', 'personal', 'school'] as const
// 'archived' (Archivado) está en el canvas del formulario (ProyectoEditar); el enum de
// Postgres lo suma con su migración cuando se haga el módulo de proyectos en la API.
export const PROJECT_STATUSES = ['active', 'paused', 'done', 'archived'] as const

export type ProjectKind = (typeof PROJECT_KINDS)[number]
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

// Portadas ilustradas. Las cuatro primeras son las que se eligen en el formulario; las demás
// son las propias de cada proyecto de ejemplo del canvas (Proyectos.dc.html).
export const PROJECT_COVER_CHOICES = ['luna', 'tablero', 'olas', 'estrella'] as const
export const PROJECT_COVER_KEYS = [...PROJECT_COVER_CHOICES, 'dash', 'bot', 'vin', 'pel', 'd67', 'web', 'ing'] as const

export type ProjectCoverKey = (typeof PROJECT_COVER_KEYS)[number]

// Archivos de un proyecto (pestaña Archivos). La API vuelve a validar tipo y tamaño antes de
// firmar la subida (docs/guides/security.md, sección 7): esto solo evita subir lo que se va a rechazar.
export const PROJECT_FILE_MAX_BYTES = 50 * 1024 * 1024

export type ProjectFileKind = 'image' | 'doc'

// Por extensión (en minúsculas, sin el punto): algunos navegadores no informan el tipo de un .md.
const FILE_KIND_BY_EXTENSION: Record<string, ProjectFileKind> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  gif: 'image',
  pdf: 'doc',
  md: 'doc',
  txt: 'doc',
  docx: 'doc',
}

export const PROJECT_FILE_EXTENSIONS = Object.keys(FILE_KIND_BY_EXTENSION)

// La extensión en mayúsculas de un nombre de archivo ("PDF"), o '' si no tiene.
export function fileExtensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toUpperCase() : ''
}

// 'image', 'doc' o null si el tipo de archivo no está permitido.
export function classifyProjectFile(name: string): ProjectFileKind | null {
  return FILE_KIND_BY_EXTENSION[fileExtensionOf(name).toLowerCase()] ?? null
}
