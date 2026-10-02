export function montarEmailCodigo(
  finalidade: string,
  codigo: string,
): { assunto: string; texto: string; html: string }

export function enviarCodigoEmail(input: {
  email?: string
  codigo?: string
  finalidade?: string
  env?: Record<string, string>
}): Promise<{ ok: true; status: number } | { ok: false; status: number; erro: string }>
