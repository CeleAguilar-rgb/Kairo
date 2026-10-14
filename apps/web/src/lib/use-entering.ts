import { useEffect, useState } from 'react'

// true solo durante los primeros `ms` después de montarse. Sirve para darle a la ENTRADA de
// una pantalla un escalonado largo (cada fila llega un poco después de la anterior) sin que
// ese retraso alcance a lo que se agrega después: una tarea nueva debe aparecer enseguida,
// no medio segundo tarde.
export function useEntering(ms = 1200) {
  const [entering, setEntering] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), ms)
    return () => clearTimeout(timer)
  }, [ms])
  return entering
}
