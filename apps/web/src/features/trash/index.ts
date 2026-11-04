// API pública de la Papelera (docs/guides/modules.md). No es un módulo que se activa: es de "lo global", como
// Buscar o los avisos. Datos: ./api (solo servidor).
export { TrashView } from './components/TrashView'
export type { TrashItem } from './types'
// Para "Borrar proyecto" (Borrar.dc.html) y su "Deshacer", que viven en el detalle del proyecto.
export { restoreFromTrashAction, trashProjectAction } from './actions'
