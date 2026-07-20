import { useCallback, useState } from 'react'
import { IntroSplash } from './components/IntroSplash'
import { StoreProvider, useStore } from './lib/store'
import { AdminApp } from './pages/admin/AdminApp'
import { CadastroEmpresaScreen } from './pages/auth/CadastroEmpresaScreen'
import { CadastroProfissionalScreen } from './pages/auth/CadastroProfissionalScreen'
import { PortalConfigScreen } from './pages/auth/PortalConfigScreen'
import { PortalLoginScreen } from './pages/auth/PortalLoginScreen'
import { PortalSelectScreen } from './pages/auth/PortalSelectScreen'
import { EmpresaApp } from './pages/empresa/EmpresaApp'
import { ProfissionalApp } from './pages/profissional/ProfissionalApp'
import './App.css'

type PortalTipo = 'empresa' | 'profissional' | 'admin'

type Gate =
  | 'splash'
  | 'select'
  | 'login'
  | 'config'
  | 'cadastro_empresa'
  | 'cadastro_profissional'
  | 'app'

const PORTAL_SESSION_KEY = 'mao-portal-ativo'

function readPortal(): PortalTipo | null {
  try {
    const v = sessionStorage.getItem(PORTAL_SESSION_KEY)
    if (v === 'empresa' || v === 'profissional' || v === 'admin') return v
  } catch {
    /* ignore */
  }
  return null
}

function writePortal(p: PortalTipo) {
  try {
    sessionStorage.setItem(PORTAL_SESSION_KEY, p)
  } catch {
    /* ignore */
  }
}

function portalFromUser(role: string | undefined): PortalTipo {
  if (role === 'profissional') return 'profissional'
  if (role === 'empresa') return 'empresa'
  return 'admin'
}

function AppRoutes() {
  const { currentUser, logout } = useStore()
  const [portal, setPortal] = useState<PortalTipo>(
    () => readPortal() ?? portalFromUser(currentUser?.role),
  )
  const [gate, setGate] = useState<Gate>(() => (currentUser ? 'app' : 'splash'))

  const finishSplash = useCallback(() => {
    if (currentUser) {
      const p = readPortal() ?? portalFromUser(currentUser.role)
      setPortal(p)
      writePortal(p)
      setGate('app')
      return
    }
    setGate('select')
  }, [currentUser])

  function handleLogout() {
    logout()
    setGate('select')
  }

  function openPortal(p: PortalTipo) {
    setPortal(p)
    writePortal(p)
    setGate('login')
  }

  function afterLogin(opts: {
    isSuperuser?: boolean
    precisaConfig?: boolean
    precisaPerfil?: boolean
    role: string
  }) {
    writePortal(portal)
    // Hierarquia/permissões só no acesso Admin (superusuário)
    if (portal === 'admin' && (opts.precisaConfig || opts.isSuperuser)) {
      setGate('config')
      return
    }
    if (opts.precisaPerfil) {
      if (opts.role === 'empresa' || portal === 'empresa') setGate('cadastro_empresa')
      else if (opts.role === 'profissional' || portal === 'profissional') {
        setGate('cadastro_profissional')
      } else setGate('app')
      return
    }
    setGate('app')
  }

  if (gate === 'splash') {
    return <IntroSplash onFinish={finishSplash} />
  }

  if (gate === 'config' && currentUser) {
    return (
      <PortalConfigScreen
        onContinuar={() => setGate('app')}
        onSair={handleLogout}
      />
    )
  }

  if (gate === 'app' && currentUser) {
    // Roteia pelo portal escolhido no login — não força Admin para super.
    if (portal === 'profissional') {
      return <ProfissionalApp onLogout={handleLogout} />
    }
    if (portal === 'empresa') {
      return <EmpresaApp onLogout={handleLogout} />
    }
    // portal === 'admin'
    return <AdminApp onLogout={handleLogout} onOpenConfig={() => setGate('config')} />
  }

  if (gate === 'login') {
    return (
      <PortalLoginScreen
        portal={portal}
        onBack={() => setGate('select')}
        onSuccess={(r) =>
          afterLogin({
            isSuperuser: r.isSuperuser,
            precisaConfig: r.precisaConfig,
            precisaPerfil: r.precisaPerfil,
            role: r.role,
          })
        }
      />
    )
  }

  if (gate === 'cadastro_empresa') {
    return (
      <CadastroEmpresaScreen
        onBack={() => setGate('select')}
        onDone={() => {
          writePortal('empresa')
          setPortal('empresa')
          setGate('app')
        }}
      />
    )
  }

  if (gate === 'cadastro_profissional') {
    return (
      <CadastroProfissionalScreen
        onBack={() => setGate('select')}
        onDone={() => {
          writePortal('profissional')
          setPortal('profissional')
          setGate('app')
        }}
      />
    )
  }

  return (
    <PortalSelectScreen
      onEmpresa={() => openPortal('empresa')}
      onProfissional={() => openPortal('profissional')}
      onAdmin={() => openPortal('admin')}
    />
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AppRoutes />
    </StoreProvider>
  )
}
