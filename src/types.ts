export interface Scene {
  text: string
  emoji?: string
}

export interface VideoProps extends Record<string, unknown> {
  title: string
  scenes: Scene[]
  themeColor?: string
}

export const FPS = 30
export const INTRO_FRAMES = 60 // 2 detik judul
export const SCENE_FRAMES = 90 // 3 detik per scene
export const OUTRO_FRAMES = 45

export const getDuration = (scenes: Scene[]) =>
  INTRO_FRAMES + Math.max(scenes.length, 1) * SCENE_FRAMES + OUTRO_FRAMES

export const FORMATS = {
  '9:16': { width: 1080, height: 1920, label: 'Portrait 9:16 (Reels/TikTok)' },
  '16:9': { width: 1920, height: 1080, label: 'Landscape 16:9 (YouTube)' },
  '1:1': { width: 1080, height: 1080, label: 'Square 1:1 (Feed)' },
} as const

export type FormatKey = keyof typeof FORMATS
