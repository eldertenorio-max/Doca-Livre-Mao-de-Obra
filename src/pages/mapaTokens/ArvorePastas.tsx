import { ItemArvore } from './ItemArvore'
import type { NoArvore } from './tipos'

export function ArvorePastas({
  raiz,
  selecionado,
  onSelecionar,
}: {
  raiz: NoArvore
  selecionado: string
  onSelecionar: (id: string) => void
}) {
  return (
    <aside className="mt-arvore">
      <div className="mt-arvore-topo">
        <span>Estrutura de arquivos</span>
        <small>tokens estimados</small>
      </div>
      <ul className="mt-raiz">
        {raiz.filhos.map((no) => (
          <ItemArvore key={no.id} no={no} selecionado={selecionado} onSelecionar={onSelecionar} />
        ))}
      </ul>
    </aside>
  )
}
