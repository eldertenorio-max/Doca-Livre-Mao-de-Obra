import type { Nivel } from '../lib/types'

const LABELS: Record<Nivel, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  elite: 'Elite',
}

export function LevelBadge({ nivel }: { nivel: Nivel }) {
  return <span className={`level-badge level-badge--${nivel}`}>{LABELS[nivel]}</span>
}
