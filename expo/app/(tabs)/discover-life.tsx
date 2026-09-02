import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  ArrowUpRight,
  BookOpen,
  Check,
  ChefHat,
  ChevronRight,
  Clapperboard,
  Clock3,
  Dumbbell,
  Flame,
  MapPin,
  Medal,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trophy,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserLocation } from '@/hooks/useUserLocation';
import { usePerCategoryEvents } from '@/hooks/usePerCategoryEvents';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useApp } from '@/hooks/useHabitsStore';
import { floatingTabBarScrollPadding } from '@/constants/tabBarLayout';
import type { LocalEvent } from '@/types/events';

type DiscoverMode = 'For You' | 'Near You' | 'Saved';

type RouteTarget =
  | '/(tabs)/events'
  | '/(tabs)/shows'
  | '/(tabs)/sports'
  | '/(tabs)/learning'
  | '/(tabs)/discover'
  | '/(tabs)/cooking';

type WorldItem = {
  id: string;
  label: string;
  note: string;
  route: RouteTarget;
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  accent: string;
};

const MODES: DiscoverMode[] = ['For You', 'Near You', 'Saved'];

function normalize(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDistance(distanceKm?: number) {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return null;
  if (distanceKm < 1) return `${Math.max(100, Math.round(distanceKm * 1000))} m away`;
  return `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km away`;
}

function scoreEvent(event: LocalEvent, favoriteCategories: string[], interests: string[]) {
  const category = normalize(event.category);
  const searchable = normalize(
    [event.title, event.description, event.category, ...(event.tags ?? [])].join(' '),
  );

  let score = 0;
  if (favoriteCategories.some((item) => category.includes(normalize(item)))) score += 45;
  if (interests.some((item) => searchable.includes(normalize(item)))) score += 28;
  if (event.isHot) score += 10;
  if (event.isFeatured) score += 6;
  if (typeof event.distanceKm === 'number') score += Math.max(0, 20 - event.distanceKm);
  return score;
}

function reasonForEvent(
  event: LocalEvent,
  favoriteCategories: string[],
  interests: string[],
  areaLabel: string | null,
) {
  const category = normalize(event.category);
  const searchable = normalize(
    [event.title, event.description, event.category, ...(event.tags ?? [])].join(' '),
  );

  const categoryMatch = favoriteCategories.find((item) => category.includes(normalize(item)));
  if (categoryMatch) return `Because you like ${titleCase(categoryMatch)}`;

  const interestMatch = interests.find((item) => searchable.includes(normalize(item)));
  if (interestMatch) return `Because you're into ${titleCase(interestMatch)}`;

  const distance = formatDistance(event.distanceKm);
  if (distance) return distance;
  if (areaLabel) return `Near you in ${areaLabel}`;
  return 'Picked around your location';
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  colors,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  colors: { text: string; textSecondary: string; primary: string };
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {action && onAction ? (
        <TouchableOpacity activeOpacity={0.75} onPress={onAction} style={styles.sectionAction}>
          <Text style={[styles.sectionActionText, { color: colors.primary }]}>{action}</Text>
          <ChevronRight size={15} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function EventRailCard({
  event,
  saved,
  onToggle,
  colors,
  isDark,
}: {
  event: LocalEvent;
  saved: boolean;
  onToggle: () => void;
  colors: { text: string; textSecondary: string; primary: string };
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/(root)/event/${event.id}` as any)}
      style={[styles.railCard, { backgroundColor: isDark ? '#16191F' : '#FFFFFF' }]}
    >
      {event.image ? (
        <ImageBackground
          source={{ uri: event.image }}
          style={styles.railImage}
          imageStyle={styles.railImageRadius}
        >
          <LinearGradient colors={['transparent', 'rgba(4,7,14,0.78)']} style={styles.railImageOverlay}>
            <View style={styles.distanceChip}>
              <MapPin size={11} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.distanceChipText}>{formatDistance(event.distanceKm) ?? 'Near you'}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient colors={['#315BCB', '#19233F']} style={styles.railImageFallback}>
          <MapPin size={27} color="#FFFFFF" />
        </LinearGradient>
      )}
      <View style={styles.railBody}>
        <Text style={[styles.railEyebrow, { color: colors.primary }]}>{titleCase(event.category || 'Event')}</Text>
        <Text style={[styles.railTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.railMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {[event.date, event.time].filter(Boolean).join(' · ')}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(pressEvent) => {
            pressEvent.stopPropagation?.();
            onToggle();
          }}
          style={[
            styles.railSave,
            { backgroundColor: saved ? '#E6F7EE' : isDark ? '#272B34' : '#F2F4F7' },
          ]}
        >
          {saved ? <Check size={13} color="#128A50" /> : <Plus size={13} color={colors.text} />}
          <Text style={[styles.railSaveText, { color: saved ? '#128A50' : colors.text }]}>
            {saved ? 'Added' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function NearbyGridCard({ event, colors }: { event: LocalEvent; colors: { text: string; textSecondary: string } }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/(root)/event/${event.id}` as any)}
      style={styles.nearbyGridCard}
    >
      {event.image ? (
        <ImageBackground source={{ uri: event.image }} style={styles.nearbyGridImage} imageStyle={styles.nearbyGridRadius}>
          <LinearGradient colors={['transparent', 'rgba(4,7,14,0.90)']} style={styles.nearbyGridOverlay}>
            <Text style={styles.nearbyGridCategory}>{titleCase(event.category || 'Event')}</Text>
            <Text style={styles.nearbyGridTitle} numberOfLines={3}>{event.title}</Text>
            <Text style={styles.nearbyGridMeta} numberOfLines={2}>
              {[event.date, event.time, formatDistance(event.distanceKm)].filter(Boolean).join(' · ')}
            </Text>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient colors={['#2C56C7', '#162443']} style={styles.nearbyGridImage}>
          <View style={styles.nearbyGridOverlay}>
            <Text style={styles.nearbyGridCategory}>{titleCase(event.category || 'Event')}</Text>
            <Text style={styles.nearbyGridTitle}>{event.title}</Text>
            <Text style={styles.nearbyGridMeta}>{event.date}</Text>
          </View>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

export default function DiscoverLifeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { profile } = useUserProfile();
  const { shows, sports, habitsWithStats } = useApp();
  const { coords, areaLabel, refresh: refreshLocation } = useUserLocation();
  const {
    allEvents,
    source: eventsSource,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = usePerCategoryEvents({
    latitude: coords.latitude,
    longitude: coords.longitude,
    radiusMiles: 30,
    enabled: true,
  });
  const { isSaved, toggleSaved, upcomingSaved } = useSavedEvents();
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<DiscoverMode>('For You');

  const favoriteCategories = profile?.favoriteEventCategories ?? [];
  const interests = profile?.interests ?? [];
  const favoriteTeams = profile?.favoriteTeams ?? [];

  const rankedEvents = useMemo(
    () =>
      [...allEvents].sort(
        (a, b) => scoreEvent(b, favoriteCategories, interests) - scoreEvent(a, favoriteCategories, interests),
      ),
    [allEvents, favoriteCategories, interests],
  );

  const nearestEvents = useMemo(
    () =>
      [...allEvents].sort((a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE)),
    [allEvents],
  );

  const heroEvent = rankedEvents[0] ?? null;
  const forYouRail = rankedEvents.filter((event) => event.id !== heroEvent?.id).slice(0, 7);
  const nearYouGrid = nearestEvents.slice(0, 8);

  const surpriseEvent = useMemo(() => {
    const favoriteSet = new Set(favoriteCategories.map(normalize));
    return (
      rankedEvents.find((event) => !favoriteSet.has(normalize(event.category)) && event.id !== heroEvent?.id) ??
      rankedEvents[3] ??
      null
    );
  }, [rankedEvents, favoriteCategories, heroEvent?.id]);

  const watchingShow = useMemo(
    () => shows.find((show) => show.status === 'Watching') ?? shows.find((show) => show.status === 'Plan to Watch') ?? null,
    [shows],
  );

  const favoriteTeam = favoriteTeams[0] ?? null;
  const teamMatch = useMemo(() => {
    if (!favoriteTeam) return null;
    const name = normalize(favoriteTeam.name);
    return sports.find(
      (match) =>
        match.status !== 'Completed' &&
        (normalize(match.homeTeam).includes(name) || normalize(match.awayTeam).includes(name)),
    ) ?? null;
  }, [sports, favoriteTeam]);

  const strongestHabit = useMemo(() => {
    if (!habitsWithStats.length) return null;
    return [...habitsWithStats].sort((a, b) => b.streak - a.streak)[0] ?? null;
  }, [habitsWithStats]);

  const worldItems = useMemo<WorldItem[]>(
    () => [
      { id: 'shows', label: 'Watch', note: watchingShow?.title ?? 'Shows & films', route: '/(tabs)/shows', icon: Clapperboard, accent: '#7057E8' },
      { id: 'sports', label: 'Sports', note: favoriteTeam?.name ?? 'Teams & fixtures', route: '/(tabs)/sports', icon: Trophy, accent: '#D98B00' },
      { id: 'events', label: 'Events', note: areaLabel ? `Around ${areaLabel}` : 'Things near you', route: '/(tabs)/events', icon: MapPin, accent: '#3262D9' },
      { id: 'habits', label: 'Habits', note: strongestHabit ? `${strongestHabit.streak}-day streak` : 'Build a routine', route: '/(tabs)/discover', icon: Dumbbell, accent: '#0E9B62' },
      { id: 'learning', label: 'Learn', note: interests[0] ? titleCase(interests[0]) : 'Ideas & courses', route: '/(tabs)/learning', icon: BookOpen, accent: '#0D97C8' },
      { id: 'cooking', label: 'Cook', note: 'Ideas for tonight', route: '/(tabs)/cooking', icon: ChefHat, accent: '#EA6A37' },
    ],
    [watchingShow, favoriteTeam, areaLabel, strongestHabit, interests],
  );

  const liveEvents = eventsSource !== 'fallback' && eventsSource !== 'none';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshLocation(), refetchEvents()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshLocation, refetchEvents]);

  const dayContext = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const part = hour < 12 ? 'this morning' : hour < 17 ? 'this afternoon' : 'tonight';
    return areaLabel ? `${areaLabel} · ${part}` : part;
  }, [areaLabel]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: floatingTabBarScrollPadding(insets.bottom) + 42,
        }}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={[styles.headerContext, { color: colors.primary }]}>{dayContext.toUpperCase()}</Text>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Discover</Text>
              <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>What is worth your time right now?</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
              style={[styles.tuneButton, { backgroundColor: isDark ? '#1B1E25' : '#F1F3F7' }]}
            >
              <SlidersHorizontal size={19} color={colors.text} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <View style={[styles.modeControl, { backgroundColor: isDark ? '#171A20' : '#EFF1F5' }]}>
            {MODES.map((item) => {
              const active = mode === item;
              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.8}
                  onPress={() => setMode(item)}
                  style={[
                    styles.modeButton,
                    active && {
                      backgroundColor: isDark ? '#2B303A' : '#FFFFFF',
                      shadowColor: '#000',
                      shadowOpacity: isDark ? 0 : 0.06,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                    },
                  ]}
                >
                  <Text style={[styles.modeText, { color: active ? colors.text : colors.textSecondary }]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {mode === 'For You' ? (
          <>
            <View style={styles.heroSection}>
              {eventsLoading && !heroEvent ? (
                <View style={[styles.heroLoading, { backgroundColor: isDark ? '#171A22' : '#EEF2F7' }]}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.loadingCopy, { color: colors.textSecondary }]}>Finding a strong pick for you…</Text>
                </View>
              ) : heroEvent ? (
                <TouchableOpacity
                  activeOpacity={0.96}
                  onPress={() => router.push(`/(root)/event/${heroEvent.id}` as any)}
                  style={styles.heroCard}
                >
                  {heroEvent.image ? (
                    <ImageBackground source={{ uri: heroEvent.image }} style={styles.heroMedia} imageStyle={styles.heroRadius}>
                      <LinearGradient colors={['rgba(4,7,14,0.02)', 'rgba(4,7,14,0.94)']} style={styles.heroOverlay}>
                        <View style={styles.heroTopRow}>
                          <View style={styles.heroReasonChip}>
                            <Sparkles size={12} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.heroReasonText}>{reasonForEvent(heroEvent, favoriteCategories, interests, areaLabel)}</Text>
                          </View>
                          {heroEvent.isHot ? (
                            <View style={styles.hotChip}>
                              <Flame size={12} color="#FFFFFF" fill="#FFFFFF" />
                              <Text style={styles.hotText}>HOT</Text>
                            </View>
                          ) : null}
                        </View>
                        <View>
                          <Text style={styles.heroKicker}>{liveEvents ? 'ONE PAGER PICK' : 'DISCOVERY PREVIEW'}</Text>
                          <Text style={styles.heroTitle}>{heroEvent.title}</Text>
                          <View style={styles.heroInfoRow}>
                            <Clock3 size={14} color="rgba(255,255,255,0.82)" />
                            <Text style={styles.heroInfo}>{[heroEvent.date, heroEvent.time].filter(Boolean).join(' · ')}</Text>
                          </View>
                          <View style={styles.heroInfoRow}>
                            <MapPin size={14} color="rgba(255,255,255,0.82)" />
                            <Text style={styles.heroInfo} numberOfLines={1}>{[heroEvent.venue, formatDistance(heroEvent.distanceKm)].filter(Boolean).join(' · ')}</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  ) : (
                    <LinearGradient colors={['#3157C8', '#121A30']} style={styles.heroMedia}>
                      <View style={styles.heroOverlay}>
                        <View style={styles.heroReasonChip}>
                          <Sparkles size={12} color="#FFFFFF" />
                          <Text style={styles.heroReasonText}>{reasonForEvent(heroEvent, favoriteCategories, interests, areaLabel)}</Text>
                        </View>
                        <View>
                          <Text style={styles.heroKicker}>ONE PAGER PICK</Text>
                          <Text style={styles.heroTitle}>{heroEvent.title}</Text>
                          <Text style={styles.heroInfo}>{[heroEvent.date, heroEvent.time, heroEvent.venue].filter(Boolean).join(' · ')}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={(pressEvent) => {
                      pressEvent.stopPropagation?.();
                      void toggleSaved(heroEvent);
                    }}
                    style={[styles.heroFloatingAction, { backgroundColor: isSaved(heroEvent.id) ? '#E5F7ED' : '#FFFFFF' }]}
                  >
                    {isSaved(heroEvent.id) ? <Check size={18} color="#128A50" /> : <Plus size={18} color="#111827" />}
                    <Text style={[styles.heroFloatingActionText, { color: isSaved(heroEvent.id) ? '#128A50' : '#111827' }]}>
                      {isSaved(heroEvent.id) ? 'In my life' : 'Add to my life'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/events')}
                  style={[styles.heroEmpty, { backgroundColor: isDark ? '#17213A' : '#EDF3FF' }]}
                >
                  <Sparkles size={27} color={colors.primary} />
                  <Text style={[styles.heroEmptyTitle, { color: colors.text }]}>Give One Pager more to work with</Text>
                  <Text style={[styles.heroEmptyCopy, { color: colors.textSecondary }]}>Follow teams, save events and add interests. Discover gets better as One Pager learns you.</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader
                title="Your next moves"
                subtitle="Three things already connected to your life."
                colors={colors}
              />
              <View style={styles.lifeBento}>
                <TouchableOpacity
                  activeOpacity={0.87}
                  onPress={() => router.push('/(tabs)/shows')}
                  style={[styles.watchCard, { backgroundColor: isDark ? '#211C37' : '#F1EDFF' }]}
                >
                  <View style={styles.lifeCardTop}>
                    <View style={styles.watchIcon}><Clapperboard size={20} color="#7057E8" /></View>
                    <Text style={styles.watchKicker}>CONTINUE</Text>
                  </View>
                  <Text style={[styles.watchTitle, { color: colors.text }]} numberOfLines={2}>{watchingShow?.title ?? 'Find your next watch'}</Text>
                  <Text style={[styles.watchMeta, { color: colors.textSecondary }]}>
                    {watchingShow
                      ? watchingShow.type === 'Series' && watchingShow.currentEpisode
                        ? `S${watchingShow.currentSeason ?? 1} · E${watchingShow.currentEpisode} · ${watchingShow.platform}`
                        : `${watchingShow.type} · ${watchingShow.platform}`
                      : 'Your watching activity will appear here.'}
                  </Text>
                  <View style={styles.watchArrow}><ArrowRight size={18} color="#7057E8" /></View>
                </TouchableOpacity>

                <View style={styles.lifeRightColumn}>
                  <TouchableOpacity
                    activeOpacity={0.87}
                    onPress={() => router.push('/(tabs)/sports')}
                    style={[styles.sportCard, { backgroundColor: isDark ? '#2A2112' : '#FFF7E5' }]}
                  >
                    <View style={styles.sportHeader}>
                      {favoriteTeam?.logo ? <Image source={{ uri: favoriteTeam.logo }} style={styles.sportLogo} /> : <Medal size={21} color="#D98B00" />}
                      <Text style={styles.sportKicker}>NEXT UP</Text>
                    </View>
                    <Text style={[styles.sportTitle, { color: colors.text }]} numberOfLines={2}>
                      {teamMatch ? `${teamMatch.homeTeam} vs ${teamMatch.awayTeam}` : favoriteTeam?.name ?? 'Follow a team'}
                    </Text>
                    <Text style={[styles.sportMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {teamMatch ? `${teamMatch.date} · ${teamMatch.time}` : favoriteTeam?.league ?? 'Fixtures appear here'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.87}
                    onPress={() => router.push('/(tabs)/discover')}
                    style={[styles.habitCard, { backgroundColor: isDark ? '#10251C' : '#EAF9F1' }]}
                  >
                    <View style={styles.habitHeader}>
                      <Dumbbell size={19} color="#0E9B62" />
                      <Text style={styles.habitKicker}>MOMENTUM</Text>
                    </View>
                    <Text style={[styles.habitNumber, { color: colors.text }]}>{strongestHabit?.streak ?? 0}</Text>
                    <Text style={[styles.habitMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {strongestHabit ? `${strongestHabit.name} streak` : 'days — start a habit'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {forYouRail.length > 0 ? (
              <View style={styles.sectionBlock}>
                <SectionHeader
                  title={areaLabel ? `Worth leaving the house for` : 'Worth going out for'}
                  subtitle={areaLabel ? `A few strong picks around ${areaLabel}.` : 'A few strong nearby picks.'}
                  action="See all"
                  onAction={() => setMode('Near You')}
                  colors={colors}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
                  {forYouRail.map((event) => (
                    <EventRailCard
                      key={event.id}
                      event={event}
                      saved={isSaved(event.id)}
                      onToggle={() => void toggleSaved(event)}
                      colors={colors}
                      isDark={isDark}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.sectionBlock}>
              <SectionHeader title="Explore your world" subtitle="The rest of One Pager is one layer down." colors={colors} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.worldRail}>
                {worldItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.86}
                      onPress={() => router.push(item.route)}
                      style={[
                        styles.worldCard,
                        {
                          backgroundColor: isDark ? '#171A20' : '#FFFFFF',
                          borderColor: isDark ? '#2A2E36' : '#E7EAF0',
                        },
                      ]}
                    >
                      <View style={[styles.worldIcon, { backgroundColor: `${item.accent}16` }]}>
                        <Icon size={21} color={item.accent} strokeWidth={2.25} />
                      </View>
                      <Text style={[styles.worldTitle, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.worldMeta, { color: colors.textSecondary }]} numberOfLines={2}>{item.note}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {surpriseEvent ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title="Try something different" subtitle="Discovery should occasionally surprise you." colors={colors} />
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => router.push(`/(root)/event/${surpriseEvent.id}` as any)}
                  style={[styles.wildcardCard, { backgroundColor: isDark ? '#2A2113' : '#FFF7E4' }]}
                >
                  <View style={styles.wildcardTop}>
                    <Sparkles size={18} color="#B7791F" />
                    <Text style={styles.wildcardKicker}>OUTSIDE YOUR USUAL</Text>
                  </View>
                  <Text style={[styles.wildcardTitle, { color: colors.text }]}>{surpriseEvent.title}</Text>
                  <Text style={[styles.wildcardMeta, { color: colors.textSecondary }]}>
                    {[titleCase(surpriseEvent.category || 'Event'), surpriseEvent.date, formatDistance(surpriseEvent.distanceKm)].filter(Boolean).join(' · ')}
                  </Text>
                  <View style={styles.wildcardFooter}>
                    <Text style={styles.wildcardLink}>See if it is your thing</Text>
                    <ArrowUpRight size={17} color="#B7791F" />
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        ) : null}

        {mode === 'Near You' ? (
          <View style={styles.modeBody}>
            <SectionHeader
              title={areaLabel ? `Around ${areaLabel}` : 'Around you'}
              subtitle="Real things happening close enough to actually do."
              action="Full events"
              onAction={() => router.push('/(tabs)/events')}
              colors={colors}
            />

            {eventsLoading && nearYouGrid.length === 0 ? (
              <View style={[styles.modeLoading, { backgroundColor: isDark ? '#171A22' : '#F1F3F7' }]}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.loadingCopy, { color: colors.textSecondary }]}>Looking around you…</Text>
              </View>
            ) : nearYouGrid.length > 0 ? (
              <View style={styles.nearbyGrid}>
                {nearYouGrid.map((event) => (
                  <NearbyGridCard key={event.id} event={event} colors={colors} />
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: isDark ? '#171A22' : '#F4F6FA' }]}>
                <MapPin size={26} color={colors.primary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>Nothing strong nearby yet</Text>
                <Text style={[styles.emptyStateCopy, { color: colors.textSecondary }]}>Try the full Events experience for wider search and categories.</Text>
                <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(tabs)/events')} style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.emptyStateButtonText}>Explore events</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        {mode === 'Saved' ? (
          <View style={styles.modeBody}>
            <SectionHeader
              title="Saved to your life"
              subtitle="Things you chose should be easy to find again."
              colors={colors}
            />

            {upcomingSaved.length > 0 ? (
              <View style={styles.savedList}>
                {upcomingSaved.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    activeOpacity={0.86}
                    onPress={() => router.push(`/(root)/event/${event.id}` as any)}
                    style={[
                      styles.savedRow,
                      {
                        backgroundColor: isDark ? '#171A20' : '#FFFFFF',
                        borderColor: isDark ? '#2A2E36' : '#E7EAF0',
                      },
                    ]}
                  >
                    <View style={styles.savedIcon}><Check size={16} color="#0E9B62" strokeWidth={2.5} /></View>
                    <View style={styles.savedCopy}>
                      <Text style={[styles.savedTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
                      <Text style={[styles.savedMeta, { color: colors.textSecondary }]} numberOfLines={2}>
                        {[event.date, event.time, event.venue].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: isDark ? '#171A22' : '#F4F6FA' }]}>
                <Check size={26} color={colors.primary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>Nothing saved yet</Text>
                <Text style={[styles.emptyStateCopy, { color: colors.textSecondary }]}>When something catches your eye, add it to your life and it will live here.</Text>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setMode('For You')} style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.emptyStateButtonText}>Find something</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => router.push('/(tabs)/profile')}
          style={[styles.tuneFooter, { borderColor: isDark ? '#2A2E38' : '#E5E8EE' }]}
        >
          <View style={styles.tuneFooterCopy}>
            <Text style={[styles.tuneFooterTitle, { color: colors.text }]}>Tune your Discover</Text>
            <Text style={[styles.tuneFooterSubtitle, { color: colors.textSecondary }]}>Interests, teams and preferences directly shape what appears here.</Text>
          </View>
          <SlidersHorizontal size={20} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  headerCopy: { flex: 1 },
  headerContext: { fontSize: 10.5, fontWeight: '850', letterSpacing: 1.2, marginBottom: 4 },
  pageTitle: { fontSize: 36, lineHeight: 39, fontWeight: '850', letterSpacing: -1.25 },
  pageSubtitle: { marginTop: 4, fontSize: 15, lineHeight: 21 },
  tuneButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  modeControl: { marginTop: 18, height: 44, borderRadius: 14, padding: 3, flexDirection: 'row', gap: 3 },
  modeButton: { flex: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  modeText: { fontSize: 13, fontWeight: '750' },

  heroSection: { paddingHorizontal: 20, marginTop: 18 },
  heroLoading: { minHeight: 350, borderRadius: 27, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingCopy: { fontSize: 13.5, fontWeight: '650' },
  heroCard: { borderRadius: 27, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  heroMedia: { height: 370 },
  heroRadius: { borderRadius: 27 },
  heroOverlay: { flex: 1, padding: 18, justifyContent: 'space-between' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroReasonChip: { maxWidth: '78%', minHeight: 29, borderRadius: 15, paddingHorizontal: 10, backgroundColor: 'rgba(6,10,18,0.66)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroReasonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '750', flexShrink: 1 },
  hotChip: { minHeight: 27, paddingHorizontal: 8, borderRadius: 14, backgroundColor: 'rgba(226,69,43,0.92)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  hotText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '850', letterSpacing: 0.6 },
  heroKicker: { color: '#D2DEFF', fontSize: 10.5, fontWeight: '850', letterSpacing: 1.4, marginBottom: 7 },
  heroTitle: { color: '#FFFFFF', fontSize: 30, lineHeight: 34, fontWeight: '850', letterSpacing: -0.75, maxWidth: '94%' },
  heroInfoRow: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroInfo: { color: 'rgba(255,255,255,0.84)', fontSize: 12.5, lineHeight: 18, fontWeight: '600', flexShrink: 1 },
  heroFloatingAction: { position: 'absolute', right: 14, bottom: 14, minHeight: 42, paddingHorizontal: 13, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  heroFloatingActionText: { fontSize: 12.5, fontWeight: '800' },
  heroEmpty: { minHeight: 240, borderRadius: 27, padding: 22, justifyContent: 'center' },
  heroEmptyTitle: { marginTop: 16, fontSize: 23, lineHeight: 28, fontWeight: '850', letterSpacing: -0.45 },
  heroEmptyCopy: { marginTop: 7, fontSize: 14.5, lineHeight: 21 },

  sectionBlock: { marginTop: 30 },
  sectionHeader: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  sectionHeaderCopy: { flex: 1 },
  sectionTitle: { fontSize: 22, lineHeight: 26, fontWeight: '850', letterSpacing: -0.5 },
  sectionSubtitle: { marginTop: 3, fontSize: 13, lineHeight: 18 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', paddingBottom: 1 },
  sectionActionText: { fontSize: 12.5, fontWeight: '800' },

  lifeBento: { paddingHorizontal: 20, flexDirection: 'row', gap: 10, minHeight: 300 },
  watchCard: { flex: 1.08, borderRadius: 24, padding: 17, justifyContent: 'space-between' },
  lifeRightColumn: { flex: 0.92, gap: 10 },
  sportCard: { flex: 1.03, borderRadius: 22, padding: 14 },
  habitCard: { flex: 0.97, borderRadius: 22, padding: 14 },
  lifeCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  watchIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(112,87,232,0.14)', alignItems: 'center', justifyContent: 'center' },
  watchKicker: { color: '#7057E8', fontSize: 9.5, fontWeight: '850', letterSpacing: 1.0 },
  watchTitle: { marginTop: 34, fontSize: 23, lineHeight: 27, fontWeight: '850', letterSpacing: -0.5 },
  watchMeta: { marginTop: 7, fontSize: 12.5, lineHeight: 18 },
  watchArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(112,87,232,0.14)', alignItems: 'center', justifyContent: 'center' },
  sportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sportLogo: { width: 30, height: 30, resizeMode: 'contain' },
  sportKicker: { color: '#D98B00', fontSize: 9, fontWeight: '850', letterSpacing: 0.9 },
  sportTitle: { marginTop: 15, fontSize: 16, lineHeight: 19, fontWeight: '850' },
  sportMeta: { marginTop: 4, fontSize: 11, lineHeight: 15 },
  habitHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  habitKicker: { color: '#0E9B62', fontSize: 9, fontWeight: '850', letterSpacing: 0.9 },
  habitNumber: { marginTop: 5, fontSize: 38, lineHeight: 41, fontWeight: '850', letterSpacing: -1.4 },
  habitMeta: { marginTop: 2, fontSize: 11, lineHeight: 15 },

  railContent: { paddingHorizontal: 20, gap: 11 },
  railCard: { width: 210, borderRadius: 21, overflow: 'hidden' },
  railImage: { height: 142 },
  railImageRadius: { borderTopLeftRadius: 21, borderTopRightRadius: 21 },
  railImageOverlay: { flex: 1, padding: 9, justifyContent: 'flex-end' },
  railImageFallback: { height: 142, alignItems: 'center', justifyContent: 'center' },
  distanceChip: { alignSelf: 'flex-start', minHeight: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: 'rgba(6,10,18,0.62)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  distanceChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '750' },
  railBody: { padding: 12 },
  railEyebrow: { fontSize: 9.5, fontWeight: '850', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 4 },
  railTitle: { fontSize: 16, lineHeight: 19, fontWeight: '850' },
  railMeta: { marginTop: 4, fontSize: 11, lineHeight: 15 },
  railSave: { alignSelf: 'flex-start', marginTop: 9, minHeight: 29, borderRadius: 10, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  railSaveText: { fontSize: 11, fontWeight: '800' },

  worldRail: { paddingHorizontal: 20, gap: 9 },
  worldCard: { width: 134, minHeight: 142, borderRadius: 20, borderWidth: 1, padding: 14 },
  worldIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  worldTitle: { fontSize: 16, fontWeight: '850', letterSpacing: -0.2 },
  worldMeta: { marginTop: 4, fontSize: 11.5, lineHeight: 16 },

  wildcardCard: { marginHorizontal: 20, borderRadius: 23, padding: 18 },
  wildcardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wildcardKicker: { color: '#B7791F', fontSize: 9.5, fontWeight: '850', letterSpacing: 1.0 },
  wildcardTitle: { marginTop: 16, fontSize: 21, lineHeight: 25, fontWeight: '850', letterSpacing: -0.35 },
  wildcardMeta: { marginTop: 6, fontSize: 12.5, lineHeight: 18 },
  wildcardFooter: { marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wildcardLink: { color: '#B7791F', fontSize: 12.5, fontWeight: '850' },

  modeBody: { marginTop: 24 },
  modeLoading: { marginHorizontal: 20, minHeight: 220, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 10 },
  nearbyGrid: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nearbyGridCard: { width: '48.5%', minHeight: 235, borderRadius: 22, overflow: 'hidden' },
  nearbyGridImage: { flex: 1, minHeight: 235 },
  nearbyGridRadius: { borderRadius: 22 },
  nearbyGridOverlay: { flex: 1, padding: 13, justifyContent: 'flex-end' },
  nearbyGridCategory: { color: '#D7E2FF', fontSize: 9, fontWeight: '850', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 5 },
  nearbyGridTitle: { color: '#FFFFFF', fontSize: 16.5, lineHeight: 20, fontWeight: '850', letterSpacing: -0.2 },
  nearbyGridMeta: { color: 'rgba(255,255,255,0.78)', marginTop: 5, fontSize: 10.5, lineHeight: 15 },

  savedList: { paddingHorizontal: 20, gap: 9 },
  savedRow: { borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  savedIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#E7F8EF', alignItems: 'center', justifyContent: 'center' },
  savedCopy: { flex: 1 },
  savedTitle: { fontSize: 15.5, lineHeight: 19, fontWeight: '850' },
  savedMeta: { marginTop: 4, fontSize: 11.5, lineHeight: 16 },

  emptyState: { marginHorizontal: 20, minHeight: 240, borderRadius: 24, padding: 22, alignItems: 'flex-start', justifyContent: 'center' },
  emptyStateTitle: { marginTop: 15, fontSize: 21, lineHeight: 25, fontWeight: '850', letterSpacing: -0.35 },
  emptyStateCopy: { marginTop: 6, fontSize: 13.5, lineHeight: 20, maxWidth: 330 },
  emptyStateButton: { marginTop: 17, minHeight: 42, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyStateButtonText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '850' },

  tuneFooter: { marginHorizontal: 20, marginTop: 32, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', gap: 15 },
  tuneFooterCopy: { flex: 1 },
  tuneFooterTitle: { fontSize: 15, fontWeight: '850' },
  tuneFooterSubtitle: { marginTop: 3, fontSize: 11.5, lineHeight: 16 },
});
