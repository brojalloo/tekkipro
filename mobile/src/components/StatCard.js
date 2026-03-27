import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * Reusable stat card used in Clients, Dettes, and Employes screens.
 * Props: label, value, icon, tone (bg color), accent (icon color), isDark, themeColors
 */
export default function StatCard({ label, value, tone, icon, accent, isDark, themeColors }) {
  return (
    <View style={[styles.statCard, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
      <View style={[styles.statIconWrap, { backgroundColor: tone }]}>
        <Feather name={icon} size={16} color={accent} />
      </View>
      <Text style={[styles.statValue, isDark && { color: themeColors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, isDark && { color: themeColors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(27,94,32,0.15)',
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    flex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1A18',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
});
