import { createSeedState } from './seed'
import { cadastroEttInicial } from './dossieTemporario'
import type { AppState } from './types'

export const STORAGE_KEY = 'doca-livre-mao-de-obra-v7'

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
    if (parsed.profissionais?.some((pessoa) => !pessoa.foto)) {
      const fotos = new Map(
        createSeedState().profissionais.filter((pessoa) => pessoa.foto).map((pessoa) => [pessoa.id, pessoa.foto]),
      )
      for (const pessoa of parsed.profissionais) {
        if (!pessoa.foto) pessoa.foto = fotos.get(pessoa.id)
      }
      saveState(parsed)
    }
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
