/**
 * Catálogo documental Doca Livre Mão de Obra
 * Base: briefing operacional + contrato de prestação + práticas de logística/RH.
 */

export type DocCategoria =
  | 'identidade'
  | 'habilitacao'
  | 'certificacao'
  | 'saude'
  | 'financeiro'
  | 'empresa'
  | 'operacao'
  | 'plataforma'

export type DocObrigatorioPara = 'todos' | 'motorista' | 'equipamentos' | 'empresa' | 'demanda'

export type DocumentDef = {
  id: string
  label: string
  categoria: DocCategoria
  descricao: string
  /** Se true, exige data de validade */
  temValidade: boolean
  obrigatorio: DocObrigatorioPara
  /** Códigos de cargo/requisito que exigem este doc */
  requisitos?: string[]
}

/** Documentos do profissional */
export const DOCS_PROFISSIONAL: DocumentDef[] = [
  {
    id: 'rg_cpf',
    label: 'RG / CPF (frente e verso)',
    categoria: 'identidade',
    descricao: 'Documento de identidade com foto e CPF legível.',
    temValidade: false,
    obrigatorio: 'todos',
  },
  {
    id: 'selfie',
    label: 'Selfie de validação',
    categoria: 'identidade',
    descricao: 'Foto do rosto para conferência com o documento.',
    temValidade: false,
    obrigatorio: 'todos',
  },
  {
    id: 'comprovante_residencia',
    label: 'Comprovante de residência',
    categoria: 'identidade',
    descricao: 'Conta de água, luz, gás ou extrato bancário (até 90 dias).',
    temValidade: false,
    obrigatorio: 'todos',
  },
  {
    id: 'cnh',
    label: 'CNH',
    categoria: 'habilitacao',
    descricao: 'Carteira Nacional de Habilitação — categoria e EAR quando aplicável.',
    temValidade: true,
    obrigatorio: 'motorista',
    requisitos: ['CNH'],
  },
  {
    id: 'mopp',
    label: 'MOPP',
    categoria: 'certificacao',
    descricao: 'Curso de Movimentação de Produtos Perigosos.',
    temValidade: true,
    obrigatorio: 'motorista',
    requisitos: ['MOPP'],
  },
  {
    id: 'nr11',
    label: 'NR-11 (Empilhadeira / movimentação)',
    categoria: 'certificacao',
    descricao: 'Treinamento e habilitação para operação de equipamentos de movimentação.',
    temValidade: true,
    obrigatorio: 'equipamentos',
    requisitos: ['NR11'],
  },
  {
    id: 'nr35',
    label: 'NR-35 (Trabalho em altura)',
    categoria: 'certificacao',
    descricao: 'Obrigatório quando a operação envolver altura.',
    temValidade: true,
    obrigatorio: 'equipamentos',
    requisitos: ['NR35'],
  },
  {
    id: 'nr10',
    label: 'NR-10 (Eletricidade)',
    categoria: 'certificacao',
    descricao: 'Para eletricistas e serviços com risco elétrico.',
    temValidade: true,
    obrigatorio: 'equipamentos',
    requisitos: ['NR10'],
  },
  {
    id: 'nr20',
    label: 'NR-20 (Inflamáveis e combustíveis)',
    categoria: 'certificacao',
    descricao: 'Quando a operação envolver inflamáveis/combustíveis.',
    temValidade: true,
    obrigatorio: 'equipamentos',
    requisitos: ['NR20'],
  },
  {
    id: 'munck',
    label: 'Operador de Munck',
    categoria: 'certificacao',
    descricao: 'Certificado de operador de guindaste munck.',
    temValidade: true,
    obrigatorio: 'equipamentos',
    requisitos: ['Munck'],
  },
  {
    id: 'ponte_rolante',
    label: 'Ponte rolante',
    categoria: 'certificacao',
    descricao: 'Certificado de operador de ponte rolante.',
    temValidade: true,
    obrigatorio: 'equipamentos',
    requisitos: ['Ponte Rolante'],
  },
  {
    id: 'aso',
    label: 'ASO — Atestado de Saúde Ocupacional',
    categoria: 'saude',
    descricao: 'Exame médico admissional/periódico válido para a função.',
    temValidade: true,
    obrigatorio: 'todos',
  },
  {
    id: 'aptidao_gr',
    label: 'Aptidão GR / Seguradora',
    categoria: 'saude',
    descricao: 'Aptidão junto à seguradora/GR do cliente (exigido em vários contratos de rota).',
    temValidade: true,
    obrigatorio: 'motorista',
  },
  {
    id: 'pix_dados',
    label: 'Dados de pagamento (PIX / conta)',
    categoria: 'financeiro',
    descricao: 'Chave PIX ou dados bancários para repasse da diária.',
    temValidade: false,
    obrigatorio: 'todos',
  },
  {
    id: 'mei_cnpj',
    label: 'MEI / CNPJ do prestador (se houver)',
    categoria: 'financeiro',
    descricao: 'Cartão CNPJ ou certificado MEI quando o prestador emitir NF.',
    temValidade: false,
    obrigatorio: 'todos',
  },
]

