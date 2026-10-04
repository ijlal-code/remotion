// Cloudflare Pages Function: POST /api/generate
// API key NaraRouter disimpan aman di server (env NARA_API_KEY), tidak pernah ke browser.

interface Env {
  NARA_API_KEY: string
  NARA_MODEL?: string
  NARA_BASE_URL?: string
}

type Ctx = { request: Request; env: Env }

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

const SYSTEM_PROMPT = `Kamu adalah penulis naskah video pendek (short video).
Balas HANYA dengan JSON valid tanpa markdown, dengan format:
{
  "title": "judul singkat maks 6 kata",
  "themeColor": "#RRGGBB (warna aksen yang cocok dengan topik)",
  "scenes": [
    { "text": "kalimat pendek maks 14 kata", "emoji": "1 emoji relevan" }
  ]
}
Buat 4 sampai 8 scene. Bahasa mengikuti bahasa prompt pengguna.`

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI tidak mengembalikan JSON')
  return JSON.parse(cleaned.slice(start, end + 1))
}

export const onRequestPost = async ({ request, env }: Ctx) => {
  if (!env.NARA_API_KEY) {
    return json({ error: 'NARA_API_KEY belum di-set di Cloudflare Pages' }, 500)
  }

  let body: { prompt?: string; model?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Body harus JSON' }, 400)
  }

  const prompt = (body.prompt ?? '').toString().trim().slice(0, 2000)
  if (!prompt) return json({ error: 'Prompt kosong' }, 400)

  const baseUrl = env.NARA_BASE_URL || 'https://router.bynara.id/v1'
  const model = body.model || env.NARA_MODEL || 'deepseek-v4-flash'

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.NARA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      reasoning_effort: 'none',
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    return json({ error: `NaraRouter error ${res.status}`, detail: detail.slice(0, 500) }, 502)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content ?? ''

  try {
    const parsed = extractJson(content) as {
      title?: string
      themeColor?: string
      scenes?: { text?: string; emoji?: string }[]
    }
    const scenes = (parsed.scenes ?? [])
      .filter((s) => s && s.text)
      .slice(0, 10)
      .map((s) => ({ text: String(s.text), emoji: s.emoji ? String(s.emoji) : '' }))

    if (scenes.length === 0) throw new Error('Scene kosong')

    const color = /^#[0-9a-fA-F]{6}$/.test(parsed.themeColor ?? '') ? parsed.themeColor : '#3b82f6'
    return json({ title: parsed.title || 'Video AI', themeColor: color, scenes, model })
  } catch (e) {
    return json({ error: 'Gagal membaca hasil AI', detail: String(e), raw: content.slice(0, 500) }, 502)
  }
}
