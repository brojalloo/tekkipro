import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { DARK_THEME, TP, STATUT_COLORS } from './constants';
import { formatCFA } from './utils';

const PAYMENT_CONFIG = {
  CASH:         { icon: 'dollar-sign', label: 'Cash',  color: TP.primary,    bg: TP.primaryLight },
  MOBILE_MONEY: { icon: 'smartphone',  label: 'MoMo',  color: '#2563EB',     bg: 'rgba(37,99,235,0.10)' },
  CREDIT:       { icon: 'credit-card', label: 'Crédit',color: '#F4A020',     bg: 'rgba(244,160,32,0.12)' },
};

const STATUT_CONFIG = {
  COMPLETEE: { icon: 'check-circle', label: 'Complétée', color: TP.primary,    bg: TP.primaryLight },
  EN_CREDIT: { icon: 'alert-circle', label: 'En crédit', color: '#D4880F',     bg: 'rgba(244,160,32,0.12)' },
  ANNULEE:   { icon: 'x-circle',     label: 'Annulée',   color: '#EF4444',     bg: 'rgba(239,68,68,0.10)' },
};

export default function HistoryTransactionItem({ item, onOpenTicket, locale }) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const date = new Date(item.createdAt);
  const dateStr  = date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
  const timeStr  = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const yearStr  = date.getFullYear();

  const statut   = STATUT_CONFIG[item.statut]  || STATUT_CONFIG.COMPLETEE;
  const payment  = PAYMENT_CONFIG[item.modePaiement] || PAYMENT_CONFIG.CASH;
  const nbItems  = item.details?.length || 0;
  const isCredit = item.statut === 'EN_CREDIT';
  const isAnnulee = item.statut === 'ANNULEE';

  const clientName = item.client
    ? `${item.client.prenom || ''} ${item.client.nom}`.trim()
    : null;

  const card   = isDark ? DARK_THEME.cardBg     : '#FFFFFF';
  const border = isDark ? DARK_THEME.cardBorder  : (isCredit ? 'rgba(244,160,32,0.25)' : 'rgba(27,94,32,0.10)');
  const textC  = isDark ? DARK_THEME.text        : TP.text;
  const mutedC = isDark ? DARK_THEME.muted       : TP.textMuted;

  return (
    <View style={[
      styles.card,
      { backgroundColor: card, borderColor: border },
      isAnnulee && { opacity: 0.55 },
      isCredit && !isDark && { backgroundColor: 'rgba(255,248,235,0.85)' },
    ]}>
      {/* Kente accent bar — color by statut */}
      <View style={[styles.accentBar, { backgroundColor: statut.color }]} />

      {/* ── Main row ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setExpanded(v => !v)}
        style={styles.mainRow}
      >
        {/* Left: icon */}
        <View style={[styles.iconWrap, { backgroundColor: statut.bg }]}>
          <Feather name="shopping-bag" size={18} color={statut.color} />
        </View>

        {/* Center: info */}
        <View style={styles.center}>
          {/* Row 1: numero + client */}
          <View style={styles.topLine}>
            <Text style={[styles.numero, { color: statut.color }]}>#{item.numero}</Text>
            {clientName ? (
              <Text style={[styles.clientName, { color: textC }]} numberOfLines={1}>{clientName}</Text>
            ) : (
              <Text style={[styles.clientWalk, { color: mutedC }]}>Comptoir</Text>
            )}
          </View>

          {/* Row 2: date + items count */}
          <View style={styles.bottomLine}>
            <Feather name="clock" size={11} color={mutedC} />
            <Text style={[styles.dateText, { color: mutedC }]}>{dateStr} {yearStr} · {timeStr}</Text>
            <View style={styles.dot} />
            <Text style={[styles.itemsText, { color: mutedC }]}>{nbItems} article{nbItems !== 1 ? 's' : ''}</Text>
          </View>

          {/* Row 3: badges */}
          <View style={styles.badgesRow}>
            {/* Statut */}
            <View style={[styles.badge, { backgroundColor: statut.bg }]}>
              <Feather name={statut.icon} size={10} color={statut.color} />
              <Text style={[styles.badgeText, { color: statut.color }]}>{statut.label}</Text>
            </View>
            {/* Paiement */}
            <View style={[styles.badge, { backgroundColor: payment.bg }]}>
              <Feather name={payment.icon} size={10} color={payment.color} />
              <Text style={[styles.badgeText, { color: payment.color }]}>{payment.label}</Text>
            </View>
          </View>
        </View>

        {/* Right: amount + chevron */}
        <View style={styles.rightCol}>
          <Text style={[
            styles.amount,
            { color: isAnnulee ? mutedC : TP.primary },
            isAnnulee && styles.strikethrough,
          ]}>
            {formatCFA(item.montantTotal || 0, locale)}
          </Text>
          {isCredit && item.montantPaye != null && (
            <Text style={styles.paidAmount}>
              Payé : {formatCFA(item.montantPaye, locale)}
            </Text>
          )}
          <View style={[styles.chevronWrap, expanded && { backgroundColor: TP.primaryLight }]}>
            <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={expanded ? TP.primary : mutedC} />
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Expanded: article details ── */}
      {expanded && (
        <View style={[styles.detailsWrap, isDark && { borderTopColor: DARK_THEME.cardBorder }]}>
          {item.details?.length > 0 ? (
            <>
              {item.details.map((d, i) => (
                <View key={i} style={[
                  styles.detailRow,
                  i < item.details.length - 1 && styles.detailRowBorder,
                  isDark && { borderBottomColor: DARK_THEME.cardBorder },
                ]}>
                  <View style={styles.detailIconWrap}>
                    <Feather name="package" size={12} color={TP.primary} />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailName, { color: textC }]} numberOfLines={1}>
                      {d.produit?.nom || '—'}
                      {d.uniteNom ? <Text style={styles.detailUnit}> ({d.uniteNom})</Text> : null}
                    </Text>
                    <View style={styles.detailMeta}>
                      <Text style={[styles.detailQty, { color: mutedC }]}>×{d.quantite}</Text>
                      {d.prixUnitaire != null && (
                        <Text style={[styles.detailPrice, { color: mutedC }]}>
                          · {formatCFA(d.prixUnitaire, locale)}/u
                        </Text>
                      )}
                    </View>
                  </View>
                  {d.sousTotal != null && (
                    <Text style={[styles.detailTotal, { color: TP.primary }]}>
                      {formatCFA(d.sousTotal, locale)}
                    </Text>
                  )}
                </View>
              ))}

              {/* Voir ticket button */}
              <TouchableOpacity
                style={styles.ticketBtn}
                activeOpacity={0.82}
                onPress={() => onOpenTicket(item)}
              >
                <Feather name="file-text" size={14} color={TP.primary} />
                <Text style={styles.ticketBtnText}>Voir le ticket</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.ticketBtn}
              activeOpacity={0.82}
              onPress={() => onOpenTicket(item)}
            >
              <Feather name="file-text" size={14} color={TP.primary} />
              <Text style={styles.ticketBtnText}>Voir le ticket</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#1B5E20',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    paddingTop: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  center: {
    flex: 1,
    gap: 4,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  numero: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  clientName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  clientWalk: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  itemsText: {
    fontSize: 11,
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
    paddingTop: 2,
    flexShrink: 0,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  paidAmount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D4880F',
  },
  chevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  /* Expanded details */
  detailsWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(27,94,32,0.08)',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 0,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(27,94,32,0.06)',
  },
  detailIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(27,94,32,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailInfo: {
    flex: 1,
    gap: 2,
  },
  detailName: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D4880F',
    fontStyle: 'italic',
  },
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailQty: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailPrice: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailTotal: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 0,
  },
  ticketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(27,94,32,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(27,94,32,0.15)',
  },
  ticketBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: TP.primary,
  },
});
