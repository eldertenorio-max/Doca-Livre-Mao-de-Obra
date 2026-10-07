import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const destino = join(raiz, 'src', 'data', 'mapaTokens.json')
const PASTAS = ['src', 'server', 'scripts', 'supabase']
const ARQUIVOS_RAIZ = ['index.html', 'package.json', 'vite.config.ts', 'render.yaml', 'tsconfig.json']
const EXTENSOES = /\.(tsx?|mjs|js|css|html|json|sql|ya?ml|md)$/i
const IGNORAR = new Set(['node_modules', 'dist', '.git', '.temp'])

const IMPORTS = /(?:from\s*|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g
const SUFIXOS = ['', '.ts', '.tsx', '.mjs', '.js', '.css', '.json', '/index.ts', '/index.tsx']

function medir(caminho) {
  const texto = readFileSync(caminho, 'utf8')
  const nome = relative(raiz, caminho).split(sep).join('/')
  return {
    caminho: nome,
    bytes: Buffer.byteLength(texto),
    linhas: texto.split('\n').length,
    tokens: Math.ceil(texto.length / 4),
    pedidos: [...texto.matchAll(IMPORTS)].map((m) => posix.join(posix.dirname(nome), m[1])),
  }
}

function resolverImports(arquivos) {
  const existentes = new Set(arquivos.map((a) => a.caminho))
  for (const arquivo of arquivos) {
    const alvos = new Set()
    for (const pedido of arquivo.pedidos) {
      const alvo = SUFIXOS.map((s) => pedido + s).find((c) => existentes.has(c))
      if (alvo && alvo !== arquivo.caminho) alvos.add(alvo)
    }
    delete arquivo.pedidos
    arquivo.importa = [...alvos].sort()
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

resolverImports(arquivos)
arquivos.sort((a, b) => a.caminho.localeCompare(b.caminho))
writeFileSync(destino, `${JSON.stringify({ geradoEm: new Date().toISOString(), arquivos }, null, 2)}\n`)
console.log(`mapa-tokens: ${arquivos.length} arquivos medidos`)
