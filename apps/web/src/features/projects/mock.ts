import 'server-only'

import type { TaskStatus } from '@kairo/shared'

import type { MockContext } from '@/lib/mock/context'
import { PROJECT_ID } from '@/lib/mock/ids'

import type { Project, ProjectDetail, ProjectKind, ProjectStatus } from './types'

// Datos de ejemplo de Proyectos.dc.html y Proyecto.dc.html. Los ids son los mismos que usa
// features/tasks/mock.ts (así "Bot de marketing" es el mismo proyecto en todas las pantallas).
// El avance, el conteo y la próxima fecha NO se escriben a mano: salen de las tareas de cada
// proyecto, como los calculará la API. Días y fechas son relativos a "hoy" (ctx.day).

type TaskSeed = [title: string, status: TaskStatus, subtasksDone: number, subtasksTotal: number, due: number | null]

type Seed = {
  key: keyof typeof PROJECT_ID
  name: string
  kind: ProjectKind
  status: ProjectStatus
  description: string
  started: number | null
  goal: number | null
  notes: string | null
  objectives: [text: string, done: boolean][]
  links: [title: string, url: string][]
  tasks: TaskSeed[]
  sprint: [number: number, ends: number] | null
  focusMinutes: number
}

// El orden es el de las tarjetas de Inicio; la lista de Proyectos usa el mismo.
const SEEDS: Seed[] = [
  {
    key: 'dash',
    name: 'Dashboard personal',
    kind: 'personal',
    status: 'active',
    description:
      'Un solo lugar para organizar mi vida: tareas, proyectos, agenda, gastos y membresías, escritos y lo personal. Quiero que se sienta cálido y mío, con letra a mano y doodles, y que más adelante se conecte con Notion, Canva, Spotify y Claude.',
    started: -7,
    goal: null,
    notes: 'Ideas: barra flotante de Spotify y pomodoro juntos en una esquina. Revisar el modo oscuro más adelante.',
    objectives: [
      ['Ver tareas, agenda y pagos de un vistazo al abrirlo', true],
      ['Diseñar todas las pantallas con mi estilo', false],
      ['Programarlo con buena estructura y buenas prácticas', false],
      ['Conectarlo con Notion, Canva, Spotify y Claude', false],
    ],
    links: [
      ['Canvas de diseño', 'https://claude.ai/artifact/4bUuw6JPtK1D3dV1AhYbXG'],
      ['Documento de diseño', 'https://claude.ai/code/artifact/9eaa47b1-9497-4de4-bd1a-2f6e1243f7f2'],
      ['Sistema de diseño', 'https://claude.ai/artifact/9JXBLNnGQCXXv3cGbZMLk1'],
    ],
    tasks: [
      ['Mapa de secciones', 'done', 3, 3, -8],
      ['Pantalla de Inicio', 'done', 5, 5, -7],
      ['Terminar el diseño del dashboard', 'in_progress', 2, 3, 0],
      ['Sección de Escritos y personajes', 'in_progress', 1, 4, 1],
      ['Elegir stack y estructura de carpetas', 'todo', 0, 3, 3],
      ['Pomodoro y barra de Spotify', 'todo', 0, 4, null],
      ['Conexión con Notion', 'todo', 0, 2, null],
    ],
    sprint: [2, 5],
    focusMinutes: 400,
  },
  {
    key: 'bot',
    name: 'Bot de marketing',
    kind: 'work',
    status: 'active',
    description: 'Reestructurar la arquitectura para que sirva de base a los siguientes bots.',
    started: -60,
    goal: 20,
    notes: 'Comentarlo con mi jefe antes de separar los módulos.',
    objectives: [
      ['Documentar la arquitectura actual', true],
      ['Dejar una plantilla reutilizable', false],
      ['Migrar el primer bot a la nueva base', false],
    ],
    links: [['Documentación del bot', 'https://example.com/bot/docs']],
    tasks: [
      ['Documentar la arquitectura actual', 'done', 3, 3, -5],
      ['Revisar la arquitectura del bot', 'in_progress', 1, 3, 0],
      ['Propuesta de módulos', 'review', 3, 3, 2],
      ['Plantilla base para nuevos bots', 'todo', 0, 3, 6],
    ],
    sprint: [1, 3],
    focusMinutes: 150,
  },
  {
    key: 'pel',
    name: 'Juego de peluches',
    kind: 'personal',
    status: 'active',
    description: 'Juego cooperativo de peluches defectuosos con mi equipo de cuatro.',
    started: -90,
    goal: null,
    notes: null,
    objectives: [
      ['Prototipo jugable de una partida', false],
      ['Cuatro peluches con habilidades distintas', false],
      ['Probarlo con el equipo', false],
    ],
    links: [],
    tasks: [
      ['Idea y reglas básicas', 'done', 3, 3, -30],
      ['Mecánica de peluches defectuosos', 'in_progress', 2, 5, 5],
      ['Nivel del vertedero', 'todo', 0, 4, null],
      ['Arte de los peluches', 'todo', 0, 3, 12],
      ['Sonido y música', 'todo', 0, 2, null],
      ['Prueba con el equipo', 'todo', 0, 2, 20],
    ],
    sprint: null,
    focusMinutes: 0,
  },
  {
    key: 'd67',
    name: '67downloader',
    kind: 'personal',
    status: 'active',
    description: 'Página todo en uno para descargar videos de redes.',
    started: -120,
    goal: 14,
    notes: 'Tatalan ofreció probarlo con sus videos.',
    objectives: [
      ['Descargar de las redes principales', true],
      ['Que funcione bien en el celular', false],
      ['Publicarlo', false],
    ],
    links: [['Repositorio', 'https://example.com/67downloader']],
    tasks: [
      ['Descarga desde YouTube', 'done', 2, 2, -40],
      ['Descarga desde TikTok', 'done', 2, 2, -30],
      ['Interfaz principal', 'done', 4, 4, -20],
      ['Historial de descargas', 'done', 3, 3, -10],
      ['Soporte para más redes', 'in_progress', 2, 3, 9],
      ['Pruebas con Tatalan', 'review', 1, 2, 2],
    ],
    sprint: [3, 9],
    focusMinutes: 95,
  },
  {
    key: 'vin',
    name: 'VinculaPSI',
    kind: 'work',
    status: 'active',
    description: 'Plataforma que conecta profesionales de salud mental con pacientes; invitaciones con n8n.',
    started: -30,
    goal: null,
    notes: 'Revisar el flujo de n8n con calma antes de responder invitaciones.',
    objectives: [
      ['Flujo de invitaciones automático', true],
      ['Panel para profesionales', false],
      ['Primeras pruebas con pacientes', false],
    ],
    links: [['Flujo en n8n', 'https://example.com/vinculapsi/n8n']],
    tasks: [
      ['Diseñar el flujo de invitaciones', 'done', 3, 3, -20],
      ['Configurar n8n', 'done', 2, 2, -12],
      ['Pantalla de acceso para pacientes', 'done', 3, 3, -6],
      ['Responder invitaciones pendientes', 'todo', 0, 2, 0],
      ['Recordatorios por correo', 'todo', 0, 3, 8],
    ],
    sprint: null,
    focusMinutes: 60,
  },
  {
    key: 'web',
    name: 'Web para foráneos',
    kind: 'personal',
    status: 'paused',
    description: 'Web automatizada enfocada en alimentación para quienes viven fuera de casa.',
    started: null,
    goal: null,
    notes: 'En pausa hasta terminar el dashboard.',
    objectives: [
      ['Definir a quién va dirigida', false],
      ['Menú semanal automático', false],
    ],
    links: [],
    tasks: [
      ['Definir menú semanal automático', 'todo', 0, 2, null],
      ['Elegir fuentes de recetas', 'todo', 0, 2, null],
      ['Maqueta de la página', 'todo', 0, 3, null],
    ],
    sprint: null,
    focusMinutes: 0,
  },
  {
    key: 'ing',
    name: 'Ingeniería o maestría',
    kind: 'school',
    status: 'active',
    description: 'Preparar la inscripción para enero; lo que llegue primero.',
    started: -10,
    goal: 200,
    notes: null,
    objectives: [
      ['Reunir los documentos', false],
      ['Decidir entre ingeniería o maestría', false],
      ['Inscribirme en enero', false],
    ],
    links: [['Convocatoria', 'https://example.com/inscripcion']],
    tasks: [
      ['Revisar requisitos de inscripción', 'todo', 0, 3, 7],
      ['Reunir los documentos', 'todo', 0, 4, 21],
      ['Decidir entre ingeniería o maestría', 'todo', 0, 2, null],
    ],
    sprint: null,
    focusMinutes: 0,
  },
]

