import { createSeedState } from './seed'
import type { AppState } from './types'

const STORAGE_KEY = 'doca-livre-mao-de-obra-v5'

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
