import type { Avaliacao, Nivel } from './types'

export function mediaDaAvaliacao(notas: Avaliacao['notas']) {
  const valores = [notas.pontualidade, notas.qualidade, notas.educacao, notas.produtividade]
  const validos = valores.filter((valor) => Number.isFinite(valor))
  if (!validos.length) return 0
  return validos.reduce((total, valor) => total + valor, 0) / validos.length
}

/** Sem nota da empresa fica Bronze. A média é de 1 a 5, com uma casa. */
export function nivelPelaMedia(media: number, quantidade: number): Nivel {
  if (quantidade < 1 || !Number.isFinite(media)) return 'bronze'
  const nota = Math.round(media * 10) / 10
  if (nota >= 4.9) return 'elite'
  if (nota >= 4.6) return 'ouro'
  if (nota >= 4.3) return 'prata'
  return 'bronze'
}

export function resumoAvaliacaoEmpresa(avaliacoes: Avaliacao[], userId: string) {
  const notas = avaliacoes.filter((item) => item.paraUserId === userId && item.deRole === 'empresa')
  if (!notas.length) return { media: 0, nivel: 'bronze' as Nivel, quantidade: 0 }
  const soma = notas.reduce((total, item) => total + mediaDaAvaliacao(item.notas), 0)
  const media = Math.round((soma / notas.length) * 10) / 10
  return { media, nivel: nivelPelaMedia(media, notas.length), quantidade: notas.length }
}
