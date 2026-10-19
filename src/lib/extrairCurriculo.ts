import { allCargos } from '../data/categories'
import { LOCAIS_OPERACAO } from '../data/cidades'
import {
  curriculoVazio,
  mesAtual,
  nomeCertificado,
  ordenarExperiencias,
  semAcento,
  semContato,
  type CurriculoLido,
} from './curriculo'
import { cpfValido, formatarCpf } from './pix'
import type { Experiencia } from './types'

const UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
])

const MESES: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
}

const TITULO_EXPERIENCIA =
  /^(experiencias?( profissiona(l|is))?|historico profissional|trajetoria profissional|empregos anteriores|ultimos empregos|atuacao profissional)$/
const TITULO_OUTRO =
  /^(formacao( academica| escolar)?|escolaridade|educacao|cursos?( complementares| profissionalizantes| e certificacoes| e treinamentos)?|certificacoes|certificados|treinamentos|qualificacoes( profissionais)?|habilidades|competencias|conhecimentos|idiomas|informacoes (adicionais|complementares|pessoais)|referencias|dados pessoais|contato|endereco|disponibilidade|cargos?( pretendidos?)?|area de interesse|objetivos?( profissiona(l|is))?|resumo( profissional)?|perfil( profissional)?|sobre( mim)?|apresentacao)$/
const TITULO_RESUMO = /^(objetivos?( profissiona(l|is))?|resumo( profissional)?|perfil( profissional)?|sobre( mim)?|apresentacao)\b/

const MES_NOME = '\\b(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\\.?'
const TOKEN = `(?:\\b\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{4}\\b|\\b\\d{1,2}\\s*[/.-]\\s*\\d{4}\\b|${MES_NOME}\\s*(?:de|/|-|\\.)?\\s*\\d{4}\\b|\\b\\d{4}\\b)`
const ATUAL = '(?:o\\s+)?(?:atual(?:mente)?|momento|presente|hoje|dias\\s+atuais)'
const PERIODO = new RegExp(`(${TOKEN})\\s*(?:a|ate|-|–|—|ao|/|~)\\s*(${TOKEN}|${ATUAL})`, 'g')
const DESDE = new RegExp(`(?:desde|a partir de)\\s+(${TOKEN})`, 'g')

const PALAVRAS_CARGO =
  /^(auxiliar|ajudante|operador|operadora|motorista|conferente|separador|separadora|estoquista|encarregad|assistente|analista|supervisor|lider|coordenador|gerente|vigilante|porteiro|repositor|almoxarife|mecanico|eletricista|soldador|montador|embalador|expedidor|inventarista|controlador|faturista|recepcionista|copeir|faxineir|manobrista|carreteiro|entregador|empilhadeirista|programador|inspetor|monitor|borracheiro|lavador|funileiro|lubrificador|jovem aprendiz|aprendiz|estagiari|atendente|vendedor|caixa|cozinheir|garcom|pedreiro|servente|zelador|frentista|balconista|promotor|tecnico|chefe|apontador|digitador|arrumador|movimentador|carregador|descarregador|serralheiro|pintor|marceneiro|costureir|limpeza|servicos gerais)/
const PALAVRAS_EMPRESA =
  /\b(ltda|s\.?\/?a\.?|eireli|epp|me|transportes?|transportadora|logistica|log|comercio|comercial|industria|industrial|distribuidora|distribuicao|supermercados?|atacad\w*|grupo|cia|express|armazens?|armazem|servicos|alimentos|bebidas|varejo|magazine|construtora|engenharia)\b/
const ESCOLAR = /\b(ensino|escola|colegio|faculdade|universidade|curso|graduacao|senai|senac|etec|fatec|tecnico em)\b/

