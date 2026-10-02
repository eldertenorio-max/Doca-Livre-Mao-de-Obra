import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function portalEmailDev(): Plugin {
  return {
    name: 'portal-email-dev',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== '/api/portal/enviar-codigo' || req.method !== 'POST') {
          next()
          return
        }
        const partes: Buffer[] = []
        req.on('data', (parte: Buffer) => partes.push(parte))
        req.on('end', () => {
          void (async () => {
            const { enviarCodigoEmail } = await import('./server/enviarCodigoEmail.mjs')
            let data: { email?: string; codigo?: string; finalidade?: string } = {}
            try {
              data = JSON.parse(Buffer.concat(partes).toString('utf8') || '{}') as typeof data
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: false, erro: 'Não foi possível enviar o e-mail.' }))
              return
            }
            const result = await enviarCodigoEmail({
              email: data.email,
              codigo: data.codigo,
              finalidade: data.finalidade,
              env,
            })
            res.statusCode = result.ok ? 200 : result.status
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(result.ok ? { ok: true } : { ok: false, erro: result.erro }))
          })()
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), portalEmailDev()],
  build: {
    // Evita um único JS grande (~560KB) que em alguns deploys do Render
    // sumiu do CDN (HTML 200 + assets/*.js 404).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) return 'react'
            if (id.includes('@supabase')) return 'supabase'
            return 'vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
})
