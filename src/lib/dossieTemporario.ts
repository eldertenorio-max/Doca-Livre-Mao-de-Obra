import { cargoLabel } from '../data/categories'
import { effectiveStatus } from './documentos'
import { nowIso, uid } from './seed'
import type {
  CadastroEtt,
  Demanda,
  DocumentoRegistro,
  Empresa,
  PecaDocumental,
  Profissional,
} from './types'

export const AVISO_MINUTA =
  'Modelo para controle do sistema. O texto jurídico definitivo deve ser revisado por advogado trabalhista antes de contratação real.'

export const ETT_ID = 'ett'

export function cadastroEttInicial(): CadastroEtt {
  return {
    razaoSocial: 'DOCA LIVRE MÃO DE OBRA LTDA',
    nomeFantasia: 'Doca Livre Mão de Obra',
    cnpj: '',
    juntaComercial: '',
    socios: '',
    documentosSocios: '',
    capitalSocial: '',
    cnae: '',
    sede: '',
    registroSirett: '',
    certificadoRegistro: '',
    certificadoDigital: '',
    procuracoes: '',
  }
}

export const PASTAS_DOCUMENTAIS = [
  {
    id: 'ett',
    titulo: 'Empresa de trabalho temporário',
    itens: ['Contrato social', 'CNPJ', 'Registro SIRETT', 'Certificado', 'Documentos societários'],
  },
  {
    id: 'tomadora',
    titulo: 'Empresa tomadora',
    itens: ['Cadastro', 'Documentos', 'Contratos'],
  },
  {
    id: 'trabalhador',
    titulo: 'Trabalhador',
    itens: ['Cadastro', 'Currículo', 'Documentos pessoais', 'Certificações', 'ASO', 'Treinamentos'],
  },
  {
    id: 'demanda',
    titulo: 'Demanda',
    itens: ['Solicitação', 'Requisitos', 'Justificativa', 'Observações'],
  },
  {
    id: 'contratacao',
    titulo: 'Contratação',
    itens: ['Contrato ETT e tomadora', 'Contrato individual temporário', 'Assinaturas', 'Admissão', 'eSocial'],
  },
  {
    id: 'missao',
    titulo: 'Missão',
    itens: ['Jornada', 'Ocorrências', 'EPIs', 'Avaliações'],
  },
  {
    id: 'encerramento',
    titulo: 'Encerramento',
    itens: ['Rescisão ou encerramento', 'Pagamentos', 'Documentos finais', 'Histórico'],
  },
] as const

export const VISIVEL_PARA_TOMADORA = [
  'Nome',
  'Experiência',
  'Competências e requisitos atendidos',
  'Certificações exigidas pela missão',
  'Disponibilidade',
  'Cidade',
]

export function proximoNumero(pecas: PecaDocumental[], prefixo: string) {
  const seq = pecas.filter((p) => p.numero.startsWith(`${prefixo}-`)).length + 1
  return `${prefixo}-${String(seq).padStart(6, '0')}`
}

