import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
  Dimensions,
  Linking,
} from 'react-native';
import {
  X,
  MapPin,
  Trophy,
  Users,
  BarChart3,
  Activity,
  Tv,
  Play,
  Clock,
  Zap,
  TrendingUp,
  ChevronDown,
  Radio,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { NBAGame, NBAPlayer, getTeamLogo, getTeamColor } from '@/constants/nbaData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ACCENT = '#F26522';
const ACCENT_BLUE = '#1D428A';
const SURFACE_DARK = '#0C0C1A';
const SURFACE_CARD = '#141428';
const SURFACE_ELEVATED = '#1C1C38';
const BORDER_SUBTLE = 'rgba(255,255,255,0.06)';
const TEXT_PRIMARY = '#F0F2F5';
const TEXT_SECONDARY = 'rgba(255,255,255,0.55)';
const TEXT_MUTED = 'rgba(255,255,255,0.3)';
const HOME_COLOR = '#F26522';
const AWAY_COLOR = '#5B8DEF';

type NBATabType = 'summary' | 'boxscore' | 'lineups' | 'plays';

interface NBAGameDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  game: NBAGame | null;
}

interface ESPNGameSummary {
  boxscore?: {
    teams?: {
      team: { abbreviation: string; displayName: string; logo: string };
      statistics: { name: string; displayValue: string; label: string }[];
    }[];
    players?: {
      team: { abbreviation: string; displayName: string };
      statistics: {
        names: string[];
        athletes: {
          athlete: { displayName: string; headshot?: { href: string }; jersey?: string; position?: { abbreviation: string } };
          stats: string[];
          starter: boolean;
        }[];
      }[];
    }[];
  };
  plays?: {
    text: string;
    period: { number: number };
    clock: { displayValue: string };
    team?: { id: string };
    scoreValue?: number;
    type?: { text: string };
    awayScore?: number;
    homeScore?: number;
  }[];
  leaders?: {
    team: { abbreviation: string };
    leaders: {
      name: string;
      displayName: string;
      leaders: {
        athlete: { displayName: string; headshot?: string; jersey?: string; position?: { abbreviation: string } };
        displayValue: string;
        value: number;
      }[];
    }[];
  }[];
  rosters?: any[];
  predictor?: {
    homeTeam?: { gameProjection?: number; teamChanceLoss?: number };
    awayTeam?: { gameProjection?: number; teamChanceLoss?: number };
  };
  header?: {
    competitions?: {
      status?: { type?: { description?: string; detail?: string } };
    }[];
  };
}

