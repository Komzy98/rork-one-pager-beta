import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  ScrollView,
  Platform,
  FlatList,
  TextInput,
} from 'react-native';
import {
  ArrowLeft,

  Users,
  TrendingUp,
  Eye,
  Tv,
  Film,
  MapPin,
  ChevronRight,
  Flame,
  Radio,
  BarChart3,
  Map as MapIcon,
  Navigation,
  Search,
  X,
  Heart,
  Star,
  Filter,
  Clock,
  Zap,
  Play,
  Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import {
  MOCK_NEARBY_WATCHERS,
  MOCK_TRENDING_AREAS,
  TRENDING_SHOWS_GLOBAL,
  LIVE_ACTIVITY_FEED,
  PLATFORM_OPTIONS,
  GENRE_OPTIONS,
  NearbyWatcher,
  TrendingArea,
  PlatformFilter,
  GenreFilter,
  MediaFilter,
} from '@/mocks/watchingNearby';

type ViewMode = 'map' | 'trending' | 'activity';

const ACCENT = '#FF2D55';
const ACCENT_SOFT = 'rgba(255, 45, 85, 0.12)';
const BG = '#000000';
const SURFACE = '#0D0D0F';
const SURFACE_LIGHT = '#151518';
const SURFACE_ELEVATED = '#1C1C21';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A1A1AA';
const TEXT_MUTED = '#52525B';
const GREEN = '#30D158';
const AMBER = '#FF9F0A';
const CYAN = '#64D2FF';
const GLASS = 'rgba(20, 20, 24, 0.78)';
const GLASS_BORDER = 'rgba(255,255,255,0.08)';

export default function WatchingMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedWatcher, setSelectedWatcher] = useState<NearbyWatcher | null>(null);
  const [selectedArea, setSelectedArea] = useState<TrendingArea | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('All');
  const [genreFilter, setGenreFilter] = useState<GenreFilter>('All');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const mapRef = useRef<MapView>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const locationBtnAnim = useRef(new Animated.Value(1)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;
  const liveDotAnim = useRef(new Animated.Value(0.4)).current;
  const activityScrollRef = useRef<FlatList>(null);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  useEffect(() => {
    const centerOnUserLocation = () => {
      if (Platform.OS === 'web') {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              console.log('📍 Auto-centering map on user location:', latitude, longitude);
              mapRef.current?.animateToRegion({
                latitude,
                longitude,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }, 1000);
            },
            (err) => console.log('📍 Geolocation denied, using default region:', err.message)
          );
        }
      } else {
        void import('expo-location').then(async (Location) => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
              console.log('📍 Location permission denied, using default region');
              return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            console.log('📍 Auto-centering map on user location:', loc.coords.latitude, loc.coords.longitude);
            mapRef.current?.animateToRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }, 1000);
          } catch (e) {
            console.log('📍 Location error, using default region:', e);
          }
        });
      }
    };

    const timer = setTimeout(centerOnUserLocation, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    const dot = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(liveDotAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    dot.start();
    return () => dot.stop();
  }, [liveDotAnim]);

  useEffect(() => {
    Animated.spring(filterAnim, {
      toValue: showFilters ? 1 : 0,
      tension: 120,
      friction: 14,
      useNativeDriver: false,
    }).start();
  }, [showFilters, filterAnim]);

  const filteredWatchers = useMemo(() => {
    let result = MOCK_NEARBY_WATCHERS;
    if (platformFilter !== 'All') {
      result = result.filter(w => w.platform === platformFilter);
    }
    if (genreFilter !== 'All') {
      result = result.filter(w => w.genre === genreFilter);
    }
    if (mediaFilter !== 'All') {
      result = result.filter(w =>
        mediaFilter === 'TV' ? w.mediaType === 'tv' : w.mediaType === 'movie'
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w =>
        w.showTitle.toLowerCase().includes(q) ||
        w.username.toLowerCase().includes(q) ||
        w.platform.toLowerCase().includes(q)
      );
    }
    return result;
  }, [platformFilter, genreFilter, mediaFilter, searchQuery]);

  const activeWatchers = useMemo(
    () => filteredWatchers.filter(w => w.watchingNow),
    [filteredWatchers]
  );

  const showClusters = useMemo(() => {
    const GRID_SIZE = 0.015;
    const buckets = new Map<string, NearbyWatcher[]>();
    filteredWatchers.forEach((w) => {
      const gx = Math.round(w.latitude / GRID_SIZE);
      const gy = Math.round(w.longitude / GRID_SIZE);
      const key = `${gx}:${gy}`;
      const arr = buckets.get(key);
      if (arr) arr.push(w);
      else buckets.set(key, [w]);
    });
    return Array.from(buckets.entries()).map(([key, members]) => {
      const avgLat = members.reduce((s, m) => s + m.latitude, 0) / members.length;
      const avgLng = members.reduce((s, m) => s + m.longitude, 0) / members.length;
      const showCounts = new Map<string, { count: number; poster: string; platformColor: string; title: string }>();
      members.forEach((m) => {
        const prev = showCounts.get(m.showTitle);
        if (prev) prev.count += 1;
        else showCounts.set(m.showTitle, { count: 1, poster: m.showPoster, platformColor: m.platformColor, title: m.showTitle });
      });
      const topShows = Array.from(showCounts.values()).sort((a, b) => b.count - a.count).slice(0, 3);
      const liveCount = members.filter(m => m.watchingNow).length;
      return {
        key,
        latitude: avgLat,
        longitude: avgLng,
        members,
        topShows,
        liveCount,
        total: members.length,
      };
    });
  }, [filteredWatchers]);

  const totalActiveWatchers = useMemo(
    () => MOCK_NEARBY_WATCHERS.filter(w => w.watchingNow).length,
    []
  );

  const showCard = useCallback(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [cardAnim]);

  const hideCard = useCallback(() => {
    Animated.timing(cardAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [cardAnim]);

  const handleWatcherPress = useCallback((watcher: NearbyWatcher) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedWatcher(watcher);
    setSelectedArea(null);
    showCard();
    mapRef.current?.animateToRegion({
      latitude: watcher.latitude - 0.008,
      longitude: watcher.longitude,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    }, 400);
  }, [showCard]);

  const handleAreaPress = useCallback((area: TrendingArea) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedArea(area);
    setSelectedWatcher(null);
    showCard();
    mapRef.current?.animateToRegion({
      latitude: area.latitude - 0.015,
      longitude: area.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }, 500);
  }, [showCard]);

  const animateToCoords = useCallback((latitude: number, longitude: number) => {
    const region = {
      latitude,
      longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    console.log('📍 Centering map on:', latitude, longitude);
    try {
      mapRef.current?.animateToRegion(region, 800);
    } catch (e) {
      console.log('📍 animateToRegion failed, trying fitToCoordinates:', e);
    }
    setTimeout(() => {
      try {
        (mapRef.current as unknown as { animateCamera?: (c: { center: { latitude: number; longitude: number }; zoom?: number }, o?: { duration: number }) => void })?.animateCamera?.(
          { center: { latitude, longitude }, zoom: 13 },
          { duration: 600 }
        );
      } catch (e) {
        console.log('📍 animateCamera fallback failed:', e);
      }
    }, 50);
  }, []);

  const goToCurrentLocation = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(locationBtnAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(locationBtnAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            animateToCoords(latitude, longitude);
          },
          (err) => {
            console.log('📍 Web geolocation error:', err.code, err.message);
            if (typeof window !== 'undefined') {
              window.alert('Unable to access your location. Please enable location permissions in your browser settings.');
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        console.log('📍 Geolocation API not available');
      }
    } else {
      void import('expo-location').then(async (Location) => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.log('📍 Location permission denied');
            const { Alert } = await import('react-native');
            Alert.alert(
              'Location Permission',
              'Please enable location access in your device settings to center the map on your location.'
            );
            return;
          }
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          animateToCoords(loc.coords.latitude, loc.coords.longitude);
        } catch (e) {
          console.log('📍 Location error:', e);
        }
      });
    }
  }, [locationBtnAnim, animateToCoords]);

  const dismissCard = useCallback(() => {
    hideCard();
    setTimeout(() => {
      setSelectedWatcher(null);
      setSelectedArea(null);
    }, 250);
  }, [hideCard]);

  const mapRegion = useMemo(() => ({
    latitude: 51.5074,
    longitude: -0.1278,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  }), []);

  const formatWatchers = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const hasActiveFilters = platformFilter !== 'All' || genreFilter !== 'All' || mediaFilter !== 'All';

  const clearFilters = useCallback(() => {
    void Haptics.selectionAsync();
    setPlatformFilter('All');
    setGenreFilter('All');
    setMediaFilter('All');
    setSearchQuery('');
  }, []);

  const renderGlassContainer = (children: React.ReactNode, style?: object) => {
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.glassWeb, style]}>
          {children}
        </View>
      );
    }
    return (
      <BlurView intensity={40} tint="dark" style={[styles.glassNative, style]}>
        <View style={styles.glassOverlay}>
          {children}
        </View>
      </BlurView>
    );
  };

  const renderPlatformChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipScroll}
    >
      {PLATFORM_OPTIONS.map((p) => {
        const isActive = platformFilter === p.label;
        return (
          <TouchableOpacity
            key={p.label}
            style={[
              styles.platformChip,
              isActive && { backgroundColor: p.label === 'All' ? 'rgba(255,255,255,0.12)' : p.color },
            ]}
            onPress={() => {
              void Haptics.selectionAsync();
              setPlatformFilter(p.label);
            }}
            activeOpacity={0.7}
          >
            {p.icon !== '' && (
              <View style={[styles.chipIcon, { backgroundColor: isActive ? 'rgba(0,0,0,0.25)' : p.color }]}>
                <Text style={styles.chipIconText}>{p.icon}</Text>
              </View>
            )}
            <Text style={[
              styles.platformChipText,
              isActive && styles.platformChipTextActive,
            ]}>{p.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderGenreChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipScroll}
    >
      {GENRE_OPTIONS.map((g) => {
        const isActive = genreFilter === g;
        return (
          <TouchableOpacity
            key={g}
            style={[
              styles.genreChip,
              isActive && styles.genreChipActive,
            ]}
            onPress={() => {
              void Haptics.selectionAsync();
              setGenreFilter(g);
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.genreChipText,
              isActive && styles.genreChipTextActive,
            ]}>{g}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderFilterBar = () => {
    const filterHeight = filterAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 150],
    });

    return (
      <Animated.View style={[styles.filterContainer, { maxHeight: filterHeight, opacity: filterAnim }]}>
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Platform</Text>
          {renderPlatformChips()}
        </View>
        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabel}>Genre</Text>
              {renderGenreChips()}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderMediaToggle = () => (
    <View style={styles.mediaToggle}>
      {(['All', 'TV', 'Movies'] as MediaFilter[]).map((m) => {
        const isActive = mediaFilter === m;
        return (
          <TouchableOpacity
            key={m}
            style={[styles.mediaBtn, isActive && styles.mediaBtnActive]}
            onPress={() => {
              void Haptics.selectionAsync();
              setMediaFilter(m);
            }}
            activeOpacity={0.7}
          >
            {m === 'TV' && <Tv size={13} color={isActive ? TEXT_PRIMARY : TEXT_MUTED} />}
            {m === 'Movies' && <Film size={13} color={isActive ? TEXT_PRIMARY : TEXT_MUTED} />}
            <Text style={[styles.mediaBtnText, isActive && styles.mediaBtnTextActive]}>{m}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderActivityFeed = () => (
    <View style={[styles.activityContainer, { paddingTop: insets.top + 130 }]}>
      <View style={styles.activityHeader}>
        <LinearGradient
          colors={[AMBER, '#FF6B00']}
          style={styles.activityHeaderIcon}
        >
          <Zap size={18} color="#FFF" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.activityHeaderTitle}>Live Activity</Text>
          <Text style={styles.activityHeaderSub}>Real-time watching updates nearby</Text>
        </View>
        <View style={styles.activityLiveBadge}>
          <Animated.View style={[styles.activityLiveDot, { opacity: liveDotAnim }]} />
          <Text style={styles.activityLiveText}>LIVE</Text>
        </View>
      </View>

      {renderMediaToggle()}

      <FlatList
        ref={activityScrollRef}
        data={LIVE_ACTIVITY_FEED}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140, paddingTop: 8 }}
        renderItem={({ item, index }) => (
          <View style={styles.activityItem}>
            <View style={styles.activityTimeline}>
              <View style={[styles.activityTimelineDot, { backgroundColor: item.platformColor }]} />
              {index < LIVE_ACTIVITY_FEED.length - 1 && <View style={styles.activityTimelineLine} />}
            </View>
            <View style={styles.activityContent}>
              <View style={styles.activityItemHeader}>
                <Text style={styles.activityUsername}>{item.username}</Text>
                <View style={styles.activityTimeBadge}>
                  <Clock size={9} color={TEXT_MUTED} />
                  <Text style={styles.activityTime}>{item.time} ago</Text>
                </View>
              </View>
              <Text style={styles.activityAction}>{item.action}</Text>
              <View style={styles.activityShowRow}>
                <View style={[styles.activityPlatformDot, { backgroundColor: item.platformColor }]} />
                <Text style={styles.activityShow}>{item.show}</Text>
                <View style={[styles.activityPlatformBadge, { backgroundColor: item.platformColor + '20' }]}>
                  <Text style={[styles.activityPlatform, { color: item.platformColor }]}>{item.platform}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );

  const renderTrendingList = () => (
    <ScrollView
      style={styles.trendingScroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 140, paddingTop: insets.top + 130 }}
    >
      <View style={styles.trendingHeader}>
        <LinearGradient
          colors={[ACCENT, '#FF6B8A']}
          style={styles.trendingHeaderIcon}
        >
          <Flame size={20} color="#FFF" />
        </LinearGradient>
        <View>
          <Text style={styles.trendingHeaderTitle}>What's Trending</Text>
          <Text style={styles.trendingHeaderSub}>See what everyone's watching right now</Text>
        </View>
      </View>

      <View style={styles.liveStatsRow}>
        <View style={styles.liveStat}>
          <LinearGradient
            colors={['rgba(255,45,85,0.15)', 'rgba(255,45,85,0.05)']}
            style={styles.liveStatGradient}
          >
            <Radio size={16} color={ACCENT} />
            <Text style={[styles.liveStatValue, { color: ACCENT }]}>{totalActiveWatchers}</Text>
            <Text style={styles.liveStatLabel}>Watching</Text>
          </LinearGradient>
        </View>
        <View style={styles.liveStat}>
          <LinearGradient
            colors={['rgba(48,209,88,0.15)', 'rgba(48,209,88,0.05)']}
            style={styles.liveStatGradient}
          >
            <Users size={16} color={GREEN} />
            <Text style={[styles.liveStatValue, { color: GREEN }]}>{MOCK_NEARBY_WATCHERS.length}</Text>
            <Text style={styles.liveStatLabel}>Nearby</Text>
          </LinearGradient>
        </View>
        <View style={styles.liveStat}>
          <LinearGradient
            colors={['rgba(255,159,10,0.15)', 'rgba(255,159,10,0.05)']}
            style={styles.liveStatGradient}
          >
            <TrendingUp size={16} color={AMBER} />
            <Text style={[styles.liveStatValue, { color: AMBER }]}>{TRENDING_SHOWS_GLOBAL.length}</Text>
            <Text style={styles.liveStatLabel}>Trending</Text>
          </LinearGradient>
        </View>
      </View>

      {renderPlatformChips()}

      <View style={[styles.sectionBlock, { marginTop: 24 }]}>
        <View style={styles.sectionTitleRow}>
          <BarChart3 size={16} color={ACCENT} />
          <Text style={styles.sectionTitle}>Top Shows Right Now</Text>
        </View>
        {TRENDING_SHOWS_GLOBAL.map((show, index) => (
          <TouchableOpacity key={show.title} style={styles.trendingShowItem} activeOpacity={0.6}>
            <View style={[
              styles.trendingRankBadge,
              index === 0 && { backgroundColor: ACCENT_SOFT },
              index === 1 && { backgroundColor: 'rgba(255,159,10,0.12)' },
              index === 2 && { backgroundColor: 'rgba(48,209,88,0.12)' },
            ]}>
              <Text style={[
                styles.trendingRank,
                index === 0 && { color: ACCENT },
                index === 1 && { color: AMBER },
                index === 2 && { color: GREEN },
              ]}>
                {index + 1}
              </Text>
            </View>
            <Image source={{ uri: show.poster }} style={styles.trendingPoster} />
            <View style={styles.trendingShowInfo}>
              <Text style={styles.trendingShowTitle} numberOfLines={1}>{show.title}</Text>
              <View style={styles.trendingShowMeta}>
                <Eye size={11} color={TEXT_SECONDARY} />
                <Text style={styles.trendingShowWatchers}>{formatWatchers(show.watchers)}</Text>
                <View style={styles.trendingPlatformTag}>
                  <Text style={styles.trendingPlatformText}>{show.platform}</Text>
                </View>
              </View>
              <View style={styles.trendingShowBottom}>
                <Text style={styles.trendingGenreTag}>{show.genre}</Text>
                <View style={styles.changeBadge}>
                  <TrendingUp size={9} color={GREEN} />
                  <Text style={styles.changeText}>{show.change}</Text>
                </View>
              </View>
            </View>
            <ChevronRight size={14} color={TEXT_MUTED} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <MapPin size={16} color={CYAN} />
          <Text style={styles.sectionTitle}>Trending by Area</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areasScroll}>
          {MOCK_TRENDING_AREAS.map((area) => (
            <TouchableOpacity
              key={area.id}
              style={styles.areaCard}
              activeOpacity={0.8}
              onPress={() => {
                setViewMode('map');
                setTimeout(() => handleAreaPress(area), 300);
              }}
            >
              <Image source={{ uri: area.topShowPoster }} style={styles.areaCardPoster} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
                style={styles.areaCardGradient}
              />
              <View style={styles.areaCardContent}>
                <Text style={styles.areaCardName}>{area.name}</Text>
                <View style={styles.areaCardMeta}>
                  <Users size={10} color={TEXT_SECONDARY} />
                  <Text style={styles.areaCardWatchers}>{formatWatchers(area.watchers)} watching</Text>
                </View>
                {area.topShows && area.topShows.length > 0 && (
                  <View style={styles.areaCardTopShows}>
                    {area.topShows.slice(0, 2).map((ts) => (
                      <View key={ts.title} style={styles.areaCardTopShow}>
                        <View style={styles.areaCardTopDot} />
                        <Text style={styles.areaCardTopText} numberOfLines={1}>{ts.title}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <Radio size={16} color={GREEN} />
          <Text style={styles.sectionTitle}>Watching Right Now</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{activeWatchers.length}</Text>
          </View>
        </View>
        {MOCK_NEARBY_WATCHERS.filter(w => w.watchingNow).slice(0, 8).map((watcher) => (
          <TouchableOpacity
            key={watcher.id}
            style={styles.watcherListItem}
            activeOpacity={0.6}
            onPress={() => {
              setViewMode('map');
              setTimeout(() => handleWatcherPress(watcher), 300);
            }}
          >
            <View style={styles.watcherAvatarContainer}>
              <Image source={{ uri: watcher.avatar }} style={styles.watcherListAvatar} />
              <View style={[styles.liveIndicator, { backgroundColor: watcher.platformColor }]} />
            </View>
            <View style={styles.watcherListInfo}>
              <Text style={styles.watcherListName}>{watcher.username}</Text>
              <View style={styles.watcherListShowRow}>
                <View style={[styles.platformDot, { backgroundColor: watcher.platformColor }]} />
                <Text style={styles.watcherListShow} numberOfLines={1}>{watcher.showTitle}</Text>
                {watcher.season != null && (
                  <Text style={styles.watcherListEpisode}>S{watcher.season}E{watcher.episode}</Text>
                )}
              </View>
            </View>
            <View style={styles.watcherListRight}>
              <Text style={styles.watcherListTime}>{watcher.startedAt}</Text>
              {watcher.reactions != null && watcher.reactions > 0 && (
                <View style={styles.reactionBadge}>
                  <Heart size={9} color={ACCENT} />
                  <Text style={styles.reactionCount}>{watcher.reactions}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        customMapStyle={darkMapStyle}
        mapPadding={{ top: 60, right: 20, bottom: 260, left: 20 }}
        onPress={() => {
          if (selectedWatcher || selectedArea) dismissCard();
        }}
      >
        {showClusters.map((cluster) => {
          const primary = cluster.topShows[0];
          if (!primary) return null;
          return (
            <Marker
              key={cluster.key}
              coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
              onPress={() => {
                const rep = cluster.members.find(m => m.showTitle === primary.title) ?? cluster.members[0];
                handleWatcherPress(rep);
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.clusterContainer}>
                {cluster.liveCount > 0 && (
                  <Animated.View style={[
                    styles.clusterPulse,
                    {
                      backgroundColor: primary.platformColor,
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.5],
                        outputRange: [0.25, 0],
                      }),
                    },
                  ]} />
                )}
                <View style={styles.clusterPosterStack}>
                  {cluster.topShows.slice(0, 3).reverse().map((s, idx) => {
                    const reversedIdx = cluster.topShows.slice(0, 3).length - 1 - idx;
                    return (
                      <View
                        key={s.title}
                        style={[
                          styles.clusterPoster,
                          {
                            borderColor: s.platformColor,
                            transform: [
                              { translateX: reversedIdx * 10 - 10 },
                              { translateY: reversedIdx * 4 - 4 },
                              { rotate: `${(reversedIdx - 1) * 6}deg` },
                            ],
                            zIndex: 10 - reversedIdx,
                          },
                        ]}
                      >
                        <Image source={{ uri: s.poster }} style={styles.clusterPosterImg} />
                      </View>
                    );
                  })}
                </View>
                <View style={[styles.clusterBadge, { backgroundColor: primary.platformColor }]}>
                  <Text style={styles.clusterBadgeCount}>{cluster.total}</Text>
                </View>
                {cluster.liveCount > 0 && (
                  <View style={styles.clusterLiveChip}>
                    <Animated.View style={[styles.clusterLiveDot, { opacity: liveDotAnim }]} />
                    <Text style={styles.clusterLiveText}>{cluster.liveCount} live</Text>
                  </View>
                )}
              </View>
            </Marker>
          );
        })}

        {MOCK_TRENDING_AREAS.map((area) => (
          <Marker
            key={area.id}
            coordinate={{ latitude: area.latitude, longitude: area.longitude }}
            onPress={() => handleAreaPress(area)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.areaBubble}>
              <LinearGradient
                colors={[ACCENT, '#FF6B8A']}
                style={styles.areaBubbleInner}
              >
                <Text style={styles.areaBubbleCount}>{formatWatchers(area.watchers)}</Text>
                <Users size={9} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
              <Text style={styles.areaBubbleName}>{area.name}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.mapFloatingControls, { top: insets.top + 120 }]}>
        {renderGlassContainer(
          <View style={styles.mapLivePillContent}>
            <Animated.View style={[styles.livePulseDot, { opacity: liveDotAnim }]} />
            <Text style={styles.mapLiveText}>
              {filteredWatchers.filter(w => w.watchingNow).length} watching live
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearFilterBtn}>
                <X size={11} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            )}
          </View>,
          styles.mapLivePill
        )}
      </View>

      <Animated.View style={[
        styles.currentLocationBtn,
        { bottom: selectedWatcher || selectedArea ? 420 : 210 },
        { transform: [{ scale: locationBtnAnim }] },
      ]}>
        {renderGlassContainer(
          <TouchableOpacity
            onPress={goToCurrentLocation}
            activeOpacity={0.7}
            style={styles.currentLocationBtnInner}
          >
            <Navigation size={18} color={TEXT_PRIMARY} />
          </TouchableOpacity>,
          styles.locationBtnGlass
        )}
      </Animated.View>

      <View style={[styles.mapBottomStrip, { bottom: selectedWatcher || selectedArea ? 240 : 100 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapStripContent}>
          {activeWatchers.slice(0, 10).map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[
                styles.mapStripItem,
                selectedWatcher?.id === w.id && styles.mapStripItemActive,
              ]}
              onPress={() => handleWatcherPress(w)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: w.showPoster }} style={styles.mapStripPoster} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.mapStripGradient}
              />
              <View style={styles.mapStripInfo}>
                <Text style={styles.mapStripShow} numberOfLines={1}>{w.showTitle}</Text>
                <View style={styles.mapStripBottom}>
                  <View style={[styles.mapStripDot, { backgroundColor: w.platformColor }]} />
                  <Text style={styles.mapStripUser} numberOfLines={1}>{w.username}</Text>
                </View>
              </View>
              {selectedWatcher?.id === w.id && (
                <View style={styles.mapStripPlayIcon}>
                  <Play size={10} color="#FFF" fill="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedWatcher && (
        <Animated.View style={[
          styles.bottomCard,
          {
            transform: [{
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [350, 0],
              }),
            }],
            opacity: cardAnim,
          },
        ]}>
          <TouchableOpacity style={styles.bottomCardDismiss} onPress={dismissCard} activeOpacity={0.8}>
            <View style={styles.dismissHandle} />
          </TouchableOpacity>
          <View style={styles.watcherCard}>
            <View style={styles.watcherCardTop}>
              <View style={styles.watcherCardAvatarWrap}>
                <Image source={{ uri: selectedWatcher.avatar }} style={styles.watcherCardAvatar} />
                {selectedWatcher.watchingNow && (
                  <View style={[styles.watcherCardLive, { backgroundColor: selectedWatcher.platformColor }]} />
                )}
              </View>
              <View style={styles.watcherCardInfo}>
                <Text style={styles.watcherCardName}>{selectedWatcher.username}</Text>
                <View style={styles.watcherCardStatusRow}>
                  {selectedWatcher.watchingNow ? (
                    <>
                      <View style={[styles.watcherStatusDot, { backgroundColor: GREEN }]} />
                      <Text style={[styles.watcherCardStatus, { color: GREEN }]}>Watching now</Text>
                    </>
                  ) : (
                    <>
                      <View style={[styles.watcherStatusDot, { backgroundColor: TEXT_MUTED }]} />
                      <Text style={styles.watcherCardStatus}>Watched {selectedWatcher.startedAt}</Text>
                    </>
                  )}
                </View>
              </View>
              {selectedWatcher.reactions != null && selectedWatcher.reactions > 0 && (
                <TouchableOpacity style={styles.watcherReaction} activeOpacity={0.7}>
                  <Heart size={13} color={ACCENT} />
                  <Text style={styles.watcherReactionText}>{selectedWatcher.reactions}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.watcherShowCard}>
              <Image source={{ uri: selectedWatcher.showPoster }} style={styles.watcherShowPoster} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)']}
                style={styles.watcherPosterOverlay}
              />
              <View style={styles.watcherShowInfo}>
                <Text style={styles.watcherShowTitle} numberOfLines={1}>{selectedWatcher.showTitle}</Text>
                <View style={styles.watcherShowMeta}>
                  <View style={[styles.platformBadge, { backgroundColor: selectedWatcher.platformColor }]}>
                    <Text style={styles.platformBadgeText}>{selectedWatcher.platform}</Text>
                  </View>
                  {selectedWatcher.season != null && (
                    <Text style={styles.watcherShowEp}>
                      S{selectedWatcher.season} · E{selectedWatcher.episode}
                    </Text>
                  )}
                </View>
                <View style={styles.watcherShowBottom}>
                  <View style={styles.watcherShowType}>
                    {selectedWatcher.mediaType === 'tv' ? (
                      <Tv size={11} color={TEXT_SECONDARY} />
                    ) : (
                      <Film size={11} color={TEXT_SECONDARY} />
                    )}
                    <Text style={styles.watcherShowTypeText}>
                      {selectedWatcher.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                    </Text>
                  </View>
                  <View style={styles.genreBadge}>
                    <Text style={styles.genreBadgeText}>{selectedWatcher.genre}</Text>
                  </View>
                  {selectedWatcher.rating != null && (
                    <View style={styles.ratingBadge}>
                      <Star size={10} color="#FFD60A" fill="#FFD60A" />
                      <Text style={styles.ratingText}>{selectedWatcher.rating}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {selectedArea && !selectedWatcher && (
        <Animated.View style={[
          styles.bottomCard,
          {
            transform: [{
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [350, 0],
              }),
            }],
            opacity: cardAnim,
          },
        ]}>
          <TouchableOpacity style={styles.bottomCardDismiss} onPress={dismissCard} activeOpacity={0.8}>
            <View style={styles.dismissHandle} />
          </TouchableOpacity>
          <View style={styles.areaDetailCard}>
            <View style={styles.areaDetailHeader}>
              <LinearGradient
                colors={[ACCENT, '#FF6B8A']}
                style={styles.areaDetailIcon}
              >
                <MapPin size={18} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.areaDetailName}>{selectedArea.name}</Text>
                <Text style={styles.areaDetailWatchers}>
                  {formatWatchers(selectedArea.watchers)} people watching
                </Text>
              </View>
            </View>
            {selectedArea.topShows && selectedArea.topShows.length > 0 && (
              <View style={styles.areaTopShowsList}>
                {selectedArea.topShows.map((ts, i) => (
                  <View key={ts.title} style={[
                    styles.areaTopShowItem,
                    i === selectedArea.topShows!.length - 1 && { borderBottomWidth: 0 },
                  ]}>
                    <View style={[
                      styles.areaTopShowRankBadge,
                      i === 0 && { backgroundColor: ACCENT_SOFT },
                    ]}>
                      <Text style={[styles.areaTopShowRank, i === 0 && { color: ACCENT }]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.areaTopShowTitle}>{ts.title}</Text>
                      <Text style={styles.areaTopShowPlatform}>{ts.platform}</Text>
                    </View>
                    <View style={styles.areaTopShowWatchersBadge}>
                      <Eye size={10} color={TEXT_SECONDARY} />
                      <Text style={styles.areaTopShowWatchers}>{formatWatchers(ts.watchers)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );

  const modeIndicatorLeft = useMemo((): `${number}%` => {
    const modes: ViewMode[] = ['map', 'trending', 'activity'];
    const idx = modes.indexOf(viewMode);
    return `${(idx / 3) * 100}%` as `${number}%`;
  }, [viewMode]);

  return (
    <View style={[styles.container, { backgroundColor: BG }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View style={[
        styles.header,
        {
          opacity: headerAnim,
          transform: [{
            translateY: headerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          }],
        },
      ]}>
        {Platform.OS === 'web' ? (
          <View style={styles.headerBlurWeb}>
            <View style={[styles.headerInner, { paddingTop: insets.top + 8 }]}>
              {renderHeaderContent()}
            </View>
          </View>
        ) : (
          <BlurView intensity={60} tint="dark" style={styles.headerBlurNative}>
            <View style={[styles.headerInner, { paddingTop: insets.top + 8 }]}>
              {renderHeaderContent()}
            </View>
          </BlurView>
        )}
      </Animated.View>

      {viewMode === 'map' && renderMapView()}
      {viewMode === 'trending' && renderTrendingList()}
      {viewMode === 'activity' && renderActivityFeed()}
    </View>
  );

  function renderHeaderContent() {
    return (
      <>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={TEXT_PRIMARY} />
          </TouchableOpacity>

          {showSearch ? (
            <View style={styles.searchBar}>
              <Search size={15} color={TEXT_MUTED} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search shows, users..."
                placeholderTextColor={TEXT_MUTED}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={15} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.headerCenter}>
              <Sparkles size={16} color={ACCENT} />
              <Text style={styles.headerTitle}>Watching Nearby</Text>
            </View>
          )}

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerActionBtn, showSearch && styles.headerActionBtnActive]}
              onPress={() => {
                void Haptics.selectionAsync();
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
              activeOpacity={0.7}
            >
              {showSearch ? <X size={17} color={ACCENT} /> : <Search size={17} color={TEXT_PRIMARY} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerActionBtn, showFilters && styles.headerActionBtnActive]}
              onPress={() => {
                void Haptics.selectionAsync();
                setShowFilters(!showFilters);
              }}
              activeOpacity={0.7}
            >
              <Filter size={17} color={showFilters ? ACCENT : TEXT_PRIMARY} />
              {hasActiveFilters && <View style={styles.filterIndicator} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.modeToggle}>
          <View style={[styles.modeIndicator, { left: modeIndicatorLeft }]} />
          {([
            { mode: 'map' as ViewMode, icon: MapIcon, label: 'Map' },
            { mode: 'trending' as ViewMode, icon: TrendingUp, label: 'Trending' },
            { mode: 'activity' as ViewMode, icon: Zap, label: 'Activity' },
          ]).map(({ mode, icon: Icon, label }) => (
            <TouchableOpacity
              key={mode}
              style={styles.modeButton}
              onPress={() => {
                void Haptics.selectionAsync();
                setViewMode(mode);
              }}
              activeOpacity={0.7}
            >
              <Icon size={14} color={viewMode === mode ? '#FFF' : TEXT_MUTED} />
              <Text style={[
                styles.modeButtonText,
                viewMode === mode && styles.modeButtonTextActive,
              ]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {renderFilterBar()}
      </>
    );
  }
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#08080C' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#08080C' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#3A3A42' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#121218' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1A1A22' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#161620' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050510' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#161630' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0A0A12' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#161620' }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  headerBlurNative: {
    overflow: 'hidden',
  },
  headerBlurWeb: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(20px)',
  } as any,
  headerInner: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  headerActionBtnActive: {
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
    borderColor: 'rgba(255, 45, 85, 0.25)',
  },
  filterIndicator: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  searchInput: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '500' as const,
    height: 40,
    paddingVertical: 0,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 3,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  modeIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '33.33%',
    backgroundColor: ACCENT,
    borderRadius: 11,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
    gap: 5,
    zIndex: 1,
  },
  modeButtonText: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  filterContainer: {
    overflow: 'hidden',
    marginTop: 10,
  },
  filterSection: {
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 4,
  },
  chipScroll: {
    paddingHorizontal: 4,
    gap: 6,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  chipIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIconText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800' as const,
  },
  platformChipText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  platformChipTextActive: {
    color: '#FFF',
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  genreChipActive: {
    backgroundColor: ACCENT_SOFT,
    borderColor: 'rgba(255, 45, 85, 0.3)',
  },
  genreChipText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  genreChipTextActive: {
    color: ACCENT,
  },
  mediaToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  mediaBtnActive: {
    backgroundColor: SURFACE_ELEVATED,
  },
  mediaBtnText: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  mediaBtnTextActive: {
    color: TEXT_PRIMARY,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
  },
  clusterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 96,
    height: 96,
  },
  clusterPulse: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    top: 10,
  },
  clusterPosterStack: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterPoster: {
    position: 'absolute',
    width: 44,
    height: 62,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: SURFACE,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55,
        shadowRadius: 6,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  clusterPosterImg: {
    width: '100%',
    height: '100%',
  },
  clusterBadge: {
    position: 'absolute',
    top: -2,
    right: 4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BG,
    zIndex: 20,
  },
  clusterBadgeCount: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800' as const,
  },
  clusterLiveChip: {
    position: 'absolute',
    bottom: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 20,
  },
  clusterLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GREEN,
  },
  clusterLiveText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  markerPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  markerOuter: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: SURFACE,
    borderWidth: 2.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  markerAvatar: {
    width: '100%',
    height: '100%',
  },
  markerShowTag: {
    position: 'absolute',
    bottom: -2,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
    maxWidth: 80,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  markerShowTagText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  areaBubble: {
    alignItems: 'center',
    gap: 3,
  },
  areaBubbleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  areaBubbleCount: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800' as const,
  },
  areaBubbleName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  mapFloatingControls: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
  },
  glassWeb: {
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  glassNative: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  glassOverlay: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  mapLivePill: {
    borderRadius: 22,
  },
  mapLivePillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 8,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  mapLiveText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  clearFilterBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 50,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  currentLocationBtnInner: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBtnGlass: {
    borderRadius: 23,
  },
  mapBottomStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  mapStripContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  mapStripItem: {
    width: 150,
    height: 82,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  mapStripItemActive: {
    borderColor: ACCENT,
    borderWidth: 2,
  },
  mapStripPoster: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  mapStripGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  mapStripInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    zIndex: 2,
  },
  mapStripShow: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700' as const,
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mapStripBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapStripUser: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '500' as const,
  },
  mapStripDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mapStripPlayIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,45,85,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 90,
    left: 12,
    right: 12,
    backgroundColor: SURFACE,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  bottomCardDismiss: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  dismissHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  watcherCard: {
    padding: 16,
  },
  watcherCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  watcherCardAvatarWrap: {
    position: 'relative',
  },
  watcherCardAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  watcherCardLive: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: SURFACE,
  },
  watcherCardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  watcherCardName: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  watcherCardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  watcherStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  watcherCardStatus: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  watcherReaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ACCENT_SOFT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.15)',
  },
  watcherReactionText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  watcherShowCard: {
    flexDirection: 'row',
    backgroundColor: SURFACE_LIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  watcherShowPoster: {
    width: 65,
    height: 95,
  },
  watcherPosterOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 65,
    height: 95,
  },
  watcherShowInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  watcherShowTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  watcherShowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  platformBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  platformBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  watcherShowEp: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  watcherShowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watcherShowType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  watcherShowTypeText: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  genreBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  genreBadgeText: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    color: '#FFD60A',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  areaDetailCard: {
    padding: 16,
  },
  areaDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  areaDetailIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  areaDetailName: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  areaDetailWatchers: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 2,
  },
  areaTopShowsList: {
    backgroundColor: SURFACE_LIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  areaTopShowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 10,
  },
  areaTopShowRankBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  areaTopShowRank: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '800' as const,
  },
  areaTopShowTitle: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  areaTopShowPlatform: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 1,
  },
  areaTopShowWatchersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  areaTopShowWatchers: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  trendingScroll: {
    flex: 1,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  trendingHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingHeaderTitle: {
    color: TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
  },
  trendingHeaderSub: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 2,
  },
  liveStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  liveStat: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  liveStatGradient: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  liveStatValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  liveStatLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  sectionBlock: {
    marginBottom: 28,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 8,
  },
  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '700' as const,
    flex: 1,
    letterSpacing: -0.3,
  },
  sectionBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionBadgeText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  trendingShowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 10,
  },
  trendingRankBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  trendingRank: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '800' as const,
  },
  trendingPoster: {
    width: 44,
    height: 65,
    borderRadius: 10,
  },
  trendingShowInfo: {
    flex: 1,
  },
  trendingShowTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  trendingShowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  trendingShowWatchers: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  trendingPlatformTag: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  trendingPlatformText: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  trendingShowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendingGenreTag: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    gap: 2,
  },
  changeText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  areasScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  areaCard: {
    width: 165,
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: SURFACE_LIGHT,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  areaCardPoster: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    opacity: 0.4,
  },
  areaCardGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  areaCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    zIndex: 2,
  },
  areaCardName: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  areaCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  areaCardWatchers: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  areaCardTopShows: {
    gap: 3,
  },
  areaCardTopShow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  areaCardTopDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  areaCardTopText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '500' as const,
    flex: 1,
  },
  watcherListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  watcherAvatarContainer: {
    position: 'relative',
  },
  watcherListAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BG,
  },
  watcherListInfo: {
    flex: 1,
  },
  watcherListName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 3,
  },
  watcherListShowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  platformDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  watcherListShow: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  watcherListEpisode: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  watcherListRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  watcherListTime: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '500' as const,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reactionCount: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  activityContainer: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 18,
    gap: 10,
  },
  activityHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityHeaderTitle: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
  },
  activityHeaderSub: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 2,
  },
  activityLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ACCENT_SOFT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.15)',
  },
  activityLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  activityLiveText: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  activityItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  activityTimeline: {
    width: 24,
    alignItems: 'center',
    paddingTop: 6,
  },
  activityTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: BG,
  },
  activityTimelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 4,
    marginBottom: -4,
  },
  activityContent: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    marginLeft: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  activityItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  activityUsername: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  activityTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  activityTime: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '500' as const,
  },
  activityAction: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '500' as const,
    marginBottom: 5,
  },
  activityShowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityPlatformDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activityShow: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  activityPlatformBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  activityPlatform: {
    fontSize: 9,
    fontWeight: '700' as const,
  },
});
