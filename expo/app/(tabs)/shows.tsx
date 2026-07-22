import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Platform, 
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Pressable,
  Alert,
  Animated as RNAnimated,
  RefreshControl,
  StatusBar,
  Share,
  InteractionManager,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  getYounifyRuntimeIssue,
  loadYounifyStreamingBundle,
  type YounifyBrowseSection,
  type YounifyStreamingLoadProgress,
} from '@/services/younify';
import { 
  Plus, 
  Play, 
  Star, 
  Search, 
  X, 
  TrendingUp, 

  Tv,
  Film,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Eye,
  Pause,
  Info,
  Heart,
  Share2,
  Bell,
  BellOff,
  BellRing,
  Sparkles,
  Check,
  Youtube,
  Globe,
  Calendar,
  Clock,
  Clapperboard,
  Flame,
  Link2,
} from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/hooks/useHabitsStore';
import { useAuth } from '@/hooks/useAuth';
import { Show, NewShowFormData } from '@/types/habit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tmdbApi, TMDBMovie, TMDBTVShow, TMDBTVShowDetails, TMDBEpisode, getGenreNames, formatReleaseDate, formatRating } from '@/utils/tmdbApi';
import { navigateToShow, showNavigationAlert } from '@/utils/streamingNavigation';
import { openStreamingApp, getStreamingPlatform, openStreamingTitleSearch, openYounifyBrowseItemOnPlatform, younifySourceToTmdbProviderId, tryOpenDisneyPlusFromHomepage, openDisneyPlusForTmdbItem, normalizeTmdbWatchProviderId } from '@/utils/streamingLinks';
import { WatchProvider } from '@/utils/tmdbApi';
import { buildYounifyProviderIndex, pickBestYounifyContinueRow, pickBestYounifyRowForEpisode, readSeasonEpisodeFromYounifyRow, type YounifyProviderIndex } from '@/utils/younifyProviderIndex';
import { formatShowEpisodeLabel } from '@/utils/showEpisodeLabel';
import { extractTmdbIdFromYounifyRow } from '@/utils/aroundYouImages';
import {
  buildForYouHeroCandidates,
  buildForYouPersonalizationContext,
  collectYounifyLinkedTmdbIds,
  pickForYouHeroItems,
  takeUniqueForYouRailItems,
  forYouItemKey,
  toForYouMediaItem,
  type ForYouCandidateSource,
} from '@/utils/showsForYouPersonalization';
import {
  buildStreamingHeroRecommendations,
  STREAMING_HERO_MIN_ITEMS,
} from '@/utils/streamingHeroRecommendations';
import {
  DISCOVERY_CACHE_KEYS,
  formatCacheAgeLabel,
  readDiscoveryCache,
  writeDiscoveryCache,
} from '@/utils/discoveryOfflineCache';
import {
  logForYouFeedDiagnostic,
  logStreamingHeroDiagnostic,
} from '@/utils/streamingFeedDiagnostics';
import FeedRetryBanner from '@/components/FeedRetryBanner';
import { resolveTmdbDetailsForYounifyRow } from '@/utils/younifyTmdbPoster';
import {
  fetchForYouPopular,
  fetchForYouTrendingPopular,
  forYouDiscoveryHasItems,
} from '@/utils/forYouTmdbFeed';

import { episodeNotificationService, TrackedShow } from '@/utils/episodeNotificationService';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDismissedContinueWatching } from '@/hooks/useDismissedContinueWatching';
import { getYounifyContinueWatchingDismissKey } from '@/utils/continueWatchingDismiss';
import { getNationalitySignals } from '@/utils/nationalityPersonalization';
import { likedContentService } from '@/utils/likedContentService';
import WatchProviders from '@/components/WatchProviders';
import ConnectedServicesHero from '@/components/younify/ConnectedServicesHero';
import StreamingServicesBrowseTab from '@/components/younify/StreamingServicesBrowseTab';
import YounifyBrowseSectionRow from '@/components/younify/YounifyBrowseSectionRow';
import AroundYouTab from '@/components/shows/AroundYouTab';

import TabWalkthrough from '@/components/TabWalkthrough';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';



const { width: screenWidth } = Dimensions.get('window');
const POSTER_WIDTH = (screenWidth - 56) / 3;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const HERO_HEIGHT = 480;
const LARGE_CARD_WIDTH = screenWidth * 0.7;
const EPISODE_CARD_WIDTH = screenWidth * 0.82;

/** Fixed cinema-style palette for Shows & movies; not driven by global Profile themes. */
const THEME = {
  background: '#08080C',
  surface: '#111117',
  surfaceLight: '#18181F',
  surfaceHighlight: '#222230',
  primary: '#E50914',
  secondary: '#B81D24',
  accent: '#FF4655',
  success: '#4ADE80',
  warning: '#FBBF24',
  text: '#F5F5F7',
  textSecondary: '#8E8E9A',
  textMuted: '#52525B',
  border: '#1E1E28',
  gradient: ['#E50914', '#B81D24', '#8B1A1A'],
  card: '#0C0C12',
  glow: 'rgba(229, 9, 20, 0.15)',
};



type ShowsSubtab = 'for-you' | 'streaming' | 'watchlist' | 'around-you';

const SHOW_SUBTAB_KEYS = new Set<ShowsSubtab>(['for-you', 'streaming', 'watchlist', 'around-you']);

function parseShowsSubtabParam(raw: string | string[] | undefined): ShowsSubtab | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== 'string') return null;
  return SHOW_SUBTAB_KEYS.has(v as ShowsSubtab) ? (v as ShowsSubtab) : null;
}

const PLATFORMS = [
  { id: 'Netflix', label: 'Netflix', color: '#E50914' },
  { id: 'Prime', label: 'Prime', color: '#00A8E1' },
  { id: 'Disney+', label: 'Disney+', color: '#113CCF' },
  { id: 'HBO', label: 'HBO', color: '#5822B4' },
  { id: 'Hulu', label: 'Hulu', color: '#1CE783' },
  { id: 'Apple', label: 'Apple TV+', color: '#555555' },
  { id: 'Other', label: 'Other', color: '#6B7280' },
] as const;

interface DetailModalProps {
  visible: boolean;
  item: (TMDBMovie | TMDBTVShow) & { media_type?: 'movie' | 'tv' } | null;
  mediaType: 'movie' | 'tv';
  onClose: () => void;
  onAddToList: (item: any, type: 'movie' | 'tv', startWatching?: boolean) => void;
  isInList: boolean;
  trackedShow: TrackedShow | null;
  onToggleNotifications: (enabled: boolean) => void;
  isTogglingNotifications: boolean;
  isLiked: boolean;
  onToggleLike: () => void;
  onShare: () => void;
  hasLinkedServices: boolean;
  younifyProviderIndex: YounifyProviderIndex;
  onConnectServices: () => void;
}

