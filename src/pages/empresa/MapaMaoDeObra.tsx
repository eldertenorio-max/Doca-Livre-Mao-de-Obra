import { useEffect, useMemo, useRef, useState } from 'react'
import * as L from 'leaflet'
import { cargoLabel } from '../../data/categories'
import { abrirCurriculoPdf } from '../../lib/curriculoPdf'
import { useStore } from '../../lib/store'
import type { Disponibilidade, Empresa, Profissional } from '../../lib/types'
import 'leaflet/dist/leaflet.css'
import './mapa.css'

const TURNOS: { key: keyof Disponibilidade; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'amanha', label: 'Amanhã' },
  { key: 'estaSemana', label: 'Esta semana' },
  { key: 'finaisDeSemana', label: 'Finais de semana' },
  { key: 'noturno', label: 'Noturno' },
  { key: 'viagens', label: 'Viagens' },
  { key: 'temporario', label: 'Temporário' },
  { key: 'efetivo', label: 'Efetivo' },
  { key: 'freelancer', label: 'Freelancer' },
]

export function MapaMaoDeObra({ empresa }: { empresa: Empresa }) {
  const { state } = useStore()
  const telaRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<L.Map | null>(null)
  const marcasRef = useRef(new Map<string, L.Marker>())
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)

  const pessoas = useMemo(() => {
    const bloqueados = new Set(empresa.bloqueados)
    return state.profissionais
      .filter((pessoa) => pessoa.status === 'aprovado' && !bloqueados.has(pessoa.id) && coordenadaOk(pessoa))
      .slice()
      .sort((a, b) => distanciaKm(empresa.endereco, a.endereco) - distanciaKm(empresa.endereco, b.endereco))
  }, [empresa.bloqueados, empresa.endereco, state.profissionais])

  const selecionado = pessoas.find((pessoa) => pessoa.id === selecionadoId) ?? null

  useEffect(() => {
    const el = telaRef.current
    if (!el || mapaRef.current) return
    const mapa = L.map(el, { zoomControl: true, scrollWheelZoom: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa)
    mapaRef.current = mapa
    const ajustar = () => mapa.invalidateSize()
    const quadro = window.requestAnimationFrame(ajustar)
    const depois = window.setTimeout(ajustar, 250)
    return () => {
      window.cancelAnimationFrame(quadro)
      window.clearTimeout(depois)
      mapa.remove()
      mapaRef.current = null
      marcasRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa) return
    marcasRef.current.forEach((marca) => marca.remove())
    marcasRef.current.clear()

    const limites = L.latLngBounds([])
    if (coordenadaEmpresa(empresa)) {
      const sede = L.marker([empresa.endereco.lat, empresa.endereco.lng], {
        icon: pinSede(),
        keyboard: false,
        zIndexOffset: -100,
      })
      sede.bindTooltip(empresa.nomeFantasia, { direction: 'top' })
      sede.addTo(mapa)
      marcasRef.current.set('sede', sede)
      limites.extend(sede.getLatLng())
    }

    for (const pessoa of pessoas) {
      const marca = L.marker([pessoa.endereco.lat, pessoa.endereco.lng], {
        icon: pinPessoa(pessoa.nome, false),
        title: pessoa.nome,
        keyboard: true,
      })
      marca.bindTooltip(pessoa.nome, { direction: 'top', offset: [0, -16] })
      marca.on('click', () => setSelecionadoId(pessoa.id))
      marca.addTo(mapa)
      marcasRef.current.set(pessoa.id, marca)
      limites.extend(marca.getLatLng())
    }

    if (limites.isValid()) mapa.fitBounds(limites.pad(0.28), { padding: [28, 28], maxZoom: 12 })
  }, [empresa, pessoas])

  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa) return
    for (const pessoa of pessoas) {
      const marca = marcasRef.current.get(pessoa.id)
      if (!marca) continue
      const ativo = pessoa.id === selecionadoId
      marca.setIcon(pinPessoa(pessoa.nome, ativo))
      marca.setZIndexOffset(ativo ? 800 : 0)
    }
    if (!selecionado) return
    const destino: L.LatLngExpression = [selecionado.endereco.lat, selecionado.endereco.lng]
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduzir) mapa.setView(destino, Math.max(mapa.getZoom(), 12))
    else mapa.flyTo(destino, Math.max(mapa.getZoom(), 12), { duration: 0.55 })
  }, [pessoas, selecionado, selecionadoId])

  return (
    <div className="mapa-page">
      <aside className="mapa-lado">
        <h1>Mapa Mão de Obra</h1>
        <p>
          {pessoas.length} {pessoas.length === 1 ? 'profissional aprovado' : 'profissionais aprovados'} no mapa.
        </p>
        {selecionado ? (
          <FichaPessoa
            pessoa={selecionado}
            distancia={distanciaKm(empresa.endereco, selecionado.endereco)}
            onFechar={() => setSelecionadoId(null)}
          />
        ) : (
          <ul className="mapa-lista">
            {pessoas.map((pessoa) => (
              <li key={pessoa.id}>
                <button type="button" onClick={() => setSelecionadoId(pessoa.id)}>
                  <strong>{pessoa.nome}</strong>
                  <span>
                    {pessoa.profissoes[0] ? cargoLabel(pessoa.profissoes[0]) : 'Trabalhador'} · {pessoa.endereco.cidade}/
                    {pessoa.endereco.estado}
                  </span>
                </button>
              </li>
            ))}
            {pessoas.length === 0 && <li className="mapa-vazio">Nenhum profissional com localização neste momento.</li>}
          </ul>
        )}
      </aside>
      <div className="mapa-canvas" ref={telaRef} />
    </div>
  )
}

