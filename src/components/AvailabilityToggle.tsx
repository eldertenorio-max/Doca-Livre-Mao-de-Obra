import type { Disponibilidade } from '../lib/types'

const OPTIONS: { key: keyof Disponibilidade; label: string }[] = [
  { key: 'hoje', label: 'Disponível hoje' },
  { key: 'amanha', label: 'Disponível amanhã' },
  { key: 'estaSemana', label: 'Esta semana' },
  { key: 'finaisDeSemana', label: 'Finais de semana' },
  { key: 'noturno', label: 'Noturno' },
  { key: 'viagens', label: 'Viagens' },
  { key: 'temporario', label: 'Temporário' },
  { key: 'efetivo', label: 'Efetivo' },
  { key: 'freelancer', label: 'Freelancer' },
]

type Props = {
  value: Disponibilidade
  onChange: (next: Disponibilidade) => void
}

export function AvailabilityToggle({ value, onChange }: Props) {
  return (
    <div className="availability-grid">
      {OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`availability-chip ${value[key] ? 'availability-chip--on' : ''}`}
          onClick={() => onChange({ ...value, [key]: !value[key] })}
        >
          <span className="availability-dot" />
          {label}
        </button>
      ))}
    </div>
  )
}
