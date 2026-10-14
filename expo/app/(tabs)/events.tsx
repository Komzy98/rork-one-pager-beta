import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Search,
  MapPin,
  Calendar,
  Heart,
  X,
  Map,
  List,
  Navigation,
  Sparkles,
  Flame,
  Target,
  Star,
  CalendarDays,
  Users,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Globe,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserLocation } from '@/hooks/useUserLocation';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { usePerCategoryEvents } from '@/hooks/usePerCategoryEvents';
import { useGlobalEventSearch } from '@/hooks/useGlobalEventSearch';
import { useEventKit } from '@/hooks/useEventKit';
import { useEventReminders } from '@/hooks/useEventReminders';
import { useSocialActivity } from '@/hooks/useSocialActivity';
import { useFriendsEventPicks } from '@/hooks/useFriendsEventPicks';
import { useEventInviteFlow } from '@/hooks/useEventInviteFlow';
import { EventInviteFriendsModal } from '@/components/events/EventInviteFriendsModal';
import {
  filterHappeningNow,
  filterThisWeekEvents,
  filterTonightEvents,
  filterWeekendEvents,
  formatDistanceKm,
  regionsDifferSignificantly,
  sortEventsByDistance,
} from '@/utils/eventDiscovery';
import { useTheme } from '@/hooks/useTheme';
import { BRAND } from '@/constants/brand';
import { eventsFixedPalette } from '@/utils/eventsPalette';
import { PremiumEventHeroCard } from '@/components/events/PremiumEventHeroCard';
import { PremiumEventPosterCard } from '@/components/events/PremiumEventPosterCard';
import { PremiumEventListRow } from '@/components/events/PremiumEventListRow';
import { EventsDiscoveryPills, type DiscoveryTabKey } from '@/components/events/EventsDiscoveryPills';
import { EventsCategoryBento } from '@/components/events/EventsCategoryBento';
import { EventsHeroSkeleton, EventsRailSkeleton } from '@/components/events/EventsShimmer';
import { EventsMapBottomSheet } from '@/components/events/EventsMapBottomSheet';
import { EventsMapMarker } from '@/components/events/EventsMapMarker';
import { EventsSaveToast } from '@/components/events/EventsSaveToast';
import { EventsStatsRow } from '@/components/events/EventsStatsRow';
import { EventPlanShortcuts } from '@/components/events/EventPlanShortcuts';
import { EventsWeekendPlanner } from '@/components/events/EventsWeekendPlanner';
import { EventFeedbackPrompt } from '@/components/events/EventFeedbackPrompt';
import { SavedEventsWeekTimeline } from '@/components/events/SavedEventsWeekTimeline';
import { CombinedNightOutPrompt } from '@/components/events/CombinedNightOutPrompt';
import { PremiumSavedEventCard } from '@/components/events/PremiumSavedEventCard';
import { EventConciergeFeedBanner } from '@/components/events/EventConciergeFeedBanner';
import FeedRetryBanner from '@/components/FeedRetryBanner';
import DiscoveryScopeChip from '@/components/events/DiscoveryScopeChip';
import { EventWhyThisSheet } from '@/components/events/EventWhyThisSheet';
import {
  buildEditorialEventRows,
  buildEventRecommendationReasons,
  buildHabitBasedEventRow,
  explainEventPersonalization,
  getEditorialRowChipLabel,
  getEditorialRowSecondaryChipLabel,
  getPrimaryEventRecommendationReason,
  getPrimaryEventRecommendationReasonForCategory,
  getRecommendationChipLabel,
  rankEventsForConciergeFeed,
  rankEventsForHabits,
  rankEventsForYou,
} from '@/utils/eventPersonalization';
import { useEventRecommendationInput } from '@/hooks/useEventRecommendationInput';
import { useEventConcierge } from '@/hooks/useEventConcierge';
import { boostEventsForConciergeContext } from '@/utils/eventConcierge';
import { countSavedEventsThisWeek } from '@/utils/eventNightOutPlanner';
import { getEventStatsSummary } from '@/utils/eventStats';
import {
  getEventCalendarRange,
  openEventDirections,
  openEventTickets,
} from '@/utils/openEventActions';
import type { LocalEvent, NearbyEventsSource } from '@/types/events';
import { eventMatchesLocalSearch, rankEventsBySearchKeyword } from '@/utils/eventSearch';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useSavedEventsSocial } from '@/hooks/useSavedEventsSocial';
import { groupSavedEventsByDay, findMultiEventDays } from '@/utils/savedEventsWeek';
import type { PlanRsvpStatus } from '@/utils/sharedPlansService';
import { eventMatchesBentoCategory } from '@/utils/eventCategories';
import { chooseExploreEvents, curateDiscoveryEvents, isAffordableEvent, isWeekendEvent } from '@/utils/eventsV2Discovery';
import { registerDiscoveryEvents, registerSavedEvents } from '@/utils/eventCatalog';
import { getEventCategoryMeta } from '@/utils/eventCategoryMeta';
import {
  formatFriendsGoingLabel,
  getEventFriendProfiles,
} from '@/utils/eventSocialProof';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EVENTS_SECTION_GUTTER = 20;


