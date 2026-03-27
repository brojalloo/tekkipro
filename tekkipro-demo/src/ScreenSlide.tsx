import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';

export type SlideConfig = {
  title: string;
  subtitle: string;
  bgColor: string;
  accentColor: string;
  emoji: string;
  screenUrl: string;
};

type Props = {
  slide: SlideConfig;
};

export const ScreenSlide: React.FC<Props> = ({ slide }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fade in
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Gentle zoom
  const scale = spring({
    frame,
    fps,
    config: { damping: 80, stiffness: 120 },
    from: 0.96,
    to: 1,
  });

  // Text slide up
  const textY = interpolate(frame, [0, 20], [30, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Fade out at end
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFAF0',
        opacity: opacity * fadeOut,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      {/* Top gradient header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${slide.bgColor} 0%, ${slide.accentColor} 100%)`,
          padding: '48px 72px 64px',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            T
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-0.04em' }}>
            TekkiPro
          </span>
        </div>

        {/* Title */}
        <div style={{ transform: `translateY(${textY}px)` }}>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.72)', fontWeight: 600, marginBottom: 12 }}>
            {slide.emoji} Fonctionnalité
          </div>
          <h1
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-0.05em',
              lineHeight: 1.0,
              margin: 0,
              textShadow: '0 2px 20px rgba(0,0,0,0.15)',
            }}
          >
            {slide.title}
          </h1>
          <p
            style={{
              fontSize: 26,
              color: 'rgba(255,255,255,0.80)',
              marginTop: 16,
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            {slide.subtitle}
          </p>
        </div>
      </div>

      {/* Decorative blobs */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: -60,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 120,
          right: 80,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
        }}
      />

      {/* Browser mockup area */}
      <div
        style={{
          flex: 1,
          padding: '0 72px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${scale})`,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 960,
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(26,26,46,0.22), 0 0 0 1px rgba(26,26,46,0.08)',
            background: 'white',
            transform: 'translateY(-40px)',
          }}
        >
          {/* Browser chrome */}
          <div
            style={{
              background: '#F1F5F9',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#FC6058' }} />
              <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#FEC02F' }} />
              <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#2ACA44' }} />
            </div>
            <div
              style={{
                flex: 1,
                background: 'white',
                borderRadius: 8,
                padding: '5px 14px',
                fontSize: 13,
                color: '#94A3B8',
                border: '1px solid #E2E8F0',
                fontFamily: 'monospace',
              }}
            >
              🔒 tekkipro.sn/app
            </div>
          </div>

          {/* App screenshot placeholder with colored preview */}
          <div
            style={{
              height: 440,
              background: `linear-gradient(160deg, ${slide.bgColor}08 0%, white 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: 80,
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.08,
              }}
            >
              {slide.emoji}
            </div>
            <div style={{ textAlign: 'center', zIndex: 1 }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 24,
                  background: `linear-gradient(135deg, ${slide.bgColor}, ${slide.accentColor})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  margin: '0 auto 16px',
                  boxShadow: `0 12px 32px ${slide.bgColor}40`,
                }}
              >
                {slide.emoji}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#1A1A2E',
                  marginBottom: 8,
                }}
              >
                {slide.title}
              </div>
              <div style={{ fontSize: 15, color: '#64748B', maxWidth: 340 }}>
                {slide.subtitle}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kente strip at bottom */}
      <div style={{ display: 'flex', height: 8, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        {['#1B5E20', '#FFD600', '#D32F2F', '#1B5E20', '#FFD600', '#D32F2F'].map((c, i) => (
          <div key={i} style={{ flex: 1, background: c }} />
        ))}
      </div>
    </div>
  );
};
