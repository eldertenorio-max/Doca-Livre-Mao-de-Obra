import { useEffect, useMemo, useState } from 'react'
import {
  DOCS_EMPRESA,
  DOCS_PLATAFORMA,
  DOCS_PROFISSIONAL,
  docDefById,
} from '../data/documentCatalog'
import {
  STATUS_LABEL,
  checklistEmpresa,
  checklistProfissional,
  daysUntil,
  effectiveStatus,
  isDocVencendo,
  isDocVencido,
  resumoDocumental,
  validarEnvioDocumento,
  type ChecklistItem,
} from '../lib/documentos'
import { useStore } from '../lib/store'
import type { DocumentoStatus, Empresa, Profissional } from '../lib/types'

function StatusBadge({ status }: { status: DocumentoStatus | string }) {
  const label = STATUS_LABEL[status as DocumentoStatus] ?? status
  return <span className={`docs-status docs-status--${status}`}>{label}</span>
}

export function DocumentacaoProfissionalPanel({ profissional }: { profissional: Profissional }) {
  const { state } = useStore()
  const items = useMemo(
    () => checklistProfissional(profissional, state.documentos),
    [profissional, state.documentos],
  )
  const resumo = resumoDocumental(items)
  const obrigatorios = items.filter((i) => !i.opcional)
  const opcionais = items.filter((i) => i.opcional)
  const [selecao, setSelecao] = useState<{ tipoId: string; validade: string } | null>(null)

  return (
    <div className="docs-panel">
      <ResumoCards resumo={resumo} />

      {!resumo.completo && (
        <div className="docs-alert">
          A documentação obrigatória entra no score do matching. Documento vencido, recusado ou
          ainda não aprovado reduz a prioridade nas demandas.
        </div>
      )}

      <h3>Checklist obrigatório</h3>
      <ChecklistLista items={obrigatorios} onSelect={setSelecao} />

      {opcionais.length > 0 && (
        <>
          <h3>Opcionais</h3>
          <ChecklistLista items={opcionais} onSelect={setSelecao} />
        </>
      )}

      <EnvioDocumentoForm
        defs={DOCS_PROFISSIONAL}
        donoTipo="profissional"
        donoId={profissional.id}
        selecao={selecao}
      />
      <TermosPlataforma />
    </div>
  )
}

