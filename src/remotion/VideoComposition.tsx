import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export interface VideoProps {
  title: string;
  subtitles: string[];
  themeColor?: string;
}

export const VideoComposition: React.FC<VideoProps> = ({
  title,
  subtitles = [],
  themeColor = "#3b82f6",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animasi fade in & scale judul
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 20], [0.8, 1], { extrapolateRight: "clamp" });

  // Ganti teks per beberapa detik berdasarkan frame
  const subtitleIndex = Math.min(
    Math.floor(frame / (fps * 2.5)),
    subtitles.length - 1
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        fontFamily: "sans-serif",
        padding: 40,
        textAlign: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          marginBottom: 30,
        }}
      >
        <span
          style={{
            fontSize: 24,
            textTransform: "uppercase",
            letterSpacing: 2,
            color: themeColor,
            fontWeight: "bold",
          }}
        >
          AI Generated Short
        </span>
        <h1 style={{ fontSize: 56, marginTop: 10 }}>{title}</h1>
      </div>

      {subtitles.length > 0 && (
        <div
          style={{
            fontSize: 32,
            background: "rgba(255, 255, 255, 0.1)",
            padding: "16px 28px",
            borderRadius: 16,
            maxWidth: "80%",
            color: "#e2e8f0",
          }}
        >
          {subtitles[subtitleIndex] || subtitles[0]}
        </div>
      )}
    </AbsoluteFill>
  );
};