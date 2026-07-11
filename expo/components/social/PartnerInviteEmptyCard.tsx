import React, { useCallback } from 'react';
import { Alert, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Share2, UserPlus, Users } from 'lucide-react-native';
import { buildUserLink } from '@/utils/deepLinks';

interface PartnerInviteEmptyCardProps {
  username?: string;
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    card: string;
    border: string;
    primary: string;
  };
  onAddPartner: () => void;
}

export function PartnerInviteEmptyCard({
  username,
  colors,
  onAddPartner,
}: PartnerInviteEmptyCardProps) {
  const handleShareInvite = useCallback(async () => {
    if (!username?.trim()) {
      Alert.alert('Almost ready', 'Your partner handle is still being set up. Try again in a moment.');
      return;
    }
    const link = buildUserLink(username);
    try {
      await Share.share({
        message: `Be my accountability partner on One Pager 💪 We'll keep each other's streaks alive.\n${link}`,
        ...(Platform.OS === 'ios' ? { url: link } : {}),
      });
    } catch {
      // dismissed
    }
  }, [username]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}14` }]}>
        <Users size={22} color={colors.primary} strokeWidth={2.2} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Add your first accountability partner</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        See streaks, nudge each other, RSVP to events together, and cheer on wins — all from Overview.
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handleShareInvite}
        >
          <Share2 size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Share invite link</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={onAddPartner}
        >
          <UserPlus size={16} color={colors.primary} />
          <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Find by username</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
