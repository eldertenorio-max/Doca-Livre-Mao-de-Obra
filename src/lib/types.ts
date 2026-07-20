export type UserRole = 'empresa' | 'profissional' | 'admin' | 'super'

export type NivelHierarquia = 'super' | 'gestor' | 'operador'

export type Nivel = 'bronze' | 'prata' | 'ouro' | 'elite'

export type DemandaStatus =
  | 'aberta'
  | 'em_andamento'
  | 'finalizada'
  | 'cancelada'

export type CandidaturaStatus =
  | 'pendente'
  | 'aceita'
  | 'recusada'
  | 'confirmada'
  | 'cancelada'

export type EmpresaTipo =
  | 'transportadora'
  | 'operador_logistico'
  | 'industria'
  | 'centro_distribuicao'
  | 'atacadista'
  | 'varejo'
  | 'outro'

export type Plano = 'gratuito' | 'premium' | 'enterprise'

export type Disponibilidade = {
  hoje: boolean
  amanha: boolean
  estaSemana: boolean
  finaisDeSemana: boolean
  noturno: boolean
  viagens: boolean
  temporario: boolean
  efetivo: boolean
  freelancer: boolean
}

export type Endereco = {
  cep: string
  rua: string
  numero: string
  cidade: string
  estado: string
  lat: number
  lng: number
}

export type User = {
  id: string
  email: string
  senha: string
  role: UserRole
  /** Login estilo portal (ex.: Diego, Elder, logexpress). */
  usuario?: string
  nivelHierarquia?: NivelHierarquia
  superiorUsuario?: string | null
  perfilCompleto?: boolean
  ativo: boolean
  createdAt: string
}

export type Empresa = {
  id: string
  userId: string
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  tipo: EmpresaTipo
  plano: Plano
  responsavelNome: string
  responsavelCpf: string
  responsavelCargo: string
  telefone: string
  endereco: Endereco
  status: 'pendente' | 'aprovada' | 'bloqueada'
  avaliacaoMedia: number
  favoritos: string[]
  bloqueados: string[]
  docsOk: boolean
  saldo: number
  limitePosPago: number
  diasTaxaZero: number
  metaTaxaZero: number
  diasAgenciados: number
  rankingDias: number
  economiaTotal: number
}

export type Infracao = {
  id: string
  empresaId: string
  titulo: string
  status: 'aberta' | 'em_analise' | 'encerrada'
  data: string
  palavraChave: string
}

export type Sinistro = {
  id: string
  empresaId: string
  titulo: string
  status: 'aberto' | 'em_analise' | 'encerrado'
  data: string
  palavraChave: string
}

export type OperacaoModelo = {
  id: string
  empresaId: string
  tipoContrato: string
  perfilIdeal: string
  titulo: string
  tipoOperacao: string
  categoria: 'motorista' | 'ajudante'
}

export type PerfilIdeal = {
  id: string
  empresaId: string
  nome: string
  operacao: string
  categoria: 'motorista' | 'ajudante'
  selecaoAutomatica: boolean
}

export type EnderecoEmpresa = {
  id: string
  empresaId: string
  nome: string
  rua: string
  cidade: string
  uf: string
}

export type Veiculo = {
  id: string
  empresaId: string
  marca: string
  modelo: string
  ano: string
  placa: string
}

export type RelatorioGerado = {
  id: string
  empresaId: string
  tipo: string
  periodo: string
  createdAt: string
}

export type Experiencia = {
  cargo: string
  empresa: string
  inicio: string
  fim: string
  descricao: string
}

export type Certificado = {
  tipo: string
  validade: string
  valido: boolean
}

export type Profissional = {
  id: string
  userId: string
  nome: string
  cpf: string
  rg: string
  nascimento: string
  telefone: string
  foto?: string
  profissoes: string[]
  experiencia: Experiencia[]
  certificados: Certificado[]
  cnhCategoria?: string
  cnhValidade?: string
  disponibilidade: Disponibilidade
  nivel: Nivel
  avaliacaoMedia: number
  taxaComparecimento: number
  faltas: number
  tempoRespostaMin: number
  endereco: Endereco
  raioKm: number
  pix: string
  banco?: string
  status: 'pendente' | 'aprovado' | 'bloqueado'
  ganhosMes: number
  saldo: number
}

export type Demanda = {
  id: string
  empresaId: string
  cargo: string
  categoria: string
  quantidade: number
  data: string
  horaInicio: string
  horaFim: string
  endereco: Endereco
  valorDiaria: number
  descricao: string
  epis: string
  observacoes: string
  requisitos: string[]
  status: DemandaStatus
  createdAt: string
}

export type Candidatura = {
  id: string
  demandaId: string
  profissionalId: string
  status: CandidaturaStatus
  score: number
  distanciaKm: number
  createdAt: string
}

export type CheckIn = {
  id: string
  demandaId: string
  profissionalId: string
  checkInAt?: string
  checkOutAt?: string
  gpsOk: boolean
  horasTrabalhadas?: number
}

export type Avaliacao = {
  id: string
  demandaId: string
  deUserId: string
  paraUserId: string
  deRole: UserRole
  notas: {
    pontualidade: number
    qualidade: number
    educacao: number
    produtividade: number
  }
  observacoes: string
  createdAt: string
}

export type Pagamento = {
  id: string
  demandaId: string
  profissionalId: string
  empresaId: string
  valor: number
  comissao: number
  status: 'pendente' | 'pago' | 'estornado'
  createdAt: string
}

export type AuditLog = {
  id: string
  at: string
  actorId: string
  action: string
  detail: string
}

export type ContratoStatus = 'gerado' | 'assinado_profissional' | 'concluido' | 'rescindido'

export type ContratoServico = {
  id: string
  numero: string
  demandaId: string
  candidaturaId: string
  empresaId: string
  profissionalId: string
  status: ContratoStatus
  createdAt: string
  ofertaEm: string
  cienciaEm: string
  selecaoEm: string
  assinaturaProfissionalEm?: string
  valor: number
  inicioEm: string
  fimEm: string
  oQueEmpresaOferece: string[]
  episEmpresa: string[]
  episPrestador: string[]
  tiposServico: string[]
  instrucoesExtras: string
  proibicoes: string[]
}

export type DocumentoStatus = 'pendente' | 'em_analise' | 'aprovado' | 'recusado' | 'vencido'

export type DocumentoRegistro = {
  id: string
  tipoId: string
  /** profissional | empresa | plataforma */
  donoTipo: 'profissional' | 'empresa'
  donoId: string
  status: DocumentoStatus
  arquivoNome?: string
  validade?: string
  enviadoEm: string
  revisadoEm?: string
  revisadoPor?: string
  observacao?: string
  /** metadados extras (ex.: categoria CNH) */
  meta?: Record<string, string>
}

export type AppState = {
  users: User[]
  empresas: Empresa[]
  profissionais: Profissional[]
  demandas: Demanda[]
  candidaturas: Candidatura[]
  checkIns: CheckIn[]
  avaliacoes: Avaliacao[]
  pagamentos: Pagamento[]
  auditLogs: AuditLog[]
  infracoes: Infracao[]
  sinistros: Sinistro[]
  operacoes: OperacaoModelo[]
  perfisIdeais: PerfilIdeal[]
  enderecosEmpresa: EnderecoEmpresa[]
  veiculos: Veiculo[]
  relatorios: RelatorioGerado[]
  contratos: ContratoServico[]
  documentos: DocumentoRegistro[]
  sessionUserId: string | null
}
