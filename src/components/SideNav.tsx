export type SidebarItem = {
  id: string
  label: string
  icon?: string
}

type Props = {
  items: SidebarItem[]
  active: string
  onSelect: (id: string) => void
  wide: boolean
}

export function SideNav({ items, active, onSelect, wide }: Props) {
  return (
    <aside className={`sidebar ${wide ? 'sidebar--wide' : ''}`}>
      <nav className="sidebar-body">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-item ${active === item.id ? 'sidebar-item--active' : ''}`}
            onClick={() => onSelect(item.id)}
            title={item.label}
          >
            <span className="sidebar-item-icon" aria-hidden>
              {item.icon ?? item.label.slice(0, 1)}
            </span>
            {wide && <span className="sidebar-item-label">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  )
}
