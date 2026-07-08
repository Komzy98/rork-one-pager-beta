import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronRight, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isJoySourcesEmpty } from '@/utils/joySources';
import { COLORS } from '@/constants/colors';

const dismissKey = (userId: string) => `@joy_sources_nudge_dismissed_${userId}`;

export function shouldShowJoySourcesNudge(
  onboardingCompleted: boolean | undefined,
  joySourcesEmpty: boolean,
  dismissed: boolean
): boolean {
  return !!onboardingCompleted && joySourcesEmpty && !dismissed;
}

export default function JoySourcesNudgeCard() {
  const { colors, isDark } = useTheme();
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
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const visible =
    loaded &&
    shouldShowJoySourcesNudge(
      profile?.onboardingCompleted,
      isJoySourcesEmpty(profile?.joySources),
      dismissed
    );

  const handleDismiss = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissed(true);
    if (user?.id) {
      await AsyncStorage.setItem(dismissKey(user.id), 'true');
    }
  }, [user?.id]);

  const handleAdd = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(onboarding)/joy-sources',
      params: { returnTo: 'activities' },
    } as any);
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={isDark ? ['#0F172A', '#1A2332'] : ['#E8F4FF', '#F8F9FA']}
        style={styles.card}
      >
        <TouchableOpacity style={styles.close} onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={16} color={colors.textTertiary} />
        </TouchableOpacity>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)' }]}>
            <Sparkles size={18} color={COLORS.primary} />
          </View>
          <View style={styles.textWrap}>
            <Text style={[styles.title, { color: colors.text }]}>What makes you happy?</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Add shows, football, music, and more — we&apos;ll surface a Daily Hope when you need it most.
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.cta} onPress={handleAdd} activeOpacity={0.85}>
          <Text style={styles.ctaText}>Add joy sources</Text>
          <ChevronRight size={16} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 24,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
