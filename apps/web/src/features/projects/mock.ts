import 'server-only'

import type { MockContext } from '@/lib/mock/context'

import type { Project } from './types'

// Mismos ids que features/tasks/mock.ts. El avance y el número de tareas
// salen de Main.dc.html y Proyectos.dc.html.
export function buildProjects(ctx: MockContext): Project[] {
  return [
    { id: 'p-dash', name: 'Dashboard personal', kind: 'personal', status: 'active', description: 'Kairo: organizar la vida en un solo lugar.', coverPath: null, startedOn: ctx.day(-40), goalOn: ctx.day(60), progress: 0.35, taskCount: 14 },
    { id: 'p-bot', name: 'Bot de marketing', kind: 'work', status: 'active', description: 'Base reutilizable para los siguientes bots.', coverPath: null, startedOn: ctx.day(-60), goalOn: ctx.day(20), progress: 0.6, taskCount: 9 },
    { id: 'p-pel', name: 'Juego de peluches', kind: 'personal', status: 'active', description: null, coverPath: null, startedOn: ctx.day(-90), goalOn: null, progress: 0.2, taskCount: 12 },
    { id: 'p-67d', name: '67downloader', kind: 'personal', status: 'active', description: null, coverPath: null, startedOn: ctx.day(-120), goalOn: ctx.day(14), progress: 0.8, taskCount: 6 },
    { id: 'p-vin', name: 'VinculaPSI', kind: 'work', status: 'paused', description: null, coverPath: null, startedOn: ctx.day(-30), goalOn: null, progress: 0.45, taskCount: 5 },
    { id: 'p-web', name: 'Web para foráneos', kind: 'personal', status: 'paused', description: null, coverPath: null, startedOn: null, goalOn: null, progress: 0.1, taskCount: 4 },
    { id: 'p-ing', name: 'Ingeniería o maestría', kind: 'school', status: 'active', description: null, coverPath: null, startedOn: ctx.day(-10), goalOn: ctx.day(200), progress: 0.15, taskCount: 7 },
  ]
}
