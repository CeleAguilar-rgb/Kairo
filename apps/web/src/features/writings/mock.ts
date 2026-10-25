import 'server-only'

import { DEFAULT_TEMPLATES, SECTION_TEMPLATE_EXAMPLES, tiptapWordCount, type TemplateSeed, type TiptapDoc } from '@kairo/shared'

import { addDays, startOfWeek } from '@/lib/dates'
import type { MockContext } from '@/lib/mock/context'

import { callout, doc, gallery, heading, para, picture, quote, tasks, toggle } from './mock-docs'
import type { CharacterRecord, EraRecord, EventRecord, FieldValue, Library, NoteRecord, NoteTemplate, PageRecord, StoryRecord, WritingDay } from './types'

// El mundo de ejemplo del modo demo (lib/demo.ts): Aurelun tal como lo trae el canvas (Escritos*.dc.html), con la
// misma forma de datos que devuelve `GET /writings/library`. Solo se lee: en modo demo no hay API, así que guardar
// algo responde con un error (igual que en las demás secciones).

const WORLD_ID = 'w-aurelun'
const N = 'https://app.notion.com/p/'

type Seeded = { template: NoteTemplate; field: (name: string) => string }

// Una plantilla del mundo de ejemplo a partir de su semilla (packages/shared), con ids legibles.
function seedTemplate(seed: TemplateSeed, id: string, position: number): Seeded {
  const template: NoteTemplate = {
    id,
    worldId: WORLD_ID,
    key: seed.key,
    name: seed.name,
    color: seed.color,
    position,
    fields: seed.fields.map((field, index) => ({ id: `${id}-f${index}`, ...field, options: field.options.map((option) => ({ ...option })) })),
  }
  const field = (name: string) => {
    const found = template.fields.find((item) => item.name === name)
    if (!found) throw new Error(`La plantilla ${seed.name} no tiene el campo ${name}`)
    return found.id
  }
  return { template, field }
}

const cover = { mode: 'auto' as const, color: null, position: 1, url: null }

// El contenido de cada página de ejemplo, para abrirla en el editor (la lista no lo trae, igual que la API).
type DemoBuild = { library: Library; bodies: Record<string, TiptapDoc> }

export function buildWritingsLibrary(ctx: MockContext): Library {
  return build(ctx).library
}

export function demoPageContent(ctx: MockContext, id: string): TiptapDoc | null {
  return build(ctx).bodies[id] ?? null
}

