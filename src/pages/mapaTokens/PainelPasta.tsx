import { ROTULO_PESO, numero, pesoDe } from './montarArvore'
import type { LigacaoGrafo, PastaGrafo } from './tipos'

export function PainelPasta({
  pasta,
  ligacoes,
  onSelecionar,
}: {
  pasta: PastaGrafo | null
  ligacoes: LigacaoGrafo[]
  onSelecionar: (id: string) => void
}) {
  if (!pasta) {
    return (
      <aside className="mt-lateral">
        <h2>Como ler o desenho</h2>
        <p>Cada caixa é uma pasta. A seta sai de quem usa e chega em quem é usado. Linha mais grossa = mais imports.</p>
        <ul className="mt-legenda">
          <li><span className="mt-peso mt-peso--leve">Econômico</span> maior arquivo até 2 mil tokens</li>
          <li><span className="mt-peso mt-peso--medio">Médio</span> maior arquivo até 8 mil tokens</li>
          <li><span className="mt-peso mt-peso--pesado">Pesado</span> algum arquivo acima de 8 mil tokens</li>
        </ul>
        <p>Clique numa caixa para ver os arquivos e as ligações da pasta.</p>
      </aside>
    )
  }

  const usa = ligacoes.filter((l) => l.de === pasta.id).sort((a, b) => b.quantidade - a.quantidade)
  const usadaPor = ligacoes.filter((l) => l.para === pasta.id).sort((a, b) => b.quantidade - a.quantidade)

  return (
    <aside className="mt-lateral">
      <h2>📁 {pasta.id}</h2>
      <p>
        {pasta.arquivos.length} arquivos · {numero(pasta.tokens)} tokens ·{' '}
        <span className={`mt-peso mt-peso--${pasta.peso}`}>{ROTULO_PESO[pasta.peso]}</span>
      </p>

      <h3 className="mt-titulo-azul">Usa ({usa.length})</h3>
      {usa.length === 0 ? (
        <p>Não depende de outra pasta.</p>
      ) : (
        <ul className="mt-ligacoes">
          {usa.map((l) => (
            <li key={l.para}>
              <button type="button" onClick={() => onSelecionar(l.para)}>
                → {l.para} <small>{l.quantidade}</small>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-titulo-verde">É usada por ({usadaPor.length})</h3>
      {usadaPor.length === 0 ? (
        <p>Nenhuma pasta importa daqui.</p>
      ) : (
        <ul className="mt-ligacoes">
          {usadaPor.map((l) => (
            <li key={l.de}>
              <button type="button" onClick={() => onSelecionar(l.de)}>
                ← {l.de} <small>{l.quantidade}</small>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3>Arquivos</h3>
      <ul className="mt-arquivos">
        {pasta.arquivos.map((a) => {
          const peso = pesoDe(a.tokens)
          return (
            <li key={a.caminho}>
              <span>{a.caminho.slice(a.caminho.lastIndexOf('/') + 1)}</span>
              <span className={`mt-peso mt-peso--${peso}`}>{numero(a.tokens)}</span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
