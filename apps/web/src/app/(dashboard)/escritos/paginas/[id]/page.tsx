import { notFound, redirect } from 'next/navigation'

import { PageEnter } from '@/components/layout/PageEnter'
import { PageEditor } from '@/features/writings'
import { getPageEditor } from '@/features/writings/api'
import { getMe } from '@/lib/account/api'

import styles from './page.module.css'

type WritingPageProps = { params: Promise<{ id: string }> }

// Una página de Escritos (Pagina.dc.html): un capítulo, una página de un cuaderno o una nota. El editor es de
// cliente (Tiptap); aquí solo se piden los datos y se decide si existe.
export default async function WritingPage({ params }: WritingPageProps) {
  const { id } = await params
  const [me, view] = await Promise.all([getMe(), getPageEditor(id)])
  if (!me) redirect('/bienvenida')
  if (!view) notFound()

  return (
    <PageEnter>
      <main className={styles.main}>
        {/* `key`: al pasar de una página a otra el editor empieza de cero, no arrastra el texto de la anterior. */}
        <PageEditor key={view.id} view={view} />
      </main>
    </PageEnter>
  )
}