function build(ctx: MockContext): DemoBuild {
  const at = (dayOffset: number, time = '12:00') => ctx.at(dayOffset, time)
  const stamp = { createdAt: at(-60), updatedAt: at(-2) }

  // --- Plantillas ---------------------------------------------------------------------------------------
  const [characterSeed, speciesSeed, placeSeed] = DEFAULT_TEMPLATES
  const P = seedTemplate(characterSeed!, 'tpl-character', 0)
  const S = seedTemplate(speciesSeed!, 'tpl-species', 1)
  const L = seedTemplate(placeSeed!, 'tpl-place', 2)
  const sections = SECTION_TEMPLATE_EXAMPLES.map((seed, index) => seedTemplate(seed, `tpl-sec-${index + 1}`, 3 + index))
  const [MAGIA, OBJETOS, LINAJES, DEIDADES, RELIGION] = sections as [Seeded, Seeded, Seeded, Seeded, Seeded]
  const templates = [P, S, L, ...sections].map((item) => item.template)

  // --- Eras y eventos ----------------------------------------------------------------------------------
  const eras: EraRecord[] = [
    { id: 'era-1', worldId: WORLD_ID, name: 'Era Lunar', shortName: 'Lunar', summary: 'Origen de Aurelun y división en Vadronia y Nocturnia.', note: 'quedará por encima hasta terminar la historia de Vadronia', position: 0 },
    { id: 'era-2', worldId: WORLD_ID, name: 'Era del Filo Interno / Herederos Caídos', shortName: 'Filo Interno', summary: 'Historia de Vadronia, guerras internas y fundación de los cuatro reinos.', note: 'corregir cuando haya ideas claras', position: 1 },
    { id: 'era-3', worldId: WORLD_ID, name: 'Era del Letargo Dorado', shortName: 'Letargo Dorado', summary: 'Miles de años de paz y desarrollo humano. Historia de Jericó y Eleanor; tal vez más historias humanas.', note: '', position: 2 },
    { id: 'era-4', worldId: WORLD_ID, name: 'Era de las Sombras Reconocidas', shortName: 'Sombras Reconocidas', summary: 'Desastre mestizo, historia de Nocturnia y crisis que afecta a todo Aurelun.', note: 'nose', position: 3 },
  ]

  type EventSeed = [title: string, description: string, who?: string[], where?: string[], notes?: string[]]
  const ERA_EVENTS: Record<string, EventSeed[]> = {
    'era-1': [
      ['Separación cósmica', 'La luna y el sol son separados, porque juntos creaban caos en el universo.'],
      ['Nacimiento de Aurelun', 'La Luna encuentra Aurelun y, desde su duelo, crea a todas las especies. Después deja de intervenir.', ['ch-luna']],
      ['Surge Cross', 'Nace Cross, hija de un cambiaformas y un hada. Su existencia provoca desequilibrio emocional.', ['ch-cross'], [], ['Primera mestiza: hija de un hada y un cambiaformas.', 'Rechazada por ambas razas; termina buscando la magia original del mundo.']],
      ['Corrupción de Cross', 'Discriminada por su naturaleza, encuentra refugio en la magia Aurelun y es corrompida por el odio a las razas favoritas de la Luna.', ['ch-cross']],
      ['La era de Cross', 'El odio se expande por las razas; un mundo de paz se vuelve matar o morir.'],
      ['Años de guerra I', 'Hadas y cambiaformas se unen para acabar con Cross; ambas razas pierden a miles.'],
      ['Intervención de la Luna', 'Cross es derrotada pero su alma se esconde en el mundo. La Luna separa Aurelun: nacen Vadronia y Nocturnia.', ['ch-luna'], [], ['La Luna no puede intervenir directo: crea la Muralla con ayuda de hadas y cambiaformas.']],
      ['Hadas y cambiaformas ocultos', 'Las hadas se esconden en los bosques del este de Vadronia; los cambiaformas, en el Bosque de los Susurros, hasta su extinción.', [], ['pl-bosqueste', 'pl-susurros']],
    ],
    'era-2': [
      ['El rey Krandalf', 'Los humanos unifican Vadronia bajo una monarquía y eligen a Krandalf como rey.', ['ch-krandalf'], ['pl-vadronia']],
      ['Encuentro con el alma de Cross', 'En un viaje, Krandalf encuentra la cueva donde yace el alma de Cross, que se apodera de él.', ['ch-krandalf', 'ch-cross']],
      ['Guerra de los Tres Siglos', 'Oprimidos por su tiranía, los habitantes se alzan en una guerra larga y sin esperanza.'],
      ['Los humanos descubren la magia Aurelun', 'Al minar encuentran piedras con fragmentos de luna. Krandalf confisca todos los avances para su ejército.'],
      ['Nacimiento de los Bellmore', 'En el bosque del este nacen Kain, Cain, Kori y Coil; las hadas los bendicen con un fragmento de luna partido en cuatro.', ['sec-bellmore'], ['pl-bosqueste']],
      ['La marcha hacia el sur', 'Los hermanos forman un ejército y marchan al castillo del rey; aparecen los dragones de Krandalf.'],
      ['Confrontación final', 'Kain lo hiere con el arma de la poción; Kori, al ver que no basta, le clava su espada.', ['ch-kain', 'ch-kori', 'ch-krandalf']],
      ['Muerte de Krandalf', 'El alma de Cross huye debilitada. El rey, libre, muere diciendo "Lo siento". Vadronia queda en ruinas.'],
      ['Fundación de los cuatro reinos', 'Coil propone dividir Vadronia: nacen Sudria, Ovestria, Estria y Nordria.', ['ch-coil'], ['pl-sudria', 'pl-nordria', 'pl-ovestria', 'pl-estria']],
      ['Las armas sagradas', 'Los hermanos sellan su poder en cuatro armas que pasarán de generación en generación.', ['sec-bellmore', 'sec-armas']],
    ],
  }
  const events: EventRecord[] = Object.entries(ERA_EVENTS).flatMap(([eraId, list]) =>
    list.map(([title, description, who = [], where = [], notes = []], index) => ({ id: `${eraId}-ev-${index + 1}`, eraId, title, description, causes: '', consequences: '', notes, who, where, position: index })),
  )

  // --- Lugares --------------------------------------------------------------------------------------------
  const placeType = L.field('Tipo de lugar')
  const placeLives = L.field('Quién vive')
  const placeRuler = L.field('Quién gobierna')
  const placeClimate = L.field('Clima')
  const placeFounded = L.field('Fundado en')
  const placeHistory = L.field('Historia')

  const note = (input: { id: string; template: Seeded; name: string; summary?: string; parentId?: string | null; draft?: boolean; url?: string; values?: Record<string, FieldValue>; dark?: boolean }, position: number): NoteRecord => ({
    id: input.id,
    worldId: WORLD_ID,
    templateId: input.template.template.id,
    parentId: input.parentId ?? null,
    name: input.name,
    summary: input.summary ?? '',
    draft: input.draft ?? false,
    values: input.values ?? {},
    extras: [],
    url: input.url ?? null,
    position,
    // Nocturnia lleva portada de color tinta: así su tarjeta sale de noche (world-utils.ts, isDarkPlace).
    cover: input.dark ? { mode: 'color', color: 'ink', position: 1, url: null } : cover,
    ...stamp,
  })

  const places: NoteRecord[] = [
    { id: 'pl-vadronia', name: 'Vadronia', summary: 'Humanos vigilados por hadas. Unificada bajo el rey Krandalf y dividida después en cuatro reinos por los hermanos Bellmore.', url: `${N}2214aa5f773b80828892ce92b53d606a`, values: { [placeType]: 'region', [placeRuler]: 'Cuatro reinos, uno por hermano Bellmore', [placeLives]: ['sp-humanos', 'sp-hadas'], [placeFounded]: 'era-2', [placeHistory]: 'Unificada bajo Krandalf; tras su muerte, Coil propone dividirla y nacen Sudria, Ovestria, Estria y Nordria.' } },
    { id: 'pl-nocturnia', dark: true, name: 'Nocturnia', summary: 'Hogar de vampiros, hombres lobo y brujas, las hadas traidoras que probaron la magia Aurelun. Vigilada por cambiaformas.', values: { [placeType]: 'region', [placeLives]: ['sp-vampiros', 'sp-lobos', 'sp-brujas', 'sp-cambiaformas'], [placeFounded]: 'era-1' } },
    { id: 'pl-sudria', parentId: 'pl-vadronia', name: 'Sudria', summary: 'Uno de los cuatro reinos de Vadronia. De aquí es Jericó.', values: { [placeType]: 'kingdom', [placeLives]: ['sp-humanos'], [placeFounded]: 'era-2' } },
    { id: 'pl-nordria', parentId: 'pl-vadronia', name: 'Nordria', summary: 'Uno de los cuatro reinos de Vadronia. De aquí es Eleanor.', values: { [placeType]: 'kingdom', [placeFounded]: 'era-2' } },
    { id: 'pl-ovestria', parentId: 'pl-vadronia', name: 'Ovestria', values: { [placeType]: 'kingdom', [placeFounded]: 'era-2' } },
    { id: 'pl-estria', parentId: 'pl-vadronia', name: 'Estria', values: { [placeType]: 'kingdom', [placeFounded]: 'era-2' } },
    { id: 'pl-bosqueste', parentId: 'pl-vadronia', name: 'Bosques del este', summary: 'Donde se esconden las últimas hadas, en lo más lejano del este. Clima frío, con nevadas.', values: { [placeType]: 'forest', [placeLives]: ['sp-hadas'], [placeClimate]: 'Frío, nevadas frecuentes' } },
    { id: 'pl-castillo', parentId: 'pl-sudria', name: 'El castillo de la oscuridad', values: { [placeType]: 'castle' } },
    { id: 'pl-mercado', parentId: 'pl-sudria', name: 'El mercado', values: { [placeType]: 'market' } },
    { id: 'pl-susurros', parentId: 'pl-nocturnia', name: 'Bosque de los Susurros', summary: 'Donde se escondieron los últimos cambiaformas.', values: { [placeType]: 'forest' } },
    { id: 'pl-muralla', name: 'La Muralla', draft: true, summary: 'La Luna la crea con hadas y cambiaformas: protege a humanos y hadas, y aísla a vampiros y hombres lobo.', values: { [placeType]: 'place', [placeFounded]: 'era-1' } },
  ].map((item, index) => note({ ...item, template: L }, index))

  // --- Especies ----------------------------------------------------------------------------------------
  const home = S.field('Dónde vive')
  const lifespan = S.field('Cuánto vive')
  const powers = S.field('Poderes')
  const weakness = S.field('Debilidad')
  const origin = S.field('Origen')
  const lifeCycle = S.field('Ciclo de vida')
  const looks = S.field('Apariencia')
  const society = S.field('Sociedad y cultura')

  const species: NoteRecord[] = [
    { id: 'sp-hadas', name: 'Hadas', summary: 'Las criaturas más cercanas a la Luna. Vigilan Vadronia; las pocas que quedan se esconden en los bosques del este.', url: `${N}2084aa5f773b80a5b8b5d6748bc50c15`, values: { [home]: ['pl-bosqueste'], [lifespan]: 'Unos 500 años', [powers]: 'Vuelo, magia emocional, cambiar de tamaño', [weakness]: 'Fuego y escamas de dragón', [origin]: 'Aceptación: el único acto de creación consciente de la Luna. Su corazón es un fragmento lunar.', [lifeCycle]: 'Nacen por un ritual con el fragmento lunar de un hada fallecida; maduran sin llegar a la vejez.', [looks]: 'Forma humana femenina, orejas y pies en punta, alas transparentes de colores. Pueden encogerse a 6–10 cm.', [society]: 'Matriarcal: viven en "Círculos de Luz" dentro de árboles huecos, guiadas por las Madres luz.' } },
    { id: 'sp-humanos', name: 'Humanos', summary: 'Unificaron Vadronia bajo Krandalf y hoy viven en los cuatro reinos.', values: { [home]: ['pl-vadronia'], [origin]: 'Negación: frágiles, creativos y espirituales. Nacieron de la nostalgia de la Luna.' } },
    { id: 'sp-cambiaformas', name: 'Cambiaformas', summary: 'Vigilan Nocturnia. Llevados a la extinción por la unión de brujas, vampiros y hombres lobo.', url: `${N}2214aa5f773b8086a423e9d7a58951ed`, values: { [home]: ['pl-nocturnia'], [origin]: 'Negociación: almas errantes que reciben una segunda oportunidad.' } },
    { id: 'sp-vampiros', name: 'Vampiros', summary: 'Habitantes de Nocturnia.', values: { [home]: ['pl-nocturnia'], [origin]: 'Enojo: sedientos y nocturnos, reflejan la ira de la Luna.' } },
    { id: 'sp-lobos', name: 'Hombres lobo', summary: 'Habitantes de Nocturnia.', values: { [home]: ['pl-nocturnia'], [origin]: 'Depresión: ligados a los ciclos lunares, salvajes y melancólicos.' } },
    { id: 'sp-brujas', name: 'Brujas', summary: 'Hadas traidoras que probaron la magia Aurelun.', values: { [home]: ['pl-nocturnia'], [origin]: 'Hadas que cedieron a la magia del mundo cuando apareció Cross.' } },
    { id: 'sp-dragones', name: 'Dragones', summary: 'Aparecen del lado de Krandalf en la marcha hacia el sur.', values: { [home]: ['pl-vadronia'], [origin]: 'Criaturas primigenias: ya dominaban el mundo antes de que llegara la Luna.' } },
  ].map((item, index) => note({ ...item, template: S }, index))

  // --- Secciones extra ----------------------------------------------------------------------------------
  const sectionNotes: NoteRecord[] = [
    note({ id: 'sec-lunar', template: MAGIA, name: 'Magia lunar', summary: 'Emocional, luminosa y fantasiosa. No se lleva con la magia original del mundo.', values: { [MAGIA.field('Origen')]: 'La Luna, desde su duelo', [MAGIA.field('Quién la usa')]: ['sp-hadas'] } }, 0),
    note({ id: 'sec-mundo', template: MAGIA, name: 'Magia del mundo', draft: true, summary: 'La magia original: caótica, visceral, ligada al instinto, a la sangre y a la supervivencia.', values: { [MAGIA.field('Quién la usa')]: ['ch-cross', 'sp-vampiros', 'sp-lobos'] } }, 1),
    note({ id: 'sec-fragmentos', template: MAGIA, name: 'Fragmentos de luna', summary: 'Restos de las hadas caídas en la guerra de Cross. Los humanos los encuentran en piedras al minar.', values: { [MAGIA.field('Quién la usa')]: ['sp-hadas', 'sp-humanos'] } }, 2),
    note({ id: 'sec-armas', template: OBJETOS, name: 'Las cuatro armas sagradas', summary: 'Los Bellmore sellan su poder en cuatro armas que pasan de generación en generación.', values: { [OBJETOS.field('Quién lo tiene')]: ['sec-bellmore'], [OBJETOS.field('Era')]: 'era-2' } }, 0),
    note({ id: 'sec-bellmore', template: LINAJES, name: 'Los Bellmore', summary: 'Kain, Cain, Kori y Coil: vencieron a Krandalf y fundaron los cuatro reinos.', values: { [LINAJES.field('Miembros')]: ['ch-kain', 'ch-cain', 'ch-kori', 'ch-coil'], [LINAJES.field('Dónde')]: ['pl-vadronia'] } }, 0),
    note({ id: 'sec-dios', template: DEIDADES, name: 'El Dios del Mundo', draft: true, summary: 'Distante: no interviene, solo observa y vigila el equilibrio.', values: { [DEIDADES.field('Qué domina')]: 'La magia original del mundo' } }, 0),
    note({ id: 'sec-religion', template: RELIGION, name: 'Religión de la Luna', values: { [RELIGION.field('Cree en')]: ['ch-luna'] } }, 0),
  ]

  // --- Personajes ----------------------------------------------------------------------------------------
  const fullName = P.field('Nombre completo')
  const kind = P.field('Especie')
  const born = P.field('Lugar de origen')
  const role = P.field('Rol en la historia')
  const era = P.field('Era')
  const wants = P.field('Qué quiere')
  const drives = P.field('Qué lo mueve')
  const relations = P.field('Relaciones')

  type CharacterSeed = [id: string, name: string, place: string | null, eraId: string, roleText?: string, summary?: string, url?: string]
  const CH: CharacterSeed[] = [
    ['ch-jerico', 'Jericó Lucienne Bonaventure', 'pl-sudria', 'era-3', 'Protagonista', 'Protagonista de Un cuento de amores y dragones, del reino de Sudria.', `${N}15c4aa5f773b8038a9d4f2c2df96754a`],
    ['ch-eleanor', 'Eleanor Josephine Nicholson', 'pl-nordria', 'era-3', 'Protagonista', 'Protagonista de Un cuento de amores y dragones, del reino de Nordria.', `${N}15c4aa5f773b8005b4f3f5210c36e429`],
    ['ch-lasyl', 'Lasyl', 'pl-sudria', 'era-3'],
    ['ch-heinar', 'Rey Heinar', 'pl-sudria', 'era-3'],
    ['ch-ophelia', 'Reina Ophelia', 'pl-sudria', 'era-3'],
    ['ch-lucas', 'Príncipe Lucas', 'pl-sudria', 'era-3'],
    ['ch-averet', 'Lainus / Averet', 'pl-sudria', 'era-3'],
    ['ch-gregor', 'Rey Gregor', 'pl-nordria', 'era-3'],
    ['ch-catherine', 'Reina Catherine', 'pl-nordria', 'era-3'],
    ['ch-kainp', 'Príncipe Kain', 'pl-nordria', 'era-3'],
    ['ch-lonan', 'Príncipe Lonan', 'pl-nordria', 'era-3'],
    ['ch-orion', 'Príncipe Orion', 'pl-ovestria', 'era-3'],
    ['ch-kallias', 'Príncipe Kallias', 'pl-ovestria', 'era-3'],
    ['ch-azrael', 'Príncipe Azrael', 'pl-estria', 'era-3'],
    ['ch-alaida', 'Princesa Alaida', 'pl-estria', 'era-3'],
    ['ch-adeline', 'Princesa Adeline', 'pl-estria', 'era-3'],
    ['ch-luna', 'Luna (Luneryss)', null, 'era-1', 'Deidad', 'Encuentra Aurelun y, desde su duelo, crea a todas las especies. Separa el mundo en Vadronia y Nocturnia para proteger a sus especies.', `${N}21c4aa5f773b80ffa979d7e5fe31b6dd`],
    ['ch-cross', 'Cross', null, 'era-1', 'Antagonista', 'Hija de un cambiaformas y un hada. Corrompida por el odio, su alma sobrevive escondida en el mundo y vuelve a través de Krandalf.', `${N}21c4aa5f773b80e6b8abfa9464dfe537`],
    ['ch-krandalf', 'Rey Krandalf', 'pl-vadronia', 'era-2', 'Rey de Vadronia', 'Primer rey de Vadronia unificada; poseído por el alma de Cross. Muere liberado diciendo "Lo siento".'],
    ['ch-kain', 'Kain Bellmore', 'pl-bosqueste', 'era-2', 'Hermano Bellmore', 'Hiere a Krandalf con el arma que contenía la poción.'],
    ['ch-cain', 'Cain Bellmore', 'pl-bosqueste', 'era-2', 'Hermano Bellmore', 'Uno de los cuatro hermanos bendecidos por las hadas con un fragmento de luna.'],
    ['ch-kori', 'Kori Bellmore', 'pl-bosqueste', 'era-2', 'Hermana Bellmore', 'Duda de la poción y clava su espada en la espalda del rey.'],
    ['ch-coil', 'Coil Bellmore', 'pl-bosqueste', 'era-2', 'Hermano Bellmore', 'Propone dividir Vadronia en cuatro reinos, uno para cada hermano.'],
  ]
  const EXTRA: Record<string, Record<string, FieldValue>> = {
    'ch-cross': { [kind]: ['sp-hadas', 'sp-cambiaformas'], [wants]: 'Vengarse de las razas favoritas de la Luna.', [drives]: 'El rechazo: no pertenece a ninguna raza.' },
    'ch-krandalf': { [kind]: ['sp-humanos'], [relations]: 'Poseído por el alma de Cross. Lo vencen los hermanos Bellmore.' },
    'ch-jerico': { [kind]: ['sp-humanos'] },
    'ch-eleanor': { [kind]: ['sp-humanos'] },
  }
  const characters: CharacterRecord[] = CH.map(([id, name, place, eraId, roleText, summary, url], index) => ({
    id,
    worldId: WORLD_ID,
    name,
    summary: summary ?? '',
    draft: false,
    values: { [fullName]: name, ...(place ? { [born]: [place] } : {}), ...(roleText ? { [role]: roleText } : {}), [era]: eraId, ...(EXTRA[id] ?? {}) },
    extras: [],
    url: url ?? null,
    sections: id === 'ch-luna' ? [DEIDADES.template.id] : [],
    position: index,
    imageUrl: null,
    cover,
    ...stamp,
  }))

  // --- Historias y páginas -------------------------------------------------------------------------------
  const ARC_1 = 'arc-1'
  const stories: StoryRecord[] = [
    {
      id: 'st-cuento',
      worldId: WORLD_ID,
      title: 'Un cuento de amores y dragones',
      kind: 'story',
      status: 'in_progress',
      summary: 'Historia de Jericó (Sudria) y Eleanor (Nordria) en los miles de años de paz tras la fundación de los cuatro reinos.',
      wordGoal: 30_000,
      color: 'ink',
      eraId: 'era-3',
      placeId: 'pl-vadronia',
      arcs: [{ id: ARC_1, name: 'Arco 1' }],
      cast: ['ch-jerico', 'ch-eleanor'],
      resources: [
        { id: 'rs-1', name: 'Página de la historia', url: `${N}a272e51c00e24f19951fbdc7e22fd99a` },
        { id: 'rs-2', name: 'Arcos (borrador)', url: `${N}3024aa5f773b80848355d5941b0325df` },
        { id: 'rs-3', name: 'Crónica del Gran Quiebre', url: `${N}2fc4aa5f773b8092ad18fbc31053e843` },
        { id: 'rs-4', name: 'Timeline de la historia', url: `${N}ad57d66c7f4b467487479485e92e092c` },
        { id: 'rs-5', name: 'Playlist en Spotify', url: 'https://open.spotify.com/playlist/02mKkeltAnjab76DWw7zR5' },
      ],
      ...stamp,
    },
    {
      id: 'st-nocturnia',
      worldId: WORLD_ID,
      title: 'Historia de Nocturnia',
      kind: 'story',
      status: 'idea',
      summary: 'El desastre mestizo y la crisis que afecta a todo Aurelun.',
      wordGoal: null,
      color: 'sand',
      eraId: 'era-4',
      placeId: 'pl-nocturnia',
      arcs: [],
      cast: [],
      resources: [],
      ...stamp,
    },
    {
      id: 'st-ideas',
      worldId: null,
      title: 'Cuaderno de ideas',
      kind: 'notebook',
      status: 'in_progress',
      summary: 'Lo que se te ocurre y no quieres perder: frases, ideas de proyectos y referencias con imágenes.',
      wordGoal: null,
      color: 'lavender',
      eraId: null,
      placeId: null,
      arcs: [],
      cast: [],
      resources: [],
      ...stamp,
    },
  ]

  const bodies: Record<string, TiptapDoc> = {}
  const page = (input: Partial<PageRecord> & Pick<PageRecord, 'id' | 'kind' | 'title'> & { body: TiptapDoc; dayOffset: number; time: string }): PageRecord => {
    const { body, dayOffset, time, ...rest } = input
    bodies[rest.id] = body
    return {
      storyId: null,
      parentId: null,
      status: 'none',
      tag: null,
      coverPath: null,
      position: 0,
      arcId: null,
      eraId: null,
      povCharacterId: null,
      createdAt: at(-60),
      ...rest,
      // En la lista los capítulos no traen su contenido (igual que la API); las notas y las páginas de cuaderno sí.
      content: rest.kind === 'chapter' ? null : body,
      wordCount: tiptapWordCount(body),
      updatedAt: at(dayOffset, time),
    }
  }

  const pages: PageRecord[] = [
    page({ id: 'pg-cap-0', storyId: 'st-cuento', kind: 'chapter', title: '0.- Antecedentes de Vadronia', body: CHAPTER_ZERO, status: 'in_progress', position: 0, arcId: ARC_1, eraId: 'era-3', povCharacterId: 'ch-jerico', dayOffset: -1, time: '21:10' }),
    page({ id: 'pg-cap-1', storyId: 'st-cuento', kind: 'chapter', title: 'I.- Jericó', body: doc(), status: 'pending', position: 1, arcId: ARC_1, dayOffset: -3, time: '19:00' }),
    page({ id: 'pg-cap-2', storyId: 'st-cuento', kind: 'chapter', title: 'Una noche de constelaciones', body: doc(), position: 2, dayOffset: -9, time: '22:30' }),
    page({ id: 'pg-cua-1', storyId: 'st-ideas', kind: 'page', title: 'Pendientes de Aurelun', body: doc(tasks([['Revisar nombres de los reinos', true], ['Decidir Nordria o Nodria', false], ['Página de Nocturnia', false]])), position: 0, dayOffset: -2, time: '18:20' }),
    page({ id: 'pg-cua-2', storyId: 'st-ideas', kind: 'page', title: 'Frases sueltas', body: doc(para('Aquí van las frases que se te ocurren para usarlas después.'), para('La luna no perdona a quien le miente, solo espera.'), para('Los dragones recuerdan lo que los reyes olvidan.')), position: 1, dayOffset: -5, time: '23:05' }),
    page({ id: 'pg-cua-3', storyId: 'st-ideas', kind: 'page', title: 'Referencias visuales', body: doc(gallery(['/escritos/paleta-1.svg', '/escritos/paleta-2.svg', '/escritos/paleta-3.svg', '/escritos/paisaje.svg'])), position: 2, dayOffset: -12, time: '16:45' }),
    page({ id: 'pg-nota-1', kind: 'note', title: 'Mapa de Aurelun (boceto)', body: doc(para('Primer boceto de dónde queda cada región. Falta Nocturnia completa.'), picture('/escritos/mapa.svg', 'Boceto del mapa')), coverPath: 'preset:map', tag: 'Aurelun', dayOffset: -1, time: '12:30' }),
    page({ id: 'pg-nota-2', kind: 'note', title: 'Pendientes de Aurelun', body: doc(tasks([['Revisar nombres de los reinos', true], ['Decidir Nordria o Nodria', false], ['Página de Nocturnia', false]])), tag: 'Aurelun', dayOffset: -4, time: '10:15' }),
    page({ id: 'pg-nota-3', kind: 'note', title: 'Colores de Nordria', body: doc(para('Paleta para la corte del norte: noche, oro viejo y lavanda.'), gallery(['/escritos/paleta-1.svg', '/escritos/paleta-2.svg', '/escritos/paleta-3.svg'])), coverPath: 'preset:mood', tag: 'Aurelun', dayOffset: -6, time: '20:00' }),
    page({ id: 'pg-nota-4', kind: 'note', title: 'Frases sueltas', body: doc(para('Aquí van las frases que se te ocurren para usarlas después.')), tag: 'Ideas', dayOffset: -16, time: '09:10' }),
    page({ id: 'pg-nota-5', kind: 'note', title: 'Referencia de paisaje', body: doc(para('Montañas al atardecer para el viaje hacia Nordria.'), picture('/escritos/paisaje.svg', 'Montañas al atardecer')), coverPath: 'preset:photo', tag: 'Aurelun', dayOffset: -18, time: '17:40' }),
    page({ id: 'pg-nota-6', kind: 'note', title: 'Arquitectura de bots', body: doc(para('Módulos separados: entrada, cerebro, salidas. Plantilla base para nuevos bots.')), tag: 'Trabajo', dayOffset: -21, time: '11:25' }),
  ]

  const library: Library = {
    worlds: [
      {
        id: WORLD_ID,
        name: 'Aurelun',
        description: '"Aure", dorado o brillante; "lun", la luna. Un mundo que valora la luz de la luna como fuente de poder y sabiduría.',
        synopsis:
          'Antes de la Luna, Aurelun ya existía: un mundo de dragones y criaturas primigenias, regido por una magia original, cruda y salvaje.\nLa Luna llega en duelo y, sin entender ese mundo, crea a sus especies. Cross, la primera mestiza, rompe el equilibrio y el mundo termina dividido en Vadronia y Nocturnia.\nSiglos después, en la paz de los cuatro reinos, se cruzan las vidas de Jericó y Eleanor.',
        rules: [
          { id: 'ru-1', title: 'Magia Aurelun', text: 'Fragmentos de luna de las hadas caídas en la guerra de Cross. Pocos seres los poseen; los humanos los encuentran en piedras al minar.' },
          { id: 'ru-2', title: 'Armas sagradas', text: 'Los Bellmore sellan su poder en cuatro armas que pasan de generación en generación.' },
        ],
        tabs: ['resumen', 'timeline', 'regions', 'stories', 'characters', 'species', `tpl:${MAGIA.template.id}`],
        stats: null,
        mapUrl: null,
        ...stamp,
      },
    ],
    templates,
    characters,
    notes: [...places, ...species, ...sectionNotes],
    eras,
    events,
    stories,
    pages,
  }
  return { library, bodies }
}

