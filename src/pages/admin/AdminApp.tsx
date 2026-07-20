import { useState } from 'react'
import { CentralDocumentacaoAdmin } from '../../components/DocumentacaoPanel'
import { LevelBadge } from '../../components/LevelBadge'
import { cargoLabel } from '../../data/categories'
import { LOGO_DOCA_LIVRE_SRC } from '../../lib/brandAssets'
import { useStore } from '../../lib/store'
import '../empresa/empresa-px.css'

const ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'D' },
  { id: 'empresas', label: 'Empresas', icon: 'E' },
  { id: 'profissionais', label: 'Profissionais', icon: 'P' },
  { id: 'documentacao', label: 'Documentação', icon: '📄' },
  { id: 'demandas', label: 'Demandas', icon: 'L' },
  { id: 'financeiro', label: 'Financeiro', icon: '$' },
  { id: 'auditoria', label: 'Auditoria', icon: 'A' },
]

export function AdminApp({
  onLogout,
  onOpenConfig,
}: {
  onLogout: () => void
  onOpenConfig?: () => void
}) {
  const store = useStore()
  const [section, setSection] = useState('dashboard')

  function irParaEmpresaDemo() {
    const res = store.login('empresa@logexpress.com', 'demo123')
    if (!res.ok) {
      onLogout()
      return
    }
    try {
      sessionStorage.setItem('mao-portal-ativo', 'empresa')
    } catch {
      /* ignore */
    }
    window.location.reload()
  }

  const navItems = [
    ...ITEMS,
    ...(onOpenConfig ? [{ id: 'config', label: 'Hierarquia', icon: '⚙' }] : []),
  ]

  return (
    <div className="px-shell">
      <div className="px-banner-switch">
        <span>
          Este é o <strong>Admin</strong>. O painel estilo PX (Contratos, Prestadores, Campanhas) fica no login de
          Empresa.
        </span>
        <button type="button" className="px-btn px-btn-primary" onClick={irParaEmpresaDemo}>
          Abrir Painel Empresa agora
        </button>
      </div>
      <header className="px-topbar">
        <div className="px-topbar-left">
          <img src={LOGO_DOCA_LIVRE_SRC} alt="Doca Livre" className="px-topbar-logo" />
          <div>
            <strong className="px-topbar-brand">Painel Administrativo</strong>
            <p className="px-topbar-sub">Doca Livre Mão de Obra</p>
          </div>
        </div>
        <div className="px-topbar-right" style={{ marginLeft: 'auto' }}>
          {onOpenConfig && (
            <button type="button" className="px-btn px-btn-outline" onClick={onOpenConfig}>
              Hierarquia / Permissões
            </button>
          )}
          <button
            type="button"
            className="px-btn px-btn-outline"
            onClick={() => {
              if (confirm('Resetar dados para o seed inicial?')) store.resetDemo()
            }}
          >
            Reset demo
          </button>
          <button type="button" className="px-btn px-btn-ghost" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="px-body">
        <aside className="px-sidebar">
          <nav className="px-sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`px-nav-link ${section === item.id ? 'px-nav-link--active' : ''}`}
                onClick={() => {
                  if (item.id === 'config' && onOpenConfig) {
                    onOpenConfig()
                    return
                  }
                  setSection(item.id)
                }}
              >
                <span className="px-nav-ico" aria-hidden>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="px-main">
          {section === 'dashboard' && <AdminDashboard />}
          {section === 'empresas' && <EmpresasAdmin />}
          {section === 'profissionais' && <ProfissionaisAdmin />}
          {section === 'documentacao' && <CentralDocumentacaoAdmin />}
          {section === 'demandas' && <DemandasAdmin />}
          {section === 'financeiro' && <FinanceiroAdmin />}
          {section === 'auditoria' && <AuditoriaAdmin />}
        </main>
      </div>
      <button type="button" className="px-chat-fab" title="Suporte">
        💬
      </button>
    </div>
  )
}

