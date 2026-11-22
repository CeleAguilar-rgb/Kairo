'use client'

import { useRouter } from 'next/navigation'

import { usePageAction } from '@/components/layout/PageAction'

import { Button } from './Button'
import { ButtonLink } from './ButtonLink'
import { LineIcon } from './Card'
import styles from './AddButton.module.css'

type AddButtonProps = {
  label: string
  className?: string
  // Para adelantar la carga de lo que abre el botón cuando el mouse se acerca o recibe el foco (solo con `onClick`).
  onPreload?: () => void
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never })

// El botón de crear ("Nueva tarea", "Nuevo evento", "Movimiento"): la acción principal de la pantalla. En escritorio
// es el botón con su texto. En el teléfono no se ve: esa misma acción la hace el "+" flotante (la declara aquí con
// usePageAction), así no hay dos "+" ni una fila de controles de más. Con `href` navega (un enlace de verdad);
// con `onClick` abre algo en la misma pantalla.
export function AddButton({ label, className, href, onClick, onPreload }: AddButtonProps) {
  const router = useRouter()
  usePageAction(label, () => (href ? router.push(href) : onClick?.()), onPreload)

  const classes = [styles.add, className].filter(Boolean).join(' ')
  const content = (
    <>
      <LineIcon d="M12 5v14M5 12h14" size={16} strokeWidth={2} />
      {label}
    </>
  )

  return href ? (
    <ButtonLink href={href} className={classes}>
      {content}
    </ButtonLink>
  ) : (
    <Button className={classes} onClick={onClick} onPointerEnter={onPreload} onFocus={onPreload}>
      {content}
    </Button>
  )
}
