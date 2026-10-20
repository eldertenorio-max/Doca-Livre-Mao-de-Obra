import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import mapa from '../../data/mapaTokens.json'
import { BRAND_FULL_TITLE } from '../../lib/brandAssets'
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
const Desenho3D = lazy(() => import('./Desenho3D'))

export default function TelaMapaTokens() {
  const raiz = useMemo(() => montarArvore(arquivosMedidos), [])
  const grafo = useMemo(() => montarGrafo(arquivosMedidos), [])
  const [aba, setAba] = useState<'desenho' | 'desenho3d' | 'arvore' | 'explica'>('desenho')
  const [selecionado, setSelecionado] = useState('src')
  const [pastaId, setPastaId] = useState<string | null>(null)
  const no = acharNo(raiz, selecionado) ?? raiz
  const pasta = grafo.pastas.find((p) => p.id === pastaId) ?? null
  const pesados = arquivosDe(raiz).filter((arquivo) => arquivo.tokens > LIMITE_MEDIO)
  const tokensPesados = pesados.reduce((soma, arquivo) => soma + arquivo.tokens, 0)
  const parcelaPesada = raiz.tokens > 0 ? Math.round((tokensPesados / raiz.tokens) * 100) : 0
  const telaRef = useRef<HTMLDivElement>(null)
  const [telaInteira, setTelaInteira] = useState(false)
  const podeTelaInteira = typeof document !== 'undefined' && document.fullscreenEnabled

  useEffect(() => {
    const anterior = document.title
    document.title = `Mapa do sistema · ${BRAND_FULL_TITLE}`
    return () => {
      document.title = anterior
    }
  }, [])

  useEffect(() => {
    const atualizar = () => setTelaInteira(Boolean(telaRef.current) && document.fullscreenElement === telaRef.current)
    document.addEventListener('fullscreenchange', atualizar)
    return () => document.removeEventListener('fullscreenchange', atualizar)
  }, [])

  function alternarTelaInteira() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
      return
    }
    telaRef.current?.requestFullscreen().catch(() => {})
  }

  return (
    <div className="mt-tela" ref={telaRef}>
      <header className="mt-topo">
        <div className="mt-marca">
          <span className="mt-marca-icone" aria-hidden>
            ⚡
          </span>
          <div>
            <h1>
              Mapa do sistema <span className="mt-sistema">{BRAND_FULL_TITLE}</span>
            </h1>
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
          {podeTelaInteira && (
            <button
              type="button"
              className="mt-tela-inteira"
              aria-pressed={telaInteira}
              title={telaInteira ? 'Sair da tela inteira (Esc)' : 'Mostrar o mapa em tela inteira'}
              onClick={alternarTelaInteira}
            >
              {telaInteira ? '⤡ Sair da tela inteira' : '⤢ Tela inteira'}
            </button>
          )}
          <a href="/" className="mt-voltar">
            Voltar ao sistema
          </a>
        </div>
      </header>
      <nav className="mt-abas" aria-label="Visualização">
        <button type="button" className={aba === 'desenho' ? 'mt-aba--on' : ''} onClick={() => setAba('desenho')}>
          Desenho das pastas
        </button>
        <button type="button" className={aba === 'desenho3d' ? 'mt-aba--on' : ''} onClick={() => setAba('desenho3d')}>
          Desenho 3D
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
      ) : aba === 'desenho3d' ? (
        <div className="mt-corpo mt-corpo--desenho">
          <Suspense fallback={<div className="mt3d mt3d-carregando">Carregando o desenho 3D…</div>}>
            <Desenho3D pastas={grafo.pastas} ligacoes={grafo.ligacoes} selecionada={pastaId} onSelecionar={setPastaId} />
          </Suspense>
          <PainelPasta pasta={pasta} ligacoes={grafo.ligacoes} onSelecionar={setPastaId} />
        </div>
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
