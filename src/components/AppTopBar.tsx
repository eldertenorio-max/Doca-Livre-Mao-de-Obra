import { LOGO_DOCA_LIVRE_SRC, BRAND_PRODUCT_NAME } from '../lib/brandAssets'

type Props = {
  title: string
  subtitle?: string
  onMenu?: () => void
  onLogout: () => void
  wide?: boolean
}

export function AppTopBar({ title, subtitle, onMenu, onLogout, wide }: Props) {
  return (
    <header className="app-topbar">
      <div className="app-topbar-left">
        {onMenu && (
          <button type="button" className="app-topbar-menu" onClick={onMenu} aria-label="Menu">
            <span className="app-topbar-menu-icon" />
          </button>
        )}
        <div className="app-topbar-brand">
          <img src={LOGO_DOCA_LIVRE_SRC} alt="" className="app-topbar-logo" />
          <div className="app-topbar-titles">
            <strong>{title}</strong>
            <span className="app-topbar-badge">{BRAND_PRODUCT_NAME}</span>
            {subtitle && <span className="muted">{subtitle}</span>}
          </div>
        </div>
      </div>
      <div className="app-topbar-right">
        {wide !== undefined && (
          <span className="layout-hint muted">{wide ? 'Menu expandido' : 'Menu compacto'}</span>
        )}
        <button type="button" className="btn btn-ghost" onClick={onLogout}>
          Sair
        </button>
      </div>
    </header>
  )
}
