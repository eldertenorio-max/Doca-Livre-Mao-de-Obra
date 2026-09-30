import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { BibliotecaDocumental } from '../../components/BibliotecaDocumental'
import { CATEGORIES, cargoLabel } from '../../data/categories'
import { CIDADES_OPERACAO } from '../../data/cidades'
import { analisarCurriculos, requisitosDoCargo, rotuloAnos, type CurriculoAnalisado } from '../../lib/analiseCurriculo'
import { abrirCurriculoPdf } from '../../lib/curriculoPdf'
import { checklistProfissional, resumoDocumental } from '../../lib/documentos'
import type { DocumentoRegistro } from '../../lib/types'
import {
  AVISO_FORMALIZACAO,
  MOTIVOS_TEMPORARIOS,
  rotuloMotivo,
  validarNecessidade,
  type MotivoTemporario,
} from '../../lib/modalidadeContratacao'
import { BRAND_PRODUCT_NAME, LOGO_DOCA_LIVRE_SRC } from '../../lib/brandAssets'
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

const ABAS_EMPRESA = [
  { id: 'missao', label: 'Vaga temporária', icon: <IconeVaga /> },
  { id: 'missoes', label: 'Missões', icon: <IconeMissoes /> },
  { id: 'documentos', label: 'Documentação', icon: <IconeDocs /> },
  { id: 'dados', label: 'Dados da empresa', icon: <IconeEmpresa /> },
] as const

type AbaEmpresa = (typeof ABAS_EMPRESA)[number]['id']

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

function IconeBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      {children}
    </svg>
  )
}

