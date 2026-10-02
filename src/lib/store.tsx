import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { cargoCategoria } from '../data/categories'
import { buildContratoFromConfirmacao } from './contratoTemplate'
import {
  atualizarAssinatura,
  cadastroEttInicial,
  criarContratoIndividual,
  criarEncerramento,
  criarPecasIniciais,
} from './dossieTemporario'
import { distanciaKm, matchDemanda } from './matching'
import { canAccessSistema, isLocalSuperUser } from './portalPermissoes'
import { nowIso, uid } from './seed'
import { mediaDaAvaliacao, nivelPelaMedia } from './classificacao'
import { validarChavePix } from './pix'
import { loadState, resetState, saveState, STORAGE_KEY } from './storage'
import type {
  AppState,
  Avaliacao,
  Candidatura,
  CheckIn,
  Demanda,
  Disponibilidade,
  DocumentoRegistro,
  DocumentoStatus,
  Empresa,
  Pagamento,
  Profissional,
  User,
  UserRole,
} from './types'

type DocumentoCadastro = {
  tipoId: string
  arquivoNome: string
  observacao: string
  arquivoDados?: string
  versoNome?: string
  versoDados?: string
}

export function avisoAcessoEmpresa(status: Empresa['status']): string | null {
  if (status === 'aprovada') return null
  if (status === 'bloqueada') {
    return 'Esta empresa está bloqueada. O acesso ao painel não está liberado.'
  }
  return 'Sua empresa ainda aguarda aprovação. O login libera quando o administrador validar o cadastro.'
}

export function avisoAcessoProfissional(status: Profissional['status']): string | null {
  if (status === 'aprovado') return null
  if (status === 'bloqueado') {
    return 'Este cadastro está bloqueado. O acesso ao painel não está liberado.'
  }
  return 'Seu cadastro ainda aguarda aprovação. O login libera quando o administrador validar o colaborador.'
}

function documentosDeCadastro(
  existentes: DocumentoRegistro[],
  donoId: string,
  itens: DocumentoCadastro[] | undefined,
  donoTipo: 'profissional' | 'empresa' = 'profissional',
): DocumentoRegistro[] {
  if (!itens?.length) return existentes
  const tipos = new Set(itens.map((item) => item.tipoId))
  const agora = nowIso()
  const novos: DocumentoRegistro[] = itens.map((item) => ({
    id: uid('doc'),
    tipoId: item.tipoId,
    donoTipo,
    donoId,
    status: 'em_analise',
    arquivoNome: item.arquivoNome,
    arquivoDados: item.arquivoDados,
    enviadoEm: agora,
    observacao: item.observacao,
    meta: {
      origem: 'cadastro',
      ...(item.versoNome ? { versoNome: item.versoNome } : {}),
      ...(item.versoDados ? { versoDados: item.versoDados } : {}),
    },
  }))
  return [
    ...novos,
    ...existentes.filter((doc) => !(doc.donoTipo === donoTipo && doc.donoId === donoId && tipos.has(doc.tipoId))),
  ]
}

