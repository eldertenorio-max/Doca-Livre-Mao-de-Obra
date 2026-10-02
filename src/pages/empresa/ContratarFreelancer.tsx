import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { BibliotecaDocumental } from '../../components/BibliotecaDocumental'
import { CATEGORIES, allCargos, cargoLabel } from '../../data/categories'
import { LOCAIS_OPERACAO } from '../../data/cidades'
import { analisarCurriculos, requisitosDoCargo, rotuloAnos, type CurriculoAnalisado } from '../../lib/analiseCurriculo'
import { abrirCurriculoPdf } from '../../lib/curriculoPdf'
import { MapaMaoDeObra } from './MapaMaoDeObra'
import { PerfilColaborador } from './PerfilColaborador'
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

function pontoOperacao(
  cidade: string,
  estado: string,
  empresa: { endereco: { cidade: string; estado: string; lat: number; lng: number } },
  locais: { cidade: string; estado: string; lat: number; lng: number }[],
) {
  const mesmaEmpresa =
    semAcento(cidade || empresa.endereco.cidade) === semAcento(empresa.endereco.cidade) &&
    (!estado || estado.toUpperCase() === empresa.endereco.estado.toUpperCase())
  if (mesmaEmpresa && Number.isFinite(empresa.endereco.lat)) {
    return { lat: empresa.endereco.lat, lng: empresa.endereco.lng }
  }
  const achou = locais.find((local) => {
    const mesmaCidade = semAcento(local.cidade) === semAcento(cidade)
    const mesmoEstado = !estado || local.estado.toUpperCase() === estado.toUpperCase()
    return mesmaCidade && mesmoEstado && Number.isFinite(local.lat) && Number.isFinite(local.lng)
  })
  if (achou) return { lat: achou.lat, lng: achou.lng }
  return { lat: empresa.endereco.lat, lng: empresa.endereco.lng }
}

