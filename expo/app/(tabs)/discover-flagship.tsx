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
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChefHat,
  ChevronRight,
  Clapperboard,
  Clock3,
  Dumbbell,
  MapPin,
  Play,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Star,
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
import {
  fetchDiscoverMediaPicks,
  resolveDiscoverShowArtwork,
  type DiscoverMediaPick,
} from '@/utils/discoverMedia';
import { formatShowEpisodeLabel } from '@/utils/showEpisodeLabel';
import {
  formatDistanceKm,
  getDaysUntilEvent,
  getEventCountdownLabel,
} from '@/utils/eventDiscovery';

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
  route: RouteTarget;
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  accent: string;
  note: string;
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

function eventScore(event: LocalEvent, categories: string[], interests: string[]) {
  const category = normalize(event.category);
  const text = normalize([event.title, event.description, event.category, ...(event.tags ?? [])].join(' '));
  let score = 0;
  if (categories.some((item) => category.includes(normalize(item)))) score += 50;
  if (interests.some((item) => text.includes(normalize(item)))) score += 28;
  if (event.isLiveNow) score += 22;
  if (event.isHot) score += 10;
  if (event.isFeatured) score += 6;
  const days = getDaysUntilEvent(event);
  if (days === 0) score += 25;
  else if (days === 1) score += 17;
  else if (days != null && days <= 7) score += 8;
  if (typeof event.distanceKm === 'number') score += Math.max(0, 16 - event.distanceKm);
  return score;
}

