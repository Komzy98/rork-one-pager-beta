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
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
import { ChevronRight, Calendar, MapPin, Tv } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  NBAGame,
  getUpcomingGames,
  getCompletedGames,
  getTeamLogo,
  getTeamColor,
} from '@/constants/nbaData';
import { NBAFavoriteTeam } from '@/types/habit';
import NBAGameDetailsModal from './NBAGameDetailsModal';

interface NBAUpcomingSectionProps {
  favoriteNBATeams: NBAFavoriteTeam[];
}

export default function NBAUpcomingSection({ favoriteNBATeams }: NBAUpcomingSectionProps) {
  const [selectedGame, setSelectedGame] = useState<NBAGame | null>(null);
  const [showGameModal, setShowGameModal] = useState<boolean>(false);

  const handleGamePress = useCallback((game: NBAGame) => {
    setSelectedGame(game);
    setShowGameModal(true);
  }, []);

  const favoriteAbbreviations = useMemo(() => {
    return new Set(favoriteNBATeams.map(t => t.abbreviation));
  }, [favoriteNBATeams]);

  const upcomingGames = useMemo(() => {
    const all = getUpcomingGames();
    if (favoriteAbbreviations.size === 0) return all.slice(0, 4);
    return all.filter(game =>
      favoriteAbbreviations.has(game.team1.abbreviation) ||
      favoriteAbbreviations.has(game.team2.abbreviation)
    ).slice(0, 6);
  }, [favoriteAbbreviations]);

  const recentResults = useMemo(() => {
    const all = getCompletedGames();
    if (favoriteAbbreviations.size === 0) return all.slice(0, 3);
    return all.filter(game =>
      favoriteAbbreviations.has(game.team1.abbreviation) ||
      favoriteAbbreviations.has(game.team2.abbreviation)
    ).slice(0, 3);
  }, [favoriteAbbreviations]);

  if (upcomingGames.length === 0 && recentResults.length === 0) return null;

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

  const isFavorite = (abbr: string): boolean => favoriteAbbreviations.has(abbr);

  const renderUpcomingGame = (game: NBAGame, index: number) => {
    const team1Color = getTeamColor(game.team1.abbreviation);
    const team2Color = getTeamColor(game.team2.abbreviation);
    const team1Fav = isFavorite(game.team1.abbreviation);
    const team2Fav = isFavorite(game.team2.abbreviation);

    return (
      <TouchableOpacity
        key={game.id}
        activeOpacity={0.85}
        onPress={() => handleGamePress(game)}
        style={[styles.gameCard, index === 0 && { marginLeft: 0 }]}
      >
        <LinearGradient
          colors={['#1A1A2E', '#16213E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gameCardGradient}
        >
          <View style={styles.gameHeader}>
            <View style={styles.dateBadge}>
              <Calendar size={10} color="#F26522" />
              <Text style={styles.dateText}>{formatGameDate(game.date)}</Text>
            </View>
            {!!game.broadcast && (
              <View style={styles.broadcastBadge}>
                <Tv size={9} color="#94A3B8" />
                <Text style={styles.broadcastText}>{game.broadcast}</Text>
              </View>
            )}
          </View>

          <View style={styles.matchupRow}>
            <View style={styles.teamColumn}>
                <Image source={{ uri: getTeamLogo(game.team1.abbreviation) }} style={styles.teamLogoImg} resizeMode="contain" />
              <Text style={[styles.teamAbbr, team1Fav && { color: '#fff', fontWeight: '800' as const }]}>{game.team1.abbreviation}</Text>
              {!!game.team1.record && <Text style={styles.teamRecord}>{game.team1.record}</Text>}
            </View>

            <View style={styles.vsColumn}>
              <Text style={styles.timeText}>{formatGameTime(game.date)}</Text>
              <Text style={styles.vsText}>VS</Text>
              {!!game.series && <Text style={styles.seriesText}>{game.series}</Text>}
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
      <TouchableOpacity key={game.id} activeOpacity={0.85} onPress={() => handleGamePress(game)} style={styles.resultCard}>
        <View style={styles.resultTeamRow}>
          <View style={styles.resultTeamInfo}>
            <Image source={{ uri: getTeamLogo(game.team1.abbreviation) }} style={styles.resultTeamLogo} resizeMode="contain" />
            <Text style={[styles.resultTeamName, team1Won && styles.resultTeamWinner]}>{game.team1.abbreviation}</Text>
          </View>
          <Text style={[styles.resultScore, team1Won && styles.resultScoreWinner]}>{game.team1.score}</Text>
        </View>
        <View style={styles.resultDivider} />
        <View style={styles.resultTeamRow}>
          <View style={styles.resultTeamInfo}>
            <Image source={{ uri: getTeamLogo(game.team2.abbreviation) }} style={styles.resultTeamLogo} resizeMode="contain" />
            <Text style={[styles.resultTeamName, team2Won && styles.resultTeamWinner]}>{game.team2.abbreviation}</Text>
          </View>
          <Text style={[styles.resultScore, team2Won && styles.resultScoreWinner]}>{game.team2.score}</Text>
        </View>
        {!!game.highlights && (
          <View style={styles.highlightRow}>
            <Text style={styles.highlightText} numberOfLines={1}>{game.highlights}</Text>
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
          <Text style={styles.headerTitle}>NBA</Text>
          {upcomingGames.length > 0 && (
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{upcomingGames.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => router.push('/sports' as any)}
          style={styles.seeAllBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.seeAllText}>See All</Text>
          <ChevronRight size={14} color="#F26522" />
        </TouchableOpacity>
      </View>

      {favoriteNBATeams.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamsRow} contentContainerStyle={styles.teamsRowContent}>
          {favoriteNBATeams.map((team) => (
            <View key={team.id} style={styles.favTeamChip}>
              {team.logo && <Image source={{ uri: team.logo }} style={styles.favTeamLogo} resizeMode="contain" />}
              <Text style={styles.favTeamName}>{team.abbreviation}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {upcomingGames.length > 0 && (
        <>
          <Text style={styles.subSectionTitle}>Upcoming Games</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gamesScroll}
          >
            {upcomingGames.map((game, idx) => renderUpcomingGame(game, idx))}
          </ScrollView>
        </>
      )}

      {recentResults.length > 0 && (
        <>
          <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>Recent Results</Text>
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
    color: '#0F172A',
    letterSpacing: -0.4,
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
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  favTeamLogo: {
    width: 18,
    height: 18,
  },
  favTeamName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#334155',
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#94A3B8',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
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
    color: '#64748B',
  },
  resultTeamWinner: {
    color: '#0F172A',
    fontWeight: '700' as const,
  },
  resultScore: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#94A3B8',
  },
  resultScoreWinner: {
    color: '#0F172A',
    fontWeight: '800' as const,
  },
  resultDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  highlightRow: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  highlightText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#64748B',
  },
});
