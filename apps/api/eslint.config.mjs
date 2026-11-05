import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

// La API es ESM de Node: un import relativo sin `.js` funciona en tsx y en jest (ellos lo resuelven solos) pero falla al
// correr el código compilado en producción (Vercel). TypeScript no lo avisa porque `tsconfig.json` usa resolución
// "Bundler", así que lo avisa esta regla. `\x2F` es la barra `/` (esquery no deja ponerla suelta dentro de una regex).
const RELATIVE_WITHOUT_JS = String.raw`/^\.{1,2}\x2F.*(?<!\.js)$/`
const IMPORT_NODES = ['ImportDeclaration', 'ExportAllDeclaration', 'ExportNamedDeclaration', 'ImportExpression']

export default tseslint.config(
  tseslint.configs.recommended,
  prettierConfig,
  {
    ignores: ['dist/**'],
  },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...IMPORT_NODES.map((node) => ({
          selector: `${node}[source.value=${RELATIVE_WITHOUT_JS}]`,
          message: 'Los imports relativos de la API llevan la extensión .js (es ESM de Node), por ejemplo "./tasks.service.js".',
        })),
      ],
    },
  },
)
