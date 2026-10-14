import 'server-only'

import type { ProjectInput } from '@kairo/shared'

import { coverPathOf, type ProjectDetail } from './types'

// Los proyectos que se crean o se editan con el formulario viven aquí, en la memoria del
// servidor de desarrollo, mientras no exista la API: así un proyecto nuevo aparece en la galería
// y uno editado cambia en todas las pantallas. Se pierde al reiniciar el servidor. Con la API,
// este archivo desaparece: las acciones de actions.ts llaman a `api.post('/projects', ...)`.
//
// Se guarda en globalThis y no en una variable del módulo: en desarrollo Next vuelve a cargar los
// módulos al guardar un archivo y la variable se reiniciaría (los proyectos creados se perderían).
type EditableFields = Pick<
  ProjectDetail,
  'name' | 'kind' | 'status' | 'description' | 'coverPath' | 'startedOn' | 'goalOn' | 'objectives' | 'links'
>

type Store = {
  // Los creados, el más reciente primero.
  created: ProjectDetail[]
  // Los cambios sobre los proyectos de ejemplo (por id).
  edits: Map<string, EditableFields>
}

const holder = globalThis as typeof globalThis & { __kairoProjectStore?: Store }
const store: Store = (holder.__kairoProjectStore ??= { created: [], edits: new Map() })

// Convierte lo que escribió la persona en los campos del proyecto. Los objetivos que ya existían
// (mismo texto) conservan si estaban cumplidos; el formulario solo maneja el texto.
function fieldsFrom(input: ProjectInput, current?: Pick<ProjectDetail, 'objectives'>): EditableFields {
  const doneByText = new Map((current?.objectives ?? []).map((objective) => [objective.text, objective.done]))
  return {
    name: input.name,
    kind: input.kind,
    status: input.status,
    description: input.description === '' ? null : input.description,
    coverPath: coverPathOf(input.cover),
    startedOn: input.startedOn,
    goalOn: input.goalOn,
    objectives: input.objectives.map((text) => ({ id: crypto.randomUUID(), text, done: doneByText.get(text) ?? false })),
    links: input.links.map((link) => ({ id: crypto.randomUUID(), title: link.title, url: link.url })),
  }
}

// Los proyectos de ejemplo con los cambios aplicados, y los creados al principio.
export function applyStore(seeds: ProjectDetail[]): ProjectDetail[] {
  const edited = seeds.map((project) => {
    const edit = store.edits.get(project.id)
    return edit ? { ...project, ...edit } : project
  })
  return [...store.created, ...edited]
}

export function createStoredProject(input: ProjectInput): ProjectDetail {
  const project: ProjectDetail = {
    id: crypto.randomUUID(),
    ...fieldsFrom(input),
    progress: 0,
    taskCount: 0,
    doneCount: 0,
    nextDueOn: null,
    notes: null,
    tasks: [],
    currentSprint: null,
    focusMinutesWeek: 0,
  }
  store.created.unshift(project)
  return project
}

// false si el proyecto no existe.
export function updateStoredProject(id: string, input: ProjectInput, seeds: ProjectDetail[]): boolean {
  const created = store.created.findIndex((project) => project.id === id)
  if (created >= 0) {
    store.created[created] = { ...store.created[created], ...fieldsFrom(input, store.created[created]) }
    return true
  }
  const seed = seeds.find((project) => project.id === id)
  if (!seed) return false
  const current = { ...seed, ...store.edits.get(id) }
  store.edits.set(id, fieldsFrom(input, current))
  return true
}
