import { DemoShowcase } from './DemoShowcase'

// El Inicio real llega con la Fase 1 (molde Inicio + Tareas). El candado de
// sesión/bienvenida vive en layout.tsx, compartido por todas las rutas del
// dashboard.
export default function DashboardHome() {
  return <DemoShowcase />
}
