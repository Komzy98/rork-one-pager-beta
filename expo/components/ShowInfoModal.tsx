import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { X, Star, Calendar, Tv, Film, Play, ExternalLink } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tmdbApi, TMDBTVShowDetails, WatchProvider } from '@/utils/tmdbApi';
import WatchProviders from '@/components/WatchProviders';

const { width: screenWidth } = Dimensions.get('window');

interface ShowInfoModalProps {
  visible: boolean;
  onClose: () => void;
  tmdbId: number | null;
  mediaType: 'movie' | 'tv';
  showTitle?: string;
  platform?: string;
}

interface ShowDetails {
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number;
  releaseDate: string;
  genres: string[];
  status?: string;
  seasons?: number;
  episodes?: number;
  nextEpisode?: {
    name: string;
    seasonNumber: number;
    episodeNumber: number;
    airDate: string | null;
  } | null;
}

interface ProviderData {
  streaming: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
  link?: string;
}

export default function ShowInfoModal({
  visible,
  onClose,
  tmdbId,
  mediaType,
  showTitle,
  platform,
}: ShowInfoModalProps) {
  const insets = useSafeAreaInsets();
  const [details, setDetails] = useState<ShowDetails | null>(null);
  const [providers, setProviders] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    if (!visible || !tmdbId) return;

    setLoading(true);
    setLoadingProviders(true);
    setDetails(null);
    setProviders(null);

    const fetchDetails = async () => {
      try {
        if (mediaType === 'tv') {
          const tvDetails: TMDBTVShowDetails = await tmdbApi.getTVShowDetails(tmdbId);
          setDetails({
            title: tvDetails.name,
            overview: tvDetails.overview,
            posterUrl: tmdbApi.getImageUrl(tvDetails.poster_path, 'w500'),
            backdropUrl: tmdbApi.getImageUrl(tvDetails.backdrop_path, 'w780'),
            rating: tvDetails.vote_average,
            releaseDate: tvDetails.first_air_date,
            genres: tvDetails.genres?.map(g => g.name) || [],
            status: tvDetails.status,
            seasons: tvDetails.number_of_seasons,
            episodes: tvDetails.number_of_episodes,
            nextEpisode: tvDetails.next_episode_to_air
              ? {
                  name: tvDetails.next_episode_to_air.name,
                  seasonNumber: tvDetails.next_episode_to_air.season_number,
                  episodeNumber: tvDetails.next_episode_to_air.episode_number,
                  airDate: tvDetails.next_episode_to_air.air_date,
                }
              : null,
          });
        } else {
          const movieDetails = await tmdbApi.getMovieDetails(tmdbId);
          setDetails({
            title: movieDetails.title,
            overview: movieDetails.overview,
            posterUrl: tmdbApi.getImageUrl(movieDetails.poster_path, 'w500'),
            backdropUrl: tmdbApi.getImageUrl(movieDetails.backdrop_path, 'w780'),
            rating: movieDetails.vote_average,
            releaseDate: movieDetails.release_date,
            genres: movieDetails.genres?.map((g: { id: number; name: string }) => g.name) || [],
          });
        }
      } catch (error) {
        console.log('ShowInfoModal: Failed to fetch details:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchProviders = async () => {
      try {
        const res = await tmdbApi.getWatchProviders(tmdbId, mediaType);
        const gb = res.results?.GB;
        const us = res.results?.US;
        const country = gb || us;
        if (country) {
          setProviders({
            streaming: country.flatrate || [],
            rent: country.rent || [],
            buy: country.buy || [],
            link: country.link,
          });
        }
      } catch (error) {
        console.log('ShowInfoModal: Failed to fetch providers:', error);
      } finally {
        setLoadingProviders(false);
      }
    };

    void fetchDetails();
    void fetchProviders();
  }, [visible, tmdbId, mediaType]);

  const handleOpenTMDB = useCallback(async () => {
    if (!tmdbId) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const url = tmdbApi.getTMDBUrl(tmdbId, mediaType);
    await Linking.openURL(url);
  }, [tmdbId, mediaType]);

  const displayTitle = details?.title || showTitle || 'Loading...';
  const year = details?.releaseDate
    ? new Date(details.releaseDate).getFullYear()
    : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        <View style={styles.handle} />

        <TouchableOpacity
          style={[styles.closeBtn, { top: Platform.OS === 'ios' ? 16 : insets.top + 8 }]}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={styles.closeBtnBg}>
            <X size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
            showsVerticalScrollIndicator={false}
          >
            {details?.backdropUrl ? (
              <View style={styles.backdropWrap}>
                <Image
                  source={{ uri: details.backdropUrl }}
                  style={styles.backdrop}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(15,15,20,0.6)', '#0F0F14']}
                  start={{ x: 0, y: 0.3 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.backdropGradient}
                />
              </View>
            ) : (
              <View style={styles.backdropFallback}>
                <LinearGradient
                  colors={['#1E293B', '#0F172A']}
                  style={styles.backdropFallbackGradient}
                >
                  {mediaType === 'tv' ? (
                    <Tv size={48} color="rgba(255,255,255,0.2)" />
                  ) : (
                    <Film size={48} color="rgba(255,255,255,0.2)" />
                  )}
                </LinearGradient>
              </View>
            )}

            <View style={styles.content}>
              <View style={styles.headerRow}>
                {details?.posterUrl && (
                  <Image
                    source={{ uri: details.posterUrl }}
                    style={styles.poster}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.headerInfo}>
                  <Text style={styles.title} numberOfLines={3}>
                    {displayTitle}
                  </Text>

                  <View style={styles.metaRow}>
                    {year ? (
                      <View style={styles.metaBadge}>
                        <Calendar size={12} color="#94A3B8" />
                        <Text style={styles.metaText}>{year}</Text>
                      </View>
                    ) : null}
                    {details?.rating ? (
                      <View style={styles.metaBadge}>
                        <Star size={12} color="#FBBF24" fill="#FBBF24" />
                        <Text style={styles.metaText}>
                          {details.rating.toFixed(1)}/10
                        </Text>
                      </View>
                    ) : null}
                    {mediaType === 'tv' && details?.seasons ? (
                      <View style={styles.metaBadge}>
                        <Tv size={12} color="#94A3B8" />
                        <Text style={styles.metaText}>
                          {details.seasons} {details.seasons === 1 ? 'Season' : 'Seasons'}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {details?.genres && details.genres.length > 0 && (
                    <View style={styles.genreRow}>
                      {details.genres.slice(0, 3).map((genre) => (
                        <View key={genre} style={styles.genreChip}>
                          <Text style={styles.genreText}>{genre}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {details?.status && (
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            details.status === 'Returning Series'
                              ? 'rgba(74, 222, 128, 0.15)'
                              : details.status === 'Ended' || details.status === 'Canceled'
                              ? 'rgba(248, 113, 113, 0.15)'
                              : 'rgba(148, 163, 184, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              details.status === 'Returning Series'
                                ? '#4ADE80'
                                : details.status === 'Ended' || details.status === 'Canceled'
                                ? '#F87171'
                                : '#94A3B8',
                          },
                        ]}
                      >
                        {details.status}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {details?.nextEpisode && (
                <View style={styles.nextEpisodeCard}>
                  <View style={styles.nextEpisodeHeader}>
                    <Play size={14} color="#6366F1" fill="#6366F1" />
                    <Text style={styles.nextEpisodeLabel}>Next Episode</Text>
                  </View>
                  <Text style={styles.nextEpisodeTitle}>
                    S{details.nextEpisode.seasonNumber}E
                    {details.nextEpisode.episodeNumber}: {details.nextEpisode.name}
                  </Text>
                  {details.nextEpisode.airDate && (
                    <Text style={styles.nextEpisodeDate}>
                      {new Date(details.nextEpisode.airDate).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  )}
                </View>
              )}

              {details?.overview ? (
                <View style={styles.overviewSection}>
                  <Text style={styles.sectionTitle}>Overview</Text>
                  <Text style={styles.overview}>{details.overview}</Text>
                </View>
              ) : null}

              <View style={styles.watchSection}>
                <Text style={styles.sectionTitle}>Where to Watch</Text>
                {loadingProviders ? (
                  <ActivityIndicator
                    size="small"
                    color="#6366F1"
                    style={{ marginTop: 12 }}
                  />
                ) : providers &&
                  (providers.streaming.length > 0 ||
                    providers.rent.length > 0 ||
                    providers.buy.length > 0) ? (
                  <WatchProviders
                    streaming={providers.streaming}
                    rent={providers.rent}
                    buy={providers.buy}
                    link={providers.link}
                    tmdbId={tmdbId!}
                    mediaType={mediaType}
                    title={displayTitle}
                    year={year}
                  />
                ) : (
                  <View style={styles.noProviders}>
                    <Text style={styles.noProvidersText}>
                      No streaming info available for your region
                    </Text>
                    <TouchableOpacity
                      style={styles.tmdbLink}
                      onPress={handleOpenTMDB}
                      activeOpacity={0.7}
                    >
                      <ExternalLink size={14} color="#6366F1" />
                      <Text style={styles.tmdbLinkText}>View on TMDB</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F14',
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  closeBtnBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500' as const,
  },
  scrollView: {
    flex: 1,
  },
  backdropWrap: {
    width: screenWidth,
    height: 240,
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  backdropGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  backdropFallback: {
    width: screenWidth,
    height: 160,
  },
  backdropFallbackGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    marginTop: -40,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  poster: {
    width: 100,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  headerInfo: {
    flex: 1,
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#F5F5F7',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600' as const,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  genreChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  genreText: {
    fontSize: 11,
    color: '#A5B4FC',
    fontWeight: '600' as const,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  nextEpisodeCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  nextEpisodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  nextEpisodeLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#A5B4FC',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  nextEpisodeTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#E2E8F0',
    marginBottom: 4,
  },
  nextEpisodeDate: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500' as const,
  },
  overviewSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#F5F5F7',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  overview: {
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  watchSection: {
    marginBottom: 24,
  },
  noProviders: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  noProvidersText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  tmdbLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  tmdbLinkText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6366F1',
  },
});
