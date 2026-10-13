'use server'

import type { CompleteOnboardingInput } from '@kairo/shared'
import { redirect } from 'next/navigation'
import { api, ApiError } from '@/lib/api-client'

type ActionResult = { error: string } | undefined

// redirect() fuera del try: lanza internamente una señal propia de Next.js
// (NEXT_REDIRECT) que no hay que confundir con un error real.
export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<ActionResult> {
  try {
    await api.post('/me/onboarding', input)
  } catch (error) {
    return {
      error:
        error instanceof ApiError
          ? error.message
          : 'No pudimos guardar tu bienvenida. Intenta de nuevo.',
    }
  }

  redirect('/')
}