async function fetchNBAGameSummary(eventId: number): Promise<ESPNGameSummary | null> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`;
    console.log('[NBA Detail] Fetching summary:', url);
    const response = await fetch(url);
    if (!response.ok) {
      console.log('[NBA Detail] Response not ok:', response.status);
      return null;
    }
    const data = await response.json();
    console.log('[NBA Detail] Got summary data');
    return data;
  } catch (error) {
    console.error('[NBA Detail] Error:', error);
    return null;
  }
}

const AnimatedStatBar = ({ homeValue, awayValue, label, delay = 0 }: { homeValue: string; awayValue: string; label: string; delay?: number }) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const homeNum = parseFloat(homeValue) || 0;
  const awayNum = parseFloat(awayValue) || 0;
  const total = homeNum + awayNum;
  const homePercent = total > 0 ? (homeNum / total) * 100 : 50;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(animatedWidth, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [homePercent, delay, animatedWidth, fadeAnim]);

  return (
    <Animated.View style={[styles.statRow, { opacity: fadeAnim }]}>
      <Text style={[styles.statValue, homeNum > awayNum && styles.statWinner]}>{homeValue}</Text>
      <View style={styles.statCenter}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statBarTrack}>
          <Animated.View
            style={[styles.statBarHome, {
              width: animatedWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${homePercent}%`] }),
            }]}
          />
          <Animated.View
            style={[styles.statBarAway, {
              width: animatedWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${100 - homePercent}%`] }),
            }]}
          />
        </View>
      </View>
      <Text style={[styles.statValue, awayNum > homeNum && styles.statWinnerAway]}>{awayValue}</Text>
    </Animated.View>
  );
};

type LineupViewTab = 'home' | 'away';

const LineupsView = ({ summary, game }: { summary: ESPNGameSummary; game: NBAGame }) => {
  const [activeTab, setActiveTab] = useState<LineupViewTab>('home');

  const players = useMemo(() => {
    if (!summary.boxscore?.players) return { home: [], away: [] };
    const homeTeam = summary.boxscore.players.find(
      p => p.team.abbreviation === game.team1.abbreviation
    ) || summary.boxscore.players[0];
    const awayTeam = summary.boxscore.players.find(
      p => p.team.abbreviation === game.team2.abbreviation
    ) || summary.boxscore.players[1];

    const mapPlayers = (teamData: any) => {
      if (!teamData?.statistics?.[0]?.athletes) return [];
      return teamData.statistics[0].athletes.map((a: any) => ({
        name: a.athlete.displayName,
        jersey: a.athlete.jersey || '',
        position: a.athlete.position?.abbreviation || '',
        headshot: a.athlete.headshot?.href || '',
        starter: a.starter,
        stats: a.stats,
      }));
    };

    return {
      home: mapPlayers(homeTeam),
      away: mapPlayers(awayTeam),
    };
  }, [summary, game]);

  const statNames = useMemo(() => {
    if (!summary.boxscore?.players?.[0]?.statistics?.[0]?.names) return [];
    return summary.boxscore.players[0].statistics[0].names;
  }, [summary]);

  const currentPlayers = activeTab === 'home' ? players.home : players.away;
  const currentTeam = activeTab === 'home' ? game.team1 : game.team2;
  const accentColor = activeTab === 'home' ? HOME_COLOR : AWAY_COLOR;
  const team1Color = getTeamColor(game.team1.abbreviation);
  const team2Color = getTeamColor(game.team2.abbreviation);

  const starters = currentPlayers.filter((p: any) => p.starter);
  const bench = currentPlayers.filter((p: any) => !p.starter);

  const handleTabChange = useCallback(async (tab: LineupViewTab) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveTab(tab);
  }, []);

  return (
    <View>
      <View style={styles.lineupToggle}>
        <TouchableOpacity
          style={[styles.lineupToggleBtn, activeTab === 'home' && { backgroundColor: HOME_COLOR + '18' }]}
          onPress={() => handleTabChange('home')}
          activeOpacity={0.7}
        >
          <Image source={{ uri: game.team1.logo || getTeamLogo(game.team1.abbreviation) }} style={styles.lineupToggleLogo} resizeMode="contain" />
          <Text style={[styles.lineupToggleName, activeTab === 'home' && { color: HOME_COLOR }]} numberOfLines={1}>{game.team1.abbreviation}</Text>
          {activeTab === 'home' && <View style={[styles.lineupToggleIndicator, { backgroundColor: HOME_COLOR }]} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.lineupToggleBtn, activeTab === 'away' && { backgroundColor: AWAY_COLOR + '18' }]}
          onPress={() => handleTabChange('away')}
          activeOpacity={0.7}
        >
          <Image source={{ uri: game.team2.logo || getTeamLogo(game.team2.abbreviation) }} style={styles.lineupToggleLogo} resizeMode="contain" />
          <Text style={[styles.lineupToggleName, activeTab === 'away' && { color: AWAY_COLOR }]} numberOfLines={1}>{game.team2.abbreviation}</Text>
          {activeTab === 'away' && <View style={[styles.lineupToggleIndicator, { backgroundColor: AWAY_COLOR }]} />}
        </TouchableOpacity>
      </View>

      {starters.length > 0 && (
        <View style={styles.lineupSection}>
          <View style={styles.lineupSectionHeader}>
            <View style={[styles.lineupSectionIcon, { backgroundColor: accentColor + '18' }]}>
              <Users size={12} color={accentColor} />
            </View>
            <Text style={styles.lineupSectionTitle}>Starters</Text>
          </View>
          {starters.map((player: any, idx: number) => (
            <View key={idx} style={styles.lineupPlayerRow}>
              {player.headshot ? (
                <Image source={{ uri: player.headshot }} style={styles.lineupPlayerImg} resizeMode="cover" />
              ) : (
                <View style={[styles.lineupPlayerImgFallback, { backgroundColor: accentColor + '20' }]}>
                  <Text style={[styles.lineupPlayerInit, { color: accentColor }]}>{player.name.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.lineupPlayerInfo}>
                <Text style={styles.lineupPlayerName} numberOfLines={1}>{player.name}</Text>
                <Text style={styles.lineupPlayerMeta}>#{player.jersey} {player.position}</Text>
              </View>
              {player.stats && player.stats.length > 0 && (
                <View style={styles.lineupPlayerStats}>
                  <Text style={[styles.lineupPlayerPts, { color: accentColor }]}>{player.stats[statNames.indexOf('PTS')] || player.stats[player.stats.length - 1]} PTS</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {bench.length > 0 && (
        <View style={styles.lineupSection}>
          <View style={styles.lineupSectionHeader}>
            <View style={[styles.lineupSectionIcon, { backgroundColor: '#FFB80018' }]}>
              <Activity size={12} color="#FFB800" />
            </View>
            <Text style={styles.lineupSectionTitle}>Bench</Text>
          </View>
          {bench.map((player: any, idx: number) => (
            <View key={idx} style={styles.lineupPlayerRow}>
              {player.headshot ? (
                <Image source={{ uri: player.headshot }} style={styles.lineupPlayerImg} resizeMode="cover" />
              ) : (
                <View style={[styles.lineupPlayerImgFallback, { backgroundColor: TEXT_MUTED + '30' }]}>
                  <Text style={[styles.lineupPlayerInit, { color: TEXT_MUTED }]}>{player.name.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.lineupPlayerInfo}>
                <Text style={styles.lineupPlayerName} numberOfLines={1}>{player.name}</Text>
                <Text style={styles.lineupPlayerMeta}>#{player.jersey} {player.position}</Text>
              </View>
              {player.stats && player.stats.length > 0 && (
                <View style={styles.lineupPlayerStats}>
                  <Text style={styles.lineupPlayerPtsBench}>{player.stats[statNames.indexOf('PTS')] || player.stats[player.stats.length - 1]} PTS</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default function NBAGameDetailsModal({ visible, onClose, game }: NBAGameDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<NBATabType>('summary');
  const slideAnim = useRef(new Animated.Value(0)).current;

  const { data: summary, isLoading } = useQuery({
    queryKey: ['nba-game-detail', game?.id],
    queryFn: () => fetchNBAGameSummary(game!.id),
    enabled: visible && !!game?.id,
    staleTime: 30000,
  });

  useEffect(() => {
    if (visible) {
      setActiveTab('summary');
      Animated.spring(slideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible, slideAnim]);

  const handleTabPress = useCallback(async (tab: NBATabType) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveTab(tab);
  }, []);

  if (!game) return null;

  const isCompleted = game.status === 'completed';
  const isLive = game.status === 'live';
  const team1Logo = game.team1.logo || getTeamLogo(game.team1.abbreviation);
  const team2Logo = game.team2.logo || getTeamLogo(game.team2.abbreviation);
  const team1Color = getTeamColor(game.team1.abbreviation);
  const team2Color = getTeamColor(game.team2.abbreviation);

  const teamStats = useMemo(() => {
    if (!summary?.boxscore?.teams) return null;
    const home = summary.boxscore.teams.find(t => t.team.abbreviation === game.team1.abbreviation) || summary.boxscore.teams[0];
    const away = summary.boxscore.teams.find(t => t.team.abbreviation === game.team2.abbreviation) || summary.boxscore.teams[1];
    if (!home || !away) return null;

    const getStat = (team: any, name: string) => {
      const stat = team.statistics?.find((s: any) => s.name === name || s.label === name);
      return stat?.displayValue || '0';
    };

    return {
      home,
      away,
      getStat,
    };
  }, [summary, game]);

  const leaders = useMemo(() => {
    if (!summary?.leaders) return null;
    const homeLeaders = summary.leaders.find(l => l.team.abbreviation === game.team1.abbreviation) || summary.leaders[0];
    const awayLeaders = summary.leaders.find(l => l.team.abbreviation === game.team2.abbreviation) || summary.leaders[1];
    return { home: homeLeaders, away: awayLeaders };
  }, [summary, game]);

  const keyPlays = useMemo(() => {
    if (!summary?.plays) return [];
    return summary.plays
      .filter(p => p.scoreValue && p.scoreValue > 0)
      .slice(-20)
      .reverse();
  }, [summary]);

  const tabs: { id: NBATabType; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: 'Summary', icon: <Activity size={14} color={activeTab === 'summary' ? ACCENT : TEXT_MUTED} /> },
    { id: 'boxscore', label: 'Stats', icon: <BarChart3 size={14} color={activeTab === 'boxscore' ? ACCENT : TEXT_MUTED} /> },
    { id: 'lineups', label: 'Lineups', icon: <Users size={14} color={activeTab === 'lineups' ? ACCENT : TEXT_MUTED} /> },
    { id: 'plays', label: 'Plays', icon: <TrendingUp size={14} color={activeTab === 'plays' ? ACCENT : TEXT_MUTED} /> },
  ];

  const renderLeaderCard = (teamLeaders: any, teamName: string, teamLogo: string, teamColor: string) => {
    if (!teamLeaders?.leaders) return null;
    return (
      <View style={styles.leaderCard}>
        <View style={styles.leaderCardHeader}>
          <Image source={{ uri: teamLogo }} style={styles.leaderCardLogo} resizeMode="contain" />
          <Text style={styles.leaderCardTeam}>{teamName}</Text>
        </View>
        {teamLeaders.leaders.slice(0, 3).map((cat: any, idx: number) => {
          const leader = cat.leaders?.[0];
          if (!leader) return null;
          return (
            <View key={idx} style={styles.leaderRow}>
              {leader.athlete?.headshot ? (
                <Image source={{ uri: leader.athlete.headshot }} style={styles.leaderHeadshot} resizeMode="cover" />
              ) : (
                <View style={[styles.leaderHeadshotFallback, { backgroundColor: teamColor + '25' }]}>
                  <Text style={[styles.leaderInit, { color: teamColor }]}>{leader.athlete?.displayName?.charAt(0) || '?'}</Text>
                </View>
              )}
              <View style={styles.leaderInfo}>
                <Text style={styles.leaderName} numberOfLines={1}>{leader.athlete?.displayName || 'Unknown'}</Text>
                <Text style={styles.leaderCat}>{cat.displayName}</Text>
              </View>
              <View style={[styles.leaderStatBadge, { backgroundColor: teamColor + '18' }]}>
                <Text style={[styles.leaderStatText, { color: teamColor }]}>{leader.displayValue}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSummaryTab = () => {
    return (
      <View style={styles.tabContent}>
        {game.series && (
          <View style={styles.seriesCard}>
            <LinearGradient colors={[ACCENT_BLUE + '20', ACCENT_BLUE + '08']} style={styles.seriesGradient}>
              <Trophy size={16} color={ACCENT} />
              <View style={styles.seriesInfo}>
                <Text style={styles.seriesTitle}>{game.season}</Text>
                <Text style={styles.seriesDetail}>{game.series}</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {game.broadcast && (
          <View style={styles.broadcastCard}>
            <View style={styles.broadcastHeader}>
              <View style={styles.broadcastIconBg}>
                <Tv size={14} color="#10B981" />
              </View>
              <Text style={styles.broadcastTitle}>Where to Watch</Text>
            </View>
            <View style={styles.broadcastChannelRow}>
              <View style={styles.broadcastChip}>
                <Text style={styles.broadcastChipIcon}>📺</Text>
                <Text style={styles.broadcastChipText}>{game.broadcast}</Text>
              </View>
            </View>
          </View>
        )}

        {leaders && (
          <View style={styles.leadersSection}>
            <Text style={styles.sectionTitle}>Game Leaders</Text>
            {renderLeaderCard(leaders.home, game.team1.name, team1Logo, team1Color)}
            {renderLeaderCard(leaders.away, game.team2.name, team2Logo, team2Color)}
          </View>
        )}

        {(isCompleted) && (
          <View style={styles.highlightsCard}>
            <TouchableOpacity
              style={styles.highlightsBtn}
              activeOpacity={0.8}
              onPress={() => {
                const q = encodeURIComponent(`${game.team1.name} vs ${game.team2.name} highlights NBA`);
                const url = `https://www.youtube.com/results?search_query=${q}`;
                if (Platform.OS === 'web') {
                  window.open(url, '_blank');
                } else {
                  Linking.openURL(url);
                }
              }}
            >
              <LinearGradient colors={['#FF0000', '#CC0000']} style={styles.highlightsPlayBadge}>
                <Play size={10} color="#FFF" fill="#FFF" />
              </LinearGradient>
              <Text style={styles.highlightsBtnText}>Watch Highlights on YouTube</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.venueCard}>
          <MapPin size={14} color={ACCENT} />
          <View style={styles.venueInfo}>
            <Text style={styles.venueName}>{game.arena}</Text>
            <Text style={styles.venueCity}>{game.city}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderBoxscoreTab = () => {
    if (!teamStats) {
      return (
        <View style={styles.emptyState}>
          <BarChart3 size={32} color={TEXT_MUTED} />
          <Text style={styles.emptyTitle}>Stats not available</Text>
          <Text style={styles.emptySub}>Statistics will appear during/after the game</Text>
        </View>
      );
    }

    const statTypes = [
      { name: 'fieldGoalPct', label: 'Field Goal %' },
      { name: 'threePointFieldGoalPct', label: '3-Point %' },
      { name: 'freeThrowPct', label: 'Free Throw %' },
      { name: 'totalRebounds', label: 'Rebounds' },
      { name: 'assists', label: 'Assists' },
      { name: 'steals', label: 'Steals' },
      { name: 'blocks', label: 'Blocks' },
      { name: 'turnovers', label: 'Turnovers' },
      { name: 'fouls', label: 'Fouls' },
      { name: 'fastBreakPoints', label: 'Fast Break Pts' },
      { name: 'pointsInPaint', label: 'Points in Paint' },
      { name: 'largestLead', label: 'Largest Lead' },
    ];

    return (
      <View style={styles.tabContent}>
        <View style={styles.statsTeamRow}>
          <View style={styles.statsTeamCol}>
            <Image source={{ uri: team1Logo }} style={styles.statsTeamLogo} resizeMode="contain" />
            <Text style={styles.statsTeamName} numberOfLines={1}>{game.team1.abbreviation}</Text>
          </View>
          <Text style={styles.statsVsText}>VS</Text>
          <View style={styles.statsTeamCol}>
            <Image source={{ uri: team2Logo }} style={styles.statsTeamLogo} resizeMode="contain" />
            <Text style={styles.statsTeamName} numberOfLines={1}>{game.team2.abbreviation}</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          {statTypes.map((stat, index) => {
            const homeVal = teamStats.getStat(teamStats.home, stat.name);
            const awayVal = teamStats.getStat(teamStats.away, stat.name);
            if (homeVal === '0' && awayVal === '0') return null;
            return (
              <AnimatedStatBar
                key={stat.name}
                homeValue={homeVal}
                awayValue={awayVal}
                label={stat.label}
                delay={index * 60}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderLineupsTab = () => {
    if (!summary?.boxscore?.players || summary.boxscore.players.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Users size={32} color={TEXT_MUTED} />
          <Text style={styles.emptyTitle}>Lineups not available</Text>
          <Text style={styles.emptySub}>Lineups will be available closer to tip-off</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <LineupsView summary={summary} game={game} />
      </View>
    );
  };

  const renderPlaysTab = () => {
    if (keyPlays.length === 0) {
      return (
        <View style={styles.emptyState}>
          <TrendingUp size={32} color={TEXT_MUTED} />
          <Text style={styles.emptyTitle}>No plays yet</Text>
          <Text style={styles.emptySub}>Key plays will appear as the game progresses</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Scoring Plays</Text>
        {keyPlays.map((play, idx) => (
          <View key={idx} style={styles.playRow}>
            <View style={styles.playTime}>
              <Text style={styles.playQuarter}>Q{play.period?.number || '?'}</Text>
              <Text style={styles.playClock}>{play.clock?.displayValue || ''}</Text>
            </View>
            <View style={styles.playDot} />
            <View style={styles.playContent}>
              <Text style={styles.playText} numberOfLines={2}>{play.text}</Text>
              {play.homeScore != null && play.awayScore != null && (
                <View style={styles.playScoreRow}>
                  <Text style={styles.playScoreLabel}>{game.team1.abbreviation}</Text>
                  <Text style={styles.playScore}>{play.homeScore}</Text>
                  <Text style={styles.playScoreDash}>-</Text>
                  <Text style={styles.playScore}>{play.awayScore}</Text>
                  <Text style={styles.playScoreLabel}>{game.team2.abbreviation}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'summary': return renderSummaryTab();
      case 'boxscore': return renderBoxscoreTab();
      case 'lineups': return renderLineupsTab();
      case 'plays': return renderPlaysTab();
      default: return null;
    }
  };

  const gameDate = new Date(game.date);
  const formattedDate = gameDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = game.startTime || gameDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  const statusDetail = summary?.header?.competitions?.[0]?.status?.type?.detail || '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <LinearGradient
          colors={[SURFACE_DARK, '#0D0D22', '#0A0A1A']}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerDate}>{formattedDate}</Text>
            <View style={{ width: 36 }} />
          </View>

          {isLive && (
            <View style={styles.liveBanner}>
              <View style={styles.liveDotPulse} />
              <Text style={styles.liveText}>LIVE</Text>
              {game.quarter != null && (
                <Text style={styles.liveDetailText}>Q{game.quarter} {game.timeRemaining || ''}</Text>
              )}
            </View>
          )}

          <View style={styles.matchupSection}>
            <View style={styles.headerTeam}>
              <View style={[styles.headerTeamAvatar, { backgroundColor: team1Color + '25', borderColor: team1Color + '40' }]}>
                <Image source={{ uri: team1Logo }} style={styles.headerTeamLogo} resizeMode="contain" />
              </View>
              <Text style={styles.headerTeamName} numberOfLines={2}>{game.team1.name}</Text>
              {game.team1.record && <Text style={styles.headerTeamRecord}>{game.team1.record}</Text>}
            </View>

            <View style={styles.headerCenter}>
              {(isCompleted || isLive) && game.team1.score != null && game.team2.score != null ? (
                <View style={styles.scoreContainer}>
                  <Text style={[
                    styles.headerScore,
                    isCompleted && game.team1.winner && { color: '#10B981' },
                    isLive && { color: '#EF4444' },
                  ]}>{game.team1.score}</Text>
                  <Text style={styles.headerScoreDash}>-</Text>
                  <Text style={[
                    styles.headerScore,
                    isCompleted && game.team2.winner && { color: '#10B981' },
                    isLive && { color: '#EF4444' },
                  ]}>{game.team2.score}</Text>
                </View>
              ) : (
                <View style={styles.vsContainer}>
                  <Text style={styles.headerTime}>{formattedTime}</Text>
                  <Text style={styles.headerVs}>VS</Text>
                </View>
              )}
              {isCompleted && <Text style={styles.headerFinalLabel}>FINAL</Text>}
              {statusDetail && !isLive && !isCompleted && (
                <Text style={styles.headerStatusDetail}>{statusDetail}</Text>
              )}
            </View>

            <View style={styles.headerTeam}>
              <View style={[styles.headerTeamAvatar, { backgroundColor: team2Color + '25', borderColor: team2Color + '40' }]}>
                <Image source={{ uri: team2Logo }} style={styles.headerTeamLogo} resizeMode="contain" />
              </View>
              <Text style={styles.headerTeamName} numberOfLines={2}>{game.team2.name}</Text>
              {game.team2.record && <Text style={styles.headerTeamRecord}>{game.team2.record}</Text>}
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleTabPress(tab.id)}
                style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
                activeOpacity={0.7}
              >
                {tab.icon}
                <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={styles.loadingText}>Loading game details...</Text>
            </View>
          ) : (
            renderContent()
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE_DARK,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDate: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_SECONDARY,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  liveDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: '#EF4444',
    letterSpacing: 1,
  },
  liveDetailText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#EF4444',
  },
  matchupSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  headerTeam: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  headerTeamAvatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  headerTeamLogo: {
    width: 44,
    height: 44,
  },
  headerTeamName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    textAlign: 'center',
    lineHeight: 17,
  },
  headerTeamRecord: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: TEXT_SECONDARY,
  },
  headerCenter: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerScore: {
    fontSize: 30,
    fontWeight: '900' as const,
    color: TEXT_PRIMARY,
    letterSpacing: -1,
  },
  headerScoreDash: {
    fontSize: 20,
    fontWeight: '300' as const,
    color: TEXT_MUTED,
  },
  vsContainer: {
    alignItems: 'center',
  },
  headerTime: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: ACCENT,
    marginBottom: 2,
  },
  headerVs: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: TEXT_MUTED,
    letterSpacing: 1,
  },
  headerFinalLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#10B981',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  headerStatusDetail: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 4,
    paddingBottom: 12,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabItemActive: {
    backgroundColor: ACCENT + '18',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_MUTED,
  },
  tabLabelActive: {
    color: ACCENT,
    fontWeight: '700' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  tabContent: {
    padding: 16,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: TEXT_SECONDARY,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  emptySub: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  seriesCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  seriesGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ACCENT_BLUE + '20',
  },
  seriesInfo: {
    flex: 1,
  },
  seriesTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  seriesDetail: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: ACCENT,
  },
  broadcastCard: {
    backgroundColor: SURFACE_CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  broadcastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  broadcastIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(16,185,129,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  broadcastTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  broadcastChannelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  broadcastChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SURFACE_ELEVATED,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  broadcastChipIcon: {
    fontSize: 14,
  },
  broadcastChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
  },
  leadersSection: {
    marginBottom: 12,
  },
  leaderCard: {
    backgroundColor: SURFACE_CARD,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  leaderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  leaderCardLogo: {
    width: 22,
    height: 22,
  },
  leaderCardTeam: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  leaderHeadshot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  leaderHeadshotFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderInit: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
  },
  leaderCat: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: TEXT_SECONDARY,
  },
  leaderStatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  leaderStatText: {
    fontSize: 13,
    fontWeight: '800' as const,
  },
  highlightsCard: {
    marginBottom: 12,
  },
  highlightsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SURFACE_CARD,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  highlightsPlayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightsBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
  },
  venueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE_CARD,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  venueCity: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  statsTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTeamCol: {
    alignItems: 'center',
    gap: 4,
  },
  statsTeamLogo: {
    width: 32,
    height: 32,
  },
  statsTeamName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  statsVsText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: TEXT_MUTED,
    letterSpacing: 1,
  },
  statsCard: {
    backgroundColor: SURFACE_CARD,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: TEXT_SECONDARY,
    width: 48,
    textAlign: 'center',
  },
  statWinner: {
    color: HOME_COLOR,
  },
  statWinnerAway: {
    color: AWAY_COLOR,
  },
  statCenter: {
    flex: 1,
    marginHorizontal: 10,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 6,
  },
  statBarTrack: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: SURFACE_ELEVATED,
  },
  statBarHome: {
    height: 4,
    backgroundColor: HOME_COLOR,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  statBarAway: {
    height: 4,
    backgroundColor: AWAY_COLOR,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  lineupToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: SURFACE_ELEVATED,
    overflow: 'hidden',
    marginBottom: 16,
  },
  lineupToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    position: 'relative' as const,
  },
  lineupToggleLogo: {
    width: 20,
    height: 20,
  },
  lineupToggleName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: TEXT_SECONDARY,
  },
  lineupToggleIndicator: {
    position: 'absolute' as const,
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  lineupSection: {
    marginBottom: 16,
  },
  lineupSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  lineupSectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineupSectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
  },
  lineupPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: SURFACE_CARD,
    borderRadius: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  lineupPlayerImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  lineupPlayerImgFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineupPlayerInit: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  lineupPlayerInfo: {
    flex: 1,
  },
  lineupPlayerName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_PRIMARY,
  },
  lineupPlayerMeta: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: TEXT_SECONDARY,
  },
  lineupPlayerStats: {
    alignItems: 'flex-end',
  },
  lineupPlayerPts: {
    fontSize: 13,
    fontWeight: '800' as const,
  },
  lineupPlayerPtsBench: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: TEXT_SECONDARY,
  },
  playRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  playTime: {
    width: 44,
    alignItems: 'center',
  },
  playQuarter: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: ACCENT,
    letterSpacing: 0.5,
  },
  playClock: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: TEXT_MUTED,
  },
  playDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT + '40',
    marginTop: 4,
  },
  playContent: {
    flex: 1,
    backgroundColor: SURFACE_CARD,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  playText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: TEXT_PRIMARY,
    lineHeight: 18,
  },
  playScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  playScoreLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: TEXT_MUTED,
  },
  playScore: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: ACCENT,
  },
  playScoreDash: {
    fontSize: 12,
    fontWeight: '300' as const,
    color: TEXT_MUTED,
  },
});
