type EntradaZip = { nome: string; metodo: number; tamanho: number; inicio: number }

function u16(bytes: Uint8Array, pos: number) {
  return bytes[pos] | (bytes[pos + 1] << 8)
}

function u32(bytes: Uint8Array, pos: number) {
  return (bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24)) >>> 0
}

function entradasZip(bytes: Uint8Array): EntradaZip[] {
  let fimDiretorio = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i -= 1) {
    if (u32(bytes, i) === 0x06054b50) {
      fimDiretorio = i
      break
    }
  }
  if (fimDiretorio < 0) throw new Error('O arquivo do Word está danificado.')
  const total = u16(bytes, fimDiretorio + 10)
  let pos = u32(bytes, fimDiretorio + 16)
  const nomes = new TextDecoder()
  const lista: EntradaZip[] = []
  for (let n = 0; n < total && pos + 46 <= bytes.length; n += 1) {
    if (u32(bytes, pos) !== 0x02014b50) break
    const tamNome = u16(bytes, pos + 28)
    const tamExtra = u16(bytes, pos + 30)
    const tamComentario = u16(bytes, pos + 32)
    const local = u32(bytes, pos + 42)
    lista.push({
      nome: nomes.decode(bytes.subarray(pos + 46, pos + 46 + tamNome)),
      metodo: u16(bytes, pos + 10),
      tamanho: u32(bytes, pos + 20),
      inicio: local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28),
    })
    pos += 46 + tamNome + tamExtra + tamComentario
  }
  return lista
}

async function conteudoZip(bytes: Uint8Array, entrada: EntradaZip) {
  const dados = bytes.slice(entrada.inicio, entrada.inicio + entrada.tamanho)
  if (entrada.metodo === 0) return new TextDecoder().decode(dados)
  if (entrada.metodo !== 8) throw new Error('O arquivo do Word usa um formato que não conseguimos abrir.')
  const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(fluxo).text()
}

function xmlParaTexto(xml: string) {
  return xml
    .replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '')
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:(br|cr)\b[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
}

/** Texto de um .docx: cabeçalho, corpo e rodapé, nessa ordem. */
export async function textoDocx(bytes: Uint8Array) {
  const entradas = entradasZip(bytes)
  const ordem = (nome: string) => (nome.includes('header') ? 0 : nome.includes('document') ? 1 : 2)
  const partes = entradas
    .filter((e) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(e.nome))
    .sort((a, b) => ordem(a.nome) - ordem(b.nome))
  if (!partes.some((e) => e.nome === 'word/document.xml')) throw new Error('O arquivo não parece ser do Word.')
  const textos: string[] = []
  for (const parte of partes) textos.push(xmlParaTexto(await conteudoZip(bytes, parte)))
  return textos.join('\n')
}

const LIXO_DOC =
  /^(times new roman|arial|calibri|cambria|symbol|wingdings|courier new|normal|default paragraph font|table normal|no list|microsoft|root entry|worddocument|summaryinformation|documentsummaryinformation|compobj|[01]table|título|heading|fonte parág)/i

function aceitarTrecho(trecho: string) {
  const limpo = trecho.trim()
  if (limpo.length < 3 || LIXO_DOC.test(limpo)) return false
  const letras = limpo.replace(/[^A-Za-zÀ-ÿ]/g, '').length
  return letras / limpo.length >= 0.55
}

function pontuar(trechos: string[]) {
  return trechos.filter((t) => t.trim().split(/\s+/).length >= 3).reduce((soma, t) => soma + t.length, 0)
}

function trechos16(bytes: Uint8Array) {
  const melhor: string[][] = []
  for (const inicio of [0, 1]) {
    const lista: string[] = []
    let atual = ''
    for (let i = inicio; i + 1 < bytes.length; i += 2) {
      const c = bytes[i] | (bytes[i + 1] << 8)
      const ok =
        c === 9 || c === 13 || (c >= 0x20 && c < 0x7f) || (c >= 0xa0 && c <= 0x17f) || [0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022].includes(c)
      if (ok) {
        atual += c === 13 ? '\n' : String.fromCharCode(c)
        continue
      }
      if (atual.length >= 4) lista.push(...atual.split('\n').filter(aceitarTrecho))
      atual = ''
    }
    if (atual.length >= 4) lista.push(...atual.split('\n').filter(aceitarTrecho))
    melhor.push(lista)
  }
  return pontuar(melhor[0]) >= pontuar(melhor[1]) ? melhor[0] : melhor[1]
}

function trechos8(bytes: Uint8Array) {
  const decodificador = new TextDecoder('windows-1252')
  const lista: string[] = []
  let inicio = -1
  const fechar = (fim: number) => {
    if (inicio >= 0 && fim - inicio >= 4) {
      const texto = decodificador.decode(bytes.subarray(inicio, fim)).replace(/\r/g, '\n')
      lista.push(...texto.split('\n').filter(aceitarTrecho))
    }
    inicio = -1
  }
  for (let i = 0; i < bytes.length; i += 1) {
    const c = bytes[i]
    const ok = c === 9 || c === 13 || (c >= 0x20 && c < 0x7f) || c >= 0xc0 || [0x93, 0x94, 0x96, 0x97].includes(c)
    if (ok) {
      if (inicio < 0) inicio = i
    } else {
      fechar(i)
    }
  }
  fechar(bytes.length)
  return lista
}

/** Leitura aproximada do .doc antigo (Word 97 a 2003). */
export function textoDocAntigo(bytes: Uint8Array) {
  const largos = trechos16(bytes)
  const estreitos = trechos8(bytes)
  return (pontuar(largos) >= pontuar(estreitos) ? largos : estreitos).join('\n')
}
