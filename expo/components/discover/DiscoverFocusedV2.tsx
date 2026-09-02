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
  Compass,
  MapPin,
  MoreHorizontal,
  Plus,
  Trophy,
  Tv,
  BookOpen,
} from 'lucide-react-native';

import { useSharedDiscoverLifeContext } from '@/contexts/DiscoverLifeContextProvider';
import { useTheme } from '@/hooks/useTheme';
import { floatingTabBarScrollPadding } from '@/constants/tabBarLayout';
import { OP_DOMAIN, OP_LAYOUT, OP_RADIUS, OP_SPACING, OP_TYPE } from '@/constants/onePagerDesign';
import { formatDistanceKm, getEventCountdownLabel } from '@/utils/eventDiscovery';
import type { DiscoverFeedbackReason, DiscoverOpenWindow, DiscoverOpportunity } from '@/utils/discoverLifeEngine';
import {
  ActionButton,
  ContextCue,
  ListRow,
  PageHeader,
  SectionHeader,
  SegmentedControl,
  StatusPill,
  SurfaceCard,
} from '@/components/ui/OnePagerUI';

type Mode = 'For You' | 'Open Time' | 'Near You';
const MODES: readonly Mode[] = ['For You', 'Open Time', 'Near You'];

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

function opportunityIcon(kind: DiscoverOpportunity['kind'], color: string) {
  if (kind === 'event') return <MapPin size={18} color={color} />;
  if (kind === 'recipe') return <ChefHat size={18} color={color} />;
  return <Tv size={18} color={color} />;
}

