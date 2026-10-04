# AI Video Remotion (Cloudflare Pages + NaraRouter)

Web app React + Vite + Remotion Player. Naskah video dibuat AI via NaraRouter
(`https://router.bynara.id/v1`, OpenAI-compatible). API key disimpan aman di
Cloudflare Pages Functions (`/functions/api`), tidak pernah terlihat di browser.

## Struktur
```
functions/api/generate.ts   -> POST /api/generate (panggil NaraRouter)
functions/api/models.ts     -> GET  /api/models   (daftar model sesuai plan)
src/App.tsx                 -> UI editor + Player
src/remotion/VideoComposition.tsx -> animasi Remotion
src/types.ts                -> tipe & durasi
```

## 1. Buat API key
Login ke https://router.bynara.id/keys -> buat key (awalan `sk-nry-`). Salin, hanya muncul sekali.

## 2. Push ke GitHub
Pakai `package-lock.json` yang baru (sudah sinkron dengan package.json), lalu:
```
npm install
git init && git add . && git commit -m "init"
git branch -M main
git remote add origin https://github.com/USERNAME/ai-video-remotion.git
git push -u origin main
```

## 3. Deploy di Cloudflare Pages
Workers & Pages -> Create -> Pages -> Connect to Git -> pilih repo.
- Framework preset: **Vite** (atau None)
- Build command: `npm run build`
- Build output directory: `dist`

Settings -> Variables and Secrets (Production & Preview):
- `NARA_API_KEY` = `sk-nry-...` (tipe **Secret**)
- `NARA_MODEL` = `deepseek-v4-flash` (opsional)
- `NODE_VERSION` = `22` (opsional, sudah ada `.node-version`)

Lalu **Retry deployment** agar variabel terbaca.

## Testing lokal (dengan API)
```
cp .dev.vars.example .dev.vars   # isi key
npm run build
npx wrangler pages dev dist
```
`npm run dev` saja hanya menjalankan UI (tombol Generate butuh Functions).

## Download MP4
Tombol **Download MP4** merender video langsung di browser pengunjung memakai
`@remotion/web-renderer` (WebCodecs), jadi tidak butuh server dan tetap jalan
di Cloudflare Pages.
- Gunakan Chrome / Edge versi terbaru.
- Jangan pindah tab selama render (bisa melambat).
- Pilih resolusi "Setengah" untuk render lebih cepat.
- Hanya CSS tertentu yang didukung (mis. `linear-gradient`, bukan `radial-gradient`).
  Lihat https://www.remotion.dev/docs/client-side-rendering/limitations
- Semua paket Remotion harus versi yang sama persis (4.0.532).
