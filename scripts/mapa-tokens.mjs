import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const destino = join(raiz, 'src', 'data', 'mapaTokens.json')
const PASTAS = ['src', 'server', 'scripts', 'supabase']
const ARQUIVOS_RAIZ = ['index.html', 'package.json', 'vite.config.ts', 'render.yaml', 'tsconfig.json']
const EXTENSOES = /\.(tsx?|mjs|js|css|html|json|sql|ya?ml|md)$/i
const IGNORAR = new Set(['node_modules', 'dist', '.git', '.temp'])

function medir(caminho) {
  const texto = readFileSync(caminho, 'utf8')
  return {
    caminho: relative(raiz, caminho).split(sep).join('/'),
    bytes: Buffer.byteLength(texto),
    linhas: texto.split('\n').length,
    tokens: Math.ceil(texto.length / 4),
  }
}

function varrer(pasta, saida) {
  for (const nome of readdirSync(pasta)) {
    if (IGNORAR.has(nome)) continue
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) varrer(caminho, saida)
    else if (EXTENSOES.test(nome) && !caminho.endsWith('mapaTokens.json')) saida.push(medir(caminho))
  }
}

const arquivos = []
for (const pasta of PASTAS) {
  try {
    varrer(join(raiz, pasta), arquivos)
  } catch {
    /* pasta opcional */
  }
}
for (const nome of ARQUIVOS_RAIZ) {
  try {
    arquivos.push(medir(join(raiz, nome)))
  } catch {
    /* arquivo opcional */
  }
}

arquivos.sort((a, b) => a.caminho.localeCompare(b.caminho))
writeFileSync(destino, `${JSON.stringify({ geradoEm: new Date().toISOString(), arquivos }, null, 2)}\n`)
console.log(`mapa-tokens: ${arquivos.length} arquivos medidos`)
