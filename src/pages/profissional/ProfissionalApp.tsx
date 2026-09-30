import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AvailabilityToggle } from '../../components/AvailabilityToggle'
import { BibliotecaDocumental } from '../../components/BibliotecaDocumental'
import { ContratoViewer } from '../../components/ContratoViewer'
import { DocumentacaoProfissionalPanel } from '../../components/DocumentacaoPanel'
import { LevelBadge } from '../../components/LevelBadge'
import { cargoLabel } from '../../data/categories'
import { pendenciasParaIniciar } from '../../lib/dossieTemporario'
import { BRAND_PRODUCT_NAME, LOGO_DOCA_LIVRE_SRC } from '../../lib/brandAssets'
import { useStore } from '../../lib/store'
import '../empresa/contratar.css'

const TABS = [
  { id: 'inicio', label: 'Início', icon: <IconeInicio /> },
  { id: 'oportunidades', label: 'Oportunidades', icon: <IconeOportunidades /> },
  { id: 'agenda', label: 'Missões', icon: <IconeMissoes /> },
  { id: 'financeiro', label: 'Financeiro', icon: <IconeFinanceiro /> },
  { id: 'perfil', label: 'Perfil', icon: <IconePerfil /> },
] as const

type TabId = (typeof TABS)[number]['id']

export function ProfissionalApp({ onLogout }: { onLogout: () => void }) {
  const store = useStore()
  const prof = store.currentProfissional
  const [tab, setTab] = useState<TabId>('inicio')
  const [menuFixo, setMenuFixo] = useState(false)
  const [menuHover, setMenuHover] = useState(false)
  const [telaEstreita, setTelaEstreita] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)')
    const atualizar = () => setTelaEstreita(mq.matches)
    atualizar()
    mq.addEventListener('change', atualizar)
    return () => mq.removeEventListener('change', atualizar)
  }, [])

  const menuAberto = menuFixo || (!telaEstreita && menuHover)

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
    <div className="cf-shell">
      <header className="cf-topbar">
        <div className="cf-topbar-left">
          <button
            type="button"
            className="cf-topbar-menu"
            aria-label={menuFixo ? 'Recolher menu lateral' : 'Fixar menu expandido'}
            aria-pressed={menuFixo}
            onClick={() => setMenuFixo((valor) => !valor)}
          >
            <span className="cf-topbar-menu-icon" aria-hidden />
          </button>
          <div className="cf-topbar-brand">
            <img src={LOGO_DOCA_LIVRE_SRC} alt="Doca Livre" className="cf-topbar-logo" />
            <span className="cf-product">{BRAND_PRODUCT_NAME}</span>
          </div>
        </div>
        <div className="cf-topbar-right">
          <div className="cf-topbar-user">
            <span>
              <strong>{prof.nome.split(' ')[0]}</strong>
              <small>Trabalhador</small>
            </span>
            <LevelBadge nivel={prof.nivel} />
            <span className="cf-avatar-topo" aria-hidden>
              {iniciais(prof.nome)}
            </span>
          </div>
          <button type="button" className="cf-sair" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="cf-workspace">
        {menuHover && !menuFixo && !telaEstreita && <div className="cf-menu-rail" aria-hidden />}
        {menuFixo && telaEstreita && (
          <button type="button" className="cf-menu-backdrop" aria-label="Fechar menu" onClick={() => setMenuFixo(false)} />
        )}
        <aside
          className={`cf-menu ${menuAberto ? 'cf-menu--wide' : ''} ${menuHover && !menuFixo ? 'cf-menu--flyout' : ''} ${menuFixo ? 'cf-menu--pinned' : ''}`}
          onMouseEnter={() => setMenuHover(true)}
          onMouseLeave={() => setMenuHover(false)}
        >
          <nav className="cf-menu-body" aria-label="Conta do trabalhador">
            {TABS.map((item) => {
              const ativo = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`cf-menu-link ${ativo ? 'cf-menu-link--on' : ''}`}
                  aria-current={ativo ? 'page' : undefined}
                  title={menuAberto ? undefined : item.label}
                  onClick={() => {
                    setTab(item.id)
                    if (telaEstreita) setMenuFixo(false)
                  }}
                >
                  <span className="cf-menu-icon">{item.icon}</span>
                  <span className="cf-menu-label">{item.label}</span>
                  <span className="cf-menu-chevron" aria-hidden>
                    ›
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>
        <main className="cf-main">
          <div className="cf-wrap">
            {tab === 'inicio' && <HomeTab />}
            {tab === 'oportunidades' && <OportunidadesTab />}
            {tab === 'agenda' && <AgendaTab />}
            {tab === 'financeiro' && <FinanceiroTab />}
            {tab === 'perfil' && <PerfilTab />}
          </div>
        </main>
      </div>
    </div>
  )
}

function IconeBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      {children}
    </svg>
  )
}

function IconeInicio() {
  return (
    <IconeBase>
      <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </IconeBase>
  )
}

function IconeOportunidades() {
  return (
    <IconeBase>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </IconeBase>
  )
}

function IconeMissoes() {
  return (
    <IconeBase>
      <path d="M3 16V8h10v8M13 11h4l3 3v2h-7" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx="7" cy="16.5" r="1.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17" cy="16.5" r="1.5" stroke="currentColor" strokeWidth="1.75" />
    </IconeBase>
  )
}

function IconeFinanceiro() {
  return (
    <IconeBase>
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="16" cy="14.5" r="1.2" fill="currentColor" />
    </IconeBase>
  )
}

function IconePerfil() {
  return (
    <IconeBase>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5 19.5c1.2-3 3.6-4.5 7-4.5s5.8 1.5 7 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </IconeBase>
  )
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] ?? '' : ''
  return `${primeira}${ultima}`.toUpperCase()
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

      <h3>Disponível para missões temporárias</h3>
      <p className="muted">A empresa tomadora vê quem pode ser colocado em uma missão.</p>
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
              <strong>{c.status === 'pendente' ? 'Nova oportunidade' : 'Interesse registrado'}</strong>
              <span className="price">{dem!.valorDiaria ? `R$ ${dem!.valorDiaria}` : 'A combinar'}</span>
            </div>
            <p>
              <strong>{cargoLabel(dem!.cargo)}</strong>
            </p>
            <p className="muted">Empresa: {emp?.nomeFantasia}</p>
            <p className="muted">Local: {dem!.endereco.cidade}</p>
            <p className="muted">
              Período: {dem!.data}
              {dem!.dataFim ? ` → ${dem!.dataFim}` : ''}
            </p>
            <p className="muted">
              Horário: {dem!.horaInicio} → {dem!.horaFim}
            </p>
            {dem!.motivo && <p className="muted">Motivo da contratação temporária informado pela tomadora.</p>}
            <p>{dem!.descricao || dem!.atividades || 'Missão temporária'}</p>
            <div className="row-actions">
              {c.status === 'pendente' && (
                <>
                  <button type="button" className="btn btn-accent" onClick={() => acceptOferta(dem!.id, prof.id)}>
                    Tenho interesse
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => refuseOferta(dem!.id, prof.id)}>
                    Não tenho interesse
                  </button>
                </>
              )}
              {c.status === 'aceita' && (
                <span className="success">Interesse registrado. Segue a validação documental e o contrato temporário.</span>
              )}
            </div>
          </li>
        ))}
        {ofertas.length === 0 && (
          <p className="muted">Nenhuma missão no momento. Mantenha o perfil e a disponibilidade atualizados.</p>
        )}
      </ul>
    </div>
  )
}

