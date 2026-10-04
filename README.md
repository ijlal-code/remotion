# AI Video Remotion

Tulis **satu paragraf ide** → AI membuat naskah → Remotion menganimasikan video
**30–60 detik** lengkap dengan **musik latar & efek suara** → **Download MP4**.

- API key bisa diisi langsung di web (tombol **🔑 API Key**) untuk AI mana pun:
  NaraRouter, OpenAI, Gemini, OpenRouter, Groq, DeepSeek, Anthropic, atau provider
  OpenAI-compatible lainnya.
- Video & audio dirender di browser (`@remotion/web-renderer`), tanpa server render.

## Struktur
```
functions/api/generate.ts   -> API untuk Cloudflare PAGES
worker/index.ts             -> API untuk Cloudflare WORKERS
wrangler.jsonc              -> config Workers (dilewati otomatis oleh Pages)
server/handler.ts           -> logika API (dipakai Pages, Workers, & npm run dev)
src/lib/ai.ts               -> preset provider, prompt, parsing naskah
src/lib/music.ts            -> generator musik + efek whoosh (WAV)
src/remotion/VideoComposition.tsx -> animasi + audio Remotion
src/App.tsx                 -> UI
```

## Jalankan lokal
```
npm install
npm run dev
```
Buka http://localhost:5173 → klik **🔑 API Key** → isi key → tulis ide → **Buat Video**.

## Deploy — pilih SALAH SATU

### A. Cloudflare Pages
Workers & Pages → Create → tab **Pages** → Connect to Git → pilih repo.
- Build command: `npm run build`
- Build output directory: `dist`

### B. Cloudflare Workers (jika Cloudflare mengarahkanmu ke Workers)
Workers & Pages → Create → **Import a repository**.
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

### Opsional: key cadangan server
Settings → Variables and Secrets → `NARA_API_KEY` (Secret), `NARA_MODEL`.
Dipakai jika pengunjung tidak mengisi API key sendiri.

## Troubleshooting
- **"Server /api/generate tidak aktif"** → folder `functions/` (Pages) atau
  `worker/` + `wrangler.jsonc` (Workers) tidak ikut ter-push / salah tipe deploy.
- **AI provider error 401** → API key salah / habis.
- **Render MP4 gagal** → pakai Chrome/Edge terbaru, jangan pindah tab saat render.
- Semua paket `remotion` & `@remotion/*` harus versi sama persis (4.0.532).
