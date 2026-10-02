import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CHAVE_NOTIFICACOES,
  horaDoAviso,
  lidasDaEmpresa,
  marcarAvisosLidos,
  montarAvisosEmpresa,
  sincronizarLidas,
  type AvisoEmpresa,
} from '../../lib/notificacoesEmpresa'
import { useStore } from '../../lib/store'

export function SinoEmpresa({
  empresaId,
  onIr,
}: {
  empresaId: string
  onIr: (aba: 'vagas' | 'missoes' | 'contratacoes') => void
}) {
  const { state } = useStore()
  const avisos = useMemo(
    () =>
      montarAvisosEmpresa({
        empresaId,
        demandas: state.demandas,
        candidaturas: state.candidaturas,
        profissionais: state.profissionais,
        avaliacoes: state.avaliacoes,
        pagamentos: state.pagamentos,
      }),
    [empresaId, state.avaliacoes, state.candidaturas, state.demandas, state.pagamentos, state.profissionais],
  )
  const [lidas, setLidas] = useState<string[] | null>(null)
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState({ top: 62, right: 12 })
  const botaoRef = useRef<HTMLButtonElement>(null)
  const painelRef = useRef<HTMLDivElement>(null)
  const lidasSet = useMemo(() => new Set(lidas ?? []), [lidas])
  const naoLidas = lidas == null ? 0 : avisos.filter((aviso) => !lidasSet.has(aviso.id)).length
  const visiveis = avisos.slice(0, 20)

  useEffect(() => {
    setLidas(sincronizarLidas(empresaId, avisos))
  }, [avisos, empresaId])

  useEffect(() => {
    function aoStorage(event: StorageEvent) {
      if (event.key !== CHAVE_NOTIFICACOES) return
      setLidas(lidasDaEmpresa(empresaId))
    }
    window.addEventListener('storage', aoStorage)
    return () => window.removeEventListener('storage', aoStorage)
  }, [empresaId])

  useEffect(() => {
    if (!aberto) return
    function fora(event: MouseEvent) {
      const alvo = event.target
      if (!(alvo instanceof Node)) return
      if (botaoRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return
      setAberto(false)
    }
    function tecla(event: KeyboardEvent) {
      if (event.key === 'Escape') setAberto(false)
    }
    function reposicionar() {
      const rect = botaoRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosicao({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) })
    }
    reposicionar()
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    window.addEventListener('resize', reposicionar)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
      window.removeEventListener('resize', reposicionar)
    }
  }, [aberto])

  function alternar() {
    const rect = botaoRef.current?.getBoundingClientRect()
    if (rect) setPosicao({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) })
    setAberto((valor) => !valor)
  }

  function marcarTodas() {
    setLidas(marcarAvisosLidos(empresaId, avisos.map((aviso) => aviso.id)))
  }

  function abrirAviso(aviso: AvisoEmpresa) {
    setLidas(marcarAvisosLidos(empresaId, [aviso.id]))
    setAberto(false)
    onIr(aviso.aba)
  }

  const rotulo =
    naoLidas === 0
      ? 'Notificações'
      : naoLidas === 1
        ? 'Notificações, 1 nova'
        : `Notificações, ${naoLidas} novas`

  return (
    <div className="cf-sino">
      <button
        ref={botaoRef}
        type="button"
        className={`cf-sino-btn ${aberto ? 'cf-sino-btn--ativa' : ''} ${naoLidas > 0 ? 'cf-sino-btn--nova' : ''}`}
        aria-label={rotulo}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        onClick={alternar}
      >
        <IconeSino />
        {naoLidas > 0 && <span className="cf-sino-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>}
      </button>
      <span className="cf-sino-live" aria-live="polite">
        {naoLidas === 0 ? '' : rotulo}
      </span>
      {aberto &&
        createPortal(
          <div
            ref={painelRef}
            className="cf-sino-painel"
            role="dialog"
            aria-label="Notificações"
            style={{ top: posicao.top, right: posicao.right }}
          >
            <header className="cf-sino-topo">
              <strong>Notificações</strong>
              {naoLidas > 0 && (
                <button type="button" onClick={marcarTodas}>
                  Marcar como lidas
                </button>
              )}
            </header>
            {visiveis.length === 0 && (
              <p className="cf-sino-vazio">Nenhuma candidatura ou convite aceito por enquanto.</p>
            )}
            <ul>
              {visiveis.map((aviso) => {
                const nova = lidas != null && !lidasSet.has(aviso.id)
                return (
                  <li key={aviso.id}>
                    <button
                      type="button"
                      className={nova ? 'cf-sino-item cf-sino-item--nova' : 'cf-sino-item'}
                      onClick={() => abrirAviso(aviso)}
                    >
                      <span>
                        <strong>{aviso.texto}</strong>
                        <small>
                          {horaDoAviso(aviso.quando)} · {aviso.extra}
                        </small>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  )
}

function IconeSino() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.2 9.2a5.8 5.8 0 0 1 11.6 0c0 6.2 2.4 6.6 2.4 8.2H3.8c0-1.6 2.4-2 2.4-8.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 20.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
