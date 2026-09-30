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

/** Opções e seleção inicial de cada cargo. A lista muda junto com o tipo. */
const REQUISITOS_POR_CARGO: Record<string, { opcoes: string[]; padrao: string[] }> = {
  motorista_cnh_b: { opcoes: ['CNH', 'EAR'], padrao: ['CNH'] },
  motorista_vuc: { opcoes: ['CNH', 'EAR'], padrao: ['CNH'] },
  motorista_toco: { opcoes: ['CNH', 'EAR', 'MOPP'], padrao: ['CNH'] },
  motorista_truck: { opcoes: ['CNH', 'EAR', 'MOPP', 'GR'], padrao: ['CNH', 'GR'] },
  carreteiro: { opcoes: ['CNH', 'EAR', 'MOPP', 'GR'], padrao: ['CNH', 'GR'] },
  bitrem: { opcoes: ['CNH', 'EAR', 'MOPP', 'GR'], padrao: ['CNH', 'GR'] },
  rodotrem: { opcoes: ['CNH', 'EAR', 'MOPP', 'GR'], padrao: ['CNH', 'GR'] },
  mopp: { opcoes: ['CNH', 'EAR', 'MOPP', 'GR'], padrao: ['CNH', 'MOPP'] },
  munck: { opcoes: ['CNH', 'Munck', 'NR11', 'NR35'], padrao: ['CNH', 'Munck'] },
  auxiliar_logistica: { opcoes: ['Experiência em armazém', 'Turno noturno'], padrao: ['Experiência em armazém'] },
  conferente: { opcoes: ['Experiência em conferência', 'Turno noturno'], padrao: ['Experiência em conferência'] },
  separador: { opcoes: ['Experiência em separação', 'Turno noturno'], padrao: ['Experiência em separação'] },
  estoquista: { opcoes: ['Experiência em estoque', 'Turno noturno'], padrao: ['Experiência em estoque'] },
  expedidor: { opcoes: ['Experiência em expedição', 'Turno noturno'], padrao: ['Experiência em expedição'] },
  recebimento: { opcoes: ['Experiência em recebimento', 'Turno noturno'], padrao: ['Experiência em recebimento'] },
  inventarista: { opcoes: ['Experiência em inventário', 'Experiência em estoque'], padrao: ['Experiência em inventário'] },
  empilhadeira: { opcoes: ['NR11', 'NR35'], padrao: ['NR11'] },
  paleteira: { opcoes: ['NR11'], padrao: ['NR11'] },
  ponte_rolante: { opcoes: ['Ponte Rolante', 'NR11', 'NR35'], padrao: ['Ponte Rolante'] },
  guindaste: { opcoes: ['NR11', 'NR35', 'CNH'], padrao: ['NR11'] },
  reach_stacker: { opcoes: ['NR11', 'NR35'], padrao: ['NR11'] },
  ajudante_carga: { opcoes: ['Experiência em carga e descarga', 'Turno noturno'], padrao: ['Experiência em carga e descarga'] },
  embalador: { opcoes: ['Experiência em embalagem'], padrao: ['Experiência em embalagem'] },
  mecanico_diesel: { opcoes: ['Experiência em diesel', 'NR12'], padrao: ['Experiência em diesel'] },
  eletricista: { opcoes: ['NR10', 'Experiência em elétrica'], padrao: ['NR10'] },
  soldador: { opcoes: ['Experiência em solda', 'NR18'], padrao: ['Experiência em solda'] },
  borracheiro: { opcoes: ['Experiência em pneus'], padrao: ['Experiência em pneus'] },
  lavador_frota: { opcoes: ['Experiência em lavagem de frota'], padrao: ['Experiência em lavagem de frota'] },
  analista_transporte: { opcoes: ['Experiência em transporte', 'TMS', 'Excel'], padrao: ['Experiência em transporte'] },
  torre_controle: { opcoes: ['Experiência em torre de controle', 'TMS'], padrao: ['Experiência em torre de controle'] },
  monitor_frota: { opcoes: ['Experiência em monitoramento de frota', 'CNH'], padrao: ['Experiência em monitoramento de frota'] },
  controlador_patio: { opcoes: ['Experiência em pátio', 'NR11'], padrao: ['Experiência em pátio'] },
}

