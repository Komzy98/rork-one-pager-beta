import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronRight, Layers, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  buildDailyStackItems,
  formatDailyStackHeadline,
  type BuildDailyStackInput,
} from '@/utils/dailyStack';

const dismissKey = (userId: string) => `@daily_stack_card_dismissed_${userId}`;

type DailyStackCardProps = Pick<
  BuildDailyStackInput,
  'habitCount' | 'completedHabits' | 'continueWatchingTitle' | 'tonightMatchLabel' | 'partnerCount'
>;

export default function DailyStackCard(props: DailyStackCardProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(dismissKey(user.id));
        if (!cancelled) setDismissed(raw === 'true');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const items = useMemo(
    () =>
      buildDailyStackItems({
        profile,
        ...props,
      }),
    [profile, props.habitCount, props.completedHabits, props.continueWatchingTitle, props.tonightMatchLabel, props.partnerCount],
  );

  const headline = useMemo(() => formatDailyStackHeadline(items), [items]);

  const handleDismiss = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissed(true);
    if (user?.id) await AsyncStorage.setItem(dismissKey(user.id), 'true');
  }, [user?.id]);

  const handleOpenModules = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/profile' as any);
  }, []);

  if (!loaded || dismissed || !profile?.onboardingCompleted || items.length === 0 || !headline) {
    return null;
  }

  return (
    <View style={[styles.wrap, { paddingHorizontal: 20 }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Dismiss daily stack"
        >
          <X size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}14` }]}>
            <Layers size={18} color={colors.primary} strokeWidth={2.2} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.textMuted }]}>YOUR DAY</Text>
            <Text style={[styles.headline, { color: colors.text }]}>{headline}</Text>
          </View>
        </View>

        <View style={styles.itemList}>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <View style={styles.itemCopy}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.itemDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.footerBtn} onPress={handleOpenModules} activeOpacity={0.8}>
          <Text style={[styles.footerText, { color: colors.primary }]}>Shape what shows up here</Text>
          <ChevronRight size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    paddingTop: 12,
    gap: 12,
  },
  dismissBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingRight: 24,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  headline: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  itemList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemEmoji: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  itemCopy: {
    flex: 1,
    gap: 1,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemDetail: {
    fontSize: 12,
    fontWeight: '500',
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 2,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
