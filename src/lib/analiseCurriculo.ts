import { cargoLabel } from '../data/categories'
import {
  checklistProfissional,
  daysUntil,
  effectiveStatus,
  resumoDocumental,
} from './documentos'
import type { Candidatura, Demanda, DocumentoRegistro, Empresa, Profissional } from './types'

export const REQUISITOS_BUSCA = [
  'CNH',
  'EAR',
  'MOPP',
  'NR11',
  'NR35',
  'NR10',
  'NR20',
  'Munck',
  'Ponte Rolante',
  'GR',
] as const

const DOC_DO_REQUISITO: Record<string, string> = {
  CNH: 'cnh',
  EAR: 'cnh',
  MOPP: 'mopp',
  NR11: 'nr11',
  NR35: 'nr35',
  NR10: 'nr10',
  NR20: 'nr20',
  Munck: 'munck',
  'Ponte Rolante': 'ponte_rolante',
  GR: 'aptidao_gr',
}

export type PedidoContratacao = {
  cargoId: string
  requisitos: string[]
  inicio: string
  fim: string
  cidade: string
  observacoes: string
}

export type SituacaoContrato = 'livre' | 'seguido' | 'sobreposto'

export type CurriculoAnalisado = {
  profissional: Profissional
  score: number
  leitura: string
  aderencias: string[]
  falhas: string[]
  situacao: SituacaoContrato
  situacaoTexto: string
  diasPedido: number
  mesmaCidade: boolean
}

const STOP = new Set([
  'para',
  'com',
  'uma',
  'dos',
  'das',
  'que',
  'nao',
  'não',
  'por',
  'como',
  'mais',
  'este',
  'esta',
  'essa',
  'pelo',
  'pela',
  'nos',
  'nas',
  'sem',
  'sob',
  'entre',
  'depois',
  'antes',
])

