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
  ArrowUpRight,
  BookOpen,
  Check,
  ChefHat,
  ChevronRight,
  Clapperboard,
  Dumbbell,
  MapPin,
  Medal,
  Plus,
  SlidersHorizontal,
  Sparkles,
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
  accent: string;
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
  if (event.isHot) score += 8;
  if (event.isFeatured) score += 5;
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
  cta,
  onPress,
  colors,
}: {
  title: string;
  subtitle?: string;
  cta?: string;
  onPress?: () => void;
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
      {cta && onPress ? (
        <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.sectionAction}>
          <Text style={[styles.sectionActionText, { color: colors.primary }]}>{cta}</Text>
          <ChevronRight size={15} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function EventPoster({
  event,
  isSaved,
  onToggle,
  colors,
  isDark,
}: {
  event: LocalEvent;
  isSaved: boolean;
  onToggle: () => void;
  colors: { text: string; textSecondary: string; primary: string };
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push(`/(root)/event/${event.id}`)}
      style={[
        styles.eventPoster,
        {
          backgroundColor: isDark ? '#171A21' : '#FFFFFF',
          borderColor: isDark ? '#292D36' : '#E8EBF1',
        },
      ]}
    >
      {event.image ? (
        <Image source={{ uri: event.image }} style={styles.eventPosterImage} />
      ) : (
        <LinearGradient colors={['#2B4DA0', '#172033']} style={styles.eventPosterImageFallback}>
          <MapPin size={24} color="#FFFFFF" />
        </LinearGradient>
      )}
      <View style={styles.eventPosterBody}>
        <Text style={[styles.eventCategory, { color: colors.primary }]}>{titleCase(event.category || 'Event')}</Text>
        <Text style={[styles.eventPosterTitle, { color: colors.text }]} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={[styles.eventPosterMeta, { color: colors.textSecondary }]} numberOfLines={2}>
          {[event.date, event.time, formatDistance(event.distanceKm)].filter(Boolean).join(' · ')}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(pressEvent) => {
            pressEvent.stopPropagation?.();
            onToggle();
          }}
          style={[
            styles.smallSave,
            { backgroundColor: isSaved ? '#E8F8EF' : isDark ? '#242831' : '#F3F5F8' },
          ]}
        >
          {isSaved ? <Check size={14} color="#159957" /> : <Plus size={14} color={colors.text} />}
          <Text style={[styles.smallSaveText, { color: isSaved ? '#159957' : colors.text }]}>
            {isSaved ? 'Added' : 'Add'}
          </Text>
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
  const nearYou = rankedEvents.filter((event) => event.id !== heroEvent?.id).slice(0, 6);

  const surpriseEvent = useMemo(() => {
    const favoriteSet = new Set(favoriteCategories.map(normalize));
    return (
      rankedEvents.find((event) => !favoriteSet.has(normalize(event.category)) && event.id !== heroEvent?.id) ??
      rankedEvents[2] ??
      null
    );
  }, [rankedEvents, favoriteCategories, heroEvent?.id]);

  const watchingShow = useMemo(
    () =>
      shows.find((show) => show.status === 'Watching') ??
      shows.find((show) => show.status === 'Plan to Watch') ??
      null,
    [shows],
  );

  const favoriteTeam = favoriteTeams[0] ?? null;
  const teamMatch = useMemo(() => {
    if (!favoriteTeam) return null;
    const name = normalize(favoriteTeam.name);
    return (
      sports.find(
        (match) =>
          match.status !== 'Completed' &&
          (normalize(match.homeTeam).includes(name) || normalize(match.awayTeam).includes(name)),
      ) ?? null
    );
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
        label: 'Shows',
        note: watchingShow ? watchingShow.title : 'What to watch',
        route: '/(tabs)/shows',
        icon: Clapperboard,
        accent: '#7057E8',
      },
      {
        id: 'sports',
        label: 'Sports',
        note: favoriteTeam ? favoriteTeam.name : 'Teams & fixtures',
        route: '/(tabs)/sports',
        icon: Medal,
        accent: '#E59A16',
      },
      {
        id: 'events',
        label: 'Events',
        note: areaLabel ? `Around ${areaLabel}` : 'Things near you',
        route: '/(tabs)/events',
        icon: MapPin,
        accent: '#2A63E8',
      },
      {
        id: 'habits',
        label: 'Habits',
        note: strongestHabit ? `${strongestHabit.streak}-day streak` : 'Build a routine',
        route: '/(tabs)/discover',
        icon: Dumbbell,
        accent: '#18A36F',
      },
      {
        id: 'learning',
        label: 'Learning',
        note: interests[0] ? titleCase(interests[0]) : 'Learn something',
        route: '/(tabs)/learning',
        icon: BookOpen,
        accent: '#1696C8',
      },
      {
        id: 'cooking',
        label: 'Cooking',
        note: 'Ideas for tonight',
        route: '/(tabs)/cooking',
        icon: ChefHat,
        accent: '#E56541',
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: floatingTabBarScrollPadding(insets.bottom) + 38,
        }}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerCopy}>
              <Text style={[styles.kicker, { color: colors.primary }]}>DISCOVER</Text>
              <Text style={[styles.title, { color: colors.text }]}>What could make life better?</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
              style={[
                styles.tuneButton,
                {
                  backgroundColor: isDark ? '#181B22' : '#F4F6FA',
                  borderColor: isDark ? '#2A2E38' : '#E6E9F0',
                },
              ]}
            >
              <SlidersHorizontal size={18} color={colors.textSecondary} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>A few strong picks from the parts of your life One Pager already understands.</Text>
        </View>

        <View style={styles.heroWrap}>
          {eventsLoading && !heroEvent ? (
            <View style={[styles.loadingHero, { backgroundColor: isDark ? '#171A22' : '#EEF2F7' }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Finding something worth your attention…</Text>
            </View>
          ) : heroEvent ? (
            <View style={[styles.heroCard, { backgroundColor: isDark ? '#11151C' : '#FFFFFF' }]}>
              {heroEvent.image ? (
                <ImageBackground source={{ uri: heroEvent.image }} style={styles.heroImage} imageStyle={styles.heroImageRadius}>
                  <LinearGradient colors={['rgba(4,8,18,0.02)', 'rgba(4,8,18,0.92)']} style={styles.heroGradient}>
                    <View style={styles.heroReasonPill}>
                      <Sparkles size={13} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.heroReasonText}>{reasonForEvent(heroEvent, favoriteCategories, interests, areaLabel)}</Text>
                    </View>
                    <View style={styles.heroBottom}>
                      <Text style={styles.heroEyebrow}>{liveEvents ? 'ONE PAGER PICK' : 'PREVIEW PICK'}</Text>
                      <Text style={styles.heroTitle}>{heroEvent.title}</Text>
                      <Text style={styles.heroMeta} numberOfLines={2}>
                        {[heroEvent.date, heroEvent.time, heroEvent.venue, formatDistance(heroEvent.distanceKm)]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              ) : (
                <LinearGradient colors={['#2B4EA3', '#10182A']} style={styles.heroImage}>
                  <View style={styles.heroReasonPill}>
                    <Sparkles size={13} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.heroReasonText}>{reasonForEvent(heroEvent, favoriteCategories, interests, areaLabel)}</Text>
                  </View>
                  <View style={styles.heroBottom}>
                    <Text style={styles.heroEyebrow}>ONE PAGER PICK</Text>
                    <Text style={styles.heroTitle}>{heroEvent.title}</Text>
                    <Text style={styles.heroMeta}>{[heroEvent.date, heroEvent.time, heroEvent.venue].filter(Boolean).join(' · ')}</Text>
                  </View>
                </LinearGradient>
              )}

              <View style={styles.heroActions}>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => void toggleSaved(heroEvent)}
                  style={[
                    styles.heroSave,
                    { backgroundColor: isSaved(heroEvent.id) ? '#E8F8EF' : isDark ? '#252A33' : '#F2F4F8' },
                  ]}
                >
                  {isSaved(heroEvent.id) ? <Check size={17} color="#159957" /> : <Plus size={17} color={colors.text} />}
                  <Text style={[styles.heroSaveText, { color: isSaved(heroEvent.id) ? '#159957' : colors.text }]}>
                    {isSaved(heroEvent.id) ? 'Added to my life' : 'Add to my life'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => router.push(`/(root)/event/${heroEvent.id}`)}
                  style={[styles.heroOpen, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.heroOpenText}>See why</Text>
                  <ArrowUpRight size={17} color="#FFFFFF" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/events')}
              style={[styles.emptyHero, { backgroundColor: isDark ? '#17213A' : '#EEF4FF' }]}
            >
              <Sparkles size={26} color={colors.primary} />
              <Text style={[styles.emptyHeroTitle, { color: colors.text }]}>Give One Pager more to work with</Text>
              <Text style={[styles.emptyHeroCopy, { color: colors.textSecondary }]}>Add interests, shows and teams and this space becomes personal very quickly.</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader
            title="Your world"
            subtitle="The full One Pager is still here when you want to explore it."
            colors={colors}
          />
          <View style={styles.worldGrid}>
            {worldItems.map((item) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.82}
                  onPress={() => router.push(item.route)}
                  style={[
                    styles.worldCard,
                    {
                      backgroundColor: isDark ? '#171A21' : '#FFFFFF',
                      borderColor: isDark ? '#292D36' : '#E8EBF1',
                    },
                  ]}
                >
                  <View style={[styles.worldIcon, { backgroundColor: `${item.accent}18` }]}>
                    <Icon size={20} color={item.accent} strokeWidth={2.25} />
                  </View>
                  <Text style={[styles.worldLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.worldNote, { color: colors.textSecondary }]} numberOfLines={1}>{item.note}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {(watchingShow || favoriteTeam || strongestHabit) ? (
          <View style={styles.sectionBlock}>
            <SectionHeader
              title="Continue your life"
              subtitle="Things you already care about, pulled back into view."
              colors={colors}
            />
            <View style={styles.continueStack}>
              {watchingShow ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/shows')}
                  style={[styles.continueCard, { backgroundColor: isDark ? '#171A21' : '#FFFFFF', borderColor: isDark ? '#292D36' : '#E8EBF1' }]}
                >
                  <View style={[styles.continueIcon, { backgroundColor: '#7057E818' }]}>
                    <Clapperboard size={22} color="#7057E8" />
                  </View>
                  <View style={styles.continueCopy}>
                    <Text style={[styles.continueReason, { color: '#7057E8' }]}>{watchingShow.status === 'Watching' ? 'YOU WERE WATCHING' : 'FROM YOUR WATCHLIST'}</Text>
                    <Text style={[styles.continueTitle, { color: colors.text }]}>{watchingShow.title}</Text>
                    <Text style={[styles.continueMeta, { color: colors.textSecondary }]}>
                      {watchingShow.type === 'Series' && watchingShow.currentEpisode
                        ? `Season ${watchingShow.currentSeason ?? 1} · Episode ${watchingShow.currentEpisode} · ${watchingShow.platform}`
                        : `${watchingShow.type} · ${watchingShow.platform}`}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}

              {favoriteTeam ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/sports')}
                  style={[styles.continueCard, { backgroundColor: isDark ? '#171A21' : '#FFFFFF', borderColor: isDark ? '#292D36' : '#E8EBF1' }]}
                >
                  <View style={[styles.continueIcon, { backgroundColor: '#E59A1618' }]}>
                    {favoriteTeam.logo ? <Image source={{ uri: favoriteTeam.logo }} style={styles.teamLogo} /> : <Medal size={22} color="#E59A16" />}
                  </View>
                  <View style={styles.continueCopy}>
                    <Text style={[styles.continueReason, { color: '#E59A16' }]}>BECAUSE YOU FOLLOW {favoriteTeam.name.toUpperCase()}</Text>
                    <Text style={[styles.continueTitle, { color: colors.text }]}>
                      {teamMatch ? `${teamMatch.homeTeam} vs ${teamMatch.awayTeam}` : `What's next for ${favoriteTeam.name}`}
                    </Text>
                    <Text style={[styles.continueMeta, { color: colors.textSecondary }]}>
                      {teamMatch ? `${teamMatch.date} · ${teamMatch.time}` : favoriteTeam.league}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}

              {strongestHabit ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/discover')}
                  style={[styles.continueCard, { backgroundColor: isDark ? '#171A21' : '#FFFFFF', borderColor: isDark ? '#292D36' : '#E8EBF1' }]}
                >
                  <View style={[styles.continueIcon, { backgroundColor: '#18A36F18' }]}>
                    <Dumbbell size={22} color="#18A36F" />
                  </View>
                  <View style={styles.continueCopy}>
                    <Text style={[styles.continueReason, { color: '#18A36F' }]}>BUILD ON WHAT'S WORKING</Text>
                    <Text style={[styles.continueTitle, { color: colors.text }]}>{strongestHabit.name}</Text>
                    <Text style={[styles.continueMeta, { color: colors.textSecondary }]}>
                      {strongestHabit.streak > 0 ? `${strongestHabit.streak}-day streak · Find something that complements it` : 'Find a routine that complements this habit'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {nearYou.length > 0 ? (
          <View style={styles.sectionBlock}>
            <SectionHeader
              title={areaLabel ? `Around ${areaLabel}` : 'Near you'}
              subtitle="Real things you could actually go and do."
              cta="All events"
              onPress={() => router.push('/(tabs)/events')}
              colors={colors}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRail}>
              {nearYou.map((event) => (
                <EventPoster
                  key={event.id}
                  event={event}
                  isSaved={isSaved(event.id)}
                  onToggle={() => void toggleSaved(event)}
                  colors={colors}
                  isDark={isDark}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {nextSaved ? (
          <View style={styles.sectionBlock}>
            <SectionHeader title="You already chose this" subtitle="Discovery should remember what caught your eye." colors={colors} />
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push(`/(root)/event/${nextSaved.id}`)}
              style={[
                styles.savedCard,
                {
                  backgroundColor: isDark ? '#13201A' : '#F1FBF6',
                  borderColor: isDark ? '#224233' : '#D8F1E4',
                },
              ]}
            >
              <View style={styles.savedBadge}><Check size={16} color="#159957" strokeWidth={2.5} /></View>
              <View style={styles.savedCopy}>
                <Text style={styles.savedEyebrow}>SAVED TO YOUR ONE PAGER</Text>
                <Text style={[styles.savedTitle, { color: colors.text }]}>{nextSaved.title}</Text>
                <Text style={[styles.savedMeta, { color: colors.textSecondary }]}>
                  {[nextSaved.date, nextSaved.time, nextSaved.venue].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <ChevronRight size={18} color="#159957" />
            </TouchableOpacity>
          </View>
        ) : null}

        {surpriseEvent ? (
          <View style={styles.sectionBlock}>
            <SectionHeader title="Try something different" subtitle="Not everything should come from what you already know you like." colors={colors} />
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push(`/(root)/event/${surpriseEvent.id}`)}
              style={[
                styles.surpriseCard,
                {
                  backgroundColor: isDark ? '#211B13' : '#FFF8EB',
                  borderColor: isDark ? '#40331E' : '#F5E3BC',
                },
              ]}
            >
              <View style={styles.surpriseTop}>
                <View style={styles.surpriseIcon}><Sparkles size={18} color="#B7791F" /></View>
                <Text style={styles.surpriseEyebrow}>A LITTLE OUTSIDE YOUR USUAL</Text>
              </View>
              <Text style={[styles.surpriseTitle, { color: colors.text }]}>{surpriseEvent.title}</Text>
              <Text style={[styles.surpriseMeta, { color: colors.textSecondary }]}>
                {[titleCase(surpriseEvent.category || 'Event'), surpriseEvent.date, formatDistance(surpriseEvent.distanceKm)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <View style={styles.surpriseFooter}>
                <Text style={styles.surpriseLink}>See if it's your thing</Text>
                <ArrowUpRight size={17} color="#B7791F" />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => router.push('/(tabs)/profile')}
          style={[styles.tuneFooter, { borderColor: isDark ? '#2A2E38' : '#E6E9F0' }]}
        >
          <View style={styles.tuneFooterCopy}>
            <Text style={[styles.tuneFooterTitle, { color: colors.text }]}>Make Discover more like you</Text>
            <Text style={[styles.tuneFooterSubtitle, { color: colors.textSecondary }]}>Update interests, teams and preferences to sharpen what appears here.</Text>
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
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 7 },
  title: { fontSize: 38, lineHeight: 42, fontWeight: '850', letterSpacing: -1.4 },
  subtitle: { marginTop: 9, fontSize: 16, lineHeight: 23, maxWidth: 600 },
  tuneButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  heroWrap: { paddingHorizontal: 20, marginTop: 22 },
  loadingHero: { minHeight: 290, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  heroCard: { borderRadius: 28, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  heroImage: { height: 330, justifyContent: 'space-between' },
  heroImageRadius: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  heroGradient: { flex: 1, padding: 18, justifyContent: 'space-between' },
  heroReasonPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, minHeight: 30, borderRadius: 15, backgroundColor: 'rgba(8,12,22,0.62)' },
  heroReasonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '750' },
  heroBottom: { paddingTop: 80 },
  heroEyebrow: { color: '#C8D7FF', fontSize: 11, fontWeight: '850', letterSpacing: 1.4, marginBottom: 6 },
  heroTitle: { color: '#FFFFFF', fontSize: 29, lineHeight: 33, fontWeight: '850', letterSpacing: -0.7 },
  heroMeta: { color: 'rgba(255,255,255,0.82)', marginTop: 8, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  heroActions: { flexDirection: 'row', gap: 10, padding: 12 },
  heroSave: { flex: 1, minHeight: 48, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  heroSaveText: { fontSize: 13, fontWeight: '800' },
  heroOpen: { minHeight: 48, borderRadius: 15, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  heroOpenText: { color: '#FFFFFF', fontSize: 13, fontWeight: '850' },
  emptyHero: { borderRadius: 28, padding: 24, minHeight: 220, justifyContent: 'center' },
  emptyHeroTitle: { marginTop: 16, fontSize: 24, lineHeight: 29, fontWeight: '850', letterSpacing: -0.5 },
  emptyHeroCopy: { marginTop: 8, fontSize: 15, lineHeight: 22 },
  sectionBlock: { marginTop: 30 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 13, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionHeaderCopy: { flex: 1 },
  sectionTitle: { fontSize: 24, lineHeight: 28, fontWeight: '850', letterSpacing: -0.6 },
  sectionSubtitle: { marginTop: 4, fontSize: 14, lineHeight: 20 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 2 },
  sectionActionText: { fontSize: 13, fontWeight: '800' },
  worldGrid: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  worldCard: { width: '48.5%', minHeight: 132, borderRadius: 22, borderWidth: 1, padding: 15 },
  worldIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  worldLabel: { fontSize: 17, fontWeight: '850', letterSpacing: -0.2 },
  worldNote: { marginTop: 4, fontSize: 12.5, lineHeight: 17 },
  continueStack: { paddingHorizontal: 20, gap: 10 },
  continueCard: { borderRadius: 20, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  continueIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  teamLogo: { width: 34, height: 34, resizeMode: 'contain' },
  continueCopy: { flex: 1 },
  continueReason: { fontSize: 10.5, fontWeight: '850', letterSpacing: 1.0, marginBottom: 4 },
  continueTitle: { fontSize: 16.5, lineHeight: 20, fontWeight: '850' },
  continueMeta: { marginTop: 4, fontSize: 12.5, lineHeight: 17 },
  eventRail: { paddingHorizontal: 20, gap: 12 },
  eventPoster: { width: 220, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  eventPosterImage: { width: '100%', height: 142, resizeMode: 'cover' },
  eventPosterImageFallback: { width: '100%', height: 142, alignItems: 'center', justifyContent: 'center' },
  eventPosterBody: { padding: 13 },
  eventCategory: { fontSize: 10.5, fontWeight: '850', letterSpacing: 1.0, marginBottom: 5, textTransform: 'uppercase' },
  eventPosterTitle: { fontSize: 16, lineHeight: 20, fontWeight: '850' },
  eventPosterMeta: { marginTop: 5, minHeight: 34, fontSize: 12, lineHeight: 17 },
  smallSave: { alignSelf: 'flex-start', marginTop: 11, minHeight: 32, paddingHorizontal: 10, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 5 },
  smallSaveText: { fontSize: 12, fontWeight: '800' },
  savedCard: { marginHorizontal: 20, borderRadius: 22, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  savedBadge: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#E1F6EA', alignItems: 'center', justifyContent: 'center' },
  savedCopy: { flex: 1 },
  savedEyebrow: { color: '#159957', fontSize: 10.5, fontWeight: '850', letterSpacing: 1.0, marginBottom: 4 },
  savedTitle: { fontSize: 16.5, lineHeight: 20, fontWeight: '850' },
  savedMeta: { marginTop: 4, fontSize: 12.5, lineHeight: 17 },
  surpriseCard: { marginHorizontal: 20, borderRadius: 24, borderWidth: 1, padding: 18 },
  surpriseTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  surpriseIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF0CF', alignItems: 'center', justifyContent: 'center' },
  surpriseEyebrow: { color: '#B7791F', fontSize: 10.5, fontWeight: '850', letterSpacing: 1.0 },
  surpriseTitle: { marginTop: 17, fontSize: 22, lineHeight: 27, fontWeight: '850', letterSpacing: -0.4 },
  surpriseMeta: { marginTop: 7, fontSize: 13.5, lineHeight: 19 },
  surpriseFooter: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  surpriseLink: { color: '#B7791F', fontSize: 13.5, fontWeight: '850' },
  tuneFooter: { marginHorizontal: 20, marginTop: 30, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  tuneFooterCopy: { flex: 1 },
  tuneFooterTitle: { fontSize: 16, fontWeight: '850' },
  tuneFooterSubtitle: { marginTop: 4, fontSize: 12.5, lineHeight: 18 },
});
