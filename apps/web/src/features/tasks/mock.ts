import 'server-only'

import type { MockContext } from '@/lib/mock/context'
import { PROJECT_ID } from '@/lib/mock/ids'

import type { Subtask, Task, TaskPriority } from './types'

// Proyectos tal como los nombra la pantalla Tareas del canvas. Mismos ids que
// features/projects/mock.ts.
const PROJECTS = {
  dash: { id: PROJECT_ID.dash, name: 'Dashboard personal' },
  bot: { id: PROJECT_ID.bot, name: 'Bot de marketing' },
  vin: { id: PROJECT_ID.vin, name: 'VinculaPSI' },
  pel: { id: PROJECT_ID.pel, name: 'Juego de peluches' },
  d67: { id: PROJECT_ID.d67, name: '67downloader' },
  web: { id: PROJECT_ID.web, name: 'Web para foráneos' },
  ing: { id: PROJECT_ID.ing, name: 'Ingeniería o maestría' },
} as const

type Seed = {
  id: string
  title: string
  project: keyof typeof PROJECTS | null
  // Días desde hoy (null = sin fecha)
  due: number | null
  priority: TaskPriority
  status: Task['status']
  subs: string[]
  subsDone: number
  notes?: string
}

// Las tareas de Tareas.dc.html y Main.dc.html, con la fecha del canvas
// (7 de octubre) convertida a "días desde hoy".
const SEEDS: Seed[] = [
  { id: 't1', title: 'Terminar el diseño del dashboard', project: 'dash', due: 0, priority: 'high', status: 'in_progress', subs: ['Revisar animaciones', 'Definir paleta final', 'Pasar a componentes'], subsDone: 2, notes: 'Cerrar la pantalla de Inicio, el tablero de Proyectos y la vista de membresías antes de pasar a código.' },
  { id: 't2', title: 'Comprar despensa del meal prep', project: null, due: 0, priority: 'medium', status: 'done', subs: ['Revisar qué hay en casa', 'Armar lista'], subsDone: 2, notes: 'Lista para los recetarios de lunes a viernes.' },
  { id: 't3', title: 'Revisar la arquitectura del bot', project: 'bot', due: 0, priority: 'high', status: 'in_progress', subs: ['Diagrama actual', 'Propuesta de módulos', 'Comentarlo con mi jefe'], subsDone: 1, notes: 'Separar la lógica para que sirva como base de los siguientes bots.' },
  { id: 't4', title: 'Responder invitaciones pendientes', project: 'vin', due: 0, priority: 'medium', status: 'todo', subs: ['Revisar el flujo de n8n', 'Responder'], subsDone: 0, notes: 'Revisar el flujo y contestar las que quedaron sin respuesta.' },
  { id: 't5', title: 'Escribir la escena del capítulo 3', project: null, due: 0, priority: 'low', status: 'todo', subs: ['Releer capítulo 2', 'Escribir 500 palabras'], subsDone: 0, notes: 'Retomar donde se quedó la historia; 500 palabras mínimo.' },
  { id: 't9', title: 'Sección de Escritos y personajes', project: 'dash', due: 1, priority: 'medium', status: 'in_progress', subs: ['Historias', 'Fichas de personajes', 'Textos sueltos', 'Relaciones'], subsDone: 1 },
  { id: 't6', title: 'Propuesta de módulos', project: 'bot', due: 2, priority: 'high', status: 'review', subs: ['Separar lógica', 'Documentar', 'Ejemplo'], subsDone: 3 },
  { id: 't13', title: 'Pruebas con Tatalan', project: 'd67', due: 2, priority: 'low', status: 'review', subs: ['Videos de prueba', 'Recoger comentarios'], subsDone: 1 },
  { id: 't8', title: 'Elegir stack y estructura de carpetas', project: 'dash', due: 3, priority: 'medium', status: 'todo', subs: ['Comparar opciones', 'Estructura', 'Repositorio'], subsDone: 0 },
  { id: 't10', title: 'Mecánica de peluches defectuosos', project: 'pel', due: 5, priority: 'high', status: 'in_progress', subs: ['Lista de defectos', 'Prototipo', 'Prueba', 'Ajustes', 'Documento'], subsDone: 2 },
  { id: 't7', title: 'Plantilla base para nuevos bots', project: 'bot', due: 6, priority: 'medium', status: 'todo', subs: ['Estructura', 'Configuración', 'Guía'], subsDone: 0 },
  { id: 't14', title: 'Revisar requisitos de inscripción', project: 'ing', due: 7, priority: 'high', status: 'todo', subs: ['Ingeniería', 'Maestría', 'Documentos'], subsDone: 0 },
  { id: 't12', title: 'Soporte para más redes', project: 'd67', due: 9, priority: 'medium', status: 'in_progress', subs: ['TikTok', 'Instagram', 'X'], subsDone: 2 },
  { id: 't11', title: 'Nivel del vertedero', project: 'pel', due: null, priority: 'low', status: 'todo', subs: ['Boceto', 'Bloqueo', 'Arte', 'Prueba'], subsDone: 0 },
  { id: 't15', title: 'Definir menú semanal automático', project: 'web', due: null, priority: 'low', status: 'todo', subs: ['Fuentes de recetas', 'Reglas'], subsDone: 0 },
  { id: 't16', title: 'Conexión con Notion', project: 'dash', due: null, priority: 'low', status: 'todo', subs: ['Permisos', 'Sincronizar tareas'], subsDone: 0 },
  { id: 't17', title: 'Mapa de secciones', project: 'dash', due: -1, priority: 'medium', status: 'done', subs: ['Secciones', 'Modelo de datos', 'Documento'], subsDone: 3 },
]

export function buildTasks(ctx: MockContext): Task[] {
  return SEEDS.map((seed, index) => {
    const subtasks: Subtask[] = seed.subs.map((title, i) => ({
      id: `${seed.id}-s${i}`,
      title,
      done: seed.status === 'done' || i < seed.subsDone,
    }))
    return {
      id: seed.id,
      title: seed.title,
      notes: seed.notes ?? null,
      status: seed.status,
      priority: seed.priority,
      dueOn: seed.due === null ? null : ctx.day(seed.due),
      doneAt: seed.status === 'done' ? ctx.at(seed.due ?? 0, '09:30') : null,
      position: index,
      project: seed.project ? PROJECTS[seed.project] : null,
      subtasks,
    }
  })
}
