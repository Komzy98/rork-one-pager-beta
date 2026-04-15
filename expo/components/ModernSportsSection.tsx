import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Animated, Image, Dimensions } from 'react-native';
import { Trophy, Clock, Calendar, Zap, Shield, TrendingUp, TrendingDown, Minus, Heart, ChevronRight, MapPin, Radio } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LiveFootballMatch, UserTeam, UserNationality } from '@/types/habit';
import { COLORS } from '@/constants/colors';
import { SPACING, cardShadow } from '@/constants/design';

import EnhancedLoadingState from './EnhancedLoadingState';
import MatchDetailsModal from './MatchDetailsModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ModernSportsSectionProps {
  liveMatches: LiveFootballMatch[];
  completedMatches: LiveFootballMatch[];
  upcomingMatches: LiveFootballMatch[];
  isLoading: boolean;
  onViewAll?: () => void;
  onRefresh?: () => void;
  rawUpcomingCount?: number;
}

const TEAM_GRADIENTS: [string, string][] = [
  ['#DA291C', '#8B0000'],
  ['#034694', '#001F4D'],
  ['#00529F', '#C8A64D'],
  ['#DC052D', '#001E5A'],
  ['#004170', '#DA291C'],
  ['#132257', '#FFFFFF'],
  ['#A50044', '#004D98'],
  ['#FDE100', '#000000'],
];

const getTeamGradient = (index: number): [string, string] => {
  return TEAM_GRADIENTS[index % TEAM_GRADIENTS.length];
};

const parseMatchDate = (dateString: string, timeString: string): Date | null => {
  try {
    if (dateString.includes('T')) {
      return new Date(dateString);
    }
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = timeString.replace(/[AP]M/i, '').trim().split(':').map(Number);
    const isPM = timeString.toLowerCase().includes('pm');
    return new Date(year, month - 1, day, isPM && hours !== 12 ? hours + 12 : hours, minutes);
  } catch {
    return null;
  }
};

const formatTimeUntilMatch = (dateString: string, timeString: string): string => {
  try {
    const now = new Date();
    const matchDate = parseMatchDate(dateString, timeString);
    if (!matchDate) return timeString;

    const diffMs = matchDate.getTime() - now.getTime();
    if (diffMs < 0) return 'Started';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h`;

    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}m`;
  } catch {
    return timeString;
  }
};

const isWithin24Hours = (dateString: string, timeString: string): boolean => {
  const matchDate = parseMatchDate(dateString, timeString);
  if (!matchDate) return false;
  const now = new Date();
  const diffMs = matchDate.getTime() - now.getTime();
  return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
};

const formatMatchDate = (dateString: string): string => {
  try {
    if (!dateString) return 'TBD';
    let dateOnly = dateString;
    if (dateString.includes('T')) {
      dateOnly = dateString.split('T')[0];
    }
    const [year, month, day] = dateOnly.split('-').map(Number);
    const matchDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const matchDateNormalized = new Date(matchDate);
    matchDateNormalized.setHours(0, 0, 0, 0);
    if (matchDateNormalized.getTime() === today.getTime()) return 'Today';
    if (matchDateNormalized.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return matchDate.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return 'TBD';
  }
};

const LivePulse = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [scaleAnim, opacityAnim]);

  return (
    <View style={styles.livePulseContainer}>
      <Animated.View style={[styles.livePulseRing, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]} />
      <View style={styles.livePulseDot} />
    </View>
  );
};