function IconeVaga() {
  return (
    <IconeBase>
      <rect x="6" y="3.5" width="12" height="17" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 3.5h6v2.2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V3.5z" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 11h6M9 14.5h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
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

function IconeDocs() {
  return (
    <IconeBase>
      <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M14 3.8V8h4.2M8.5 12h7M8.5 15.5h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </IconeBase>
  )
}

function IconeEmpresa() {
  return (
    <IconeBase>
      <path d="M4 20V6.5A1.5 1.5 0 0 1 5.5 5H13v15" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M13 9h5.5A1.5 1.5 0 0 1 20 10.5V20" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M7.5 8.5h2.5M7.5 12h2.5M7.5 15.5h2.5M16 13h1.5M16 16.5h1.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </IconeBase>
  )
}

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
  const [aba, setAba] = useState<AbaEmpresa>('missao')
  const [menuFixo, setMenuFixo] = useState(false)
  const [menuHover, setMenuHover] = useState(false)
  const [telaEstreita, setTelaEstreita] = useState(false)
  const empresaValidada = empresa.status === 'aprovada'

  useEffect(() => {
    return () => {
      if (esperaBusca.current) window.clearTimeout(esperaBusca.current)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)')
    const atualizar = () => setTelaEstreita(mq.matches)
    atualizar()
    mq.addEventListener('change', atualizar)
    return () => mq.removeEventListener('change', atualizar)
  }, [])

  const menuAberto = menuFixo || (!telaEstreita && menuHover)

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
              <strong>{empresa.nomeFantasia}</strong>
              <small>Empresa tomadora</small>
            </span>
            <span className="cf-avatar-topo" aria-hidden>
              {iniciais(empresa.nomeFantasia)}
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
          <nav className="cf-menu-body" aria-label="Conta da empresa">
            {ABAS_EMPRESA.map((item) => {
              const ativo = aba === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`cf-menu-link ${ativo ? 'cf-menu-link--on' : ''}`}
                  aria-current={ativo ? 'page' : undefined}
                  title={menuAberto ? undefined : item.label}
                  onClick={() => {
                    setAba(item.id)
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
          {aba === 'documentos' && <BibliotecaDocumental modo="tomadora" empresaId={empresa.id} />}
          {aba === 'missoes' && <PainelMissoes empresaId={empresa.id} />}
          {aba === 'dados' && <PainelDados />}
          {aba === 'missao' && (
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

                <p className="cf-label">Benefícios</p>
                <div className="cf-checks cf-checks--duo">
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
              <div className="cf-stat-row">
                <article className="cf-stat cf-stat--dark">
                  <span>Analisados</span>
                  <strong>{analisados}</strong>
                  <small>currículos da base</small>
                </article>
                <article className="cf-stat cf-stat--green">
                  <span>Encaixe completo</span>
                  <strong>{atendemTudo}</strong>
                  <small>todos os obrigatórios</small>
                </article>
                <article className="cf-stat cf-stat--amber">
                  <span>Quase lá</span>
                  <strong>{incompletos.length}</strong>
                  <small>falta um requisito</small>
                </article>
                <article className="cf-stat cf-stat--rose">
                  <span>Fora do ciclo</span>
                  <strong>{bloqueadosPeriodo.length}</strong>
                  <small>prazo legal</small>
                </article>
              </div>
              <p className="cf-mission-chip">
                {quantidade} {cargoLabel(cargoId)} · {dias} dia{dias === 1 ? '' : 's'} · {horaInicio}–{horaFim} · {cidade || empresa.endereco.cidade}
                {motivo ? ` · ${rotuloMotivo(motivo)}` : ''}
              </p>

              <h2 className="cf-section-title cf-section-title--green">Profissionais com encaixe completo</h2>
              <div className="cf-gallery">
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
                  <div className="cf-empty">
                    <strong>Ninguém atendeu todos os requisitos obrigatórios.</strong>
                    <p>Quem ficou perto aparece na lista seguinte, com o item que faltou.</p>
                  </div>
                )}
              </div>

              {incompletos.length > 0 && (
                <>
                  <h2 className="cf-section-title cf-section-title--amber">Não atende requisito obrigatório</h2>
                  <div className="cf-gallery">
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
                  <h2 className="cf-section-title cf-section-title--rose">Fora deste ciclo temporário</h2>
                  <p className="cf-section-note">O prazo de 180 dias, a prorrogação de 90 ou a carência de 90 dias não permite nova missão agora.</p>
                  <div className="cf-gallery">
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
      </div>
      {analisando && (
        <div className="cf-analisando" role="status" aria-live="polite">
          <div className="cf-analisando-card">
            <div className="cf-radar" aria-hidden>
              <span />
              <span />
              <span />
              <i />
            </div>
            <p>Aguarda um momento. A IA está analisando os currículos para trazer os melhores profissionais para você.</p>
            <ol className="cf-analisando-passos">
              <li>Lendo os currículos</li>
              <li>Conferindo os requisitos</li>
              <li>Separando quem tem encaixe</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

function PainelMissoes({ empresaId }: { empresaId: string }) {
  const { state } = useStore()
  const missoes = state.demandas
    .filter((demanda) => demanda.empresaId === empresaId)
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data))

  return (
    <section className="cf-panel">
      <div className="cf-intro">
        <h1>Missões</h1>
        <p>Vagas temporárias desta empresa e o andamento de cada convite.</p>
      </div>
      {missoes.length === 0 && (
        <div className="cf-card">
          <strong>Nenhuma missão ainda.</strong>
          <p className="muted">A vaga nasce quando a empresa convida um profissional.</p>
        </div>
      )}
      <div className="cf-mission-list">
        {missoes.map((missao) => {
          const convites = state.candidaturas.filter((c) => c.demandaId === missao.id)
          return (
            <article key={missao.id} className="cf-card cf-mission">
              <div className="cf-mission-head">
                <h2>{cargoLabel(missao.cargo)}</h2>
                <span className={`cf-status cf-status--${missao.status}`}>{rotuloStatusMissao(missao.status)}</span>
              </div>
              <p>
                {formatarDataBr(missao.data)}
                {missao.dataFim ? ` a ${formatarDataBr(missao.dataFim)}` : ''} · {missao.horaInicio}–{missao.horaFim} ·{' '}
                {missao.endereco.cidade}/{missao.endereco.estado}
              </p>
              <p>
                {missao.quantidade} trabalhador{missao.quantidade === 1 ? '' : 'es'} ·{' '}
                {missao.valorDiaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por dia
              </p>
              {convites.length === 0 ? (
                <p className="muted">Nenhum convite nesta missão.</p>
              ) : (
                <ul className="cf-invite-list">
                  {convites.map((convite) => {
                    const nome = state.profissionais.find((p) => p.id === convite.profissionalId)?.nome ?? 'Trabalhador'
                    return (
                      <li key={convite.id}>
                        <strong>{nome}</strong>
                        <span>{rotuloConvite(convite.status)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function PainelDados() {
  const empresa = useStore().currentEmpresa!
  const endereco = empresa.endereco
  const campos = [
    ['Nome fantasia', empresa.nomeFantasia],
    ['Razão social', empresa.razaoSocial],
    ['CNPJ', empresa.cnpj],
    ['Responsável', `${empresa.responsavelNome} · ${empresa.responsavelCargo}`],
    ['Telefone', empresa.telefone],
    ['Endereço', `${endereco.rua}, ${endereco.numero} · ${endereco.cidade}/${endereco.estado}`],
    ['Situação', empresa.status === 'aprovada' ? 'Validada' : empresa.status === 'bloqueada' ? 'Bloqueada' : 'Aguardando validação'],
  ]

  return (
    <section className="cf-panel">
      <div className="cf-intro">
        <h1>Dados da empresa</h1>
        <p>Cadastro da empresa tomadora usado nas missões temporárias.</p>
      </div>
      <dl className="cf-dados">
        {campos.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function rotuloStatusMissao(status: string) {
  if (status === 'em_andamento') return 'Em andamento'
  if (status === 'finalizada') return 'Encerrada'
  if (status === 'cancelada') return 'Cancelada'
  return 'Aberta'
}

function rotuloConvite(status: string) {
  if (status === 'aceita') return 'Tem interesse'
  if (status === 'confirmada') return 'Contrato gerado'
  if (status === 'recusada') return 'Sem interesse'
  if (status === 'cancelada') return 'Cancelado'
  return 'Convite enviado'
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
  const bloqueado = item.situacao === 'bloqueado'
  const selo = bloqueado ? 'Fora do ciclo' : item.atendeObrigatorios ? 'Encaixe completo' : 'Falta requisito'
  const seloClasse = bloqueado ? 'cf-badge--rose' : item.atendeObrigatorios ? 'cf-badge--green' : 'cf-badge--amber'
  const barras = [
    ['Requisitos', item.compatibilidade.requisitos],
    ['Experiência', item.compatibilidade.experiencia],
    ['Disponibilidade', item.compatibilidade.disponibilidade],
    ['Localização', item.compatibilidade.localizacao],
    ['Certificações', item.compatibilidade.certificacoes],
  ] as const

  return (
    <article className={`cf-pro ${bloqueado ? 'cf-pro--blocked' : item.atendeObrigatorios ? 'cf-pro--fit' : 'cf-pro--aside'}`}>
      <div className="cf-pro-top">
        <div className="cf-avatar" style={{ background: corAvatar(p.id) }} aria-hidden>
          {iniciais(p.nome)}
        </div>
        <div className="cf-pro-id">
          <h3>{p.nome}</h3>
          <p>{p.profissoes.map(cargoLabel).join(' · ')}</p>
        </div>
        <div className="cf-pro-marks">
          <span className={`cf-badge ${seloClasse}`}>{selo}</span>
          <span className="cf-nota" title="Quanto este profissional atende a vaga">
            {item.score}
            <small>/100</small>
          </span>
        </div>
      </div>

      <div className="cf-meta">
        <span className="cf-pill cf-pill--city">{p.endereco.cidade}/{p.endereco.estado}</span>
        <span className="cf-pill cf-pill--exp">{rotuloAnos(item.anosExperiencia)}</span>
        <span className="cf-pill cf-pill--km">{item.distanciaKm} km</span>
        {item.checagens.map((checagem) => (
          <span
            key={`${checagem.rotulo}-${checagem.obrigatorio}`}
            className={`cf-pill ${checagem.ok ? (checagem.obrigatorio ? 'cf-mark--ok' : 'cf-mark--dif') : 'cf-mark--no'}`}
          >
            {checagem.ok ? '✓' : '✕'} {checagem.rotulo}
            {!checagem.obrigatorio ? ' · diferencial' : ''}
          </span>
        ))}
      </div>

      <div className="cf-bars">
        {barras.map(([rotulo, texto]) => {
          const nivel = nivelBarra(texto)
          return (
            <div key={rotulo} className={`cf-bar cf-bar--${nivel}`}>
              <span>{rotulo}</span>
              <div className="cf-bar-track" aria-hidden>
                <div className="cf-bar-fill" />
              </div>
              <small>{texto}</small>
            </div>
          )
        })}
      </div>

      <div className="cf-why">
        <strong>Por que este profissional apareceu?</strong>
        <p>{item.porque}</p>
      </div>

      <div className="cf-actions">
        <button type="button" className="cf-btn cf-btn--dark" onClick={onToggle}>
          {aberto ? 'Ocultar currículo' : 'Ver currículo'}
        </button>
        <button type="button" className="cf-btn cf-btn--blue" onClick={() => abrirCurriculoPdf(p)}>
          Ver currículo em PDF
        </button>
        {onConvidar && item.atendeObrigatorios && item.situacao !== 'bloqueado' && !convite && (
          <button type="button" className="cf-btn cf-btn--yellow" onClick={onConvidar}>
            Convidar para a missão
          </button>
        )}
        {convite?.status === 'pendente' && <span className="cf-note">Convite enviado. Aguardando o trabalhador.</span>}
        {convite?.status === 'aceita' && (
          <span className="cf-note">
            Demonstrou interesse. Documentação {docs.completo ? 'completa' : `em ${docs.pct}%`}.
          </span>
        )}
        {podeContrato && onContrato && (
          <button type="button" className="cf-btn cf-btn--yellow" onClick={() => onContrato(convite.id)}>
            Gerar contrato temporário
          </button>
        )}
        {convite?.status === 'aceita' && !docs.completo && (
          <span className="cf-note">O contrato espera a validação documental.</span>
        )}
        {convite?.status === 'recusada' && <span className="cf-note">O trabalhador não tem interesse nesta missão.</span>}
        {convite?.contratoNumero && <span className="cf-note">Contrato temporário {convite.contratoNumero} gerado.</span>}
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
          <span>{item.situacaoTexto}</span>
        </div>
      )}
    </article>
  )
}

const CORES_AVATAR = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#db2777', '#4f46e5', '#ea580c']

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] ?? '' : ''
  return `${primeira}${ultima}`.toUpperCase()
}

function corAvatar(id: string) {
  let n = 0
  for (const ch of id) n = (n + ch.charCodeAt(0)) % CORES_AVATAR.length
  return CORES_AVATAR[n]
}

function nivelBarra(texto: string) {
  const t = texto.toLowerCase()
  if (t.includes('não atende') || t.includes('falta') || t.includes('sem ') || t.includes('distante')) return 'baixo'
  if (t.includes('parcial')) return 'medio'
  return 'alto'
}
