import type { Mood, Scene } from './lib/ai'

export type { Mood, Scene }

export interface VideoProps extends Record<string, unknown> {
  title: string
  scenes: Scene[]
  themeColor: string
  musicSrc: string | null
  musicVolume: number
}

export const FPS = 30
export const INTRO_FRAMES = 75 // 2,5 detik judul
export const OUTRO_FRAMES = 60 // 2 detik penutup

/** Hitung panjang tiap scene agar total sesuai durasi yang dipilih. */
export const getTimeline = (durationSec: number, sceneCount: number) => {
  const total = Math.round(durationSec * FPS)
  const n = Math.max(1, sceneCount)
  const sceneFrames = Math.floor((total - INTRO_FRAMES - OUTRO_FRAMES) / n)
  const sceneStartsSec = Array.from({ length: n }, (_, i) => (INTRO_FRAMES + i * sceneFrames) / FPS)
  return { total, sceneFrames, sceneStartsSec }
}

export const FORMATS = {
  '9:16': { width: 1080, height: 1920, label: 'Portrait 9:16 (Reels/TikTok)' },
  '16:9': { width: 1920, height: 1080, label: 'Landscape 16:9 (YouTube)' },
  '1:1': { width: 1080, height: 1080, label: 'Square 1:1 (Feed)' },
} as const

export type FormatKey = keyof typeof FORMATS