function formatGlobalSearchSourceLabel(source: NearbyEventsSource): string {
  switch (source) {
    case 'mixed':
      return 'ticketing partners';
    case 'ticketmaster':
      return 'Ticketmaster';
    case 'skiddle':
      return 'Skiddle';
    case 'eventbrite':
      return 'Eventbrite';
    case 'billetto':
      return 'Billetto';
    case 'fallback':
      return 'sample listings';
    default:
      return 'ticketing partners';
  }
}

function globalSearchErrorMessage(error: unknown): string | null {
  if (!error) return null;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
  if (/no procedure found|not_found|404/i.test(message)) {
    return 'Search is temporarily unavailable. Try again in a few minutes.';
  }
  return 'We couldn’t load search results. Check your connection and try again.';
}

function globalSearchBannerMessage(options: {
  isSearching: boolean;
  source: NearbyEventsSource;
  resultCount: number;
  error: unknown;
  usingCachedResults?: boolean;
  cachedResultsAgeLabel?: string | null;
}): string {
  const { isSearching, source, resultCount, error, usingCachedResults, cachedResultsAgeLabel } =
    options;
  if (isSearching) {
    return `Searching ${formatGlobalSearchSourceLabel('mixed')}…`;
  }
  if (usingCachedResults) {
    const age = cachedResultsAgeLabel ? ` (saved ${cachedResultsAgeLabel})` : '';
    return `Can't reach the server. Showing your last search results${age}.`;
  }
  const searchError = globalSearchErrorMessage(error);
  if (searchError) return searchError;
  if (source === 'none' && resultCount === 0) {
    return 'No listings for that search. Try another spelling or artist name.';
  }
  if (resultCount > 0) {
    return `${resultCount} worldwide · closer dates first · ${formatGlobalSearchSourceLabel(source)}`;
  }
  return `${resultCount} worldwide · ${formatGlobalSearchSourceLabel(source)}`;
}

function sampleEventsBannerMessage(): string {
  if (__DEV__) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL?.trim()
      ? 'Showing sample events — add TICKETMASTER_API_KEY and/or SKIDDLE_API_KEY to your Railway API service, redeploy, then pull to refresh.'
      : 'Showing sample events — add TICKETMASTER_API_KEY and/or SKIDDLE_API_KEY to expo/.env and restart Metro for live listings.';
  }
  return 'Sample events for now — no live listings found for this area.';
}

type ViewMode = 'list' | 'map';
type EventsMainTab = 'discover' | 'myEvents';
type Event = LocalEvent;

