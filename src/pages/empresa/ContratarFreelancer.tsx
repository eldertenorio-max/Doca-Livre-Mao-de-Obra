import { useMemo, useState } from 'react'
import { CATEGORIES, cargoLabel } from '../../data/categories'
import { analisarCurriculos, REQUISITOS_BUSCA, type CurriculoAnalisado } from '../../lib/analiseCurriculo'
import { LOGO_DOCA_LIVRE_SRC } from '../../lib/brandAssets'
import { useStore } from '../../lib/store'
import './contratar.css'

function dataLocal(offsetDias = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

function diasEntre(inicio: string, fim: string) {
  const a = new Date(`${inicio}T12:00:00`)
  const b = new Date(`${fim}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1
}

export function ContratarFreelancer({ onLogout }: { onLogout: () => void }) {
  const { currentEmpresa, state } = useStore()
  const empresa = currentEmpresa!
  const [cargoId, setCargoId] = useState('empilhadeira')
  const [requisitos, setRequisitos] = useState<string[]>(['NR11'])
  const [inicio, setInicio] = useState(dataLocal(1))
  const [fim, setFim] = useState(dataLocal(5))
  const [cidade, setCidade] = useState(empresa.endereco.cidade)
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState('')
  const [resultados, setResultados] = useState<CurriculoAnalisado[] | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)

  const dias = diasEntre(inicio, fim)
  const base = state.profissionais.filter((p) => p.status === 'aprovado').length

  const cargoAtual = useMemo(
    () => CATEGORIES.flatMap((c) => c.cargos).find((c) => c.id === cargoId),
    [cargoId],
  )

  function aoMudarCargo(id: string) {
    setCargoId(id)
    const cargo = CATEGORIES.flatMap((c) => c.cargos).find((c) => c.id === id)
    setRequisitos(cargo?.requisitos ?? [])
    setResultados(null)
  }

  function alternarRequisito(req: string) {
    setRequisitos((atual) =>
      atual.includes(req) ? atual.filter((r) => r !== req) : [...atual, req],
    )
  }

  function analisar() {
    if (!cargoId) {
      setErro('Escolha o tipo de profissional.')
      return
    }
    if (!inicio || !fim || dias < 1) {
      setErro('O fim do contrato precisa ser no mesmo dia ou depois do início.')
      return
    }
    setErro('')
    const lista = analisarCurriculos({
      pedido: {
        cargoId,
        requisitos,
        inicio,
        fim,
        cidade,
        observacoes,
      },
      empresa,
      profissionais: state.profissionais,
      documentos: state.documentos,
      demandas: state.demandas,
      candidaturas: state.candidaturas,
    })
    setResultados(lista)
    setAberto(lista[0]?.profissional.id ?? null)
  }

  const disponiveis = resultados?.filter((r) => r.situacao !== 'sobreposto') ?? []
  const bloqueadosPeriodo = resultados?.filter((r) => r.situacao === 'sobreposto') ?? []

  return (
    <div className="cf-shell">
      <header className="cf-top">
        <div className="cf-brand">
          <img src={LOGO_DOCA_LIVRE_SRC} alt="Doca Livre" />
          <div>
            <strong>{empresa.nomeFantasia}</strong>
            <span>Contratação de freelancer</span>
          </div>
        </div>
        <div className="cf-top-actions">
          <button type="button" className="cf-ghost" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="cf-main">
        <div className="cf-wrap">
          <div className="cf-intro">
            <h1>Quem você precisa contratar</h1>
            <p>
              Defina o cargo, o que a pessoa precisa comprovar, o período do contrato e o que mais
              importa na operação. A busca lê os currículos de quem já se cadastrou procurando trabalho
              e ordena quem mais se aproxima do pedido. Hoje há {base} currículos aprovados na base.
            </p>
          </div>

          <section className="cf-card">
            <div className="cf-grid">
              <div>
                <label className="cf-field">
                  <span>Tipo de profissional</span>
                  <select value={cargoId} onChange={(e) => aoMudarCargo(e.target.value)}>
                    {CATEGORIES.map((cat) => (
                      <optgroup key={cat.id} label={cat.label}>
                        {cat.cargos.map((cargo) => (
                          <option key={cargo.id} value={cargo.id}>
                            {cargo.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>

                <p className="cf-label">Requisitos que a pessoa deve ter</p>
                <p className="muted">
                  Sugestão do cargo{cargoAtual ? ` (${cargoAtual.label})` : ''}. Inclua ou retire o que
                  esta operação exige.
                </p>
                <div className="cf-chips" style={{ margin: '8px 0 14px' }}>
                  {REQUISITOS_BUSCA.map((req) => (
                    <button
                      key={req}
                      type="button"
                      className={`cf-chip ${requisitos.includes(req) ? 'cf-chip--on' : ''}`}
                      onClick={() => alternarRequisito(req)}
                    >
                      {req}
                    </button>
                  ))}
                </div>

                <label className="cf-field">
                  <span>Cidade da operação</span>
                  <input value={cidade} onChange={(e) => setCidade(e.target.value)} />
                </label>
              </div>

              <div>
                <p className="cf-label">Tempo de contrato</p>
                <div className="cf-dates">
                  <label className="cf-field">
                    <span>Início</span>
                    <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
                  </label>
                  <label className="cf-field">
                    <span>Fim</span>
                    <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
                  </label>
                </div>
                <div className="cf-rule">
                  {dias >= 1
                    ? `Este pedido cobre ${dias} dia${dias === 1 ? '' : 's'}. `
                    : 'Informe um período válido. '}
                  Cada contrato tem começo e fim. A pessoa pode pegar outro contrato na mesma empresa
                  em seguida, quando o anterior já tiver terminado. Dois contratos ao mesmo tempo, no
                  mesmo período e na mesma empresa, não são oferecidos.
                </div>

                <label className="cf-field">
                  <span>Observações da operação</span>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex.: turno da noite, câmara fria, experiência com rota SP-Campinas, EAR."
                  />
                </label>
              </div>
            </div>

            {erro && <p className="error">{erro}</p>}
            <div className="cf-actions">
              <button type="button" className="cf-primary" onClick={analisar}>
                Analisar currículos
              </button>
              <span className="muted">A ordem sai da comparação entre o pedido e cada currículo.</span>
            </div>
          </section>

          {resultados && (
            <section className="cf-results">
              <h2>
                {disponiveis.length} {disponiveis.length === 1 ? 'pessoa acompanha' : 'pessoas acompanham'} este pedido
              </h2>
              <p className="muted">
                Cargo {cargoLabel(cargoId)}
                {requisitos.length ? ` · ${requisitos.join(', ')}` : ''} · {dias} dia{dias === 1 ? '' : 's'} em {cidade || empresa.endereco.cidade}
              </p>

              <div className="cf-list">
                {disponiveis.map((item) => (
                  <PessoaCard
                    key={item.profissional.id}
                    item={item}
                    aberto={aberto === item.profissional.id}
                    onToggle={() =>
                      setAberto((id) => (id === item.profissional.id ? null : item.profissional.id))
                    }
                  />
                ))}
                {disponiveis.length === 0 && (
                  <div className="cf-card">
                    <strong>Nenhum currículo aprovado ficou disponível para este pedido.</strong>
                    <p className="muted">Ajuste o cargo, a cidade ou os requisitos e analise de novo.</p>
                  </div>
                )}
              </div>

              {bloqueadosPeriodo.length > 0 && (
                <>
                  <h2 style={{ marginTop: 22 }}>Fora deste período</h2>
                  <p className="muted">Já têm contrato com a sua empresa nas mesmas datas.</p>
                  <div className="cf-list">
                    {bloqueadosPeriodo.map((item) => (
                      <PessoaCard
                        key={item.profissional.id}
                        item={item}
                        aberto={aberto === item.profissional.id}
                        onToggle={() =>
                          setAberto((id) => (id === item.profissional.id ? null : item.profissional.id))
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function PessoaCard({
  item,
  aberto,
  onToggle,
}: {
  item: CurriculoAnalisado
  aberto: boolean
  onToggle: () => void
}) {
  const p = item.profissional
  const pill =
    item.situacao === 'sobreposto' ? 'cf-pill cf-pill--bad' : item.situacao === 'seguido' ? 'cf-pill cf-pill--warn' : 'cf-pill cf-pill--ok'
  const pillLabel =
    item.situacao === 'sobreposto' ? 'Período ocupado' : item.situacao === 'seguido' ? 'Contrato seguido' : 'Pode contratar'

  return (
    <article className={`cf-person ${item.situacao === 'sobreposto' ? 'cf-person--block' : ''}`}>
      <div className="cf-score" aria-label={`Aderência ${item.score}`}>
        {item.score}
        <small>aderência</small>
      </div>
      <div>
        <h3>{p.nome}</h3>
        <p className="muted">
          {p.profissoes.map(cargoLabel).join(' · ')} · {p.endereco.cidade}/{p.endereco.estado} · avaliação {p.avaliacaoMedia.toFixed(1)}
        </p>
        <div className="cf-meta">
          <span className={pill}>{pillLabel}</span>
          {p.cnhCategoria && <span className="cf-pill">CNH {p.cnhCategoria}</span>}
          {p.certificados.map((c) => (
            <span key={c.tipo} className="cf-pill">
              {c.tipo}
            </span>
          ))}
        </div>
        <p className="cf-leitura">{item.leitura}</p>
        <div className="cf-cols">
          <div>
            <strong>Por que aparece</strong>
            <ul>
              {item.aderencias.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>O que pesa contra</strong>
            {item.falhas.length === 0 ? (
              <p className="muted">Nada relevante fora do pedido.</p>
            ) : (
              <ul>
                {item.falhas.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <button type="button" className="cf-open" onClick={onToggle}>
          {aberto ? 'Ocultar currículo' : 'Ver currículo'}
        </button>
        {aberto && (
          <div className="cf-cv">
            <span>Telefone {p.telefone}</span>
            <span>
              Comparecimento {p.taxaComparecimento}% · faltas {p.faltas} · responde em cerca de {p.tempoRespostaMin} min
            </span>
            {p.experiencia.map((e) => (
              <span key={`${e.empresa}-${e.inicio}`}>
                {e.cargo} · {e.empresa} · {e.inicio} a {e.fim}. {e.descricao}
              </span>
            ))}
            <span className="muted">{item.situacaoTexto}</span>
          </div>
        )}
      </div>
    </article>
  )
}
