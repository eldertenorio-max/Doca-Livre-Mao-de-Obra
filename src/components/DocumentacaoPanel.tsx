import { useMemo, useState } from 'react'
import {
  DOCS_EMPRESA,
  DOCS_PLATAFORMA,
  DOCS_PROFISSIONAL,
  docDefById,
} from '../data/documentCatalog'
import {
  checklistProfissional,
  daysUntil,
  docsDoDono,
  effectiveStatus,
  isDocVencendo,
  isDocVencido,
  resumoDocumental,
} from '../lib/documentos'
import { useStore } from '../lib/store'
import type { DocumentoRegistro, Empresa, Profissional } from '../lib/types'

function StatusBadge({ status }: { status: string }) {
  return <span className={`px-status px-status--${status}`}>{status.replace('_', ' ')}</span>
}

export function DocumentacaoProfissionalPanel({ profissional }: { profissional: Profissional }) {
  const { state, enviarDocumento } = useStore()
  const items = useMemo(
    () => checklistProfissional(profissional, state.documentos),
    [profissional, state.documentos],
  )
  const resumo = resumoDocumental(items)
  const [tipoId, setTipoId] = useState(DOCS_PROFISSIONAL[0].id)
  const [validade, setValidade] = useState('')
  const [arquivo, setArquivo] = useState('')

  return (
    <div className="docs-panel">
      <div className="docs-resumo">
        <div className="px-mini-card">
          <span className="muted">Completude</span>
          <strong>{resumo.pct}%</strong>
        </div>
        <div className="px-mini-card">
          <span className="muted">Aprovados</span>
          <strong>{resumo.ok}/{resumo.total}</strong>
        </div>
        <div className="px-mini-card">
          <span className="muted">Pendentes</span>
          <strong>{resumo.pendentes}</strong>
        </div>
        <div className="px-mini-card">
          <span className="muted">Vencendo / vencidos</span>
          <strong>{resumo.vencendo + resumo.vencidos}</strong>
        </div>
      </div>

      {!resumo.completo && (
        <div className="docs-alert">
          Complete a documentação obrigatória para aumentar a chance de matching e confirmação em
          contratos.
        </div>
      )}

      <h3>Checklist obrigatório</h3>
      <ul className="px-list">
        {items.map(({ def, doc, status, faltando, vencendo }) => (
          <li key={def.id} className="px-list-card docs-item">
            <div>
              <strong>{def.label}</strong>
              <p className="muted">{def.descricao}</p>
              {doc?.arquivoNome && <p className="muted">Arquivo: {doc.arquivoNome}</p>}
              {doc?.validade && (
                <p className="muted">
                  Validade: {doc.validade}
                  {vencendo ? ' · vence em breve' : ''}
                  {isDocVencido(doc) ? ' · VENCIDO' : ''}
                </p>
              )}
              {doc?.observacao && <p className="error">Obs.: {doc.observacao}</p>}
            </div>
            <div className="px-row-actions">
              <StatusBadge status={faltando ? 'pendente' : status} />
              <button
                type="button"
                className="px-btn px-btn-outline"
                onClick={() => {
                  setTipoId(def.id)
                  setValidade(doc?.validade ?? '')
                }}
              >
                {faltando ? 'Enviar' : 'Atualizar'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="px-card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Enviar / atualizar documento</h3>
        <div className="px-form-grid">
          <label className="px-field">
            <span>Tipo</span>
            <select value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
              {DOCS_PROFISSIONAL.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="px-field">
            <span>Nome do arquivo (mock)</span>
            <input
              value={arquivo}
              onChange={(e) => setArquivo(e.target.value)}
              placeholder="ex: cnh_frente.pdf"
            />
          </label>
          {docDefById(tipoId)?.temValidade && (
            <label className="px-field">
              <span>Validade</span>
              <input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
            </label>
          )}
        </div>
        <button
          type="button"
          className="px-btn px-btn-primary"
          onClick={() => {
            enviarDocumento({
              tipoId,
              donoTipo: 'profissional',
              donoId: profissional.id,
              arquivoNome: arquivo || `${tipoId}.pdf`,
              validade: validade || undefined,
            })
            setArquivo('')
          }}
        >
          Enviar para análise
        </button>
      </div>

      <TermosPlataforma />
    </div>
  )
}

export function DocumentacaoEmpresaPanel({ empresa }: { empresa: Empresa }) {
  const { state, enviarDocumento } = useStore()
  const docs = docsDoDono(state.documentos, 'empresa', empresa.id)

  return (
    <div className="docs-panel">
      <p className="muted">
        Documentos cadastrais da empresa. Sem aprovação, a conta pode ficar limitada.
      </p>
      <ul className="px-list">
        {DOCS_EMPRESA.map((def) => {
          const doc = docs.find((d) => d.tipoId === def.id)
          const status = doc ? effectiveStatus(doc) : 'pendente'
          return (
            <li key={def.id} className="px-list-card docs-item">
              <div>
                <strong>{def.label}</strong>
                <p className="muted">{def.descricao}</p>
                {doc?.arquivoNome && <p className="muted">Arquivo: {doc.arquivoNome}</p>}
              </div>
              <div className="px-row-actions">
                <StatusBadge status={status} />
                <button
                  type="button"
                  className="px-btn px-btn-outline"
                  onClick={() =>
                    enviarDocumento({
                      tipoId: def.id,
                      donoTipo: 'empresa',
                      donoId: empresa.id,
                      arquivoNome: `${def.id}.pdf`,
                    })
                  }
                >
                  {doc ? 'Reenviar' : 'Enviar'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <TermosPlataforma />
    </div>
  )
}

export function DocumentacaoPrestadorResumo({
  profissional,
  requisitos = [],
}: {
  profissional: Profissional
  requisitos?: string[]
}) {
  const { state } = useStore()
  const items = checklistProfissional(profissional, state.documentos, requisitos)
  const resumo = resumoDocumental(items)

  return (
    <div className="docs-resumo-inline">
      <span className={resumo.completo ? 'success' : 'muted'}>
        Docs {resumo.ok}/{resumo.total} ({resumo.pct}%)
      </span>
      {resumo.vencendo > 0 && <span className="docs-chip docs-chip--warn">vencendo</span>}
      {resumo.vencidos > 0 && <span className="docs-chip docs-chip--danger">vencido</span>}
      {resumo.pendentes > 0 && <span className="docs-chip">pendente</span>}
    </div>
  )
}

export function CentralDocumentacaoAdmin() {
  const { state, revisarDocumento } = useStore()
  const [filtro, setFiltro] = useState<'todos' | 'em_analise' | 'vencendo' | 'vencido' | 'recusado'>('em_analise')

  const lista = useMemo(() => {
    return state.documentos
      .map((d) => ({ d, status: effectiveStatus(d), def: docDefById(d.tipoId) }))
      .filter(({ d, status }) => {
        if (filtro === 'todos') return true
        if (filtro === 'em_analise') return d.status === 'em_analise' || d.status === 'pendente'
        if (filtro === 'vencendo') return isDocVencendo(d)
        if (filtro === 'vencido') return status === 'vencido' || isDocVencido(d)
        if (filtro === 'recusado') return d.status === 'recusado'
        return true
      })
      .sort((a, b) => (a.d.enviadoEm < b.d.enviadoEm ? 1 : -1))
  }, [state.documentos, filtro])

  const emAnalise = state.documentos.filter((d) => d.status === 'em_analise').length
  const vencendo = state.documentos.filter((d) => isDocVencendo(d)).length
  const vencidos = state.documentos.filter((d) => isDocVencido(d) || effectiveStatus(d) === 'vencido').length

  return (
    <div className="px-page">
      <h1 className="px-title">Central de documentação</h1>
      <p className="muted">
        Aprovação, recusa e monitoramento de validade (CNH, NRs, ASO, GR, docs empresariais).
      </p>

      <div className="px-stat-3" style={{ marginBottom: 16 }}>
        <div className="px-mini-card"><span className="muted">Em análise</span><strong>{emAnalise}</strong></div>
        <div className="px-mini-card"><span className="muted">Vencendo (30 dias)</span><strong>{vencendo}</strong></div>
        <div className="px-mini-card"><span className="muted">Vencidos</span><strong>{vencidos}</strong></div>
        <div className="px-mini-card"><span className="muted">Total registros</span><strong>{state.documentos.length}</strong></div>
      </div>

      <div className="px-pills" style={{ marginBottom: 12 }}>
        {(
          [
            ['em_analise', 'Em análise'],
            ['vencendo', 'Vencendo'],
            ['vencido', 'Vencidos'],
            ['recusado', 'Recusados'],
            ['todos', 'Todos'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`px-pill ${filtro === id ? 'px-pill--on' : ''}`}
            onClick={() => setFiltro(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="px-list">
        {lista.map(({ d, status, def }) => {
          const dono =
            d.donoTipo === 'profissional'
              ? state.profissionais.find((p) => p.id === d.donoId)?.nome
              : state.empresas.find((e) => e.id === d.donoId)?.nomeFantasia
          const dias = daysUntil(d.validade)
          return (
            <li key={d.id} className="px-list-card">
              <div>
                <strong>{def?.label ?? d.tipoId}</strong>
                <p className="muted">
                  {d.donoTipo} · {dono ?? d.donoId} · {d.arquivoNome ?? 'sem arquivo'}
                  {d.validade ? ` · val. ${d.validade}${dias != null ? ` (${dias}d)` : ''}` : ''}
                </p>
              </div>
              <div className="px-row-actions">
                <StatusBadge status={status} />
                {(d.status === 'em_analise' || d.status === 'pendente') && (
                  <>
                    <button
                      type="button"
                      className="px-btn px-btn-primary"
                      onClick={() => revisarDocumento(d.id, 'aprovado')}
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      className="px-btn px-btn-ghost"
                      onClick={() =>
                        revisarDocumento(d.id, 'recusado', 'Documento ilegível ou incompleto')
                      }
                    >
                      Recusar
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {lista.length === 0 && (
        <div className="px-empty">
          <strong>Nenhum documento neste filtro</strong>
        </div>
      )}

      <div className="px-card" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Catálogo documental da plataforma</h3>
        <p className="muted">Referência do que o sistema exige e monitora.</p>
        <div className="docs-catalog-grid">
          <CatalogBlock title="Profissional" items={DOCS_PROFISSIONAL} />
          <CatalogBlock title="Empresa" items={DOCS_EMPRESA} />
          <CatalogBlock title="Plataforma" items={DOCS_PLATAFORMA} />
        </div>
      </div>
    </div>
  )
}

function CatalogBlock({
  title,
  items,
}: {
  title: string
  items: { id: string; label: string; descricao: string }[]
}) {
  return (
    <div>
      <h4>{title}</h4>
      <ul className="docs-catalog-list">
        {items.map((i) => (
          <li key={i.id}>
            <strong>{i.label}</strong>
            <span className="muted">{i.descricao}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TermosPlataforma() {
  const [open, setOpen] = useState<'termos' | 'privacidade' | null>(null)
  return (
    <div className="px-card" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Documentos da plataforma</h3>
      <div className="px-row-actions">
        <button type="button" className="px-btn px-btn-outline" onClick={() => setOpen('termos')}>
          Termos de uso
        </button>
        <button type="button" className="px-btn px-btn-outline" onClick={() => setOpen('privacidade')}>
          Política de privacidade (LGPD)
        </button>
      </div>
      {open === 'termos' && (
        <div className="docs-legal">
          <h4>Termos de uso — Doca Livre Mão de Obra</h4>
          <p>
            A Doca Livre intermedia a contratação de profissionais operacionais para empresas de
            logística. A plataforma não é empregadora dos prestadores. O contrato de prestação de
            serviço é firmado entre CONTRATANTE e CONTRATADO, com intermediação e registro digital
            pela Doca Livre.
          </p>
          <p>
            As partes devem manter documentação válida (identidade, CNH, NRs, ASO, aptidão GR quando
            exigida). Falsidade documental implica bloqueio e responsabilização.
          </p>
          <button type="button" className="px-link" onClick={() => setOpen(null)}>Fechar</button>
        </div>
      )}
      {open === 'privacidade' && (
        <div className="docs-legal">
          <h4>Política de privacidade (LGPD)</h4>
          <p>
            Tratamos dados cadastrais, documentos, geolocalização de check-in e histórico operacional
            para viabilitar matching, segurança e pagamento. O titular pode solicitar acesso,
            correção ou exclusão conforme a Lei 13.709/2018, ressalvadas obrigações legais de
            retenção.
          </p>
          <button type="button" className="px-link" onClick={() => setOpen(null)}>Fechar</button>
        </div>
      )}
    </div>
  )
}

/** Evita unused warning se importado só parcialmente */
export type _DocRegistro = DocumentoRegistro