const DISCOVERY_PILL_TABS = [
  { key: 'now' as const, label: 'Now', icon: Flame, color: '#FF6B6B' },
  { key: 'near' as const, label: 'Near You', icon: MapPin, color: BRAND.light.accent },
  { key: 'forYou' as const, label: 'For You', icon: Target, color: BRAND.light.primary },
  { key: 'friendsPicks' as const, label: 'Friends', icon: Users, color: BRAND.light.primaryLight },
  { key: 'thisWeek' as const, label: 'This Week', icon: CalendarDays, color: '#34C759' },
  { key: 'weekend' as const, label: 'Weekend', icon: Calendar, color: BRAND.light.primary },
  { key: 'budget' as const, label: 'Under £20', icon: Star, color: '#34C759' },
  { key: 'explore' as const, label: 'Explore', icon: Globe, color: BRAND.light.primary },
];


function EventsScreenInner() {
  const { isDark } = useTheme();
  const { profile } = useUserProfile();
  const router = useRouter();
  const { createEvent, hasPermission, requestPermissions } = useEventKit();
  const { scheduleEventReminder } = useEventReminders();
  const { logEventPlanned } = useSocialActivity();
  const {
    savedAsLocalEvents,
    upcomingSaved,
    savedCount,
    isSaved,
    toggleSaved,
    addToOnePager,
    setPlanningStatus,
    savedSnapshots,
    eventsNeedingFeedback,
    recordEventFeedback,
    dismissEventFeedback,
  } = useSavedEvents();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [mainTab, setMainTab] = useState<EventsMainTab>('discover');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMapEvent, setSelectedMapEvent] = useState<string | null>(null);
  const [discoveryTab, setDiscoveryTab] = useState<DiscoveryTabKey>('forYou');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState<'tonight' | 'weekend' | null>(null);
  const [weekendPlannerOpen, setWeekendPlannerOpen] = useState(false);
  const [expandedCombinedDayKey, setExpandedCombinedDayKey] = useState<string | null>(null);
  const [dismissedCombinedDayKeys, setDismissedCombinedDayKeys] = useState<Set<string>>(new Set());
  const [rsvpPendingByEventId, setRsvpPendingByEventId] = useState<Record<string, PlanRsvpStatus | null>>({});
  const [whyThisEvent, setWhyThisEvent] = useState<LocalEvent | null>(null);
  const [mapSearchCenter, setMapSearchCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);
  const [mapSheetExpanded, setMapSheetExpanded] = useState(false);
  const [liveMapRegion, setLiveMapRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const mapRef = useRef<MapView>(null);
  const viewToggleAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const palette = useMemo(() => eventsFixedPalette(isDark, mainTab), [isDark, mainTab]);

  const {
    coords: userCoords,
    areaLabel,
    isLoading: locationLoading,
    permissionDenied,
    refresh: refreshLocation,
  } = useUserLocation();

  const eventQueryCenter = mapSearchCenter ?? userCoords;
  const {
    countsByCategory,
    getEventsForCategory,
    source: eventsSource,
    isPreviewLoading,
    isBatchLoading,
    refetch: refetchPerCategory,
  } = usePerCategoryEvents({
    latitude: eventQueryCenter.latitude,
    longitude: eventQueryCenter.longitude,
    enabled: mainTab === 'discover',
  });

  const globalSearch = useGlobalEventSearch(
    searchQuery,
    eventQueryCenter,
    mainTab === 'discover',
  );
  const {
    events: globalSearchEvents,
    source: globalSearchSource,
    isSearching: isGlobalSearching,
    isActive: isGlobalSearchActive,
    debouncedKeyword: globalSearchKeyword,
    error: globalSearchError,
    networkError: globalSearchNetworkError,
    usingCachedResults: globalSearchUsingCache,
    cachedResultsAgeLabel: globalSearchCacheAge,
    refetch: refetchGlobalSearch,
  } = globalSearch;

  const inSearchMode = searchQuery.trim().length >= 2;

  const nearbyEvents = useMemo(
    () => getEventsForCategory(selectedCategory),
    [getEventsForCategory, selectedCategory],
  );

  const browseEvents = useMemo(
    () => nearbyEvents.map((e) => ({ ...e, isSaved: isSaved(e.id) })),
    [nearbyEvents, isSaved],
  );

  const events = useMemo(() => {
    if (inSearchMode) {
      return globalSearchEvents.map((e) => ({ ...e, isSaved: isSaved(e.id) }));
    }
    return browseEvents;
  }, [inSearchMode, globalSearchEvents, browseEvents, isSaved]);

  useEffect(() => {
    const discoveryPool =
      isGlobalSearchActive && globalSearchEvents.length > 0
        ? [...nearbyEvents, ...globalSearchEvents]
        : nearbyEvents;
    registerDiscoveryEvents(discoveryPool);
    registerSavedEvents(savedSnapshots);
  }, [nearbyEvents, isGlobalSearchActive, globalSearchEvents, savedSnapshots]);

  const openEventDetail = useCallback(
    (eventId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/(root)/event/${eventId}`);
    },
    [router]
  );

  const handleAddToOnePager = useCallback(
    async (event: Event) => {
      if (isSaved(event.id)) {
        await toggleSaved(event);
        return;
      }
      await addToOnePager(event);
      setToastMessage('Added to One Pager');
    },
    [addToOnePager, isSaved, toggleSaved]
  );

  const handleToggleSavedWithToast = useCallback(
    async (event: Event) => {
      const wasSaved = isSaved(event.id);
      await toggleSaved(event);
      if (!wasSaved) {
        setToastMessage('Added to One Pager');
      }
    },
    [isSaved, toggleSaved]
  );

  const showSaveToast = useCallback(() => {
    setToastMessage('Added to One Pager');
  }, []);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const toggleViewMode = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextMode = viewMode === 'list' ? 'map' : 'list';
    setViewMode(nextMode);
    Animated.spring(viewToggleAnim, {
      toValue: nextMode === 'map' ? 1 : 0,
      tension: 120,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [viewMode, viewToggleAnim]);

  const handleMapMarkerPress = useCallback((eventId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMapEvent(eventId);
    setMapSheetExpanded(false);
  }, []);

  const handleMapRegionChangeComplete = useCallback(
    (region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => {
      setLiveMapRegion(region);
      const anchor = mapSearchCenter ?? userCoords;
      setShowSearchAreaBtn(regionsDifferSignificantly(anchor, region, 2));
    },
    [mapSearchCenter, userCoords]
  );

  const handleSearchThisArea = useCallback(() => {
    if (!liveMapRegion) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMapSearchCenter({
      latitude: liveMapRegion.latitude,
      longitude: liveMapRegion.longitude,
    });
    setShowSearchAreaBtn(false);
    setSelectedMapEvent(null);
    setMapSheetExpanded(false);
  }, [liveMapRegion]);

  const closeMapSheet = useCallback(() => {
    setSelectedMapEvent(null);
    setMapSheetExpanded(false);
  }, []);

  const filteredEvents = useMemo(() => {
    if (inSearchMode) {
      return curateDiscoveryEvents(events);
    }
    let filtered = curateDiscoveryEvents(events);
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((event) => eventMatchesBentoCategory(event, selectedCategory));
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter((e) => eventMatchesLocalSearch(e, searchQuery));
    }
    return filtered;
  }, [events, selectedCategory, searchQuery, inSearchMode]);

  const mapRegion = useMemo(() => {
    const evts = filteredEvents.length > 0 ? filteredEvents : events;
    if (evts.length === 0) {
      return {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      };
    }
    const lats = [...evts.map((e) => e.latitude), userCoords.latitude];
    const lngs = [...evts.map((e) => e.longitude), userCoords.longitude];
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.05),
      longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.05),
    };
  }, [filteredEvents, events, userCoords]);

  const selectedMapEventData = useMemo(() => {
    if (!selectedMapEvent) return null;
    return events.find(e => e.id === selectedMapEvent) ?? null;
  }, [selectedMapEvent, events]);

  const featuredEvents = useMemo(() => events.filter(e => e.isFeatured), [events]);

  const handleOpenTickets = useCallback((event: Event) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void openEventTickets(event);
  }, []);

  const handleOpenDirections = useCallback((event: Event) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void openEventDirections(event);
  }, []);

  const handleAddToCalendar = useCallback(
    async (event: Event) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const range = getEventCalendarRange(event);
      if (!range) {
        Alert.alert('Calendar', 'Could not parse this event’s date.');
        return;
      }
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert('Calendar', 'Allow calendar access in Settings to save events.');
          return;
        }
      }
      const eventId = await createEvent({
        title: event.title,
        startDate: range.start,
        endDate: range.end,
        location: `${event.venue}, ${event.location}`,
        notes: event.ticketUrl ? `Tickets: ${event.ticketUrl}\n\n${event.description}` : event.description,
      });
      if (eventId) {
        Alert.alert('Added to calendar', event.title);
        void logEventPlanned(event);
      } else {
        Alert.alert('Calendar', 'Could not add this event. Check calendar permissions.');
      }
    },
    [createEvent, hasPermission, requestPermissions, logEventPlanned]
  );

  const handleRemind = useCallback(
    async (event: Event) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await scheduleEventReminder(event);
    },
    [scheduleEventReminder]
  );

  const accentColor = palette.primary;
  const accentLight = palette.primaryLight;
  const secondaryAccent = palette.secondary;
  const inverseText = palette.textInverse;

  const warmBg = palette.background;
  const cardBg = palette.card;
  const cardBorder = palette.border;
  const subtleText = palette.textSecondary;
  const mainText = palette.text;
  const secondaryBg = palette.surfaceLight;

  // Never reintroduce stale or duplicate listings when a filter returns no matches.
  const baseEvents = filteredEvents;
  const savedEvents = savedAsLocalEvents;
  const savedEventsSocial = useSavedEventsSocial(savedEvents);

  const weekTimelineGroups = useMemo(
    () => groupSavedEventsByDay(upcomingSaved),
    [upcomingSaved],
  );

  const multiEventDays = useMemo(
    () => findMultiEventDays(upcomingSaved),
    [upcomingSaved],
  );

  const nextCombinedDay = useMemo(
    () => multiEventDays.find((day) => !dismissedCombinedDayKeys.has(day.dayKey)) ?? null,
    [multiEventDays, dismissedCombinedDayKeys],
  );
  const {
    friendsPickEvents,
    friendCountByEventId,
    friendsByEventId,
  } = useFriendsEventPicks(baseEvents);

  const selectedMapSocialProof = useMemo(() => {
    if (!selectedMapEvent) return { label: null, friends: [] };
    const profiles = getEventFriendProfiles(selectedMapEvent, friendsByEventId);
    return {
      label: formatFriendsGoingLabel(profiles),
      friends: profiles,
    };
  }, [selectedMapEvent, friendsByEventId]);

  const {
    inviteEvent,
    openInvite,
    closeInvite,
    handleInviteFriend,
    friends: inviteFriendsList,
    inviterUsername,
    planInviteToken,
    canInvite,
  } = useEventInviteFlow();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (mainTab === 'myEvents') {
        await savedEventsSocial.refresh();
      } else {
        const refetches: Promise<unknown>[] = [refetchPerCategory(), refreshLocation()];
        if (isGlobalSearchActive) {
          refetches.push(refetchGlobalSearch());
        }
        await Promise.all(refetches);
      }
    } finally {
      setRefreshing(false);
    }
  }, [
    mainTab,
    refetchPerCategory,
    refreshLocation,
    savedEventsSocial,
    isGlobalSearchActive,
    refetchGlobalSearch,
  ]);

  const handleSavedEventRsvp = useCallback(
    async (event: Event, status: PlanRsvpStatus) => {
      setRsvpPendingByEventId((prev) => ({ ...prev, [event.id]: status }));
      try {
        await savedEventsSocial.setRsvp(event, status);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Alert.alert(
          'Could not save RSVP',
          error instanceof Error ? error.message : 'Please try again in a moment.',
        );
      } finally {
        setRsvpPendingByEventId((prev) => ({ ...prev, [event.id]: null }));
      }
    },
    [savedEventsSocial],
  );

  const handleInviteSavedEvent = useCallback(
    (event: Event) => {
      openInvite(event);
    },
    [openInvite],
  );

  const getCardSocialProps = useCallback(
    (eventId: string) => {
      const profiles = getEventFriendProfiles(eventId, friendsByEventId);
      return {
        socialProofLabel: formatFriendsGoingLabel(profiles),
        socialProofFriends: profiles,
        onInviteFriends: canInvite ? openInvite : undefined,
      };
    },
    [friendsByEventId, canInvite, openInvite],
  );

  const recommendationInput = useEventRecommendationInput(friendCountByEventId);

  const recommendationInputWithTab = useMemo(
    () => ({
      ...recommendationInput,
      discoveryTab,
      areaLabel: areaLabel ?? undefined,
    }),
    [recommendationInput, discoveryTab, areaLabel],
  );

  const eventConcierge = useEventConcierge({
    recommendationInput,
    userCoords,
    mapSearchCenter,
    areaLabel,
  });

  const getChipLabel = useCallback(
    (event: LocalEvent, categoryId?: string) =>
      getRecommendationChipLabel(
        event,
        recommendationInputWithTab,
        categoryId ? { categoryId } : undefined,
      ),
    [recommendationInputWithTab],
  );

  const openWhyThis = useCallback((event: LocalEvent) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWhyThisEvent(event);
  }, []);

  const whyThisReasons = useMemo(() => {
    if (!whyThisEvent) return [];
    return buildEventRecommendationReasons(whyThisEvent, recommendationInputWithTab, 6);
  }, [whyThisEvent, recommendationInputWithTab]);

  const whyThisExplanation = useMemo(() => {
    if (!whyThisEvent) return null;
    return explainEventPersonalization(whyThisEvent, profile, recommendationInputWithTab);
  }, [whyThisEvent, profile, recommendationInputWithTab]);

  const conciergeContext = eventConcierge?.context ?? 'default';

  const eventStats = useMemo(
    () => getEventStatsSummary(profile, savedSnapshots),
    [profile, savedSnapshots]
  );

  const onePagerThisWeekCount = useMemo(
    () => countSavedEventsThisWeek(upcomingSaved),
    [upcomingSaved]
  );

  const onePagerThisWeekLabel = useMemo(() => {
    if (onePagerThisWeekCount <= 0) return undefined;
    const noun = onePagerThisWeekCount === 1 ? 'event' : 'events';
    return `${onePagerThisWeekCount} ${noun} this week on your One Pager`;
  }, [onePagerThisWeekCount]);

  const happeningNowEvents = useMemo(() => {
    if (baseEvents.length === 0) return [];
    const live = filterHappeningNow(baseEvents);
    if (live.length > 0) return live.slice(0, 4);
    return baseEvents.filter((e) => e.isHot || e.isFeatured || e.isLiveNow).slice(0, 4);
  }, [baseEvents]);

  const nearYouEvents = useMemo(() => {
    if (baseEvents.length === 0) return [];
    return sortEventsByDistance(baseEvents, userCoords).slice(0, 4);
  }, [baseEvents, userCoords]);

  const forYouEvents = useMemo(() => {
    if (baseEvents.length === 0) return [];
    const hasHabitSignals =
      (recommendationInput.habitKeywords?.length ?? 0) > 0 ||
      Object.keys(recommendationInput.habitCategoryWeights ?? {}).length > 0;
    const ranked = hasHabitSignals
      ? rankEventsForHabits(baseEvents, recommendationInput)
      : rankEventsForConciergeFeed(baseEvents, recommendationInput, conciergeContext);
    return ranked.slice(0, 4);
  }, [baseEvents, recommendationInput, conciergeContext]);

  const thisWeekEvents = useMemo(() => {
    if (baseEvents.length === 0) return [];
    return filterThisWeekEvents(baseEvents).slice(0, 4);
  }, [baseEvents]);

  const tonightCandidates = useMemo(() => {
    const pool = baseEvents.filter((event) => !isSaved(event.id));
    return rankEventsForYou(filterTonightEvents(pool), recommendationInput).slice(0, 3);
  }, [baseEvents, isSaved, recommendationInput]);

  const weekendCandidates = useMemo(() => {
    const pool = baseEvents.filter((event) => !isSaved(event.id));
    return rankEventsForYou(filterWeekendEvents(pool), recommendationInput).slice(0, 5);
  }, [baseEvents, isSaved, recommendationInput]);

  const handleAddTonight = useCallback(async () => {
    if (tonightCandidates.length === 0) return;
    setPlanLoading('tonight');
    try {
      for (const event of tonightCandidates) {
        await addToOnePager(event);
      }
      setToastMessage(
        tonightCandidates.length === 1
          ? 'Added 1 event to your One Pager for tonight'
          : `Added ${tonightCandidates.length} events to your One Pager for tonight`,
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setPlanLoading(null);
    }
  }, [addToOnePager, tonightCandidates]);

  const handleBuildWeekend = useCallback(() => {
    setWeekendPlannerOpen(true);
  }, []);


  const smartDiscoveryEvents =
    discoveryTab === 'explore'
      ? chooseExploreEvents(filteredEvents)
      : discoveryTab === 'weekend'
      ? rankEventsForYou(filteredEvents.filter(event => isWeekendEvent(event)), recommendationInput)
      : discoveryTab === 'budget'
        ? rankEventsForYou(filteredEvents.filter(event => isAffordableEvent(event, 20)), recommendationInput)
      : discoveryTab === 'now'
      ? happeningNowEvents
      : discoveryTab === 'near'
        ? nearYouEvents
        : discoveryTab === 'thisWeek'
          ? thisWeekEvents
          : discoveryTab === 'friendsPicks'
            ? friendsPickEvents.slice(0, 4)
            : forYouEvents;

  const habitEventRow = useMemo(
    () => buildHabitBasedEventRow(filteredEvents, recommendationInput, 4),
    [filteredEvents, recommendationInput],
  );

  const habitEventIds = useMemo(
    () => new Set(habitEventRow?.events.map((e) => e.id) ?? []),
    [habitEventRow],
  );

  const editorialRows = useMemo(() => {
    const rows = buildEditorialEventRows(filteredEvents, recommendationInput, 2, habitEventIds);
    return rows.map((row) => ({
      ...row,
      events: rankEventsForConciergeFeed(row.events, recommendationInput, conciergeContext),
    }));
  }, [filteredEvents, recommendationInput, conciergeContext, habitEventIds]);

  const editorialEventIds = useMemo(
    () => new Set(editorialRows.flatMap((row) => row.events.map((e) => e.id))),
    [editorialRows]
  );

  const smartDiscoveryEventIds = useMemo(
    () => new Set(smartDiscoveryEvents.map((e) => e.id)),
    [smartDiscoveryEvents]
  );

  const heroEvents = useMemo(() => {
    const pool =
      forYouEvents.length > 0
        ? forYouEvents
        : featuredEvents.length > 0
          ? featuredEvents
          : nearYouEvents.length > 0
            ? nearYouEvents
