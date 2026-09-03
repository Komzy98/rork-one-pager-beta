import React, { useEffect, useMemo, useState } from 'react';
import {
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Clock3, MapPin, Plus, Sparkles, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useSharedDiscoverLifeContext } from '@/contexts/DiscoverLifeContextProvider';
import { useTheme } from '@/hooks/useTheme';
import { formatDistanceKm, parseEventStartDateTime } from '@/utils/eventDiscovery';
import { selectTimelineEveningOpportunity } from '@/utils/timelineEveningOpportunity';

function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatClock(date: Date) {
  return date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function TodayEveningOpportunity() {
  const data = useSharedDiscoverLifeContext();
  const { colors, isDark } = useTheme();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const hasExistingEveningPlan = useMemo(
    () => data.saved.upcomingSaved.some((event) => {
      const start = parseEventStartDateTime(event);
      if (!start || !sameLocalDay(start, now)) return false;
      return start.getHours() >= 16 && start.getHours() < 23;
    }),
    [data.saved.upcomingSaved, now],
  );

  const pick = useMemo(
    () => selectTimelineEveningOpportunity({
      context: data.lifeContext,
      engine: data.engine,
      isSaved: data.saved.isSaved,
      hasExistingEveningPlan,
      now,
    }),
    [data.lifeContext, data.engine, data.saved.isSaved, hasExistingEveningPlan, now],
  );

  if (!pick) return null;

  const item = pick.opportunity;
  const event = item.event;
  if (!event) return null;

  const distance = typeof event.distanceKm === 'number' ? formatDistanceKm(event.distanceKm) : null;
  const fitReason = item.reasons.find((reason) => !/open\s*·|is open/i.test(reason)) ?? item.reasons[0] ?? 'Strong fit for you';
  const openLabel = `${formatClock(pick.openStart)} – ${formatClock(pick.openEnd)}`;
  const surface = isDark ? '#151922' : '#FFFFFF';
  const border = isDark ? '#2B3240' : '#DDE4F0';

  const open = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    data.feedback.markPositive(item.key, item.kind);
    router.push(item.route as never);
  };

  const add = () => {
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    data.feedback.markPositive(item.key, item.kind);
    void data.saved.toggleSaved(event);
  };

  const notTonight = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    data.feedback.dismiss(item.key, item.kind, 'bad_timing');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <View>
          <Text style={[styles.kicker, { color: colors.primary }]}>A FREE EVENING FIT</Text>
          <Text style={[styles.heading, { color: colors.text }]}>Your evening is genuinely open.</Text>
        </View>
        <TouchableOpacity onPress={notTonight} style={[styles.dismiss, { backgroundColor: isDark ? '#222833' : '#EEF2F7' }]} accessibilityLabel="Not tonight">
          <X size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        onPress={open}
        style={[styles.card, { backgroundColor: surface, borderColor: border }]}
      >
        {item.image ? (
          <ImageBackground source={{ uri: item.image }} style={styles.image} imageStyle={styles.imageRadius}>
            <LinearGradient colors={['rgba(8,12,20,0.08)', 'rgba(8,12,20,0.90)']} style={styles.imageGradient}>
              <View style={styles.topChip}>
                <Sparkles size={12} color="#FFFFFF" />
                <Text style={styles.topChipText}>ONE PAGER FOUND A FIT</Text>
              </View>
              <View>
                <Text style={styles.imageTitle}>{item.title}</Text>
                <Text style={styles.imageMeta}>{item.subtitle}</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        ) : (
          <LinearGradient colors={[`${item.accent}30`, isDark ? '#141923' : '#F5F8FF']} style={styles.fallback}>
            <Sparkles size={24} color={item.accent} />
            <Text style={[styles.fallbackTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.fallbackMeta, { color: colors.textSecondary }]}>{item.subtitle}</Text>
          </LinearGradient>
        )}

        <View style={styles.body}>
          <View style={styles.fitRow}>
            <View style={[styles.fitIcon, { backgroundColor: `${colors.primary}14` }]}><Clock3 size={16} color={colors.primary} /></View>
            <View style={styles.fitCopy}>
              <Text style={[styles.fitTitle, { color: colors.text }]}>Fits your open evening</Text>
              <Text style={[styles.fitMeta, { color: colors.textSecondary }]}>{openLabel}</Text>
            </View>
          </View>

          <View style={styles.fitRow}>
            <View style={[styles.fitIcon, { backgroundColor: `${colors.primary}14` }]}><MapPin size={16} color={colors.primary} /></View>
            <View style={styles.fitCopy}>
              <Text style={[styles.fitTitle, { color: colors.text }]}>{fitReason}</Text>
              <Text style={[styles.fitMeta, { color: colors.textSecondary }]}>{[distance, data.areaLabel].filter(Boolean).join(' · ') || 'Near you'}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={add} style={[styles.primary, { backgroundColor: colors.primary }]}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.primaryText}>Add to my life</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={open} style={[styles.secondary, { backgroundColor: isDark ? '#242A34' : '#EEF2F7' }]}>
              <Text style={[styles.secondaryText, { color: colors.text }]}>Details</Text>
              <ArrowRight size={15} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingBottom: 24, gap: 11 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.35 },
  heading: { marginTop: 4, fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.5 },
  dismiss: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' },
  image: { height: 245 },
  imageRadius: { borderTopLeftRadius: 21, borderTopRightRadius: 21 },
  imageGradient: { flex: 1, padding: 16, justifyContent: 'space-between' },
  topChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(6,10,18,0.60)' },
  topChipText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  imageTitle: { color: '#FFFFFF', fontSize: 25, lineHeight: 29, fontWeight: '800', letterSpacing: -0.5 },
  imageMeta: { marginTop: 6, color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  fallback: { minHeight: 180, padding: 18, justifyContent: 'flex-end', gap: 7 },
  fallbackTitle: { fontSize: 24, lineHeight: 28, fontWeight: '800' },
  fallbackMeta: { fontSize: 13, lineHeight: 18 },
  body: { padding: 16, gap: 12 },
  fitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fitIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  fitCopy: { flex: 1 },
  fitTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  fitMeta: { marginTop: 1, fontSize: 11, lineHeight: 16, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 9, marginTop: 3 },
  primary: { flex: 1, height: 48, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondary: { height: 48, paddingHorizontal: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryText: { fontSize: 13, fontWeight: '800' },
});
