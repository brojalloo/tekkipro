// mobile/src/components/ProTooltip.js
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback,
  StyleSheet, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const TP = {
  green: '#1B5E20', gold: '#FFD600', dark: '#071C08',
  white: '#FFFFFF', muted: '#6B7280',
};

export default function ProTooltip({ locked, featureLabel, requiredPlan = 'PRO', children }) {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();

  if (!locked) return children;

  return (
    <>
      <Pressable onPress={() => setVisible(true)}>
        {children}
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.featureLabel}>{featureLabel}</Text>
          <Text style={styles.description}>
            Disponible sur le plan{' '}
            <Text style={styles.planHighlight}>{requiredPlan}</Text>.
            Mettez à niveau pour accéder à cette fonctionnalité.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => { setVisible(false); navigation.navigate('Abonnement'); }}
          >
            <Text style={styles.ctaText}>Mettre à niveau →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setVisible(false)}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:         { backgroundColor: TP.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  handle:        { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  featureLabel:  { fontSize: 18, fontWeight: '800', color: TP.dark, marginBottom: 8 },
  description:   { fontSize: 14, color: TP.muted, lineHeight: 20, marginBottom: 20 },
  planHighlight: { fontWeight: '800', color: TP.green },
  ctaButton:     { backgroundColor: TP.green, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  ctaText:       { color: TP.white, fontWeight: '800', fontSize: 15 },
  cancelButton:  { alignItems: 'center', paddingVertical: 10 },
  cancelText:    { color: TP.muted, fontSize: 14 },
});
