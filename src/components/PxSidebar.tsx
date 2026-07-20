import { useState } from 'react'

export type PxNavId =
  | 'inicio'
  | 'contratos'
  | 'docs_contratos'
  | 'docs_empresa'
  | 'prestadores'
  | 'infracoes'
  | 'sinistros'
  | 'financas'
  | 'campanhas'
  | 'calculadora'
  | 'relatorio_operacional'
  | 'operacoes'
  | 'perfis'
  | 'enderecos'
  | 'veiculos'
  | 'nova_demanda'
  | 'candidatos'

type NavChild = { id: PxNavId; label: string; badge?: string }
type NavGroup = {
  id: string
  label: string
  icon: string
  children?: NavChild[]
  link?: PxNavId
}

const GROUPS: NavGroup[] = [
  { id: 'home', label: 'Início', icon: '⌂', link: 'inicio' },
  {
    id: 'operacional',
    label: 'Operacional',
    icon: '✎',
    children: [
      { id: 'contratos', label: 'Contratos' },
      { id: 'docs_contratos', label: 'Documentos contratuais' },
      { id: 'prestadores', label: 'Prestadores' },
    ],
  },
  {
    id: 'documentacao',
    label: 'Documentação',
    icon: '📄',
    children: [
      { id: 'docs_empresa', label: 'Docs da empresa' },
      { id: 'docs_contratos', label: 'Contratos gerados' },
    ],
  },
  {
    id: 'ocorrencias',
    label: 'Ocorrências',
    icon: '⚠',
    children: [
      { id: 'infracoes', label: 'Infrações' },
      { id: 'sinistros', label: 'Sinistros' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: '$',
    children: [
      { id: 'financas', label: 'Finanças' },
      { id: 'campanhas', label: 'Campanhas promocionais' },
      { id: 'calculadora', label: 'Calculadora' },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: '☰',
    children: [
      { id: 'relatorio_operacional', label: 'Operacional', badge: 'Novo' },
    ],
  },
  {
    id: 'modelos',
    label: 'Modelos',
    icon: '▦',
    children: [
      { id: 'operacoes', label: 'Operações' },
      { id: 'perfis', label: 'Perfis ideais' },
      { id: 'enderecos', label: 'Endereços' },
      { id: 'veiculos', label: 'Veículos' },
    ],
  },
]

type Props = {
  active: PxNavId
  onSelect: (id: PxNavId) => void
}

export function PxSidebar({ active, onSelect }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    operacional: true,
    ocorrencias: true,
    financeiro: true,
    relatorios: true,
    modelos: true,
  })

  function toggle(id: string) {
    setOpen((o) => ({ ...o, [id]: !o[id] }))
  }

  return (
    <aside className="px-sidebar">
      <nav className="px-sidebar-nav">
        {GROUPS.map((g) => {
          if (g.link) {
            return (
              <button
                key={g.id}
                type="button"
                className={`px-nav-link ${active === g.link ? 'px-nav-link--active' : ''}`}
                onClick={() => onSelect(g.link!)}
              >
                <span className="px-nav-ico" aria-hidden>{g.icon}</span>
                <span>{g.label}</span>
              </button>
            )
          }
          const isOpen = open[g.id]
          return (
            <div key={g.id} className="px-nav-group">
              <button type="button" className="px-nav-group-btn" onClick={() => toggle(g.id)}>
                <span className="px-nav-ico" aria-hidden>{g.icon}</span>
                <span>{g.label}</span>
                <span className={`px-chevron ${isOpen ? 'px-chevron--open' : ''}`}>⌃</span>
              </button>
              {isOpen && g.children && (
                <div className="px-nav-children">
                  {g.children.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`px-nav-child ${active === c.id ? 'px-nav-child--active' : ''}`}
                      onClick={() => onSelect(c.id)}
                    >
                      {c.label}
                      {c.badge && <span className="px-badge-novo">{c.badge}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
