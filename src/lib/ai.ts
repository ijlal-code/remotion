// Logika AI yang dipakai bersama oleh browser, Cloudflare Pages Functions, Workers, dan Vite dev server.

export type ApiFormat = 'openai' | 'anthropic'

export interface ProviderConfig {
  format: ApiFormat
  baseUrl: string
  apiKey: string
  model: string
}

export interface Scene {
  text: string
  emoji?: string
}

export type Mood = 'upbeat' | 'calm' | 'epic' | 'inspiring'

export interface VideoScript {
  title: string
  themeColor: string
  mood: Mood
  scenes: Scene[]
}

export interface GenerateRequest {
  prompt: string
  duration: number
  provider?: Partial<ProviderConfig>
}

export const MOODS: Mood[] = ['upbeat', 'calm', 'epic', 'inspiring']

export const PRESETS: Record<string, { label: string; format: ApiFormat; baseUrl: string; model: string }> = {
  nararouter: { label: 'NaraRouter', format: 'openai', baseUrl: 'https://router.bynara.id/v1', model: 'deepseek-v4-flash' },
  openai: { label: 'OpenAI', format: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  gemini: { label: 'Google Gemini', format: 'openai', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash' },
  openrouter: { label: 'OpenRouter', format: 'openai', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  groq: { label: 'Groq', format: 'openai', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  deepseek: { label: 'DeepSeek', format: 'openai', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  anthropic: { label: 'Anthropic (Claude)', format: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-3-5-haiku-latest' },
  custom: { label: 'Lainnya (OpenAI-compatible)', format: 'openai', baseUrl: '', model: '' },
}

export const sceneCountFor = (duration: number) => Math.max(5, Math.min(12, Math.round(duration / 5)))

const systemPrompt = (n: number) => `Kamu adalah sutradara dan penulis naskah video pendek.
Dari satu paragraf ide pengguna, buat naskah video. Balas HANYA JSON valid (tanpa markdown, tanpa penjelasan):
{
  "title": "judul singkat maks 6 kata",
  "themeColor": "#RRGGBB warna aksen yang cocok",
  "mood": "salah satu: upbeat | calm | epic | inspiring",
  "scenes": [ { "text": "kalimat narasi maks 14 kata", "emoji": "1 emoji relevan" } ]
}
Wajib tepat ${n} scene, alurnya runtut (pembuka, isi, penutup). Bahasa mengikuti bahasa pengguna.`

export function buildAiRequest(p: ProviderConfig, prompt: string, duration: number): { url: string; init: RequestInit } {
  const n = sceneCountFor(duration)
  const base = p.baseUrl.replace(/\/+$/, '')
  const user = `Ide video (durasi ${duration} detik):\n${prompt}`

  if (p.format === 'anthropic') {
    return {
      url: `${base}/messages`,
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': p.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: p.model,
          max_tokens: 2000,
          system: systemPrompt(n),
          messages: [{ role: 'user', content: user }],
        }),
      },
    }
  }

  const body: Record<string, unknown> = {
    model: p.model,
    messages: [
      { role: 'system', content: systemPrompt(n) },
      { role: 'user', content: user },
    ],
    temperature: 0.8,
  }
  if (base.includes('router.bynara.id')) body.reasoning_effort = 'none'

  return {
    url: `${base}/chat/completions`,
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${p.apiKey}` },
      body: JSON.stringify(body),
    },
  }
}

/** Baca response sebagai teks dulu agar tidak muncul "Unexpected end of JSON input". */
export async function readJson(res: Response, label: string): Promise<unknown> {
  const text = await res.text()
  if (!text.trim()) throw new Error(`${label}: response kosong (HTTP ${res.status})`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label}: response bukan JSON (HTTP ${res.status}): ${text.slice(0, 200)}`)
  }
}

function errorMessage(data: unknown): string {
  const d = data as { error?: { message?: string } | string; message?: string }
  if (typeof d?.error === 'string') return d.error
  return d?.error?.message || d?.message || JSON.stringify(data).slice(0, 300)
}

function extractText(data: unknown, format: ApiFormat): string {
  if (format === 'anthropic') {
    const d = data as { content?: { type: string; text?: string }[] }
    return (d.content ?? []).map((c) => c.text ?? '').join('')
  }
  const d = data as { choices?: { message?: { content?: string } }[] }
  return d.choices?.[0]?.message?.content ?? ''
}

export function parseScript(raw: string, duration: number): VideoScript {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json|```/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI tidak mengembalikan naskah JSON. Coba lagi atau ganti model.')
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<VideoScript>

  const n = sceneCountFor(duration)
  const scenes = (parsed.scenes ?? [])
    .filter((s) => s && s.text)
    .slice(0, n)
    .map((s) => ({ text: String(s.text).slice(0, 140), emoji: s.emoji ? String(s.emoji).slice(0, 8) : '' }))
  if (scenes.length === 0) throw new Error('Naskah dari AI kosong. Coba lagi.')

  return {
    title: String(parsed.title || 'Video AI').slice(0, 80),
    themeColor: /^#[0-9a-fA-F]{6}$/.test(parsed.themeColor ?? '') ? (parsed.themeColor as string) : '#3b82f6',
    mood: MOODS.includes(parsed.mood as Mood) ? (parsed.mood as Mood) : 'upbeat',
    scenes,
  }
}

/** Panggil AI langsung (dipakai di server, atau di browser sebagai cadangan). */
export async function generateScript(p: ProviderConfig, prompt: string, duration: number): Promise<VideoScript> {
  if (!p.apiKey) throw new Error('API key belum diisi. Klik tombol "API Key" di kanan atas.')
  if (!/^https?:\/\//.test(p.baseUrl)) throw new Error('Base URL tidak valid (harus diawali https://)')
  if (!p.model) throw new Error('Nama model belum diisi.')

  const { url, init } = buildAiRequest(p, prompt, duration)
  const res = await fetch(url, init)
  const data = await readJson(res, 'AI provider')
  if (!res.ok) throw new Error(`AI provider error ${res.status}: ${errorMessage(data)}`)
  return parseScript(extractText(data, p.format), duration)
}
