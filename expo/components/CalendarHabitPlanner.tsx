import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CalendarDays, Clock3, Sparkles, ChevronRight, HeartPulse, RefreshCw } from 'lucide-react-native';
import type { ThemeColors } from '@/types/theme';
import type { SemanticHabitRecommendation } from '@/utils/semanticHabitRecommendations';
import { useHealthContext } from '@/contexts/HealthContext';

const ACCENT = {
  green: '#18C383',
  blue: '#3578F6',
  health: '#E84A5F',
};

interface Props {
  colors: ThemeColors;
  isDark: boolean;
  isCalendarAvailable: boolean;
  isConnected: boolean;
  isLoading: boolean;
  todayEventCount: number;
  recommendations: SemanticHabitRecommendation[];
  onConnectPress: () => void;
  onManageCalendarsPress: () => void;
}

export default function CalendarHabitPlanner({
  colors,
  isDark,
  isCalendarAvailable,
  isConnected,
  isLoading,
  todayEventCount,
  recommendations,
  onConnectPress,
  onManageCalendarsPress,
}: Props) {
  const health = useHealthContext();
  const surface = isDark ? 'rgba(255,255,255,0.06)' : '#F4F6FA';
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#E6E9EF';
  const muted = isDark ? colors.textSecondary : '#6B7280';
  const stepRecommendation = recommendations.find((item) => item.healthMetric === 'steps') ?? null;

  const healthCard = stepRecommendation && health.isAppleHealthAvailable ? (
    <View style={[styles.healthCard, { backgroundColor: isDark ? 'rgba(232,74,95,0.10)' : '#FFF4F5', borderColor: isDark ? 'rgba(232,74,95,0.25)' : '#F7D9DD' }]}>
      <View style={styles.healthHeader}>
        <View style={[styles.healthIcon, { backgroundColor: isDark ? 'rgba(232,74,95,0.20)' : '#FFE4E7' }]}>
          <HeartPulse size={17} color={ACCENT.health} />
        </View>
        <View style={styles.healthCopy}>
          <Text style={[styles.healthTitle, { color: colors.text }]}>Apple Health</Text>
          <Text style={[styles.healthDetail, { color: muted }]}>
            {health.permissionRequested
              ? health.stepsToday != null
                ? `${health.stepsToday.toLocaleString('en-GB')} steps today · read only`
                : 'Set up, but no step data is available today.'
              : 'Use your real step progress so One Pager only suggests movement when it would actually help.'}
          </Text>
        </View>
        {health.permissionRequested ? (
          <TouchableOpacity onPress={() => void health.refresh()} hitSlop={10} disabled={health.isLoading}>
            {health.isLoading
              ? <ActivityIndicator size="small" color={ACCENT.health} />
              : <RefreshCw size={16} color={ACCENT.health} />}
          </TouchableOpacity>
        ) : null}
      </View>
      {!health.permissionRequested ? (
        <TouchableOpacity
          style={[styles.healthCta, { backgroundColor: ACCENT.health }]}
          onPress={() => void health.requestStepAccess()}
          activeOpacity={0.85}
          disabled={health.isLoading}
        >
          {health.isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <HeartPulse size={15} color="#FFFFFF" />}
          <Text style={styles.healthCtaText}>Connect Apple Health</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  ) : null;

  if (!isCalendarAvailable) {
    return healthCard;
  }

  if (!isConnected) {
    return (
      <View style={styles.stack}>
        {healthCard}
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(53,120,246,0.18)' : '#E8F0FF' }]}>
              <CalendarDays size={18} color={ACCENT.blue} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: colors.text }]}>Calendar & rhythm</Text>
              <Text style={[styles.subtitle, { color: muted }]}>
                Connect your calendar so flexible routines can fit around real commitments. Natural rules still stay natural.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.cta} onPress={onConnectPress} activeOpacity={0.85}>
            <Sparkles size={16} color="#FFFFFF" />
            <Text style={styles.ctaText}>Connect calendar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const topPicks = recommendations.slice(0, 4);

  return (
    <View style={styles.stack}>
      {healthCard}
      <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(24,195,131,0.18)' : '#EAFBF4' }]}>
            <CalendarDays size={18} color={ACCENT.green} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>Best fit today</Text>
            <Text style={[styles.subtitle, { color: muted }]}>
              {todayEventCount > 0
                ? `Using ${todayEventCount} calendar event${todayEventCount === 1 ? '' : 's'}, habit meaning and your rhythm`
                : 'Open calendar — flexible sessions can use your rhythm, but not every habit needs a clock time'}
            </Text>
          </View>
          <TouchableOpacity onPress={onManageCalendarsPress} hitSlop={10}>
            <ChevronRight size={18} color={muted} />
          </TouchableOpacity>
        </View>

        {isLoading && topPicks.length === 0 ? (
          <ActivityIndicator color={ACCENT.green} style={{ marginVertical: 12 }} />
        ) : topPicks.length === 0 ? (
          <Text style={[styles.empty, { color: muted }]}>Nothing needs timing right now.</Text>
        ) : (
          <View style={styles.list}>
            {topPicks.map((rec) => {
              const isScheduled = rec.timingKind === 'scheduled';
              const isHealthProgress = rec.healthMetric === 'steps';
              return (
                <View
                  key={rec.habitId}
                  style={[styles.row, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}
                >
                  <View style={styles.timeCol}>
                    {isScheduled ? (
                      <Clock3 size={14} color={ACCENT.green} />
                    ) : isHealthProgress ? (
                      <HeartPulse size={14} color={ACCENT.health} />
                    ) : (
                      <Sparkles size={14} color={ACCENT.blue} />
                    )}
                    <Text
                      style={[styles.timeText, { color: isScheduled ? colors.text : isHealthProgress ? ACCENT.health : ACCENT.blue }]}
                      numberOfLines={3}
                    >
                      {rec.timeLabel}
                    </Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={[styles.habitTitle, { color: colors.text }]} numberOfLines={1}>
                      {rec.habitTitle}
                    </Text>
                    <Text style={[styles.reason, { color: muted }]} numberOfLines={3}>
                      {rec.reasoning}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  healthCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  healthIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthCopy: {
    flex: 1,
    minWidth: 0,
  },
  healthTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  healthDetail: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  healthCta: {
    minHeight: 40,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  healthCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
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
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT.blue,
    borderRadius: 12,
    paddingVertical: 12,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  list: {
    gap: 8,
  },
  row: {
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  timeCol: {
    alignItems: 'center',
    width: 102,
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  habitTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  reason: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  empty: {
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 4,
  },
});
