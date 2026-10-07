import { useState } from 'react'
import { ROTULO_PESO, numero } from './montarArvore'
import type { NoArvore } from './tipos'

export function ItemArvore({
  no,
  selecionado,
  onSelecionar,
  nivel = 0,
}: {
  no: NoArvore
  selecionado: string
  onSelecionar: (id: string) => void
  nivel?: number
}) {
  const [aberto, setAberto] = useState(nivel < 1)
  const pasta = no.tipo === 'pasta'

  return (
    <li>
      <button
        type="button"
        className={`mt-item ${selecionado === no.id ? 'mt-item--on' : ''}`}
        aria-expanded={pasta ? aberto : undefined}
        onClick={() => {
          onSelecionar(no.id)
          if (pasta) setAberto((valor) => !valor)
        }}
      >
        <span className="mt-item-icone" aria-hidden>
          {pasta ? (aberto ? '📂' : '📁') : '📄'}
        </span>
        <span className="mt-item-nome">{no.nome}</span>
        <span className="mt-item-tokens">{numero(no.tokens)}</span>
        <span className={`mt-peso mt-peso--${no.peso}`}>{ROTULO_PESO[no.peso]}</span>
      </button>
      {pasta && aberto && (
        <ul className="mt-filhos">
          {no.filhos.map((filho) => (
            <ItemArvore key={filho.id} no={filho} selecionado={selecionado} onSelecionar={onSelecionar} nivel={nivel + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}