function TrailerPlayer({ videoKey, onClose }: { videoKey: string; onClose: () => void }) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoKey}`;
  const embedUrl = `https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  if (Platform.OS !== 'web') {
    void Linking.openURL(youtubeUrl);
    onClose();
    return null;
  }

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={trailerStyles.overlay}>
        <View style={trailerStyles.container}>
          <View style={trailerStyles.header}>
            <View style={trailerStyles.headerLeft}>
              <Youtube size={18} color={THEME.primary} />
              <Text style={trailerStyles.headerTitle}>Trailer</Text>
            </View>
            <TouchableOpacity
              style={trailerStyles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={trailerStyles.playerWrapper}>
            <iframe
              src={embedUrl}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 } as any}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailModal({
  visible,
  item,
  mediaType,
  onClose,
  onAddToList,
  isInList,
  trackedShow,
  onToggleNotifications,
  isTogglingNotifications,
  isLiked,
  onToggleLike,
  onShare,
  hasLinkedServices,
  younifyProviderIndex,
  onConnectServices,
}: DetailModalProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new RNAnimated.Value(0)).current;
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const [tvShowDetails, setTvShowDetails] = useState<TMDBTVShowDetails | null>(null);
  const [loadingTvDetails, setLoadingTvDetails] = useState(false);
  const [movieDetails, setMovieDetails] = useState<
    (TMDBMovie & { runtime?: number; genres?: { id: number; name: string }[]; homepage?: string | null }) | null
  >(null);
  const [modalWatchProviders, setModalWatchProviders] = useState<{
    streaming: WatchProvider[];
    rent: WatchProvider[];
    buy: WatchProvider[];
    link?: string;
  } | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [openingApp, setOpeningApp] = useState(false);
  const heartScale = useRef(new RNAnimated.Value(1)).current;

  const itemId = item?.id;
  useEffect(() => {
    if (visible && itemId) {
      setTrailerKey(null);
      setShowTrailer(false);
      setLoadingTrailer(true);
      setModalWatchProviders(null);
      setLoadingProviders(true);
      setTvShowDetails(null);
      setMovieDetails(null);
      setLoadingTvDetails(mediaType === 'tv');

      tmdbApi.getVideos(itemId, mediaType).then((res) => {
        const trailer = tmdbApi.findOfficialTrailer(res.results);
        setTrailerKey(trailer?.key ?? null);
        if (__DEV__) console.log('🎬 Trailer found:', trailer?.name ?? 'none');
      }).catch((err) => {
        if (__DEV__) console.error('Failed to fetch trailer:', err);
      }).finally(() => {
        setLoadingTrailer(false);
      });

      if (mediaType === 'tv') {
        tmdbApi.getTVShowDetails(itemId).then((details) => {
          setTvShowDetails(details);
          if (__DEV__) console.log('📺 TV details loaded:', details.name, 'Status:', details.status, 'Next ep:', details.next_episode_to_air?.name);
        }).catch((err) => {
          if (__DEV__) console.error('Failed to fetch TV details:', err);
        }).finally(() => {
          setLoadingTvDetails(false);
        });
      }

      if (mediaType === 'movie') {
        tmdbApi.getMovieDetails(itemId).then((details) => {
          setMovieDetails(details);
        }).catch((err) => {
          if (__DEV__) console.error('Failed to fetch movie details:', err);
        });
      }

      tmdbApi.getWatchProviders(itemId, mediaType).then((res) => {
        const gbProviders = res.results?.GB;
        const usProviders = res.results?.US;
        const countryProviders = gbProviders || usProviders;
        if (countryProviders) {
          setModalWatchProviders({
            streaming: countryProviders.flatrate || [],
            rent: countryProviders.rent || [],
            buy: countryProviders.buy || [],
            link: countryProviders.link,
          });
          if (__DEV__) console.log('📺 Detail modal watch providers loaded');
        }
      }).catch((err) => {
        if (__DEV__) console.error('Failed to fetch watch providers:', err);
      }).finally(() => {
        setLoadingProviders(false);
      });
    }
  }, [visible, itemId, mediaType]);

  const handleWatchNow = useCallback(async (provider: WatchProvider) => {
    const itemTitle = mediaType === 'movie' ? (item as TMDBMovie)?.title : (item as TMDBTVShow)?.name;
    if (!itemTitle) return;
    setOpeningApp(true);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    const releaseYear = mediaType === 'movie'
      ? parseInt((item as TMDBMovie)?.release_date?.split('-')[0] || '0', 10)
      : parseInt((item as TMDBTVShow)?.first_air_date?.split('-')[0] || '0', 10);
    console.log(`🎬 Opening ${provider.provider_name} for "${itemTitle}"`);
    try {
      // Disney+: TMDB homepage is a disneyplus.com series/movie URL (universal link into the app).
      if (provider.provider_id === 337) {
        const homepage =
          mediaType === 'tv' ? tvShowDetails?.homepage : movieDetails?.homepage;
        if (homepage && (await tryOpenDisneyPlusFromHomepage(homepage))) return;
        if (item?.id != null && (await openDisneyPlusForTmdbItem(item.id, mediaType))) return;
      }

      // Deterministic Younify selection: exact provider match first, then best ranked candidate.
      const tmdbId = item?.id ?? null;
      const normalizedTitle = itemTitle.trim().toLowerCase().replace(/\s+/g, ' ');
      const candidatesById = tmdbId != null ? (younifyProviderIndex.rowsByTmdbId.get(tmdbId) ?? []) : [];
      const candidatesByTitle = younifyProviderIndex.rowsByTitle.get(normalizedTitle) ?? [];
      const candidates = [...candidatesById, ...candidatesByTitle];

      const targetProviderId = normalizeTmdbWatchProviderId(provider.provider_id);
      const exactProviderRow = candidates.find((row) => {
        const pid = younifySourceToTmdbProviderId(
          row.younifySourceService as { id?: string; name?: string } | undefined,
        );
        if (pid == null) return false;
        return normalizeTmdbWatchProviderId(pid) === targetProviderId;
      });

      if (exactProviderRow) {
        await openYounifyBrowseItemOnPlatform(exactProviderRow, {});
        return;
      }

      const bestRankedRow = pickBestYounifyRowForEpisode(younifyProviderIndex, {
        tmdbId,
        title: itemTitle,
      });
      if (bestRankedRow) {
        await openYounifyBrowseItemOnPlatform(bestRankedRow, {});
        return;
      }

      await openStreamingApp(
        provider.provider_id,
        itemTitle,
        releaseYear || undefined,
      );
    } finally {
      setOpeningApp(false);
    }
  }, [
    item,
    mediaType,
    younifyProviderIndex,
    tvShowDetails?.homepage,
    movieDetails?.homepage,
  ]);

  const handleOpenJustWatch = useCallback(async () => {
    if (!modalWatchProviders?.link) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await Linking.openURL(modalWatchProviders.link);
  }, [modalWatchProviders?.link]);
  
  if (!item) return null;
  
  const title = mediaType === 'movie' ? (item as TMDBMovie).title : (item as TMDBTVShow).name;
  const releaseDate = mediaType === 'movie' ? (item as TMDBMovie).release_date : (item as TMDBTVShow).first_air_date;
  const backdropUrl = tmdbApi.getImageUrl(item.backdrop_path, 'w780');
  const posterUrl = tmdbApi.getImageUrl(item.poster_path, 'w500');
  const genres = getGenreNames(item.genre_ids || [], mediaType === 'tv');
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'web' ? undefined : 'fullScreen'}>
      <View style={[styles.detailModal, { backgroundColor: THEME.background }]}>
        <RNAnimated.View style={[styles.detailHeader, { opacity: headerOpacity, paddingTop: insets.top }]}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,8,12,0.92)' }]} />
          )}
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>{title}</Text>
        </RNAnimated.View>
        
        <TouchableOpacity 
          style={[styles.detailCloseButton, { top: insets.top + 8 }]}
          onPress={onClose}
        >
          {Platform.OS !== 'web' ? (
            <BlurView intensity={60} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20 }]} />
          )}
          <X size={20} color="#FFF" />
        </TouchableOpacity>
        
        <RNAnimated.ScrollView 
          showsVerticalScrollIndicator={false}
          onScroll={RNAnimated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: Platform.OS !== 'web' }
          )}
          scrollEventThrottle={16}
        >
          <View style={styles.detailHero}>
            {backdropUrl ? (
              <Image source={{ uri: backdropUrl }} style={styles.detailBackdrop} />
            ) : (
              <View style={[styles.detailBackdrop, { backgroundColor: THEME.surfaceLight }]} />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(10,10,15,0.8)', THEME.background]}
              style={styles.detailHeroGradient}
            />
            
            <View style={styles.detailHeroContent}>
              {posterUrl && (
                <Image source={{ uri: posterUrl }} style={styles.detailPoster} />
              )}
              <View style={styles.detailHeroInfo}>
                <Text style={styles.detailTitle}>{title}</Text>
                <View style={styles.detailMeta}>
                  <View style={styles.detailRating}>
                    <Star size={14} color={THEME.accent} fill={THEME.accent} />
                    <Text style={styles.detailRatingText}>{formatRating(item.vote_average)}</Text>
                  </View>
                  <Text style={styles.detailYear}>{formatReleaseDate(releaseDate)}</Text>
                  <View style={styles.detailTypeBadge}>
                    <Text style={styles.detailTypeText}>{mediaType === 'movie' ? 'Movie' : 'TV Series'}</Text>
                  </View>
                </View>
                {genres.length > 0 && (
                  <Text style={styles.detailGenres} numberOfLines={1}>{genres.slice(0, 3).join(' • ')}</Text>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.detailContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Overview</Text>
              <Text style={styles.detailOverview}>{item.overview || 'No description available.'}</Text>
            </View>

            {!hasLinkedServices && (
              <View style={styles.connectServicesCard}>
                <Text style={styles.connectServicesTitle}>Connect your streaming services</Text>
                <Text style={styles.connectServicesText}>
                  Link your services to open titles directly in the right app with one tap.
                </Text>
                <TouchableOpacity style={styles.connectServicesButton} onPress={onConnectServices} activeOpacity={0.85}>
                  <Text style={styles.connectServicesButtonText}>Connect services</Text>
                </TouchableOpacity>
              </View>
            )}

            {modalWatchProviders && modalWatchProviders.streaming.length > 0 && (
              <View style={styles.watchNowSection}>
                <Text style={styles.watchNowLabel}>Watch Now</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.watchNowProviders}>
                  {modalWatchProviders.streaming.map((provider) => {
                    const platform = getStreamingPlatform(provider.provider_id);
                    return (
                      <TouchableOpacity
                        key={provider.provider_id}
                        style={[styles.watchNowButton, { backgroundColor: platform?.color || THEME.primary }]}
                        onPress={() => handleWatchNow(provider)}
                        activeOpacity={0.8}
                        disabled={openingApp}
                      >
                        <Image
                          source={{ uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}` }}
                          style={styles.watchNowProviderLogo}
                        />
                        <View style={styles.watchNowButtonTextWrap}>
                          <Text style={styles.watchNowButtonTitle}>Watch on</Text>
                          <Text style={styles.watchNowButtonName} numberOfLines={1}>{provider.provider_name}</Text>
                        </View>
                        <Play size={18} color="#FFF" fill="#FFF" />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {!loadingProviders && modalWatchProviders && modalWatchProviders.streaming.length === 0 && (
              (modalWatchProviders.rent.length > 0 || modalWatchProviders.buy.length > 0) && (
                <View style={styles.watchNowSection}>
                  <Text style={styles.watchNowLabel}>
                    {modalWatchProviders.rent.length > 0 ? 'Rent or Buy' : 'Buy'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.watchNowProviders}>
                    {[...modalWatchProviders.rent, ...modalWatchProviders.buy]
                      .filter((p, i, arr) => arr.findIndex(x => x.provider_id === p.provider_id) === i)
                      .slice(0, 5)
                      .map((provider) => {
                        const platform = getStreamingPlatform(provider.provider_id);
                        return (
                          <TouchableOpacity
                            key={provider.provider_id}
                            style={[styles.watchNowButtonCompact, { borderColor: (platform?.color || THEME.textMuted) + '50' }]}
                            onPress={() => handleWatchNow(provider)}
                            activeOpacity={0.8}
                            disabled={openingApp}
                          >
                            <Image
                              source={{ uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}` }}
                              style={styles.watchNowProviderLogoSmall}
                            />
                            <Text style={styles.watchNowCompactName} numberOfLines={1}>{provider.provider_name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>
                </View>
              )
            )}

            {loadingProviders && (
              <View style={styles.watchNowLoading}>
                <ActivityIndicator size="small" color={THEME.primary} />
                <Text style={styles.watchNowLoadingText}>Finding where to watch...</Text>
              </View>
            )}

            {modalWatchProviders?.link && (
              <TouchableOpacity
                style={styles.justWatchLink}
                onPress={handleOpenJustWatch}
                activeOpacity={0.7}
              >
                <Globe size={14} color={THEME.textSecondary} />
                <Text style={styles.justWatchLinkText}>View all watch options</Text>
                <ChevronRight size={14} color={THEME.textMuted} />
              </TouchableOpacity>
            )}

            <View style={styles.detailActions}>
              {isInList ? (
                <TouchableOpacity 
                  style={[styles.detailActionButton, styles.detailActionSuccess]}
                  disabled
                >
                  <Check size={20} color="#FFF" />
                  <Text style={styles.detailActionText}>In My List</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.detailActionButton, styles.detailActionPrimary]}
                    onPress={async () => {
                      if (Platform.OS !== 'web') {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                      onAddToList(item, mediaType, true);
                    }}
                  >
                    <Plus size={20} color="#FFF" />
                    <Text style={styles.detailActionText}>Add to List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.detailActionSecondary}
                    onPress={async () => {
                      if (Platform.OS !== 'web') {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      onAddToList(item, mediaType, false);
                    }}
                  >
                    <Bookmark size={22} color={THEME.text} />
                  </TouchableOpacity>
                </>
              )}
              
              <TouchableOpacity 
                style={[styles.detailActionSecondary, isLiked && styles.detailActionLiked]}
                onPress={() => {
                  RNAnimated.sequence([
                    RNAnimated.timing(heartScale, { toValue: 1.35, duration: 120, useNativeDriver: Platform.OS !== 'web' }),
                    RNAnimated.timing(heartScale, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
                  ]).start();
                  onToggleLike();
                }}
                testID="like-button"
              >
                <RNAnimated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Heart size={22} color={isLiked ? '#FF2D55' : THEME.text} fill={isLiked ? '#FF2D55' : 'none'} />
                </RNAnimated.View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.detailActionSecondary}
                onPress={onShare}
                testID="share-button"
              >
                <Share2 size={22} color={THEME.text} />
              </TouchableOpacity>
            </View>

            {trailerKey && (
              <TouchableOpacity
                style={trailerStyles.watchTrailerButton}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  setShowTrailer(true);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(229, 9, 20, 0.15)', 'rgba(229, 9, 20, 0.05)']}
                  style={trailerStyles.watchTrailerGradient}
                >
                  <View style={trailerStyles.playIconCircle}>
                    <Play size={16} color="#FFF" fill="#FFF" />
                  </View>
                  <View style={trailerStyles.watchTrailerTextContainer}>
                    <Text style={trailerStyles.watchTrailerLabel}>Watch Trailer</Text>
                    <Text style={trailerStyles.watchTrailerSub}>YouTube</Text>
                  </View>
                  <Youtube size={20} color={THEME.textMuted} />
                </LinearGradient>
              </TouchableOpacity>
            )}
            {loadingTrailer && (
              <View style={trailerStyles.loadingRow}>
                <ActivityIndicator size="small" color={THEME.primary} />
                <Text style={trailerStyles.loadingText}>Loading trailer...</Text>
              </View>
            )}

            {mediaType === 'tv' && tvShowDetails && (tvShowDetails.status === 'Returning Series' || tvShowDetails.status === 'In Production' || tvShowDetails.next_episode_to_air) && (
              <View style={upcomingStyles.container}>
                <View style={upcomingStyles.header}>
                  <View style={upcomingStyles.headerIcon}>
                    <Calendar size={16} color="#00D1FF" />
                  </View>
                  <Text style={upcomingStyles.headerTitle}>Upcoming</Text>
                  <View style={upcomingStyles.statusBadge}>
                    <View style={upcomingStyles.statusDot} />
                    <Text style={upcomingStyles.statusText}>
                      {tvShowDetails.status === 'Returning Series' ? 'Returning' : tvShowDetails.status}
                    </Text>
                  </View>
                </View>

                {tvShowDetails.next_episode_to_air && (
                  <View style={upcomingStyles.episodeCard}>
                    <View style={upcomingStyles.episodeIconWrap}>
                      <Clapperboard size={18} color="#00D1FF" />
                    </View>
                    <View style={upcomingStyles.episodeInfo}>
                      <Text style={upcomingStyles.episodeLabel}>Next Episode</Text>
                      <Text style={upcomingStyles.episodeName}>
                        S{tvShowDetails.next_episode_to_air.season_number}E{tvShowDetails.next_episode_to_air.episode_number}
                        {tvShowDetails.next_episode_to_air.name && tvShowDetails.next_episode_to_air.name !== `Episode ${tvShowDetails.next_episode_to_air.episode_number}`
                          ? `: ${tvShowDetails.next_episode_to_air.name}`
                          : ''}
                      </Text>
                      {tvShowDetails.next_episode_to_air.air_date && (
                        <View style={upcomingStyles.dateRow}>
                          <Clock size={12} color={THEME.textSecondary} />
                          <Text style={upcomingStyles.episodeDate}>
                            {(() => {
                              const airDate = new Date(tvShowDetails.next_episode_to_air.air_date!);
                              const now = new Date();
                              const diffTime = airDate.getTime() - now.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              const formatted = airDate.toLocaleDateString('en-GB', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              });
                              if (diffDays === 0) return `Today — ${formatted}`;
                              if (diffDays === 1) return `Tomorrow — ${formatted}`;
                              if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days — ${formatted}`;
                              return formatted;
                            })()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {!tvShowDetails.next_episode_to_air && tvShowDetails.status === 'Returning Series' && (
                  <View style={upcomingStyles.pendingCard}>
                    <Clock size={16} color={THEME.warning} />
                    <Text style={upcomingStyles.pendingText}>New episodes expected — air date to be announced</Text>
                  </View>
                )}

                <View style={upcomingStyles.statsRow}>
                  <View style={upcomingStyles.statItem}>
                    <Text style={upcomingStyles.statValue}>{tvShowDetails.number_of_seasons}</Text>
                    <Text style={upcomingStyles.statLabel}>{tvShowDetails.number_of_seasons === 1 ? 'Season' : 'Seasons'}</Text>
                  </View>
                  <View style={upcomingStyles.statDivider} />
                  <View style={upcomingStyles.statItem}>
                    <Text style={upcomingStyles.statValue}>{tvShowDetails.number_of_episodes}</Text>
                    <Text style={upcomingStyles.statLabel}>Episodes</Text>
                  </View>
                  {tvShowDetails.seasons.length > 0 && (() => {
                    const latestSeason = tvShowDetails.seasons
                      .filter(s => s.season_number > 0)
                      .sort((a, b) => b.season_number - a.season_number)[0];
                    if (!latestSeason) return null;
                    return (
                      <>
                        <View style={upcomingStyles.statDivider} />
                        <View style={[upcomingStyles.statItem, { flex: 1.5 }]}>
                          <Text style={upcomingStyles.statValue}>S{latestSeason.season_number}</Text>
                          <Text style={upcomingStyles.statLabel} numberOfLines={1}>
                            {latestSeason.episode_count} ep{latestSeason.episode_count !== 1 ? 's' : ''}
                            {latestSeason.air_date ? ` • ${new Date(latestSeason.air_date).getFullYear()}` : ''}
                          </Text>
                        </View>
                      </>
                    );
                  })()}
                </View>
              </View>
            )}

            {mediaType === 'tv' && loadingTvDetails && (
              <View style={upcomingStyles.loadingRow}>
                <ActivityIndicator size="small" color="#00D1FF" />
                <Text style={upcomingStyles.loadingText}>Loading show info...</Text>
              </View>
            )}

            {mediaType === 'tv' && tvShowDetails && (tvShowDetails.status === 'Ended' || tvShowDetails.status === 'Canceled') && (
              <View style={upcomingStyles.endedCard}>
                <View style={upcomingStyles.endedBadge}>
                  <Text style={upcomingStyles.endedBadgeText}>
                    {tvShowDetails.status === 'Ended' ? 'SERIES ENDED' : 'CANCELLED'}
                  </Text>
                </View>
                <View style={upcomingStyles.statsRow}>
                  <View style={upcomingStyles.statItem}>
                    <Text style={upcomingStyles.statValue}>{tvShowDetails.number_of_seasons}</Text>
                    <Text style={upcomingStyles.statLabel}>{tvShowDetails.number_of_seasons === 1 ? 'Season' : 'Seasons'}</Text>
                  </View>
                  <View style={upcomingStyles.statDivider} />
                  <View style={upcomingStyles.statItem}>
                    <Text style={upcomingStyles.statValue}>{tvShowDetails.number_of_episodes}</Text>
                    <Text style={upcomingStyles.statLabel}>Episodes</Text>
                  </View>
                </View>
              </View>
            )}
            
            {mediaType === 'tv' && (
              <View style={styles.notificationSection}>
                <View style={styles.notificationHeader}>
                  <Bell size={20} color={THEME.accent} />
                  <Text style={styles.notificationTitle}>Episode Notifications</Text>
                </View>
                <Text style={styles.notificationDescription}>
                  Get notified when new episodes are released
                </Text>
                
                {trackedShow?.nextEpisode && (
                  <View style={styles.nextEpisodeCard}>
                    <View style={styles.nextEpisodeInfo}>
                      <Text style={styles.nextEpisodeLabel}>Next Episode</Text>
                      <Text style={styles.nextEpisodeName}>
                        S{trackedShow.nextEpisode.seasonNumber}E{trackedShow.nextEpisode.episodeNumber}: {trackedShow.nextEpisode.name}
                      </Text>
                      {trackedShow.nextEpisode.airDate && (
                        <Text style={styles.nextEpisodeDate}>
                          {new Date(trackedShow.nextEpisode.airDate).toLocaleDateString('en-GB', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                      )}
                    </View>
                    {trackedShow.notificationsEnabled && (
                      <View style={styles.notificationBadge}>
                        <BellRing size={14} color={THEME.success} />
                      </View>
                    )}
                  </View>
                )}

                {!trackedShow?.nextEpisode && trackedShow?.showStatus && (
                  <View style={styles.showStatusCard}>
                    <Text style={styles.showStatusText}>
                      {trackedShow.showStatus === 'Returning Series' 
                        ? 'New episodes coming soon' 
                        : trackedShow.showStatus === 'Ended' 
                          ? 'Series has ended'
                          : trackedShow.showStatus}
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={[
                    styles.notificationToggle,
                    trackedShow?.notificationsEnabled && styles.notificationToggleActive
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    onToggleNotifications(!trackedShow?.notificationsEnabled);
                  }}
                  disabled={isTogglingNotifications}
                >
                  {isTogglingNotifications ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : trackedShow?.notificationsEnabled ? (
                    <>
                      <BellRing size={18} color="#FFF" />
                      <Text style={styles.notificationToggleText}>Notifications On</Text>
                    </>
                  ) : (
                    <>
                      <BellOff size={18} color="#FFF" />
                      <Text style={styles.notificationToggleText}>Enable Notifications</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </RNAnimated.ScrollView>

        {showTrailer && trailerKey && (
          <TrailerPlayer
            videoKey={trailerKey}
            onClose={() => setShowTrailer(false)}
          />
        )}
      </View>
    </Modal>
  );
}

export default function ShowsScreen() {
  const appContext = useApp();
  const { user, isInitialized: authInitialized } = useAuth();
  const { confirmDismissYounifyRow, dismissedContinueWatching } = useDismissedContinueWatching(user?.id);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<ShowsSubtab>(
    () => parseShowsSubtabParam(params.tab) ?? 'for-you',
  );

  /** Hand off from My Activity (and deep links): open Streaming / My List / etc. instead of always landing on For You. */
  useFocusEffect(
    useCallback(() => {
      const next = parseShowsSubtabParam(params.tab);
      if (!next) return;
      setSelectedTab(next);
      requestAnimationFrame(() => {
        router.setParams({ tab: undefined });
      });
    }, [params.tab, router]),
  );
  const [selectedStatus, setSelectedStatus] = useState<'all' | Show['status']>('all');

  const [showThumbnails, setShowThumbnails] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [detailModal, setDetailModal] = useState<{
    visible: boolean;
    item: (TMDBMovie | TMDBTVShow) & { media_type?: 'movie' | 'tv' } | null;
    mediaType: 'movie' | 'tv';
  }>({ visible: false, item: null, mediaType: 'movie' });

  const [trackedShowData, setTrackedShowData] = useState<TrackedShow | null>(null);
  const [isCurrentItemLiked, setIsCurrentItemLiked] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState<{ visible: boolean; show: Show | null }>({ visible: false, show: null });
  const [watchProviders, setWatchProviders] = useState<{
    streaming: any[];
    rent: any[];
    buy: any[];
    link?: string;
  } | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [younifyContent, setYounifyContent] = useState<any[]>([]);
  const [younifyLoading, setYounifyLoading] = useState(true);
  const [streamingLoadError, setStreamingLoadError] = useState<string | null>(null);
  const [hasLinkedServices, setHasLinkedServices] = useState(false);
  const [linkedStreamingCount, setLinkedStreamingCount] = useState(0);
  const [linkedProviderIds, setLinkedProviderIds] = useState<number[]>([]);
  const [streamingSections, setStreamingSections] = useState<YounifyBrowseSection[]>([]);
  const [streamingLoading, setStreamingLoading] = useState(false);
  const [streamingInitialized, setStreamingInitialized] = useState(false);
  const [streamingRefreshing, setStreamingRefreshing] = useState(false);
  const [streamingLoadProgress, setStreamingLoadProgress] = useState<YounifyStreamingLoadProgress | null>(
    null,
  );
  const [younifyRuntimeBanner, setYounifyRuntimeBanner] = useState<string | null>(null);
  const younifyFetchInFlightRef = useRef<Promise<void> | null>(null);
  const lastYounifyFetchAtRef = useRef(0);
  /** Refs keep `refetchYounifyStreamingUnified` stable so focus effects do not re-fire on every SDK payload update. */
  const younifyContentRef = useRef<unknown[]>([]);
  const streamingSectionsRef = useRef<YounifyBrowseSection[]>([]);
  const streamingInitializedRef = useRef(false);
  const YOUNIFY_REFETCH_COOLDOWN_MS = 2 * 60 * 1000;
  const younifyEpisodeIndex = useMemo(
    () => buildYounifyProviderIndex(streamingSections, linkedProviderIds),
    [streamingSections, linkedProviderIds],
  );
  const younifyContinueByTmdbId = useMemo(() => {
    const continueSection = streamingSections.find((s) => s.id === 'continue');
    const byTmdb = new Map<number, Record<string, unknown>[]>();
    for (const row of continueSection?.items ?? []) {
      const tmdbId = extractTmdbIdFromYounifyRow(row);
      if (tmdbId == null) continue;
      const list = byTmdb.get(tmdbId) ?? [];
      list.push(row as Record<string, unknown>);
      byTmdb.set(tmdbId, list);
    }
    const map = new Map<number, Record<string, unknown>>();
    for (const [tmdbId, rows] of byTmdb) {
      const best = pickBestYounifyContinueRow(rows, linkedProviderIds);
      if (best) map.set(tmdbId, best);
    }
    return map;
  }, [streamingSections, linkedProviderIds]);

  const streamingSectionsForUi = useMemo(() => {
    if (!dismissedContinueWatching.length) return streamingSections;
    const dismissed = new Set(dismissedContinueWatching);
    return streamingSections.map((section) => {
      if (section.id !== 'continue' || !section.items?.length) return section;
      return {
        ...section,
        items: section.items.filter((row, index) => {
          const key = getYounifyContinueWatchingDismissKey(
            row as Record<string, unknown>,
            `${section.id}-${index}`,
          );
          return !dismissed.has(key);
        }),
      };
    });
  }, [streamingSections, dismissedContinueWatching]);

  useEffect(() => {
    younifyContentRef.current = younifyContent;
  }, [younifyContent]);
  useEffect(() => {
    streamingSectionsRef.current = streamingSections;
  }, [streamingSections]);
  useEffect(() => {
    streamingInitializedRef.current = streamingInitialized;
  }, [streamingInitialized]);

  /** Single SDK round-trip: configure + linked services + one catalog fetch (see `loadYounifyStreamingBundle`). */
  const applyLinkedStreamingServices = useCallback((linkedList: readonly any[]) => {
    setLinkedStreamingCount(linkedList.length);
    setHasLinkedServices(linkedList.length > 0);
    const ids = Array.from(
      new Set(
        linkedList
          .map((service: any) =>
            younifySourceToTmdbProviderId({
              id: String(service?.id ?? ''),
              name: String(service?.name ?? ''),
            }),
          )
          .filter((id: number | null): id is number => id != null),
      ),
    );
    setLinkedProviderIds(ids);
  }, []);

  const refetchYounifyStreamingUnified = useCallback(async (opts?: { force?: boolean; silent?: boolean }) => {
    const force = opts?.force === true;
    const silent = opts?.silent === true;
    const now = Date.now();
    const hasLocalContent =
      younifyContentRef.current.length > 0 ||
      streamingSectionsRef.current.some((s) => Array.isArray(s.items) && s.items.length > 0);

    // Cool down repeated focus events unless explicitly forced.
    if (
      !force &&
      streamingInitializedRef.current &&
      hasLocalContent &&
      now - lastYounifyFetchAtRef.current < YOUNIFY_REFETCH_COOLDOWN_MS
    ) {
      return;
    }

    // Deduplicate concurrent calls from tab-change + focus + auth effects.
    if (younifyFetchInFlightRef.current) {
      return younifyFetchInFlightRef.current;
    }

    const task = (async () => {
      const shouldShowBlockingLoader = !silent && !hasLocalContent;
      const shouldTrackProgress = !hasLocalContent;
      try {
        if (shouldShowBlockingLoader) {
          setYounifyLoading(true);
          setStreamingLoading(true);
        }
        setStreamingLoadError(null);
        if (shouldTrackProgress) {
          setStreamingLoadProgress({ progress: 0.05, label: 'Starting…' });
        }
        const bundle = await loadYounifyStreamingBundle({
          onProgress: shouldTrackProgress
            ? (update) => setStreamingLoadProgress(update)
            : undefined,
          onLinkedServices: (linkedList) => {
            applyLinkedStreamingServices(linkedList);
          },
        });
        applyLinkedStreamingServices(bundle.linkedServices);
        setYounifyContent(Array.isArray(bundle.heroContent) ? bundle.heroContent : []);
        setStreamingSections(Array.isArray(bundle.browseSections) ? bundle.browseSections : []);
        lastYounifyFetchAtRef.current = Date.now();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not load your streaming catalogs';
        setStreamingLoadError(message);
        if (__DEV__) {
          console.warn('Failed to load Younify streaming bundle:', error);
        }
      } finally {
        setYounifyLoading(false);
        setStreamingLoading(false);
        setStreamingInitialized(true);
        setStreamingLoadProgress(null);
        younifyFetchInFlightRef.current = null;
      }
    })();

    younifyFetchInFlightRef.current = task;
    return task;
  }, [applyLinkedStreamingServices]);

  const onStreamingPullRefresh = useCallback(async () => {
    setStreamingRefreshing(true);
    try {
      await refetchYounifyStreamingUnified({ force: true });
    } finally {
      setStreamingRefreshing(false);
    }
  }, [refetchYounifyStreamingUnified]);

  /**
   * Warm the Younify bundle whenever Movies & TV is visible — including on For You — so opening Streaming
   * usually hits cached rows instead of waiting on configure + fetchLinkedServices + fetchContent.
   * Deferred past transitions so the tab bar stays responsive.
   */
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const interactionTask = InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;
        void refetchYounifyStreamingUnified({ silent: true });
      });
      return () => {
        cancelled = true;
        interactionTask.cancel?.();
      };
    }, [refetchYounifyStreamingUnified]),
  );

  /** Account switch: force-refresh linked streaming data for the signed-in user. */
  useEffect(() => {
    if (!authInitialized) return;
    void refetchYounifyStreamingUnified({ force: true, silent: true });
  }, [authInitialized, user?.id, refetchYounifyStreamingUnified]);

  /** When the Streaming subtab is opened, ensure load runs with visible progress if rows are not cached yet. */
  useEffect(() => {
    if (selectedTab !== 'streaming') return;
    const hasLocalContent =
      younifyContentRef.current.length > 0 ||
      streamingSectionsRef.current.some((s) => Array.isArray(s.items) && s.items.length > 0);
    void refetchYounifyStreamingUnified({ silent: hasLocalContent });
  }, [selectedTab, refetchYounifyStreamingUnified]);

  useEffect(() => {
    setYounifyRuntimeBanner(getYounifyRuntimeIssue());
  }, [selectedTab, younifyLoading, streamingLoading, streamingRefreshing]);

  const younifyWatchlistSection = useMemo(
    () => streamingSections.find((s) => s.id === 'watchlist'),
    [streamingSections],
  );

  /** Avoid stripping rows on every focus/tab refetch: `streamingLoading` toggles true while SDK refetches. */
  const hasStreamingBrowseContent = useMemo(
    () => streamingSections.some((s) => Array.isArray(s.items) && s.items.length > 0),
    [streamingSections],
  );

  const heroScrollX = useRef(new RNAnimated.Value(0)).current;
  const forYouScrollY = useRef(new RNAnimated.Value(0)).current;
  const forYouHeroTranslateY = forYouScrollY.interpolate({
    inputRange: [0, 140],
    outputRange: [0, -16],
    extrapolate: 'clamp',
  });
  const forYouHeroScale = forYouScrollY.interpolate({
    inputRange: [0, 140],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });
  const forYouHeroOpacity = forYouScrollY.interpolate({
    inputRange: [0, 140],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });
  const searchInputRef = useRef<TextInput>(null);
  const queryClient = useQueryClient();

  /** TMDB discovery queries — enabled once Shows mounts (For You is the default subtab). */
  const [forYouQueriesEnabled, setForYouQueriesEnabled] = useState(true);
  type ForYouTrendingPopularCache = {
    movies: TMDBMovie[];
    tvShows: TMDBTVShow[];
  };
  const [forYouTrendingPlaceholder, setForYouTrendingPlaceholder] = useState<
    ForYouTrendingPopularCache | undefined
  >(undefined);
  const [forYouPopularPlaceholder, setForYouPopularPlaceholder] = useState<
    ForYouTrendingPopularCache | undefined
  >(undefined);
  const [forYouCacheSavedAt, setForYouCacheSavedAt] = useState<{
    trending?: number;
    popular?: number;
  }>({});

  useEffect(() => {
    const staleMaxAge = 30 * 24 * 60 * 60 * 1000;
    void readDiscoveryCache<ForYouTrendingPopularCache>(
      DISCOVERY_CACHE_KEYS.forYouTrending,
      staleMaxAge,
    ).then((hit) => {
      if (hit?.data) {
        setForYouTrendingPlaceholder(hit.data);
        setForYouCacheSavedAt((prev) => ({ ...prev, trending: hit.savedAt }));
        queryClient.setQueryData(['trending-all'], hit.data);
      }
    });
    void readDiscoveryCache<ForYouTrendingPopularCache>(
      DISCOVERY_CACHE_KEYS.forYouPopular,
      staleMaxAge,
    ).then((hit) => {
      if (hit?.data) {
        setForYouPopularPlaceholder(hit.data);
        setForYouCacheSavedAt((prev) => ({ ...prev, popular: hit.savedAt }));
        queryClient.setQueryData(['popular-all'], hit.data);
      }
    });
  }, [queryClient]);

  useEffect(() => {
    if (selectedTab === 'for-you' || selectedTab === 'streaming') {
      setForYouQueriesEnabled(true);
    }
  }, [selectedTab]);

  useFocusEffect(
    useCallback(() => {
      if (selectedTab === 'for-you' || selectedTab === 'streaming') {
        setForYouQueriesEnabled(true);
        return;
      }
      let timer: ReturnType<typeof setTimeout> | null = null;
      const interactionTask = InteractionManager.runAfterInteractions(() => {
        timer = setTimeout(() => setForYouQueriesEnabled(true), 1500);
      });
      return () => {
        interactionTask.cancel?.();
        if (timer) clearTimeout(timer);
      };
    }, [selectedTab]),
  );

  const forYouQueryOptions = {
    enabled: forYouQueriesEnabled,
    staleTime: 1000 * 60 * 30,
    retry: 2,
    retryDelay: (attempt: number) => Math.min(800 * 2 ** attempt, 4000),
  };

  const trendingQuery = useQuery({
    queryKey: ['trending-all'],
    queryFn: fetchForYouTrendingPopular,
    placeholderData: forYouTrendingPlaceholder,
    ...forYouQueryOptions,
  });

  const popularQuery = useQuery({
    queryKey: ['popular-all'],
    queryFn: fetchForYouPopular,
    placeholderData: forYouPopularPlaceholder,
    ...forYouQueryOptions,
  });

  const topRatedQuery = useQuery({
    queryKey: ['top-rated-all'],
    queryFn: async () => {
      const [moviesResult, tvResult] = await Promise.allSettled([
        tmdbApi.getTopRatedMovies(),
        tmdbApi.getTopRatedTVShows(),
      ]);
      return {
        movies: moviesResult.status === 'fulfilled' ? moviesResult.value.results : [],
        tvShows: tvResult.status === 'fulfilled' ? tvResult.value.results : [],
      };
    },
    ...forYouQueryOptions,
  });

  const { profile } = useUserProfile();
  const nationalitySignals = useMemo(() => getNationalitySignals(profile), [profile]);
  const userCountryCode = useMemo(() => {
    if (nationalitySignals.primaryCode) return nationalitySignals.primaryCode;
    if (profile?.favoriteCountries && profile.favoriteCountries.length > 0) {
      return profile.favoriteCountries[0].code;
    }
    return null;
  }, [profile?.favoriteCountries, nationalitySignals.primaryCode]);

  const userCountryName = useMemo(() => {
    if (nationalitySignals.primaryName) return nationalitySignals.primaryName;
    if (profile?.favoriteCountries && profile.favoriteCountries.length > 0) {
      return profile.favoriteCountries[0].name;
    }
    return null;
  }, [profile?.favoriteCountries, nationalitySignals.primaryName]);

  const regionTrendingQuery = useQuery({
    queryKey: ['region-trending', userCountryCode],
    queryFn: async () => {
      if (!userCountryCode) return null;
      const [moviesResult, tvResult] = await Promise.allSettled([
        tmdbApi.getTrendingMoviesByRegion(userCountryCode, 'week'),
        tmdbApi.getTrendingTVShowsByRegion(userCountryCode, 'week'),
      ]);
      return {
        movies: moviesResult.status === 'fulfilled' ? moviesResult.value.results : [],
        tvShows: tvResult.status === 'fulfilled' ? tvResult.value.results : [],
      };
    },
    enabled: forYouQueriesEnabled && !!userCountryCode,
    staleTime: 1000 * 60 * 30,
  });

  const nowPlayingQuery = useQuery({
    queryKey: ['now-playing-movies'],
    queryFn: async () => {
      const movies = await tmdbApi.getNowPlayingMovies();
      return movies.results;
    },
    ...forYouQueryOptions,
  });

  const airingTodayQuery = useQuery({
    queryKey: ['airing-today-tv'],
    queryFn: async () => {
      const tvShows = await tmdbApi.getAiringTodayTVShows();
      return tvShows.results;
    },
    ...forYouQueryOptions,
  });

  interface TVShowWithEpisode {
    show: TMDBTVShow;
    details: TMDBTVShowDetails;
    latestEpisode: TMDBEpisode;
    availableProviderIds: number[];
  }

  const newEpisodesQuery = useQuery({
    queryKey: ['new-episodes-enriched', userCountryCode],
    enabled: forYouQueriesEnabled,
    queryFn: async () => {
      const airingToday = await tmdbApi.getAiringTodayTVShows();
      const onTheAirResults = await queryClient.fetchQuery({
        queryKey: ['on-the-air-tv'],
        queryFn: async () => {
          const tvShows = await tmdbApi.getOnTheAirTVShows();
          return tvShows.results;
        },
        staleTime: 1000 * 60 * 30,
      });
      const combined = [...airingToday.results.slice(0, 10), ...onTheAirResults.slice(0, 10)];
      const uniqueShows = combined.filter((show, idx, arr) => arr.findIndex(s => s.id === show.id) === idx).slice(0, 15);

      const enriched: TVShowWithEpisode[] = [];
      const detailPromises = uniqueShows.map(async (show) => {
        try {
          const [details, watchProviders] = await Promise.all([
            tmdbApi.getTVShowDetails(show.id),
            tmdbApi.getTVWatchProviders(show.id),
          ]);
          const ep = details.last_episode_to_air;
          if (ep) {
            const country = userCountryCode || 'US';
            const countryProviders =
              watchProviders?.results?.[country] ||
              watchProviders?.results?.US ||
              watchProviders?.results?.GB ||
              watchProviders?.results?.CA ||
              null;
            const availableProviderIds = Array.isArray(countryProviders?.flatrate)
              ? countryProviders!.flatrate!.map((p: any) => Number(p?.provider_id)).filter((n: number) => Number.isFinite(n))
              : [];
            enriched.push({ show, details, latestEpisode: ep, availableProviderIds });
          }
        } catch (err) {
          if (__DEV__) console.warn('Failed to enrich show', show.name, err);
        }
      });
      await Promise.all(detailPromises);

      enriched.sort((a, b) => {
        const dateA = a.latestEpisode.air_date || '';
        const dateB = b.latestEpisode.air_date || '';
        return dateB.localeCompare(dateA);
      });

      if (__DEV__) console.log('📺 Enriched', enriched.length, 'shows with latest episode data');
      return enriched;
    },
    staleTime: 1000 * 60 * 30,
  });

  const onTheAirQuery = useQuery({
    queryKey: ['on-the-air-tv'],
    queryFn: async () => {
      const tvShows = await tmdbApi.getOnTheAirTVShows();
      return tvShows.results;
    },
    ...forYouQueryOptions,
  });

  const upcomingMoviesQuery = useQuery({
    queryKey: ['upcoming-movies'],
    queryFn: async () => {
      const movies = await tmdbApi.getUpcomingMovies();
      return movies.results;
    },
    ...forYouQueryOptions,
  });

  const searchResultsQuery = useQuery({
    queryKey: ['search-shows', searchQuery],
    queryFn: () => tmdbApi.searchMulti(searchQuery),
    enabled: searchQuery.length > 2,
    staleTime: 1000 * 60 * 5,
  });
  
  const shows = useMemo(() => appContext?.shows ?? [], [appContext?.shows]);
  const addShow = appContext?.addShow;
  const updateShow = appContext?.updateShow;
  const markEpisodeWatched = appContext?.markEpisodeWatched;
  const deleteShow = appContext?.deleteShow;

  /** Pull real season/episode from linked streaming "Continue watching" into local list rows. */
  useEffect(() => {
    if (!updateShow || younifyContinueByTmdbId.size === 0) return;

    for (const show of shows) {
      if (show.type !== 'Series' || show.tmdbId == null) continue;
      const row = younifyContinueByTmdbId.get(show.tmdbId);
      if (!row) continue;
      const progress = readSeasonEpisodeFromYounifyRow(row);
      if (!progress) continue;
      if (show.currentSeason === progress.season && show.currentEpisode === progress.episode) continue;

      updateShow({
        ...show,
        currentSeason: progress.season,
        currentEpisode: progress.episode,
        status: show.status === 'Plan to Watch' ? 'Watching' : show.status,
      });
    }
  }, [shows, updateShow, younifyContinueByTmdbId]);

  // Fetch thumbnails for all shows with tmdbId when component loads or shows change
  React.useEffect(() => {
    const fetchAllThumbnails = async () => {
      const showsNeedingThumbnails = shows.filter(
        (show) => show.tmdbId && show.mediaType && !showThumbnails[show.id]
      );

      if (showsNeedingThumbnails.length === 0) return;

      if (__DEV__) console.log('📺 Fetching thumbnails for', showsNeedingThumbnails.length, 'shows');

      const thumbnailPromises = showsNeedingThumbnails.map(async (show) => {
        try {
          if (show.mediaType === 'movie') {
            const details = await tmdbApi.getMovieDetails(show.tmdbId!);
            return { id: show.id, url: tmdbApi.getImageUrl(details.poster_path) };
          } else {
            const details = await tmdbApi.getTVShowDetails(show.tmdbId!);
            return { id: show.id, url: tmdbApi.getImageUrl(details.poster_path) };
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('Failed to fetch thumbnail for', show.title, error);
          }
          return { id: show.id, url: null };
        }
      });

      const results = await Promise.all(thumbnailPromises);
      const newThumbnails: Record<string, string> = {};
      results.forEach((result) => {
        if (result.url) {
          newThumbnails[result.id] = result.url;
        }
      });

      if (Object.keys(newThumbnails).length > 0) {
        setShowThumbnails((prev) => ({ ...prev, ...newThumbnails }));
        if (__DEV__) console.log('✅ Loaded thumbnails for', Object.keys(newThumbnails).length, 'shows');
      }
    };

    void fetchAllThumbnails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shows.length]);

  const { refetch: refetchTrending } = trendingQuery;
  const { refetch: refetchPopular } = popularQuery;
  const { refetch: refetchTopRated } = topRatedQuery;
  const { refetch: refetchNowPlaying } = nowPlayingQuery;
  const { refetch: refetchAiringToday } = airingTodayQuery;
  const { refetch: refetchOnTheAir } = onTheAirQuery;
  const { refetch: refetchUpcoming } = upcomingMoviesQuery;
  const { refetch: refetchNewEpisodes } = newEpisodesQuery;
  const { refetch: refetchRegionTrending } = regionTrendingQuery;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const tasks: Promise<unknown>[] = [];
    if (forYouQueriesEnabled || selectedTab === 'for-you') {
      tasks.push(
        refetchTrending(),
        refetchPopular(),
        refetchTopRated(),
        refetchNowPlaying(),
        refetchAiringToday(),
        refetchOnTheAir(),
        refetchUpcoming(),
        refetchNewEpisodes(),
        refetchRegionTrending(),
      );
    }
    if (selectedTab === 'streaming' || selectedTab === 'watchlist') {
      tasks.push(refetchYounifyStreamingUnified());
    }
    await Promise.all(tasks);
    setRefreshing(false);
  }, [
    forYouQueriesEnabled,
    selectedTab,
    refetchTrending,
    refetchPopular,
    refetchTopRated,
    refetchNowPlaying,
    refetchAiringToday,
    refetchOnTheAir,
    refetchUpcoming,
    refetchNewEpisodes,
    refetchRegionTrending,
    refetchYounifyStreamingUnified,
  ]);

  const continueWatchingRows = useMemo(
    () => streamingSections.find((s) => s.id === 'continue')?.items ?? [],
    [streamingSections],
  );

  const younifyLinkedTmdbIds = useMemo(
    () => collectYounifyLinkedTmdbIds(younifyContent, continueWatchingRows),
    [younifyContent, continueWatchingRows],
  );

  const forYouPersonalization = useMemo(() => {
    const regionMovies =
      regionTrendingQuery.data?.movies?.slice(0, 8).map((m) => toForYouMediaItem(m, 'movie', 'region')) ?? [];
    const regionTv =
      regionTrendingQuery.data?.tvShows?.slice(0, 8).map((s) => toForYouMediaItem(s, 'tv', 'region')) ?? [];
    const trendingMovies =
      trendingQuery.data?.movies?.slice(0, 8).map((m) => toForYouMediaItem(m, 'movie', 'trending')) ?? [];
    const trendingTv =
      trendingQuery.data?.tvShows?.slice(0, 8).map((s) => toForYouMediaItem(s, 'tv', 'trending')) ?? [];
    const heroCandidates = buildForYouHeroCandidates({
      regionMovies,
      regionTv,
      trendingMovies,
      trendingTv,
    });
    const regionalTmdbIds = [
      ...(regionTrendingQuery.data?.movies?.map((m) => m.id) ?? []),
      ...(regionTrendingQuery.data?.tvShows?.map((s) => s.id) ?? []),
    ];
    return buildForYouPersonalizationContext({
      savedTmdbIds: shows.filter((s) => s.tmdbId != null).map((s) => s.tmdbId!),
      continueWatchingTmdbIds: [...younifyContinueByTmdbId.keys()],
      younifyLinkedTmdbIds: [...younifyLinkedTmdbIds],
      regionalTmdbIds,
      heroCandidates,
    });
  }, [
    regionTrendingQuery.data,
    trendingQuery.data,
    shows,
    younifyContinueByTmdbId,
    younifyLinkedTmdbIds,
  ]);

  const heroStreamingContent = useMemo(() => {
    if (!hasLinkedServices) return [];
    return buildStreamingHeroRecommendations(
      streamingSections,
      linkedProviderIds,
      forYouPersonalization,
      { minItems: STREAMING_HERO_MIN_ITEMS, maxItems: 12 },
    );
  }, [
    hasLinkedServices,
    streamingSections,
    linkedProviderIds,
    forYouPersonalization,
  ]);

  const heroItems = useMemo(() => {
    const regionMovies =
      regionTrendingQuery.data?.movies?.slice(0, 8).map((m) => toForYouMediaItem(m, 'movie', 'region')) ?? [];
    const regionTv =
      regionTrendingQuery.data?.tvShows?.slice(0, 8).map((s) => toForYouMediaItem(s, 'tv', 'region')) ?? [];
    const trendingMovies =
      trendingQuery.data?.movies?.slice(0, 8).map((m) => toForYouMediaItem(m, 'movie', 'trending')) ?? [];
    const trendingTv =
      trendingQuery.data?.tvShows?.slice(0, 8).map((s) => toForYouMediaItem(s, 'tv', 'trending')) ?? [];
    const popularMovies =
      popularQuery.data?.movies?.slice(0, 8).map((m) => toForYouMediaItem(m, 'movie', 'popular')) ?? [];
    const popularTv =
      popularQuery.data?.tvShows?.slice(0, 8).map((s) => toForYouMediaItem(s, 'tv', 'popular')) ?? [];

    let candidates = buildForYouHeroCandidates({
      regionMovies,
      regionTv,
      trendingMovies,
      trendingTv,
    });

    if (!candidates.length) {
      candidates = buildForYouHeroCandidates({
        trendingMovies: popularMovies,
        trendingTv: popularTv,
      });
    }

    if (!candidates.length) {
      const nowMovies =
        nowPlayingQuery.data?.slice(0, 8).map((m) => toForYouMediaItem(m, 'movie', 'now-playing')) ?? [];
      const onAirTv =
        onTheAirQuery.data?.slice(0, 8).map((s) => toForYouMediaItem(s, 'tv', 'on-the-air')) ?? [];
      candidates = buildForYouHeroCandidates({
        trendingMovies: nowMovies,
        trendingTv: onAirTv,
      });
    } else if (candidates.length < 6) {
      const seen = new Set(candidates.map((c) => c.id));
      for (const item of buildForYouHeroCandidates({
        trendingMovies: popularMovies,
        trendingTv: popularTv,
      })) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        candidates.push(item);
      }
    }

    if (!candidates.length) return [];

    return pickForYouHeroItems(candidates, forYouPersonalization, 6);
  }, [
    regionTrendingQuery.data,
    trendingQuery.data,
    popularQuery.data,
    nowPlayingQuery.data,
    onTheAirQuery.data,
    forYouPersonalization,
  ]);

  /** One pass in on-screen order so hero + each rail gets distinct titles (TMDB lists overlap heavily). */
  const forYouUniqueRails = useMemo(() => {
    const used = new Set<string>();
    for (const item of heroItems ?? []) {
      used.add(forYouItemKey(item));
    }
    const ctx = forYouPersonalization;
    const take = <T extends { id: number }>(
      items: readonly T[],
      mediaType: 'movie' | 'tv',
      source: ForYouCandidateSource,
      limit = 15,
    ) => takeUniqueForYouRailItems(items, mediaType, source, ctx, used, limit);

    return {
      trendingMovies: take(trendingQuery.data?.movies ?? [], 'movie', 'trending'),
      regionMovies: take(regionTrendingQuery.data?.movies ?? [], 'movie', 'region', 10),
      regionTv: take(regionTrendingQuery.data?.tvShows ?? [], 'tv', 'region', 10),
      nowPlaying: take(nowPlayingQuery.data ?? [], 'movie', 'now-playing'),
      onTheAir: take(onTheAirQuery.data ?? [], 'tv', 'on-the-air'),
      upcoming: take(upcomingMoviesQuery.data ?? [], 'movie', 'upcoming'),
      popularMovies: take(popularQuery.data?.movies ?? [], 'movie', 'popular'),
      popularTv: take(popularQuery.data?.tvShows ?? [], 'tv', 'popular'),
      topRatedMovies: take(topRatedQuery.data?.movies ?? [], 'movie', 'top-rated'),
      topRatedTv: take(topRatedQuery.data?.tvShows ?? [], 'tv', 'top-rated'),
    };
  }, [
    heroItems,
    forYouPersonalization,
    trendingQuery.data?.movies,
    regionTrendingQuery.data?.movies,
    regionTrendingQuery.data?.tvShows,
    nowPlayingQuery.data,
    onTheAirQuery.data,
    upcomingMoviesQuery.data,
    popularQuery.data?.movies,
    popularQuery.data?.tvShows,
    topRatedQuery.data?.movies,
    topRatedQuery.data?.tvShows,
  ]);

  const hasAnyForYouMovieContent = useMemo(() => {
    const moviePools = [
      trendingQuery.data?.movies,
      regionTrendingQuery.data?.movies,
      nowPlayingQuery.data,
      upcomingMoviesQuery.data,
      popularQuery.data?.movies,
      topRatedQuery.data?.movies,
      trendingQuery.data?.tvShows,
      popularQuery.data?.tvShows,
      onTheAirQuery.data,
    ];
    return moviePools.some((pool) => Array.isArray(pool) && pool.length > 0);
  }, [
    trendingQuery.data?.movies,
    trendingQuery.data?.tvShows,
    regionTrendingQuery.data?.movies,
    nowPlayingQuery.data,
    upcomingMoviesQuery.data,
    popularQuery.data?.movies,
    popularQuery.data?.tvShows,
    topRatedQuery.data?.movies,
    onTheAirQuery.data,
  ]);

  const forYouHeroLoading =
    forYouQueriesEnabled &&
    heroItems.length === 0 &&
    (trendingQuery.isFetching || popularQuery.isFetching) &&
    !forYouDiscoveryHasItems(trendingQuery.data) &&
    !forYouDiscoveryHasItems(popularQuery.data) &&
    !(nowPlayingQuery.data?.length || onTheAirQuery.data?.length);

  const forYouFeedStillLoading =
    forYouQueriesEnabled &&
    !hasAnyForYouMovieContent &&
    (trendingQuery.isFetching ||
      popularQuery.isFetching ||
      nowPlayingQuery.isFetching ||
      onTheAirQuery.isFetching ||
      topRatedQuery.isFetching);

  const forYouUsingStaleCache =
    forYouQueriesEnabled &&
    (trendingQuery.isError || popularQuery.isError) &&
    (trendingQuery.isPlaceholderData || popularQuery.isPlaceholderData);

  const forYouOfflineDetail = useMemo(() => {
    const ages = [
      trendingQuery.isPlaceholderData && forYouCacheSavedAt.trending
        ? formatCacheAgeLabel(forYouCacheSavedAt.trending)
        : null,
      popularQuery.isPlaceholderData && forYouCacheSavedAt.popular
        ? formatCacheAgeLabel(forYouCacheSavedAt.popular)
        : null,
    ].filter(Boolean);
    if (ages.length === 0) return undefined;
    return `Showing saved picks from ${ages[0]}${ages.length > 1 ? `–${ages[ages.length - 1]}` : ''}.`;
  }, [
    forYouCacheSavedAt.popular,
    forYouCacheSavedAt.trending,
    popularQuery.isPlaceholderData,
    trendingQuery.isPlaceholderData,
  ]);

  useEffect(() => {
    const data = trendingQuery.data;
    if (!data || trendingQuery.isPlaceholderData) return;
    if ((data.movies?.length ?? 0) + (data.tvShows?.length ?? 0) === 0) return;
    void writeDiscoveryCache(DISCOVERY_CACHE_KEYS.forYouTrending, data);
  }, [trendingQuery.data, trendingQuery.isPlaceholderData]);

  useEffect(() => {
    const data = popularQuery.data;
    if (!data || popularQuery.isPlaceholderData) return;
    if ((data.movies?.length ?? 0) + (data.tvShows?.length ?? 0) === 0) return;
    void writeDiscoveryCache(DISCOVERY_CACHE_KEYS.forYouPopular, data);
  }, [popularQuery.data, popularQuery.isPlaceholderData]);

  useEffect(() => {
    logForYouFeedDiagnostic({
      heroCount: heroItems.length,
      hasAnyContent: hasAnyForYouMovieContent,
      trendingError: trendingQuery.isError,
      popularError: popularQuery.isError,
      usingCachedTrending: trendingQuery.isPlaceholderData && trendingQuery.isError,
      usingCachedPopular: popularQuery.isPlaceholderData && popularQuery.isError,
    });
  }, [
    hasAnyForYouMovieContent,
    heroItems.length,
    popularQuery.isError,
    popularQuery.isPlaceholderData,
    trendingQuery.isError,
    trendingQuery.isPlaceholderData,
  ]);

  useEffect(() => {
    if (!streamingInitialized || younifyLoading) return;
    const sectionItemCounts = Object.fromEntries(
      streamingSections.map((section) => [section.id, section.items?.length ?? 0]),
    );
    logStreamingHeroDiagnostic({
      linkedProviderCount: linkedStreamingCount,
      sectionIds: streamingSections.map((s) => s.id),
      sectionItemCounts,
      heroCount: heroStreamingContent.length,
      younifyLoading,
      streamingInitialized,
      errorMessage: streamingLoadError,
    });
  }, [
    heroStreamingContent.length,
    linkedStreamingCount,
    streamingInitialized,
    streamingLoadError,
    streamingSections,
    younifyLoading,
  ]);

  const filteredShows = useMemo(() => {
    let filtered = shows;
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(s => s.status === selectedStatus);
    }
    return filtered;
  }, [shows, selectedStatus]);

  const groupedShows = useMemo(() => {
    const watching = shows.filter(s => s.status === 'Watching');
    const planToWatch = shows.filter(s => s.status === 'Plan to Watch');
    const completed = shows.filter(s => s.status === 'Completed');
    const onHold = shows.filter(s => s.status === 'On Hold');
    return { watching, planToWatch, completed, onHold };
  }, [shows]);

  const isInList = useCallback((itemId: number, type: 'movie' | 'tv') => {
    return shows.some(show => show.tmdbId === itemId && show.mediaType === type);
  }, [shows]);

  const handleAddFromTMDB = useCallback((item: any, type: 'movie' | 'tv', startWatching: boolean = false) => {
    if (!addShow) return;

    const tmdbId =
      typeof item?.id === 'number' && Number.isFinite(item.id)
        ? item.id
        : Number(item?.id);
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      Alert.alert('Cannot add title', 'Missing catalog id for this title. Try opening it again or add it from search.');
      return;
    }

    const rawTitle = type === 'movie' ? item?.title : item?.name;
    const title =
      typeof rawTitle === 'string' && rawTitle.trim().length > 0 ? rawTitle.trim() : 'Untitled';
    
    const exists = shows.some(show => show.tmdbId === tmdbId && show.mediaType === type);
    
    if (exists) {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      Alert.alert('Already Added', 'This title is already in your list.');
      return;
    }
    
    const showData: NewShowFormData = {
      title,
      platform: 'Other',
      type: type === 'movie' ? 'Movie' : 'Series',
      tmdbId,
      mediaType: type,
      status: startWatching ? 'Watching' : 'Plan to Watch',
    };
    
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    addShow(showData);
    setDetailModal({ visible: false, item: null, mediaType: 'movie' });
    
    const posterUrl = tmdbApi.getImageUrl(item.poster_path);
    if (posterUrl) {
      setTimeout(() => {
        const newShow = shows[shows.length - 1];
        if (newShow) {
          setShowThumbnails(prev => ({ ...prev, [newShow.id]: posterUrl }));
        }
      }, 100);
    }
  }, [shows, addShow]);

  const handleItemPress = useCallback(async (item: TMDBMovie | TMDBTVShow, mediaType: 'movie' | 'tv') => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDetailModal({ visible: true, item: { ...item, media_type: mediaType }, mediaType });
    
    const liked = await likedContentService.isLiked(item.id, mediaType);
    setIsCurrentItemLiked(liked);
    
    if (mediaType === 'tv') {
      const tracked = await episodeNotificationService.getTrackedShow(item.id);
      setTrackedShowData(tracked);
    } else {
      setTrackedShowData(null);
    }
  }, []);

  /** Resolve a Younify browse / hero row to TMDB and open the same detail modal as For You. */
  const handleYounifyRowOpenDetails = useCallback(
    async (row: Record<string, unknown>) => {
      try {
        const resolved = await resolveTmdbDetailsForYounifyRow(row);
        if (resolved) {
          handleItemPress(resolved.details, resolved.mediaType);
          return;
        }
      } catch (e) {
        if (__DEV__) console.warn('[Shows] Younify row → detail modal failed', e);
      }
    },
    [handleItemPress],
  );

  const handleToggleLike = useCallback(async () => {
    if (!detailModal.item) return;
    const item = detailModal.item;
    const mediaType = detailModal.mediaType;
    const title = mediaType === 'movie' ? (item as TMDBMovie).title : (item as TMDBTVShow).name;

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const nowLiked = await likedContentService.toggleLike({
      id: item.id,
      mediaType,
      title,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      genre_ids: item.genre_ids,
      vote_average: item.vote_average,
      overview: item.overview,
    });
    setIsCurrentItemLiked(nowLiked);
  }, [detailModal.item, detailModal.mediaType]);

  const handleShare = useCallback(async () => {
    if (!detailModal.item) return;
    const item = detailModal.item;
    const mediaType = detailModal.mediaType;
    const title = mediaType === 'movie' ? (item as TMDBMovie).title : (item as TMDBTVShow).name;
    const releaseDate = mediaType === 'movie' ? (item as TMDBMovie).release_date : (item as TMDBTVShow).first_air_date;
    const year = releaseDate ? releaseDate.split('-')[0] : '';
    const rating = formatRating(item.vote_average);
    const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${item.id}`;

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await Share.share({
        title: title,
        message: `Check out "${title}"${year ? ` (${year})` : ''} — rated ${rating}/10\n\n${item.overview ? item.overview.slice(0, 150) + '...' : ''}\n\n${tmdbUrl}`,
        url: tmdbUrl,
      });
      console.log('📤 Shared:', title);
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [detailModal.item, detailModal.mediaType]);

  const toggleNotificationsMutation = useMutation({
    mutationFn: async ({ tmdbId, title, posterPath, enable }: { tmdbId: number; title: string; posterPath: string | null; enable: boolean }) => {
      if (enable) {
        const result = await episodeNotificationService.addTrackedShow(tmdbId, title, posterPath);
        return result;
      } else {
        await episodeNotificationService.toggleNotifications(tmdbId, false);
        return await episodeNotificationService.getTrackedShow(tmdbId);
      }
    },
    onSuccess: (data) => {
      setTrackedShowData(data);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const { mutate: toggleNotifications } = toggleNotificationsMutation;

  const handleToggleNotifications = useCallback((enable: boolean) => {
    if (!detailModal.item || detailModal.mediaType !== 'tv') return;
    
    const title = (detailModal.item as TMDBTVShow).name;
    toggleNotifications({
      tmdbId: detailModal.item.id,
      title,
      posterPath: detailModal.item.poster_path,
      enable,
    });
  }, [detailModal.item, detailModal.mediaType, toggleNotifications]);

  const handleDeleteShow = useCallback((showId: string) => {
    if (!deleteShow) return;
    Alert.alert(
      'Remove from List',
      'Are you sure you want to remove this from your list?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            if (Platform.OS !== 'web') {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            deleteShow(showId);
          }
        }
      ]
    );
  }, [deleteShow]);

  const renderHeroItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const title = item.media_type === 'movie' ? item.title : item.name;
    const backdropUrl = tmdbApi.getImageUrl(item.backdrop_path, 'w780');
    const genres = getGenreNames(item.genre_ids || [], item.media_type === 'tv');
    
    const inputRange = [
      (index - 1) * screenWidth,
      index * screenWidth,
      (index + 1) * screenWidth,
    ];
    
    const scale = heroScrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });
    
    return (
      <RNAnimated.View style={[styles.heroSlide, { transform: [{ scale }] }]}>
        <Pressable 
          style={styles.heroSlideInner}
          onPress={() => handleItemPress(item, item.media_type)}
        >
          {backdropUrl ? (
            <Image source={{ uri: backdropUrl }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: THEME.surfaceLight }]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(10,10,15,0.6)', 'rgba(10,10,15,0.95)']}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroTopBadge}>
              <Sparkles size={12} color={THEME.accent} />
              <Text style={styles.heroTopBadgeText}>FOR YOU</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroRating}>
                <Star size={14} color={THEME.accent} fill={THEME.accent} />
                <Text style={styles.heroRatingText}>{formatRating(item.vote_average)}</Text>
              </View>
              <Text style={styles.heroGenres}>{genres.slice(0, 2).join(' • ')}</Text>
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity 
                style={styles.heroPlayButton}
                onPress={() => handleItemPress(item, item.media_type)}
              >
                <Info size={18} color="#FFF" />
                <Text style={styles.heroPlayText}>More Info</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.heroAddButton}
                onPress={() => handleAddFromTMDB(item, item.media_type)}
              >
                {isInList(item.id, item.media_type) ? (
                  <Check size={20} color={THEME.success} />
                ) : (
                  <Plus size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </RNAnimated.View>
    );
  }, [heroScrollX, handleItemPress, handleAddFromTMDB, isInList]);

  const renderContentCard = useCallback(({ item, mediaType }: { item: TMDBMovie | TMDBTVShow; mediaType: 'movie' | 'tv' }) => {
    const title = mediaType === 'movie' ? (item as TMDBMovie).title : (item as TMDBTVShow).name;
    const posterUrl = tmdbApi.getImageUrl(item.poster_path);
    const inUserList = isInList(item.id, mediaType);
    
    return (
      <Pressable 
        style={styles.contentCard} 
        onPress={() => handleItemPress(item, mediaType)}
      >
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.contentPoster} />
        ) : (
          <View style={[styles.contentPoster, styles.contentPosterPlaceholder]}>
            {mediaType === 'movie' ? <Film size={24} color={THEME.textMuted} /> : <Tv size={24} color={THEME.textMuted} />}
          </View>
        )}
        {inUserList && (
          <View style={styles.contentInListBadge}>
            <Check size={10} color="#FFF" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.contentCardGradient}
        />
        <View style={styles.contentCardInfo}>
          <Text style={styles.contentTitle} numberOfLines={2}>{title}</Text>
          <View style={styles.contentMeta}>
            <Star size={10} color={THEME.accent} fill={THEME.accent} />
            <Text style={styles.contentRating}>{formatRating(item.vote_average)}</Text>
          </View>
        </View>
      </Pressable>
    );
  }, [handleItemPress, isInList]);

  const renderLargeCard = useCallback(({ item, mediaType }: { item: TMDBMovie | TMDBTVShow; mediaType: 'movie' | 'tv' }) => {
    const title = mediaType === 'movie' ? (item as TMDBMovie).title : (item as TMDBTVShow).name;
    const backdropUrl = tmdbApi.getImageUrl(item.backdrop_path, 'w780');
    const releaseDate = mediaType === 'movie' ? (item as TMDBMovie).release_date : (item as TMDBTVShow).first_air_date;
    const genres = getGenreNames(item.genre_ids || [], mediaType === 'tv');
    
    return (
      <Pressable 
        style={styles.largeCard}
        onPress={() => handleItemPress(item, mediaType)}
      >
        {backdropUrl ? (
          <Image source={{ uri: backdropUrl }} style={styles.largeCardImage} />
        ) : (
          <View style={[styles.largeCardImage, { backgroundColor: THEME.surfaceLight }]} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.largeCardGradient}
        />
        <View style={styles.largeCardContent}>
          <View style={styles.largeCardBadge}>
            <Text style={styles.largeCardBadgeText}>{mediaType === 'movie' ? 'MOVIE' : 'TV SERIES'}</Text>
          </View>
          <Text style={styles.largeCardTitle} numberOfLines={2}>{title}</Text>
          <View style={styles.largeCardMeta}>
            <View style={styles.largeCardRating}>
              <Star size={12} color={THEME.accent} fill={THEME.accent} />
              <Text style={styles.largeCardRatingText}>{formatRating(item.vote_average)}</Text>
            </View>
            <Text style={styles.largeCardYear}>{formatReleaseDate(releaseDate)}</Text>
          </View>
          {genres.length > 0 && (
            <Text style={styles.largeCardGenres} numberOfLines={1}>{genres.slice(0, 2).join(' • ')}</Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.largeCardAdd}
          onPress={(e) => {
            e.stopPropagation();
            handleAddFromTMDB(item, mediaType);
          }}
        >
          {isInList(item.id, mediaType) ? (
            <Check size={18} color={THEME.success} />
          ) : (
            <Plus size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </Pressable>
    );
  }, [handleItemPress, handleAddFromTMDB, isInList]);

  const handleChangeStatus = useCallback((show: Show, newStatus: Show['status']) => {
    if (!updateShow) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    updateShow({ ...show, status: newStatus });
    setShowStatusModal({ visible: false, show: null });
    setWatchProviders(null);
  }, [updateShow]);

  // Fetch watch providers when status modal opens
  React.useEffect(() => {
    const fetchWatchProviders = async () => {
      const show = showStatusModal.show;
      if (!show?.tmdbId || !show?.mediaType) {
        setWatchProviders(null);
        return;
      }

      setLoadingProviders(true);
      try {
        const providers = await tmdbApi.getWatchProviders(show.tmdbId, show.mediaType);
        // Try GB (UK) first, then fall back to US
        const ukProviders = providers.results?.GB;
        const usProviders = providers.results?.US;
        const countryProviders = ukProviders || usProviders;
        
        if (countryProviders) {
          setWatchProviders({
            streaming: countryProviders.flatrate || [],
            rent: countryProviders.rent || [],
            buy: countryProviders.buy || [],
            link: countryProviders.link,
          });
          if (__DEV__) console.log('📺 Watch providers loaded');
        } else {
          setWatchProviders(null);
          if (__DEV__) console.log('⚠️ No watch providers available');
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to fetch watch providers:', error);
        setWatchProviders(null);
      } finally {
        setLoadingProviders(false);
      }
    };

    if (showStatusModal.visible && showStatusModal.show) {
      void fetchWatchProviders();
    }
  }, [showStatusModal.visible, showStatusModal.show?.tmdbId, showStatusModal.show]);

  const renderMyListCard = useCallback(({ item }: { item: Show }) => {
    const thumbnailUrl = showThumbnails[item.id];
    const platformData = PLATFORMS.find(p => p.id === item.platform);
    const younifyRow = item.tmdbId != null ? younifyContinueByTmdbId.get(item.tmdbId) : undefined;
    const episodeLabel = formatShowEpisodeLabel(item, younifyRow, 'bullet');
    
    return (
      <Pressable 
        style={styles.myListCard}
        onPress={async () => {
          if (Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          setShowStatusModal({ visible: true, show: item });
        }}
        onLongPress={() => handleDeleteShow(item.id)}
      >
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.myListPoster} />
        ) : (
          <View style={[styles.myListPoster, styles.myListPosterPlaceholder]}>
            {item.type === 'Series' ? <Tv size={28} color={THEME.textMuted} /> : <Film size={28} color={THEME.textMuted} />}
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.myListCardGradient}
        />
        <View style={styles.myListCardContent}>
          <View style={[styles.myListPlatformBadge, { backgroundColor: platformData?.color || THEME.surface }]}>
            <Text style={styles.myListPlatformText}>{item.platform}</Text>
          </View>
          <View style={styles.myListCardBottom}>
            <Text style={styles.myListTitle} numberOfLines={2}>{item.title}</Text>
            {episodeLabel ? (
              <Text style={styles.myListProgress}>{episodeLabel}</Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.myListStatusBar, { 
          backgroundColor: 
            item.status === 'Watching' ? THEME.primary :
            item.status === 'Completed' ? THEME.success :
            item.status === 'On Hold' ? THEME.warning :
            THEME.textMuted
        }]} />
        {item.status === 'Watching' && markEpisodeWatched && (
          <TouchableOpacity 
            style={styles.myListPlayButton}
            onPress={async (e) => {
              e.stopPropagation();
              if (Platform.OS !== 'web') {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              markEpisodeWatched(item.id);
            }}
          >
            <Play size={14} color="#FFF" fill="#FFF" />
          </TouchableOpacity>
        )}
      </Pressable>
    );
  }, [showThumbnails, handleDeleteShow, markEpisodeWatched, younifyContinueByTmdbId]);

  const renderStatusModal = () => {
    const show = showStatusModal.show;
    if (!show) return null;
    
    const statuses: { key: Show['status']; label: string; icon: React.ReactNode; color: string }[] = [
      { key: 'Watching', label: 'Currently Watching', icon: <Eye size={20} />, color: THEME.primary },
      { key: 'Plan to Watch', label: 'Plan to Watch', icon: <Bookmark size={20} />, color: THEME.textSecondary },
      { key: 'Completed', label: 'Completed', icon: <BookmarkCheck size={20} />, color: THEME.success },
      { key: 'On Hold', label: 'On Hold', icon: <Pause size={20} />, color: THEME.warning },
    ];
    
    return (
      <Modal
        visible={showStatusModal.visible}
        animationType="slide"
        presentationStyle={Platform.OS === 'web' ? undefined : 'pageSheet'}
        onRequestClose={() => setShowStatusModal({ visible: false, show: null })}
      >
        <View style={[styles.statusModal, { paddingTop: insets.top }]}>
          <View style={styles.statusModalHeader}>
            <Text style={styles.statusModalTitle}>{show.title}</Text>
            <TouchableOpacity onPress={() => setShowStatusModal({ visible: false, show: null })}>
              <X size={24} color={THEME.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.statusModalContent}>
            <Text style={styles.statusModalSectionTitle}>Change Status</Text>
            {statuses.map((status) => (
              <TouchableOpacity
                key={status.key}
                style={[
                  styles.statusOption,
                  show.status === status.key && styles.statusOptionActive
                ]}
                onPress={() => handleChangeStatus(show, status.key)}
              >
                <View style={[styles.statusOptionIcon, { backgroundColor: `${status.color}20` }]}>
                  {React.cloneElement(status.icon as React.ReactElement<{ color: string }>, {
                    color: status.color
                  })}
                </View>
                <Text style={[
                  styles.statusOptionText,
                  show.status === status.key && styles.statusOptionTextActive
                ]}>
                  {status.label}
                </Text>
                {show.status === status.key && (
                  <Check size={20} color={THEME.primary} />
                )}
              </TouchableOpacity>
            ))}
            
            <View style={styles.statusModalDivider} />
            
            {/* Watch Providers Section */}
            {loadingProviders ? (
              <View style={styles.watchProvidersLoading}>
                <ActivityIndicator size="small" color={THEME.primary} />
                <Text style={styles.watchProvidersLoadingText}>Loading streaming options...</Text>
              </View>
            ) : watchProviders ? (
              <WatchProviders
                streaming={watchProviders.streaming}
                rent={watchProviders.rent}
                buy={watchProviders.buy}
                link={watchProviders.link}
                tmdbId={show.tmdbId || 0}
                mediaType={show.mediaType || 'tv'}
              />
            ) : show.tmdbId ? (
              <View style={styles.noProvidersCard}>
                <Text style={styles.noProvidersText}>No streaming options available in your region</Text>
              </View>
            ) : null}
            
            <TouchableOpacity
              style={styles.statusModalAction}
              onPress={async () => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowStatusModal({ visible: false, show: null });
                setWatchProviders(null);
                const result = await navigateToShow(show);
                showNavigationAlert(result);
              }}
            >
              <Play size={20} color={THEME.primary} />
              <Text style={styles.statusModalActionText}>Open in Streaming App</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.statusModalAction, styles.statusModalActionDanger]}
              onPress={() => {
                setShowStatusModal({ visible: false, show: null });
                setWatchProviders(null);
                handleDeleteShow(show.id);
              }}
            >
              <X size={20} color={THEME.primary} />
              <Text style={[styles.statusModalActionText, styles.statusModalActionTextDanger]}>Remove from List</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const handleOpenEpisodeFromSection = useCallback(async (
    item: TVShowWithEpisode,
    mode: 'for-you' | 'streaming',
  ) => {
    if (mode === 'streaming') {
      handleItemPress(item.show, 'tv');
      return;
    }

    const linkedPreferredRow = pickBestYounifyRowForEpisode(younifyEpisodeIndex, {
      tmdbId: item.show.id,
      title: item.show.name,
      seasonNumber: item.latestEpisode.season_number,
      episodeNumber: item.latestEpisode.episode_number,
    });
    if (linkedPreferredRow) {
      await openYounifyBrowseItemOnPlatform(linkedPreferredRow);
      return;
    }

    const title = item.show.name || '';
    const year = item.show.first_air_date ? Number(item.show.first_air_date.slice(0, 4)) : undefined;
    const providerIds = item.availableProviderIds;
    const episodeHint = `S${item.latestEpisode.season_number}E${item.latestEpisode.episode_number}`;

    for (const providerId of providerIds) {
      const opened = await openStreamingTitleSearch(providerId, title, year, episodeHint);
      if (opened) return;
    }

    // Fallback to details when no provider deeplink opens.
    handleItemPress(item.show, 'tv');
  }, [handleItemPress, linkedProviderIds, younifyEpisodeIndex]);

  const renderEpisodeCard = useCallback(({ item, mode = 'for-you' }: { item: TVShowWithEpisode; mode?: 'for-you' | 'streaming' }) => {
    const { show, latestEpisode } = item;
    const backdropUrl = tmdbApi.getImageUrl(show.backdrop_path, 'w780');
    const posterUrl = tmdbApi.getImageUrl(show.poster_path);
    const epLabel = `S${latestEpisode.season_number}E${latestEpisode.episode_number}`;
    const airDate = latestEpisode.air_date
      ? new Date(latestEpisode.air_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : null;
    const isToday = latestEpisode.air_date === (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
    const inUserList = isInList(show.id, 'tv');

    return (
      <Pressable
        style={epStyles.card}
        onPress={() => void handleOpenEpisodeFromSection(item, mode)}
      >
        {backdropUrl ? (
          <Image source={{ uri: backdropUrl }} style={epStyles.cardBackdrop} />
        ) : (
          <View style={[epStyles.cardBackdrop, { backgroundColor: THEME.surfaceLight }]} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(5,5,8,0.7)', 'rgba(5,5,8,0.95)']}
          style={epStyles.cardGradient}
        />
        <View style={epStyles.cardContent}>
          <View style={epStyles.cardTop}>
            {isToday && (
              <View style={epStyles.liveBadge}>
                <View style={epStyles.liveDot} />
                <Text style={epStyles.liveBadgeText}>NEW TODAY</Text>
              </View>
            )}
            {inUserList && (
              <View style={epStyles.inListBadge}>
                <Check size={10} color="#FFF" />
              </View>
            )}
          </View>
          <View style={epStyles.cardBottom}>
            <View style={epStyles.cardRow}>
              {posterUrl && (
                <Image source={{ uri: posterUrl }} style={epStyles.miniPoster} />
              )}
              <View style={epStyles.cardInfo}>
                <Text style={epStyles.showName} numberOfLines={1}>{show.name}</Text>
                <View style={epStyles.epRow}>
                  <View style={epStyles.epBadge}>
                    <Text style={epStyles.epBadgeText}>{epLabel}</Text>
                  </View>
                  {airDate && (
                    <Text style={epStyles.airDate}>{airDate}</Text>
                  )}
                  <View style={epStyles.ratingRow}>
                    <Star size={10} color={THEME.accent} fill={THEME.accent} />
                    <Text style={epStyles.ratingText}>{formatRating(show.vote_average)}</Text>
                  </View>
                </View>
                {latestEpisode.name && latestEpisode.name !== `Episode ${latestEpisode.episode_number}` && (
                  <Text style={epStyles.epName} numberOfLines={1}>"{latestEpisode.name}"</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={epStyles.addBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleAddFromTMDB(show, 'tv');
              }}
            >
              {inUserList ? (
                <Check size={16} color={THEME.success} />
              ) : (
                <Plus size={16} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    );
  }, [handleOpenEpisodeFromSection, handleAddFromTMDB, isInList]);

  const renderNewEpisodesSection = useCallback((mode: 'for-you' | 'streaming' = 'for-you') => {
    let episodes = newEpisodesQuery.data ?? [];
    if (mode === 'streaming') {
      episodes = episodes.filter((entry) =>
        entry.availableProviderIds.some((pid) => linkedProviderIds.includes(pid)),
      );
    }
    if (!episodes || episodes.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <BellRing size={18} color={mode === 'streaming' ? THEME.success : '#00D1FF'} />
          <Text style={styles.sectionTitle}>
            {mode === 'streaming' ? 'Latest on your services' : 'Latest Episodes'}
          </Text>
          <ChevronRight size={18} color={THEME.textMuted} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={epStyles.scrollContent}>
          {episodes.map((item) => (
            <View key={`ep-${item.show.id}`}>
              {renderEpisodeCard({ item, mode })}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }, [newEpisodesQuery.data, renderEpisodeCard, linkedProviderIds]);

  const renderSection = useCallback((title: string, icon: React.ReactNode, items: any[], mediaType: 'movie' | 'tv', isLarge?: boolean) => {
    if (!items || items.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconWrap}>
            {icon}
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <ChevronRight size={16} color={THEME.textMuted} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionScroll}>
          {items.slice(0, 15).map((item, index) => (
            <View key={item?.id || `${mediaType}-${index}`}>
              {isLarge ? renderLargeCard({ item, mediaType }) : renderContentCard({ item, mediaType })}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }, [renderContentCard, renderLargeCard]);

  const headerAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(headerAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [headerAnim]);

  return (
    <View style={styles.container}>
      <TabWalkthrough tabName="shows" />
      <StatusBar barStyle="light-content" />
      
      <RNAnimated.View style={[
        styles.headerWrapper, 
        { 
          paddingTop: insets.top,
          opacity: headerAnim,
          transform: [{
            translateY: headerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-30, 0],
            })
          }]
        }
      ]}>
        <LinearGradient
          colors={['#120B0C', '#0E0A10', THEME.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTopRow}>
              <View style={styles.titleRow}>
                <Text style={styles.headerTitle}>Movies & TV</Text>
                <Text style={styles.headerSubtitle}>
                  {selectedTab === 'around-you'
                    ? 'What One Pager users around you are watching'
                    : shows.length > 0
                      ? `${shows.length} in your list`
                      : 'Discover & track'}
                </Text>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={[
                    styles.headerButton,
                    hasLinkedServices && styles.headerButtonStreaming,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    hasLinkedServices
                      ? `${linkedStreamingCount} streaming ${linkedStreamingCount === 1 ? 'provider' : 'providers'} connected. Manage streaming providers.`
                      : 'Connect streaming providers'
                  }
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    router.push('/(root)/streaming-services' as any);
                  }}
                >
                  <Link2
                    size={18}
                    color={hasLinkedServices ? THEME.primary : THEME.textSecondary}
                  />
                  {linkedStreamingCount > 0 ? (
                    <View style={styles.headerStreamingBadge}>
                      <Text style={styles.headerStreamingBadgeText}>{linkedStreamingCount}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setShowAddModal(true);
                  }}
                >
                  <Search size={18} color={THEME.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>
      </RNAnimated.View>
      
      <View style={styles.tabsTrack}>
        {Platform.OS === 'web' ? (
          <View style={styles.tabsContainerWeb}>
            {[
              { key: 'for-you' as const, label: 'For You', icon: <Sparkles size={14} />, badge: 0 },
              { key: 'streaming' as const, label: 'Streaming', icon: <Tv size={14} />, badge: 0 },
              { key: 'watchlist' as const, label: 'My List', icon: <Bookmark size={14} />, badge: shows.length },
              { key: 'around-you' as const, label: 'Around You', icon: <Flame size={14} />, badge: 0 },
            ].map((tab) => {
              const isActive = selectedTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => setSelectedTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tabIconWrap, isActive && styles.tabIconWrapActive]}>
                    {React.cloneElement(tab.icon as React.ReactElement<{ color: string }>, {
                      color: isActive ? THEME.primary : THEME.textMuted,
                    })}
                  </View>
                  <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{tab.label}</Text>
                  {tab.badge > 0 && (
                    <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                      <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{tab.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScrollView} contentContainerStyle={styles.tabsContainer}>
            {[
              { key: 'for-you' as const, label: 'For You', icon: <Sparkles size={14} />, badge: 0 },
              { key: 'streaming' as const, label: 'Streaming', icon: <Tv size={14} />, badge: 0 },
              { key: 'watchlist' as const, label: 'My List', icon: <Bookmark size={14} />, badge: shows.length },
              { key: 'around-you' as const, label: 'Around You', icon: <Flame size={14} />, badge: 0 },
            ].map((tab) => {
              const isActive = selectedTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setSelectedTab(tab.key);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tabIconWrap, isActive && styles.tabIconWrapActive]}>
                    {React.cloneElement(tab.icon as React.ReactElement<{ color: string }>, {
                      color: isActive ? THEME.primary : THEME.textMuted,
                    })}
                  </View>
                  <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{tab.label}</Text>
                  {tab.badge > 0 && (
                    <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                      <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{tab.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {younifyRuntimeBanner ? (
        <View style={styles.younifyBannerWrap}>
          <View style={styles.younifyBanner}>
            <Info size={14} color="#FCD34D" />
            <Text style={styles.younifyBannerText} numberOfLines={4}>
              {younifyRuntimeBanner}
            </Text>
            <TouchableOpacity
              style={styles.younifyBannerButton}
              onPress={() => router.push('/(root)/streaming-services' as any)}
            >
              <Text style={styles.younifyBannerButtonText}>Fix</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {selectedTab === 'for-you' ? (
        <View style={styles.content}>
        <RNAnimated.ScrollView 
          style={styles.forYouScroll} 
          showsVerticalScrollIndicator={false}
          onScroll={RNAnimated.event(
            [{ nativeEvent: { contentOffset: { y: forYouScrollY } } }],
            { useNativeDriver: Platform.OS !== 'web' }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={THEME.primary}
            />
          }
        >
          {forYouHeroLoading ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="large" color={THEME.primary} />
            </View>
          ) : heroItems.length > 0 ? (
            <RNAnimated.View
              style={[
                styles.heroSection,
                {
                  transform: [{ translateY: forYouHeroTranslateY }, { scale: forYouHeroScale }],
                  opacity: forYouHeroOpacity,
                },
              ]}
            >
              <RNAnimated.FlatList
                data={heroItems}
                renderItem={renderHeroItem}
                keyExtractor={(item) => `hero-${item.id}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={RNAnimated.event(
                  [{ nativeEvent: { contentOffset: { x: heroScrollX } } }],
                  { useNativeDriver: Platform.OS !== 'web' }
                )}
                scrollEventThrottle={16}
                style={{ height: HERO_HEIGHT }}
                getItemLayout={(_data, index) => ({
                  length: screenWidth,
                  offset: screenWidth * index,
                  index,
                })}
              />
              <View style={styles.heroIndicators}>
                {heroItems.map((_, index) => {
                  const inputRange = [
                    (index - 1) * screenWidth,
                    index * screenWidth,
                    (index + 1) * screenWidth,
                  ];
                  const opacity = heroScrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                  });
                  const scale = heroScrollX.interpolate({
                    inputRange,
                    outputRange: [1, 1.5, 1],
                    extrapolate: 'clamp',
                  });
                  return (
                    <RNAnimated.View 
                      key={index} 
                      style={[styles.heroIndicator, { opacity, transform: [{ scale }] }]} 
                    />
                  );
                })}
              </View>
            </RNAnimated.View>
          ) : null}

          {forYouQueriesEnabled &&
          !forYouFeedStillLoading &&
          (forYouUsingStaleCache ||
            ((trendingQuery.isError || popularQuery.isError) && !hasAnyForYouMovieContent)) ? (
            <FeedRetryBanner
              message="Can't reach the server"
              detail={
                forYouUsingStaleCache
                  ? forYouOfflineDetail ?? 'Pull down to refresh or tap Try again.'
                  : 'Check your connection and try again.'
              }
              onRetry={() => void onRefresh()}
              accentColor={THEME.primary}
              textColor={THEME.text}
              mutedColor={THEME.textMuted}
              backgroundColor="rgba(255,255,255,0.06)"
              borderColor="rgba(255,255,255,0.08)"
            />
          ) : null}

          {forYouQueriesEnabled && !forYouFeedStillLoading && !hasAnyForYouMovieContent ? (
            <View style={styles.forYouEmptyState}>
              <Film size={28} color={THEME.textMuted} />
              <Text style={styles.forYouEmptyTitle}>Couldn&apos;t load movie picks</Text>
              <Text style={styles.forYouEmptyText}>
                {trendingQuery.isError || popularQuery.isError
                  ? 'We couldn\u2019t reach TMDB. Pull down to refresh or try again in a moment.'
                  : 'Pull down to refresh, or check your connection.'}
              </Text>
              <TouchableOpacity
                style={styles.forYouEmptyRetry}
                onPress={() => void onRefresh()}
                activeOpacity={0.85}
              >
                <Text style={styles.forYouEmptyRetryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {forYouFeedStillLoading && !forYouHeroLoading ? (
            <View style={styles.forYouRailsLoading}>
              <ActivityIndicator size="small" color={THEME.primary} />
              <Text style={styles.forYouRailsLoadingText}>Loading movie & TV picks…</Text>
            </View>
          ) : null}

          {renderSection(
            'Trending Movies',
            <Film size={18} color={THEME.accent} />,
            forYouUniqueRails.trendingMovies,
            'movie',
            true,
          )}

          {regionTrendingQuery.data && userCountryName ? (
            <>
              {renderSection(
                `${userCountryName} Movie Releases`,
                <Globe size={18} color={'#00D1FF'} />,
                forYouUniqueRails.regionMovies,
                'movie',
                true
              )}
              {renderSection(
                `Popular TV in ${userCountryName}`,
                <Tv size={18} color={'#00D1FF'} />,
                forYouUniqueRails.regionTv,
                'tv'
              )}
            </>
          ) : null}

          {renderSection(
            'In Cinemas Now', 
            <Film size={18} color={THEME.primary} />, 
            forYouUniqueRails.nowPlaying,
            'movie',
            true
          )}

          {renderSection(
            'Streaming Now', 
            <Tv size={18} color={THEME.success} />, 
            forYouUniqueRails.onTheAir,
            'tv',
            true
          )}
          
          {renderNewEpisodesSection()}

          {renderSection(
            'Coming Soon to Cinemas', 
            <Play size={18} color={THEME.warning} />, 
            forYouUniqueRails.upcoming,
            'movie'
          )}
          
          {renderSection(
            'Popular Movies', 
            <TrendingUp size={18} color={THEME.warning} />, 
            forYouUniqueRails.popularMovies,
            'movie'
          )}
          
          {renderSection(
            'Popular TV Shows', 
            <TrendingUp size={18} color={THEME.accent} />, 
            forYouUniqueRails.popularTv,
            'tv'
          )}
          
          {renderSection(
            'Top Rated Movies', 
            <Star size={18} color={'#FFD700'} />, 
            forYouUniqueRails.topRatedMovies,
            'movie'
          )}
          
          {renderSection(
            'Top Rated TV Shows', 
            <Star size={18} color={'#FFD700'} />, 
            forYouUniqueRails.topRatedTv,
            'tv'
          )}
          
          <View style={{ height: 120 }} />
        </RNAnimated.ScrollView>
        </View>
      ) : selectedTab === 'streaming' ? (
        <View style={styles.content}>
          <View style={styles.streamingBrowseFlex}>
            <StreamingServicesBrowseTab
              sections={streamingSectionsForUi}
              loading={
                hasLinkedServices &&
                (!streamingInitialized || (streamingLoading && !hasStreamingBrowseContent))
              }
              hasLinkedServices={hasLinkedServices}
              linkedStreamingCount={linkedStreamingCount}
              loadProgress={streamingLoadProgress}
              refreshing={streamingRefreshing}
              onRefresh={onStreamingPullRefresh}
              onBrowseItemOpenDetails={handleYounifyRowOpenDetails}
              onDismissContinueWatching={confirmDismissYounifyRow}
              header={
                <>
                  {streamingLoadError && hasLinkedServices && !hasStreamingBrowseContent ? (
                    <FeedRetryBanner
                      message="Can't reach the server"
                      detail="We couldn't refresh your linked services. Try again in a moment."
                      onRetry={() => void onStreamingPullRefresh()}
                      accentColor={THEME.primary}
                      textColor={THEME.text}
                      mutedColor={THEME.textMuted}
                      backgroundColor="rgba(255,255,255,0.06)"
                      borderColor="rgba(255,255,255,0.08)"
                    />
                  ) : null}
                  <View style={styles.streamingRailWrap}>
                    <ConnectedServicesHero
                      content={heroStreamingContent}
                      loading={younifyLoading && heroStreamingContent.length === 0}
                      hasLinkedServices={hasLinkedServices}
                      linkedStreamingCount={linkedStreamingCount}
                      loadProgress={streamingLoadProgress}
                      onOpenDetails={handleYounifyRowOpenDetails}
                    />
                  </View>
                  {renderNewEpisodesSection('streaming')}
                </>
              }
            />
          </View>
        </View>
      ) : selectedTab === 'watchlist' ? (
        <View style={styles.myListContainer}>
          {filteredShows.length > 0 ||
          (younifyWatchlistSection && younifyWatchlistSection.items.length > 0) ? (
            <FlatList
              data={filteredShows}
              renderItem={({ item }) => renderMyListCard({ item })}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={filteredShows.length ? styles.myListRow : undefined}
              contentContainerStyle={styles.myListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                filteredShows.length === 0 ? (
                  <View style={styles.watchlistGridEmpty}>
                    <Text style={styles.emptyText}>No saved titles match this filter.</Text>
                  </View>
                ) : null
              }
              ListHeaderComponent={
                <>
                  {hasLinkedServices &&
                  younifyWatchlistSection &&
                  younifyWatchlistSection.items.length > 0 ? (
                    <View style={styles.watchlistYounifyBlock}>
                      <Text style={styles.watchlistSectionLabel}>From your services</Text>
                      <YounifyBrowseSectionRow
                        section={younifyWatchlistSection}
                        linkedStreamingCount={linkedStreamingCount}
                        onItemOpenDetails={handleYounifyRowOpenDetails}
                      />
                    </View>
                  ) : null}
                  <Text style={styles.watchlistSectionLabel}>Saved in app</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.statusFilter}
                    contentContainerStyle={styles.statusFilterContent}
                  >
                    {[
                      { key: 'all', label: `All (${shows.length})`, icon: null },
                      { key: 'Watching', label: `Watching (${groupedShows.watching.length})`, icon: <Eye size={14} /> },
                      { key: 'Plan to Watch', label: `Plan to watch (${groupedShows.planToWatch.length})`, icon: <Bookmark size={14} /> },
                      { key: 'Completed', label: `Completed (${groupedShows.completed.length})`, icon: <BookmarkCheck size={14} /> },
                      { key: 'On Hold', label: `On Hold (${groupedShows.onHold.length})`, icon: <Pause size={14} /> },
                    ].map((status) => (
                      <TouchableOpacity
                        key={status.key}
                        style={[styles.statusChip, selectedStatus === status.key && styles.statusChipActive]}
                        onPress={() => {
                          if (Platform.OS !== 'web') void Haptics.selectionAsync();
                          setSelectedStatus(status.key as any);
                        }}
                      >
                        {status.icon && React.cloneElement(status.icon as React.ReactElement<{ color: string }>, {
                          color: selectedStatus === status.key ? '#FFF' : THEME.textSecondary
                        })}
                        <Text style={[styles.statusChipText, selectedStatus === status.key && styles.statusChipTextActive]}>
                          {status.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              }
            />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.watchlistEmptyScroll}
              refreshControl={
                <RefreshControl
                  refreshing={streamingRefreshing}
                  onRefresh={() => void onStreamingPullRefresh()}
                  tintColor={THEME.primary}
                />
              }
            >
              {hasLinkedServices &&
              younifyWatchlistSection &&
              younifyWatchlistSection.items.length > 0 ? (
                <View style={styles.watchlistYounifyBlock}>
                  <Text style={styles.watchlistSectionLabel}>From your services</Text>
                  <YounifyBrowseSectionRow
                    section={younifyWatchlistSection}
                    linkedStreamingCount={linkedStreamingCount}
                    onItemOpenDetails={handleYounifyRowOpenDetails}
                  />
                </View>
              ) : null}
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Bookmark size={48} color={THEME.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Nothing saved yet</Text>
                <Text style={styles.emptyText}>
                  Add titles from For You or connect a streaming service for provider watchlists.
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setSelectedTab('for-you')}
                >
                  <Sparkles size={18} color="#FFF" />
                  <Text style={styles.emptyButtonText}>Browse For You</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      ) : selectedTab === 'around-you' ? (
        <View style={styles.aroundYouTabWrap}>
          <AroundYouTab
            onMediaPress={handleItemPress}
            onOpenFullMap={() => router.push('/(root)/watching-map' as any)}
            hasLinkedServices={hasLinkedServices}
            streamingSections={streamingSections}
            younifyContent={younifyContent}
          />
        </View>
      ) : null}

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle={Platform.OS === 'web' ? undefined : 'pageSheet'}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.searchModal, { paddingTop: Platform.OS === 'android' ? insets.top : 16 }]}>
          <View style={styles.searchModalHeader}>
            <Text style={styles.searchModalTitle}>Search</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={24} color={THEME.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchInputContainer}>
            <Search size={20} color={THEME.textMuted} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search movies and TV shows..."
              placeholderTextColor={THEME.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={THEME.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          
          {searchQuery.length > 2 && searchResultsQuery.data ? (
            <FlatList
              data={searchResultsQuery.data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv')}
              keyExtractor={(item) => `search-${item.id}-${item.media_type}`}
              renderItem={({ item }: { item: any }) => {
                const isMovie = item.media_type === 'movie';
                const title = isMovie ? item.title : item.name;
                const releaseDate = isMovie ? item.release_date : item.first_air_date;
                const posterUrl = tmdbApi.getImageUrl(item.poster_path);
                const inList = isInList(item.id, item.media_type);
                
                return (
                  <Pressable 
                    style={styles.searchResult}
                    onPress={() => {
                      void handleItemPress(item, item.media_type);
                      setShowAddModal(false);
                      setSearchQuery('');
                    }}
                  >
                    {posterUrl ? (
                      <Image source={{ uri: posterUrl }} style={styles.searchResultPoster} />
                    ) : (
                      <View style={[styles.searchResultPoster, styles.searchResultPosterPlaceholder]}>
                        {isMovie ? <Film size={20} color={THEME.textMuted} /> : <Tv size={20} color={THEME.textMuted} />}
                      </View>
                    )}
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultTitle} numberOfLines={1}>{title}</Text>
                      <Text style={styles.searchResultMeta}>
                        {isMovie ? 'Movie' : 'TV Show'} • {formatReleaseDate(releaseDate)}
                      </Text>
                      <View style={styles.searchResultRating}>
                        <Star size={12} color={THEME.accent} fill={THEME.accent} />
                        <Text style={styles.searchResultRatingText}>{formatRating(item.vote_average)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={[styles.searchResultAdd, inList && styles.searchResultAddActive]}
                      onPress={() => {
                        if (!inList) {
                          handleAddFromTMDB(item, item.media_type);
                        }
                      }}
                    >
                      {inList ? <Check size={18} color={THEME.success} /> : <Plus size={18} color={THEME.primary} />}
                    </TouchableOpacity>
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.searchResults}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                searchResultsQuery.isLoading ? (
                  <ActivityIndicator size="large" color={THEME.primary} style={{ marginTop: 40 }} />
                ) : (
                  <View style={styles.noResults}>
                    <Search size={40} color={THEME.textMuted} />
                    <Text style={styles.noResultsText}>No results found</Text>
                  </View>
                )
              }
            />
          ) : (
            <View style={styles.searchPrompt}>
              <Search size={48} color={THEME.textMuted} />
              <Text style={styles.searchPromptText}>Search for movies and TV shows</Text>
            </View>
          )}
        </View>
      </Modal>

      <DetailModal
        visible={detailModal.visible}
        item={detailModal.item}
        mediaType={detailModal.mediaType}
        onClose={() => {
          setDetailModal({ visible: false, item: null, mediaType: 'movie' });
          setTrackedShowData(null);
          setIsCurrentItemLiked(false);
        }}
        onAddToList={handleAddFromTMDB}
        isInList={detailModal.item ? isInList(detailModal.item.id, detailModal.mediaType) : false}
        trackedShow={trackedShowData}
        onToggleNotifications={handleToggleNotifications}
        isTogglingNotifications={toggleNotificationsMutation.isPending}
        isLiked={isCurrentItemLiked}
        onToggleLike={handleToggleLike}
        onShare={handleShare}
        hasLinkedServices={hasLinkedServices}
        younifyProviderIndex={younifyEpisodeIndex}
        onConnectServices={() => router.push('/streaming-services' as any)}
      />

      {renderStatusModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  headerWrapper: {
    paddingBottom: 0,
    backgroundColor: THEME.background,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerContent: {
    width: '100%',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: THEME.text,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 14,
    letterSpacing: -0.1,
    marginTop: 3,
    fontWeight: '500' as const,
    color: THEME.textSecondary,
  },
  headerButtons: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 4,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonStreaming: {
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.25)',
  },
  headerStreamingBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStreamingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },

  tabsTrack: {
    paddingBottom: 10,
    backgroundColor: THEME.background,
  },
  younifyBannerWrap: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  younifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.45)',
    backgroundColor: 'rgba(120, 53, 15, 0.35)',
  },
  younifyBannerText: {
    flex: 1,
    color: '#FDE68A',
    fontSize: 12,
    lineHeight: 16,
  },
  younifyBannerButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(252, 211, 77, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.5)',
  },
  younifyBannerButtonText: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '700',
  },
  tabsScrollView: {
    maxHeight: 46,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  tabsContainerWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: 'center',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 6,
  },
  tabIconWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 9,
    elevation: 5,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: THEME.textMuted,
    letterSpacing: -0.1,
  },
  tabButtonTextActive: {
    color: THEME.text,
  },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: THEME.textSecondary,
  },
  tabBadgeTextActive: {
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  forYouScroll: {
    flex: 1,
  },
  streamingRailWrap: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  streamingBrowseFlex: {
    flex: 1,
    minHeight: 0,
  },
  aroundYouTabWrap: {
    flex: 1,
    minHeight: 0,
  },
  watchlistYounifyBlock: {
    marginBottom: 4,
  },
  watchlistSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textSecondary,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 6,
  },
  watchlistEmptyScroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  watchlistGridEmpty: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  loadingSection: {
    height: HERO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forYouEmptyState: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.12)',
    backgroundColor: THEME.surface,
    alignItems: 'center',
    gap: 8,
  },
  forYouEmptyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: THEME.text,
    textAlign: 'center',
  },
  forYouEmptyText: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  forYouEmptyRetry: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.primary,
  },
  forYouEmptyRetryText: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  forYouRailsLoading: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
  },
  forYouRailsLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  heroSection: {
    marginBottom: 24,
  },
  heroSlide: {
    width: screenWidth,
    height: HERO_HEIGHT,
    paddingHorizontal: 16,
  },
  heroSlideInner: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  heroContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
  },
  heroTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.3)',
  },
  heroTopBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#FF4655',
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 10,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  heroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.accent,
  },
  heroGenres: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  heroPlayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  heroAddButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    gap: 8,
  },
  heroIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 10,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: THEME.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  sectionScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  contentCard: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  contentPoster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  contentPosterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.surfaceLight,
  },
  contentInListBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  contentCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  contentCardInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
  },
  contentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentRating: {
    fontSize: 11,
    color: THEME.textSecondary,
  },
  largeCard: {
    width: LARGE_CARD_WIDTH,
    height: 195,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: THEME.surface,
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  largeCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  largeCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '80%',
  },
  largeCardContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  largeCardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229, 9, 20, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  largeCardBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#FFF',
    letterSpacing: 0.8,
  },
  largeCardTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  largeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  largeCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  largeCardRatingText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.accent,
  },
  largeCardYear: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  largeCardGenres: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  largeCardAdd: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myListContainer: {
    flex: 1,
  },
  statusFilter: {
    maxHeight: 50,
    marginBottom: 12,
  },
  statusFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 6,
  },
  statusChipActive: {
    backgroundColor: THEME.primary,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  statusChipTextActive: {
    color: '#FFF',
  },
  myListContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  myListRow: {
    gap: 12,
    marginBottom: 12,
  },
  myListCard: {
    flex: 1,
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: THEME.surface,
    maxWidth: (screenWidth - 44) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  myListPoster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  myListPosterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.surfaceLight,
  },
  myListCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  myListCardContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    justifyContent: 'space-between',
  },
  myListPlatformBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  myListPlatformText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  myListCardBottom: {},
  myListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  myListProgress: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  myListStatusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  myListPlayButton: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: THEME.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  searchModal: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  searchModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginVertical: 16,
    height: 52,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.text,
  },
  searchResults: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 14,
  },
  searchResultPoster: {
    width: 56,
    height: 84,
    borderRadius: 8,
  },
  searchResultPosterPlaceholder: {
    backgroundColor: THEME.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  searchResultMeta: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginBottom: 6,
  },
  searchResultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchResultRatingText: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  searchResultAdd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultAddActive: {
    backgroundColor: 'rgba(70, 211, 105, 0.15)',
  },
  searchPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  searchPromptText: {
    fontSize: 16,
    color: THEME.textMuted,
    marginTop: 16,
  },
  noResults: {
    alignItems: 'center',
    paddingTop: 60,
  },
  noResultsText: {
    fontSize: 16,
    color: THEME.textMuted,
    marginTop: 16,
  },
  detailModal: {
    flex: 1,
  },
  detailHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60,
  },
  detailHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: THEME.text,
  },
  detailCloseButton: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
    overflow: 'hidden',
  },
  detailHero: {
    height: 400,
    position: 'relative',
  },
  detailBackdrop: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailHeroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '80%',
  },
  detailHeroContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  detailPoster: {
    width: 100,
    height: 150,
    borderRadius: 12,
  },
  detailHeroInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  detailRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.accent,
  },
  detailYear: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  detailTypeBadge: {
    backgroundColor: THEME.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  detailGenres: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  detailContent: {
    padding: 20,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  detailActionPrimary: {
    backgroundColor: THEME.primary,
  },
  detailActionSuccess: {
    backgroundColor: THEME.success,
  },
  detailActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  detailActionSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailActionLiked: {
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.3)',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 12,
  },
  detailOverview: {
    fontSize: 15,
    color: THEME.textSecondary,
    lineHeight: 24,
  },
  notificationSection: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  notificationDescription: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginBottom: 16,
  },
  nextEpisodeCard: {
    backgroundColor: THEME.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextEpisodeInfo: {
    flex: 1,
  },
  nextEpisodeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nextEpisodeName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  nextEpisodeDate: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  notificationBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(70, 211, 105, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  showStatusCard: {
    backgroundColor: THEME.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  showStatusText: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  notificationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surfaceHighlight,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  notificationToggleActive: {
    backgroundColor: THEME.success,
  },
  notificationToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  statusModal: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  statusModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  statusModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    flex: 1,
    marginRight: 16,
  },
  statusModalContent: {
    padding: 20,
  },
  statusModalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  statusOptionActive: {
    backgroundColor: THEME.surfaceLight,
    borderWidth: 1,
    borderColor: THEME.primary,
  },
  statusOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    flex: 1,
  },
  statusOptionTextActive: {
    color: THEME.primary,
  },
  statusModalDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 20,
  },
  statusModalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: THEME.surface,
    borderRadius: 14,
    gap: 12,
    marginBottom: 10,
  },
  statusModalActionDanger: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  statusModalActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  statusModalActionTextDanger: {
    color: THEME.primary,
  },
  watchProvidersLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: THEME.surface,
    borderRadius: 14,
    marginBottom: 16,
    gap: 12,
  },
  watchProvidersLoadingText: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  noProvidersCard: {
    padding: 20,
    backgroundColor: THEME.surface,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  noProvidersText: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  watchNowSection: {
    marginBottom: 16,
  },
  connectServicesCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.25)',
    backgroundColor: 'rgba(0, 209, 255, 0.08)',
  },
  connectServicesTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: THEME.text,
    marginBottom: 6,
  },
  connectServicesText: {
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  connectServicesButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#00D1FF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  connectServicesButtonText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#04121A',
    letterSpacing: 0.2,
  },
  watchNowLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: THEME.text,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  watchNowProviders: {
    gap: 10,
    paddingRight: 16,
  },
  watchNowButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 10,
    minWidth: 180,
  },
  watchNowProviderLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  watchNowButtonTextWrap: {
    flex: 1,
  },
  watchNowButtonTitle: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
  },
  watchNowButtonName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  watchNowButtonCompact: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: THEME.surfaceLight,
    gap: 8,
  },
  watchNowProviderLogoSmall: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  watchNowCompactName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: THEME.text,
    maxWidth: 100,
  },
  watchNowLoading: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: THEME.surfaceLight,
    borderRadius: 12,
    marginBottom: 16,
  },
  watchNowLoadingText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  justWatchLink: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    marginBottom: 12,
  },
  justWatchLinkText: {
    fontSize: 13,
    color: THEME.textSecondary,
    flex: 1,
  },
});

const epStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    width: EPISODE_CARD_WIDTH,
    height: 175,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  cardBackdrop: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover' as const,
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  cardContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 209, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.35)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D1FF',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#00D1FF',
    letterSpacing: 1,
  },
  inListBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  cardRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  miniPoster: {
    width: 48,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  showName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  epRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  epBadge: {
    backgroundColor: 'rgba(0, 209, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
  },
  epBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#00D1FF',
    letterSpacing: 0.3,
  },
  airDate: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontWeight: '500' as const,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontWeight: '500' as const,
  },
  epName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontStyle: 'italic',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});

const trailerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: THEME.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: THEME.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  watchTrailerButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.2)',
  },
  watchTrailerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
  },
  playIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchTrailerTextContainer: {
    flex: 1,
  },
  watchTrailerLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: THEME.text,
  },
  watchTrailerSub: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: '#000',
  },
  errorText: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  openBrowserBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  openBrowserText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
});

const upcomingStyles = StyleSheet.create({
  container: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 209, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: THEME.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.success,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: THEME.success,
    letterSpacing: 0.3,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.08)',
  },
  episodeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#00D1FF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  episodeName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: THEME.text,
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  episodeDate: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: '500' as const,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
  },
  pendingText: {
    fontSize: 13,
    color: THEME.warning,
    fontWeight: '500' as const,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: THEME.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: THEME.border,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  endedCard: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  endedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(142, 142, 154, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
  },
  endedBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: THEME.textSecondary,
    letterSpacing: 1,
  },
});
