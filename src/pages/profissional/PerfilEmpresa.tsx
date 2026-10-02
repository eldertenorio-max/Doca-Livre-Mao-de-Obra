import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import * as L from 'leaflet'
import type { Empresa, Endereco } from '../../lib/types'
import 'leaflet/dist/leaflet.css'

const TIPOS: Record<string, string> = {
  transportadora: 'Transportadora',
  operador_logistico: 'Operador logístico',
  industria: 'Indústria',
  centro_distribuicao: 'Centro de distribuição',
  atacadista: 'Atacadista',
  varejo: 'Varejo',
  outro: 'Outro',
}

export function logoDaEmpresa(empresa: { id: string; logo?: string }) {
  if (empresa.logo) return empresa.logo
  if (empresa.id === 'emp_1') return '/empresas/log-express.svg'
  if (empresa.id === 'emp_2') return '/empresas/cd-cajamar.svg'
  return undefined
}

export function PerfilEmpresa({
  empresa,
  local,
  distanciaKm,
  distanciaTexto,
  onFechar,
}: {
  empresa: Empresa
  local: Endereco
  distanciaKm?: number
  distanciaTexto?: string
  onFechar: () => void
}) {
  const logo = logoDaEmpresa(empresa)
  const nota = empresa.avaliacaoMedia.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const temMapa = Number.isFinite(local.lat) && Number.isFinite(local.lng)

  useEffect(() => {
    function fechar(event: KeyboardEvent) {
      if (event.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', fechar)
    return () => document.removeEventListener('keydown', fechar)
  }, [onFechar])

  return createPortal(
    <div
      className="td-empresa-fundo"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onFechar()
      }}
    >
      <article className="td-empresa-folha" role="dialog" aria-modal="true" aria-label={`Perfil de ${empresa.nomeFantasia}`}>
        <header className="td-empresa-topo">
          <span className="td-empresa-logo">
            {logo ? <img src={logo} alt="" /> : iniciais(empresa.nomeFantasia)}
          </span>
          <div>
            <h2>{empresa.nomeFantasia}</h2>
            <p>{empresa.razaoSocial}</p>
          </div>
          <button type="button" className="td-empresa-fechar" onClick={onFechar} aria-label="Fechar perfil">
            ×
          </button>
        </header>
        <dl className="td-empresa-fatos">
          <div>
            <dt>Tipo</dt>
            <dd>{TIPOS[empresa.tipo] ?? empresa.tipo}</dd>
          </div>
          <div>
            <dt>Avaliação</dt>
            <dd>{nota}</dd>
          </div>
          <div>
            <dt>CNPJ</dt>
            <dd>{empresa.cnpj}</dd>
          </div>
          {(distanciaTexto || (distanciaKm != null && Number.isFinite(distanciaKm))) && (
            <div>
              <dt>Distância</dt>
              <dd>
                {distanciaTexto ??
                  `${distanciaKm!.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`}
                {distanciaTexto && <small>do seu aparelho</small>}
              </dd>
            </div>
          )}
        </dl>
        <section className="td-empresa-local">
          <h3>Local da vaga</h3>
          <p>
            {local.rua}, {local.numero}
          </p>
          <p>
            {local.cidade}/{local.estado}
            {local.cep ? ` · CEP ${local.cep}` : ''}
          </p>
          {temMapa ? <MapaLocal lat={local.lat} lng={local.lng} nome={empresa.nomeFantasia} /> : <p>Localização ainda sem coordenadas.</p>}
        </section>
      </article>
    </div>,
    document.body,
  )
}

function MapaLocal({ lat, lng, nome }: { lat: number; lng: number; nome: string }) {
  const tela = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = tela.current
    if (!el) return
    const mapa = L.map(el, { zoomControl: true }).setView([lat, lng], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapa)
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'td-empresa-pin',
        html: '<span></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    })
      .addTo(mapa)
      .bindTooltip(nome, { direction: 'top', offset: [0, -8] })
    const espera = window.setTimeout(() => mapa.invalidateSize(), 60)
    return () => {
      window.clearTimeout(espera)
      mapa.remove()
    }
  }, [lat, lng, nome])

  return <div className="td-empresa-mapa" ref={tela} />
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] ?? '' : ''
  return `${primeira}${ultima}`.toUpperCase()
}
