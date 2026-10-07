import { useMemo, useState } from 'react'
import mapa from '../../data/mapaTokens.json'
import { ArvorePastas } from './ArvorePastas'
import { DesenhoPastas } from './DesenhoPastas'
import { ExplicaTokens } from './ExplicaTokens'
import { LIMITE_MEDIO, acharNo, arquivosDe, montarArvore, numero } from './montarArvore'
import { montarGrafo } from './montarGrafo'
import { PainelDetalhe } from './PainelDetalhe'
import { PainelPasta } from './PainelPasta'
import type { ArquivoMedido } from './tipos'
import './mapaTokens.css'

const arquivosMedidos = mapa.arquivos as ArquivoMedido[]

export default function TelaMapaTokens() {
  const raiz = useMemo(() => montarArvore(arquivosMedidos), [])
  const grafo = useMemo(() => montarGrafo(arquivosMedidos), [])
  const [aba, setAba] = useState<'desenho' | 'arvore' | 'explica'>('desenho')
  const [selecionado, setSelecionado] = useState('src')
  const [pastaId, setPastaId] = useState<string | null>(null)
  const no = acharNo(raiz, selecionado) ?? raiz
  const pasta = grafo.pastas.find((p) => p.id === pastaId) ?? null
  const pesados = arquivosDe(raiz).filter((arquivo) => arquivo.tokens > LIMITE_MEDIO)
  const tokensPesados = pesados.reduce((soma, arquivo) => soma + arquivo.tokens, 0)
  const parcelaPesada = raiz.tokens > 0 ? Math.round((tokensPesados / raiz.tokens) * 100) : 0

  return (
    <div className="mt-tela">
      <header className="mt-topo">
        <div className="mt-marca">
          <span className="mt-marca-icone" aria-hidden>
            ⚡
          </span>
          <div>
            <h1>Mapa do sistema</h1>
            <p>Pastas, ligações e tamanho em tokens, medidos no último build ({new Date(mapa.geradoEm).toLocaleString('pt-BR')})</p>
          </div>
        </div>
        <div className="mt-resumo">
          <span>
            <b>{grafo.pastas.length}</b> pastas
          </span>
          <span>
            <b>{numero(raiz.arquivos)}</b> arquivos
          </span>
          <span title="Tamanho de todos os arquivos. Só vira gasto quando a IA lê.">
            <b>{numero(raiz.tokens)}</b> tokens existentes
          </span>
          <span className="mt-resumo-alerta">
            <b>{pesados.length}</b> pesados = {parcelaPesada}% do total
          </span>
          <a href="/" className="mt-voltar">
            Voltar ao sistema
          </a>
        </div>
      </header>
      <nav className="mt-abas" aria-label="Visualização">
        <button type="button" className={aba === 'desenho' ? 'mt-aba--on' : ''} onClick={() => setAba('desenho')}>
          Desenho das pastas
        </button>
        <button type="button" className={aba === 'arvore' ? 'mt-aba--on' : ''} onClick={() => setAba('arvore')}>
          Árvore de arquivos
        </button>
        <button type="button" className={aba === 'explica' ? 'mt-aba--on' : ''} onClick={() => setAba('explica')}>
          Tokens usados × gastos
        </button>
      </nav>
      {aba === 'explica' ? (
        <ExplicaTokens arquivos={arquivosMedidos} />
      ) : aba === 'desenho' ? (
        <div className="mt-corpo mt-corpo--desenho">
          <DesenhoPastas {...grafo} selecionada={pastaId} onSelecionar={setPastaId} />
          <PainelPasta pasta={pasta} ligacoes={grafo.ligacoes} onSelecionar={setPastaId} />
        </div>
      ) : (
        <div className="mt-corpo">
          <ArvorePastas raiz={raiz} selecionado={no.id} onSelecionar={setSelecionado} />
          <PainelDetalhe no={no} total={raiz.tokens} onSelecionar={setSelecionado} />
        </div>
      )}
    </div>
  )
}
