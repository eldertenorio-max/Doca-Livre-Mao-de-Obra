export type Peso = 'leve' | 'medio' | 'pesado'

export type ArquivoMedido = {
  caminho: string
  bytes: number
  linhas: number
  tokens: number
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
