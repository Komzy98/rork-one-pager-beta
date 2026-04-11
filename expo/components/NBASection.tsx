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
} from 'react-native';
import {
  Calendar,
  Trophy,
  ChevronRight,
  MapPin,
  Clock,
  CheckCircle2,
  BarChart3,
  Tv,
  Flame,
  Zap,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  NBAGame,
  NBATeamStanding,
  getNextGame,
  getUpcomingGames,
  getCompletedGames,
  getTeamColor,
  getTeamLogo,
  NBA_EASTERN_STANDINGS,
  NBA_WESTERN_STANDINGS,
} from '@/constants/nbaData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NBASectionProps {
  isDark: boolean;
  insets: { top: number; bottom: number };
}

const NBA_ORANGE = '#F26522';
const NBA_BLUE = '#1D428A';
const NBA_RED = '#C9082A';
const NBA_ORANGE_LIGHT = 'rgba(242, 101, 34, 0.12)';
const NBA_BLUE_LIGHT = 'rgba(29, 66, 138, 0.12)';

type NBATab = 'upcoming' | 'results' | 'standings';

const CountdownUnit = React.memo(({ value, label, isDark }: { value: number; label: string; isDark: boolean }) => (
  <View style={[s.cdUnit, { backgroundColor: isDark ? 'rgba(242,101,34,0.1)' : 'rgba(29,66,138,0.06)' }]}>
    <Text style={[s.cdValue, { color: isDark ? NBA_ORANGE : NBA_BLUE }]}>{String(value).padStart(2, '0')}</Text>
    <Text style={[s.cdLabel, { color: isDark ? '#6B6B85' : '#9CA3AF' }]}>{label}</Text>
  </View>
));

