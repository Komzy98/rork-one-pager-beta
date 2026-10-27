import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
import { Bell, BellOff, CheckCircle2, ChevronRight, Clock, Heart, Sparkles, Tv, Trophy } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { notificationService } from '@/utils/notificationService';
import {
  getTimeOpportunities, summarizeTimeOutcomes,
  type EpisodeOpportunity, type TimeOpportunity, type TimeOpportunityKind,
  type AggregateMoment, type TimeOutcome,
} from '@/utils/timeWellSpent';
import type { PersonalSignal } from '@/utils/interestSignalEngine';
import type { DailyDecision } from '@/utils/dailyDecisionEngine';
import {
  getTimelyRemindersEnabled, readTimeOutcomes, recordTimeOutcome,
  saveTimelyRemindersEnabled, syncTimeWellSpentReminders,
} from '@/utils/timeWellSpentStorage';

type Props = {
  userId: string;
  now: Date;
  dailyDecision: DailyDecision | null;
  signals: readonly PersonalSignal[];
  episodes: readonly EpisodeOpportunity[];
  incompleteHabits: readonly string[];
  completedHabits: number;
  recoveryActive: boolean;
  onOpen: (item: TimeOpportunity) => void;
};

const LABELS: Record<TimeOpportunityKind, string> = {
  football: 'Don’t miss', episode: 'Worth catching',
  habit: 'For your future self', priority: 'On your radar',
};

