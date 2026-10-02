import { useEffect, useId, useMemo, useState } from 'react'
import { CATEGORIES, cargoLabel } from '../../data/categories'
import { LOCAIS_OPERACAO } from '../../data/cidades'
import { coordenadaDaCidade } from '../../lib/coordenadaCidade'
import { validarChavePix } from '../../lib/pix'
import { useStore } from '../../lib/store'
import type { Certificado, Disponibilidade, Experiencia, Profissional } from '../../lib/types'

const CERTS = ['NR11', 'NR35', 'NR10', 'NR20', 'MOPP', 'Munck', 'Ponte Rolante']
const RAIOS = [10, 25, 50, 100]
const TURNOS: { key: keyof Disponibilidade; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'amanha', label: 'Amanhã' },
  { key: 'estaSemana', label: 'Esta semana' },
  { key: 'finaisDeSemana', label: 'Finais de semana' },
  { key: 'noturno', label: 'Noturno' },
  { key: 'viagens', label: 'Viagens' },
  { key: 'temporario', label: 'Temporário' },
  { key: 'efetivo', label: 'Efetivo' },
  { key: 'freelancer', label: 'Freelancer' },
]

type Rascunho = {
  nome: string
  cpf: string
  rg: string
  nascimento: string
  telefone: string
  foto?: string
  profissoes: string[]
  experiencia: Experiencia[]
  certificados: Certificado[]
  cnhCategoria: string
  cnhValidade: string
  disponibilidade: Disponibilidade
  cep: string
  rua: string
  numero: string
  cidade: string
  estado: string
  raioKm: number | null
  pix: string
}

function rascunhoDe(prof: Profissional): Rascunho {
  return {
    nome: prof.nome,
    cpf: prof.cpf,
    rg: prof.rg,
    nascimento: prof.nascimento,
    telefone: prof.telefone,
    foto: prof.foto,
    profissoes: [...prof.profissoes],
    experiencia: prof.experiencia.map((item) => ({ ...item })),
    certificados: prof.certificados.map((item) => ({ ...item })),
    cnhCategoria: prof.cnhCategoria ?? '',
    cnhValidade: prof.cnhValidade ?? '',
    disponibilidade: { ...prof.disponibilidade },
    cep: prof.endereco.cep,
    rua: prof.endereco.rua,
    numero: prof.endereco.numero,
    cidade: prof.endereco.cidade,
    estado: prof.endereco.estado,
    raioKm: prof.raioKm,
    pix: prof.pix,
  }
}

