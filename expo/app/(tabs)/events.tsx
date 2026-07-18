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
  Repeat,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserLocation } from '@/hooks/useUserLocation';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { usePerCategoryEvents } from '@/hooks/usePerCategoryEvents';
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
import { EventFeedbackPrompt } from '@/components/events/EventFeedbackPrompt';
import { SavedEventsWeekTimeline } from '@/components/events/SavedEventsWeekTimeline';
import { CombinedNightOutPrompt } from '@/components/events/CombinedNightOutPrompt';
import { PremiumSavedEventCard } from '@/components/events/PremiumSavedEventCard';
import { EventConciergeFeedBanner } from '@/components/events/EventConciergeFeedBanner';
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
import type { LocalEvent } from '@/types/events';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useSavedEventsSocial } from '@/hooks/useSavedEventsSocial';
import { groupSavedEventsByDay, findMultiEventDays } from '@/utils/savedEventsWeek';
import type { PlanRsvpStatus } from '@/utils/sharedPlansService';
import { eventMatchesBentoCategory } from '@/utils/eventCategories';
import { registerDiscoveryEvents, registerSavedEvents } from '@/utils/eventCatalog';
import { getEventCategoryMeta } from '@/utils/eventCategoryMeta';
import {
  formatFriendsGoingLabel,
  getEventFriendProfiles,
} from '@/utils/eventSocialProof';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'list' | 'map';
type EventsMainTab = 'discover' | 'myEvents';
type Event = LocalEvent;

