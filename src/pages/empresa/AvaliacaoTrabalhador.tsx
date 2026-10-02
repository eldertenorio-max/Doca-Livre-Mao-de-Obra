import { useState } from 'react'
import type { Avaliacao } from '../../lib/types'
import { useStore } from '../../lib/store'

const CRITERIOS = [
  ['pontualidade', 'Pontualidade'],
  ['qualidade', 'Qualidade'],
  ['educacao', 'Educação'],
  ['produtividade', 'Produtividade'],
] as const

type Notas = Avaliacao['notas']

const VAZIAS: Notas = { pontualidade: 0, qualidade: 0, educacao: 0, produtividade: 0 }

export function AvaliacaoTrabalhador({
  demandaId,
  profissionalUserId,
  nome,
}: {
  demandaId: string
  profissionalUserId: string
  nome: string
}) {
  const { state, currentUser, addAvaliacao } = useStore()
  const salva = state.avaliacoes.find(
    (item) => item.demandaId === demandaId && item.paraUserId === profissionalUserId && item.deRole === 'empresa',
  )
  const [notas, setNotas] = useState<Notas>(VAZIAS)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')

  if (salva) {
    return (
      <div className="cf-avaliar cf-avaliar--feita">
        <h3>Avaliação enviada</h3>
        <p>
          {nome} recebeu {formatarNota(media(salva.notas))} na sua avaliação.
        </p>
        {salva.observacoes && <p>{salva.observacoes}</p>}
      </div>
    )
  }

  if (!currentUser) return null

  function escolher(criterio: keyof Notas, valor: number) {
    setNotas((atual) => ({ ...atual, [criterio]: valor }))
    setErro('')
  }

  function enviar() {
    if (CRITERIOS.some(([criterio]) => notas[criterio] < 1)) {
      setErro('Marque de 1 a 5 em cada critério.')
      return
    }
    addAvaliacao({
      demandaId,
      deUserId: currentUser!.id,
      paraUserId: profissionalUserId,
      deRole: 'empresa',
      notas,
      observacoes: texto.trim(),
    })
  }

  return (
    <div className="cf-avaliar">
      <h3>Avalie {nome}</h3>
      <p>O contrato foi encerrado. A nota entra no perfil do trabalhador.</p>
      {CRITERIOS.map(([criterio, rotulo]) => (
        <div key={criterio} className="cf-avaliar-linha">
          <span>{rotulo}</span>
          <span className="cf-estrelas">
            {[1, 2, 3, 4, 5].map((valor) => (
              <button
                key={valor}
                type="button"
                className={notas[criterio] >= valor ? 'on' : ''}
                aria-label={`${rotulo}: ${valor}`}
                aria-pressed={notas[criterio] === valor}
                onClick={() => escolher(criterio, valor)}
              >
                ★
              </button>
            ))}
          </span>
        </div>
      ))}
      <textarea
        value={texto}
        maxLength={400}
        placeholder="Comentário opcional sobre o trabalho"
        onChange={(event) => setTexto(event.target.value)}
      />
      {erro && <p className="error">{erro}</p>}
      <button type="button" className="cf-btn cf-btn--yellow" onClick={enviar}>
        Enviar avaliação
      </button>
    </div>
  )
}

function media(notas: Notas) {
  return (notas.pontualidade + notas.qualidade + notas.educacao + notas.produtividade) / 4
}

function formatarNota(valor: number) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
