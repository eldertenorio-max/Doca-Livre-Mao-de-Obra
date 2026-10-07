import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { numero, pesoDe } from './montarArvore'
import type { LigacaoGrafo, PastaGrafo, Peso } from './tipos'

const COR_PESO: Record<Peso, number> = { leve: 0x34d399, medio: 0xfbbf24, pesado: 0xfb7185 }
const COR_LINHA = 0x64748b
const COR_SAI = 0x38bdf8
const COR_ENTRA = 0x34d399
const ESPACO_X = 7.5
const ESPACO_Z = 4.6
const LARGURA = 3.2
const PROFUNDIDADE = 2.4
const TOKENS_POR_UNIDADE = 4500
const ANDAR_MINIMO = 0.14
const VAO = 0.05

type Predio = {
  materiais: THREE.MeshStandardMaterial[]
  contornos: THREE.LineBasicMaterial[]
  rotulo: HTMLDivElement
  centro: THREE.Vector3
}
type Linha = {
  de: string
  para: string
  materiais: THREE.MeshBasicMaterial[]
  curva: THREE.QuadraticBezierCurve3
  bolinhas: THREE.Mesh[]
  materialBolinha: THREE.MeshBasicMaterial
}
type Acoes = { girar: (ligado: boolean) => void; deCima: () => void; inicial: () => void; focar: (id: string | null) => void }

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
  const dicaRef = useRef<HTMLDivElement>(null)
  const prediosRef = useRef(new Map<string, Predio>())
  const linhasRef = useRef<Linha[]>([])
  const acoesRef = useRef<Acoes | null>(null)
  const selecionarRef = useRef(onSelecionar)
  const [girando, setGirando] = useState(true)

  useEffect(() => {
    selecionarRef.current = onSelecionar
  }, [onSelecionar])

  useEffect(() => {
    const palco = palcoRef.current
    const dica = dicaRef.current
    if (!palco || !dica) return
    const predios = prediosRef.current
    predios.clear()
    linhasRef.current = []

    const cena = new THREE.Scene()
    cena.background = new THREE.Color(0x020617)
    cena.fog = new THREE.Fog(0x020617, 70, 160)

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500)
    const render = new THREE.WebGLRenderer({ antialias: true })
    render.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    palco.appendChild(render.domElement)

    const rotulos = new CSS2DRenderer()
    rotulos.domElement.className = 'mt3d-rotulos'
    palco.appendChild(rotulos.domElement)

    cena.add(new THREE.HemisphereLight(0xcbd5e1, 0x020617, 0.7))
    const sol = new THREE.DirectionalLight(0xffffff, 1.2)
    sol.position.set(25, 45, 30)
    cena.add(sol)

    const colunas = new Map<number, PastaGrafo[]>()
    for (const p of pastas) colunas.set(p.coluna, [...(colunas.get(p.coluna) ?? []), p])
    const totalColunas = Math.max(...pastas.map((p) => p.coluna)) + 1
    const maiorColuna = Math.max(...[...colunas.values()].map((l) => l.length))
    const tamanhoChao = Math.max(totalColunas * ESPACO_X, maiorColuna * ESPACO_Z) + 14

    const chao = new THREE.Mesh(
      new THREE.PlaneGeometry(tamanhoChao, tamanhoChao),
      new THREE.MeshStandardMaterial({ color: 0x050b1c, roughness: 1 }),
    )
    chao.rotation.x = -Math.PI / 2
    chao.position.y = -0.01
    cena.add(chao)
    cena.add(new THREE.GridHelper(tamanhoChao, Math.round(tamanhoChao / 2), 0x1e293b, 0x0b1224))

    const clicaveis: THREE.Mesh[] = []
    const topo = new Map<string, THREE.Vector3>()

    for (const [coluna, lista] of colunas) {
      lista.forEach((p, linha) => {
        const x = (coluna - (totalColunas - 1) / 2) * ESPACO_X
        const z = (linha - (lista.length - 1) / 2) * ESPACO_Z
        const materiais: THREE.MeshStandardMaterial[] = []
        const contornos: THREE.LineBasicMaterial[] = []
        let y = 0

        const base = new THREE.Mesh(
          new THREE.BoxGeometry(LARGURA + 0.5, 0.08, PROFUNDIDADE + 0.5),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }),
        )
        base.position.set(x, 0.04, z)
        cena.add(base)
        y = 0.08

        for (const arquivo of p.arquivos) {
          const altura = Math.max(ANDAR_MINIMO, arquivo.tokens / TOKENS_POR_UNIDADE)
          const material = new THREE.MeshStandardMaterial({
            color: COR_PESO[pesoDe(arquivo.tokens)],
            roughness: 0.5,
            metalness: 0.1,
            transparent: true,
          })
          const geometria = new THREE.BoxGeometry(LARGURA, altura, PROFUNDIDADE)
          const andar = new THREE.Mesh(geometria, material)
          andar.position.set(x, y + altura / 2, z)
          andar.userData = { pasta: p.id, arquivo: arquivo.caminho, tokens: arquivo.tokens }
          cena.add(andar)
          clicaveis.push(andar)

          const contorno = new THREE.LineBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.6 })
          const borda = new THREE.LineSegments(new THREE.EdgesGeometry(geometria), contorno)
          borda.position.copy(andar.position)
          cena.add(borda)

          materiais.push(material)
          contornos.push(contorno)
          y += altura + VAO
        }

        const div = document.createElement('div')
        div.className = 'mt3d-rotulo'
        const nome = document.createElement('b')
        nome.textContent = p.id
        const info = document.createElement('small')
        info.textContent = `${p.arquivos.length} arq · ${numero(p.tokens)} por leitura`
        div.append(nome, info)
        const rotulo = new CSS2DObject(div)
        rotulo.position.set(x, y + 0.8, z)
        cena.add(rotulo)

        topo.set(p.id, new THREE.Vector3(x, y, z))
        predios.set(p.id, { materiais, contornos, rotulo: div, centro: new THREE.Vector3(x, y / 2, z) })
      })
    }

    const geometriaBolinha = new THREE.SphereGeometry(0.13, 10, 10)
    for (const l of ligacoes) {
      const a = topo.get(l.de)
      const b = topo.get(l.para)
      if (!a || !b) continue
      const inicio = a.clone()
      const fim = b.clone().add(new THREE.Vector3(0, 0.35, 0))
      const meio = inicio.clone().add(fim).multiplyScalar(0.5)
      meio.y = Math.max(a.y, b.y) + 1.8 + inicio.distanceTo(fim) * 0.22
      const curva = new THREE.QuadraticBezierCurve3(inicio, meio, fim)
      const raio = 0.045 + 0.03 * Math.log2(l.quantidade + 1)

      const materialTubo = new THREE.MeshBasicMaterial({ color: COR_LINHA, transparent: true, opacity: 0.55 })
      cena.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 48, raio, 6, false), materialTubo))

      const materialSeta = new THREE.MeshBasicMaterial({ color: COR_LINHA, transparent: true, opacity: 0.85 })
      const seta = new THREE.Mesh(new THREE.ConeGeometry(raio * 3.2, 0.7, 10), materialSeta)
      seta.position.copy(fim)
      seta.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curva.getTangent(1).normalize())
      cena.add(seta)

      const materialBolinha = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.7 })
      const bolinhas = Array.from({ length: Math.min(4, 1 + Math.ceil(Math.log2(l.quantidade + 1))) }, () => {
        const bolinha = new THREE.Mesh(geometriaBolinha, materialBolinha)
        cena.add(bolinha)
        return bolinha
      })

      linhasRef.current.push({ de: l.de, para: l.para, materiais: [materialTubo, materialSeta], curva, bolinhas, materialBolinha })
    }

    const posicaoInicial = new THREE.Vector3(0, tamanhoChao * 0.5, tamanhoChao * 0.72)
    camera.position.copy(posicaoInicial)
    const controles = new OrbitControls(camera, render.domElement)
    controles.enableDamping = true
    controles.autoRotate = true
    controles.autoRotateSpeed = 0.5
    controles.maxPolarAngle = Math.PI / 2.05
    controles.minDistance = 6
    controles.maxDistance = 170
    controles.addEventListener('start', () => {
      controles.autoRotate = false
      setGirando(false)
      voo = null
    })

    let voo: { alvo: THREE.Vector3; camera: THREE.Vector3 } | null = null
    function voarPara(alvo: THREE.Vector3, posicaoCamera: THREE.Vector3) {
      voo = { alvo, camera: posicaoCamera }
    }

    acoesRef.current = {
      girar(ligado) {
        controles.autoRotate = ligado
      },
      deCima() {
        voarPara(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.01, tamanhoChao * 1.05, 0.01))
      },
      inicial() {
        voarPara(new THREE.Vector3(0, 0, 0), posicaoInicial.clone())
      },
      focar(id) {
        const predio = id ? predios.get(id) : null
        if (!predio) return
        const deslocamento = camera.position.clone().sub(controles.target)
        const distancia = Math.min(deslocamento.length(), 26)
        voarPara(predio.centro.clone(), predio.centro.clone().add(deslocamento.setLength(distancia)))
      },
    }

    const raio = new THREE.Raycaster()
    const ponteiro = new THREE.Vector2()
    let inicioToque = { x: 0, y: 0 }
    let andarSobMouse: THREE.Mesh | null = null

    function alvoNoPonto(clientX: number, clientY: number) {
      const caixa = render.domElement.getBoundingClientRect()
      ponteiro.set(((clientX - caixa.left) / caixa.width) * 2 - 1, -((clientY - caixa.top) / caixa.height) * 2 + 1)
      raio.setFromCamera(ponteiro, camera)
      return (raio.intersectObjects(clicaveis)[0]?.object as THREE.Mesh | undefined) ?? null
    }
    function aoDescer(e: PointerEvent) {
      inicioToque = { x: e.clientX, y: e.clientY }
    }
    function aoSubir(e: PointerEvent) {
      if (Math.hypot(e.clientX - inicioToque.x, e.clientY - inicioToque.y) > 5) return
      const alvo = alvoNoPonto(e.clientX, e.clientY)
      selecionarRef.current(alvo ? (alvo.userData.pasta as string) : null)
    }
    function aoMover(e: PointerEvent) {
      const alvo = e.buttons ? null : alvoNoPonto(e.clientX, e.clientY)
      if (andarSobMouse && andarSobMouse !== alvo) {
        ;(andarSobMouse.material as THREE.MeshStandardMaterial).emissive.setHex(andarSobMouse.userData.brilho ?? 0)
      }
      andarSobMouse = alvo
      if (!alvo) {
        dica!.hidden = true
        render.domElement.style.cursor = ''
        return
      }
      const material = alvo.material as THREE.MeshStandardMaterial
      alvo.userData.brilho = material.emissive.getHex()
      material.emissive.setHex(0x334155)
      render.domElement.style.cursor = 'pointer'
      const caixa = palco!.getBoundingClientRect()
      const caminho = alvo.userData.arquivo as string
      dica!.hidden = false
      dica!.style.left = `${e.clientX - caixa.left + 14}px`
      dica!.style.top = `${e.clientY - caixa.top + 14}px`
      dica!.replaceChildren()
      const nome = document.createElement('b')
      nome.textContent = caminho.slice(caminho.lastIndexOf('/') + 1)
      const pasta = document.createElement('small')
      pasta.textContent = alvo.userData.pasta as string
      const custo = document.createElement('span')
      custo.textContent = `${numero(alvo.userData.tokens as number)} tokens por leitura`
      dica!.append(nome, pasta, custo)
    }
    function aoSair() {
      dica!.hidden = true
    }
    render.domElement.addEventListener('pointerdown', aoDescer)
    render.domElement.addEventListener('pointerup', aoSubir)
    render.domElement.addEventListener('pointermove', aoMover)
    render.domElement.addEventListener('pointerleave', aoSair)

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

    const relogio = new THREE.Clock()
    let quadro = 0
    function animar() {
      quadro = requestAnimationFrame(animar)
      const t = relogio.getElapsedTime()
      if (voo) {
        controles.target.lerp(voo.alvo, 0.08)
        camera.position.lerp(voo.camera, 0.08)
        if (camera.position.distanceTo(voo.camera) < 0.05) voo = null
      }
      for (const linha of linhasRef.current) {
        linha.bolinhas.forEach((bolinha, i) => {
          if (!bolinha.visible) return
          bolinha.position.copy(linha.curva.getPoint((t * 0.25 + i / linha.bolinhas.length) % 1))
        })
      }
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
      render.domElement.removeEventListener('pointermove', aoMover)
      render.domElement.removeEventListener('pointerleave', aoSair)
      cena.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose()
          const material = obj.material as THREE.Material | THREE.Material[]
          if (Array.isArray(material)) material.forEach((m) => m.dispose())
          else material.dispose()
        }
      })
      render.dispose()
      acoesRef.current = null
      palco.querySelectorAll('canvas, .mt3d-rotulos').forEach((el) => el.remove())
    }
  }, [pastas, ligacoes])

  useEffect(() => {
    const ligadas = new Set<string>()
    for (const l of linhasRef.current) {
      if (l.de === selecionada) ligadas.add(l.para)
      if (l.para === selecionada) ligadas.add(l.de)
    }
    for (const [id, predio] of prediosRef.current) {
      const ativa = !selecionada || id === selecionada || ligadas.has(id)
      const escolhida = id === selecionada
      for (const m of predio.materiais) {
        m.opacity = ativa ? 1 : 0.12
        m.emissive.setHex(escolhida ? 0x4a3f00 : 0x000000)
      }
      for (const c of predio.contornos) {
        c.color.setHex(escolhida ? 0xf9db00 : 0x020617)
        c.opacity = ativa ? (escolhida ? 1 : 0.6) : 0.05
      }
      predio.rotulo.classList.toggle('mt3d-rotulo--apagado', !ativa)
      predio.rotulo.classList.toggle('mt3d-rotulo--on', escolhida)
    }
    for (const l of linhasRef.current) {
      const sai = selecionada === l.de
      const entra = selecionada === l.para
      const cor = sai ? COR_SAI : entra ? COR_ENTRA : COR_LINHA
      const ativa = !selecionada || sai || entra
      for (const m of l.materiais) {
        m.color.setHex(cor)
        m.opacity = !selecionada ? 0.55 : ativa ? 1 : 0.04
      }
      l.materialBolinha.color.setHex(selecionada && ativa ? cor : 0xe2e8f0)
      l.materialBolinha.opacity = selecionada ? 1 : 0.6
      l.bolinhas.forEach((b) => {
        b.visible = ativa
      })
    }
    acoesRef.current?.focar(selecionada)
  }, [selecionada, pastas, ligacoes])

  return (
    <div className="mt3d">
      <div ref={palcoRef} className="mt3d-palco" />
      <div ref={dicaRef} className="mt3d-dica-arquivo" hidden />
      <div className="mt3d-botoes">
        <button
          type="button"
          className={girando ? 'mt3d-botao--on' : ''}
          onClick={() => {
            const proximo = !girando
            setGirando(proximo)
            acoesRef.current?.girar(proximo)
          }}
        >
          {girando ? 'Parar giro' : 'Girar'}
        </button>
        <button type="button" onClick={() => acoesRef.current?.deCima()}>
          Vista de cima
        </button>
        <button
          type="button"
          onClick={() => {
            onSelecionar(null)
            acoesRef.current?.inicial()
          }}
        >
          Vista inicial
        </button>
      </div>
      <div className="mt3d-legenda">
        <span><i className="mt3d-cor mt3d-cor--leve" /> arquivo econômico</span>
        <span><i className="mt3d-cor mt3d-cor--medio" /> médio</span>
        <span><i className="mt3d-cor mt3d-cor--pesado" /> pesado</span>
        <span>cada andar = 1 arquivo · altura = custo por leitura</span>
      </div>
      <p className="mt3d-dica">Arraste para girar · roda do mouse para aproximar · botão direito para mover · clique num prédio</p>
    </div>
  )
}
