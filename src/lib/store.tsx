import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { cargoCategoria } from '../data/categories'
import { buildContratoFromConfirmacao } from './contratoTemplate'
import { matchDemanda } from './matching'
import { canAccessSistema, isLocalSuperUser } from './portalPermissoes'
import { nowIso, uid } from './seed'
import { loadState, resetState, saveState } from './storage'
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
  registerEmpresa: (user: Omit<User, 'id' | 'role' | 'ativo' | 'createdAt'>, empresa: Omit<Empresa, 'id' | 'userId' | 'status' | 'avaliacaoMedia' | 'favoritos' | 'bloqueados' | 'docsOk' | 'saldo' | 'limitePosPago' | 'diasTaxaZero' | 'metaTaxaZero' | 'diasAgenciados' | 'rankingDias' | 'economiaTotal'>) => { ok: boolean; error?: string }
  registerProfissional: (user: Omit<User, 'id' | 'role' | 'ativo' | 'createdAt'>, profissional: Omit<Profissional, 'id' | 'userId' | 'status' | 'nivel' | 'avaliacaoMedia' | 'taxaComparecimento' | 'faltas' | 'tempoRespostaMin' | 'ganhosMes' | 'saldo'>) => { ok: boolean; error?: string }
  completeEmpresaPerfil: (empresa: Omit<Empresa, 'id' | 'userId' | 'status' | 'avaliacaoMedia' | 'favoritos' | 'bloqueados' | 'docsOk' | 'saldo' | 'limitePosPago' | 'diasTaxaZero' | 'metaTaxaZero' | 'diasAgenciados' | 'rankingDias' | 'economiaTotal'>) => { ok: boolean; error?: string }
  completeProfissionalPerfil: (profissional: Omit<Profissional, 'id' | 'userId' | 'status' | 'nivel' | 'avaliacaoMedia' | 'taxaComparecimento' | 'faltas' | 'tempoRespostaMin' | 'ganhosMes' | 'saldo'>) => { ok: boolean; error?: string }
  createDemanda: (data: Omit<Demanda, 'id' | 'createdAt' | 'status' | 'categoria'>) => Demanda
  updateCandidaturaStatus: (id: string, status: Candidatura['status']) => void
  acceptOferta: (demandaId: string, profissionalId: string) => void
  refuseOferta: (demandaId: string, profissionalId: string) => void
  confirmCandidato: (candidaturaId: string) => void
  assinarContrato: (contratoId: string) => void
  refuseCandidato: (candidaturaId: string) => void
  doCheckIn: (demandaId: string, profissionalId: string) => void
  doCheckOut: (demandaId: string, profissionalId: string) => void
  addAvaliacao: (data: Omit<Avaliacao, 'id' | 'createdAt'>) => void
  updateDisponibilidade: (profissionalId: string, disp: Disponibilidade) => void
  toggleFavorito: (empresaId: string, profissionalId: string) => void
  toggleBloqueado: (empresaId: string, profissionalId: string) => void
  setEmpresaStatus: (id: string, status: Empresa['status']) => void
  patchState: (fn: (s: AppState) => AppState) => void
  setProfissionalStatus: (id: string, status: Profissional['status']) => void
  enviarDocumento: (data: {
    tipoId: string
    donoTipo: 'profissional' | 'empresa'
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

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
      const user = state.users.find(
        (u) =>
          u.ativo &&
          u.senha === senha &&
          (u.email.toLowerCase() === key || (u.usuario || '').toLowerCase() === key),
      )
      if (!user) return { ok: false, error: 'Usuário ou senha inválidos.' }

      const isSuper =
        user.role === 'super' ||
        isLocalSuperUser(user.usuario || '') ||
        isLocalSuperUser(user.email)

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

      update((s) => ({ ...s, sessionUserId: user.id }))
      return {
        ok: true,
        role: user.role,
        usuario: user.usuario || user.email,
        isSuperuser: isSuper,
        precisaConfig: isSuper && portal === 'admin',
        precisaPerfil: user.perfilCompleto === false,
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
        return { ok: false, error: 'E-mail já cadastrado.' }
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

    registerEmpresa(userData, empresaData) {
      if (state.users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase())) {
        return { ok: false, error: 'E-mail já cadastrado.' }
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
        sessionUserId: userId,
        auditLogs: [
          { id: uid('log'), at: nowIso(), actorId: userId, action: 'cadastro_empresa', detail: empresa.nomeFantasia },
          ...s.auditLogs,
        ],
      }))
      return { ok: true }
    },

    registerProfissional(userData, profissionalData) {
      if (state.users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase())) {
        return { ok: false, error: 'E-mail já cadastrado.' }
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
        sessionUserId: userId,
        auditLogs: [
          { id: uid('log'), at: nowIso(), actorId: userId, action: 'cadastro_profissional', detail: profissional.nome },
          ...s.auditLogs,
        ],
      }))
      return { ok: true }
    },

    completeEmpresaPerfil(empresaData) {
      const user = state.users.find((u) => u.id === state.sessionUserId)
      if (!user || user.role !== 'empresa') {
        return { ok: false, error: 'Sessão de empresa inválida.' }
      }
      if (state.empresas.some((e) => e.userId === user.id)) {
        update((s) => ({
          ...s,
          users: s.users.map((u) => (u.id === user.id ? { ...u, perfilCompleto: true } : u)),
        }))
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

    completeProfissionalPerfil(profissionalData) {
      const user = state.users.find((u) => u.id === state.sessionUserId)
      if (!user || user.role !== 'profissional') {
        return { ok: false, error: 'Sessão de profissional inválida.' }
      }
      if (state.profissionais.some((p) => p.userId === user.id)) {
        update((s) => ({
          ...s,
          users: s.users.map((u) => (u.id === user.id ? { ...u, perfilCompleto: true } : u)),
        }))
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
        const matches = matchDemanda(demanda, s.profissionais)
        const novas: Candidatura[] = matches.slice(0, 15).map((m) => ({
          id: uid('cand'),
          demandaId: demanda.id,
          profissionalId: m.profissional.id,
          status: 'pendente',
          score: m.score,
          distanciaKm: Math.round(m.distanciaKm * 10) / 10,
          createdAt: nowIso(),
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
          c.demandaId === demandaId && c.profissionalId === profissionalId
            ? { ...c, status: 'aceita' as const }
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
        if (!cand) return s
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

        return {
          ...s,
          candidaturas: nextCands,
          demandas,
          checkIns,
          contratos,
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
      update((s) => ({
        ...s,
        avaliacoes: [
          { ...data, id: uid('av'), createdAt: nowIso() },
          ...s.avaliacoes,
        ],
      }))
    },

    updateDisponibilidade(profissionalId, disp) {
      update((s) => ({
        ...s,
        profissionais: s.profissionais.map((p) =>
          p.id === profissionalId ? { ...p, disponibilidade: disp } : p,
        ),
      }))
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
      update((s) => {
        const demanda = s.demandas.find((d) => d.id === demandaId)
        if (!demanda) return s
        const confirmados = s.candidaturas.filter(
          (c) => c.demandaId === demandaId && c.status === 'confirmada',
        )
        const pagamentos: Pagamento[] = confirmados.map((c) => ({
          id: uid('pag'),
          demandaId,
          profissionalId: c.profissionalId,
          empresaId: demanda.empresaId,
          valor: demanda.valorDiaria,
          comissao: Math.round(demanda.valorDiaria * 0.12),
          status: 'pago' as const,
          createdAt: nowIso(),
        }))
        const profIds = new Set(confirmados.map((c) => c.profissionalId))
        return {
          ...s,
          demandas: s.demandas.map((d) =>
            d.id === demandaId ? { ...d, status: 'finalizada' as const } : d,
          ),
          pagamentos: [...pagamentos, ...s.pagamentos],
          profissionais: s.profissionais.map((p) =>
            profIds.has(p.id)
              ? {
                  ...p,
                  saldo: p.saldo + demanda.valorDiaria,
                  ganhosMes: p.ganhosMes + demanda.valorDiaria,
                }
              : p,
          ),
        }
      })
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
