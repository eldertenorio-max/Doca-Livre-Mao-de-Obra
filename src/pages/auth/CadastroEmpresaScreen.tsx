import { useMemo, useRef, useState, type FormEvent } from 'react'
import { LOCAIS_OPERACAO } from '../../data/cidades'
import { ACCEPT_DOCUMENTO_CADASTRO, analisarDocumentoCadastro, lerArquivoEmpresa } from '../../lib/analisarDocumentoCadastro'
import { coordenadaDaCidade } from '../../lib/coordenadaCidade'
import { useStore } from '../../lib/store'
import { SeloDocumento } from './SeloDocumento'
import type { EmpresaTipo } from '../../lib/types'

type Props = {
  onBack: () => void
  onDone: () => void
}

const TIPOS: { id: EmpresaTipo; label: string }[] = [
  { id: 'transportadora', label: 'Transportadora' },
  { id: 'operador_logistico', label: 'Operador logístico' },
  { id: 'industria', label: 'Indústria' },
  { id: 'centro_distribuicao', label: 'Centro de distribuição' },
  { id: 'atacadista', label: 'Atacadista' },
  { id: 'varejo', label: 'Varejo' },
  { id: 'outro', label: 'Outro' },
]

const DOCS_EMPRESA_CADASTRO = [
  { id: 'contrato_social', label: 'Contrato social', ajuda: 'Ato constitutivo, contrato social ou certificado MEI.' },
  { id: 'cartao_cnpj', label: 'Cartão CNPJ', ajuda: 'Comprovante de inscrição da Receita Federal.' },
  {
    id: 'comprovante_endereco_empresa',
    label: 'Comprovante de endereço da operação',
    ajuda: 'Conta de consumo ou IPTU do estabelecimento.',
  },
] as const

type DocEmpresaId = (typeof DOCS_EMPRESA_CADASTRO)[number]['id']

type EstadoDoc = {
  arquivo: string
  analise: { aceito: boolean; motivo: string } | null
  analisando: boolean
}

const DOC_VAZIO: EstadoDoc = { arquivo: '', analise: null, analisando: false }

const ETAPAS = [
  'Dados da empresa',
  'Responsável',
  'Acesso',
  'Endereço da operação',
  'Tipo de operação',
  'Documentos',
  'Revisão',
]