type StoreApi = {
  state: AppState
  currentUser: User | null
  currentEmpresa: Empresa | null
  currentProfissional: Profissional | null
  login: (email: string, senha: string) => { ok: boolean; error?: string; role?: UserRole }
  loginPortal: (
    usuarioOuEmail: string,
    senha: string,
    portal: 'empresa' | 'profissional' | 'admin',
  ) => {
    ok: boolean
    error?: string
    aviso?: boolean
    role?: UserRole
    usuario?: string
    isSuperuser?: boolean
    precisaConfig?: boolean
    precisaPerfil?: boolean
  }
  logout: () => void
  resolveEmailByIdentificador: (id: string) => string | null
  portalRegisterUser: (data: {
    email: string
    usuario: string
    senha: string
    role: 'empresa' | 'profissional'
  }) => { ok: boolean; error?: string }
  portalResetSenha: (email: string, novaSenha: string) => { ok: boolean; error?: string }
  registerEmpresa: (user: Omit<User, 'id' | 'role' | 'ativo' | 'createdAt'>, empresa: Omit<Empresa, 'id' | 'userId' | 'status' | 'avaliacaoMedia' | 'favoritos' | 'bloqueados' | 'docsOk' | 'saldo' | 'limitePosPago' | 'diasTaxaZero' | 'metaTaxaZero' | 'diasAgenciados' | 'rankingDias' | 'economiaTotal'>, documentos?: DocumentoCadastro[]) => { ok: boolean; error?: string }
  registerProfissional: (user: Omit<User, 'id' | 'role' | 'ativo' | 'createdAt'>, profissional: Omit<Profissional, 'id' | 'userId' | 'status' | 'nivel' | 'avaliacaoMedia' | 'taxaComparecimento' | 'faltas' | 'tempoRespostaMin' | 'ganhosMes' | 'saldo'>, documentos?: DocumentoCadastro[]) => { ok: boolean; error?: string }
  completeEmpresaPerfil: (empresa: Omit<Empresa, 'id' | 'userId' | 'status' | 'avaliacaoMedia' | 'favoritos' | 'bloqueados' | 'docsOk' | 'saldo' | 'limitePosPago' | 'diasTaxaZero' | 'metaTaxaZero' | 'diasAgenciados' | 'rankingDias' | 'economiaTotal'>, documentos?: DocumentoCadastro[]) => { ok: boolean; error?: string }
  completeProfissionalPerfil: (profissional: Omit<Profissional, 'id' | 'userId' | 'status' | 'nivel' | 'avaliacaoMedia' | 'taxaComparecimento' | 'faltas' | 'tempoRespostaMin' | 'ganhosMes' | 'saldo'>, documentos?: DocumentoCadastro[]) => { ok: boolean; error?: string }
  createDemanda: (data: Omit<Demanda, 'id' | 'createdAt' | 'status' | 'categoria'>) => Demanda
  publicarVaga: (data: Omit<Demanda, 'id' | 'createdAt' | 'status' | 'categoria'>) => Demanda
  candidatar: (demandaId: string, profissionalId: string) => { ok: boolean; error?: string }
  convidarParaMissao: (input: {
    demandaId?: string | null
    profissionalId: string
    score: number
    distanciaKm: number
    pedido?: Omit<Demanda, 'id' | 'createdAt' | 'status' | 'categoria'>
  }) => { demandaId: string; candidaturaId: string } | null
  updateCandidaturaStatus: (id: string, status: Candidatura['status']) => void
  acceptOferta: (demandaId: string, profissionalId: string) => void
  refuseOferta: (demandaId: string, profissionalId: string) => void
  confirmCandidato: (candidaturaId: string) => void
  assinarContrato: (contratoId: string) => void
  assinarPeca: (pecaId: string, papel: 'ett' | 'tomadora' | 'trabalhador', nome: string) => void
  marcarEsocial: (pecaId: string) => void
  registrarEncerramento: (input: {
    demandaId: string
    dataEfetiva: string
    motivo: string
    responsavel: string
    observacoes: string
    profissionalId?: string
  }) => void
  atualizarCadastroEtt: (cadastro: AppState['cadastroEtt']) => void
  registrarConsentimento: (
    profissionalId: string,
    campo: 'politica' | 'curriculo' | 'compartilhamento',
  ) => void
  refuseCandidato: (candidaturaId: string) => void
  doCheckIn: (demandaId: string, profissionalId: string) => void
  doCheckOut: (demandaId: string, profissionalId: string) => void
  addAvaliacao: (data: Omit<Avaliacao, 'id' | 'createdAt'>) => void
  updateDisponibilidade: (profissionalId: string, disp: Disponibilidade) => void
  definirVerTodasVagas: (profissionalId: string, verTodas: boolean) => void
  atualizarPerfilProfissional: (
    profissionalId: string,
    dados: Pick<
      Profissional,
      | 'nome'
      | 'cpf'
      | 'rg'
      | 'nascimento'
      | 'telefone'
      | 'foto'
      | 'profissoes'
      | 'experiencia'
      | 'certificados'
      | 'cnhCategoria'
      | 'cnhValidade'
      | 'disponibilidade'
      | 'endereco'
      | 'raioKm'
      | 'pix'
    >,
  ) => { ok: boolean; error?: string }
  atualizarPix: (
    profissionalId: string,
    pix: string,
  ) => { ok: true; chave: string; rotulo: string } | { ok: false; error: string }
  toggleFavorito: (empresaId: string, profissionalId: string) => void
  toggleBloqueado: (empresaId: string, profissionalId: string) => void
  setEmpresaStatus: (id: string, status: Empresa['status']) => void
  patchState: (fn: (s: AppState) => AppState) => void
  setProfissionalStatus: (id: string, status: Profissional['status']) => void
  enviarDocumento: (data: {
    tipoId: string
    donoTipo: 'profissional' | 'empresa' | 'ett'
    donoId: string
    arquivoNome: string
    validade?: string
    meta?: Record<string, string>
  }) => void
  revisarDocumento: (docId: string, status: Extract<DocumentoStatus, 'aprovado' | 'recusado'>, observacao?: string) => void
  finishDemanda: (demandaId: string) => void
  cancelDemanda: (demandaId: string) => void
  resetDemo: () => void
  audit: (action: string, detail: string) => void
}

const StoreContext = createContext<StoreApi | null>(null)

function persist(next: AppState) {
  saveState(next)
  return next
}

