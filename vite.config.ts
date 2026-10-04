import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { handleGenerate } from './server/handler.ts'

// Agar /api/generate juga jalan saat `npm run dev` (tanpa wrangler)
const devApi = (env: Record<string, string>): Plugin => ({
  name: 'dev-api',
  configureServer(server) {
    server.middlewares.use('/api/generate', (req, res) => {
      const chunks: Buffer[] = []
      req.on('data', (c: Buffer) => chunks.push(c))
      req.on('end', async () => {
        const request = new Request('http://localhost/api/generate', {
          method: req.method,
          headers: { 'content-type': 'application/json' },
          body: req.method === 'POST' ? Buffer.concat(chunks).toString() : undefined,
        })
        const response = await handleGenerate(request, env)
        res.statusCode = response.status
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.end(await response.text())
      })
    })
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), devApi(env)],
    build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
  }
})
