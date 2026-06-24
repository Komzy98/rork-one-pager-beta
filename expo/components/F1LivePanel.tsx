import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radio, Flag, Clock3, CalendarDays } from 'lucide-react-native';
import type { F1LiveWeekend } from '@/utils/f1Enrichment';
import { formatSessionDay, formatSessionTime } from '@/utils/f1Enrichment';

const F1_RED = '#F20D18';
const CARD = '#101113';
const CARD_BORDER = 'rgba(255,255,255,0.10)';
const TXT = '#F6F7F9';
const TXT_2 = '#9EA3AD';
const GREEN = '#22C55E';

type Props = {
  live: F1LiveWeekend | undefined;
  isLoading: boolean;
  onCountdownTarget?: string | null;
};

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.timeBox}>
      <Text style={styles.timeValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.timeLabel}>{label}</Text>
    </View>
  );
}

export default function F1LivePanel({ live, isLoading, onCountdownTarget }: Props) {
  const active = live?.activeSession ?? null;
  const next = live?.nextSession ?? live?.sessionForTiming ?? null;
  const countdownIso = active ? null : (next?.dateStart ?? onCountdownTarget ?? null);

  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!countdownIso) return;
    const calc = () => {
      const diff = Math.max(0, new Date(countdownIso).getTime() - Date.now());
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [countdownIso]);

  const sessionLabel = useMemo(() => {
    if (active) {
      const lap = live?.currentLap;
      const type = active.sessionName || active.sessionType;
      return lap ? `${type} · Lap ${lap}` : type;
    }
    if (next) return `Next: ${next.sessionName}`;
    return 'Race weekend';
  }, [active, next, live?.currentLap]);

  if (isLoading && !live) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptySub}>Loading live timing…</Text>
      </View>
    );
  }

  if (!live?.meetingKey) {
    return (
      <View style={styles.empty}>
        <Radio size={28} color={TXT_2} />
        <Text style={styles.emptyTitle}>No race weekend scheduled</Text>
        <Text style={styles.emptySub}>Check the Schedule tab for the full calendar.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.heroCard, active && styles.heroCardLive]}>
        <View style={styles.heroTop}>
          {active ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          ) : (
            <View style={styles.idleBadge}>
              <Clock3 size={12} color={TXT_2} />
              <Text style={styles.idleBadgeText}>OFF TRACK</Text>
            </View>
          )}
          {live.latestFlag ? (
            <View style={styles.flagBadge}>
              <Flag size={11} color="#FBBF24" />
              <Text style={styles.flagText}>{live.latestFlag}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.meetingTitle}>{live.meetingLabel ?? live.countryName}</Text>
        <Text style={styles.sessionSubtitle}>{sessionLabel}</Text>
        {live.circuitShortName ? (
          <Text style={styles.circuitLine}>{live.circuitShortName}</Text>
        ) : null}

        {!active && countdownIso ? (
          <View style={styles.countdownRow}>
            <CountdownUnit value={timeLeft.d} label="DAYS" />
            <CountdownUnit value={timeLeft.h} label="HRS" />
            <CountdownUnit value={timeLeft.m} label="MIN" />
            <CountdownUnit value={timeLeft.s} label="SEC" />
          </View>
        ) : null}
      </View>

      {live.leaderboard.length > 0 ? (
        <View style={styles.leaderBlock}>
          <Text style={styles.sectionTitle}>Timing · Top 10</Text>
          {live.leaderboard.map((row) => (
            <View key={`${row.driverNumber}-${row.position}`} style={styles.leaderRow}>
              <Text style={styles.posCol}>{row.position}</Text>
              <View style={[styles.teamStripe, { backgroundColor: row.teamColor }]} />
              <View style={styles.leaderBody}>
                <Text style={styles.driverName} numberOfLines={1}>
                  {row.driverName}
                </Text>
                <Text style={styles.teamName} numberOfLines={1}>
                  {row.teamName}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {live.sessions.length > 0 ? (
        <View style={styles.timetableBlock}>
          <View style={styles.timetableHeader}>
            <CalendarDays size={14} color={F1_RED} />
            <Text style={styles.sectionTitle}>Weekend timetable</Text>
          </View>
          {live.sessions.map((session) => (
            <View
              key={session.sessionKey}
              style={[styles.sessionRow, session.isLive && styles.sessionRowLive]}
            >
              <View style={styles.sessionDayCol}>
                <Text style={styles.sessionDay}>{formatSessionDay(session.dateStart)}</Text>
                <Text style={styles.sessionTime}>{formatSessionTime(session.dateStart)}</Text>
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionName}>{session.sessionName}</Text>
                <Text style={styles.sessionType}>{session.sessionType}</Text>
              </View>
              {session.isLive ? (
                <View style={styles.sessionLivePill}>
                  <Text style={styles.sessionLiveText}>LIVE</Text>
                </View>
              ) : session.isPast ? (
                <Text style={styles.sessionDone}>Done</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {!active && live.leaderboard.length === 0 && live.sessions.length > 0 ? (
        <Text style={styles.honestEmpty}>
          No session live · {next ? `${next.sessionName} ${formatSessionDay(next.dateStart)} ${formatSessionTime(next.dateStart)}` : 'See timetable above'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  heroCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
  },
  heroCardLive: {
    borderColor: 'rgba(242,13,24,0.55)',
    backgroundColor: 'rgba(242,13,24,0.08)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(242,13,24,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: F1_RED },
  liveBadgeText: { color: F1_RED, fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  idleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  idleBadgeText: { color: TXT_2, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  flagText: { color: '#FBBF24', fontSize: 10, fontWeight: '700' },
  meetingTitle: { color: TXT, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  sessionSubtitle: { color: TXT, fontSize: 15, fontWeight: '600', marginTop: 4 },
  circuitLine: { color: TXT_2, fontSize: 13, marginTop: 2 },
  countdownRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  timeBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  timeValue: { color: TXT, fontSize: 20, fontWeight: '800' },
  timeLabel: { color: TXT_2, fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 0.6 },
  leaderBlock: { gap: 8 },
  sectionTitle: { color: TXT, fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  posCol: { width: 22, color: TXT_2, fontWeight: '800', fontSize: 14, textAlign: 'center' },
  teamStripe: { width: 3, height: 32, borderRadius: 2 },
  leaderBody: { flex: 1, minWidth: 0 },
  driverName: { color: TXT, fontSize: 14, fontWeight: '700' },
  teamName: { color: TXT_2, fontSize: 11, marginTop: 2 },
  timetableBlock: { gap: 8 },
  timetableHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 12,
    gap: 12,
  },
  sessionRowLive: { borderColor: 'rgba(34,197,94,0.45)', backgroundColor: 'rgba(34,197,94,0.06)' },
  sessionDayCol: { width: 72 },
  sessionDay: { color: TXT, fontSize: 12, fontWeight: '700' },
  sessionTime: { color: TXT_2, fontSize: 11, marginTop: 2 },
  sessionInfo: { flex: 1 },
  sessionName: { color: TXT, fontSize: 14, fontWeight: '700' },
  sessionType: { color: TXT_2, fontSize: 11, marginTop: 2 },
  sessionLivePill: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sessionLiveText: { color: GREEN, fontSize: 10, fontWeight: '800' },
  sessionDone: { color: TXT_2, fontSize: 11, fontWeight: '600' },
  honestEmpty: { color: TXT_2, fontSize: 13, lineHeight: 18, textAlign: 'center', paddingVertical: 8 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { color: TXT, fontSize: 16, fontWeight: '700' },
  emptySub: { color: TXT_2, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
});
