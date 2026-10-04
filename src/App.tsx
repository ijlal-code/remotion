import { Player } from '@remotion/player'
import { useEffect, useMemo, useRef, useState } from 'react'
import { generateScript, PRESETS, readJson, type ApiFormat, type VideoScript } from './lib/ai'
import { generateMusic } from './lib/music'
import { VideoComposition } from './remotion/VideoComposition'
import { FORMATS, FPS, getTimeline, type FormatKey, type VideoProps } from './types'
import './App.css'

interface Settings {
  preset: string
  format: ApiFormat
  baseUrl: string
  apiKey: string
  model: string
}

const STORAGE_KEY = 'ai-video-settings'

const loadSettings = (): Settings => {
  const p = PRESETS.nararouter
  const fallback: Settings = { preset: 'nararouter', format: p.format, baseUrl: p.baseUrl, apiKey: '', model: p.model }
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return fallback
  }
}

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'video'

function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [draft, setDraft] = useState<Settings>(settings)
  const [showSettings, setShowSettings] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(30)
  const [format, setFormat] = useState<FormatKey>('9:16')
  const [musicOn, setMusicOn] = useState(true)
  const [musicVolume, setMusicVolume] = useState(0.6)

  const [script, setScript] = useState<VideoScript | null>(null)
  const [videoDuration, setVideoDuration] = useState(30)
  const [musicSrc, setMusicSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [quality, setQuality] = useState<'1' | '0.5'>('1')
  const [rendering, setRendering] = useState(false)
  const [progress, setProgress] = useState(0)
  const [renderMsg, setRenderMsg] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const { width, height } = FORMATS[format]
  const totalFrames = Math.round(videoDuration * FPS)

  // bersihkan blob musik lama
  useEffect(() => () => void (musicSrc && URL.revokeObjectURL(musicSrc)), [musicSrc])

  const videoProps: VideoProps | null = useMemo(
    () =>
      script
        ? {
            title: script.title,
            scenes: script.scenes,
            themeColor: script.themeColor,
            musicSrc: musicOn ? musicSrc : null,
            musicVolume,
          }
        : null,
    [script, musicSrc, musicOn, musicVolume],
  )

  const saveSettings = () => {
    setSettings(draft)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    setShowSettings(false)
  }

  const choosePreset = (key: string) => {
    const p = PRESETS[key]
    setDraft((d) => ({ ...d, preset: key, format: p.format, baseUrl: p.baseUrl || d.baseUrl, model: p.model || d.model }))
  }

  /** 1) Coba lewat server (/api/generate). 2) Jika server tidak tersedia, panggil AI langsung dari browser. */
  const requestScript = async (): Promise<VideoScript> => {
    const provider = settings.apiKey
      ? { format: settings.format, baseUrl: settings.baseUrl, apiKey: settings.apiKey, model: settings.model }
      : undefined

    let serverError: string
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, duration, provider }),
      })
      const isJson = (res.headers.get('content-type') || '').includes('application/json')
      if (isJson) {
        const data = (await readJson(res, 'Server')) as VideoScript & { error?: string }
        if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
        return data
      }
      serverError = `Server /api/generate tidak aktif (HTTP ${res.status})`
    } catch (e) {
      if (e instanceof Error && !(e instanceof TypeError)) throw e
      serverError = 'Server /api/generate tidak bisa dihubungi'
    }

    // Cadangan: langsung dari browser (hanya untuk provider yang mengizinkan CORS)
    if (!settings.apiKey) {
      throw new Error(`${serverError}. Isi API key lewat tombol "API Key" atau periksa deploy Functions (lihat README).`)
    }
    try {
      return await generateScript(settings, prompt, duration)
    } catch (e) {
      if (e instanceof TypeError) {
        throw new Error(
          `${serverError}, dan provider ini menolak panggilan langsung dari browser (CORS). ` +
            'Pastikan folder functions/ ikut ter-deploy di Cloudflare (lihat README).',
          { cause: e },
        )
      }
      throw e
    }
  }

  const createVideo = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    setRenderMsg('')
    try {
      const s = await requestScript()
      const { sceneStartsSec } = getTimeline(duration, s.scenes.length)
      const wav = generateMusic(duration, s.mood, sceneStartsSec)
      setMusicSrc(URL.createObjectURL(wav))
      setVideoDuration(duration)
      setScript(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // Render MP4 (dengan audio) langsung di browser via @remotion/web-renderer
  const downloadMp4 = async () => {
    if (!videoProps) return
    setError('')
    setRenderMsg('')
    setProgress(0)
    setRendering(true)
    const controller = new AbortController()
    abortRef.current = controller
    const scale = Number(quality)
    const muted = !videoProps.musicSrc
    try {
      const { canRenderMediaOnWeb, renderMediaOnWeb } = await import('@remotion/web-renderer')
      const check = await canRenderMediaOnWeb({ width, height, scale, container: 'mp4', muted })
      if (!check.canRender) {
        throw new Error(
          'Browser ini tidak mendukung render MP4. Gunakan Chrome/Edge terbaru. ' +
            check.issues.map((i) => i.message).join(' | '),
        )
      }

      const start = performance.now()
      const result = await renderMediaOnWeb({
        composition: {
          id: 'ai-video',
          component: VideoComposition,
          durationInFrames: totalFrames,
          fps: FPS,
          width,
          height,
          defaultProps: videoProps,
        },
        inputProps: videoProps,
        container: 'mp4',
        muted,
        scale,
        videoBitrate: 'high',
        signal: controller.signal,
        onProgress: ({ progress: p }) => setProgress(p),
      })

      const blob = await result.getBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug(videoProps.title)}.mp4`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setRenderMsg(
        `✅ Selesai dalam ${((performance.now() - start) / 1000).toFixed(1)} detik • ${(blob.size / 1024 / 1024).toFixed(1)} MB`,
      )
    } catch (e) {
      if (controller.signal.aborted) setRenderMsg('Render dibatalkan')
      else setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRendering(false)
      abortRef.current = null
    }
  }

  const keyLabel = settings.apiKey
    ? `${PRESETS[settings.preset]?.label ?? 'Custom'} • ${settings.model}`
    : 'Belum diisi (pakai key server)'

  return (
    <div className="app">
      <header>
        <div>
          <h1>🎬 AI Video Remotion</h1>
          <p>Tulis satu paragraf ide → AI membuat video lengkap dengan musik → download MP4</p>
        </div>
        <button className="key-btn" onClick={() => { setDraft(settings); setShowSettings(true) }}>
          🔑 API Key
          <small>{keyLabel}</small>
        </button>
      </header>

      {showSettings && (
        <div className="modal" onClick={() => setShowSettings(false)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <h2>Pengaturan API AI</h2>
            <label>Provider</label>
            <select value={draft.preset} onChange={(e) => choosePreset(e.target.value)}>
              {Object.entries(PRESETS).map(([k, p]) => (
                <option key={k} value={k}>
                  {p.label}
                </option>
              ))}
            </select>

            <label>API Key</label>
            <div className="inline">
              <input
                type={showKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value.trim() })}
                placeholder="sk-..."
                autoComplete="off"
              />
              <button onClick={() => setShowKey((v) => !v)}>{showKey ? '🙈' : '👁'}</button>
            </div>

            <label>Base URL</label>
            <input
              value={draft.baseUrl}
              onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value.trim() })}
              placeholder="https://api.example.com/v1"
            />

            <label>Model</label>
            <input
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value.trim() })}
              placeholder="nama-model"
            />

            <label>Format API</label>
            <select value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value as ApiFormat })}>
              <option value="openai">OpenAI-compatible (/chat/completions)</option>
              <option value="anthropic">Anthropic (/messages)</option>
            </select>

            <p className="hint">
              API key hanya disimpan di browser kamu (localStorage) dan dikirim ke server web ini saat membuat video.
              Kosongkan untuk memakai key cadangan server (NARA_API_KEY).
            </p>
            <div className="row">
              <button onClick={() => setDraft({ ...draft, apiKey: '' })}>Hapus key</button>
              <button className="primary" onClick={saveSettings}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <main>
        <section className="panel">
          <label>Ide video (satu paragraf)</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Contoh: Video motivasi untuk mahasiswa tentang pentingnya konsisten belajar setiap hari, dengan contoh kebiasaan kecil yang berdampak besar."
            rows={6}
          />

          <label>
            Durasi video: <b>{duration} detik</b>
          </label>
          <input
            type="range"
            min={30}
            max={60}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />

          <label>Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value as FormatKey)} disabled={rendering}>
            {Object.entries(FORMATS).map(([k, f]) => (
              <option key={k} value={k}>
                {f.label}
              </option>
            ))}
          </select>

          <label className="check">
            <input type="checkbox" checked={musicOn} onChange={(e) => setMusicOn(e.target.checked)} />
            Musik latar &amp; efek suara
          </label>
          {musicOn && (
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={musicVolume}
              onChange={(e) => setMusicVolume(Number(e.target.value))}
              title="Volume musik"
            />
          )}

          <button className="primary" onClick={createVideo} disabled={loading || rendering || !prompt.trim()}>
            {loading ? '⏳ AI sedang membuat video…' : '🎬 Buat Video'}
          </button>
          {error && <div className="error">{error}</div>}

          {script && (
            <>
              <hr />
              <label>Download</label>
              <div className="row">
                <select value={quality} onChange={(e) => setQuality(e.target.value as '1' | '0.5')} disabled={rendering}>
                  <option value="1">
                    Full ({width}×{height})
                  </option>
                  <option value="0.5">
                    Cepat ({width / 2}×{height / 2})
                  </option>
                </select>
                {rendering ? (
                  <button onClick={() => abortRef.current?.abort()}>✕ Batalkan</button>
                ) : (
                  <button className="success" onClick={downloadMp4} disabled={loading}>
                    ⬇ Download MP4
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
            </>
          )}
        </section>

        <section className="preview">
          {videoProps ? (
            <>
              <Player
                key={`${format}-${totalFrames}`}
                component={VideoComposition}
                inputProps={videoProps}
                durationInFrames={totalFrames}
                fps={FPS}
                compositionWidth={width}
                compositionHeight={height}
                controls
                style={{
                  width: '100%',
                  maxHeight: '78vh',
                  aspectRatio: `${width} / ${height}`,
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              />
              <small>
                {script?.title} • {width}×{height} • {videoDuration} detik • musik: {script?.mood}
              </small>
            </>
          ) : (
            <div className="empty" style={{ aspectRatio: `${width} / ${height}` }}>
              <span>🎞️</span>
              <p>Preview video akan muncul di sini</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
