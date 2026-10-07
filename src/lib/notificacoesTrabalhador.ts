import { cargoLabel } from '../data/categories'
import { distanciaKm } from './matching'
import { rotuloPeriodo } from './periodoMissao'
import type { Candidatura, Demanda, Empresa, PecaDocumental, Profissional } from './types'

export const CHAVE_NOTIFICACOES_TRABALHADOR = 'doca-livre-notificacoes-trabalhador-v1'

export type AvisoTrabalhador = {
  id: string
  tipo: 'vaga' | 'convite' | 'termo'
  quando: string
  texto: string
  extra: string
  aba: 'vagas' | 'agenda'
  pecaId?: string
}

type Registro = { lidas: string[] }

function semAcento(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function vagaNoPerfil(prof: Profissional, demanda: Demanda, empresa: Empresa | undefined) {
  if (demanda.status !== 'aberta') return false
  if (empresa?.bloqueados.includes(prof.id)) return false
  const verTodas = prof.verTodasVagas !== false
  if (!verTodas && !prof.profissoes.includes(demanda.cargo)) return false
  const dist = distanciaKm(prof.endereco, demanda.endereco)
  const mesmaCidade = semAcento(demanda.endereco.cidade) === semAcento(prof.endereco.cidade)
  const noRaio = Number.isFinite(dist) && dist <= prof.raioKm
  const semCoordenada = !Number.isFinite(dist)
  return mesmaCidade || noRaio || semCoordenada
}

export function montarAvisosTrabalhador(input: {
  prof: Profissional
  demandas: Demanda[]
  candidaturas: Candidatura[]
  empresas: Empresa[]
  pecas?: PecaDocumental[]
}): AvisoTrabalhador[] {
  const empresas = new Map(input.empresas.map((item) => [item.id, item]))
  const minhas = input.candidaturas.filter((item) => item.profissionalId === input.prof.id)
  const porDemanda = new Map(minhas.map((item) => [item.demandaId, item]))
  const avisos: AvisoTrabalhador[] = []

  for (const peca of input.pecas ?? []) {
    if (peca.profissionalId !== input.prof.id) continue
    const minha = peca.assinaturas.find((a) => a.papel === 'trabalhador')
    if (!minha || minha.status !== 'pendente') continue
    const demanda = input.demandas.find((item) => item.id === peca.demandaId)
    if (!demanda || demanda.status === 'cancelada') continue
    const empresa = empresas.get(peca.empresaId)
    const nome = empresa?.nomeFantasia ?? 'A empresa'
    avisos.push({
      id: `termo:${peca.id}`,
      tipo: 'termo',
      quando: peca.criadoEm,
      texto: `Documento para assinar: ${peca.titulo}. Missão de ${cargoLabel(demanda.cargo)} em ${nome}.`,
      extra: `${demanda.endereco.cidade}/${demanda.endereco.estado} · ${rotuloPeriodo(demanda.data, demanda.dataFim)}`,
      aba: 'agenda',
      pecaId: peca.id,
    })
  }

  for (const cand of minhas) {
    if (cand.status !== 'pendente') continue
    const demanda = input.demandas.find((item) => item.id === cand.demandaId)
    if (!demanda || demanda.status === 'cancelada' || demanda.status === 'finalizada') continue
    const empresa = empresas.get(demanda.empresaId)
    if (empresa?.bloqueados.includes(input.prof.id)) continue
    const nome = empresa?.nomeFantasia ?? 'Uma empresa'
    avisos.push({
      id: `convite:${cand.id}`,
      tipo: 'convite',
      quando: cand.createdAt,
      texto: `${nome} convidou você para a vaga de ${cargoLabel(demanda.cargo)}.`,
      extra: `${demanda.endereco.cidade}/${demanda.endereco.estado} · ${rotuloPeriodo(demanda.data, demanda.dataFim)}`,
      aba: 'vagas',
    })
  }

  for (const demanda of input.demandas) {
    if (porDemanda.has(demanda.id)) continue
    const empresa = empresas.get(demanda.empresaId)
    if (!vagaNoPerfil(input.prof, demanda, empresa)) continue
    const nome = empresa?.nomeFantasia ?? 'Uma empresa'
    avisos.push({
      id: `vaga:${demanda.id}`,
      tipo: 'vaga',
      quando: demanda.createdAt,
      texto: `${nome} publicou a vaga de ${cargoLabel(demanda.cargo)}.`,
      extra: `${demanda.endereco.cidade}/${demanda.endereco.estado} · ${rotuloPeriodo(demanda.data, demanda.dataFim)}`,
      aba: 'vagas',
    })
  }

  const peso = { termo: 0, convite: 1, vaga: 2 }
  avisos.sort((a, b) => b.quando.localeCompare(a.quando) || peso[a.tipo] - peso[b.tipo])
  return avisos
}

function carregar(): Record<string, Registro> {
  try {
    const raw = localStorage.getItem(CHAVE_NOTIFICACOES_TRABALHADOR)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Registro>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function salvar(dados: Record<string, Registro>) {
  localStorage.setItem(CHAVE_NOTIFICACOES_TRABALHADOR, JSON.stringify(dados))
}

export function lidasDoTrabalhador(profissionalId: string) {
  return carregar()[profissionalId]?.lidas ?? []
}

export function marcarAvisosTrabalhador(profissionalId: string, ids: string[]) {
  const todos = carregar()
  const lidas = new Set([...(todos[profissionalId]?.lidas ?? []), ...ids])
  const lista = [...lidas]
  todos[profissionalId] = { lidas: lista }
  salvar(todos)
  return lista
}
