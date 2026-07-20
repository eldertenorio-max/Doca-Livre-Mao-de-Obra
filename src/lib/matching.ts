import type { Demanda, Nivel, Profissional } from './types'

const NIVEL_SCORE: Record<Nivel, number> = {
  bronze: 10,
  prata: 20,
  ouro: 35,
  elite: 50,
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function disponibilidadeOk(p: Profissional, demanda: Demanda): boolean {
  const d = new Date(demanda.data + 'T12:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayDiff = Math.round((d.getTime() - today.getTime()) / 86400000)

  if (dayDiff === 0 && p.disponibilidade.hoje) return true
  if (dayDiff === 1 && p.disponibilidade.amanha) return true
  if (dayDiff >= 0 && dayDiff <= 7 && p.disponibilidade.estaSemana) return true
  if ((d.getDay() === 0 || d.getDay() === 6) && p.disponibilidade.finaisDeSemana) return true
  if (p.disponibilidade.temporario || p.disponibilidade.freelancer) return true
  return false
}

function certificadosOk(p: Profissional, requisitos: string[]): boolean {
  return requisitos.every((req) => {
    if (req === 'CNH') return Boolean(p.cnhCategoria)
    return p.certificados.some((c) => c.tipo === req && c.valido)
  })
}

export type MatchResult = {
  profissional: Profissional
  score: number
  distanciaKm: number
}

export function matchDemanda(
  demanda: Demanda,
  profissionais: Profissional[],
  raioMaxKm = 40,
): MatchResult[] {
  const results: MatchResult[] = []

  for (const p of profissionais) {
    if (p.status !== 'aprovado') continue
    if (!p.profissoes.includes(demanda.cargo)) continue
    if (!disponibilidadeOk(p, demanda)) continue
    if (!certificadosOk(p, demanda.requisitos)) continue

    const distanciaKm = haversineKm(p.endereco, demanda.endereco)
    if (distanciaKm > Math.min(raioMaxKm, p.raioKm)) continue

    const distScore = Math.max(0, 40 - distanciaKm)
    const avalScore = p.avaliacaoMedia * 8
    const nivelScore = NIVEL_SCORE[p.nivel]
    const faltaPenalty = p.faltas * 8
    const comparecimento = p.taxaComparecimento * 0.25
    const resposta = Math.max(0, 15 - p.tempoRespostaMin)

    const score = Math.round(
      distScore + avalScore + nivelScore + comparecimento + resposta - faltaPenalty,
    )

    results.push({ profissional: p, score: Math.max(0, Math.min(100, score)), distanciaKm })
  }

  return results.sort((a, b) => b.score - a.score)
}