function dataBr(iso: string) {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function linhasMissao(demanda: Demanda, empresa: Empresa, ett: CadastroEtt) {
  const fim = demanda.dataFim || demanda.data
  return [
    `Tomadora: ${empresa.nomeFantasia}`,
    `Empresa de trabalho temporário: ${ett.nomeFantasia}`,
    `Registro SIRETT: ${ett.registroSirett.trim() || 'não informado'}`,
    `Cargo: ${cargoLabel(demanda.cargo)}`,
    `Quantidade: ${demanda.quantidade}`,
    `Local: ${demanda.endereco.cidade}/${demanda.endereco.estado}`,
    `Início: ${dataBr(demanda.data)}`,
    `Término previsto: ${dataBr(fim)}`,
    `Jornada: ${demanda.horaInicio}–${demanda.horaFim}`,
    `Remuneração prevista: ${demanda.valorDiaria ? `R$ ${demanda.valorDiaria} por dia` : 'a informar'}`,
    `Motivo: ${demanda.motivo || 'não informado'}`,
    `Atividades: ${demanda.atividades || demanda.descricao || 'não informadas'}`,
    `Requisitos: ${demanda.requisitos.join(', ') || 'não informados'}`,
    `Observações: ${demanda.observacoes || 'sem observações'}`,
    'Segurança e saúde: ASO, treinamentos e EPIs da função ficam na pasta do trabalhador. O sistema não emite ASO.',
  ]
}

export function criarPecasIniciais(params: {
  pecas: PecaDocumental[]
  demanda: Demanda
  empresa: Empresa
  ett: CadastroEtt
  signatarioTomadora: string
}): PecaDocumental[] {
  const { pecas, demanda, empresa, ett, signatarioTomadora } = params
  if (pecas.some((p) => p.demandaId === demanda.id && p.tipo === 'solicitacao')) return []
  const agora = nowIso()
  const base = linhasMissao(demanda, empresa, ett)
  const solicitacao: PecaDocumental = {
    id: uid('peca'),
    numero: proximoNumero(pecas, 'MOT'),
    tipo: 'solicitacao',
    status: 'registrada',
    demandaId: demanda.id,
    empresaId: empresa.id,
    titulo: 'Solicitação de trabalho temporário',
    resumo: base,
    assinaturas: [
      { papel: 'tomadora', nome: signatarioTomadora || empresa.responsavelNome, status: 'assinado', em: agora },
    ],
    criadoEm: agora,
    aviso: AVISO_MINUTA,
  }
  const contrato: PecaDocumental = {
    id: uid('peca'),
    numero: proximoNumero([solicitacao, ...pecas], 'CTR'),
    tipo: 'contrato_ett_tomadora',
    status: 'aguardando_assinatura',
    demandaId: demanda.id,
    empresaId: empresa.id,
    titulo: 'Contrato de prestação de serviços de colocação de trabalhador temporário',
    resumo: [
      'Partes: empresa de trabalho temporário e empresa tomadora.',
      'O trabalhador é contratado pela empresa de trabalho temporário e colocado à disposição da tomadora.',
      ...base,
      'O contrato escrito precisa qualificar as partes e registrar a justificativa da demanda, o prazo, o valor da prestação e as disposições de segurança e saúde.',
    ],
    assinaturas: [
      { papel: 'ett', nome: ett.nomeFantasia, status: 'pendente' },
      { papel: 'tomadora', nome: signatarioTomadora || empresa.responsavelNome, status: 'pendente' },
    ],
    criadoEm: agora,
    aviso: AVISO_MINUTA,
    meta: { decreto: 'Decreto 10.854/2021 — elementos do contrato escrito' },
  }
  return [solicitacao, contrato]
}

export function criarContratoIndividual(params: {
  pecas: PecaDocumental[]
  demanda: Demanda
  empresa: Empresa
  profissional: Profissional
  ett: CadastroEtt
  candidaturaId: string
}): PecaDocumental | null {
  const { pecas, demanda, empresa, profissional, ett, candidaturaId } = params
  if (pecas.some((p) => p.candidaturaId === candidaturaId && p.tipo === 'contrato_individual')) return null
  const fim = demanda.dataFim || demanda.data
  return {
    id: uid('peca'),
    numero: proximoNumero(pecas, 'CIT'),
    tipo: 'contrato_individual',
    status: 'aguardando_assinatura',
    demandaId: demanda.id,
    empresaId: empresa.id,
    profissionalId: profissional.id,
    candidaturaId,
    titulo: 'Contrato individual de trabalho temporário',
    resumo: [
      `Empregador: ${ett.nomeFantasia}`,
      `Trabalhador: ${profissional.nome}`,
      `Tomadora: ${empresa.nomeFantasia}`,
      `Função: ${cargoLabel(demanda.cargo)}`,
      `Local: ${demanda.endereco.cidade}/${demanda.endereco.estado}`,
      `Início: ${dataBr(demanda.data)}`,
      `Término: ${dataBr(fim)}`,
      `Jornada: ${demanda.horaInicio}–${demanda.horaFim}`,
      `Remuneração: ${demanda.valorDiaria ? `R$ ${demanda.valorDiaria} por dia` : 'a informar'}`,
      `Motivo da contratação: ${demanda.motivo || 'não informado'}`,
      'Direitos: os do trabalhador temporário, na forma da Lei 6.019/1974. Este vínculo é distinto do contrato por prazo determinado comum da CLT.',
      'Condições: colocação à disposição da tomadora pelo prazo e pelo motivo desta missão.',
      'eSocial: admissão pelo evento S-2200, categoria 106 (trabalhador temporário da Lei 6.019/1974). O sistema não transmite o evento.',
    ],
    assinaturas: [
      { papel: 'ett', nome: ett.nomeFantasia, status: 'pendente' },
      { papel: 'trabalhador', nome: profissional.nome, status: 'pendente' },
    ],
    criadoEm: nowIso(),
    aviso: AVISO_MINUTA,
    meta: { esocial: 'pendente', categoriaEsocial: '106' },
  }
}

export function criarEncerramento(params: {
  pecas: PecaDocumental[]
  demanda: Demanda
  dataEfetiva: string
  motivo: string
  responsavel: string
  observacoes: string
  profissionalId?: string
}): PecaDocumental {
  const fim = params.demanda.dataFim || params.demanda.data
  const antecipada = params.dataEfetiva < fim
  const prazo = new Date(`${params.dataEfetiva}T12:00:00`)
  prazo.setDate(prazo.getDate() + 2)
  const prazoIso = prazo.toISOString().slice(0, 10)
  return {
    id: uid('peca'),
    numero: proximoNumero(params.pecas, 'ENC'),
    tipo: 'encerramento',
    status: 'encerrada',
    demandaId: params.demanda.id,
    empresaId: params.demanda.empresaId,
    profissionalId: params.profissionalId,
    titulo: antecipada ? 'Rescisão antecipada' : 'Encerramento da missão',
    resumo: [
      `Término previsto: ${dataBr(fim)}`,
      `Data efetiva: ${dataBr(params.dataEfetiva)}`,
      `Motivo: ${params.motivo}`,
      `Responsável: ${params.responsavel}`,
      `Observações: ${params.observacoes || 'sem observações'}`,
      antecipada
        ? `Rescisão antecipada de contrato temporário deve ser informada no SIRETT em até 2 dias após o encerramento. Prazo indicado: ${dataBr(prazoIso)}. O sistema não envia essa informação ao Ministério do Trabalho.`
        : 'Encerramento no prazo previsto. Verbas, última jornada e situação no eSocial ficam a cargo de quem responde pela obrigação.',
    ],
    assinaturas: [],
    criadoEm: nowIso(),
    aviso: AVISO_MINUTA,
    meta: {
      antecipada: antecipada ? 'sim' : 'nao',
      dataEfetiva: params.dataEfetiva,
      sirettInformarAte: antecipada ? prazoIso : '',
    },
  }
}

function assinaturaOk(peca: PecaDocumental | undefined, papel: AssinaturaPapel) {
  return Boolean(peca?.assinaturas.some((a) => a.papel === papel && a.status === 'assinado'))
}

type AssinaturaPapel = PecaDocumental['assinaturas'][number]['papel']

export function pendenciasParaIniciar(params: {
  pecas: PecaDocumental[]
  documentos: DocumentoRegistro[]
  demandaId: string
  profissionalId: string
}) {
  const daDemanda = params.pecas.filter((p) => p.demandaId === params.demandaId)
  if (daDemanda.length === 0) return []

  const faltas: string[] = []
  if (!daDemanda.some((p) => p.tipo === 'solicitacao')) faltas.push('Solicitação de trabalho temporário')

  const ettTomadora = daDemanda.find((p) => p.tipo === 'contrato_ett_tomadora')
  if (!assinaturaOk(ettTomadora, 'ett') || !assinaturaOk(ettTomadora, 'tomadora')) {
    faltas.push('Contrato entre a empresa de trabalho temporário e a tomadora, assinado pelos dois')
  }

  const individual = daDemanda.find(
    (p) => p.tipo === 'contrato_individual' && p.profissionalId === params.profissionalId,
  )
  if (!assinaturaOk(individual, 'ett') || !assinaturaOk(individual, 'trabalhador')) {
    faltas.push('Contrato individual de trabalho temporário, assinado pela empresa de trabalho temporário e pelo trabalhador')
  }
  if (individual?.meta?.esocial !== 'informado') {
    faltas.push('Admissão informada no eSocial (S-2200, categoria 106)')
  }

  const aso = params.documentos.find(
    (d) => d.donoTipo === 'profissional' && d.donoId === params.profissionalId && d.tipoId === 'aso',
  )
  if (!aso || effectiveStatus(aso) !== 'aprovado') {
    faltas.push('ASO apto, emitido pelo serviço de saúde ocupacional e aprovado no sistema')
  }

  return faltas
}

export function atualizarAssinatura(peca: PecaDocumental, papel: AssinaturaPapel, nome: string): PecaDocumental {
  const assinaturas = peca.assinaturas.map((a) =>
    a.papel === papel ? { ...a, status: 'assinado' as const, nome, em: nowIso() } : a,
  )
  const todos = assinaturas.every((a) => a.status === 'assinado')
  return {
    ...peca,
    assinaturas,
    status: todos && peca.status === 'aguardando_assinatura' ? 'concluida' : peca.status,
  }
}
