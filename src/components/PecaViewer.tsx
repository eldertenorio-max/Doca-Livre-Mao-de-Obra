import { useState } from 'react'
import { escaparHtml, imprimirHtml } from '../lib/imprimir'
import { useStore } from '../lib/store'
import type { PecaDocumental } from '../lib/types'
import './termos.css'

type Papel = PecaDocumental['assinaturas'][number]['papel']

const PAPEL: Record<Papel, string> = {
  ett: 'Empresa de trabalho temporário',
  tomadora: 'Empresa tomadora',
  trabalhador: 'Trabalhador',
}

function dataHora(iso?: string) {
  return iso ? new Date(iso).toLocaleString('pt-BR') : ''
}

function htmlDaPeca(peca: PecaDocumental) {
  const linhas = peca.resumo.map((linha) => `<li>${escaparHtml(linha)}</li>`).join('')
  const assinaturas = peca.assinaturas
    .map(
      (a) =>
        `<tr><td>${PAPEL[a.papel]}</td><td>${escaparHtml(a.nome)}</td><td>${
          a.status === 'assinado' ? `Assinado em ${dataHora(a.em)}` : 'Pendente'
        }</td></tr>`,
    )
    .join('')
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escaparHtml(peca.numero)}</title>
<style>body{font-family:Arial,sans-serif;color:#111;margin:32px;line-height:1.5}h1{font-size:18px;margin:0}
.num{color:#555;margin:4px 0 18px}li{margin-bottom:6px}table{width:100%;border-collapse:collapse;margin-top:18px}
td{border:1px solid #ccc;padding:6px 8px;font-size:13px}.aviso{margin-top:24px;font-size:12px;color:#555}</style></head>
<body><h1>${escaparHtml(peca.titulo)}</h1><p class="num">${escaparHtml(peca.numero)} · emitido em ${dataHora(peca.criadoEm)}</p>
<ul>${linhas}</ul>${assinaturas ? `<table>${assinaturas}</table>` : ''}
<p class="aviso">Assinatura eletrônica nos termos da MP 2.200-2/2001 e da Lei 14.063/2020. ${escaparHtml(peca.aviso)}</p></body></html>`
}

export function PecaViewer({
  pecaId,
  papel,
  nome,
  onClose,
}: {
  pecaId: string
  papel?: Papel
  nome?: string
  onClose: () => void
}) {
  const { state, assinarPeca } = useStore()
  const peca = (state.pecas ?? []).find((p) => p.id === pecaId)
  const [concordo, setConcordo] = useState(false)

  if (!peca) {
    return (
      <div className="termos-fundo" onClick={onClose}>
        <div className="termos-modal" onClick={(e) => e.stopPropagation()}>
          <p>Documento não encontrado.</p>
          <div className="termos-acoes">
            <button type="button" className="termos-sair" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const minha = papel ? peca.assinaturas.find((a) => a.papel === papel) : undefined
  const podeAssinar = Boolean(minha && minha.status === 'pendente')

  return (
    <div className="termos-fundo" role="dialog" aria-modal="true" aria-labelledby="peca-titulo" onClick={onClose}>
      <div className="termos-modal termos-modal--doc" onClick={(e) => e.stopPropagation()}>
        <h2 id="peca-titulo">{peca.titulo}</h2>
        <p className="peca-numero">
          {peca.numero} · emitido em {dataHora(peca.criadoEm)}
        </p>
        <ul className="peca-resumo">
          {peca.resumo.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
        {peca.assinaturas.length > 0 && (
          <ul className="peca-assinaturas">
            {peca.assinaturas.map((a) => (
              <li key={a.papel} className={a.status === 'assinado' ? 'peca-assinada' : ''}>
                <strong>{PAPEL[a.papel]}</strong>
                <span>{a.nome}</span>
                <span>{a.status === 'assinado' ? `Assinado em ${dataHora(a.em)}` : 'Assinatura pendente'}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="termos-versao">{peca.aviso}</p>

        {podeAssinar && (
          <label className="termos-check peca-concordo">
            <input type="checkbox" checked={concordo} onChange={(e) => setConcordo(e.target.checked)} />
            <span>Li e concordo com este documento. Assino eletronicamente como {minha!.nome}.</span>
          </label>
        )}

        <div className="termos-acoes">
          <button type="button" className="termos-sair" onClick={() => imprimirHtml(htmlDaPeca(peca), peca.titulo)}>
            Imprimir / PDF
          </button>
          <button type="button" className="termos-sair" onClick={onClose}>
            Fechar
          </button>
          {podeAssinar && papel && (
            <button
              type="button"
              className="termos-ok"
              disabled={!concordo}
              onClick={() => {
                assinarPeca(peca.id, papel, nome?.trim() || minha!.nome)
                onClose()
              }}
            >
              Assinar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
