import { stagger, type Transition, type Variants } from 'motion/react'

// Las mismas curvas y duraciones que --ease-*/--duration-* de styles/tokens.css,
// en el formato que pide Motion (segundos y arreglos de 4 números). Si cambias
// un token allá, cámbialo aquí también: CSS y Motion deben sentirse iguales.
export const EASE_OUT = [0.3, 0.7, 0.2, 1] as const
export const EASE_SPRING = [0.3, 1.6, 0.5, 1] as const

export const DURATION = {
  fast: 0.15,
  base: 0.2,
  slow: 0.38,
} as const

// Resortes con nombre: cada uno tiene un uso, para que la app no termine con
// veinte combinaciones de stiffness/damping distintas.
export const SPRING = {
  // Paneles laterales y modales: llegan rápido y se asientan sin rebotar.
  panel: { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 },
  // Cosas pequeñas que "aparecen" (doodles, checks, insignias): un rebote leve.
  pop: { type: 'spring', stiffness: 520, damping: 22 },
  // Indicadores que se deslizan entre opciones (layoutId): nav, segmentados.
  slide: { type: 'spring', stiffness: 460, damping: 36 },
  // Números y barras que cambian de valor.
  soft: { type: 'spring', stiffness: 140, damping: 22 },
} as const satisfies Record<string, Transition>

// Entrada estándar de un bloque: sube un poco y aparece.
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
}

// Contenedor que escalona a sus hijos (cada hijo usa fadeUp u otra variante
// con los mismos nombres hidden/show).
export function staggerList(step = 0.05, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { delayChildren: stagger(step, { startDelay: delay }) } },
  }
}

// Filas de una lista que pueden entrar, salir y reordenarse (con layout).
export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
  exit: { opacity: 0, x: -12, transition: { duration: DURATION.base, ease: EASE_OUT } },
}

// Menús y popovers: crecen desde su esquina de origen.
export const popover: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, scale: 0.98, transition: { duration: DURATION.fast, ease: EASE_OUT } },
}
