import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { CATEGORIES, cargoLabel } from '../../data/categories'
import { CIDADES_OPERACAO } from '../../data/cidades'
import { analisarCurriculos, requisitosDoCargo, type CurriculoAnalisado } from '../../lib/analiseCurriculo'
import {
  AVISO_FORMALIZACAO,
  MODALIDADES,
  rotuloModalidade,
  validarNecessidade,
  type Modalidade,
} from '../../lib/modalidadeContratacao'
import { LOGO_DOCA_LIVRE_SRC } from '../../lib/brandAssets'
import { useStore } from '../../lib/store'
import './contratar.css'

function dataLocal(offsetDias = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

function semAcento(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function CampoCidade({
  value,
  onChange,
  cidades,
}: {
  value: string
  onChange: (cidade: string) => void
  cidades: string[]
}) {
  const listaId = useId()
  const caixa = useRef<HTMLDivElement>(null)
  const [aberta, setAberta] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [destaque, setDestaque] = useState(0)

  const opcoes = useMemo(() => {
    const unicas = [...new Set(cidades.map((c) => c.trim()).filter(Boolean))]
    unicas.sort((a, b) => a.localeCompare(b, 'pt-BR'))
    const termo = semAcento(consulta.trim())
    if (!termo) return unicas
    return unicas
      .filter((cidade) => semAcento(cidade).includes(termo))
      .sort((a, b) => {
        const aComeca = semAcento(a).startsWith(termo) ? 0 : 1
        const bComeca = semAcento(b).startsWith(termo) ? 0 : 1
        if (aComeca !== bComeca) return aComeca - bComeca
        return a.localeCompare(b, 'pt-BR')
      })
  }, [cidades, consulta])

  useEffect(() => {
    setDestaque(0)
  }, [consulta, aberta])

  useEffect(() => {
    if (!aberta) return
    function fecharAoClicarFora(evento: MouseEvent) {
      if (!caixa.current?.contains(evento.target as Node)) setAberta(false)
    }
    document.addEventListener('mousedown', fecharAoClicarFora)
    return () => document.removeEventListener('mousedown', fecharAoClicarFora)
  }, [aberta])

  function escolher(cidade: string) {
    onChange(cidade)
    setConsulta('')
    setAberta(false)
  }

  return (
    <div className="cf-field cf-city" ref={caixa}>
      <span id={`${listaId}-label`}>Cidade da operação</span>
      <input
        role="combobox"
        aria-expanded={aberta}
        aria-controls={listaId}
        aria-labelledby={`${listaId}-label`}
        aria-autocomplete="list"
        value={aberta && consulta !== '' ? consulta : value}
        placeholder="Clique para ver as cidades ou digite o nome"
        onClick={() => setAberta(true)}
        onFocus={(e) => {
          setConsulta('')
          setAberta(true)
          e.currentTarget.select()
        }}
        onChange={(e) => {
          setConsulta(e.target.value)
          onChange(e.target.value)
          setAberta(true)
        }}
        onKeyDown={(e) => {
          if (!aberta && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            setAberta(true)
            return
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setDestaque((i) => Math.min(i + 1, Math.max(opcoes.length - 1, 0)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setDestaque((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && aberta && opcoes[destaque]) {
            e.preventDefault()
            escolher(opcoes[destaque])
          } else if (e.key === 'Escape') {
            setAberta(false)
            setConsulta('')
          }
        }}
      />
      {aberta && (
        <ul className="cf-city-list" id={listaId} role="listbox">
          {opcoes.length === 0 && <li className="cf-city-empty muted">Nenhuma cidade com esse nome.</li>}
          {opcoes.map((cidade, indice) => (
            <li key={cidade}>
              <button
                type="button"
                role="option"
                aria-selected={indice === destaque}
                className={indice === destaque ? 'cf-city-list--on' : undefined}
                onMouseEnter={() => setDestaque(indice)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(cidade)}
              >
                {cidade}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
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
  const [requisitos, setRequisitos] = useState<string[]>(() => requisitosDoCargo('empilhadeira').padrao)
  const [inicio, setInicio] = useState(dataLocal(1))
  const [fim, setFim] = useState(dataLocal(5))
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim, setHoraFim] = useState('18:00')
  const [quantidade, setQuantidade] = useState(1)
  const [modalidade, setModalidade] = useState<Modalidade | ''>('')
  const [cidade, setCidade] = useState(empresa.endereco.cidade)
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState('')
  const [resultados, setResultados] = useState<CurriculoAnalisado[] | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<CurriculoAnalisado | null>(null)

  const dias = diasEntre(inicio, fim)
  const avisoModalidade = modalidade ? validarNecessidade(modalidade, inicio, fim) : null
  const base = state.profissionais.filter((p) => p.status === 'aprovado').length

  const cargoAtual = useMemo(
    () => CATEGORIES.flatMap((c) => c.cargos).find((c) => c.id === cargoId),
    [cargoId],
  )
  const opcoesRequisito = requisitosDoCargo(cargoId).opcoes

  function aoMudarCargo(id: string) {
    setCargoId(id)
    setRequisitos(requisitosDoCargo(id).padrao)
    setResultados(null)
  }

  function alternarRequisito(req: string) {
    setRequisitos((atual) =>
      atual.includes(req) ? atual.filter((r) => r !== req) : [...atual, req],
    )
  }

  function analisar() {
    if (!cargoId) {
      setErro('Escolha o cargo.')
      return
    }
    if (!modalidade) {
      setErro('Escolha a modalidade pretendida. As datas sozinhas não definem o tipo de contratação.')
      return
    }
    if (quantidade < 1) {
      setErro('Informe quantos profissionais a operação precisa.')
      return
    }
    if (!horaInicio || !horaFim) {
      setErro('Informe a jornada.')
      return
    }
    const aviso = validarNecessidade(modalidade, inicio, fim)
    if (aviso.nivel === 'bloqueio') {
      setErro(aviso.texto)
      return
    }
    setErro('')
    setSelecionado(null)
    const lista = analisarCurriculos({
      pedido: {
        cargoId,
        requisitos,
        inicio,
        fim,
        cidade,
        observacoes,
        modalidade,
        quantidade,
        horaInicio,
        horaFim,
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

  const disponiveis = resultados?.filter((r) => r.situacao !== 'bloqueado') ?? []
  const bloqueadosPeriodo = resultados?.filter((r) => r.situacao === 'bloqueado') ?? []

  return (
    <div className="cf-shell">
      <header className="cf-top">
        <div className="cf-brand">
          <img src={LOGO_DOCA_LIVRE_SRC} alt="Doca Livre" />
          <div>
            <strong>{empresa.nomeFantasia}</strong>
            <span>Pedido de mão de obra</span>
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
            <h1>Necessidade de mão de obra</h1>
            <p>
              Informe o cargo, o local, o período, a jornada e a modalidade pretendida. As datas
              descrevem a necessidade da operação. A contratação só é formalizada depois que você
              escolhe a pessoa. Hoje há {base} currículos aprovados na base.
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
                  Requisitos de {cargoAtual?.label ?? 'este cargo'}. Os marcados já vêm com o tipo.
                  Inclua ou retire o que esta operação exige.
                </p>
                <div className="cf-chips" style={{ margin: '8px 0 14px' }}>
                  {opcoesRequisito.map((req) => (
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

                <CampoCidade
                  value={cidade}
                  onChange={setCidade}
                  cidades={[
                    ...CIDADES_OPERACAO,
                    ...state.profissionais.map((p) => p.endereco.cidade),
                    ...state.empresas.map((e) => e.endereco.cidade),
                    ...state.enderecosEmpresa.map((e) => e.cidade),
                  ]}
                />
              </div>

              <div>
                <label className="cf-field">
                  <span>Modalidade pretendida</span>
                  <select
                    value={modalidade}
                    onChange={(e) => {
                      setModalidade(e.target.value as Modalidade | '')
                      setResultados(null)
                      setSelecionado(null)
                    }}
                  >
                    <option value="">Selecione</option>
                    {MODALIDADES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="cf-field">
                  <span>Quantidade de profissionais</span>
                  <input
                    type="number"
                    min={1}
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                  />
                </label>

                <p className="cf-label">Período da necessidade</p>
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
                <p className="muted" style={{ marginTop: -6 }}>
                  {dias >= 1 ? `Duração: ${dias} dia${dias === 1 ? '' : 's'}.` : 'Informe um período válido.'}
                </p>

                <p className="cf-label">Jornada / turno</p>
                <div className="cf-dates">
                  <label className="cf-field">
                    <span>Das</span>
                    <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                  </label>
                  <label className="cf-field">
                    <span>Às</span>
                    <input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
                  </label>
                </div>

                <div className={`cf-rule ${avisoModalidade?.nivel === 'bloqueio' ? 'cf-rule--block' : ''}`}>
                  <p>{AVISO_FORMALIZACAO}</p>
                  {avisoModalidade && <p>{avisoModalidade.texto}</p>}
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
              <button
                type="button"
                className="cf-primary"
                onClick={analisar}
                disabled={avisoModalidade?.nivel === 'bloqueio'}
              >
                Analisar currículos
              </button>
              <span className="muted">A ordem compara o pedido com cada currículo. A formalização vem depois.</span>
            </div>
          </section>

          {resultados && (
            <section className="cf-results">
              <h2>
                {disponiveis.length} {disponiveis.length === 1 ? 'pessoa acompanha' : 'pessoas acompanham'} esta necessidade
              </h2>
              <p className="muted">
                {cargoLabel(cargoId)} · {quantidade} profissional{quantidade === 1 ? '' : 'is'} · {dias} dia{dias === 1 ? '' : 's'} · {horaInicio}–{horaFim} · {cidade || empresa.endereco.cidade}
                {modalidade ? ` · ${rotuloModalidade(modalidade)}` : ''}
                {requisitos.length ? ` · ${requisitos.join(', ')}` : ''}
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
                    onSelecionar={() => setSelecionado(item)}
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
                  <h2 style={{ marginTop: 22 }}>Fora desta modalidade ou deste período</h2>
                  <p className="muted">A regra da modalidade pretendida não permite seguir com estas pessoas agora.</p>
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

              {selecionado && modalidade && (
                <div className="cf-card" style={{ marginTop: 16 }}>
                  <h2 style={{ marginTop: 0 }}>Formalização, depois da escolha</h2>
                  <p>
                    {selecionado.profissional.nome} foi indicado para a necessidade de {cargoLabel(cargoId)},{' '}
                    {quantidade} profissional{quantidade === 1 ? '' : 'is'}, de {inicio.split('-').reverse().join('/')} a{' '}
                    {fim.split('-').reverse().join('/')} ({horaInicio}–{horaFim}), em {cidade}.
                  </p>
                  <p>
                    Modalidade pretendida: <strong>{rotuloModalidade(modalidade)}</strong>.
                  </p>
                  <p className="muted">{selecionado.situacaoTexto}</p>
                  <p>
                    O sistema não gera contrato trabalhista só porque existem data de início e fim. O próximo
                    passo é a formalização própria dessa modalidade, com os requisitos legais dela.
                  </p>
                </div>
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
  onSelecionar,
}: {
  item: CurriculoAnalisado
  aberto: boolean
  onToggle: () => void
  onSelecionar?: () => void
}) {
  const p = item.profissional
  const pill =
    item.situacao === 'bloqueado'
      ? 'cf-pill cf-pill--bad'
      : item.situacao === 'alerta'
        ? 'cf-pill cf-pill--warn'
        : 'cf-pill cf-pill--ok'
  const pillLabel =
    item.situacao === 'bloqueado'
      ? 'Não segue nesta modalidade'
      : item.situacao === 'alerta'
        ? 'Atenção na modalidade'
        : 'Compatível com a modalidade'

  return (
    <article className={`cf-person ${item.situacao === 'bloqueado' ? 'cf-person--block' : ''}`}>
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
        <div className="cf-actions">
          <button type="button" className="cf-open" onClick={onToggle}>
            {aberto ? 'Ocultar currículo' : 'Ver currículo'}
          </button>
          {onSelecionar && item.situacao !== 'bloqueado' && (
            <button type="button" className="cf-primary" onClick={onSelecionar}>
              Selecionar para formalização
            </button>
          )}
        </div>
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