const CARGOS_SINONIMOS: Record<string, string[]> = {
  empilhadeira: ['operador de empilhadeira', 'operadora de empilhadeira', 'empilhadeirista'],
  ajudante_carga: ['ajudante de carga', 'carga e descarga', 'ajudante geral', 'auxiliar de carga', 'carregador'],
  separador: ['separador', 'separadora', 'separacao de pedidos', 'picking'],
  auxiliar_logistica: ['auxiliar de logistica', 'assistente de logistica'],
  estoquista: ['estoquista', 'almoxarife', 'auxiliar de almoxarifado', 'auxiliar de estoque'],
  carreteiro: ['carreteiro', 'motorista carreteiro', 'motorista de carreta'],
  motorista_truck: ['motorista truck', 'motorista de caminhao truck'],
  motorista_entrega: ['motorista entregador', 'motorista de entrega'],
  auxiliar_limpeza: ['auxiliar de limpeza', 'faxineira', 'faxineiro'],
  servicos_gerais: ['servicos gerais'],
  auxiliar_producao: ['auxiliar de producao', 'ajudante de producao'],
  mecanico_diesel: ['mecanico diesel', 'mecanico de diesel', 'mecanico de caminhao'],
  eletricista: ['eletricista automotivo', 'eletricista de veiculos'],
  expedidor: ['expedidor', 'auxiliar de expedicao'],
}
const CARGO_PALAVRA_UNICA = new Set([
  'conferente', 'estoquista', 'expedidor', 'inventarista', 'repositor', 'embalador', 'soldador', 'borracheiro',
  'funileiro', 'lubrificador', 'faturista', 'recepcionista', 'copeira', 'vigilante', 'porteiro', 'montador',
  'sinaleiro', 'manobrista',
])

const HABILIDADES: [RegExp, string][] = [
  [/\bwms\b/, 'WMS'],
  [/\bsap\b/, 'SAP'],
  [/\btms\b/, 'TMS'],
  [/\bexcel\b/, 'Excel'],
  [/pacote office|microsoft office|\bms office\b/, 'Pacote Office'],
  [/coletor/, 'Coletor de dados'],
  [/radio ?frequencia/, 'Radiofrequência'],
  [/\bfifo\b/, 'FIFO'],
  [/\bfefo\b/, 'FEFO'],
  [/\b5s\b/, '5S'],
  [/inventario/, 'Inventário'],
  [/roteiriza/, 'Roteirização'],
  [/empilhadeira/, 'Empilhadeira'],
  [/paleteira/, 'Paleteira'],
  [/separacao de pedidos|picking/, 'Separação de pedidos'],
  [/conferencia/, 'Conferência'],
  [/notas? fisca(l|is)/, 'Nota fiscal'],
  [/carga e descarga/, 'Carga e descarga'],
]

const ESCOLARIDADE: [RegExp, string][] = [
  [/pos[- ]?graduac|\bmba\b|mestrado/, 'Pós-graduação'],
  [/superior completo|graduad[oa] em|bacharel|licenciatura/, 'Ensino superior completo'],
  [/superior (incompleto|cursando|em andamento)|cursando (o )?(ensino )?superior|graduacao (em andamento|cursando|incompleta)/, 'Ensino superior incompleto'],
  [/(curso|ensino) tecnico|tecnico (completo|concluido)/, 'Ensino técnico'],
  [/medio completo|(2o|segundo) grau completo/, 'Ensino médio completo'],
  [/medio (incompleto|cursando|em andamento)|cursando (o )?(ensino )?medio/, 'Ensino médio incompleto'],
  [/fundamental completo|(1o|primeiro) grau completo/, 'Ensino fundamental completo'],
  [/fundamental incompleto|(1o|primeiro) grau incompleto/, 'Ensino fundamental incompleto'],
]

