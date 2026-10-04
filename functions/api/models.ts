// Cloudflare Pages Function: GET /api/models
// Mengambil daftar model yang diizinkan oleh plan API key kamu.

interface Env {
  NARA_API_KEY: string
  NARA_BASE_URL?: string
}

export const onRequestGet = async ({ env }: { env: Env }) => {
  if (!env.NARA_API_KEY) {
    return Response.json({ error: 'NARA_API_KEY belum di-set' }, { status: 500 })
  }
  const baseUrl = env.NARA_BASE_URL || 'https://router.bynara.id/v1'
  const res = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${env.NARA_API_KEY}` },
  })
  if (!res.ok) {
    return Response.json({ error: `NaraRouter error ${res.status}` }, { status: 502 })
  }
  const data = (await res.json()) as { data?: { id: string }[] }
  const models = (data.data ?? []).map((m) => m.id)
  return Response.json({ models }, { headers: { 'cache-control': 'public, max-age=300' } })
}
