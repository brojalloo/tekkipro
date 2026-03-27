import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useI18n } from '../context/LanguageContext';
import KenteBar from '../components/KenteBar';

const TP = {
  dark: '#071C08',
  green: '#1B5E20',
  gold: '#FFD600',
  accent: '#D32F2F',
  bg: '#F5F2ED',
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.55)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.10)',
};

const FEATURES = [
  { icon: 'shopping-cart', color: TP.accent, bg: 'rgba(211,47,47,0.12)', titleKey: 'welcome.salesTitle', textKey: 'welcome.salesText' },
  { icon: 'package', color: TP.gold, bg: 'rgba(255,214,0,0.12)', titleKey: 'welcome.stockTitle', textKey: 'welcome.stockText' },
  { icon: 'users', color: TP.green, bg: 'rgba(27,94,32,0.15)', titleKey: 'welcome.teamTitle', textKey: 'welcome.teamText' },
];

export default function WelcomeScreen({ navigation }) {
  const { t } = useI18n();

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            {/* Gold "T" badge */}
            <View style={styles.logoWrap}>
              <View style={styles.logoShine} />
              <Text style={styles.logoLetter}>T</Text>
            </View>
            <View>
              <Text style={styles.brand}>TekkiPro</Text>
              {/* Kente tricolor bar */}
              <KenteBar style={styles.kenteBar} />
              <Text style={styles.tagline}>{t('welcome.badge')}</Text>
            </View>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{t('welcome.title')}</Text>
            <Text style={styles.heroSub}>{t('welcome.subtitle')}</Text>
          </View>

          {/* Feature cards */}
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.icon} style={styles.featureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: f.bg }]}>
                  <Feather name={f.icon} size={18} color={f.color} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{t(f.titleKey)}</Text>
                  <Text style={styles.featureBody}>{t(f.textKey)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTAs */}
          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Login', { mode: 'register' })}
          >
            <Text style={styles.btnPrimaryText}>{t('welcome.createAccount')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Login', { mode: 'login' })}
          >
            <Text style={styles.btnSecondaryText}>{t('welcome.signIn')}</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>{t('welcome.ctaHint')}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TP.dark },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 40 },
  logoWrap: {
    width: 52, height: 52, borderRadius: 15,
    backgroundColor: TP.gold,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: TP.gold,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    flexShrink: 0,
  },
  logoShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '52%',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  logoLetter: {
    fontSize: 26,
    fontWeight: '900',
    color: '#071C08',
    letterSpacing: -0.5,
  },
  kenteBar: {
    flexDirection: 'row',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    width: 44,
    marginTop: 4,
    marginBottom: 3,
  },
  brand: { fontSize: 20, fontWeight: '800', color: TP.white, letterSpacing: -0.3 },
  tagline: { fontSize: 12, color: TP.muted },
  hero: { marginBottom: 36 },
  heroTitle: {
    fontSize: 34, fontWeight: '800', color: TP.white,
    lineHeight: 42, letterSpacing: -0.5, marginBottom: 12,
  },
  heroSub: { fontSize: 15, color: TP.muted, lineHeight: 24 },
  features: { gap: 12, marginBottom: 36 },
  featureCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: TP.card,
    borderWidth: 1, borderColor: TP.cardBorder,
    borderRadius: 16, padding: 16,
  },
  featureIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: TP.white, marginBottom: 3 },
  featureBody: { fontSize: 13, color: TP.muted, lineHeight: 19 },
  btnPrimary: {
    backgroundColor: TP.green,
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
  },
  btnPrimaryText: { fontSize: 16, fontWeight: '800', color: TP.white },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: TP.cardBorder,
  },
  btnSecondaryText: { fontSize: 16, fontWeight: '700', color: TP.white },
  hint: { textAlign: 'center', fontSize: 13, color: TP.muted },
});
