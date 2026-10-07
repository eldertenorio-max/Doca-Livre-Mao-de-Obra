import { useMemo, useState } from 'react'
import mapa from '../../data/mapaTokens.json'
import { ArvorePastas } from './ArvorePastas'
import { LIMITE_MEDIO, acharNo, arquivosDe, montarArvore, numero } from './montarArvore'
import { PainelDetalhe } from './PainelDetalhe'
import type { ArquivoMedido } from './tipos'
import './mapaTokens.css'

export default function TelaMapaTokens() {
  const raiz = useMemo(() => montarArvore(mapa.arquivos as ArquivoMedido[]), [])
  const [selecionado, setSelecionado] = useState('src')
  const no = acharNo(raiz, selecionado) ?? raiz
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
            <h1>Mapa de tokens</h1>
            <p>Tamanho de cada parte do sistema, medido no último build ({new Date(mapa.geradoEm).toLocaleString('pt-BR')})</p>
          </div>
        </div>
        <div className="mt-resumo">
          <span>
            <b>{numero(raiz.tokens)}</b> tokens no total
          </span>
          <span>
            <b>{numero(raiz.arquivos)}</b> arquivos
          </span>
          <span className="mt-resumo-alerta">
            <b>{pesados.length}</b> pesados = {parcelaPesada}% do total
          </span>
          <a href="/" className="mt-voltar">
            Voltar ao sistema
          </a>
        </div>
      </header>
      <div className="mt-corpo">
        <ArvorePastas raiz={raiz} selecionado={no.id} onSelecionar={setSelecionado} />
        <PainelDetalhe no={no} total={raiz.tokens} onSelecionar={setSelecionado} />
      </div>
    </div>
  )
}
