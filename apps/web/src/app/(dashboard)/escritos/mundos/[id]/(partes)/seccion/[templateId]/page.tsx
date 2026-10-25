import { SectionTab } from '@/features/writings'

type SectionPageProps = { params: Promise<{ templateId: string }> }

// Mundo → una sección extra (Magia, Objetos…): sus notas, su plantilla y "+ Nueva nota".
export default async function WorldSectionPage({ params }: SectionPageProps) {
  const { templateId } = await params
  return <SectionTab templateId={templateId} />
}
