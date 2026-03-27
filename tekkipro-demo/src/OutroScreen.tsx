import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const OutroScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps, config: { damping: 80, stiffness: 100 }, from: 0.9, to: 1 });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1B5E20 0%, #FFD600 50%, #D32F2F 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.38)',
      }} />

      {/* Content */}
      <div style={{ transform: `scale(${scale})`, textAlign: 'center', zIndex: 1, padding: '0 80px' }}>
        <div style={{
          width: 100, height: 100, borderRadius: 28,
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48, fontWeight: 800, color: 'white',
          margin: '0 auto 32px',
          backdropFilter: 'blur(8px)',
        }}>
          T
        </div>

        <h1 style={{
          fontSize: 72,
          fontWeight: 800,
          color: 'white',
          letterSpacing: '-0.05em',
          lineHeight: 1.0,
          margin: '0 0 20px',
          textShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}>
          Démarrez gratuitement
        </h1>
        <p style={{ fontSize: 26, color: 'rgba(255,255,255,0.85)', marginBottom: 48, fontWeight: 500 }}>
          TekkiPro — Gérez votre boutique comme un pro.
        </p>

        {/* URL badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          padding: '18px 36px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.15)',
          border: '2px solid rgba(255,255,255,0.3)',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ fontSize: 20, color: 'white', fontWeight: 700, letterSpacing: '0.02em' }}>
            🌐 tekkipro.sn
          </span>
        </div>
      </div>

      {/* Kente strip */}
      <div style={{ display: 'flex', height: 8, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        {['#1B5E20', '#FFD600', '#D32F2F', '#1B5E20', '#FFD600', '#D32F2F'].map((c, i) => (
          <div key={i} style={{ flex: 1, background: c }} />
        ))}
      </div>
    </div>
  );
};
