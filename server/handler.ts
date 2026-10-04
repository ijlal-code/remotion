// Handler POST /api/generate — dipakai oleh Pages Functions, Workers, dan Vite dev server.
import { generateScript, PRESETS, type GenerateRequest, type ProviderConfig } from '../src/lib/ai.ts'

export interface ServerEnv {
  NARA_API_KEY?: string
  NARA_MODEL?: string
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

export async function handleGenerate(request: Request, env: ServerEnv): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Gunakan POST' }, 405)

  let body: GenerateRequest
  try {
    body = (await request.json()) as GenerateRequest
  } catch {
    return json({ error: 'Body request harus JSON' }, 400)
  }

  const prompt = String(body.prompt ?? '').trim().slice(0, 3000)
  const duration = Math.min(60, Math.max(30, Number(body.duration) || 30))
  if (!prompt) return json({ error: 'Prompt masih kosong' }, 400)

  const p = body.provider ?? {}
  const nara = PRESETS.nararouter
  // Jika user tidak mengisi API key, pakai key cadangan dari server (env NARA_API_KEY)
  const provider: ProviderConfig = p.apiKey
    ? {
        format: p.format === 'anthropic' ? 'anthropic' : 'openai',
        baseUrl: String(p.baseUrl || nara.baseUrl),
        apiKey: String(p.apiKey),
        model: String(p.model || nara.model),
      }
    : {
        format: 'openai',
        baseUrl: nara.baseUrl,
        apiKey: env.NARA_API_KEY ?? '',
        model: env.NARA_MODEL || nara.model,
      }

  if (!provider.baseUrl.startsWith('https://')) return json({ error: 'Base URL harus https://' }, 400)

  try {
    const script = await generateScript(provider, prompt, duration)
    return json(script)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
}
