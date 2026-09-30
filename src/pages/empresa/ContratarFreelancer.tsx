import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { BibliotecaDocumental } from '../../components/BibliotecaDocumental'
import { CATEGORIES, cargoLabel } from '../../data/categories'
import { CIDADES_OPERACAO } from '../../data/cidades'
import { analisarCurriculos, requisitosDoCargo, rotuloAnos, type CurriculoAnalisado } from '../../lib/analiseCurriculo'
import { checklistProfissional, resumoDocumental } from '../../lib/documentos'
import type { DocumentoRegistro } from '../../lib/types'
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

type ModeloMissao = {
  titulo: string
  cargoId: string
  requisitos: string[]
  diferenciais: string[]
  cidade: string
  horaInicio: string
  horaFim: string
  observacoes: string
  motivo: MotivoTemporario | ''
  atividades: string
  remuneracao: string
  beneficios: string
  quantidade: number
}

function chaveModelo(empresaId: string) {
  return `doca-modelo-missao:${empresaId}`
}

function lerModelo(empresaId: string): ModeloMissao | null {
  try {
    const raw = localStorage.getItem(chaveModelo(empresaId))
    if (!raw) return null
    return JSON.parse(raw) as ModeloMissao
  } catch {
    return null
  }
}

function gravarModelo(empresaId: string, modelo: ModeloMissao) {
  localStorage.setItem(chaveModelo(empresaId), JSON.stringify(modelo))
}

