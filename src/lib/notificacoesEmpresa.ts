import { cargoLabel } from '../data/categories'
import type { Candidatura, Demanda, Profissional } from './types'

export const CHAVE_NOTIFICACOES = 'doca-livre-notificacoes-empresa-v1'

export type AvisoEmpresa = {
  id: string
  tipo: 'candidatura' | 'convite'
  quando: string
  nome: string
  texto: string
  extra: string
  aba: 'vagas' | 'missoes'
  legado: boolean
}

type Registro = { lidas: string[] }

function tipoDoAviso(cand: Candidatura): 'candidatura' | 'convite' {
  if (cand.origem === 'candidatura') return 'candidatura'
  if (cand.origem === 'convite') return 'convite'
  return cand.score > 0 ? 'convite' : 'candidatura'
}

export function montarAvisosEmpresa(input: {
  empresaId: string
  demandas: Demanda[]
  candidaturas: Candidatura[]
  profissionais: Profissional[]
}): AvisoEmpresa[] {
  const demandas = new Map(
    input.demandas.filter((item) => item.empresaId === input.empresaId).map((item) => [item.id, item]),
  )
  const pessoas = new Map(input.profissionais.map((item) => [item.id, item]))
  const avisos: AvisoEmpresa[] = []

  for (const cand of input.candidaturas) {
    if (cand.status !== 'aceita' && cand.status !== 'confirmada') continue
    const demanda = demandas.get(cand.demandaId)
    if (!demanda) continue
    const tipo = tipoDoAviso(cand)
    const cargo = cargoLabel(demanda.cargo)
    const nome = pessoas.get(cand.profissionalId)?.nome ?? 'Colaborador'
    avisos.push({
      id: cand.id,
      tipo,
      quando: cand.respondidoEm || cand.createdAt,
      nome,
      texto:
        tipo === 'candidatura'
          ? `${nome} se candidatou à vaga de ${cargo}.`
          : `${nome} aceitou o convite de ${cargo}.`,
      extra: `${demanda.endereco.cidade}/${demanda.endereco.estado}`,
      aba: tipo === 'candidatura' ? 'vagas' : 'missoes',
      legado: !cand.respondidoEm,
    })
  }

  avisos.sort((a, b) => b.quando.localeCompare(a.quando))
  return avisos
}

function carregar(): Record<string, Registro> {
  try {
    const raw = localStorage.getItem(CHAVE_NOTIFICACOES)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Registro>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function salvar(dados: Record<string, Registro>) {
  localStorage.setItem(CHAVE_NOTIFICACOES, JSON.stringify(dados))
}

export function lidasDaEmpresa(empresaId: string) {
  return carregar()[empresaId]?.lidas ?? []
}

export function sincronizarLidas(empresaId: string, avisos: AvisoEmpresa[]) {
  const todos = carregar()
  const lidas = new Set(todos[empresaId]?.lidas ?? [])
  let mudou = !todos[empresaId]
  for (const aviso of avisos) {
    if (aviso.legado && !lidas.has(aviso.id)) {
      lidas.add(aviso.id)
      mudou = true
    }
  }
  const lista = [...lidas]
  if (mudou) {
    todos[empresaId] = { lidas: lista }
    salvar(todos)
  }
  return lista
}

export function marcarAvisosLidos(empresaId: string, ids: string[]) {
  const todos = carregar()
  const lidas = new Set([...(todos[empresaId]?.lidas ?? []), ...ids])
  const lista = [...lidas]
  todos[empresaId] = { lidas: lista }
  salvar(todos)
  return lista
}

export function horaDoAviso(iso: string) {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ''
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
