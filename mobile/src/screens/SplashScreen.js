import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  dark:   '#071C08',
  forest: '#0D2710',
  green:  '#1B5E20',
  gold:   '#FFD600',
  goldDim:'#F9A825',
  red:    '#D32F2F',
  sand:   '#F5F2ED',
  white:  '#FFFFFF',
};

// ── Timing constants (ms) ─────────────────────────────────────────────────────
const T = {
  GLOW_IN:      500,
  BADGE_DELAY:  150,
  KENTE_DELAY:  450,
  KENTE_DUR:    420,
  TITLE_DELAY:  780,
  TITLE_DUR:    380,
  TAGLINE_DELAY:1080,
  TAGLINE_DUR:  350,
  DECOR_DELAY:  1200,
  DECOR_DUR:    500,
  HOLD:         950,
  FADE_OUT:     480,
};

// ── Diamond shape (kente-inspired) ────────────────────────────────────────────
function Diamond({ size, color, opacity = 1 }) {
  return (
    <View style={{
      width: size,
      height: size,
      backgroundColor: color,
      opacity,
      transform: [{ rotate: '45deg' }],
    }} />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SplashScreen({ onFinish }) {

  // Animation refs
  const glowOpacity  = useRef(new Animated.Value(0)).current;
  const badgeScale   = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const kenteScaleX  = useRef(new Animated.Value(0)).current;
  const kenteOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY       = useRef(new Animated.Value(22)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const decorOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity= useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = (ms) => Animated.delay(ms);
    const timing = (val, toValue, duration, extra = {}) =>
      Animated.timing(val, { toValue, duration, useNativeDriver: true, ...extra });

    const anim = Animated.sequence([
      // 1 — Glow
      timing(glowOpacity, 1, T.GLOW_IN),

      // 2 — Badge (spring) + kente bar (après badge)
      Animated.parallel([
        Animated.sequence([
          delay(T.BADGE_DELAY - T.GLOW_IN), // already spent T.GLOW_IN
          Animated.spring(badgeScale, {
            toValue: 1,
            tension: 90,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          delay(T.BADGE_DELAY - T.GLOW_IN),
          timing(badgeOpacity, 1, 200),
        ]),
        Animated.sequence([
          delay(T.KENTE_DELAY - T.GLOW_IN),
          timing(kenteOpacity, 1, 120),
          timing(kenteScaleX, 1, T.KENTE_DUR),
        ]),
      ]),

      // 3 — Title
      Animated.parallel([
        timing(titleOpacity, 1, T.TITLE_DUR),
        timing(titleY, 0, T.TITLE_DUR),
      ]),

      // 4 — Tagline
      timing(tagOpacity, 1, T.TAGLINE_DUR),

      // 5 — Corner decor
      timing(decorOpacity, 1, T.DECOR_DUR),

      // 6 — Hold
      delay(T.HOLD),

      // 7 — Fade out entire screen
      timing(screenOpacity, 0, T.FADE_OUT),

    ]);

    anim.start(() => {
      onFinish?.();
    });

    return () => anim.stop();
  }, []);

  // Badge subtle rotation during spring (feels alive)
  const badgeSpin = badgeScale.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: ['-8deg', '3deg', '0deg'],
  });

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* ── Background glows ── */}
      <Animated.View style={[styles.glowWrap, { opacity: glowOpacity }]}>
        {/* Primary green glow behind badge */}
        <View style={styles.glowGreen} />
        {/* Secondary gold glow, offset up-right */}
        <View style={styles.glowGold} />
      </Animated.View>

      {/* ── Faint dot grid ── */}
      <Animated.View style={[styles.dotGrid, { opacity: decorOpacity }]}>
        {DOT_POSITIONS.map((pos, i) => (
          <View key={i} style={[styles.dot, { top: pos.y, left: pos.x }]} />
        ))}
      </Animated.View>

      {/* ── Corner diamonds ── */}
      <Animated.View style={[styles.cornerTL, { opacity: decorOpacity }]}>
        <Diamond size={14} color={C.gold}  opacity={0.22} />
        <Diamond size={8}  color={C.green} opacity={0.18} />
        <Diamond size={5}  color={C.red}   opacity={0.12} />
      </Animated.View>
      <Animated.View style={[styles.cornerBR, { opacity: decorOpacity }]}>
        <Diamond size={5}  color={C.red}   opacity={0.12} />
        <Diamond size={8}  color={C.gold}  opacity={0.18} />
        <Diamond size={14} color={C.green} opacity={0.20} />
      </Animated.View>
      <Animated.View style={[styles.cornerTR, { opacity: decorOpacity }]}>
        <Diamond size={10} color={C.red}   opacity={0.14} />
        <Diamond size={6}  color={C.gold}  opacity={0.15} />
      </Animated.View>
      <Animated.View style={[styles.cornerBL, { opacity: decorOpacity }]}>
        <Diamond size={6}  color={C.green} opacity={0.15} />
        <Diamond size={10} color={C.gold}  opacity={0.14} />
      </Animated.View>

      {/* ── Center content ── */}
      <View style={styles.main}>

        {/* Gold badge with "T" */}
        <Animated.View style={[
          styles.badge,
          {
            opacity: badgeOpacity,
            transform: [
              { scale: badgeScale },
              { rotate: badgeSpin },
            ],
          },
        ]}>
          {/* Inner shine overlay */}
          <View style={styles.badgeShine} />
          <Text style={styles.badgeLetter}>T</Text>
        </Animated.View>

        {/* Kente tricolor bar */}
        <Animated.View style={[
          styles.kenteWrap,
          {
            opacity: kenteOpacity,
            transform: [{ scaleX: kenteScaleX }],
          },
        ]}>
          <View style={[styles.kenteStripe, { backgroundColor: C.green }]} />
          <View style={[styles.kenteStripe, { backgroundColor: C.gold }]} />
          <View style={[styles.kenteStripe, { backgroundColor: C.red }]} />
        </Animated.View>

        {/* App name */}
        <Animated.Text style={[
          styles.appName,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleY }],
          },
        ]}>
          TekkiPro
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
          Gérez.{'  '}Vendez.{'  '}Grandissez.
        </Animated.Text>
      </View>

      {/* ── Bottom label ── */}
      <Animated.View style={[styles.bottom, { opacity: decorOpacity }]}>
        <View style={[styles.bottomDot, { backgroundColor: C.green }]} />
        <View style={[styles.bottomDot, { backgroundColor: C.gold }]} />
        <View style={[styles.bottomDot, { backgroundColor: C.red }]} />
        <Text style={styles.bottomText}>Made for West Africa</Text>
        <View style={[styles.bottomDot, { backgroundColor: C.red }]} />
        <View style={[styles.bottomDot, { backgroundColor: C.gold }]} />
        <View style={[styles.bottomDot, { backgroundColor: C.green }]} />
      </Animated.View>
    </Animated.View>
  );
}

