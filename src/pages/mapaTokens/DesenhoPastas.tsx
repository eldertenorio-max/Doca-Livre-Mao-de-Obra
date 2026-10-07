import { CAIXA_ALTURA, CAIXA_LARGURA } from './montarGrafo'
import { numero } from './montarArvore'
import type { LigacaoGrafo, PastaGrafo } from './tipos'

function caminhoLinha(de: PastaGrafo, para: PastaGrafo) {
  const indo = para.x > de.x
  const x1 = indo ? de.x + CAIXA_LARGURA : de.x
  const x2 = indo ? para.x : para.x + CAIXA_LARGURA
  const y1 = de.y + CAIXA_ALTURA / 2
  const y2 = para.y + CAIXA_ALTURA / 2
  if (de.x === para.x) {
    const curva = de.x + CAIXA_LARGURA + 60
    return `M ${de.x + CAIXA_LARGURA} ${y1} C ${curva} ${y1}, ${curva} ${y2}, ${para.x + CAIXA_LARGURA} ${y2}`
  }
  const meio = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${meio} ${y1}, ${meio} ${y2}, ${x2} ${y2}`
}

export function DesenhoPastas({
  pastas,
  ligacoes,
  largura,
  altura,
  selecionada,
  onSelecionar,
}: {
  pastas: PastaGrafo[]
  ligacoes: LigacaoGrafo[]
  largura: number
  altura: number
  selecionada: string | null
  onSelecionar: (id: string | null) => void
}) {
  const porId = new Map(pastas.map((p) => [p.id, p]))
  const ligadas = new Set<string>()
  if (selecionada) {
    for (const l of ligacoes) {
      if (l.de === selecionada) ligadas.add(l.para)
      if (l.para === selecionada) ligadas.add(l.de)
    }
  }

  return (
    <div className="mt-desenho" onClick={() => onSelecionar(null)}>
      <svg width={largura} height={altura} role="img" aria-label="Desenho das pastas do sistema e das ligações entre elas">
        <defs>
          <marker id="mt-seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
          </marker>
        </defs>
        {ligacoes.map((l) => {
          const de = porId.get(l.de)
          const para = porId.get(l.para)
          if (!de || !para) return null
          const ativa = selecionada === l.de || selecionada === l.para
          const classe = !selecionada ? '' : ativa ? (selecionada === l.de ? 'mt-linha--sai' : 'mt-linha--entra') : 'mt-linha--apagada'
          return (
            <path
              key={`${l.de}>${l.para}`}
              d={caminhoLinha(de, para)}
              className={`mt-linha ${classe}`}
              strokeWidth={Math.min(6, 1 + Math.log2(l.quantidade + 1))}
              markerEnd="url(#mt-seta)"
            >
              <title>
                {l.de} usa {l.para} ({l.quantidade} {l.quantidade === 1 ? 'import' : 'imports'})
              </title>
            </path>
          )
        })}
        {pastas.map((p) => {
          const apagada = selecionada && selecionada !== p.id && !ligadas.has(p.id)
          return (
            <g
              key={p.id}
              transform={`translate(${p.x} ${p.y})`}
              className={`mt-caixa mt-caixa--${p.peso} ${selecionada === p.id ? 'mt-caixa--on' : ''} ${apagada ? 'mt-caixa--apagada' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onSelecionar(selecionada === p.id ? null : p.id)
              }}
            >
              <rect width={CAIXA_LARGURA} height={CAIXA_ALTURA} rx="12" />
              <rect className="mt-caixa-faixa" width="6" height={CAIXA_ALTURA} rx="3" />
              <text x="18" y="26" className="mt-caixa-nome">
                📁 {p.id.length > 24 ? `…${p.id.slice(-23)}` : p.id}
              </text>
              <text x="18" y="48" className="mt-caixa-info">
                {p.arquivos.length} {p.arquivos.length === 1 ? 'arquivo' : 'arquivos'} · {numero(p.tokens)} tokens
              </text>
              <text x="18" y="66" className="mt-caixa-info">
                maior: {numero(p.maiorArquivo)}
              </text>
              <title>{p.id}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
