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
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Heart,
  Ticket,
  X,
  ChevronRight,
  Users,
  Star,
  TrendingUp,
  Map,
  List,
  Navigation,
  Music,
  Trophy,
  Smile,
  Wine,
  Palette,
  Monitor,
  Moon,
  Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useUserProfile } from '@/hooks/useUserProfile';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'list' | 'map';
type DiscoveryTab = 'now' | 'near' | 'forYou';

interface Event {
  id: string;
  title: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  category: string;
  price: string;
  image: string;
  isSaved: boolean;
  attendees: number;
  rating: number;
  tags: string[];
  description: string;
  isFeatured?: boolean;
  isHot?: boolean;
  latitude: number;
  longitude: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  category: string;
  daysUntil: number;
  ticketType: string;
}

const CATEGORY_ICON_MAP: Record<string, { icon: React.ComponentType<{ size?: number; color?: string }>; color: string }> = {
  'all': { icon: Sparkles, color: '#E84393' },
  'music': { icon: Music, color: '#6C5CE7' },
  'sports': { icon: Trophy, color: '#00B894' },
  'comedy': { icon: Smile, color: '#FDCB6E' },
  'theatre': { icon: Star, color: '#E17055' },
  'food': { icon: Wine, color: '#D63031' },
  'arts': { icon: Palette, color: '#A29BFE' },
  'tech': { icon: Monitor, color: '#0984E3' },
  'nightlife': { icon: Moon, color: '#636E72' },
};


const EVENT_CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🎉' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'comedy', label: 'Comedy', category: 'comedy' },
  { id: 'theatre', label: 'Theatre', category: 'theatre' },
  { id: 'food', label: 'Food & Drink', emoji: '🍷' },
  { id: 'arts', label: 'Arts', emoji: '🎨' },
  { id: 'tech', label: 'Tech', emoji: '💻' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🌙' },
];

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Arctic Monkeys Live',
    venue: 'The O2 Arena',
    location: 'London',
    date: 'Sat, 12 Apr',
    time: '19:30',
    category: 'music',
    price: '£65',
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600',
    isSaved: true,
    attendees: 18500,
    rating: 4.9,
    tags: ['rock', 'live', 'arena'],
    description: 'The Sheffield legends return for a massive headline show.',
    isFeatured: true,
    latitude: 51.5030,
    longitude: 0.0032,
  },
  {
    id: '2',
    title: 'Borough Market Food Festival',
    venue: 'Borough Market',
    location: 'London',
    date: 'Sun, 13 Apr',
    time: '10:00',
    category: 'food',
    price: 'Free',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
    isSaved: false,
    attendees: 3200,
    rating: 4.7,
    tags: ['food', 'outdoor', 'family'],
    description: 'A celebration of artisan food and drink from around the world.',
    isHot: true,
    latitude: 51.5055,
    longitude: -0.0910,
  },
  {
    id: '3',
    title: 'Michael McIntyre: Showtime',
    venue: 'Royal Albert Hall',
    location: 'London',
    date: 'Fri, 18 Apr',
    time: '20:00',
    category: 'comedy',
    price: '£45',
    image: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600',
    isSaved: true,
    attendees: 5200,
    rating: 4.8,
    tags: ['stand-up', 'comedy', 'live'],
    description: 'Britain\'s favourite comedian returns with his brand new tour.',
    latitude: 51.5009,
    longitude: -0.1774,
  },
  {
    id: '4',
    title: 'Immersive Van Gogh',
    venue: 'Frameless Gallery',
    location: 'London',
    date: 'Ongoing',
    time: '10:00 - 20:00',
    category: 'arts',
    price: '£25',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600',
    isSaved: false,
    attendees: 1800,
    rating: 4.6,
    tags: ['art', 'immersive', 'exhibition'],
    description: 'Step inside Van Gogh\'s most iconic masterpieces.',
    isFeatured: true,
    latitude: 51.5178,
    longitude: -0.1472,
  },
  {
    id: '5',
    title: 'Warehouse Project: Disclosure',
    venue: 'Depot Mayfield',
    location: 'Manchester',
    date: 'Sat, 26 Apr',
    time: '22:00',
    category: 'nightlife',
    price: '£38',
    image: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600',
    isSaved: false,
    attendees: 4500,
    rating: 4.8,
    tags: ['electronic', 'club', 'DJ'],
    description: 'Disclosure bring their signature house sound to the warehouse.',
    isHot: true,
    latitude: 53.4737,
    longitude: -2.2326,
  },
  {
    id: '6',
    title: 'Hamilton: The Musical',
    venue: 'Victoria Palace Theatre',
    location: 'London',
    date: 'Wed, 23 Apr',
    time: '19:30',
    category: 'theatre',
    price: '£55',
    image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600',
    isSaved: true,
    attendees: 1100,
    rating: 4.9,
    tags: ['musical', 'west-end', 'theatre'],
    description: 'The revolutionary musical that changed theatre forever.',
    latitude: 51.4965,
    longitude: -0.1437,
  },
  {
    id: '7',
    title: 'Tech Connect Summit 2026',
    venue: 'ExCeL London',
    location: 'London',
    date: 'Thu, 1 May',
    time: '09:00',
    category: 'tech',
    price: '£120',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600',
    isSaved: false,
    attendees: 8000,
    rating: 4.5,
    tags: ['conference', 'networking', 'AI'],
    description: 'The UK\'s biggest tech conference with 200+ speakers.',
    latitude: 51.5085,
    longitude: 0.0299,
  },
  {
    id: '8',
    title: 'Crystal Palace vs Arsenal',
    venue: 'Selhurst Park',
    location: 'London',
    date: 'Sat, 19 Apr',
    time: '15:00',
    category: 'sports',
    price: '£42',
    image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600',
    isSaved: false,
    attendees: 25000,
    rating: 4.7,
    tags: ['football', 'premier-league', 'live'],
    description: 'Premier League action at Selhurst Park.',
    latitude: 51.3983,
    longitude: -0.0855,
  },
];

