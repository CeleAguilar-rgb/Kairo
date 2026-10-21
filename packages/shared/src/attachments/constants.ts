// Límites de Storage (docs/guides/security.md, sección 7). Sin zod a propósito, igual que
// projects/constants.ts: son números que el front también usa para pintar sin cargar la librería
// de validación.

// El espacio es uno solo para todo lo que la persona sube a Storage (hoy solo los archivos de un
// proyecto; Escritos lo compartirá cuando le llegue su turno). Las portadas no cuentan aquí: son
// una imagen chica por proyecto, no una lista que pueda crecer sin límite.
export const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024

// La portada de un proyecto: una sola imagen, más chica que un archivo cualquiera de la pestaña
// Archivos. El tipo se valida igual que un archivo (classifyProjectFile(name) === 'image').
export const COVER_IMAGE_MAX_BYTES = 8 * 1024 * 1024
