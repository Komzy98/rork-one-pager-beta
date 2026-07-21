import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Navigation,
  Share2,
  Sparkles,
  UserPlus,
  Target,
  Ticket,
  TrendingUp,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useEventKit } from '@/hooks/useEventKit';
import { useNearbyEvents } from '@/hooks/useNearbyEvents';
import { useSocialActivity } from '@/hooks/useSocialActivity';
import { getCatalogEvent, listCatalogEvents } from '@/utils/eventCatalog';
import { savedSnapshotToOnePager, onePagerToLocalEvent, localEventToOnePager } from '@/utils/eventMappers';
import { useEventById } from '@/hooks/useEventById';
import { formatDistanceKm, getEventCountdownLabel } from '@/utils/eventDiscovery';
import { buildNightOutPlan, mergeGroupMeetStep, defaultGroupMeetTime } from '@/utils/eventNightOutPlanner';
import { useEventSocial } from '@/hooks/useEventSocial';
import { useFriends } from '@/hooks/useFriends';
import { EventPlanRsvp } from '@/components/events/EventPlanRsvp';
import { EventInviteFriendsModal } from '@/components/events/EventInviteFriendsModal';
import { WhoIsGoing } from '@/components/events/WhoIsGoing';
import {
  explainEventPersonalization,
  getSimilarEvents,
} from '@/utils/eventPersonalization';
import {
  getEventCalendarRange,
  openEventDirections,
  openEventInWaze,
  openEventTickets,
} from '@/utils/openEventActions';
import { useTheme } from '@/hooks/useTheme';
import { eventsFixedPalette } from '@/utils/eventsPalette';
import { getEventCategoryMeta } from '@/utils/eventCategoryMeta';
import { EventNightOutPlanner } from '@/components/events/EventNightOutPlanner';
import { WazeLogoMark, WAZE_BRAND_CYAN } from '@/components/WazeLogoMark';
import { PremiumEventPosterCard, POSTER_HORIZONTAL_CARD_MIN_HEIGHT } from '@/components/events/PremiumEventPosterCard';
import { buildEventLink } from '@/utils/deepLinks';
import { pickEventPosterUrl } from '@/utils/eventPosterImage';
import type { OnePagerEvent } from '@/types/events';
import type { PlanRsvpStatus } from '@/utils/sharedPlansService';
import type { SocialProfile } from '@/utils/friendsService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.6);

/** Fixed bottom bar: padding + icon + label + safe area — keep scroll content above it. */
function eventDetailScrollPadding(bottomInset: number): number {
  return bottomInset + 10 + 46 + 6 + 14 + 10 + 48;
}

