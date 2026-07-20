import { useState, type FormEvent } from 'react'
import { CATEGORIES } from '../../data/categories'
import { AvailabilityToggle } from '../../components/AvailabilityToggle'
import { useStore } from '../../lib/store'
import type { Disponibilidade } from '../../lib/types'

type Props = {
  onBack: () => void
  onDone: () => void
}

const CERTS = ['NR11', 'NR35', 'NR10', 'NR20', 'MOPP', 'Munck', 'Ponte Rolante']

export function CadastroProfissionalScreen({ onBack, onDone }: Props) {
  const { registerProfissional, completeProfissionalPerfil, currentUser } = useStore()
  const completing = currentUser?.role === 'profissional' && currentUser.perfilCompleto === false
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    rg: '',
    nascimento: '',
    telefone: '',
    email: currentUser?.email || '',
    senha: '',
    docsOk: true,
    profissoes: [] as string[],
    expEmpresa: '',
    expCargo: '',
    expTempo: '',
    certificados: [] as string[],
    cnhCategoria: '',
    disponibilidade: {
      hoje: true,
      amanha: true,
      estaSemana: true,
      finaisDeSemana: false,
      noturno: false,
      viagens: false,
      temporario: true,
      efetivo: false,
      freelancer: true,
    } as Disponibilidade,
    pix: '',
    cep: '07750-000',
    cidade: 'Cajamar',
    estado: 'SP',
    rua: 'Rua Exemplo',
    numero: '100',
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleProf(id: string) {
    setForm((f) => ({
      ...f,
      profissoes: f.profissoes.includes(id)
        ? f.profissoes.filter((p) => p !== id)
        : [...f.profissoes, id],
    }))
  }

  function toggleCert(id: string) {
    setForm((f) => ({
      ...f,
      certificados: f.certificados.includes(id)
        ? f.certificados.filter((c) => c !== id)
        : [...f.certificados, id],
    }))
  }

  function next() {
    setError('')
    if (step === 3 && form.profissoes.length === 0) {
      setError('Selecione ao menos uma profissão.')
      return
    }
    setStep((s) => Math.min(7, s + 1))
  }

  function prev() {
    setError('')
    if (step === 1) onBack()
    else setStep((s) => s - 1)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const profissionalPayload = {
      nome: form.nome,
      cpf: form.cpf,
      rg: form.rg,
      nascimento: form.nascimento,
      telefone: form.telefone,
      profissoes: form.profissoes,
      experiencia: form.expEmpresa
        ? [{
            cargo: form.expCargo,
            empresa: form.expEmpresa,
            inicio: form.expTempo || '2020-01',
            fim: 'atual',
            descricao: '',
          }]
        : [],
      certificados: form.certificados.map((tipo) => ({
        tipo,
        validade: '2027-12-31',
        valido: true,
      })),
      cnhCategoria: form.cnhCategoria || undefined,
      cnhValidade: form.cnhCategoria ? '2028-01-01' : undefined,
      disponibilidade: form.disponibilidade,
      endereco: {
        cep: form.cep,
        rua: form.rua,
        numero: form.numero,
        cidade: form.cidade,
        estado: form.estado,
        lat: -23.35 + Math.random() * 0.05,
        lng: -46.87 + Math.random() * 0.05,
      },
      raioKm: 30,
      pix: form.pix,
    }
    const res = completing
      ? completeProfissionalPerfil(profissionalPayload)
      : registerProfissional({ email: form.email, senha: form.senha }, profissionalPayload)
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
        onSubmit={step === 7 ? submit : (e) => { e.preventDefault(); next() }}
      >
        <button type="button" className="btn btn-ghost link-back" onClick={prev}>
          ← Voltar
        </button>
        <h1 className="auth-title">Cadastro Profissional</h1>
        <p className="step-indicator">Etapa {step} de 7</p>

        {step === 1 && (
          <>
            <label className="field"><span>Nome</span><input value={form.nome} onChange={(e) => set('nome', e.target.value)} required /></label>
            <label className="field"><span>CPF</span><input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} required /></label>
            <label className="field"><span>RG</span><input value={form.rg} onChange={(e) => set('rg', e.target.value)} required /></label>
            <label className="field"><span>Nascimento</span><input type="date" value={form.nascimento} onChange={(e) => set('nascimento', e.target.value)} required /></label>
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
        {step === 2 && (
          <div className="docs-mock">
            <p>Validação de documentos (mock)</p>
            <label className="check-row">
              <input type="checkbox" checked={form.docsOk} onChange={(e) => set('docsOk', e.target.checked)} />
              Selfie + documento frente/verso enviados
            </label>
            <label className="field">
              <span>CNH (categoria, se aplicável)</span>
              <input value={form.cnhCategoria} onChange={(e) => set('cnhCategoria', e.target.value)} placeholder="Ex: B, C, D, E" />
            </label>
          </div>
        )}
        {step === 3 && (
          <div className="prof-select">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="prof-group">
                <h3>{cat.label}</h3>
                <div className="chip-wrap">
                  {cat.cargos.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`chip ${form.profissoes.includes(c.id) ? 'chip--on' : ''}`}
                      onClick={() => toggleProf(c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {step === 4 && (
          <>
            <label className="field"><span>Empresa anterior</span><input value={form.expEmpresa} onChange={(e) => set('expEmpresa', e.target.value)} /></label>
            <label className="field"><span>Cargo</span><input value={form.expCargo} onChange={(e) => set('expCargo', e.target.value)} /></label>
            <label className="field"><span>Período</span><input value={form.expTempo} onChange={(e) => set('expTempo', e.target.value)} placeholder="2020-01" /></label>
          </>
        )}
        {step === 5 && (
          <div className="chip-wrap">
            {CERTS.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${form.certificados.includes(c) ? 'chip--on' : ''}`}
                onClick={() => toggleCert(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {step === 6 && (
          <AvailabilityToggle
            value={form.disponibilidade}
            onChange={(d) => set('disponibilidade', d)}
          />
        )}
        {step === 7 && (
          <>
            <label className="field"><span>Chave PIX</span><input value={form.pix} onChange={(e) => set('pix', e.target.value)} required /></label>
            <label className="field"><span>Cidade</span><input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} required /></label>
          </>
        )}

        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-accent btn-block">
          {step === 7 ? 'Concluir cadastro' : 'Continuar'}
        </button>
      </form>
    </div>
  )
}
