import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RefreshCw, Users } from 'lucide-react-native';

interface PartnerListSyncCardProps {
  partnerCount: number;
  isRefreshing?: boolean;
  colors: {
    text: string;
    textSecondary: string;
    card: string;
    border: string;
    primary: string;
  };
  onRefresh: () => void;
  onOpenPartners: () => void;
}

export function PartnerListSyncCard({
  partnerCount,
  isRefreshing,
  colors,
  onRefresh,
  onOpenPartners,
}: PartnerListSyncCardProps) {
  const label = partnerCount === 1 ? '1 partner' : `${partnerCount} partners`;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}14` }]}>
        <Users size={22} color={colors.primary} strokeWidth={2.2} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Loading your {label}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        You’re connected in the database, but partner details haven’t loaded yet. Refresh or open Accountability Partners.
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }, isRefreshing && { opacity: 0.6 }]}
          onPress={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <RefreshCw size={16} color="#fff" />
          )}
          <Text style={styles.primaryBtnText}>{isRefreshing ? 'Refreshing...' : 'Refresh partners'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={onOpenPartners}>
          <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Open Accountability Partners</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