/** Documentos da empresa contratante */
export const DOCS_EMPRESA: DocumentDef[] = [
  {
    id: 'contrato_social',
    label: 'Contrato social / ato constitutório',
    categoria: 'empresa',
    descricao: 'Documento societário atualizado.',
    temValidade: false,
    obrigatorio: 'empresa',
  },
  {
    id: 'cartao_cnpj',
    label: 'Cartão CNPJ',
    categoria: 'empresa',
    descricao: 'Comprovante de inscrição e situação cadastral.',
    temValidade: false,
    obrigatorio: 'empresa',
  },
  {
    id: 'comprovante_endereco_empresa',
    label: 'Comprovante de endereço da empresa',
    categoria: 'empresa',
    descricao: 'Conta de consumo ou IPTU do estabelecimento.',
    temValidade: false,
    obrigatorio: 'empresa',
  },
  {
    id: 'doc_responsavel',
    label: 'Documento do responsável legal',
    categoria: 'empresa',
    descricao: 'RG/CPF do responsável cadastrado na plataforma.',
    temValidade: false,
    obrigatorio: 'empresa',
  },
  {
    id: 'procuracao',
    label: 'Procuração (se aplicável)',
    categoria: 'empresa',
    descricao: 'Quando o usuário não for o sócio/administrador.',
    temValidade: false,
    obrigatorio: 'empresa',
  },
]

/** Documentos gerados / exigidos na operação */
export const DOCS_OPERACAO: DocumentDef[] = [
  {
    id: 'contrato_prestacao',
    label: 'Contrato de prestação de serviço',
    categoria: 'operacao',
    descricao: 'Gerado pela plataforma ao confirmar o prestador (modelo Doca Livre).',
    temValidade: false,
    obrigatorio: 'demanda',
  },
  {
    id: 'termo_integracao',
    label: 'Termo de integração',
    categoria: 'operacao',
    descricao: 'Ciência das regras de segurança e integração (presencial ou online).',
    temValidade: false,
    obrigatorio: 'demanda',
  },
  {
    id: 'checklist_epis',
    label: 'Checklist de EPIs',
    categoria: 'operacao',
    descricao: 'Registro de entrega/devolução de EPIs no início e fim do contrato.',
    temValidade: false,
    obrigatorio: 'demanda',
  },
  {
    id: 'comprovante_entrega',
    label: 'Comprovantes de entrega / recebimento',
    categoria: 'operacao',
    descricao: 'Canhotos, fotos ou assinaturas de entrega quando a operação exigir.',
    temValidade: false,
    obrigatorio: 'demanda',
  },
  {
    id: 'ocorrencia',
    label: 'Registro de ocorrência',
    categoria: 'operacao',
    descricao: 'Infrações, sinistros ou incidentes durante a operação.',
    temValidade: false,
    obrigatorio: 'demanda',
  },
]

/** Documentos institucionais da plataforma */
export const DOCS_PLATAFORMA: DocumentDef[] = [
  {
    id: 'termos_uso',
    label: 'Termos de uso',
    categoria: 'plataforma',
    descricao: 'Condições gerais de uso da Doca Livre Mão de Obra.',
    temValidade: false,
    obrigatorio: 'todos',
  },
  {
    id: 'politica_privacidade',
    label: 'Política de privacidade (LGPD)',
    categoria: 'plataforma',
    descricao: 'Tratamento de dados pessoais conforme LGPD.',
    temValidade: false,
    obrigatorio: 'todos',
  },
]

export function allDocumentDefs() {
  return [...DOCS_PROFISSIONAL, ...DOCS_EMPRESA, ...DOCS_OPERACAO, ...DOCS_PLATAFORMA]
}

export function docDefById(id: string) {
  return allDocumentDefs().find((d) => d.id === id)
}

/** Docs obrigatórios base para qualquer profissional */
export function requiredDocsForProfissional(profissoes: string[], requisitosDemanda: string[] = []) {
  const reqs = new Set(requisitosDemanda)
  const isMotorista = profissoes.some(
    (p) =>
      p.includes('motorista') ||
      p.includes('carret') ||
      p.includes('bitrem') ||
      p.includes('rodotrem') ||
      p.includes('mopp') ||
      p.includes('munck') ||
      p.includes('vuc'),
  )
  const isEquip = profissoes.some(
    (p) =>
      p.includes('empilhadeira') ||
      p.includes('paleteira') ||
      p.includes('ponte') ||
      p.includes('guindaste') ||
      p.includes('reach') ||
      p.includes('eletricista'),
  )

  return DOCS_PROFISSIONAL.filter((d) => {
    if (d.obrigatorio === 'todos') return true
    if (d.obrigatorio === 'motorista' && isMotorista) return true
    if (d.obrigatorio === 'equipamentos' && isEquip) return true
    if (d.requisitos?.some((r) => reqs.has(r))) return true
    return false
  })
}

export const DIAS_ALERTA_VENCIMENTO = 30
