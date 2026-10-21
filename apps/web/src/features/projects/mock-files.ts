import 'server-only'

import type { MockContext } from '@/lib/mock/context'
import { PROJECT_ID } from '@/lib/mock/ids'

import type { ProjectFile, ProjectFiles } from './types'

// Datos de ejemplo de la pestaña Archivos (ProyectoArchivos.dc.html). Los dos primeros de
// "Dashboard personal" son los del canvas (con su miniatura dibujada); los demás proyectos
// tienen pocos archivos o ninguno, para ver también el estado vacío.

const KB = 1024
const MB = 1024 * KB

type FileSeed = [name: string, kind: ProjectFile['kind'], bytes: number, daysAgo: number, look?: ProjectFile['look']]

const SEEDS: Partial<Record<keyof typeof PROJECT_ID, FileSeed[]>> = {
  dash: [
    ['boceto-inicio.png', 'image', Math.round(1.2 * MB), 7, 'sketch'],
    ['paleta-crema-lavanda.png', 'image', 340 * KB, 7, 'palette'],
    ['requisitos.pdf', 'doc', 220 * KB, 8],
    ['esquema-base-de-datos.pdf', 'doc', 410 * KB, 5],
    ['notas-del-stack.md', 'doc', 12 * KB, 5],
  ],
  bot: [
    ['arquitectura-actual.pdf', 'doc', 380 * KB, 12],
    ['diagrama-modulos.png', 'image', 640 * KB, 3],
  ],
  vin: [
    ['flujo-n8n.png', 'image', Math.round(1.8 * MB), 9],
    ['guia-de-invitaciones.pdf', 'doc', 540 * KB, 14],
  ],
  pel: [
    ['reglas-v1.md', 'doc', 9 * KB, 30],
    ['concepto-peluches.png', 'image', Math.round(2.4 * MB), 25],
  ],
}

// El espacio es uno solo para todo lo que sube la persona (proyectos, escritos…): 1 GB.
const QUOTA_BYTES = 1024 * MB
// Lo que ocupan los archivos de otros proyectos y de los escritos.
const USED_ELSEWHERE_BYTES = 38 * MB

export function buildFiles(ctx: MockContext): Record<string, ProjectFiles> {
  const result: Record<string, ProjectFiles> = {}
  for (const key of Object.keys(PROJECT_ID) as (keyof typeof PROJECT_ID)[]) {
    const files: ProjectFile[] = (SEEDS[key] ?? []).map(([name, kind, sizeBytes, daysAgo, look], index) => ({
      id: `${key}-file-${index + 1}`,
      name,
      kind,
      sizeBytes,
      uploadedOn: ctx.day(-daysAgo),
      look: look ?? null,
    }))
    result[PROJECT_ID[key]] = { files, usedElsewhereBytes: USED_ELSEWHERE_BYTES, quotaBytes: QUOTA_BYTES }
  }
  return result
}

// Un proyecto que no está en el ejemplo (uno recién creado) no tiene archivos todavía.
export function emptyFiles(): ProjectFiles {
  return { files: [], usedElsewhereBytes: USED_ELSEWHERE_BYTES, quotaBytes: QUOTA_BYTES }
}
