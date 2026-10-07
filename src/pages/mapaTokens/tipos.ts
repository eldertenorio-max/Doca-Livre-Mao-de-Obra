export type Peso = 'leve' | 'medio' | 'pesado'

export type ArquivoMedido = {
  caminho: string
  bytes: number
  linhas: number
  tokens: number
  importa?: string[]
}

export type PastaGrafo = {
  id: string
  arquivos: ArquivoMedido[]
  tokens: number
  maiorArquivo: number
  peso: Peso
  coluna: number
  x: number
  y: number
}

export type LigacaoGrafo = {
  de: string
  para: string
  quantidade: number
}

export type NoArvore = {
  id: string
  nome: string
  tipo: 'pasta' | 'arquivo'
  tokens: number
  linhas: number
  bytes: number
  arquivos: number
  maiorArquivo: number
  peso: Peso
  filhos: NoArvore[]
}
