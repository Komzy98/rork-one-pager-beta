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
  BookOpen,
  Check,
  ChefHat,
  ChevronRight,
  Clapperboard,
  Clock3,
  Dumbbell,
  MapPin,
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

type ExploreItem = {
  id: string;
  label: string;
  note: string;
  route: RouteTarget;
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  accent: string;
  tintLight: string;
  tintDark: string;
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
  return 'Picked for you';
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

function EventCard({
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
      style={[styles.eventCard, { backgroundColor: isDark ? '#17191F' : '#FFFFFF' }]}
    >
      {event.image ? (
        <ImageBackground
          source={{ uri: event.image }}
          style={styles.eventImage}
          imageStyle={styles.eventImageRadius}
        >
          <LinearGradient colors={['transparent', 'rgba(5,8,15,0.68)']} style={styles.eventImageOverlay}>
            <View style={styles.distanceChip}>
              <MapPin size={11} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.distanceChipText}>{formatDistance(event.distanceKm) ?? 'Near you'}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient colors={['#2D58C7', '#17213C']} style={styles.eventImageFallback}>
          <MapPin size={28} color="#FFFFFF" />
        </LinearGradient>
      )}

      <View style={styles.eventBody}>
        <Text style={[styles.eventEyebrow, { color: colors.primary }]}>{titleCase(event.category || 'Event')}</Text>
        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.eventMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {[event.date, event.time].filter(Boolean).join(' · ')}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(pressEvent) => {
            pressEvent.stopPropagation?.();
            onToggle();
          }}
          style={[
            styles.eventSave,
            { backgroundColor: saved ? '#E6F7EE' : isDark ? '#272A32' : '#F2F4F7' },
          ]}
        >
          {saved ? <Check size={13} color="#128A50" /> : <Plus size={13} color={colors.text} />}
          <Text style={[styles.eventSaveText, { color: saved ? '#128A50' : colors.text }]}>
            {saved ? 'Added' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function NearbyRow({
  event,
  colors,
  isDark,
}: {
  event: LocalEvent;
  colors: { text: string; textSecondary: string; primary: string };
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push(`/(root)/event/${event.id}` as any)}
      style={[styles.nearbyRow, { borderBottomColor: isDark ? '#242730' : '#E8EAF0' }]}
    >
      {event.image ? (
        <Image source={{ uri: event.image }} style={styles.nearbyThumb} />
      ) : (
        <View style={[styles.nearbyThumbFallback, { backgroundColor: isDark ? '#202638' : '#EDF2FF' }]}>
          <MapPin size={20} color={colors.primary} />
        </View>
      )}
      <View style={styles.nearbyRowCopy}>
        <View style={styles.nearbyRowTop}>
          <Text style={[styles.nearbyCategory, { color: colors.primary }]}>{titleCase(event.category || 'Event')}</Text>
          {formatDistance(event.distanceKm) ? (
            <Text style={[styles.nearbyDistance, { color: colors.textSecondary }]}>{formatDistance(event.distanceKm)}</Text>
          ) : null}
        </View>
        <Text style={[styles.nearbyTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.nearbyMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {[event.date, event.time, event.venue].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function SavedRow({
  event,
  colors,
  isDark,
}: {
  event: LocalEvent;
  colors: { text: string; textSecondary: string; primary: string };
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push(`/(root)/event/${event.id}` as any)}
      style={[styles.savedRow, { backgroundColor: isDark ? '#17191F' : '#FFFFFF' }]}
    >
      <View style={[styles.savedDate, { backgroundColor: isDark ? '#22262E' : '#F1F3F7' }]}>
        <Text style={[styles.savedDateDay, { color: colors.text }]}>{String(event.date || '').split(',')[0] || 'Saved'}</Text>
        <Check size={15} color="#11894E" strokeWidth={2.6} />
      </View>
      <View style={styles.savedCopy}>
        <Text style={[styles.savedTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.savedMeta, { color: colors.textSecondary }]} numberOfLines={2}>
          {[event.time, event.venue].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textSecondary} />
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
      [...allEvents].sort(
        (a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE),
      ),
    [allEvents],
  );

  const heroEvent = rankedEvents[0] ?? null;
  const forYouRail = rankedEvents.filter((event) => event.id !== heroEvent?.id).slice(0, 7);
  const nearYouList = nearestEvents.slice(0, 12);

  const surpriseEvent = useMemo(() => {
    const favoriteSet = new Set(favoriteCategories.map(normalize));
    return (
      rankedEvents.find(
        (event) => !favoriteSet.has(normalize(event.category)) && event.id !== heroEvent?.id,
      ) ?? rankedEvents[3] ?? null
    );
  }, [rankedEvents, favoriteCategories, heroEvent?.id]);

  const watchingShow = useMemo(
    () => shows.find((show) => show.status === 'Watching') ?? shows.find((show) => show.status === 'Plan to Watch') ?? null,
    [shows],
  );

  const watchProgress = useMemo(() => {
    if (!watchingShow || watchingShow.type !== 'Series') return null;
    if (!watchingShow.currentEpisode || !watchingShow.totalEpisodes) return null;
    return Math.min(1, Math.max(0, watchingShow.currentEpisode / watchingShow.totalEpisodes));
  }, [watchingShow]);

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

  const activeHabit = useMemo(() => {
    const positiveStreaks = habitsWithStats.filter((habit) => habit.streak > 0);
    if (!positiveStreaks.length) return null;
    return [...positiveStreaks].sort((a, b) => b.streak - a.streak)[0] ?? null;
  }, [habitsWithStats]);

  const personalSignals = useMemo(() => {
    const values = [
      favoriteCategories[0] ? titleCase(favoriteCategories[0]) : null,
      watchingShow?.title ?? null,
      favoriteTeam?.name ?? null,
      interests[0] ? titleCase(interests[0]) : null,
    ].filter(Boolean) as string[];
    return Array.from(new Set(values)).slice(0, 4);
  }, [favoriteCategories, watchingShow, favoriteTeam, interests]);

  const exploreItems = useMemo<ExploreItem[]>(
    () => [
      {
        id: 'shows',
        label: 'Watch',
        note: watchingShow ? 'Continue watching' : 'Films & series',
        route: '/(tabs)/shows',
        icon: Clapperboard,
        accent: '#6D55E8',
        tintLight: '#F1EDFF',
        tintDark: '#211C38',
      },
      {
        id: 'sports',
        label: 'Sports',
        note: favoriteTeam?.name ?? 'Teams & fixtures',
        route: '/(tabs)/sports',
        icon: Trophy,
        accent: '#D98A00',
        tintLight: '#FFF6E4',
        tintDark: '#2B2315',
      },
      {
        id: 'events',
        label: 'Go out',
        note: areaLabel ? `Around ${areaLabel}` : 'Events near you',
        route: '/(tabs)/events',
        icon: MapPin,
        accent: '#2E5BD3',
        tintLight: '#EDF2FF',
        tintDark: '#18233E',
      },
      {
        id: 'habits',
        label: 'Build',
        note: activeHabit ? `${activeHabit.streak}-day streak` : 'Find a routine',
        route: '/(tabs)/discover',
        icon: Dumbbell,
        accent: '#0D9660',
        tintLight: '#EAF8F1',
        tintDark: '#12271E',
      },
      {
        id: 'learning',
        label: 'Learn',
        note: interests[0] ? titleCase(interests[0]) : 'Ideas & courses',
        route: '/(tabs)/learning',
        icon: BookOpen,
        accent: '#078FBF',
        tintLight: '#EAF7FC',
        tintDark: '#142832',
      },
      {
        id: 'cooking',
        label: 'Cook',
        note: 'Ideas for tonight',
        route: '/(tabs)/cooking',
        icon: ChefHat,
        accent: '#E76637',
        tintLight: '#FFF0E9',
        tintDark: '#302019',
      },
    ],
    [watchingShow, favoriteTeam, areaLabel, activeHabit, interests],
  );

  const hasMomentum = Boolean(watchingShow || teamMatch || activeHabit);
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
    const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
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
                      backgroundColor: isDark ? '#2A2E37' : '#FFFFFF',
                      shadowColor: '#000',
                      shadowOpacity: isDark ? 0 : 0.05,
                      shadowRadius: 7,
                      shadowOffset: { width: 0, height: 2 },
                    },
                  ]}
                >
                  <Text style={[styles.modeText, { color: active ? colors.text : colors.textSecondary }]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {mode === 'For You' && personalSignals.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.signalRail}>
              <Text style={[styles.signalLead, { color: colors.textSecondary }]}>Based on</Text>
              {personalSignals.map((signal) => (
                <View
                  key={signal}
                  style={[
                    styles.signalChip,
                    { backgroundColor: isDark ? '#1D2027' : '#F3F4F7', borderColor: isDark ? '#292D35' : '#E7E9EE' },
                  ]}
                >
                  <Text style={[styles.signalText, { color: colors.text }]}>{signal}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>

        {mode === 'For You' ? (
          <>
            <View style={styles.heroSection}>
              {eventsLoading && !heroEvent ? (
                <View style={[styles.heroLoading, { backgroundColor: isDark ? '#171A22' : '#EEF2F7' }]}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.loadingCopy, { color: colors.textSecondary }]}>Finding something worth your time…</Text>
                </View>
              ) : heroEvent ? (
                <TouchableOpacity
                  activeOpacity={0.96}
                  onPress={() => router.push(`/(root)/event/${heroEvent.id}` as any)}
                  style={styles.heroCard}
                >
                  {heroEvent.image ? (
                    <ImageBackground source={{ uri: heroEvent.image }} style={styles.heroMedia} imageStyle={styles.heroRadius}>
                      <LinearGradient colors={['rgba(5,8,15,0.04)', 'rgba(5,8,15,0.92)']} style={styles.heroOverlay}>
                        <View style={styles.heroReasonChip}>
                          <Sparkles size={12} color="#FFFFFF" strokeWidth={2.5} />
                          <Text style={styles.heroReasonText}>{reasonForEvent(heroEvent, favoriteCategories, interests, areaLabel)}</Text>
                        </View>

                        <View>
                          <Text style={styles.heroEyebrow}>{liveEvents ? 'ONE PAGER PICK' : 'DISCOVERY PICK'}</Text>
                          <Text style={styles.heroTitle}>{heroEvent.title}</Text>
                          <View style={styles.heroInfoRow}>
                            <Clock3 size={14} color="rgba(255,255,255,0.84)" />
                            <Text style={styles.heroInfoText}>{[heroEvent.date, heroEvent.time].filter(Boolean).join(' · ')}</Text>
                          </View>
                          <View style={styles.heroInfoRow}>
                            <MapPin size={14} color="rgba(255,255,255,0.84)" />
                            <Text style={styles.heroInfoText} numberOfLines={1}>
                              {[heroEvent.venue, formatDistance(heroEvent.distanceKm)].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  ) : (
                    <LinearGradient colors={['#3158C2', '#151D35']} style={styles.heroMedia}>
                      <View style={styles.heroOverlay}>
                        <View style={styles.heroReasonChip}>
                          <Sparkles size={12} color="#FFFFFF" />
                          <Text style={styles.heroReasonText}>{reasonForEvent(heroEvent, favoriteCategories, interests, areaLabel)}</Text>
                        </View>
                        <View>
                          <Text style={styles.heroEyebrow}>ONE PAGER PICK</Text>
                          <Text style={styles.heroTitle}>{heroEvent.title}</Text>
                          <Text style={styles.heroInfoText}>{[heroEvent.date, heroEvent.time, heroEvent.venue].filter(Boolean).join(' · ')}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={(pressEvent) => {
                      pressEvent.stopPropagation?.();
                      void toggleSaved(heroEvent);
                    }}
                    style={[
                      styles.heroAdd,
                      { backgroundColor: isSaved(heroEvent.id) ? '#E6F7EE' : '#FFFFFF' },
                    ]}
                  >
                    {isSaved(heroEvent.id) ? <Check size={18} color="#128A50" /> : <Plus size={18} color="#111827" />}
                    <Text style={[styles.heroAddText, { color: isSaved(heroEvent.id) ? '#128A50' : '#111827' }]}>
                      {isSaved(heroEvent.id) ? 'In my life' : 'Add to my life'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={() => router.push('/(tabs)/events')}
                  style={[styles.heroEmpty, { backgroundColor: isDark ? '#17213A' : '#EDF3FF' }]}
                >
                  <Sparkles size={26} color={colors.primary} />
                  <Text style={[styles.heroEmptyTitle, { color: colors.text }]}>Give Discover more to work with</Text>
                  <Text style={[styles.heroEmptyCopy, { color: colors.textSecondary }]}>Follow teams, save events and add interests. One Pager will sharpen this space around you.</Text>
                </TouchableOpacity>
              )}
            </View>

            {hasMomentum ? (
              <View style={styles.sectionBlock}>
                <SectionHeader
                  title="Keep going"
                  subtitle="Only the things already moving in your life."
                  colors={colors}
                />
                <View style={[styles.momentumList, { backgroundColor: isDark ? '#17191F' : '#FFFFFF' }]}>
                  {watchingShow ? (
                    <TouchableOpacity activeOpacity={0.82} onPress={() => router.push('/(tabs)/shows')} style={styles.momentumRow}>
                      <View style={[styles.momentumIcon, { backgroundColor: isDark ? '#25203C' : '#F0ECFF' }]}>
                        <Clapperboard size={20} color="#6D55E8" />
                      </View>
                      <View style={styles.momentumCopy}>
                        <Text style={[styles.momentumKicker, { color: '#6D55E8' }]}>CONTINUE WATCHING</Text>
                        <Text style={[styles.momentumTitle, { color: colors.text }]} numberOfLines={1}>{watchingShow.title}</Text>
                        <Text style={[styles.momentumMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                          {watchingShow.type === 'Series' && watchingShow.currentEpisode
                            ? `Season ${watchingShow.currentSeason ?? 1}, episode ${watchingShow.currentEpisode} · ${watchingShow.platform}`
                            : `${watchingShow.type} · ${watchingShow.platform}`}
                        </Text>
                        {watchProgress != null ? (
                          <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2A2D35' : '#EDEEF2' }]}>
                            <View style={[styles.progressFill, { width: `${Math.round(watchProgress * 100)}%` }]} />
                          </View>
                        ) : null}
                      </View>
                      <ArrowRight size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ) : null}

                  {teamMatch ? (
                    <TouchableOpacity activeOpacity={0.82} onPress={() => router.push('/(tabs)/sports')} style={styles.momentumRow}>
                      <View style={[styles.momentumIcon, { backgroundColor: isDark ? '#2C2518' : '#FFF5DF' }]}>
                        {favoriteTeam?.logo ? <Image source={{ uri: favoriteTeam.logo }} style={styles.teamLogo} /> : <Trophy size={20} color="#D98A00" />}
                      </View>
                      <View style={styles.momentumCopy}>
                        <Text style={[styles.momentumKicker, { color: '#D98A00' }]}>COMING UP</Text>
                        <Text style={[styles.momentumTitle, { color: colors.text }]} numberOfLines={1}>{teamMatch.homeTeam} vs {teamMatch.awayTeam}</Text>
                        <Text style={[styles.momentumMeta, { color: colors.textSecondary }]} numberOfLines={1}>{teamMatch.date} · {teamMatch.time}</Text>
                      </View>
                      <ArrowRight size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ) : null}

                  {activeHabit ? (
                    <TouchableOpacity activeOpacity={0.82} onPress={() => router.push('/(tabs)/discover')} style={styles.momentumRow}>
                      <View style={[styles.momentumIcon, { backgroundColor: isDark ? '#13291F' : '#EAF8F1' }]}>
                        <Dumbbell size={20} color="#0D9660" />
                      </View>
                      <View style={styles.momentumCopy}>
                        <Text style={[styles.momentumKicker, { color: '#0D9660' }]}>MOMENTUM</Text>
                        <Text style={[styles.momentumTitle, { color: colors.text }]} numberOfLines={1}>{activeHabit.name}</Text>
                        <Text style={[styles.momentumMeta, { color: colors.textSecondary }]}>{activeHabit.streak}-day streak</Text>
                      </View>
                      <View style={[styles.streakBadge, { backgroundColor: isDark ? '#1B3328' : '#DDF4E8' }]}>
                        <Text style={styles.streakNumber}>{activeHabit.streak}</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}

            {forYouRail.length > 0 ? (
              <View style={styles.sectionBlock}>
                <SectionHeader
                  title="Worth going out for"
                  subtitle={areaLabel ? `A few strong picks around ${areaLabel}.` : 'A few strong picks near you.'}
                  action="See all"
                  onAction={() => setMode('Near You')}
                  colors={colors}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRail}>
                  {forYouRail.map((event) => (
                    <EventCard
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
              <SectionHeader
                title="Explore your world"
                subtitle="The rest of One Pager, without crowding your navigation."
                colors={colors}
              />
              <View style={styles.exploreGrid}>
                {exploreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.84}
                      onPress={() => router.push(item.route)}
                      style={[
                        styles.exploreTile,
                        { backgroundColor: isDark ? item.tintDark : item.tintLight },
                      ]}
                    >
                      <View style={styles.exploreTop}>
                        <View style={[styles.exploreIcon, { backgroundColor: `${item.accent}18` }]}>
                          <Icon size={19} color={item.accent} strokeWidth={2.25} />
                        </View>
                        <ChevronRight size={16} color={item.accent} />
                      </View>
                      <Text style={[styles.exploreLabel, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.exploreNote, { color: colors.textSecondary }]} numberOfLines={1}>{item.note}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {surpriseEvent ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title="Try something different" subtitle="A little outside your usual pattern." colors={colors} />
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => router.push(`/(root)/event/${surpriseEvent.id}` as any)}
                  style={[styles.surpriseCard, { backgroundColor: isDark ? '#1B1D22' : '#FFFFFF' }]}
                >
                  {surpriseEvent.image ? (
                    <Image source={{ uri: surpriseEvent.image }} style={styles.surpriseImage} />
                  ) : (
                    <LinearGradient colors={['#805AD5', '#4C2A8A']} style={styles.surpriseImageFallback}>
                      <Sparkles size={26} color="#FFFFFF" />
                    </LinearGradient>
                  )}
                  <View style={styles.surpriseCopy}>
                    <Text style={[styles.surpriseEyebrow, { color: colors.primary }]}>OUTSIDE YOUR USUAL</Text>
                    <Text style={[styles.surpriseTitle, { color: colors.text }]} numberOfLines={2}>{surpriseEvent.title}</Text>
                    <Text style={[styles.surpriseMeta, { color: colors.textSecondary }]} numberOfLines={2}>
                      {[titleCase(surpriseEvent.category || 'Event'), surpriseEvent.date, formatDistance(surpriseEvent.distanceKm)].filter(Boolean).join(' · ')}
                    </Text>
                    <Text style={[styles.surpriseLink, { color: colors.primary }]}>See if it is your thing →</Text>
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
              subtitle={`${nearYouList.length} things worth a closer look.`}
              action="Full events"
              onAction={() => router.push('/(tabs)/events')}
              colors={colors}
            />

            {eventsLoading && nearYouList.length === 0 ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.centerStateText, { color: colors.textSecondary }]}>Looking nearby…</Text>
              </View>
            ) : (
              <View style={styles.nearbyList}>
                {nearYouList.map((event) => (
                  <NearbyRow key={event.id} event={event} colors={colors} isDark={isDark} />
                ))}
              </View>
            )}
          </View>
        ) : null}

        {mode === 'Saved' ? (
          <View style={styles.modeBody}>
            <SectionHeader
              title="Saved to your life"
              subtitle="Things you already decided were worth remembering."
              colors={colors}
            />

            {upcomingSaved.length > 0 ? (
              <View style={styles.savedList}>
                {upcomingSaved.map((event) => (
                  <SavedRow key={event.id} event={event} colors={colors} isDark={isDark} />
                ))}
              </View>
            ) : (
              <View style={[styles.emptySaved, { backgroundColor: isDark ? '#17191F' : '#FFFFFF' }]}>
                <View style={[styles.emptySavedIcon, { backgroundColor: isDark ? '#222631' : '#EDF2FF' }]}>
                  <Plus size={22} color={colors.primary} />
                </View>
                <Text style={[styles.emptySavedTitle, { color: colors.text }]}>Nothing saved yet</Text>
                <Text style={[styles.emptySavedCopy, { color: colors.textSecondary }]}>When something catches your eye, tap “Add to my life” and it will stay here.</Text>
                <TouchableOpacity activeOpacity={0.82} onPress={() => setMode('For You')} style={[styles.emptySavedButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.emptySavedButtonText}>Find something</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1 },
  headerContext: { fontSize: 11, fontWeight: '800', letterSpacing: 1.35, marginBottom: 4 },
  pageTitle: { fontSize: 40, lineHeight: 43, fontWeight: '800', letterSpacing: -1.4 },
  tuneButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginTop: 5 },

  modeControl: { marginTop: 18, padding: 4, borderRadius: 16, flexDirection: 'row' },
  modeButton: { flex: 1, minHeight: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeText: { fontSize: 13, fontWeight: '700' },

  signalRail: { paddingTop: 13, gap: 7, alignItems: 'center' },
  signalLead: { fontSize: 11.5, fontWeight: '600', marginRight: 1 },
  signalChip: { minHeight: 30, borderRadius: 15, borderWidth: 1, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  signalText: { fontSize: 11.5, fontWeight: '700' },

  heroSection: { paddingHorizontal: 20, marginTop: 18 },
  heroLoading: { height: 310, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingCopy: { fontSize: 13.5, fontWeight: '600' },
  heroCard: { height: 325, borderRadius: 28, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  heroMedia: { flex: 1 },
  heroRadius: { borderRadius: 28 },
  heroOverlay: { flex: 1, padding: 18, justifyContent: 'space-between' },
  heroReasonChip: { alignSelf: 'flex-start', maxWidth: '82%', minHeight: 29, borderRadius: 15, backgroundColor: 'rgba(7,10,18,0.62)', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroReasonText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700', flexShrink: 1 },
  heroEyebrow: { color: '#CCD8FF', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.45, marginBottom: 7 },
  heroTitle: { color: '#FFFFFF', fontSize: 29, lineHeight: 33, fontWeight: '800', letterSpacing: -0.7, maxWidth: '92%' },
  heroInfoRow: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroInfoText: { color: 'rgba(255,255,255,0.84)', fontSize: 12.5, lineHeight: 17, fontWeight: '600', flexShrink: 1 },
  heroAdd: { position: 'absolute', right: 14, bottom: 14, minHeight: 45, borderRadius: 23, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  heroAddText: { fontSize: 13, fontWeight: '800' },
  heroEmpty: { minHeight: 230, borderRadius: 28, padding: 22, justifyContent: 'center' },
  heroEmptyTitle: { marginTop: 16, fontSize: 23, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4 },
  heroEmptyCopy: { marginTop: 7, fontSize: 14, lineHeight: 21 },

  sectionBlock: { marginTop: 30 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionHeaderCopy: { flex: 1 },
  sectionTitle: { fontSize: 23, lineHeight: 27, fontWeight: '800', letterSpacing: -0.5 },
  sectionSubtitle: { marginTop: 4, fontSize: 13.5, lineHeight: 19 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', paddingBottom: 2 },
  sectionActionText: { fontSize: 13, fontWeight: '800' },

  momentumList: { marginHorizontal: 20, borderRadius: 22, overflow: 'hidden' },
  momentumRow: { minHeight: 84, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  momentumIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  momentumCopy: { flex: 1 },
  momentumKicker: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.0, marginBottom: 3 },
  momentumTitle: { fontSize: 16, lineHeight: 20, fontWeight: '800' },
  momentumMeta: { marginTop: 3, fontSize: 12, lineHeight: 16 },
  teamLogo: { width: 31, height: 31, resizeMode: 'contain' },
  progressTrack: { height: 3, marginTop: 8, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#6D55E8' },
  streakBadge: { minWidth: 42, height: 42, paddingHorizontal: 10, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  streakNumber: { color: '#0D9660', fontSize: 17, fontWeight: '800' },

  eventRail: { paddingHorizontal: 20, gap: 11 },
  eventCard: { width: 214, borderRadius: 22, overflow: 'hidden' },
  eventImage: { width: '100%', height: 144 },
  eventImageRadius: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  eventImageOverlay: { flex: 1, padding: 10, justifyContent: 'flex-end' },
  eventImageFallback: { width: '100%', height: 144, alignItems: 'center', justifyContent: 'center' },
  distanceChip: { alignSelf: 'flex-start', minHeight: 24, borderRadius: 12, paddingHorizontal: 8, backgroundColor: 'rgba(5,8,15,0.58)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  distanceChipText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' },
  eventBody: { padding: 12 },
  eventEyebrow: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.0, textTransform: 'uppercase', marginBottom: 5 },
  eventTitle: { fontSize: 16, lineHeight: 20, fontWeight: '800' },
  eventMeta: { marginTop: 5, fontSize: 11.5, lineHeight: 16 },
  eventSave: { alignSelf: 'flex-start', minHeight: 31, borderRadius: 11, paddingHorizontal: 10, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventSaveText: { fontSize: 11.5, fontWeight: '800' },

  exploreGrid: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  exploreTile: { width: '48.6%', minHeight: 112, borderRadius: 19, padding: 13, justifyContent: 'space-between' },
  exploreTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exploreIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exploreLabel: { marginTop: 14, fontSize: 16, fontWeight: '800' },
  exploreNote: { marginTop: 2, fontSize: 11.5, lineHeight: 16 },

  surpriseCard: { marginHorizontal: 20, minHeight: 146, borderRadius: 22, overflow: 'hidden', flexDirection: 'row' },
  surpriseImage: { width: 128, height: '100%', resizeMode: 'cover' },
  surpriseImageFallback: { width: 128, minHeight: 146, alignItems: 'center', justifyContent: 'center' },
  surpriseCopy: { flex: 1, padding: 14, justifyContent: 'center' },
  surpriseEyebrow: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.0, marginBottom: 5 },
  surpriseTitle: { fontSize: 16, lineHeight: 20, fontWeight: '800' },
  surpriseMeta: { marginTop: 5, fontSize: 11.5, lineHeight: 16 },
  surpriseLink: { marginTop: 10, fontSize: 12, fontWeight: '800' },

  modeBody: { marginTop: 26 },
  nearbyList: { paddingHorizontal: 20 },
  nearbyRow: { minHeight: 104, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  nearbyThumb: { width: 76, height: 76, borderRadius: 16, resizeMode: 'cover' },
  nearbyThumbFallback: { width: 76, height: 76, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nearbyRowCopy: { flex: 1 },
  nearbyRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nearbyCategory: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },
  nearbyDistance: { fontSize: 10.5, fontWeight: '600' },
  nearbyTitle: { marginTop: 4, fontSize: 15.5, lineHeight: 19, fontWeight: '800' },
  nearbyMeta: { marginTop: 4, fontSize: 11.5, lineHeight: 16 },
  centerState: { minHeight: 230, alignItems: 'center', justifyContent: 'center', gap: 10 },
  centerStateText: { fontSize: 13.5, fontWeight: '600' },

  savedList: { paddingHorizontal: 20, gap: 9 },
  savedRow: { minHeight: 92, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  savedDate: { width: 52, height: 58, borderRadius: 15, alignItems: 'center', justifyContent: 'center', gap: 5 },
  savedDateDay: { fontSize: 10.5, fontWeight: '800', textAlign: 'center' },
  savedCopy: { flex: 1 },
  savedTitle: { fontSize: 15.5, lineHeight: 19, fontWeight: '800' },
  savedMeta: { marginTop: 4, fontSize: 11.5, lineHeight: 16 },
  emptySaved: { marginHorizontal: 20, borderRadius: 24, padding: 24, alignItems: 'center' },
  emptySavedIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptySavedTitle: { marginTop: 15, fontSize: 20, fontWeight: '800' },
  emptySavedCopy: { marginTop: 7, maxWidth: 300, textAlign: 'center', fontSize: 13.5, lineHeight: 20 },
  emptySavedButton: { marginTop: 18, minHeight: 42, borderRadius: 21, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  emptySavedButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
