import { useState } from 'react'
import { numero } from './montarArvore'
import { PESO_TOKEN, simularConversa, type TipoToken } from './simularConversa'
import type { ArquivoMedido } from './tipos'

const TIPOS: { id: TipoToken; nome: string; texto: string; classe: string }[] = [
  {
    id: 'entrada',
    nome: 'Entrada',
    texto: 'O que a IA lê pela primeira vez: sua mensagem, regras e arquivos abertos.',
    classe: 'azul',
  },
  {
    id: 'saida',
    nome: 'Saída',
    texto: 'O que a IA escreve: respostas e código. É o token mais caro.',
    classe: 'vermelho',
  },
  {
    id: 'cacheLeitura',
    nome: 'Cache (leitura)',
    texto: 'O que já foi lido antes na mesma conversa e é reaproveitado. É o mais barato.',
    classe: 'verde',
  },
  {
    id: 'cacheEscrita',
    nome: 'Cache (escrita)',
    texto: 'A primeira vez que um conteúdo entra no cache. Custa um pouco mais que a entrada.',
    classe: 'amarelo',
  },
]

const CONTEXTO_FIXO = 15000

function Campo({
  rotulo,
  valor,
  min,
  max,
  passo,
  onMudar,
}: {
  rotulo: string
  valor: number
  min: number
  max: number
  passo: number
  onMudar: (valor: number) => void
}) {
  return (
    <label className="mt-campo">
      <span>
        {rotulo} <b>{numero(valor)}</b>
      </span>
      <input type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => onMudar(Number(e.target.value))} />
    </label>
  )
}

