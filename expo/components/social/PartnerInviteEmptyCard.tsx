import React, { useCallback } from 'react';
import { Alert, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Share2, UserPlus, Users, X } from 'lucide-react-native';
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
  onDismiss?: () => void;
}

export function PartnerInviteEmptyCard({
  username,
  colors,
  onAddPartner,
  onDismiss,
}: PartnerInviteEmptyCardProps) {
  const handleShareInvite = useCallback(async () => {
    if (!username?.trim()) {
      Alert.alert('Almost ready', 'Your partner handle is still being set up. Try again in a moment.');
      return;
    }
    const link = buildUserLink(username);
    try {
      await Share.share({
        message: `Live well together on One Pager — habits, plans, and the stuff you care about.\n${link}`,
        ...(Platform.OS === 'ios' ? { url: link } : {}),
      });
    } catch {
      // dismissed
    }
  }, [username]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {onDismiss ? (
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Dismiss partner invite"
          accessibilityRole="button"
        >
          <X size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
      <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}14` }]}>
        <Users size={22} color={colors.primary} strokeWidth={2.2} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Share the journey with someone</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Optional — connect with someone who helps you show up. Cheer each other on when it counts.
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
        {onDismiss ? (
          <TouchableOpacity style={styles.notNowBtn} onPress={onDismiss}>
            <Text style={[styles.notNowText, { color: colors.textMuted }]}>Not now</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    paddingTop: 20,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  dismissBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 4,
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
  notNowBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  notNowText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
