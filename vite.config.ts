import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

function apiDevMiddleware(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const rawUrl = req.url || '/'
        if (!rawUrl.startsWith('/api/') && rawUrl !== '/api') {
          return next()
        }

        try {
          const parsedUrl = new URL(rawUrl, `http://${req.headers.host || 'localhost'}`)
          const pathname = parsedUrl.pathname
          const query: Record<string, string> = {}
          parsedUrl.searchParams.forEach((val, key) => {
            query[key] = val
          })

          const vercelRes = {
            status(code: number) {
              res.statusCode = code
              return vercelRes
            },
            json(data: unknown) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data))
              return vercelRes
            },
            setHeader(name: string, value: string) {
              res.setHeader(name, value)
              return vercelRes
            },
          }

          if (pathname === '/api/judgments') {
            const mod = await server.ssrLoadModule('/api/judgments.ts')
            await mod.default({ method: req.method, query, body: undefined }, vercelRes)
            return
          }

          if (pathname === '/api/topics') {
            const mod = await server.ssrLoadModule('/api/topics.ts')
            await mod.default({ method: req.method, query, body: undefined }, vercelRes)
            return
          }

          const analysisMatch = pathname.match(/^\/api\/judgments\/([^/]+)\/analysis$/)
          if (analysisMatch) {
            query.id = decodeURIComponent(analysisMatch[1])
            const mod = await server.ssrLoadModule('/api/judgments/[id]/analysis.ts')
            await mod.default({ method: req.method, query, body: undefined }, vercelRes)
            return
          }

          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'not_found' }))
        } catch (err) {
          console.error('API middleware error:', err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'internal_server_error' }))
          }
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [react(), apiDevMiddleware()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
    },
  }
})