function diasDaMissao(demanda: Demanda) {
  if (!demanda.dataFim) return 1
  const a = new Date(`${demanda.data}T12:00:00`)
  const b = new Date(`${demanda.dataFim}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 1
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1
}

function finishDemandaState(s: AppState, demandaId: string): AppState {
  const demanda = s.demandas.find((d) => d.id === demandaId)
  if (!demanda || demanda.status === 'finalizada') return s
  const confirmados = s.candidaturas.filter(
    (c) => c.demandaId === demandaId && c.status === 'confirmada',
  )
  const dias = diasDaMissao(demanda)
  const valor = demanda.valorDiaria * dias
  const pagamentos: Pagamento[] = confirmados.map((c) => ({
    id: uid('pag'),
    demandaId,
    profissionalId: c.profissionalId,
    empresaId: demanda.empresaId,
    valor,
    comissao: Math.round(valor * 0.12),
    status: 'pago' as const,
    createdAt: nowIso(),
  }))
  const profIds = new Set(confirmados.map((c) => c.profissionalId))
  return {
    ...s,
    demandas: s.demandas.map((d) =>
      d.id === demandaId ? { ...d, status: 'finalizada' as const } : d,
    ),
    contratos: s.contratos.map((contrato) =>
      contrato.demandaId === demandaId && contrato.status !== 'rescindido'
        ? { ...contrato, status: 'concluido' as const }
        : contrato,
    ),
    pagamentos: [...pagamentos, ...s.pagamentos],
    profissionais: s.profissionais.map((p) =>
      profIds.has(p.id)
        ? {
            ...p,
            saldo: p.saldo + valor,
            ganhosMes: p.ganhosMes + valor,
          }
        : p,
    ),
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => {
    function aoStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        const remoto = JSON.parse(event.newValue) as AppState
        setState((atual) => ({ ...remoto, sessionUserId: atual.sessionUserId }))
      } catch {
        /* a outra aba gravou um estado ilegível */
      }
    }
    window.addEventListener('storage', aoStorage)
    return () => window.removeEventListener('storage', aoStorage)
  }, [])

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => persist(fn(prev)))
  }, [])

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.sessionUserId) ?? null,
    [state.users, state.sessionUserId],
  )

  const currentEmpresa = useMemo(() => {
    if (!currentUser || currentUser.role !== 'empresa') return null
    return state.empresas.find((e) => e.userId === currentUser.id) ?? null
  }, [currentUser, state.empresas])

  const currentProfissional = useMemo(() => {
    if (!currentUser || currentUser.role !== 'profissional') return null
    return state.profissionais.find((p) => p.userId === currentUser.id) ?? null
  }, [currentUser, state.profissionais])

  const audit = useCallback(
    (action: string, detail: string) => {
      update((s) => ({
        ...s,
        auditLogs: [
          {
            id: uid('log'),
            at: nowIso(),
            actorId: s.sessionUserId ?? 'system',
            action,
            detail,
          },
          ...s.auditLogs,
        ].slice(0, 200),
      }))
    },
    [update],
  )

  const api: StoreApi = {
    state,
    currentUser,
    currentEmpresa,
    currentProfissional,

    login(email, senha) {
      const user = state.users.find(
        (u) =>
          (u.email.toLowerCase() === email.toLowerCase() ||
            (u.usuario || '').toLowerCase() === email.toLowerCase()) &&
          u.senha === senha &&
          u.ativo,
      )
      if (!user) return { ok: false, error: 'E-mail ou senha inválidos.' }
      update((s) => ({ ...s, sessionUserId: user.id }))
      return { ok: true, role: user.role }
    },

    loginPortal(usuarioOuEmail, senha, portal) {
      const key = usuarioOuEmail.trim().toLowerCase()
      let user = state.users.find(
        (u) =>
          u.ativo &&
          u.senha === senha &&
          (u.email.toLowerCase() === key || (u.usuario || '').toLowerCase() === key),
      )
      if (!user) return { ok: false, error: 'Usuário ou senha inválidos.' }

      const contaOperacional = user.role === 'profissional' || user.role === 'empresa'
      const isSuper =
        user.role === 'super' ||
        (!contaOperacional &&
          (isLocalSuperUser(user.usuario || '') || isLocalSuperUser(user.email)))

      if (!isSuper) {
        if (portal === 'empresa' && user.role !== 'empresa') {
          return { ok: false, error: 'Esta conta não é de Empresa. Use o login de Profissional ou Admin.' }
        }
        if (portal === 'profissional' && user.role !== 'profissional') {
          return { ok: false, error: 'Esta conta não é de Profissional. Use o login de Empresa ou Admin.' }
        }
        if (portal === 'admin' && user.role !== 'admin' && user.role !== 'super') {
          return { ok: false, error: 'Sem permissão para o Painel Admin.' }
        }
        const sistema = portal === 'admin' ? 'admin' : portal
        if (!canAccessSistema(user.usuario || user.email, sistema, user.email, user.role)) {
          return { ok: false, error: 'Acesso bloqueado pelas permissões do portal.' }
        }
      }

      // Só a conta super ou admin entra no perfil de demonstração. Um trabalhador
      // chamado Diego Isidoro permanece na própria conta.
      if ((user.role === 'super' || user.role === 'admin') && portal !== 'admin') {
        if (portal === 'profissional') {
          const demo =
            state.users.find((u) => u.email === 'carlos@email.com' && u.role === 'profissional') ||
            state.users.find((u) => u.role === 'profissional' && u.ativo)
          if (demo) user = demo
        } else if (portal === 'empresa') {
          const demo =
            state.users.find((u) => u.email === 'empresa@logexpress.com' && u.role === 'empresa') ||
            state.users.find((u) => u.role === 'empresa' && u.ativo)
          if (demo) user = demo
        }
      }

      const hasPerfil =
        user.role === 'profissional'
          ? state.profissionais.some((p) => p.userId === user!.id)
          : user.role === 'empresa'
            ? state.empresas.some((e) => e.userId === user!.id)
            : true

      if (portal === 'empresa' && user.role === 'empresa' && !isSuper && hasPerfil) {
        const empresa = state.empresas.find((item) => item.userId === user.id)
        const aviso = empresa ? avisoAcessoEmpresa(empresa.status) : null
        if (aviso) return { ok: false, error: aviso, aviso: true }
      }

      if (portal === 'profissional' && user.role === 'profissional' && !isSuper && hasPerfil) {
        const profissional = state.profissionais.find((item) => item.userId === user.id)
        const aviso = profissional ? avisoAcessoProfissional(profissional.status) : null
        if (aviso) return { ok: false, error: aviso, aviso: true }
      }

      update((s) => ({ ...s, sessionUserId: user!.id }))
      return {
        ok: true,
        role: user.role,
        usuario: user.usuario || user.email,
        isSuperuser: isSuper,
        precisaConfig: isSuper && portal === 'admin',
        precisaPerfil:
          (user.role === 'empresa' || user.role === 'profissional') &&
          (user.perfilCompleto === false || !hasPerfil),
      }
    },

    resolveEmailByIdentificador(id) {
      const key = id.trim().toLowerCase()
      const user = state.users.find(
        (u) => u.email.toLowerCase() === key || (u.usuario || '').toLowerCase() === key,
      )
      return user?.email ?? null
    },

    portalRegisterUser({ email, usuario, senha, role }) {
      const em = email.trim().toLowerCase()
      const us = usuario.trim()
      if (state.users.some((u) => u.email.toLowerCase() === em)) {
        return { ok: false, error: 'Este e-mail já está sendo utilizado.' }
      }
      if (state.users.some((u) => (u.usuario || '').toLowerCase() === us.toLowerCase())) {
        return { ok: false, error: 'Nome de usuário já existe.' }
      }
      const userId = uid('user')
      const user: User = {
        id: userId,
        email: em,
        senha,
        usuario: us,
        role,
        nivelHierarquia: 'operador',
        perfilCompleto: false,
        ativo: true,
        createdAt: nowIso(),
      }
      update((s) => ({
        ...s,
        users: [...s.users, user],
        sessionUserId: userId,
        auditLogs: [
          {
            id: uid('log'),
            at: nowIso(),
            actorId: userId,
            action: 'portal_cadastro',
            detail: `${us} (${role})`,
          },
          ...s.auditLogs,
        ],
      }))
      return { ok: true }
    },

    portalResetSenha(email, novaSenha) {
      const em = email.trim().toLowerCase()
      const user = state.users.find((u) => u.email.toLowerCase() === em)
      if (!user) return { ok: false, error: 'Usuário não encontrado.' }
      update((s) => ({
        ...s,
        users: s.users.map((u) => (u.email.toLowerCase() === em ? { ...u, senha: novaSenha } : u)),
      }))
      return { ok: true }
    },

    logout() {
      update((s) => ({ ...s, sessionUserId: null }))
    },

    registerEmpresa(userData, empresaData, documentos) {
      if (state.users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase())) {
        return { ok: false, error: 'Este e-mail já está sendo utilizado.' }
      }
      const userId = uid('user')
      const empresaId = uid('emp')
      const user: User = {
        id: userId,
        email: userData.email,
        senha: userData.senha,
        role: 'empresa',
        ativo: true,
        createdAt: nowIso(),
      }
      const empresa: Empresa = {
        ...empresaData,
        id: empresaId,
        userId,
        status: 'pendente',
        avaliacaoMedia: 5,
        favoritos: [],
        bloqueados: [],
        docsOk: true,
        saldo: 0,
        limitePosPago: 3000,
        diasTaxaZero: 0,
        metaTaxaZero: 300,
        diasAgenciados: 0,
        rankingDias: 999,
        economiaTotal: 0,
      }
      update((s) => ({
        ...s,
        users: [...s.users, user],
        empresas: [...s.empresas, empresa],
        documentos: documentosDeCadastro(s.documentos, empresaId, documentos, 'empresa'),
        sessionUserId: userId,
        auditLogs: [
          { id: uid('log'), at: nowIso(), actorId: userId, action: 'cadastro_empresa', detail: empresa.nomeFantasia },
          ...s.auditLogs,
        ],
      }))
      return { ok: true }
    },

    registerProfissional(userData, profissionalData, documentos) {
      if (state.users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase())) {
        return { ok: false, error: 'Este e-mail já está sendo utilizado.' }
      }
      const userId = uid('user')
      const profId = uid('prof')
      const user: User = {
        id: userId,
        email: userData.email,
        senha: userData.senha,
        role: 'profissional',
        ativo: true,
        createdAt: nowIso(),
      }
      const profissional: Profissional = {
        ...profissionalData,
        id: profId,
        userId,
        status: 'pendente',
        nivel: 'bronze',
        avaliacaoMedia: 5,
        taxaComparecimento: 100,
        faltas: 0,
        tempoRespostaMin: 10,
        ganhosMes: 0,
        saldo: 0,
      }
      update((s) => ({
        ...s,
        users: [...s.users, user],
        profissionais: [...s.profissionais, profissional],
        documentos: documentosDeCadastro(s.documentos, profId, documentos),
        sessionUserId: userId,
        auditLogs: [
          { id: uid('log'), at: nowIso(), actorId: userId, action: 'cadastro_profissional', detail: profissional.nome },
          ...s.auditLogs,
        ],
      }))
      return { ok: true }
    },

    completeEmpresaPerfil(empresaData, documentos) {
      const user = state.users.find((u) => u.id === state.sessionUserId)
      if (!user || user.role !== 'empresa') {
        return { ok: false, error: 'Sessão de empresa inválida.' }
      }
      if (state.empresas.some((e) => e.userId === user.id)) {
        update((s) => {
          const existente = s.empresas.find((e) => e.userId === user.id)
          return {
            ...s,
            users: s.users.map((u) => (u.id === user.id ? { ...u, perfilCompleto: true } : u)),
            documentos: existente
              ? documentosDeCadastro(s.documentos, existente.id, documentos, 'empresa')
              : s.documentos,
          }
        })
        return { ok: true }
      }
      const empresa: Empresa = {
        ...empresaData,
        id: uid('emp'),
        userId: user.id,
        status: 'pendente',
        avaliacaoMedia: 5,
        favoritos: [],
        bloqueados: [],
        docsOk: true,
        saldo: 0,
        limitePosPago: 3000,
        diasTaxaZero: 0,
        metaTaxaZero: 300,
        diasAgenciados: 0,
        rankingDias: 999,
        economiaTotal: 0,
      }
      update((s) => ({
        ...s,
        empresas: [...s.empresas, empresa],
        documentos: documentosDeCadastro(s.documentos, empresa.id, documentos, 'empresa'),
        users: s.users.map((u) => (u.id === user.id ? { ...u, perfilCompleto: true } : u)),
        auditLogs: [
          {
            id: uid('log'),
            at: nowIso(),
            actorId: user.id,
            action: 'completar_perfil_empresa',
            detail: empresa.nomeFantasia,
          },
          ...s.auditLogs,
        ],
      }))
      return { ok: true }
    },

    completeProfissionalPerfil(profissionalData, documentos) {
      const user = state.users.find((u) => u.id === state.sessionUserId)
      if (!user || user.role !== 'profissional') {
        return { ok: false, error: 'Sessão de profissional inválida.' }
      }
      if (state.profissionais.some((p) => p.userId === user.id)) {
        update((s) => {
          const existente = s.profissionais.find((p) => p.userId === user.id)
          return {
            ...s,
            users: s.users.map((u) => (u.id === user.id ? { ...u, perfilCompleto: true } : u)),
            documentos: existente ? documentosDeCadastro(s.documentos, existente.id, documentos) : s.documentos,
          }
        })
        return { ok: true }
      }
      const profissional: Profissional = {
        ...profissionalData,
        id: uid('prof'),
        userId: user.id,
        status: 'pendente',
        nivel: 'bronze',
        avaliacaoMedia: 5,
        taxaComparecimento: 100,
        faltas: 0,
        tempoRespostaMin: 10,
        ganhosMes: 0,
        saldo: 0,
      }
      update((s) => ({
        ...s,
        profissionais: [...s.profissionais, profissional],
        documentos: documentosDeCadastro(s.documentos, profissional.id, documentos),
        users: s.users.map((u) => (u.id === user.id ? { ...u, perfilCompleto: true } : u)),
        auditLogs: [
          {
            id: uid('log'),
            at: nowIso(),
            actorId: user.id,
            action: 'completar_perfil_profissional',
            detail: profissional.nome,
          },
          ...s.auditLogs,
        ],
      }))
      return { ok: true }
    },

    createDemanda(data) {
      const demanda: Demanda = {
        ...data,
        id: uid('dem'),
        categoria: cargoCategoria(data.cargo),
        status: 'aberta',
        createdAt: nowIso(),
      }

      update((s) => {
        const matches = matchDemanda(demanda, s.profissionais, 40, s.documentos)
        const novas: Candidatura[] = matches.slice(0, 15).map((m) => ({
          id: uid('cand'),
          demandaId: demanda.id,
          profissionalId: m.profissional.id,
          status: 'pendente',
          score: m.score,
          distanciaKm: Math.round(m.distanciaKm * 10) / 10,
          createdAt: nowIso(),
          origem: 'convite',
        }))
        return {
          ...s,
          demandas: [demanda, ...s.demandas],
          candidaturas: [...novas, ...s.candidaturas],
          auditLogs: [
            {
              id: uid('log'),
              at: nowIso(),
              actorId: s.sessionUserId ?? 'system',
              action: 'criar_demanda',
              detail: `${demanda.cargo} x${demanda.quantidade} — ${novas.length} matches`,
            },
            ...s.auditLogs,
          ],
        }
      })

      return demanda
    },

    publicarVaga(data) {
      const demanda: Demanda = {
        ...data,
        id: uid('dem'),
        categoria: cargoCategoria(data.cargo),
        status: 'aberta',
        createdAt: nowIso(),
      }
      update((s) => ({
        ...s,
        demandas: [demanda, ...s.demandas],
        auditLogs: [
          {
            id: uid('log'),
            at: nowIso(),
            actorId: s.sessionUserId ?? 'system',
            action: 'publicar_vaga',
            detail: `${demanda.cargo} · ${demanda.endereco.cidade}`,
          },
          ...s.auditLogs,
        ],
      }))
      return demanda
    },

    candidatar(demandaId, profissionalId) {
      const atual = state
      const demanda = atual.demandas.find((item) => item.id === demandaId)
      const profissional = atual.profissionais.find((item) => item.id === profissionalId)
      if (!demanda || !profissional) return { ok: false, error: 'Vaga não encontrada.' }
      if (demanda.status !== 'aberta') return { ok: false, error: 'Esta vaga não está aberta.' }
      const empresa = atual.empresas.find((item) => item.id === demanda.empresaId)
      if (empresa?.bloqueados.includes(profissionalId)) {
        return { ok: false, error: 'Esta empresa não está recebendo a sua candidatura.' }
      }
      const distancia = Math.round(distanciaKm(profissional.endereco, demanda.endereco) * 10) / 10
      update((s) => {
        const existente = s.candidaturas.find(
          (item) => item.demandaId === demandaId && item.profissionalId === profissionalId,
        )
        if (existente?.status === 'aceita' || existente?.status === 'confirmada') return s
        const agora = nowIso()
        const candidaturas = existente
          ? s.candidaturas.map((item) =>
              item.id === existente.id
                ? {
                    ...item,
                    status: 'aceita' as const,
                    origem: item.origem ?? 'convite',
                    respondidoEm: agora,
                  }
                : item,
            )
          : [
              {
                id: uid('cand'),
                demandaId,
                profissionalId,
                status: 'aceita' as const,
                score: 0,
                distanciaKm: Number.isFinite(distancia) ? distancia : 0,
                createdAt: agora,
                origem: 'candidatura' as const,
                respondidoEm: agora,
              },
              ...s.candidaturas,
            ]
        return {
          ...s,
          candidaturas,
          auditLogs: [
            {
              id: uid('log'),
              at: nowIso(),
              actorId: s.sessionUserId ?? 'system',
              action: 'candidatar_vaga',
              detail: `${profissional.nome} — ${demanda.cargo}`,
            },
            ...s.auditLogs,
          ],
        }
      })
      return { ok: true }
    },

    convidarParaMissao(input) {
      let demandaId = input.demandaId ?? ''
      let candidaturaId = ''
      update((s) => {
        let demandas = s.demandas
        if (!demandaId) {
          if (!input.pedido) return s
          const criada: Demanda = {
            ...input.pedido,
            id: uid('dem'),
            categoria: cargoCategoria(input.pedido.cargo),
            status: 'aberta',
            createdAt: nowIso(),
          }
          demandaId = criada.id
          demandas = [criada, ...s.demandas]
        }
        const existente = s.candidaturas.find(
          (c) => c.demandaId === demandaId && c.profissionalId === input.profissionalId,
        )
        if (existente) {
          candidaturaId = existente.id
          return { ...s, demandas }
        }
        const cand: Candidatura = {
          id: uid('cand'),
          demandaId,
          profissionalId: input.profissionalId,
          status: 'pendente',
          score: input.score,
          distanciaKm: Math.round(input.distanciaKm * 10) / 10,
          createdAt: nowIso(),
          origem: 'convite',
        }
        candidaturaId = cand.id
        const profissional = s.profissionais.find((p) => p.id === input.profissionalId)
        const demanda = demandas.find((d) => d.id === demandaId)
        const empresa = demanda ? s.empresas.find((e) => e.id === demanda.empresaId) : undefined
        const pecasAtuais = s.pecas ?? []
        const novasPecas =
          demanda && empresa
            ? criarPecasIniciais({
                pecas: pecasAtuais,
                demanda,
                empresa,
                ett: s.cadastroEtt ?? cadastroEttInicial(),
                signatarioTomadora: empresa.responsavelNome,
              })
            : []
        return {
          ...s,
          demandas,
          pecas: [...novasPecas, ...pecasAtuais],
          candidaturas: [cand, ...s.candidaturas],
          auditLogs: [
            {
              id: uid('log'),
              at: nowIso(),
              actorId: s.sessionUserId ?? 'system',
              action: 'convidar_missao',
              detail: `${profissional?.nome ?? input.profissionalId} — ${demandaId}`,
            },
            ...s.auditLogs,
          ],
        }
      })
      if (!demandaId || !candidaturaId) return null
      return { demandaId, candidaturaId }
    },

    updateCandidaturaStatus(id, status) {
      update((s) => ({
        ...s,
        candidaturas: s.candidaturas.map((c) => (c.id === id ? { ...c, status } : c)),
      }))
    },

    acceptOferta(demandaId, profissionalId) {
      update((s) => ({
        ...s,
        candidaturas: s.candidaturas.map((c) =>
          c.demandaId === demandaId &&
          c.profissionalId === profissionalId &&
          c.status !== 'aceita' &&
          c.status !== 'confirmada'
            ? { ...c, status: 'aceita' as const, origem: c.origem ?? 'convite', respondidoEm: nowIso() }
            : c,
        ),
      }))
    },

    refuseOferta(demandaId, profissionalId) {
      update((s) => ({
        ...s,
        candidaturas: s.candidaturas.map((c) =>
          c.demandaId === demandaId && c.profissionalId === profissionalId
            ? { ...c, status: 'recusada' as const }
            : c,
        ),
      }))
    },

    confirmCandidato(candidaturaId) {
      update((s) => {
        const cand = s.candidaturas.find((c) => c.id === candidaturaId)
        if (!cand || cand.status !== 'aceita') return s
        const demanda = s.demandas.find((d) => d.id === cand.demandaId)
        const profissional = s.profissionais.find((p) => p.id === cand.profissionalId)
        const empresa = demanda
          ? s.empresas.find((e) => e.id === demanda.empresaId)
          : undefined
        if (!demanda || !profissional || !empresa) return s

        const confirmados = s.candidaturas.filter(
          (c) => c.demandaId === cand.demandaId && c.status === 'confirmada',
        ).length
        const nextCands = s.candidaturas.map((c) =>
          c.id === candidaturaId ? { ...c, status: 'confirmada' as const } : c,
        )
        let demandas = s.demandas
        if (confirmados + 1 >= demanda.quantidade) {
          demandas = s.demandas.map((d) =>
            d.id === demanda.id ? { ...d, status: 'em_andamento' as const } : d,
          )
        }
        const checkIns: CheckIn[] = [
          {
            id: uid('chk'),
            demandaId: cand.demandaId,
            profissionalId: cand.profissionalId,
            gpsOk: false,
          },
          ...s.checkIns,
        ]

        const jaTemContrato = s.contratos.some((c) => c.candidaturaId === candidaturaId)
        const contratos = jaTemContrato
          ? s.contratos
          : [
              buildContratoFromConfirmacao({
                demanda,
                empresa,
                profissional,
                candidaturaId,
              }),
              ...s.contratos,
            ]

        const individual = criarContratoIndividual({
          pecas: s.pecas ?? [],
          demanda,
          empresa,
          profissional,
          ett: s.cadastroEtt ?? cadastroEttInicial(),
          candidaturaId,
        })

        return {
          ...s,
          candidaturas: nextCands,
          demandas,
          checkIns,
          contratos,
          pecas: individual ? [individual, ...(s.pecas ?? [])] : s.pecas ?? [],
          auditLogs: [
            {
              id: uid('log'),
              at: nowIso(),
              actorId: s.sessionUserId ?? 'system',
              action: 'gerar_contrato',
              detail: `Contrato gerado para ${profissional.nome} — demanda ${demanda.id}`,
            },
            ...s.auditLogs,
          ],
        }
      })
    },

    assinarContrato(contratoId) {
      update((s) => ({
        ...s,
        contratos: s.contratos.map((c) =>
          c.id === contratoId
            ? {
                ...c,
                status: 'assinado_profissional' as const,
                assinaturaProfissionalEm: nowIso(),
              }
            : c,
        ),
      }))
    },

    assinarPeca(pecaId, papel, nome) {
      update((s) => ({
        ...s,
        pecas: (s.pecas ?? []).map((p) => (p.id === pecaId ? atualizarAssinatura(p, papel, nome) : p)),
      }))
    },

    marcarEsocial(pecaId) {
      update((s) => ({
        ...s,
        pecas: (s.pecas ?? []).map((p) =>
          p.id === pecaId ? { ...p, meta: { ...p.meta, esocial: 'informado' } } : p,
        ),
      }))
    },

    registrarEncerramento(input) {
      update((s) => {
        const demanda = s.demandas.find((d) => d.id === input.demandaId)
        if (!demanda) return s
        const ja = (s.pecas ?? []).some((p) => p.demandaId === demanda.id && p.tipo === 'encerramento')
        const peca = ja
          ? null
          : criarEncerramento({
              pecas: s.pecas ?? [],
              demanda,
              dataEfetiva: input.dataEfetiva,
              motivo: input.motivo,
              responsavel: input.responsavel,
              observacoes: input.observacoes,
              profissionalId: input.profissionalId,
            })
        const encerrada = finishDemandaState(s, demanda.id)
        return {
          ...encerrada,
          pecas: peca ? [peca, ...(encerrada.pecas ?? [])] : encerrada.pecas ?? [],
        }
      })
    },

    atualizarCadastroEtt(cadastro) {
      update((s) => ({ ...s, cadastroEtt: cadastro }))
    },

    registrarConsentimento(profissionalId, campo) {
      const chave =
        campo === 'politica' ? 'politicaEm' : campo === 'curriculo' ? 'curriculoEm' : 'compartilhamentoEm'
      update((s) => ({
        ...s,
        profissionais: s.profissionais.map((p) =>
          p.id === profissionalId
            ? {
                ...p,
                consentimentoPrivacidade: {
                  ...p.consentimentoPrivacidade,
                  [chave]: nowIso(),
                },
              }
            : p,
        ),
      }))
    },

    enviarDocumento({ tipoId, donoTipo, donoId, arquivoNome, validade, meta }) {
      update((s) => {
        const existentes = s.documentos.filter(
          (d) => !(d.tipoId === tipoId && d.donoTipo === donoTipo && d.donoId === donoId),
        )
        const novo: DocumentoRegistro = {
          id: uid('doc'),
          tipoId,
          donoTipo,
          donoId,
          status: 'em_analise',
          arquivoNome,
          validade,
          meta,
          enviadoEm: nowIso(),
        }
        return {
          ...s,
          documentos: [novo, ...existentes],
          auditLogs: [
            {
              id: uid('log'),
              at: nowIso(),
              actorId: s.sessionUserId ?? 'system',
              action: 'enviar_documento',
              detail: `${tipoId} — ${donoTipo}:${donoId}`,
            },
            ...s.auditLogs,
          ],
        }
      })
    },

    revisarDocumento(docId, status, observacao) {
      update((s) => ({
        ...s,
        documentos: s.documentos.map((d) =>
          d.id === docId
            ? {
                ...d,
                status,
                observacao,
                revisadoEm: nowIso(),
                revisadoPor: s.sessionUserId ?? 'admin',
              }
            : d,
        ),
        auditLogs: [
          {
            id: uid('log'),
            at: nowIso(),
            actorId: s.sessionUserId ?? 'system',
            action: 'revisar_documento',
            detail: `${docId} → ${status}`,
          },
          ...s.auditLogs,
        ],
      }))
    },

    refuseCandidato(candidaturaId) {
      update((s) => ({
        ...s,
        candidaturas: s.candidaturas.map((c) =>
          c.id === candidaturaId ? { ...c, status: 'recusada' as const } : c,
        ),
      }))
    },

    doCheckIn(demandaId, profissionalId) {
      update((s) => ({
        ...s,
        checkIns: s.checkIns.map((c) =>
          c.demandaId === demandaId && c.profissionalId === profissionalId
            ? { ...c, checkInAt: nowIso(), gpsOk: true }
            : c,
        ),
      }))
    },

    doCheckOut(demandaId, profissionalId) {
      update((s) => {
        const check = s.checkIns.find(
          (c) => c.demandaId === demandaId && c.profissionalId === profissionalId,
        )
        let horas = 8
        if (check?.checkInAt) {
          horas = Math.max(
            1,
            Math.round((Date.now() - new Date(check.checkInAt).getTime()) / 3600000),
          )
        }
        return {
          ...s,
          checkIns: s.checkIns.map((c) =>
            c.demandaId === demandaId && c.profissionalId === profissionalId
              ? { ...c, checkOutAt: nowIso(), horasTrabalhadas: horas }
              : c,
          ),
        }
      })
    },

    addAvaliacao(data) {
      update((s) => {
        const repetida = s.avaliacoes.some(
          (item) =>
            item.demandaId === data.demandaId &&
            item.deUserId === data.deUserId &&
            item.paraUserId === data.paraUserId &&
            item.deRole === data.deRole,
        )
        if (repetida) return s
        const avaliacao: Avaliacao = { ...data, id: uid('av'), createdAt: nowIso() }
        const avaliacoes = [avaliacao, ...s.avaliacoes]
        const profissionais =
          data.deRole === 'empresa'
            ? s.profissionais.map((pessoa) => {
                if (pessoa.userId !== data.paraUserId) return pessoa
                const notas = avaliacoes.filter(
                  (item) => item.paraUserId === pessoa.userId && item.deRole === 'empresa',
                )
                const soma = notas.reduce((total, item) => total + mediaDaAvaliacao(item.notas), 0)
                const media = Math.round((soma / notas.length) * 10) / 10
                return { ...pessoa, avaliacaoMedia: media, nivel: nivelPelaMedia(media, notas.length) }
              })
            : s.profissionais
        return { ...s, avaliacoes, profissionais }
      })
    },

    updateDisponibilidade(profissionalId, disp) {
      update((s) => ({
        ...s,
        profissionais: s.profissionais.map((p) =>
          p.id === profissionalId ? { ...p, disponibilidade: disp } : p,
        ),
      }))
    },

    definirVerTodasVagas(profissionalId, verTodas) {
      update((s) => ({
        ...s,
        profissionais: s.profissionais.map((p) =>
          p.id === profissionalId ? { ...p, verTodasVagas: verTodas } : p,
        ),
      }))
    },

    atualizarPerfilProfissional(profissionalId, dados) {
      const nome = dados.nome.trim()
      if (nome.length < 3) return { ok: false, error: 'Informe o nome.' }
      if (!dados.endereco.cidade.trim() || !dados.endereco.estado.trim()) {
        return { ok: false, error: 'Informe a cidade e o estado.' }
      }
      if (!Number.isFinite(dados.raioKm) || dados.raioKm < 1) {
        return { ok: false, error: 'Informe o raio máximo, em km.' }
      }
      const pix = validarChavePix(dados.pix)
      if (!pix.ok) return { ok: false, error: pix.erro }
      if (!state.profissionais.some((p) => p.id === profissionalId)) {
        return { ok: false, error: 'Perfil não encontrado.' }
      }
      update((s) => ({
        ...s,
        profissionais: s.profissionais.map((p) =>
          p.id === profissionalId
            ? {
                ...p,
                nome,
                cpf: dados.cpf.trim(),
                rg: dados.rg.trim(),
                nascimento: dados.nascimento,
                telefone: dados.telefone.trim(),
                foto: dados.foto || p.foto,
                profissoes: dados.profissoes,
                experiencia: dados.experiencia,
                certificados: dados.certificados,
                cnhCategoria: dados.cnhCategoria?.trim() || undefined,
                cnhValidade: dados.cnhValidade || undefined,
                disponibilidade: dados.disponibilidade,
                endereco: {
                  ...dados.endereco,
                  cep: dados.endereco.cep.trim(),
                  rua: dados.endereco.rua.trim(),
                  numero: dados.endereco.numero.trim(),
                  cidade: dados.endereco.cidade.trim(),
                  estado: dados.endereco.estado.trim().toUpperCase(),
                },
                raioKm: Math.min(500, Math.round(dados.raioKm)),
                pix: pix.chave,
              }
            : p,
        ),
      }))
      return { ok: true }
    },

    atualizarPix(profissionalId, pixInformado) {
      const pix = validarChavePix(pixInformado)
      if (!pix.ok) return { ok: false, error: pix.erro }
      if (!state.profissionais.some((p) => p.id === profissionalId)) {
        return { ok: false, error: 'Perfil não encontrado.' }
      }
      update((s) => ({
        ...s,
        profissionais: s.profissionais.map((p) => (p.id === profissionalId ? { ...p, pix: pix.chave } : p)),
      }))
      return { ok: true, chave: pix.chave, rotulo: pix.rotulo }
    },

    toggleFavorito(empresaId, profissionalId) {
      update((s) => ({
        ...s,
        empresas: s.empresas.map((e) => {
          if (e.id !== empresaId) return e
          const has = e.favoritos.includes(profissionalId)
          return {
            ...e,
            favoritos: has
              ? e.favoritos.filter((id) => id !== profissionalId)
              : [...e.favoritos, profissionalId],
          }
        }),
      }))
    },

    toggleBloqueado(empresaId, profissionalId) {
      update((s) => ({
        ...s,
        empresas: s.empresas.map((e) => {
          if (e.id !== empresaId) return e
          const has = e.bloqueados.includes(profissionalId)
          return {
            ...e,
            bloqueados: has
              ? e.bloqueados.filter((id) => id !== profissionalId)
              : [...e.bloqueados, profissionalId],
          }
        }),
      }))
    },

    patchState(fn) {
      update(fn)
    },

    setEmpresaStatus(id, status) {
      update((s) => ({
        ...s,
        empresas: s.empresas.map((e) => (e.id === id ? { ...e, status } : e)),
      }))
    },

    setProfissionalStatus(id, status) {
      update((s) => ({
        ...s,
        profissionais: s.profissionais.map((p) => (p.id === id ? { ...p, status } : p)),
      }))
    },

    finishDemanda(demandaId) {
      update((s) => finishDemandaState(s, demandaId))
    },

    cancelDemanda(demandaId) {
      update((s) => ({
        ...s,
        demandas: s.demandas.map((d) =>
          d.id === demandaId ? { ...d, status: 'cancelada' as const } : d,
        ),
        candidaturas: s.candidaturas.map((c) =>
          c.demandaId === demandaId && (c.status === 'pendente' || c.status === 'aceita')
            ? { ...c, status: 'cancelada' as const }
            : c,
        ),
      }))
    },

    resetDemo() {
      setState(persist(resetState()))
    },

    audit,
  }

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
