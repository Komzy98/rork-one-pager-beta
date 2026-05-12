import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
import { ChevronRight, Calendar, MapPin, Tv, Radio } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  NBAGame,
  getUpcomingGames,
  getCompletedGames,
  getTeamLogo,
} from '@/constants/nbaData';
import { NBAFavoriteTeam } from '@/types/habit';
import { useTheme } from '@/hooks/useTheme';
import NBAGameDetailsModal from './NBAGameDetailsModal';
import { fetchNBAGamesMultipleDays } from '@/utils/nbaApi';

const NBA_ORANGE = '#F26522';

interface NBAUpcomingSectionProps {
  favoriteNBATeams: NBAFavoriteTeam[];
}

function filterGamesByFavorites(games: NBAGame[], favoriteAbbreviations: Set<string>, limit: number): NBAGame[] {
  if (favoriteAbbreviations.size === 0) return games.slice(0, limit);
  return games
    .filter(
      g =>
        favoriteAbbreviations.has(g.team1.abbreviation) ||
        favoriteAbbreviations.has(g.team2.abbreviation)
    )
    .slice(0, limit);
}

export default function NBAUpcomingSection({ favoriteNBATeams }: NBAUpcomingSectionProps) {
  const { colors, isDark } = useTheme();
  const [selectedGame, setSelectedGame] = useState<NBAGame | null>(null);
  const [showGameModal, setShowGameModal] = useState<boolean>(false);

  const nbaQuery = useQuery({
    queryKey: ['nba-games'],
    queryFn: () => fetchNBAGamesMultipleDays(5, 7),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const handleGamePress = useCallback((game: NBAGame) => {
    setSelectedGame(game);
    setShowGameModal(true);
  }, []);

  const favoriteAbbreviations = useMemo(() => {
    return new Set(favoriteNBATeams.map(t => t.abbreviation));
  }, [favoriteNBATeams]);

  const fallbackUpcoming = useMemo(() => {
    const all = getUpcomingGames();
    return filterGamesByFavorites(all, favoriteAbbreviations, favoriteAbbreviations.size === 0 ? 4 : 6);
  }, [favoriteAbbreviations]);

  const fallbackResults = useMemo(() => {
    const all = getCompletedGames();
    return filterGamesByFavorites(all, favoriteAbbreviations, 3);
  }, [favoriteAbbreviations]);

  const liveGames = useMemo(() => {
    if (!nbaQuery.isSuccess || !nbaQuery.data?.live?.length) return [];
    return filterGamesByFavorites(nbaQuery.data.live, favoriteAbbreviations, 6);
  }, [nbaQuery.isSuccess, nbaQuery.data?.live, favoriteAbbreviations]);

  const upcomingGames = useMemo(() => {
    if (nbaQuery.isSuccess && nbaQuery.data) {
      const u = filterGamesByFavorites(nbaQuery.data.upcoming, favoriteAbbreviations, 6);
      if (u.length > 0) return u;
    }
    return fallbackUpcoming;
  }, [nbaQuery.isSuccess, nbaQuery.data?.upcoming, favoriteAbbreviations, fallbackUpcoming]);

  const recentResults = useMemo(() => {
    if (nbaQuery.isSuccess && nbaQuery.data) {
      const c = filterGamesByFavorites(nbaQuery.data.completed, favoriteAbbreviations, 3);
      if (c.length > 0) return c;
    }
    return fallbackResults;
  }, [nbaQuery.isSuccess, nbaQuery.data?.completed, favoriteAbbreviations, fallbackResults]);

  if (liveGames.length === 0 && upcomingGames.length === 0 && recentResults.length === 0) return null;

  const formatGameDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === now.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatGameTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const tipOrStartTime = (game: NBAGame): string => {
    if (game.startTime) return game.startTime;
    return formatGameTime(game.date);
  };

  const isFavorite = (abbr: string): boolean => favoriteAbbreviations.has(abbr);

  const renderUpcomingGame = (game: NBAGame, index: number, variant: 'live' | 'upcoming') => {
    const team1Fav = isFavorite(game.team1.abbreviation);
    const team2Fav = isFavorite(game.team2.abbreviation);
    const isLive = variant === 'live' && game.status === 'live';
    const s1 = game.team1.score;
    const s2 = game.team2.score;
    const hasScores = s1 != null && s2 != null;

    return (
      <TouchableOpacity
        key={`${variant}-${game.id}-${index}`}
        activeOpacity={0.85}
        onPress={() => handleGamePress(game)}
        style={[styles.gameCard, index === 0 && { marginLeft: 0 }, isLive && styles.gameCardLive]}
      >
        <LinearGradient
          colors={isLive ? ['#2A1518', '#1A1A2E'] : ['#1A1A2E', '#16213E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gameCardGradient}
        >
          <View style={styles.gameHeader}>
            <View style={styles.dateBadge}>
              <Calendar size={10} color="#F26522" />
              <Text style={styles.dateText}>{formatGameDate(game.date)}</Text>
            </View>
            {isLive ? (
              <View style={styles.liveHeaderBadge}>
                <Radio size={10} color="#F87171" />
                <Text style={styles.liveHeaderText}>LIVE</Text>
                {game.quarter != null && (
                  <Text style={styles.liveQuarterText}>
                    Q{game.quarter}
                    {game.timeRemaining ? ` ${game.timeRemaining}` : ''}
                  </Text>
                )}
              </View>
            ) : (
              !!game.broadcast && (
                <View style={styles.broadcastBadge}>
                  <Tv size={9} color="#94A3B8" />
                  <Text style={styles.broadcastText}>{game.broadcast}</Text>
                </View>
              )
            )}
          </View>

          <View style={styles.matchupRow}>
            <View style={styles.teamColumn}>
              <Image source={{ uri: getTeamLogo(game.team1.abbreviation) }} style={styles.teamLogoImg} resizeMode="contain" />
              <Text style={[styles.teamAbbr, team1Fav && { color: '#fff', fontWeight: '800' as const }]}>{game.team1.abbreviation}</Text>
              {!!game.team1.record && <Text style={styles.teamRecord}>{game.team1.record}</Text>}
            </View>

            <View style={styles.vsColumn}>
              {isLive && hasScores ? (
                <>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreNum}>{s1}</Text>
                    <Text style={styles.scoreDash}>-</Text>
                    <Text style={styles.scoreNum}>{s2}</Text>
                  </View>
                  {!!game.series && <Text style={styles.seriesText}>{game.series}</Text>}
                </>
              ) : isLive ? (
                <>
                  <Text style={styles.timeText}>{tipOrStartTime(game)}</Text>
                  <Text style={styles.vsText}>VS</Text>
                  {!!game.series && <Text style={styles.seriesText}>{game.series}</Text>}
                </>
              ) : (
                <>
                  <Text style={styles.timeText}>{tipOrStartTime(game)}</Text>
                  <Text style={styles.vsText}>VS</Text>
                  {!!game.series && <Text style={styles.seriesText}>{game.series}</Text>}
                </>
              )}
            </View>

            <View style={styles.teamColumn}>
              <Image source={{ uri: getTeamLogo(game.team2.abbreviation) }} style={styles.teamLogoImg} resizeMode="contain" />
              <Text style={[styles.teamAbbr, team2Fav && { color: '#fff', fontWeight: '800' as const }]}>{game.team2.abbreviation}</Text>
              {!!game.team2.record && <Text style={styles.teamRecord}>{game.team2.record}</Text>}
            </View>
          </View>

          {!!game.arena && (
            <View style={styles.venueRow}>
              <MapPin size={10} color="#64748B" />
              <Text style={styles.venueText}>{game.arena}, {game.city}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderResultGame = (game: NBAGame) => {
    const team1Won = game.team1.winner === true;
    const team2Won = game.team2.winner === true;

    return (
      <TouchableOpacity
        key={game.id}
        activeOpacity={0.85}
        onPress={() => handleGamePress(game)}
        style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.resultTeamRow}>
          <View style={styles.resultTeamInfo}>
            <Image source={{ uri: getTeamLogo(game.team1.abbreviation) }} style={styles.resultTeamLogo} resizeMode="contain" />
            <Text
              style={[
                styles.resultTeamName,
                { color: colors.textMuted },
                team1Won && { color: colors.text, fontWeight: '700' as const },
              ]}
            >
              {game.team1.abbreviation}
            </Text>
          </View>
          <Text
            style={[
              styles.resultScore,
              { color: colors.textMuted },
              team1Won && { color: colors.text, fontWeight: '800' as const },
            ]}
          >
            {game.team1.score}
          </Text>
        </View>
        <View style={[styles.resultDivider, { backgroundColor: colors.border }]} />
        <View style={styles.resultTeamRow}>
          <View style={styles.resultTeamInfo}>
            <Image source={{ uri: getTeamLogo(game.team2.abbreviation) }} style={styles.resultTeamLogo} resizeMode="contain" />
            <Text
              style={[
                styles.resultTeamName,
                { color: colors.textMuted },
                team2Won && { color: colors.text, fontWeight: '700' as const },
              ]}
            >
              {game.team2.abbreviation}
            </Text>
          </View>
          <Text
            style={[
              styles.resultScore,
              { color: colors.textMuted },
              team2Won && { color: colors.text, fontWeight: '800' as const },
            ]}
          >
            {game.team2.score}
          </Text>
        </View>
        {!!game.highlights && (
          <View style={[styles.highlightRow, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.highlightText, { color: colors.textSecondary }]} numberOfLines={1}>
              {game.highlights}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🏀</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>NBA</Text>
          {nbaQuery.isFetching && !nbaQuery.isPending ? (
            <ActivityIndicator size="small" color={NBA_ORANGE} style={styles.headerSpinner} />
          ) : null}
          {liveGames.length + upcomingGames.length > 0 && (
            <View style={[styles.countPill, { backgroundColor: isDark ? 'rgba(242, 101, 34, 0.18)' : '#FFF2EB' }]}>
              <Text style={styles.countPillText}>{liveGames.length + upcomingGames.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => router.push('/sports' as any)}
          style={styles.seeAllBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.seeAllText}>See All</Text>
          <ChevronRight size={14} color={NBA_ORANGE} />
        </TouchableOpacity>
      </View>

      {favoriteNBATeams.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamsRow} contentContainerStyle={styles.teamsRowContent}>
          {favoriteNBATeams.map((team) => (
            <View
              key={team.id}
              style={[
                styles.favTeamChip,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              {team.logo && <Image source={{ uri: team.logo }} style={styles.favTeamLogo} resizeMode="contain" />}
              <Text style={[styles.favTeamName, { color: colors.text }]}>{team.abbreviation}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {liveGames.length > 0 && (
        <>
          <Text style={[styles.subSectionTitle, { color: '#F87171' }]}>Live</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gamesScroll}
          >
            {liveGames.map((game, idx) => renderUpcomingGame(game, idx, 'live'))}
          </ScrollView>
        </>
      )}

      {upcomingGames.length > 0 && (
        <>
          <Text
            style={[
              styles.subSectionTitle,
              { color: colors.textMuted },
              liveGames.length > 0 && { marginTop: 16 },
            ]}
          >
            Upcoming Games
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gamesScroll}
          >
            {upcomingGames.map((game, idx) => renderUpcomingGame(game, idx, 'upcoming'))}
          </ScrollView>
        </>
      )}

      {recentResults.length > 0 && (
        <>
          <Text style={[styles.subSectionTitle, { marginTop: 16, color: colors.textMuted }]}>Recent Results</Text>
          <View style={styles.resultsContainer}>
            {recentResults.map(renderResultGame)}
          </View>
        </>
      )}

      <NBAGameDetailsModal
        visible={showGameModal}
        onClose={() => { setShowGameModal(false); setSelectedGame(null); }}
        game={selectedGame}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  headerSpinner: {
    marginLeft: 4,
  },
  countPill: {
    backgroundColor: '#FFF2EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#F26522',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#F26522',
  },
  teamsRow: {
    marginBottom: 14,
  },
  teamsRowContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  favTeamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  favTeamLogo: {
    width: 18,
    height: 18,
  },
  favTeamName: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  gamesScroll: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
  },
  gameCard: {
    width: CARD_WIDTH,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  gameCardLive: {
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  gameCardGradient: {
    padding: 20,
    borderRadius: 18,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(242, 101, 34, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#F26522',
  },
  broadcastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  broadcastText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#94A3B8',
  },
  liveHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '55%',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  liveHeaderText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#F87171',
    letterSpacing: 0.5,
  },
  liveQuarterText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FCA5A5',
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 4,
  },
  teamColumn: {
    alignItems: 'center',
    flex: 1,
  },
  teamLogoImg: {
    width: 52,
    height: 52,
    marginBottom: 8,
  },
  teamAbbr: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.3,
  },
  teamRecord: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  vsColumn: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  scoreNum: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#F8FAFC',
    fontVariant: ['tabular-nums'] as const,
  },
  scoreDash: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#64748B',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#F26522',
    marginBottom: 4,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#64748B',
    letterSpacing: 1.5,
  },
  seriesText: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 3,
    textAlign: 'center' as const,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  venueText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  resultCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  resultTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  resultTeamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTeamLogo: {
    width: 28,
    height: 28,
  },
  resultTeamName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  resultScore: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  resultDivider: {
    height: 1,
    marginVertical: 2,
  },
  highlightRow: {
    marginTop: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  highlightText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
});
