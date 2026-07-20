import { useMemo, useState } from 'react'
import { AvailabilityToggle } from '../../components/AvailabilityToggle'
import { ContratoViewer } from '../../components/ContratoViewer'
import { DocumentacaoProfissionalPanel } from '../../components/DocumentacaoPanel'
import { LevelBadge } from '../../components/LevelBadge'
import { cargoLabel } from '../../data/categories'
import { LOGO_DOCA_LIVRE_SRC } from '../../lib/brandAssets'
import { useStore } from '../../lib/store'

const TABS = [
  { id: 'inicio', label: 'Início', icon: '⌂' },
  { id: 'oportunidades', label: 'Oportunidades', icon: '◎' },
  { id: 'agenda', label: 'Agenda', icon: '▦' },
  { id: 'financeiro', label: 'Financeiro', icon: '$' },
  { id: 'perfil', label: 'Perfil', icon: '☺' },
] as const

type TabId = (typeof TABS)[number]['id']

export function ProfissionalApp({ onLogout }: { onLogout: () => void }) {
  const store = useStore()
  const prof = store.currentProfissional
  const [tab, setTab] = useState<TabId>('inicio')

  if (!prof) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <p>Profissional não encontrado.</p>
          <p className="muted" style={{ marginTop: 8 }}>
            Use uma conta de mão de obra (ex.: <strong>carlos</strong> / demo123) ou complete o cadastro.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={onLogout}>
            Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-shell">
      <header className="mobile-header">
        <img src={LOGO_DOCA_LIVRE_SRC} alt="" className="mobile-logo" />
        <div>
          <strong>{prof.nome.split(' ')[0]}</strong>
          <LevelBadge nivel={prof.nivel} />
        </div>
        <button type="button" className="btn btn-ghost" onClick={onLogout}>Sair</button>
      </header>
      <main className="mobile-content">
        {tab === 'inicio' && <HomeTab />}
        {tab === 'oportunidades' && <OportunidadesTab />}
        {tab === 'agenda' && <AgendaTab />}
        {tab === 'financeiro' && <FinanceiroTab />}
        {tab === 'perfil' && <PerfilTab />}
      </main>
      <nav className="bottom-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`bottom-nav-item ${tab === t.id ? 'bottom-nav-item--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function HomeTab() {
  const { currentProfissional, state, updateDisponibilidade } = useStore()
  const prof = currentProfissional!
  const ofertas = state.candidaturas.filter(
    (c) => c.profissionalId === prof.id && c.status === 'pendente',
  ).length
  const agenda = state.candidaturas.filter(
    (c) => c.profissionalId === prof.id && c.status === 'confirmada',
  ).length

  return (
    <div className="panel panel--mobile">
      <h2>Olá, {prof.nome.split(' ')[0]}</h2>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="muted">Ganhos do mês</span>
          <strong>R$ {prof.ganhosMes}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Avaliação</span>
          <strong>★ {prof.avaliacaoMedia.toFixed(1)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Ofertas</span>
          <strong>{ofertas}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Agenda</span>
          <strong>{agenda}</strong>
        </div>
      </div>

      <h3>Disponível agora</h3>
      <p className="muted">A empresa quer saber quem pode trabalhar — não só quem existe.</p>
      <AvailabilityToggle
        value={prof.disponibilidade}
        onChange={(d) => updateDisponibilidade(prof.id, d)}
      />

      {prof.status === 'pendente' && (
        <p className="warning-banner">Seu cadastro aguarda aprovação do admin.</p>
      )}
    </div>
  )
}

function OportunidadesTab() {
  const { currentProfissional, state, acceptOferta, refuseOferta } = useStore()
  const prof = currentProfissional!

  const ofertas = useMemo(() => {
    return state.candidaturas
      .filter((c) => c.profissionalId === prof.id && (c.status === 'pendente' || c.status === 'aceita'))
      .map((c) => {
        const dem = state.demandas.find((d) => d.id === c.demandaId)
        const emp = dem ? state.empresas.find((e) => e.id === dem.empresaId) : null
        return { c, dem, emp }
      })
      .filter((x) => x.dem && x.dem.status === 'aberta')
  }, [state, prof.id])

  return (
    <div className="panel panel--mobile">
      <h2>Oportunidades</h2>
      <ul className="list">
        {ofertas.map(({ c, dem, emp }) => (
          <li key={c.id} className="opportunity-card">
            <div className="opportunity-head">
              <strong>{cargoLabel(dem!.cargo)}</strong>
              <span className="price">R$ {dem!.valorDiaria}</span>
            </div>
            <p className="muted">
              {emp?.nomeFantasia} · ★ {emp?.avaliacaoMedia.toFixed(1)}
            </p>
            <p className="muted">
              {dem!.data} {dem!.horaInicio}–{dem!.horaFim} · {dem!.endereco.cidade} · {c.distanciaKm} km
            </p>
            <p>{dem!.descricao || 'Sem descrição'}</p>
            <div className="row-actions">
              {c.status === 'pendente' && (
                <>
                  <button type="button" className="btn btn-accent" onClick={() => acceptOferta(dem!.id, prof.id)}>
                    Aceitar
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => refuseOferta(dem!.id, prof.id)}>
                    Recusar
                  </button>
                </>
              )}
              {c.status === 'aceita' && (
                <span className="success">Aguardando confirmação da empresa</span>
              )}
            </div>
          </li>
        ))}
        {ofertas.length === 0 && (
          <p className="muted">Nenhuma oferta no momento. Ative sua disponibilidade.</p>
        )}
      </ul>
    </div>
  )
}