const MY_UPCOMING: UpcomingEvent[] = [
  { id: '1', title: 'Arctic Monkeys Live', date: '12 Apr', time: '19:30', venue: 'The O2 Arena', category: 'music', daysUntil: 3, ticketType: 'Standing' },
  { id: '2', title: 'Michael McIntyre', date: '18 Apr', time: '20:00', venue: 'Royal Albert Hall', category: 'comedy', daysUntil: 9, ticketType: 'Stalls Row F' },
  { id: '3', title: 'Hamilton', date: '23 Apr', time: '19:30', venue: 'Victoria Palace', category: 'theatre', daysUntil: 14, ticketType: 'Circle Seat' },
];

const QUICK_STATS = [
  { label: 'Events Saved', value: '12', emoji: '🎟️' },
  { label: 'Attended', value: '8', emoji: '✅' },
  { label: 'This Month', value: '3', emoji: '📅' },
];

const USER_LOCATION = { latitude: 51.5074, longitude: -0.1278 }; // Mock "near you" (London) for MVP UI
const toRadians = (deg: number) => (deg * Math.PI) / 180;
const haversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const parseEventStartDateTime = (event: Event): Date | null => {
  if (!event.date || !event.time) return null;
  const dateStr = event.date.trim();
  if (dateStr.toLowerCase().includes('ongoing')) return null;

  // e.g. "Sat, 12 Apr" / "Fri, 18 Apr" + add current year
  const year = new Date().getFullYear();
  const base = new Date(`${dateStr} ${year}`);
  if (Number.isNaN(base.getTime())) return null;

  const timeStart = event.time.split('-')[0]?.trim();
  if (!timeStart) return base;
  const parts = timeStart.split(':');
  if (parts.length >= 2) {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      base.setHours(hours, minutes, 0, 0);
    }
  }

  return base;
};

