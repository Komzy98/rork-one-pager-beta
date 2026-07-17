import React, { useCallback, useMemo } from 'react';
import { Alert, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Share2, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useFriends } from '@/hooks/useFriends';
import { usePartnerHabitShares } from '@/hooks/usePartnerHabitShares';
import { buildHabitPartnerInviteLink } from '@/utils/deepLinks';
import type { SocialProfile } from '@/utils/friendsService';

interface HabitAccountabilitySectionProps {
  habitId: string;
  habitName: string;
  colors: {
    text: string;
    textSecondary: string;
    textTertiary: string;
    card: string;
    border: string;
    primary: string;
    surfaceSecondary: string;
  };
}

export function HabitAccountabilitySection({
  habitId,
  habitName,
  colors,
}: HabitAccountabilitySectionProps) {
  const { available, myProfile, friends, isSignedIn } = useFriends();
  const { sharesFor, updatePartnerHabits, refresh } = usePartnerHabitShares();

  const partnersWithHabit = useMemo(() => {
    return friends.filter((f) =>
      sharesFor(f.id).some((s) => s.habitId === habitId),
    );
  }, [friends, sharesFor, habitId]);

  const handleShareInvite = useCallback(async () => {
    if (!myProfile?.username?.trim()) {
      Alert.alert('Almost ready', 'Your partner handle is still being set up. Try again in a moment.');
      return;
    }
    const link = buildHabitPartnerInviteLink(myProfile.username, habitId, habitName);
    try {
      await Share.share({
        message: `Hold me accountable for “${habitName}” on One Pager 💪\n${link}`,
        ...(Platform.OS === 'ios' ? { url: link } : {}),
      });
    } catch {
      // dismissed
    }
  }, [myProfile?.username, habitId, habitName]);

  const togglePartner = useCallback(
    async (partner: SocialProfile) => {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const current = sharesFor(partner.id);
      const has = current.some((s) => s.habitId === habitId);
      const next = has
        ? current.filter((s) => s.habitId !== habitId)
        : [...current, { habitId, habitName }];
      try {
        await updatePartnerHabits(
          partner.id,
          next.map((s) => ({ habitId: s.habitId, habitName: s.habitName ?? habitName })),
        );
      } catch (e) {
        Alert.alert('Could not update', (e as Error)?.message || 'Try again.');
      }
    },
    [sharesFor, habitId, habitName, updatePartnerHabits],
  );

  if (!isSignedIn) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Accountability partners</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Sign in to invite someone to this habit only — not your whole account.
        </Text>
      </View>
    );
  }

  if (available !== true) {
    return null;
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Users size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Accountability for this habit</Text>
      </View>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Partners only see activity for habits you choose. Events, shows, and other tabs stay separate unless you share them elsewhere.
      </Text>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={() => void handleShareInvite()}
      >
        <Share2 size={16} color="#fff" />
        <Text style={styles.primaryBtnText}>Invite for this habit</Text>
      </TouchableOpacity>

      {friends.length > 0 ? (
        <>
          <Text style={[styles.label, { color: colors.textTertiary }]}>PARTNERS WITH ACCESS</Text>
          {friends.map((f) => {
            const on = partnersWithHabit.some((p) => p.id === f.id);
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.partnerRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => void togglePartner(f)}
              >
                <Text style={[styles.partnerName, { color: colors.text }]} numberOfLines={1}>
                  {f.displayName || f.username}
                </Text>
                <Text style={[styles.partnerToggle, { color: on ? colors.primary : colors.textTertiary }]}>
                  {on ? 'Shared' : 'Tap to share'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </>
      ) : (
        <TouchableOpacity onPress={() => router.push('/friends' as any)}>
          <Text style={[styles.link, { color: colors.primary }]}>Add a partner first →</Text>
        </TouchableOpacity>
      )}

      {partnersWithHabit.length > 0 ? (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          {partnersWithHabit.length} partner{partnersWithHabit.length === 1 ? '' : 's'} can see check-ins for “{habitName}”.
        </Text>
      ) : null}

      <TouchableOpacity onPress={() => refresh()} hitSlop={8}>
        <Text style={[styles.link, { color: colors.textTertiary, fontSize: 13 }]}>Refresh partner access</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  partnerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  partnerToggle: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
});
