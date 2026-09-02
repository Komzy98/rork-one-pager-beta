import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  CalendarDays,
  ChefHat,
  ChevronRight,
  Clock3,
  Compass,
  MapPin,
  MoreHorizontal,
  Plus,
  Sparkles,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { useDiscoverLifeContext } from '@/hooks/useDiscoverLifeContext';
import { floatingTabBarScrollPadding } from '@/constants/tabBarLayout';
import { formatDistanceKm, getEventCountdownLabel } from '@/utils/eventDiscovery';
import type { DiscoverFeedbackReason, DiscoverOpenWindow, DiscoverOpportunity } from '@/utils/discoverLifeEngine';

type Mode = 'For You' | 'Open Time' | 'Near You';
const MODES: Mode[] = ['For You', 'Open Time', 'Near You'];

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function isInsideWindow(item: DiscoverOpportunity, window: DiscoverOpenWindow) {
  if (item.startsAt) {
    const end = item.startsAt.getTime() + (item.durationMinutes ?? 90) * 60_000;
    return item.startsAt.getTime() >= window.start.getTime() && end <= window.end.getTime();
  }
  return (item.durationMinutes ?? 60) <= window.durationMinutes;
}

export default function DiscoverFocusedScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const data = useDiscoverLifeContext();
  const [mode, setMode] = useState<Mode>('For You');
  const [refreshing, setRefreshing] = useState(false);

  const surface = isDark ? '#15171C' : '#FFFFFF';
  const subtle = isDark ? '#1C1F25' : '#F4F5F7';
  const border = isDark ? '#292D36' : '#E7E9EE';

  const isNewPossibility = useCallback((item: DiscoverOpportunity) => {
    if (item.kind === 'event') return !data.saved.isSaved(item.id);
    if (item.kind === 'media') return true;
    if (item.kind === 'recipe') {
      return Boolean(data.recipeSignal && item.id === data.recipeSignal.id && !data.recipeSignal.saved && data.recipeSignal.cookedCount === 0);
    }
    return false;
  }, [data.recipeSignal, data.saved]);

  const possibilities = useMemo(
    () => data.engine.ranked.filter(isNewPossibility),
    [data.engine.ranked, isNewPossibility],
  );

  const hero = possibilities[0] ?? null;
  const alternatives = possibilities.slice(1, 6);
  const nearby = useMemo(
    () => data.engine.eventPicks.filter(isNewPossibility).slice(0, 12),
    [data.engine.eventPicks, isNewPossibility],
  );

  const tune = useCallback((item: DiscoverOpportunity) => {
    const apply = (reason: DiscoverFeedbackReason) => data.feedback.dismiss(item.key, item.kind, reason);
    const choices: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }[] = [
      { text: 'Not for me', onPress: () => apply('not_for_me') },
      { text: 'Bad timing', onPress: () => apply('bad_timing') },
    ];
    if (item.kind === 'event') {
      choices.push({ text: 'Too far', onPress: () => apply('too_far') });
      choices.push({ text: 'Too expensive', onPress: () => apply('too_expensive') });
    }
    choices.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Tune this recommendation', item.title, choices);
  }, [data.feedback]);

  const open = useCallback((item: DiscoverOpportunity) => {
    data.feedback.markPositive(item.key, item.kind);
    router.push(item.route as never);
  }, [data.feedback]);

  const add = useCallback((item: DiscoverOpportunity) => {
    data.feedback.markPositive(item.key, item.kind);
    if (item.kind === 'event' && item.event) {
      void data.saved.toggleSaved(item.event);
      return;
    }
    open(item);
  }, [data.feedback, data.saved, open]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await data.refresh(); } finally { setRefreshing(false); }
  }, [data]);

  const dayLabel = data.lifeContext.now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: floatingTabBarScrollPadding(insets.bottom) }]}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>DISCOVER</Text><Text style={[styles.date, { color: colors.textSecondary }]}>{dayLabel}{data.areaLabel ? ` · ${data.areaLabel}` : ''}</Text></View><Compass size={24} color={colors.primary} /></View>
        <Text style={[styles.title, { color: colors.text }]}>Add something good to your life.</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Only new possibilities belong here. Things you’ve already chosen move to My Life.</Text>
      </View>

      <View style={[styles.modeBar, { backgroundColor: subtle }]}>
        {MODES.map((item) => {
          const selected = mode === item;
          return <TouchableOpacity key={item} onPress={() => setMode(item)} style={[styles.modeButton, selected && { backgroundColor: surface }]}><Text style={[styles.modeText, { color: selected ? colors.text : colors.textSecondary }]}>{item}</Text></TouchableOpacity>;
        })}
      </View>

      {mode === 'For You' ? (
        <>
          {data.isLoading && possibilities.length === 0 ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.textSecondary }]}>Finding a few things genuinely worth showing you…</Text></View> : null}

          {hero ? (
            <View style={styles.heroWrap}>
              <Text style={[styles.sectionKicker, { color: colors.textSecondary }]}>ONE PAGER PICK</Text>
              <TouchableOpacity activeOpacity={0.94} onPress={() => open(hero)} style={[styles.heroCard, { backgroundColor: '#111722' }]}> 
                {hero.image ? (
                  <ImageBackground source={{ uri: hero.image }} style={styles.heroImage} imageStyle={styles.heroImageRadius}>
                    <LinearGradient colors={['rgba(4,7,13,0.05)', 'rgba(4,7,13,0.92)']} style={styles.heroGradient}>
                      <View style={styles.heroTop}><View style={styles.heroChip}><Sparkles size={12} color="#FFFFFF" /><Text style={styles.heroChipText}>{hero.eyebrow}</Text></View><TouchableOpacity onPress={(event) => { event.stopPropagation?.(); tune(hero); }} style={styles.moreButton}><MoreHorizontal size={20} color="#FFFFFF" /></TouchableOpacity></View>
                      <View><Text style={styles.heroTitle}>{hero.title}</Text><Text style={styles.heroMeta}>{hero.subtitle}</Text>{hero.reasons.slice(0, 2).map((reason) => <View key={reason} style={styles.reasonRow}><Sparkles size={12} color="rgba(255,255,255,0.85)" /><Text style={styles.reasonText}>{reason}</Text></View>)}</View>
                    </LinearGradient>
                  </ImageBackground>
                ) : (
                  <LinearGradient colors={[hero.accent, '#10141C']} style={styles.heroFallback}><Sparkles size={25} color="#FFFFFF" /><View><Text style={styles.heroTitle}>{hero.title}</Text><Text style={styles.heroMeta}>{hero.subtitle}</Text></View></LinearGradient>
                )}
                <View style={styles.heroActions}><TouchableOpacity onPress={() => add(hero)} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>{hero.kind === 'event' ? <Plus size={17} color="#FFFFFF" /> : <ArrowRight size={17} color="#FFFFFF" />}<Text style={styles.primaryButtonText}>{hero.kind === 'event' ? 'Add to my life' : hero.actionLabel}</Text></TouchableOpacity><TouchableOpacity onPress={() => open(hero)} style={[styles.secondaryButton, { backgroundColor: isDark ? '#242832' : '#EEF0F4' }]}><Text style={[styles.secondaryButtonText, { color: colors.text }]}>Details</Text></TouchableOpacity></View>
              </TouchableOpacity>
            </View>
          ) : !data.isLoading ? (
            <View style={[styles.empty, { backgroundColor: surface, borderColor: border }]}><Sparkles size={25} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing strong enough right now</Text><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Discover is allowed to be quiet. Pull to refresh later or explore a category below.</Text></View>
          ) : null}

          {alternatives.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>A few more worth considering</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Not obligations. Just possibilities that earned a place.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                {alternatives.map((item) => (
                  <TouchableOpacity key={item.key} activeOpacity={0.9} onPress={() => open(item)} style={[styles.card, { backgroundColor: surface, borderColor: border }]}> 
                    {item.image ? <Image source={{ uri: item.image }} style={styles.cardImage} /> : <LinearGradient colors={[`${item.accent}33`, `${item.accent}0D`]} style={styles.cardImageFallback}>{item.kind === 'recipe' ? <ChefHat size={24} color={item.accent} /> : <Sparkles size={24} color={item.accent} />}</LinearGradient>}
                    <View style={styles.cardBody}><Text style={[styles.cardKicker, { color: item.accent }]}>{item.eyebrow}</Text><Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text><Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={2}>{item.subtitle}</Text>{item.reasons[0] ? <Text style={[styles.cardReason, { color: colors.textSecondary }]} numberOfLines={2}>{item.reasons[0]}</Text> : null}</View>
                    <TouchableOpacity onPress={(event) => { event.stopPropagation?.(); tune(item); }} style={styles.inlineMore}><MoreHorizontal size={18} color={colors.textSecondary} /></TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore</Text>
            <View style={[styles.exploreList, { backgroundColor: surface, borderColor: border }]}>
              {[
                { label: 'Events', note: data.areaLabel ? `Around ${data.areaLabel}` : 'Things happening near you', route: '/(tabs)/events', icon: MapPin },
                { label: 'Watch', note: 'New films and series', route: '/(tabs)/shows', icon: Sparkles },
                { label: 'Food', note: 'Recipes and places to try', route: '/(tabs)/cooking', icon: ChefHat },
                { label: 'Learning', note: 'Books, ideas and courses', route: '/(tabs)/learning', icon: Compass },
              ].map((item, index) => {
                const Icon = item.icon;
                return <TouchableOpacity key={item.label} onPress={() => router.push(item.route as never)} style={[styles.exploreRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}><View style={[styles.exploreIcon, { backgroundColor: subtle }]}><Icon size={19} color={colors.primary} /></View><View style={styles.exploreCopy}><Text style={[styles.exploreTitle, { color: colors.text }]}>{item.label}</Text><Text style={[styles.exploreMeta, { color: colors.textSecondary }]}>{item.note}</Text></View><ChevronRight size={17} color={colors.textSecondary} /></TouchableOpacity>;
              })}
            </View>
          </View>
        </>
      ) : null}

      {mode === 'Open Time' ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>What could fit your free time?</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Existing tasks and routines stay in My Life. These are only new possibilities that fit the gap.</Text>
          {data.lifeContext.openWindows.slice(0, 7).map((window) => {
            const picks = possibilities.filter((item) => isInsideWindow(item, window)).slice(0, 3);
            return (
              <View key={window.id} style={[styles.windowCard, { backgroundColor: surface, borderColor: border }]}>
                <View style={styles.windowHeader}><View><Text style={[styles.windowTitle, { color: colors.text }]}>{window.label}</Text><Text style={[styles.windowMeta, { color: colors.textSecondary }]}>{window.rangeLabel} · {durationLabel(window.durationMinutes)}</Text></View><CalendarDays size={20} color={colors.primary} /></View>
                {picks.length === 0 ? <Text style={[styles.windowEmpty, { color: colors.textSecondary }]}>Nothing new is strong enough for this window yet.</Text> : picks.map((item, index) => <TouchableOpacity key={item.key} onPress={() => open(item)} style={[styles.windowPick, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}><View style={[styles.windowDot, { backgroundColor: item.accent }]} /><View style={styles.exploreCopy}><Text style={[styles.windowPickTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text><Text style={[styles.windowPickMeta, { color: colors.textSecondary }]} numberOfLines={1}>{item.subtitle}</Text></View><ChevronRight size={16} color={colors.textSecondary} /></TouchableOpacity>)}
              </View>
            );
          })}
        </View>
      ) : null}

      {mode === 'Near You' ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Near {data.areaLabel ?? 'you'}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Nearby events you haven’t already saved.</Text>
          <View style={[styles.nearList, { backgroundColor: surface, borderColor: border }]}>
            {nearby.length === 0 ? <View style={styles.nearEmpty}><MapPin size={22} color={colors.primary} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No unsaved nearby events are strong enough right now.</Text></View> : nearby.map((item, index) => {
              const event = item.event;
              if (!event) return null;
              return <TouchableOpacity key={item.key} onPress={() => open(item)} style={[styles.nearRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}>{event.image ? <Image source={{ uri: event.image }} style={styles.nearImage} /> : <View style={[styles.nearImage, styles.nearImageFallback, { backgroundColor: subtle }]}><MapPin size={18} color={colors.primary} /></View>}<View style={styles.exploreCopy}><Text style={[styles.nearKicker, { color: colors.primary }]}>{getEventCountdownLabel(event).toUpperCase()}</Text><Text style={[styles.nearTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text><Text style={[styles.nearMeta, { color: colors.textSecondary }]} numberOfLines={1}>{[event.time, event.venue, typeof event.distanceKm === 'number' ? formatDistanceKm(event.distanceKm) : null].filter(Boolean).join(' · ')}</Text></View><TouchableOpacity onPress={(pressEvent) => { pressEvent.stopPropagation?.(); add(item); }} style={[styles.smallAdd, { backgroundColor: subtle }]}><Plus size={17} color={colors.primary} /></TouchableOpacity></TouchableOpacity>;
            })}
          </View>
        </View>
      ) : null}

      <TouchableOpacity onPress={() => router.push('/(tabs)/my-life' as never)} style={[styles.myLifeLink, { borderColor: border }]}>
        <View><Text style={[styles.myLifeTitle, { color: colors.text }]}>Looking for something you already saved?</Text><Text style={[styles.myLifeMeta, { color: colors.textSecondary }]}>It has moved to My Life — where commitments belong.</Text></View><ChevronRight size={18} color={colors.primary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 27 },
  header: { gap: 7 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.8 },
  date: { marginTop: 3, fontSize: 12, fontWeight: '600' },
  title: { marginTop: 8, fontSize: 36, lineHeight: 40, fontWeight: '800', letterSpacing: -1.2, maxWidth: 340 },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: '500', maxWidth: 350 },
  modeBar: { flexDirection: 'row', padding: 4, borderRadius: 15 },
  modeButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  modeText: { fontSize: 12, fontWeight: '700' },
  loading: { paddingVertical: 45, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, textAlign: 'center', maxWidth: 270 },
  heroWrap: { gap: 10 },
  sectionKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  heroCard: { borderRadius: 25, overflow: 'hidden' },
  heroImage: { height: 450 },
  heroImageRadius: { borderRadius: 25 },
  heroGradient: { flex: 1, padding: 18, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroChip: { flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: 'rgba(3,7,15,0.58)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, maxWidth: '80%' },
  heroChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  moreButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(3,7,15,0.55)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#FFFFFF', fontSize: 31, lineHeight: 35, fontWeight: '800', letterSpacing: -0.8 },
  heroMeta: { marginTop: 8, color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  reasonRow: { marginTop: 9, flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  reasonText: { flex: 1, color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  heroFallback: { height: 330, padding: 22, justifyContent: 'space-between' },
  heroActions: { padding: 12, flexDirection: 'row', gap: 9, backgroundColor: '#11141A' },
  primaryButton: { flex: 1, height: 52, borderRadius: 17, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryButton: { height: 52, paddingHorizontal: 18, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 14, fontWeight: '800' },
  empty: { borderWidth: 1, borderRadius: 21, padding: 24, gap: 8, alignItems: 'flex-start' },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyText: { fontSize: 13, lineHeight: 19 },
  section: { gap: 9 },
  sectionTitle: { fontSize: 25, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6 },
  sectionSubtitle: { fontSize: 13, lineHeight: 19, maxWidth: 340 },
  rail: { gap: 12, paddingVertical: 6, paddingRight: 20 },
  card: { width: 245, borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  cardImage: { width: '100%', height: 150 },
  cardImageFallback: { width: '100%', height: 125, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 14 },
  cardKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  cardTitle: { marginTop: 5, fontSize: 18, lineHeight: 22, fontWeight: '800' },
  cardMeta: { marginTop: 6, fontSize: 12, lineHeight: 17 },
  cardReason: { marginTop: 9, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  inlineMore: { position: 'absolute', right: 9, top: 9, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  exploreList: { borderWidth: 1, borderRadius: 19, overflow: 'hidden' },
  exploreRow: { minHeight: 66, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  exploreIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exploreCopy: { flex: 1, minWidth: 0 },
  exploreTitle: { fontSize: 15, fontWeight: '750' as '700' },
  exploreMeta: { marginTop: 2, fontSize: 12 },
  windowCard: { borderWidth: 1, borderRadius: 19, padding: 15, gap: 10 },
  windowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  windowTitle: { fontSize: 18, fontWeight: '800' },
  windowMeta: { marginTop: 3, fontSize: 12 },
  windowEmpty: { paddingVertical: 10, fontSize: 13 },
  windowPick: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  windowDot: { width: 8, height: 8, borderRadius: 4 },
  windowPickTitle: { fontSize: 14, fontWeight: '700' },
  windowPickMeta: { marginTop: 2, fontSize: 11 },
  nearList: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  nearRow: { minHeight: 88, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  nearImage: { width: 67, height: 67, borderRadius: 13 },
  nearImageFallback: { alignItems: 'center', justifyContent: 'center' },
  nearKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  nearTitle: { marginTop: 3, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  nearMeta: { marginTop: 4, fontSize: 11 },
  nearEmpty: { padding: 22, flexDirection: 'row', gap: 10, alignItems: 'center' },
  smallAdd: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  myLifeLink: { borderTopWidth: 1, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  myLifeTitle: { fontSize: 15, fontWeight: '800' },
  myLifeMeta: { marginTop: 3, fontSize: 12, lineHeight: 18, maxWidth: 290 },
});