function AgendaTab() {
  const { currentProfissional, state, doCheckIn, doCheckOut, addAvaliacao, currentUser } = useStore()
  const prof = currentProfissional!
  const [contratoAberto, setContratoAberto] = useState<string | null>(null)

  const jobs = state.candidaturas
    .filter((c) => c.profissionalId === prof.id && c.status === 'confirmada')
    .map((c) => {
      const dem = state.demandas.find((d) => d.id === c.demandaId)!
      const emp = state.empresas.find((e) => e.id === dem.empresaId)
      const check = state.checkIns.find(
        (ch) => ch.demandaId === c.demandaId && ch.profissionalId === prof.id,
      )
      const contrato = state.contratos.find((ct) => ct.candidaturaId === c.id)
      return { c, dem, emp, check, contrato }
    })

  return (
    <div className="panel panel--mobile">
      <h2>Agenda</h2>
      <ul className="list">
        {jobs.map(({ c, dem, emp, check, contrato }) => (
          <li key={c.id} className="opportunity-card">
            <strong>{cargoLabel(dem.cargo)}</strong>
            <p className="muted">
              {emp?.nomeFantasia} · {dem.data} {dem.horaInicio}
            </p>
            <div className="row-actions">
              {contrato && (
                <button type="button" className="btn btn-primary" onClick={() => setContratoAberto(contrato.id)}>
                  Contrato #{contrato.numero}
                </button>
              )}
              {!check?.checkInAt && (
                <button type="button" className="btn btn-accent" onClick={() => doCheckIn(dem.id, prof.id)}>
                  Check-in (GPS)
                </button>
              )}
              {check?.checkInAt && !check.checkOutAt && (
                <button type="button" className="btn btn-primary" onClick={() => doCheckOut(dem.id, prof.id)}>
                  Check-out
                </button>
              )}
              {check?.checkInAt && (
                <span className="muted">
                  In {new Date(check.checkInAt).toLocaleTimeString()}
                  {check.gpsOk ? ' · GPS ok' : ''}
                </span>
              )}
              {check?.checkOutAt && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    addAvaliacao({
                      demandaId: dem.id,
                      deUserId: currentUser!.id,
                      paraUserId: emp!.userId,
                      deRole: 'profissional',
                      notas: { pontualidade: 5, qualidade: 5, educacao: 5, produtividade: 5 },
                      observacoes: 'Boa operação',
                    })
                  }
                >
                  Avaliar empresa
                </button>
              )}
            </div>
          </li>
        ))}
        {jobs.length === 0 && <p className="muted">Nenhum trabalho confirmado.</p>}
      </ul>
      {contratoAberto && (
        <ContratoViewer
          contratoId={contratoAberto}
          onClose={() => setContratoAberto(null)}
          canAssinar
        />
      )}
    </div>
  )
}

function FinanceiroTab() {
  const { currentProfissional, state } = useStore()
  const prof = currentProfissional!
  const pags = state.pagamentos.filter((p) => p.profissionalId === prof.id)

  return (
    <div className="panel panel--mobile">
      <h2>Financeiro</h2>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="muted">Saldo</span>
          <strong>R$ {prof.saldo}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">PIX</span>
          <strong className="pix-value">{prof.pix}</strong>
        </div>
      </div>
      <h3>Extrato</h3>
      <ul className="list">
        {pags.map((p) => (
          <li key={p.id} className="list-item">
            <span>+ R$ {p.valor}</span>
            <span className="muted">{p.status}</span>
          </li>
        ))}
        {pags.length === 0 && <p className="muted">Sem pagamentos ainda.</p>}
      </ul>
    </div>
  )
}

function PerfilTab() {
  const { currentProfissional } = useStore()
  const prof = currentProfissional!
  const [docsOpen, setDocsOpen] = useState(true)

  return (
    <div className="panel panel--mobile">
      <h2>Perfil</h2>
      <LevelBadge nivel={prof.nivel} />
      <ul className="list profile-list">
        <li><span className="muted">Nome</span><strong>{prof.nome}</strong></li>
        <li><span className="muted">Comparecimento</span><strong>{prof.taxaComparecimento}%</strong></li>
        <li><span className="muted">Faltas</span><strong>{prof.faltas}</strong></li>
        <li><span className="muted">Resposta média</span><strong>{prof.tempoRespostaMin} min</strong></li>
        <li><span className="muted">Profissões</span><strong>{prof.profissoes.map(cargoLabel).join(', ')}</strong></li>
        <li><span className="muted">CNH</span><strong>{prof.cnhCategoria ?? '—'}</strong></li>
        <li><span className="muted">Cidade</span><strong>{prof.endereco.cidade}/{prof.endereco.estado}</strong></li>
        <li><span className="muted">Status</span><strong>{prof.status}</strong></li>
      </ul>

      <div className="docs-mobile-head">
        <h3>Meus documentos</h3>
        <button type="button" className="btn btn-ghost" onClick={() => setDocsOpen((v) => !v)}>
          {docsOpen ? 'Ocultar' : 'Abrir'}
        </button>
      </div>
      {docsOpen && <DocumentacaoProfissionalPanel profissional={prof} />}
    </div>
  )
}
