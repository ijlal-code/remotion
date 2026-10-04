import { Audio } from '@remotion/media'
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { INTRO_FRAMES, OUTRO_FRAMES, type Scene, type VideoProps } from '../types'

// Catatan: render MP4 di browser hanya mendukung CSS tertentu (linear-gradient, transform, opacity, border-radius, dll)

const useBase = () => {
  const { width, height } = useVideoConfig()
  return Math.min(width, height) / 1080
}

const Background: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const base = Math.min(width, height) / 1080
  const angle = interpolate(frame, [0, 1800], [135, 495])
  const orbs = [
    { x: 0.15, y: 0.2, r: 260, s: 0.011 },
    { x: 0.85, y: 0.35, r: 200, s: 0.009 },
    { x: 0.3, y: 0.8, r: 320, s: 0.007 },
    { x: 0.75, y: 0.85, r: 180, s: 0.013 },
  ]
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#020617',
        backgroundImage: `linear-gradient(${angle}deg, ${color}66 0%, #0f172a 50%, #020617 100%)`,
      }}
    >
      {orbs.map((o, i) => {
        const size = o.r * base
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: o.x * width - size / 2 + Math.sin(frame * o.s + i) * 60 * base,
              top: o.y * height - size / 2 + Math.cos(frame * o.s + i) * 60 * base,
              width: size,
              height: size,
              borderRadius: size,
              backgroundColor: color,
              opacity: 0.12,
            }}
          />
        )
      })}
    </AbsoluteFill>
  )
}

const Intro: React.FC<{ title: string; color: string }> = ({ title, color }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const base = useBase()
  const s = spring({ frame, fps, config: { damping: 12 } })
  const opacity = interpolate(frame, [INTRO_FRAMES - 15, INTRO_FRAMES], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity, padding: 80 * base }}>
      <div style={{ transform: `scale(${s})`, textAlign: 'center' }}>
        <div style={{ fontSize: 30 * base, letterSpacing: 6 * base, textTransform: 'uppercase', color, fontWeight: 800 }}>
          AI Generated Video
        </div>
        <h1 style={{ fontSize: 110 * base, margin: `${20 * base}px 0 0`, lineHeight: 1.05, fontWeight: 900 }}>
          {title}
        </h1>
      </div>
    </AbsoluteFill>
  )
}

const SceneView: React.FC<{ scene: Scene; index: number; total: number; color: string; length: number }> = ({
  scene,
  index,
  total,
  color,
  length,
}) => {
  const frame = useCurrentFrame()
  const { fps, height } = useVideoConfig()
  const base = useBase()
  const enter = spring({ frame, fps, config: { damping: 14 } })
  const exit = interpolate(frame, [length - 12, length], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const y = interpolate(enter, [0, 1], [80 * base, 0])
  const zoom = interpolate(frame, [0, length], [1, 1.06])
  const words = scene.text.split(' ')

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: exit, padding: 90 * base }}>
      <div style={{ transform: `scale(${zoom})`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {scene.emoji ? (
          <div
            style={{
              fontSize: 180 * base,
              transform: `scale(${enter}) rotate(${interpolate(enter, [0, 1], [-20, 0])}deg)`,
              marginBottom: 40 * base,
            }}
          >
            {scene.emoji}
          </div>
        ) : null}
        <div
          style={{
            transform: `translateY(${y}px)`,
            fontSize: 72 * base,
            fontWeight: 800,
            lineHeight: 1.2,
            textAlign: 'center',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: `${3 * base}px solid ${color}88`,
            borderRadius: 36 * base,
            padding: `${40 * base}px ${50 * base}px`,
          }}
        >
          {words.map((w, i) => {
            const o = interpolate(frame, [4 + i * 2, 10 + i * 2], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
            return (
              <span key={i} style={{ opacity: o }}>
                {w}{' '}
              </span>
            )
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', top: height - 140 * base, display: 'flex', gap: 14 * base }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: (i === index ? 60 : 18) * base,
              height: 18 * base,
              borderRadius: 9 * base,
              backgroundColor: i === index ? color : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  )
}

const Outro: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame()
  const base = useBase()
  const o = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.ease) })
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: o }}>
      <div style={{ fontSize: 64 * base, fontWeight: 900, color }}>Terima kasih! ✨</div>
    </AbsoluteFill>
  )
}

const ProgressBar: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame()
  const { durationInFrames, width } = useVideoConfig()
  const base = useBase()
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        height: 10 * base,
        width: (frame / durationInFrames) * width,
        backgroundColor: color,
      }}
    />
  )
}

export const VideoComposition: React.FC<VideoProps> = ({ title, scenes = [], themeColor, musicSrc, musicVolume }) => {
  const { durationInFrames } = useVideoConfig()
  const n = Math.max(1, scenes.length)
  const sceneFrames = Math.floor((durationInFrames - INTRO_FRAMES - OUTRO_FRAMES) / n)
  const outroStart = INTRO_FRAMES + scenes.length * sceneFrames

  return (
    <AbsoluteFill style={{ color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Background color={themeColor} />
      <Sequence durationInFrames={INTRO_FRAMES}>
        <Intro title={title} color={themeColor} />
      </Sequence>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={INTRO_FRAMES + i * sceneFrames} durationInFrames={sceneFrames}>
          <SceneView scene={scene} index={i} total={scenes.length} color={themeColor} length={sceneFrames} />
        </Sequence>
      ))}
      <Sequence from={outroStart} durationInFrames={Math.max(1, durationInFrames - outroStart)}>
        <Outro color={themeColor} />
      </Sequence>
      <ProgressBar color={themeColor} />
      {musicSrc ? <Audio src={musicSrc} volume={musicVolume} /> : null}
    </AbsoluteFill>
  )
}
