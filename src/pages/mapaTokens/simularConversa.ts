export const PESO_TOKEN = {
  entrada: 1,
  saida: 5,
  cacheLeitura: 0.1,
  cacheEscrita: 1.25,
} as const

export type TipoToken = keyof typeof PESO_TOKEN

export type Simulacao = {
  usados: Record<TipoToken, number>
  totalUsado: number
  custoEquivalente: number
}

export function simularConversa(params: {
  contextoFixo: number
  arquivo: number
  mensagens: number
  pergunta: number
  resposta: number
}): Simulacao {
  const usados: Record<TipoToken, number> = { entrada: 0, saida: 0, cacheLeitura: 0, cacheEscrita: 0 }
  let jaNoCache = 0
  for (let i = 0; i < params.mensagens; i++) {
    const novo = i === 0 ? params.contextoFixo + params.arquivo + params.pergunta : params.pergunta
    usados.cacheLeitura += jaNoCache
    usados.cacheEscrita += novo
    usados.entrada += Math.round(params.pergunta * 0.1)
    usados.saida += params.resposta
    jaNoCache += novo + params.resposta
  }
  const totalUsado = usados.entrada + usados.saida + usados.cacheLeitura + usados.cacheEscrita
  const custoEquivalente = Math.round(
    (Object.keys(usados) as TipoToken[]).reduce((soma, tipo) => soma + usados[tipo] * PESO_TOKEN[tipo], 0),
  )
  return { usados, totalUsado, custoEquivalente }
}
