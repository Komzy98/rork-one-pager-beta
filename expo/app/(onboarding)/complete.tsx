import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, CalendarDays, Check, CheckCircle2, Clapperboard, LayoutDashboard, ListChecks, Medal, Pencil, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTasks } from '@/hooks/useTasksStore';
import { useApp } from '@/hooks/useHabitsStore';
import { formatInterestsSummary } from '@/utils/onboardingDisplay';
import { ONBOARDING_EVENT_CATEGORIES } from '@/utils/onboardingEventCategories';
import { COLORS } from '@/constants/colors';
import { ONBOARDING_PREMIUM } from '@/constants/onboardingTheme';

type PreviewRow = {
  key: string;
  title: string;
  detail: string;
  icon: typeof ListChecks;
};

export default function CompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useUserProfile();
  const { allTasks } = useTasks();
  const { shows } = useApp();
  const [opening, setOpening] = useState(false);

  const interests = profile?.interests ?? [];
  const previewRows = useMemo<PreviewRow[]>(() => {
    const rows: PreviewRow[] = [];

    if (interests.includes('football') || interests.includes('nba') || interests.includes('ufc') || interests.includes('f1')) {
      const selected = [
        ...(profile?.nationalities ?? []).map(n => n.name),
        ...(profile?.favoriteTeams ?? []).map(t => t.name),
        ...(profile?.favoriteNBATeams ?? []).map(t => t.name),
      ];
      rows.push({
        key: 'sports', title: 'Sports',
        detail: selected.length ? 'Following ' + selected.slice(0, 2).join(', ') + (selected.length > 2 ? ' + more' : '') : 'Find fixtures, teams and scores in Sports',
        icon: Medal,
      });
    }

    if (interests.includes('events')) {
      const eventKinds = ONBOARDING_EVENT_CATEGORIES.filter(c =>
        profile?.favoriteEventCategories?.includes(c.id),
      ).map(c => c.label);
      const city = profile?.preferredEventsCity?.name;
      rows.push({
        key: 'events', title: 'Events',
        detail: [eventKinds.slice(0, 2).join(' & '), city].filter(Boolean).join(' · ') || 'Discover events near you',
        icon: CalendarDays,
      });
    }

    if (interests.includes('movies')) {
      const latest = (shows ?? []).slice(-1)[0];
      rows.push({
        key: 'shows', title: 'Shows',
        detail: latest ? 'Saved to watchlist: ' + latest.title : 'Find shows and track what you watch',
        icon: Clapperboard,
      });
    }

    if (interests.some(i => ['fitness', 'productivity', 'learning'].includes(i))) {
      const latest = allTasks.slice(-1)[0];
      rows.push({
        key: 'tasks', title: 'Tasks & habits',
        detail: latest ? 'Your task: ' + latest.title : 'Start planning and building routines',
        icon: ListChecks,
      });
    }

    if (rows.length === 0) {
      rows.push({
        key: 'overview', title: 'Your Overview',
        detail: 'Explore your selected interests and add what matters to you',
        icon: LayoutDashboard,
      });
    }
    return rows;
  }, [interests, profile?.nationalities, profile?.favoriteTeams, profile?.favoriteNBATeams,
    profile?.favoriteEventCategories, profile?.preferredEventsCity, shows, allTasks]);

  const handleOpen = useCallback(async () => {
    if (opening) return;
    setOpening(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      // Await the local profile save before switching routes to prevent a
      // first-run redirect back to onboarding on slower devices.
      await updateProfile({ onboardingCompleted: true });
      router.replace('/(tabs)/activities' as any);
    } catch {
      setOpening(false);
    }
  }, [opening, updateProfile, router]);

  const handleEdit = () => router.replace('/(onboarding)/interests' as any);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 45, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.doneIcon}><CheckCircle2 size={33} color={COLORS.primary} strokeWidth={2.1} /></View>
        <Text style={styles.kicker}>MADE FOR YOU</Text>
        <Text style={styles.title}>Your One Pager is ready.</Text>
        <Text style={styles.subtitle}>
          Your choices are saved. Here's what you'll find in the original Overview and your personalised tabs.
        </Text>
        <View style={styles.selectionSummary}>
          <Sparkles size={14} color={COLORS.primary} />
          <Text style={styles.selectionText} numberOfLines={2}>{formatInterestsSummary(interests, 4)}</Text>
        </View>

        <View style={[styles.card, ONBOARDING_PREMIUM.cardElevated]}>
          <View style={styles.cardHeader}>
            <View style={styles.iconSquare}><LayoutDashboard size={20} color={COLORS.primary} /></View>
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>Your Overview</Text>
              <Text style={styles.cardHint}>What you've chosen, all in one place.</Text>
            </View>
          </View>
          {previewRows.map((row, index) => {
            const Icon = row.icon;
            return <View key={row.key} style={[styles.item, index > 0 && styles.itemBorder]}>
              <View style={styles.rowIcon}><Icon size={19} color={COLORS.primary} /></View>
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle}>{row.title}</Text>
                <Text style={styles.itemDetail} numberOfLines={2}>{row.detail}</Text>
              </View>
              <Check size={17} color="#30A46C" />
            </View>;
          })}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Everything else can wait.</Text>
          <Text style={styles.noteText}>
            Add more interests, connect streaming, set reminders or fine-tune your Sports feed anytime from the app.
          </Text>
        </View>

        <TouchableOpacity onPress={() => void handleOpen()} disabled={opening}
          activeOpacity={0.86} accessibilityRole="button" accessibilityLabel="Open my Overview"
          testID="onboarding-complete">
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.button}>
            {opening ? <ActivityIndicator color="#fff" /> : (
              <><Text style={styles.buttonText}>Open my Overview</Text><ArrowRight size={19} color="#fff" /></>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editLink} onPress={handleEdit} accessibilityRole="button">
          <Pencil size={14} color={COLORS.textSecondary} />
          <Text style={styles.editText}>Change my interests</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingHorizontal: 24 },
  doneIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: '#EAF0FF', alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 2.4, color: COLORS.primary, marginBottom: 10 },
  title: { color: COLORS.text, fontSize: 33, fontWeight: '800', letterSpacing: -1.1, lineHeight: 39 },
  subtitle: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 23, marginTop: 12, marginBottom: 20 },
  selectionSummary: { paddingVertical: 10, paddingHorizontal: 13, backgroundColor: '#E8EDFE', alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, marginBottom: 23 },
  selectionText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  card: { padding: 18, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderColor: '#E2E7F1', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 13 },
  iconSquare: { height: 45, width: 45, borderRadius: 14, backgroundColor: '#E8EDFE', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  cardHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  itemBorder: { borderTopWidth: 1, borderTopColor: '#EDF0F6' },
  rowIcon: { height: 38, width: 38, backgroundColor: '#F2F5FF', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1 },
  itemTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  itemDetail: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 },
  note: { marginTop: 19, marginBottom: 27, paddingHorizontal: 3 },
  noteTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  noteText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  button: { height: 56, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  editLink: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 7, paddingTop: 20, paddingBottom: 20 },
  editText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
});