export function EditorPerfil({
  prof,
  fotoNova,
  onFechar,
  onSalvou,
}: {
  prof: Profissional
  fotoNova?: string
  onFechar: () => void
  onSalvou: () => void
}) {
  const { state, atualizarPerfilProfissional } = useStore()
  const certNovoId = useId()
  const [form, setForm] = useState<Rascunho>(() => rascunhoDe(prof))
  const [certNovo, setCertNovo] = useState('')
  const [erro, setErro] = useState('')

  const ufs = useMemo(() => [...new Set(LOCAIS_OPERACAO.map((local) => local.estado))].sort(), [])
  const cidades = useMemo(
    () => LOCAIS_OPERACAO.filter((local) => local.estado === form.estado).map((local) => local.cidade),
    [form.estado],
  )
  const pixInfo = form.pix.trim() ? validarChavePix(form.pix) : null

  useEffect(() => {
    if (!fotoNova) return
    setForm((atual) => ({ ...atual, foto: fotoNova }))
  }, [fotoNova])

  function set<K extends keyof Rascunho>(chave: K, valor: Rascunho[K]) {
    setForm((atual) => ({ ...atual, [chave]: valor }))
  }

  function alternarProfissao(id: string) {
    set(
      'profissoes',
      form.profissoes.includes(id) ? form.profissoes.filter((item) => item !== id) : [...form.profissoes, id],
    )
  }

  function alternarCertificado(tipo: string) {
    const existe = form.certificados.some((item) => item.tipo === tipo)
    set(
      'certificados',
      existe
        ? form.certificados.filter((item) => item.tipo !== tipo)
        : [...form.certificados, { tipo, validade: '', valido: true }],
    )
  }

  function atualizarCertificado(tipo: string, validade: string) {
    const hoje = new Date().toISOString().slice(0, 10)
    set(
      'certificados',
      form.certificados.map((item) =>
        item.tipo === tipo ? { ...item, validade, valido: !validade || validade >= hoje } : item,
      ),
    )
  }

  function atualizarExperiencia(index: number, campo: keyof Experiencia, valor: string) {
    set(
      'experiencia',
      form.experiencia.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)),
    )
  }

  function salvar() {
    setErro('')
    if (form.nome.trim().length < 3) {
      setErro('Informe o nome.')
      return
    }
    if (form.profissoes.length === 0) {
      setErro('Selecione ao menos um cargo.')
      return
    }
    if (!form.cidade.trim() || !form.estado.trim()) {
      setErro('Informe a cidade e o estado.')
      return
    }
    if (form.raioKm == null || form.raioKm < 1) {
      setErro('Informe o raio máximo, em km.')
      return
    }
    const mesmaCidade =
      form.cidade.trim().toLowerCase() === prof.endereco.cidade.trim().toLowerCase() &&
      form.estado.trim().toUpperCase() === prof.endereco.estado.trim().toUpperCase()
    const coordenada = mesmaCidade
      ? { lat: prof.endereco.lat, lng: prof.endereco.lng }
      : coordenadaDaCidade(form.cidade, form.estado, [
          ...state.profissionais.map((pessoa) => pessoa.endereco),
          ...state.empresas.map((empresa) => empresa.endereco),
        ])
    const experiencia = form.experiencia.filter((item) => item.cargo.trim() || item.empresa.trim())
    const res = atualizarPerfilProfissional(prof.id, {
      nome: form.nome,
      cpf: form.cpf,
      rg: form.rg,
      nascimento: form.nascimento,
      telefone: form.telefone,
      foto: form.foto,
      profissoes: form.profissoes,
      experiencia,
      certificados: form.certificados.filter((item) => item.tipo.trim()),
      cnhCategoria: form.cnhCategoria,
      cnhValidade: form.cnhValidade,
      disponibilidade: form.disponibilidade,
      endereco: {
        cep: form.cep,
        rua: form.rua,
        numero: form.numero,
        cidade: form.cidade,
        estado: form.estado,
        ...coordenada,
      },
      raioKm: form.raioKm,
      pix: form.pix,
    })
    if (!res.ok) {
      setErro(res.error ?? 'Não foi possível salvar o perfil.')
      return
    }
    onSalvou()
  }

  return (
    <div className="td-editor">
      <section className="td-card">
        <h2>Seus dados</h2>
        <div className="td-form">
          <label>
            <span>Nome</span>
            <input value={form.nome} onChange={(e) => set('nome', e.target.value)} />
          </label>
          <label>
            <span>Nascimento</span>
            <input type="date" value={form.nascimento} onChange={(e) => set('nascimento', e.target.value)} />
          </label>
          <label>
            <span>Telefone</span>
            <input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
          </label>
          <label>
            <span>CPF</span>
            <input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} />
          </label>
          <label>
            <span>RG</span>
            <input value={form.rg} onChange={(e) => set('rg', e.target.value)} />
          </label>
        </div>
      </section>

      <section className="td-card">
        <h2>Onde você mora</h2>
        <div className="td-form">
          <label>
            <span>Estado</span>
            <select value={form.estado} onChange={(e) => set('estado', e.target.value)}>
              {ufs.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Cidade</span>
            <input
              value={form.cidade}
              list="cidades-perfil"
              onChange={(e) => set('cidade', e.target.value)}
            />
            <datalist id="cidades-perfil">
              {cidades.map((cidade) => (
                <option key={cidade} value={cidade} />
              ))}
            </datalist>
          </label>
          <label>
            <span>Rua</span>
            <input value={form.rua} onChange={(e) => set('rua', e.target.value)} />
          </label>
          <label>
            <span>Número</span>
            <input value={form.numero} onChange={(e) => set('numero', e.target.value)} />
          </label>
          <label>
            <span>CEP</span>
            <input value={form.cep} onChange={(e) => set('cep', e.target.value)} />
          </label>
          <label>
            <span>Raio máximo para trabalhar (km)</span>
            <input
              type="number"
              min={1}
              max={500}
              inputMode="numeric"
              value={form.raioKm ?? ''}
              onChange={(e) => {
                const numero = Number(e.target.value)
                set('raioKm', e.target.value === '' || !Number.isFinite(numero) || numero <= 0 ? null : Math.min(500, Math.round(numero)))
              }}
            />
          </label>
        </div>
        <div className="td-chips">
          {RAIOS.map((km) => (
            <button
              key={km}
              type="button"
              className={form.raioKm === km ? 'td-chip td-chip--on' : 'td-chip'}
              onClick={() => set('raioKm', km)}
            >
              {km} km
            </button>
          ))}
        </div>
      </section>

      <section className="td-card">
        <h2>CNH e pagamento</h2>
        <div className="td-form">
          <label>
            <span>Categoria da CNH</span>
            <input
              value={form.cnhCategoria}
              placeholder="Ex: B, C, D, E"
              onChange={(e) => set('cnhCategoria', e.target.value.toUpperCase())}
            />
          </label>
          <label>
            <span>Validade da CNH</span>
            <input type="date" value={form.cnhValidade} onChange={(e) => set('cnhValidade', e.target.value)} />
          </label>
          <label>
            <span>Chave PIX</span>
            <input
              value={form.pix}
              placeholder="CPF, e-mail, celular ou chave aleatória"
              onChange={(e) => set('pix', e.target.value)}
            />
          </label>
          {pixInfo?.ok && <p className="td-form-full docs-ok">Chave de {pixInfo.rotulo} conferida.</p>}
          {pixInfo && !pixInfo.ok && <p className="td-form-full error">{pixInfo.erro}</p>}
        </div>
      </section>

      <section className="td-card">
        <h2>Profissões</h2>
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="td-editor-grupo">
            <h3>{cat.label}</h3>
            <div className="td-chips">
              {cat.cargos.map((cargo) => (
                <button
                  key={cargo.id}
                  type="button"
                  className={form.profissoes.includes(cargo.id) ? 'td-chip td-chip--on' : 'td-chip'}
                  onClick={() => alternarProfissao(cargo.id)}
                >
                  {cargo.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="td-card">
        <h2>Experiência</h2>
        {form.experiencia.map((item, index) => (
          <div key={index} className="td-form td-exp-edit">
            <label>
              <span>Cargo</span>
              <input value={item.cargo} onChange={(e) => atualizarExperiencia(index, 'cargo', e.target.value)} />
            </label>
            <label>
              <span>Empresa</span>
              <input value={item.empresa} onChange={(e) => atualizarExperiencia(index, 'empresa', e.target.value)} />
            </label>
            <label>
              <span>Início</span>
              <input type="month" value={(item.inicio || '').slice(0, 7)} onChange={(e) => atualizarExperiencia(index, 'inicio', e.target.value)} />
            </label>
            <label>
              <span>Fim</span>
              <input
                type="month"
                value={item.fim && item.fim !== 'atual' ? item.fim.slice(0, 7) : ''}
                onChange={(e) => atualizarExperiencia(index, 'fim', e.target.value)}
              />
            </label>
            <label className="td-form-full">
              <span>Descrição</span>
              <input value={item.descricao} onChange={(e) => atualizarExperiencia(index, 'descricao', e.target.value)} />
            </label>
            <button
              type="button"
              className="td-link"
              onClick={() => set('experiencia', form.experiencia.filter((_, i) => i !== index))}
            >
              Remover experiência
            </button>
          </div>
        ))}
        <button
          type="button"
          className="td-link"
          onClick={() =>
            set('experiencia', [
              ...form.experiencia,
              { cargo: '', empresa: '', inicio: '', fim: '', descricao: '' },
            ])
          }
        >
          Incluir experiência
        </button>
      </section>

      <section className="td-card">
        <h2>Certificados</h2>
        <div className="td-chips">
          {CERTS.map((tipo) => (
            <button
              key={tipo}
              type="button"
              className={form.certificados.some((item) => item.tipo === tipo) ? 'td-chip td-chip--on' : 'td-chip'}
              onClick={() => alternarCertificado(tipo)}
            >
              {tipo}
            </button>
          ))}
          {form.certificados
            .filter((item) => !CERTS.includes(item.tipo))
            .map((item) => (
              <button
                key={item.tipo}
                type="button"
                className="td-chip td-chip--on"
                onClick={() => alternarCertificado(item.tipo)}
              >
                {item.tipo}
              </button>
            ))}
        </div>
        <div className="td-form" style={{ marginTop: 12 }}>
          {form.certificados.map((item) => (
            <label key={item.tipo}>
              <span>Validade de {item.tipo}</span>
              <input type="date" value={(item.validade || '').slice(0, 10)} onChange={(e) => atualizarCertificado(item.tipo, e.target.value)} />
            </label>
          ))}
          <label className="td-form-full">
            <span>Outro certificado</span>
            <span className="td-inline">
              <input id={certNovoId} value={certNovo} onChange={(e) => setCertNovo(e.target.value)} />
              <button
                type="button"
                className="td-link"
                onClick={() => {
                  const tipo = certNovo.trim()
                  if (!tipo || form.certificados.some((item) => item.tipo.toLowerCase() === tipo.toLowerCase())) return
                  alternarCertificado(tipo)
                  setCertNovo('')
                }}
              >
                Incluir
              </button>
            </span>
          </label>
        </div>
      </section>

      <section className="td-card">
        <h2>Disponibilidade</h2>
        <div className="td-chips">
          {TURNOS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={form.disponibilidade[item.key] ? 'td-chip td-chip--on' : 'td-chip'}
              onClick={() =>
                set('disponibilidade', { ...form.disponibilidade, [item.key]: !form.disponibilidade[item.key] })
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {form.profissoes.length > 0 && (
        <p className="td-editor-resumo">
          Cargo principal: {cargoLabel(form.profissoes[0])}. O texto de apresentação usa a experiência e a cidade.
        </p>
      )}
      {erro && <p className="error">{erro}</p>}
      <div className="td-editor-acoes">
        <button type="button" className="td-editor-sec" onClick={onFechar}>
          Cancelar
        </button>
        <button type="button" className="td-editor-pri" onClick={salvar}>
          Salvar perfil
        </button>
      </div>
    </div>
  )
}

export function lerFotoPerfil(file: File) {
  const tipoOk = /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name)
  if (!tipoOk) return Promise.reject(new Error('Envie uma foto JPG, PNG ou WEBP.'))
  const url = URL.createObjectURL(file)
  return new Promise<string>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const max = 480
      const escala = Math.min(1, max / Math.max(img.width, img.height))
      const largura = Math.max(1, Math.round(img.width * escala))
      const altura = Math.max(1, Math.round(img.height * escala))
      const canvas = document.createElement('canvas')
      canvas.width = largura
      canvas.height = altura
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) {
        reject(new Error('Não foi possível ler a foto.'))
        return
      }
      ctx.drawImage(img, 0, 0, largura, altura)
      const foto = canvas.toDataURL('image/jpeg', 0.72)
      if (foto.length > 400_000) {
        reject(new Error('A foto ficou grande demais. Escolha outra imagem.'))
        return
      }
      resolve(foto)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a foto.'))
    }
    img.src = url
  })
}
