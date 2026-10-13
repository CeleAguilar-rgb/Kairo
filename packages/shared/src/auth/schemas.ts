import { z } from 'zod'

export const setPasswordSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })

export type SetPasswordInput = z.infer<typeof setPasswordSchema>

export const loginSchema = z.object({
  email: z.string().email('Escribe un correo válido.'),
  password: z.string().min(1, 'Escribe tu contraseña.'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const requestPasswordResetSchema = z.object({
  email: z.string().email('Escribe un correo válido.'),
})

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>