export default function DiscoverFocusedV2() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const data = useSharedDiscoverLifeContext();
  const [mode, setMode] = useState<Mode>('For You');
  const [refreshing, setRefreshing] = useState(false);

  const isNewPossibility = useCallback((item: DiscoverOpportunity) => {
    if (item.kind === 'event') return !data.saved.isSaved(item.id);
    if (item.kind === 'media') return true;
    if (item.kind === 'recipe') {
      return Boolean(
        data.recipeSignal
        && item.id === data.recipeSignal.id
        && !data.recipeSignal.saved
        && data.recipeSignal.cookedCount === 0,
      );
    }
    return false;
  }, [data.recipeSignal, data.saved]);

  const possibilities = useMemo(() => data.engine.ranked.filter(isNewPossibility), [data.engine.ranked, isNewPossibility]);
  const hero = possibilities[0] ?? null;
  const alternatives = possibilities.slice(1, 5);
  const nearby = useMemo(() => data.engine.eventPicks.filter(isNewPossibility).slice(0, 10), [data.engine.eventPicks, isNewPossibility]);

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
    try {
      await data.refresh();
    } finally {
      setRefreshing(false);
    }
  }, [data]);

  const dayLabel = data.lifeContext.now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  const meta = [dayLabel, data.areaLabel].filter(Boolean).join(' · ');

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{
        paddingHorizontal: OP_LAYOUT.screenPadding,
        paddingTop: insets.top + OP_SPACING.md,
        paddingBottom: floatingTabBarScrollPadding(insets.bottom),
        gap: OP_LAYOUT.sectionGap,
      }}
    >
      <PageHeader
        eyebrow="Discover"
        meta={meta}
        title="Something worth adding to your life."
        subtitle="New possibilities only. Once you choose something, it belongs in My Life."
        right={<View style={[styles.headerIcon, { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F4F8' }]}><Compass size={20} color={colors.primary} /></View>}
      />

      <SegmentedControl items={MODES} value={mode} onChange={setMode} />

      {mode === 'For You' ? (
        <>
          {data.isLoading && possibilities.length === 0 ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>Finding a few things genuinely worth showing you…</Text>
            </View>
          ) : null}

          {hero ? (
            <View style={styles.section}>
              <SectionHeader title="For you" subtitle="One recommendation gets the spotlight. It has to earn it." />
              <TouchableOpacity activeOpacity={0.93} onPress={() => open(hero)}>
                <SurfaceCard variant="hero" style={styles.heroCard}>
                  {hero.image ? (
                    <ImageBackground source={{ uri: hero.image }} style={styles.heroImage} imageStyle={styles.heroImageRadius}>
                      <LinearGradient colors={['rgba(5,8,14,0.02)', 'rgba(5,8,14,0.88)']} style={styles.heroGradient}>
                        <View style={styles.heroTop}>
                          <StatusPill label={hero.eyebrow} tone="info" accent="#FFFFFF" />
                          <TouchableOpacity onPress={(event) => { event.stopPropagation?.(); tune(hero); }} style={styles.moreButton} accessibilityLabel="Tune recommendation">
                            <MoreHorizontal size={20} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                        <View>
                          <Text style={styles.heroTitle}>{hero.title}</Text>
                          <Text style={styles.heroMeta}>{hero.subtitle}</Text>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  ) : (
                    <View style={[styles.heroFallback, { backgroundColor: isDark ? colors.surfaceSecondary : '#F4F7FC' }]}>
                      <View style={[styles.fallbackIcon, { backgroundColor: `${hero.accent}16` }]}>{opportunityIcon(hero.kind, hero.accent)}</View>
                      <Text style={[OP_TYPE.heroTitle, { color: colors.text }]}>{hero.title}</Text>
                      <Text style={[OP_TYPE.body, { color: colors.textSecondary }]}>{hero.subtitle}</Text>
                    </View>
                  )}

                  <View style={styles.heroBody}>
                    {hero.reasons[0] ? <ContextCue label="Why this fits" text={hero.reasons[0]} /> : null}
                    <View style={styles.actions}>
                      <View style={styles.primaryAction}>
                        <ActionButton
                          label={hero.kind === 'event' ? 'Add to my life' : hero.actionLabel}
                          onPress={() => add(hero)}
                          icon={hero.kind === 'event' ? <Plus size={16} color={colors.textInverse} /> : <ArrowRight size={16} color={colors.textInverse} />}
                        />
                      </View>
                      <ActionButton label="Details" kind="secondary" onPress={() => open(hero)} />
                    </View>
                  </View>
                </SurfaceCard>
              </TouchableOpacity>
            </View>
          ) : !data.isLoading ? (
            <SurfaceCard>
              <Text style={[OP_TYPE.cardTitle, { color: colors.text }]}>Nothing strong enough right now</Text>
              <Text style={[OP_TYPE.body, styles.emptyText, { color: colors.textSecondary }]}>Discover is allowed to be quiet. That protects trust in the recommendations.</Text>
            </SurfaceCard>
          ) : null}

          {alternatives.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Worth considering" subtitle="A short list, not an endless feed." />
              <SurfaceCard variant="list">
                {alternatives.map((item, index) => (
                  <View key={item.key}>
                    <ListRow
                      icon={opportunityIcon(item.kind, item.accent)}
                      eyebrow={item.eyebrow}
                      title={item.title}
                      detail={[item.subtitle, item.reasons[0]].filter(Boolean).join(' · ')}
                      accent={item.accent}
                      onPress={() => open(item)}
                      divided={index > 0}
                    />
                    <TouchableOpacity onPress={() => tune(item)} style={styles.inlineMore} accessibilityLabel={`Tune ${item.title}`}>
                      <MoreHorizontal size={17} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </SurfaceCard>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title="Explore" subtitle="Go directly to a part of life when you want to browse." />
            <SurfaceCard variant="list">
              {[
                { label: 'Events', note: data.areaLabel ? `Around ${data.areaLabel}` : 'Things happening near you', route: '/(tabs)/events', icon: MapPin, accent: OP_DOMAIN.events },
                { label: 'Watch', note: 'New films and series', route: '/(tabs)/shows', icon: Tv, accent: OP_DOMAIN.watch },
                { label: 'Sports', note: 'Teams, fixtures and live sport', route: '/(tabs)/sports', icon: Trophy, accent: OP_DOMAIN.sports },
                { label: 'Food', note: 'Recipes and places to try', route: '/(tabs)/cooking', icon: ChefHat, accent: OP_DOMAIN.cooking },
                { label: 'Learning', note: 'Books, ideas and courses', route: '/(tabs)/learning', icon: BookOpen, accent: OP_DOMAIN.learning },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <ListRow
                    key={item.label}
                    icon={<Icon size={18} color={item.accent} />}
                    title={item.label}
                    detail={item.note}
                    onPress={() => router.push(item.route as never)}
                    divided={index > 0}
                  />
                );
              })}
            </SurfaceCard>
          </View>
        </>
      ) : null}

      {mode === 'Open Time' ? (
        <View style={styles.section}>
          <SectionHeader title="What fits your free time?" subtitle="Only new possibilities appear here; existing responsibilities stay in My Life." />
          {data.lifeContext.openWindows.slice(0, 7).map((window) => {
            const picks = possibilities.filter((item) => isInsideWindow(item, window)).slice(0, 3);
            return (
              <SurfaceCard key={window.id} variant="list">
                <View style={styles.windowHeader}>
                  <View style={styles.windowCopy}>
                    <Text style={[OP_TYPE.cardTitle, { color: colors.text }]}>{window.label}</Text>
                    <Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>{window.rangeLabel} · {durationLabel(window.durationMinutes)}</Text>
                  </View>
                  <CalendarDays size={19} color={colors.primary} />
                </View>
                {picks.length === 0 ? (
                  <Text style={[OP_TYPE.meta, styles.windowEmpty, { color: colors.textSecondary }]}>Nothing new is strong enough for this window yet.</Text>
                ) : picks.map((item, index) => (
                  <ListRow
                    key={item.key}
                    icon={opportunityIcon(item.kind, item.accent)}
                    title={item.title}
                    detail={item.subtitle}
                    accent={item.accent}
                    onPress={() => open(item)}
                    divided={index > 0}
                  />
                ))}
              </SurfaceCard>
            );
          })}
        </View>
      ) : null}

      {mode === 'Near You' ? (
        <View style={styles.section}>
          <SectionHeader title={`Near ${data.areaLabel ?? 'you'}`} subtitle="Nearby events you have not already saved." />
          <SurfaceCard variant="list">
            {nearby.length === 0 ? (
              <View style={styles.nearEmpty}>
                <MapPin size={21} color={colors.primary} />
                <Text style={[OP_TYPE.body, { color: colors.textSecondary }]}>No nearby event is strong enough right now.</Text>
              </View>
            ) : nearby.map((item, index) => {
              const event = item.event;
              if (!event) return null;
              const distance = typeof event.distanceKm === 'number' ? formatDistanceKm(event.distanceKm) : null;
              return (
                <TouchableOpacity key={item.key} onPress={() => open(item)} style={[styles.nearRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  {event.image ? <Image source={{ uri: event.image }} style={styles.nearImage} /> : <View style={[styles.nearImage, styles.nearFallback, { backgroundColor: isDark ? colors.surfaceSecondary : '#F2F4F7' }]}><MapPin size={18} color={OP_DOMAIN.events} /></View>}
                  <View style={styles.nearCopy}>
                    <Text style={[OP_TYPE.eyebrow, { color: OP_DOMAIN.events }]}>{getEventCountdownLabel(event).toUpperCase()}</Text>
                    <Text style={[OP_TYPE.cardTitle, styles.nearTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                    <Text style={[OP_TYPE.meta, { color: colors.textSecondary }]} numberOfLines={1}>{[item.subtitle, distance].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <ChevronRight size={17} color={colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </SurfaceCard>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerIcon: { width: 40, height: 40, borderRadius: OP_RADIUS.medium, alignItems: 'center', justifyContent: 'center' },
  loading: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: OP_SPACING.xs },
  section: { gap: OP_SPACING.sm },
  heroCard: { padding: 0, overflow: 'hidden' },
  heroImage: { height: 300 },
  heroImageRadius: { borderTopLeftRadius: OP_RADIUS.hero - 1, borderTopRightRadius: OP_RADIUS.hero - 1 },
  heroGradient: { flex: 1, padding: OP_SPACING.md, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: OP_SPACING.sm },
  moreButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.34)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { ...OP_TYPE.heroTitle, color: '#FFFFFF', fontSize: 26, lineHeight: 31 },
  heroMeta: { ...OP_TYPE.body, color: 'rgba(255,255,255,0.82)', marginTop: 5 },
  heroFallback: { minHeight: 190, padding: OP_SPACING.lg, justifyContent: 'flex-end', gap: OP_SPACING.xs },
  fallbackIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: OP_SPACING.xs },
  heroBody: { padding: OP_SPACING.md, gap: OP_SPACING.sm },
  actions: { flexDirection: 'row', gap: OP_SPACING.xs },
  primaryAction: { flex: 1 },
  emptyText: { marginTop: OP_SPACING.xs },
  inlineMore: { position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  windowHeader: { minHeight: 64, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: OP_SPACING.sm },
  windowCopy: { flex: 1, minWidth: 0 },
  windowEmpty: { paddingHorizontal: 14, paddingBottom: 14 },
  nearEmpty: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: OP_SPACING.xs, padding: OP_SPACING.md },
  nearRow: { minHeight: 88, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  nearImage: { width: 64, height: 64, borderRadius: 13 },
  nearFallback: { alignItems: 'center', justifyContent: 'center' },
  nearCopy: { flex: 1, minWidth: 0 },
  nearTitle: { marginTop: 2 },
});