const PremiumLiveMatchCard = React.memo(({ match, onPress }: { match: LiveFootballMatch; onPress: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 100, friction: 10 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.premiumCardWrap}
      >
        <LinearGradient
          colors={['#1A1A2E', '#16213E', '#0F3460']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumLiveCard}
        >
          <View style={styles.premiumLiveHeader}>
            <View style={styles.premiumLiveBadge}>
              <LivePulse />
              <Text style={styles.premiumLiveBadgeText}>LIVE</Text>
              {match.elapsed && (
                <View style={styles.premiumElapsedPill}>
                  <Text style={styles.premiumElapsedText}>{match.elapsed}&apos;</Text>
                </View>
              )}
            </View>
            <View style={styles.premiumLeagueRow}>
              {match.leagueLogo ? (
                <Image source={{ uri: match.leagueLogo }} style={styles.premiumLeagueLogo} />
              ) : null}
              <Text style={styles.premiumLeagueName} numberOfLines={1}>{match.league}</Text>
            </View>
          </View>

          <View style={styles.premiumMatchBody}>
            <View style={styles.premiumTeamCol}>
              <View style={styles.premiumTeamLogoWrap}>
                {match.homeTeamLogo ? (
                  <Image source={{ uri: match.homeTeamLogo }} style={styles.premiumTeamLogo} />
                ) : (
                  <Shield size={24} color="rgba(255,255,255,0.4)" />
                )}
              </View>
              <Text style={styles.premiumTeamName} numberOfLines={2}>{match.homeTeam}</Text>
            </View>

            <View style={styles.premiumScoreCol}>
              <View style={styles.premiumScoreBox}>
                <Text style={styles.premiumScore}>{match.homeScore ?? 0}</Text>
                <View style={styles.premiumScoreDivider} />
                <Text style={styles.premiumScore}>{match.awayScore ?? 0}</Text>
              </View>
            </View>

            <View style={styles.premiumTeamCol}>
              <View style={styles.premiumTeamLogoWrap}>
                {match.awayTeamLogo ? (
                  <Image source={{ uri: match.awayTeamLogo }} style={styles.premiumTeamLogo} />
                ) : (
                  <Shield size={24} color="rgba(255,255,255,0.4)" />
                )}
              </View>
              <Text style={styles.premiumTeamName} numberOfLines={2}>{match.awayTeam}</Text>
            </View>
          </View>

          {match.venue && (
            <View style={styles.premiumVenueRow}>
              <MapPin size={10} color="rgba(255,255,255,0.35)" />
              <Text style={styles.premiumVenueText} numberOfLines={1}>{match.venue}</Text>
            </View>
          )}

          <View style={styles.premiumLiveGlow} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

const PremiumUpcomingCard = React.memo(({ match, isFirst, onPress }: { match: LiveFootballMatch; isFirst: boolean; onPress: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const countdown = formatTimeUntilMatch(match.date, match.time);
  const dateLabel = formatMatchDate(match.date);
  const isSoon = isWithin24Hours(match.date, match.time);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, tension: 100, friction: 10 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.premiumCardWrap}
      >
        <View style={[styles.upcomingCard, isFirst && styles.upcomingCardFirst]}>
          {isFirst && (
            <LinearGradient
              colors={['rgba(0,122,255,0.06)', 'rgba(0,122,255,0.02)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={styles.upcomingHeader}>
            <View style={styles.upcomingLeagueRow}>
              {match.leagueLogo ? (
                <Image source={{ uri: match.leagueLogo }} style={styles.upcomingLeagueLogo} />
              ) : (
                <Trophy size={12} color="#8E8E93" />
              )}
              <Text style={styles.upcomingLeagueName} numberOfLines={1}>{match.league}</Text>
            </View>
            <View style={[styles.upcomingCountdownPill, isSoon && styles.upcomingCountdownSoon]}>
              {isSoon && <Clock size={10} color="#FF9500" />}
              <Text style={[styles.upcomingCountdownText, isSoon && styles.upcomingCountdownTextSoon]}>
                {countdown}
              </Text>
            </View>
          </View>

          <View style={styles.upcomingBody}>
            <View style={styles.upcomingTeamRow}>
              <View style={styles.upcomingTeamLogoBox}>
                {match.homeTeamLogo ? (
                  <Image source={{ uri: match.homeTeamLogo }} style={styles.upcomingTeamLogo} />
                ) : (
                  <Shield size={18} color="#C7C7CC" />
                )}
              </View>
              <Text style={styles.upcomingTeamName} numberOfLines={1}>{match.homeTeam}</Text>
            </View>

            <View style={styles.upcomingVsCol}>
              <View style={styles.upcomingTimeBubble}>
                <Text style={styles.upcomingTimeText}>{match.time}</Text>
              </View>
              <Text style={styles.upcomingDateText}>{dateLabel}</Text>
            </View>

            <View style={[styles.upcomingTeamRow, styles.upcomingTeamRowRight]}>
              <Text style={[styles.upcomingTeamName, { textAlign: 'right' as const }]} numberOfLines={1}>{match.awayTeam}</Text>
              <View style={styles.upcomingTeamLogoBox}>
                {match.awayTeamLogo ? (
                  <Image source={{ uri: match.awayTeamLogo }} style={styles.upcomingTeamLogo} />
                ) : (
                  <Shield size={18} color="#C7C7CC" />
                )}
              </View>
            </View>
          </View>

          {match.venue && (
            <View style={styles.upcomingFooter}>
              <MapPin size={10} color="#AEAEB2" />
              <Text style={styles.upcomingVenueText} numberOfLines={1}>{match.venue}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const PremiumResultCard = React.memo(({ match, teamName, isTeamMatchFn, onPress }: {
  match: LiveFootballMatch;
  teamName: string;
  isTeamMatchFn: (matchTeam: string, favTeam: string) => boolean;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isHome = isTeamMatchFn(match.homeTeam, teamName);
  const teamScore = isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0);
  const opponentScore = isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0);
  const result = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'D';
  const resultColor = result === 'W' ? '#10B981' : result === 'L' ? '#EF4444' : '#8E8E93';
  const resultLabel = result === 'W' ? 'Victory' : result === 'L' ? 'Defeat' : 'Draw';
  const ResultIcon = result === 'W' ? TrendingUp : result === 'L' ? TrendingDown : Minus;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, tension: 100, friction: 10 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.premiumCardWrap}
      >
        <View style={styles.resultCard}>
          <View style={[styles.resultAccent, { backgroundColor: resultColor }]} />
          <View style={styles.resultContent}>
            <View style={styles.resultHeader}>
              <View style={styles.resultLeagueRow}>
                {match.leagueLogo ? (
                  <Image source={{ uri: match.leagueLogo }} style={styles.resultLeagueLogo} />
                ) : (
                  <Trophy size={11} color="#8E8E93" />
                )}
                <Text style={styles.resultLeagueName} numberOfLines={1}>{match.league}</Text>
              </View>
              <View style={[styles.resultBadge, { backgroundColor: resultColor + '15' }]}>
                <ResultIcon size={11} color={resultColor} />
                <Text style={[styles.resultBadgeText, { color: resultColor }]}>{resultLabel}</Text>
              </View>
            </View>

            <View style={styles.resultBody}>
              <View style={styles.resultTeamRow}>
                <View style={styles.resultTeamLogoBox}>
                  {match.homeTeamLogo ? (
                    <Image source={{ uri: match.homeTeamLogo }} style={styles.resultTeamLogo} />
                  ) : (
                    <Shield size={16} color="#C7C7CC" />
                  )}
                </View>
                <Text style={[
                  styles.resultTeamName,
                  isHome && styles.resultTeamNameBold
                ]} numberOfLines={1}>{match.homeTeam}</Text>
                <Text style={[
                  styles.resultScore,
                  isHome && (match.homeScore ?? 0) > (match.awayScore ?? 0) && { color: '#10B981' },
                  isHome && (match.homeScore ?? 0) < (match.awayScore ?? 0) && { color: '#EF4444' },
                ]}>{match.homeScore ?? 0}</Text>
              </View>

              <View style={styles.resultDividerLine} />

              <View style={styles.resultTeamRow}>
                <View style={styles.resultTeamLogoBox}>
                  {match.awayTeamLogo ? (
                    <Image source={{ uri: match.awayTeamLogo }} style={styles.resultTeamLogo} />
                  ) : (
                    <Shield size={16} color="#C7C7CC" />
                  )}
                </View>
                <Text style={[
                  styles.resultTeamName,
                  !isHome && styles.resultTeamNameBold
                ]} numberOfLines={1}>{match.awayTeam}</Text>
                <Text style={[
                  styles.resultScore,
                  !isHome && (match.awayScore ?? 0) > (match.homeScore ?? 0) && { color: '#10B981' },
                  !isHome && (match.awayScore ?? 0) < (match.homeScore ?? 0) && { color: '#EF4444' },
                ]}>{match.awayScore ?? 0}</Text>
              </View>
            </View>

            <View style={styles.resultFooter}>
              <Text style={styles.resultDateText}>{formatMatchDate(match.date)}</Text>
              <Text style={styles.resultFTText}>FT</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const TabIndicator = React.memo(({ tabs, activeIndex }: { tabs: { key: string }[]; activeIndex: number }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const tabWidth = (SCREEN_WIDTH - 40 - 6) / tabs.length;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: activeIndex * tabWidth,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, tabWidth, translateX]);

  return (
    <Animated.View
      style={[
        styles.tabIndicator,
        {
          width: tabWidth - 6,
          transform: [{ translateX: Animated.add(translateX, new Animated.Value(3)) }],
        },
      ]}
    />
  );
});

const PremiumEmptyState = React.memo(({ type }: { type: 'live' | 'next' | 'results' }) => {
  const config = {
    live: { icon: Radio, gradient: ['#FF3B30', '#FF6B6B'] as [string, string], title: 'No Live Matches', sub: 'Check back when your teams are playing' },
    next: { icon: Calendar, gradient: ['#007AFF', '#5AC8FA'] as [string, string], title: 'No Upcoming Fixtures', sub: 'Scheduled matches will appear here' },
    results: { icon: Trophy, gradient: ['#34C759', '#6FE08A'] as [string, string], title: 'No Recent Results', sub: 'Completed matches will show here' },
  };
  const { icon: Icon, gradient, title, sub } = config[type];

  return (
    <View style={styles.premiumEmptyState}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.premiumEmptyIcon}>
        <Icon size={22} color="#FFFFFF" strokeWidth={2} />
      </LinearGradient>
      <Text style={styles.premiumEmptyTitle}>{title}</Text>
      <Text style={styles.premiumEmptySub}>{sub}</Text>
    </View>
  );
});

function ModernSportsSectionComponent({
  liveMatches,
  completedMatches,
  upcomingMatches,
  isLoading,
  onViewAll,
  rawUpcomingCount: _rawUpcomingCount = 0
}: ModernSportsSectionProps) {
  const { profile, isLoading: profileLoading, getTeamLogo } = useUserProfile();
  const [selectedTab, setSelectedTab] = useState<'teams' | 'live' | 'next' | 'results'>('teams');
  const initialTabSetRef = useRef(false);

  useEffect(() => {
    if (!profile || initialTabSetRef.current) return;
    initialTabSetRef.current = true;
  }, [profile]);

  const [selectedMatch, setSelectedMatch] = useState<LiveFootballMatch | null>(null);
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isTeamMatch = useCallback((matchTeamName: string, favoriteTeamName: string): boolean => {
    const normalizedMatch = matchTeamName.toLowerCase().trim();
    const normalizedFavorite = favoriteTeamName.toLowerCase().trim();

    if (normalizedMatch === normalizedFavorite) return true;

    const normalizedMatchNoHyphens = normalizedMatch.replace(/-/g, ' ');
    const normalizedFavoriteNoHyphens = normalizedFavorite.replace(/-/g, ' ');
    if (normalizedMatchNoHyphens === normalizedFavoriteNoHyphens) return true;


    const teamVariations: Record<string, string[]> = {
      'manchester united': ['man united', 'man utd', 'mufc', 'manchester utd'],
      'barcelona': ['fc barcelona', 'barca', 'fcb'],
      'real madrid': ['rmcf', 'real madrid cf'],
      'bayern munich': ['bayern', 'fc bayern', 'bayern münchen'],
      'paris saint-germain': ['psg', 'paris sg', 'paris saint germain'],
      'manchester city': ['man city', 'mcfc'],
      'liverpool': ['lfc', 'liverpool fc'],
      'chelsea': ['chelsea fc', 'cfc'],
      'arsenal': ['arsenal fc', 'afc'],
      'tottenham': ['tottenham hotspur', 'spurs'],
      'atletico madrid': ['atletico', 'atlético madrid', 'atlético', 'atletico de madrid'],
      'inter milan': ['inter', 'fc internazionale', 'internazionale'],
      'ac milan': ['acm', 'ac milan 1899'],
      'borussia dortmund': ['dortmund', 'bvb'],
      'juventus': ['juve', 'juventus fc'],
    };

    for (const [mainName, variations] of Object.entries(teamVariations)) {
      const allVariations = [mainName, ...variations];
      const matchInVariations = allVariations.some(v => v === normalizedMatch);
      const favoriteInVariations = allVariations.some(v => v === normalizedFavorite);
      if (matchInVariations && favoriteInVariations) return true;
    }

    return false;
  }, []);

  const getTeamMatches = useCallback((team: UserTeam) => {
    const allMatches = [...liveMatches, ...completedMatches, ...upcomingMatches];
    return allMatches.filter(match => {
      if (team.apiId && team.apiId > 0) {
        if (match.homeTeamId === team.apiId || match.awayTeamId === team.apiId) return true;
        if (match.homeTeamId && match.awayTeamId) return false;
      }
      return isTeamMatch(match.homeTeam, team.name) || isTeamMatch(match.awayTeam, team.name);
    }).sort((a, b) => {
      if (a.status === 'Live' && b.status !== 'Live') return -1;
      if (b.status === 'Live' && a.status !== 'Live') return 1;
      if (a.status === 'Upcoming' && b.status === 'Completed') return -1;
      if (b.status === 'Upcoming' && a.status === 'Completed') return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [liveMatches, completedMatches, upcomingMatches, isTeamMatch]);

  const getEarliestMatchDate = useCallback((matches: LiveFootballMatch[]): number => {
    const liveMatch = matches.find(m => m.status === 'Live');
    if (liveMatch) return 0;
    const upcoming = matches.filter(m => m.status === 'Upcoming').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (upcoming.length > 0) return new Date(upcoming[0].date).getTime();
    return Infinity;
  }, []);

  const leagueMatches = useCallback((league1: string, league2: string): boolean => {
    const a = league1.toLowerCase().trim();
    const b = league2.toLowerCase().trim();
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    const normalize = (s: string) => s.replace(/[^a-z0-9]/g, '');
    if (normalize(a) === normalize(b)) return true;
    return false;
  }, []);

  const getTeamStats = useCallback((team: UserTeam) => {
    const teamMatches = getTeamMatches(team);
    const liveMatch = teamMatches.find(m => m.status === 'Live');
    const nextMatch = teamMatches.find(m => m.status === 'Upcoming');
    const primaryLeague = team.league || '';
    const contextLeague = nextMatch?.league || liveMatch?.league || '';
    const completedMatches_all = teamMatches.filter(m => m.status === 'Completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const primaryFiltered = primaryLeague
      ? completedMatches_all.filter(m => leagueMatches(m.league, primaryLeague))
      : [];
    const contextFiltered = contextLeague && contextLeague !== primaryLeague
      ? completedMatches_all.filter(m => leagueMatches(m.league, contextLeague))
      : [];
    const leagueFiltered = primaryFiltered.length > 0
      ? primaryFiltered
      : contextFiltered.length > 0
        ? contextFiltered
        : completedMatches_all;
    const recentResults = (leagueFiltered.length > 0 ? leagueFiltered : completedMatches_all).slice(0, 5);
    let wins = 0, draws = 0, losses = 0;
    recentResults.forEach(match => {
      const isHome = isTeamMatch(match.homeTeam, team.name);
      const teamScore = isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0);
      const opponentScore = isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0);
      if (teamScore > opponentScore) wins++;
      else if (teamScore < opponentScore) losses++;
      else draws++;
    });
    const leagueLogo = teamMatches.find(m => m.leagueLogo)?.leagueLogo ?? null;
    return { liveMatch, nextMatch, recentResults, totalMatches: teamMatches.length, form: { wins, draws, losses }, leagueLogo };
  }, [getTeamMatches, isTeamMatch, leagueMatches]);

  const handleTabPress = useCallback(async (tab: typeof selectedTab) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 80, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setSelectedTab(tab);
  }, [fadeAnim]);

  const handleMatchPress = useCallback(async (match: LiveFootballMatch) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedMatch(match);
    setShowMatchDetails(true);
  }, []);

  const isNationalTeamMatch = useCallback((matchTeamName: string, nationality: UserNationality, matchTeamId?: number): boolean => {
    if (matchTeamId && nationality.apiId && matchTeamId === nationality.apiId) return true;

    const normalizedMatch = matchTeamName.toLowerCase().trim();
    const normalizedNation = nationality.name.toLowerCase().trim();
    if (normalizedMatch === normalizedNation) return true;
    if (normalizedMatch.includes(normalizedNation) || normalizedNation.includes(normalizedMatch)) return true;

    const nationalTeamVariations: Record<string, string[]> = {
      'england': ['england', 'three lions', 'english'],
      'nigeria': ['nigeria', 'super eagles', 'nigerian'],
      'algeria': ['algeria', 'les fennecs', 'algerian', 'algérie'],
      'cameroon': ['cameroon', 'indomitable lions', 'cameroonian', 'cameroun'],
      'egypt': ['egypt', 'pharaohs', 'egyptian'],
      'ghana': ['ghana', 'black stars', 'ghanaian'],
      'ivory coast': ['ivory coast', "côte d'ivoire", 'cote d ivoire', 'elephants', 'ivorian'],
      'morocco': ['morocco', 'atlas lions', 'moroccan', 'maroc'],
      'senegal': ['senegal', 'lions of teranga', 'senegalese', 'sénégal'],
      'tunisia': ['tunisia', 'eagles of carthage', 'tunisian', 'tunisie'],
      'south africa': ['south africa', 'bafana bafana', 'south african'],
      'brazil': ['brazil', 'brasil', 'seleção', 'brazilian'],
      'germany': ['germany', 'deutschland', 'german', 'die mannschaft'],
      'france': ['france', 'les bleus', 'french'],
      'spain': ['spain', 'españa', 'la roja', 'spanish'],
      'italy': ['italy', 'italia', 'azzurri', 'italian'],
      'argentina': ['argentina', 'la albiceleste', 'argentinian'],
      'portugal': ['portugal', 'portuguese'],
      'netherlands': ['netherlands', 'holland', 'dutch', 'oranje'],
      'belgium': ['belgium', 'belgique', 'belgian', 'red devils'],
      'scotland': ['scotland', 'scottish'],
      'wales': ['wales', 'welsh', 'cymru'],
    };

    const variations = nationalTeamVariations[normalizedNation];
    if (variations) {
      for (const variant of variations) {
        if (normalizedMatch === variant || normalizedMatch.includes(variant) || variant.includes(normalizedMatch)) {
          return true;
        }
      }
    }

    return false;
  }, []);

  const getNationalTeamMatches = useCallback((nationality: UserNationality) => {
    const allMatches = [...liveMatches, ...completedMatches, ...upcomingMatches];
    return allMatches.filter(match =>
      isNationalTeamMatch(match.homeTeam, nationality, match.homeTeamId) || isNationalTeamMatch(match.awayTeam, nationality, match.awayTeamId)
    ).sort((a, b) => {
      if (a.status === 'Live' && b.status !== 'Live') return -1;
      if (b.status === 'Live' && a.status !== 'Live') return 1;
      if (a.status === 'Upcoming' && b.status === 'Completed') return -1;
      if (b.status === 'Upcoming' && a.status === 'Completed') return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [liveMatches, completedMatches, upcomingMatches, isNationalTeamMatch]);

  const teamsCount = profile?.favoriteTeams?.length || 0;

  const teamStatsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getTeamStats>>();
    profile?.favoriteTeams?.forEach(team => {
      map.set(team.id, getTeamStats(team));
    });
    return map;
  }, [profile?.favoriteTeams, getTeamStats]);

  const sortedFavoriteTeams = useMemo(() => {
    if (!profile?.favoriteTeams) return [];
    return [...profile.favoriteTeams].sort((a, b) => {
      const aMatches = getTeamMatches(a);
      const bMatches = getTeamMatches(b);
      return getEarliestMatchDate(aMatches) - getEarliestMatchDate(bMatches);
    });
  }, [profile?.favoriteTeams, getTeamMatches, getEarliestMatchDate]);

  const allTeamMatches = useMemo(() => {
    const matches: { match: LiveFootballMatch; teamName: string }[] = [];
    profile?.favoriteTeams?.forEach(team => {
      getTeamMatches(team).forEach(match => {
        if (!matches.find(m => m.match.id === match.id)) {
          matches.push({ match, teamName: team.name });
        }
      });
    });
    return matches;
  }, [profile?.favoriteTeams, getTeamMatches]);

  const allNationalTeamMatches = useMemo(() => {
    const matches: { match: LiveFootballMatch; nationName: string }[] = [];
    profile?.nationalities?.forEach(nationality => {
      getNationalTeamMatches(nationality).forEach(match => {
        if (!matches.find(m => m.match.id === match.id)) {
          matches.push({ match, nationName: nationality.name });
        }
      });
    });
    return matches;
  }, [profile?.nationalities, getNationalTeamMatches]);

  const uniqueTeamMatches = useMemo(() => {
    const combinedMatches = [...allTeamMatches, ...allNationalTeamMatches.map(m => ({ match: m.match, teamName: m.nationName }))];
    const uniqueMatches: { match: LiveFootballMatch; teamName: string }[] = [];
    const seenIds = new Set<string>();
    combinedMatches.forEach(m => {
      if (!seenIds.has(m.match.id)) {
        seenIds.add(m.match.id);
        uniqueMatches.push(m);
      }
    });
    return uniqueMatches;
  }, [allTeamMatches, allNationalTeamMatches]);

  const liveCount = useMemo(() => uniqueTeamMatches.filter(m => m.match.status === 'Live').length, [uniqueTeamMatches]);
  const upcomingCount = useMemo(() => uniqueTeamMatches.filter(m => m.match.status === 'Upcoming').length, [uniqueTeamMatches]);
  const resultsCount = useMemo(() => uniqueTeamMatches.filter(m => m.match.status === 'Completed').length, [uniqueTeamMatches]);

  const filteredMatches = useMemo(() => {
    let matches: { match: LiveFootballMatch; teamName: string }[] = [];
    switch (selectedTab) {
      case 'live':
        matches = uniqueTeamMatches.filter(m => m.match.status === 'Live');
        matches.sort((a, b) => new Date(a.match.date).getTime() - new Date(b.match.date).getTime());
        break;
      case 'next':
        matches = uniqueTeamMatches.filter(m => m.match.status === 'Upcoming');
        matches.sort((a, b) => new Date(a.match.date).getTime() - new Date(b.match.date).getTime());
        break;
      case 'results':
        matches = uniqueTeamMatches.filter(m => m.match.status === 'Completed');
        matches.sort((a, b) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime());
        break;
      default:
        return [];
    }
    return matches;
  }, [uniqueTeamMatches, selectedTab]);

  if (isLoading || profileLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Trophy size={20} color="#007AFF" />
            <Text style={styles.headerTitle}>My Teams</Text>
          </View>
        </View>
        <EnhancedLoadingState message="Loading matches" type="sports" />
      </View>
    );
  }

  const hasTeamsOrNationalities = (profile?.favoriteTeams && profile.favoriteTeams.length > 0) ||
                                    (profile?.nationalities && profile.nationalities.length > 0);

  if (!hasTeamsOrNationalities) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Trophy size={20} color="#007AFF" />
            <Text style={styles.headerTitle}>My Teams</Text>
          </View>
          {onViewAll && (
            <TouchableOpacity onPress={onViewAll} style={styles.addTeamsBtn}>
              <Text style={styles.addTeamsBtnText}>Add Teams</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center' }}>Add your favourite teams or select your nationality to track matches</Text>
        </View>
      </View>
    );
  }

  const renderTeamCard = (team: UserTeam, index: number) => {
    const stats = teamStatsMap.get(team.id) || getTeamStats(team);
    const gradient = getTeamGradient(index);
    const hasLive = !!stats.liveMatch;
    const teamLogo = getTeamLogo(team);

    return (
      <TouchableOpacity
        key={team.id}
        style={styles.teamCard}
        onPress={() => stats.liveMatch ? handleMatchPress(stats.liveMatch) : stats.nextMatch && handleMatchPress(stats.nextMatch)}
        activeOpacity={0.95}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.teamCardGradient}
        >
          <View style={styles.teamCardContent}>
            <View style={styles.teamCardTop}>
              <View style={styles.teamInfo}>
                  {teamLogo ? (
                    <Image source={{ uri: teamLogo }} style={styles.teamBadgeLogo} />
                  ) : stats.leagueLogo ? (
                    <Image source={{ uri: stats.leagueLogo }} style={styles.teamBadgeLogo} />
                  ) : (
                    <Shield size={18} color="#fff" />
                  )}
                <View style={styles.teamTextInfo}>
                  <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
                  <Text style={styles.teamLeague} numberOfLines={1}>{stats.liveMatch?.league || stats.nextMatch?.league || team.league}</Text>
                </View>
              </View>

              {hasLive && (
                <View style={styles.liveBadge}>
                  <LivePulse />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              )}
            </View>

            {stats.liveMatch ? (
              <View style={styles.liveMatchSection}>
                <View style={styles.liveScoreRow}>
                  <View style={styles.liveTeamCol}>
                    {stats.liveMatch.homeTeamLogo && (
                      <Image source={{ uri: stats.liveMatch.homeTeamLogo }} style={styles.teamLogo} />
                    )}
                    <Text style={styles.liveTeamName} numberOfLines={1}>{stats.liveMatch.homeTeam}</Text>
                  </View>
                  <View style={styles.scoreCenter}>
                    <View style={styles.scoreBox}>
                      <Text style={styles.scoreText}>{stats.liveMatch.homeScore ?? 0}</Text>
                      <Text style={styles.scoreDivider}>-</Text>
                      <Text style={styles.scoreText}>{stats.liveMatch.awayScore ?? 0}</Text>
                    </View>
                    {stats.liveMatch.elapsed && (
                      <View style={styles.elapsedBadge}>
                        <Text style={styles.elapsedText}>{stats.liveMatch.elapsed}&apos;</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.liveTeamCol}>
                    {stats.liveMatch.awayTeamLogo && (
                      <Image source={{ uri: stats.liveMatch.awayTeamLogo }} style={styles.teamLogo} />
                    )}
                    <Text style={styles.liveTeamName} numberOfLines={1}>{stats.liveMatch.awayTeam}</Text>
                  </View>
                </View>
                <Text style={styles.matchLeague}>{stats.liveMatch.league}</Text>
              </View>
            ) : stats.nextMatch ? (
              <View style={styles.nextMatchSection}>
                <View style={styles.nextMatchHeader}>
                  <Clock size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.nextMatchLabel}>NEXT MATCH</Text>
                </View>
                <View style={styles.nextMatchTeamsRow}>
                  <View style={styles.nextMatchTeamCol}>
                    {stats.nextMatch.homeTeamLogo ? (
                      <Image source={{ uri: stats.nextMatch.homeTeamLogo }} style={styles.nextMatchTeamLogo} />
                    ) : (
                      <View style={[styles.nextMatchTeamLogo, styles.nextMatchTeamLogoPlaceholder]}>
                        <Shield size={16} color="rgba(255,255,255,0.5)" />
                      </View>
                    )}
                    <Text style={styles.nextMatchTeamName} numberOfLines={1}>{stats.nextMatch.homeTeam}</Text>
                  </View>
                  <View style={styles.vsContainer}>
                    <Text style={styles.vsText}>vs</Text>
                  </View>
                  <View style={styles.nextMatchTeamCol}>
                    {stats.nextMatch.awayTeamLogo ? (
                      <Image source={{ uri: stats.nextMatch.awayTeamLogo }} style={styles.nextMatchTeamLogo} />
                    ) : (
                      <View style={[styles.nextMatchTeamLogo, styles.nextMatchTeamLogoPlaceholder]}>
                        <Shield size={16} color="rgba(255,255,255,0.5)" />
                      </View>
                    )}
                    <Text style={styles.nextMatchTeamName} numberOfLines={1}>{stats.nextMatch.awayTeam}</Text>
                  </View>
                </View>
                <View style={styles.nextMatchMeta}>
                  <Calendar size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.nextMatchDate}>
                    {formatMatchDate(stats.nextMatch.date)} • {stats.nextMatch.time}
                  </Text>
                  <View style={styles.countdownBadge}>
                    <Text style={styles.countdownText}>
                      {formatTimeUntilMatch(stats.nextMatch.date, stats.nextMatch.time)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noMatchSection}>
                <Calendar size={24} color="rgba(255,255,255,0.4)" />
                <Text style={styles.noMatchText}>No upcoming matches</Text>
              </View>
            )}

            {stats.recentResults.length > 0 && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Form</Text>
                <View style={styles.formDots}>
                  {stats.recentResults.slice(0, 5).map((match, i) => {
                    const isHome = isTeamMatch(match.homeTeam, team.name);
                    const teamScore = isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0);
                    const opponentScore = isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0);
                    const result = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'D';
                    const color = result === 'W' ? '#10B981' : result === 'L' ? '#EF4444' : '#9CA3AF';
                    return (
                      <View key={match.id || i} style={[styles.formDot, { backgroundColor: color }]}>
                        <Text style={styles.formDotText}>{result}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.formStats}>
                  {stats.form.wins}W {stats.form.draws}D {stats.form.losses}L
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const tabItems = [
    { key: 'teams' as const, label: 'Clubs', count: teamsCount, icon: Heart },
    { key: 'live' as const, label: 'Live', count: liveCount, icon: Zap, isLive: true },
    { key: 'next' as const, label: 'Next', count: upcomingCount, icon: Clock },
    { key: 'results' as const, label: 'Results', count: resultsCount, icon: Trophy },
  ];

  const activeTabIndex = tabItems.findIndex(t => t.key === selectedTab);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Trophy size={20} color="#007AFF" />
          <Text style={styles.headerTitle}>My Teams</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {teamsCount} team{teamsCount !== 1 ? 's' : ''} • {allTeamMatches.length} matches
        </Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllBtn}>
            <Text style={styles.viewAllBtnText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabBar}>
        <TabIndicator tabs={tabItems} activeIndex={activeTabIndex} />
        {tabItems.map(tab => {
          const isActive = selectedTab === tab.key;
          const TabIcon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <TabIcon
                size={12}
                color={isActive ? (tab.isLive ? '#FF3B30' : '#007AFF') : '#8E8E93'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
                isActive && tab.isLive && { color: '#FF3B30' },
              ]}>{tab.label}</Text>
              {tab.count !== null && tab.count > 0 && (
                <View style={[
                  styles.tabBadge,
                  isActive && styles.tabBadgeActive,
                  tab.isLive && styles.tabBadgeLive,
                ]}>
                  <Text style={[styles.tabBadgeText, isActive && !tab.isLive && styles.tabBadgeTextActive]}>{tab.count > 99 ? '99+' : tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {selectedTab === 'teams' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.teamsScrollContent}
          >
            {sortedFavoriteTeams.map((team, index) => renderTeamCard(team, index))}
          </ScrollView>
        ) : selectedTab === 'live' ? (
          filteredMatches.length === 0 ? (
            <PremiumEmptyState type="live" />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.premiumListContent}
            >
              {filteredMatches.map(({ match }, idx) => (
                <PremiumLiveMatchCard
                  key={match.id || `live-${idx}`}
                  match={match}
                  onPress={() => handleMatchPress(match)}
                />
              ))}
            </ScrollView>
          )
        ) : selectedTab === 'next' ? (
          filteredMatches.length === 0 ? (
            <PremiumEmptyState type="next" />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.premiumListContent}
            >
              {filteredMatches.slice(0, 10).map(({ match }, index) => (
                <PremiumUpcomingCard
                  key={match.id || `upcoming-${index}`}
                  match={match}
                  isFirst={index === 0}
                  onPress={() => handleMatchPress(match)}
                />
              ))}
              {filteredMatches.length > 10 && (
                <View style={styles.moreMatchesHint}>
                  <Text style={styles.moreMatchesText}>+{filteredMatches.length - 10} more matches</Text>
                  <ChevronRight size={14} color="#8E8E93" />
                </View>
              )}
            </ScrollView>
          )
        ) : selectedTab === 'results' ? (
          filteredMatches.length === 0 ? (
            <PremiumEmptyState type="results" />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.premiumListContent}
            >
              {filteredMatches.slice(0, 10).map(({ match, teamName }, idx) => (
                <PremiumResultCard
                  key={match.id || `result-${idx}`}
                  match={match}
                  teamName={teamName}
                  isTeamMatchFn={isTeamMatch}
                  onPress={() => handleMatchPress(match)}
                />
              ))}
            </ScrollView>
          )
        ) : null}
      </Animated.View>

      {selectedMatch && (
        <MatchDetailsModal
          visible={showMatchDetails}
          onClose={() => setShowMatchDetails(false)}
          fixtureId={parseInt(selectedMatch.id)}
          homeTeam={selectedMatch.homeTeam}
          awayTeam={selectedMatch.awayTeam}
          homeScore={selectedMatch.homeScore}
          awayScore={selectedMatch.awayScore}
          league={selectedMatch.league}
          homeTeamLogo={selectedMatch.homeTeamLogo}
          awayTeamLogo={selectedMatch.awayTeamLogo}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500' as const,
    flex: 1,
  },
  viewAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
  },
  viewAllBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.primary,
  },
  addTeamsBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
  },
  addTeamsBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  tabIndicator: {
    position: 'absolute' as const,
    top: 3,
    bottom: 3,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    ...cardShadow(2),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 11,
    gap: 3,
    zIndex: 1,
    overflow: 'hidden' as const,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8E8E93',
    flexShrink: 0,
  },
  tabLabelActive: {
    color: '#007AFF',
    fontWeight: '700' as const,
  },
  tabBadge: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 7,
    minWidth: 16,
    alignItems: 'center' as const,
    flexShrink: 0,
  },
  tabBadgeActive: {
    backgroundColor: '#007AFF15',
  },
  tabBadgeLive: {
    backgroundColor: '#FF3B30',
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#fff',
  },
  tabBadgeTextActive: {
    color: '#007AFF',
  },
  content: {
    minHeight: 280,
  },
  teamsScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  premiumListContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },

  premiumCardWrap: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  premiumLiveCard: {
    borderRadius: 18,
    padding: 16,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  premiumLiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  premiumLiveBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#FF3B30',
    letterSpacing: 0.5,
  },
  premiumElapsedPill: {
    backgroundColor: '#FF3B3020',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B3040',
  },
  premiumElapsedText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#FF6B6B',
  },
  premiumLeagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  premiumLeagueLogo: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  premiumLeagueName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    maxWidth: 120,
  },
  premiumMatchBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  premiumTeamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  premiumTeamLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumTeamLogo: {
    width: 36,
    height: 36,
    resizeMode: 'contain' as const,
  },
  premiumTeamName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center' as const,
    maxWidth: 90,
    lineHeight: 16,
  },
  premiumScoreCol: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  premiumScoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  premiumScore: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  premiumScoreDivider: {
    width: 2,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
  },
  premiumVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  premiumVenueText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500' as const,
  },
  premiumLiveGlow: {
    position: 'absolute' as const,
    top: -40,
    right: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF3B30',
    opacity: 0.05,
  },

  upcomingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    ...cardShadow(2),
    overflow: 'hidden' as const,
  },
  upcomingCardFirst: {
    borderColor: '#007AFF20',
    borderWidth: 1.5,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  upcomingLeagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  upcomingLeagueLogo: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  upcomingLeagueName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6E6E73',
    flex: 1,
  },
  upcomingCountdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  upcomingCountdownSoon: {
    backgroundColor: '#FF950015',
    borderWidth: 1,
    borderColor: '#FF950025',
  },
  upcomingCountdownText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#6E6E73',
  },
  upcomingCountdownTextSoon: {
    color: '#FF9500',
  },
  upcomingBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  upcomingTeamRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upcomingTeamRowRight: {
    flexDirection: 'row-reverse' as const,
  },
  upcomingTeamLogoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingTeamLogo: {
    width: 28,
    height: 28,
    resizeMode: 'contain' as const,
  },
  upcomingTeamName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    flex: 1,
    lineHeight: 17,
  },
  upcomingVsCol: {
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 4,
  },
  upcomingTimeBubble: {
    backgroundColor: '#007AFF10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF15',
  },
  upcomingTimeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#007AFF',
    letterSpacing: -0.3,
  },
  upcomingDateText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#AEAEB2',
  },
  upcomingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  upcomingVenueText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#AEAEB2',
  },

  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    ...cardShadow(2),
  },
  resultAccent: {
    width: 4,
  },
  resultContent: {
    flex: 1,
    padding: 14,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLeagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  resultLeagueLogo: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  resultLeagueName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6E6E73',
    flex: 1,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  resultBody: {
    gap: 2,
  },
  resultTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  resultTeamLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTeamLogo: {
    width: 22,
    height: 22,
    resizeMode: 'contain' as const,
  },
  resultTeamName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6E6E73',
  },
  resultTeamNameBold: {
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  resultScore: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    minWidth: 28,
    textAlign: 'right' as const,
    letterSpacing: -0.5,
  },
  resultDividerLine: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginLeft: 42,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  resultDateText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#AEAEB2',
  },
  resultFTText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#8E8E93',
    letterSpacing: 0.5,
  },

  premiumEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    gap: 10,
  },
  premiumEmptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  premiumEmptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  premiumEmptySub: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center' as const,
    lineHeight: 20,
  },

  moreMatchesHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  moreMatchesText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },

  teamCard: {
    borderRadius: 18,
    overflow: 'hidden',
    ...cardShadow(3),
  },
  teamCardGradient: {
    padding: 16,
    flexDirection: 'row',
  },
  teamCardContent: {
    flex: 1,
  },
  teamCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  teamBadgeLogo: {
    width: 42,
    height: 42,
    resizeMode: 'contain' as const,
  },
  teamTextInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 2,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 3,
    lineHeight: 18,
  },
  teamLeague: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  livePulseContainer: {
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  livePulseRing: {
    position: 'absolute' as const,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveMatchSection: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  liveScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  liveTeamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain' as const,
  },
  liveTeamName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
    textAlign: 'center' as const,
  },
  scoreCenter: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreText: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#fff',
  },
  scoreDivider: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '300' as const,
  },
  elapsedBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  elapsedText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  matchLeague: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center' as const,
  },
  nextMatchSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  nextMatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  nextMatchLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  nextMatchTeamsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  nextMatchTeamCol: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 6,
  },
  nextMatchTeamLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain' as const,
  },
  nextMatchTeamLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  nextMatchTeamName: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
    textAlign: 'center' as const,
  },
  vsContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
  },
  nextMatchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextMatchDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
  },
  countdownBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  noMatchSection: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  noMatchText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500' as const,
  },
  formSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  formLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600' as const,
  },
  formDots: {
    flexDirection: 'row',
    gap: 4,
  },
  formDot: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formDotText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
  },
  formStats: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500' as const,
    marginLeft: 'auto' as const,
  },
});

export default React.memo(ModernSportsSectionComponent);