function FichaPessoa({
  pessoa,
  distancia,
  onFechar,
}: {
  pessoa: Profissional
  distancia: number
  onFechar: () => void
}) {
  const turnos = TURNOS.filter((item) => pessoa.disponibilidade[item.key])
  return (
    <article className="mapa-ficha">
      <header>
        <span className="mapa-avatar" aria-hidden>
          {iniciaisDe(pessoa.nome)}
        </span>
        <div>
          <strong>{pessoa.nome}</strong>
          <small>
            {pessoa.endereco.cidade}, {pessoa.endereco.estado}
            {Number.isFinite(distancia) ? ` · ${formatarDistancia(distancia)}` : ''}
          </small>
        </div>
        <button type="button" className="mapa-fechar" onClick={onFechar} aria-label="Fechar ficha">
          ×
        </button>
      </header>
      <p className="mapa-nota">
        Avaliação {pessoa.avaliacaoMedia.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ·{' '}
        {pessoa.taxaComparecimento}% de comparecimento
      </p>
      {pessoa.profissoes.length > 0 && (
        <div className="mapa-chips">
          {pessoa.profissoes.map((id) => (
            <span key={id}>{cargoLabel(id)}</span>
          ))}
        </div>
      )}
      {pessoa.experiencia.length > 0 && (
        <ul className="mapa-exp">
          {pessoa.experiencia.map((item) => (
            <li key={`${item.empresa}-${item.inicio}`}>
              <strong>{item.cargo}</strong>
              <span>
                {item.empresa} · {periodo(item.inicio, item.fim)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {(pessoa.certificados.length > 0 || pessoa.cnhCategoria) && (
        <div className="mapa-chips">
          {pessoa.cnhCategoria && <span>CNH {pessoa.cnhCategoria}</span>}
          {pessoa.certificados.map((item) => (
            <span key={item.tipo}>{item.tipo}</span>
          ))}
        </div>
      )}
      {turnos.length > 0 && (
        <div className="mapa-chips mapa-chips--soft">
          {turnos.map((item) => (
            <span key={item.key}>{item.label}</span>
          ))}
        </div>
      )}
      <button type="button" className="cf-btn cf-btn--yellow" onClick={() => abrirCurriculoPdf(pessoa)}>
        Ver currículo
      </button>
    </article>
  )
}

function coordenadaOk(pessoa: Profissional) {
  return coordenadaEmpresa({ endereco: pessoa.endereco })
}

function coordenadaEmpresa(origem: { endereco: { lat: number; lng: number } }) {
  const { lat, lng } = origem.endereco
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
}

function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  if (!Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return Number.NaN
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const lat1 = a.lat * rad
  const lat2 = b.lat * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

function formatarDistancia(km: number) {
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m da empresa`
  return `${km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km da empresa`
}

function iniciaisDe(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] ?? '' : ''
  return `${primeira}${ultima}`.toUpperCase()
}

function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (char) => {
    if (char === '&') return '&amp;'
    if (char === '<') return '&lt;'
    if (char === '>') return '&gt;'
    if (char === '"') return '&quot;'
    return '&#39;'
  })
}

function pinPessoa(nome: string, ativo: boolean) {
  return L.divIcon({
    className: 'mapa-pin-wrap',
    html: `<div class="mapa-pin${ativo ? ' mapa-pin--on' : ''}"><span>${escapar(iniciaisDe(nome))}</span></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  })
}

function pinSede() {
  return L.divIcon({
    className: 'mapa-pin-wrap',
    html: '<div class="mapa-sede"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function mesAno(iso: string) {
  const [ano, mes] = iso.split('-')
  const nome = MESES[Number(mes) - 1]
  if (!ano || !nome) return iso
  return `${nome}/${ano}`
}

function periodo(inicio: string, fim: string) {
  return `${mesAno(inicio)} a ${fim ? mesAno(fim) : 'atual'}`
}
