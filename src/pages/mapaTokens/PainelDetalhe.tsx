import { LIMITE_MEDIO, ROTULO_PESO, arquivosDe, numero } from './montarArvore'
import type { NoArvore } from './tipos'

const CUSTO: Record<NoArvore['peso'], string> = {
  leve: 'Baixo (ideal)',
  medio: 'Médio (aceitável)',
  pesado: 'Alto (dividir)',
}

export function PainelDetalhe({
  no,
  total,
  onSelecionar,
}: {
  no: NoArvore
  total: number
  onSelecionar: (id: string) => void
}) {
  const pasta = no.tipo === 'pasta'
  const parcela = total > 0 ? Math.max(0.1, Math.round((no.tokens / total) * 1000) / 10) : 0
  const maiores = pasta
    ? arquivosDe(no)
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 5)
    : []

  return (
    <main className="mt-detalhe">
      <section className="mt-card">
        <header className="mt-card-topo">
          <h2>
            <span aria-hidden>{pasta ? '📁' : '📄'}</span> {no.nome}
          </h2>
          <span className={`mt-custo mt-peso--${no.peso}`}>Custo de contexto: {CUSTO[no.peso]}</span>
        </header>
        <p className="mt-caminho">{no.id || 'raiz do projeto'}</p>
        <dl className="mt-numeros">
          <div>
            <dt>Tokens estimados</dt>
            <dd>{numero(no.tokens)}</dd>
          </div>
          <div>
            <dt>Linhas</dt>
            <dd>{numero(no.linhas)}</dd>
          </div>
          <div>
            <dt>Tamanho</dt>
            <dd>{numero(Math.round(no.bytes / 1024))} KB</dd>
          </div>
          <div>
            <dt>{pasta ? 'Arquivos' : 'Parte do sistema'}</dt>
            <dd>{pasta ? numero(no.arquivos) : `${parcela}%`}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-grade">
        <section className="mt-card mt-card--suave">
          <h3 className="mt-titulo-azul">Impacto no chat</h3>
          <p>
            {pasta
              ? `Ler a pasta inteira custa cerca de ${numero(no.tokens)} tokens. Envie à IA só o arquivo da tarefa.`
              : no.peso === 'pesado'
                ? `Cada leitura deste arquivo custa cerca de ${numero(no.tokens)} tokens. Dividir em componentes menores reduz o custo de cada alteração.`
                : `Arquivo ${ROTULO_PESO[no.peso].toLowerCase()}: a IA lê inteiro gastando cerca de ${numero(no.tokens)} tokens.`}
          </p>
        </section>
        <section className="mt-card mt-card--suave">
          <h3 className="mt-titulo-verde">Como pedir</h3>
          <pre className="mt-prompt">
            {pasta
              ? `Liste os arquivos de "${no.id}" e diga qual deles preciso alterar antes de ler o código.`
              : `Leia só "${no.id}" e corrija o comportamento sem reescrever o resto do sistema.`}
          </pre>
        </section>
      </div>

      {pasta && maiores.length > 0 && (
        <section className="mt-card">
          <h3>Arquivos mais pesados desta pasta</h3>
          <ul className="mt-ranking">
            {maiores.map((arquivo) => (
              <li key={arquivo.id}>
                <button type="button" onClick={() => onSelecionar(arquivo.id)}>
                  <span className="mt-ranking-nome">{arquivo.id}</span>
                  <span className="mt-barra" aria-hidden>
                    <span
                      className={`mt-barra-cheia mt-peso--${arquivo.peso}`}
                      style={{ width: `${Math.min(100, (arquivo.tokens / Math.max(LIMITE_MEDIO, maiores[0].tokens)) * 100)}%` }}
                    />
                  </span>
                  <span className="mt-ranking-tokens">{numero(arquivo.tokens)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