export function ExplicaTokens({ arquivos }: { arquivos: ArquivoMedido[] }) {
  const lista = arquivos
    .filter((a) => /\.(tsx?|mjs|css)$/.test(a.caminho))
    .sort((a, b) => b.tokens - a.tokens)
  const [caminho, setCaminho] = useState(lista[0]?.caminho ?? '')
  const [mensagens, setMensagens] = useState(10)
  const [resposta, setResposta] = useState(800)
  const [partes, setPartes] = useState(1)
  const arquivo = lista.find((a) => a.caminho === caminho)
  const tokensArquivo = Math.round((arquivo?.tokens ?? 0) / partes)

  const sim = simularConversa({ contextoFixo: CONTEXTO_FIXO, arquivo: tokensArquivo, mensagens, pergunta: 150, resposta })
  const semCache = Math.round(sim.totalUsado - sim.usados.saida + sim.usados.saida * PESO_TOKEN.saida)
  const economiaCache = semCache > 0 ? Math.round((1 - sim.custoEquivalente / semCache) * 100) : 0
  const maiorBarra = Math.max(sim.totalUsado, semCache)

  return (
    <main className="mt-explica">
      <section className="mt-card mt-destaque">
        <div>
          <h2>Usado é volume. Gasto é dinheiro.</h2>
          <p>
            <b>Tokens existentes</b> (o que o mapa mostra) são o tamanho dos arquivos: só custam quando a IA abre o arquivo.
            <br />
            <b>Tokens usados</b> são tudo o que passou pela IA numa conversa, somando todas as releituras.
            <br />
            <b>Tokens gastos</b> são o custo real: cada tipo de token tem um preço diferente, e a maior parte do volume é cache, que é barato.
          </p>
        </div>
      </section>

      <section className="mt-tipos">
        {TIPOS.map((tipo) => (
          <article key={tipo.id} className={`mt-tipo mt-tipo--${tipo.classe}`}>
            <header>
              <strong>{tipo.nome}</strong>
              <span>{PESO_TOKEN[tipo.id] === 1 ? 'preço base' : `${String(PESO_TOKEN[tipo.id]).replace('.', ',')}× a entrada`}</span>
            </header>
            <p>{tipo.texto}</p>
            <span className="mt-tipo-barra" aria-hidden>
              <span style={{ width: `${(PESO_TOKEN[tipo.id] / PESO_TOKEN.saida) * 100}%` }} />
            </span>
          </article>
        ))}
      </section>

      <section className="mt-card">
        <h3>Por que o painel de uso mostra milhões?</h3>
        <p>
          A cada mensagem, a IA relê a conversa inteira: regras, arquivos abertos, perguntas e respostas anteriores. A
          décima mensagem carrega as nove anteriores. O volume cresce rápido, mas essa releitura entra como cache e sai
          barata.
        </p>
      </section>

      <section className="mt-card">
        <h3>Simulador de uma conversa</h3>
        <div className="mt-simulador">
          <div className="mt-controles">
            <label className="mt-campo">
              <span>Arquivo que a IA abre</span>
              <select value={caminho} onChange={(e) => setCaminho(e.target.value)}>
                {lista.map((a) => (
                  <option key={a.caminho} value={a.caminho}>
                    {a.caminho} ({numero(a.tokens)})
                  </option>
                ))}
              </select>
            </label>
            <Campo rotulo="Dividir o arquivo em partes:" valor={partes} min={1} max={8} passo={1} onMudar={setPartes} />
            <Campo rotulo="Mensagens na conversa:" valor={mensagens} min={1} max={40} passo={1} onMudar={setMensagens} />
            <Campo rotulo="Tamanho de cada resposta:" valor={resposta} min={100} max={4000} passo={100} onMudar={setResposta} />
            <p className="mt-nota">
              Conta com {numero(CONTEXTO_FIXO)} tokens de regras e instruções fixas e perguntas de 150 tokens. Pesos
              aproximados; o preço exato depende do modelo.
            </p>
          </div>

          <div className="mt-resultado">
            <div className="mt-comparar">
              <div>
                <span>Tokens usados</span>
                <b>{numero(sim.totalUsado)}</b>
                <span className="mt-barra">
                  <span className="mt-barra-cheia mt-cor-cinza" style={{ width: `${(sim.totalUsado / maiorBarra) * 100}%` }} />
                </span>
              </div>
              <div>
                <span>Gasto real (em tokens de entrada)</span>
                <b>{numero(sim.custoEquivalente)}</b>
                <span className="mt-barra">
                  <span className="mt-barra-cheia mt-cor-amarelo" style={{ width: `${(sim.custoEquivalente / maiorBarra) * 100}%` }} />
                </span>
              </div>
              <div>
                <span>Gasto se não houvesse cache</span>
                <b>{numero(semCache)}</b>
                <span className="mt-barra">
                  <span className="mt-barra-cheia mt-cor-vermelho" style={{ width: `${(semCache / maiorBarra) * 100}%` }} />
                </span>
              </div>
            </div>

            <ul className="mt-composicao">
              {TIPOS.map((tipo) => (
                <li key={tipo.id}>
                  <span className={`mt-ponto mt-ponto--${tipo.classe}`} />
                  {tipo.nome}
                  <b>{numero(sim.usados[tipo.id])}</b>
                  <small>custa {numero(Math.round(sim.usados[tipo.id] * PESO_TOKEN[tipo.id]))}</small>
                </li>
              ))}
            </ul>

            <p className="mt-conclusao">
              O cache reduz o custo em {economiaCache}%. A saída representa{' '}
              {sim.custoEquivalente > 0
                ? Math.round(((sim.usados.saida * PESO_TOKEN.saida) / sim.custoEquivalente) * 100)
                : 0}
              % do gasto, mesmo sendo só{' '}
              {sim.totalUsado > 0 ? Math.max(1, Math.round((sim.usados.saida / sim.totalUsado) * 100)) : 0}% do volume.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-card">
        <h3>Como gastar menos</h3>
        <ul className="mt-dicas">
          <li>
            <b>Conversa nova a cada assunto.</b> O histórico é o que mais cresce a cada mensagem.
          </li>
          <li>
            <b>Arquivos menores.</b> Dividir os arquivos vermelhos do mapa faz cada leitura custar menos.
          </li>
          <li>
            <b>Respostas objetivas.</b> A saída é o token mais caro.
          </li>
          <li>
            <b>Diga o arquivo certo.</b> Apontar o arquivo evita que a IA abra vários para procurar.
          </li>
        </ul>
      </section>
    </main>
  )
}
