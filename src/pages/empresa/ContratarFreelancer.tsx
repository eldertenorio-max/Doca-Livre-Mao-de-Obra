import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { CATEGORIES, cargoLabel } from '../../data/categories'
import { CIDADES_OPERACAO } from '../../data/cidades'
import { analisarCurriculos, requisitosDoCargo, type CurriculoAnalisado } from '../../lib/analiseCurriculo'
import {
  AVISO_FORMALIZACAO,
  MOTIVOS_TEMPORARIOS,
  rotuloMotivo,
  validarNecessidade,
  type MotivoTemporario,
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

function formatarDataBr(iso: string) {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
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
  const [motivo, setMotivo] = useState<MotivoTemporario | ''>('')
  const [atividades, setAtividades] = useState('')
  const [remuneracao, setRemuneracao] = useState('')
  const [beneficios, setBeneficios] = useState('')
  const [cidade, setCidade] = useState(empresa.endereco.cidade)
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState('')
  const [resultados, setResultados] = useState<CurriculoAnalisado[] | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<CurriculoAnalisado | null>(null)

  const dias = diasEntre(inicio, fim)
  const avisoPrazo = validarNecessidade('temporario', inicio, fim)
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
    if (!motivo) {
      setErro('Informe o motivo da contratação temporária. Sem isso a missão não pode ser publicada.')
      return
    }
    if (!atividades.trim()) {
      setErro('Descreva as atividades que serão realizadas.')
      return
    }
    if (!remuneracao.trim()) {
      setErro('Informe a remuneração prevista. Ela entra no contrato com a empresa tomadora.')
      return
    }
    if (quantidade < 1) {
      setErro('Informe quantos trabalhadores a missão precisa.')
      return
    }
    if (!horaInicio || !horaFim) {
      setErro('Informe a jornada.')
      return
    }
    const aviso = validarNecessidade('temporario', inicio, fim)
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
        modalidade: 'temporario',
        quantidade,
        horaInicio,
        horaFim,
        motivo,
        atividades,
        remuneracao,
        beneficios,
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
            <span>Empresa tomadora</span>
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
            <h1>Preciso de trabalhadores temporários</h1>
            <p>
              {empresa.nomeFantasia} pede a missão. A Doca Livre Mão de Obra, como empresa de trabalho
              temporário, recruta o trabalhador e o coloca à disposição da tomadora. Hoje há {base}{' '}
              currículos aprovados na base.
            </p>
          </div>

          <section className="cf-card">
            <div className="cf-grid">
              <div>
                <label className="cf-field">
                  <span>Cargo / função</span>
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
                  <span>Quantidade de trabalhadores</span>
                  <input
                    type="number"
                    min={1}
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                  />
                </label>

                <p className="cf-label">Período da missão temporária</p>
                <div className="cf-dates">
                  <label className="cf-field">
                    <span>Início</span>
                    <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
                  </label>
                  <label className="cf-field">
                    <span>Término previsto</span>
                    <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
                  </label>
                </div>
                <div className={`cf-rule ${avisoPrazo.nivel === 'bloqueio' ? 'cf-rule--block' : ''}`}>
                  <p>
                    Período solicitado: {formatarDataBr(inicio)} a {formatarDataBr(fim)}
                  </p>
                  <p>Duração: {dias >= 1 ? `${dias} dia${dias === 1 ? '' : 's'}` : 'período inválido'}</p>
                  <p>Limite legal: até 180 dias, consecutivos ou não.</p>
                  <p>Prorrogação: até 90 dias, desde que permaneçam as condições que justificaram o trabalho temporário.</p>
                  {avisoPrazo.nivel !== 'ok' && <p>{avisoPrazo.texto}</p>}
                </div>

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

                <p className="cf-label">Motivo da contratação temporária</p>
                <div className="cf-checks">
                  {MOTIVOS_TEMPORARIOS.map((item) => (
                    <label key={item.id} className="cf-check">
                      <input
                        type="radio"
                        name="motivo-temporario"
                        checked={motivo === item.id}
                        onChange={() => setMotivo(item.id)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>

                <label className="cf-field">
                  <span>Atividades que serão realizadas</span>
                  <textarea
                    value={atividades}
                    onChange={(e) => setAtividades(e.target.value)}
                    placeholder="Descreva o que o trabalhador fará na tomadora durante a missão."
                  />
                </label>

                <label className="cf-field">
                  <span>Remuneração prevista (R$)</span>
                  <input
                    value={remuneracao}
                    onChange={(e) => setRemuneracao(e.target.value)}
                    placeholder="Ex.: 180 por dia"
                  />
                </label>

                <label className="cf-field">
                  <span>Benefícios</span>
                  <input
                    value={beneficios}
                    onChange={(e) => setBeneficios(e.target.value)}
                    placeholder="Ex.: vale-transporte, refeição no local"
                  />
                </label>

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

            <div className="cf-rule">
              <p>{AVISO_FORMALIZACAO}</p>
            </div>
            {erro && <p className="error">{erro}</p>}
            <div className="cf-actions">
              <button
                type="button"
                className="cf-primary"
                onClick={analisar}
                disabled={avisoPrazo.nivel === 'bloqueio' || !motivo}
              >
                Buscar para a missão
              </button>
              <span className="muted">Sem o motivo da temporariedade, a missão não segue.</span>
            </div>
          </section>

          {resultados && (
            <section className="cf-results">
              <h2>
                {disponiveis.length} {disponiveis.length === 1 ? 'pessoa acompanha' : 'pessoas acompanham'} esta missão
              </h2>
              <p className="muted">
                {quantidade} {cargoLabel(cargoId)} · {dias} dia{dias === 1 ? '' : 's'} · {horaInicio}–{horaFim} · {cidade || empresa.endereco.cidade}
                {motivo ? ` · ${rotuloMotivo(motivo)}` : ''}
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
                  <h2 style={{ marginTop: 22 }}>Fora deste ciclo temporário</h2>
                  <p className="muted">O prazo de 180 dias, a prorrogação de 90 ou a carência de 90 dias não permite nova missão agora.</p>
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

              {selecionado && motivo && (
                <div className="cf-card" style={{ marginTop: 16 }}>
                  <h2 style={{ marginTop: 0 }}>Indicação para a missão temporária</h2>
                  <p>
                    {selecionado.profissional.nome} pode ser colocado à disposição de {empresa.nomeFantasia} como
                    trabalhador temporário: {cargoLabel(cargoId)}, {formatarDataBr(inicio)} a {formatarDataBr(fim)},{' '}
                    {horaInicio}–{horaFim}, em {cidade}. Remuneração prevista: {remuneracao}.
                  </p>
                  <p>
                    Motivo: <strong>{rotuloMotivo(motivo)}</strong>.
                  </p>
                  <p>{atividades}</p>
                  {beneficios.trim() && <p>Benefícios: {beneficios}</p>}
                  <p className="muted">{selecionado.situacaoTexto}</p>
                  <p>
                    Quem contrata o trabalhador é a empresa de trabalho temporário. A tomadora recebe a pessoa
                    pelo prazo e pelo motivo desta missão. O próximo passo é o contrato escrito entre as duas
                    empresas e o contrato de trabalho temporário.
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
      ? 'Fora do prazo temporário'
      : item.situacao === 'alerta'
        ? 'Cabe só como prorrogação'
        : 'Dentro dos 180 dias'

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
              Indicar para a missão temporária
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