export default function EventDetailScreen() {
  const { id, ptoken } = useLocalSearchParams<{ id: string; ptoken?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { isDark } = useTheme();
  const palette = useMemo(() => eventsFixedPalette(isDark, 'discover'), [isDark]);
  const { profile } = useUserProfile();
  const { isSaved, addToOnePager, removeFromOnePager, getSnapshotById, toggleSaved } = useSavedEvents();
  const { createEvent, hasPermission, requestPermissions } = useEventKit();
  const { logEventPlanned } = useSocialActivity();

  const cachedEvent: OnePagerEvent | null = useMemo(() => {
    if (!id) return null;
    const snapshot = getSnapshotById(id);
    if (snapshot) return savedSnapshotToOnePager(snapshot);
    return getCatalogEvent(id) ?? null;
  }, [getSnapshotById, id]);

  const needsRemoteFetch = !!id && !cachedEvent;
  const remoteEvent = useEventById(id, needsRemoteFetch);

  const event: OnePagerEvent | null = useMemo(() => {
    if (cachedEvent) return cachedEvent;
    if (remoteEvent.event) return localEventToOnePager(remoteEvent.event);
    return null;
  }, [cachedEvent, remoteEvent.event]);

  const localEvent = useMemo(
    () => (event ? onePagerToLocalEvent({ ...event, isSaved: id ? isSaved(id) : false }) : null),
    [event, id, isSaved]
  );

  const eventSocial = useEventSocial(localEvent, { planInviteToken: ptoken });
  const { friends, nudge: nudgeFriend, available: friendsAvailable } = useFriends();
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [rsvpPending, setRsvpPending] = useState<PlanRsvpStatus | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const saved = id ? isSaved(id) : false;

  const catalogPool = useMemo(() => listCatalogEvents(), [id, event?.id]);
  const { events: nearbyPool } = useNearbyEvents({
    category: localEvent?.category ?? 'all',
    enabled: !!localEvent,
  });

  const similarEvents = useMemo(() => {
    if (!localEvent) return [];
    const catalogAsLocal = catalogPool.map((e) =>
      onePagerToLocalEvent({ ...e, isSaved: isSaved(e.id) }),
    );
    const mergedPool = [
      ...catalogAsLocal,
      ...nearbyPool
        .filter((e) => !catalogAsLocal.some((c) => c.id === e.id))
        .map((e) => ({ ...e, isSaved: isSaved(e.id) })),
    ];
    const posterById = new Map<string, string>();
    for (const e of mergedPool) {
      const url = e.image?.trim();
      if (url) posterById.set(e.id, url);
    }

    return getSimilarEvents(localEvent, mergedPool, profile, 8).map((similar) => ({
      ...similar,
      image: pickEventPosterUrl(similar.image, posterById.get(similar.id), getCatalogEvent(similar.id)?.imageUrl),
    }));
  }, [localEvent, profile, isSaved, catalogPool, nearbyPool]);

  const whyForYou = useMemo(() => {
    if (!localEvent) return null;
    const personalized = explainEventPersonalization(localEvent, profile);
    if (personalized) return personalized;
    if (event?.distanceKm != null && event.distanceKm < 10) {
      return 'Happening near you this week';
    }
    if (event?.isHot) return 'Trending in your area right now';
    if (event?.isFeatured) return 'Featured pick in your city';
    return 'Worth a spot on your One Pager';
  }, [localEvent, profile, event?.distanceKm, event?.isHot, event?.isFeatured]);

  const nightOutSteps = useMemo(() => {
    if (!localEvent) return [];
    const base = buildNightOutPlan(localEvent, localEvent.location);
    const goingNames = [
      ...eventSocial.goingRsvps.map(
        (r) => r.profile?.displayName ?? (r.profile?.username ? `@${r.profile.username}` : 'Partner')
      ),
      ...eventSocial.friendsSaved.map(
        (f) => f.profile?.displayName ?? (f.profile?.username ? `@${f.profile.username}` : 'Partner')
      ),
    ].filter((name, index, arr) => arr.indexOf(name) === index);

    const meetAt = eventSocial.plan?.meetAt
      ? new Date(eventSocial.plan.meetAt)
      : goingNames.length >= 2
        ? defaultGroupMeetTime(localEvent)
        : null;

    return mergeGroupMeetStep(base, {
      meetAt,
      venue: localEvent.venue,
      goingNames,
    });
  }, [localEvent, eventSocial.goingRsvps, eventSocial.friendsSaved, eventSocial.plan?.meetAt]);

  const categoryMeta = localEvent ? getEventCategoryMeta(localEvent.category) : null;
  const CategoryIcon = categoryMeta?.icon;

  const handleAddToOnePager = useCallback(async () => {
    if (!event || !localEvent) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (saved) {
      await removeFromOnePager(event.id);
      return;
    }
    await addToOnePager(localEvent);
    Alert.alert('Added to One Pager', `${event.title} is now in My Events with your night-out plan.`);
  }, [addToOnePager, event, localEvent, removeFromOnePager, saved]);

  const handleCalendar = useCallback(async () => {
    if (!event || !localEvent) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const range = getEventCalendarRange(localEvent);
    if (!range) {
      Alert.alert('Calendar', 'Could not parse this event’s date.');
      return;
    }
    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('Calendar', 'Allow calendar access to save this event.');
        return;
      }
    }
    const eventId = await createEvent({
      title: event.title,
      startDate: range.start,
      endDate: range.end,
      location: `${event.venueName}${event.city ? `, ${event.city}` : ''}`,
      notes: event.ticketUrl ? `Tickets: ${event.ticketUrl}` : event.description,
    });
    if (eventId) {
      Alert.alert('Added to calendar', event.title);
      void logEventPlanned(localEvent);
    }
  }, [createEvent, event, hasPermission, localEvent, requestPermissions, logEventPlanned]);

  const handleRsvp = useCallback(
    async (status: PlanRsvpStatus) => {
      setRsvpBusy(true);
      setRsvpPending(status);
      try {
        await eventSocial.setRsvp(status);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Alert.alert(
          'Could not save RSVP',
          error instanceof Error
            ? error.message
            : (error as { message?: string })?.message || 'Please try again in a moment.',
        );
      } finally {
        setRsvpBusy(false);
        setRsvpPending(null);
      }
    },
    [eventSocial]
  );

  const handleInviteFriend = useCallback(
    async (friend: SocialProfile, message: string) => {
      if (friendsAvailable !== true) {
        await Share.share({ message });
        return;
      }
      await nudgeFriend(friend.id, message);
      await eventSocial.ensurePlan();
    },
    [friendsAvailable, nudgeFriend, eventSocial]
  );

  const openInviteModal = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowInviteModal(true);
  }, []);

  const handleInviteToNight = useCallback(async () => {
    openInviteModal();
  }, [openInviteModal]);

  const handleShare = useCallback(async () => {
    if (!event) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const link = buildEventLink(event.id, { from: profile?.username });
    const text = [
      event.title,
      `${event.dateLabel ?? ''} ${event.timeLabel ?? ''}`.trim(),
      `${event.venueName}${event.city ? `, ${event.city}` : ''}`,
    ]
      .filter(Boolean)
      .join('\n');
    await Share.share(
      Platform.OS === 'ios'
        ? { message: text, url: link }
        : { message: `${text}\n${link}` },
    );
  }, [event, profile?.username]);

  const handleTickets = useCallback(() => {
    if (!localEvent) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void openEventTickets(localEvent);
  }, [localEvent]);

  const handleDirections = useCallback(() => {
    if (!localEvent) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void openEventDirections(localEvent);
  }, [localEvent]);

  const handleWaze = useCallback(() => {
    if (!localEvent) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void openEventInWaze(localEvent);
  }, [localEvent]);

  const openSimilar = useCallback(
    (eventId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/(root)/event/${eventId}`);
    },
    [router]
  );

  const heroScale = scrollY.interpolate({
    inputRange: [-80, 0, HERO_HEIGHT],
    outputRange: [1.12, 1, 1.06],
    extrapolate: 'clamp',
  });

  const toolbarOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT * 0.35],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if ((!event || !localEvent) && needsRemoteFetch && remoteEvent.isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ color: palette.textSecondary, fontSize: 15, marginTop: 16 }}>Loading event…</Text>
      </View>
    );
  }

  if (!event || !localEvent) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: palette.text, fontSize: 16, marginBottom: 16 }}>Event not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backPill, { backgroundColor: palette.primary }]}
        >
          <Text style={styles.backPillText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const distanceText = event.distanceKm != null ? formatDistanceKm(event.distanceKm) : null;
  const countdown = getEventCountdownLabel(localEvent);
  const hasCoords = event.latitude != null && event.longitude != null;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View
        pointerEvents="box-none"
        style={[styles.toolbar, { paddingTop: insets.top + 6, opacity: toolbarOpacity }]}
      >
        {Platform.OS !== 'web' ? (
          <BlurView intensity={72} tint={palette.blurTint} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.chromeFallback }]} />
        )}
        <LinearGradient
          colors={[...palette.toolbarGradient]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Text style={[styles.toolbarTitle, { color: palette.toolbarTitle }]} numberOfLines={1}>
          {event.title}
        </Text>
      </Animated.View>

      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        activeOpacity={0.85}
        accessibilityLabel="Go back"
      >
        {Platform.OS !== 'web' ? (
          <BlurView intensity={48} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20 }]} />
        )}
        <ArrowLeft size={20} color={palette.textOnImage} />
      </TouchableOpacity>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: eventDetailScrollPadding(insets.bottom) }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        <View style={styles.heroWrap}>
          <Animated.View style={[styles.heroImageWrap, { transform: [{ scale: heroScale }] }]}>
            {event.imageUrl ? (
              <Image source={{ uri: event.imageUrl }} style={styles.heroImage} />
            ) : (
              <LinearGradient
                colors={[...palette.heroGradient]}
                style={styles.heroImage}
              />
            )}
          </Animated.View>

          <LinearGradient colors={[...palette.heroScrim]} style={styles.heroScrim} />
          <LinearGradient
            colors={['rgba(232,67,147,0.28)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroWash}
          />

          <View style={styles.heroContent}>
            <View style={styles.heroBadges}>
              {CategoryIcon && categoryMeta ? (
                <View style={[styles.categoryBadge, { backgroundColor: `${categoryMeta.color}22` }]}>
                  <CategoryIcon size={12} color={categoryMeta.color} />
                  <Text style={[styles.categoryBadgeText, { color: categoryMeta.color }]}>
                    {String(event.category).replace(/_/g, ' ')}
                  </Text>
                </View>
              ) : null}
              {event.isHot ? (
                <View style={[styles.hotBadge, { backgroundColor: palette.errorLight }]}>
                  <TrendingUp size={11} color={palette.error} />
                  <Text style={[styles.hotBadgeText, { color: palette.error }]}>Hot</Text>
                </View>
              ) : null}
              <View style={[styles.countdownBadge, { backgroundColor: palette.primaryLight }]}>
                <Text style={[styles.countdownText, { color: palette.primary }]}>{countdown}</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{event.title}</Text>

            <View style={styles.heroMetaRow}>
              <Calendar size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>
                {event.dateLabel} · {event.timeLabel}
              </Text>
            </View>

            {event.priceLabel ? (
              <Text style={[styles.heroPrice, { color: palette.primary }]}>{event.priceLabel}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          {whyForYou ? (
            <View style={[styles.whyCard, { backgroundColor: palette.surfaceLight, borderColor: palette.border }]}>
              <View style={[styles.whyIcon, { backgroundColor: palette.primaryLight }]}>
                <Target size={16} color={palette.primary} />
              </View>
              <View style={styles.whyCopy}>
                <Text style={[styles.whyText, { color: palette.text }]}>{whyForYou}</Text>
              </View>
            </View>
          ) : null}

          {eventSocial.available ? (
            <WhoIsGoing
              palette={palette}
              rsvpsGoing={eventSocial.goingRsvps}
              guestRsvps={[...eventSocial.guestGoing, ...eventSocial.guestMaybe]}
              friendsSaved={eventSocial.friendsSaved}
            />
          ) : null}
          <EventPlanRsvp
            palette={palette}
            myStatus={eventSocial.myRsvpStatus}
            goingCount={eventSocial.goingCount}
            maybeCount={eventSocial.maybeCount}
            loading={rsvpBusy}
            pendingStatus={rsvpPending}
            onSelect={handleRsvp}
            onInviteFriends={openInviteModal}
          />

          {nightOutSteps.length > 0 ? (
            <View style={styles.plannerSection}>
              <View style={styles.plannerHeader}>
                <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>
                  Plan your night out
                </Text>
                <TouchableOpacity
                  style={[styles.inviteBtn, { borderColor: palette.border, backgroundColor: palette.surfaceLight }]}
                  onPress={() => void handleInviteToNight()}
                  activeOpacity={0.85}
                >
                  <UserPlus size={14} color={palette.primary} />
                  <Text style={[styles.inviteBtnText, { color: palette.primary }]}>Invite</Text>
                </TouchableOpacity>
              </View>
              <EventNightOutPlanner steps={nightOutSteps} palette={palette} />
            </View>
          ) : null}

          <View style={[styles.venueBlock, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.venueHeader}>
              <View style={styles.venueCopy}>
                <Text style={[styles.venueName, { color: palette.text }]}>{event.venueName}</Text>
                {event.city ? (
                  <Text style={[styles.venueCity, { color: palette.textSecondary }]}>{event.city}</Text>
                ) : null}
                {distanceText ? (
                  <View style={styles.distanceRow}>
                    <MapPin size={12} color={palette.primary} />
                    <Text style={[styles.distanceText, { color: palette.textSecondary }]}>
                      {distanceText} away
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.venueNavRow}>
              <TouchableOpacity
                style={[styles.mapsBtn, styles.venueNavBtn, { backgroundColor: palette.primary }]}
                onPress={handleDirections}
                activeOpacity={0.85}
              >
                <Navigation size={14} color={palette.textInverse} />
                <Text style={[styles.mapsBtnText, { color: palette.textInverse }]}>Open in Maps</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.mapsBtn,
                  styles.venueNavBtn,
                  styles.wazeBtn,
                  { backgroundColor: WAZE_BRAND_CYAN, borderColor: 'rgba(0, 0, 0, 0.08)' },
                ]}
                onPress={handleWaze}
                activeOpacity={0.85}
              >
                <WazeLogoMark layoutSize={14} />
                <Text style={[styles.mapsBtnText, styles.wazeBtnText, { color: '#FFFFFF' }]}>
                  Add to Waze
                </Text>
              </TouchableOpacity>
            </View>

            {hasCoords ? (
              <TouchableOpacity
                style={[styles.mapPreview, { borderColor: palette.border }]}
                onPress={handleDirections}
                activeOpacity={0.92}
              >
                <MapView
                  style={styles.map}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  pointerEvents="none"
                  initialRegion={{
                    latitude: event.latitude!,
                    longitude: event.longitude!,
                    latitudeDelta: 0.018,
                    longitudeDelta: 0.018,
                  }}
                >
                  <Marker
                    coordinate={{ latitude: event.latitude!, longitude: event.longitude! }}
                    pinColor={palette.primary}
                  />
                </MapView>
                <LinearGradient
                  colors={['transparent', 'rgba(7,6,11,0.35)']}
                  style={styles.mapOverlay}
                  pointerEvents="none"
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {event.description ? (
            <View style={styles.aboutSection}>
              <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>About</Text>
              <Text style={[styles.description, { color: palette.text }]}>{event.description}</Text>
            </View>
          ) : null}

          {similarEvents.length > 0 ? (
            <View style={styles.similarSection}>
              <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Similar events</Text>
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                style={[styles.similarCarousel, { minHeight: POSTER_HORIZONTAL_CARD_MIN_HEIGHT }]}
                contentContainerStyle={styles.similarScroll}
              >
                {similarEvents.map((similar) => (
                  <PremiumEventPosterCard
                    key={similar.id}
                    event={similar}
                    palette={palette}
                    variant="horizontal"
                    onPress={openSimilar}
                    onToggleSaved={async (e) => {
                      await toggleSaved(e);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>

      <View
        style={[
          styles.actionBar,
          {
            paddingBottom: insets.bottom + 10,
            backgroundColor: palette.background,
            borderTopColor: palette.border,
          },
        ]}
      >
        {Platform.OS !== 'web' ? (
          <BlurView intensity={40} tint={palette.blurTint} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionItem} onPress={() => void handleAddToOnePager()} activeOpacity={0.85}>
            <View
              style={[
                styles.actionIcon,
                {
                  backgroundColor: saved ? palette.primaryLight : palette.primary,
                  borderColor: saved ? palette.primary : 'transparent',
                  borderWidth: saved ? 1 : 0,
                },
              ]}
            >
              <Sparkles size={18} color={saved ? palette.primary : palette.textInverse} />
            </View>
            <Text style={[styles.actionLabel, { color: saved ? palette.primary : palette.text }]}>
              {saved ? 'Saved' : 'One Pager'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => void handleCalendar()} activeOpacity={0.85}>
            <View style={[styles.actionIcon, { backgroundColor: palette.surfaceLight, borderColor: palette.border, borderWidth: 1 }]}>
              <Calendar size={18} color={palette.textSecondary} />
            </View>
            <Text style={[styles.actionLabel, { color: palette.textSecondary }]}>Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => void handleShare()} activeOpacity={0.85}>
            <View style={[styles.actionIcon, { backgroundColor: palette.surfaceLight, borderColor: palette.border, borderWidth: 1 }]}>
              <Share2 size={18} color={palette.textSecondary} />
            </View>
            <Text style={[styles.actionLabel, { color: palette.textSecondary }]}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleTickets} activeOpacity={0.85}>
            <View style={[styles.actionIcon, { backgroundColor: palette.primary }]}>
              <Ticket size={18} color={palette.textInverse} />
            </View>
            <Text style={[styles.actionLabel, { color: palette.text }]}>Tickets</Text>
          </TouchableOpacity>
        </View>
      </View>

      <EventInviteFriendsModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        palette={palette}
        eventTitle={event.title}
        eventDateLabel={event.dateLabel}
        eventTimeLabel={event.timeLabel}
        venueName={event.venueName}
        eventId={event.id}
        inviterUsername={profile?.username}
        planToken={eventSocial.plan?.inviteToken}
        friends={friends}
        onInviteFriend={handleInviteFriend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 56,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  toolbarTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    overflow: 'hidden',
  },
  heroWrap: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  heroWash: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    gap: 10,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  hotBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countdownBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  heroPrice: {
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
  },
  whyCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  whyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyCopy: {
    flex: 1,
    gap: 4,
  },
  whyLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  whyText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  plannerSection: {
    gap: 8,
  },
  plannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  venueBlock: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  venueNavRow: {
    flexDirection: 'row',
    gap: 8,
  },
  venueNavBtn: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 34,
    maxHeight: 34,
    paddingVertical: 0,
  },
  wazeBtn: {
    borderWidth: 1,
  },
  wazeBtnText: {
    fontSize: 11,
  },
  venueCopy: {
    flex: 1,
    gap: 4,
  },
  venueName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  venueCity: {
    fontSize: 14,
    fontWeight: '500',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  mapsBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapPreview: {
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  aboutSection: {
    gap: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
  similarSection: {
    gap: 12,
    paddingBottom: 4,
  },
  similarCarousel: {
    flexGrow: 0,
    marginHorizontal: -20,
  },
  similarScroll: {
    paddingHorizontal: 20,
    paddingRight: 28,
    gap: 12,
    alignItems: 'flex-start',
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    overflow: 'hidden',
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
  },
  actionItem: {
    alignItems: 'center',
    gap: 6,
    minWidth: 72,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  backPill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  backPillText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
