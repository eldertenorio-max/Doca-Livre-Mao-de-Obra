import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { enviarCodigoEmail } from './enviarCodigoEmail.mjs'

const root = resolve(process.cwd(), 'dist')
const port = Number(process.env.PORT || 4173)

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

function lerCorpo(req) {
  return new Promise((resolveBody, reject) => {
    const partes = []
    let tamanho = 0
    req.on('data', (parte) => {
      tamanho += parte.length
      if (tamanho > 8000) {
        reject(new Error('corpo grande'))
        req.destroy()
        return
      }
      partes.push(parte)
    })
    req.on('end', () => resolveBody(Buffer.concat(partes).toString('utf8')))
    req.on('error', reject)
  })
}

function arquivoPublico(pathname) {
  const limpo = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '')
  const arquivo = resolve(root, limpo)
  const base = root.endsWith(sep) ? root : root + sep
  if (arquivo !== root && !arquivo.startsWith(base)) return null
  try {
    if (statSync(arquivo).isFile()) return arquivo
  } catch {
    return null
  }
  return null
}

function enviarArquivo(req, res, arquivo) {
  const tipo = types[extname(arquivo)] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': tipo })
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  createReadStream(arquivo).pipe(res)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://local')
  if (url.pathname === '/api/portal/enviar-codigo' && req.method === 'POST') {
    try {
      const bruto = await lerCorpo(req)
      const data = JSON.parse(bruto || '{}')
      const result = await enviarCodigoEmail({
        email: data.email,
        codigo: data.codigo,
        finalidade: data.finalidade,
      })
      res.writeHead(result.status || (result.ok ? 200 : 503), {
        'Content-Type': 'application/json; charset=utf-8',
      })
      res.end(JSON.stringify(result.ok ? { ok: true } : { ok: false, erro: result.erro }))
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, erro: 'Não foi possível enviar o e-mail.' }))
    }
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    res.end()
    return
  }

  const arquivo = arquivoPublico(url.pathname) || join(root, 'index.html')
  enviarArquivo(req, res, arquivo)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Mão de Obra em http://0.0.0.0:${port}`)
})