// ── Dot grid positions ────────────────────────────────────────────────────────
const DOT_POSITIONS = [
  // top area
  { x: 40,        y: height * 0.18 },
  { x: width - 55,y: height * 0.14 },
  { x: width * 0.3,y: height * 0.22 },
  { x: width * 0.7,y: height * 0.20 },
  // bottom area
  { x: 55,        y: height * 0.75 },
  { x: width - 45,y: height * 0.78 },
  { x: width * 0.25,y: height * 0.80 },
  { x: width * 0.72,y: height * 0.76 },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.dark,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },

  /* Background glows */
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowGreen: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: C.green,
    opacity: 0.12,
    top: height / 2 - 190,
    left: width / 2 - 160,
  },
  glowGold: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.gold,
    opacity: 0.06,
    top: height / 2 - 210,
    left: width / 2 - 60,
  },

  /* Dot grid */
  dotGrid: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.green,
    opacity: 0.25,
  },

  /* Corners */
  cornerTL: {
    position: 'absolute',
    top: 52,
    left: 28,
    gap: 7,
    alignItems: 'center',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 80,
    right: 28,
    gap: 7,
    alignItems: 'center',
  },
  cornerTR: {
    position: 'absolute',
    top: 60,
    right: 36,
    gap: 8,
    alignItems: 'center',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 90,
    left: 36,
    gap: 8,
    alignItems: 'center',
  },

  /* Center content */
  main: {
    alignItems: 'center',
    gap: 0,
  },

  /* Gold badge */
  badge: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: C.gold,
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
    overflow: 'hidden',
  },
  badgeShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  badgeLetter: {
    fontSize: 44,
    fontWeight: '900',
    color: C.dark,
    letterSpacing: -1,
    fontFamily: 'Sora',
  },

  /* Kente bar */
  kenteWrap: {
    flexDirection: 'row',
    width: 96,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 22,
  },
  kenteStripe: {
    flex: 1,
  },

  /* Typography */
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.8,
    fontFamily: 'Sora',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(245,242,237,0.55)',
    letterSpacing: 1.4,
    fontFamily: 'Sora',
  },

  /* Bottom */
  bottom: {
    position: 'absolute',
    bottom: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  bottomText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(245,242,237,0.35)',
    letterSpacing: 1.2,
    marginHorizontal: 4,
    fontFamily: 'Sora',
  },
});