function eventReason(event: LocalEvent, categories: string[], interests: string[], areaLabel?: string | null) {
  const category = normalize(event.category);
  const text = normalize([event.title, event.description, event.category, ...(event.tags ?? [])].join(' '));
  const categoryMatch = categories.find((item) => category.includes(normalize(item)));
  if (categoryMatch) return `Because you like ${titleCase(categoryMatch)}`;
  const interestMatch = interests.find((item) => text.includes(normalize(item)));
  if (interestMatch) return `Because you're into ${titleCase(interestMatch)}`;
  if (getDaysUntilEvent(event) === 0) return 'Happening today';
  if (typeof event.distanceKm === 'number') return `${formatDistanceKm(event.distanceKm)} away`;
  return areaLabel ? `Around ${areaLabel}` : 'Picked near you';
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
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {action && onAction ? (
        <TouchableOpacity activeOpacity={0.75} onPress={onAction} style={styles.sectionAction}>
          <Text style={[styles.sectionActionText, { color: colors.primary }]}>{action}</Text>
          <ChevronRight size={15} color={colors.primary} strokeWidth={2.4} />
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
      style={[styles.eventCard, { backgroundColor: isDark ? '#171A20' : '#FFFFFF' }]}
    >
      {event.image ? (
        <ImageBackground source={{ uri: event.image }} style={styles.eventImage} imageStyle={styles.eventImageRadius}>
          <LinearGradient colors={['transparent', 'rgba(4,7,14,0.80)']} style={styles.eventImageOverlay}>
            <View style={styles.eventDistancePill}>
              <MapPin size={11} color="#FFFFFF" />
              <Text style={styles.eventDistanceText}>
                {typeof event.distanceKm === 'number' ? formatDistanceKm(event.distanceKm) : 'Near you'}
              </Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient colors={['#315CD1', '#182540']} style={styles.eventImageFallback}>
          <MapPin size={28} color="#FFFFFF" />
        </LinearGradient>
      )}
      <View style={styles.eventBody}>
        <Text style={[styles.eventEyebrow, { color: colors.primary }]}>{titleCase(event.category || 'Event')}</Text>
        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.eventMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {[getEventCountdownLabel(event), event.time, event.venue].filter(Boolean).join(' · ')}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(pressEvent) => {
            pressEvent.stopPropagation?.();
            onToggle();
          }}
          style={[styles.eventSave, { backgroundColor: saved ? '#E7F7EE' : isDark ? '#282C35' : '#F2F4F7' }]}
        >
          {saved ? <Check size={13} color="#128A50" /> : <Plus size={13} color={colors.text} />}
          <Text style={[styles.eventSaveText, { color: saved ? '#128A50' : colors.text }]}>{saved ? 'Added' : 'Add'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function MediaPoster({ pick, colors }: { pick: DiscoverMediaPick; colors: { text: string; textSecondary: string } }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: '/(tabs)/shows', params: { subtab: 'for-you' } } as any)}
      style={styles.mediaPoster}
    >
      {pick.posterUrl ? (
        <Image source={{ uri: pick.posterUrl }} style={styles.mediaPosterImage} />
      ) : (
        <LinearGradient colors={['#4D3FA8', '#231C4D']} style={styles.mediaPosterFallback}>
          <Clapperboard size={28} color="#FFFFFF" />
        </LinearGradient>
      )}
      <Text style={[styles.mediaPosterTitle, { color: colors.text }]} numberOfLines={2}>{pick.title}</Text>
      <View style={styles.mediaPosterMetaRow}>
        {pick.rating != null && pick.rating > 0 ? (
          <>
            <Star size={11} color="#F5A623" fill="#F5A623" />
            <Text style={[styles.mediaPosterMeta, { color: colors.textSecondary }]}>{pick.rating.toFixed(1)}</Text>
          </>
        ) : (
          <Text style={[styles.mediaPosterMeta, { color: colors.textSecondary }]}>{pick.mediaType === 'tv' ? 'Series' : 'Movie'}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function NearbyRow({ event, colors, isDark }: { event: LocalEvent; colors: { text: string; textSecondary: string; primary: string }; isDark: boolean }) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => router.push(`/(root)/event/${event.id}` as any)}
      style={[styles.nearbyRow, { borderBottomColor: isDark ? '#242832' : '#ECEEF2' }]}
    >
      {event.image ? (
        <Image source={{ uri: event.image }} style={styles.nearbyThumb} />
      ) : (
        <View style={[styles.nearbyThumbFallback, { backgroundColor: isDark ? '#20283A' : '#EEF3FF' }]}>
          <MapPin size={20} color={colors.primary} />
        </View>
      )}
      <View style={styles.nearbyCopy}>
        <Text style={[styles.nearbyReason, { color: colors.primary }]}>{getEventCountdownLabel(event).toUpperCase()}</Text>
        <Text style={[styles.nearbyTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.nearbyMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {[event.time, event.venue, typeof event.distanceKm === 'number' ? formatDistanceKm(event.distanceKm) : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <ChevronRight size={17} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function DiscoverFlagshipScreen() {
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
  const [mode, setMode] = useState<DiscoverMode>('For You');
  const [refreshing, setRefreshing] = useState(false);

  const categories = profile?.favoriteEventCategories ?? [];
  const interests = profile?.interests ?? [];
  const favoriteTeam = profile?.favoriteTeams?.[0] ?? null;

  const rankedEvents = useMemo(
    () => [...allEvents].sort((a, b) => eventScore(b, categories, interests) - eventScore(a, categories, interests)),
    [allEvents, categories, interests],
  );
  const heroEvent = rankedEvents[0] ?? null;
  const eventRail = rankedEvents.filter((event) => event.id !== heroEvent?.id).slice(0, 8);

  const watchingShow = useMemo(
    () => shows.find((show) => show.status === 'Watching') ?? null,
    [shows],
  );

  const showArtworkQuery = useQuery({
    queryKey: ['discover', 'show-artwork', watchingShow?.id, watchingShow?.updatedAt],
    queryFn: () => watchingShow ? resolveDiscoverShowArtwork(watchingShow) : Promise.resolve(null),
    enabled: Boolean(watchingShow),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const showsFingerprint = useMemo(
    () => shows.map((show) => `${show.id}:${show.tmdbId ?? ''}:${show.status}:${show.updatedAt}`).join('|'),
    [shows],
  );
  const mediaQuery = useQuery({
    queryKey: ['discover', 'media-picks', showsFingerprint],
    queryFn: () => fetchDiscoverMediaPicks(shows, 10),
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const teamMatch = useMemo(() => {
    if (!favoriteTeam) return null;
    const teamName = normalize(favoriteTeam.name);
    return sports.find(
      (match) =>
        match.status !== 'Completed' &&
        (normalize(match.homeTeam).includes(teamName) || normalize(match.awayTeam).includes(teamName)),
    ) ?? null;
  }, [sports, favoriteTeam]);

  const momentumHabit = useMemo(() => {
    const meaningful = habitsWithStats.filter((habit) => habit.streak > 0 || habit.completedToday || habit.totalCompletions >= 3);
    return [...meaningful].sort((a, b) => b.streak - a.streak || b.totalCompletions - a.totalCompletions)[0] ?? null;
  }, [habitsWithStats]);

  const dayContext = useMemo(() => {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'this morning' : hour < 17 ? 'this afternoon' : 'tonight';
    return areaLabel ? `${areaLabel} · ${part}` : part;
  }, [areaLabel]);

  const userSignals = useMemo(() => {
    const values: string[] = [];
    if (categories[0]) values.push(titleCase(categories[0]));
    if (watchingShow?.title) values.push(watchingShow.title);
    if (favoriteTeam?.name) values.push(favoriteTeam.name);
    if (momentumHabit?.name) values.push(momentumHabit.name);
    if (interests[0]) values.push(titleCase(interests[0]));
    return [...new Set(values)].slice(0, 4);
  }, [categories, watchingShow, favoriteTeam, momentumHabit, interests]);

  const spotlightIsShow = Boolean(
    watchingShow &&
    showArtworkQuery.data?.backdropUrl &&
    heroEvent &&
    (getDaysUntilEvent(heroEvent) == null || (getDaysUntilEvent(heroEvent) ?? 0) > 2),
  );

  const groupedNearYou = useMemo(() => {
    const nearest = [...allEvents].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    const today = nearest.filter((event) => getDaysUntilEvent(event) === 0).slice(0, 5);
    const tomorrow = nearest.filter((event) => getDaysUntilEvent(event) === 1).slice(0, 5);
    const thisWeek = nearest.filter((event) => {
      const days = getDaysUntilEvent(event);
      return days != null && days >= 2 && days <= 7;
    }).slice(0, 8);
    const later = nearest.filter((event) => {
      const days = getDaysUntilEvent(event);
      return days == null || days > 7;
    }).slice(0, 8);
    return { today, tomorrow, thisWeek, later };
  }, [allEvents]);

  const exploreItems = useMemo<ExploreItem[]>(() => [
    { id: 'events', label: 'Events', route: '/(tabs)/events', icon: MapPin, accent: '#3262D9', note: areaLabel ? `Around ${areaLabel}` : 'Things near you' },
    { id: 'shows', label: 'Watch', route: '/(tabs)/shows', icon: Clapperboard, accent: '#7057E8', note: watchingShow?.title ?? 'Movies & TV' },
    { id: 'sports', label: 'Sports', route: '/(tabs)/sports', icon: Trophy, accent: '#D98B00', note: favoriteTeam?.name ?? 'Teams & fixtures' },
    { id: 'habits', label: 'Habits', route: '/(tabs)/discover', icon: Dumbbell, accent: '#0E9B62', note: momentumHabit ? `${momentumHabit.streak}-day streak` : 'Build a routine' },
    { id: 'learn', label: 'Learn', route: '/(tabs)/learning', icon: BookOpen, accent: '#0D97C8', note: interests[0] ? titleCase(interests[0]) : 'Ideas & courses' },
    { id: 'cook', label: 'Cook', route: '/(tabs)/cooking', icon: ChefHat, accent: '#EA6A37', note: 'Ideas for tonight' },
  ], [areaLabel, watchingShow, favoriteTeam, momentumHabit, interests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshLocation(),
        refetchEvents(),
        mediaQuery.refetch(),
        watchingShow ? showArtworkQuery.refetch() : Promise.resolve(null),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshLocation, refetchEvents, mediaQuery, showArtworkQuery, watchingShow]);

  const liveEvents = eventsSource !== 'fallback' && eventsSource !== 'none';
  const showEpisode = watchingShow ? formatShowEpisodeLabel(watchingShow, undefined, 'bullet') : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: floatingTabBarScrollPadding(insets.bottom) + 42,
        }}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerCopy}>
              <Text style={[styles.contextLine, { color: colors.primary }]}>{dayContext.toUpperCase()}</Text>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Discover</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
              style={[styles.tuneButton, { backgroundColor: isDark ? '#1B1E25' : '#F1F3F7' }]}
            >
              <SlidersHorizontal size={19} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.segment, { backgroundColor: isDark ? '#171A20' : '#EFF1F5' }]}>
            {MODES.map((item) => {
              const active = item === mode;
              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.8}
                  onPress={() => setMode(item)}
                  style={[
                    styles.segmentButton,
                    active && { backgroundColor: isDark ? '#2A2F38' : '#FFFFFF' },
                  ]}
                >
                  <Text style={[styles.segmentText, { color: active ? colors.text : colors.textSecondary }]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {mode === 'For You' ? (
          <>
            <View style={styles.editHeader}>
              <View style={styles.editLabelRow}>
                <Sparkles size={14} color={colors.primary} />
                <Text style={[styles.editLabel, { color: colors.primary }]}>THE ONE PAGER EDIT</Text>
              </View>
              <Text style={[styles.editHeadline, { color: colors.text }]}>One strong thing worth your attention.</Text>
            </View>

            <View style={styles.spotlightWrap}>
              {eventsLoading && !heroEvent ? (
                <View style={[styles.spotlightLoading, { backgroundColor: isDark ? '#171A22' : '#EEF2F7' }]}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Curating your edit…</Text>
                </View>
              ) : spotlightIsShow && watchingShow && showArtworkQuery.data?.backdropUrl ? (
                <TouchableOpacity activeOpacity={0.95} onPress={() => router.push('/(tabs)/shows')} style={styles.spotlightCard}>
                  <ImageBackground
                    source={{ uri: showArtworkQuery.data.backdropUrl }}
                    style={styles.spotlightMedia}
                    imageStyle={styles.spotlightRadius}
                  >
                    <LinearGradient colors={['rgba(4,7,14,0.02)', 'rgba(4,7,14,0.94)']} style={styles.spotlightOverlay}>
                      <View style={styles.spotlightChip}>
                        <Play size={12} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.spotlightChipText}>Continue where you left off</Text>
                      </View>
                      <View>
                        <Text style={styles.spotlightEyebrow}>WATCH NEXT</Text>
                        <Text style={styles.spotlightTitle}>{watchingShow.title}</Text>
                        <Text style={styles.spotlightMeta}>{[showEpisode, watchingShow.platform].filter(Boolean).join(' · ')}</Text>
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
              ) : heroEvent ? (
                <TouchableOpacity
                  activeOpacity={0.95}
                  onPress={() => router.push(`/(root)/event/${heroEvent.id}` as any)}
                  style={styles.spotlightCard}
                >
                  {heroEvent.image ? (
                    <ImageBackground source={{ uri: heroEvent.image }} style={styles.spotlightMedia} imageStyle={styles.spotlightRadius}>
                      <LinearGradient colors={['rgba(4,7,14,0.00)', 'rgba(4,7,14,0.94)']} style={styles.spotlightOverlay}>
                        <View style={styles.spotlightTopRow}>
                          <View style={styles.spotlightChip}>
                            <Sparkles size={12} color="#FFFFFF" />
                            <Text style={styles.spotlightChipText}>{eventReason(heroEvent, categories, interests, areaLabel)}</Text>
                          </View>
                          <Text style={styles.spotlightCountdown}>{getEventCountdownLabel(heroEvent).toUpperCase()}</Text>
                        </View>
                        <View>
                          <Text style={styles.spotlightEyebrow}>{liveEvents ? 'REAL PICK NEAR YOU' : 'DISCOVERY PREVIEW'}</Text>
                          <Text style={styles.spotlightTitle}>{heroEvent.title}</Text>
                          <View style={styles.spotlightInfoRow}>
                            <Clock3 size={14} color="rgba(255,255,255,0.84)" />
                            <Text style={styles.spotlightMeta}>{[heroEvent.date, heroEvent.time].filter(Boolean).join(' · ')}</Text>
                          </View>
                          <View style={styles.spotlightInfoRow}>
                            <MapPin size={14} color="rgba(255,255,255,0.84)" />
                            <Text style={styles.spotlightMeta} numberOfLines={1}>
                              {[heroEvent.venue, typeof heroEvent.distanceKm === 'number' ? formatDistanceKm(heroEvent.distanceKm) : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  ) : (
                    <LinearGradient colors={['#3058C9', '#141D33']} style={styles.spotlightMedia}>
                      <View style={styles.spotlightOverlay}>
                        <View style={styles.spotlightChip}><Sparkles size={12} color="#FFFFFF" /><Text style={styles.spotlightChipText}>{eventReason(heroEvent, categories, interests, areaLabel)}</Text></View>
                        <View><Text style={styles.spotlightEyebrow}>ONE PAGER PICK</Text><Text style={styles.spotlightTitle}>{heroEvent.title}</Text></View>
                      </View>
                    </LinearGradient>
                  )}
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={(pressEvent) => {
                      pressEvent.stopPropagation?.();
                      void toggleSaved(heroEvent);
                    }}
                    style={styles.floatingAdd}
                  >
                    {isSaved(heroEvent.id) ? <Check size={17} color="#128A50" /> : <Plus size={17} color="#111827" />}
                    <Text style={[styles.floatingAddText, { color: isSaved(heroEvent.id) ? '#128A50' : '#111827' }]}>
                      {isSaved(heroEvent.id) ? 'In my life' : 'Add to my life'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => router.push('/(tabs)/events')} activeOpacity={0.85} style={[styles.emptySpotlight, { backgroundColor: isDark ? '#17213A' : '#EEF3FF' }]}>
                  <Sparkles size={28} color={colors.primary} />
                  <Text style={[styles.emptySpotlightTitle, { color: colors.text }]}>Give One Pager a little more signal</Text>
                  <Text style={[styles.emptySpotlightCopy, { color: colors.textSecondary }]}>Follow things you care about and Discover gets sharper quickly.</Text>
                </TouchableOpacity>
              )}
            </View>

            {userSignals.length > 0 ? (
              <View style={styles.signalsSection}>
                <Text style={[styles.signalsLabel, { color: colors.textSecondary }]}>YOUR DISCOVER IS USING</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.signalsRail}>
                  {userSignals.map((signal) => (
                    <View key={signal} style={[styles.signalChip, { backgroundColor: isDark ? '#1B1E25' : '#F2F4F7' }]}>
                      <Text style={[styles.signalText, { color: colors.text }]}>{signal}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {watchingShow ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title="Keep going" subtitle="One thing you already started." colors={colors} />
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => router.push('/(tabs)/shows')}
                  style={[styles.continueCard, { backgroundColor: isDark ? '#171A20' : '#FFFFFF' }]}
                >
                  {showArtworkQuery.data?.posterUrl ? (
                    <Image source={{ uri: showArtworkQuery.data.posterUrl }} style={styles.continuePoster} />
                  ) : (
                    <View style={[styles.continuePosterFallback, { backgroundColor: isDark ? '#27223A' : '#EFEAFF' }]}>
                      <Clapperboard size={28} color="#7057E8" />
                    </View>
                  )}
                  <View style={styles.continueCopy}>
                    <Text style={styles.continueEyebrow}>CONTINUE WATCHING</Text>
                    <Text style={[styles.continueTitle, { color: colors.text }]}>{watchingShow.title}</Text>
                    <Text style={[styles.continueMeta, { color: colors.textSecondary }]}>{[showEpisode, watchingShow.platform].filter(Boolean).join(' · ') || watchingShow.platform}</Text>
                    {showArtworkQuery.data?.rating ? (
                      <View style={styles.ratingRow}><Star size={12} color="#F5A623" fill="#F5A623" /><Text style={[styles.ratingText, { color: colors.textSecondary }]}>{showArtworkQuery.data.rating.toFixed(1)}</Text></View>
                    ) : null}
                  </View>
                  <View style={[styles.continueArrow, { backgroundColor: isDark ? '#29243A' : '#F0ECFF' }]}><ArrowRight size={18} color="#7057E8" /></View>
                </TouchableOpacity>
              </View>
            ) : null}

            {(teamMatch || momentumHabit) ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title="On your radar" subtitle="Only active signals earn space here." colors={colors} />
                <View style={styles.radarRow}>
                  {teamMatch && favoriteTeam ? (
                    <TouchableOpacity activeOpacity={0.88} onPress={() => router.push('/(tabs)/sports')} style={[styles.radarCard, { backgroundColor: isDark ? '#282012' : '#FFF7E5' }]}>
                      <View style={styles.radarTopRow}>
                        {favoriteTeam.logo ? <Image source={{ uri: favoriteTeam.logo }} style={styles.teamLogo} /> : <Trophy size={22} color="#D98B00" />}
                        <Text style={styles.sportKicker}>{teamMatch.status === 'Live' ? 'LIVE' : 'NEXT MATCH'}</Text>
                      </View>
                      <Text style={[styles.radarTitle, { color: colors.text }]} numberOfLines={2}>{teamMatch.homeTeam} vs {teamMatch.awayTeam}</Text>
                      <Text style={[styles.radarMeta, { color: colors.textSecondary }]}>{[teamMatch.date, teamMatch.time, teamMatch.platform].filter(Boolean).join(' · ')}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {momentumHabit ? (
                    <TouchableOpacity activeOpacity={0.88} onPress={() => router.push('/(tabs)/discover')} style={[styles.radarCard, { backgroundColor: isDark ? '#10251C' : '#EAF9F1' }]}>
                      <View style={styles.radarTopRow}><Dumbbell size={21} color="#0E9B62" /><Text style={styles.habitKicker}>MOMENTUM</Text></View>
                      <Text style={[styles.habitStreak, { color: colors.text }]}>{momentumHabit.streak}</Text>
                      <Text style={[styles.radarTitle, { color: colors.text }]} numberOfLines={1}>{momentumHabit.name}</Text>
                      <Text style={[styles.radarMeta, { color: colors.textSecondary }]}>{momentumHabit.completedToday ? 'Done today · keep it alive' : `${momentumHabit.totalCompletions} completions so far`}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}

            {mediaQuery.data && mediaQuery.data.length > 0 ? (
              <View style={styles.sectionBlock}>
                <SectionHeader
                  title="Watch next"
                  subtitle={shows.length > 0 ? 'Trending titles filtered around your library.' : 'A strong starting point from what is trending now.'}
                  action="Open Watch"
                  onAction={() => router.push({ pathname: '/(tabs)/shows', params: { subtab: 'for-you' } } as any)}
                  colors={colors}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRail}>
                  {mediaQuery.data.map((pick) => <MediaPoster key={`${pick.mediaType}:${pick.id}`} pick={pick} colors={colors} />)}
                </ScrollView>
              </View>
            ) : mediaQuery.isLoading ? (
              <View style={styles.mediaLoading}><ActivityIndicator color={colors.primary} /></View>
            ) : null}

            {eventRail.length > 0 ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title="Worth going out for" subtitle={areaLabel ? `A few stronger picks around ${areaLabel}.` : 'Things happening close enough to actually do.'} action="See all" onAction={() => setMode('Near You')} colors={colors} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRail}>
                  {eventRail.map((event) => <EventCard key={event.id} event={event} saved={isSaved(event.id)} onToggle={() => void toggleSaved(event)} colors={colors} isDark={isDark} />)}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.sectionBlock}>
              <SectionHeader title="Explore your world" subtitle="The depth of One Pager without cluttering the main navigation." colors={colors} />
              <View style={styles.exploreGrid}>
                {exploreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.84}
                      onPress={() => router.push(item.route)}
                      style={[styles.exploreItem, { borderBottomColor: isDark ? '#262A32' : '#ECEEF2' }]}
                    >
                      <View style={[styles.exploreIcon, { backgroundColor: `${item.accent}18` }]}><Icon size={20} color={item.accent} /></View>
                      <View style={styles.exploreCopy}><Text style={[styles.exploreLabel, { color: colors.text }]}>{item.label}</Text><Text style={[styles.exploreNote, { color: colors.textSecondary }]} numberOfLines={1}>{item.note}</Text></View>
                      <ChevronRight size={17} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}

        {mode === 'Near You' ? (
          <View style={styles.modeContent}>
            <View style={styles.modeHeroCopy}>
              <Text style={[styles.modeHeadline, { color: colors.text }]}>{areaLabel ? `What's happening around ${areaLabel}` : 'What is happening near you'}</Text>
              <Text style={[styles.modeSubhead, { color: colors.textSecondary }]}>Organised by when you could actually go — not by provider.</Text>
            </View>

            {eventsLoading && allEvents.length === 0 ? (
              <View style={styles.centerState}><ActivityIndicator color={colors.primary} /></View>
            ) : allEvents.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: isDark ? '#171A20' : '#F5F6F8' }]}><MapPin size={28} color={colors.primary} /><Text style={[styles.emptyStateTitle, { color: colors.text }]}>Nothing useful nearby yet</Text><Text style={[styles.emptyStateCopy, { color: colors.textSecondary }]}>Try the full Events view or pull to refresh your location.</Text></View>
            ) : (
              <>
                {([
                  ['Today', groupedNearYou.today],
                  ['Tomorrow', groupedNearYou.tomorrow],
                  ['This week', groupedNearYou.thisWeek],
                  ['Later', groupedNearYou.later],
                ] as const).map(([label, rows]) => rows.length > 0 ? (
                  <View key={label} style={styles.nearGroup}>
                    <Text style={[styles.nearGroupTitle, { color: colors.text }]}>{label}</Text>
                    {rows.map((event) => <NearbyRow key={event.id} event={event} colors={colors} isDark={isDark} />)}
                  </View>
                ) : null)}
                <TouchableOpacity activeOpacity={0.84} onPress={() => router.push('/(tabs)/events')} style={[styles.fullEventsButton, { borderColor: isDark ? '#2A2E37' : '#E3E6EB' }]}><CalendarDays size={18} color={colors.primary} /><Text style={[styles.fullEventsText, { color: colors.text }]}>Open full Events discovery</Text><ArrowRight size={18} color={colors.primary} /></TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        {mode === 'Saved' ? (
          <View style={styles.modeContent}>
            <View style={styles.modeHeroCopy}>
              <Text style={[styles.modeHeadline, { color: colors.text }]}>Things you chose</Text>
              <Text style={[styles.modeSubhead, { color: colors.textSecondary }]}>Discovery should remember your decisions and bring them back before they matter.</Text>
            </View>
            {upcomingSaved.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: isDark ? '#171A20' : '#F5F6F8' }]}><Sparkles size={28} color={colors.primary} /><Text style={[styles.emptyStateTitle, { color: colors.text }]}>Your saved life is empty</Text><Text style={[styles.emptyStateCopy, { color: colors.textSecondary }]}>When something catches your eye, add it to your life and it will live here.</Text><TouchableOpacity activeOpacity={0.84} onPress={() => setMode('For You')} style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}><Text style={styles.emptyStateButtonText}>Find something</Text></TouchableOpacity></View>
            ) : (
              <>
                {upcomingSaved[0] ? (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/(root)/event/${upcomingSaved[0].id}` as any)} style={styles.savedHero}>
                    {upcomingSaved[0].image ? (
                      <ImageBackground source={{ uri: upcomingSaved[0].image }} style={styles.savedHeroMedia} imageStyle={styles.savedHeroRadius}>
                        <LinearGradient colors={['transparent', 'rgba(4,7,14,0.92)']} style={styles.savedHeroOverlay}><View style={styles.savedHeroBadge}><Check size={13} color="#FFFFFF" /><Text style={styles.savedHeroBadgeText}>IN YOUR LIFE</Text></View><View><Text style={styles.savedHeroCountdown}>{getEventCountdownLabel(upcomingSaved[0]).toUpperCase()}</Text><Text style={styles.savedHeroTitle}>{upcomingSaved[0].title}</Text><Text style={styles.savedHeroMeta}>{[upcomingSaved[0].date, upcomingSaved[0].time, upcomingSaved[0].venue].filter(Boolean).join(' · ')}</Text></View></LinearGradient>
                      </ImageBackground>
                    ) : (
                      <LinearGradient colors={['#15845A', '#0E3E30']} style={styles.savedHeroMedia}><View style={styles.savedHeroOverlay}><View><Text style={styles.savedHeroCountdown}>IN YOUR LIFE</Text><Text style={styles.savedHeroTitle}>{upcomingSaved[0].title}</Text></View></View></LinearGradient>
                    )}
                  </TouchableOpacity>
                ) : null}
                <View style={styles.savedList}>
                  {upcomingSaved.slice(1).map((event) => <NearbyRow key={event.id} event={event} colors={colors} isDark={isDark} />)}
                </View>
              </>
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1 },
  contextLine: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.25, marginBottom: 3 },
  pageTitle: { fontSize: 38, lineHeight: 42, fontWeight: '800', letterSpacing: -1.4 },
  tuneButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  segment: { marginTop: 15, padding: 3, borderRadius: 13, flexDirection: 'row' },
  segmentButton: { flex: 1, minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 13, fontWeight: '700' },

  editHeader: { paddingHorizontal: 20, marginTop: 24 },
  editLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.35 },
  editHeadline: { marginTop: 5, fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.35 },
  spotlightWrap: { paddingHorizontal: 20, marginTop: 13 },
  spotlightLoading: { height: 300, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 9 },
  loadingText: { fontSize: 13, fontWeight: '600' },
  spotlightCard: { borderRadius: 26, overflow: 'hidden' },
  spotlightMedia: { height: 315 },
  spotlightRadius: { borderRadius: 26 },
  spotlightOverlay: { flex: 1, padding: 17, justifyContent: 'space-between' },
  spotlightTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  spotlightChip: { alignSelf: 'flex-start', minHeight: 29, maxWidth: '78%', borderRadius: 15, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(6,9,16,0.64)' },
  spotlightChipText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700', flexShrink: 1 },
  spotlightCountdown: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1.0 },
  spotlightEyebrow: { color: '#CBD7FF', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.35, marginBottom: 6 },
  spotlightTitle: { color: '#FFFFFF', fontSize: 29, lineHeight: 33, fontWeight: '800', letterSpacing: -0.75 },
  spotlightInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  spotlightMeta: { color: 'rgba(255,255,255,0.84)', fontSize: 12.5, lineHeight: 18, fontWeight: '600', flexShrink: 1 },
  floatingAdd: { position: 'absolute', right: 13, bottom: 13, minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  floatingAddText: { fontSize: 12.5, fontWeight: '800' },
  emptySpotlight: { minHeight: 220, borderRadius: 26, padding: 22, justifyContent: 'center' },
  emptySpotlightTitle: { marginTop: 14, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  emptySpotlightCopy: { marginTop: 7, fontSize: 14, lineHeight: 20 },

  signalsSection: { marginTop: 17 },
  signalsLabel: { paddingHorizontal: 20, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2 },
  signalsRail: { paddingHorizontal: 20, paddingTop: 8, gap: 7 },
  signalChip: { minHeight: 31, borderRadius: 16, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  signalText: { fontSize: 12, fontWeight: '700' },

  sectionBlock: { marginTop: 30 },
  sectionHeader: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 12 },
  sectionHeaderCopy: { flex: 1 },
  sectionTitle: { fontSize: 22, lineHeight: 26, fontWeight: '800', letterSpacing: -0.55 },
  sectionSubtitle: { marginTop: 3, fontSize: 13, lineHeight: 18 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', paddingBottom: 2 },
  sectionActionText: { fontSize: 12.5, fontWeight: '800' },

  continueCard: { marginHorizontal: 20, borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 13, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  continuePoster: { width: 76, height: 108, borderRadius: 14, resizeMode: 'cover' },
  continuePosterFallback: { width: 76, height: 108, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  continueCopy: { flex: 1 },
  continueEyebrow: { color: '#7057E8', fontSize: 9.5, fontWeight: '800', letterSpacing: 1.1 },
  continueTitle: { marginTop: 5, fontSize: 19, lineHeight: 23, fontWeight: '800' },
  continueMeta: { marginTop: 5, fontSize: 12.5, lineHeight: 17 },
  ratingRow: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 11.5, fontWeight: '700' },
  continueArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  radarRow: { paddingHorizontal: 20, flexDirection: 'row', gap: 10 },
  radarCard: { flex: 1, minHeight: 156, borderRadius: 22, padding: 15 },
  radarTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamLogo: { width: 28, height: 28, resizeMode: 'contain' },
  sportKicker: { color: '#D98B00', fontSize: 9, fontWeight: '800', letterSpacing: 1.0 },
  habitKicker: { color: '#0E9B62', fontSize: 9, fontWeight: '800', letterSpacing: 1.0 },
  radarTitle: { marginTop: 14, fontSize: 15.5, lineHeight: 19, fontWeight: '800' },
  radarMeta: { marginTop: 5, fontSize: 11.5, lineHeight: 16 },
  habitStreak: { marginTop: 7, fontSize: 37, lineHeight: 39, fontWeight: '800', letterSpacing: -1.2 },

  mediaLoading: { marginTop: 30, height: 120, alignItems: 'center', justifyContent: 'center' },
  mediaRail: { paddingHorizontal: 20, gap: 11 },
  mediaPoster: { width: 132 },
  mediaPosterImage: { width: 132, height: 198, borderRadius: 17, resizeMode: 'cover', backgroundColor: '#E7E8EC' },
  mediaPosterFallback: { width: 132, height: 198, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  mediaPosterTitle: { marginTop: 8, fontSize: 13.5, lineHeight: 17, fontWeight: '700' },
  mediaPosterMetaRow: { marginTop: 4, minHeight: 16, flexDirection: 'row', alignItems: 'center', gap: 4 },
  mediaPosterMeta: { fontSize: 11.5, fontWeight: '600' },

  eventRail: { paddingHorizontal: 20, gap: 11 },
  eventCard: { width: 220, borderRadius: 22, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  eventImage: { width: '100%', height: 145 },
  eventImageRadius: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  eventImageOverlay: { flex: 1, padding: 9, justifyContent: 'flex-end' },
  eventDistancePill: { alignSelf: 'flex-start', minHeight: 25, paddingHorizontal: 8, borderRadius: 13, backgroundColor: 'rgba(5,8,14,0.62)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventDistanceText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' },
  eventImageFallback: { width: '100%', height: 145, alignItems: 'center', justifyContent: 'center' },
  eventBody: { padding: 12 },
  eventEyebrow: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.0, textTransform: 'uppercase' },
  eventTitle: { marginTop: 4, fontSize: 15.5, lineHeight: 19, fontWeight: '800' },
  eventMeta: { marginTop: 5, fontSize: 11.5, lineHeight: 16 },
  eventSave: { alignSelf: 'flex-start', marginTop: 9, minHeight: 30, paddingHorizontal: 9, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventSaveText: { fontSize: 11.5, fontWeight: '800' },

  exploreGrid: { marginHorizontal: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.18)' },
  exploreItem: { minHeight: 66, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 11 },
  exploreIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exploreCopy: { flex: 1 },
  exploreLabel: { fontSize: 14.5, fontWeight: '800' },
  exploreNote: { marginTop: 2, fontSize: 11.5 },

  modeContent: { paddingTop: 23 },
  modeHeroCopy: { paddingHorizontal: 20, marginBottom: 20 },
  modeHeadline: { fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8 },
  modeSubhead: { marginTop: 6, fontSize: 14, lineHeight: 20 },
  centerState: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  emptyState: { marginHorizontal: 20, borderRadius: 24, padding: 23, minHeight: 210, justifyContent: 'center' },
  emptyStateTitle: { marginTop: 14, fontSize: 21, lineHeight: 25, fontWeight: '800' },
  emptyStateCopy: { marginTop: 6, fontSize: 13.5, lineHeight: 19 },
  emptyStateButton: { alignSelf: 'flex-start', marginTop: 16, minHeight: 40, borderRadius: 20, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  emptyStateButtonText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  nearGroup: { marginTop: 19 },
  nearGroupTitle: { paddingHorizontal: 20, marginBottom: 2, fontSize: 18, fontWeight: '800' },
  nearbyRow: { marginHorizontal: 20, minHeight: 92, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  nearbyThumb: { width: 70, height: 70, borderRadius: 14, resizeMode: 'cover' },
  nearbyThumbFallback: { width: 70, height: 70, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  nearbyCopy: { flex: 1 },
  nearbyReason: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.9 },
  nearbyTitle: { marginTop: 3, fontSize: 14.5, lineHeight: 18, fontWeight: '800' },
  nearbyMeta: { marginTop: 4, fontSize: 11.5, lineHeight: 16 },
  fullEventsButton: { marginHorizontal: 20, marginTop: 22, minHeight: 54, borderWidth: 1, borderRadius: 17, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fullEventsText: { flex: 1, fontSize: 13.5, fontWeight: '800' },

  savedHero: { marginHorizontal: 20, borderRadius: 25, overflow: 'hidden' },
  savedHeroMedia: { height: 260 },
  savedHeroRadius: { borderRadius: 25 },
  savedHeroOverlay: { flex: 1, padding: 17, justifyContent: 'space-between' },
  savedHeroBadge: { alignSelf: 'flex-start', minHeight: 28, borderRadius: 14, paddingHorizontal: 9, backgroundColor: 'rgba(18,138,80,0.90)', flexDirection: 'row', alignItems: 'center', gap: 5 },
  savedHeroBadgeText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.9 },
  savedHeroCountdown: { color: '#BDEBD1', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 5 },
  savedHeroTitle: { color: '#FFFFFF', fontSize: 25, lineHeight: 29, fontWeight: '800' },
  savedHeroMeta: { marginTop: 7, color: 'rgba(255,255,255,0.82)', fontSize: 12.5, lineHeight: 18 },
  savedList: { marginTop: 13 },
});
