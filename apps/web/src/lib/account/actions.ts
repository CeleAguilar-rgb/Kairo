'use server'

import {
  updateSectionsSchema,
  type CompleteOnboardingInput,
  type UpdateProfileInput,
  type UpdateSectionsInput,
} from '@kairo/shared'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { api, ApiError } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'
import { DEMO_SECTIONS_COOKIE, encodeDemoSections } from './demo-sections'

type ActionResult = { error: string } | undefined

function toActionError(error: unknown, fallback: string): ActionResult {
  return { error: error instanceof ApiError ? error.message : fallback }
}

// redirect() fuera del try: lanza internamente una señal propia de Next.js
// (NEXT_REDIRECT) que no hay que confundir con un error real.
export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<ActionResult> {
  try {
    await api.post('/me/onboarding', input)
  } catch (error) {
    return toActionError(
      error,
      'No pudimos guardar tu bienvenida. Intenta de nuevo.',
    )
  }

  redirect('/')
}

// revalidatePath('/', 'layout'): el nombre y el doodle también se ven en el
// Topnav (app/(dashboard)/layout.tsx), no solo en Perfil.
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ActionResult> {
  try {
    await api.patch('/me', input)
  } catch (error) {
    return toActionError(
      error,
      'No pudimos guardar los cambios. Intenta de nuevo.',
    )
  }

  revalidatePath('/', 'layout')
}

export async function updateSections(
  input: UpdateSectionsInput,
): Promise<ActionResult> {
  // En demo no hay API: la lista se valida igual y se guarda en una cookie (demo-sections.ts).
  if (DEMO_MODE) {
    const parsed = updateSectionsSchema.safeParse(input)
    if (!parsed.success) return { error: 'No pudimos guardar el orden. Intenta de nuevo.' }
    const store = await cookies()
    store.set(DEMO_SECTIONS_COOKIE, encodeDemoSections(parsed.data.sections), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      httpOnly: true,
    })
    revalidatePath('/', 'layout')
    return
  }

  try {
    await api.patch('/me/sections', input)
  } catch (error) {
    return toActionError(
      error,
      'No pudimos guardar el orden. Intenta de nuevo.',
    )
  }

  revalidatePath('/', 'layout')
}