const getDaysUntilEvent = (event: Event): number | null => {
  const start = parseEventStartDateTime(event);
  if (!start) return null;
  const diffMs = start.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const getCountdownLabel = (event: Event): string => {
  const days = getDaysUntilEvent(event);
  if (days === null) return 'Soon';
  if (days <= 0) return 'Starting soon';
  if (days === 1) return 'Tomorrow';
  if (days === 2) return '2 days to go';
  return `${days} days to go`;
};

const formatDistanceKm = (km: number): string => {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

export default function EventsScreen() {
  const { isDark } = useTheme();
  const { profile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMapEvent, setSelectedMapEvent] = useState<string | null>(null);
  const [discoveryTab, setDiscoveryTab] = useState<DiscoveryTab>('now');
  const mapRef = useRef<MapView>(null);
  const viewToggleAnim = useRef(new Animated.Value(0)).current;

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0)).current;
  const featuredScrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerScale, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [headerScale]);

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
  }, []);

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.tags.some(t => t.includes(q))
      );
    }
    return filtered;
  }, [events, selectedCategory, searchQuery]);

  const mapRegion = useMemo(() => {
    const evts = filteredEvents.length > 0 ? filteredEvents : events;
    if (evts.length === 0) return { latitude: 51.5074, longitude: -0.1278, latitudeDelta: 0.3, longitudeDelta: 0.3 };
    const lats = evts.map(e => e.latitude);
    const lngs = evts.map(e => e.longitude);
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
  }, [filteredEvents, events]);

  const selectedMapEventData = useMemo(() => {
    if (!selectedMapEvent) return null;
    return events.find(e => e.id === selectedMapEvent) ?? null;
  }, [selectedMapEvent, events]);

  const featuredEvents = useMemo(() => events.filter(e => e.isFeatured), [events]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const toggleSaved = useCallback((eventId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, isSaved: !e.isSaved } : e
    ));
  }, []);

  const accentColor = '#E84393';
  const accentLight = '#FDE8F0';
  const secondaryAccent = '#6C5CE7';

  const warmBg = isDark ? '#0F0D15' : '#F9F7FC';
  const cardBg = isDark ? '#1C1926' : '#FFFFFF';
  const cardBorder = isDark ? '#2D2840' : '#EDE8F5';
  const subtleText = isDark ? '#8B82A0' : '#7C7291';
  const mainText = isDark ? '#F0ECF5' : '#1A1428';
  const secondaryBg = isDark ? '#16131F' : '#F4F0FA';

  const formatAttendees = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const baseEvents = filteredEvents.length > 0 ? filteredEvents : events;
  const savedEvents = useMemo(() => {
    const list = events.filter(e => e.isSaved);
    return list.sort((a, b) => {
      const da = getDaysUntilEvent(a);
      const db = getDaysUntilEvent(b);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
  }, [events]);

  const forYouCategorySet = useMemo(() => {
    const set = new Set<string>();
    const interests = (profile?.interests || []).map(i => i.toLowerCase());
    const hasSports = (profile?.favoriteTeams?.length || 0) > 0;
    if (hasSports) set.add('sports');

    if (interests.some(i => i.includes('music') || i.includes('concert') || i.includes('rock') || i.includes('live'))) {
      set.add('music');
    }
    if (interests.some(i => i.includes('sport') || i.includes('football') || i.includes('gym') || i.includes('fitness'))) {
      set.add('sports');
    }
    if (interests.some(i => i.includes('theatre') || i.includes('theater') || i.includes('acting'))) {
      set.add('theatre');
    }
    if (interests.some(i => i.includes('food') || i.includes('drink') || i.includes('cooking') || i.includes('restaurant'))) {
      set.add('food');
    }
    if (interests.some(i => i.includes('art') || i.includes('design') || i.includes('painting') || i.includes('creative'))) {
      set.add('arts');
    }
    if (interests.some(i => i.includes('tech') || i.includes('ai') || i.includes('coding') || i.includes('startup') || i.includes('network'))) {
      set.add('tech');
    }
    if (interests.some(i => i.includes('night') || i.includes('party') || i.includes('club'))) {
      set.add('nightlife');
    }

    return set;
  }, [profile?.favoriteTeams, profile?.interests]);

  const happeningNowEvents = useMemo(() => {
    if (baseEvents.length === 0) return [];
    return baseEvents.filter(e => e.isHot || e.isFeatured).slice(0, 4);
  }, [baseEvents]);

  const nearYouEvents = useMemo(() => {
    if (baseEvents.length === 0) return [];
    return [...baseEvents]
      .sort((a, b) => {
        const da = haversineDistanceKm(USER_LOCATION.latitude, USER_LOCATION.longitude, a.latitude, a.longitude);
        const db = haversineDistanceKm(USER_LOCATION.latitude, USER_LOCATION.longitude, b.latitude, b.longitude);
        return da - db;
      })
      .slice(0, 4);
  }, [baseEvents]);

  const forYouEvents = useMemo(() => {
    if (baseEvents.length === 0) return [];
    const matches = baseEvents.filter(e => forYouCategorySet.has(e.category)).slice(0, 4);
    if (matches.length > 0) return matches;
    return baseEvents.filter(e => e.isFeatured || e.isHot).slice(0, 4);
  }, [baseEvents, forYouCategorySet]);

  const smartDiscoveryEvents =
    discoveryTab === 'now' ? happeningNowEvents : discoveryTab === 'near' ? nearYouEvents : forYouEvents;

  const smartDiscoveryEventIds = useMemo(
    () => new Set(smartDiscoveryEvents.map((e) => e.id)),
    [smartDiscoveryEvents]
  );
  const moreEventsForFeed = useMemo(
    () => filteredEvents.filter((e) => !smartDiscoveryEventIds.has(e.id)),
    [filteredEvents, smartDiscoveryEventIds]
  );

  const discoveryFeedTitle =
    discoveryTab === 'now'
      ? 'Happening Now'
      : discoveryTab === 'near'
        ? 'Near You'
        : 'For You';

  return (
    <View style={[styles.container, { backgroundColor: warmBg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Animated.View style={[styles.headerContent, { transform: [{ scale: headerScale }] }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>🎪</Text>
            <View>
              <Text style={[styles.headerTitle, { color: mainText }]}>Events</Text>
              <Text style={[styles.headerSubtitle, { color: subtleText }]}>Discover what's on near you</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.viewToggle, {
                backgroundColor: viewMode === 'map' ? accentColor : (isDark ? '#1C1926' : accentLight),
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
                  <List size={18} color="#FFFFFF" />
                )}
              </Animated.View>
              <Text style={[
                styles.viewToggleLabel,
                { color: viewMode === 'map' ? '#FFFFFF' : accentColor },
              ]}>
                {viewMode === 'list' ? 'Map' : 'List'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerAction, { backgroundColor: isDark ? '#1C1926' : accentLight }]}
              onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Ticket size={20} color={accentColor} />
            </TouchableOpacity>
          </View>
        </Animated.View>

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
      </View>

      <View style={[styles.smartDiscoveryWrap, { paddingTop: 4 }]}>
        <View style={styles.smartDiscoveryTabs}>
          <TouchableOpacity
            style={[
              styles.smartDiscoveryTab,
              {
                backgroundColor: discoveryTab === 'now' ? accentColor : cardBg,
                borderColor: discoveryTab === 'now' ? accentColor : cardBorder,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => setDiscoveryTab('now')}
          >
            <Text
              style={[styles.smartDiscoveryTabText, { color: discoveryTab === 'now' ? '#FFFFFF' : mainText }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              🔥 Happening Now
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.smartDiscoveryTab,
              {
                backgroundColor: discoveryTab === 'near' ? accentColor : cardBg,
                borderColor: discoveryTab === 'near' ? accentColor : cardBorder,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => setDiscoveryTab('near')}
          >
            <Text
              style={[styles.smartDiscoveryTabText, { color: discoveryTab === 'near' ? '#FFFFFF' : mainText }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              📍 Near You
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.smartDiscoveryTab,
              {
                backgroundColor: discoveryTab === 'forYou' ? accentColor : cardBg,
                borderColor: discoveryTab === 'forYou' ? accentColor : cardBorder,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => setDiscoveryTab('forYou')}
          >
            <Text
              style={[styles.smartDiscoveryTabText, { color: discoveryTab === 'forYou' ? '#FFFFFF' : mainText }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              🎯 For You
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.smartDiscoveryScroll}
        >
          {smartDiscoveryEvents.length === 0 ? (
            <View style={styles.smartDiscoveryEmpty}>
              <Text style={{ color: subtleText, fontWeight: '600' as const }}>No events match yet</Text>
            </View>
          ) : (
            smartDiscoveryEvents.map((event) => {
              const distanceKm = haversineDistanceKm(USER_LOCATION.latitude, USER_LOCATION.longitude, event.latitude, event.longitude);
              const distanceText = formatDistanceKm(distanceKm);
              const isFree = event.price === 'Free';
              const priceBg = isFree
                ? (isDark ? '#1A2E1A' : '#E8F8E8')
                : (isDark ? '#2D1520' : accentLight);
              const priceTextColor = isFree ? '#34C759' : accentColor;

              const isActive = selectedMapEvent === event.id;
              return (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.discoveryCard,
                    { backgroundColor: cardBg, borderColor: cardBorder },
                    isActive && { borderColor: accentColor },
                  ]}
                  activeOpacity={0.9}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedMapEvent(event.id);
                    setExpandedEvent(event.id);
                    if (viewMode === 'map') {
                      mapRef.current?.animateToRegion(
                        {
                          latitude: event.latitude,
                          longitude: event.longitude,
                          latitudeDelta: 0.06,
                          longitudeDelta: 0.06,
                        },
                        900
                      );
                    }
                  }}
                >
                  <Image source={{ uri: event.image }} style={styles.discoveryCardImage} />

                  <View style={styles.discoveryCardInfo}>
                    <View style={styles.discoveryCardTop}>
                      <Text style={styles.discoveryCardTitle} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <TouchableOpacity
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleSaved(event.id);
                        }}
                      >
                        <Heart
                          size={18}
                          color={event.isSaved ? accentColor : subtleText}
                          fill={event.isSaved ? accentColor : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.discoveryMeta} numberOfLines={1}>
                      {event.date} · {event.time}
                    </Text>

                    <View style={styles.discoveryBottomRow}>
                      <View style={styles.discoveryDistance}>
                        <MapPin size={12} color={subtleText} />
                        <Text style={styles.discoveryDistanceText} numberOfLines={1}>
                          {distanceText}
                        </Text>
                      </View>
                      <View style={[styles.discoveryPriceBadge, { backgroundColor: priceBg }]}>
                        <Text style={[styles.discoveryPriceText, { color: priceTextColor }]}>
                          {event.price}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <View style={styles.mapCategoryBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapCategoriesScroll}>
              {EVENT_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.mapCategoryChip,
                      {
                        backgroundColor: isActive ? accentColor : cardBg,
                        borderColor: isActive ? accentColor : cardBorder,
                      },
                    ]}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategory(cat.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.mapCategoryEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.mapCategoryLabel, { color: isActive ? '#FFFFFF' : mainText }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={mapRegion}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            mapPadding={{ top: 60, right: 20, bottom: 200, left: 20 }}
          >
            {filteredEvents.map((event) => (
              <Marker
                key={event.id}
                coordinate={{ latitude: event.latitude, longitude: event.longitude }}
                onPress={() => handleMapMarkerPress(event.id)}
                title={event.title}
                description={`${event.venue} · ${event.price}`}
              />
            ))}
          </MapView>

          <View style={styles.mapEventCount}>
            <View style={[styles.mapCountPill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Navigation size={12} color={accentColor} />
              <Text style={[styles.mapCountText, { color: mainText }]}>
                {filteredEvents.length} events nearby
              </Text>
            </View>
          </View>

          {selectedMapEventData && (
            <View style={[styles.mapBottomCard, { backgroundColor: cardBg }]}>
              <TouchableOpacity
                style={styles.mapCardInner}
                activeOpacity={0.85}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExpandedEvent(expandedEvent === selectedMapEventData.id ? null : selectedMapEventData.id);
                }}
              >
                <Image source={{ uri: selectedMapEventData.image }} style={styles.mapCardImage} />
                <View style={styles.mapCardInfo}>
                  <View style={styles.mapCardHeader}>
                    <Text style={[styles.mapCardTitle, { color: mainText }]} numberOfLines={1}>
                      {selectedMapEventData.title}
                    </Text>
                    <TouchableOpacity onPress={() => toggleSaved(selectedMapEventData.id)}>
                      <Heart
                        size={18}
                        color={selectedMapEventData.isSaved ? accentColor : subtleText}
                        fill={selectedMapEventData.isSaved ? accentColor : 'transparent'}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.mapCardVenueRow}>
                    <MapPin size={12} color={subtleText} />
                    <Text style={[styles.mapCardVenue, { color: subtleText }]} numberOfLines={1}>
                      {selectedMapEventData.venue}
                    </Text>
                  </View>
                  <View style={styles.mapCardMeta}>
                    <View style={styles.mapCardMetaItem}>
                      <Calendar size={12} color={subtleText} />
                      <Text style={[styles.mapCardMetaText, { color: subtleText }]}>
                        {selectedMapEventData.date}
                      </Text>
                    </View>
                    <View style={styles.mapCardMetaItem}>
                      <Clock size={12} color={subtleText} />
                      <Text style={[styles.mapCardMetaText, { color: subtleText }]}>
                        {selectedMapEventData.time}
                      </Text>
                    </View>
                    <View style={[
                      styles.mapCardPriceBadge,
                      {
                        backgroundColor: selectedMapEventData.price === 'Free'
                          ? (isDark ? '#1A2E1A' : '#E8F8E8')
                          : (isDark ? '#2D1520' : accentLight),
                      },
                    ]}>
                      <Text style={[
                        styles.mapCardPriceText,
                        { color: selectedMapEventData.price === 'Free' ? '#34C759' : accentColor },
                      ]}>
                        {selectedMapEventData.price}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapCardAction, { backgroundColor: accentColor }]}
                onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                activeOpacity={0.8}
              >
                <Ticket size={14} color="#FFF" />
                <Text style={styles.mapCardActionText}>
                  {selectedMapEventData.price === 'Free' ? 'Register' : 'Tickets'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!selectedMapEventData && (
            <View style={[styles.mapBottomHint, { backgroundColor: cardBg }]}>
              <MapPin size={16} color={accentColor} />
              <Text style={[styles.mapHintText, { color: mainText }]}>Tap a pin to view event details</Text>
            </View>
          )}
        </View>
      ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accentColor} />
        }
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <View style={[styles.statsRow, { display: 'none' }]}>
          {QUICK_STATS.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={styles.statEmoji}>{stat.emoji}</Text>
              <Text style={[styles.statValue, { color: mainText }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: subtleText }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {MY_UPCOMING.length > 0 && !searchQuery && selectedCategory === 'all' && false && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionEmoji}>📋</Text>
                <Text style={[styles.sectionTitle, { color: mainText }]}>My Upcoming</Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: isDark ? '#2D2840' : accentLight }]}>
                <Text style={[styles.countText, { color: accentColor }]}>{MY_UPCOMING.length}</Text>
              </View>
            </View>

            {MY_UPCOMING.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.upcomingItem, { backgroundColor: cardBg, borderColor: cardBorder }]}
                activeOpacity={0.7}
              >
                <View style={[styles.upcomingEmoji, { backgroundColor: secondaryBg }]}>
                  {(() => { const ci = CATEGORY_ICON_MAP[item.category]; const CatIcon = ci?.icon || Ticket; return <CatIcon size={20} color={ci?.color || accentColor} />; })()}
                </View>
                <View style={styles.upcomingInfo}>
                  <Text style={[styles.upcomingTitle, { color: mainText }]} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.upcomingMeta}>
                    <MapPin size={12} color={subtleText} />
                    <Text style={[styles.upcomingVenue, { color: subtleText }]}>{item.venue}</Text>
                  </View>
                </View>
                <View style={styles.upcomingRight}>
                  <View style={[styles.daysBadge, {
                    backgroundColor: item.daysUntil <= 3 ? (isDark ? '#2D1520' : '#FDE8F0') : secondaryBg,
                  }]}>
                    <Text style={[styles.daysText, {
                      color: item.daysUntil <= 3 ? accentColor : secondaryAccent,
                    }]}>
                      {item.daysUntil === 0 ? 'Today' : item.daysUntil === 1 ? 'Tomorrow' : `${item.daysUntil}d`}
                    </Text>
                  </View>
                  <Text style={[styles.upcomingTime, { color: subtleText }]}>{item.time}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {featuredEvents.length > 0 && !searchQuery && selectedCategory === 'all' && false && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionEmoji}>⭐</Text>
                <Text style={[styles.sectionTitle, { color: mainText }]}>Featured</Text>
              </View>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: accentColor }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: featuredScrollX } } }], { useNativeDriver: false })}
              scrollEventThrottle={16}
              decelerationRate="fast"
              snapToInterval={SCREEN_WIDTH * 0.75 + 12}
            >
              {featuredEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.featuredCard]}
                  activeOpacity={0.9}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setExpandedEvent(expandedEvent === event.id ? null : event.id);
                  }}
                >
                  <Image source={{ uri: event.image }} style={styles.featuredImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.featuredGradient}
                  />
                  <View style={styles.featuredBadgeRow}>
                    {event.isHot && (
                      <View style={[styles.hotBadge, { backgroundColor: '#FF3B30' }]}>
                        <TrendingUp size={10} color="#FFF" />
                        <Text style={styles.hotText}>Hot</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.featuredHeart}
                    onPress={() => toggleSaved(event.id)}
                  >
                    <Heart size={18} color={event.isSaved ? accentColor : '#FFF'} fill={event.isSaved ? accentColor : 'transparent'} />
                  </TouchableOpacity>
                  <View style={styles.featuredOverlay}>
                    <Text style={styles.featuredTitle} numberOfLines={2}>{event.title}</Text>
                    <View style={styles.featuredMeta}>
                      <MapPin size={12} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.featuredVenue}>{event.venue}</Text>
                    </View>
                    <View style={styles.featuredFooter}>
                      <View style={styles.featuredDateRow}>
                        <Calendar size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.featuredDate}>{event.date}</Text>
                      </View>
                      <View style={styles.featuredPriceBadge}>
                        <Text style={styles.featuredPrice}>{event.price}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>🏷️</Text>
              <Text style={[styles.sectionTitle, { color: mainText }]}>Categories</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {EVENT_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isActive ? accentColor : cardBg,
                      borderColor: isActive ? accentColor : cardBorder,
                    },
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryLabel, { color: isActive ? '#FFFFFF' : mainText }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>
                {discoveryTab === 'now' ? '🔥' : discoveryTab === 'near' ? '📍' : '🎯'}
              </Text>
              <Text style={[styles.sectionTitle, { color: mainText }]}>More from {discoveryFeedTitle}</Text>
            </View>
            <Text style={[styles.resultCount, { color: subtleText }]}>{moreEventsForFeed.length} events</Text>
          </View>

          {moreEventsForFeed.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={[styles.emptyTitle, { color: mainText }]}>You’re all caught up</Text>
              <Text style={[styles.emptyText, { color: subtleText }]}>No more events for this view</Text>
            </View>
          ) : (
            moreEventsForFeed.map((event) => {
              const isExpanded = expandedEvent === event.id;
              const distanceKm = haversineDistanceKm(
                USER_LOCATION.latitude,
                USER_LOCATION.longitude,
                event.latitude,
                event.longitude
              );
              const distanceText = formatDistanceKm(distanceKm);
              const isFree = event.price === 'Free';
              const priceBg = isFree
                ? (isDark ? '#1A2E1A' : '#E8F8E8')
                : (isDark ? '#2D1520' : accentLight);
              const priceTextColor = isFree ? '#34C759' : accentColor;
              return (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.eventCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setExpandedEvent(isExpanded ? null : event.id);
                    Alert.alert(
                      event.title,
                      `${event.venue}\n${event.location}\n\n${event.description}`
                    );
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.eventRow}>
                    <View style={styles.eventImageWrapper}>
                      <Image source={{ uri: event.image }} style={styles.eventImage} />
                      {event.isHot && (
                        <View style={styles.eventHotDot}>
                          <View style={styles.hotDotInner} />
                        </View>
                      )}
                    </View>
                    <View style={styles.eventInfo}>
                      <View style={styles.eventTop}>
                        <Text style={[styles.eventTitle, { color: mainText }]} numberOfLines={1}>{event.title}</Text>
                      <TouchableOpacity
                        style={[
                          styles.saveInterestedPill,
                          { borderColor: cardBorder, backgroundColor: event.isSaved ? 'rgba(232, 67, 147, 0.12)' : 'transparent' },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleSaved(event.id);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.85}
                      >
                        <Heart size={18} color={event.isSaved ? accentColor : subtleText} fill={event.isSaved ? accentColor : 'transparent'} />
                        <Text style={[styles.saveInterestedText, { color: event.isSaved ? accentColor : subtleText }]}>
                          {event.isSaved ? 'Saved' : 'Interested'}
                        </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.eventVenueRow}>
                        <MapPin size={12} color={subtleText} />
                        <Text style={[styles.eventVenue, { color: subtleText }]} numberOfLines={1}>{event.venue}, {event.location}</Text>
                      </View>
                      <View style={styles.eventMeta}>
                        <View style={styles.eventMetaItem}>
                          <Calendar size={12} color={subtleText} />
                        <Text style={[styles.eventMetaText, { color: subtleText }]} numberOfLines={1}>
                          {event.date} · {event.time}
                        </Text>
                        </View>
                      <View style={[styles.eventPriceBadge, { backgroundColor: priceBg }]}>
                        <Text style={[styles.eventPriceText, { color: priceTextColor }]}>{event.price}</Text>
                        </View>
                        <View style={styles.eventMetaItem}>
                        <MapPin size={12} color={subtleText} />
                        <Text style={[styles.eventMetaText, { color: subtleText }]} numberOfLines={1}>
                          {distanceText}
                        </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {false && (
                    <View style={[styles.expandedContent, { borderTopColor: cardBorder }]}>
                      <Text style={[styles.eventDescription, { color: mainText }]}>{event.description}</Text>

                      <View style={styles.expandedDetails}>
                        <View style={[styles.detailChip, { backgroundColor: secondaryBg }]}>
                          <Clock size={14} color={subtleText} />
                          <Text style={[styles.detailText, { color: mainText }]}>{event.time}</Text>
                        </View>
                        <View style={[styles.detailChip, { backgroundColor: secondaryBg }]}>
                          <Star size={14} color="#FFD700" />
                          <Text style={[styles.detailText, { color: mainText }]}>{event.rating}</Text>
                        </View>
                        <View style={[styles.detailChip, { backgroundColor: secondaryBg }]}>
                          <MapPin size={14} color={subtleText} />
                          <Text style={[styles.detailText, { color: mainText }]}>{event.location}</Text>
                        </View>
                      </View>

                      <View style={styles.tagsList}>
                        {event.tags.map((tag, i) => (
                          <View key={i} style={[styles.tagChip, { backgroundColor: secondaryBg }]}>
                            <Text style={[styles.tagText, { color: secondaryAccent }]}>#{tag}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.expandedQuickActionsGrid}>
                        <TouchableOpacity
                          style={[styles.quickActionBtn, { borderColor: cardBorder }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert('Remind me', 'Reminders UI coming soon.');
                          }}
                          activeOpacity={0.85}
                        >
                          <Clock size={14} color={subtleText} />
                          <Text style={styles.quickActionText}>Remind</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quickActionBtn, { borderColor: cardBorder }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert('Add to calendar', 'Calendar sync UI coming soon.');
                          }}
                          activeOpacity={0.85}
                        >
                          <Calendar size={14} color={subtleText} />
                          <Text style={styles.quickActionText}>Calendar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quickActionBtn, { borderColor: cardBorder }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert('Share', 'Share UI coming soon.');
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.quickActionText}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quickActionBtn, { borderColor: cardBorder }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert('Directions', 'Directions UI coming soon.');
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.quickActionText}>Directions</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={[styles.getTicketsBtn, { backgroundColor: accentColor }]}
                        onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                        activeOpacity={0.8}
                      >
                        <Ticket size={16} color="#FFF" />
                        <Text style={styles.getTicketsText}>
                          {event.price === 'Free' ? 'Register Now' : 'Get Tickets'}
                        </Text>
                        <ChevronRight size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>🎟️</Text>
              <Text style={[styles.sectionTitle, { color: mainText }]}>My Events</Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: isDark ? '#2D2840' : accentLight }]}>
              <Text style={[styles.countText, { color: accentColor }]}>{savedEvents.length}</Text>
            </View>
          </View>

          {savedEvents.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={styles.emptyEmoji}>🔖</Text>
              <Text style={[styles.emptyTitle, { color: mainText }]}>Save events to stay on top</Text>
              <Text style={[styles.emptyText, { color: subtleText }]}>Tap the heart on any event</Text>
            </View>
          ) : (
            savedEvents.slice(0, 4).map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.savedEventRow, { backgroundColor: cardBg, borderColor: cardBorder }]}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedMapEvent(event.id);
                  setExpandedEvent(event.id);
                }}
              >
                <Image source={{ uri: event.image }} style={styles.savedEventThumb} />
                <View style={styles.savedEventInfo}>
                  <Text style={styles.savedEventTitle} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={[styles.savedEventMeta, { color: subtleText }]} numberOfLines={1}>
                    {event.date} · {event.time}
                  </Text>
                  <Text style={[styles.savedEventCountdown, { color: accentColor }]} numberOfLines={1}>
                    {getCountdownLabel(event)}
                  </Text>
                </View>

                <View style={styles.savedEventActions}>
                  <TouchableOpacity
                    style={[styles.savedQuickBtn, { borderColor: cardBorder }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      Alert.alert('Remind me', 'Reminders UI coming soon.');
                    }}
                    activeOpacity={0.8}
                  >
                    <Clock size={14} color={subtleText} />
                    <Text style={styles.savedQuickBtnText}>Remind</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.savedQuickBtn, { borderColor: cardBorder }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      Alert.alert('Add to calendar', 'Calendar sync UI coming soon.');
                    }}
                    activeOpacity={0.8}
                  >
                    <Calendar size={14} color={subtleText} />
                    <Text style={styles.savedQuickBtnText}>Calendar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={[styles.tipCard, { backgroundColor: isDark ? '#1A1828' : '#F0ECFA' }]}>
            <Text style={styles.tipEmoji}>💡</Text>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: mainText }]}>Event Tip</Text>
              <Text style={[styles.tipText, { color: subtleText }]}>
                Save events you're interested in to get notified when prices drop or tickets are about to sell out.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
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
  },
  headerEmoji: {
    fontSize: 36,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
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
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 18,
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
    marginBottom: 6,
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
    fontSize: 13,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  smartDiscoveryScroll: {
    gap: 12,
    paddingRight: 20,
    paddingLeft: 0,
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
