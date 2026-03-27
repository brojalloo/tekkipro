import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const TitleScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const logoScale = spring({ frame, fps, config: { damping: 60, stiffness: 100 }, from: 0.6, to: 1 });
  const textY = interpolate(frame, [20, 45], [40, 0], { extrapolateRight: 'clamp' });
  const textOpacity = interpolate(frame, [15, 40], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1A1C23 0%, #0d1520 60%, #162030 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: opacity * fadeOut,
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background blobs */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'rgba(27,94,32,0.15)', filter: 'blur(80px)',
        top: -100, left: -100, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'rgba(211,47,47,0.12)', filter: 'blur(60px)',
        bottom: -80, right: -60, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'rgba(255,214,0,0.08)', filter: 'blur(50px)',
        top: 100, right: 200, pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 40 }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 32,
            background: 'linear-gradient(135deg, #1B5E20, #FFD600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 56,
            fontWeight: 800,
            color: 'white',
            boxShadow: '0 24px 64px rgba(27,94,32,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
            margin: '0 auto',
          }}
        >
          T
        </div>
      </div>

      {/* Title */}
      <div style={{ transform: `translateY(${textY}px)`, opacity: textOpacity, textAlign: 'center', zIndex: 1 }}>
        <h1
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: '-0.06em',
            margin: 0,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #ffffff 30%, rgba(255,255,255,0.7) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          TekkiPro
        </h1>
        <p
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 20,
            fontWeight: 500,
            letterSpacing: '-0.02em',
          }}
        >
          La gestion de boutique #1 en Afrique de l'Ouest
        </p>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}>
          {['5 000+ Boutiques', '12 Pays', '99.9% Uptime'].map((badge, i) => (
            <div
              key={i}
              style={{
                padding: '10px 24px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.80)',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>

      {/* Kente bottom strip */}
      <div style={{ display: 'flex', height: 8, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        {['#1B5E20', '#FFD600', '#D32F2F', '#1B5E20', '#FFD600', '#D32F2F'].map((c, i) => (
          <div key={i} style={{ flex: 1, background: c }} />
        ))}
      </div>
    </div>
  );
};
