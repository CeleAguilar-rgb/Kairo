import 'server-only'

import { DEFAULT_DAILY_WORD_GOAL, tiptapWordCount, type TiptapDoc } from '@kairo/shared'

import type { IsoDate } from '@/lib/dates'
import { addDays, startOfWeek } from '@/lib/dates'
import type { MockContext } from '@/lib/mock/context'

import { callout, doc, gallery, heading, para, picture, quote, tasks, toggle } from './mock-docs'
import type { Character, CharacterField, NoteTemplate, Story, TemplateField, World, WritingPage } from './types'

// Datos de ejemplo de Escritos, armados relativos a "hoy" (igual que Finanzas y Día a día) con la historia y el
// mundo del canvas (EscritosInicio, Escritos, Pagina, BaseDatos): Aurelun, "Un cuento de amores y dragones" y los
// personajes. Cuando llegue la API de Escritos, mock.ts y mock-store.ts desaparecen y api.ts llama a
// `api.get('/writings/...')`; los componentes reciben la misma forma de datos.

export type WritingsSeed = {
  stories: Story[]
  pages: WritingPage[]
  worlds: World[]
  noteTemplates: NoteTemplate[]
  characterFields: CharacterField[]
  characters: Character[]
  // Palabras escritas por día (FALTA EN LA BASE: un registro diario; mientras tanto vive aquí).
  wordsByDay: Record<IsoDate, number>
  // La meta de palabras por día (FALTA EN LA BASE: un ajuste del perfil).
  dailyGoal: number
}

const WORLD_ID = 'w-auralun'
const STORY_ID = 'st-cuento'
const NOTEBOOK_ID = 'st-ideas'

const page = (ctx: MockContext, input: Omit<WritingPage, 'wordCount' | 'updatedAt' | 'characterIds' | 'coverPath' | 'tag'> & { dayOffset: number; time: string; characterIds?: string[]; coverPath?: string | null; tag?: string | null }): WritingPage => {
  const { dayOffset, time, characterIds, coverPath, tag, ...rest } = input
  return { ...rest, characterIds: characterIds ?? [], coverPath: coverPath ?? null, tag: tag ?? null, wordCount: tiptapWordCount(rest.content), updatedAt: ctx.at(dayOffset, time) }
}

