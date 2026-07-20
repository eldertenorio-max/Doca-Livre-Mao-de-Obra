type Props = {
  onEmpresa: () => void
  onProfissional: () => void
  onBack: () => void
}

export function RoleSelectScreen({ onEmpresa, onProfissional, onBack }: Props) {
  return (
    <div className="auth-screen">
      <div className="auth-card auth-card--wide">
        <button type="button" className="btn btn-ghost link-back" onClick={onBack}>
          ← Voltar
        </button>
        <h1 className="auth-title">Como deseja entrar?</h1>
        <p className="muted">Escolha o perfil. O fluxo de cadastro é diferente para cada um.</p>
        <div className="role-grid">
          <button type="button" className="role-card" onClick={onEmpresa}>
            <span className="role-icon" aria-hidden>
              E
            </span>
            <strong>Empresa</strong>
            <p>Preciso contratar profissionais para minha operação.</p>
            <span className="btn btn-accent">Cadastrar Empresa</span>
          </button>
          <button type="button" className="role-card" onClick={onProfissional}>
            <span className="role-icon" aria-hidden>
              P
            </span>
            <strong>Profissional</strong>
            <p>Quero encontrar oportunidades de trabalho.</p>
            <span className="btn btn-primary">Cadastrar Profissional</span>
          </button>
        </div>
      </div>
    </div>
  )
}
