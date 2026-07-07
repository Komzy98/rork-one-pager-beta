import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Platform, RefreshControl, Animated, Alert, FlatList } from 'react-native';
import { Play, ChevronRight, Sparkles, Calendar, CheckCircle2, Target, Flame, Tv, Radio, X, Clock, BarChart3, Volume2, VolumeX, BellRing, Brain, Share2, PartyPopper, Users } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, HABIT_COLORS } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/hooks/useHabitsStore';
import { useTasks } from '@/hooks/useTasksStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/useAuth';
import { useTodayHabits } from '@/hooks/useTodayHabits';
import { useTodayYmd } from '@/hooks/useTodayYmd';
import { router, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import SwipeableTabContainer from '@/components/SwipeableTabContainer';
import TabWalkthrough from '@/components/TabWalkthrough';
import CalendarImporter from '@/components/CalendarImporter';
import EventKitManager from '@/components/EventKitManager';
import ModernSportsSection from '@/components/ModernSportsSection';
import MatchDetailsModal from '@/components/MatchDetailsModal';


import EnhancedLoadingState from '@/components/EnhancedLoadingState';

import WeatherDetailModal from '@/components/WeatherDetailModal';
import { trpc } from '@/lib/trpc';
import { useFootballBundle } from '@/contexts/FootballBundleContext';
import {
  apiFixtureToLiveFootballMatch,
  apiFixturesToLiveFootballMatches,
} from '@/utils/footballFixtureTransform';
import { collectNationalTeamApiIds } from '@/utils/nationalTeamApiIds';
import {
  isFavoriteClubOrNationalMatch,
  matchInvolvesNationalInterest,
} from '@/utils/footballMatchPersonalization';
import { usePinnedMatches } from '@/hooks/usePinnedMatches';
import { getCurrentWeather, getHeroGradientColors } from '@/utils/weatherApi';
import { LiveFootballMatch, Show } from '@/types/habit';
import { useCalendar } from '@/hooks/useCalendar';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { tmdbApi, TMDBTVShowDetails, isTmdbFetchAbortError } from '@/utils/tmdbApi';
import {
  summarizeDailyProgress,
  DailySummary,
  type DailySummaryHabitRollup,
} from '@/utils/dailySummary';
import {
  buildPriorityTaskHighlights,
  buildTodayCalendarHighlights,
  buildUpcomingEventsForSummary,
  buildContinueWatchingHighlights,
  buildSportsEmotionalBeats,
  buildSavedEventsHighlights,
} from '@/utils/buildDailySummaryInput';
import {
  buildTodayHabitEntries,
  buildSummaryHabitsFromEntries,
} from '@/utils/todayHabits';
import DailySummaryInsights from '@/components/DailySummaryInsights';
import { ProgressShareSheet } from '@/components/ProgressShareSheet';
import { useActivity } from '@/hooks/useActivity';
import { PartnerActivityFeed } from '@/components/social/PartnerActivityFeed';
import { buildSummaryPayload, type SharePayload } from '@/utils/shareProgress';
import {
  getTodayYmd,
  buildOpenItemsForSummary,
  saveDailyStatsSnapshot,
  loadYesterdayStats,
  computeStatsDelta,
  saveDailySummaryCache,
  loadDailySummaryCache,
  isDailySummaryDismissed,
  markDailySummaryDismissed,
  clearDailySummaryDismissed,
  isAutoSummaryHintDismissed,
  dismissAutoSummaryHint,
  isAutoSummaryEnabled,
  shouldRunAutoSummaryNow,
  getAutoSummarySchedule,
  formatAutoSummaryTime,
  type DailyStatsSnapshot,
  type DailyStatsDelta,
} from '@/utils/dailySummaryStats';
import { useActivityIntelligence } from '@/hooks/useBackgroundServices';
import { useQuery } from '@tanstack/react-query';
import ActivitiesAIView from '@/components/activities/ActivitiesAIView';
import FlyingBirds from '@/components/FlyingBirds';
import TodaysRoutine from '@/components/TodaysRoutine';
import AddInterestsLaterCard from '@/components/AddInterestsLaterCard';
import PeakPerformanceScheduler from '@/components/PeakPerformanceScheduler';
import HabitFormationCoach from '@/components/HabitFormationCoach';
import RecoveryModePanel from '@/components/RecoveryModePanel';
import JoySourcesNudgeCard from '@/components/JoySourcesNudgeCard';
import { useRecoveryMode } from '@/hooks/useRecoveryMode';
import { resolveEffectiveJoySources } from '@/utils/joySources';
import { detectRecoveryPatternInsight } from '@/utils/recoveryPatterns';
import { getChronotypeInfo, getChronotypeGreetingTip } from '@/constants/chronotypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NBAUpcomingSection from '@/components/NBAUpcomingSection';
import ShowInfoModal from '@/components/ShowInfoModal';
import TmdbStreamingPosterImage from '@/components/younify/TmdbStreamingPosterImage';
import YounifyServiceLogoMark from '@/components/younify/YounifyServiceLogoMark';
import {
  fetchYounifyBrowseSections,
  getLinkedStreamingServicesList,
  type YounifyBrowseSection,
  type YounifySourceServiceSnapshot,
} from '@/services/younify';
import { extractTmdbIdFromYounifyRow } from '@/utils/aroundYouImages';
import {
  getContinueWatchingProgressPercent,
  openStreamingApp,
  openStreamingTitleSearch,
  openYounifyBrowseItemOnPlatform,
  younifySourceToTmdbProviderId,
} from '@/utils/streamingLinks';
import { buildYounifyProviderIndex, pickBestYounifyRowForEpisode } from '@/utils/younifyProviderIndex';
import { formatShowEpisodeLabel, formatYounifyContinueEpisodeLabel } from '@/utils/showEpisodeLabel';
import { SHOWS_HREF } from '@/constants/showsNavigation';

type AvailableSpeechVoice = Awaited<ReturnType<typeof Speech.getAvailableVoicesAsync>>[number];

type ActivitiesContinueItem =
  | { kind: 'local'; show: Show & { posterUrl?: string | null } }
  | { kind: 'younify'; row: Record<string, unknown>; key: string };

function getContinueWatchingDismissKey(item: ActivitiesContinueItem): string {
  if (item.kind === 'local') {
    if (item.show.tmdbId != null) return `tmdb:${item.show.tmdbId}`;
    return `local:${item.show.id}`;
  }
  const tmdbId = extractTmdbIdFromYounifyRow(item.row);
  if (tmdbId != null) return `tmdb:${tmdbId}`;
  return `younify:${item.key}`;
}

function getContinueWatchingTitle(item: ActivitiesContinueItem): string {
  if (item.kind === 'local') return item.show.title;
  const row = item.row;
  return String(row.showTitle || row.title || 'This title');
}

const ELEVENLABS_SUMMARY_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

const NATURAL_VOICE_HINTS = [
  'premium',
  'enhanced',
  'natural',
  'neural',
  'siri',
  'google',
  'wavenet',
  'studio',
  'eloquence',
  'ava',
  'allison',
  'samantha',
  'serena',
  'daniel',
  'karen',
] as const;

function scoreVoice(voice: AvailableSpeechVoice): number {
  const identifier = voice.identifier.toLowerCase();
  const name = (voice.name ?? '').toLowerCase();
  const language = voice.language.toLowerCase();
  let score = 0;

  if (language.startsWith('en-ng')) score += 80;
  if (language.startsWith('en-gb')) score += 70;
  if (language.startsWith('en-us')) score += 65;
  if (language.startsWith('en')) score += 50;
  const quality = String(voice.quality ?? 'Default');

  if (quality === 'Enhanced') score += 45;
  if (quality === 'Premium') score += 55;

  const searchText = `${identifier} ${name}`;
  for (const hint of NATURAL_VOICE_HINTS) {
    if (searchText.includes(hint)) {
      score += 18;
    }
  }

  if (searchText.includes('compact')) score -= 20;
  if (searchText.includes('default')) score -= 8;

  return score;
}

function selectMostNaturalVoice(voices: AvailableSpeechVoice[]): AvailableSpeechVoice | null {
  if (voices.length === 0) {
    return null;
  }

  const rankedVoices = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return rankedVoices[0] ?? null;
}

function buildSpeechSummaryText(summary: string): string {
  return summary
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1  ')
    .replace(/\s*[:|-]\s*/g, '. ')
    .trim();
}

export default function ActivitiesScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const appContext = useApp();
  const tasksContext = useTasks();
  const userProfileData = useUserProfile();
  const profile = userProfileData?.profile;
  const { upcomingSaved } = useSavedEvents();
  const savedEventsCount = profile?.savedEvents?.length ?? 0;
  const [summarySharePayload, setSummarySharePayload] = useState<SharePayload | null>(null);
  const defaultFavoriteTeam = useCallback(() => false, []);
  const isFavoriteTeam = userProfileData?.isFavoriteTeam ?? defaultFavoriteTeam;
  const insets = useSafeAreaInsets();
  const intelligence = useActivityIntelligence();
  const partnerActivity = useActivity();
  
  const calendarData = useCalendar();
  const getUpcomingCalendarEvents = calendarData?.getUpcomingCalendarEvents || (() => []);
  const getTodayCalendarEvents = calendarData?.getTodayCalendarEvents || (() => []);
  const calendars = calendarData?.calendars || [];
  const eventKit = calendarData?.eventKit || { isEventKitAvailable: false, hasPermission: false };
  
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(false);
  const [showCalendarImporter, setShowCalendarImporter] = useState<boolean>(false);
  const [showEventKitManager, setShowEventKitManager] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [yesterdayDelta, setYesterdayDelta] = useState<DailyStatsDelta | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const autoSummaryInFlightRef = useRef(false);
  const userId = user?.id || 'guest';
  const [autoSummaryScheduleLabel, setAutoSummaryScheduleLabel] = useState<string>('');
  const [autoSummaryHintDismissed, setAutoSummaryHintDismissed] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showsWithThumbnails, setShowsWithThumbnails] = useState<(Show & { posterUrl?: string | null })[]>([]);
  const [younifyContinueItems, setYounifyContinueItems] = useState<Record<string, unknown>[]>([]);
  const [linkedStreamingCount, setLinkedStreamingCount] = useState(0);
  const [linkedProviderIds, setLinkedProviderIds] = useState<number[]>([]);
  const [younifyBrowseSections, setYounifyBrowseSections] = useState<YounifyBrowseSection[]>([]);
  const [showUnifiedView, setShowUnifiedView] = useState<boolean>(false);
  const [showLiveMatchModal, setShowLiveMatchModal] = useState<boolean>(false);
  const [liveBannerDismissed, setLiveBannerDismissed] = useState<boolean>(false);

  const [showWeatherModal, setShowWeatherModal] = useState<boolean>(false);
  const [showPeakScheduler, setShowPeakScheduler] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<{ visible: boolean; tmdbId: number | null; mediaType: 'movie' | 'tv'; title: string; platform: string }>({ visible: false, tmdbId: null, mediaType: 'tv', title: '', platform: '' });
  const [sportsSelectedLeagues, setSportsSelectedLeagues] = useState<number[]>([]);
  const [dismissedEpisodes, setDismissedEpisodes] = useState<string[]>([]);
  const [dismissedContinueWatching, setDismissedContinueWatching] = useState<string[]>([]);
  const scopedStorageKey = useCallback((base: string) => `${base}_${user?.id || 'guest'}`, [user?.id]);

  useEffect(() => {
    AsyncStorage.getItem(scopedStorageKey('dismissed_new_episodes')).then(async (raw) => {
      let stored = raw;
      if (!stored) {
        const legacy = await AsyncStorage.getItem('dismissed_new_episodes');
        if (legacy) {
          stored = legacy;
          await AsyncStorage.setItem(scopedStorageKey('dismissed_new_episodes'), legacy);
        }
      }
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as string[];
          if (Array.isArray(parsed)) setDismissedEpisodes(parsed);
        } catch (e) {
          console.log('Failed to parse dismissed episodes', e);
        }
      } else {
        setDismissedEpisodes([]);
      }
    });
  }, [scopedStorageKey]);

  useEffect(() => {
    AsyncStorage.getItem(scopedStorageKey('dismissed_continue_watching')).then(async (raw) => {
      let stored = raw;
      if (!stored) {
        const legacy = await AsyncStorage.getItem('dismissed_continue_watching');
        if (legacy) {
          stored = legacy;
          await AsyncStorage.setItem(scopedStorageKey('dismissed_continue_watching'), legacy);
        }
      }
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as string[];
          if (Array.isArray(parsed)) setDismissedContinueWatching(parsed);
        } catch (e) {
          console.log('Failed to parse dismissed continue watching', e);
        }
      } else {
        setDismissedContinueWatching([]);
      }
    });
  }, [scopedStorageKey]);

  const dismissEpisode = useCallback((key: string) => {
    console.log('🗑️ [Activities] Dismissing episode', key);
    setDismissedEpisodes((prev) => {
      const next = prev.includes(key) ? prev : [...prev, key];
      AsyncStorage.setItem(scopedStorageKey('dismissed_new_episodes'), JSON.stringify(next)).catch((e) => console.log('Failed to save dismissed', e));
      return next;
    });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [scopedStorageKey]);

  const confirmDismissEpisode = useCallback((key: string, title: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      'Dismiss Episode',
      `Remove "${title}" from New Episodes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Dismiss', style: 'destructive', onPress: () => dismissEpisode(key) },
      ],
    );
  }, [dismissEpisode]);

  const dismissContinueWatching = useCallback((key: string) => {
    setDismissedContinueWatching((prev) => {
      const next = prev.includes(key) ? prev : [...prev, key];
      AsyncStorage.setItem(scopedStorageKey('dismissed_continue_watching'), JSON.stringify(next)).catch((e) =>
        console.log('Failed to save dismissed continue watching', e),
      );
      return next;
    });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [scopedStorageKey]);

  const confirmDismissContinueWatching = useCallback((item: ActivitiesContinueItem) => {
    const key = getContinueWatchingDismissKey(item);
    const title = getContinueWatchingTitle(item);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      'Remove from Continue Watching',
      `Hide "${title}" from this section? You can still find it in your watchlist.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            dismissContinueWatching(key);
            if (item.kind === 'local' && appContext?.updateShow) {
              appContext.updateShow({ ...item.show, status: 'Plan to Watch' });
              setShowsWithThumbnails((prev) => prev.filter((s) => s.id !== item.show.id));
            }
          },
        },
      ],
    );
  }, [dismissContinueWatching, appContext]);

  interface TrackedShowEpisode {
    showId: string;
    showTitle: string;
    tmdbId: number;
    posterUrl: string | null;
    platform: string;
    latestEpisode: {
      name: string;
      seasonNumber: number;
      episodeNumber: number;
      airDate: string | null;
    } | null;
    nextEpisode: {
      name: string;
      seasonNumber: number;
      episodeNumber: number;
      airDate: string | null;
    } | null;
    showStatus: string;
  }
  const [weather, setWeather] = useState<any>(null);

  const generateVoiceMutation = trpc.ai.generateVoice.useMutation();
  const summaryAudioPlayer = useAudioPlayer();
  const summaryAudioStatus = useAudioPlayerStatus(summaryAudioPlayer);
  const preferredVoiceRef = useRef<AvailableSpeechVoice | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const moonScale = useRef(new Animated.Value(1)).current;
  const cloud1X = useRef(new Animated.Value(0)).current;
  const cloud2X = useRef(new Animated.Value(0)).current;
  const cloud3X = useRef(new Animated.Value(0)).current;
  const sunScale = useRef(new Animated.Value(1)).current;
  const rainDrops = useRef(Array.from({ length: 15 }, () => new Animated.Value(0))).current;
  const snowFlakes = useRef(Array.from({ length: 20 }, () => new Animated.Value(0))).current;
  const lightning = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch((error) => {
      console.log('❌ [Activities] Failed to configure audio mode:', error);
    });
  }, []);

  useEffect(() => {
    setIsSpeaking(summaryAudioStatus.playing);
  }, [summaryAudioStatus.playing]);

  const loadPreferredVoice = useCallback(async (): Promise<AvailableSpeechVoice | null> => {
    if (preferredVoiceRef.current) {
      return preferredVoiceRef.current;
    }

    try {
      let voices = await Speech.getAvailableVoicesAsync();

      if (voices.length === 0 && Platform.OS === 'web') {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 250);
        });
        voices = await Speech.getAvailableVoicesAsync();
      }

      const preferredVoice = selectMostNaturalVoice(voices);
      preferredVoiceRef.current = preferredVoice;

      if (__DEV__) {
        console.log('🎙️ [Activities] Loaded speech voices:', voices.map((voice) => ({
          identifier: voice.identifier,
          name: voice.name,
          language: voice.language,
          quality: voice.quality,
        })));
        console.log('🎙️ [Activities] Selected preferred voice:', preferredVoice);
      }

      return preferredVoice;
    } catch (error) {
      console.log('❌ [Activities] Failed to load speech voices:', error);
      return null;
    }
  }, []);

  const stopSummarySpeech = useCallback(async () => {
    try {
      summaryAudioPlayer.pause();
      void summaryAudioPlayer.seekTo(0);
      await Speech.stop();
    } catch (error) {
      console.log('❌ [Activities] Failed to stop speech:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [summaryAudioPlayer]);

  const speakDailySummary = useCallback(async (summary: string) => {
    const normalizedSummary = buildSpeechSummaryText(summary);

    if (!normalizedSummary) {
      return;
    }

    setIsSpeaking(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await Speech.stop();
      summaryAudioPlayer.pause();
      void summaryAudioPlayer.seekTo(0);

      const generatedVoice = await generateVoiceMutation.mutateAsync({
        text: normalizedSummary,
        voiceId: ELEVENLABS_SUMMARY_VOICE_ID,
      });

      console.log('🎙️ [Activities] Playing ElevenLabs summary audio', {
        provider: generatedVoice.provider,
        voiceId: generatedVoice.voiceId,
        voiceName: generatedVoice.voiceName,
        audioLength: generatedVoice.audioDataUri.length,
      });

      summaryAudioPlayer.replace(generatedVoice.audioDataUri);
      void summaryAudioPlayer.seekTo(0);
      summaryAudioPlayer.play();
      return;
    } catch (error) {
      console.log('⚠️ [Activities] ElevenLabs playback failed, falling back to system voice:', error);
    }

    try {
      const preferredVoice = await loadPreferredVoice();
      const language = preferredVoice?.language ?? 'en-GB';

      if (__DEV__) {
        console.log('🎙️ [Activities] Speaking summary with fallback voice:', {
          identifier: preferredVoice?.identifier ?? 'default',
          name: preferredVoice?.name ?? 'default',
          language,
        });
      }

      Speech.speak(normalizedSummary, {
        language,
        voice: preferredVoice?.identifier,
        rate: Platform.OS === 'web' ? 0.88 : 0.9,
        pitch: 1.0,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: (playbackError) => {
          console.log('❌ [Activities] Speech playback error:', playbackError);
          setIsSpeaking(false);
        },
      });
    } catch (error) {
      console.log('❌ [Activities] Failed to speak summary:', error);
      setIsSpeaking(false);
    }
  }, [generateVoiceMutation, loadPreferredVoice, summaryAudioPlayer]);

  const activities = useMemo(() => appContext?.activities || [], [appContext?.activities]);
  const shows = useMemo(() => appContext?.shows || [], [appContext?.shows]);
  const deleteShow = appContext?.deleteShow;

  const handleRemoveShow = useCallback((showId: string, title: string) => {
    if (!deleteShow) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      'Remove from Overview',
      `Remove "${title}" from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteShow(showId);
            setShowsWithThumbnails(prev => prev.filter(s => s.id !== showId));
          },
        },
      ],
    );
  }, [deleteShow]);
  
  // Get team IDs from user profile for targeted API queries
  const favoriteTeamIds = useMemo(() => {
    if (!profile?.favoriteTeams) return [];
    const teamIds = profile.favoriteTeams
      .map(team => team.apiId)
      .filter((id): id is number => id !== undefined && id !== null);
    if (__DEV__) console.log('🎯 [Activities] Favorite team IDs for API:', teamIds);
    return teamIds;
  }, [profile?.favoriteTeams]);

  // Get national team IDs from user's nationalities for AFCON/international matches
  const nationalTeamIds = useMemo(() => {
    const nationalIds = collectNationalTeamApiIds(profile?.nationalities);
    if (__DEV__) console.log('🌍 [Activities] National team IDs for API:', nationalIds);
    return nationalIds;
  }, [profile?.nationalities]);

  const favoriteClubApiIds = useMemo(
    () => new Set(favoriteTeamIds),
    [favoriteTeamIds],
  );

  const countryInterestNamesLower = useMemo(() => {
    if (!profile?.nationalities?.length) return [];
    return profile.nationalities
      .map((n) => n.name.toLowerCase().trim())
      .filter(Boolean);
  }, [profile?.nationalities]);

  // Check if we should include AFCON matches
  const includeAfcon = useMemo(() => {
    return nationalTeamIds.length > 0;
  }, [nationalTeamIds]);

  // Load the same league selections as the Sports tab so queries share cache
  useEffect(() => {
    AsyncStorage.getItem(scopedStorageKey('sports_selected_leagues')).then(async saved => {
      let stored = saved;
      if (!stored) {
        const legacy = await AsyncStorage.getItem('sports_selected_leagues');
        if (legacy) {
          stored = legacy;
          await AsyncStorage.setItem(scopedStorageKey('sports_selected_leagues'), legacy);
        }
      }
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSportsSelectedLeagues(parsed);
            if (__DEV__) console.log('📋 [Activities] Loaded sports league IDs:', parsed);
          }
        } catch (e) {
          console.log('⚠️ [Activities] Failed to parse sports leagues:', e);
        }
      } else {
        setSportsSelectedLeagues([]);
      }
    }).catch(e => console.log('⚠️ [Activities] Failed to load sports leagues:', e));
  }, [scopedStorageKey]);

  const queryLeagueIds = useMemo(() => {
    if (sportsSelectedLeagues.length === 0) return undefined;
    return sportsSelectedLeagues;
  }, [sportsSelectedLeagues]);

  /** Shared with Sports tab via FootballBundleProvider — no duplicate polling. */
  const { query: footballBundleQuery, requestIncludeResults, setPollLive } = useFootballBundle();
  const { isPinned, togglePin, resolvePinnedMatches, records } = usePinnedMatches();

  useEffect(() => {
    requestIncludeResults();
  }, [requestIncludeResults]);

  const transformApiFootballData = useCallback(
    (fixtures: unknown[]): LiveFootballMatch[] => apiFixturesToLiveFootballMatches(fixtures),
    [],
  );

  const filterMatchesForFavoriteTeams = useCallback((matches: LiveFootballMatch[]) => {
    const hasFavoriteTeams = profile?.favoriteTeams && profile.favoriteTeams.length > 0;
    const hasNationalities = profile?.nationalities && profile.nationalities.length > 0;
    
    if (!hasFavoriteTeams && !hasNationalities) {
      console.log('🔍 [Activities] No favorite teams or nationalities set - showing no favorite matches');
      return [];
    }
    
    console.log('🔍 [Activities] Filtering', matches.length, 'matches for', 
      (profile?.favoriteTeams?.length ?? 0), 'teams and', 
      (profile?.nationalities?.length ?? 0), 'nationalities');
    
    const filtered = matches.filter((match) => {
      if (isFavoriteClubOrNationalMatch(match, favoriteClubApiIds, nationalTeamIds)) {
        return true;
      }
      if (matchInvolvesNationalInterest(match, nationalTeamIds, countryInterestNamesLower)) {
        return true;
      }
      return isFavoriteTeam(match.homeTeam) || isFavoriteTeam(match.awayTeam);
    });
    
    console.log('📊 [Activities] Filter result:', filtered.length, 'matches from', matches.length, 'total');
    return filtered;
  }, [
    profile?.favoriteTeams,
    profile?.nationalities,
    isFavoriteTeam,
    favoriteClubApiIds,
    nationalTeamIds,
    countryInterestNamesLower,
  ]);

  // Raw unfiltered matches - used by ModernSportsSection which does its own filtering
  const rawLiveMatches = useMemo(() => {
    const data = footballBundleQuery.data?.live?.response;
    if (!data || !Array.isArray(data)) return [];
    return transformApiFootballData(data);
  }, [footballBundleQuery.data?.live, transformApiFootballData]);

  const rawUpcomingMatches = useMemo(() => {
    const data = footballBundleQuery.data?.upcoming?.response;
    if (!data || !Array.isArray(data)) return [];
    return transformApiFootballData(data).filter(m => m.status === 'Upcoming')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [footballBundleQuery.data?.upcoming, transformApiFootballData]);

  const rawCompletedMatches = useMemo(() => {
    const data = footballBundleQuery.data?.results?.response;
    if (!data || !Array.isArray(data)) return [];
    return transformApiFootballData(data).filter(m => m.status === 'Completed');
  }, [footballBundleQuery.data?.results, transformApiFootballData]);

  const orphanedPinnedFixtureIds = useMemo(() => {
    const poolIds = new Set(
      [...rawLiveMatches, ...rawUpcomingMatches, ...rawCompletedMatches].map((m) => m.id),
    );
    return records
      .filter((r) => !poolIds.has(r.id))
      .map((r) => parseInt(r.id, 10))
      .filter((id) => Number.isFinite(id) && id > 0)
      .slice(0, 6);
  }, [records, rawLiveMatches, rawUpcomingMatches, rawCompletedMatches]);

  const orphanedPinnedDetailQueries = trpc.useQueries((t) =>
    orphanedPinnedFixtureIds.map((fixtureId) =>
      t.football.getMatchDetails(
        { fixtureId },
        {
          staleTime: 60 * 1000,
          retry: 1,
        },
      ),
    ),
  );

  const pinnedRefreshById = useMemo(() => {
    const map = new Map<string, LiveFootballMatch>();
    orphanedPinnedFixtureIds.forEach((fixtureId, index) => {
      const fixture = orphanedPinnedDetailQueries[index]?.data?.fixture;
      const match = apiFixtureToLiveFootballMatch(fixture);
      if (match) map.set(String(fixtureId), match);
    });
    return map;
  }, [orphanedPinnedFixtureIds, orphanedPinnedDetailQueries]);

  const pinnedMatchesForSection = useMemo(
    () =>
      resolvePinnedMatches(
        rawLiveMatches,
        rawUpcomingMatches,
        rawCompletedMatches,
        pinnedRefreshById,
      ),
    [resolvePinnedMatches, rawLiveMatches, rawUpcomingMatches, rawCompletedMatches, pinnedRefreshById],
  );

  useEffect(() => {
    const hasActiveLive =
      rawLiveMatches.length > 0 || pinnedMatchesForSection.some((m) => m.status === 'Live');
    setPollLive(hasActiveLive);
    return () => setPollLive(false);
  }, [rawLiveMatches, pinnedMatchesForSection, setPollLive]);

  // Filtered matches - used for hero banner, summary, and other sections
  const liveMatches = useMemo(() => {
    return filterMatchesForFavoriteTeams(rawLiveMatches);
  }, [rawLiveMatches, filterMatchesForFavoriteTeams]);

  const upcomingMatches = useMemo(() => {
    if (__DEV__) {
      console.log('📅 [Activities] Upcoming query data:', {
        hasData: !!footballBundleQuery.data?.upcoming,
        rawCount: rawUpcomingMatches.length,
        queryStatus: footballBundleQuery.status,
        error: footballBundleQuery.error?.message,
      });
    }
    return filterMatchesForFavoriteTeams(rawUpcomingMatches);
  }, [rawUpcomingMatches, filterMatchesForFavoriteTeams, footballBundleQuery.data?.upcoming, footballBundleQuery.status, footballBundleQuery.error]);

  const completedTodayMatches = useMemo(() => {
    const result = filterMatchesForFavoriteTeams(rawCompletedMatches);
    if (__DEV__) console.log(`📊 [Activities] Completed matches: ${result.length}`);
    return result;
  }, [rawCompletedMatches, filterMatchesForFavoriteTeams]);

  const hasAnyFootballBundleData = useMemo(
    () =>
      (footballBundleQuery.data?.live?.response?.length ?? 0) > 0
      || (footballBundleQuery.data?.upcoming?.response?.length ?? 0) > 0
      || (footballBundleQuery.data?.results?.response?.length ?? 0) > 0,
    [footballBundleQuery.data?.live, footballBundleQuery.data?.upcoming, footballBundleQuery.data?.results],
  );

  useEffect(() => {
    setIsLoadingMatches(footballBundleQuery.isLoading && !hasAnyFootballBundleData);
  }, [footballBundleQuery.isLoading, hasAnyFootballBundleData]);

  // Debug logging


  // Refetch function for pull to refresh
  const fetchMatches = useCallback(async () => {
    if (__DEV__) console.log('🔄 [Activities] Refetching matches...');
    await footballBundleQuery.refetch();
  }, [footballBundleQuery]);

  // Check if user has specific interests
  const hasShowsInterest = useMemo(() => {
    if (!profile?.interests?.length) return true; // Show by default if no interests set
    return profile.interests.includes('movies');
  }, [profile?.interests]);

  const hasSportsInterest = useMemo(() => {
    if (!profile?.interests?.length) return true;
    return profile.interests.includes('football');
  }, [profile?.interests]);

  const hasNBAInterest = useMemo(() => {
    if (!profile?.interests?.length) return false;
    return profile.interests.includes('nba');
  }, [profile?.interests]);

  const favoriteNBATeams = useMemo(() => {
    return profile?.favoriteNBATeams || [];
  }, [profile?.favoriteNBATeams]);

  const { stats: todayHabitStats } = useTodayHabits();
  const todayYmd = useTodayYmd();
  const stats = todayHabitStats;
  
  const trackedTVShows = useMemo(() => {
    return shows.filter((show: Show) => 
      show.tmdbId && show.mediaType === 'tv' && (show.status === 'Watching' || show.status === 'Plan to Watch')
    );
  }, [shows]);

  const trackedShowIds = useMemo(() => trackedTVShows.map(s => s.tmdbId).join(','), [trackedTVShows]);

  const newEpisodesForMyShows = useQuery({
    queryKey: ['my-shows-new-episodes', trackedShowIds],
    queryFn: async (): Promise<TrackedShowEpisode[]> => {
      if (trackedTVShows.length === 0) return [];
      console.log('📺 [Activities] Checking new episodes for', trackedTVShows.length, 'tracked shows');

      const results: TrackedShowEpisode[] = [];
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const promises = trackedTVShows.map(async (show) => {
        try {
          const details: TMDBTVShowDetails = await tmdbApi.getTVShowDetails(show.tmdbId!);
          const lastEp = details.last_episode_to_air;
          const nextEp = details.next_episode_to_air;

          const hasRecentEpisode = lastEp?.air_date && new Date(lastEp.air_date) >= sevenDaysAgo;
          const hasUpcomingEpisode = nextEp?.air_date && new Date(nextEp.air_date) <= fourteenDaysAhead;

          if (hasRecentEpisode || hasUpcomingEpisode) {
            const posterUrl = tmdbApi.getImageUrl(details.poster_path, 'w300');
            results.push({
              showId: show.id,
              showTitle: show.title,
              tmdbId: show.tmdbId!,
              posterUrl,
              platform: show.platform,
              latestEpisode: lastEp ? {
                name: lastEp.name,
                seasonNumber: lastEp.season_number,
                episodeNumber: lastEp.episode_number,
                airDate: lastEp.air_date,
              } : null,
              nextEpisode: nextEp ? {
                name: nextEp.name,
                seasonNumber: nextEp.season_number,
                episodeNumber: nextEp.episode_number,
                airDate: nextEp.air_date,
              } : null,
              showStatus: details.status,
            });
          }
        } catch (error) {
          if (error instanceof TypeError || isTmdbFetchAbortError(error)) {
            console.warn('⚠️ [Activities] Network/timeout for', show.title);
          } else {
            console.error('❌ [Activities] Failed to check episodes for', show.title, error);
          }
        }
      });

      await Promise.all(promises);

      results.sort((a, b) => {
        const dateA = a.latestEpisode?.airDate || a.nextEpisode?.airDate || '';
        const dateB = b.latestEpisode?.airDate || b.nextEpisode?.airDate || '';
        return dateB.localeCompare(dateA);
      });

      console.log('📺 [Activities] Found', results.length, 'shows with new/upcoming episodes');
      return results;
    },
    enabled: trackedTVShows.length > 0,
    staleTime: 1000 * 60 * 15,
  });

  const currentWatchingShows = useMemo(() => {
    return shows.filter((show: Show) => show.status === 'Watching').slice(0, 2);
  }, [shows]);

  const planToWatchShows = useMemo(() => {
    return shows.filter((show: Show) => show.status === 'Plan to Watch').slice(0, 10);
  }, [shows]);

  const [planToWatchWithThumbnails, setPlanToWatchWithThumbnails] = useState<(Show & { posterUrl?: string | null })[]>([]);
  
  const fetchShowThumbnails = useCallback(async () => {
    const allShows = [...currentWatchingShows, ...planToWatchShows];
    if (allShows.length === 0) return;
    
    try {
      const showsWithPosters = await Promise.all(
        allShows.map(async (show) => {
          if (show.tmdbId && show.mediaType) {
            try {
              if (show.mediaType === 'movie') {
                const movieDetails = await tmdbApi.getMovieDetails(show.tmdbId);
                return {
                  ...show,
                  posterUrl: tmdbApi.getImageUrl(movieDetails.poster_path, 'w300') || undefined
                };
              } else {
                const tvDetails = await tmdbApi.getTVShowDetails(show.tmdbId);
                return {
                  ...show,
                  posterUrl: tmdbApi.getImageUrl(tvDetails.poster_path, 'w300') || undefined
                };
              }
            } catch {
              return { ...show, posterUrl: undefined };
            }
          }
          return { ...show, posterUrl: undefined };
        })
      );
      
      const watchingWithPosters = showsWithPosters.filter(s => s.status === 'Watching');
      const planToWatchWithPosters = showsWithPosters.filter(s => s.status === 'Plan to Watch');
      
      setShowsWithThumbnails(watchingWithPosters);
      setPlanToWatchWithThumbnails(planToWatchWithPosters);
    } catch {
      setShowsWithThumbnails(currentWatchingShows);
      setPlanToWatchWithThumbnails(planToWatchShows);
    }
  }, [currentWatchingShows, planToWatchShows]);

  const fetchYounifyContinueWatching = useCallback(async () => {
    try {
      const linkedList = await getLinkedStreamingServicesList();
      setLinkedStreamingCount(linkedList.length);
      const orderedProviderIds = Array.from(
        new Set(
          linkedList
            .map((service) =>
              younifySourceToTmdbProviderId({
                id: String(service?.id ?? ''),
                name: String(service?.name ?? ''),
              }),
            )
            .filter((id): id is number => id != null),
        ),
      );
      setLinkedProviderIds(orderedProviderIds);
      if (!linkedList.length) {
        setYounifyContinueItems([]);
        setYounifyBrowseSections([]);
        return;
      }
      const sections = await fetchYounifyBrowseSections();
      setYounifyBrowseSections(Array.isArray(sections) ? sections : []);
      const continueSection = Array.isArray(sections)
        ? sections.find((s) => s.id === 'continue')
        : undefined;
      const items = continueSection?.items;
      setYounifyContinueItems(Array.isArray(items) ? (items as Record<string, unknown>[]) : []);
    } catch (e) {
      if (__DEV__) console.warn('[Activities] Younify continue watching failed', e);
      setYounifyContinueItems([]);
      setYounifyBrowseSections([]);
      setLinkedProviderIds([]);
    }
  }, []);

  const younifyEpisodeIndex = useMemo(
    () => buildYounifyProviderIndex(younifyBrowseSections, linkedProviderIds),
    [younifyBrowseSections, linkedProviderIds],
  );

  useEffect(() => {
    void fetchShowThumbnails();
  }, [fetchShowThumbnails]);

  useFocusEffect(
    useCallback(() => {
      void fetchYounifyContinueWatching();
    }, [fetchYounifyContinueWatching]),
  );

  const continueWatchingItems = useMemo((): ActivitiesContinueItem[] => {
    const out: ActivitiesContinueItem[] = [];
    const seenTmdb = new Set<number>();
    for (const row of younifyContinueItems) {
      const id = extractTmdbIdFromYounifyRow(row);
      if (id != null) seenTmdb.add(id);
      const key = String(
        (row as Record<string, unknown>).itemID ??
          (row as Record<string, unknown>).id ??
          `yf-${out.length}`,
      );
      out.push({ kind: 'younify', row, key });
    }
    for (const show of showsWithThumbnails) {
      if (show.tmdbId != null && seenTmdb.has(show.tmdbId)) continue;
      out.push({ kind: 'local', show });
    }
    return out.filter((item) => !dismissedContinueWatching.includes(getContinueWatchingDismissKey(item)));
  }, [younifyContinueItems, showsWithThumbnails, dismissedContinueWatching]);

  const younifyContinueByTmdbId = useMemo(() => {
    const map = new Map<number, Record<string, unknown>>();
    for (const row of younifyContinueItems) {
      const tmdbId = extractTmdbIdFromYounifyRow(row);
      if (tmdbId != null && !map.has(tmdbId)) {
        map.set(tmdbId, row);
      }
    }
    return map;
  }, [younifyContinueItems]);

  const visibleNewEpisodes = useMemo(() => {
    return (newEpisodesForMyShows.data ?? []).filter((item) => {
      const isRecentRelease = item.latestEpisode?.airDate && new Date(item.latestEpisode.airDate) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const ep = isRecentRelease ? item.latestEpisode : item.nextEpisode;
      if (!ep) return false;
      const key = `${item.tmdbId}-s${ep.seasonNumber}e${ep.episodeNumber}`;
      return !dismissedEpisodes.includes(key);
    });
  }, [newEpisodesForMyShows.data, dismissedEpisodes]);

  const recoveryHopeInput = useMemo(() => {
    const calendarEvents = getUpcomingCalendarEvents(14);
    const savedEvents = profile?.savedEvents ?? [];
    const todayCalendar = buildTodayCalendarHighlights(
      [...getTodayCalendarEvents(), ...calendarEvents],
      todayYmd,
      savedEvents
    ).map((c) => ({ title: c.title, timeLabel: c.timeLabel }));

    const recentWins = completedTodayMatches
      .filter((m) => {
        if (m.homeScore == null || m.awayScore == null) return false;
        const homeTeamIsFavorite = isFavoriteTeam(m.homeTeam);
        const awayTeamIsFavorite = isFavoriteTeam(m.awayTeam);
        if (homeTeamIsFavorite && m.homeScore > m.awayScore) return true;
        if (awayTeamIsFavorite && m.awayScore > m.homeScore) return true;
        return false;
      })
      .slice(0, 2)
      .map((m) => {
        const homeScore = m.homeScore ?? 0;
        const awayScore = m.awayScore ?? 0;
        const homeWon = homeScore > awayScore;
        return {
          team: homeWon ? m.homeTeam : m.awayTeam,
          opponent: homeWon ? m.awayTeam : m.homeTeam,
          score: `${homeScore}-${awayScore}`,
          date: m.date,
        };
      });

    const sportsBeats = buildSportsEmotionalBeats({
      todayYmd,
      recentWins,
      upcomingMatches: upcomingMatches.slice(0, 8).map((m) => ({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        date: m.date,
        time: m.time,
      })),
      liveMatches: liveMatches.map((m) => ({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        date: m.date,
        time: m.time,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      })),
    });

    const newEpisodes = visibleNewEpisodes.slice(0, 3).map((item) => {
      const ep = item.latestEpisode ?? item.nextEpisode;
      const epLabel = ep
        ? `S${ep.seasonNumber}E${ep.episodeNumber}`
        : undefined;
      return {
        title: item.showTitle || 'Show',
        episodeLabel: epLabel,
      };
    });

    const habitTasks = (tasksContext?.allTasks ?? []).filter((t) => t.isHabit);
    const joySources = resolveEffectiveJoySources({
      profile,
      shows,
      habitTasks,
    });

    const timedHeadlines = upcomingMatches
      .filter((m) => m.date === todayYmd)
      .flatMap((m) => {
        const homeFav = isFavoriteTeam(m.homeTeam);
        const awayFav = isFavoriteTeam(m.awayTeam);
        if (!homeFav && !awayFav) return [];
        const team = homeFav ? m.homeTeam : m.awayTeam;
        const opponent = homeFav ? m.awayTeam : m.homeTeam;
        const time = m.time?.trim();
        return [
          {
            headline: time
              ? `${team} kick off at ${time} vs ${opponent}`
              : `${team} play today vs ${opponent}`,
            priority: 91,
            kind: 'sport' as const,
          },
        ];
      })
      .slice(0, 2);

    return {
      todayYmd,
      profile,
      joySources,
      sportsBeats,
      newEpisodes,
      todayCalendar,
      timedHeadlines,
      weather: weather
        ? {
            temp: weather.temp ?? 0,
            condition: weather.condition || '',
            description: weather.description || '',
          }
        : undefined,
      showsWatching: shows,
    };
  }, [
    todayYmd,
    profile,
    shows,
    weather,
    upcomingMatches,
    liveMatches,
    completedTodayMatches,
    visibleNewEpisodes,
    isFavoriteTeam,
    getTodayCalendarEvents,
    getUpcomingCalendarEvents,
    tasksContext?.allTasks,
  ]);

  const recoveryPatternInsight = useMemo(
    () =>
      detectRecoveryPatternInsight(
        (tasksContext?.allTasks ?? []).filter((t) => t.isHabit),
        todayYmd
      ),
    [tasksContext?.allTasks, todayYmd]
  );

  const recovery = useRecoveryMode(recoveryHopeInput);

  const upcomingEventsPreview = useMemo(() => {
    type PreviewEvent = { id: string; title: string; startDate: string; kind: 'calendar' | 'onepager' };

    const fromCalendar: PreviewEvent[] = getUpcomingCalendarEvents(90).map((event) => ({
      id: event.id,
      title: event.title,
      startDate: event.startDate,
      kind: 'calendar' as const,
    }));

    const fromOnePager: PreviewEvent[] = upcomingSaved
      .filter((event) => event.startIso)
      .map((event) => ({
        id: event.id,
        title: event.title,
        startDate: event.startIso!,
        kind: 'onepager' as const,
      }));

    const seen = new Set<string>();
    return [...fromOnePager, ...fromCalendar]
      .filter((event) => {
        if (seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 4);
  }, [getUpcomingCalendarEvents, calendars.length, eventKit.hasPermission, upcomingSaved]);

  const handleStartWatching = useCallback(async (show: Show) => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    appContext?.updateShow({ ...show, status: 'Watching' });
  }, [appContext]);

  const fetchWeather = useCallback(async () => {
    try {
      if (__DEV__) console.log('🌤️ Fetching weather...');
      const weatherData = await getCurrentWeather();
      setWeather(weatherData);
    } catch (error) {
      if (__DEV__) console.error('❌ Weather fetch error:', error);
    }
  }, []);

  useEffect(() => {
    void fetchWeather();
  }, [fetchWeather]);

  const buildTodayStatsSnapshot = useCallback(
    (
      todayYmd: string,
      habitRollup: DailySummaryHabitRollup | null,
      completedTasksCount: number,
      totalTasksCount: number,
      summaryScore?: number
    ): DailyStatsSnapshot => {
      const completedHabits = habitRollup?.completedCount ?? stats.completedHabits;
      const totalHabits = habitRollup?.scheduledCount ?? stats.totalHabits;
      const rate =
        totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
      return {
        date: todayYmd,
        completedHabits,
        totalHabits,
        completedTasks: completedTasksCount,
        totalTasks: totalTasksCount,
        habitCompletionRate: rate,
        summaryScore,
      };
    },
    [stats.completedHabits, stats.totalHabits]
  );

  const refreshYesterdayDelta = useCallback(
    async (snapshot: DailyStatsSnapshot) => {
      const yesterday = await loadYesterdayStats(userId, snapshot.date);
      setYesterdayDelta(computeStatsDelta(snapshot, yesterday));
    },
    [userId]
  );

  useEffect(() => {
    void (async () => {
      const schedule = await getAutoSummarySchedule(userId);
      const tf = profile?.displayPreferences?.timeFormat === '24h' ? '24h' : '12h';
      setAutoSummaryScheduleLabel(formatAutoSummaryTime(schedule.hour, schedule.minute, tf));
    })();
  }, [userId, profile?.displayPreferences?.timeFormat]);

  useEffect(() => {
    void isAutoSummaryHintDismissed(userId).then(setAutoSummaryHintDismissed);
  }, [userId]);

  const handleDismissAutoSummaryHint = useCallback(() => {
    setAutoSummaryHintDismissed(true);
    void dismissAutoSummaryHint(userId);
  }, [userId]);

  useEffect(() => {
    void (async () => {
      const dismissed = await isDailySummaryDismissed(userId, todayYmd);
      const cached = dismissed ? null : await loadDailySummaryCache(userId, todayYmd);
      if (cached) setDailySummary(cached);
      const allTasks = tasksContext?.allTasks || [];
      const legacyHabits = appContext?.todayHabits || [];
      const habitEntries = buildTodayHabitEntries(allTasks, legacyHabits, todayYmd);
      const { rollup } = buildSummaryHabitsFromEntries(habitEntries);
      const regularTasks = allTasks.filter((t) => !t.isHabit);
      const completedTasksCount = regularTasks.filter((t) => t.status === 'completed').length;
      const snap = buildTodayStatsSnapshot(
        todayYmd,
        rollup,
        completedTasksCount,
        regularTasks.length,
        cached?.score
      );
      await refreshYesterdayDelta(snap);
    })();
  }, [userId, todayYmd, appContext?.todayHabits, tasksContext?.allTasks, buildTodayStatsSnapshot, refreshYesterdayDelta]);

  const generateDailySummary = useCallback(async () => {
    setIsGeneratingSummary(true);
    try {
      const _ds = new Date();
      const today = `${_ds.getFullYear()}-${String(_ds.getMonth() + 1).padStart(2, '0')}-${String(_ds.getDate()).padStart(2, '0')}`;
      
      const legacyHabits = appContext?.todayHabits || [];
      const allTasks = tasksContext?.allTasks || [];
      const habitEntries = buildTodayHabitEntries(allTasks, legacyHabits, today);
      const { habits: habitsForSummary, rollup: habitRollup } =
        buildSummaryHabitsFromEntries(habitEntries);

      const regularTasks = allTasks.filter((task) => !task.isHabit);
      const tasksForSummary = regularTasks.map((task) => ({
        name: task.title,
        completed: task.status === 'completed',
        priority: task.priority,
        category: task.category,
      }));
      const priorityTasks = buildPriorityTaskHighlights(allTasks);

      const completedTasksCount = tasksForSummary.filter((t) => t.completed).length;
      const totalTasksCount = tasksForSummary.length;
      
      // Prepare upcoming matches data (next 7 days)
      const upcomingMatchesForSummary = upcomingMatches.slice(0, 5).map(m => ({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        date: m.date,
        time: m.time,
        competition: m.league
      }));
      
      // Prepare recent wins (completed matches where favorite team won)
      const recentWins = completedTodayMatches
        .filter(m => {
          if (m.homeScore == null || m.awayScore == null) return false;
          const homeTeamIsFavorite = isFavoriteTeam(m.homeTeam);
          const awayTeamIsFavorite = isFavoriteTeam(m.awayTeam);
          
          if (homeTeamIsFavorite && m.homeScore > m.awayScore) return true;
          if (awayTeamIsFavorite && m.awayScore > m.homeScore) return true;
          return false;
        })
        .slice(0, 3)
        .map(m => {
          const homeScore = m.homeScore ?? 0;
          const awayScore = m.awayScore ?? 0;
          const homeWon = homeScore > awayScore;
          return {
            team: homeWon ? m.homeTeam : m.awayTeam,
            opponent: homeWon ? m.awayTeam : m.homeTeam,
            score: `${homeScore}-${awayScore}`,
            date: m.date
          };
        });
      
      const calendarEvents = getUpcomingCalendarEvents(14);
      const savedEvents = profile?.savedEvents ?? [];
      const upcomingEventsForSummary = buildUpcomingEventsForSummary(
        calendarEvents,
        today,
        savedEvents
      );
      const todayCalendar = buildTodayCalendarHighlights(
        [...getTodayCalendarEvents(), ...calendarEvents],
        today,
        savedEvents
      );
      const savedDiscoveryEvents = buildSavedEventsHighlights(savedEvents, today);
      const continueWatching = buildContinueWatchingHighlights(continueWatchingItems);
      const sportsBeats = buildSportsEmotionalBeats({
        todayYmd: today,
        recentWins,
        upcomingMatches: upcomingMatchesForSummary,
        liveMatches: liveMatches.map((m) => ({
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          date: m.date,
          time: m.time,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
        })),
      });

      const weatherForSummary = weather ? {
        condition: weather.condition || '',
        temp: weather.temp ?? 0,
        description: weather.description || '',
        city: weather.city || '',
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
      } : undefined;

      const rollupNote = habitRollup
        ? `${habitRollup.ratioLabel} habits scheduled for today (${habitRollup.incompleteCount} open)`
        : `Completed ${stats.completedHabits}/${stats.totalHabits} habits`;

      const openItems = buildOpenItemsForSummary({
        habitIncompleteNames: habitRollup?.incompleteNames,
        priorityTasks,
        tasks: tasksForSummary,
      });

      const todaySnapshot = buildTodayStatsSnapshot(
        today,
        habitRollup,
        completedTasksCount,
        totalTasksCount
      );
      const yesterdayStats = await loadYesterdayStats(userId, today);
      const preDelta = computeStatsDelta(todaySnapshot, yesterdayStats);
      const yesterdayContext = preDelta
        ? {
            habitsLabel: preDelta.habitsLabel,
            tasksLabel: preDelta.tasksLabel,
            scoreLabel: preDelta.scoreLabel,
          }
        : null;

      const summary = await summarizeDailyProgress({
        date: today,
        recoveryMode: recovery.isActive,
        activities: activities.map((a) => ({ name: a.title, minutes: a.timeSpent, details: a.description })),
        habits: habitsForSummary,
        habitRollup,
        tasks: tasksForSummary,
        priorityTasks,
        openItems,
        yesterdayContext,
        shows: shows.filter((s) => s.status === 'Watching').map((s) => ({
          title: s.title,
          episode: s.currentEpisode?.toString(),
        })),
        continueWatching,
        sports: upcomingMatches.map((m) => ({ team: `${m.homeTeam} vs ${m.awayTeam}`, result: m.status })),
        sportsBeats,
        upcomingMatches: upcomingMatchesForSummary,
        recentWins,
        upcomingEvents: upcomingEventsForSummary,
        savedDiscoveryEvents,
        todayCalendar,
        weather: weatherForSummary,
        notes: `${rollupNote}; ${completedTasksCount}/${totalTasksCount} regular tasks completed`,
      });
      setDailySummary(summary);

      const snapshotWithScore = buildTodayStatsSnapshot(
        today,
        habitRollup,
        completedTasksCount,
        totalTasksCount,
        summary.score
      );
      await saveDailyStatsSnapshot(userId, snapshotWithScore);
      await saveDailySummaryCache(userId, today, summary);
      await clearDailySummaryDismissed(userId, today);
      await refreshYesterdayDelta(snapshotWithScore);
    } catch (error) {
      if (__DEV__) console.error('Error generating daily summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activities,
    shows,
    upcomingMatches,
    completedTodayMatches,
    isFavoriteTeam,
    stats,
    appContext?.todayHabits,
    tasksContext?.allTasks,
    weather,
    calendars,
    continueWatchingItems,
    liveMatches,
    profile?.savedEvents,
    getTodayCalendarEvents,
    getUpcomingCalendarEvents,
    userId,
    buildTodayStatsSnapshot,
    refreshYesterdayDelta,
    recovery.isActive,
  ]);

  useFocusEffect(
    useCallback(() => {
      const tick = async () => {
        if (showUnifiedView || isGeneratingSummary || autoSummaryInFlightRef.current) return;
        const todayYmd = getTodayYmd();
        const dismissed = await isDailySummaryDismissed(userId, todayYmd);
        const existing = await loadDailySummaryCache(userId, todayYmd);
        if (dismissed || existing) return;
        const enabled = await isAutoSummaryEnabled(userId);
        if (!enabled) return;
        const schedule = await getAutoSummarySchedule(userId);
        if (!shouldRunAutoSummaryNow(new Date(), schedule.hour, schedule.minute)) return;
        autoSummaryInFlightRef.current = true;
        try {
          await generateDailySummary();
        } finally {
          autoSummaryInFlightRef.current = false;
        }
      };

      void tick();
      const interval = setInterval(() => void tick(), 60_000);
      return () => clearInterval(interval);
    }, [showUnifiedView, isGeneratingSummary, userId, generateDailySummary])
  );
  
  const navigateToHabits = () => {
    router.push('/tasks' as any);
  };
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = profile?.name?.split(' ')[0] || 'there';
    
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  };

  const getChronotypeSubtitle = (): string | null => {
    if (!profile?.chronotype) return null;
    const chronoInfo = getChronotypeInfo(profile.chronotype);
    if (!chronoInfo) return null;
    const tip = getChronotypeGreetingTip(chronoInfo);
    return tip || null;
  };

  const getHeroSubtitle = (): string | null => getChronotypeSubtitle();
  
  const getTimeEmoji = () => {
    if (weather) {
      const condition = weather.condition?.toLowerCase() || '';
      if (weather.isStormy) return '⛈️';
      if (weather.isRaining) return '🌧️';
      if (weather.isSnowing) return '❄️';
      if (condition.includes('mist') || condition.includes('fog') || condition.includes('haze')) return '🌫️';
      if (weather.isCloudy) return weather.isDayTime ? '⛅' : '☁️';
      if (weather.isClear) return weather.isDayTime ? '☀️' : '🌙';
    }
    const hour = new Date().getHours();
    if (hour < 6) return '🌙';
    if (hour < 12) return '☀️';
    if (hour < 17) return '☀️';
    if (hour < 21) return '🌆';
    return '🌙';
  };
  
  const isDayTime = () => {
    if (weather) {
      return weather.isDayTime;
    }
    const hour = new Date().getHours();
    return hour >= 6 && hour < 20;
  };

  const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  };

  const getGradientColors = (): string[] => {
    const timeOfDay = getTimeOfDay();
    if (weather) {
      return [
        ...getHeroGradientColors(weather.condition, weather.isDayTime, weather.cloudiness ?? 0, {
          description: weather.description,
          timeOfDay,
        }),
      ];
    }
    return [...getHeroGradientColors('clear', timeOfDay !== 'night', 0, { timeOfDay })];
  };
  
  const getHeroTextColor = (): string => {
    const timeOfDay = getTimeOfDay();
    const condition = weather?.condition?.toLowerCase() || '';
    const hour = new Date().getHours();
    const isDark = timeOfDay === 'night' || weather?.isStormy;
    const isMuted = weather?.isRaining || (weather?.isCloudy && timeOfDay === 'evening');
    const isFoggy = condition.includes('mist') || condition.includes('fog') || condition.includes('haze');
    if (isDark || (isMuted && (hour < 5 || hour >= 21))) return '#F8FAFC';
    if (isFoggy) return '#2D3748';
    if (isMuted) return '#1E293B';
    return '#1E293B';
  };
  
  const getHeroSecondaryTextColor = (): string => {
    const timeOfDay = getTimeOfDay();
    const condition = weather?.condition?.toLowerCase() || '';
    const isDark = timeOfDay === 'night' || weather?.isStormy;
    const isFoggy = condition.includes('mist') || condition.includes('fog') || condition.includes('haze');
    if (isDark) return 'rgba(248, 250, 252, 0.7)';
    if (isFoggy) return 'rgba(45, 55, 72, 0.7)';
    return 'rgba(30, 41, 59, 0.7)';
  };
  
  const getTodayDate = () => {
    return new Date().toLocaleDateString('en-GB', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  /** Must be declared before `rankedUpNextShows` / handlers that call it (avoid TDZ during sync useMemo). */
  const platformNameToProviderId = (platform: string): number | null => {
    const p = String(platform || '').toLowerCase();
    if (!p) return null;
    if (p.includes('netflix')) return 8;
    if (p.includes('disney')) return 337;
    if (p.includes('prime')) return 9;
    if (p.includes('amazon')) return 9;
    if (p.includes('hbo') || p.includes('max')) return 1899;
    if (p.includes('hulu')) return 15;
    if (p.includes('peacock')) return 386;
    if (p.includes('paramount')) return 531;
    if (p.includes('apple')) return 350;
    if (p.includes('crunchyroll')) return 283;
    if (p.includes('youtube')) return 192;
    if (p.includes('fubo')) return 257;
    if (p.includes('tubi')) return 73;
    if (p.includes('plex')) return 1770;
    if (p.includes('amc')) return 526;
    if (p.includes('pluto')) return 300;
    if (p.includes('viki') || p.includes('rakuten')) return 582;
    return null;
  };

  const handleContinueWatching = async (show: Show & { posterUrl?: string | null }) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (show.tmdbId) {
      const matchedRow = pickBestYounifyRowForEpisode(younifyEpisodeIndex, {
        tmdbId: show.tmdbId,
        title: show.title,
        seasonNumber: show.currentSeason,
        episodeNumber: show.currentEpisode,
      });
      if (matchedRow) {
        await openYounifyBrowseItemOnPlatform(matchedRow, { sectionId: 'continue' });
        return;
      }
    }

    const providerId = platformNameToProviderId(show.platform);
    if (providerId != null) {
      const younifyRow = show.tmdbId ? younifyContinueByTmdbId.get(show.tmdbId) : undefined;
      const episodeHint = formatShowEpisodeLabel(show, younifyRow, 'compact') ?? undefined;
      const openedSearch = await openStreamingTitleSearch(providerId, show.title, undefined, episodeHint);
      if (openedSearch) return;
      const openedApp = await openStreamingApp(providerId, show.title);
      if (openedApp) return;
    }

    if (show.tmdbId && show.mediaType) {
      setShowInfoModal({ visible: true, tmdbId: show.tmdbId, mediaType: show.mediaType, title: show.title, platform: show.platform });
      return;
    }
    router.push(SHOWS_HREF.streaming as any);
  };

  const rankedUpNextShows = useMemo(() => {
    const now = Date.now();
    const watchingPlatforms = new Set(currentWatchingShows.map((s) => s.platform));
    const watchingTypes = new Set(currentWatchingShows.map((s) => s.type));

    const scored = planToWatchWithThumbnails.map((show) => {
      const updatedAtMs = Date.parse(show.updatedAt || show.createdAt || '');
      const daysOld = Number.isFinite(updatedAtMs) ? (now - updatedAtMs) / (1000 * 60 * 60 * 24) : 365;
      const freshnessScore = Math.max(0, 30 - daysOld) / 30;
      const ratingScore = Math.max(0, Math.min(5, Number(show.rating || 0))) / 5;
      const providerId = platformNameToProviderId(show.platform);
      const providerLinkedBoost = providerId != null && linkedProviderIds.includes(providerId) ? 1 : 0;
      const platformContinuity = watchingPlatforms.has(show.platform) ? 1 : 0;
      const typeContinuity = watchingTypes.has(show.type) ? 1 : 0;
      const tmdbBoost = show.tmdbId ? 1 : 0;

      const score =
        freshnessScore * 0.34 +
        ratingScore * 0.18 +
        providerLinkedBoost * 0.2 +
        platformContinuity * 0.14 +
        typeContinuity * 0.09 +
        tmdbBoost * 0.05;

      return { show, score };
    });

    return scored.sort((a, b) => b.score - a.score).map((x) => x.show).slice(0, 4);
  }, [planToWatchWithThumbnails, currentWatchingShows, linkedProviderIds]);

  const renderContinueWatchingCard = useCallback(({ item, index }: { item: ActivitiesContinueItem; index: number }) => {
    const dismissBtn = (
      <TouchableOpacity
        style={styles.cwRemoveBtn}
        onPress={() => confirmDismissContinueWatching(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Remove from Continue Watching"
        accessibilityRole="button"
        testID={`cw-dismiss-${getContinueWatchingDismissKey(item)}`}
      >
        <X size={12} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    );

    if (item.kind === 'local') {
      const show = item.show;
      const reliableRow = show.tmdbId ? younifyContinueByTmdbId.get(show.tmdbId) : undefined;
      const providerProgress = reliableRow ? getContinueWatchingProgressPercent(reliableRow) : 0;
      const resolvedEpisode = formatShowEpisodeLabel(show, reliableRow, 'spaced');
      const localProgress = show.type === 'Series' && show.totalEpisodes && show.currentEpisode
        ? Math.min((show.currentEpisode / show.totalEpisodes) * 100, 100)
        : 0;
      const progress =
        providerProgress > 0 ? providerProgress : resolvedEpisode ? localProgress : 0;
      const episodeLabel = resolvedEpisode ?? (show.type === 'Series' ? 'Resume' : null);
      return (
        <TouchableOpacity
          key={show.id}
          style={[
            styles.cwCard,
            { backgroundColor: colors.card, borderColor: colors.border },
            index === 0 && { marginLeft: 0 },
          ]}
          onPress={() => handleContinueWatching(show)}
          activeOpacity={0.85}
          testID={`cw-card-${show.id}`}
        >
          <View style={styles.cwPosterWrap}>
            {dismissBtn}
            {show.posterUrl ? (
              <Image source={{ uri: show.posterUrl }} style={styles.cwPoster} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[getPlatformColor(show.platform), `${getPlatformColor(show.platform)}66`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cwPosterFallback}
              >
                <Tv size={28} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            )}
          </View>
          <View style={styles.cwCardInfo}>
            <Text style={[styles.cwCardTitle, { color: colors.text }]} numberOfLines={2}>{show.title}</Text>
            <View style={styles.cwCardMeta}>
              {episodeLabel ? (
                <Text style={[styles.cwCardEpisode, { color: colors.textSecondary }]} numberOfLines={1}>{episodeLabel}</Text>
              ) : null}
            </View>
            {progress > 0 ? (
              <View style={styles.cwProgressTrack}>
                <View style={[styles.cwProgressFill, { width: `${progress}%` }]} />
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    }

    const { row, key } = item;
    const continueEpisodeLabel = formatYounifyContinueEpisodeLabel(row) ?? 'Resume';
    const svc = row.younifySourceService as YounifySourceServiceSnapshot | undefined;
    const yProgress = getContinueWatchingProgressPercent(row);

    return (
      <TouchableOpacity
        key={`younify-cw-${key}`}
        style={[
          styles.cwCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          index === 0 && { marginLeft: 0 },
        ]}
        onPress={async () => {
          if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          await openYounifyBrowseItemOnPlatform(row, { sectionId: 'continue' });
        }}
        activeOpacity={0.85}
        testID={`cw-card-younify-${key}`}
      >
        <View style={styles.cwPosterWrap}>
          {dismissBtn}
          <TmdbStreamingPosterImage younifyRow={row} width={CW_CARD_WIDTH} style={styles.cwPoster} />
          {linkedStreamingCount >= 2 && svc?.id ? (
            <View style={styles.cwYounifyLogoMark} pointerEvents="none">
              <YounifyServiceLogoMark service={svc} size={28} />
            </View>
          ) : null}
        </View>
        <View style={styles.cwCardInfo}>
          <Text style={[styles.cwCardTitle, { color: colors.text }]} numberOfLines={2}>
            {String(row.showTitle || row.title || 'Continue watching')}
          </Text>
          <View style={styles.cwCardMeta}>
            <Text style={[styles.cwCardEpisode, { color: colors.textSecondary }]} numberOfLines={1}>{continueEpisodeLabel}</Text>
          </View>
          {yProgress > 0 ? (
            <View style={styles.cwProgressTrack}>
              <View style={[styles.cwProgressFill, { width: `${yProgress}%` }]} />
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }, [younifyContinueByTmdbId, handleContinueWatching, confirmDismissContinueWatching, linkedStreamingCount, colors.card, colors.border, colors.text, colors.textSecondary]);

  const handleContinueWatchingYounify = useCallback(async (row: Record<string, unknown>) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await openYounifyBrowseItemOnPlatform(row, { sectionId: 'continue' });
  }, []);
  
  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'Netflix': return '#E50914';
      case 'Disney+': return '#113CCF';
      case 'Prime': return '#00A8E1';
      case 'HBO': return '#8A2BE2';
      case 'Hulu': return '#1CE783';
      case 'YouTube': return '#FF0000';
      default: return COLORS.primary;
    }
  };

  const handleOpenNewEpisode = useCallback(
    async (item: TrackedShowEpisode) => {
      const isRecentRelease =
        item.latestEpisode?.airDate &&
        new Date(item.latestEpisode.airDate) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const ep = isRecentRelease ? item.latestEpisode : item.nextEpisode;

      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (!ep) {
        if (item.tmdbId) {
          setShowInfoModal({
            visible: true,
            tmdbId: item.tmdbId,
            mediaType: 'tv',
            title: item.showTitle,
            platform: item.platform,
          });
        } else {
          router.push(SHOWS_HREF.streaming as any);
        }
        return;
      }

      const episodeHint = `S${ep.seasonNumber}E${ep.episodeNumber}`;

      if (linkedStreamingCount > 0) {
        try {
          const matchedRow = pickBestYounifyRowForEpisode(younifyEpisodeIndex, {
            tmdbId: item.tmdbId,
            title: item.showTitle,
            seasonNumber: ep.seasonNumber,
            episodeNumber: ep.episodeNumber,
          });
          if (matchedRow) {
            // Do not use `continue`: that applies resume offsets for in-progress playback, not “new episode”.
            await openYounifyBrowseItemOnPlatform(matchedRow);
            return;
          }
        } catch (error) {
          if (__DEV__) console.warn('[Activities] Failed to open Younify deeplink for episode', error);
        }
      }

      const providerId = platformNameToProviderId(item.platform);
      if (providerId) {
        const opened = await openStreamingTitleSearch(providerId, item.showTitle, undefined, episodeHint);
        if (opened) return;
      }
      if (item.tmdbId) {
        setShowInfoModal({
          visible: true,
          tmdbId: item.tmdbId,
          mediaType: 'tv',
          title: item.showTitle,
          platform: item.platform,
        });
      } else {
        router.push(SHOWS_HREF.streaming as any);
      }
    },
    [linkedStreamingCount, younifyEpisodeIndex, router],
  );

  const renderLoadingState = () => (
    <SwipeableTabContainer>
      <Stack.Screen options={{ headerShown: false }} />
      <EnhancedLoadingState
        message="Loading your activities"
        type="activities"
      />
    </SwipeableTabContainer>
  );

  if (!appContext) {
    return renderLoadingState();
  }

  return (
    <SwipeableTabContainer>
      <TabWalkthrough tabName="activities" />
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 152 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([
                fetchMatches(),
                fetchShowThumbnails(),
                fetchYounifyContinueWatching(),
                fetchWeather(),
                newEpisodesForMyShows.refetch(),
              ]);
              setRefreshing(false);
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Hero Section with Gradient - Matching Morning Dashboard */}
        <View>
        <LinearGradient
          colors={getGradientColors() as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          {/* Decorative Orbs - Matching Morning Dashboard */}
          <View style={styles.decorativeOrb1} />
          <View style={styles.decorativeOrb2} />
          <View style={styles.decorativeOrb3} />
          {/* Weather Effects */}
          {weather?.isStormy && (
            <Animated.View 
              style={[
                styles.lightningOverlay,
                {
                  opacity: lightning.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.7]
                  })
                }
              ]} 
            />
          )}

          {weather?.isRaining && (
            <>
              {rainDrops.map((drop, index) => (
                <Animated.View
                  key={`rain-${index}`}
                  style={[
                    styles.rainDrop,
                    {
                      left: (index * 25) % 380,
                      transform: [
                        {
                          translateY: drop.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-50, 400]
                          })
                        }
                      ],
                      opacity: drop.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 0.6, 0]
                      })
                    }
                  ]}
                >
                  <Text style={styles.rainEmoji}>💧</Text>
                </Animated.View>
              ))}
            </>
          )}

          {weather?.isSnowing && (
            <>
              {snowFlakes.map((flake, index) => (
                <Animated.View
                  key={`snow-${index}`}
                  style={[
                    styles.snowFlake,
                    {
                      left: (index * 20) % 380,
                      transform: [
                        {
                          translateY: flake.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-50, 400]
                          })
                        },
                        {
                          translateX: flake.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, 15, -15]
                          })
                        },
                        {
                          rotate: flake.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg']
                          })
                        }
                      ],
                      opacity: flake.interpolate({
                        inputRange: [0, 0.2, 0.8, 1],
                        outputRange: [0, 0.8, 0.8, 0]
                      })
                    }
                  ]}
                >
                  <Text style={styles.snowEmoji}>❄️</Text>
                </Animated.View>
              ))}
            </>
          )}

          {/* Animated Clouds (Night/Rainy) or Birds (Clear Day) */}
          {(!isDayTime() || weather?.isCloudy || weather?.isRaining || weather?.isStormy) ? (
            <>
              <Animated.View
                style={[
                  styles.cloud,
                  styles.cloud1,
                  {
                    transform: [
                      {
                        translateX: cloud1X.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-100, 400]
                        })
                      }
                    ]
                  }
                ]}
              >
                <Text style={styles.cloudEmoji}>☁️</Text>
              </Animated.View>
              <Animated.View
                style={[
                  styles.cloud,
                  styles.cloud2,
                  {
                    transform: [
                      {
                        translateX: cloud2X.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-150, 450]
                        })
                      }
                    ]
                  }
                ]}
              >
                <Text style={styles.cloudEmoji}>☁️</Text>
              </Animated.View>
              <Animated.View
                style={[
                  styles.cloud,
                  styles.cloud3,
                  {
                    transform: [
                      {
                        translateX: cloud3X.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-80, 420]
                        })
                      }
                    ]
                  }
                ]}
              >
                <Text style={styles.cloudEmoji}>☁️</Text>
              </Animated.View>
            </>
          ) : null}
          
          {/* Always show flying birds - Matching Morning Dashboard */}
          <FlyingBirds 
            count={8}
            colors={getTimeOfDay() === 'night' || weather?.isStormy || weather?.isRaining 
              ? ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.2)']
              : ['rgba(30,30,30,0.35)', 'rgba(50,50,50,0.25)', 'rgba(70,70,70,0.2)']}
            speed="medium"
          />

          <View style={[styles.heroContent, { paddingTop: insets.top + 16 }]}>
            <Animated.View 
              style={[
                styles.greetingContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <View style={styles.greetingRow}>
                <Animated.Text 
                  style={[
                    styles.timeEmoji,
                    {
                      transform: [
                        { scale: isDayTime() ? sunScale : moonScale }
                      ]
                    }
                  ]}
                >
                  {getTimeEmoji()}
                </Animated.Text>
                <View style={styles.greetingTextContainer}>
                  <Text style={[styles.greetingText, { color: getHeroTextColor() }]}>{getGreeting()}</Text>
                  <Text style={[styles.dateText, { color: getHeroSecondaryTextColor() }]} numberOfLines={2}>
                    {getTodayDate()}{getHeroSubtitle() ? `  · ${getHeroSubtitle()}` : ''}
                  </Text>
                </View>
                {/* Weather Info Badge */}
                {weather && (
                  <TouchableOpacity
                    onPress={() => setShowWeatherModal(true)}
                    activeOpacity={0.8}
                  >
                    <Animated.View 
                      style={[
                        styles.weatherBadge,
                        {
                          opacity: fadeAnim,
                          transform: [{ scale: fadeAnim }]
                        }
                      ]}
                    >
                      <Text style={[styles.weatherTemp, { color: getHeroTextColor() }]}>{weather.temp}°</Text>
                      <Text style={[styles.weatherDescription, { color: getHeroSecondaryTextColor() }]}>{weather.description}</Text>
                    </Animated.View>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>

            {/* Quick Stats Row */}
            <Animated.View 
              style={[
                styles.quickStatsRow,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <TouchableOpacity style={styles.quickStatCard} onPress={navigateToHabits}>
                <View style={[styles.quickStatIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <CheckCircle2 size={20} color="#10B981" strokeWidth={2.8} />
                </View>
                <Text style={[styles.quickStatValue, { color: getHeroTextColor() }]}>{stats.completedHabits}/{stats.totalHabits}</Text>
                <Text style={[styles.quickStatLabel, { color: getHeroSecondaryTextColor() }]}>Habits</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickStatCard} onPress={navigateToHabits}>
                <View style={[styles.quickStatIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Flame size={20} color="#F59E0B" strokeWidth={2.8} />
                </View>
                <Text style={[styles.quickStatValue, { color: getHeroTextColor() }]}>{stats.currentStreak}</Text>
                <Text style={[styles.quickStatLabel, { color: getHeroSecondaryTextColor() }]}>Day Streak</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickStatCard} onPress={navigateToHabits}>
                <View style={[styles.quickStatIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Target size={22} color="#A78BFA" strokeWidth={2.8} />
                </View>
                <Text style={[styles.quickStatValue, { color: getHeroTextColor() }]}>{stats.habitCompletionRate}%</Text>
                <Text style={[styles.quickStatLabel, { color: getHeroSecondaryTextColor() }]}>Progress</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Live Match Alert */}
            {hasSportsInterest && liveMatches.length > 0 && !liveBannerDismissed && (
              <Animated.View 
                style={[
                  styles.liveMatchAlert,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.liveMatchAlertContent}
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowLiveMatchModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.liveMatchAlertLeft}>
                    <View style={styles.livePulseContainer}>
                      <View style={styles.livePulseOuter} />
                      <View style={styles.livePulseInner} />
                      <Radio size={14} color="#fff" />
                    </View>
                    <View style={styles.liveMatchInfo}>
                      <Text style={styles.liveMatchAlertTitle}>
                        {liveMatches.length === 1 
                          ? 'Your team is playing NOW!' 
                          : `${liveMatches.length} of your teams are playing!`}
                      </Text>
                      <Text style={styles.liveMatchAlertTeams} numberOfLines={1}>
                        {liveMatches.slice(0, 2).map(m => 
                          `${m.homeTeam} ${m.homeScore ?? 0}-${m.awayScore ?? 0} ${m.awayTeam}`
                        ).join(' • ')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.liveMatchAlertRight}>
                    <Text style={styles.liveMatchAlertScore}>
                      {liveMatches[0]?.elapsed ? `${liveMatches[0].elapsed}'` : 'LIVE'}
                    </Text>
                    <TouchableOpacity
                      style={styles.liveBannerClose}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setLiveBannerDismissed(true);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <X size={16} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* View Toggle */}
            <View style={styles.viewToggleContainer}>
              <TouchableOpacity 
                style={[styles.viewToggleBtn, !showUnifiedView && styles.viewToggleBtnActive]}
                onPress={() => setShowUnifiedView(false)}
              >
                <Text style={[styles.viewToggleText, { color: !showUnifiedView ? getHeroTextColor() : getHeroSecondaryTextColor() }]}>
                  Dashboard
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewToggleBtn, showUnifiedView && styles.viewToggleBtnActive]}
                onPress={() => setShowUnifiedView(true)}
              >
                <Sparkles size={14} color={showUnifiedView ? getHeroTextColor() : getHeroSecondaryTextColor()} />
                <Text style={[styles.viewToggleText, { color: showUnifiedView ? getHeroTextColor() : getHeroSecondaryTextColor() }]}>
                  AI View
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewToggleBtn]}
                onPress={() => router.push('/(root)/daily-agent' as any)}
                testID="daily-agent-btn"
              >
                <Brain size={14} color={getHeroSecondaryTextColor()} />
                <Text style={[styles.viewToggleText, { color: getHeroSecondaryTextColor() }]}>
                  Pulse
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewToggleBtn]}
                onPress={() => router.push('/(root)/analytics' as any)}
                testID="analytics-btn"
              >
                <BarChart3 size={14} color={getHeroSecondaryTextColor()} />
                <Text style={[styles.viewToggleText, { color: getHeroSecondaryTextColor() }]}>
                  Analytics
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
        </View>

        {showUnifiedView ? (
          <ActivitiesAIView onRequestPeakScheduler={() => setShowPeakScheduler(true)} />
        ) : (
          <View style={{ backgroundColor: colors.background }}>
            <AddInterestsLaterCard />
            <JoySourcesNudgeCard />

            {recovery.isActive ? (
              <RecoveryModePanel
                greeting={recovery.greeting}
                timeTip={recovery.timeTip}
                timeOfDay={recovery.timeOfDay}
                dailyHope={recovery.dailyHope}
                dailyWin={recovery.dailyWin}
                identityReminder={recovery.identityReminder}
                patternInsight={recoveryPatternInsight}
                wellbeingLog={recovery.wellbeingLog}
                onToggleWellbeing={(key) =>
                  recovery.updateWellbeing({ [key]: !recovery.wellbeingLog?.[key] })
                }
                onSetMood={(mood) => recovery.updateWellbeing({ mood })}
                onSetSleep={(sleep) => recovery.updateWellbeing({ sleep })}
                onExit={() => recovery.exitManual(7)}
              />
            ) : null}

            {/* Daily Summary Card */}
            <View style={styles.summarySection}>
              {dailySummary ? (
                <View style={[styles.dailySummaryCard, { backgroundColor: colors.card }]}>
                  <View style={styles.summaryHeader}>
                    <View style={styles.summaryTitleRow}>
                      <Sparkles size={18} color="#F59E0B" />
                      <Text style={[styles.summaryTitle, { color: colors.text }]}>Today&#39;s Summary</Text>
                    </View>
                    <View style={styles.summaryHeaderRight}>
                      <View style={[styles.sentimentBadge, { 
                        backgroundColor: dailySummary.sentiment === 'positive' ? '#D1FAE5' : 
                                         dailySummary.sentiment === 'negative' ? '#FEE2E2' : '#F3F4F6'
                      }]}>
                        <Text style={[styles.sentimentText, {
                          color: dailySummary.sentiment === 'positive' ? '#059669' : 
                                 dailySummary.sentiment === 'negative' ? '#DC2626' : '#6B7280'
                        }]}>{dailySummary.sentiment}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.summaryCloseBtn}
                        onPress={() => {
                      void stopSummarySpeech();
                      void markDailySummaryDismissed(userId, getTodayYmd());
                      setDailySummary(null);
                    }}
                      >
                        <X size={18} color={COLORS.textLight} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{dailySummary.summary}</Text>
                  <TouchableOpacity
                    style={[
                      styles.listenButton,
                      isSpeaking && styles.listenButtonActive,
                      generateVoiceMutation.isPending && styles.listenButtonLoading,
                    ]}
                    onPress={() => {
                      if (isSpeaking) {
                        void stopSummarySpeech();
                      } else {
                        void speakDailySummary(dailySummary.summary);
                      }
                    }}
                    activeOpacity={0.7}
                    disabled={generateVoiceMutation.isPending}
                    testID="daily-summary-listen-button"
                  >
                    {isSpeaking ? (
                      <VolumeX size={16} color="#fff" />
                    ) : (
                      <Volume2 size={16} color="#fff" />
                    )}
                    <Text style={styles.listenButtonText}>
                      {generateVoiceMutation.isPending ? 'Generating ElevenLabs audio...' : isSpeaking ? 'Stop audio' : 'Listen with ElevenLabs'}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.scoreBar}>
                    {!recovery.isActive ? (
                      <>
                        <View style={styles.scoreTrack}>
                          <View style={[styles.scoreFill, { width: `${dailySummary.score}%` }]} />
                        </View>
                        <Text style={[styles.scoreValue, { color: colors.text }]}>{dailySummary.score}/100</Text>
                      </>
                    ) : (
                      <Text style={[styles.recoverySummaryNote, { color: colors.textSecondary }]}>
                        Recovery mode — focus on wellbeing, not scores
                      </Text>
                    )}
                  </View>
                  <DailySummaryInsights
                    summary={dailySummary}
                    yesterdayDelta={recovery.isActive ? null : yesterdayDelta}
                  />
                  {!recovery.isActive ? (
                  <TouchableOpacity
                    style={styles.shareSummaryButton}
                    onPress={() =>
                      setSummarySharePayload(
                        buildSummaryPayload(
                          dailySummary.score,
                          dailySummary.summary,
                          (profile?.name || user?.email?.split('@')[0] || '').trim() || undefined,
                        ),
                      )
                    }
                    activeOpacity={0.8}
                    testID="daily-summary-share-button"
                  >
                    <Share2 size={16} color="#fff" />
                    <Text style={styles.shareSummaryText}>Share today’s score</Text>
                  </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.generateSummaryButton}
                  onPress={generateDailySummary}
                  disabled={isGeneratingSummary}
                >
                  <Sparkles size={20} color="#fff" />
                  <Text style={styles.generateSummaryText}>
                    {isGeneratingSummary ? 'Generating...' : 'Generate Daily Summary'}
                  </Text>
                </TouchableOpacity>
              )}
              {!dailySummary && !isGeneratingSummary && !autoSummaryHintDismissed ? (
                <View
                  style={[
                    styles.autoSummaryHintCard,
                    { backgroundColor: isDark ? colors.card : '#F1F5F9', borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.autoSummaryHint, { color: colors.textSecondary }]}>
                    {autoSummaryScheduleLabel
                      ? `Auto-summary after ${autoSummaryScheduleLabel} when you open Overview (change in Profile)`
                      : 'Auto-summary runs at your chosen time when you open Overview (set in Profile)'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.autoSummaryHintDismiss, { backgroundColor: isDark ? colors.background : '#E2E8F0' }]}
                    onPress={handleDismissAutoSummaryHint}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Dismiss auto-summary message"
                    testID="dismiss-auto-summary-hint"
                  >
                    <X size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {partnerActivity.available === true &&
              (partnerActivity.feed.length > 0 || partnerActivity.activeTodayCount > 0) ? (
              <PartnerActivityFeed
                feed={partnerActivity.feed}
                activeTodayCount={partnerActivity.activeTodayCount}
                presenceLabel={partnerActivity.presenceLabel}
                currentUserId={user?.id}
                colors={{
                  text: colors.text,
                  textSecondary: colors.textSecondary,
                  textMuted: colors.textMuted,
                  card: colors.card,
                  border: colors.border,
                  primary: COLORS.primary,
                  surfaceSecondary: colors.surfaceSecondary,
                }}
                onCheer={(eventId, on) => void partnerActivity.cheer(eventId, on)}
              />
            ) : null}

            {/* Today's Routine Section - Combined with Progress */}
            <View style={styles.routineSection}>
              <TodaysRoutine 
                maxItems={5}
                onViewAll={() => router.push('/tasks' as any)}
              />
            </View>

            {/* Habit Formation Coach */}
            <HabitFormationCoach 
              maxItems={3}
              recoveryMode={recovery.isActive}
              onComplete={(habitId) => {
                if (__DEV__) console.log('Quick completed habit:', habitId);
              }}
            />

            {/* Calendar Events */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Calendar size={20} color={colors.text} strokeWidth={2} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Events</Text>
                </View>
                {eventKit.isEventKitAvailable && (
                  <TouchableOpacity 
                    onPress={() => setShowEventKitManager(true)}
                    style={styles.viewAllBtn}
                  >
                    <Text style={styles.viewAllText}>Manage</Text>
                    <ChevronRight size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>

              {(() => {
                const hasCalendarSource =
                  calendars.length > 0 || (eventKit.isEventKitAvailable && eventKit.hasPermission);

                if (!hasCalendarSource && savedEventsCount === 0) {
                  return (
                    <View style={[styles.emptyCalendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Calendar size={40} color={colors.textMuted} />
                      <Text style={[styles.emptyCalendarTitle, { color: colors.text }]}>No Calendar</Text>
                      <Text style={[styles.emptyCalendarText, { color: colors.textSecondary }]}>
                        Connect your calendar or add events from the Events tab
                      </Text>
                      <View style={styles.calendarActions}>
                        {eventKit.isEventKitAvailable && (
                          <TouchableOpacity 
                            style={styles.primaryBtn}
                            onPress={() => setShowEventKitManager(true)}
                          >
                            <Text style={styles.primaryBtnText}>Connect Calendar</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={styles.secondaryBtn}
                          onPress={() => setShowCalendarImporter(true)}
                        >
                          <Text style={styles.secondaryBtnText}>Import File</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }
                
                return (
                  <View style={styles.eventsContainer}>
                    {upcomingEventsPreview.length === 0 ? (
                      <View style={[styles.emptyCalendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Calendar size={32} color={colors.textMuted} />
                        <Text style={[styles.emptyCalendarText, { color: colors.textSecondary }]}>
                          No upcoming events — add some from the Events tab
                        </Text>
                      </View>
                    ) : upcomingEventsPreview.map((event, index) => {
                      const CardWrapper = event.kind === 'onepager' ? TouchableOpacity : View;
                      const cardProps =
                        event.kind === 'onepager'
                          ? {
                              activeOpacity: 0.85,
                              onPress: () => router.push(`/(root)/event/${event.id}` as any),
                            }
                          : {};

                      return (
                      <CardWrapper
                        key={`${event.id}-${index}`}
                        {...cardProps}
                        style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <View style={[styles.eventIndicator, { 
                          backgroundColor: event.kind === 'onepager' ? COLORS.primary : colors.textMuted 
                        }]} />
                        <View style={styles.eventInfo}>
                          <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                          <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                            {new Date(event.startDate).toLocaleDateString('en-GB', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                            {event.kind === 'onepager' ? ' · One Pager' : ''}
                          </Text>
                        </View>
                        {event.kind === 'onepager' ? (
                          <ChevronRight size={16} color={colors.textMuted} />
                        ) : null}
                      </CardWrapper>
                      );
                    })}
                  </View>
                );
              })()}
            </View>

            {/* New Episode Releases for Tracked Shows */}
            {hasShowsInterest && (() => {
              if (visibleNewEpisodes.length === 0) return null;
              return (
              <View style={styles.newEpisodesSection}>
                <View style={styles.newEpisodesHeader}>
                  <View style={styles.newEpisodesHeaderLeft}>
                    <View style={styles.newEpisodesIconWrap}>
                      <BellRing size={16} color="#E50914" />
                    </View>
                    <Text style={[styles.newEpisodesTitle, { color: colors.text }]}>New Episodes</Text>
                    <View style={styles.newEpisodesCountPill}>
                      <Text style={styles.newEpisodesCountText}>{visibleNewEpisodes.length}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => router.push(SHOWS_HREF.streaming as any)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.newEpisodesSeeAll}>See All</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.newEpisodesList, { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
                  {visibleNewEpisodes.slice(0, 5).map((item, index) => {
                    const isRecentRelease = item.latestEpisode?.airDate && new Date(item.latestEpisode.airDate) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    const episode = isRecentRelease ? item.latestEpisode : item.nextEpisode;
                    if (!episode) return null;

                    const airDate = episode.airDate ? new Date(episode.airDate) : null;
                    const isToday = airDate && airDate.toDateString() === new Date().toDateString();
                    const isPast = airDate && airDate < new Date();
                    const daysUntil = airDate ? Math.ceil((airDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                    let statusText = '';
                    let statusColor = '#94A3B8';
                    if (isToday) {
                      statusText = 'OUT TODAY';
                      statusColor = '#E50914';
                    } else if (isPast) {
                      statusText = 'NOW STREAMING';
                      statusColor = '#10B981';
                    } else if (daysUntil !== null && daysUntil <= 1) {
                      statusText = 'TOMORROW';
                      statusColor = '#F59E0B';
                    } else if (daysUntil !== null) {
                      statusText = `IN ${daysUntil} DAYS`;
                      statusColor = '#6366F1';
                    }

                    const dismissKey = `${item.tmdbId}-s${episode.seasonNumber}e${episode.episodeNumber}`;
                    return (
                      <TouchableOpacity
                        key={`${item.showId}-${index}`}
                        style={[
                          styles.newEpisodeCard,
                          { borderBottomColor: colors.border },
                          index === (visibleNewEpisodes.slice(0, 5).length ?? 0) - 1 && { borderBottomWidth: 0 },
                        ]}
                        onPress={() => void handleOpenNewEpisode(item)}
                        onLongPress={() => confirmDismissEpisode(dismissKey, item.showTitle)}
                        delayLongPress={350}
                        activeOpacity={0.7}
                        testID={`new-episode-card-${item.tmdbId}`}
                      >
                        <View style={styles.newEpisodePosterWrap}>
                          {item.posterUrl ? (
                            <Image
                              source={{ uri: item.posterUrl }}
                              style={styles.newEpisodePoster}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={[styles.newEpisodePosterFallback, { backgroundColor: '#E5091420' }]}>
                              <Tv size={16} color="#E50914" />
                            </View>
                          )}
                          {(isToday || isPast) && (
                            <View style={styles.newEpisodeLiveDot} />
                          )}
                        </View>
                        <View style={styles.newEpisodeInfo}>
                          <Text style={[styles.newEpisodeShowTitle, { color: colors.text }]} numberOfLines={1}>{item.showTitle}</Text>
                          <Text style={[styles.newEpisodeDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                            S{episode.seasonNumber}E{episode.episodeNumber}: {episode.name}
                          </Text>
                          <View style={styles.newEpisodeMetaRow}>
                            <View style={[styles.newEpisodeStatusBadge, { backgroundColor: statusColor + '18' }]}>
                              <Text style={[styles.newEpisodeStatusText, { color: statusColor }]}>{statusText}</Text>
                            </View>
                            {airDate && (
                              <Text style={styles.newEpisodeDateText}>
                                {airDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              );
            })()}

            {/* My Shows - Premium Continue Watching */}
            {hasShowsInterest && (
            <View style={styles.cwSection}>
              <View style={styles.cwHeader}>
                <View style={styles.cwHeaderLeft}>
                  <Text style={[styles.cwTitle, { color: colors.text }]}>Continue Watching</Text>
                  {continueWatchingItems.length > 0 && (
                    <View style={[styles.cwCountPill, { backgroundColor: colors.primary }]}>
                      <Text style={styles.cwCountText}>{continueWatchingItems.length}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => router.push(SHOWS_HREF.streaming as any)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.cwSeeAll}>See All</Text>
                </TouchableOpacity>
              </View>
                
              {continueWatchingItems.length > 0 ? (
                <FlatList
                  data={continueWatchingItems}
                  horizontal
                  keyExtractor={(item, idx) => (item.kind === 'local' ? `local-${item.show.id}` : `younify-${item.key}-${idx}`)}
                  renderItem={renderContinueWatchingCard}
                  initialNumToRender={4}
                  maxToRenderPerBatch={4}
                  windowSize={5}
                  removeClippedSubviews
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cwScroll}
                  getItemLayout={(_, index) => ({ length: CW_CARD_WIDTH + 12, offset: (CW_CARD_WIDTH + 12) * index, index })}
                  ListFooterComponent={
                    <TouchableOpacity
                      style={[styles.cwAddCard, { backgroundColor: colors.surfaceSecondary }]}
                      onPress={() => router.push(SHOWS_HREF.watchlist as any)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cwAddInner}>
                        <View style={[styles.cwAddIcon, { backgroundColor: isDark ? colors.border : '#E2E8F0' }]}>
                          <Tv size={20} color={colors.textMuted} />
                        </View>
                        <Text style={[styles.cwAddText, { color: colors.textSecondary }]}>Add Show</Text>
                      </View>
                    </TouchableOpacity>
                  }
                />
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.cwEmptyCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => router.push(SHOWS_HREF.watchlist as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cwEmptyInner}>
                    <View style={[styles.cwEmptyIconWrap, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' }]}>
                      <Tv size={24} color={colors.textSecondary} />
                    </View>
                    <View style={styles.cwEmptyTextWrap}>
                      <Text style={[styles.cwEmptyTitle, { color: colors.text }]}>Track what you watch</Text>
                      <Text style={[styles.cwEmptyDesc, { color: colors.textSecondary }]}>Add shows and movies to your watchlist</Text>
                    </View>
                    <ChevronRight size={18} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
            )}

            {/* Plan to Watch - Up Next Section */}
            {hasShowsInterest && rankedUpNextShows.length > 0 && (
              <View style={styles.upNextSection}>
                <View style={styles.upNextHeader}>
                  <View style={styles.upNextHeaderLeft}>
                    <Text style={[styles.upNextTitle, { color: colors.text }]}>Up Next</Text>
                    <View style={styles.upNextCountPill}>
                      <Text style={styles.upNextCountText}>{rankedUpNextShows.length}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => router.push(SHOWS_HREF.watchlist as any)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.upNextSeeAll}>View All</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={[styles.upNextList, { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
                  {rankedUpNextShows.map((show, index) => (
                    <TouchableOpacity 
                      key={show.id} 
                      style={[styles.upNextCard, { borderBottomColor: colors.border }, index === rankedUpNextShows.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => {
                        if (show.tmdbId && show.mediaType) {
                          setShowInfoModal({ visible: true, tmdbId: show.tmdbId, mediaType: show.mediaType, title: show.title, platform: show.platform });
                        } else {
                          handleStartWatching(show);
                        }
                      }}
                      onLongPress={() => handleRemoveShow(show.id, show.title)}
                      delayLongPress={350}
                      activeOpacity={0.7}
                      testID={`upnext-card-${show.id}`}
                    >
                      <View style={styles.upNextPosterWrap}>
                        {show.posterUrl ? (
                          <Image 
                            source={{ uri: show.posterUrl }}
                            style={styles.upNextPoster}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.upNextPosterFallback, { backgroundColor: getPlatformColor(show.platform) + '30' }]}>
                            <Tv size={16} color={getPlatformColor(show.platform)} />
                          </View>
                        )}
                      </View>
                      <View style={styles.upNextInfo}>
                        <Text style={[styles.upNextShowTitle, { color: colors.text }]} numberOfLines={1}>{show.title}</Text>
                        <Text style={[styles.upNextShowMeta, { color: colors.textSecondary }]}>
                          {show.type === 'Series' ? 'TV Series' : show.type} · {show.platform}
                        </Text>
                      </View>
                      <View style={styles.upNextAction}>
                        <Play size={14} color="#F59E0B" fill="#F59E0B" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* My Sports */}
            {hasSportsInterest && (
            <ModernSportsSection
              liveMatches={rawLiveMatches}
              completedMatches={rawCompletedMatches}
              upcomingMatches={rawUpcomingMatches}
              isLoading={isLoadingMatches}
              pinnedMatches={pinnedMatchesForSection}
              isPinned={isPinned}
              onTogglePin={togglePin}
              onViewAll={() => router.push('/sports' as any)}
              onRefresh={async () => {
                setRefreshing(true);
                await fetchMatches();
                setRefreshing(false);
              }}
              rawUpcomingCount={footballBundleQuery.data?.upcoming?.response?.length || 0}
            />
            )}

            {/* NBA Section */}
            {hasNBAInterest && (
              <NBAUpcomingSection favoriteNBATeams={favoriteNBATeams} />
            )}

          </View>
        )}
      </Animated.ScrollView>
      
      <CalendarImporter 
        visible={showCalendarImporter}
        onClose={() => setShowCalendarImporter(false)}
      />
      
      <EventKitManager 
        visible={showEventKitManager}
        onClose={() => setShowEventKitManager(false)}
      />
      
      
      <WeatherDetailModal
        visible={showWeatherModal}
        onClose={() => setShowWeatherModal(false)}
        currentWeather={weather ? {
          temp: weather.temp,
          description: weather.description,
          city: weather.city,
          condition: weather.condition,
          isDayTime: weather.isDayTime,
          cloudiness: weather.cloudiness,
        } : undefined}
      />
      
      <PeakPerformanceScheduler
        visible={showPeakScheduler}
        onClose={() => setShowPeakScheduler(false)}
        peakStartHour={9}
        peakEndHour={11}
      />

      <ShowInfoModal
        visible={showInfoModal.visible}
        onClose={() => setShowInfoModal({ visible: false, tmdbId: null, mediaType: 'tv', title: '', platform: '' })}
        tmdbId={showInfoModal.tmdbId}
        mediaType={showInfoModal.mediaType}
        showTitle={showInfoModal.title}
        platform={showInfoModal.platform}
      />

      {liveMatches.length > 0 && liveMatches[0] && (
        <MatchDetailsModal
          visible={showLiveMatchModal}
          onClose={() => setShowLiveMatchModal(false)}
          fixtureId={parseInt(liveMatches[0].id, 10)}
          homeTeam={liveMatches[0].homeTeam}
          awayTeam={liveMatches[0].awayTeam}
          homeScore={liveMatches[0].homeScore}
          awayScore={liveMatches[0].awayScore}
          league={liveMatches[0].league}
          leagueLogo={liveMatches[0].leagueLogo}
          round={liveMatches[0].round}
          homeTeamLogo={liveMatches[0].homeTeamLogo}
          awayTeamLogo={liveMatches[0].awayTeamLogo}
        />
      )}

      <ProgressShareSheet
        visible={!!summarySharePayload}
        payload={summarySharePayload}
        onClose={() => setSummarySharePayload(null)}
      />
    </SwipeableTabContainer>
  );
}

/** Continue Watching tiles: mobile-first portrait cards (2:3). */
const CW_CARD_WIDTH = 124;
const CW_POSTER_HEIGHT = Math.round((CW_CARD_WIDTH * 3) / 2);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Hero Section
  heroSection: {
    paddingBottom: 48,
    minHeight: 330,
  },
  heroContent: {
    paddingHorizontal: 22,
  },
  greetingContainer: {
    marginBottom: 26,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingTextContainer: {
    flex: 1,
  },
  timeEmoji: {
    fontSize: 26,
    marginRight: 12,
  },
  cloud: {
    position: 'absolute',
    opacity: 0.25,
  },
  cloud1: {
    top: 40,
    left: 0,
  },
  cloud2: {
    top: 100,
    left: 0,
  },
  cloud3: {
    top: 160,
    left: 0,
  },
  cloudEmoji: {
    fontSize: 48,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
    flex: 1,
    flexShrink: 1,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 3,
    letterSpacing: 0.1,
  },
  decorativeOrb1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -70,
    right: -50,
  },
  decorativeOrb2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: 50,
    left: -50,
  },
  decorativeOrb3: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    top: 110,
    left: 90,
  },
  
  // Quick Stats
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
    gap: 8,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  quickStatIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    marginBottom: 2,
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textAlign: 'center',
    lineHeight: 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  
  // View Toggle
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 13,
    gap: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  
  // Live Match Alert
  liveMatchAlert: {
    marginBottom: 18,
  },
  liveMatchAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C2E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  liveMatchAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  livePulseContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  livePulseOuter: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  livePulseInner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.25)',
  },
  liveMatchInfo: {
    flex: 1,
  },
  liveMatchAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E8E8F0',
    marginBottom: 2,
  },
  liveMatchAlertTeams: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
  liveMatchAlertRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveBannerClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: 6,
  },
  liveMatchAlertScore: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  
  // Summary Section
  routineSection: {
    paddingHorizontal: 20,
    paddingTop: 26,
    marginBottom: 16,
  },
  summarySection: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  autoSummaryHintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  autoSummaryHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  autoSummaryHintDismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailySummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    ...Platform.select({
      ios: {
        shadowColor: '#1a1a2e',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: { elevation: 6 },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sentimentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  summaryCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
    marginBottom: 16,
  },
  listenButtonActive: {
    backgroundColor: '#DC2626',
  },
  listenButtonLoading: {
    backgroundColor: '#334155',
    opacity: 0.9,
  },
  listenButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
    letterSpacing: -0.2,
  },
  scoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  recoverySummaryNote: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  shareSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  shareSummaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  generateSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  generateSummaryText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.2,
  },
  
  // Sections
  section: {
    paddingTop: 32,
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800' as const,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.primary,
    lineHeight: 18,
  },
  partnerPresence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  partnerLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34C759' },
  partnerPresenceText: { fontSize: 13, fontWeight: '700' as const, color: '#1E9E4A' },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  partnerCardBody: { flex: 1, paddingRight: 12 },
  partnerCardTitle: { fontSize: 14, fontWeight: '700' as const },
  partnerCardSub: { fontSize: 12, marginTop: 3 },
  partnerCheer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: 46,
    justifyContent: 'center',
  },
  partnerCheerCount: { fontSize: 13, fontWeight: '700' as const },

  // Calendar Events
  emptyCalendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    ...Platform.select({
      ios: {
        shadowColor: '#1a1a2e',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: { elevation: 6 },
    }),
  },
  emptyCalendarTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyCalendarText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 21,
  },
  calendarActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryBtn: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventsContainer: {
    gap: 10,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    ...Platform.select({
      ios: {
        shadowColor: '#1a1a2e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
    }),
  },
  eventIndicator: {
    width: 3.5,
    height: 44,
    borderRadius: 2,
    marginRight: 16,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  eventTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500' as const,
  },
  
  cwSection: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  cwHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  cwHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cwTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  cwCountPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cwCountText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  cwSeeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6366F1',
  },
  cwScroll: {
    paddingLeft: 20,
    paddingRight: 12,
    paddingBottom: 4,
  },
  cwCard: {
    width: CW_CARD_WIDTH,
    marginLeft: 12,
    borderRadius: 14,
    overflow: 'visible',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    paddingBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  cwPosterWrap: {
    position: 'relative',
    width: CW_CARD_WIDTH,
    height: CW_POSTER_HEIGHT,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cwYounifyLogoMark: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 2,
  },
  cwRemoveBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cwPoster: {
    width: '100%',
    height: '100%',
  },
  cwPosterFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cwPosterGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  cwCardBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 10,
  },
  cwCardTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#111827',
    letterSpacing: -0.1,
    lineHeight: 17,
  },
  cwCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 3,
  },
  cwCardEpisode: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  cwCardInfo: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  cwProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  cwProgressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  cwAddCard: {
    width: 100,
    height: CW_POSTER_HEIGHT,
    marginLeft: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cwAddInner: {
    alignItems: 'center',
    gap: 8,
  },
  cwAddIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cwAddText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  cwEmptyCard: {
    marginHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cwEmptyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  cwEmptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cwEmptyTextWrap: {
    flex: 1,
  },
  cwEmptyTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0F172A',
    marginBottom: 2,
  },
  cwEmptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },

  upNextSection: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  upNextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  upNextHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upNextTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  upNextCountPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  upNextCountText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#D97706',
  },
  upNextSeeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#D97706',
  },
  upNextList: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  upNextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  upNextPosterWrap: {
    width: 48,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  upNextPoster: {
    width: '100%',
    height: '100%',
  },
  upNextPosterFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  upNextInfo: {
    flex: 1,
  },
  upNextShowTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0F172A',
    marginBottom: 3,
  },
  upNextShowMeta: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500' as const,
  },
  upNextAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upNextRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },

  // Weather Effects (hero)
  lightningOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    pointerEvents: 'none' as const,
  },
  rainDrop: {
    position: 'absolute' as const,
    pointerEvents: 'none' as const,
  },
  rainEmoji: {
    fontSize: 18,
  },
  snowFlake: {
    position: 'absolute' as const,
    pointerEvents: 'none' as const,
  },
  snowEmoji: {
    fontSize: 22,
  },
  weatherBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center' as const,
    marginLeft: 12,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  weatherTemp: {
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  weatherDescription: {
    fontSize: 9,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  newEpisodesSection: {
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  newEpisodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  newEpisodesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newEpisodesIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newEpisodesTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  newEpisodesCountPill: {
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newEpisodesCountText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  newEpisodesSeeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#E50914',
  },
  newEpisodesList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  newEpisodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  newEpisodePosterWrap: {
    width: 48,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  newEpisodePoster: {
    width: '100%',
    height: '100%',
  },
  newEpisodePosterFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  newEpisodeLiveDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E50914',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  newEpisodeInfo: {
    flex: 1,
  },
  newEpisodeShowTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  newEpisodeDetail: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  newEpisodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newEpisodeStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newEpisodeStatusText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  newEpisodeDateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500' as const,
  },
  newEpisodeDismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