function dataLocal(offsetDias = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

function semAcento(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

type LocalBusca = { cidade: string; estado: string }

const RAIOS_BUSCA = [10, 25, 50, 100]

function CampoCidade({
  cidade,
  estado,
  onChange,
  locais,
}: {
  cidade: string
  estado: string
  onChange: (cidade: string, estado: string) => void
  locais: LocalBusca[]
}) {
  const listaId = useId()
  const caixa = useRef<HTMLDivElement>(null)
  const [aberta, setAberta] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [destaque, setDestaque] = useState(0)
  const texto = cidade ? `${cidade}${estado ? `/${estado}` : ''}` : ''

  const opcoes = useMemo(() => {
    const unicas = new Map<string, LocalBusca>()
    for (const local of locais) {
      const nome = local.cidade.trim()
      const uf = local.estado.trim().toUpperCase()
      if (!nome || !uf) continue
      if (estado && uf !== estado) continue
      unicas.set(`${semAcento(nome)}|${uf}`, { cidade: nome, estado: uf })
    }
    const lista = [...unicas.values()]
    const termo = semAcento(consulta.trim())
    const filtradas = termo
      ? lista.filter((local) => {
          const rotulo = semAcento(`${local.cidade}/${local.estado}`)
          return rotulo.includes(termo) || semAcento(local.estado).startsWith(termo)
        })
      : lista
    return filtradas.sort((a, b) => {
      if (termo) {
        const aComeca = semAcento(a.cidade).startsWith(termo) ? 0 : 1
        const bComeca = semAcento(b.cidade).startsWith(termo) ? 0 : 1
        if (aComeca !== bComeca) return aComeca - bComeca
      }
      const porCidade = a.cidade.localeCompare(b.cidade, 'pt-BR')
      return porCidade || a.estado.localeCompare(b.estado, 'pt-BR')
    })
  }, [consulta, estado, locais])

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

  function escolher(local: LocalBusca) {
    onChange(local.cidade, local.estado)
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
        value={aberta && consulta !== '' ? consulta : texto}
        placeholder="Cidade ou cidade/estado"
        onClick={() => setAberta(true)}
        onFocus={(e) => {
          setConsulta('')
          setAberta(true)
          e.currentTarget.select()
        }}
        onChange={(e) => {
          setConsulta(e.target.value)
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
          {opcoes.map((local, indice) => (
            <li key={`${local.cidade}-${local.estado}`}>
              <button
                type="button"
                role="option"
                aria-selected={indice === destaque}
                className={indice === destaque ? 'cf-city-list--on' : undefined}
                onMouseEnter={() => setDestaque(indice)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(local)}
              >
                {local.cidade}/{local.estado}
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
  estado?: string
  raioKm?: number | null
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

function formatarMoedaDigitando(entrada: string) {
  const limpo = entrada.replace(/R\$\s?/gi, '').replace(/[^\d,]/g, '')
  if (!limpo) return ''
  const temVirgula = limpo.includes(',')
  const [inteiroRaw, ...resto] = limpo.split(',')
  const inteiro = inteiroRaw.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  const decimal = resto.join('').replace(/\D/g, '').slice(0, 2)
  if (!inteiro && !temVirgula) return ''
  const inteiroFmt = (inteiro || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (!temVirgula) return `R$ ${inteiroFmt}`
  return `R$ ${inteiroFmt},${decimal}`
}

function finalizarMoeda(entrada: string) {
  const parcial = formatarMoedaDigitando(entrada)
  if (!parcial) return ''
  const semSimbolo = parcial.replace(/R\$\s?/g, '')
  const [inteiroRaw, decimalRaw = ''] = semSimbolo.split(',')
  const inteiro = inteiroRaw.replace(/\./g, '') || '0'
  const centavos = decimalRaw.padEnd(2, '0').slice(0, 2)
  const numero = Number(`${inteiro}.${centavos}`)
  if (!Number.isFinite(numero)) return ''
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function posicaoAposDigitos(texto: string, digitos: number) {
  if (digitos <= 0) return texto.startsWith('R$') ? 3 : 0
  let vistos = 0
  for (let i = 0; i < texto.length; i++) {
    const codigo = texto.charCodeAt(i)
    if (codigo >= 48 && codigo <= 57) {
      vistos += 1
      if (vistos === digitos) return i + 1
    }
  }
  return texto.length
}

function valorNumero(texto: string) {
  const match = texto.replace(/\./g, '').replace(',', '.').match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

const ABAS_EMPRESA = [
  { id: 'missao', label: 'Vaga temporária', icon: <IconeVaga /> },
  { id: 'vagas', label: 'Vagas', icon: <IconeVagasLista /> },
  { id: 'missoes', label: 'Missões', icon: <IconeMissoes /> },
  { id: 'mapa', label: 'Mapa Mão de Obra', icon: <IconeMapa /> },
  { id: 'contratacoes', label: 'Minhas contratações', icon: <IconeContratacoes /> },
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

function IconeVagasLista() {
  return (
    <IconeBase>
      <path d="M8 6.5h11M8 12h11M8 17.5h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="4.5" cy="6.5" r="1.1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" />
      <circle cx="4.5" cy="17.5" r="1.1" fill="currentColor" />
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

function IconeMapa() {
  return (
    <IconeBase>
      <path d="M12 21s6.5-5.6 6.5-10.2a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21z" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="10.6" r="2.1" stroke="currentColor" strokeWidth="1.75" />
    </IconeBase>
  )
}

function IconeContratacoes() {
  return (
    <IconeBase>
      <path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5V20L12 17.2 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9 9.5h6M9 13h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
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
  const { currentEmpresa, state, convidarParaMissao, confirmCandidato, publicarVaga } = useStore()
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
  const remuneracaoRef = useRef<HTMLInputElement>(null)
  const cursorRemuneracao = useRef<number | null>(null)
  const [beneficios, setBeneficios] = useState<string[]>([])
  const [cidade, setCidade] = useState(empresa.endereco.cidade)
  const [estado, setEstado] = useState(empresa.endereco.estado)
  const [raioKm, setRaioKm] = useState<number | null>(null)
  const locaisBusca = useMemo(() => {
    const extras: LocalBusca[] = [
      ...state.profissionais.map((pessoa) => ({ cidade: pessoa.endereco.cidade, estado: pessoa.endereco.estado })),
      ...state.empresas.map((item) => ({ cidade: item.endereco.cidade, estado: item.endereco.estado })),
      ...state.enderecosEmpresa.map((item) => ({ cidade: item.cidade, estado: item.uf })),
    ]
    return [...LOCAIS_OPERACAO, ...extras]
  }, [state.enderecosEmpresa, state.empresas, state.profissionais])
  const ufs = useMemo(
    () => [...new Set(locaisBusca.map((local) => local.estado.toUpperCase()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [locaisBusca],
  )
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState('')
  const [analisando, setAnalisando] = useState(false)
  const esperaBusca = useRef<number | null>(null)
  const resultadosRef = useRef<HTMLElement>(null)
  const [resultados, setResultados] = useState<CurriculoAnalisado[] | null>(null)
  const [analisados, setAnalisados] = useState(0)
  const [aberto, setAberto] = useState<string | null>(null)
  const [missaoId, setMissaoId] = useState<string | null>(null)
  const [vagaPublicadaChave, setVagaPublicadaChave] = useState('')
  const [avisoPublicacao, setAvisoPublicacao] = useState('')
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
    if (analisando || !resultados) return
    const alvo = resultadosRef.current
    const painel = alvo?.closest('.cf-main')
    if (!alvo || !(painel instanceof HTMLElement)) return
    const topo = alvo.getBoundingClientRect().top - painel.getBoundingClientRect().top + painel.scrollTop
    painel.scrollTo({ top: Math.max(0, topo - 8), behavior: 'smooth' })
  }, [analisando, resultados])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)')
    const atualizar = () => setTelaEstreita(mq.matches)
    atualizar()
    mq.addEventListener('change', atualizar)
    return () => mq.removeEventListener('change', atualizar)
  }, [])

  useLayoutEffect(() => {
    const el = remuneracaoRef.current
    const pos = cursorRemuneracao.current
    if (!el || pos == null || document.activeElement !== el) return
    cursorRemuneracao.current = null
    el.setSelectionRange(pos, pos)
  }, [remuneracao])

  function aoDigitarRemuneracao(event: ChangeEvent<HTMLInputElement>) {
    const bruto = event.target.value
    const cursor = event.target.selectionStart ?? bruto.length
    const decimalAnterior = remuneracao.includes(',') ? (remuneracao.split(',')[1] ?? '') : ''
    const apagouVirgula =
      decimalAnterior.length > 0 &&
      !bruto.includes(',') &&
      bruto.replace(/\D/g, '') === remuneracao.replace(/\D/g, '')
    const formatado = formatarMoedaDigitando(apagouVirgula ? remuneracao : bruto)
    const digitosAntes = bruto.slice(0, cursor).replace(/\D/g, '').length
    const virgula = formatado.indexOf(',')
    const pos = apagouVirgula && virgula >= 0 ? virgula + 1 : posicaoAposDigitos(formatado, digitosAntes)
    if (formatado === remuneracao) {
      event.target.value = formatado
      event.target.setSelectionRange(pos, pos)
      return
    }
    cursorRemuneracao.current = pos
    setRemuneracao(formatado)
  }

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
    setEstado(modelo.estado || empresa.endereco.estado)
    setRaioKm(modelo.raioKm ?? null)
    setHoraInicio(modelo.horaInicio)
    setHoraFim(modelo.horaFim)
    setObservacoes(modelo.observacoes)
    setMotivo(modelo.motivo)
    setAtividades(modelo.atividades)
    setRemuneracao(finalizarMoeda(modelo.remuneracao))
    setBeneficios(beneficiosDoTexto(modelo.beneficios))
    setQuantidade(modelo.quantidade)
    setResultados(null)
    setMissaoId(null)
  }

  const beneficiosTexto = beneficios.join(', ')

  function chaveDaVaga(remuneracaoFinal = finalizarMoeda(remuneracao)) {
    return [
      cargoId,
      requisitos.join('|'),
      diferenciais.join('|'),
      inicio,
      fim,
      horaInicio,
      horaFim,
      String(quantidade),
      motivo,
      atividades.trim(),
      remuneracaoFinal,
      beneficiosTexto,
      cidade,
      estado,
      observacoes.trim(),
    ].join('§')
  }

  function pedidoDaVaga(remuneracaoFinal: string) {
    const cidadeMissao = cidade || empresa.endereco.cidade
    return {
      empresaId: empresa.id,
      cargo: cargoId,
      quantidade,
      data: inicio,
      dataFim: fim,
      horaInicio,
      horaFim,
      endereco: {
        ...empresa.endereco,
        cidade: cidadeMissao,
        estado: estado || empresa.endereco.estado,
        ...pontoOperacao(cidadeMissao, estado, empresa, [
          ...state.empresas.map((item) => item.endereco),
          ...state.profissionais.map((item) => item.endereco),
        ]),
      },
      valorDiaria: valorNumero(remuneracaoFinal),
      descricao: atividades,
      epis: beneficiosTexto,
      observacoes,
      requisitos,
      diferenciais,
      motivo,
      atividades,
      beneficios: beneficiosTexto,
    }
  }

  function validarPedido() {
    if (!empresaValidada) {
      setErro('A empresa tomadora precisa estar validada antes de publicar uma missão temporária.')
      return null
    }
    if (!cargoId) {
      setErro('Escolha o cargo.')
      return null
    }
    if (!motivo) {
      setErro('Informe o motivo da contratação temporária. Sem isso a missão não pode ser publicada.')
      return null
    }
    if (!atividades.trim()) {
      setErro('Descreva as atividades que serão realizadas.')
      return null
    }
    const remuneracaoFinal = finalizarMoeda(remuneracao)
    if (!remuneracaoFinal) {
      setErro('Informe a remuneração prevista. Ela entra no contrato com a empresa tomadora.')
      return null
    }
    setRemuneracao(remuneracaoFinal)
    if (quantidade < 1) {
      setErro('Informe quantos trabalhadores a missão precisa.')
      return null
    }
    if (!horaInicio || !horaFim) {
      setErro('Informe a jornada.')
      return null
    }
    const aviso = validarNecessidade('temporario', inicio, fim)
    if (aviso.nivel === 'bloqueio') {
      setErro(aviso.texto)
      return null
    }
    setErro('')
    return remuneracaoFinal
  }

  function alternarBeneficio(item: string) {
    setBeneficios((atual) => (atual.includes(item) ? atual.filter((b) => b !== item) : [...atual, item]))
  }

  function analisar() {
    const remuneracaoFinal = validarPedido()
    if (!remuneracaoFinal) return
    const salvo: ModeloMissao = {
      titulo: `${cargoLabel(cargoId)} — ${cidade || empresa.endereco.cidade}${estado ? `/${estado}` : ''}`,
      cargoId,
      requisitos,
      diferenciais,
      cidade,
      estado,
      raioKm,
      horaInicio,
      horaFim,
      observacoes,
      motivo,
      atividades,
      remuneracao: remuneracaoFinal,
      beneficios: beneficiosTexto,
      quantidade,
    }
    gravarModelo(empresa.id, salvo)
    setModelo(salvo)
    setAnalisando(true)
    setResultados(null)
    const chave = chaveDaVaga(remuneracaoFinal)
    setMissaoId((atual) => (atual && vagaPublicadaChave === chave ? atual : null))
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
        estado,
        raioKm,
        origem: pontoOperacao(cidade, estado, empresa, [
          ...state.empresas.map((item) => item.endereco),
          ...state.profissionais.map((item) => item.endereco),
        ]),
        observacoes,
        modalidade: 'temporario',
        quantidade,
        horaInicio,
        horaFim,
        motivo,
        atividades,
        remuneracao: remuneracaoFinal,
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
    }, 5000)
  }

  function publicar() {
    const remuneracaoFinal = validarPedido()
    if (!remuneracaoFinal) return
    const chave = chaveDaVaga(remuneracaoFinal)
    if (missaoId && vagaPublicadaChave === chave) {
      setAvisoPublicacao('Esta vaga já está publicada. Os colaboradores podem se candidatar.')
      return
    }
    const criada = publicarVaga(pedidoDaVaga(remuneracaoFinal))
    setMissaoId(criada.id)
    setVagaPublicadaChave(chave)
    setAvisoPublicacao('Vaga publicada. Os colaboradores já podem ver e se candidatar.')
    setAba('vagas')
  }

  function convidar(item: CurriculoAnalisado) {
    const resp = convidarParaMissao({
      demandaId: missaoId,
      profissionalId: item.profissional.id,
      score: item.score,
      distanciaKm: item.distanciaKm,
      pedido: missaoId ? undefined : pedidoDaVaga(finalizarMoeda(remuneracao)),
    })
    if (resp) setMissaoId(resp.demandaId)
  }

  const compativeis = resultados?.filter((r) => r.situacao !== 'bloqueado' && r.atendeObrigatorios) ?? []
  const incompletos = resultados?.filter((r) => r.situacao !== 'bloqueado' && !r.atendeObrigatorios) ?? []
  const bloqueadosPeriodo = resultados?.filter((r) => r.situacao === 'bloqueado') ?? []
  const atendemTudo = compativeis.length
  const vagaJaPublicada = Boolean(missaoId && vagaPublicadaChave === chaveDaVaga())

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
          {aba === 'vagas' && <PainelVagas empresaId={empresa.id} onPublicar={() => setAba('missao')} />}
          {aba === 'missoes' && <PainelMissoes empresaId={empresa.id} />}
          {aba === 'mapa' && <MapaMaoDeObra empresa={empresa} />}
          {aba === 'contratacoes' && <PainelContratacoes empresaId={empresa.id} />}
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

                <div className="cf-local">
                  <label className="cf-field">
                    <span>Estado</span>
                    <select
                      value={estado}
                      onChange={(event) => {
                        const uf = event.target.value
                        setEstado(uf)
                        if (uf) {
                          const cabe = locaisBusca.some(
                            (local) => semAcento(local.cidade) === semAcento(cidade) && local.estado.toUpperCase() === uf,
                          )
                          if (!cabe) setCidade('')
                        }
                      }}
                    >
                      <option value="">Todos</option>
                      {ufs.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </label>
                  <CampoCidade
                    cidade={cidade}
                    estado={estado}
                    onChange={(proximaCidade, proximoEstado) => {
                      setCidade(proximaCidade)
                      setEstado(proximoEstado)
                    }}
                    locais={locaisBusca}
                  />
                  <div className="cf-raio">
                    <label className="cf-field">
                      <span>Raio de busca</span>
                      <span className="cf-raio-linha">
                        <input
                          type="number"
                          min={1}
                          max={500}
                          inputMode="numeric"
                          value={raioKm ?? ''}
                          placeholder="km"
                          aria-label="Raio de busca em quilômetros"
                          onChange={(event) => {
                            const valor = Number(event.target.value)
                            setRaioKm(event.target.value === '' || !Number.isFinite(valor) || valor <= 0 ? null : Math.min(500, valor))
                          }}
                        />
                        <span>km</span>
                      </span>
                    </label>
                    <div className="cf-opcoes">
                      {RAIOS_BUSCA.map((km) => (
                        <button key={km} type="button" className={raioKm === km ? 'on' : ''} onClick={() => setRaioKm(km)}>
                          {km} km
                        </button>
                      ))}
                      <button type="button" className={raioKm == null ? 'on' : ''} onClick={() => setRaioKm(null)}>
                        Todos
                      </button>
                    </div>
                  </div>
                </div>

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
                  <span>Remuneração prevista por dia (R$)</span>
                  <input
                    ref={remuneracaoRef}
                    inputMode="decimal"
                    value={remuneracao}
                    onChange={aoDigitarRemuneracao}
                    onBlur={() => setRemuneracao((atual) => finalizarMoeda(atual))}
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
            {avisoPublicacao && <p className="success">{avisoPublicacao}</p>}
            <div className="cf-actions">
              <button
                type="button"
                className="cf-primary"
                onClick={analisar}
                disabled={analisando || avisoPrazo.nivel === 'bloqueio' || !motivo || !empresaValidada}
              >
                {analisando ? 'Analisando currículos' : 'Encontrar profissionais'}
              </button>
              <button
                type="button"
                className="cf-btn cf-btn--dark"
                onClick={publicar}
                disabled={analisando || avisoPrazo.nivel === 'bloqueio' || !motivo || !empresaValidada || vagaJaPublicada}
              >
                {vagaJaPublicada ? 'Vaga publicada' : 'Publicar vaga'}
              </button>
              <span className="muted">Publicar deixa a vaga visível para o colaborador se candidatar. A análise mostra o encaixe.</span>
            </div>
          </section>

          {resultados && (
            <section className="cf-results" ref={resultadosRef}>
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
                {quantidade} {cargoLabel(cargoId)} · {dias} dia{dias === 1 ? '' : 's'} · {horaInicio}–{horaFim} · {cidade || empresa.endereco.cidade}{estado ? `/${estado}` : ''}
                {raioKm != null ? ` · até ${raioKm} km` : ''}
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
      {analisando && <CartaoAnalise />}
    </div>
  )
}

function CartaoAnalise() {
  const [progresso, setProgresso] = useState(0)
  const lupaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const inicio = performance.now()
    let quadro = 0
    let ultimo = -1
    const tick = (agora: number) => {
      const decorrido = agora - inicio
      const pct = Math.min(100, Math.round((decorrido / 5000) * 100))
      if (pct !== ultimo) {
        ultimo = pct
        setProgresso(pct)
      }
      const lado = Math.sin(decorrido / 240)
      const lupa = lupaRef.current
      if (lupa) lupa.style.transform = `translateX(${lado * 46}px) rotate(${lado * 8}deg)`
      if (decorrido < 5200) quadro = requestAnimationFrame(tick)
    }
    quadro = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(quadro)
  }, [])

  return (
    <div className="cf-analisando" role="status" aria-live="polite">
      <div className="cf-analisando-card">
        <div className="cf-busca" aria-hidden>
          <div className="cf-folha">
            <strong>Currículo</strong>
            <span />
            <span />
            <span />
            <span />
            <div className="cf-lupa-move" ref={lupaRef}>
              <svg className="cf-lupa" viewBox="0 0 88 88">
                <circle cx="36" cy="36" r="20" />
                <path d="M50 50.5 68 68" />
                <path className="cf-ia-estrela" d="M36 28.5 37.6 33.4 42.8 34.1 38.8 37.6 40.1 42.6 36 39.8 31.9 42.6 33.2 37.6 29.2 34.1 34.4 33.4z" />
              </svg>
            </div>
          </div>
          <span className="cf-ia-selo">IA</span>
        </div>
        <p>Aguarda um momento. A IA está analisando os currículos para trazer os melhores profissionais para você.</p>
        <div className="cf-busca-linha">
          <div className="cf-busca-trilha" aria-hidden>
            <span style={{ width: `${progresso}%` }} />
          </div>
          <strong>{progresso}%</strong>
        </div>
      </div>
    </div>
  )
}

function PainelVagas({ empresaId, onPublicar }: { empresaId: string; onPublicar: () => void }) {
  const { state } = useStore()
  const vagas = state.demandas
    .filter((demanda) => demanda.empresaId === empresaId)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.data.localeCompare(a.data))
  const abertas = vagas.filter((demanda) => demanda.status === 'aberta').length
  const candidaturas = state.candidaturas.filter((item) => vagas.some((demanda) => demanda.id === item.demandaId)).length

  return (
    <section className="cf-panel">
      <header className="cf-vaga-pagina">
        <div className="cf-intro">
          <h1>Vagas</h1>
          <p>Vagas publicadas por esta empresa e quem já se candidatou.</p>
        </div>
        <button type="button" className="cf-primary" onClick={onPublicar}>
          Nova vaga
        </button>
      </header>
      {vagas.length > 0 && (
        <div className="cf-vaga-resumo">
          <span>
            <b>{vagas.length}</b> {vagas.length === 1 ? 'publicada' : 'publicadas'}
          </span>
          <span>
            <b>{abertas}</b> {abertas === 1 ? 'aberta' : 'abertas'}
          </span>
          <span>
            <b>{candidaturas}</b> {candidaturas === 1 ? 'candidatura' : 'candidaturas'}
          </span>
        </div>
      )}
      {vagas.length === 0 && (
        <div className="cf-card cf-vaga-vazia">
          <strong>Nenhuma vaga publicada.</strong>
          <p className="muted">Publique uma vaga temporária para ela aparecer aqui e na aba Vagas do colaborador.</p>
        </div>
      )}
      <div className="cf-vaga-lista">
        {vagas.map((vaga) => {
          const inscritos = state.candidaturas.filter((item) => item.demandaId === vaga.id)
          const periodo = `${formatarDataBr(vaga.data)}${vaga.dataFim ? ` a ${formatarDataBr(vaga.dataFim)}` : ''}`
          const texto = vaga.atividades || vaga.descricao
          return (
            <article key={vaga.id} className="cf-vaga">
              <div className="cf-vaga-corpo">
                <div className="cf-vaga-topo">
                  <div>
                    <span className={`cf-status cf-status--${vaga.status}`}>{rotuloStatusMissao(vaga.status)}</span>
                    <h2>{cargoLabel(vaga.cargo)}</h2>
                    <p>
                      {vaga.endereco.cidade}/{vaga.endereco.estado}
                    </p>
                  </div>
                  <div className="cf-vaga-valor">
                    <strong>
                      {vaga.valorDiaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                    <small>por dia</small>
                  </div>
                </div>
                <dl className="cf-vaga-fatos">
                  <div>
                    <dt>Período</dt>
                    <dd>{periodo}</dd>
                  </div>
                  <div>
                    <dt>Jornada</dt>
                    <dd>
                      {vaga.horaInicio}–{vaga.horaFim}
                    </dd>
                  </div>
                  <div>
                    <dt>Pessoas</dt>
                    <dd>
                      {vaga.quantidade} {vaga.quantidade === 1 ? 'trabalhador' : 'trabalhadores'}
                    </dd>
                  </div>
                  <div>
                    <dt>Candidatos</dt>
                    <dd>{inscritos.length}</dd>
                  </div>
                </dl>
                {texto && <p className="cf-vaga-texto">{texto}</p>}
                {(vaga.requisitos.length > 0 || vaga.beneficios) && (
                  <div className="cf-vaga-chips">
                    {vaga.requisitos.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                    {vaga.beneficios && <span className="cf-vaga-chip--soft">{vaga.beneficios}</span>}
                  </div>
                )}
              </div>
              <aside className="cf-vaga-pessoas">
                <h3>
                  Candidatos
                  <span>{inscritos.length}</span>
                </h3>
                {inscritos.length === 0 ? (
                  <p>Ninguém se candidatou ainda.</p>
                ) : (
                  <ul>
                    {inscritos.map((inscrito) => {
                      const pessoa = state.profissionais.find((item) => item.id === inscrito.profissionalId)
                      const nome = pessoa?.nome ?? 'Trabalhador'
                      return (
                        <li key={inscrito.id}>
                          <span className="cf-vaga-avatar">
                            {pessoa?.foto ? <img src={pessoa.foto} alt="" /> : iniciaisNome(nome)}
                          </span>
                          <span className="cf-vaga-nome">
                            <strong>{nome}</strong>
                            <small>
                              {pessoa ? `${pessoa.endereco.cidade}/${pessoa.endereco.estado}` : 'Colaborador'}
                            </small>
                          </span>
                          <span className={`cf-vaga-selo cf-vaga-selo--${inscrito.status}`}>{rotuloConvite(inscrito.status)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </aside>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function iniciaisNome(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] ?? '' : ''
  return `${primeira}${ultima}`.toUpperCase()
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
          <p className="muted">Publique a vaga para os colaboradores verem e se candidatarem.</p>
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
                <p className="muted">Nenhuma candidatura ainda.</p>
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

function PainelContratacoes({ empresaId }: { empresaId: string }) {
  const { state } = useStore()
  const demandas = state.demandas.filter((demanda) => demanda.empresaId === empresaId)
  const demandasIds = new Set(demandas.map((demanda) => demanda.id))
  const contratos = state.contratos.filter(
    (contrato) => contrato.empresaId === empresaId || demandasIds.has(contrato.demandaId),
  )
  const confirmadasSemContrato = state.candidaturas.filter(
    (candidatura) =>
      demandasIds.has(candidatura.demandaId) &&
      candidatura.status === 'confirmada' &&
      !contratos.some((contrato) => contrato.candidaturaId === candidatura.id),
  )
  const linhas = [
    ...contratos.map((contrato) => {
      const demanda = demandas.find((item) => item.id === contrato.demandaId)
      const profissional = state.profissionais.find((item) => item.id === contrato.profissionalId)
      return {
        id: contrato.id,
        quando: contrato.createdAt,
        cargo: demanda?.cargo ?? '',
        profissional: profissional?.nome ?? 'Trabalhador',
        cidade: demanda ? `${demanda.endereco.cidade}/${demanda.endereco.estado}` : '',
        inicio: contrato.inicioEm || demanda?.data || '',
        fim: contrato.fimEm || demanda?.dataFim || '',
        jornada: demanda ? `${demanda.horaInicio}–${demanda.horaFim}` : '',
        motivo: demanda?.motivo ?? '',
        atividades: demanda?.atividades ?? '',
        valor: contrato.valor || demanda?.valorDiaria || 0,
        numero: contrato.numero,
        status: rotuloContrato(contrato.status),
        statusClasse: contrato.status === 'rescindido' ? 'cancelada' : contrato.status === 'concluido' ? 'finalizada' : 'em_andamento',
        servicos: contrato.tiposServico.filter(Boolean),
      }
    }),
    ...confirmadasSemContrato.map((candidatura) => {
      const demanda = demandas.find((item) => item.id === candidatura.demandaId)
      const profissional = state.profissionais.find((item) => item.id === candidatura.profissionalId)
      return {
        id: candidatura.id,
        quando: candidatura.createdAt,
        cargo: demanda?.cargo ?? '',
        profissional: profissional?.nome ?? 'Trabalhador',
        cidade: demanda ? `${demanda.endereco.cidade}/${demanda.endereco.estado}` : '',
        inicio: demanda?.data ?? '',
        fim: demanda?.dataFim ?? '',
        jornada: demanda ? `${demanda.horaInicio}–${demanda.horaFim}` : '',
        motivo: demanda?.motivo ?? '',
        atividades: demanda?.atividades ?? '',
        valor: demanda?.valorDiaria ?? 0,
        numero: '',
        status: 'Confirmada',
        statusClasse: 'em_andamento',
        servicos: [] as string[],
      }
    }),
  ].sort((a, b) => b.quando.localeCompare(a.quando))

  return (
    <section className="cf-panel">
      <div className="cf-intro">
        <h1>Minhas contratações</h1>
        <p>Contratos temporários já gerados por esta empresa, com o serviço e o profissional de cada um.</p>
      </div>
      {linhas.length === 0 && (
        <div className="cf-card">
          <strong>Nenhuma contratação ainda.</strong>
          <p className="muted">Quando um contrato temporário for gerado, ele aparece aqui com o tipo de serviço e o profissional.</p>
        </div>
      )}
      <div className="cf-mission-list">
        {linhas.map((linha) => (
          <article key={linha.id} className="cf-card cf-mission">
            <div className="cf-mission-head">
              <h2>{linha.cargo ? cargoLabel(linha.cargo) : 'Serviço temporário'}</h2>
              <span className={`cf-status cf-status--${linha.statusClasse}`}>{linha.status}</span>
            </div>
            <p>
              {linha.servicos.length ? linha.servicos.join(' · ') : rotuloCategoria(linha.cargo)}
              {linha.numero ? ` · Contrato ${linha.numero}` : ''}
            </p>
            <ul className="cf-invite-list">
              <li>
                <strong>{linha.profissional}</strong>
                <span>Profissional</span>
              </li>
            </ul>
            <p>
              {linha.inicio ? formatarDataBr(linha.inicio.slice(0, 10)) : 'Início não informado'}
              {linha.fim ? ` a ${formatarDataBr(linha.fim.slice(0, 10))}` : ''}
              {linha.jornada ? ` · ${linha.jornada}` : ''}
              {linha.cidade ? ` · ${linha.cidade}` : ''}
            </p>
            <p>
              {linha.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por dia
              {linha.motivo ? ` · ${rotuloMotivo(linha.motivo)}` : ''}
            </p>
            {linha.atividades && <p>{linha.atividades}</p>}
          </article>
        ))}
      </div>
    </section>
  )
}

function rotuloCategoria(cargoId: string) {
  return allCargos().find((cargo) => cargo.id === cargoId)?.categoriaLabel ?? 'Trabalho temporário'
}

function rotuloContrato(status: string) {
  if (status === 'assinado_profissional') return 'Assinado pelo trabalhador'
  if (status === 'concluido') return 'Concluída'
  if (status === 'rescindido') return 'Rescindida'
  return 'Contrato gerado'
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
  if (status === 'aceita') return 'Candidatou-se'
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
  const [perfilAberto, setPerfilAberto] = useState(false)
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
        <button
          type="button"
          className="cf-btn cf-btn--dark"
          onClick={(event) => {
            event.stopPropagation()
            setPerfilAberto(true)
          }}
        >
          Ver perfil
        </button>
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
      {perfilAberto && (
        <PerfilColaborador
          pessoa={p}
          distancia={item.distanciaKm}
          onFechar={() => setPerfilAberto(false)}
        />
      )}
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