function AdminDashboard() {
  const { state } = useStore()
  const abertas = state.demandas.filter((d) => d.status === 'aberta').length
  const finalizadas = state.demandas.filter((d) => d.status === 'finalizada').length
  const faturamento = state.pagamentos.reduce((s, p) => s + p.comissao, 0)
  const pendProf = state.profissionais.filter((p) => p.status === 'pendente').length
  const pendEmp = state.empresas.filter((e) => e.status === 'pendente').length
  const porCidade = state.profissionais.reduce<Record<string, number>>((acc, p) => {
    acc[p.endereco.cidade] = (acc[p.endereco.cidade] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="px-page">
      <h1 className="px-title">Dashboard</h1>
      <div className="px-stat-3" style={{ marginBottom: 16 }}>
        <div className="px-mini-card"><span className="muted">Empresas</span><strong>{state.empresas.length}</strong></div>
        <div className="px-mini-card"><span className="muted">Profissionais</span><strong>{state.profissionais.length}</strong></div>
        <div className="px-mini-card"><span className="muted">Demandas abertas</span><strong>{abertas}</strong></div>
        <div className="px-mini-card"><span className="muted">Finalizadas</span><strong>{finalizadas}</strong></div>
        <div className="px-mini-card"><span className="muted">Comissões</span><strong>R$ {faturamento}</strong></div>
        <div className="px-mini-card"><span className="muted">Pendências</span><strong>{pendProf + pendEmp}</strong></div>
      </div>
      <div className="px-card">
        <h3>Profissionais por cidade</h3>
        <ul className="px-list">
          {Object.entries(porCidade).map(([cidade, n]) => (
            <li key={cidade} className="px-list-card">
              <strong>{cidade}</strong>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function EmpresasAdmin() {
  const { state, setEmpresaStatus } = useStore()
  return (
    <div className="px-page">
      <h1 className="px-title">Empresas</h1>
      <ul className="px-list">
        {state.empresas.map((e) => (
          <li key={e.id} className="px-list-card">
            <div>
              <strong>{e.nomeFantasia}</strong>
              <p className="muted">{e.cnpj} · {e.tipo} · {e.plano} · {e.endereco.cidade}</p>
            </div>
            <div className="px-row-actions">
              <span className={`px-status px-status--${e.status}`}>{e.status}</span>
              {e.status !== 'aprovada' && (
                <button type="button" className="px-btn px-btn-primary" onClick={() => setEmpresaStatus(e.id, 'aprovada')}>
                  Aprovar
                </button>
              )}
              {e.status !== 'bloqueada' && (
                <button type="button" className="px-btn px-btn-ghost" onClick={() => setEmpresaStatus(e.id, 'bloqueada')}>
                  Bloquear
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProfissionaisAdmin() {
  const { state, setProfissionalStatus } = useStore()
  return (
    <div className="px-page">
      <h1 className="px-title">Profissionais</h1>
      <ul className="px-list">
        {state.profissionais.map((p) => (
          <li key={p.id} className="px-list-card">
            <div>
              <strong>{p.nome}</strong>
              <p className="muted">
                {p.profissoes.map(cargoLabel).join(', ')} · {p.endereco.cidade} · ★ {p.avaliacaoMedia.toFixed(1)}
              </p>
              <LevelBadge nivel={p.nivel} />
            </div>
            <div className="px-row-actions">
              <span className={`px-status px-status--${p.status}`}>{p.status}</span>
              {p.status !== 'aprovado' && (
                <button type="button" className="px-btn px-btn-primary" onClick={() => setProfissionalStatus(p.id, 'aprovado')}>
                  Aprovar
                </button>
              )}
              {p.status !== 'bloqueado' && (
                <button type="button" className="px-btn px-btn-ghost" onClick={() => setProfissionalStatus(p.id, 'bloqueado')}>
                  Bloquear
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DemandasAdmin() {
  const { state, cancelDemanda } = useStore()
  return (
    <div className="px-page">
      <h1 className="px-title">Demandas</h1>
      <ul className="px-list">
        {state.demandas.map((d) => {
          const emp = state.empresas.find((e) => e.id === d.empresaId)
          return (
            <li key={d.id} className="px-list-card">
              <div>
                <strong>{cargoLabel(d.cargo)}</strong>
                <p className="muted">
                  {emp?.nomeFantasia} · {d.data} · {d.endereco.cidade} · R$ {d.valorDiaria}
                </p>
              </div>
              <div className="px-row-actions">
                <span className={`px-status px-status--${d.status}`}>{d.status}</span>
                {d.status === 'aberta' && (
                  <button type="button" className="px-btn px-btn-ghost" onClick={() => cancelDemanda(d.id)}>
                    Cancelar
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FinanceiroAdmin() {
  const { state } = useStore()
  const total = state.pagamentos.reduce((s, p) => s + p.valor, 0)
  const comissao = state.pagamentos.reduce((s, p) => s + p.comissao, 0)
  return (
    <div className="px-page">
      <h1 className="px-title">Financeiro</h1>
      <div className="px-stat-3" style={{ marginBottom: 16 }}>
        <div className="px-mini-card"><span className="muted">Volume diárias</span><strong>R$ {total}</strong></div>
        <div className="px-mini-card"><span className="muted">Comissões</span><strong>R$ {comissao}</strong></div>
        <div className="px-mini-card"><span className="muted">Pagamentos</span><strong>{state.pagamentos.length}</strong></div>
      </div>
      <ul className="px-list">
        {state.pagamentos.map((p) => (
          <li key={p.id} className="px-list-card">
            <span>R$ {p.valor} (comissão R$ {p.comissao})</span>
            <span className="muted">{p.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AuditoriaAdmin() {
  const { state } = useStore()
  return (
    <div className="px-page">
      <h1 className="px-title">Auditoria</h1>
      <ul className="px-list">
        {state.auditLogs.map((l) => (
          <li key={l.id} className="px-list-card">
            <div>
              <strong>{l.action}</strong>
              <p className="muted">{l.detail}</p>
            </div>
            <span className="muted">{new Date(l.at).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
