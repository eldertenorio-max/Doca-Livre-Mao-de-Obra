export function lerDecisao(texto: string): { aceito: boolean; motivo: string } | null

export function analisarDocumentoCadastro(input: {
  nome?: string
  arquivos?: { papel?: string; mime?: string; dados?: string }[]
  env?: Record<string, string>
}): Promise<
  | { ok: true; status: number; aceito: boolean; motivo: string }
  | { ok: false; status: number; erro: string }
>
