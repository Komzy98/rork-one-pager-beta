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
  gradient: [string, string];
};

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

function EventStripCard({
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
      style={[styles.stripCard, { backgroundColor: isDark ? '#151820' : '#FFFFFF' }]}
    >
      {event.image ? (
        <ImageBackground source={{ uri: event.image }} style={styles.stripImage} imageStyle={styles.stripImageRadius}>
          <LinearGradient colors={['transparent', 'rgba(7,10,18,0.76)']} style={styles.stripImageGradient}>
            <View style={styles.stripDistancePill}>
              <MapPin size={11} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.stripDistanceText}>{formatDistance(event.distanceKm) ?? 'Near you'}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient colors={['#3357C8', '#18213A']} style={styles.stripImageFallback}>
          <MapPin size={28} color="#FFFFFF" />
        </LinearGradient>
      )}
      <View style={styles.stripBody}>
        <Text style={[styles.stripCategory, { color: colors.primary }]}>{titleCase(event.category || 'Event')}</Text>
        <Text style={[styles.stripTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.stripMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {[event.date, event.time].filter(Boolean).join(' · ')}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(pressEvent) => {
            pressEvent.stopPropagation?.();
            onToggle();
          }}
          style={[styles.stripSave, { backgroundColor: saved ? '#E5F7ED' : isDark ? '#262A33' : '#F3F5F8' }]}
        >
          {saved ? <Check size={13} color="#138C50" /> : <Plus size={13} color={colors.text} />}
          <Text style={[styles.stripSaveText, { color: saved ? '#138C50' : colors.text }]}>{saved ? 'Added' : 'Add'}</Text>
        </TouchableOpacity>
      </View>
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

  const heroEvent = rankedEvents[0] ?? null;
  const eventRail = rankedEvents.filter((event) => event.id !== heroEvent?.id).slice(0, 7);
  const sideEvents = eventRail.slice(0, 2);

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

  const nextSaved = upcomingSaved[0] ?? null;
  const liveEvents = eventsSource !== 'fallback' && eventsSource !== 'none';

  const worldItems = useMemo<WorldItem[]>(
    () => [
      {
        id: 'shows',
        label: 'Watch',
        note: watchingShow ? watchingShow.title : 'Shows & films',
        route: '/(tabs)/shows',
        icon: Clapperboard,
        gradient: ['#6E56CF', '#4338A8'],
      },
      {
        id: 'sports',
        label: 'Sports',
        note: favoriteTeam ? favoriteTeam.name : 'Teams & fixtures',
        route: '/(tabs)/sports',
        icon: Trophy,
        gradient: ['#F59E0B', '#D97706'],
      },
      {
        id: 'events',
        label: 'Go out',
        note: areaLabel ? `Around ${areaLabel}` : 'Events near you',
        route: '/(tabs)/events',
        icon: MapPin,
        gradient: ['#2563EB', '#1D4ED8'],
      },
      {
        id: 'habits',
        label: 'Build',
        note: strongestHabit ? `${strongestHabit.streak}-day streak` : 'Habits & routines',
        route: '/(tabs)/discover',
        icon: Dumbbell,
        gradient: ['#10B981', '#047857'],
      },
      {
        id: 'learning',
        label: 'Learn',
        note: interests[0] ? titleCase(interests[0]) : 'Courses & ideas',
        route: '/(tabs)/learning',
        icon: BookOpen,
        gradient: ['#0EA5E9', '#0369A1'],
      },
      {
        id: 'cooking',
        label: 'Cook',
        note: 'Ideas for tonight',
        route: '/(tabs)/cooking',
        icon: ChefHat,
        gradient: ['#F97316', '#C2410C'],
      },
    ],
    [watchingShow, favoriteTeam, areaLabel, strongestHabit, interests],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshLocation(), refetchEvents()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshLocation, refetchEvents]);

  const todayLabel = useMemo(
    () => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date()),
    [],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{
          paddingTop: insets.top + 14,
          paddingBottom: floatingTabBarScrollPadding(insets.bottom) + 42,
        }}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.dateLine, { color: colors.textSecondary }]}>{todayLabel}</Text>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Discover</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
              style={[styles.tuneButton, { backgroundColor: isDark ? '#1A1D24' : '#F1F3F7' }]}
            >
              <SlidersHorizontal size={19} color={colors.text} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.pageSub, { color: colors.textSecondary }]}>A living feed of things worth doing, watching and following.</Text>
        </View>

        <View style={styles.heroSection}>
          {eventsLoading && !heroEvent ? (
            <View style={[styles.heroLoading, { backgroundColor: isDark ? '#171A22' : '#EEF2F7' }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingCopy, { color: colors.textSecondary }]}>Looking for something strong near you…</Text>
            </View>
          ) : heroEvent ? (
            <View style={styles.heroEditorial}>
              {heroEvent.image ? (
                <ImageBackground source={{ uri: heroEvent.image }} style={styles.heroMedia} imageStyle={styles.heroRadius}>
                  <LinearGradient colors={['rgba(4,8,18,0.02)', 'rgba(4,8,18,0.94)']} style={styles.heroOverlay}>
                    <View style={styles.heroTopRow}>
                      <View style={styles.heroChip}>
                        <Sparkles size={12} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.heroChipText}>{reasonForEvent(heroEvent, favoriteCategories, interests, areaLabel)}</Text>
                      </View>
                      {heroEvent.isHot ? (
                        <View style={styles.hotChip}>
                          <Flame size={12} color="#FFFFFF" fill="#FFFFFF" />
                          <Text style={styles.hotChipText}>HOT</Text>
                        </View>
                      ) : null}
                    </View>
                    <View>
                      <Text style={styles.heroEyebrow}>{liveEvents ? 'ONE PAGER PICK' : 'DISCOVERY PREVIEW'}</Text>
                      <Text style={styles.heroTitle}>{heroEvent.title}</Text>
                      <View style={styles.heroInfoRow}>
                        <Clock3 size={14} color="rgba(255,255,255,0.82)" />
                        <Text style={styles.heroInfoText}>{[heroEvent.date, heroEvent.time].filter(Boolean).join(' · ')}</Text>
                      </View>
                      <View style={styles.heroInfoRow}>
                        <MapPin size={14} color="rgba(255,255,255,0.82)" />
                        <Text style={styles.heroInfoText} numberOfLines={1}>{[heroEvent.venue, formatDistance(heroEvent.distanceKm)].filter(Boolean).join(' · ')}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              ) : (
                <LinearGradient colors={['#385AC9', '#141B30']} style={styles.heroMedia}>
                  <View style={styles.heroOverlay}>
                    <View style={styles.heroChip}>
                      <Sparkles size={12} color="#FFFFFF" />
                      <Text style={styles.heroChipText}>{reasonForEvent(heroEvent, favoriteCategories, interests, areaLabel)}</Text>
                    </View>
                    <View>
                      <Text style={styles.heroEyebrow}>ONE PAGER PICK</Text>
                      <Text style={styles.heroTitle}>{heroEvent.title}</Text>
                      <Text style={styles.heroInfoText}>{[heroEvent.date, heroEvent.time, heroEvent.venue].filter(Boolean).join(' · ')}</Text>
                    </View>
                  </View>
                </LinearGradient>
              )}
              <View style={[styles.heroBar, { backgroundColor: isDark ? '#11141A' : '#FFFFFF' }]}>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => void toggleSaved(heroEvent)}
                  style={[styles.heroAdd, { backgroundColor: isSaved(heroEvent.id) ? '#E5F7ED' : isDark ? '#242832' : '#F1F3F7' }]}
                >
                  {isSaved(heroEvent.id) ? <Check size={17} color="#14894F" /> : <Plus size={17} color={colors.text} />}
                  <Text style={[styles.heroAddText, { color: isSaved(heroEvent.id) ? '#14894F' : colors.text }]}>
                    {isSaved(heroEvent.id) ? 'In my life' : 'Add to my life'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/(root)/event/${heroEvent.id}` as any)} style={styles.heroDetails}>
                  <Text style={[styles.heroDetailsText, { color: colors.primary }]}>Explore</Text>
                  <ArrowUpRight size={17} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(tabs)/events')} style={[styles.heroEmpty, { backgroundColor: isDark ? '#17213A' : '#EDF3FF' }]}>
              <Sparkles size={28} color={colors.primary} />
              <Text style={[styles.heroEmptyTitle, { color: colors.text }]}>Give Discover more to work with</Text>
              <Text style={[styles.heroEmptyCopy, { color: colors.textSecondary }]}>Follow teams, save events and add interests. This page gets sharper as One Pager learns you.</Text>
            </TouchableOpacity>
          )}
        </View>

        {sideEvents.length > 0 ? (
          <View style={styles.editorialSplit}>
            <View style={styles.sectionLabelRow}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Happening around you</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/events')} style={styles.inlineLink}>
                <Text style={[styles.inlineLinkText, { color: colors.primary }]}>See all</Text>
                <ChevronRight size={15} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.splitGrid}>
              {sideEvents.map((event, index) => (
                <TouchableOpacity
                  key={event.id}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/(root)/event/${event.id}` as any)}
                  style={[styles.splitCard, index === 0 && styles.splitCardTall]}
                >
                  {event.image ? (
                    <ImageBackground source={{ uri: event.image }} style={styles.splitImage} imageStyle={styles.splitRadius}>
                      <LinearGradient colors={['transparent', 'rgba(4,7,14,0.88)']} style={styles.splitOverlay}>
                        <Text style={styles.splitKicker}>{titleCase(event.category || 'Event')}</Text>
                        <Text style={styles.splitTitle} numberOfLines={3}>{event.title}</Text>
                        <Text style={styles.splitMeta}>{[event.date, formatDistance(event.distanceKm)].filter(Boolean).join(' · ')}</Text>
                      </LinearGradient>
                    </ImageBackground>
                  ) : (
                    <LinearGradient colors={index === 0 ? ['#2F62DF', '#17337A'] : ['#7C3AED', '#4C1D95']} style={styles.splitImage}>
                      <View style={styles.splitOverlay}>
                        <Text style={styles.splitKicker}>{titleCase(event.category || 'Event')}</Text>
                        <Text style={styles.splitTitle}>{event.title}</Text>
                        <Text style={styles.splitMeta}>{event.date}</Text>
                      </View>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.pulseSection}>
          <View style={styles.pulseHeadingRow}>
            <View>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Your pulse</Text>
              <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>The things already moving in your life.</Text>
            </View>
          </View>

          <View style={styles.pulseBento}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push('/(tabs)/shows')}
              style={[styles.watchPanel, { backgroundColor: isDark ? '#1B1730' : '#F1EDFF' }]}
            >
              <View style={styles.panelIconRow}>
                <View style={styles.watchIcon}><Clapperboard size={20} color="#7057E8" /></View>
                <Text style={styles.watchKicker}>WATCH</Text>
              </View>
              <Text style={[styles.panelTitleLarge, { color: colors.text }]} numberOfLines={2}>
                {watchingShow?.title ?? 'Your next watch'}
              </Text>
              <Text style={[styles.panelMeta, { color: colors.textSecondary }]}>
                {watchingShow
                  ? watchingShow.type === 'Series' && watchingShow.currentEpisode
                    ? `S${watchingShow.currentSeason ?? 1} · E${watchingShow.currentEpisode} · ${watchingShow.platform}`
                    : `${watchingShow.type} · ${watchingShow.platform}`
                  : 'Add a show and One Pager will keep your place.'}
              </Text>
              <View style={styles.panelArrow}><ArrowRight size={18} color="#7057E8" /></View>
            </TouchableOpacity>

            <View style={styles.pulseRightColumn}>
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => router.push('/(tabs)/sports')}
                style={[styles.sportPanel, { backgroundColor: isDark ? '#2A2112' : '#FFF7E5' }]}
              >
                <View style={styles.sportTopLine}>
                  {favoriteTeam?.logo ? <Image source={{ uri: favoriteTeam.logo }} style={styles.sportLogo} /> : <Medal size={22} color="#D98B00" />}
                  <Text style={styles.sportKicker}>SPORT</Text>
                </View>
                <Text style={[styles.panelTitleSmall, { color: colors.text }]} numberOfLines={2}>
                  {teamMatch ? `${teamMatch.homeTeam} vs ${teamMatch.awayTeam}` : favoriteTeam ? favoriteTeam.name : 'Follow a team'}
                </Text>
                <Text style={[styles.panelMetaSmall, { color: colors.textSecondary }]}>
                  {teamMatch ? `${teamMatch.date} · ${teamMatch.time}` : favoriteTeam?.league ?? 'Fixtures appear here'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => router.push('/(tabs)/discover')}
                style={[styles.habitPanel, { backgroundColor: isDark ? '#10251C' : '#EAF9F1' }]}
              >
                <View style={styles.habitTopLine}>
                  <Dumbbell size={20} color="#0E9B62" />
                  <Text style={styles.habitKicker}>MOMENTUM</Text>
                </View>
                <Text style={[styles.habitNumber, { color: colors.text }]}>{strongestHabit?.streak ?? 0}</Text>
                <Text style={[styles.habitLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {strongestHabit ? `${strongestHabit.name} streak` : 'days — start a habit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.worldSection}>
          <View style={styles.sectionLabelRow}>
            <View>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Explore your world</Text>
              <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>All the depth of One Pager, one layer down.</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.worldRail}>
            {worldItems.map((item) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity key={item.id} activeOpacity={0.88} onPress={() => router.push(item.route)} style={styles.worldTile}>
                  <LinearGradient colors={item.gradient} style={styles.worldGradient}>
                    <View style={styles.worldIcon}><Icon size={25} color="#FFFFFF" strokeWidth={2.2} /></View>
                    <View>
                      <Text style={styles.worldLabel}>{item.label}</Text>
                      <Text style={styles.worldNote} numberOfLines={2}>{item.note}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {eventRail.length > 0 ? (
          <View style={styles.railSection}>
            <View style={styles.sectionLabelRow}>
              <View>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>{areaLabel ? `More around ${areaLabel}` : 'More near you'}</Text>
                <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Save anything that deserves a place in your week.</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripRail}>
              {eventRail.map((event) => (
                <EventStripCard
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

        {(nextSaved || surpriseEvent) ? (
          <View style={styles.bottomEditorial}>
            {nextSaved ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => router.push(`/(root)/event/${nextSaved.id}` as any)}
                style={[styles.savedPanel, { backgroundColor: isDark ? '#14231B' : '#ECFAF2' }]}
              >
                <View style={styles.savedTop}>
                  <View style={styles.savedBadge}><Check size={15} color="#0C8F53" /></View>
                  <Text style={styles.savedKicker}>ALREADY IN YOUR LIFE</Text>
                </View>
                <Text style={[styles.savedTitle, { color: colors.text }]}>{nextSaved.title}</Text>
                <Text style={[styles.savedMeta, { color: colors.textSecondary }]}>{[nextSaved.date, nextSaved.time, nextSaved.venue].filter(Boolean).join(' · ')}</Text>
                <View style={styles.savedArrow}><ArrowUpRight size={18} color="#0C8F53" /></View>
              </TouchableOpacity>
            ) : null}

            {surpriseEvent ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => router.push(`/(root)/event/${surpriseEvent.id}` as any)}
                style={[styles.surprisePanel, { backgroundColor: isDark ? '#2A2113' : '#FFF7E4' }]}
              >
                <View style={styles.surpriseTop}>
                  <Sparkles size={18} color="#B7791F" />
                  <Text style={styles.surpriseKicker}>OUTSIDE YOUR USUAL</Text>
                </View>
                <Text style={[styles.surpriseTitle, { color: colors.text }]}>{surpriseEvent.title}</Text>
                <Text style={[styles.surpriseMeta, { color: colors.textSecondary }]}>{[titleCase(surpriseEvent.category || 'Event'), surpriseEvent.date, formatDistance(surpriseEvent.distanceKm)].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.surpriseLink}>See if it surprises you →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => router.push('/(tabs)/profile')}
          style={[styles.tuneFooter, { borderColor: isDark ? '#2A2E38' : '#E5E8EE' }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.tuneFooterTitle, { color: colors.text }]}>Tune your Discover</Text>
            <Text style={[styles.tuneFooterCopy, { color: colors.textSecondary }]}>Interests, teams and preferences directly shape what gets surfaced here.</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  dateLine: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  pageTitle: { fontSize: 42, lineHeight: 45, fontWeight: '850', letterSpacing: -1.6 },
  pageSub: { marginTop: 7, fontSize: 15.5, lineHeight: 22, maxWidth: 560 },
  tuneButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 7 },

  heroSection: { paddingHorizontal: 20, marginTop: 22 },
  heroLoading: { minHeight: 390, borderRadius: 30, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingCopy: { fontSize: 14, fontWeight: '650' },
  heroEditorial: { borderRadius: 30, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  heroMedia: { minHeight: 390, justifyContent: 'space-between' },
  heroRadius: { borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  heroOverlay: { flex: 1, minHeight: 390, padding: 20, justifyContent: 'space-between' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroChip: { alignSelf: 'flex-start', minHeight: 30, maxWidth: '78%', paddingHorizontal: 10, borderRadius: 15, backgroundColor: 'rgba(8,11,19,0.64)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroChipText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '750', flexShrink: 1 },
  hotChip: { minHeight: 28, paddingHorizontal: 9, borderRadius: 14, backgroundColor: 'rgba(232,67,45,0.92)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  hotChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '850', letterSpacing: 0.7 },
  heroEyebrow: { color: '#C9D7FF', fontSize: 11, fontWeight: '850', letterSpacing: 1.5, marginBottom: 8 },
  heroTitle: { color: '#FFFFFF', fontSize: 31, lineHeight: 35, fontWeight: '850', letterSpacing: -0.8, maxWidth: '96%' },
  heroInfoRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroInfoText: { color: 'rgba(255,255,255,0.84)', fontSize: 13, lineHeight: 18, fontWeight: '600', flexShrink: 1 },
  heroBar: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  heroAdd: { flex: 1, minHeight: 46, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  heroAddText: { fontSize: 13, fontWeight: '800' },
  heroDetails: { minHeight: 46, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroDetailsText: { fontSize: 13, fontWeight: '850' },
  heroEmpty: { minHeight: 260, borderRadius: 30, padding: 24, justifyContent: 'center' },
  heroEmptyTitle: { marginTop: 18, fontSize: 25, lineHeight: 30, fontWeight: '850', letterSpacing: -0.5 },
  heroEmptyCopy: { marginTop: 8, fontSize: 15, lineHeight: 22 },

  editorialSplit: { marginTop: 32 },
  sectionLabelRow: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionLabel: { fontSize: 24, lineHeight: 28, fontWeight: '850', letterSpacing: -0.6 },
  sectionCaption: { marginTop: 4, fontSize: 13.5, lineHeight: 19 },
  inlineLink: { flexDirection: 'row', alignItems: 'center', paddingBottom: 2 },
  inlineLinkText: { fontSize: 13, fontWeight: '800' },
  splitGrid: { paddingHorizontal: 20, marginTop: 13, flexDirection: 'row', gap: 10 },
  splitCard: { flex: 1, minHeight: 215, borderRadius: 24, overflow: 'hidden' },
  splitCardTall: { minHeight: 265 },
  splitImage: { flex: 1, minHeight: '100%' },
  splitRadius: { borderRadius: 24 },
  splitOverlay: { flex: 1, padding: 14, justifyContent: 'flex-end' },
  splitKicker: { color: '#C9D7FF', fontSize: 10, fontWeight: '850', letterSpacing: 1.0, textTransform: 'uppercase', marginBottom: 5 },
  splitTitle: { color: '#FFFFFF', fontSize: 18, lineHeight: 22, fontWeight: '850', letterSpacing: -0.3 },
  splitMeta: { color: 'rgba(255,255,255,0.78)', marginTop: 6, fontSize: 11.5, lineHeight: 16 },

  pulseSection: { marginTop: 34 },
  pulseHeadingRow: { paddingHorizontal: 20 },
  pulseBento: { paddingHorizontal: 20, marginTop: 13, flexDirection: 'row', gap: 10, minHeight: 330 },
  watchPanel: { flex: 1.05, borderRadius: 26, padding: 18, justifyContent: 'space-between' },
  pulseRightColumn: { flex: 0.95, gap: 10 },
  sportPanel: { flex: 1.05, borderRadius: 24, padding: 15 },
  habitPanel: { flex: 0.95, borderRadius: 24, padding: 15 },
  panelIconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  watchIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(112,87,232,0.14)', alignItems: 'center', justifyContent: 'center' },
  watchKicker: { color: '#7057E8', fontSize: 10.5, fontWeight: '850', letterSpacing: 1.2 },
  panelTitleLarge: { marginTop: 42, fontSize: 24, lineHeight: 28, fontWeight: '850', letterSpacing: -0.5 },
  panelMeta: { marginTop: 8, fontSize: 13, lineHeight: 19 },
  panelArrow: { marginTop: 18, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(112,87,232,0.14)', alignItems: 'center', justifyContent: 'center' },
  sportTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sportLogo: { width: 32, height: 32, resizeMode: 'contain' },
  sportKicker: { color: '#D98B00', fontSize: 9.5, fontWeight: '850', letterSpacing: 1.0 },
  panelTitleSmall: { marginTop: 16, fontSize: 16.5, lineHeight: 20, fontWeight: '850' },
  panelMetaSmall: { marginTop: 5, fontSize: 11.5, lineHeight: 16 },
  habitTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  habitKicker: { color: '#0E9B62', fontSize: 9.5, fontWeight: '850', letterSpacing: 1.0 },
  habitNumber: { marginTop: 8, fontSize: 39, lineHeight: 42, fontWeight: '850', letterSpacing: -1.5 },
  habitLabel: { marginTop: 2, fontSize: 11.5, lineHeight: 16 },

  worldSection: { marginTop: 35 },
  worldRail: { paddingHorizontal: 20, paddingTop: 13, gap: 10 },
  worldTile: { width: 154, height: 190, borderRadius: 25, overflow: 'hidden' },
  worldGradient: { flex: 1, padding: 17, justifyContent: 'space-between' },
  worldIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  worldLabel: { color: '#FFFFFF', fontSize: 21, fontWeight: '850', letterSpacing: -0.4 },
  worldNote: { color: 'rgba(255,255,255,0.78)', marginTop: 4, fontSize: 12, lineHeight: 17 },

  railSection: { marginTop: 35 },
  stripRail: { paddingHorizontal: 20, paddingTop: 13, gap: 12 },
  stripCard: { width: 218, borderRadius: 23, overflow: 'hidden' },
  stripImage: { width: '100%', height: 150 },
  stripImageRadius: { borderTopLeftRadius: 23, borderTopRightRadius: 23 },
  stripImageGradient: { flex: 1, padding: 10, justifyContent: 'flex-end' },
  stripDistancePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 25, paddingHorizontal: 8, borderRadius: 13, backgroundColor: 'rgba(7,10,18,0.60)' },
  stripDistanceText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '750' },
  stripImageFallback: { width: '100%', height: 150, alignItems: 'center', justifyContent: 'center' },
  stripBody: { padding: 13 },
  stripCategory: { fontSize: 10, fontWeight: '850', letterSpacing: 1.0, textTransform: 'uppercase', marginBottom: 5 },
  stripTitle: { fontSize: 16.5, lineHeight: 20, fontWeight: '850' },
  stripMeta: { marginTop: 5, fontSize: 11.5, lineHeight: 16 },
  stripSave: { alignSelf: 'flex-start', marginTop: 10, minHeight: 31, paddingHorizontal: 10, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 5 },
  stripSaveText: { fontSize: 11.5, fontWeight: '800' },

  bottomEditorial: { paddingHorizontal: 20, marginTop: 35, gap: 12 },
  savedPanel: { minHeight: 180, borderRadius: 26, padding: 18 },
  savedTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedBadge: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#DDF5E8', alignItems: 'center', justifyContent: 'center' },
  savedKicker: { color: '#0C8F53', fontSize: 10, fontWeight: '850', letterSpacing: 1.0 },
  savedTitle: { marginTop: 18, fontSize: 22, lineHeight: 27, fontWeight: '850', letterSpacing: -0.4 },
  savedMeta: { marginTop: 6, fontSize: 12.5, lineHeight: 18 },
  savedArrow: { position: 'absolute', right: 18, bottom: 18, width: 38, height: 38, borderRadius: 19, backgroundColor: '#DDF5E8', alignItems: 'center', justifyContent: 'center' },
  surprisePanel: { minHeight: 180, borderRadius: 26, padding: 18 },
  surpriseTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  surpriseKicker: { color: '#B7791F', fontSize: 10, fontWeight: '850', letterSpacing: 1.0 },
  surpriseTitle: { marginTop: 18, fontSize: 22, lineHeight: 27, fontWeight: '850', letterSpacing: -0.4 },
  surpriseMeta: { marginTop: 6, fontSize: 12.5, lineHeight: 18 },
  surpriseLink: { color: '#B7791F', marginTop: 17, fontSize: 12.5, fontWeight: '850' },

  tuneFooter: { marginHorizontal: 20, marginTop: 34, paddingVertical: 19, borderTopWidth: 1, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 16 },
  tuneFooterTitle: { fontSize: 16, fontWeight: '850' },
  tuneFooterCopy: { marginTop: 4, fontSize: 12.5, lineHeight: 18 },
});