function semAcento(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function diasInclusivos(inicio: string, fim: string) {
  const a = new Date(`${inicio}T12:00:00`)
  const b = new Date(`${fim}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function certificadoValido(profissional: Profissional, tipo: string) {
  return profissional.certificados.some((c) => {
    if (semAcento(c.tipo) !== semAcento(tipo) || !c.valido) return false
    const dias = daysUntil(c.validade)
    return dias === null || dias >= 0
  })
}

function documentoAprovado(documentos: DocumentoRegistro[], profissionalId: string, tipoId: string, ear = false) {
  const doc = documentos.find(
    (d) => d.donoTipo === 'profissional' && d.donoId === profissionalId && d.tipoId === tipoId,
  )
  if (!doc || effectiveStatus(doc) !== 'aprovado') return false
  if (ear && semAcento(doc.meta?.ear ?? '') !== 'sim') return false
  return true
}

function requisitoAtendido(
  profissional: Profissional,
  documentos: DocumentoRegistro[],
  requisito: string,
) {
  if (requisito === 'CNH') {
    const dias = daysUntil(profissional.cnhValidade)
    const cnhVigente = Boolean(profissional.cnhCategoria) && (dias === null || dias >= 0)
    return cnhVigente || documentoAprovado(documentos, profissional.id, 'cnh')
  }
  if (requisito === 'EAR') return documentoAprovado(documentos, profissional.id, 'cnh', true)
  const tipoDoc = DOC_DO_REQUISITO[requisito]
  return (
    certificadoValido(profissional, requisito) ||
    (tipoDoc ? documentoAprovado(documentos, profissional.id, tipoDoc) : false)
  )
}

function contratosNaEmpresa(
  profissionalId: string,
  empresaId: string,
  demandas: Demanda[],
  candidaturas: Candidatura[],
) {
  return candidaturas
    .filter(
      (c) =>
        c.profissionalId === profissionalId &&
        (c.status === 'aceita' || c.status === 'confirmada'),
    )
    .map((c) => demandas.find((d) => d.id === c.demandaId && d.empresaId === empresaId))
    .filter((d): d is Demanda => Boolean(d))
}

function situacaoContrato(
  profissionalId: string,
  empresa: Empresa,
  pedido: PedidoContratacao,
  demandas: Demanda[],
  candidaturas: Candidatura[],
): { situacao: SituacaoContrato; texto: string } {
  const anteriores = contratosNaEmpresa(profissionalId, empresa.id, demandas, candidaturas)
  const sobreposto = anteriores.find((d) => d.data >= pedido.inicio && d.data <= pedido.fim)
  if (sobreposto) {
    return {
      situacao: 'sobreposto',
      texto: `Não pode assumir este período: já existe contrato com a ${empresa.nomeFantasia} em ${formatarData(sobreposto.data)}. Dois contratos ao mesmo tempo na mesma empresa não entram como disponíveis.`,
    }
  }
  const anterioresPassados = anteriores.filter((d) => d.data < pedido.inicio).sort((a, b) => (a.data < b.data ? 1 : -1))
  const ultimo = anterioresPassados[0]
  if (!ultimo) {
    return {
      situacao: 'livre',
      texto: 'Pode assumir este contrato. Não há outro contrato desta pessoa com a sua empresa.',
    }
  }
  const intervalo = diasInclusivos(ultimo.data, pedido.inicio) - 1
  if (intervalo <= 1) {
    return {
      situacao: 'seguido',
      texto: `Pode. O contrato anterior com a sua empresa foi em ${formatarData(ultimo.data)} e este começa em ${formatarData(pedido.inicio)}. São dois contratos distintos, um em seguida do outro.`,
    }
  }
  return {
    situacao: 'livre',
    texto: `Pode. O último contrato com a sua empresa foi em ${formatarData(ultimo.data)}, com intervalo antes deste período.`,
  }
}

function formatarData(iso: string) {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function palavras(texto: string) {
  return semAcento(texto)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOP.has(w))
}

export function analisarCurriculos(params: {
  pedido: PedidoContratacao
  empresa: Empresa
  profissionais: Profissional[]
  documentos: DocumentoRegistro[]
  demandas: Demanda[]
  candidaturas: Candidatura[]
}): CurriculoAnalisado[] {
  const { pedido, empresa, profissionais, documentos, demandas, candidaturas } = params
  const label = cargoLabel(pedido.cargoId)
  const diasPedido = diasInclusivos(pedido.inicio, pedido.fim)
  const chavesObs = palavras(pedido.observacoes)
  const cidadePedida = semAcento(pedido.cidade.trim())

  const lista: CurriculoAnalisado[] = []

  for (const profissional of profissionais) {
    if (profissional.status !== 'aprovado') continue
    if (empresa.bloqueados.includes(profissional.id)) continue

    const aderencias: string[] = []
    const falhas: string[] = []
    let score = 0

    const temCargo = profissional.profissoes.includes(pedido.cargoId)
    if (temCargo) {
      score += 35
      aderencias.push(`Currículo com o cargo ${label}.`)
    } else {
      falhas.push(`Não cadastrou ${label} como profissão.`)
    }

    const reqs = pedido.requisitos
    const okReqs: string[] = []
    const faltaReqs: string[] = []
    for (const req of reqs) {
      if (requisitoAtendido(profissional, documentos, req)) okReqs.push(req)
      else faltaReqs.push(req)
    }
    if (reqs.length === 0) score += 30
    else score += Math.round((okReqs.length / reqs.length) * 30)
    if (okReqs.length) aderencias.push(`Requisitos atendidos: ${okReqs.join(', ')}.`)
    if (faltaReqs.length) falhas.push(`Requisitos em falta: ${faltaReqs.join(', ')}.`)

    const expTexto = profissional.experiencia
      .map((e) => `${e.cargo} ${e.empresa} ${e.descricao}`)
      .join(' ')
    const baseTexto = semAcento(`${expTexto} ${profissional.profissoes.map(cargoLabel).join(' ')}`)
    const acertosObs = chavesObs.filter((w) => baseTexto.includes(w))
    const expRelacionada = profissional.experiencia.find((e) =>
      semAcento(`${e.cargo} ${e.descricao}`).includes(semAcento(label).slice(0, 6)),
    )
    if (expRelacionada || acertosObs.length) {
      score += Math.min(15, 8 + acertosObs.length * 3)
      if (expRelacionada) {
        aderencias.push(
          `Experiência: ${expRelacionada.cargo} em ${expRelacionada.empresa} (${expRelacionada.inicio} a ${expRelacionada.fim}).`,
        )
      }
      if (acertosObs.length) aderencias.push(`As observações batem com o currículo: ${acertosObs.join(', ')}.`)
    } else if (profissional.experiencia[0]) {
      const e = profissional.experiencia[0]
      aderencias.push(`Última experiência: ${e.cargo} em ${e.empresa}.`)
    } else {
      falhas.push('Currículo sem experiência descrita.')
    }

    const mesmaCidade = cidadePedida
      ? semAcento(profissional.endereco.cidade) === cidadePedida
      : semAcento(profissional.endereco.cidade) === semAcento(empresa.endereco.cidade)
    const distancia = haversineKm(empresa.endereco, profissional.endereco)
    if (mesmaCidade) {
      score += 10
      aderencias.push(`Mora em ${profissional.endereco.cidade}, a cidade pedida.`)
    } else if (distancia <= 40) {
      score += 6
      aderencias.push(`Mora em ${profissional.endereco.cidade}, a cerca de ${Math.round(distancia)} km.`)
    } else {
      falhas.push(`Mora em ${profissional.endereco.cidade}, a cerca de ${Math.round(distancia)} km.`)
    }

    const resumoDocs = resumoDocumental(
      checklistProfissional(profissional, documentos, pedido.requisitos),
    )
    score += Math.round((resumoDocs.pct / 100) * 10)
    if (resumoDocs.completo) aderencias.push('Documentação obrigatória completa e válida.')
    else falhas.push(`Documentação em ${resumoDocs.pct}% (${resumoDocs.ok} de ${resumoDocs.total} aprovados).`)

    if (!temCargo) score = Math.min(score, 42)

    const seq = situacaoContrato(profissional.id, empresa, pedido, demandas, candidaturas)
    const leitura = [
      temCargo
        ? `${profissional.nome} cobre o cargo ${label}.`
        : `${profissional.nome} não tem ${label} no cadastro de profissões.`,
      okReqs.length ? `Atende ${okReqs.join(', ')}.` : '',
      faltaReqs.length ? `Não comprova ${faltaReqs.join(', ')}.` : '',
      expRelacionada
        ? `No currículo: ${expRelacionada.cargo} na ${expRelacionada.empresa}, ${expRelacionada.descricao}.`
        : '',
      `Pedido de ${diasPedido} dia${diasPedido === 1 ? '' : 's'} (${formatarData(pedido.inicio)} a ${formatarData(pedido.fim)}).`,
      seq.texto,
    ]
      .filter(Boolean)
      .join(' ')

    lista.push({
      profissional,
      score: Math.max(0, Math.min(100, score)),
      leitura,
      aderencias,
      falhas,
      situacao: seq.situacao,
      situacaoTexto: seq.texto,
      diasPedido,
      mesmaCidade,
    })
  }

  lista.sort((a, b) => {
    if (a.situacao === 'sobreposto' && b.situacao !== 'sobreposto') return 1
    if (b.situacao === 'sobreposto' && a.situacao !== 'sobreposto') return -1
    return b.score - a.score
  })

  const relevantes = lista.filter((item) => item.score >= 45)
  return relevantes.length > 0 ? relevantes : lista.slice(0, 5)
}
