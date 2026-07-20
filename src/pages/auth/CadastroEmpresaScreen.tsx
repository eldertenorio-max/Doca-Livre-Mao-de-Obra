import { useState, type FormEvent } from 'react'
import { useStore } from '../../lib/store'
import type { EmpresaTipo, Plano } from '../../lib/types'

type Props = {
  onBack: () => void
  onDone: () => void
}

const TIPOS: { id: EmpresaTipo; label: string }[] = [
  { id: 'transportadora', label: 'Transportadora' },
  { id: 'operador_logistico', label: 'Operador Logístico' },
  { id: 'industria', label: 'Indústria' },
  { id: 'centro_distribuicao', label: 'Centro de Distribuição' },
  { id: 'atacadista', label: 'Atacadista' },
  { id: 'varejo', label: 'Varejo' },
  { id: 'outro', label: 'Outro' },
]

export function CadastroEmpresaScreen({ onBack, onDone }: Props) {
  const { registerEmpresa, completeEmpresaPerfil, currentUser } = useStore()
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
    plano: 'gratuito' as Plano,
    docsOk: true,
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function next() {
    setError('')
    setStep((s) => Math.min(6, s + 1))
  }

  function prev() {
    setError('')
    if (step === 1) onBack()
    else setStep((s) => s - 1)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const empresaPayload = {
      cnpj: form.cnpj,
      razaoSocial: form.razaoSocial,
      nomeFantasia: form.nomeFantasia,
      tipo: form.tipo,
      plano: form.plano,
      responsavelNome: form.responsavelNome,
      responsavelCpf: form.responsavelCpf,
      responsavelCargo: form.responsavelCargo,
      telefone: form.telefone,
      endereco: {
        cep: form.cep,
        rua: form.rua,
        numero: form.numero,
        cidade: form.cidade,
        estado: form.estado,
        lat: -23.55 + Math.random() * 0.1,
        lng: -46.63 + Math.random() * 0.1,
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
      <form className="auth-card auth-card--wide" onSubmit={step === 6 ? submit : (e) => { e.preventDefault(); next() }}>
        <button type="button" className="btn btn-ghost link-back" onClick={prev}>
          ← Voltar
        </button>
        <h1 className="auth-title">Cadastro Empresa</h1>
        <p className="step-indicator">Etapa {step} de 6</p>

        {step === 1 && (
          <>
            <label className="field"><span>CNPJ</span><input value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} required /></label>
            <label className="field"><span>Razão Social</span><input value={form.razaoSocial} onChange={(e) => set('razaoSocial', e.target.value)} required /></label>
            <label className="field"><span>Nome Fantasia</span><input value={form.nomeFantasia} onChange={(e) => set('nomeFantasia', e.target.value)} required /></label>
          </>
        )}
        {step === 2 && (
          <>
            <label className="field"><span>Responsável</span><input value={form.responsavelNome} onChange={(e) => set('responsavelNome', e.target.value)} required /></label>
            <label className="field"><span>CPF</span><input value={form.responsavelCpf} onChange={(e) => set('responsavelCpf', e.target.value)} required /></label>
            <label className="field"><span>Cargo</span><input value={form.responsavelCargo} onChange={(e) => set('responsavelCargo', e.target.value)} required /></label>
            <label className="field"><span>Telefone</span><input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} required /></label>
            {!completing && (
              <>
                <label className="field"><span>E-mail</span><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required /></label>
                <label className="field"><span>Senha</span><input type="password" value={form.senha} onChange={(e) => set('senha', e.target.value)} required minLength={6} /></label>
              </>
            )}
            {completing && (
              <p className="muted">Conta: {currentUser?.email} (já confirmada por e-mail)</p>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <label className="field"><span>CEP</span><input value={form.cep} onChange={(e) => set('cep', e.target.value)} required /></label>
            <label className="field"><span>Rua</span><input value={form.rua} onChange={(e) => set('rua', e.target.value)} required /></label>
            <label className="field"><span>Número</span><input value={form.numero} onChange={(e) => set('numero', e.target.value)} required /></label>
            <label className="field"><span>Cidade</span><input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} required /></label>
            <label className="field"><span>Estado</span><input value={form.estado} onChange={(e) => set('estado', e.target.value)} required /></label>
          </>
        )}
        {step === 4 && (
          <label className="field">
            <span>Tipo de empresa</span>
            <select value={form.tipo} onChange={(e) => set('tipo', e.target.value as EmpresaTipo)}>
              {TIPOS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
        )}
        {step === 5 && (
          <div className="docs-mock">
            <p>Documentos (mock — marque como enviados)</p>
            <label className="check-row">
              <input type="checkbox" checked={form.docsOk} onChange={(e) => set('docsOk', e.target.checked)} />
              Contrato Social, Cartão CNPJ e comprovante enviados
            </label>
          </div>
        )}
        {step === 6 && (
          <div className="plan-grid">
            {(['gratuito', 'premium', 'enterprise'] as Plano[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`plan-card ${form.plano === p ? 'plan-card--active' : ''}`}
                onClick={() => set('plano', p)}
              >
                <strong>{p.charAt(0).toUpperCase() + p.slice(1)}</strong>
                <span className="muted">
                  {p === 'gratuito' && 'Até 5 demandas/mês'}
                  {p === 'premium' && 'Demandas ilimitadas + favoritos'}
                  {p === 'enterprise' && 'Multi-usuários + relatórios'}
                </span>
              </button>
            ))}
          </div>
        )}

        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-accent btn-block">
          {step === 6 ? 'Concluir cadastro' : 'Continuar'}
        </button>
      </form>
    </div>
  )
}
