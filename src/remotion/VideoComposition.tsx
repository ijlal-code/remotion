import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import {
  INTRO_FRAMES,
  OUTRO_FRAMES,
  SCENE_FRAMES,
  type Scene,
  type VideoProps,
} from '../types'

// Catatan: render MP4 di browser hanya mendukung linear-gradient (bukan radial-gradient)
const Background: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame()
  const angle = interpolate(frame, [0, 900], [135, 495])
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#020617',
        backgroundImage: `linear-gradient(${angle}deg, ${color}66 0%, #0f172a 50%, #020617 100%)`,
      }}
    />
  )
}

const Intro: React.FC<{ title: string; color: string }> = ({ title, color }) => {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const s = spring({ frame, fps, config: { damping: 12 } })
  const opacity = interpolate(frame, [INTRO_FRAMES - 15, INTRO_FRAMES], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const base = width / 1080
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity, padding: 80 * base }}>
      <div style={{ transform: `scale(${s})`, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 30 * base,
            letterSpacing: 6 * base,
            textTransform: 'uppercase',
            color,
            fontWeight: 800,
          }}
        >
          AI Generated Short
        </div>
        <h1 style={{ fontSize: 110 * base, margin: `${20 * base}px 0 0`, lineHeight: 1.05, fontWeight: 900 }}>
          {title}
        </h1>
      </div>
    </AbsoluteFill>
  )
}

const SceneView: React.FC<{ scene: Scene; index: number; total: number; color: string }> = ({
  scene,
  index,
  total,
  color,
}) => {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const base = width / 1080
  const enter = spring({ frame, fps, config: { damping: 14 } })
  const exit = interpolate(frame, [SCENE_FRAMES - 12, SCENE_FRAMES], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const y = interpolate(enter, [0, 1], [80 * base, 0])
  const words = scene.text.split(' ')

  return (
    <AbsoluteFill
      style={{ justifyContent: 'center', alignItems: 'center', opacity: exit, padding: 90 * base }}
    >
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
          background: 'rgba(255,255,255,0.08)',
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
      <div style={{ position: 'absolute', bottom: 120 * base, display: 'flex', gap: 14 * base }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: (i === index ? 60 : 18) * base,
              height: 18 * base,
              borderRadius: 9 * base,
              background: i === index ? color : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  )
}

const Outro: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const base = width / 1080
  const o = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.ease) })
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: o }}>
      <div style={{ fontSize: 64 * base, fontWeight: 900, color }}>Terima kasih! ✨</div>
    </AbsoluteFill>
  )
}

export const VideoComposition: React.FC<VideoProps> = ({ title, scenes = [], themeColor = '#3b82f6' }) => {
  return (
    <AbsoluteFill style={{ color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Background color={themeColor} />
      <Sequence durationInFrames={INTRO_FRAMES}>
        <Intro title={title} color={themeColor} />
      </Sequence>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={INTRO_FRAMES + i * SCENE_FRAMES} durationInFrames={SCENE_FRAMES}>
          <SceneView scene={scene} index={i} total={scenes.length} color={themeColor} />
        </Sequence>
      ))}
      <Sequence from={INTRO_FRAMES + scenes.length * SCENE_FRAMES} durationInFrames={OUTRO_FRAMES}>
        <Outro color={themeColor} />
      </Sequence>
    </AbsoluteFill>
  )
}
