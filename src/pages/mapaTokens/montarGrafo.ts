import { pesoDe } from './montarArvore'
import type { ArquivoMedido, LigacaoGrafo, PastaGrafo } from './tipos'

export const CAIXA_LARGURA = 220
export const CAIXA_ALTURA = 78
const ESPACO_COLUNA = 120
const ESPACO_LINHA = 26
const MARGEM = 24

export function pastaDe(caminho: string) {
  const i = caminho.lastIndexOf('/')
  return i < 0 ? 'raiz' : caminho.slice(0, i)
}

function calcularColunas(ids: string[], ligacoes: LigacaoGrafo[]) {
  const coluna = new Map(ids.map((id) => [id, 0]))
  for (let volta = 0; volta < ids.length; volta++) {
    let mudou = false
    for (const { de, para } of ligacoes) {
      const proxima = (coluna.get(de) ?? 0) + 1
      if (proxima > (coluna.get(para) ?? 0) && proxima < ids.length) {
        coluna.set(para, proxima)
        mudou = true
      }
    }
    if (!mudou) break
  }
  return coluna
}

export function montarGrafo(arquivos: ArquivoMedido[]) {
  const porPasta = new Map<string, ArquivoMedido[]>()
  for (const arquivo of arquivos) {
    const id = pastaDe(arquivo.caminho)
    porPasta.set(id, [...(porPasta.get(id) ?? []), arquivo])
  }

  const contagem = new Map<string, number>()
  for (const arquivo of arquivos) {
    const de = pastaDe(arquivo.caminho)
    for (const alvo of arquivo.importa ?? []) {
      const para = pastaDe(alvo)
      if (para === de) continue
      const chave = `${de}>${para}`
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
    }
  }
  const ligacoes: LigacaoGrafo[] = [...contagem].map(([chave, quantidade]) => {
    const [de, para] = chave.split('>')
    return { de, para, quantidade }
  })

  const ids = [...porPasta.keys()]
  const colunas = calcularColunas(ids, ligacoes)
  const porColuna = new Map<number, string[]>()
  for (const id of ids.sort()) {
    const c = colunas.get(id) ?? 0
    porColuna.set(c, [...(porColuna.get(c) ?? []), id])
  }

  const pastas: PastaGrafo[] = []
  for (const [c, lista] of porColuna) {
    lista.forEach((id, linha) => {
      const doGrupo = porPasta.get(id) ?? []
      const maiorArquivo = Math.max(0, ...doGrupo.map((a) => a.tokens))
      pastas.push({
        id,
        arquivos: doGrupo.slice().sort((a, b) => b.tokens - a.tokens),
        tokens: doGrupo.reduce((soma, a) => soma + a.tokens, 0),
        maiorArquivo,
        peso: pesoDe(maiorArquivo),
        coluna: c,
        x: MARGEM + c * (CAIXA_LARGURA + ESPACO_COLUNA),
        y: MARGEM + linha * (CAIXA_ALTURA + ESPACO_LINHA),
      })
    })
  }

  const largura = Math.max(...pastas.map((p) => p.x)) + CAIXA_LARGURA + MARGEM
  const altura = Math.max(...pastas.map((p) => p.y)) + CAIXA_ALTURA + MARGEM
  return { pastas, ligacoes, largura, altura }
}
