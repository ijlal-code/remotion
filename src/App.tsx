import { Player } from '@remotion/player'
import { useEffect, useMemo, useRef, useState } from 'react'
import { VideoComposition } from './remotion/VideoComposition'
import { FORMATS, FPS, getDuration, type FormatKey, type VideoProps } from './types'
import './App.css'

const DEFAULT_VIDEO: VideoProps = {
  title: 'Video AI Pertamamu',
  themeColor: '#3b82f6',
  scenes: [
    { text: 'Tulis ide video di kolom prompt', emoji: '✍️' },
    { text: 'AI dari NaraRouter akan membuat naskahnya', emoji: '🤖' },
    { text: 'Remotion langsung menganimasikan hasilnya', emoji: '🎬' },
  ],
}

function App() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [format, setFormat] = useState<FormatKey>('9:16')
  const [video, setVideo] = useState<VideoProps>(DEFAULT_VIDEO)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quality, setQuality] = useState<'1' | '0.5'>('1')
  const [rendering, setRendering] = useState(false)
  const [progress, setProgress] = useState(0)
  const [renderMsg, setRenderMsg] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetch('/api/models')
      .then((r) => (r.ok ? r.json() : { models: [] }))
      .then((d: { models?: string[] }) => setModels(d.models ?? []))
      .catch(() => setModels([]))
  }, [])

  const { width, height } = FORMATS[format]
  const duration = useMemo(() => getDuration(video.scenes), [video.scenes])

  const generate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: model || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error + (data.detail ? `: ${data.detail}` : ''))
      setVideo({ title: data.title, themeColor: data.themeColor, scenes: data.scenes })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const updateScene = (i: number, text: string) =>
    setVideo((v) => ({ ...v, scenes: v.scenes.map((s, j) => (j === i ? { ...s, text } : s)) }))

  const removeScene = (i: number) =>
    setVideo((v) => ({ ...v, scenes: v.scenes.filter((_, j) => j !== i) }))

  const addScene = () =>
    setVideo((v) => ({ ...v, scenes: [...v.scenes, { text: 'Scene baru', emoji: '✨' }] }))

  const slug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'video'

  // Render MP4 langsung di browser pengguna (tanpa server) via @remotion/web-renderer
  const downloadMp4 = async () => {
    setError('')
    setRenderMsg('')
    setProgress(0)
    setRendering(true)
    const controller = new AbortController()
    abortRef.current = controller
    const scale = Number(quality)
    try {
      const { canRenderMediaOnWeb, renderMediaOnWeb } = await import('@remotion/web-renderer')

      const check = await canRenderMediaOnWeb({ width, height, scale, container: 'mp4', muted: true })
      if (!check.canRender) {
        throw new Error(
          'Browser ini tidak mendukung render MP4. Gunakan Chrome/Edge versi terbaru. ' +
            check.issues.map((i) => i.message).join(' | '),
        )
      }

      const start = performance.now()
      const result = await renderMediaOnWeb({
        composition: {
          id: 'ai-video',
          component: VideoComposition,
          durationInFrames: duration,
          fps: FPS,
          width,
          height,
          defaultProps: video,
        },
        inputProps: video,
        container: 'mp4',
        muted: true,
        scale,
        videoBitrate: 'high',
        signal: controller.signal,
        onProgress: ({ progress: p }) => setProgress(p),
      })

      const blob = await result.getBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug(video.title)}.mp4`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setRenderMsg(
        `Selesai dalam ${((performance.now() - start) / 1000).toFixed(1)} detik • ${(blob.size / 1024 / 1024).toFixed(1)} MB`,
      )
    } catch (e) {
      if (controller.signal.aborted) setRenderMsg('Render dibatalkan')
      else setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRendering(false)
      abortRef.current = null
    }
  }

  const cancelRender = () => abortRef.current?.abort()

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(video, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'video-props.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="app">
      <header>
        <h1>🎬 AI Video Remotion</h1>
        <p>Buat video pendek otomatis dengan AI (NaraRouter) + Remotion</p>
      </header>

      <main>
        <section className="panel">
          <label>Ide / prompt video</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Contoh: 5 tips produktif untuk mahasiswa"
            rows={4}
          />

          <div className="row">
            <div>
              <label>Model AI</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="">Default (server)</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value as FormatKey)}>
                {Object.entries(FORMATS).map(([k, f]) => (
                  <option key={k} value={k}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button className="primary" onClick={generate} disabled={loading || !prompt.trim()}>
            {loading ? 'Membuat naskah…' : '✨ Generate dengan AI'}
          </button>
          {error && <div className="error">{error}</div>}

          <hr />

          <label>Judul</label>
          <input value={video.title} onChange={(e) => setVideo((v) => ({ ...v, title: e.target.value }))} />

          <label>Warna tema</label>
          <input
            type="color"
            value={video.themeColor}
            onChange={(e) => setVideo((v) => ({ ...v, themeColor: e.target.value }))}
          />

          <label>Scene ({video.scenes.length})</label>
          {video.scenes.map((s, i) => (
            <div className="scene" key={i}>
              <span>{s.emoji}</span>
              <input value={s.text} onChange={(e) => updateScene(i, e.target.value)} />
              <button onClick={() => removeScene(i)} title="Hapus">
                ✕
              </button>
            </div>
          ))}
          <div className="row">
            <button onClick={addScene}>+ Tambah scene</button>
            <button onClick={downloadJson}>⬇ Download JSON</button>
          </div>

          <hr />

          <label>Export video</label>
          <div className="row">
            <select value={quality} onChange={(e) => setQuality(e.target.value as '1' | '0.5')} disabled={rendering}>
              <option value="1">
                Full ({width}×{height})
              </option>
              <option value="0.5">
                Setengah ({width / 2}×{height / 2}) – lebih cepat
              </option>
            </select>
            {rendering ? (
              <button onClick={cancelRender}>✕ Batalkan</button>
            ) : (
              <button className="success" onClick={downloadMp4} disabled={video.scenes.length === 0}>
                🎞 Download MP4
              </button>
            )}
          </div>
          {rendering && (
            <div className="progress">
              <div className="bar" style={{ width: `${Math.round(progress * 100)}%` }} />
              <span>Merender… {Math.round(progress * 100)}% (jangan pindah tab)</span>
            </div>
          )}
          {renderMsg && <div className="info">{renderMsg}</div>}
        </section>

        <section className="preview">
          <Player
            key={format}
            component={VideoComposition}
            inputProps={video}
            durationInFrames={duration}
            fps={FPS}
            compositionWidth={width}
            compositionHeight={height}
            controls
            loop
            autoPlay
            style={{
              width: '100%',
              maxHeight: '78vh',
              aspectRatio: `${width} / ${height}`,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          />
          <small>
            {width}×{height} • {(duration / FPS).toFixed(1)} detik
          </small>
        </section>
      </main>
    </div>
  )
}

export default App
