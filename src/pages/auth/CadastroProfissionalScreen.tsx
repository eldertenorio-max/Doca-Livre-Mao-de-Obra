import { useMemo, useState, type FormEvent } from 'react'
import { CATEGORIES } from '../../data/categories'
import { LOCAIS_OPERACAO } from '../../data/cidades'
import { AvailabilityToggle } from '../../components/AvailabilityToggle'
import {
  analisarDocumentoCadastro,
  lerFotoDocumento,
  type FotoDocumento,
  type PapelDocumento,
} from '../../lib/analisarDocumentoCadastro'
import { coordenadaDaCidade } from '../../lib/coordenadaCidade'
import { useStore } from '../../lib/store'
import type { Disponibilidade } from '../../lib/types'

type Props = {
  onBack: () => void
  onDone: () => void
}

const CERTS = ['NR11', 'NR35', 'NR10', 'NR20', 'MOPP', 'Munck', 'Ponte Rolante']
const RAIOS = [10, 25, 50, 100]
const ETAPAS = [
  'Seus dados',
  'Documentos',
  'Cargos',
  'Experiência',
  'Certificações',
  'Disponibilidade',
  'Raio de trabalho',
  'Pagamento',
]

export function CadastroProfissionalScreen({ onBack, onDone }: Props) {
  const { registerProfissional, completeProfissionalPerfil, currentUser, state } = useStore()
  const completing = currentUser?.role === 'profissional' && currentUser.perfilCompleto === false
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [documento, setDocumento] = useState<FotoDocumento | null>(null)
  const [verso, setVerso] = useState<FotoDocumento | null>(null)
  const [selfie, setSelfie] = useState<FotoDocumento | null>(null)
  const [analise, setAnalise] = useState<{ aceito: boolean; motivo: string } | null>(null)
  const [analisando, setAnalisando] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    rg: '',
    nascimento: '',
    telefone: '',
    email: currentUser?.email || '',
    senha: '',
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
    cep: '',
    cidade: '',
    estado: 'SP',
    rua: '',
    numero: '',
    raioKm: null as number | null,
  })

  const ufs = useMemo(() => [...new Set(LOCAIS_OPERACAO.map((local) => local.estado))].sort(), [])
  const cidades = useMemo(
    () => LOCAIS_OPERACAO.filter((local) => local.estado === form.estado).map((local) => local.cidade),
    [form.estado],
  )

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleProf(id: string) {
    setForm((f) => ({
      ...f,
      profissoes: f.profissoes.includes(id) ? f.profissoes.filter((p) => p !== id) : [...f.profissoes, id],
    }))
  }

  function toggleCert(id: string) {
    setForm((f) => ({
      ...f,
      certificados: f.certificados.includes(id) ? f.certificados.filter((c) => c !== id) : [...f.certificados, id],
    }))
  }

  function definirRaio(valor: string) {
    const numero = Number(valor)
    set('raioKm', valor === '' || !Number.isFinite(numero) || numero <= 0 ? null : Math.min(500, Math.round(numero)))
  }

  function documentosAceitos() {
    if (!analise?.aceito || !documento || !selfie) return []
    return [
      {
        tipoId: 'rg_cpf',
        arquivoNome: [documento.nome, verso?.nome].filter(Boolean).join(', '),
        observacao: analise.motivo,
      },
      { tipoId: 'selfie', arquivoNome: selfie.nome, observacao: analise.motivo },
    ]
  }

  async function escolherFoto(file: File | undefined, papel: PapelDocumento) {
    setError('')
    setAnalise(null)
    const guardar = papel === 'documento' ? setDocumento : papel === 'verso' ? setVerso : setSelfie
    if (!file) {
      guardar(null)
      return
    }
    try {
      guardar(await lerFotoDocumento(file))
    } catch (falha) {
      guardar(null)
      setError(falha instanceof Error ? falha.message : 'Não foi possível ler a foto.')
    }
  }

  async function analisarFotos() {
    setError('')
    if (!form.nome.trim()) {
      setError('Volte e informe o nome antes de enviar o documento.')
      return
    }
    if (!documento || !selfie) {
      setError('Envie a foto do documento e a selfie.')
      return
    }
    setAnalisando(true)
    try {
      const arquivos = [
        { papel: 'documento' as const, mime: documento.mime, dados: documento.dados },
        ...(verso ? [{ papel: 'verso' as const, mime: verso.mime, dados: verso.dados }] : []),
        { papel: 'selfie' as const, mime: selfie.mime, dados: selfie.dados },
      ]
      const result = await analisarDocumentoCadastro({ nome: form.nome.trim(), arquivos })
      if (!result.ok) {
        setAnalise(null)
        setError(result.erro)
        return
      }
      setAnalise({ aceito: result.aceito, motivo: result.motivo })
    } finally {
      setAnalisando(false)
    }
  }

  function next() {
    setError('')
    if (step === 2 && !analise?.aceito) {
      setError('Envie o documento e a selfie e espere a análise aceitar.')
      return
    }
    if (step === 3 && form.profissoes.length === 0) {
      setError('Selecione ao menos um cargo.')
      return
    }
    if (step === 7) {
      if (!form.cidade.trim() || !form.estado.trim()) {
        setError('Informe a cidade e o estado onde você mora.')
        return
      }
      if (form.raioKm == null || form.raioKm < 1) {
        setError('Informe o raio máximo, em km, que você pode ir trabalhar.')
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
    if (!analise?.aceito || !documento || !selfie) {
      setError('O documento precisa ser aceito na análise antes de concluir.')
      setStep(2)
      return
    }
    if (form.raioKm == null || form.raioKm < 1) {
      setError('Informe o raio máximo, em km, que você pode ir trabalhar.')
      setStep(7)
      return
    }
    const profissionalPayload = {
      nome: form.nome,
      cpf: form.cpf,
      rg: form.rg,
      nascimento: form.nascimento,
      telefone: form.telefone,
      profissoes: form.profissoes,
      experiencia: form.expEmpresa
        ? [
            {
              cargo: form.expCargo,
              empresa: form.expEmpresa,
              inicio: form.expTempo || '2020-01',
              fim: 'atual',
              descricao: '',
            },
          ]
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
        cidade: form.cidade.trim(),
        estado: form.estado.trim().toUpperCase(),
        ...coordenadaDaCidade(form.cidade, form.estado, [
          ...state.profissionais.map((pessoa) => pessoa.endereco),
          ...state.empresas.map((empresa) => empresa.endereco),
        ]),
      },
      raioKm: form.raioKm,
      pix: form.pix,
    }
    const documentos = documentosAceitos()
    const res = completing
      ? completeProfissionalPerfil(profissionalPayload, documentos)
      : registerProfissional({ email: form.email, senha: form.senha }, profissionalPayload, documentos)
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
        <h1 className="auth-title">Cadastro de colaborador</h1>
        <p className="step-indicator">
          Etapa {step} de {ETAPAS.length} · {ETAPAS[step - 1]}
        </p>

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
            {completing && <p className="muted">Conta: {currentUser?.email}</p>}
          </>
        )}
        {step === 2 && (
          <div className="docs-mock">
            <p>Envie a foto do documento de identidade e uma selfie. A análise diz se o cadastro segue ou não.</p>
            <label className="field">
              <span>Documento (RG, CIN, CNH ou CPF)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void escolherFoto(e.target.files?.[0], 'documento')}
              />
              {documento && <small className="muted">{documento.nome}</small>}
            </label>
            <label className="field">
              <span>Verso, se tiver</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void escolherFoto(e.target.files?.[0], 'verso')}
              />
              {verso && <small className="muted">{verso.nome}</small>}
            </label>
            <label className="field">
              <span>Selfie</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void escolherFoto(e.target.files?.[0], 'selfie')}
              />
              {selfie && <small className="muted">{selfie.nome}</small>}
            </label>
            <button type="button" className="btn btn-primary btn-block" disabled={analisando} onClick={() => void analisarFotos()}>
              {analisando ? 'Analisando…' : 'Analisar documento'}
            </button>
            {analise && (
              <p className={analise.aceito ? 'docs-analise docs-analise--ok' : 'docs-analise docs-analise--nao'}>
                <strong>{analise.aceito ? 'Aceito' : 'Não aceito'}</strong>
                <span>{analise.motivo}</span>
              </p>
            )}
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
          <AvailabilityToggle value={form.disponibilidade} onChange={(d) => set('disponibilidade', d)} />
        )}
        {step === 7 && (
          <div className="raio-passo">
            <p>A partir da sua cidade, você só entra em missões dentro desse raio.</p>
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
                list="cidades-colaborador"
                onChange={(e) => set('cidade', e.target.value)}
                placeholder="Onde você mora"
                required
              />
              <datalist id="cidades-colaborador">
                {cidades.map((cidade) => (
                  <option key={cidade} value={cidade} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span>Raio máximo para trabalhar</span>
              <span className="raio-linha">
                <input
                  type="number"
                  min={1}
                  max={500}
                  inputMode="numeric"
                  value={form.raioKm ?? ''}
                  placeholder="km"
                  aria-label="Raio máximo em quilômetros"
                  onChange={(e) => definirRaio(e.target.value)}
                />
                <span>km</span>
              </span>
            </label>
            <div className="raio-opcoes">
              {RAIOS.map((km) => (
                <button
                  key={km}
                  type="button"
                  className={`chip ${form.raioKm === km ? 'chip--on' : ''}`}
                  onClick={() => set('raioKm', km)}
                >
                  {km} km
                </button>
              ))}
            </div>
            {form.cidade.trim() && form.raioKm != null && (
              <p className="raio-resumo">
                Você pode ir trabalhar em até {form.raioKm} km de {form.cidade.trim()}/{form.estado}.
              </p>
            )}
          </div>
        )}
        {step === 8 && (
          <>
            <p className="muted">
              Raio definido: até {form.raioKm} km de {form.cidade}/{form.estado}.
            </p>
            <label className="field">
              <span>Chave PIX</span>
              <input value={form.pix} onChange={(e) => set('pix', e.target.value)} required />
            </label>
          </>
        )}

        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-accent btn-block">
          {step === ETAPAS.length ? 'Concluir cadastro' : 'Continuar'}
        </button>
      </form>
    </div>
  )
}
