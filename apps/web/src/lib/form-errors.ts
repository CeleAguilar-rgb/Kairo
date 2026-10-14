// Convierte los problemas que devuelve un esquema de validación en un mensaje por campo
// ("name", "goalOn", "links.0.url"): el primero de cada campo. Lo usan el formulario (para
// validar antes de enviar) y las acciones de servidor (que vuelven a validar al recibir).
type Issue = { path: PropertyKey[]; message: string }

export function fieldErrors(issues: Issue[]): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form'
    if (!(key in errors)) errors[key] = issue.message
  }
  return errors
}
