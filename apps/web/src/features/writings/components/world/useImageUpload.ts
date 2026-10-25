'use client'

import { COVER_IMAGE_MAX_BYTES } from '@kairo/shared'
import { useRef, useState } from 'react'

import { useToast } from '@/components/ui/Toast'
import { formatBytes } from '@/lib/bytes'
import { uploadToSignedUrl } from '@/lib/supabase/storage-upload'

import type { SignedUploadResult, WritingActionResult } from '../../action-result'

type Steps = {
  sign: (file: { name: string; mime: string; sizeBytes: number }) => Promise<SignedUploadResult>
  confirm: (path: string) => Promise<WritingActionResult>
  success: string
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

// Subir una imagen (foto de un personaje, portada de una ficha, mapa del mundo) en los dos pasos de la decisión #44:
// la API firma, el navegador sube los bytes directo a Storage con esa firma y la API confirma, volviendo a revisar
// qué se subió. Aquí se revisa antes el tipo y el tamaño solo para no hacer esperar a nadie por algo que la API va
// a rechazar de todos modos. `pick()` abre el selector de archivos.
export function useImageUpload(steps: Steps) {
  const toast = useToast()
  const input = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    if (!IMAGE_TYPES.includes(file.type)) return toast.show({ message: 'Elige una imagen (PNG, JPG, WEBP o GIF).', icon: 'info' })
    if (file.size > COVER_IMAGE_MAX_BYTES) return toast.show({ message: `La imagen pesa más de ${formatBytes(COVER_IMAGE_MAX_BYTES)}.`, icon: 'info' })
    setUploading(true)
    try {
      const signed = await steps.sign({ name: file.name, mime: file.type, sizeBytes: file.size })
      if (!signed.ok) return toast.show({ message: signed.message, icon: 'info' })
      const { error } = await uploadToSignedUrl(signed.path, signed.token, file)
      if (error) return toast.show({ message: 'No pudimos subir la imagen. Intenta otra vez.', icon: 'info' })
      const confirmed = await steps.confirm(signed.path)
      if (!confirmed.ok) return toast.show({ message: confirmed.message ?? 'No se pudo guardar la imagen.', icon: 'info' })
      toast.show({ message: steps.success, icon: 'check' })
    } finally {
      setUploading(false)
    }
  }

  function pick() {
    if (!input.current) {
      const element = document.createElement('input')
      element.type = 'file'
      element.accept = IMAGE_TYPES.join(',')
      element.addEventListener('change', () => {
        const file = element.files?.[0]
        element.value = ''
        if (file) void upload(file)
      })
      input.current = element
    }
    input.current.click()
  }

  return { pick, upload, uploading }
}
