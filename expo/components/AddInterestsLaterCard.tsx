import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronRight, Medal, Tv, Link2, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { SHOWS_HREF } from '@/constants/showsNavigation';

const dismissKey = (userId: string) => `@interests_later_nudge_dismissed_${userId}`;

export function shouldShowInterestsLaterNudge(
  onboardingCompleted: boolean | undefined,
  interestsCount: number,
  dismissed: boolean
): boolean {
  return !!onboardingCompleted && interestsCount === 0 && !dismissed;
}

export default function AddInterestsLaterCard() {
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

  const visible = loaded && shouldShowInterestsLaterNudge(
    profile?.onboardingCompleted,
    profile?.interests?.length ?? 0,
    dismissed
  );

  const handleDismiss = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissed(true);
    if (user?.id) {
      await AsyncStorage.setItem(dismissKey(user.id), 'true');
    }
  }, [user?.id]);

  const handlePersonalize = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(onboarding)/interests',
      params: { returnTo: 'activities' },
    } as any);
  }, []);

  const handleStreaming = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(SHOWS_HREF.streaming as any);
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={
          isDark
            ? ['rgba(88, 86, 214, 0.22)', 'rgba(0, 122, 255, 0.12)']
            : ['rgba(88, 86, 214, 0.08)', 'rgba(0, 122, 255, 0.06)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0, 122, 255, 0.15)',
            backgroundColor: isDark ? colors.card : '#FFFFFF',
          },
        ]}
      >
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => void handleDismiss()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Dismiss"
        >
          <X size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        <View style={styles.iconRow}>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(0, 122, 255, 0.14)' }]}>
            <Medal size={16} color="#007AFF" strokeWidth={2.5} />
          </View>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(255, 149, 0, 0.14)' }]}>
            <Tv size={16} color="#FF9500" strokeWidth={2.5} />
          </View>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(52, 199, 89, 0.14)' }]}>
            <Link2 size={16} color="#34C759" strokeWidth={2.5} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Make it yours</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          You skipped setup — add sports, shows, and the things you love. Overview gets smarter in about 2 minutes.
        </Text>

        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: isDark ? colors.surfaceSecondary : '#F2F4F8' }]}>
            <Text style={[styles.chipText, { color: colors.textSecondary }]}>Match day</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: isDark ? colors.surfaceSecondary : '#F2F4F8' }]}>
            <Text style={[styles.chipText, { color: colors.textSecondary }]}>Guilt-free downtime</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handlePersonalize}
          activeOpacity={0.88}
          testID="add-interests-later-primary"
        >
          <Sparkles size={16} color="#fff" strokeWidth={2.5} />
          <Text style={styles.primaryBtnText}>Personalize my day</Text>
          <ChevronRight size={16} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleStreaming}
          activeOpacity={0.8}
          testID="add-interests-later-streaming"
        >
          <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Connect streaming only</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    paddingRight: 28,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