function AgendaTab() {
  const { currentProfissional, state, doCheckIn, doCheckOut, addAvaliacao, currentUser, registrarEncerramento } = useStore()
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
    .filter((job) => job.dem)

  return (
    <div className="panel panel--mobile">
      <h2>Minhas missões</h2>
      <ul className="list">
        {jobs.map(({ c, dem, emp, check, contrato }) => {
          const encerrada = dem.status === 'finalizada'
          const dias = dem.dataFim
            ? Math.round(
                (new Date(`${dem.dataFim}T12:00:00`).getTime() - new Date(`${dem.data}T12:00:00`).getTime()) /
                  86400000,
              ) + 1
            : 1
          const faltas = pendenciasParaIniciar({
            pecas: state.pecas ?? [],
            documentos: state.documentos,
            demandaId: dem.id,
            profissionalId: prof.id,
          })
          return (
            <li key={c.id} className="opportunity-card">
              <strong>Missão {dem.id.replace('dem_', '#')}</strong>
              <p>{cargoLabel(dem.cargo)}</p>
              <p className="muted">
                {emp?.nomeFantasia} · {dem.data}
                {dem.dataFim ? ` → ${dem.dataFim}` : ''}
              </p>
              <p>{encerrada ? 'Encerrada' : faltas.length ? 'Aguardando admissão' : 'Em andamento'}</p>
              {faltas.length > 0 && !encerrada && (
                <p className="muted">Entrada bloqueada até concluir: {faltas.join('; ')}.</p>
              )}
              {encerrada && (
                <p className="muted">
                  Dias da missão: {dias}
                  {check?.horasTrabalhadas ? ` · Horas registradas: ${check.horasTrabalhadas}h` : ''}
                </p>
              )}
              <div className="row-actions">
                {contrato && (
                  <button type="button" className="btn btn-primary" onClick={() => setContratoAberto(contrato.id)}>
                    Contrato temporário {contrato.numero}
                  </button>
                )}
                {!encerrada && !check?.checkInAt && faltas.length === 0 && (
                  <button type="button" className="btn btn-accent" onClick={() => doCheckIn(dem.id, prof.id)}>
                    Registrar entrada
                  </button>
                )}
                {!encerrada && check?.checkInAt && !check.checkOutAt && (
                  <button type="button" className="btn btn-primary" onClick={() => doCheckOut(dem.id, prof.id)}>
                    Registrar saída
                  </button>
                )}
                {check?.checkInAt && (
                  <span className="muted">
                    Entrada {new Date(check.checkInAt).toLocaleTimeString()}
                    {check.checkOutAt ? ` · Saída ${new Date(check.checkOutAt).toLocaleTimeString()}` : ''}
                  </span>
                )}
                {!encerrada && check?.checkOutAt && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      registrarEncerramento({
                        demandaId: dem.id,
                        dataEfetiva: new Date().toISOString().slice(0, 10),
                        motivo: 'término no prazo',
                        responsavel: 'ett',
                        observacoes: 'Encerramento ao fim da jornada registrada.',
                        profissionalId: prof.id,
                      })
                    }
                  >
                    Encerrar missão
                  </button>
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
                        observacoes: 'Missão encerrada',
                      })
                    }
                  >
                    Avaliar empresa
                  </button>
                )}
              </div>
            </li>
          )
        })}
        {jobs.length === 0 && <p className="muted">Nenhuma missão confirmada. Quando houver contrato, ela aparece aqui.</p>}
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
        <li><span className="muted">Cargo principal</span><strong>{prof.profissoes[0] ? cargoLabel(prof.profissoes[0]) : '—'}</strong></li>
        <li>
          <span className="muted">Experiências</span>
          <strong>
            {prof.experiencia.length
              ? prof.experiencia.map((e) => `${e.cargo} · ${e.empresa} · ${e.inicio}–${e.fim}`).join(' | ')
              : '—'}
          </strong>
        </li>
        <li>
          <span className="muted">Certificados</span>
          <strong>{prof.certificados.length ? prof.certificados.map((c) => c.tipo).join(', ') : '—'}</strong>
        </li>
        <li><span className="muted">Status</span><strong>{prof.status}</strong></li>
      </ul>

      <div className="docs-mobile-head">
        <h3>Meus documentos</h3>
        <button type="button" className="btn btn-ghost" onClick={() => setDocsOpen((v) => !v)}>
          {docsOpen ? 'Ocultar' : 'Abrir'}
        </button>
      </div>
      {docsOpen && <DocumentacaoProfissionalPanel profissional={prof} />}
      <BibliotecaDocumental modo="trabalhador" />
    </div>
  )
}