function formatarMoeda(entrada: string) {
  const semSimbolo = entrada.replace(/R\$\s?/gi, '').trim()
  if (!semSimbolo) return ''
  const semMilhar = semSimbolo.replace(/\./g, '')
  const [inteiroRaw, decimalRaw] = semMilhar.split(',')
  let inteiro = (inteiroRaw || '').replace(/\D/g, '')
  const decimal = (decimalRaw || '').replace(/\D/g, '')
  if (decimal.length > 2) inteiro += decimal.slice(2)
  if (!inteiro) return ''
  const centavos = (decimal.length > 2 ? decimal.slice(0, 2) : decimal).padEnd(2, '0').slice(0, 2)
  const numero = Number(`${Number(inteiro)}.${centavos}`)
  if (!Number.isFinite(numero)) return ''
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function valorNumero(texto: string) {
  const match = texto.replace(/\./g, '').replace(',', '.').match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

const BENEFICIOS_OPCOES = [
  'Vale-transporte',
  'Vale-refeição',
  'Vale-alimentação',
  'Refeição no local',
  'Cesta básica',
  'Plano de saúde',
  'Plano odontológico',
  'Seguro de vida',
  'Auxílio-creche',
  'Ajuda de custo',
] as const

function beneficiosDoTexto(texto: string) {
  const normal = texto.toLocaleLowerCase('pt-BR')
  return BENEFICIOS_OPCOES.filter((item) => normal.includes(item.toLocaleLowerCase('pt-BR')))
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
  const { currentEmpresa, state, convidarParaMissao, confirmCandidato } = useStore()
  const empresa = currentEmpresa!
  const [cargoId, setCargoId] = useState('empilhadeira')
  const [requisitos, setRequisitos] = useState<string[]>(() => requisitosDoCargo('empilhadeira').padrao)
  const [diferenciais, setDiferenciais] = useState<string[]>([])
  const [inicio, setInicio] = useState(dataLocal(1))
  const [fim, setFim] = useState(dataLocal(5))
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim, setHoraFim] = useState('18:00')
  const [quantidade, setQuantidade] = useState(1)
  const [motivo, setMotivo] = useState<MotivoTemporario | ''>('')
  const [atividades, setAtividades] = useState('')
  const [remuneracao, setRemuneracao] = useState('')
  const [beneficios, setBeneficios] = useState<string[]>([])
  const [cidade, setCidade] = useState(empresa.endereco.cidade)
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState('')
  const [analisando, setAnalisando] = useState(false)
  const esperaBusca = useRef<number | null>(null)
  const [resultados, setResultados] = useState<CurriculoAnalisado[] | null>(null)
  const [analisados, setAnalisados] = useState(0)
  const [aberto, setAberto] = useState<string | null>(null)
  const [missaoId, setMissaoId] = useState<string | null>(null)
  const [modelo, setModelo] = useState<ModeloMissao | null>(() => lerModelo(empresa.id))
  const [aba, setAba] = useState<'missao' | 'documentos'>('missao')
  const empresaValidada = empresa.status === 'aprovada'

  useEffect(() => {
    return () => {
      if (esperaBusca.current) window.clearTimeout(esperaBusca.current)
    }
  }, [])

  const dias = diasEntre(inicio, fim)
  const avisoPrazo = validarNecessidade('temporario', inicio, fim)
  const base = state.profissionais.filter((p) => p.status === 'aprovado').length
  const opcoesRequisito = requisitosDoCargo(cargoId).opcoes

  function aoMudarCargo(id: string) {
    setCargoId(id)
    setRequisitos(requisitosDoCargo(id).padrao)
    setDiferenciais([])
    setResultados(null)
    setMissaoId(null)
  }

  function marcarRequisito(grupo: 'obrigatorio' | 'diferencial', req: string) {
    if (grupo === 'obrigatorio') {
      setRequisitos((atual) => (atual.includes(req) ? atual.filter((item) => item !== req) : [...atual, req]))
      setDiferenciais((atual) => atual.filter((item) => item !== req))
      return
    }
    setDiferenciais((atual) => (atual.includes(req) ? atual.filter((item) => item !== req) : [...atual, req]))
    setRequisitos((atual) => atual.filter((item) => item !== req))
  }

  function repetirModelo() {
    if (!modelo) return
    setCargoId(modelo.cargoId)
    setRequisitos(modelo.requisitos)
    setDiferenciais(modelo.diferenciais)
    setCidade(modelo.cidade)
    setHoraInicio(modelo.horaInicio)
    setHoraFim(modelo.horaFim)
    setObservacoes(modelo.observacoes)
    setMotivo(modelo.motivo)
    setAtividades(modelo.atividades)
    setRemuneracao(formatarMoeda(modelo.remuneracao))
    setBeneficios(beneficiosDoTexto(modelo.beneficios))
    setQuantidade(modelo.quantidade)
    setResultados(null)
    setMissaoId(null)
  }

  const beneficiosTexto = beneficios.join(', ')

  function alternarBeneficio(item: string) {
    setBeneficios((atual) => (atual.includes(item) ? atual.filter((b) => b !== item) : [...atual, item]))
  }

  function analisar() {
    if (!empresaValidada) {
      setErro('A empresa tomadora precisa estar validada antes de publicar uma missão temporária.')
      return
    }
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
    const salvo: ModeloMissao = {
      titulo: `${cargoLabel(cargoId)} — ${cidade || empresa.endereco.cidade}`,
      cargoId,
      requisitos,
      diferenciais,
      cidade,
      horaInicio,
      horaFim,
      observacoes,
      motivo,
      atividades,
      remuneracao,
      beneficios: beneficiosTexto,
      quantidade,
    }
    gravarModelo(empresa.id, salvo)
    setModelo(salvo)
    setAnalisando(true)
    setResultados(null)
    setMissaoId(null)
    if (esperaBusca.current) window.clearTimeout(esperaBusca.current)
    esperaBusca.current = window.setTimeout(() => {
      const busca = analisarCurriculos({
      pedido: {
        cargoId,
        requisitos,
        diferenciais,
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
        beneficios: beneficiosTexto,
      },
      empresa,
      profissionais: state.profissionais,
      documentos: state.documentos,
      demandas: state.demandas,
      candidaturas: state.candidaturas,
    })
      setResultados(busca.pessoas)
      setAnalisados(busca.analisados)
      setAberto(busca.pessoas[0]?.profissional.id ?? null)
      setAnalisando(false)
      esperaBusca.current = null
    }, 1600)
  }

  function convidar(item: CurriculoAnalisado) {
    const cidadeMissao = cidade || empresa.endereco.cidade
    const resp = convidarParaMissao({
      demandaId: missaoId,
      profissionalId: item.profissional.id,
      score: item.score,
      distanciaKm: item.distanciaKm,
      pedido: missaoId
        ? undefined
        : {
            empresaId: empresa.id,
            cargo: cargoId,
            quantidade,
            data: inicio,
            dataFim: fim,
            horaInicio,
            horaFim,
            endereco: { ...empresa.endereco, cidade: cidadeMissao },
            valorDiaria: valorNumero(remuneracao),
            descricao: atividades,
            epis: beneficiosTexto,
            observacoes,
            requisitos,
            diferenciais,
            motivo,
            atividades,
            beneficios: beneficiosTexto,
          },
    })
    if (resp) setMissaoId(resp.demandaId)
  }

  const compativeis = resultados?.filter((r) => r.situacao !== 'bloqueado' && r.atendeObrigatorios) ?? []
  const incompletos = resultados?.filter((r) => r.situacao !== 'bloqueado' && !r.atendeObrigatorios) ?? []
  const bloqueadosPeriodo = resultados?.filter((r) => r.situacao === 'bloqueado') ?? []
  const atendemTudo = compativeis.length

  function conviteDe(profissionalId: string) {
    if (!missaoId) return null
    const cand = state.candidaturas.find(
      (c) => c.demandaId === missaoId && c.profissionalId === profissionalId,
    )
    if (!cand) return null
    const contrato = state.contratos.find((c) => c.candidaturaId === cand.id)
    return { id: cand.id, status: cand.status, contratoNumero: contrato?.numero }
  }

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
          <button type="button" className="cf-ghost" onClick={() => setAba(aba === 'missao' ? 'documentos' : 'missao')}>
            {aba === 'missao' ? 'Documentação' : 'Missão'}
          </button>
          <button type="button" className="cf-ghost" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="cf-main">
        <div className="cf-wrap">
          {aba === 'documentos' ? (
            <BibliotecaDocumental modo="tomadora" empresaId={empresa.id} />
          ) : (
          <>
          <div className="cf-intro">
            <h1>Vaga temporária</h1>
            <p>
              {empresa.nomeFantasia} descreve a missão. A análise compara o pedido com o banco de currículos
              estruturados e mostra quem atende. A escolha continua com a empresa tomadora. Hoje há {base}{' '}
              currículos aprovados na base.
            </p>
            {modelo && (
              <button type="button" className="cf-open" onClick={repetirModelo}>
                Repetir demanda: {modelo.titulo}
              </button>
            )}
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

                <p className="cf-label">Requisitos obrigatórios</p>
                <p className="muted">Quem não comprovar um item obrigatório fica em uma lista separada.</p>
                <div className="cf-chips" style={{ margin: '8px 0 14px' }}>
                  {opcoesRequisito.map((req) => (
                    <button
                      key={req}
                      type="button"
                      className={`cf-chip ${requisitos.includes(req) ? 'cf-chip--on' : ''}`}
                      onClick={() => marcarRequisito('obrigatorio', req)}
                    >
                      {req}
                    </button>
                  ))}
                </div>

                <p className="cf-label">Diferenciais</p>
                <p className="muted">Somam correspondência. Não eliminam o candidato.</p>
                <div className="cf-chips" style={{ margin: '8px 0 14px' }}>
                  {opcoesRequisito.map((req) => (
                    <button
                      key={req}
                      type="button"
                      className={`cf-chip ${diferenciais.includes(req) ? 'cf-chip--on' : ''}`}
                      onClick={() => marcarRequisito('diferencial', req)}
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
                    inputMode="decimal"
                    value={remuneracao}
                    onChange={(e) => setRemuneracao(formatarMoeda(e.target.value))}
                    placeholder="R$ 0,00"
                  />
                </label>

                <p className="cf-label">Benefícios</p>
                <div className="cf-checks">
                  {BENEFICIOS_OPCOES.map((item) => (
                    <label key={item} className="cf-check">
                      <input
                        type="checkbox"
                        checked={beneficios.includes(item)}
                        onChange={() => alternarBeneficio(item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
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

            <div className="cf-rule">
              <p>{AVISO_FORMALIZACAO}</p>
            </div>
            {!empresaValidada && (
              <div className="cf-rule cf-rule--block">
                <p>A empresa tomadora precisa estar validada antes de publicar uma missão temporária.</p>
              </div>
            )}
            {erro && <p className="error">{erro}</p>}
            <div className="cf-actions">
              <button
                type="button"
                className="cf-primary"
                onClick={analisar}
                disabled={analisando || avisoPrazo.nivel === 'bloqueio' || !motivo || !empresaValidada}
              >
                {analisando ? 'Analisando currículos' : 'Encontrar profissionais'}
              </button>
              <span className="muted">A análise mostra o encaixe. A empresa decide o convite.</span>
            </div>
          </section>

          {resultados && (
            <section className="cf-results">
              <div className="cf-summary">
                <strong>Profissionais encontrados</strong>
                <p>{analisados} candidatos analisados</p>
                <p>
                  {atendemTudo} {atendemTudo === 1 ? 'atende' : 'atendem'} todos os requisitos obrigatórios
                </p>
              </div>
              <p className="muted">
                {quantidade} {cargoLabel(cargoId)} · {dias} dia{dias === 1 ? '' : 's'} · {horaInicio}–{horaFim} · {cidade || empresa.endereco.cidade}
                {motivo ? ` · ${rotuloMotivo(motivo)}` : ''}
              </p>
              <p className="muted">A análise identifica quem atende aos requisitos informados. A decisão final continua com a empresa.</p>

              <div className="cf-list">
                {compativeis.map((item) => (
                  <PessoaCard
                    key={item.profissional.id}
                    item={item}
                    aberto={aberto === item.profissional.id}
                    convite={conviteDe(item.profissional.id)}
                    documentos={state.documentos}
                    requisitos={requisitos}
                    onToggle={() =>
                      setAberto((id) => (id === item.profissional.id ? null : item.profissional.id))
                    }
                    onConvidar={() => convidar(item)}
                    onContrato={(candidaturaId) => confirmCandidato(candidaturaId)}
                  />
                ))}
                {compativeis.length === 0 && (
                  <div className="cf-card">
                    <strong>Ninguém atendeu todos os requisitos obrigatórios.</strong>
                    <p className="muted">Quem ficou perto aparece na lista seguinte, com o item que faltou.</p>
                  </div>
                )}
              </div>

              {incompletos.length > 0 && (
                <>
                  <h2 style={{ marginTop: 22 }}>Não atende requisito obrigatório</h2>
                  <div className="cf-list">
                    {incompletos.map((item) => (
                      <PessoaCard
                        key={item.profissional.id}
                        item={item}
                        aberto={aberto === item.profissional.id}
                        documentos={state.documentos}
                        requisitos={requisitos}
                        onToggle={() =>
                          setAberto((id) => (id === item.profissional.id ? null : item.profissional.id))
                        }
                      />
                    ))}
                  </div>
                </>
              )}

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
                        documentos={state.documentos}
                        requisitos={requisitos}
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
          </>
          )}
        </div>
      </main>
      {analisando && (
        <div className="cf-analisando" role="status">
          <p>Aguarda um momento. A IA está analisando os currículos para trazer os melhores profissionais para você.</p>
        </div>
      )}
    </div>
  )
}

function PessoaCard({
  item,
  aberto,
  onToggle,
  onConvidar,
  onContrato,
  convite,
  documentos,
  requisitos,
}: {
  item: CurriculoAnalisado
  aberto: boolean
  onToggle: () => void
  onConvidar?: () => void
  onContrato?: (candidaturaId: string) => void
  convite?: { id: string; status: string; contratoNumero?: string } | null
  documentos: DocumentoRegistro[]
  requisitos: string[]
}) {
  const p = item.profissional
  const docs = resumoDocumental(checklistProfissional(p, documentos, requisitos))
  const podeContrato = convite?.status === 'aceita' && docs.completo

  return (
    <article className={`cf-person ${item.situacao === 'bloqueado' || !item.atendeObrigatorios ? 'cf-person--block' : ''}`}>
      <div>
        <h3>{p.nome}</h3>
        <p className="muted">
          {p.profissoes.map(cargoLabel).join(' · ')} · {p.endereco.cidade}/{p.endereco.estado} · experiência {rotuloAnos(item.anosExperiencia)}
        </p>
        <ul className="cf-marks">
          {item.checagens.map((checagem) => (
            <li key={`${checagem.rotulo}-${checagem.obrigatorio}`} className={checagem.ok ? 'cf-mark--ok' : 'cf-mark--no'}>
              {checagem.ok ? '✓' : '✕'} {checagem.rotulo}
              {!checagem.obrigatorio ? ' (diferencial)' : ''}
            </li>
          ))}
        </ul>
        <div className="cf-compat">
          <span>Requisitos obrigatórios: {item.compatibilidade.requisitos}</span>
          <span>Experiência: {item.compatibilidade.experiencia}</span>
          <span>Disponibilidade: {item.compatibilidade.disponibilidade}</span>
          <span>Localização: {item.compatibilidade.localizacao}</span>
          <span>Certificações: {item.compatibilidade.certificacoes}</span>
        </div>
        <p className="cf-leitura">
          <strong>Por que este profissional apareceu? </strong>
          {item.porque}
        </p>
        <div className="cf-actions">
          <button type="button" className="cf-open" onClick={onToggle}>
            {aberto ? 'Ocultar currículo' : 'Ver currículo'}
          </button>
          {onConvidar && item.atendeObrigatorios && item.situacao !== 'bloqueado' && !convite && (
            <button type="button" className="cf-primary" onClick={onConvidar}>
              Convidar para a missão
            </button>
          )}
          {convite?.status === 'pendente' && <span className="muted">Convite enviado. Aguardando o trabalhador.</span>}
          {convite?.status === 'aceita' && (
            <span className="muted">
              Demonstrou interesse. Documentação {docs.completo ? 'completa' : `em ${docs.pct}%`}.
            </span>
          )}
          {podeContrato && onContrato && (
            <button type="button" className="cf-primary" onClick={() => onContrato(convite.id)}>
              Gerar contrato temporário
            </button>
          )}
          {convite?.status === 'aceita' && !docs.completo && (
            <span className="muted">O contrato espera a validação documental.</span>
          )}
          {convite?.status === 'recusada' && <span className="muted">O trabalhador não tem interesse nesta missão.</span>}
          {convite?.contratoNumero && <span className="muted">Contrato temporário {convite.contratoNumero} gerado.</span>}
        </div>
        {aberto && (
          <div className="cf-cv">
            <strong>Currículo estruturado</strong>
            <span>Cidade: {p.endereco.cidade}/{p.endereco.estado}</span>
            <span>CNH: {p.cnhCategoria ?? 'não informada'}</span>
            <span>
              Experiências:{' '}
              {p.experiencia.length
                ? p.experiencia.map((e) => `${e.cargo} na ${e.empresa} (${e.inicio} a ${e.fim})`).join(' · ')
                : 'não descritas'}
            </span>
            <span>
              Certificados: {p.certificados.length ? p.certificados.map((c) => c.tipo).join(', ') : 'nenhum registrado'}
            </span>
            <span className="muted">{item.situacaoTexto}</span>
          </div>
        )}
      </div>
    </article>
  )
}
