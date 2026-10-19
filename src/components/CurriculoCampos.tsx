import { useRef, useState } from 'react'
import { ESCOLARIDADES, mesAtual } from '../lib/curriculo'
import { ACCEPT_CURRICULO, lerCurriculo, type LeituraCurriculo } from '../lib/lerCurriculo'
import type { Experiencia } from '../lib/types'
import './curriculo.css'

type Resultado = { nome: string; entrou: string[]; porIa: boolean }

export function AnexoCurriculo({
  onLido,
  arquivoAtual,
}: {
  /** Aplica a leitura no formulário e devolve o que entrou. */
  onLido: (leitura: LeituraCurriculo) => string[]
  arquivoAtual?: string
}) {
  const vez = useRef(0)
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)

  async function escolher(file: File | undefined) {
    const minha = vez.current + 1
    vez.current = minha
    setErro('')
    setResultado(null)
    if (!file) return
    setLendo(true)
    try {
      const leitura = await lerCurriculo(file)
      if (vez.current !== minha) return
      const entrou = onLido(leitura)
      setResultado({ nome: leitura.arquivoNome, entrou, porIa: leitura.porIa })
    } catch (falha) {
      if (vez.current !== minha) return
      setErro(falha instanceof Error ? falha.message : 'Não foi possível ler o currículo.')
    } finally {
      if (vez.current === minha) setLendo(false)
    }
  }

  const nome = resultado?.nome || arquivoAtual
  return (
    <div className="cv-anexo">
      <label className={lendo ? 'cv-anexo__alvo cv-anexo__alvo--lendo' : 'cv-anexo__alvo'}>
        <input
          type="file"
          accept={ACCEPT_CURRICULO}
          disabled={lendo}
          onChange={(e) => {
            void escolher(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M7 3h7l5 5v13H7z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M14 3v5h5M10 13h6M10 17h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        <strong>{lendo ? 'Lendo o currículo…' : nome ? 'Trocar currículo' : 'Anexar currículo'}</strong>
        <small>{nome && !lendo ? nome : 'PDF ou Word (.docx ou .doc), até 8 MB'}</small>
      </label>
      {erro && <p className="error">{erro}</p>}
      {resultado && (
        <div className="cv-anexo__ok">
          <strong>
            {resultado.entrou.length
              ? 'Lemos o currículo e preenchemos:'
              : 'Lemos o currículo. Os campos que ele tem já estavam preenchidos.'}
          </strong>
          {resultado.entrou.length > 0 && (
            <ul>
              {resultado.entrou.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <p>
            {resultado.porIa
              ? 'Confira cada campo antes de salvar.'
              : 'Leitura simples, feita sem a IA. Confira cada campo com atenção.'}
          </p>
        </div>
      )}
    </div>
  )
}

/** Mensagem de erro ou vazio quando as experiências estão certas. */
export function conferirExperiencias(lista: Experiencia[]) {
  for (const item of lista) {
    if (!item.cargo.trim() && !item.empresa.trim()) continue
    const nome = item.cargo.trim() || item.empresa.trim()
    if (!item.cargo.trim()) return `Informe o cargo da experiência em ${item.empresa.trim()}.`
    if (item.inicio && !item.fim) return `Informe o fim de "${nome}" ou marque que trabalha lá atualmente.`
    if (item.inicio && item.fim !== 'atual' && item.fim < item.inicio) return `Em "${nome}", o fim vem antes do início.`
  }
  return ''
}

export function ListaExperiencias({
  itens,
  onChange,
  classeCampo = '',
}: {
  itens: Experiencia[]
  onChange: (lista: Experiencia[]) => void
  classeCampo?: string
}) {
  const limite = mesAtual()

  function mudar(index: number, dados: Partial<Experiencia>) {
    onChange(itens.map((item, i) => (i === index ? { ...item, ...dados } : item)))
  }

  return (
    <div className="cv-exp">
      {itens.length === 0 && <p className="cv-exp__vazio">Nenhuma experiência ainda. Inclua os trabalhos que você já fez.</p>}
      {itens.map((item, index) => {
        const atual = item.fim === 'atual'
        return (
          <fieldset key={index} className="cv-exp__item">
            <legend>Experiência {index + 1}</legend>
            <div className="cv-exp__grade">
              <label className={classeCampo}>
                <span>Cargo</span>
                <input value={item.cargo} maxLength={60} onChange={(e) => mudar(index, { cargo: e.target.value })} />
              </label>
              <label className={classeCampo}>
                <span>Empresa</span>
                <input value={item.empresa} maxLength={80} onChange={(e) => mudar(index, { empresa: e.target.value })} />
              </label>
              <label className={classeCampo}>
                <span>Início</span>
                <input
                  type="month"
                  max={limite}
                  value={(item.inicio || '').slice(0, 7)}
                  onChange={(e) => mudar(index, { inicio: e.target.value })}
                />
              </label>
              <label className={classeCampo}>
                <span>Fim</span>
                <input
                  type="month"
                  max={limite}
                  disabled={atual}
                  value={atual ? '' : (item.fim || '').slice(0, 7)}
                  onChange={(e) => mudar(index, { fim: e.target.value })}
                />
              </label>
              <label className="cv-exp__check">
                <input
                  type="checkbox"
                  checked={atual}
                  onChange={(e) => mudar(index, { fim: e.target.checked ? 'atual' : '' })}
                />
                <span>Trabalho aqui atualmente</span>
              </label>
              <label className={`${classeCampo} cv-exp__largo`}>
                <span>O que você fazia</span>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={item.descricao}
                  placeholder="Ex.: conferência de carga, separação de pedidos com coletor"
                  onChange={(e) => mudar(index, { descricao: e.target.value })}
                />
              </label>
            </div>
            <button type="button" className="cv-exp__link" onClick={() => onChange(itens.filter((_, i) => i !== index))}>
              Remover experiência
            </button>
          </fieldset>
        )
      })}
      <button
        type="button"
        className="cv-exp__link"
        onClick={() => onChange([...itens, { cargo: '', empresa: '', inicio: '', fim: '', descricao: '' }])}
      >
        Incluir experiência
      </button>
    </div>
  )
}

export function CamposSobre({
  resumo,
  escolaridade,
  habilidades,
  onChange,
  classeCampo = '',
}: {
  resumo: string
  escolaridade: string
  habilidades: string
  onChange: (campo: 'resumo' | 'escolaridade' | 'habilidades', valor: string) => void
  classeCampo?: string
}) {
  return (
    <div className="cv-sobre">
      <label className={classeCampo}>
        <span>Resumo profissional</span>
        <textarea
          rows={3}
          maxLength={600}
          value={resumo}
          placeholder="Ex.: Trabalho há 5 anos em armazém, com conferência e separação de pedidos. Tenho NR11."
          onChange={(e) => onChange('resumo', e.target.value)}
        />
        <small className="cv-sobre__dica">
          Aparece para as empresas. Não escreva telefone, e-mail, CPF ou endereço. {resumo.length}/600
        </small>
      </label>
      <label className={classeCampo}>
        <span>Escolaridade</span>
        <select value={escolaridade} onChange={(e) => onChange('escolaridade', e.target.value)}>
          <option value="">Não informar</option>
          {ESCOLARIDADES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className={classeCampo}>
        <span>Habilidades (separe por vírgula)</span>
        <input
          value={habilidades}
          maxLength={400}
          placeholder="Ex.: WMS, coletor de dados, Excel"
          onChange={(e) => onChange('habilidades', e.target.value)}
        />
      </label>
    </div>
  )
}
