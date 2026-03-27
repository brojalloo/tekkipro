import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const DARK_PALETTE = {
  optionBg: 'rgba(255,255,255,0.04)',
  optionBorder: 'rgba(148,163,184,0.18)',
  optionActiveBg: 'rgba(29,78,216,0.24)',
  optionActiveBorder: 'rgba(125,211,252,0.34)',
  codeBg: 'rgba(255,255,255,0.05)',
  codeText: '#cbd5e1',
  codeActiveBg: 'rgba(125,211,252,0.16)',
  codeActiveText: '#e0f2fe',
  labelText: '#cbd5e1',
  labelActiveText: '#f8fafc',
};

const LIGHT_PALETTE = {
  optionBg: '#f8fafc',
  optionBorder: '#e2e8f0',
  optionActiveBg: '#eff6ff',
  optionActiveBorder: '#93c5fd',
  codeBg: '#ffffff',
  codeText: '#475569',
  codeActiveBg: '#dbeafe',
  codeActiveText: '#2563eb',
  labelText: '#475569',
  labelActiveText: '#1d4ed8',
};

export default function LanguageSelector({ compact = false, style }) {
  const { language, languages, setLanguage, t } = useI18n();
  const { isDark } = useTheme();
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;

  return (
    <View style={[styles.row, style]}>
      {languages.map((item) => {
        const active = language === item.code;
        return (
          <TouchableOpacity
            key={item.code}
            style={[
              styles.option,
              { backgroundColor: palette.optionBg, borderColor: palette.optionBorder },
              active && { backgroundColor: palette.optionActiveBg, borderColor: palette.optionActiveBorder },
              compact && styles.optionCompact,
            ]}
            onPress={() => setLanguage(item.code)}
          >
            <Text
              style={[
                styles.code,
                { color: palette.codeText, backgroundColor: palette.codeBg },
                active && { color: palette.codeActiveText, backgroundColor: palette.codeActiveBg },
              ]}
            >
              {item.shortLabel}
            </Text>
            {!compact && (
              <Text style={[styles.label, { color: palette.labelText }, active && { color: palette.labelActiveText }]}>
                {t(item.labelKey)}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  optionCompact: { paddingHorizontal: 10, paddingVertical: 8 },
  code: {
    minWidth: 28, textAlign: 'center', fontSize: 12, fontWeight: '800', color: '#475569',
    paddingHorizontal: 6, paddingVertical: 4, borderRadius: 999,
  },
  label: { fontSize: 13, fontWeight: '700' },
});