const DISCOVERY_PILL_TABS = [
  { key: 'now' as const, label: 'Now', icon: Flame, color: '#FF6B6B' },
  { key: 'near' as const, label: 'Near You', icon: MapPin, color: BRAND.light.accent },
  { key: 'forYou' as const, label: 'For You', icon: Target, color: BRAND.light.primary },
  { key: 'friendsPicks' as const, label: 'Friends', icon: Users, color: BRAND.light.primaryLight },
  { key: 'thisWeek' as const, label: 'This Week', icon: CalendarDays, color: '#34C759' },
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
  const [discoveryTab, setDiscoveryTab] = useState<DiscoveryTabKey>('now');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState<'tonight' | 'weekend' | null>(null);
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

  const nearbyEvents = useMemo(
    () => getEventsForCategory(selectedCategory),
    [getEventsForCategory, selectedCategory],
  );

  const events = useMemo(
    () => nearbyEvents.map((e) => ({ ...e, isSaved: isSaved(e.id) })),
    [nearbyEvents, isSaved]
  );

  useEffect(() => {
    registerDiscoveryEvents(nearbyEvents);
    registerSavedEvents(savedSnapshots);
  }, [nearbyEvents, savedSnapshots]);

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
    let filtered = events;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((event) => eventMatchesBentoCategory(event, selectedCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        (e.tags ?? []).some(t => t.includes(q))
      );
    }
    return filtered;
  }, [events, selectedCategory, searchQuery]);

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

  const baseEvents = filteredEvents.length > 0 ? filteredEvents : events;
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
        await Promise.all([refetchPerCategory(), refreshLocation()]);
      }
    } finally {
      setRefreshing(false);
    }
  }, [mainTab, refetchPerCategory, refreshLocation, savedEventsSocial]);

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
        { ...recommendationInput, discoveryTab },
        categoryId ? { categoryId } : undefined,
      ),
    [recommendationInput, discoveryTab],
  );

  const openWhyThis = useCallback((event: LocalEvent) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWhyThisEvent(event);
  }, []);

  const whyThisReasons = useMemo(() => {
    if (!whyThisEvent) return [];
    return buildEventRecommendationReasons(
      whyThisEvent,
      { ...recommendationInput, discoveryTab },
      6,
    );
  }, [whyThisEvent, recommendationInput, discoveryTab]);

  const whyThisExplanation = useMemo(() => {
    if (!whyThisEvent) return null;
    return explainEventPersonalization(whyThisEvent, profile, {
      ...recommendationInput,
      discoveryTab,
    });
  }, [whyThisEvent, profile, recommendationInput, discoveryTab]);

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

  const handleBuildWeekend = useCallback(async () => {
    if (weekendCandidates.length === 0) return;
    setPlanLoading('weekend');
    try {
      for (const event of weekendCandidates) {
        await addToOnePager(event);
      }
      setToastMessage(
        weekendCandidates.length === 1
          ? 'Added 1 event to build your weekend'
          : `Added ${weekendCandidates.length} events to build your weekend`,
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setPlanLoading(null);
    }
  }, [addToOnePager, weekendCandidates]);

  const smartDiscoveryEvents =
    discoveryTab === 'now'
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
            : events.slice(0, 3);
    return boostEventsForConciergeContext(pool, conciergeContext).slice(0, 3);
  }, [forYouEvents, featuredEvents, nearYouEvents, events, conciergeContext]);

  const heroEventIdSet = useMemo(() => new Set(heroEvents.map((e) => e.id)), [heroEvents]);

  const verticalFeedEvents = useMemo(() => {
    const excludeHeroAndRail = (event: LocalEvent) =>
      !smartDiscoveryEventIds.has(event.id) && !heroEventIdSet.has(event.id);

    if (selectedCategory !== 'all') {
      return rankEventsForYou(filteredEvents, recommendationInput);
    }

    const pool = filteredEvents.filter(
      (e) =>
        excludeHeroAndRail(e) &&
        !editorialEventIds.has(e.id) &&
        !habitEventIds.has(e.id),
    );
    return rankEventsForConciergeFeed(pool, recommendationInput, conciergeContext);
  }, [
    filteredEvents,
    selectedCategory,
    smartDiscoveryEventIds,
    editorialEventIds,
    habitEventIds,
    heroEventIdSet,
    recommendationInput,
    conciergeContext,
  ]);

  const showCinematicHero = mainTab === 'discover' && viewMode === 'list';

  const discoveryRailTitle =
    discoveryTab === 'now'
      ? 'Happening Now'
      : discoveryTab === 'near'
        ? 'Near You'
        : discoveryTab === 'thisWeek'
          ? 'This Week'
          : discoveryTab === 'friendsPicks'
            ? "Friends' Picks"
            : 'Picked For You';

  const filteredCategoryLabel =
    selectedCategory !== 'all'
      ? getEventCategoryMeta(selectedCategory).label
      : null;

  return (
    <View style={[styles.container, { backgroundColor: warmBg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAwareScrollView
        headerHeight={0}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: showCinematicHero ? 0 : insets.top + 8,
            paddingBottom: 120 + insets.bottom,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accentColor} />
        }
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
      {showCinematicHero && isPreviewLoading ? (
        <EventsHeroSkeleton palette={palette} />
      ) : null}
      {showCinematicHero && !isPreviewLoading ? (
        <PremiumEventHeroCard
          events={heroEvents}
          scrollY={scrollY}
          palette={palette}
          areaLabel={areaLabel ?? undefined}
          safeAreaTop={insets.top}
          onePagerThisWeekLabel={onePagerThisWeekLabel}
          concierge={eventConcierge}
          getRecommendationChipLabel={(event) => getChipLabel(event)}
          onPressEvent={openEventDetail}
          onAddToOnePager={handleAddToOnePager}
          onInterested={handleToggleSavedWithToast}
          onOpenTickets={handleOpenTickets}
        />
      ) : null}

      <View style={[styles.header, showCinematicHero && styles.headerCompact]}>
        {!showCinematicHero ? (
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              {mainTab === 'myEvents' ? (
                <TouchableOpacity
                  style={[styles.headerBackBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                  onPress={() => setMainTab('discover')}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Back to Discover"
                >
                  <ChevronLeft size={22} color={mainText} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.headerIconWrap, { backgroundColor: palette.primaryLight }]}>
                  <Sparkles size={20} color={palette.primary} />
                </View>
              )}
              <View style={styles.headerTitleWrap}>
                <Text style={[styles.headerTitle, { color: mainText }]}>
                  {mainTab === 'myEvents' ? 'My Events' : 'Events'}
                </Text>
                <Text style={[styles.headerSubtitle, { color: subtleText }]}>
                  {mainTab === 'myEvents'
                    ? 'Your saved plans and One Pager picks'
                    : areaLabel
                      ? `Around ${areaLabel}`
                      : 'Discover events picked for you'}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              {mainTab === 'discover' ? (
                <TouchableOpacity
                  style={[styles.viewToggle, {
                    backgroundColor: viewMode === 'map' ? accentColor : cardBg,
                  }]}
                  onPress={toggleViewMode}
                  activeOpacity={0.7}
                >
                  <Animated.View style={{
                    transform: [{
                      rotate: viewToggleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '180deg'],
                      }),
                    }],
                  }}>
                    {viewMode === 'list' ? (
                      <Map size={18} color={accentColor} />
                    ) : (
                      <List size={18} color={inverseText} />
                    )}
                  </Animated.View>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Search size={18} color={subtleText} />
          <TextInput
            style={[styles.searchInput, { color: mainText }]}
            placeholder="Search events, venues, artists..."
            placeholderTextColor={subtleText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={subtleText} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.mainTabRow, showCinematicHero && styles.mainTabRowCompact]}>
          <TouchableOpacity
            style={[
              styles.mainTabPill,
              showCinematicHero && styles.mainTabPillCompact,
              { backgroundColor: mainTab === 'discover' ? accentColor : cardBg, borderColor: mainTab === 'discover' ? accentColor : cardBorder },
            ]}
            onPress={() => setMainTab('discover')}
            activeOpacity={0.85}
          >
            <Sparkles size={14} color={mainTab === 'discover' ? inverseText : accentColor} />
            <Text style={[styles.mainTabText, { color: mainTab === 'discover' ? inverseText : mainText }]}>Discover</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.mainTabPill,
              showCinematicHero && styles.mainTabPillCompact,
              { backgroundColor: mainTab === 'myEvents' ? accentColor : cardBg, borderColor: mainTab === 'myEvents' ? accentColor : cardBorder },
            ]}
            onPress={() => setMainTab('myEvents')}
            activeOpacity={0.85}
          >
            <Heart size={14} color={mainTab === 'myEvents' ? inverseText : accentColor} fill={mainTab === 'myEvents' ? inverseText : 'transparent'} />
            <Text style={[styles.mainTabText, { color: mainTab === 'myEvents' ? inverseText : mainText }]}>
              My Events{savedCount > 0 ? ` (${savedCount})` : ''}
            </Text>
          </TouchableOpacity>
          {mainTab === 'discover' ? (
            <TouchableOpacity
              style={[styles.mapFab, { backgroundColor: viewMode === 'map' ? accentColor : cardBg, borderColor: cardBorder }]}
              onPress={toggleViewMode}
              activeOpacity={0.85}
            >
              {viewMode === 'list' ? (
                <Map size={18} color={accentColor} />
              ) : (
                <List size={18} color={inverseText} />
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {mainTab === 'discover' && eventsSource === 'fallback' && (
        <View style={[styles.liveBanner, { backgroundColor: secondaryBg, borderColor: cardBorder }]}>
          <Text style={[styles.liveBannerText, { color: subtleText }]}>
            {process.env.EXPO_PUBLIC_RORK_API_BASE_URL?.trim()
              ? 'Showing sample events — add TICKETMASTER_API_KEY and/or SKIDDLE_API_KEY to your Railway API service, redeploy, then pull to refresh.'
              : 'Showing sample events — add TICKETMASTER_API_KEY and/or SKIDDLE_API_KEY to expo/.env and restart Metro for live listings.'}
          </Text>
        </View>
      )}

      {mainTab === 'discover' && permissionDenied && eventsSource !== 'fallback' && (
        <View style={[styles.liveBanner, { backgroundColor: secondaryBg, borderColor: cardBorder }]}>
          <Text style={[styles.liveBannerText, { color: subtleText }]}>
            Location off — enable location for events closest to you.
          </Text>
        </View>
      )}

      {mainTab === 'myEvents' && savedEvents.length > 0 ? (
        <EventsStatsRow stats={eventStats} palette={palette} />
      ) : null}

      {mainTab === 'discover' && viewMode === 'list' && (
      <View style={styles.smartDiscoveryWrap}>
        {showCinematicHero ? (
          <View style={[styles.railHeader, styles.railHeaderFirst]}>
            <Text style={[styles.railTitle, { color: mainText }]}>{discoveryRailTitle}</Text>
            <Text style={[styles.railCount, { color: subtleText }]}>{smartDiscoveryEvents.length} events</Text>
          </View>
        ) : null}

        <EventsDiscoveryPills
          tabs={DISCOVERY_PILL_TABS}
          activeTab={discoveryTab}
          onTabChange={setDiscoveryTab}
          palette={palette}
          compact
        />

        {!showCinematicHero && eventConcierge ? (
          <EventConciergeFeedBanner
            narrative={eventConcierge}
            palette={palette}
            tonightCount={tonightCandidates.length}
            weekendCount={weekendCandidates.length}
            onAddTonight={handleAddTonight}
            onBuildWeekend={handleBuildWeekend}
            loading={planLoading}
          />
        ) : null}

        {showCinematicHero && !eventConcierge ? (
          <EventPlanShortcuts
            tonightCount={tonightCandidates.length}
            weekendCount={weekendCandidates.length}
            onAddTonight={handleAddTonight}
            onBuildWeekend={handleBuildWeekend}
            loading={planLoading}
            palette={palette}
            variant="compact"
          />
        ) : null}

        {!showCinematicHero ? (
        <View style={styles.railHeader}>
          <Text style={[styles.railTitle, { color: mainText }]}>{discoveryRailTitle}</Text>
          <Text style={[styles.railCount, { color: subtleText }]}>{smartDiscoveryEvents.length} events</Text>
        </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.discoveryRailScroll}
        >
          {isPreviewLoading ? (
            <EventsRailSkeleton palette={palette} />
          ) : smartDiscoveryEvents.length === 0 ? (
            <View style={styles.smartDiscoveryEmpty}>
              <Text style={{ color: subtleText, fontWeight: '600' as const }}>No events match yet</Text>
            </View>
          ) : (
            smartDiscoveryEvents.map((event, index) => (
              <PremiumEventPosterCard
                key={event.id}
                event={event}
                palette={palette}
                variant="horizontal"
                recommendationChipLabel={getChipLabel(event)}
                recommendationChipVariant={index === 0 ? 'featured-chip' : 'feed-chip'}
                onWhyThis={openWhyThis}
                {...getCardSocialProps(event.id)}
                onPress={openEventDetail}
                onToggleSaved={handleToggleSavedWithToast}
                onSaved={showSaveToast}
              />
            ))
          )}
        </ScrollView>
      </View>
      )}

      {mainTab === 'discover' && viewMode === 'map' ? (
        <View style={[styles.mapContainer, styles.mapContainerInScroll]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={mapRegion}
            region={liveMapRegion ?? undefined}
            onRegionChangeComplete={handleMapRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            mapPadding={{ top: 20, right: 16, bottom: 240, left: 16 }}
          >
            {filteredEvents.map((event) => (
              <Marker
                key={event.id}
                coordinate={{ latitude: event.latitude, longitude: event.longitude }}
                onPress={() => handleMapMarkerPress(event.id)}
                tracksViewChanges={false}
              >
                <EventsMapMarker
                  category={event.category}
                  selected={selectedMapEvent === event.id}
                  friendAvatars={getEventFriendProfiles(event.id, friendsByEventId)}
                />
              </Marker>
            ))}
          </MapView>

          {showSearchAreaBtn ? (
            <TouchableOpacity
              style={[styles.searchAreaBtn, { backgroundColor: palette.primary }]}
              onPress={handleSearchThisArea}
              activeOpacity={0.9}
            >
              <Search size={14} color={inverseText} />
              <Text style={[styles.searchAreaText, { color: inverseText }]}>Search this area</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.mapEventCount}>
            <View style={[styles.mapCountPill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Navigation size={12} color={accentColor} />
              <Text style={[styles.mapCountText, { color: mainText }]}>
                {filteredEvents.length} events {mapSearchCenter ? 'in this area' : 'nearby'}
              </Text>
            </View>
          </View>

          <View style={styles.mapSheetWrap}>
            <EventsMapBottomSheet
              event={selectedMapEventData}
              palette={palette}
              expanded={mapSheetExpanded}
              onExpandChange={setMapSheetExpanded}
              onClose={closeMapSheet}
              onOpenDetail={openEventDetail}
              onAddToOnePager={handleAddToOnePager}
              onToggleSaved={handleToggleSavedWithToast}
              onOpenTickets={handleOpenTickets}
              onInviteFriends={canInvite ? openInvite : undefined}
              socialProofLabel={selectedMapSocialProof.label}
              socialProofFriends={selectedMapSocialProof.friends}
              bottomInset={0}
            />
          </View>
        </View>
      ) : mainTab === 'discover' && viewMode === 'list' ? (
      <>
        {upcomingSaved.length > 0 && !searchQuery && selectedCategory === 'all' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconWrap, { backgroundColor: palette.primaryLight }]}>
                  <Calendar size={14} color={palette.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: mainText }]}>Your Upcoming</Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: secondaryBg }]}>
                <Text style={[styles.countText, { color: accentColor }]}>{upcomingSaved.length}</Text>
              </View>
            </View>
            {upcomingSaved.slice(0, 3).map((event) => (
              <PremiumEventListRow
                key={event.id}
                event={event}
                palette={palette}
                onPress={openEventDetail}
                onRemind={handleRemind}
                onAddToCalendar={handleAddToCalendar}
              />
            ))}
          </View>
        )}

        {habitEventRow && selectedCategory === 'all' && !searchQuery ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconWrap, { backgroundColor: palette.primaryLight }]}>
                  <Repeat size={14} color={palette.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: mainText }]}>{habitEventRow.title}</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionRailScroll}
            >
              {habitEventRow.events.map((event, index) => (
                <PremiumEventPosterCard
                  key={event.id}
                  event={event}
                  palette={palette}
                  variant="horizontal"
                  recommendationChipLabel={
                    index === 0
                      ? getEditorialRowChipLabel(
                          habitEventRow.categoryId,
                          event,
                          getPrimaryEventRecommendationReasonForCategory(
                            event,
                            { ...recommendationInput, discoveryTab },
                            habitEventRow.categoryId,
                          ),
                        )
                      : getEditorialRowSecondaryChipLabel(habitEventRow.categoryId, event)
                  }
                  recommendationChipVariant={index === 0 ? 'featured-chip' : 'feed-chip'}
                  onWhyThis={openWhyThis}
                  {...getCardSocialProps(event.id)}
                  onPress={openEventDetail}
                  onToggleSaved={handleToggleSavedWithToast}
                  onSaved={showSaveToast}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {editorialRows.length > 0 && selectedCategory === 'all' && !searchQuery
          ? editorialRows.map((row) => (
          <View key={row.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconWrap, { backgroundColor: palette.primaryLight }]}>
                  <Target size={14} color={palette.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: mainText }]}>{row.title}</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionRailScroll}
            >
              {row.events.map((event, index) => (
                <PremiumEventPosterCard
                  key={event.id}
                  event={event}
                  palette={palette}
                  variant="horizontal"
                  recommendationChipLabel={
                    index === 0
                      ? getEditorialRowChipLabel(
                          row.categoryId,
                          event,
                          getPrimaryEventRecommendationReasonForCategory(
                            event,
                            { ...recommendationInput, discoveryTab },
                            row.categoryId,
                          ),
                        )
                      : getEditorialRowSecondaryChipLabel(row.categoryId, event)
                  }
                  recommendationChipVariant={index === 0 ? 'featured-chip' : 'feed-chip'}
                  onWhyThis={openWhyThis}
                  {...getCardSocialProps(event.id)}
                  onPress={openEventDetail}
                  onToggleSaved={handleToggleSavedWithToast}
                  onSaved={showSaveToast}
                />
              ))}
            </ScrollView>
          </View>
        ))
          : null}

        {!searchQuery && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconWrap, { backgroundColor: palette.primaryLight }]}>
                  <Sparkles size={14} color={palette.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: mainText }]}>Browse by mood</Text>
              </View>
            </View>
            <EventsCategoryBento
              events={events}
              categoryCounts={countsByCategory}
              countsLoading={isBatchLoading}
              selectedCategory={selectedCategory}
              palette={palette}
              onSelectCategory={setSelectedCategory}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconWrap, { backgroundColor: palette.primaryLight }]}>
                <Star size={14} color={palette.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: mainText }]}>
                {filteredCategoryLabel ?? 'All events'}
              </Text>
            </View>
            <Text style={[styles.resultCount, { color: subtleText }]}>
              {verticalFeedEvents.length} {verticalFeedEvents.length === 1 ? 'event' : 'events'}
            </Text>
          </View>

          {verticalFeedEvents.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Sparkles size={28} color={palette.primary} />
              <Text style={[styles.emptyTitle, { color: mainText }]}>You’re all caught up</Text>
              <Text style={[styles.emptyText, { color: subtleText }]}>
                {selectedCategory !== 'all'
                  ? `No ${filteredCategoryLabel?.toLowerCase() ?? 'matching'} events right now`
                  : 'Try another category or pill above'}
              </Text>
            </View>
          ) : (
            <View style={styles.feedList}>
            {verticalFeedEvents.map((event, index) => (
              <PremiumEventPosterCard
                key={event.id}
                event={event}
                palette={palette}
                variant="feed"
                recommendationChipLabel={
                  index === 0 && selectedCategory !== 'all'
                    ? getChipLabel(event, selectedCategory)
                    : getChipLabel(event)
                }
                recommendationChipVariant={index === 0 && selectedCategory !== 'all' ? 'featured-chip' : 'feed-chip'}
                onWhyThis={openWhyThis}
                {...getCardSocialProps(event.id)}
                onPress={openEventDetail}
                onToggleSaved={handleToggleSavedWithToast}
                onSaved={showSaveToast}
                onAddToOnePager={handleAddToOnePager}
              />
            ))}
            </View>
          )}
        </View>
      </>
      ) : null}

      {mainTab === 'myEvents' && (
        <>
          {eventsNeedingFeedback[0] ? (
            <EventFeedbackPrompt
              snapshot={eventsNeedingFeedback[0]}
              colors={{
                text: mainText,
                textSecondary: subtleText,
                card: cardBg,
                border: cardBorder,
                primary: palette.primary,
                primaryLight: palette.primaryLight,
              }}
              onRate={recordEventFeedback}
              onDismiss={dismissEventFeedback}
            />
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.myEventsIntro, { color: subtleText }]}>
              Events you added to One Pager — your plans, reminders, and calendar live here.
            </Text>
          </View>

          {weekTimelineGroups.length > 0 ? (
            <SavedEventsWeekTimeline
              groups={weekTimelineGroups}
              palette={palette}
              onPressEvent={openEventDetail}
            />
          ) : null}

          {nextCombinedDay ? (
            <CombinedNightOutPrompt
              dayLabel={nextCombinedDay.dayLabel}
              events={nextCombinedDay.events}
              palette={palette}
              areaLabel={areaLabel ?? undefined}
              expanded={expandedCombinedDayKey === nextCombinedDay.dayKey}
              onToggle={() =>
                setExpandedCombinedDayKey((current) =>
                  current === nextCombinedDay.dayKey ? null : nextCombinedDay.dayKey,
                )
              }
              onDismiss={() =>
                setDismissedCombinedDayKeys((prev) => new Set([...prev, nextCombinedDay.dayKey]))
              }
            />
          ) : null}

          {savedEvents.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Heart size={32} color={palette.primary} />
              <Text style={[styles.emptyTitle, { color: mainText }]}>No saved events yet</Text>
              <Text style={[styles.emptyText, { color: subtleText }]}>
                Discover something you like and tap Add to One Pager to build your week.
              </Text>
              <TouchableOpacity
                style={[styles.discoverCta, { backgroundColor: accentColor }]}
                onPress={() => setMainTab('discover')}
              >
                <Text style={[styles.discoverCtaText, { color: inverseText }]}>Discover events</Text>
              </TouchableOpacity>
            </View>
          ) : (
            savedEvents.map((event) => (
              <PremiumSavedEventCard
                key={event.id}
                event={event}
                palette={palette}
                areaLabel={areaLabel ?? undefined}
                socialSummary={savedEventsSocial.getSummary(event.id)}
                canRsvp={savedEventsSocial.available}
                rsvpLoading={!!rsvpPendingByEventId[event.id]}
                pendingRsvpStatus={rsvpPendingByEventId[event.id] ?? null}
                onPress={openEventDetail}
                onAddToOnePager={handleAddToOnePager}
                onRemind={handleRemind}
                onAddToCalendar={handleAddToCalendar}
                onDirections={handleOpenDirections}
                onRsvp={savedEventsSocial.available ? handleSavedEventRsvp : undefined}
                onInviteFriends={canInvite ? handleInviteSavedEvent : undefined}
              />
            ))
          )}
        </>
      )}
      </KeyboardAwareScrollView>

      <EventsSaveToast
        message={toastMessage}
        palette={palette}
        bottomInset={110 + insets.bottom}
        onDismiss={dismissToast}
      />

      <EventWhyThisSheet
        visible={!!whyThisEvent}
        event={whyThisEvent}
        reasons={whyThisReasons}
        explanation={whyThisExplanation}
        palette={palette}
        onClose={() => setWhyThisEvent(null)}
      />

      {inviteEvent ? (
        <EventInviteFriendsModal
          visible={!!inviteEvent}
          onClose={closeInvite}
          palette={palette}
          eventTitle={inviteEvent.title}
          eventDateLabel={inviteEvent.date}
          eventTimeLabel={inviteEvent.time}
          venueName={inviteEvent.venue}
          eventId={inviteEvent.id}
          inviterUsername={inviterUsername}
          planToken={planInviteToken}
          friends={inviteFriendsList}
          onInviteFriend={handleInviteFriend}
        />
      ) : null}
    </View>
  );
}

