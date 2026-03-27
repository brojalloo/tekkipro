import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Tricolor kente-inspired bar — green → gold → red.
 * @param {object} style  - additional style for the container View
 * @param {number} height - bar height in px (default 3)
 */
export default function KenteBar({ style, height = 3 }) {
  return (
    <View style={[styles.bar, { height }, style]}>
      <View style={[styles.stripe, { backgroundColor: '#1B5E20' }]} />
      <View style={[styles.stripe, { backgroundColor: '#FFD600' }]} />
      <View style={[styles.stripe, { backgroundColor: '#D32F2F' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stripe: { flex: 1 },
});
