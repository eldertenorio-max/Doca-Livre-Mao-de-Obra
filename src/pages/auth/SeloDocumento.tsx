export function SeloDocumento({
  analisando,
  analise,
}: {
  analisando: boolean
  analise: { aceito: boolean; motivo: string; falha?: boolean } | null
}) {
  if (!analisando && !analise) return null
  const falha = analise?.falha === true
  const aceito = !falha && analise?.aceito === true
  const recusado = !falha && analise?.aceito === false
  const classe = aceito ? 'docs-selo docs-selo--ok' : recusado || falha ? 'docs-selo docs-selo--nao' : 'docs-selo'
  return (
    <p className={classe} role="status">
      <span className="docs-selo-marca" aria-hidden>
        {analisando ? '…' : aceito ? '✓' : '✕'}
      </span>
      <span>
        <strong>{analisando ? 'Analisando…' : falha ? 'Não analisado' : aceito ? 'Aceito' : 'Não aceito'}</strong>
        {analise?.motivo && <small>{analise.motivo}</small>}
      </span>
    </p>
  )
}