// Las palabras escritas en las últimas dos semanas (la gráfica de la semana de Escritos).
export function buildWritingDays(ctx: MockContext): WritingDay[] {
  const monday = startOfWeek(ctx.today, 'monday')
  const words = [420, 610, 0, 380, 520, 0, 0, 300, 450, 0, 520, 180, 0, 0]
  return words.map((count, index) => ({ day: addDays(monday, index - 7), words: count })).filter((item) => item.day <= ctx.today && item.words > 0)
}

// Los bloques del capítulo "0.- Antecedentes de Vadronia" (Pagina.dc.html). En la lista no viajan: solo al abrirlo.
export const CHAPTER_ZERO: TiptapDoc = doc(
  callout('Era III · Letargo Dorado. Antes de Jericó y Eleanor, la historia de cómo se partió Vadronia.'),
  heading('Escena 1'),
  para('Los humanos unificaron Vadronia bajo una monarquía y eligieron a Krandalf como su rey. Durante un tiempo hubo paz, hasta que en un viaje el rey encontró la cueva donde yacía el alma de Cross, y esta se apoderó de él.'),
  para('Oprimidos por su tiranía, los habitantes se alzaron en una guerra larga y sin esperanza que duró tres siglos. Al minar la tierra encontraron piedras con fragmentos de luna, pero Krandalf confiscó todos los avances para su ejército.'),
  picture('/escritos/mapa.svg', 'Boceto del mapa · Vadronia y Nocturnia'),
  quote('Lo siento, dijo el rey, y por fin dejó de pelear.'),
  para('En el bosque del este nacieron cuatro hermanos: Kain, Cain, Kori y Coil. Las hadas los bendijeron con un fragmento de luna partido en cuatro. Cuando crecieron formaron un ejército y marcharon hacia el sur, hasta el castillo del rey.'),
  gallery(['/escritos/paleta-1.svg', '/escritos/paleta-2.svg', '/escritos/paleta-3.svg']),
  toggle('Notas de continuidad', 'Pendiente: decidir entre Nordria y Nodria.'),
  tasks([
    ['Revisar nombres de los reinos', true],
    ['Escribir la escena 2', false],
  ]),
)