const CHAVES_REQUISITO: Record<string, string[]> = {
  'Experiência em armazém': ['armazem', 'logistica', 'estoque'],
  'Experiência em conferência': ['conferenc', 'conferente'],
  'Experiência em separação': ['separac', 'separador', 'picker'],
  'Experiência em estoque': ['estoque', 'estoquista'],
  'Experiência em expedição': ['expedic', 'expedidor'],
  'Experiência em recebimento': ['recebimento'],
  'Experiência em inventário': ['inventar'],
  'Experiência em carga e descarga': ['carga', 'descarga', 'ajudante'],
  'Experiência em embalagem': ['embalag', 'embalador'],
  'Experiência em diesel': ['diesel', 'mecanico'],
  'Experiência em elétrica': ['eletric'],
  'Experiência em solda': ['solda', 'soldador'],
  'Experiência em pneus': ['pneu', 'borrache'],
  'Experiência em lavagem de frota': ['lavagem', 'lavador', 'frota'],
  'Experiência em transporte': ['transporte', 'frota', 'rota'],
  TMS: ['tms'],
  Excel: ['excel', 'planilha'],
  'Experiência em torre de controle': ['torre', 'controle'],
  'Experiência em monitoramento de frota': ['monitor', 'frota'],
  'Experiência em pátio': ['patio', 'patío'],
  NR12: ['nr12', 'nr-12'],
  NR18: ['nr18', 'nr-18'],
}

export function requisitosDoCargo(cargoId: string) {
  return REQUISITOS_POR_CARGO[cargoId] ?? { opcoes: [...REQUISITOS_BUSCA], padrao: [] }
}

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

export type ModalidadePretendida =
  | 'temporario'
  | 'prazo_determinado'
  | 'prazo_indeterminado'
  | 'intermitente'
  | 'autonomo'

export const MODALIDADES: { id: ModalidadePretendida; label: string }[] = [
  { id: 'temporario', label: 'Temporário' },
  { id: 'prazo_determinado', label: 'Prazo determinado' },
  { id: 'prazo_indeterminado', label: 'Prazo indeterminado' },
  { id: 'intermitente', label: 'Intermitente' },
  { id: 'autonomo', label: 'Autônomo / serviço independente' },
]

export const AVISO_PERIODO =
  'Atenção: o período informado representa a necessidade da operação. A modalidade e a formalização da contratação devem observar a legislação trabalhista aplicável.'

export type PedidoContratacao = {
  cargoId: string
  requisitos: string[]
  inicio: string
  fim: string
  cidade: string
  observacoes: string
  quantidade: number
  horaInicio: string
  horaFim: string
  modalidade: ModalidadePretendida
  /** Prorrogação do mesmo contrato temporário, não um contrato novo. */
  prorrogacao: boolean
}

export type SituacaoContrato = 'compativel' | 'alerta' | 'bloqueio' | 'sobreposto'

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

function textoCurriculo(profissional: Profissional) {
  return semAcento(
    [
      profissional.profissoes.map(cargoLabel).join(' '),
      profissional.experiencia.map((e) => `${e.cargo} ${e.empresa} ${e.descricao}`).join(' '),
      profissional.certificados.map((c) => c.tipo).join(' '),
    ].join(' '),
  )
}

