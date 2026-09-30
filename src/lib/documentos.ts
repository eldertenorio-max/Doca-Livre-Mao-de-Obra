import {
  DIAS_ALERTA_VENCIMENTO,
  DOCS_EMPRESA,
  DOCS_PROFISSIONAL,
  docDefById,
  requiredDocsForProfissional,
  type DocumentDef,
} from '../data/documentCatalog'
import type { DocumentoRegistro, DocumentoStatus, Profissional } from './types'

export const STATUS_LABEL: Record<DocumentoStatus, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  vencido: 'Vencido',
}

export type ChecklistItem = {
  def: DocumentDef
  doc?: DocumentoRegistro
  status: DocumentoStatus
  ok: boolean
  faltando: boolean
  vencendo: boolean
  opcional: boolean
}

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
  if (!doc.arquivoNome?.trim()) return 'pendente'
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

function itemDoChecklist(def: DocumentDef, meus: DocumentoRegistro[]): ChecklistItem {
  const doc = meus.find((d) => d.tipoId === def.id)
  const status = doc ? effectiveStatus(doc) : ('pendente' as DocumentoStatus)
  const faltando = !doc?.arquivoNome?.trim()
  return {
    def,
    doc,
    status,
    ok: status === 'aprovado',
    faltando,
    vencendo: Boolean(doc && status === 'aprovado' && isDocVencendo(doc)),
    opcional: Boolean(def.opcional),
  }
}

export function checklistProfissional(
  profissional: Profissional,
  documentos: DocumentoRegistro[],
  requisitosDemanda: string[] = [],
) {
  const required = requiredDocsForProfissional(profissional.profissoes, requisitosDemanda)
  const requiredIds = new Set(required.map((d) => d.id))
  const opcionais = DOCS_PROFISSIONAL.filter((d) => d.opcional && !requiredIds.has(d.id))
  const meus = docsDoDono(documentos, 'profissional', profissional.id)
  return [...required, ...opcionais].map((def) => itemDoChecklist(def, meus))
}

export function checklistEmpresa(empresaId: string, documentos: DocumentoRegistro[]) {
  const meus = docsDoDono(documentos, 'empresa', empresaId)
  return DOCS_EMPRESA.map((def) => itemDoChecklist(def, meus))
}

export function resumoDocumental(items: ChecklistItem[]) {
  const base = items.filter((i) => !i.opcional)
  const total = base.length
  const ok = base.filter((i) => i.ok).length
  const pendentes = base.filter(
    (i) => i.status === 'pendente' || i.status === 'em_analise' || i.status === 'recusado',
  ).length
  const vencidos = base.filter((i) => i.status === 'vencido').length
  const vencendo = base.filter((i) => i.vencendo).length
  const recusados = base.filter((i) => i.status === 'recusado').length
  const completo = total > 0 && ok === total
  return {
    total,
    ok,
    pendentes,
    vencidos,
    vencendo,
    recusados,
    completo,
    pct: total ? Math.round((ok / total) * 100) : 0,
  }
}

/** Bônus ou penalidade no score de matching. Documentos opcionais não entram. */
export function ajusteScoreDocumental(items: ChecklistItem[]): number {
  const resumo = resumoDocumental(items)
  if (resumo.total === 0) return 0
  if (resumo.completo && resumo.vencendo === 0) return 8
  if (resumo.completo) return 4
  const abertos = resumo.total - resumo.ok
  return Math.max(-20, -5 * abertos)
}

export function validarEnvioDocumento(
  tipoId: string,
  arquivoNome: string,
  validade?: string,
): string | null {
  const def = docDefById(tipoId)
  if (!def) return 'Tipo de documento inválido.'
  const nome = arquivoNome.trim()
  if (nome.length < 3) return 'Informe o nome do arquivo.'
  if (!/\.(pdf|jpe?g|png|txt)$/i.test(nome)) return 'Use um arquivo PDF, JPG, PNG ou TXT.'
  if (def.temValidade && !validade) return 'Informe a data de validade.'
  if (def.temValidade && validade) {
    const dias = daysUntil(validade)
    if (dias === null) return 'Data de validade inválida.'
    if (dias < 0) return 'A validade não pode estar vencida.'
  }
  return null
}
