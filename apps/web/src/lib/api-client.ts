import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { serverEnv } from '@/lib/server-env'

// Siempre { error: { code, message } } (apps/api/src/common/filters/http-exception.filter.ts).
type ApiErrorBody = { error: { code: string; message: string } }

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

// El navegador nunca llama a la API directo (regla #1): este cliente solo se
// usa desde Server Components (lecturas) y Server Actions (mutaciones), y
// adjunta el access token de la sesión de Supabase de la persona que pide.
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(`${serverEnv.API_URL}/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  })

  if (response.status === 204) return undefined as T

  // Un endpoint que no devuelve nada (el "Deshacer" de Día a día y de Finanzas) responde con el cuerpo vacío:
  // no hay JSON que leer, y response.json() fallaría aunque la API sí hubiera hecho lo pedido.
  const text = await response.text()
  const body = (text ? JSON.parse(text) : undefined) as T | ApiErrorBody | undefined

  if (!response.ok) {
    const error = (body as ApiErrorBody | undefined)?.error
    throw new ApiError(response.status, error?.code ?? 'INTERNAL_ERROR', error?.message ?? 'Algo salió mal. Intenta de nuevo.')
  }

  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
