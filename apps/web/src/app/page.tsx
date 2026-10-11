'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'

import styles from './page.module.css'

export default function Home() {
  const [done, setDone] = useState(false)

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>kairo</h1>
      <p className={styles.subtitle}>
        Vista temporal para revisar tokens, fuentes y los primeros componentes de <code>components/ui/</code>. Se
        reemplaza por el Inicio real en la Fase 1.
      </p>

      <section className={styles.row}>
        <Button variant="solid">Nueva tarea</Button>
        <Button variant="secondary">Agregar membresía</Button>
        <Button variant="ghost">Cancelar</Button>
        <Button variant="danger">Eliminar</Button>
        <Button variant="plain" iconOnly aria-label="Buscar">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </Button>
      </section>

      <section className={styles.row}>
        <Checkbox checked={done} onToggle={() => setDone((value) => !value)} label="Marcar pendiente de ejemplo" />
        <Checkbox checked={!done} onToggle={() => setDone((value) => !value)} label="Pendiente de ejemplo, estado contrario" />
        <span>Toca cualquiera para alternar el estado.</span>
      </section>

      <section className={styles.fields}>
        <Input id="demo-titulo" label="Título" placeholder="Escribe qué hay que hacer" hint="Aparecerá en la lista de hoy." />
        <Input id="demo-error" label="Con error" error="Escribe qué hay que hacer para crear la tarea." />
      </section>

      <section className={styles.cards}>
        <Card>
          <h2>Tarjeta normal</h2>
          <p>Usa --surface y --border.</p>
        </Card>
        <Card tone="inverted">
          <h2>Tarjeta oscura</h2>
          <p>Usa --surface-inverted.</p>
        </Card>
      </section>
    </main>
  )
}
