import { useMemo, useRef, useState, type FormEvent } from 'react'
import { CATEGORIES } from '../../data/categories'
import { LOCAIS_OPERACAO } from '../../data/cidades'
import { AvailabilityToggle } from '../../components/AvailabilityToggle'
import {
  ACCEPT_DOCUMENTO_CADASTRO,
  analisarDocumentoCadastro,
  lerArquivoCadastro,
  type FotoDocumento,
  type PapelDocumento,
} from '../../lib/analisarDocumentoCadastro'
import { coordenadaDaCidade } from '../../lib/coordenadaCidade'
import { validarChavePix } from '../../lib/pix'
import { useStore } from '../../lib/store'
import type { Disponibilidade } from '../../lib/types'

type Props = {
  onBack: () => void
  onDone: () => void
}

type LinhaDoc = {
  arquivo: FotoDocumento | null
  analise: { aceito: boolean; motivo: string } | null
  analisando: boolean
}

const LINHA_VAZIA: LinhaDoc = { arquivo: null, analise: null, analisando: false }

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
  const [linhas, setLinhas] = useState<Record<PapelDocumento, LinhaDoc>>({
    documento: LINHA_VAZIA,
    verso: LINHA_VAZIA,
    selfie: LINHA_VAZIA,
  })
  const geracaoDoc = useRef<Partial<Record<PapelDocumento, number>>>({})
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
  const pixInfo = form.pix.trim() ? validarChavePix(form.pix) : null

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

  function documentosProntos() {
    const frente = linhas.documento.analise?.aceito && linhas.documento.arquivo
    const face = linhas.selfie.analise?.aceito && linhas.selfie.arquivo
    const costas = !linhas.verso.arquivo || linhas.verso.analise?.aceito
    return Boolean(frente && face && costas)
  }

  function algumAnalisando() {
    return linhas.documento.analisando || linhas.verso.analisando || linhas.selfie.analisando
  }

  function documentosAceitos() {
    const frente = linhas.documento
    const face = linhas.selfie
    const costas = linhas.verso
    if (!frente.arquivo || !frente.analise?.aceito || !face.arquivo || !face.analise?.aceito) return []
    if (costas.arquivo && !costas.analise?.aceito) return []
    return [
      {
        tipoId: 'rg_cpf',
        arquivoNome: [frente.arquivo.nome, costas.arquivo?.nome].filter(Boolean).join(', '),
        observacao: [frente.analise.motivo, costas.analise?.motivo].filter(Boolean).join(' '),
      },
      { tipoId: 'selfie', arquivoNome: face.arquivo.nome, observacao: face.analise.motivo },
    ]
  }

  async function escolherFoto(file: File | undefined, papel: PapelDocumento) {
    setError('')
    const vez = (geracaoDoc.current[papel] ?? 0) + 1
    geracaoDoc.current[papel] = vez
    if (!file) {
      setLinhas((atual) => ({ ...atual, [papel]: LINHA_VAZIA }))
      return
    }
    if (form.nome.trim().length < 3) {
      setError('Volte e informe o nome antes de enviar o documento.')
      return
    }
    setLinhas((atual) => ({ ...atual, [papel]: { arquivo: { nome: file.name, mime: 'image/jpeg', dados: '' }, analise: null, analisando: true } }))
    try {
      const foto = await lerArquivoCadastro(file)
      if (geracaoDoc.current[papel] !== vez) return
      setLinhas((atual) => ({ ...atual, [papel]: { arquivo: foto, analise: null, analisando: true } }))
      const result = await analisarDocumentoCadastro({
        nome: form.nome.trim(),
        contexto: 'trabalhador',
        arquivos: [{ papel, mime: foto.mime, dados: foto.dados }],
      })
      if (geracaoDoc.current[papel] !== vez) return
      if (!result.ok) {
        setLinhas((atual) => ({ ...atual, [papel]: { arquivo: foto, analise: null, analisando: false } }))
        setError(result.erro)
        return
      }
      setLinhas((atual) => ({
        ...atual,
        [papel]: { arquivo: foto, analise: { aceito: result.aceito, motivo: result.motivo }, analisando: false },
      }))
    } catch (falha) {
      if (geracaoDoc.current[papel] !== vez) return
      setLinhas((atual) => ({ ...atual, [papel]: LINHA_VAZIA }))
      setError(falha instanceof Error ? falha.message : 'Não foi possível ler o arquivo.')
    }
  }

  function next() {
    setError('')
    if (step === 2) {
      if (algumAnalisando()) {
        setError('Espere a análise do arquivo terminar.')
        return
      }
      if (!documentosProntos()) {
        setError('Envie o documento e a selfie. Cada um precisa ser aceito para continuar.')
        return
      }
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
    if (!documentosProntos() || algumAnalisando()) {
      setError('O documento e a selfie precisam ser aceitos antes de concluir.')
      setStep(2)
      return
    }
    if (form.raioKm == null || form.raioKm < 1) {
      setError('Informe o raio máximo, em km, que você pode ir trabalhar.')
      setStep(7)
      return
    }
    const chave = validarChavePix(form.pix)
    if (!chave.ok) {
      setError(chave.erro)
      setStep(8)
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
      pix: chave.chave,
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
            <p>Envie o documento e a selfie. A análise começa na hora e diz se cada arquivo foi aceito.</p>
            <CampoDoc titulo="Documento (RG, CIN, CNH ou CPF)" papel="documento" linha={linhas.documento} onEscolher={escolherFoto} />
            <CampoDoc titulo="Verso, se tiver" papel="verso" linha={linhas.verso} onEscolher={escolherFoto} />
            <CampoDoc titulo="Selfie" papel="selfie" linha={linhas.selfie} onEscolher={escolherFoto} />
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
              <input value={form.pix} onChange={(e) => set('pix', e.target.value)} placeholder="CPF, e-mail, celular ou chave aleatória" required />
            </label>
            {pixInfo?.ok && <p className="docs-ok">Chave de {pixInfo.rotulo} conferida.</p>}
            {pixInfo && !pixInfo.ok && <p className="error">{pixInfo.erro}</p>}
          </>
        )}

        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-accent btn-block" disabled={step === 2 && algumAnalisando()}>
          {step === ETAPAS.length ? 'Concluir cadastro' : step === 2 && algumAnalisando() ? 'Analisando…' : 'Continuar'}
        </button>
      </form>
    </div>
  )
}

function CampoDoc({
  titulo,
  papel,
  linha,
  onEscolher,
}: {
  titulo: string
  papel: PapelDocumento
  linha: LinhaDoc
  onEscolher: (file: File | undefined, papel: PapelDocumento) => void
}) {
  return (
    <div className="docs-item">
      <label className="field">
        <span>{titulo}</span>
        <input
          type="file"
          accept={ACCEPT_DOCUMENTO_CADASTRO}
          onChange={(e) => onEscolher(e.target.files?.[0], papel)}
        />
        {linha.arquivo && <small className="muted">{linha.arquivo.nome}</small>}
      </label>
      {linha.analisando && <p className="docs-analise">Analisando…</p>}
      {linha.analise && (
        <p className={linha.analise.aceito ? 'docs-analise docs-analise--ok' : 'docs-analise docs-analise--nao'}>
          <strong>{linha.analise.aceito ? 'Aceito' : 'Não aceito'}</strong>
          <span>{linha.analise.motivo}</span>
        </p>
      )}
    </div>
  )
}
