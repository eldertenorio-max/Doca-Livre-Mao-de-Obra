export type CurriculoServidor = {
  nome: string
  nascimento: string
  cidade: string
  estado: string
  resumo: string
  escolaridade: string
  habilidades: string[]
  profissoes: string[]
  experiencia: { cargo: string; empresa: string; inicio: string; fim: string; descricao: string }[]
  certificados: string[]
  cnhCategoria: string
}

export function lerResposta(saida: string): Record<string, unknown> | null

export function lerCurriculo(input: {
  texto?: string
  imagem?: { mime?: string; dados?: string }
  cargos?: { id?: string; label?: string }[]
  env?: Record<string, string>
}): Promise<
  | { ok: true; status: number; curriculo: CurriculoServidor }
  | { ok: false; status: number; erro: string }
>
