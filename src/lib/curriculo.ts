import { cargoLabel } from '../data/categories'
import type { Certificado, Experiencia } from './types'

export const ESCOLARIDADES = [
  'Ensino fundamental incompleto',
  'Ensino fundamental completo',
  'Ensino médio incompleto',
  'Ensino médio completo',
  'Ensino técnico',
  'Ensino superior incompleto',
  'Ensino superior completo',
  'Pós-graduação',
]

export const CERTIFICADOS_COMUNS = ['NR11', 'NR35', 'NR10', 'NR20', 'MOPP', 'Munck', 'Ponte Rolante']

export type CurriculoLido = {
  nome: string
  telefone: string
  email: string
  cpf: string
  nascimento: string
  cidade: string
  estado: string
  resumo: string
  escolaridade: string
  habilidades: string[]
  profissoes: string[]
  experiencia: Experiencia[]
  certificados: string[]
  cnhCategoria: string
}

export function curriculoVazio(): CurriculoLido {
  return {
    nome: '',
    telefone: '',
    email: '',
    cpf: '',
    nascimento: '',
    cidade: '',
    estado: '',
    resumo: '',
    escolaridade: '',
    habilidades: [],
    profissoes: [],
    experiencia: [],
    certificados: [],
    cnhCategoria: '',
  }
}

export function semAcento(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function mesAtual() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

/** Fim vazio ou "atual" quer dizer que a pessoa continua no trabalho. */
export function trabalhoAtual(fim: string) {
  return !fim || fim === 'atual'
}

export function mesesDeExperiencia(inicio: string, fim: string) {
  const ate = trabalhoAtual(fim) ? mesAtual() : fim
  const [y1, m1] = inicio.split('-').map(Number)
  const [y2, m2] = ate.split('-').map(Number)
  if (!y1 || !m1 || !y2 || !m2) return 0
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1))
}

/** Tira contato e documento de um texto que a empresa tomadora vai ler. */
export function semContato(texto: string) {
  return texto
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '')
    .replace(/\b\d{1,2}\.\d{3}\.\d{3}-?[\dxX]\b/g, '')
    .replace(/(?:\+?55[\s.-]?)?\(?\b\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/g, '')
    .replace(/\b\d{5}-\d{3}\b/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,;:])/g, '$1')
    .trim()
}

export function nomeCertificado(valor: string) {
  const limpo = valor.replace(/\s+/g, ' ').trim()
  const nr = /^nr\s*-?\s*0?(\d{1,2})\b/i.exec(limpo)
  if (nr) return `NR${nr[1]}`
  const chave = semAcento(limpo)
  if (chave === 'mopp') return 'MOPP'
  if (chave === 'munck') return 'Munck'
  if (chave === 'ponte rolante') return 'Ponte Rolante'
  return limpo.slice(0, 60)
}

export function habilidadesDoTexto(texto: string) {
  const vistas = new Set<string>()
  const lista: string[] = []
  for (const parte of texto.split(/[,;\n]/)) {
    const item = semContato(parte).replace(/\s+/g, ' ').trim().slice(0, 40)
    const chave = semAcento(item)
    if (!item || vistas.has(chave)) continue
    vistas.add(chave)
    lista.push(item)
  }
  return lista.slice(0, 15)
}

function chaveExperiencia(item: Experiencia) {
  return semAcento(`${item.cargo}|${item.empresa}`).replace(/\s+/g, ' ').trim()
}

function ordemExperiencia(item: Experiencia) {
  return trabalhoAtual(item.fim) ? '9999-99' : item.inicio || '0000-00'
}

export function ordenarExperiencias(lista: Experiencia[]) {
  return [...lista].sort((a, b) => ordemExperiencia(b).localeCompare(ordemExperiencia(a)))
}

export type CamposCurriculo = {
  nome: string
  telefone: string
  nascimento: string
  cpf: string
  cidade: string
  estado: string
  resumo: string
  escolaridade: string
  habilidades: string
  profissoes: string[]
  experiencia: Experiencia[]
  certificados: Certificado[]
  cnhCategoria: string
}

/** Junta o que foi lido do currículo sem apagar o que a pessoa já escreveu. */
export function mesclarCurriculo<T extends CamposCurriculo>(form: T, lido: CurriculoLido) {
  const copia: T = { ...form }
  const novo: CamposCurriculo = copia
  const entrou: string[] = []

  const textos = [
    ['nome', 'Nome'],
    ['telefone', 'Telefone'],
    ['cpf', 'CPF'],
    ['nascimento', 'Data de nascimento'],
  ] as const
  for (const [campo, rotulo] of textos) {
    if (!novo[campo].trim() && lido[campo]) {
      novo[campo] = lido[campo]
      entrou.push(rotulo)
    }
  }

  if (!novo.cidade.trim() && lido.cidade) {
    novo.cidade = lido.cidade
    if (lido.estado) novo.estado = lido.estado
    entrou.push(`Cidade: ${lido.cidade}${lido.estado ? `/${lido.estado}` : ''}`)
  }

  if (!novo.resumo.trim() && lido.resumo) {
    novo.resumo = lido.resumo
    entrou.push('Resumo profissional')
  }

  if (!novo.escolaridade && lido.escolaridade) {
    novo.escolaridade = lido.escolaridade
    entrou.push(`Escolaridade: ${lido.escolaridade}`)
  }

  const cargosNovos = lido.profissoes.filter((id) => !novo.profissoes.includes(id))
  if (cargosNovos.length) {
    novo.profissoes = [...novo.profissoes, ...cargosNovos]
    entrou.push(`Cargos sugeridos: ${cargosNovos.map(cargoLabel).join(', ')}`)
  }

  const chaves = new Set(novo.experiencia.map(chaveExperiencia))
  const expNovas = lido.experiencia.filter((item) => {
    const chave = chaveExperiencia(item)
    if (chaves.has(chave)) return false
    chaves.add(chave)
    return true
  })
  if (expNovas.length) {
    novo.experiencia = ordenarExperiencias([...novo.experiencia, ...expNovas])
    entrou.push(`${expNovas.length} ${expNovas.length === 1 ? 'experiência' : 'experiências'}`)
  }

  const tipos = new Set(novo.certificados.map((item) => semAcento(item.tipo)))
  const certsNovos = lido.certificados.filter((tipo) => {
    const chave = semAcento(tipo)
    if (!tipo || tipos.has(chave)) return false
    tipos.add(chave)
    return true
  })
  if (certsNovos.length) {
    novo.certificados = [
      ...novo.certificados,
      ...certsNovos.map((tipo) => ({ tipo, validade: '', valido: true })),
    ]
    entrou.push(`Certificações: ${certsNovos.join(', ')}`)
  }

  if (!novo.cnhCategoria.trim() && lido.cnhCategoria) {
    novo.cnhCategoria = lido.cnhCategoria
    entrou.push(`CNH ${lido.cnhCategoria}`)
  }

  const atuais = habilidadesDoTexto(novo.habilidades)
  const vistas = new Set(atuais.map(semAcento))
  const habNovas = lido.habilidades.filter((item) => {
    const chave = semAcento(item)
    if (!item || vistas.has(chave)) return false
    vistas.add(chave)
    return true
  })
  if (habNovas.length) {
    novo.habilidades = [...atuais, ...habNovas].join(', ')
    entrou.push(`Habilidades: ${habNovas.join(', ')}`)
  }

  return { form: copia, entrou }
}