// El capítulo "0.- Antecedentes de Vadronia": los bloques de Pagina.dc.html, con el texto de la Era II del mundo.
const CHAPTER_ZERO: TiptapDoc = doc(
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

export function buildWritingsSeed(ctx: MockContext): WritingsSeed {
  const stories: Story[] = [
    {
      id: STORY_ID,
      title: 'Un cuento de amores y dragones',
      kind: 'story',
      summary: 'Historia de Jericó (Sudria) y Eleanor (Nordria) en los miles de años de paz tras la fundación de los cuatro reinos.',
      color: 'ink',
      wordGoal: 30_000,
      worldId: WORLD_ID,
      eraId: 'era-3',
      regionId: 'reg-vadronia',
      resources: [
        { id: 'rs-1', name: 'Página de la historia', initial: 'C', tone: 'warm', url: 'https://app.notion.com/p/a272e51c00e24f19951fbdc7e22fd99a' },
        { id: 'rs-2', name: 'Arcos (borrador)', initial: 'A', tone: 'soft', url: 'https://app.notion.com/p/3024aa5f773b80848355d5941b0325df' },
        { id: 'rs-3', name: 'Crónica del Gran Quiebre', initial: 'Q', tone: 'accent', url: 'https://app.notion.com/p/2fc4aa5f773b8092ad18fbc31053e843' },
        { id: 'rs-4', name: 'Timeline de la historia', initial: 'T', tone: 'muted', url: 'https://app.notion.com/p/ad57d66c7f4b467487479485e92e092c' },
        { id: 'rs-5', name: 'Playlist en Spotify', initial: '♪', tone: 'ink', url: 'https://open.spotify.com/playlist/02mKkeltAnjab76DWw7zR5' },
      ],
    },
    {
      id: NOTEBOOK_ID,
      title: 'Cuaderno de ideas',
      kind: 'notebook',
      summary: 'Lo que se te ocurre y no quieres perder: frases, ideas de proyectos y referencias con imágenes.',
      color: 'lavender',
      wordGoal: null,
      worldId: null,
      eraId: null,
      regionId: null,
      resources: [],
    },
  ]

  const pages: WritingPage[] = [
    page(ctx, { id: 'pg-cap-0', storyId: STORY_ID, kind: 'chapter', title: '0.- Antecedentes de Vadronia', content: CHAPTER_ZERO, status: 'in_progress', position: 0, characterIds: ['ch-jerico', 'ch-eleanor'], dayOffset: -1, time: '21:10' }),
    page(ctx, { id: 'pg-cap-1', storyId: STORY_ID, kind: 'chapter', title: 'I.- Jericó', content: doc(), status: 'pending', position: 1, dayOffset: -3, time: '19:00' }),
    page(ctx, { id: 'pg-cap-2', storyId: STORY_ID, kind: 'chapter', title: 'Una noche de constelaciones', content: doc(), status: 'none', position: 2, dayOffset: -9, time: '22:30' }),

    page(ctx, {
      id: 'pg-cua-1',
      storyId: NOTEBOOK_ID,
      kind: 'page',
      title: 'Pendientes de Aurelun',
      content: doc(
        tasks([
          ['Revisar nombres de los reinos', true],
          ['Decidir Nordria o Nodria', false],
          ['Página de Nocturnia', false],
        ]),
      ),
      status: 'none',
      position: 0,
      dayOffset: -2,
      time: '18:20',
    }),
    page(ctx, {
      id: 'pg-cua-2',
      storyId: NOTEBOOK_ID,
      kind: 'page',
      title: 'Frases sueltas',
      content: doc(
        para('Aquí van las frases que se te ocurren para usarlas después.'),
        para('La luna no perdona a quien le miente, solo espera.'),
        para('Los dragones recuerdan lo que los reyes olvidan.'),
      ),
      status: 'none',
      position: 1,
      dayOffset: -5,
      time: '23:05',
    }),
    page(ctx, {
      id: 'pg-cua-3',
      storyId: NOTEBOOK_ID,
      kind: 'page',
      title: 'Referencias visuales',
      content: doc(gallery(['/escritos/paleta-1.svg', '/escritos/paleta-2.svg', '/escritos/paleta-3.svg', '/escritos/paisaje.svg'])),
      status: 'none',
      position: 2,
      dayOffset: -12,
      time: '16:45',
    }),

    page(ctx, {
      id: 'pg-nota-1',
      storyId: null,
      kind: 'note',
      title: 'Mapa de Aurelun (boceto)',
      content: doc(para('Primer boceto de dónde queda cada región. Falta Nocturnia completa.'), picture('/escritos/mapa.svg', 'Boceto del mapa')),
      status: 'none',
      position: 0,
      coverPath: 'preset:map',
      tag: 'Aurelun',
      dayOffset: -1,
      time: '12:30',
    }),
    page(ctx, {
      id: 'pg-nota-2',
      storyId: null,
      kind: 'note',
      title: 'Pendientes de Aurelun',
      content: doc(
        tasks([
          ['Revisar nombres de los reinos', true],
          ['Decidir Nordria o Nodria', false],
          ['Página de Nocturnia', false],
        ]),
      ),
      status: 'none',
      position: 1,
      tag: 'Aurelun',
      dayOffset: -4,
      time: '10:15',
    }),
    page(ctx, {
      id: 'pg-nota-3',
      storyId: null,
      kind: 'note',
      title: 'Colores de Nordria',
      content: doc(para('Paleta para la corte del norte: noche, oro viejo y lavanda.'), gallery(['/escritos/paleta-1.svg', '/escritos/paleta-2.svg', '/escritos/paleta-3.svg'])),
      status: 'none',
      position: 2,
      coverPath: 'preset:mood',
      tag: 'Aurelun',
      dayOffset: -6,
      time: '20:00',
    }),
    page(ctx, {
      id: 'pg-nota-4',
      storyId: null,
      kind: 'note',
      title: 'Frases sueltas',
      content: doc(para('Aquí van las frases que se te ocurren para usarlas después.')),
      status: 'none',
      position: 3,
      tag: 'Ideas',
      dayOffset: -16,
      time: '09:10',
    }),
    page(ctx, {
      id: 'pg-nota-5',
      storyId: null,
      kind: 'note',
      title: 'Referencia de paisaje',
      content: doc(para('Montañas al atardecer para el viaje hacia Nordria.'), picture('/escritos/paisaje.svg', 'Montañas al atardecer')),
      status: 'none',
      position: 4,
      coverPath: 'preset:photo',
      tag: 'Aurelun',
      dayOffset: -18,
      time: '17:40',
    }),
    page(ctx, {
      id: 'pg-nota-6',
      storyId: null,
      kind: 'note',
      title: 'Arquitectura de bots',
      content: doc(para('Módulos separados: entrada, cerebro, salidas. Plantilla base para nuevos bots.')),
      status: 'none',
      position: 5,
      tag: 'Trabajo',
      dayOffset: -21,
      time: '11:25',
    }),
  ]

  const ERA_EVENTS: Record<string, [string, string][]> = {
    'era-1': [
      ['Separación cósmica', 'La luna y el sol son separados, porque juntos creaban caos en el universo.'],
      ['Nacimiento de Aurelun', 'La Luna encuentra Aurelun y, desde su duelo, crea a todas las especies. Después deja de intervenir.'],
      ['Surge Cross', 'Nace Cross, hija de un cambiaformas y un hada. Su existencia provoca desequilibrio emocional.'],
      ['Corrupción de Cross', 'Discriminada por su naturaleza, encuentra refugio en la magia Aurelun y es corrompida por el odio a las razas favoritas de la Luna.'],
      ['La era de Cross', 'El odio se expande por las razas; un mundo de paz se vuelve matar o morir.'],
      ['Años de guerra I', 'Hadas y cambiaformas se unen para acabar con Cross; ambas razas pierden a miles.'],
      ['Intervención de la Luna', 'Cross es derrotada pero su alma se esconde en el mundo. La Luna separa Aurelun: nacen Vadronia y Nocturnia.'],
      ['Hadas y cambiaformas ocultos', 'Las hadas se esconden en los bosques del este de Vadronia; los cambiaformas, en el Bosque de los Susurros, hasta su extinción.'],
    ],
    'era-2': [
      ['El rey Krandalf', 'Los humanos unifican Vadronia bajo una monarquía y eligen a Krandalf como rey.'],
      ['Encuentro con el alma de Cross', 'En un viaje, Krandalf encuentra la cueva donde yace el alma de Cross, que se apodera de él.'],
      ['Guerra de los Tres Siglos', 'Oprimidos por su tiranía, los habitantes se alzan en una guerra larga y sin esperanza.'],
      ['Los humanos descubren la magia Aurelun', 'Al minar encuentran piedras con fragmentos de luna. Krandalf confisca todos los avances para su ejército.'],
      ['Nacimiento de los Bellmore', 'En el bosque del este nacen Kain, Cain, Kori y Coil; las hadas los bendicen con un fragmento de luna partido en cuatro.'],
      ['La marcha hacia el sur', 'Los hermanos forman un ejército y marchan al castillo del rey; aparecen los dragones de Krandalf.'],
      ['Confrontación final', 'Kain lo hiere con el arma de la poción; Kori, al ver que no basta, le clava su espada.'],
      ['Muerte de Krandalf', 'El alma de Cross huye debilitada. El rey, libre, muere diciendo "Lo siento". Vadronia queda en ruinas.'],
      ['Fundación de los cuatro reinos', 'Coil propone dividir Vadronia: nacen Sudria, Ovestria, Estria y Nordria.'],
      ['Las armas sagradas', 'Los hermanos sellan su poder en cuatro armas que pasarán de generación en generación.'],
    ],
  }
  const events = (eraId: string) => (ERA_EVENTS[eraId] ?? []).map(([title, description], index) => ({ id: `${eraId}-ev-${index + 1}`, title, description }))

  const worlds: World[] = [
    {
      id: WORLD_ID,
      name: 'Aurelun',
      description: '"Aure", dorado o brillante; "lun", la luna. Un mundo que valora la luz de la luna como fuente de poder y sabiduría.',
      coverPath: null,
      hasMap: false,
      eras: [
        { id: 'era-1', number: 'I', name: 'Era Lunar', shortName: 'Lunar', summary: 'Origen de Aurelun y división en Vadronia y Nocturnia.', note: 'quedará por encima hasta terminar la historia de Vadronia', events: events('era-1') },
        { id: 'era-2', number: 'II', name: 'Era del Filo Interno / Herederos Caídos', shortName: 'Filo Interno', summary: 'Historia de Vadronia, guerras internas y fundación de los cuatro reinos.', note: 'corregir cuando haya ideas claras', events: events('era-2') },
        { id: 'era-3', number: 'III', name: 'Era del Letargo Dorado', shortName: 'Letargo Dorado', summary: 'Miles de años de paz y desarrollo humano. Historia de Jericó y Eleanor; tal vez más historias humanas.', note: '', events: [] },
        { id: 'era-4', number: 'IV', name: 'Era de las Sombras Reconocidas', shortName: 'Sombras Reconocidas', summary: 'Desastre mestizo, historia de Nocturnia y crisis que afecta a todo Aurelun.', note: 'nose', events: [] },
      ],
      regions: [
        {
          id: 'reg-vadronia',
          name: 'Vadronia',
          tagline: 'Humanos vigilados por hadas',
          description: 'Unificada bajo el rey Krandalf y dividida después en cuatro reinos por los hermanos Bellmore. Las pocas hadas que quedan se esconden en los bosques del este.',
          kingdoms: ['Sudria', 'Nordria', 'Ovestria', 'Estria'],
          peoples: ['Humanos', 'Hadas'],
          dark: false,
          hasPage: true,
        },
        {
          id: 'reg-nocturnia',
          name: 'Nocturnia',
          tagline: 'Vigilada por cambiaformas',
          description: 'Hogar de vampiros, hombres lobo y brujas, las hadas traidoras que probaron la magia Aurelun. En el Bosque de los Susurros se escondieron los últimos cambiaformas.',
          kingdoms: [],
          peoples: ['Vampiros', 'Hombres lobo', 'Brujas', 'Cambiaformas'],
          dark: true,
          hasPage: false,
        },
      ],
      lore: [
        { id: 'lo-1', title: 'Origen y la era de Cross', eraId: 'era-1', regionId: null },
        { id: 'lo-2', title: 'División del mundo', eraId: 'era-1', regionId: 'reg-vadronia' },
        { id: 'lo-3', title: 'Nace Nocturnia', eraId: 'era-1', regionId: 'reg-nocturnia' },
        { id: 'lo-4', title: 'Crónica del Gran Quiebre', eraId: 'era-2', regionId: 'reg-vadronia' },
        { id: 'lo-5', title: 'Los Bellmore y Krandalf', eraId: 'era-2', regionId: 'reg-vadronia' },
      ],
      ideas: [
        { id: 'id-1', title: 'Historia de Nocturnia', summary: 'El desastre mestizo y la crisis que afecta a todo Aurelun.', eraId: 'era-4', regionId: 'reg-nocturnia' },
        { id: 'id-2', title: 'Crisis mestiza', summary: 'Lo que le pasa a Aurelun entero cuando las razas se mezclan.', eraId: 'era-4', regionId: null },
      ],
      species: [
        { id: 'sp-1', name: 'Hadas', regionId: 'reg-vadronia', description: 'Las criaturas más cercanas a la Luna. Vigilan Vadronia; las pocas que quedan se esconden en los bosques del este.' },
        { id: 'sp-2', name: 'Humanos', regionId: 'reg-vadronia', description: 'Unificaron Vadronia bajo Krandalf y hoy viven en los cuatro reinos.' },
        { id: 'sp-3', name: 'Cambiaformas', regionId: 'reg-nocturnia', description: 'Vigilan Nocturnia. Llevados a la extinción por la unión de brujas, vampiros y hombres lobo.' },
        { id: 'sp-4', name: 'Vampiros', regionId: 'reg-nocturnia', description: 'Habitantes de Nocturnia.' },
        { id: 'sp-5', name: 'Hombres lobo', regionId: 'reg-nocturnia', description: 'Habitantes de Nocturnia.' },
        { id: 'sp-6', name: 'Brujas', regionId: 'reg-nocturnia', description: 'Hadas traidoras que probaron la magia Aurelun.' },
        { id: 'sp-7', name: 'Dragones', regionId: 'reg-vadronia', description: 'Aparecen del lado de Krandalf en la marcha hacia el sur.' },
      ],
      rules: [
        { id: 'ru-1', title: 'Magia Aurelun', text: 'fragmentos de luna de las hadas caídas en la guerra de Cross. Pocos seres los poseen; los humanos los encuentran en piedras al minar.' },
        { id: 'ru-2', title: 'Armas sagradas', text: 'los Bellmore sellan su poder en cuatro armas que pasan de generación en generación.' },
      ],
    },
  ]

  // Las 3 plantillas de fábrica del mundo (decisión #45), de EscritosPlantilla.dc.html. `shortField` es un campo
  // "de vista corta" (sale arriba y en la tarjeta); `fillField` es una sección "para rellenar" con su pregunta guía.
  const shortField = (id: string, name: string, type: TemplateField['type'], key: string | null = null): TemplateField => ({ id, kind: 'field', key, name, type, hint: '', options: [] })
  const fillField = (id: string, name: string, hint: string): TemplateField => ({ id, kind: 'section', key: null, name, type: 'text', hint, options: [] })

  const PERSONAJE_TPL = `${WORLD_ID}-tpl-character`
  const ESPECIE_TPL = `${WORLD_ID}-tpl-species`
  const LUGAR_TPL = `${WORLD_ID}-tpl-place`

  const noteTemplates: NoteTemplate[] = [
    {
      id: PERSONAJE_TPL,
      worldId: WORLD_ID,
      key: 'character',
      name: 'Personaje',
      color: 'warm',
      position: 0,
      fields: [
        shortField(`${PERSONAJE_TPL}-f1`, 'Nombre completo', 'text'),
        shortField(`${PERSONAJE_TPL}-f2`, 'Edad', 'text'),
        shortField(`${PERSONAJE_TPL}-f3`, 'Especie', 'link'),
        shortField(`${PERSONAJE_TPL}-f4`, 'Lugar de origen', 'link'),
        // 'role': la app lo lee para armar "Protagonistas/Antagonistas" en la pestaña Personajes (decisión #45).
        shortField(`${PERSONAJE_TPL}-f5`, 'Rol en la historia', 'text', 'role'),
        shortField(`${PERSONAJE_TPL}-f6`, 'Era', 'era'),
        fillField(`${PERSONAJE_TPL}-s1`, 'Qué quiere', '¿Qué busca en la historia?'),
        fillField(`${PERSONAJE_TPL}-s2`, 'Qué lo mueve', '¿Por qué lo quiere?'),
        fillField(`${PERSONAJE_TPL}-s3`, 'A qué le teme', 'Su miedo más grande'),
        fillField(`${PERSONAJE_TPL}-s4`, 'Personalidad', 'Lo bueno y lo malo, en pocas palabras'),
        fillField(`${PERSONAJE_TPL}-s5`, 'Relaciones', 'Familia, pareja, amigos y enemigos'),
      ],
    },
    {
      id: ESPECIE_TPL,
      worldId: WORLD_ID,
      key: 'species',
      name: 'Especie',
      color: 'muted',
      position: 1,
      fields: [
        // 'home': la app lo lee para agrupar especies por región en la pestaña Especies (decisión #45).
        shortField(`${ESPECIE_TPL}-f1`, 'Dónde vive', 'link', 'home'),
        shortField(`${ESPECIE_TPL}-f2`, 'Cuánto vive', 'text'),
        shortField(`${ESPECIE_TPL}-f3`, 'Poderes', 'text'),
        shortField(`${ESPECIE_TPL}-f4`, 'Debilidad', 'text'),
        fillField(`${ESPECIE_TPL}-s1`, 'Origen', '¿De dónde vienen? ¿Quién los creó?'),
        fillField(`${ESPECIE_TPL}-s2`, 'Ciclo de vida', 'Nacimiento, crecimiento, reproducción y muerte'),
        fillField(`${ESPECIE_TPL}-s3`, 'Apariencia', 'Altura, rasgos, coloración'),
        fillField(`${ESPECIE_TPL}-s4`, 'Sociedad y cultura', 'Organización, líderes, festividades, rituales'),
        fillField(`${ESPECIE_TPL}-s5`, 'Rol en el mundo', '¿Aliados, enemigos, dioses, civilización antigua?'),
      ],
    },
    {
      id: LUGAR_TPL,
      worldId: WORLD_ID,
      key: 'place',
      name: 'Lugar',
      color: 'soft',
      position: 2,
      fields: [
        // El canvas (EscritosPlantilla.dc.html) trata "tipo de lugar" como un atributo fijo aparte; la decisión #45
        // dice que es un campo de la plantilla, así que se agrega acá (campo de selección, no estaba en el canvas).
        { id: `${LUGAR_TPL}-f0`, kind: 'field', key: null, name: 'Tipo de lugar', type: 'select', hint: '', options: [
          { id: 'region', label: 'Región', tone: 'ink' },
          { id: 'reino', label: 'Reino', tone: 'warm' },
          { id: 'bosque', label: 'Bosque', tone: 'muted' },
          { id: 'castillo', label: 'Castillo', tone: 'soft' },
          { id: 'mercado', label: 'Mercado', tone: 'accent' },
        ] },
        shortField(`${LUGAR_TPL}-f1`, 'Quién gobierna', 'text'),
        shortField(`${LUGAR_TPL}-f2`, 'Quién vive', 'link'),
        shortField(`${LUGAR_TPL}-f3`, 'Clima', 'text'),
        shortField(`${LUGAR_TPL}-f4`, 'Fundado en', 'era'),
        fillField(`${LUGAR_TPL}-s1`, 'Historia', '¿Qué ha pasado aquí?'),
        fillField(`${LUGAR_TPL}-s2`, 'Cultura y costumbres', 'Cómo vive la gente, qué celebra'),
        fillField(`${LUGAR_TPL}-s3`, 'Lugares importantes', 'Castillos, mercados, bosques…'),
      ],
    },
  ]

  const KINGDOM = `${WORLD_ID}-kingdom`
  const ROLE = `${WORLD_ID}-role`
  const ERA = `${WORLD_ID}-era`
  const characterFields: CharacterField[] = [
    {
      id: KINGDOM,
      worldId: WORLD_ID,
      name: 'Reino',
      type: 'select',
      builtIn: true,
      options: [
        { id: 'sudria', label: 'Sudria', tone: 'warm' },
        { id: 'nordria', label: 'Nordria', tone: 'soft' },
        { id: 'ovestria', label: 'Ovestria', tone: 'muted' },
        { id: 'estria', label: 'Estria', tone: 'accent' },
        { id: 'historicos', label: 'Históricos', tone: 'ink' },
      ],
    },
    { id: ROLE, worldId: WORLD_ID, name: 'Rol', type: 'text', options: [], builtIn: true },
    { id: ERA, worldId: WORLD_ID, name: 'Era', type: 'text', options: [], builtIn: true },
  ]

  const character = (id: string, name: string, kingdom: string, role: string | null, era: string, description = '', storyIds: string[] = []): Character => ({
    id: `ch-${id}`,
    worldId: WORLD_ID,
    name,
    imagePath: null,
    values: { [KINGDOM]: kingdom, [ROLE]: role, [ERA]: era },
    description,
    storyIds,
    pageId: null,
  })

  const characters: Character[] = [
    character('jerico', 'Jericó Lucienne Bonaventure', 'sudria', 'Protagonista', 'Era III', 'Protagonista de Un cuento de amores y dragones, del reino de Sudria.', [STORY_ID]),
    character('eleanor', 'Eleanor Josephine Nicholson', 'nordria', 'Protagonista', 'Era III', 'Protagonista de Un cuento de amores y dragones, del reino de Nordria.', [STORY_ID]),
    character('lasyl', 'Lasyl', 'sudria', null, 'Era III'),
    character('heinar', 'Rey Heinar', 'sudria', 'Realeza', 'Era III'),
    character('ophelia', 'Reina Ophelia', 'sudria', 'Realeza', 'Era III'),
    character('lucas', 'Príncipe Lucas', 'sudria', 'Realeza', 'Era III'),
    character('averet', 'Lainus / Averet', 'sudria', null, 'Era III'),
    character('gregor', 'Rey Gregor', 'nordria', 'Realeza', 'Era III'),
    character('catherine', 'Reina Catherine', 'nordria', 'Realeza', 'Era III'),
    character('kainp', 'Príncipe Kain', 'nordria', 'Realeza', 'Era III'),
    character('lonan', 'Príncipe Lonan', 'nordria', 'Realeza', 'Era III'),
    character('orion', 'Príncipe Orion', 'ovestria', 'Realeza', 'Era III'),
    character('kallias', 'Príncipe Kallias', 'ovestria', 'Realeza', 'Era III'),
    character('azrael', 'Príncipe Azrael', 'estria', 'Realeza', 'Era III'),
    character('alaida', 'Princesa Alaida', 'estria', 'Realeza', 'Era III'),
    character('adeline', 'Princesa Adeline', 'estria', 'Realeza', 'Era III'),
    character('luna', 'Luna (Luneryss)', 'historicos', 'Deidad', 'Era I', 'Encuentra Aurelun y, desde su duelo, crea a todas las especies. Separa el mundo en Vadronia y Nocturnia para proteger a sus especies.'),
    character('cross', 'Cross', 'historicos', 'Antagonista', 'Era I', 'Hija de un cambiaformas y un hada. Corrompida por el odio, su alma sobrevive escondida en el mundo y vuelve a través de Krandalf.'),
    character('krandalf', 'Rey Krandalf', 'historicos', 'Rey de Vadronia', 'Era II', 'Primer rey de Vadronia unificada; poseído por el alma de Cross. Muere liberado diciendo "Lo siento".'),
    character('kain', 'Kain Bellmore', 'historicos', 'Hermano Bellmore', 'Era II', 'Hiere a Krandalf con el arma que contenía la poción.'),
    character('cain', 'Cain Bellmore', 'historicos', 'Hermano Bellmore', 'Era II', 'Uno de los cuatro hermanos bendecidos por las hadas con un fragmento de luna.'),
    character('kori', 'Kori Bellmore', 'historicos', 'Hermana Bellmore', 'Era II', 'Duda de la poción y clava su espada en la espalda del rey.'),
    character('coil', 'Coil Bellmore', 'historicos', 'Hermano Bellmore', 'Era II', 'Propone dividir Vadronia en cuatro reinos, uno para cada hermano.'),
  ]

  // Las palabras de esta semana, de lunes hasta ayer; hoy todavía no se ha escrito nada ("jueves aún no" en el canvas).
  const monday = startOfWeek(ctx.today, 'monday')
  const WEEK_PATTERN = [620, 880, 640, 520, 710, 380]
  const wordsByDay: Record<IsoDate, number> = {}
  for (let index = 0; index < 6; index += 1) {
    const date = addDays(monday, index)
    if (date < ctx.today) wordsByDay[date] = WEEK_PATTERN[index]
  }

  return { stories, pages, worlds, noteTemplates, characterFields, characters, wordsByDay, dailyGoal: DEFAULT_DAILY_WORD_GOAL }
}