function requisitoAtendido(
  profissional: Profissional,
  documentos: DocumentoRegistro[],
  requisito: string,
) {
  if (requisito === 'Turno noturno') return profissional.disponibilidade.noturno
  const chaves = CHAVES_REQUISITO[requisito]
  if (chaves) {
    const texto = textoCurriculo(profissional)
    if (chaves.some((chave) => texto.includes(semAcento(chave)))) return true
  }
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

function diferencaDias(de: string, ate: string) {
  const a = new Date(`${de}T12:00:00`)
  const b = new Date(`${ate}T12:00:00`)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function excedeDoisAnos(inicio: string, fim: string) {
  const limite = new Date(`${inicio}T12:00:00`)
  limite.setFullYear(limite.getFullYear() + 2)
  return new Date(`${fim}T12:00:00`) > limite
}

/** Impede seguir com um pedido cujo período já viola a modalidade escolhida. */
export function bloqueioDoPedido(pedido: PedidoContratacao): string | null {
  const dias = diasInclusivos(pedido.inicio, pedido.fim)
  if (dias < 1) return 'O fim da necessidade precisa ser no mesmo dia ou depois do início.'
  if (pedido.modalidade === 'temporario' && !pedido.prorrogacao && dias > 180) {
    return 'Um contrato temporário novo não passa de 180 dias, consecutivos ou não. Acima disso só cabe prorrogação do mesmo contrato, por até 90 dias, se as condições originais continuarem.'
  }
  if (pedido.modalidade === 'temporario' && pedido.prorrogacao && dias > 90) {
    return 'A prorrogação do trabalho temporário é de no máximo 90 dias.'
  }
  if (pedido.modalidade === 'prazo_determinado' && excedeDoisAnos(pedido.inicio, pedido.fim)) {
    return 'Em regra, o contrato por prazo determinado não ultrapassa 2 anos. Ajuste o período ou escolha outra modalidade.'
  }
  return null
}

export function textoModalidade(modalidade: ModalidadePretendida) {
  switch (modalidade) {
    case 'temporario':
      return 'Temporário (Lei 6.019/74): até 180 dias com o mesmo tomador, consecutivos ou não. Prorrogação de até 90 dias só se as condições que justificaram o temporário continuarem. Para colocar o mesmo trabalhador de novo como temporário na mesma empresa, espere 90 dias do término.'
    case 'prazo_determinado':
      return 'Prazo determinado não é trabalho temporário. Em regra não ultrapassa 2 anos. As datas são a necessidade da operação; o contrato se formaliza depois da escolha.'
    case 'prazo_indeterminado':
      return 'Prazo indeterminado não tem data final de contrato. Início e fim só delimitam a necessidade da operação.'
    case 'intermitente':
      return 'No intermitente a pessoa é empregada e convocada para os períodos de serviço. As datas são a janela da necessidade, não um contrato por prazo determinado.'
    case 'autonomo':
      return 'Serviço independente. As datas não criam contrato de trabalho. Habitualidade, subordinação e pessoalidade podem caracterizar vínculo.'
  }
}

function situacaoContrato(
  profissionalId: string,
  empresa: Empresa,
  pedido: PedidoContratacao,
  demandas: Demanda[],
  candidaturas: Candidatura[],
): { situacao: SituacaoContrato; texto: string } {
  const diasPedido = diasInclusivos(pedido.inicio, pedido.fim)
  const anteriores = contratosNaEmpresa(profissionalId, empresa.id, demandas, candidaturas)
  const sobreposto = anteriores.find((d) => d.data >= pedido.inicio && d.data <= pedido.fim)
  if (sobreposto) {
    return {
      situacao: 'sobreposto',
      texto: `Já está escalada na sua empresa em ${formatarData(sobreposto.data)}, dentro desta janela. Não entra como disponível neste período.`,
    }
  }

  const passados = anteriores
    .filter((d) => d.data < pedido.inicio)
    .sort((a, b) => (a.data < b.data ? 1 : -1))
  const ultimo = passados[0]
  const diasDesdeUltimo = ultimo ? diferencaDias(ultimo.data, pedido.inicio) : null
  const diasAnteriores = passados.length

  if (pedido.modalidade === 'temporario') {
    if (!ultimo) {
      return {
        situacao: 'compativel',
        texto: `Necessidade de ${diasPedido} dia${diasPedido === 1 ? '' : 's'}, dentro do teto de 180 dias do temporário. Não há colocação anterior desta pessoa na sua empresa. A formalização só vem depois da seleção.`,
      }
    }
    if (pedido.prorrogacao) {
      if (!ultimo) {
        return {
          situacao: 'bloqueio',
          texto: 'Não há contrato temporário anterior desta pessoa com a sua empresa para prorrogar.',
        }
      }
      if (diasDesdeUltimo !== null && diasDesdeUltimo >= 90) {
        return {
          situacao: 'bloqueio',
          texto: `A última atuação foi em ${formatarData(ultimo.data)}, já com 90 dias ou mais. Isso não é prorrogação do mesmo contrato. Desmarque a prorrogação para tratar como contrato temporário novo.`,
        }
      }
      const total = diasAnteriores + diasPedido
      if (diasPedido > 90 || total > 270) {
        return {
          situacao: 'bloqueio',
          texto: `A prorrogação não cabe: são ${diasPedido} dias neste pedido e ${diasAnteriores} já contados na sua empresa. A prorrogação é de até 90 dias, e o conjunto não passa de 270 (180 + 90).`,
        }
      }
      if (total > 180) {
        return {
          situacao: 'alerta',
          texto: `Prorrogação possível só se as condições originais continuarem e houver contrato escrito. Este pedido mais os dias já feitos na sua empresa somam ${total}, acima de 180 e até 270.`,
        }
      }
      return {
        situacao: 'alerta',
        texto: `Marcado como prorrogação do mesmo contrato temporário. A última atuação na sua empresa foi em ${formatarData(ultimo.data)}. Confirme que é o mesmo contrato, não uma contratação nova.`,
      }
    }
    if (diasDesdeUltimo !== null && diasDesdeUltimo < 90) {
      return {
        situacao: 'bloqueio',
        texto: `Incompatível com um contrato temporário novo. A última atuação na sua empresa foi em ${formatarData(ultimo.data)}, há ${diasDesdeUltimo} dia${diasDesdeUltimo === 1 ? '' : 's'}. A Lei 6.019/74 pede 90 dias do término para colocar o mesmo trabalhador de novo como temporário nesta empresa. Prorrogação é outra hipótese: o mesmo contrato, por até 90 dias.`,
      }
    }
    return {
      situacao: 'compativel',
      texto: `A espera de 90 dias desde ${formatarData(ultimo!.data)} já passou. Este pedido pode ser tratado como novo período temporário, de ${diasPedido} dia${diasPedido === 1 ? '' : 's'}, e a formalização vem depois da seleção.`,
    }
  }

  if (pedido.modalidade === 'autonomo') {
    if (diasDesdeUltimo !== null && diasDesdeUltimo <= 1) {
      return {
        situacao: 'alerta',
        texto: `Há atuação em ${formatarData(ultimo!.data)}, em seguida deste período. Repetir dias seguidos na mesma empresa, com subordinação, aumenta o risco de vínculo. As datas não criam contrato de trabalho.`,
      }
    }
    return {
      situacao: 'compativel',
      texto: 'As datas descrevem a necessidade do serviço independente. Não há contrato de trabalho gerado por este pedido.',
    }
  }

  if (pedido.modalidade === 'prazo_indeterminado') {
    return {
      situacao: 'compativel',
      texto: 'Início e fim descrevem a necessidade da operação. Não são o encerramento de um contrato por prazo indeterminado. A formalização vem depois da seleção.',
    }
  }

  if (pedido.modalidade === 'intermitente') {
    return {
      situacao: 'compativel',
      texto: 'Janela para convocação. Cada chamada do intermitente depende de antecedência e aceite. Este período não é, por si, um contrato por prazo determinado.',
    }
  }

  return {
    situacao: 'compativel',
    texto: `Necessidade de ${diasPedido} dia${diasPedido === 1 ? '' : 's'}. Prazo determinado não se confunde com temporário e, em regra, não passa de 2 anos. O contrato se formaliza depois da escolha.`,
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
      `Necessidade de ${pedido.quantidade} profissional${pedido.quantidade === 1 ? '' : 'is'}, ${diasPedido} dia${diasPedido === 1 ? '' : 's'} (${formatarData(pedido.inicio)} a ${formatarData(pedido.fim)}), jornada ${pedido.horaInicio}–${pedido.horaFim}.`,
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

  const peso = (s: SituacaoContrato) => (s === 'bloqueio' || s === 'sobreposto' ? 1 : 0)
  lista.sort((a, b) => {
    if (peso(a.situacao) !== peso(b.situacao)) return peso(a.situacao) - peso(b.situacao)
    return b.score - a.score
  })

  const relevantes = lista.filter((item) => item.score >= 45)
  return relevantes.length > 0 ? relevantes : lista.slice(0, 5)
}