export function CadastroEmpresaScreen({ onBack, onDone }: Props) {
  const { registerEmpresa, completeEmpresaPerfil, currentUser, state } = useStore()
  const completing = currentUser?.role === 'empresa' && currentUser.perfilCompleto === false
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [docs, setDocs] = useState<Record<DocEmpresaId, EstadoDoc>>({
    contrato_social: DOC_VAZIO,
    cartao_cnpj: DOC_VAZIO,
    comprovante_endereco_empresa: DOC_VAZIO,
  })
  const geracaoDoc = useRef<Partial<Record<DocEmpresaId, number>>>({})
  const [form, setForm] = useState({
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    responsavelNome: '',
    responsavelCpf: '',
    responsavelCargo: '',
    telefone: '',
    email: currentUser?.email || '',
    senha: '',
    cep: '',
    rua: '',
    numero: '',
    cidade: '',
    estado: 'SP',
    tipo: 'transportadora' as EmpresaTipo,
  })

  const ufs = useMemo(() => [...new Set(LOCAIS_OPERACAO.map((local) => local.estado))].sort(), [])
  const cidades = useMemo(
    () => LOCAIS_OPERACAO.filter((local) => local.estado === form.estado).map((local) => local.cidade),
    [form.estado],
  )
  const tipoLabel = TIPOS.find((item) => item.id === form.tipo)?.label ?? form.tipo

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function documentosAceitos() {
    return DOCS_EMPRESA_CADASTRO.filter((item) => docs[item.id].analise?.aceito).map((item) => ({
      tipoId: item.id,
      arquivoNome: docs[item.id].arquivo,
      observacao: docs[item.id].analise?.motivo || '',
    }))
  }

  function todosDocumentosAceitos() {
    return DOCS_EMPRESA_CADASTRO.every((item) => docs[item.id].analise?.aceito)
  }

  function algumDocumentoAnalisando() {
    return DOCS_EMPRESA_CADASTRO.some((item) => docs[item.id].analisando)
  }

  async function escolherDocumento(id: DocEmpresaId, file: File | undefined) {
    setError('')
    const vez = (geracaoDoc.current[id] ?? 0) + 1
    geracaoDoc.current[id] = vez
    if (!file) {
      setDocs((atual) => ({ ...atual, [id]: DOC_VAZIO }))
      return
    }
    if (form.razaoSocial.trim().length < 3) {
      setError('Volte e informe a razão social antes de enviar o documento.')
      return
    }
    setDocs((atual) => ({ ...atual, [id]: { arquivo: file.name, analise: null, analisando: true } }))
    try {
      const foto = await lerArquivoEmpresa(file)
      if (geracaoDoc.current[id] !== vez) return
      const result = await analisarDocumentoCadastro({
        nome: form.razaoSocial.trim(),
        contexto: 'empresa',
        tipo: id,
        cnpj: form.cnpj.trim(),
        cidade: `${form.cidade.trim()}/${form.estado.trim()}`,
        arquivos: [{ papel: 'documento', mime: foto.mime, dados: foto.dados }],
      })
      if (geracaoDoc.current[id] !== vez) return
      if (!result.ok) {
        setDocs((atual) => ({
          ...atual,
          [id]: { arquivo: foto.nome, analise: { aceito: false, motivo: result.erro }, analisando: false },
        }))
        return
      }
      setDocs((atual) => ({
        ...atual,
        [id]: { arquivo: foto.nome, analise: { aceito: result.aceito, motivo: result.motivo }, analisando: false },
      }))
    } catch (falha) {
      if (geracaoDoc.current[id] !== vez) return
      setDocs((atual) => ({
        ...atual,
        [id]: {
          arquivo: atual[id].arquivo || file.name,
          analise: { aceito: false, motivo: falha instanceof Error ? falha.message : 'Não foi possível ler o arquivo.' },
          analisando: false,
        },
      }))
    }
  }

  function next() {
    setError('')
    if (step === 4 && (!form.cidade.trim() || !form.estado.trim())) {
      setError('Informe a cidade e o estado da operação.')
      return
    }
    if (step === 6) {
      if (algumDocumentoAnalisando()) {
        setError('Espere a análise do documento terminar.')
        return
      }
      if (!todosDocumentosAceitos()) {
        setError('Envie os três documentos. Cada um precisa ser aceito para continuar.')
        return
      }
    }
    setStep((s) => Math.min(ETAPAS.length, s + 1))
  }

  function prev() {
    setError('')
    if (step === 1) onBack()
    else setStep((s) => s - 1)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!todosDocumentosAceitos() || algumDocumentoAnalisando()) {
      setError('Os três documentos precisam ser aceitos antes de concluir.')
      setStep(6)
      return
    }
    if (!form.cidade.trim() || !form.estado.trim()) {
      setError('Informe a cidade e o estado da operação.')
      setStep(4)
      return
    }
    const empresaPayload = {
      cnpj: form.cnpj.trim(),
      razaoSocial: form.razaoSocial.trim(),
      nomeFantasia: form.nomeFantasia.trim(),
      tipo: form.tipo,
      plano: 'gratuito' as const,
      responsavelNome: form.responsavelNome.trim(),
      responsavelCpf: form.responsavelCpf.trim(),
      responsavelCargo: form.responsavelCargo.trim(),
      telefone: form.telefone.trim(),
      endereco: {
        cep: form.cep.trim(),
        rua: form.rua.trim(),
        numero: form.numero.trim(),
        cidade: form.cidade.trim(),
        estado: form.estado.trim().toUpperCase(),
        ...coordenadaDaCidade(form.cidade, form.estado, [
          ...state.empresas.map((empresa) => empresa.endereco),
          ...state.profissionais.map((pessoa) => pessoa.endereco),
        ]),
      },
    }
    const documentos = documentosAceitos()
    const res = completing
      ? completeEmpresaPerfil(empresaPayload, documentos)
      : registerEmpresa({ email: form.email, senha: form.senha }, empresaPayload, documentos)
    if (!res.ok) {
      setError(res.error ?? 'Erro no cadastro')
      return
    }
    onDone()
  }

  return (
    <div className="auth-screen auth-screen--scroll">
      <form
        className="auth-card auth-card--wide"
        onSubmit={step === ETAPAS.length ? submit : (e) => { e.preventDefault(); next() }}
      >
        <button type="button" className="btn btn-ghost link-back" onClick={prev}>
          ← Voltar
        </button>
        <h1 className="auth-title">Cadastro da empresa tomadora</h1>
        <p className="step-indicator">
          Etapa {step} de {ETAPAS.length} · {ETAPAS[step - 1]}
        </p>

        {step === 1 && (
          <>
            <label className="field">
              <span>CNPJ</span>
              <input value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} required />
            </label>
            <label className="field">
              <span>Razão social</span>
              <input value={form.razaoSocial} onChange={(e) => set('razaoSocial', e.target.value)} required />
            </label>
            <label className="field">
              <span>Nome fantasia</span>
              <input value={form.nomeFantasia} onChange={(e) => set('nomeFantasia', e.target.value)} required />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <label className="field">
              <span>Nome do responsável</span>
              <input value={form.responsavelNome} onChange={(e) => set('responsavelNome', e.target.value)} required />
            </label>
            <label className="field">
              <span>CPF do responsável</span>
              <input value={form.responsavelCpf} onChange={(e) => set('responsavelCpf', e.target.value)} required />
            </label>
            <label className="field">
              <span>Cargo</span>
              <input value={form.responsavelCargo} onChange={(e) => set('responsavelCargo', e.target.value)} required />
            </label>
            <label className="field">
              <span>Telefone</span>
              <input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} required />
            </label>
          </>
        )}

        {step === 3 && (
          <>
            {completing ? (
              <p className="muted">Conta já confirmada: {currentUser?.email}</p>
            ) : (
              <>
                <label className="field">
                  <span>E-mail</span>
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
                </label>
                <label className="field">
                  <span>Senha</span>
                  <input type="password" value={form.senha} onChange={(e) => set('senha', e.target.value)} required minLength={6} />
                </label>
              </>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <p className="muted">Esse endereço é o ponto da operação no mapa e na busca de colaboradores.</p>
            <label className="field">
              <span>Estado</span>
              <select value={form.estado} onChange={(e) => set('estado', e.target.value)}>
                {ufs.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Cidade</span>
              <input
                value={form.cidade}
                list="cidades-empresa"
                onChange={(e) => set('cidade', e.target.value)}
                placeholder="Cidade da operação"
                required
              />
              <datalist id="cidades-empresa">
                {cidades.map((cidade) => (
                  <option key={cidade} value={cidade} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span>CEP</span>
              <input value={form.cep} onChange={(e) => set('cep', e.target.value)} required />
            </label>
            <label className="field">
              <span>Rua</span>
              <input value={form.rua} onChange={(e) => set('rua', e.target.value)} required />
            </label>
            <label className="field">
              <span>Número</span>
              <input value={form.numero} onChange={(e) => set('numero', e.target.value)} required />
            </label>
          </>
        )}

        {step === 5 && (
          <>
            <p className="muted">Qual é a operação da empresa tomadora?</p>
            <div className="chip-wrap">
              {TIPOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`chip ${form.tipo === item.id ? 'chip--on' : ''}`}
                  onClick={() => set('tipo', item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 6 && (
          <div className="docs-mock">
            <p>Envie os três documentos. A análise começa na hora e diz se cada um está aceito.</p>
            {DOCS_EMPRESA_CADASTRO.map((item) => {
              const atual = docs[item.id]
              return (
                <div key={item.id} className="docs-item">
                  <label className="field">
                    <span>{item.label}</span>
                    <input
                      type="file"
                      accept={ACCEPT_DOCUMENTO_CADASTRO}
                      onChange={(e) => void escolherDocumento(item.id, e.target.files?.[0])}
                    />
                    <small className="muted">{item.ajuda}</small>
                    {atual.arquivo && <small className="muted">{atual.arquivo}</small>}
                  </label>
                  <SeloDocumento analisando={atual.analisando} analise={atual.analise} />
                </div>
              )
            })}
          </div>
        )}

        {step === 7 && (
          <dl className="cadastro-resumo">
            <div>
              <dt>Empresa</dt>
              <dd>
                {form.nomeFantasia} · {form.cnpj}
              </dd>
            </div>
            <div>
              <dt>Razão social</dt>
              <dd>{form.razaoSocial}</dd>
            </div>
            <div>
              <dt>Responsável</dt>
              <dd>
                {form.responsavelNome} · {form.responsavelCargo}
              </dd>
            </div>
            <div>
              <dt>Operação</dt>
              <dd>
                {tipoLabel} · {form.cidade}/{form.estado}
              </dd>
            </div>
            <div>
              <dt>Endereço</dt>
              <dd>
                {form.rua}, {form.numero}
                {form.cep ? ` · ${form.cep}` : ''}
              </dd>
            </div>
            <div>
              <dt>Documentos</dt>
              <dd>{DOCS_EMPRESA_CADASTRO.map((item) => item.label).join(' · ')} · aceitos</dd>
            </div>
          </dl>
        )}

        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-accent btn-block" disabled={step === 6 && algumDocumentoAnalisando()}>
          {step === ETAPAS.length ? 'Concluir cadastro' : algumDocumentoAnalisando() && step === 6 ? 'Analisando…' : 'Continuar'}
        </button>
      </form>
    </div>
  )
}
