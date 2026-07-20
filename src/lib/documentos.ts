import { DIAS_ALERTA_VENCIMENTO, requiredDocsForProfissional } from '../data/documentCatalog'
import type { DocumentoRegistro, DocumentoStatus, Profissional } from './types'

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'))
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

export function isDocVencido(doc: DocumentoRegistro): boolean {
  const days = daysUntil(doc.validade)
  return days !== null && days < 0
}

export function isDocVencendo(doc: DocumentoRegistro): boolean {
  const days = daysUntil(doc.validade)
  return days !== null && days >= 0 && days <= DIAS_ALERTA_VENCIMENTO
}

export function effectiveStatus(doc: DocumentoRegistro): DocumentoStatus {
  if (doc.status === 'aprovado' && isDocVencido(doc)) return 'vencido'
  return doc.status
}

export function docsDoDono(
  documentos: DocumentoRegistro[],
  donoTipo: 'profissional' | 'empresa',
  donoId: string,
) {
  return documentos.filter((d) => d.donoTipo === donoTipo && d.donoId === donoId)
}

export function checklistProfissional(
  profissional: Profissional,
  documentos: DocumentoRegistro[],
  requisitosDemanda: string[] = [],
) {
  const required = requiredDocsForProfissional(profissional.profissoes, requisitosDemanda)
  const meus = docsDoDono(documentos, 'profissional', profissional.id)

  return required.map((def) => {
    const doc = meus.find((d) => d.tipoId === def.id)
    const status = doc ? effectiveStatus(doc) : ('pendente' as DocumentoStatus)
    return {
      def,
      doc,
      status,
      ok: status === 'aprovado',
      faltando: !doc,
      vencendo: doc ? isDocVencendo(doc) : false,
    }
  })
}

export function resumoDocumental(items: ReturnType<typeof checklistProfissional>) {
  const total = items.length
  const ok = items.filter((i) => i.ok).length
  const pendentes = items.filter((i) => i.faltando || i.status === 'pendente' || i.status === 'em_analise').length
  const vencidos = items.filter((i) => i.status === 'vencido').length
  const vencendo = items.filter((i) => i.vencendo).length
  const recusados = items.filter((i) => i.status === 'recusado').length
  const completo = ok === total && vencidos === 0
  return { total, ok, pendentes, vencidos, vencendo, recusados, completo, pct: total ? Math.round((ok / total) * 100) : 0 }
}
