import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
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
  ChevronRight,
  Clapperboard,
  Dumbbell,
  MapPin,
  Medal,
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
  | '/(tabs)/discover';

type SignalCard = {
  id: string;
  eyebrow: string;
  reason: string;
  title: string;
  subtitle: string;
  cta: string;
  route: RouteTarget;
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  imageUrl?: string;
  accent: string;
};

function normalize(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function titleCase(value: string) {
  if (!value) return value;
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

function eventScore(
  event: LocalEvent,
  favoriteCategories: string[],
  interests: string[],
) {
  const category = normalize(event.category);
  const searchable = normalize(
    [event.title, event.description, event.category, ...(event.tags ?? [])].join(' '),
  );

  let score = 0;
  if (favoriteCategories.some((item) => category.includes(normalize(item)))) score += 45;
  if (interests.some((item) => searchable.includes(normalize(item)))) score += 28;
  if (event.isHot) score += 8;
  if (event.isFeatured) score += 5;
  if (typeof event.distanceKm === 'number') score += Math.max(0, 18 - event.distanceKm);
  return score;
}

function eventReason(
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
  onPress,
  cta,
  colors,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  cta?: string;
  colors: { text: string; textSecondary: string; primary: string };
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {onPress && cta ? (
        <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.sectionCta}>
          <Text style={[styles.sectionCtaText, { color: colors.primary }]}>{cta}</Text>
          <ChevronRight size={16} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function DiscoverHomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { profile } = useUserProfile();
  const { shows, sports, habitsWithStats } = useApp();
  const {
    coords,
    areaLabel,
    permissionDenied,
  } = useUserLocation();
  const {
    allEvents,
    source: eventsSource,
    isLoading: eventsLoading,
  } = usePerCategoryEvents({
    latitude: coords.latitude,
    longitude: coords.longitude,
    radiusMiles: 30,
    enabled: true,
  });
  const { isSaved, toggleSaved, upcomingSaved } = useSavedEvents();

  const favoriteCategories = profile?.favoriteEventCategories ?? [];
  const interests = profile?.interests ?? [];

  const rankedEvents = useMemo(
    () =>
      [...allEvents].sort(
        (a, b) =>
          eventScore(b, favoriteCategories, interests) -
          eventScore(a, favoriteCategories, interests),
      ),
    [allEvents, favoriteCategories, interests],
  );

  const heroEvent = rankedEvents[0] ?? null;
  const nearbyEvents = rankedEvents.filter((event) => event.id !== heroEvent?.id).slice(0, 5);

  const watchingShow = useMemo(() => {
    return (
      shows.find((show) => show.status === 'Watching') ??
      shows.find((show) => show.status === 'Plan to Watch') ??
      null
    );
  }, [shows]);

  const favoriteTeam = profile?.favoriteTeams?.[0] ?? null;
  const teamMatch = useMemo(() => {
    if (!favoriteTeam) return null;
    const teamName = normalize(favoriteTeam.name);
    return (
      sports.find(
        (match) =>
          match.status !== 'Completed' &&
          (normalize(match.homeTeam).includes(teamName) || normalize(match.awayTeam).includes(teamName)),
      ) ?? null
    );
  }, [sports, favoriteTeam]);

  const strongestHabit = useMemo(() => {
    if (!habitsWithStats.length) return null;
    return [...habitsWithStats].sort((a, b) => b.streak - a.streak)[0] ?? null;
  }, [habitsWithStats]);

  const signalCards = useMemo(() => {
    const cards: SignalCard[] = [];

    if (watchingShow) {
      const episode =
        watchingShow.type === 'Series' && watchingShow.currentEpisode
          ? `S${watchingShow.currentSeason ?? 1} · E${watchingShow.currentEpisode}`
          : watchingShow.type;
      cards.push({
        id: 'watch',
        eyebrow: 'WATCH',
        reason: watchingShow.status === 'Watching' ? "Because you're watching it" : 'From your watchlist',
        title: watchingShow.title,
        subtitle: `${episode} · ${watchingShow.platform}`,
        cta: 'Continue',
        route: '/(tabs)/shows',
        icon: Clapperboard,
        accent: '#6C5CE7',
      });
    } else {
      cards.push({
        id: 'watch-empty',
        eyebrow: 'WATCH',
        reason: 'Build your entertainment profile',
        title: 'Add what you are watching',
        subtitle: 'One Pager gets smarter when it knows your taste.',
        cta: 'Add shows',
        route: '/(tabs)/shows',
        icon: Clapperboard,
        accent: '#6C5CE7',
      });
    }

    if (favoriteTeam) {
      cards.push({
        id: 'sport',
        eyebrow: 'SPORTS',
        reason: `Because you follow ${favoriteTeam.name}`,
        title: teamMatch ? `${teamMatch.homeTeam} vs ${teamMatch.awayTeam}` : `Keep up with ${favoriteTeam.name}`,
        subtitle: teamMatch ? `${teamMatch.date} · ${teamMatch.time}` : favoriteTeam.league,
        cta: 'Open sports',
        route: '/(tabs)/sports',
        icon: Medal,
        imageUrl: favoriteTeam.logo,
        accent: '#F59E0B',
      });
    }

    if (strongestHabit) {
      cards.push({
        id: 'habit',
        eyebrow: 'BUILD',
        reason: strongestHabit.streak > 0 ? `${strongestHabit.streak}-day streak` : 'Based on your routine',
        title: `Build on ${strongestHabit.name}`,
        subtitle: 'Find a routine or program that complements what you already do.',
        cta: 'Find a habit',
        route: '/(tabs)/discover',
        icon: Dumbbell,
        accent: '#10B981',
      });
    } else {
      cards.push({
        id: 'habit-empty',
        eyebrow: 'BUILD',
        reason: 'Make discovery actionable',
        title: 'Find one habit worth keeping',
        subtitle: 'Add it once and One Pager carries it into your day.',
        cta: 'Browse habits',
        route: '/(tabs)/discover',
        icon: Dumbbell,
        accent: '#10B981',
      });
    }

    const learningInterest = interests[0];
    cards.push({
      id: 'learn',
      eyebrow: 'LEARN',
      reason: learningInterest ? `Because you chose ${titleCase(learningInterest)}` : 'A useful change of pace',
      title: learningInterest ? `Go deeper on ${titleCase(learningInterest)}` : 'Learn something useful today',
      subtitle: 'Keep useful learning close to the rest of your life instead of another forgotten list.',
      cta: 'Explore learning',
      route: '/(tabs)/learning',
      icon: BookOpen,
      accent: '#0EA5E9',
    });

    return cards.slice(0, 4);
  }, [watchingShow, favoriteTeam, teamMatch, strongestHabit, interests]);

  const savedNext = upcomingSaved[0] ?? null;
  const liveEvents = eventsSource !== 'fallback' && eventsSource !== 'none';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: floatingTabBarScrollPadding(insets.bottom) + 34,
        }}
      >
        <View style={styles.header}>
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.kicker, { color: colors.primary }]}>DISCOVER</Text>
              <Text style={[styles.title, { color: colors.text }]}>Worth your attention.</Text>
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
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>A short list shaped by what you follow, watch and do — not another endless feed.</Text>
        </View>

        <View style={styles.heroWrap}>
          {eventsLoading && !heroEvent ? (
            <View
              style={[
                styles.loadingHero,
                { backgroundColor: isDark ? '#171A22' : '#EEF2F7' },
              ]}
            >
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingCopy, { color: colors.textSecondary }]}>Finding a strong pick near you…</Text>
            </View>
          ) : heroEvent ? (
            <View style={styles.heroCard}>
              {heroEvent.image ? (
                <ImageBackground
                  source={{ uri: heroEvent.image }}
                  style={styles.heroImage}
                  imageStyle={styles.heroImageRadius}
                >
                  <LinearGradient
                    colors={['rgba(6,10,20,0.06)', 'rgba(6,10,20,0.92)']}
                    style={styles.heroGradient}
                  >
                    <View style={styles.heroTop}>
                      <View style={styles.reasonPillDark}>
                        <Sparkles size={13} color="#FFFFFF" strokeWidth={2.4} />
                        <Text style={styles.reasonPillDarkText}>
                          {eventReason(heroEvent, favoriteCategories, interests, areaLabel)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.heroBottom}>
                      <Text style={styles.heroEyebrow}>{liveEvents ? 'A REAL PICK NEAR YOU' : 'A PREVIEW PICK NEAR YOU'}</Text>
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
                <LinearGradient colors={['#233A74', '#101827']} style={styles.heroImage}>
                  <View style={styles.heroTop}>
                    <View style={styles.reasonPillDark}>
                      <MapPin size={13} color="#FFFFFF" strokeWidth={2.4} />
                      <Text style={styles.reasonPillDarkText}>
                        {eventReason(heroEvent, favoriteCategories, interests, areaLabel)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.heroBottom}>
                    <Text style={styles.heroEyebrow}>{liveEvents ? 'A REAL PICK NEAR YOU' : 'A PREVIEW PICK NEAR YOU'}</Text>
                    <Text style={styles.heroTitle}>{heroEvent.title}</Text>
                    <Text style={styles.heroMeta}>
                      {[heroEvent.date, heroEvent.time, heroEvent.venue].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </LinearGradient>
              )}

              <View style={[styles.heroActions, { backgroundColor: isDark ? '#12151B' : '#FFFFFF' }]}>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => void toggleSaved(heroEvent)}
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor: isSaved(heroEvent.id)
                        ? isDark
                          ? '#173629'
                          : '#E9F8F0'
                        : isDark
                          ? '#242831'
                          : '#F4F6FA',
                    },
                  ]}
                >
                  {isSaved(heroEvent.id) ? (
                    <Check size={17} color="#19A463" strokeWidth={2.7} />
                  ) : (
                    <Sparkles size={17} color={colors.primary} strokeWidth={2.4} />
                  )}
                  <Text style={[styles.saveButtonText, { color: isSaved(heroEvent.id) ? '#15945A' : colors.text }]}> 
                    {isSaved(heroEvent.id) ? 'Added to my life' : 'Add to my life'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => router.push('/(tabs)/events')}
                  style={[styles.openButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.openButtonText}>Explore</Text>
                  <ArrowUpRight size={17} color="#FFFFFF" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/events')}
              style={[
                styles.emptyHero,
                {
                  backgroundColor: isDark ? '#162033' : '#EEF4FF',
                  borderColor: isDark ? '#29436E' : '#D7E5FF',
                },
              ]}
            >
              <MapPin size={25} color={colors.primary} strokeWidth={2.3} />
              <View style={styles.emptyHeroText}>
                <Text style={[styles.emptyHeroTitle, { color: colors.text }]}>See what is happening around you</Text>
                <Text style={[styles.emptyHeroSubtitle, { color: colors.textSecondary }]}>Open Events to start teaching One Pager what gets you out of the house.</Text>
              </View>
              <ChevronRight size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <SectionHeader
          title="Picked because of you"
          subtitle="Every card should have a reason for being here."
          colors={colors}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.signalRail}
        >
          {signalCards.map((card) => {
            const Icon = card.icon;
            return (
              <TouchableOpacity
                key={card.id}
                activeOpacity={0.86}
                onPress={() => router.push(card.route)}
                style={[
                  styles.signalCard,
                  {
                    backgroundColor: isDark ? '#171A20' : '#FFFFFF',
                    borderColor: isDark ? '#292E37' : '#E7EAF0',
                  },
                ]}
              >
                <View style={styles.signalTopRow}>
                  {card.imageUrl ? (
                    <Image source={{ uri: card.imageUrl }} style={styles.signalImage} />
                  ) : (
                    <View style={[styles.signalIcon, { backgroundColor: `${card.accent}18` }]}> 
                      <Icon size={21} color={card.accent} strokeWidth={2.3} />
                    </View>
                  )}
                  <Text style={[styles.signalEyebrow, { color: card.accent }]}>{card.eyebrow}</Text>
                </View>
                <View style={[styles.reasonPill, { backgroundColor: isDark ? '#232730' : '#F4F6F9' }]}>
                  <Sparkles size={11} color={colors.textSecondary} strokeWidth={2.2} />
                  <Text style={[styles.reasonText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {card.reason}
                  </Text>
                </View>
                <Text style={[styles.signalTitle, { color: colors.text }]} numberOfLines={2}>{card.title}</Text>
                <Text style={[styles.signalSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>{card.subtitle}</Text>
                <View style={styles.signalFooter}>
                  <Text style={[styles.signalCta, { color: card.accent }]}>{card.cta}</Text>
                  <ChevronRight size={16} color={card.accent} strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <SectionHeader
          title={areaLabel ? `Near ${areaLabel}` : 'Near you'}
          subtitle={
            permissionDenied
              ? 'Using your default area until location access is enabled.'
              : liveEvents
                ? 'Live listings, reordered around your interests.'
                : 'Preview listings while live event providers are unavailable.'
          }
          onPress={() => router.push('/(tabs)/events')}
          cta="See all"
          colors={colors}
        />

        {nearbyEvents.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventRail}
          >
            {nearbyEvents.map((event) => (
              <View
                key={event.id}
                style={[
                  styles.eventCard,
                  {
                    backgroundColor: isDark ? '#171A20' : '#FFFFFF',
                    borderColor: isDark ? '#292E37' : '#E7EAF0',
                  },
                ]}
              >
                {event.image ? (
                  <Image source={{ uri: event.image }} style={styles.eventImage} />
                ) : (
                  <View style={[styles.eventImageFallback, { backgroundColor: isDark ? '#202938' : '#EEF3FA' }]}> 
                    <MapPin size={26} color={colors.primary} strokeWidth={2.2} />
                  </View>
                )}
                <View style={styles.eventBody}>
                  <Text style={[styles.eventReason, { color: colors.primary }]} numberOfLines={1}>
                    {eventReason(event, favoriteCategories, interests, areaLabel)}
                  </Text>
                  <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
                  <Text style={[styles.eventMeta, { color: colors.textSecondary }]} numberOfLines={2}>
                    {[event.date, event.time, event.venue].filter(Boolean).join(' · ')}
                  </Text>
                  <View style={styles.eventActions}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => void toggleSaved(event)}
                      style={[
                        styles.eventSave,
                        { backgroundColor: isDark ? '#232730' : '#F4F6F9' },
                      ]}
                    >
                      {isSaved(event.id) ? (
                        <Check size={14} color="#15945A" strokeWidth={2.7} />
                      ) : (
                        <Sparkles size={14} color={colors.primary} strokeWidth={2.4} />
                      )}
                      <Text style={[styles.eventSaveText, { color: isSaved(event.id) ? '#15945A' : colors.text }]}> 
                        {isSaved(event.id) ? 'Added' : 'Add'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(tabs)/events')}>
                      <ArrowUpRight size={18} color={colors.primary} strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noNearbyWrap}>
            <Text style={[styles.noNearby, { color: colors.textSecondary }]}>No nearby picks are ready yet. Open Events to refresh the full catalogue.</Text>
          </View>
        )}

        {savedNext ? (
          <View style={styles.savedSection}>
            <SectionHeader
              title="Already on your radar"
              subtitle="Discovery should remember what you acted on."
              colors={colors}
            />
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/events')}
              style={[
                styles.savedCard,
                {
                  backgroundColor: isDark ? '#101F19' : '#F0FAF5',
                  borderColor: isDark ? '#1D4534' : '#D9F0E4',
                },
              ]}
            >
              <View style={styles.savedCheck}>
                <Check size={19} color="#15945A" strokeWidth={2.7} />
              </View>
              <View style={styles.savedText}>
                <Text style={styles.savedEyebrow}>SAVED TO ONE PAGER</Text>
                <Text style={[styles.savedTitle, { color: colors.text }]} numberOfLines={1}>{savedNext.title}</Text>
                <Text style={[styles.savedMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {[savedNext.date, savedNext.time, savedNext.venue].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <ChevronRight size={19} color="#15945A" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.libraryWrap}>
          <Text style={[styles.libraryKicker, { color: colors.textSecondary }]}>MORE WHEN YOU WANT IT</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/discover')}
            style={[
              styles.libraryCard,
              {
                backgroundColor: isDark ? '#171A20' : '#FFFFFF',
                borderColor: isDark ? '#292E37' : '#E7EAF0',
              },
            ]}
          >
            <View style={[styles.libraryIcon, { backgroundColor: isDark ? '#242A35' : '#EEF2FF' }]}> 
              <Dumbbell size={21} color={colors.primary} strokeWidth={2.3} />
            </View>
            <View style={styles.libraryText}>
              <Text style={[styles.libraryTitle, { color: colors.text }]}>Habit programs & creator routines</Text>
              <Text style={[styles.librarySubtitle, { color: colors.textSecondary }]}>The marketplace is still here, but it no longer has to be the whole Discover experience.</Text>
            </View>
            <ChevronRight size={19} color={colors.primary} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 22,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.7,
    marginBottom: 6,
  },
  title: {
    fontSize: 39,
    lineHeight: 43,
    fontWeight: '850',
    letterSpacing: -1.5,
    maxWidth: 310,
  },
  subtitle: {
    marginTop: 9,
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 560,
  },
  tuneButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  heroWrap: {
    paddingHorizontal: 22,
    marginTop: 23,
  },
  heroCard: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
  heroImage: {
    height: 360,
    justifyContent: 'space-between',
  },
  heroImageRadius: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  heroTop: {
    flexDirection: 'row',
  },
  reasonPillDark: {
    maxWidth: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(5,8,15,0.66)',
  },
  reasonPillDarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '750',
  },
  heroBottom: {
    padding: 20,
  },
  heroEyebrow: {
    color: '#DCE8FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.35,
    marginBottom: 7,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '850',
    letterSpacing: -0.9,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.83)',
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '550',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  saveButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  openButton: {
    minHeight: 46,
    borderRadius: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '850',
  },
  loadingHero: {
    height: 230,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingCopy: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyHero: {
    borderRadius: 25,
    borderWidth: 1,
    padding: 18,
    minHeight: 122,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  emptyHeroText: {
    flex: 1,
  },
  emptyHeroTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
  },
  emptyHeroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    paddingHorizontal: 22,
    marginTop: 30,
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '850',
    letterSpacing: -0.55,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCta: {
    paddingBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  sectionCtaText: {
    fontSize: 13,
    fontWeight: '850',
  },
  signalRail: {
    paddingHorizontal: 22,
    gap: 12,
  },
  signalCard: {
    width: 252,
    minHeight: 236,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  signalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  signalIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalImage: {
    width: 42,
    height: 42,
    borderRadius: 13,
    resizeMode: 'contain',
  },
  signalEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  reasonPill: {
    marginTop: 14,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 28,
    borderRadius: 99,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reasonText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  signalTitle: {
    marginTop: 13,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '850',
    letterSpacing: -0.4,
  },
  signalSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  signalFooter: {
    marginTop: 'auto',
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  signalCta: {
    fontSize: 13,
    fontWeight: '850',
  },
  eventRail: {
    paddingHorizontal: 22,
    gap: 12,
  },
  eventCard: {
    width: 244,
    borderRadius: 23,
    borderWidth: 1,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 138,
    resizeMode: 'cover',
  },
  eventImageFallback: {
    width: '100%',
    height: 138,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBody: {
    padding: 14,
  },
  eventReason: {
    fontSize: 10,
    fontWeight: '850',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  eventTitle: {
    marginTop: 6,
    minHeight: 44,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '850',
    letterSpacing: -0.3,
  },
  eventMeta: {
    marginTop: 6,
    minHeight: 36,
    fontSize: 12,
    lineHeight: 18,
  },
  eventActions: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventSave: {
    minHeight: 34,
    borderRadius: 11,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  eventSaveText: {
    fontSize: 12,
    fontWeight: '800',
  },
  noNearbyWrap: {
    paddingHorizontal: 22,
  },
  noNearby: {
    fontSize: 14,
    lineHeight: 20,
  },
  savedSection: {
    marginTop: 2,
  },
  savedCard: {
    marginHorizontal: 22,
    borderRadius: 21,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedCheck: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(21,148,90,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedText: {
    flex: 1,
  },
  savedEyebrow: {
    color: '#15945A',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  savedTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '850',
  },
  savedMeta: {
    marginTop: 3,
    fontSize: 12,
  },
  libraryWrap: {
    marginTop: 34,
    paddingHorizontal: 22,
  },
  libraryKicker: {
    fontSize: 10,
    fontWeight: '850',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  libraryCard: {
    borderRadius: 21,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  libraryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryText: {
    flex: 1,
  },
  libraryTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '850',
  },
  librarySubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },
});
