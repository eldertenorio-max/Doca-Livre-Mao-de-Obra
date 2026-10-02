import { resumoAvaliacaoEmpresa } from './classificacao'
import { createSeedState } from './seed'
import { cadastroEttInicial } from './dossieTemporario'
import type { AppState } from './types'

export const STORAGE_KEY = 'doca-livre-mao-de-obra-v7'

type EstadoComCorrecao = AppState & { correcaoCandidatoDiego?: boolean }

function nomeChave(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Convite gravado no Carlos da demonstração, em vaga publicada pela empresa, passa para o Diego Isidoro. */
function corrigirConviteDiego(state: EstadoComCorrecao) {
  if (state.correcaoCandidatoDiego) return false
  const diego = state.profissionais.find((pessoa) => nomeChave(pessoa.nome) === 'diego isidoro')
  const carlos = state.profissionais.find((pessoa) => pessoa.id === 'prof_2')
  if (!diego || !carlos || diego.id === carlos.id) return false
  if (!Array.isArray(state.candidaturas) || !Array.isArray(state.demandas)) return false

  const vagasDaDemonstracao = new Set(['dem_1', 'dem_2', 'dem_3'])
  for (const candidatura of state.candidaturas) {
    if (candidatura.profissionalId !== carlos.id) continue
    if (vagasDaDemonstracao.has(candidatura.demandaId)) continue
    const diegoJaEsta = state.candidaturas.some(
      (outra) =>
        outra.id !== candidatura.id &&
        outra.demandaId === candidatura.demandaId &&
        outra.profissionalId === diego.id,
    )
    if (diegoJaEsta) continue
    candidatura.profissionalId = diego.id
    for (const check of state.checkIns ?? []) {
      if (check.demandaId === candidatura.demandaId && check.profissionalId === carlos.id) {
        check.profissionalId = diego.id
      }
    }
    for (const pagamento of state.pagamentos ?? []) {
      if (pagamento.demandaId === candidatura.demandaId && pagamento.profissionalId === carlos.id) {
        pagamento.profissionalId = diego.id
      }
    }
    for (const contrato of state.contratos ?? []) {
      if (contrato.candidaturaId === candidatura.id && contrato.profissionalId === carlos.id) {
        contrato.profissionalId = diego.id
      }
    }
    for (const peca of state.pecas ?? []) {
      if (peca.candidaturaId === candidatura.id && peca.profissionalId === carlos.id) {
        peca.profissionalId = diego.id
      }
    }
  }
  state.correcaoCandidatoDiego = true
  return true
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seed = createSeedState()
      saveState(seed)
      return seed
    }
    const parsed = JSON.parse(raw) as AppState
    if (!Array.isArray(parsed.contratos)) parsed.contratos = []
    if (!Array.isArray(parsed.documentos)) parsed.documentos = []
    if (!Array.isArray(parsed.pecas)) parsed.pecas = []
    if (!parsed.cadastroEtt) parsed.cadastroEtt = cadastroEttInicial()
    if (Array.isArray(parsed.profissionais)) {
      const avaliacoes = Array.isArray(parsed.avaliacoes) ? parsed.avaliacoes : []
      let classificacaoMudou = false
      for (const pessoa of parsed.profissionais) {
        const resumo = resumoAvaliacaoEmpresa(avaliacoes, pessoa.userId)
        const nivel = resumo.quantidade > 0 ? resumo.nivel : 'bronze'
        if (pessoa.nivel !== nivel) {
          pessoa.nivel = nivel
          classificacaoMudou = true
        }
        if (resumo.quantidade > 0 && pessoa.avaliacaoMedia !== resumo.media) {
          pessoa.avaliacaoMedia = resumo.media
          classificacaoMudou = true
        }
      }
      if (classificacaoMudou) saveState(parsed)
    }
    if (parsed.profissionais?.some((pessoa) => !pessoa.foto)) {
      const fotos = new Map(
        createSeedState().profissionais.filter((pessoa) => pessoa.foto).map((pessoa) => [pessoa.id, pessoa.foto]),
      )
      for (const pessoa of parsed.profissionais) {
        if (!pessoa.foto) pessoa.foto = fotos.get(pessoa.id)
      }
      saveState(parsed)
    }
    if (corrigirConviteDiego(parsed)) saveState(parsed)
    return parsed
  } catch {
    const seed = createSeedState()
    saveState(seed)
    return seed
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetState(): AppState {
  const seed = createSeedState()
  saveState(seed)
  return seed
}
