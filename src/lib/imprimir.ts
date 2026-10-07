export function imprimirHtml(html: string, titulo = 'Documento para impressão') {
  const quadro = document.createElement('iframe')
  quadro.setAttribute('title', titulo)
  quadro.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0'
  document.body.appendChild(quadro)
  const janela = quadro.contentWindow
  const doc = janela?.document
  if (!janela || !doc) {
    quadro.remove()
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  const retirar = () => quadro.remove()
  janela.addEventListener('afterprint', retirar)
  window.setTimeout(() => {
    janela.focus()
    janela.print()
  }, 300)
}

export function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