export function buildProjectDetails(ctx: MockContext): ProjectDetail[] {
  return SEEDS.map((seed) => {
    const tasks = seed.tasks.map(([title, status, subtasksDone, subtasksTotal, due], index) => ({
      id: `${seed.key}-task-${index + 1}`,
      title,
      status,
      subtasksDone,
      subtasksTotal,
      dueOn: due === null ? null : ctx.day(due),
    }))
    const doneCount = tasks.filter((task) => task.status === 'done').length
    const upcoming = tasks
      .filter((task) => task.status !== 'done' && task.dueOn)
      .map((task) => task.dueOn as string)
      .sort()

    return {
      id: PROJECT_ID[seed.key],
      name: seed.name,
      kind: seed.kind,
      status: seed.status,
      description: seed.description,
      coverPath: `preset:${seed.key}`,
      coverUrl: null,
      startedOn: seed.started === null ? null : ctx.day(seed.started),
      goalOn: seed.goal === null ? null : ctx.day(seed.goal),
      progress: tasks.length === 0 ? 0 : doneCount / tasks.length,
      taskCount: tasks.length,
      doneCount,
      nextDueOn: upcoming[0] ?? null,
      notes: seed.notes,
      objectives: seed.objectives.map(([text, done], index) => ({ id: `${seed.key}-obj-${index + 1}`, text, done })),
      links: seed.links.map(([title, url], index) => ({ id: `${seed.key}-link-${index + 1}`, title, url })),
      tasks,
      currentSprint: seed.sprint ? { number: seed.sprint[0], endsOn: ctx.day(seed.sprint[1]) } : null,
      focusMinutesWeek: seed.focusMinutes,
    }
  })
}

// La versión resumida que devuelve GET /v1/projects (sin objetivos, enlaces ni tareas).
export function toProject(detail: ProjectDetail): Project {
  return {
    id: detail.id,
    name: detail.name,
    kind: detail.kind,
    status: detail.status,
    description: detail.description,
    coverPath: detail.coverPath,
    coverUrl: detail.coverUrl,
    startedOn: detail.startedOn,
    goalOn: detail.goalOn,
    progress: detail.progress,
    taskCount: detail.taskCount,
    doneCount: detail.doneCount,
    nextDueOn: detail.nextDueOn,
  }
}
