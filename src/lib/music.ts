// Generator musik latar + efek transisi (dibuat langsung di browser, tanpa file audio / hak cipta).
import type { Mood } from './ai'

const SR = 44100

interface MoodConfig {
  bpm: number
  chords: [number, 'maj' | 'min'][] // root midi
  kick: 'four' | 'half' | 'none'
  arp: 8 | 4
  pad: number
}

const MOOD_CONFIG: Record<Mood, MoodConfig> = {
  upbeat: { bpm: 118, chords: [[60, 'maj'], [67, 'maj'], [69, 'min'], [65, 'maj']], kick: 'four', arp: 8, pad: 0.06 },
  calm: { bpm: 76, chords: [[57, 'min'], [53, 'maj'], [60, 'maj'], [55, 'maj']], kick: 'none', arp: 4, pad: 0.09 },
  epic: { bpm: 96, chords: [[62, 'min'], [58, 'maj'], [65, 'maj'], [60, 'maj']], kick: 'half', arp: 8, pad: 0.1 },
  inspiring: { bpm: 108, chords: [[60, 'maj'], [57, 'min'], [65, 'maj'], [67, 'maj']], kick: 'four', arp: 8, pad: 0.08 },
}

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)
const tri = (ph: number) => 2 * Math.abs(2 * (ph - Math.floor(ph + 0.5))) - 1

function addTone(buf: Float32Array, start: number, dur: number, f: number, amp: number, attack: number, kind: 'sine' | 'tri' | 'warm') {
  const s0 = Math.floor(start * SR)
  const len = Math.floor(dur * SR)
  for (let i = 0; i < len && s0 + i < buf.length; i++) {
    const t = i / SR
    const env = Math.min(1, t / attack) * Math.exp((-3 * t) / dur)
    const ph = f * t
    let v: number
    if (kind === 'sine') v = Math.sin(2 * Math.PI * ph)
    else if (kind === 'tri') v = tri(ph)
    else v = Math.sin(2 * Math.PI * ph) * 0.7 + Math.sin(4 * Math.PI * ph) * 0.2 + Math.sin(2 * Math.PI * ph * 1.003) * 0.3
    buf[s0 + i] += v * env * amp
  }
}

function addKick(buf: Float32Array, start: number) {
  const s0 = Math.floor(start * SR)
  let ph = 0
  for (let i = 0; i < SR * 0.35 && s0 + i < buf.length; i++) {
    const t = i / SR
    ph += (45 + 90 * Math.exp(-t * 30)) / SR
    buf[s0 + i] += Math.sin(2 * Math.PI * ph) * Math.exp(-t * 9) * 0.55
  }
}

function addNoise(buf: Float32Array, start: number, dur: number, amp: number, mode: 'hat' | 'whoosh') {
  const s0 = Math.floor(start * SR)
  const len = Math.floor(dur * SR)
  let lp = 0
  let prev = 0
  for (let i = 0; i < len && s0 + i < buf.length; i++) {
    const t = i / SR
    const n = Math.random() * 2 - 1
    let v: number
    let env: number
    if (mode === 'hat') {
      v = n - prev // high-pass sederhana
      prev = n
      env = Math.exp(-t * 60)
    } else {
      const k = 0.02 + 0.25 * Math.sin((Math.PI * t) / dur) // sweep low-pass
      lp += (n - lp) * k
      v = lp
      env = Math.sin((Math.PI * t) / dur)
    }
    buf[s0 + i] += v * env * amp
  }
}

/** Buat musik WAV sesuai durasi. sceneStarts = detik mulai tiap scene (untuk efek whoosh). */
export function generateMusic(durationSec: number, mood: Mood, sceneStarts: number[]): Blob {
  const cfg = MOOD_CONFIG[mood] ?? MOOD_CONFIG.upbeat
  const total = Math.ceil(durationSec * SR)
  const buf = new Float32Array(total)
  const beat = 60 / cfg.bpm
  const bar = beat * 4
  const bars = Math.ceil(durationSec / bar)

  for (let b = 0; b < bars; b++) {
    const [root, q] = cfg.chords[b % cfg.chords.length]
    const notes = [root, root + (q === 'maj' ? 4 : 3), root + 7]
    const t0 = b * bar

    notes.forEach((n) => addTone(buf, t0, bar * 1.05, freq(n - 12), cfg.pad, 0.4, 'warm')) // pad
    for (let k = 0; k < 4; k++) addTone(buf, t0 + k * beat, beat * 0.95, freq(root - 24), 0.22, 0.01, 'sine') // bass

    const step = cfg.arp === 8 ? beat / 2 : beat
    const arpNotes = [...notes, notes[1] + 12]
    for (let k = 0; k < (cfg.arp === 8 ? 8 : 4); k++) {
      addTone(buf, t0 + k * step, step * 1.8, freq(arpNotes[k % arpNotes.length] + 12), 0.05, 0.005, 'tri')
    }

    for (let k = 0; k < 4; k++) {
      const t = t0 + k * beat
      if (cfg.kick === 'four' || (cfg.kick === 'half' && k % 2 === 0)) addKick(buf, t)
      if (cfg.kick !== 'none') addNoise(buf, t + beat / 2, 0.08, 0.06, 'hat')
    }
  }

  sceneStarts.forEach((s) => addNoise(buf, Math.max(0, s - 0.25), 0.6, 0.25, 'whoosh'))

  // fade in/out + normalisasi + soft clip
  let peak = 0
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(buf[i]))
  const gain = peak > 0 ? 0.85 / peak : 1
  const fadeIn = SR * 1
  const fadeOut = SR * 2.5
  for (let i = 0; i < total; i++) {
    let v = Math.tanh(buf[i] * gain * 1.1)
    if (i < fadeIn) v *= i / fadeIn
    if (i > total - fadeOut) v *= (total - i) / fadeOut
    buf[i] = v
  }

  return encodeWav(buf)
}

function encodeWav(samples: Float32Array): Blob {
  const out = new DataView(new ArrayBuffer(44 + samples.length * 2))
  const w = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF')
  out.setUint32(4, 36 + samples.length * 2, true)
  w(8, 'WAVE')
  w(12, 'fmt ')
  out.setUint32(16, 16, true)
  out.setUint16(20, 1, true) // PCM
  out.setUint16(22, 1, true) // mono
  out.setUint32(24, SR, true)
  out.setUint32(28, SR * 2, true)
  out.setUint16(32, 2, true)
  out.setUint16(34, 16, true)
  w(36, 'data')
  out.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true)
  return new Blob([out.buffer], { type: 'audio/wav' })
}
