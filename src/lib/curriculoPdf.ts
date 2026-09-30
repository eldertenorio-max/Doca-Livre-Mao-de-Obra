import { cargoLabel } from '../data/categories'
import type { Disponibilidade, Profissional } from './types'

const DISPONIBILIDADE: { key: keyof Disponibilidade; label: string }[] = [
  { key: 'hoje', label: 'Disponível hoje' },
  { key: 'amanha', label: 'Disponível amanhã' },
  { key: 'estaSemana', label: 'Esta semana' },
  { key: 'finaisDeSemana', label: 'Finais de semana' },
  { key: 'noturno', label: 'Noturno' },
  { key: 'viagens', label: 'Viagens' },
  { key: 'temporario', label: 'Trabalho temporário' },
  { key: 'efetivo', label: 'Efetivo' },
]

function quebrar(texto: string, max = 88) {
  const palavras = texto.split(/\s+/).filter(Boolean)
  const linhas: string[] = []
  let atual = ''
  for (const palavra of palavras) {
    const proxima = atual ? `${atual} ${palavra}` : palavra
    if (proxima.length > max && atual) {
      linhas.push(atual)
      atual = palavra
    } else {
      atual = proxima
    }
  }
  if (atual) linhas.push(atual)
  return linhas.length ? linhas : ['']
}

function escaparPdf(texto: string) {
  return texto.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function latin1(texto: string) {
  const bytes = new Uint8Array(texto.length)
  for (let i = 0; i < texto.length; i += 1) {
    const code = texto.charCodeAt(i)
    bytes[i] = code <= 255 ? code : 63
  }
  return bytes
}

function juntar(partes: Uint8Array[]) {
  const total = partes.reduce((soma, parte) => soma + parte.length, 0)
  const saida = new Uint8Array(total)
  let cursor = 0
  for (const parte of partes) {
    saida.set(parte, cursor)
    cursor += parte.length
  }
  return saida
}

function linhasDoCurriculo(profissional: Profissional) {
  const p = profissional
  const linhas = [
    'CURRÍCULO',
    p.nome,
    `${p.endereco.cidade}/${p.endereco.estado}`,
    '',
    'Cargo',
    p.profissoes.length ? p.profissoes.map(cargoLabel).join(', ') : 'Não informado',
    '',
    'Experiência',
  ]
  if (!p.experiencia.length) linhas.push('Não descrita')
  for (const item of p.experiencia) {
    linhas.push(`${item.cargo} — ${item.empresa}`)
    linhas.push(`${item.inicio} a ${item.fim}. ${item.descricao}`)
  }
  linhas.push('', 'Certificações')
  if (p.cnhCategoria) linhas.push(`CNH ${p.cnhCategoria}${p.cnhValidade ? `, validade ${p.cnhValidade}` : ''}`)
  if (!p.certificados.length && !p.cnhCategoria) linhas.push('Nenhuma registrada')
  for (const cert of p.certificados) {
    linhas.push(`${cert.tipo}${cert.validade ? `, validade ${cert.validade}` : ''}`)
  }
  const disp = DISPONIBILIDADE.filter((item) => p.disponibilidade[item.key]).map((item) => item.label)
  linhas.push('', 'Disponibilidade', disp.length ? disp.join(', ') : 'Não marcada')
  return linhas.flatMap((linha) => quebrar(linha))
}

function paginas(linhas: string[]) {
  const grupos: string[][] = []
  let atual: string[] = []
  for (const linha of linhas) {
    if (atual.length >= 42) {
      grupos.push(atual)
      atual = []
    }
    atual.push(linha)
  }
  if (atual.length) grupos.push(atual)
  return grupos.length ? grupos : [['CURRÍCULO']]
}

function fluxoDaPagina(linhas: string[]) {
  const comandos = ['BT', '/F1 16 Tf', '48 800 Td', `(${escaparPdf(linhas[0] ?? '')}) Tj`, '/F1 11 Tf']
  for (const linha of linhas.slice(1)) {
    comandos.push('0 -16 Td', `(${escaparPdf(linha)}) Tj`)
  }
  comandos.push('ET')
  return latin1(comandos.join('\n'))
}

export function curriculoPdfBytes(profissional: Profissional) {
  const folhas = paginas(linhasDoCurriculo(profissional))
  const objetos: Uint8Array[] = []
  const idsPagina: number[] = []
  let proximoId = 3

  const fluxos = folhas.map((folha) => {
    const id = proximoId
    proximoId += 1
    const dados = fluxoDaPagina(folha)
    const cabecalho = latin1(`${id} 0 obj\n<< /Length ${dados.length} >>\nstream\n`)
    const rodape = latin1('\nendstream\nendobj\n')
    objetos.push(juntar([cabecalho, dados, rodape]))
    return id
  })

  folhas.forEach(() => {
    idsPagina.push(proximoId)
    proximoId += 1
  })
  const idFonte = proximoId

  idsPagina.forEach((id, indice) => {
    objetos.push(
      latin1(
        `${id} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${fluxos[indice]} 0 R /Resources << /Font << /F1 ${idFonte} 0 R >> >> >>\nendobj\n`,
      ),
    )
  })
  objetos.push(
    latin1(
      `${idFonte} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`,
    ),
  )

  const catalogo = latin1('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  const paginasObj = latin1(
    `2 0 obj\n<< /Type /Pages /Kids [${idsPagina.map((id) => `${id} 0 R`).join(' ')}] /Count ${idsPagina.length} >>\nendobj\n`,
  )
  const corpo = [catalogo, paginasObj, ...objetos]
  const cabeca = latin1('%PDF-1.4\n')
  const offsets: number[] = [0]
  let cursor = cabeca.length
  for (const obj of corpo) {
    offsets.push(cursor)
    cursor += obj.length
  }
  const tamanho = corpo.length + 1
  let xref = `xref\n0 ${tamanho}\n0000000000 65535 f \n`
  for (let i = 1; i < tamanho; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  xref += `trailer\n<< /Size ${tamanho} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF`
  return juntar([cabeca, ...corpo, latin1(xref)])
}

export function abrirCurriculoPdf(profissional: Profissional) {
  const blob = new Blob([curriculoPdfBytes(profissional)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
