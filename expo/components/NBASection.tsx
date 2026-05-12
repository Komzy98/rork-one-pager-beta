import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  FlatList,
  Image,
  ActivityIndicator,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import {
  Calendar,
  Trophy,
  MapPin,
  Clock,
  CheckCircle2,
  BarChart3,
  Tv,
  Zap,
  Radio,
  AlertCircle,
  Users,
  ChevronDown,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  NBAGame,
  NBATeamStanding,
  NBAPlayer,
  getTeamColor,
  getTeamLogo,
  NBA_EASTERN_STANDINGS,
  NBA_WESTERN_STANDINGS,
} from '@/constants/nbaData';
import {
  HERO_SECONDARY_GAP_BELOW_SPORT_STRIP,
  HERO_SPORT_STRIP_OVERLAP_HERO_PX,
  getSportsHeroEdgePad,
  getSportsHeroImageScale,
} from '@/constants/sportsHeroLayout';
import { fetchNBAGamesMultipleDays, fetchNBAStandings } from '@/utils/nbaApi';
import NBAGameDetailsModal from './NBAGameDetailsModal';
import NBAPremiumHeroInner from './NBAPremiumHeroInner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Aligns with `nbaHeroRoot.minHeight` — bottom crop uses 3% for consistent clip vs Football/F1 tall heroes. */
const NBA_HERO_MIN_HEIGHT_PX = 470;
const NBA_HERO_BOTTOM_CROP_PX = Math.round(NBA_HERO_MIN_HEIGHT_PX * 0.03);

/** NBA Center hero art (baked title + tagline); keep overlays minimal. */
const NBA_HERO_BACKGROUND = require('../assets/images/nba-hero-premium.png');

interface NBASectionProps {
  isDark: boolean;
  insets: { top: number; bottom: number };
  /** Sport switcher from Sports tab (Football / UFC / …), same pattern as football stadium hero. */
  sportToggleSlot?: React.ReactNode;
}

const NBA_ORANGE = '#F26522';
const NBA_BLUE = '#1D428A';
const NBA_ORANGE_LIGHT = 'rgba(242, 101, 34, 0.12)';
const NBA_BLUE_LIGHT = 'rgba(29, 66, 138, 0.12)';

type NBATab = 'upcoming' | 'results' | 'standings';

const InlinePlayerRow = React.memo(({ player, isDark, teamColor }: { player: NBAPlayer; isDark: boolean; teamColor: string }) => (
  <View style={s.lineupPlayerRow}>
    {player.image ? (
      <View style={[s.lineupPlayerImgWrap, { borderColor: teamColor + '40' }]}>
        <Image source={{ uri: player.image }} style={s.lineupPlayerImg} resizeMode="cover" />
      </View>
    ) : (
      <View style={[s.lineupPlayerImgWrap, { borderColor: teamColor + '40', backgroundColor: teamColor + '15' }]}>
        <Text style={[s.lineupPlayerInitial, { color: teamColor }]}>{player.name.charAt(0)}</Text>
      </View>
    )}
    <View style={s.lineupPlayerInfo}>
      <Text style={[s.lineupPlayerName, { color: isDark ? '#E4E4ED' : '#1C1C1E' }]} numberOfLines={1}>{player.name}</Text>
      <Text style={[s.lineupPlayerPos, { color: isDark ? '#5A5A7A' : '#AEAEB2' }]}>{player.position}{player.jersey ? ` #${player.jersey}` : ''}</Text>
    </View>
  </View>
));

