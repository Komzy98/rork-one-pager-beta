import React, { useCallback, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Sparkles,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useEventKit } from '@/hooks/useEventKit';
import OnboardingProgress from '@/components/OnboardingProgress';
import { COLORS } from '@/constants/colors';
import { getNextOnboardingRoute, HABIT_ONBOARDING_INTERESTS } from '@/utils/onboardingFlow';

const BENEFITS = [
  {
    icon: Clock3,
    title: 'Best times for habits',
    body: 'We find free windows that match your chronotype and routine.',
  },
  {
    icon: CalendarDays,
    title: 'Respect your schedule',
    body: 'Habit suggestions avoid meetings and busy blocks on your calendar.',
  },
  {
    icon: Sparkles,
    title: 'Smarter Tasks tab',
    body: 'Your daily plan shows when to tackle each habit — not just what.',
  },
] as const;

export default function CalendarOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();
  const { totalSteps, currentStep } = useOnboardingStepMeta('calendar');
  const interests = profile?.interests ?? [];
  const {
    isEventKitAvailable,
    hasPermission,
    calendars,
    selectedCalendarIds,
    isLoading,
    error,
    requestPermissions,
    loadDeviceCalendars,
    refreshEvents,
    clearError,
  } = useEventKit();
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const wantsCalendar = interests.some((id) =>
      (HABIT_ONBOARDING_INTERESTS as readonly string[]).includes(id),
    );
    if (profile && !wantsCalendar) {
      router.replace(getNextOnboardingRoute('interests', interests) as any);
    }
  }, [profile, interests, router]);

  const continueNext = useCallback(() => {
    router.push(getNextOnboardingRoute('calendar', interests) as any);
  }, [router, interests]);

  const handleConnect = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isEventKitAvailable) {
      continueNext();
      return;
    }

    setConnecting(true);
    clearError();
    try {
      const granted = hasPermission || (await requestPermissions());
      if (granted) {
        await loadDeviceCalendars({ applyDefaultSelection: true });
        await refreshEvents();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setConnecting(false);
    }
  }, [
    isEventKitAvailable,
    hasPermission,
    requestPermissions,
    loadDeviceCalendars,
    refreshEvents,
    clearError,
    continueNext,
  ]);

  const handleContinue = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    continueNext();
  }, [continueNext]);

  const handleSkip = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    continueNext();
  }, [continueNext]);

  const isConnected = hasPermission && selectedCalendarIds.length > 0;
  const selectedCalendars = calendars.filter((cal) => selectedCalendarIds.includes(cal.id));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} />
        </View>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleWrap}>
          <Text style={styles.stepLabel}>STEP {currentStep} · LIFE MANAGEMENT</Text>
          <Text style={styles.title}>Connect your calendar</Text>
          <Text style={styles.subtitle}>
            One Pager uses your real schedule to recommend when to complete habits — so planning
            feels personal, not generic.
          </Text>
        </View>

        {BENEFITS.map((item) => {
          const Icon = item.icon;
          return (
            <View key={item.title} style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Icon size={18} color={COLORS.primary} />
              </View>
              <View style={styles.benefitCopy}>
                <Text style={styles.benefitTitle}>{item.title}</Text>
                <Text style={styles.benefitBody}>{item.body}</Text>
              </View>
            </View>
          );
        })}

        {!isEventKitAvailable ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Available on mobile</Text>
            <Text style={styles.statusBody}>
              Calendar access works in the iOS and Android app. You can connect it later from Tasks.
            </Text>
          </View>
        ) : isConnected ? (
          <View style={[styles.statusCard, styles.statusCardSuccess]}>
            <View style={styles.statusHeader}>
              <Check size={18} color={COLORS.primary} />
              <Text style={styles.statusTitle}>Calendar connected</Text>
            </View>
            <Text style={styles.statusBody}>
              {selectedCalendarIds.length} calendar{selectedCalendarIds.length === 1 ? '' : 's'}{' '}
              syncing for habit timing.
            </Text>
            {selectedCalendars.slice(0, 4).map((cal) => (
              <View key={cal.id} style={styles.calendarRow}>
                <View style={[styles.calendarDot, { backgroundColor: cal.color }]} />
                <Text style={styles.calendarName} numberOfLines={1}>
                  {cal.title}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.statusCard}>
            <CalendarDays size={28} color={COLORS.primary} />
            <Text style={styles.statusTitle}>Your schedule stays private</Text>
            <Text style={styles.statusBody}>
              We only read event times to find free windows. One Pager never edits or shares your
              calendar.
            </Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={handleConnect}
              disabled={connecting || isLoading}
              activeOpacity={0.85}
            >
              {connecting || isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <CalendarDays size={18} color="#FFFFFF" />
                  <Text style={styles.connectBtnText}>Allow calendar access</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.continueBtn} activeOpacity={0.85} onPress={handleContinue}>
          <View style={styles.continueBtnInner}>
            <Text style={styles.continueText}>{isConnected ? 'Continue' : 'Continue without calendar'}</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressWrap: { flex: 1, paddingHorizontal: 16 },
  skipText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  titleWrap: { paddingHorizontal: 24, marginBottom: 12 },
  stepLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.2 },
  title: { marginTop: 6, fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { marginTop: 6, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  benefitCard: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitCopy: { flex: 1, gap: 3 },
  benefitTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  benefitBody: { fontSize: 12, lineHeight: 17, color: COLORS.textSecondary, fontWeight: '600' },
  statusCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    alignItems: 'flex-start',
  },
  statusCardSuccess: {
    borderColor: COLORS.primary + '35',
    backgroundColor: COLORS.primary + '08',
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  statusBody: { fontSize: 13, lineHeight: 18, color: COLORS.textSecondary, fontWeight: '600' },
  calendarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  calendarDot: { width: 8, height: 8, borderRadius: 4 },
  calendarName: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text },
  errorText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  connectBtn: {
    marginTop: 4,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  connectBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  continueBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
  },
  continueBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  continueText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