const HeroGameCard = React.memo(({ game, isDark }: { game: NBAGame; isDark: boolean }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const target = new Date(game.date).getTime();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        secs: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [game.date]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const team1Color = getTeamColor(game.team1.abbreviation);
  const team2Color = getTeamColor(game.team2.abbreviation);

  return (
    <Animated.View style={[s.heroCard, { transform: [{ scale: pulseAnim }] }]}>
      <LinearGradient
        colors={isDark ? ['#0A0A1E', '#0D1225', '#0A0A1A'] : ['#0D1B3E', '#122040', '#0A1530']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.heroGradient}
      >
        <View style={[s.heroAccent, { backgroundColor: NBA_ORANGE }]} />

        <View style={s.heroTopRow}>
          <View style={s.heroLabelWrap}>
            <Flame size={10} color={NBA_ORANGE} />
            <Text style={[s.heroLabel, { color: NBA_ORANGE }]}>NEXT GAME</Text>
          </View>
          {game.series && (
            <View style={s.heroSeriesBadge}>
              <Text style={s.heroSeriesText}>{game.series}</Text>
            </View>
          )}
        </View>

        <Text style={s.heroSeason} numberOfLines={1}>{game.season}</Text>

        <View style={s.heroTeams}>
          <View style={s.heroTeamSide}>
            <View style={s.heroAvatarWrap}>
              <View style={[s.heroAvatar, { backgroundColor: team1Color + '25', borderColor: team1Color + '40' }]}>
                <Image
                  source={{ uri: getTeamLogo(game.team1.abbreviation) }}
                  style={s.teamLogoImg}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={s.heroTeamName} numberOfLines={2}>{game.team1.name}</Text>
            {game.team1.record && (
              <Text style={s.heroTeamRecord}>{game.team1.record}</Text>
            )}
          </View>

          <View style={s.heroVsWrap}>
            <LinearGradient
              colors={[NBA_ORANGE, '#D4540E']}
              style={s.heroVsBadge}
            >
              <Text style={s.heroVsText}>VS</Text>
            </LinearGradient>
          </View>

          <View style={s.heroTeamSide}>
            <View style={s.heroAvatarWrap}>
              <View style={[s.heroAvatar, { backgroundColor: team2Color + '25', borderColor: team2Color + '40' }]}>
                <Image
                  source={{ uri: getTeamLogo(game.team2.abbreviation) }}
                  style={s.teamLogoImg}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={s.heroTeamName} numberOfLines={2}>{game.team2.name}</Text>
            {game.team2.record && (
              <Text style={s.heroTeamRecord}>{game.team2.record}</Text>
            )}
          </View>
        </View>

        <View style={s.heroCountdownRow}>
          <CountdownUnit value={timeLeft.days} label="DAYS" isDark={isDark} />
          <Text style={s.heroCountdownSep}>:</Text>
          <CountdownUnit value={timeLeft.hours} label="HRS" isDark={isDark} />
          <Text style={s.heroCountdownSep}>:</Text>
          <CountdownUnit value={timeLeft.mins} label="MIN" isDark={isDark} />
          <Text style={s.heroCountdownSep}>:</Text>
          <CountdownUnit value={timeLeft.secs} label="SEC" isDark={isDark} />
        </View>

        <View style={s.heroInfoRow}>
          <View style={s.heroInfoItem}>
            <MapPin size={11} color="#6B6B85" />
            <Text style={s.heroInfoText}>{game.arena}, {game.city}</Text>
          </View>
          {game.broadcast && (
            <View style={s.heroInfoItem}>
              <Tv size={11} color="#6B6B85" />
              <Text style={s.heroInfoText}>{game.broadcast}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

const GameCard = React.memo(({ game, isDark }: { game: NBAGame; isDark: boolean }) => {
  const isCompleted = game.status === 'completed';
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const team1Color = getTeamColor(game.team1.abbreviation);
  const team2Color = getTeamColor(game.team2.abbreviation);

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

  return (
    <Animated.View style={[s.gameCardWrap, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <View style={[
        s.gameCard,
        { backgroundColor: isDark ? '#111125' : '#FFFFFF' },
        isDark && { borderColor: 'rgba(29,66,138,0.08)' },
      ]}>
        <View style={s.gameHeader}>
          <View style={s.gameHeaderLeft}>
            {game.series && (
              <View style={[s.seriesBadge, { backgroundColor: isDark ? NBA_BLUE_LIGHT : 'rgba(29,66,138,0.06)' }]}>
                <Text style={[s.seriesBadgeText, { color: isDark ? '#5B8DEF' : NBA_BLUE }]}>{game.series}</Text>
              </View>
            )}
            {game.broadcast && (
              <View style={[s.broadcastBadge, { backgroundColor: isDark ? 'rgba(242,101,34,0.08)' : 'rgba(242,101,34,0.06)' }]}>
                <Tv size={9} color={NBA_ORANGE} />
                <Text style={[s.broadcastText, { color: NBA_ORANGE }]}>{game.broadcast}</Text>
              </View>
            )}
          </View>
          {isCompleted ? (
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

        <View style={s.teamsRow}>
          <View style={s.teamSide}>
            <View style={[
              s.teamAvatarOuter,
              isCompleted && game.team1.winner && { borderColor: '#10B981', borderWidth: 2 },
              isCompleted && !game.team1.winner && game.team2.winner && { opacity: 0.5 },
            ]}>
              <View style={[s.teamAvatar, { backgroundColor: team1Color + '15' }]}>
                <Image
                  source={{ uri: getTeamLogo(game.team1.abbreviation) }}
                  style={s.teamLogoSmall}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={[
              s.teamName,
              { color: isDark ? '#F0F0FA' : '#1C1C1E' },
              isCompleted && game.team1.winner && { color: '#10B981' },
            ]} numberOfLines={2}>{game.team1.name}</Text>
            {game.team1.record && (
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
            {isCompleted && game.team1.score != null && game.team2.score != null ? (
              <View style={[s.scoreBox, { backgroundColor: isDark ? 'rgba(29,66,138,0.08)' : 'rgba(29,66,138,0.05)' }]}>
                <Text style={[s.scoreNum, { color: isDark ? '#F0F0FA' : '#1C1C1E' }, game.team1.winner && { color: '#10B981' }]}>{game.team1.score}</Text>
                <Text style={[s.scoreDash, { color: isDark ? '#3A3A5A' : '#BEBEC4' }]}>-</Text>
                <Text style={[s.scoreNum, { color: isDark ? '#F0F0FA' : '#1C1C1E' }, game.team2.winner && { color: '#10B981' }]}>{game.team2.score}</Text>
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
              s.teamAvatarOuter,
              isCompleted && game.team2.winner && { borderColor: '#10B981', borderWidth: 2 },
              isCompleted && !game.team2.winner && game.team1.winner && { opacity: 0.5 },
            ]}>
              <View style={[s.teamAvatar, { backgroundColor: team2Color + '15' }]}>
                <Image
                  source={{ uri: getTeamLogo(game.team2.abbreviation) }}
                  style={s.teamLogoSmall}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={[
              s.teamName,
              { color: isDark ? '#F0F0FA' : '#1C1C1E' },
              isCompleted && game.team2.winner && { color: '#10B981' },
            ]} numberOfLines={2}>{game.team2.name}</Text>
            {game.team2.record && (
              <Text style={[s.teamRecord, { color: isDark ? '#5A5A7A' : '#AEAEB2' }]}>{game.team2.record}</Text>
            )}
            {isCompleted && game.team2.winner && (
              <LinearGradient colors={['#10B981', '#059669']} style={s.winBadge}>
                <Text style={s.winBadgeText}>WIN</Text>
              </LinearGradient>
            )}
          </View>
        </View>

        {isCompleted && game.highlights && (
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

export default function NBASection({ isDark, insets }: NBASectionProps) {
  const [activeTab, setActiveTab] = useState<NBATab>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const nextGame = useMemo(() => getNextGame(), []);
  const upcomingGames = useMemo(() => getUpcomingGames(), []);
  const completedGames = useMemo(() => getCompletedGames(), []);

  const counts: Record<string, number> = useMemo(() => ({
    upcoming: upcomingGames.length,
    results: completedGames.length,
    standings: NBA_EASTERN_STANDINGS.length + NBA_WESTERN_STANDINGS.length,
  }), [upcomingGames.length, completedGames.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const statsBar = useMemo(() => {
    const totalGames = upcomingGames.length + completedGames.length;
    const playoffGames = [...upcomingGames, ...completedGames].filter(g => g.season.includes('Playoff')).length;
    return { total: totalGames, playoff: playoffGames, completed: completedGames.length };
  }, [upcomingGames, completedGames]);

  type ListItem =
    | { type: 'hero'; game: NBAGame; key: string }
    | { type: 'stats'; key: string }
    | { type: 'game'; game: NBAGame; key: string }
    | { type: 'conference'; conference: string; teams: NBATeamStanding[]; key: string }
    | { type: 'empty'; key: string };

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];

    if (activeTab === 'upcoming') {
      if (nextGame) {
        items.push({ type: 'hero', game: nextGame, key: 'hero-game' });
      }
      items.push({ type: 'stats', key: 'stats-bar' });
      if (upcomingGames.length === 0) {
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
      items.push({ type: 'conference', conference: 'Eastern', teams: NBA_EASTERN_STANDINGS, key: 'eastern' });
      items.push({ type: 'conference', conference: 'Western', teams: NBA_WESTERN_STANDINGS, key: 'western' });
    }

    return items;
  }, [activeTab, nextGame, upcomingGames, completedGames]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'hero':
        return <HeroGameCard game={item.game} isDark={isDark} />;
      case 'stats':
        return (
          <View style={s.statsBar}>
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
        return <GameCard game={item.game} isDark={isDark} />;
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
  }, [isDark, activeTab, statsBar]);

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.tabWrapper}>
        <TabPill activeTab={activeTab} onTabChange={setActiveTab} isDark={isDark} counts={counts} />
      </View>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
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
    </View>
  );
}

const s = StyleSheet.create({
  tabWrapper: {
    paddingHorizontal: 20,
    marginBottom: 12,
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
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroCard: {
    marginBottom: 16,
    borderRadius: 22,
    overflow: 'hidden' as const,
    shadowColor: NBA_BLUE,
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  heroAccent: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  heroLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 2,
  },
  heroSeriesBadge: {
    backgroundColor: 'rgba(242,101,34,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(242,101,34,0.2)',
  },
  heroSeriesText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: NBA_ORANGE,
    letterSpacing: 0.3,
  },
  heroSeason: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#F0F0FA',
    letterSpacing: -0.3,
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  heroTeams: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  heroTeamSide: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 4,
  },
  heroAvatarWrap: {
    marginBottom: 4,
  },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  teamLogoImg: {
    width: 42,
    height: 42,
  },
  heroTeamName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#F0F0FA',
    textAlign: 'center' as const,
    lineHeight: 17,
  },
  heroTeamRecord: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#5A5A7A',
    letterSpacing: 0.5,
  },
  heroVsWrap: {
    paddingHorizontal: 10,
    paddingTop: 18,
  },
  heroVsBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroVsText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroCountdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  heroCountdownSep: {
    fontSize: 18,
    fontWeight: '300' as const,
    color: '#4A4A6A',
  },
  heroInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroInfoText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#6B6B85',
  },
  cdUnit: {
    alignItems: 'center' as const,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(29,66,138,0.12)',
    minWidth: 52,
  },
  cdValue: {
    fontSize: 20,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  cdLabel: {
    fontSize: 8,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginTop: 2,
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
  teamAvatarOuter: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  teamAvatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamLogoSmall: {
    width: 36,
    height: 36,
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
});