const LineupsSection = React.memo(({ game, isDark }: { game: NBAGame; isDark: boolean }) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleExpanded = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const toVal = expanded ? 0 : 1;
    Animated.spring(rotateAnim, { toValue: toVal, tension: 100, friction: 12, useNativeDriver: true }).start();
    setExpanded(!expanded);
  }, [expanded, rotateAnim]);

  if (!game.lineups || (game.lineups.home.length === 0 && game.lineups.away.length === 0)) return null;

  const team1Color = getTeamColor(game.team1.abbreviation);
  const team2Color = getTeamColor(game.team2.abbreviation);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={[s.lineupsContainer, { borderTopColor: isDark ? '#1A1A32' : '#F0F0F5' }]}>
      <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.7} style={s.lineupsToggle}>
        <View style={s.lineupsToggleLeft}>
          <Users size={12} color={isDark ? '#5B8DEF' : NBA_BLUE} />
          <Text style={[s.lineupsToggleText, { color: isDark ? '#5B8DEF' : NBA_BLUE }]}>Starting Lineups</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={14} color={isDark ? '#5B8DEF' : NBA_BLUE} />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={s.lineupsContent}>
          {game.lineups.home.length > 0 && (
            <View style={s.lineupTeamBlock}>
              <View style={s.lineupTeamHeader}>
                <Image source={{ uri: getTeamLogo(game.team1.abbreviation) }} style={s.lineupTeamLogo} resizeMode="contain" />
                <Text style={[s.lineupTeamName, { color: isDark ? '#F0F0FA' : '#1C1C1E' }]}>{game.team1.abbreviation}</Text>
              </View>
              {game.lineups.home.map((player) => (
                <InlinePlayerRow key={player.id} player={player} isDark={isDark} teamColor={team1Color} />
              ))}
            </View>
          )}
          {game.lineups.away.length > 0 && (
            <View style={[s.lineupTeamBlock, { marginTop: 10 }]}>
              <View style={s.lineupTeamHeader}>
                <Image source={{ uri: getTeamLogo(game.team2.abbreviation) }} style={s.lineupTeamLogo} resizeMode="contain" />
                <Text style={[s.lineupTeamName, { color: isDark ? '#F0F0FA' : '#1C1C1E' }]}>{game.team2.abbreviation}</Text>
              </View>
              {game.lineups.away.map((player) => (
                <InlinePlayerRow key={player.id} player={player} isDark={isDark} teamColor={team2Color} />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const LiveGameBadge = React.memo(({ quarter, timeRemaining, isDark: _isDark }: { quarter?: number; timeRemaining?: string; isDark: boolean }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={s.liveGameBadge}>
      <Animated.View style={[s.liveGameDot, { opacity: pulseAnim }]} />
      <Text style={s.liveGameText}>LIVE</Text>
      {quarter != null && (
        <Text style={s.liveGameDetail}>Q{quarter}{timeRemaining ? ` ${timeRemaining}` : ''}</Text>
      )}
    </View>
  );
});

const GameCard = React.memo(({ game, isDark, onPress }: { game: NBAGame; isDark: boolean; onPress?: (game: NBAGame) => void }) => {
  const isCompleted = game.status === 'completed';
  const isLive = game.status === 'live';
  const isUpcoming = game.status === 'upcoming';
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const getGameTime = () => {
    const d = new Date(game.date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const gameDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (gameDay.getTime() === today.getTime()) return 'Today';
    if (gameDay.getTime() === tomorrow.getTime()) return 'Tomorrow';
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const getStartTime = () => {
    if (game.startTime) return game.startTime;
    const d = new Date(game.date);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(game);
  }, [game, onPress]);

  return (
    <Animated.View style={[s.gameCardWrap, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
      <View style={[
        s.gameCard,
        { backgroundColor: isDark ? '#111125' : '#FFFFFF' },
        isDark && { borderColor: 'rgba(29,66,138,0.08)' },
        isLive && { borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)' },
      ]}>
        {isLive && <View style={s.liveAccentBar} />}

        <View style={s.gameHeader}>
          <View style={s.gameHeaderLeft}>
            {!!game.series && (
              <View style={[s.seriesBadge, { backgroundColor: isDark ? NBA_BLUE_LIGHT : 'rgba(29,66,138,0.06)' }]}>
                <Text style={[s.seriesBadgeText, { color: isDark ? '#5B8DEF' : NBA_BLUE }]}>{game.series}</Text>
              </View>
            )}
            {!!game.broadcast && (
              <View style={[s.broadcastBadge, { backgroundColor: isDark ? 'rgba(242,101,34,0.08)' : 'rgba(242,101,34,0.06)' }]}>
                <Tv size={9} color={NBA_ORANGE} />
                <Text style={[s.broadcastText, { color: NBA_ORANGE }]}>{game.broadcast}</Text>
              </View>
            )}
          </View>
          {isLive ? (
            <LiveGameBadge quarter={game.quarter} timeRemaining={game.timeRemaining} isDark={isDark} />
          ) : isCompleted ? (
            <View style={[s.statusBadge, { backgroundColor: isDark ? '#0D2818' : '#ECFDF5' }]}>
              <CheckCircle2 size={11} color="#10B981" />
              <Text style={[s.statusText, { color: '#10B981' }]}>Final</Text>
            </View>
          ) : (
            <View style={[s.statusBadge, { backgroundColor: isDark ? 'rgba(29,66,138,0.08)' : 'rgba(29,66,138,0.05)' }]}>
              <Clock size={11} color={isDark ? '#5B8DEF' : NBA_BLUE} />
              <Text style={[s.statusText, { color: isDark ? '#5B8DEF' : NBA_BLUE }]}>{getGameTime()}</Text>
            </View>
          )}
        </View>

        {isUpcoming && (
          <View style={[s.startTimeRow, { backgroundColor: isDark ? 'rgba(29,66,138,0.06)' : 'rgba(29,66,138,0.04)' }]}>
            <Clock size={12} color={isDark ? NBA_ORANGE : '#E85D10'} />
            <Text style={[s.startTimeText, { color: isDark ? NBA_ORANGE : '#E85D10' }]}>Tip-Off: {getStartTime()}</Text>
          </View>
        )}

        <View style={s.teamsRow}>
          <View style={s.teamSide}>
            <View style={[
              isCompleted && !game.team1.winner && game.team2.winner && { opacity: 0.5 },
            ]}>
                <Image
                  source={{ uri: getTeamLogo(game.team1.abbreviation) }}
                  style={s.teamLogoSmall}
                  resizeMode="contain"
                />
            </View>
            <Text style={[
              s.teamName,
              { color: isDark ? '#F0F0FA' : '#1C1C1E' },
              isCompleted && game.team1.winner && { color: '#10B981' },
            ]} numberOfLines={2}>{game.team1.name}</Text>
            {!!game.team1.record && (
              <Text style={[s.teamRecord, { color: isDark ? '#5A5A7A' : '#AEAEB2' }]}>{game.team1.record}</Text>
            )}
            {isCompleted && game.team1.winner && (
              <LinearGradient colors={['#10B981', '#059669']} style={s.winBadge}>
                <Text style={s.winBadgeText}>WIN</Text>
              </LinearGradient>
            )}
          </View>

          <View style={s.vsCenter}>
            <View style={[s.vsLine, { backgroundColor: isDark ? 'rgba(29,66,138,0.15)' : 'rgba(29,66,138,0.1)' }]} />
            {(isCompleted || isLive) && game.team1.score != null && game.team2.score != null ? (
              <View style={[s.scoreBox, {
                backgroundColor: isLive
                  ? (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)')
                  : (isDark ? 'rgba(29,66,138,0.08)' : 'rgba(29,66,138,0.05)'),
              }]}>
                <Text style={[
                  s.scoreNum,
                  { color: isDark ? '#F0F0FA' : '#1C1C1E' },
                  isCompleted && game.team1.winner && { color: '#10B981' },
                  isLive && { color: '#EF4444' },
                ]}>{game.team1.score}</Text>
                <Text style={[s.scoreDash, { color: isDark ? '#3A3A5A' : '#BEBEC4' }]}>-</Text>
                <Text style={[
                  s.scoreNum,
                  { color: isDark ? '#F0F0FA' : '#1C1C1E' },
                  isCompleted && game.team2.winner && { color: '#10B981' },
                  isLive && { color: '#EF4444' },
                ]}>{game.team2.score}</Text>
              </View>
            ) : (
              <LinearGradient
                colors={isDark ? [NBA_BLUE + '25', NBA_BLUE + '12'] : [NBA_BLUE + '15', NBA_BLUE + '08']}
                style={s.vsCircle}
              >
                <Text style={[s.vsText, { color: isDark ? '#5B8DEF' : NBA_BLUE }]}>VS</Text>
              </LinearGradient>
            )}
            <View style={[s.vsLine, { backgroundColor: isDark ? 'rgba(29,66,138,0.15)' : 'rgba(29,66,138,0.1)' }]} />
          </View>

          <View style={s.teamSide}>
            <View style={[
              isCompleted && !game.team2.winner && game.team1.winner && { opacity: 0.5 },
            ]}>
                <Image
                  source={{ uri: getTeamLogo(game.team2.abbreviation) }}
                  style={s.teamLogoSmall}
                  resizeMode="contain"
                />
            </View>
            <Text style={[
              s.teamName,
              { color: isDark ? '#F0F0FA' : '#1C1C1E' },
              isCompleted && game.team2.winner && { color: '#10B981' },
            ]} numberOfLines={2}>{game.team2.name}</Text>
            {!!game.team2.record && (
              <Text style={[s.teamRecord, { color: isDark ? '#5A5A7A' : '#AEAEB2' }]}>{game.team2.record}</Text>
            )}
            {isCompleted && game.team2.winner && (
              <LinearGradient colors={['#10B981', '#059669']} style={s.winBadge}>
                <Text style={s.winBadgeText}>WIN</Text>
              </LinearGradient>
            )}
          </View>
        </View>

        {isCompleted && !!game.highlights && (
          <View style={[s.highlightsRow, { borderTopColor: isDark ? '#1A1A32' : '#F0F0F5' }]}>
            {game.highlightPlayer?.image ? (
              <View style={s.playerImageWrap}>
                <Image
                  source={{ uri: game.highlightPlayer.image }}
                  style={s.playerHeadshot}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <Zap size={11} color={NBA_ORANGE} />
            )}
            <View style={s.highlightsTextWrap}>
              <View style={s.highlightsLabelRow}>
                <Zap size={9} color={NBA_ORANGE} />
                <Text style={[s.highlightsLabel, { color: NBA_ORANGE }]}>TOP PERFORMER</Text>
              </View>
              <Text style={[s.highlightsText, { color: isDark ? '#8B8BA7' : '#6B7A99' }]}>{game.highlights}</Text>
            </View>
          </View>
        )}

        {(isLive || isUpcoming) && game.lineups && (
          <LineupsSection game={game} isDark={isDark} />
        )}

        <View style={[s.gameFooter, { borderTopColor: isDark ? '#1A1A32' : '#F0F0F5' }]}>
          <View style={s.gameFooterLeft}>
            <MapPin size={10} color={isDark ? '#52526E' : '#AEAEB2'} />
            <Text style={[s.gameFooterText, { color: isDark ? '#52526E' : '#AEAEB2' }]} numberOfLines={1}>
              {game.arena}, {game.city}
            </Text>
          </View>
          <Text style={[s.gameFooterSeason, { color: isDark ? '#3A3A5A' : '#C0C0CC' }]} numberOfLines={1}>
            {game.season}
          </Text>
        </View>
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const StandingRow = React.memo(({ team, rank, isDark }: { team: NBATeamStanding; rank: number; isDark: boolean }) => {
  const teamColor = getTeamColor(team.abbreviation);
  return (
    <View style={[s.standingRow, { backgroundColor: isDark ? '#111125' : '#FFFFFF' }]}>
      <View style={s.standingLeft}>
        <View style={[s.standingRank, { backgroundColor: rank <= 3 ? (isDark ? NBA_ORANGE_LIGHT : 'rgba(242,101,34,0.06)') : (isDark ? '#1A1A32' : '#F5F5FA') }]}>
          <Text style={[s.standingRankText, { color: rank <= 3 ? NBA_ORANGE : (isDark ? '#6B6B85' : '#8E8E93') }]}>{rank}</Text>
        </View>
        <View style={[s.standingTeamBadge, { backgroundColor: teamColor + '20' }]}>
          <Image
            source={{ uri: getTeamLogo(team.abbreviation) }}
            style={s.standingTeamLogo}
            resizeMode="contain"
          />
        </View>
        <View style={s.standingTeamInfo}>
          <Text style={[s.standingTeamName, { color: isDark ? '#F0F0FA' : '#1C1C1E' }]} numberOfLines={1}>{team.name}</Text>
          <Text style={[s.standingRecord, { color: isDark ? '#5A5A7A' : '#AEAEB2' }]}>{team.wins}-{team.losses}</Text>
        </View>
      </View>
      <View style={s.standingRight}>
        <Text style={[s.standingPct, { color: isDark ? '#E4E4ED' : '#1C1C1E' }]}>{team.pct}</Text>
        <View style={[
          s.streakBadge,
          { backgroundColor: team.streak.startsWith('W') ? (isDark ? '#0D2818' : '#ECFDF5') : (isDark ? '#2D1018' : '#FEF2F2') },
        ]}>
          <Text style={[
            s.streakText,
            { color: team.streak.startsWith('W') ? '#10B981' : '#EF4444' },
          ]}>{team.streak}</Text>
        </View>
      </View>
    </View>
  );
});

const ConferenceStandings = React.memo(({ conference, teams, isDark }: { conference: string; teams: NBATeamStanding[]; isDark: boolean }) => (
  <View style={s.conferenceBlock}>
    <View style={[s.conferenceHeader, { backgroundColor: isDark ? 'rgba(29,66,138,0.06)' : 'rgba(29,66,138,0.04)' }]}>
      <View style={[s.conferenceDot, { backgroundColor: conference === 'Eastern' ? '#C9082A' : '#1D428A' }]} />
      <Text style={[s.conferenceTitle, { color: isDark ? '#E4E4ED' : '#1C1C1E' }]}>{conference} Conference</Text>
    </View>
    {teams.map((team, idx) => (
      <StandingRow key={team.id} team={team} rank={idx + 1} isDark={isDark} />
    ))}
  </View>
));

const TabPill = React.memo(({ activeTab, onTabChange, isDark, counts }: {
  activeTab: NBATab;
  onTabChange: (tab: NBATab) => void;
  isDark: boolean;
  counts: Record<string, number>;
}) => {
  const tabs: { key: NBATab; label: string; icon: any; color: string }[] = [
    { key: 'upcoming', label: 'Upcoming', icon: Calendar, color: NBA_BLUE },
    { key: 'results', label: 'Results', icon: Trophy, color: '#10B981' },
    { key: 'standings', label: 'Standings', icon: BarChart3, color: NBA_ORANGE },
  ];

  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState<number>(SCREEN_WIDTH - 40);
  const activeIndex = tabs.findIndex(t => t.key === activeTab);
  const tabWidth = (containerWidth - 8) / tabs.length;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: activeIndex * tabWidth + 4,
      tension: 90,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, indicatorAnim, tabWidth]);

  const handlePress = useCallback(async (tab: NBATab) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onTabChange(tab);
  }, [onTabChange]);

  const activeColor = tabs[activeIndex]?.color || NBA_BLUE;

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={[s.pillContainer, {
        backgroundColor: isDark ? '#111122' : '#EAEAF0',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      }]}
    >
      <Animated.View style={[s.pillIndicator, { width: tabWidth - 8, transform: [{ translateX: indicatorAnim }] }]}>
        <LinearGradient
          colors={isDark ? [activeColor + '25', activeColor + '12'] : [activeColor + '18', activeColor + '08']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[s.pillIndicatorInner, {
            borderColor: activeColor + (isDark ? '30' : '25'),
            shadowColor: activeColor,
            shadowOpacity: isDark ? 0.3 : 0.15,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }]}
        />
      </Animated.View>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        const count = counts[tab.key] || 0;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => handlePress(tab.key)}
            activeOpacity={0.6}
            style={s.pillTab}
          >
            <View style={[s.pillTabIconWrap, isActive && { backgroundColor: tab.color + '20' }]}>
              <Icon size={14} color={isActive ? tab.color : (isDark ? '#555570' : '#9999A8')} strokeWidth={isActive ? 2.8 : 2} />
            </View>
            <Text style={[
              s.pillLabel,
              { color: isActive ? (isDark ? '#F0F0FA' : '#1A1A24') : (isDark ? '#555570' : '#9999A8') },
              isActive && { fontWeight: '700' as const, letterSpacing: -0.2 },
            ]}>
              {tab.label}
            </Text>
            {count > 0 && (
              <View style={[s.pillBadge, isActive ? { backgroundColor: tab.color } : { backgroundColor: isDark ? '#252540' : '#D8D8E0' }]}>
                <Text style={[s.pillBadgeText, { color: isActive ? '#FFFFFF' : (isDark ? '#6B6B85' : '#8E8E93') }]}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

export default function NBASection({ isDark, insets, sportToggleSlot }: NBASectionProps) {
  const { width: windowWidth } = useWindowDimensions();
  const safeInsets = useSafeAreaInsets();
  const heroEdgePad = useMemo(
    () => getSportsHeroEdgePad(windowWidth, safeInsets.left, safeInsets.right),
    [windowWidth, safeInsets.left, safeInsets.right],
  );
  const heroArtScale = useMemo(() => getSportsHeroImageScale(windowWidth), [windowWidth]);

  const [activeTab, setActiveTab] = useState<NBATab>('upcoming');
  const [selectedGame, setSelectedGame] = useState<NBAGame | null>(null);
  const [showGameModal, setShowGameModal] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const handleGamePress = useCallback((game: NBAGame) => {
    setSelectedGame(game);
    setShowGameModal(true);
  }, []);

  const gamesQuery = useQuery({
    queryKey: ['nba-games'],
    queryFn: () => fetchNBAGamesMultipleDays(5, 7),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const standingsQuery = useQuery({
    queryKey: ['nba-standings'],
    queryFn: fetchNBAStandings,
    staleTime: 5 * 60 * 1000,
  });

  const liveGames = useMemo(() => gamesQuery.data?.live ?? [], [gamesQuery.data?.live]);
  const upcomingGames = useMemo(() => gamesQuery.data?.upcoming ?? [], [gamesQuery.data?.upcoming]);
  const completedGames = useMemo(() => gamesQuery.data?.completed ?? [], [gamesQuery.data?.completed]);

  const nextGame = useMemo(() => {
    if (liveGames.length > 0) return liveGames[0];
    return upcomingGames.length > 0 ? upcomingGames[0] : null;
  }, [liveGames, upcomingGames]);

  const heroTeamAbbreviations = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const take = (g: (typeof liveGames)[number]) => {
      if (!seen.has(g.team1.abbreviation)) {
        seen.add(g.team1.abbreviation);
        out.push(g.team1.abbreviation);
      }
      if (!seen.has(g.team2.abbreviation)) {
        seen.add(g.team2.abbreviation);
        out.push(g.team2.abbreviation);
      }
    };
    [...liveGames, ...upcomingGames].slice(0, 8).forEach(take);
    return out;
  }, [liveGames, upcomingGames]);

  const easternStandings = useMemo(() => standingsQuery.data?.eastern ?? NBA_EASTERN_STANDINGS, [standingsQuery.data?.eastern]);
  const westernStandings = useMemo(() => standingsQuery.data?.western ?? NBA_WESTERN_STANDINGS, [standingsQuery.data?.western]);

  const counts: Record<string, number> = useMemo(() => ({
    upcoming: liveGames.length + upcomingGames.length,
    results: completedGames.length,
    standings: easternStandings.length + westernStandings.length,
  }), [liveGames.length, upcomingGames.length, completedGames.length, easternStandings.length, westernStandings.length]);

  const isLoading = gamesQuery.isLoading;
  const isError = gamesQuery.isError && !gamesQuery.data;
  const refreshing = gamesQuery.isRefetching;

  const onRefresh = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    queryClient.invalidateQueries({ queryKey: ['nba-games'] });
    queryClient.invalidateQueries({ queryKey: ['nba-standings'] });
  }, [queryClient]);

  const statsBar = useMemo(() => {
    const allGames = [...liveGames, ...upcomingGames, ...completedGames];
    const totalGames = allGames.length;
    const playoffGames = allGames.filter(g => g.season.toLowerCase().includes('playoff') || g.season.toLowerCase().includes('finals')).length;
    return { total: totalGames, live: liveGames.length, playoff: playoffGames, completed: completedGames.length };
  }, [liveGames, upcomingGames, completedGames]);

  type ListItem =
    | { type: 'stats'; key: string }
    | { type: 'loading'; key: string }
    | { type: 'error'; key: string }
    | { type: 'liveHeader'; key: string }
    | { type: 'game'; game: NBAGame; key: string }
    | { type: 'conference'; conference: string; teams: NBATeamStanding[]; key: string }
    | { type: 'empty'; key: string };

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];

    if (isLoading) {
      items.push({ type: 'loading', key: 'loading' });
      return items;
    }

    if (isError) {
      items.push({ type: 'error', key: 'error' });
      return items;
    }

    if (activeTab === 'upcoming') {
      items.push({ type: 'stats', key: 'stats-bar' });

      if (liveGames.length > 0) {
        items.push({ type: 'liveHeader', key: 'live-header' });
        liveGames.forEach((game, idx) => {
          items.push({ type: 'game', game, key: `live-${game.id}-${idx}` });
        });
      }

      if (upcomingGames.length === 0 && liveGames.length === 0) {
        items.push({ type: 'empty', key: 'empty' });
      } else {
        upcomingGames.forEach((game, idx) => {
          items.push({ type: 'game', game, key: `upcoming-${game.id}-${idx}` });
        });
      }
    } else if (activeTab === 'results') {
      items.push({ type: 'stats', key: 'stats-bar' });
      if (completedGames.length === 0) {
        items.push({ type: 'empty', key: 'empty' });
      } else {
        completedGames.forEach((game, idx) => {
          items.push({ type: 'game', game, key: `result-${game.id}-${idx}` });
        });
      }
    } else {
      if (standingsQuery.isLoading) {
        items.push({ type: 'loading', key: 'loading' });
      } else {
        items.push({ type: 'conference', conference: 'Eastern', teams: easternStandings, key: 'eastern' });
        items.push({ type: 'conference', conference: 'Western', teams: westernStandings, key: 'western' });
      }
    }

    return items;
  }, [activeTab, liveGames, upcomingGames, completedGames, easternStandings, westernStandings, isLoading, isError, standingsQuery.isLoading]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'loading':
        return (
          <View style={s.loadingState}>
            <ActivityIndicator size="large" color={NBA_ORANGE} />
            <Text style={[s.loadingText, { color: isDark ? '#8B8BA7' : '#6B7A99' }]}>Loading NBA scores...</Text>
          </View>
        );
      case 'error':
        return (
          <View style={s.emptyState}>
            <View style={[s.emptyIcon, { backgroundColor: '#C9082A' }]}>
              <AlertCircle size={28} color="#FFFFFF" />
            </View>
            <Text style={[s.emptyTitle, { color: isDark ? '#E4E4ED' : '#1C1C1E' }]}>Failed to load scores</Text>
            <Text style={[s.emptySub, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>Pull down to refresh and try again</Text>
          </View>
        );
      case 'liveHeader':
        return (
          <View style={s.liveHeaderRow}>
            <Radio size={14} color="#EF4444" />
            <Text style={[s.liveHeaderText, { color: isDark ? '#F0F0FA' : '#1C1C1E' }]}>Live Now</Text>
            <View style={[s.liveHeaderCount, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <Text style={s.liveHeaderCountText}>{liveGames.length}</Text>
            </View>
          </View>
        );
      case 'stats':
        return (
          <View style={s.statsBar}>
            {statsBar.live > 0 && (
              <View style={[s.statItem, { backgroundColor: isDark ? '#1A0A0A' : '#FEF2F2', borderColor: 'rgba(239,68,68,0.15)' }]}>
                <Text style={[s.statValue, { color: '#EF4444' }]}>{statsBar.live}</Text>
                <Text style={[s.statLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>LIVE</Text>
              </View>
            )}
            <View style={[s.statItem, { backgroundColor: isDark ? '#111125' : '#F5F5FA' }]}>
              <Text style={[s.statValue, { color: isDark ? NBA_BLUE : '#1A3A6E' }]}>{statsBar.total}</Text>
              <Text style={[s.statLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>GAMES</Text>
            </View>
            <View style={[s.statItem, { backgroundColor: isDark ? '#111125' : '#F5F5FA' }]}>
              <Text style={[s.statValue, { color: isDark ? NBA_ORANGE : '#C44E10' }]}>{statsBar.playoff}</Text>
              <Text style={[s.statLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>PLAYOFF</Text>
            </View>
            <View style={[s.statItem, { backgroundColor: isDark ? '#111125' : '#F5F5FA' }]}>
              <Text style={[s.statValue, { color: isDark ? '#10B981' : '#0D8B63' }]}>{statsBar.completed}</Text>
              <Text style={[s.statLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>FINAL</Text>
            </View>
          </View>
        );
      case 'game':
        return <GameCard game={item.game} isDark={isDark} onPress={handleGamePress} />;
      case 'conference':
        return <ConferenceStandings conference={item.conference} teams={item.teams} isDark={isDark} />;
      case 'empty':
        return (
          <View style={s.emptyState}>
            <LinearGradient colors={[NBA_BLUE, '#0D2A5A']} style={s.emptyIcon}>
              <Trophy size={28} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: isDark ? '#E4E4ED' : '#1C1C1E' }]}>
              {activeTab === 'upcoming' ? 'No Upcoming Games' : 'No Recent Results'}
            </Text>
            <Text style={[s.emptySub, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
              {activeTab === 'upcoming' ? 'Check back soon for new game schedules' : 'Completed games will appear here'}
            </Text>
          </View>
        );
      default:
        return null;
    }
  }, [isDark, activeTab, statsBar, liveGames.length, handleGamePress]);

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  const listHeaderComponent = useMemo(
    () => (
      <>
        <View style={s.heroStackWithSportStrip}>
          <ImageBackground
            source={NBA_HERO_BACKGROUND}
            style={[s.nbaHeroRoot, { paddingHorizontal: heroEdgePad, paddingTop: insets.top, paddingBottom: 4 }]}
            imageStyle={[
              s.nbaHeroImage,
              {
                transform: [
                  { translateY: -NBA_HERO_BOTTOM_CROP_PX },
                  ...(heroArtScale < 1 ? [{ scale: heroArtScale } as const] : []),
                ],
              },
            ]}
          >
            <View style={s.nbaHeroForeground}>
              <View style={s.nbaHeroUpper}>
                <NBAPremiumHeroInner
                  teamAbbreviations={heroTeamAbbreviations}
                  featuredGame={nextGame}
                  onRefresh={onRefresh}
                  onFeaturedPress={() => {
                    if (nextGame) handleGamePress(nextGame);
                  }}
                />
              </View>
            </View>
          </ImageBackground>
          {sportToggleSlot ? (
            <View style={[s.heroSportStripOverlapSlot, { paddingHorizontal: heroEdgePad }]}>{sportToggleSlot}</View>
          ) : null}
        </View>
        <View style={[s.tabWrapper, { paddingHorizontal: heroEdgePad }]}>
          <TabPill activeTab={activeTab} onTabChange={setActiveTab} isDark={isDark} counts={counts} />
        </View>
      </>
    ),
    [
      insets.top,
      heroEdgePad,
      heroArtScale,
      heroTeamAbbreviations,
      nextGame,
      onRefresh,
      handleGamePress,
      sportToggleSlot,
      activeTab,
      isDark,
      counts,
    ],
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeaderComponent}
        ListHeaderComponentStyle={s.listHeaderBleed}
        nestedScrollEnabled
        style={s.scrollView}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== 'web'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NBA_ORANGE} colors={[NBA_ORANGE]} />
        }
      />

      <NBAGameDetailsModal
        visible={showGameModal}
        onClose={() => { setShowGameModal(false); setSelectedGame(null); }}
        game={selectedGame}
      />
    </View>
  );
}

const s = StyleSheet.create({
  heroStackWithSportStrip: {
    position: 'relative' as const,
    zIndex: 1,
  },
  heroSportStripOverlapSlot: {
    marginTop: -HERO_SPORT_STRIP_OVERLAP_HERO_PX,
    zIndex: 20,
    elevation: 12,
  },
  nbaHeroRoot: {
    overflow: 'hidden' as const,
    minHeight: NBA_HERO_MIN_HEIGHT_PX,
    justifyContent: 'flex-start' as const,
    flexDirection: 'column' as const,
  },
  nbaHeroImage: {
    resizeMode: 'cover' as const,
  },
  nbaHeroForeground: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    position: 'relative' as const,
    zIndex: 1,
    justifyContent: 'space-between' as const,
  },
  nbaHeroUpper: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  tabWrapper: {
    marginTop: HERO_SECONDARY_GAP_BELOW_SPORT_STRIP,
    marginBottom: 12,
    zIndex: 12,
    elevation: 6,
  },
  pillContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    position: 'relative' as const,
  },
  pillIndicator: {
    position: 'absolute' as const,
    top: 3,
    bottom: 3,
    borderRadius: 11,
    overflow: 'hidden' as const,
  },
  pillIndicatorInner: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
  },
  pillTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
    zIndex: 1,
  },
  pillTabIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    flexShrink: 0,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    flexShrink: 1,
    letterSpacing: -0.1,
  },
  pillBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 7,
    minWidth: 20,
    alignItems: 'center' as const,
    flexShrink: 0,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
  },
  scrollView: {
    flex: 1,
  },
  /** Cancel parent `scrollContent` horizontal inset so the NBA hero matches full-bleed football stadium. */
  listHeaderBleed: {
    marginHorizontal: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  statsBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(29,66,138,0.08)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  gameCardWrap: {
    width: '100%',
    marginBottom: 8,
  },
  gameCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(29,66,138,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gameHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  seriesBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seriesBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  broadcastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  broadcastText: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  teamSide: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 4,
  },
  teamLogoSmall: {
    width: 48,
    height: 48,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  teamRecord: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  winBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  winBadgeText: {
    fontSize: 9,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  vsCenter: {
    paddingHorizontal: 6,
    alignItems: 'center' as const,
    gap: 4,
  },
  vsLine: {
    width: 1,
    height: 10,
  },
  vsCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  scoreNum: {
    fontSize: 18,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  scoreDash: {
    fontSize: 14,
    fontWeight: '300' as const,
  },
  highlightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  playerImageWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden' as const,
    backgroundColor: 'rgba(242,101,34,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(242,101,34,0.2)',
  },
  playerHeadshot: {
    width: 40,
    height: 40,
  },
  highlightsTextWrap: {
    flex: 1,
    gap: 2,
  },
  highlightsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  highlightsLabel: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  highlightsText: {
    fontSize: 12,
    fontWeight: '600' as const,
    flex: 1,
    letterSpacing: -0.1,
  },
  gameFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  gameFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  gameFooterText: {
    fontSize: 11,
    fontWeight: '500' as const,
    flex: 1,
  },
  gameFooterSeason: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  conferenceBlock: {
    marginBottom: 16,
  },
  conferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  conferenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  conferenceTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(29,66,138,0.04)',
  },
  standingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  standingRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  standingRankText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  standingTeamBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  standingTeamLogo: {
    width: 26,
    height: 26,
  },
  standingTeamInfo: {
    flex: 1,
  },
  standingTeamName: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  standingRecord: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  standingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  standingPct: {
    fontSize: 14,
    fontWeight: '700' as const,
    minWidth: 40,
    textAlign: 'right' as const,
  },
  streakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center' as const,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '800' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700' as const,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  loadingState: {
    alignItems: 'center' as const,
    paddingVertical: 80,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  liveBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    marginBottom: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#EF4444',
    letterSpacing: 1,
  },
  liveDetail: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  liveHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  liveHeaderText: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  liveHeaderCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveHeaderCountText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#EF4444',
  },
  liveAccentBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#EF4444',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  liveGameBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(239,68,68,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  liveGameDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  liveGameText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#EF4444',
    letterSpacing: 0.8,
  },
  liveGameDetail: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#EF4444',
  },
  startTimeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  startTimeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  lineupsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  lineupsToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 6,
  },
  lineupsToggleLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  lineupsToggleText: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  lineupsContent: {
    marginTop: 8,
  },
  lineupTeamBlock: {
    gap: 4,
  },
  lineupTeamHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 4,
  },
  lineupTeamLogo: {
    width: 18,
    height: 18,
  },
  lineupTeamName: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  lineupPlayerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  lineupPlayerImgWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden' as const,
    borderWidth: 1.5,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  lineupPlayerImg: {
    width: 28,
    height: 28,
  },
  lineupPlayerInitial: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  lineupPlayerInfo: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  lineupPlayerName: {
    fontSize: 12,
    fontWeight: '600' as const,
    flex: 1,
  },
  lineupPlayerPos: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
});
