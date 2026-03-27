import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TP, STATUT_COLORS } from './constants';

export default function VenteItem({ item, onOpenTicket, text, locale, isDark, themeColors }) {
  const color = STATUT_COLORS[item.statut] || '#6b7280';
  const date = new Date(item.createdAt).toLocaleDateString(locale, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <TouchableOpacity style={[styles.item, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]} activeOpacity={0.92} onPress={() => onOpenTicket(item)}>
      <View style={styles.itemHeader}>
        <Text style={[styles.numero, isDark && { color: themeColors.text }]}>{item.numero}</Text>
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.badgeText, { color }]}>{text.statusLabels[item.statut]}</Text>
        </View>
      </View>
      <View style={styles.itemBody}>
        <Text style={[styles.date, isDark && { color: themeColors.muted }]}>{date}</Text>
        <Text style={[styles.montant, isDark && { color: themeColors.text }]}>{(item.montantTotal || 0).toLocaleString(locale)} FCFA</Text>
      </View>
      {item.client && (
        <View style={styles.inlineMetaRow}>
          <Feather name="user" size={13} color={isDark ? themeColors.faint : '#6b7280'} />
          <Text style={[styles.client, isDark && { color: themeColors.muted }]}>{item.client.prenom} {item.client.nom}</Text>
        </View>
      )}
      {!!item.user && (
        <View style={styles.inlineMetaRow}>
          <Feather name="user-check" size={13} color={isDark ? themeColors.faint : '#6b7280'} />
          <Text style={[styles.meta, isDark && { color: themeColors.muted }]}>{text.seller} : {item.user.prenom} {item.user.nom}</Text>
        </View>
      )}
      <View style={styles.inlineMetaRow}>
        <Feather name="credit-card" size={13} color={isDark ? themeColors.faint : '#6b7280'} />
        <Text style={[styles.meta, isDark && { color: themeColors.muted }]}>{text.payment} : {text.paymentLabels[item.modePaiement] || item.modePaiement || text.dash}</Text>
      </View>
      <View style={styles.inlineMetaRow}>
        <Feather name="package" size={13} color={isDark ? themeColors.faint : '#9ca3af'} />
        <Text style={[styles.articles, isDark && { color: themeColors.muted }]}>{item.details?.map((detail) => detail.produit?.nom).filter(Boolean).slice(0, 2).join(', ') || text.itemsCount(item.details?.length || 0)}</Text>
      </View>
      <View style={styles.ticketActionRow}>
        <View style={[styles.ticketActionPill, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
          <Feather name="file-text" size={14} color={isDark ? themeColors.accentText : TP.primary} />
          <Text style={[styles.ticketActionText, isDark && { color: themeColors.accentText }]}>{text.viewTicket}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(232,98,58,0.1)',
    marginHorizontal: 16,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  numero: { fontSize: 15, fontWeight: '800', color: '#475569' },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  itemBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  date: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  montant: { fontSize: 18, fontWeight: '900', color: '#1B6B3A' },
  inlineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  ticketActionRow: { marginTop: 16, alignItems: 'flex-end' },
  ticketActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,98,58,0.2)',
  },
  ticketActionText: { color: '#E8623A', fontSize: 13, fontWeight: '800' },
  client: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  meta: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  articles: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
});