export default function TimeWellSpentCard(props: Props) {
  const { colors } = useTheme();
  const { userId, now, signals, episodes, dailyDecision, incompleteHabits,
    recoveryActive, onOpen, completedHabits } = props;
  const suggestions = useMemo(() => getTimeOpportunities({
    now, signals, episodes, dailyDecision, incompleteHabits, recoveryActive,
  }), [now.getTime(), signals, episodes, dailyDecision, incompleteHabits, recoveryActive]);

  const [pref, setPref] = useState({ userId: '', loaded: false, enabled: false });
  const [feedback, setFeedback] = useState<Record<string, TimeOutcome>>({});
  const [counters, setCounters] = useState<ReturnType<typeof summarizeTimeOutcomes>>({
    opened: 0, acted: 0, notUseful: 0,
  });
  const [updating, setUpdating] = useState(false);
  const loaded = pref.loaded && pref.userId === userId;
  const enabled = loaded && pref.enabled;

  useEffect(() => {
    let active = true;
    setFeedback({});
    setPref({ userId, loaded: false, enabled: false });
    void Promise.all([getTimelyRemindersEnabled(userId), readTimeOutcomes(userId)])
      .then(([value, records]) => {
        if (!active) return;
        setPref({ userId, loaded: true, enabled: value });
        setCounters(summarizeTimeOutcomes(records));
      })
      .catch(() => { if (active) setPref({ userId, loaded: true, enabled: false }); });
    return () => { active = false; };
  }, [userId]);

  const reminderSignature = [
    ...signals.filter(s => s.kind === 'football_upcoming')
      .map(s => s.match.id + ':' + s.match.date),
    ...episodes.map(e => String(e.tmdbId) + ':' + (e.nextEpisode?.airDate ?? '')),
  ].join('|');

  useEffect(() => {
    if (!loaded) return;
    void syncTimeWellSpentReminders(userId, enabled, { signals, episodes })
      .catch(e => console.warn('[WorthYourTime] Reminder update failed', e));
  }, [userId, loaded, enabled, reminderSignature]);

  const toggleReminders = useCallback(async () => {
    if (!loaded || updating || Platform.OS === 'web') return;
    setUpdating(true);
    try {
      const next = !enabled;
      if (next && !(await notificationService.requestPermissions())) {
        Alert.alert('Notifications are off', 'Enable One Pager notifications in iOS Settings to receive timely reminders.');
        return;
      }
      await saveTimelyRemindersEnabled(userId, next);
      setPref({ userId, loaded: true, enabled: next });
      // This also cancels existing One Pager "worth your time" alerts when disabled.
      if (!next) await syncTimeWellSpentReminders(userId, false, { signals, episodes });
    } catch {
      Alert.alert('Could not change reminders', 'Please try again.');
    } finally {
      setUpdating(false);
    }
  }, [loaded, updating, enabled, userId, signals, episodes]);

  const record = useCallback(async (item: TimeOpportunity, outcome: TimeOutcome) => {
    if (outcome !== 'opened') setFeedback(prev => ({ ...prev, [item.id]: outcome }));
    try {
      setCounters(await recordTimeOutcome(userId, item.kind, outcome));
    } catch (error) {
      console.warn('[WorthYourTime] Local feedback unavailable', error);
    }
  }, [userId]);

  if (recoveryActive) return null;

  const iconFor = (kind: TimeOpportunityKind) => {
    if (kind === 'football') return <Trophy size={18} color={colors.primary}/>;
    if (kind === 'episode') return <Tv size={18} color={colors.primary}/>;
    if (kind === 'habit') return <Heart size={18} color={colors.primary}/>;
    return <Clock size={18} color={colors.primary}/>;
  };

  return <View style={{ marginHorizontal: 20, marginTop: 14, marginBottom: 12,
    borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 17, paddingVertical: 18 }}>
    <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>
      <Sparkles color={colors.primary} size={20}/>
      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text, flexShrink: 1 }}>
        Worth your time today
      </Text>
    </View>
    <Text style={{ fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 6 }}>
      Things you care about, at a time you can do something about them.
    </Text>
    {suggestions.length === 0 ? <View style={{ paddingVertical: 18 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
        No timely updates right now. Follow teams or shows and set personal goals to make this space yours.
      </Text>
    </View> : suggestions.map((item, index) =>
      <View key={item.id} style={{ borderTopWidth: 1, borderColor: colors.border,
        paddingTop: 15, paddingBottom: 10, marginTop: index === 0 ? 14 : 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {iconFor(item.kind)}
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.5 }}>{LABELS[item.kind]}</Text>
        </View>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginTop: 7 }}>
          {item.title}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
          {item.detail}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 5 }}>
          {item.reason}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
          marginTop: 10, gap: 13 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={item.actionLabel + ' for ' + item.title}
            onPress={() => { void record(item, 'opened'); onOpen(item); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
              {item.actionLabel}
            </Text>
            <ChevronRight size={14} color={colors.primary}/>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
            onPress={() => { void record(item, 'acted'); }}
            disabled={feedback[item.id] === 'acted'}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={14} color={feedback[item.id] === 'acted' ? colors.primary : colors.textSecondary}/>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {feedback[item.id] === 'acted' ? 'Recorded' : 'I followed through'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
            disabled={feedback[item.id] === 'not_useful'}
            onPress={() => { void record(item, 'not_useful'); }}
            style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {feedback[item.id] === 'not_useful' ? 'Noted' : 'Not useful'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
    <View style={{ borderTopWidth: 1, borderColor: colors.border, marginTop: 8, paddingTop: 13 }}>
      <TouchableOpacity onPress={() => void toggleReminders()}
        accessibilityRole="switch" accessibilityState={{ checked: enabled, disabled: !loaded || updating || Platform.OS === 'web' }}
        disabled={!loaded || updating || Platform.OS === 'web'}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
        {enabled ? <Bell size={17} color={colors.primary}/> : <BellOff size={17} color={colors.textSecondary}/>}
        <Text style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' }}>
          Timely match and episode reminders
        </Text>
        <Text style={{ color: enabled ? colors.primary : colors.textSecondary, fontWeight: '700', fontSize: 12 }}>
          {enabled ? 'ON' : 'OFF'}
        </Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6, lineHeight: 16 }}>
        Off by default. When enabled: max 2 reminders/day, quiet from 10pm–8am.
        Future alerts refresh when the app is opened. Existing habit reminder settings remain separate.
      </Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 13 }}>
        This week: {counters.acted} self-reported follow-through · {counters.opened} details opened
      </Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
        {completedHabits} habit{completedHabits === 1 ? '' : 's'} completed today. Feedback stays on this device; opening details doesn't count as doing it.
      </Text>
    </View>
  </View>;
}
