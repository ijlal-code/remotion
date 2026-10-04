// Dipakai HANYA jika kamu deploy sebagai Cloudflare Workers (bukan Pages).
import { handleGenerate, type ServerEnv } from '../server/handler'

interface Env extends ServerEnv {
  ASSETS: { fetch: (req: Request) => Promise<Response> }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/generate') return handleGenerate(request, env)
    return env.ASSETS.fetch(request)
  },
}
