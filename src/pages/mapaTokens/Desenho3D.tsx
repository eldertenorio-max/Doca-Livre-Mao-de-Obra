import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { numero } from './montarArvore'
import type { LigacaoGrafo, PastaGrafo, Peso } from './tipos'

const COR_PESO: Record<Peso, number> = { leve: 0x34d399, medio: 0xfbbf24, pesado: 0xfb7185 }
const COR_LINHA = 0x64748b
const COR_SAI = 0x38bdf8
const COR_ENTRA = 0x34d399
const ESPACO_X = 7
const ESPACO_Z = 4.2
const LARGURA = 3.4
const PROFUNDIDADE = 2.4

type Caixa = { material: THREE.MeshStandardMaterial; contorno: THREE.LineBasicMaterial; rotulo: HTMLDivElement }
type Linha = { de: string; para: string; materiais: THREE.MeshBasicMaterial[] }

function alturaDe(tokens: number) {
  return 0.5 + Math.sqrt(tokens) / 22
}

export default function Desenho3D({
  pastas,
  ligacoes,
  selecionada,
  onSelecionar,
}: {
  pastas: PastaGrafo[]
  ligacoes: LigacaoGrafo[]
  selecionada: string | null
  onSelecionar: (id: string | null) => void
}) {
  const palcoRef = useRef<HTMLDivElement>(null)
  const caixasRef = useRef(new Map<string, Caixa>())
  const linhasRef = useRef<Linha[]>([])
  const selecionarRef = useRef(onSelecionar)
  selecionarRef.current = onSelecionar

  useEffect(() => {
    const palco = palcoRef.current
    if (!palco) return
    const caixas = caixasRef.current
    caixas.clear()
    linhasRef.current = []

    const cena = new THREE.Scene()
    cena.background = new THREE.Color(0x020617)
    cena.fog = new THREE.Fog(0x020617, 60, 140)

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500)
    const render = new THREE.WebGLRenderer({ antialias: true })
    render.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    palco.appendChild(render.domElement)

    const rotulos = new CSS2DRenderer()
    rotulos.domElement.className = 'mt3d-rotulos'
    palco.appendChild(rotulos.domElement)

    cena.add(new THREE.AmbientLight(0xffffff, 0.55))
    const sol = new THREE.DirectionalLight(0xffffff, 1.1)
    sol.position.set(20, 40, 25)
    cena.add(sol)

    const colunas = new Map<number, PastaGrafo[]>()
    for (const p of pastas) colunas.set(p.coluna, [...(colunas.get(p.coluna) ?? []), p])
    const totalColunas = Math.max(...pastas.map((p) => p.coluna)) + 1
    const posicao = new Map<string, { x: number; z: number; altura: number }>()
    for (const [coluna, lista] of colunas) {
      lista.forEach((p, linha) => {
        posicao.set(p.id, {
          x: (coluna - (totalColunas - 1) / 2) * ESPACO_X,
          z: (linha - (lista.length - 1) / 2) * ESPACO_Z,
          altura: alturaDe(p.tokens),
        })
      })
    }

    const tamanhoChao = Math.max(totalColunas * ESPACO_X, Math.max(...[...colunas.values()].map((l) => l.length)) * ESPACO_Z) + 12
    const grade = new THREE.GridHelper(tamanhoChao, Math.round(tamanhoChao / 2), 0x1e293b, 0x0f172a)
    cena.add(grade)

    const clicaveis: THREE.Mesh[] = []
    for (const p of pastas) {
      const pos = posicao.get(p.id)!
      const material = new THREE.MeshStandardMaterial({ color: COR_PESO[p.peso], roughness: 0.45, metalness: 0.1, transparent: true })
      const geometria = new THREE.BoxGeometry(LARGURA, pos.altura, PROFUNDIDADE)
      const bloco = new THREE.Mesh(geometria, material)
      bloco.position.set(pos.x, pos.altura / 2, pos.z)
      bloco.userData.id = p.id
      cena.add(bloco)
      clicaveis.push(bloco)

      const contorno = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
      const borda = new THREE.LineSegments(new THREE.EdgesGeometry(geometria), contorno)
      borda.position.copy(bloco.position)
      cena.add(borda)

      const div = document.createElement('div')
      div.className = 'mt3d-rotulo'
      div.innerHTML = `<b></b><small></small>`
      div.querySelector('b')!.textContent = p.id
      div.querySelector('small')!.textContent = `${p.arquivos.length} arq · ${numero(p.tokens)} tokens`
      const rotulo = new CSS2DObject(div)
      rotulo.position.set(pos.x, pos.altura + 0.9, pos.z)
      cena.add(rotulo)

      caixas.set(p.id, { material, contorno, rotulo: div })
    }

    for (const l of ligacoes) {
      const a = posicao.get(l.de)
      const b = posicao.get(l.para)
      if (!a || !b) continue
      const inicio = new THREE.Vector3(a.x, a.altura, a.z)
      const fim = new THREE.Vector3(b.x, b.altura + 0.35, b.z)
      const distancia = inicio.distanceTo(fim)
      const meio = inicio.clone().add(fim).multiplyScalar(0.5)
      meio.y = Math.max(a.altura, b.altura) + 1.5 + distancia * 0.22
      const curva = new THREE.QuadraticBezierCurve3(inicio, meio, fim)
      const raio = 0.05 + 0.03 * Math.log2(l.quantidade + 1)
      const materialTubo = new THREE.MeshBasicMaterial({ color: COR_LINHA, transparent: true, opacity: 0.65 })
      cena.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 40, raio, 6, false), materialTubo))

      const materialSeta = new THREE.MeshBasicMaterial({ color: COR_LINHA, transparent: true, opacity: 0.9 })
      const seta = new THREE.Mesh(new THREE.ConeGeometry(raio * 3.2, 0.7, 10), materialSeta)
      seta.position.copy(fim)
      seta.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curva.getTangent(1).normalize())
      cena.add(seta)

      linhasRef.current.push({ de: l.de, para: l.para, materiais: [materialTubo, materialSeta] })
    }

    camera.position.set(0, tamanhoChao * 0.55, tamanhoChao * 0.75)
    const controles = new OrbitControls(camera, render.domElement)
    controles.enableDamping = true
    controles.autoRotate = true
    controles.autoRotateSpeed = 0.6
    controles.maxPolarAngle = Math.PI / 2.05
    controles.minDistance = 8
    controles.maxDistance = 160
    controles.addEventListener('start', () => {
      controles.autoRotate = false
    })

    const raio = new THREE.Raycaster()
    const ponteiro = new THREE.Vector2()
    let inicioToque = { x: 0, y: 0 }
    function aoDescer(e: PointerEvent) {
      inicioToque = { x: e.clientX, y: e.clientY }
    }
    function aoSubir(e: PointerEvent) {
      if (Math.hypot(e.clientX - inicioToque.x, e.clientY - inicioToque.y) > 5) return
      const caixa = render.domElement.getBoundingClientRect()
      ponteiro.set(((e.clientX - caixa.left) / caixa.width) * 2 - 1, -((e.clientY - caixa.top) / caixa.height) * 2 + 1)
      raio.setFromCamera(ponteiro, camera)
      const alvo = raio.intersectObjects(clicaveis)[0]
      selecionarRef.current(alvo ? (alvo.object.userData.id as string) : null)
    }
    render.domElement.addEventListener('pointerdown', aoDescer)
    render.domElement.addEventListener('pointerup', aoSubir)

    function ajustar() {
      const largura = palco!.clientWidth
      const altura = palco!.clientHeight
      camera.aspect = largura / Math.max(1, altura)
      camera.updateProjectionMatrix()
      render.setSize(largura, altura)
      rotulos.setSize(largura, altura)
    }
    ajustar()
    const observador = new ResizeObserver(ajustar)
    observador.observe(palco)

    let quadro = 0
    function animar() {
      quadro = requestAnimationFrame(animar)
      controles.update()
      render.render(cena, camera)
      rotulos.render(cena, camera)
    }
    animar()

    return () => {
      cancelAnimationFrame(quadro)
      observador.disconnect()
      controles.dispose()
      render.domElement.removeEventListener('pointerdown', aoDescer)
      render.domElement.removeEventListener('pointerup', aoSubir)
      cena.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose()
          const material = obj.material as THREE.Material | THREE.Material[]
          if (Array.isArray(material)) material.forEach((m) => m.dispose())
          else material.dispose()
        }
      })
      render.dispose()
      palco.replaceChildren()
    }
  }, [pastas, ligacoes])

  useEffect(() => {
    const ligadas = new Set<string>()
    for (const l of linhasRef.current) {
      if (l.de === selecionada) ligadas.add(l.para)
      if (l.para === selecionada) ligadas.add(l.de)
    }
    for (const [id, caixa] of caixasRef.current) {
      const ativa = !selecionada || id === selecionada || ligadas.has(id)
      caixa.material.opacity = ativa ? 1 : 0.15
      caixa.material.emissive.setHex(id === selecionada ? 0x6b5b00 : 0x000000)
      caixa.contorno.color.setHex(id === selecionada ? 0xf9db00 : 0xffffff)
      caixa.contorno.opacity = ativa ? (id === selecionada ? 1 : 0.35) : 0.05
      caixa.rotulo.classList.toggle('mt3d-rotulo--apagado', !ativa)
      caixa.rotulo.classList.toggle('mt3d-rotulo--on', id === selecionada)
    }
    for (const l of linhasRef.current) {
      const sai = selecionada === l.de
      const entra = selecionada === l.para
      const cor = sai ? COR_SAI : entra ? COR_ENTRA : COR_LINHA
      const opacidade = !selecionada ? 0.65 : sai || entra ? 1 : 0.04
      for (const m of l.materiais) {
        m.color.setHex(cor)
        m.opacity = opacidade
      }
    }
  }, [selecionada, pastas, ligacoes])

  return (
    <div className="mt3d">
      <div ref={palcoRef} className="mt3d-palco" />
      <p className="mt3d-dica">Arraste para girar · roda do mouse para aproximar · botão direito para mover · clique num bloco</p>
    </div>
  )
}