export function DocumentacaoEmpresaPanel({ empresa }: { empresa: Empresa }) {
  const { state } = useStore()
  const items = useMemo(
    () => checklistEmpresa(empresa.id, state.documentos),
    [empresa.id, state.documentos],
  )
  const resumo = resumoDocumental(items)
  const obrigatorios = items.filter((i) => !i.opcional)
  const opcionais = items.filter((i) => i.opcional)
  const [selecao, setSelecao] = useState<{ tipoId: string; validade: string } | null>(null)

  return (
    <div className="docs-panel">
      <p className="muted">
        Documentos cadastrais da empresa. Sem aprovação dos obrigatórios, a conta pode ficar limitada.
      </p>
      <ResumoCards resumo={resumo} />
      {!resumo.completo && (
        <div className="docs-alert">
          Envie contrato social, cartão CNPJ, comprovante de endereço e documento do responsável.
          Procuração só é necessária quando quem acessa não é o sócio.
        </div>
      )}
      <h3>Checklist obrigatório</h3>
      <ChecklistLista items={obrigatorios} onSelect={setSelecao} />
      {opcionais.length > 0 && (
        <>
          <h3>Opcionais</h3>
          <ChecklistLista items={opcionais} onSelect={setSelecao} />
        </>
      )}
      <EnvioDocumentoForm
        defs={DOCS_EMPRESA}
        donoTipo="empresa"
        donoId={empresa.id}
        selecao={selecao}
      />
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
        if (filtro === 'em_analise') return d.status === 'em_analise' && Boolean(d.arquivoNome?.trim())
        if (filtro === 'vencendo') return status === 'aprovado' && isDocVencendo(d)
        if (filtro === 'vencido') return status === 'vencido'
        if (filtro === 'recusado') return d.status === 'recusado'
        return true
      })
      .sort((a, b) => (a.d.enviadoEm < b.d.enviadoEm ? 1 : -1))
  }, [state.documentos, filtro])

  const emAnalise = state.documentos.filter((d) => d.status === 'em_analise' && d.arquivoNome?.trim()).length
  const vencendo = state.documentos.filter((d) => effectiveStatus(d) === 'aprovado' && isDocVencendo(d)).length
  const vencidos = state.documentos.filter((d) => effectiveStatus(d) === 'vencido').length

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
                {d.observacao && <p className="error">Obs.: {d.observacao}</p>}
              </div>
              <div className="px-row-actions">
                <StatusBadge status={status} />
                {d.status === 'em_analise' && d.arquivoNome?.trim() && (
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
                      onClick={() => {
                        const motivo = window.prompt('Motivo da recusa', 'Documento ilegível ou incompleto')
                        if (!motivo?.trim()) return
                        revisarDocumento(d.id, 'recusado', motivo.trim())
                      }}
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

function ResumoCards({
  resumo,
}: {
  resumo: ReturnType<typeof resumoDocumental>
}) {
  return (
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
  )
}

function ChecklistLista({
  items,
  onSelect,
}: {
  items: ChecklistItem[]
  onSelect: (selecao: { tipoId: string; validade: string }) => void
}) {
  return (
    <ul className="px-list">
      {items.map(({ def, doc, status, faltando, vencendo }) => (
        <li key={def.id} className="px-list-card docs-item">
          <div>
            <strong>
              {def.label}
              {def.opcional && <span className="docs-tag">opcional</span>}
            </strong>
            <p className="muted">{def.descricao}</p>
            {doc?.arquivoNome && <p className="muted">Arquivo: {doc.arquivoNome}</p>}
            {doc?.validade && (
              <p className="muted">
                Validade: {doc.validade}
                {vencendo ? ' · vence em breve' : ''}
                {isDocVencido(doc) ? ' · vencido' : ''}
              </p>
            )}
            {doc?.observacao && <p className="error">Obs.: {doc.observacao}</p>}
          </div>
          <div className="px-row-actions">
            <StatusBadge status={faltando ? 'pendente' : status} />
            <button
              type="button"
              className="px-btn px-btn-outline"
              onClick={() => onSelect({ tipoId: def.id, validade: doc?.validade ?? '' })}
            >
              {faltando ? 'Enviar' : 'Atualizar'}
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function EnvioDocumentoForm({
  defs,
  donoTipo,
  donoId,
  selecao,
}: {
  defs: { id: string; label: string }[]
  donoTipo: 'profissional' | 'empresa'
  donoId: string
  selecao: { tipoId: string; validade: string } | null
}) {
  const { enviarDocumento } = useStore()
  const [tipoId, setTipoId] = useState(selecao?.tipoId ?? defs[0]?.id ?? '')
  const [validade, setValidade] = useState(selecao?.validade ?? '')
  const [arquivo, setArquivo] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!selecao) return
    setTipoId(selecao.tipoId)
    setValidade(selecao.validade)
    setErro('')
  }, [selecao])

  return (
    <div className="px-card" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Enviar / atualizar documento</h3>
      <div className="px-form-grid">
        <label className="px-field">
          <span>Tipo</span>
          <select
            value={tipoId}
            onChange={(e) => {
              setTipoId(e.target.value)
              setErro('')
            }}
          >
            {defs.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </label>
        <label className="px-field">
          <span>Nome do arquivo</span>
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
      {erro && <p className="error">{erro}</p>}
      <button
        type="button"
        className="px-btn px-btn-primary"
        onClick={() => {
          const msg = validarEnvioDocumento(tipoId, arquivo, validade || undefined)
          if (msg) {
            setErro(msg)
            return
          }
          enviarDocumento({
            tipoId,
            donoTipo,
            donoId,
            arquivoNome: arquivo.trim(),
            validade: docDefById(tipoId)?.temValidade ? validade : undefined,
          })
          setArquivo('')
          setErro('')
        }}
      >
        Enviar para análise
      </button>
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
            A Doca Livre Mão de Obra, neste fluxo, atua como empresa de trabalho temporário: contrata o
            trabalhador e o coloca à disposição da empresa tomadora. Os modelos de contrato exibidos
            aqui são minutas de controle e devem ser revisados por advogado trabalhista antes de
            contratação real.
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
