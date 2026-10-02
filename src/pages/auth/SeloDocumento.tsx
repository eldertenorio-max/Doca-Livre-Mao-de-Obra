export function SeloDocumento({
  analisando,
  analise,
}: {
  analisando: boolean
  analise: { aceito: boolean; motivo: string } | null
}) {
  if (!analisando && !analise) return null
  const aceito = analise?.aceito === true
  const recusado = analise?.aceito === false
  const classe = aceito ? 'docs-selo docs-selo--ok' : recusado ? 'docs-selo docs-selo--nao' : 'docs-selo'
  return (
    <p className={classe} role="status">
      <span className="docs-selo-marca" aria-hidden>
        {analisando ? '…' : aceito ? '✓' : '✕'}
      </span>
      <span>
        <strong>{analisando ? 'Analisando…' : aceito ? 'Aceito' : 'Não aceito'}</strong>
        {analise?.motivo && <small>{analise.motivo}</small>}
      </span>
    </p>
  )
}
