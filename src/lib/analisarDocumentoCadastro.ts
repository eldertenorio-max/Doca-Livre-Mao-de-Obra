export type PapelDocumento = 'documento' | 'verso' | 'selfie'

export type FotoDocumento = {
  nome: string
  mime: 'image/jpeg' | 'application/pdf'
  dados: string
}

export async function lerFotoDocumento(file: File): Promise<FotoDocumento> {
  const tipoOk = /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name)
  if (!tipoOk) throw new Error('Envie uma foto JPG, PNG ou WEBP.')

  const url = URL.createObjectURL(file)
  try {
    const img = await carregarImagem(url)
    const max = 1600
    const escala = Math.min(1, max / Math.max(img.width, img.height))
    const largura = Math.max(1, Math.round(img.width * escala))
    const altura = Math.max(1, Math.round(img.height * escala))
    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível ler a foto.')
    ctx.drawImage(img, 0, 0, largura, altura)
    const dados = (canvas.toDataURL('image/jpeg', 0.82).split(',')[1] || '').replace(/\s/g, '')
    if (dados.length < 80 || dados.length > 2_000_000) {
      throw new Error('A foto ficou grande demais. Envie uma imagem menor.')
    }
    return { nome: file.name, mime: 'image/jpeg', dados }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function carregarImagem(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível ler a foto.'))
    img.src = url
  })
}

export async function lerArquivoEmpresa(file: File): Promise<FotoDocumento> {
  const pdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (!pdf) return lerFotoDocumento(file)
  if (file.size > 3_500_000) throw new Error('O PDF ficou grande demais. Envie um arquivo menor.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  const dados = btoa(binario).replace(/\s/g, '')
  if (dados.length < 80) throw new Error('Não foi possível ler o arquivo.')
  return { nome: file.name, mime: 'application/pdf', dados }
}

export async function analisarDocumentoCadastro(input: {
  nome: string
  arquivos: { papel: PapelDocumento; mime: string; dados: string }[]
  contexto?: 'trabalhador' | 'empresa'
  tipo?: string
  cnpj?: string
  cidade?: string
}): Promise<{ ok: true; aceito: boolean; motivo: string } | { ok: false; erro: string }> {
  try {
    const resposta = await fetch('/api/cadastro/analisar-documento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const texto = await resposta.text()
    let data: { ok?: boolean; aceito?: boolean; motivo?: string; erro?: string } = {}
    try {
      data = JSON.parse(texto) as typeof data
    } catch {
      return { ok: false, erro: 'Não foi possível analisar o documento. Tente de novo.' }
    }
    if (!resposta.ok || !data.ok || typeof data.aceito !== 'boolean') {
      return { ok: false, erro: data.erro || 'Não foi possível analisar o documento.' }
    }
    return { ok: true, aceito: data.aceito, motivo: data.motivo || '' }
  } catch {
    return { ok: false, erro: 'Não foi possível analisar o documento. Tente de novo.' }
  }
}