function limparTitulo(linha: string) {
  return semAcento(linha)
    .replace(/[:•*#_|>\-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ehTituloConhecido(linha: string) {
  const t = limparTitulo(linha)
  return t.length <= 45 && (TITULO_EXPERIENCIA.test(t) || TITULO_OUTRO.test(t))
}

/** Título conhecido ou linha curta toda em maiúsculas. */
function ehTitulo(linha: string) {
  if (ehTituloConhecido(linha)) return true
  const letras = linha.replace(/[^A-Za-zÀ-ÿ]/g, '')
  return letras.length >= 4 && linha.length <= 40 && linha === linha.toUpperCase() && !/\d/.test(linha) && linha.trim().split(/\s+/).length <= 3
}

function mesValido(ano: number, mes: number) {
  const anoAtual = new Date().getFullYear()
  if (ano < 1960 || ano > anoAtual + 1 || mes < 1 || mes > 12) return ''
  const valor = `${ano}-${String(mes).padStart(2, '0')}`
  return valor > mesAtual() ? mesAtual() : valor
}

function lerMes(token: string, fimDoAno: boolean) {
  const t = token.trim()
  let m = /^\d{1,2}[/.-](\d{1,2})[/.-](\d{4})$/.exec(t)
  if (m) return mesValido(Number(m[2]), Number(m[1]))
  m = /^(\d{1,2})\s*[/.-]\s*(\d{4})$/.exec(t)
  if (m) return mesValido(Number(m[2]), Number(m[1]))
  m = /^([a-z]{3})[a-z]*\.?\s*(?:de|\/|-|\.)?\s*(\d{4})$/.exec(t)
  if (m && MESES[m[1]]) return mesValido(Number(m[2]), MESES[m[1]])
  m = /^(\d{4})$/.exec(t)
  if (m) return mesValido(Number(m[1]), fimDoAno ? 12 : 1)
  return ''
}

type Periodo = { inicio: string; fim: string; de: number; ate: number }

function periodoDaLinha(plana: string): Periodo | null {
  for (const m of plana.matchAll(PERIODO)) {
    const inicio = lerMes(m[1], false)
    const atual = new RegExp(`^${ATUAL}$`).test(m[2].trim())
    const fim = atual ? 'atual' : lerMes(m[2], true)
    if (!inicio || !fim) continue
    if (fim !== 'atual' && fim < inicio) continue
    return { inicio, fim, de: m.index ?? 0, ate: (m.index ?? 0) + m[0].length }
  }
  for (const m of plana.matchAll(DESDE)) {
    const inicio = lerMes(m[1], false)
    if (inicio) return { inicio, fim: 'atual', de: m.index ?? 0, ate: (m.index ?? 0) + m[0].length }
  }
  return null
}

function rotulado(linha: string, chaves: RegExp) {
  const plana = semAcento(linha)
  const m = chaves.exec(plana)
  if (!m) return null
  return linha.slice(m[0].length).replace(/^[\s:–—-]+/, '').trim()
}

const ROTULO_EMPRESA = /^(empresa|empregador|local de trabalho|local)\s*:/
const ROTULO_CARGO = /^(cargo|funcao|ocupacao|posicao)\s*:/
const ROTULO_DESCRICAO = /^(atividades( desenvolvidas| realizadas)?|principais atividades|atribuicoes|responsabilidades|descricao)\s*:?/
const ROTULO_PERIODO = /^(periodo|data|duracao)\s*:?/

function maiuscula(texto: string) {
  return texto ? texto[0].toUpperCase() + texto.slice(1) : texto
}

function pareceCargo(texto: string) {
  return PALAVRAS_CARGO.test(semAcento(texto).trim())
}

function pareceEmpresa(texto: string) {
  return PALAVRAS_EMPRESA.test(semAcento(texto))
}

function linhaCurta(linha: string) {
  return (
    linha.length <= 70 &&
    !/[.;]$/.test(linha) &&
    !/^[-•*·▪➢–]/.test(linha) &&
    !ROTULO_DESCRICAO.test(semAcento(linha)) &&
    !ehTituloConhecido(linha)
  )
}

function acharExperiencias(linhas: string[]): Experiencia[] {
  const planas = linhas.map((linha) => semAcento(linha))
  const ini = planas.findIndex((linha) => TITULO_EXPERIENCIA.test(limparTitulo(linha)))
  let fimSecao = linhas.length
  if (ini >= 0) {
    const prox = linhas.findIndex(
      (linha, i) => i > ini && ehTituloConhecido(linha) && !TITULO_EXPERIENCIA.test(limparTitulo(linha)),
    )
    if (prox > ini) fimSecao = prox
  }
  const comeco = ini >= 0 ? ini + 1 : 0

  const marcas: { i: number; periodo: Periodo }[] = []
  for (let i = comeco; i < fimSecao; i += 1) {
    const periodo = periodoDaLinha(planas[i])
    if (!periodo) continue
    if (ini < 0 && ESCOLAR.test(planas[i])) continue
    marcas.push({ i, periodo })
  }

  const antesDe = marcas.map(({ i }, k) => {
    const limite = k > 0 ? marcas[k - 1].i + 1 : comeco
    const lista: number[] = []
    let soltas = 0
    for (let j = i - 1; j >= limite && lista.length < 4; j -= 1) {
      const rotulada = ROTULO_EMPRESA.test(planas[j]) || ROTULO_CARGO.test(planas[j])
      if (!rotulada) {
        if (!linhaCurta(linhas[j]) || soltas >= 2) break
        soltas += 1
      }
      lista.unshift(j)
    }
    return lista
  })

  const saida: Experiencia[] = []
  marcas.forEach(({ i, periodo }, k) => {
    const proxima = k + 1 < marcas.length ? (antesDe[k + 1][0] ?? marcas[k + 1].i) : fimSecao
    const bloco = [...antesDe[k], i]
    for (let j = i + 1; j < proxima; j += 1) bloco.push(j)

    let empresa = ''
    let cargo = ''
    const descricao: string[] = []
    const soltas: string[] = []

    const linhaPeriodo = linhas[i].length === planas[i].length
      ? `${linhas[i].slice(0, periodo.de)} ${linhas[i].slice(periodo.ate)}`
      : ''
    const resto = (rotulado(linhaPeriodo, ROTULO_PERIODO) ?? linhaPeriodo)
      .split(/\s+[-–—|]\s+|\s*[|•·]\s*|,\s+|[()]/)
      .map((parte) => parte.replace(/^[\s:–—-]+|[\s:–—-]+$/g, '').trim())
      .filter((parte) => parte.length >= 2 && !/^(de|desde|periodo|a|ate)$/i.test(parte))

    for (const j of bloco) {
      if (j === i) {
        soltas.push(...resto)
        continue
      }
      const linha = linhas[j]
      const emp = rotulado(linha, ROTULO_EMPRESA)
      if (emp != null) {
        if (!empresa) empresa = emp
        continue
      }
      const car = rotulado(linha, ROTULO_CARGO)
      if (car != null) {
        if (!cargo) cargo = car
        continue
      }
      const desc = rotulado(linha, ROTULO_DESCRICAO)
      if (desc != null) {
        if (desc) descricao.push(desc)
        continue
      }
      if (ROTULO_PERIODO.test(planas[j])) continue
      if (j < i) soltas.push(linha)
      else if (!descricao.length && !cargo && linhaCurta(linha) && pareceCargo(linha)) cargo = linha
      else if (!descricao.length && !empresa && linhaCurta(linha) && pareceEmpresa(linha)) empresa = linha
      else if (/^[-•*·▪➢–]/.test(linha) && descricao.length) descricao.push(`; ${linha.replace(/^[-•*·▪➢–]\s*/, '')}`)
      else descricao.push(linha.replace(/^[-•*·▪➢–]\s*/, ''))
    }

    const livres = soltas.filter(Boolean)
    if (!cargo) {
      const achado = livres.find(pareceCargo)
      if (achado) {
        cargo = achado
        livres.splice(livres.indexOf(achado), 1)
      }
    }
    if (!empresa) {
      const achado = livres.find(pareceEmpresa) ?? livres[0]
      if (achado) {
        empresa = achado
        livres.splice(livres.indexOf(achado), 1)
      }
    }
    if (!cargo && livres[0]) cargo = livres[0]
    const junto = !empresa ? /^(.+?)\s+(?:na|no|em|pela|pelo)\s+(.+)$/.exec(cargo) : null
    if (junto && pareceCargo(junto[1])) {
      cargo = junto[1]
      empresa = junto[2]
    }

    cargo = maiuscula(semContato(cargo).slice(0, 60).trim())
    empresa = semContato(empresa).slice(0, 80).trim()
    if (!cargo && !empresa) return
    saida.push({
      cargo,
      empresa,
      inicio: periodo.inicio,
      fim: periodo.fim,
      descricao: semContato(descricao.slice(0, 6).join(' ').replace(/\s+;/g, ';')).replace(/\s+/g, ' ').slice(0, 300).trim(),
    })
  })
  return ordenarExperiencias(saida).slice(0, 8)
}

function acharNome(linhas: string[]) {
  for (const linha of linhas.slice(0, 40)) {
    const valor = rotulado(linha, /^nome( completo)?\s*:/)
    if (valor && /^[A-Za-zÀ-ÿ' ]{5,60}$/.test(valor)) return nomeBonito(valor)
  }
  for (const linha of linhas.slice(0, 6)) {
    if (/curr[ií]cul|vitae|resum/i.test(linha) || ehTituloConhecido(linha)) continue
    if (!/^[A-Za-zÀ-ÿ' ]{5,60}$/.test(linha)) continue
    const palavras = linha.trim().split(/\s+/)
    if (palavras.length < 2 || palavras.length > 6) continue
    return nomeBonito(linha)
  }
  return ''
}

function nomeBonito(nome: string) {
  const limpo = nome.replace(/\s+/g, ' ').trim()
  if (limpo !== limpo.toUpperCase()) return limpo
  return limpo
    .toLowerCase()
    .split(' ')
    .map((p) => (['da', 'de', 'do', 'das', 'dos', 'e'].includes(p) ? p : maiuscula(p)))
    .join(' ')
}

function acharCpf(texto: string) {
  for (const m of texto.matchAll(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g)) {
    const digitos = m[0].replace(/\D/g, '')
    if (cpfValido(digitos)) return formatarCpf(digitos)
  }
  return ''
}

function acharTelefone(texto: string) {
  const m = /(?:\+?55[\s.-]?)?\(?\b(\d{2})\)?[\s.-]?(9?\d{4})[\s.-]?(\d{4})\b/.exec(texto)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : ''
}

function acharNascimento(plano: string) {
  const m = /(?:nascimento|nascid[oa] em|data de nasc\.?)\s*:?\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(plano)
  if (!m) return ''
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const data = new Date(ano, mes - 1, dia)
  if (data.getMonth() !== mes - 1 || ano < 1940 || ano > new Date().getFullYear() - 14) return ''
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function escaparRegex(texto: string) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function acharCidade(linhas: string[], nome: string) {
  const chaveNome = semAcento(nome)
  const topo = linhas.slice(0, 30).filter((linha) => !chaveNome || semAcento(linha) !== chaveNome)
  const plano = semAcento(topo.join('\n'))
  let comUf: { i: number; cidade: string; estado: string } | null = null
  let semUf: { i: number; cidade: string; estado: string } | null = null
  for (const local of LOCAIS_OPERACAO) {
    const chave = escaparRegex(semAcento(local.cidade))
    const m = new RegExp(`(^|[^a-z])${chave}(?![a-z])(\\s*[-/,–]\\s*${local.estado.toLowerCase()}\\b)?`).exec(plano)
    if (!m) continue
    const achado = { i: m.index, cidade: local.cidade, estado: local.estado }
    if (m[2]) {
      if (!comUf || m.index < comUf.i) comUf = achado
    } else if (!semUf || m.index < semUf.i) {
      semUf = achado
    }
  }
  const local = comUf ?? semUf
  if (local) return { cidade: local.cidade, estado: local.estado }
  for (const linha of topo) {
    const m = /([A-ZÀ-Ú][A-Za-zÀ-ÿ' ]{2,40}?)\s*[-/–]\s*([A-Z]{2})\b/.exec(linha)
    if (m && UFS.has(m[2])) return { cidade: m[1].trim(), estado: m[2] }
  }
  return { cidade: '', estado: '' }
}

function acharCnh(texto: string) {
  const m =
    /(?:CNH|C\.N\.H\.?|[Hh]abilita[cç][aã]o|HABILITA[CÇ][AÃ]O|[Cc]arteira de [Mm]otorista)[^\n]{0,40}?\b(ACC|[A-E]{1,3})\b/.exec(texto)
  if (!m) return ''
  const bruto = m[1]
  if (bruto === 'ACC') return 'ACC'
  if (new Set(bruto).size !== bruto.length) return ''
  return ['A', 'B', 'C', 'D', 'E'].filter((letra) => bruto.includes(letra)).join('')
}

function acharCertificados(texto: string) {
  const plano = semAcento(texto)
  const lista = new Set<string>()
  for (const m of texto.matchAll(/\bNR\s*-?\s*0?(\d{1,2})\b/gi)) lista.add(nomeCertificado(`NR${m[1]}`))
  if (/\bmopp\b/.test(plano)) lista.add('MOPP')
  const curso = '(curso|certifica\\w*|treinamento|capacita\\w*|habilitad\\w*|habilitacao)'
  if (new RegExp(`${curso}[^\\n]{0,40}munck|munck[^\\n]{0,20}${curso}`).test(plano)) lista.add('Munck')
  if (new RegExp(`${curso}[^\\n]{0,40}ponte rolante|ponte rolante[^\\n]{0,20}${curso}`).test(plano)) lista.add('Ponte Rolante')
  if (/direcao defensiva/.test(plano)) lista.add('Direção defensiva')
  if (/primeiros socorros/.test(plano)) lista.add('Primeiros socorros')
  if (/brigad(a|ista)/.test(plano)) lista.add('Brigada de incêndio')
  return [...lista].slice(0, 12)
}

function acharEscolaridade(plano: string) {
  return ESCOLARIDADE.find(([re]) => re.test(plano))?.[1] ?? ''
}

function acharHabilidades(plano: string) {
  return HABILIDADES.filter(([re]) => re.test(plano))
    .map(([, rotulo]) => rotulo)
    .slice(0, 10)
}

function acharCargos(plano: string, cnh: string) {
  const achados: { id: string; i: number }[] = []
  for (const cargo of allCargos()) {
    const base = semAcento(cargo.label.replace(/\(.*?\)/g, '')).trim()
    const termos = [...(CARGOS_SINONIMOS[cargo.id] ?? [])]
    if (base.includes(' ') || CARGO_PALAVRA_UNICA.has(base)) termos.push(base)
    let melhor = -1
    for (const termo of termos) {
      const m = new RegExp(`(^|[^a-z])${escaparRegex(termo)}(?![a-z])`).exec(plano)
      if (m && (melhor < 0 || m.index < melhor)) melhor = m.index
    }
    if (melhor >= 0) achados.push({ id: cargo.id, i: melhor })
  }
  const ids = achados.sort((a, b) => a.i - b.i).map((a) => a.id)
  const temMotorista = ids.some((id) => id.startsWith('motorista') || id === 'carreteiro')
  if (!temMotorista && /\bmotorista\b/.test(plano) && cnh) {
    const id = cnh.includes('E') ? 'motorista_cnh_e' : cnh.includes('D') ? 'motorista_cnh_d' : cnh.includes('C') ? 'motorista_truck' : cnh.includes('B') ? 'motorista_cnh_b' : ''
    if (id) ids.push(id)
  }
  return [...new Set(ids)].slice(0, 6)
}

function acharResumo(linhas: string[]) {
  for (let i = 0; i < linhas.length; i += 1) {
    const plano = limparTitulo(linhas[i])
    if (!TITULO_RESUMO.test(plano)) continue
    const doisPontos = linhas[i].indexOf(':')
    const depois = doisPontos >= 0 ? linhas[i].slice(doisPontos + 1).trim() : ''
    if (!depois && plano.length > 45) continue
    const partes = depois ? [depois] : []
    for (let j = i + 1; !depois && j < linhas.length && partes.length < 5; j += 1) {
      if (ehTitulo(linhas[j]) || periodoDaLinha(semAcento(linhas[j]))) break
      partes.push(linhas[j].replace(/^[-•*·▪➢–]\s*/, ''))
    }
    const texto = semContato(partes.join(' ')).replace(/\s+/g, ' ').trim()
    if (texto.length >= 15) return texto.slice(0, 500)
  }
  return ''
}

/** Leitura sem IA: procura os campos pelo jeito comum de escrever currículo no Brasil. */
export function extrairCurriculoLocal(textoBruto: string): CurriculoLido {
  const texto = textoBruto.normalize('NFC').replace(/\r/g, '')
  const linhas = texto
    .split('\n')
    .map((linha) => linha.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter(Boolean)
  const limpas = linhas.map((linha) => semContato(linha)).filter(Boolean)
  const plano = semAcento(limpas.join('\n'))
  const lido = curriculoVazio()

  lido.email = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(texto)?.[0] ?? ''
  lido.cpf = acharCpf(texto)
  lido.telefone = acharTelefone(texto.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, ''))
  lido.nome = acharNome(limpas)
  lido.nascimento = acharNascimento(semAcento(texto))
  const local = acharCidade(limpas, lido.nome)
  lido.cidade = local.cidade
  lido.estado = local.estado
  lido.cnhCategoria = acharCnh(texto)
  lido.certificados = acharCertificados(limpas.join('\n'))
  lido.escolaridade = acharEscolaridade(plano)
  lido.habilidades = acharHabilidades(plano)
  lido.profissoes = acharCargos(plano, lido.cnhCategoria)
  lido.experiencia = acharExperiencias(limpas)
  lido.resumo = acharResumo(limpas)
  return lido
}
