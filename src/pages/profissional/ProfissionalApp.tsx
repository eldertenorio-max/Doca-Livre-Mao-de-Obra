import { useMemo, useState } from 'react'
import { AvailabilityToggle } from '../../components/AvailabilityToggle'
import { BibliotecaDocumental } from '../../components/BibliotecaDocumental'
import { ContratoViewer } from '../../components/ContratoViewer'
import { DocumentacaoProfissionalPanel } from '../../components/DocumentacaoPanel'
import { LevelBadge } from '../../components/LevelBadge'
import { cargoLabel } from '../../data/categories'
import { pendenciasParaIniciar } from '../../lib/dossieTemporario'
import { LOGO_DOCA_LIVRE_SRC } from '../../lib/brandAssets'
import { useStore } from '../../lib/store'

const TABS = [
  { id: 'inicio', label: 'Início', icon: '⌂' },
  { id: 'oportunidades', label: 'Oportunidades', icon: '◎' },
  { id: 'agenda', label: 'Missões', icon: '▦' },
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
