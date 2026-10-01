import { useMemo, useState, type FormEvent } from 'react'
import { LOCAIS_OPERACAO } from '../../data/cidades'
import { coordenadaDaCidade } from '../../lib/coordenadaCidade'
import { useStore } from '../../lib/store'
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
    docsOk: false,
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

  function next() {
    setError('')
    if (step === 4 && (!form.cidade.trim() || !form.estado.trim())) {
      setError('Informe a cidade e o estado da operação.')
      return
    }
    if (step === 6 && !form.docsOk) {
      setError('Confirme o envio dos documentos da empresa tomadora.')
      return
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
    const res = completing
      ? completeEmpresaPerfil(empresaPayload)
      : registerEmpresa({ email: form.email, senha: form.senha }, empresaPayload)
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
            <p>A tomadora envia estes documentos antes de publicar missão:</p>
            <ul className="cadastro-lista">
              <li>Contrato social</li>
              <li>Cartão CNPJ</li>
              <li>Comprovante de endereço da operação</li>
            </ul>
            <label className="check-row">
              <input type="checkbox" checked={form.docsOk} onChange={(e) => set('docsOk', e.target.checked)} />
              Confirmo que vou enviar esses documentos
            </label>
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
          </dl>
        )}

        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-accent btn-block">
          {step === ETAPAS.length ? 'Concluir cadastro' : 'Continuar'}
        </button>
      </form>
    </div>
  )
}