export default function EventsScreen() {
  return (
    <ErrorBoundary>
      <EventsScreenInner />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainerInScroll: {
    height: 520,
    marginBottom: 16,
    position: 'relative',
  },
  mapSheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  searchAreaBtn: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  searchAreaText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  railHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  railHeaderFirst: {
    marginTop: 4,
  },
  railTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  railCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  liveBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  liveBannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  mainTabRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  mainTabRowCompact: {
    marginTop: 8,
  },
  mainTabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  mainTabPillCompact: {
    paddingVertical: 8,
    borderRadius: 10,
  },
  mainTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  myEventsIntro: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  discoverCta: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  discoverCtaText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerCompact: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFab: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  posterFeedScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerEmoji: {
    fontSize: 36,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    gap: 5,
  },
  viewToggleLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  scrollContent: {
    paddingTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  resultCount: {
    fontSize: 13,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  upcomingEmoji: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingEmojiText: {
    fontSize: 22,
  },
  upcomingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  upcomingTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  upcomingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  upcomingVenue: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  upcomingRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  daysBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  daysText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  upcomingTime: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  featuredScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  featuredCard: {
    width: SCREEN_WIDTH * 0.75,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  featuredBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  hotText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  featuredHeart: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  featuredVenue: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredDate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  featuredPriceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredPrice: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  eventCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  eventRow: {
    flexDirection: 'row',
    padding: 12,
  },
  eventImageWrapper: {
    position: 'relative',
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },
  eventHotDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  eventTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    flex: 1,
    marginRight: 8,
  },
  eventVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  eventVenue: {
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  eventPriceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  eventPriceText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  expandedContent: {
    borderTopWidth: 1,
    padding: 14,
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  expandedDetails: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  getTicketsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  getTicketsText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  emptyState: {
    marginHorizontal: 20,
    padding: 40,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 4,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  tipEmoji: {
    fontSize: 28,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapCategoryBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingVertical: 8,
  },
  mapCategoriesScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  mapCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  mapCategoryEmoji: {
    fontSize: 14,
  },
  mapCategoryLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  mapEventCount: {
    position: 'absolute',
    top: 52,
    alignSelf: 'center',
    zIndex: 10,
  },
  mapCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  mapCountText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  mapBottomCard: {
    position: 'absolute',
    bottom: 110,
    left: 16,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  mapCardInner: {
    flexDirection: 'row',
    padding: 12,
  },
  mapCardImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  mapCardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mapCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    flex: 1,
    marginRight: 8,
  },
  mapCardVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  mapCardVenue: {
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  mapCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  mapCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  mapCardMetaText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  mapCardPriceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mapCardPriceText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  mapCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  mapCardActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  mapBottomHint: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  mapHintText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  webMapFallbackContent: {
    padding: 16,
    gap: 10,
  },
  webMapEventCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  webMapPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  webMapEventInfo: {
    flex: 1,
    gap: 2,
  },
  webMapEventTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  webMapEventVenue: {
    fontSize: 13,
  },
  webMapEventPrice: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  // Smart discovery (Events tab)
  smartDiscoveryWrap: {
    paddingHorizontal: 20,
    marginTop: 2,
    marginBottom: 6,
    gap: 0,
  },
  smartDiscoveryTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  smartDiscoveryTab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    height: 44,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartDiscoveryTabText: {
    fontSize: 11,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  discoveryRailScroll: {
    gap: 12,
    paddingRight: 4,
  },
  sectionRailScroll: {
    gap: 12,
    paddingHorizontal: 20,
  },
  feedList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  smartDiscoveryEmpty: {
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  discoveryCard: {
    width: SCREEN_WIDTH * 0.78,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  discoveryCardImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  discoveryCardInfo: {
    padding: 12,
  },
  discoveryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  discoveryCardTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    flex: 1,
  },
  discoveryMeta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  discoveryBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  discoveryDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discoveryDistanceText: {
    fontSize: 12,
    fontWeight: '700' as const,
    flexShrink: 1,
  },
  discoveryPriceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discoveryPriceText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },

  saveInterestedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  saveInterestedText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },

  expandedQuickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },

  // Saved events section (Events tab)
  savedEventRow: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  savedEventThumb: {
    width: 54,
    height: 54,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  savedEventInfo: {
    flex: 1,
    minWidth: 0,
  },
  savedEventTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
  },
  savedEventMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  savedEventCountdown: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800' as const,
  },
  savedEventActions: {
    gap: 8,
    alignItems: 'flex-end',
  },
  savedQuickBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savedQuickBtnText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
});
