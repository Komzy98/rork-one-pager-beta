import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTasks } from '@/hooks/useTasksStore';
import { useApp } from '@/hooks/useHabitsStore';
import OnboardingProgress from '@/components/OnboardingProgress';
import JoySourcesEditor from '@/components/JoySourcesEditor';
import { COLORS } from '@/constants/colors';
import { getNextOnboardingRoute, getOnboardingProgressMeta } from '@/utils/onboardingFlow';
import { inferJoySources, isJoySourcesEmpty } from '@/utils/joySources';
import type { JoySources } from '@/types/habit';

export default function JoySourcesScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useUserProfile();
  const { allTasks } = useTasks();
  const appContext = useApp();
  const interests = profile?.interests ?? [];
  const shows = appContext?.shows ?? [];

  const progress = getOnboardingProgressMeta('joy-sources', interests);

  const suggested = useMemo(
    () =>
      inferJoySources({
        profile,
        shows,
        habitTasks: allTasks.filter((t) => t.isHabit),
      }),
    [profile, shows, allTasks]
  );

  const value = profile?.joySources ?? {};

  const handleChange = useCallback(
    (next: JoySources) => {
      updateProfile({ joySources: isJoySourcesEmpty(next) ? undefined : next });
    },
    [updateProfile]
  );

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (returnTo === 'activities') {
      router.replace('/(tabs)/activities' as any);
      return;
    }
    router.push(getNextOnboardingRoute('joy-sources', interests) as any);
  }, [interests, returnTo, router]);

  const handleBack = useCallback(() => {
    if (returnTo === 'activities') {
      router.replace('/(tabs)/activities' as any);
      return;
    }
    router.back();
  }, [router, returnTo]);

  const handleSkip = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleContinue();
  }, [handleContinue]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <OnboardingProgress currentStep={progress.currentStep} totalSteps={progress.totalSteps} />
        </View>
        <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <View style={styles.iconWrap}>
            <Sparkles size={22} color="#DB2777" />
          </View>
          <Text style={styles.stepLabel}>WHAT BRINGS YOU JOY</Text>
          <Text style={styles.title}>Things worth looking forward to</Text>
          <Text style={styles.subtitle}>
            During hard weeks, One Pager surfaces a Daily Hope from this list — football, shows, music, or a favourite meal spot.
          </Text>
        </View>

        <JoySourcesEditor value={value} onChange={handleChange} suggested={suggested} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueText}>Continue</Text>
          <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  progressWrap: {
    flex: 1,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    minWidth: 40,
    textAlign: 'right',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titleBlock: {
    marginBottom: 20,
    gap: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#DB2777',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
