import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Image, Animated, Platform, Dimensions, Linking } from 'react-native';
import { X, MapPin, Users, BarChart3, History, AlertTriangle, Activity, Tv, Globe, Building2, Cloud, Thermometer, Wind, Droplets, Play, TrendingUp, Shield, Zap, Clock, Clapperboard } from 'lucide-react-native';
import { formatMatchRoundLabel, isKnockoutRoundLabel } from '@/utils/matchRoundLabel';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Team accent colors (home / away) — independent of app light/dark */
const HOME_COLOR = '#00E5FF';
const AWAY_COLOR = '#FF5C8A';

/** api-sports CDN portraits (same host as team logos). Lineup payloads often omit `photo`; id-based URL still works. */
function footballPlayerPortraitUri(player: { id?: number; photo?: string | null }): string | null {
  const raw = typeof player.photo === 'string' ? player.photo.trim() : '';
  if (raw.length > 4) {
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('//') && /\./.test(raw)) return `https:${raw}`;
    if (raw.startsWith('/') && /\/football\/players\//i.test(raw)) {
      return `https://media.api-sports.io${raw}`;
    }
    if (/^media\.api-sports\.io\//i.test(raw)) return `https://${raw}`;
    if (/^football\/players\/\d+/i.test(raw)) return `https://media.api-sports.io/${raw}`;
  }
  const id = player.id;
  if (typeof id === 'number' && id > 0) return `https://media.api-sports.io/football/players/${id}.png`;
  return null;
}

export type MatchModalTokens = {
  accent: string;
  accentSecondary: string;
  surfaceMain: string;
  surfaceCard: string;
  surfaceElevated: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  gradientMid: string;
  handleBar: string;
  heroScore: string;
};

function getMatchModalTokens(isDark: boolean): MatchModalTokens {
  if (isDark) {
    return {
      accent: '#00E5FF',
      accentSecondary: '#7C4DFF',
      surfaceMain: '#111318',
      surfaceCard: '#1A1D24',
      surfaceElevated: '#22262F',
      borderSubtle: 'rgba(255,255,255,0.06)',
      textPrimary: '#F0F2F5',
      textSecondary: 'rgba(255,255,255,0.55)',
      textMuted: 'rgba(255,255,255,0.3)',
      gradientMid: '#0D0F14',
      handleBar: 'rgba(255,255,255,0.15)',
      heroScore: '#FFFFFF',
    };
  }
  return {
    accent: '#0891B2',
    accentSecondary: '#6366F1',
    surfaceMain: '#FFFFFF',
    surfaceCard: '#F3F4F6',
    surfaceElevated: '#E5E7EB',
    borderSubtle: 'rgba(15,23,42,0.08)',
    textPrimary: '#111827',
    textSecondary: 'rgba(17,24,39,0.65)',
    textMuted: 'rgba(17,24,39,0.45)',
    gradientMid: '#F3F4F6',
    handleBar: 'rgba(15,23,42,0.2)',
    heroScore: '#111827',
  };
}

type MatchModalStyles = ReturnType<typeof createMatchModalStyles>;

const MatchModalShellContext = React.createContext<{
  tokens: MatchModalTokens;
  styles: MatchModalStyles;
} | null>(null);

function useMatchModalShell() {
  const ctx = React.useContext(MatchModalShellContext);
  if (!ctx) {
    throw new Error('useMatchModalShell must be used inside MatchDetailsModal');
  }
  return ctx;
}

type TabType = 'events' | 'lineups' | 'stats' | 'form' | 'h2h' | 'venue';

interface MatchDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
  league: string;
  leagueLogo?: string;
  round?: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}

interface VenueInfo {
  name?: string;
  city?: string;
  capacity?: number;
  image?: string;
}

interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  description: string;
  icon: string;
}

interface BroadcastChannel {
  name: string;
  region: string;
  icon?: string;
}

interface LeagueBroadcast {
  channels: BroadcastChannel[];
  streamingNote?: string;
}

const LEAGUE_BROADCAST_MAP: Record<number, LeagueBroadcast> = {
  39: { channels: [
    { name: 'Sky Sports', region: 'UK', icon: '📡' },
    { name: 'TNT Sports', region: 'UK', icon: '📺' },
    { name: 'Amazon Prime', region: 'UK', icon: '🎬' },
    { name: 'NBC / Peacock', region: 'US', icon: '🇺🇸' },
    { name: 'DAZN', region: 'CA/DE', icon: '🌐' },
    { name: 'beIN Sports', region: 'MENA/FR', icon: '📡' },
    { name: 'Star Sports', region: 'IN', icon: '🇮🇳' },
    { name: 'SuperSport', region: 'AF', icon: '🌍' },
  ], streamingNote: 'Premier League matches are widely broadcast globally' },
  45: { channels: [
    { name: 'BBC / ITV', region: 'UK', icon: '📺' },
    { name: 'ESPN+', region: 'US', icon: '🇺🇸' },
    { name: 'beIN Sports', region: 'MENA', icon: '📡' },
    { name: 'SuperSport', region: 'AF', icon: '🌍' },
  ], streamingNote: 'FA Cup rounds shown on BBC & ITV in UK' },
  48: { channels: [
    { name: 'Sky Sports', region: 'UK', icon: '📡' },
    { name: 'ESPN+', region: 'US', icon: '🇺🇸' },
    { name: 'DAZN', region: 'CA', icon: '🌐' },
  ], streamingNote: 'League Cup/Carabao Cup' },
  140: { channels: [
    { name: 'DAZN', region: 'ES/CA', icon: '🌐' },
    { name: 'ESPN+', region: 'US', icon: '🇺🇸' },
    { name: 'Premier Sports', region: 'UK', icon: '📡' },
    { name: 'beIN Sports', region: 'MENA/FR', icon: '📡' },
    { name: 'SuperSport', region: 'AF', icon: '🌍' },
  ], streamingNote: 'La Liga broadcast across 180+ countries' },
  143: { channels: [
    { name: 'DAZN', region: 'ES', icon: '🌐' },
    { name: 'ESPN+', region: 'US', icon: '🇺🇸' },
  ] },
  78: { channels: [
    { name: 'Sky Germany', region: 'DE', icon: '📡' },
    { name: 'DAZN', region: 'DE/CA', icon: '🌐' },
    { name: 'ESPN+', region: 'US', icon: '🇺🇸' },
    { name: 'beIN Sports', region: 'MENA', icon: '📡' },
    { name: 'SuperSport', region: 'AF', icon: '🌍' },
  ] },
  81: { channels: [
    { name: 'Sky Germany', region: 'DE', icon: '📡' },
    { name: 'ESPN+', region: 'US', icon: '🇺🇸' },
  ] },
  135: { channels: [
    { name: 'DAZN', region: 'IT/CA', icon: '🌐' },
    { name: 'Paramount+', region: 'US', icon: '🇺🇸' },
    { name: 'beIN Sports', region: 'MENA/FR', icon: '📡' },
    { name: 'BT Sport', region: 'UK', icon: '📺' },
    { name: 'SuperSport', region: 'AF', icon: '🌍' },
  ] },
  137: { channels: [
    { name: 'DAZN', region: 'IT', icon: '🌐' },
    { name: 'Paramount+', region: 'US', icon: '🇺🇸' },
  ] },
  61: { channels: [
    { name: 'DAZN', region: 'FR', icon: '🌐' },
    { name: 'beIN Sports', region: 'FR/MENA', icon: '📡' },
    { name: 'fuboTV', region: 'US', icon: '🇺🇸' },
    { name: 'SuperSport', region: 'AF', icon: '🌍' },
  ] },
  66: { channels: [
    { name: 'beIN Sports', region: 'FR/MENA', icon: '📡' },
    { name: 'ESPN+', region: 'US', icon: '🇺🇸' },
  ] },
  2: { channels: [
    { name: 'TNT Sports', region: 'UK', icon: '📺' },
    { name: 'CBS / Paramount+', region: 'US', icon: '🇺🇸' },
    { name: 'DAZN', region: 'CA/DE/IT', icon: '🌐' },
    { name: 'Canal+', region: 'FR', icon: '📡' },
    { name: 'Movistar+', region: 'ES', icon: '📡' },
    { name: 'beIN Sports', region: 'MENA', icon: '📡' },
    { name: 'SuperSport', region: 'AF', icon: '🌍' },
    { name: 'Sony Sports', region: 'IN', icon: '🇮🇳' },
  ], streamingNote: 'Champions League shown in 200+ countries' },
  3: { channels: [
    { name: 'TNT Sports', region: 'UK', icon: '📺' },
    { name: 'CBS / Paramount+', region: 'US', icon: '🇺🇸' },
    { name: 'DAZN', region: 'CA/DE', icon: '🌐' },
    { name: 'beIN Sports', region: 'MENA', icon: '📡' },
    { name: 'SuperSport', region: 'AF', icon: '🌍' },
  ], streamingNote: 'Europa League broadcast globally' },
  848: { channels: [
    { name: 'TNT Sports', region: 'UK', icon: '📺' },
    { name: 'CBS / Paramount+', region: 'US', icon: '🇺🇸' },
    { name: 'DAZN', region: 'CA', icon: '🌐' },
  ] },
  6: { channels: [
    { name: 'beIN Sports', region: 'MENA/FR', icon: '📡' },
    { name: 'SuperSport', region: 'AF', icon: '🌍' },
    { name: 'ESPN+', region: 'US', icon: '🇺🇸' },
    { name: 'Sky Sports', region: 'UK', icon: '📡' },
  ], streamingNote: 'Africa Cup of Nations' },
  253: { channels: [
    { name: 'Apple TV (MLS Season Pass)', region: 'Global', icon: '🍎' },
    { name: 'FOX Sports', region: 'US', icon: '🇺🇸' },
  ], streamingNote: 'MLS exclusively on Apple TV globally' },
  1: { channels: [
    { name: 'BBC / ITV', region: 'UK', icon: '📺' },
    { name: 'FOX / Telemundo', region: 'US', icon: '🇺🇸' },
    { name: 'beIN Sports', region: 'MENA', icon: '📡' },
    { name: 'SuperSport', region: 'AF', icon: '🌍' },
  ], streamingNote: 'FIFA World Cup broadcast worldwide' },
};

const COUNTRY_BROADCAST_FALLBACK: Record<string, BroadcastChannel[]> = {
  'England': [
    { name: 'Sky Sports', region: 'UK', icon: '📡' },
    { name: 'TNT Sports', region: 'UK', icon: '📺' },
    { name: 'BBC', region: 'UK', icon: '📺' },
  ],
  'Spain': [
    { name: 'DAZN', region: 'ES', icon: '🌐' },
    { name: 'Movistar+', region: 'ES', icon: '📡' },
  ],
  'Germany': [
    { name: 'Sky Germany', region: 'DE', icon: '📡' },
    { name: 'DAZN', region: 'DE', icon: '🌐' },
  ],
  'Italy': [
    { name: 'DAZN', region: 'IT', icon: '🌐' },
    { name: 'Sky Italia', region: 'IT', icon: '📡' },
  ],
  'France': [
    { name: 'DAZN', region: 'FR', icon: '🌐' },
    { name: 'Canal+', region: 'FR', icon: '📡' },
    { name: 'beIN Sports', region: 'FR', icon: '📡' },
  ],
  'World': [
    { name: 'ESPN', region: 'Global', icon: '📡' },
    { name: 'beIN Sports', region: 'Global', icon: '📡' },
    { name: 'DAZN', region: 'Global', icon: '🌐' },
  ],
};

function getBroadcastForMatch(leagueId?: number, leagueCountry?: string): { channels: BroadcastChannel[]; note?: string } {
  if (leagueId && LEAGUE_BROADCAST_MAP[leagueId]) {
    const data = LEAGUE_BROADCAST_MAP[leagueId];
    return { channels: data.channels, note: data.streamingNote };
  }
  const country = leagueCountry || 'World';
  const fallback = COUNTRY_BROADCAST_FALLBACK[country] || COUNTRY_BROADCAST_FALLBACK['World'];
  return { channels: fallback || [], note: undefined };
}

interface MatchEvent {
  time: { elapsed: number; extra?: number };
  team: { id: number; name: string; logo?: string };
  player: { id: number; name: string };
  assist?: { id?: number; name?: string };
  type: string;
  detail: string;
  comments?: string;
}

interface TeamLineup {
  team: { id: number; name: string; logo: string };
  formation: string;
  startXI: { player: { id: number; name: string; number: number; pos: string; photo?: string | null } }[];
  substitutes: { player: { id: number; name: string; number: number; pos: string; photo?: string | null } }[];
  coach: { id: number; name: string; photo?: string };
}

interface TeamStatistic {
  team: { id: number; name: string; logo: string };
  statistics: { type: string; value: number | string | null }[];
}

interface H2HMatch {
  fixture: { id: number; date: string };
  teams: { home: { id: number; name: string; winner: boolean | null }; away: { id: number; name: string; winner: boolean | null } };
  goals: { home: number | null; away: number | null };
  league: { name: string };
}

const AnimatedStatBar = ({ homeValue, awayValue, label, delay = 0 }: { homeValue: number | string; awayValue: number | string; label: string; delay?: number }) => {
  const { styles } = useMatchModalShell();
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const homeNum = typeof homeValue === 'string' ? parseFloat(homeValue) || 0 : homeValue;
  const awayNum = typeof awayValue === 'string' ? parseFloat(awayValue) || 0 : awayValue;
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

type LineupTab = 'home' | 'away';

function LineupPlayerAvatar({
  player,
  accentColor,
  size = 'md',
}: {
  player: { id: number; name: string; photo?: string | null };
  accentColor: string;
  size?: 'sm' | 'md';
}) {
  const { styles } = useMatchModalShell();
  const uri = footballPlayerPortraitUri(player);
  const [failed, setFailed] = useState(false);
  const dim = size === 'sm' ? 26 : 36;

  if (!uri || failed) {
    return (
      <View
        style={[
          styles.playerAvatar,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: accentColor + '22',
            borderColor: accentColor + '44',
          },
        ]}
      >
        <Text style={[styles.playerAvatarInitial, { color: accentColor, fontSize: size === 'sm' ? 11 : 14 }]}>
          {(player.name || '?').charAt(0)}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.playerAvatar, { width: dim, height: dim, borderRadius: dim / 2 }]}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

const getPositionGroup = (pos: string): string => {
  if (pos === 'G') return 'Goalkeeper';
  if (pos === 'D') return 'Defenders';
  if (pos === 'M') return 'Midfielders';
  if (pos === 'F') return 'Forwards';
  return 'Players';
};

const getPositionOrder = (pos: string): number => {
  if (pos === 'G') return 0;
  if (pos === 'D') return 1;
  if (pos === 'M') return 2;
  if (pos === 'F') return 3;
  return 4;
};

const LineupListView = ({ homeLineup, awayLineup, homeTeam, awayTeam, homeTeamLogo, awayTeamLogo }: {
  homeLineup?: TeamLineup;
  awayLineup?: TeamLineup;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}) => {
  const { styles } = useMatchModalShell();
  const [activeTab, setActiveTab] = useState<LineupTab>('home');

  const handleTabChange = async (tab: LineupTab) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveTab(tab);
  };

  const currentLineup = activeTab === 'home' ? homeLineup : awayLineup;
  const currentTeam = activeTab === 'home' ? homeTeam : awayTeam;
  const currentLogo = activeTab === 'home' ? homeTeamLogo : awayTeamLogo;
  const accentColor = activeTab === 'home' ? HOME_COLOR : AWAY_COLOR;

  const groupedPlayers = React.useMemo(() => {
    if (!currentLineup?.startXI) return [];
    const groups: {
      [key: string]: { player: { id: number; name: string; number: number; pos: string; photo?: string | null } }[];
    } = {};
    currentLineup.startXI.forEach(item => {
      const group = getPositionGroup(item.player.pos);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });
    return Object.entries(groups).sort((a, b) => {
      const posA = a[1][0]?.player?.pos || '';
      const posB = b[1][0]?.player?.pos || '';
      return getPositionOrder(posA) - getPositionOrder(posB);
    });
  }, [currentLineup]);

  return (
    <View style={styles.lineupContainer}>
      <View style={styles.lineupToggle}>
        <TouchableOpacity
          style={[styles.lineupToggleBtn, activeTab === 'home' && { backgroundColor: HOME_COLOR + '18' }]}
          onPress={() => handleTabChange('home')}
          activeOpacity={0.7}
        >
          {homeTeamLogo ? (
            <Image source={{ uri: homeTeamLogo }} style={styles.lineupToggleLogo} resizeMode="contain" />
          ) : (
            <View style={[styles.lineupToggleLogoFallback, { backgroundColor: HOME_COLOR + '20' }]}>
              <Text style={[styles.lineupToggleInitial, { color: HOME_COLOR }]}>{homeTeam.charAt(0)}</Text>
            </View>
          )}
          <Text style={[styles.lineupToggleName, activeTab === 'home' && { color: HOME_COLOR }]} numberOfLines={1}>{homeTeam}</Text>
          {activeTab === 'home' && <View style={[styles.lineupToggleIndicator, { backgroundColor: HOME_COLOR }]} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.lineupToggleBtn, activeTab === 'away' && { backgroundColor: AWAY_COLOR + '18' }]}
          onPress={() => handleTabChange('away')}
          activeOpacity={0.7}
        >
          {awayTeamLogo ? (
            <Image source={{ uri: awayTeamLogo }} style={styles.lineupToggleLogo} resizeMode="contain" />
          ) : (
            <View style={[styles.lineupToggleLogoFallback, { backgroundColor: AWAY_COLOR + '20' }]}>
              <Text style={[styles.lineupToggleInitial, { color: AWAY_COLOR }]}>{awayTeam.charAt(0)}</Text>
            </View>
          )}
          <Text style={[styles.lineupToggleName, activeTab === 'away' && { color: AWAY_COLOR }]} numberOfLines={1}>{awayTeam}</Text>
          {activeTab === 'away' && <View style={[styles.lineupToggleIndicator, { backgroundColor: AWAY_COLOR }]} />}
        </TouchableOpacity>
      </View>

      <View style={[styles.lineupInfoCard, { borderColor: accentColor + '20' }]}>
        <View style={[styles.lineupInfoAccent, { backgroundColor: accentColor }]} />
        <View style={styles.lineupInfoBody}>
          {currentLogo ? (
            <Image source={{ uri: currentLogo }} style={styles.lineupInfoLogo} resizeMode="contain" />
          ) : (
            <View style={[styles.lineupInfoLogoFallback, { backgroundColor: accentColor + '20' }]}>
              <Text style={[styles.lineupInfoLogoInit, { color: accentColor }]}>{currentTeam.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.lineupInfoText}>
            <Text style={styles.lineupInfoTeamName} numberOfLines={1}>{currentTeam}</Text>
            <View style={styles.lineupInfoMetaRow}>
              <View style={[styles.formationChip, { backgroundColor: accentColor + '18' }]}>
                <Text style={[styles.formationChipText, { color: accentColor }]}>{currentLineup?.formation || '-'}</Text>
              </View>
              <Text style={styles.lineupCoachText}>Coach: {currentLineup?.coach?.name || 'Unknown'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.xiSection}>
        <View style={styles.xiHeader}>
          <View style={[styles.xiHeaderIcon, { backgroundColor: accentColor + '18' }]}>
            <Users size={13} color={accentColor} />
          </View>
          <Text style={styles.xiHeaderText}>Starting XI</Text>
        </View>

        {groupedPlayers.map(([group, players]) => (
          <View key={group} style={styles.posGroup}>
            <View style={styles.posGroupHeader}>
              <View style={[styles.posGroupLine, { backgroundColor: accentColor + '25' }]} />
              <Text style={styles.posGroupLabel}>{group}</Text>
              <View style={[styles.posGroupLine, { backgroundColor: accentColor + '25' }]} />
            </View>
            <View style={styles.playersList}>
              {players.map((item, idx) => (
                <View key={idx} style={styles.playerRow}>
                  <LineupPlayerAvatar player={item.player} accentColor={accentColor} />
                  <View style={[styles.playerNum, { backgroundColor: accentColor }]}>
                    <Text style={styles.playerNumText}>{item.player.number}</Text>
                  </View>
                  <Text style={styles.playerName} numberOfLines={1}>{item.player.name}</Text>
                  <Text style={styles.playerPos}>{item.player.pos}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function MatchDetailsModal({
  visible,
  onClose,
  fixtureId,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  league,
  leagueLogo: leagueLogoProp,
  round: roundProp,
  homeTeamLogo,
  awayTeamLogo,
}: MatchDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('events');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const { data, isLoading, error } = trpc.football.getMatchDetails.useQuery(
    { fixtureId },
    { enabled: visible && !!fixtureId }
  );

  const { themeMode } = useTheme();
  /** Sheet matches profile explicitly choosing Dark — not system Appearance when mode is Auto */
  const modalDark = themeMode === 'dark';
  const tokens = useMemo(() => getMatchModalTokens(modalDark), [modalDark]);
  const styles = useMemo(() => createMatchModalStyles(tokens), [tokens]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      headerAnim.setValue(0);
    }
  }, [visible, slideAnim, headerAnim]);

  const handleTabPress = useCallback(async (tab: TabType) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveTab(tab);
  }, []);

  const goals = (data as any)?.goals || [];
  const events = (data as any)?.events || [];
  const lineups = (data as any)?.lineups || [];
  const statistics = (data as any)?.statistics || [];
  const headToHead = (data as any)?.headToHead || [];
  const homeFormData = (data as any)?.homeForm || [];
  const awayFormData = (data as any)?.awayForm || [];
  const fixture = data?.fixture;
  const matchStatus = fixture?.fixture?.status?.short;
  const isCompleted = ['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(matchStatus);
  const isLive = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(matchStatus);

  useEffect(() => {
    const fetchWeather = async () => {
      const city = fixture?.fixture?.venue?.city;
      if (!city || activeTab !== 'venue') return;
      setWeatherLoading(true);
      try {
        const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;
        if (!apiKey) { setWeatherLoading(false); return; }
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
        if (response.ok) {
          const d = await response.json();
          setWeatherData({
            temp: Math.round(d.main.temp),
            feels_like: Math.round(d.main.feels_like),
            humidity: d.main.humidity,
            wind_speed: Math.round(d.wind.speed * 3.6),
            description: d.weather[0]?.description || 'Unknown',
            icon: d.weather[0]?.icon || '01d',
          });
        }
      } catch (err) {
        console.error('Error fetching weather:', err);
      } finally {
        setWeatherLoading(false);
      }
    };
    void fetchWeather();
  }, [fixture?.fixture?.venue?.city, activeTab]);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = useMemo(
    () => [
      { id: 'events', label: 'Timeline', icon: <Activity size={14} color={activeTab === 'events' ? tokens.accent : tokens.textMuted} /> },
      { id: 'lineups', label: 'Lineups', icon: <Users size={14} color={activeTab === 'lineups' ? tokens.accent : tokens.textMuted} /> },
      { id: 'stats', label: 'Stats', icon: <BarChart3 size={14} color={activeTab === 'stats' ? tokens.accent : tokens.textMuted} /> },
      { id: 'form', label: 'Form', icon: <TrendingUp size={14} color={activeTab === 'form' ? tokens.accent : tokens.textMuted} /> },
      { id: 'h2h', label: 'H2H', icon: <History size={14} color={activeTab === 'h2h' ? tokens.accent : tokens.textMuted} /> },
      { id: 'venue', label: 'Venue', icon: <Building2 size={14} color={activeTab === 'venue' ? tokens.accent : tokens.textMuted} /> },
    ],
    [tokens, activeTab],
  );

  const renderEventIcon = (type: string, detail: string) => {
    if (type === 'Goal') {
      if (detail === 'Own Goal') return '🔴';
      if (detail === 'Penalty') return '⚽🎯';
      return '⚽';
    }
    if (type === 'Card') {
      if (detail === 'Yellow Card') return '🟨';
      if (detail === 'Red Card') return '🟥';
      if (detail === 'Second Yellow card') return '🟨🟥';
    }
    if (type === 'subst') return '🔄';
    if (type === 'Var') return '📺';
    return '•';
  };

  const leagueId = (data as any)?.fixture?.league?.id || fixture?.league?.id;
  const leagueCountry = (data as any)?.league?.country || fixture?.league?.country || 'World';
  const leagueLogo = fixture?.league?.logo || leagueLogoProp;
  const leagueName = fixture?.league?.name || league;
  const roundLabel = useMemo(
    () => formatMatchRoundLabel(fixture?.league?.round ?? roundProp),
    [fixture?.league?.round, roundProp],
  );
  const isKnockoutRound = isKnockoutRoundLabel(roundLabel);
  const broadcastData = React.useMemo(() => getBroadcastForMatch(leagueId, leagueCountry), [leagueId, leagueCountry]);

  const renderWhereToWatchSection = () => {
    if (isCompleted) return null;
    if (broadcastData.channels.length === 0) return null;

    const matchTime = fixture?.fixture?.date
      ? new Date(fixture.fixture.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
      : '';
    const matchDate = fixture?.fixture?.date
      ? new Date(fixture.fixture.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      : '';

    const regionGroups: Record<string, BroadcastChannel[]> = {};
    broadcastData.channels.forEach(ch => {
      const region = ch.region;
      if (!regionGroups[region]) regionGroups[region] = [];
      regionGroups[region].push(ch);
    });

    return (
      <View style={styles.watchCard}>
        <LinearGradient
          colors={
            modalDark
              ? ['#0A2E1F', '#0D1A14', tokens.surfaceCard]
              : ['#ECFDF5', '#D1FAE5', tokens.surfaceCard]
          }
          style={styles.watchCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.watchHeader}>
            <View style={styles.watchTitleRow}>
              <View style={styles.watchIconBg}>
                <Tv size={14} color="#10B981" />
              </View>
              <Text style={styles.watchTitle}>Where to Watch</Text>
            </View>
            {matchTime !== '' && (
              <View style={styles.watchTimePill}>
                <Clock size={10} color={tokens.accent} />
                <Text style={styles.watchTimeText}>{matchDate} • {matchTime}</Text>
              </View>
            )}
          </View>

          <View style={styles.watchChannelsList}>
            {broadcastData.channels.map((channel, index) => (
              <View key={`${channel.name}-${index}`} style={styles.watchChannelItem}>
                <View style={styles.watchChannelIcon}>
                  <Text style={styles.watchChannelEmoji}>{channel.icon || '📺'}</Text>
                </View>
                <View style={styles.watchChannelInfo}>
                  <Text style={styles.watchChannelName}>{channel.name}</Text>
                  <Text style={styles.watchChannelRegion}>{channel.region}</Text>
                </View>
              </View>
            ))}
          </View>

          {broadcastData.note && (
            <View style={styles.watchNoteRow}>
              <Globe size={10} color={tokens.textMuted} />
              <Text style={styles.watchNoteText}>{broadcastData.note}</Text>
            </View>
          )}

          <Text style={styles.watchDisclaimer}>Availability may vary by region and subscription</Text>
        </LinearGradient>
      </View>
    );
  };

  const renderHighlightsSection = () => {
    if (!isCompleted) return null;

    const searchQuery = encodeURIComponent(`${homeTeam} vs ${awayTeam} highlights ${homeScore}-${awayScore}`);
    const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
    const matchDate = fixture?.fixture?.date ? new Date(fixture.fixture.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

    const handleOpenYouTube = async () => {
      try {
        if (Platform.OS === 'web') {
          window.open(youtubeSearchUrl, '_blank');
        } else {
          const supported = await Linking.canOpenURL(youtubeSearchUrl);
          if (supported) {
            await Linking.openURL(youtubeSearchUrl);
          } else {
            const webFallback = youtubeSearchUrl;
            await Linking.openURL(webFallback);
          }
        }
      } catch (err) {
        console.error('Failed to open YouTube:', err);
      }
    };

    const goalEvents = events.filter((e: MatchEvent) => e.type === 'Goal');

    return (
      <View style={styles.highlightsCard}>
        <View style={styles.highlightsHeader}>
          <View style={styles.highlightsTitleBlock}>
            <View style={styles.highlightsIconBadge}>
              <Clapperboard size={16} color={tokens.accent} strokeWidth={2} />
            </View>
            <View style={styles.highlightsTitleTextCol}>
              <Text style={styles.highlightsKicker}>MATCH RECAP</Text>
              <Text style={styles.highlightsHeadline}>Highlights & replay</Text>
            </View>
          </View>
          {matchDate !== '' ? (
            <View style={styles.highlightsDatePill}>
              <Text style={styles.highlightsDate}>{matchDate}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.highlightsVideoTouch}
          onPress={handleOpenYouTube}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#050810', '#0c1220', '#121c2e']}
            locations={[0, 0.45, 1]}
            style={styles.highlightsVideoBg}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0)']}
              style={styles.highlightsVideoSheen}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <View style={styles.highlightsTeamsDisplay}>
              <View style={styles.highlightsTeamCol}>
                {homeTeamLogo ? (
                  <View style={styles.highlightsLogoRing}>
                    <Image source={{ uri: homeTeamLogo }} style={styles.highlightsTeamLogo} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={[styles.highlightsTeamLogoFallback, styles.highlightsLogoRing]}>
                    <Text style={styles.highlightsTeamInit}>{homeTeam.charAt(0)}</Text>
                  </View>
                )}
                <Text style={styles.highlightsTeamNameOnDark} numberOfLines={2}>
                  {homeTeam}
                </Text>
              </View>

              <View style={styles.highlightsScoreCol}>
                <View style={styles.highlightsScoreBox}>
                  <Text style={styles.highlightsScoreText}>{homeScore ?? '–'}</Text>
                  <Text style={styles.highlightsScoreDivider}>:</Text>
                  <Text style={styles.highlightsScoreText}>{awayScore ?? '–'}</Text>
                </View>
                <View style={styles.highlightsFtRow}>
                  <View style={styles.highlightsFtDot} />
                  <Text style={styles.highlightsFTLabel}>FULL TIME</Text>
                  <View style={styles.highlightsFtDot} />
                </View>
              </View>

              <View style={styles.highlightsTeamCol}>
                {awayTeamLogo ? (
                  <View style={styles.highlightsLogoRing}>
                    <Image source={{ uri: awayTeamLogo }} style={styles.highlightsTeamLogo} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={[styles.highlightsTeamLogoFallback, styles.highlightsLogoRing]}>
                    <Text style={styles.highlightsTeamInit}>{awayTeam.charAt(0)}</Text>
                  </View>
                )}
                <Text style={styles.highlightsTeamNameOnDark} numberOfLines={2}>
                  {awayTeam}
                </Text>
              </View>
            </View>

            <View style={styles.highlightsPlayColumn}>
              <View style={styles.highlightsPlayGlass}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)']}
                  style={styles.highlightsPlayCircle}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                >
                  <View style={styles.highlightsPlayIconNudge}>
                    <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                </LinearGradient>
              </View>
              <Text style={styles.highlightsPlayPrimary}>Play full recap</Text>
              <View style={styles.highlightsYtHint}>
                <View style={styles.highlightsYtDot} />
                <Text style={styles.highlightsPlaySecondary}>Opens in YouTube</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {goalEvents.length > 0 && (
          <View style={styles.highlightsGoalsList}>
            <View style={styles.highlightsGoalsHeader}>
              <View style={styles.highlightsGoalsTitleRow}>
                <Zap size={13} color={tokens.accent} strokeWidth={2.5} />
                <Text style={styles.highlightsGoalsTitle}>Scoring summary</Text>
              </View>
              <Text style={styles.highlightsGoalsCaption}>{goalEvents.length} goal{goalEvents.length === 1 ? '' : 's'}</Text>
            </View>
            {goalEvents.map((event: MatchEvent, idx: number) => {
              const isHome = event.team?.name === homeTeam;
              const accent = isHome ? HOME_COLOR : AWAY_COLOR;
              return (
                <View
                  key={idx}
                  style={[
                    styles.highlightsGoalRow,
                    { borderLeftColor: accent },
                    isHome ? styles.highlightsGoalTintHome : styles.highlightsGoalTintAway,
                  ]}
                >
                  <View style={[styles.highlightsGoalBadge, { backgroundColor: accent + '22' }]}>
                    <Text style={styles.highlightsGoalIcon}>⚽</Text>
                  </View>
                  <View style={styles.highlightsGoalInfo}>
                    <Text style={styles.highlightsGoalPlayer}>{event.player?.name}</Text>
                    {event.assist?.name ? (
                      <Text style={styles.highlightsGoalAssist}>
                        Assist <Text style={styles.highlightsGoalAssistName}>{event.assist.name}</Text>
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.highlightsGoalTimeShell}>
                    <Text style={[styles.highlightsGoalTimeText, { color: accent }]}>
                      {event.time.elapsed}&apos;{event.time.extra ? `+${event.time.extra}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.highlightsSources}>
          <View style={styles.highlightsSourcesHead}>
            <Tv size={12} color={tokens.textMuted} strokeWidth={2} />
            <Text style={styles.highlightsSourcesLabel}>Broadcast & streaming</Text>
          </View>
          <View style={styles.highlightsSourcesRow}>
            {['Sky Sports', 'ESPN', 'beIN'].map((s) => (
              <View key={s} style={styles.highlightsSourceChip}>
                <Text style={styles.highlightsSourceText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderEventsTab = () => {
    if (events.length === 0 && goals.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Activity size={32} color={tokens.textMuted} />
          </View>
          <Text style={styles.emptyStateTitle}>No events yet</Text>
          <Text style={styles.emptyStateSub}>Events will appear as the match progresses</Text>
        </View>
      );
    }

    const sortedEvents = [...events].sort((a: MatchEvent, b: MatchEvent) => {
      const timeA = a.time.elapsed + (a.time.extra || 0) / 100;
      const timeB = b.time.elapsed + (b.time.extra || 0) / 100;
      return timeA - timeB;
    });

    return (
      <View style={styles.eventsSection}>
        {renderWhereToWatchSection()}
        {renderHighlightsSection()}
        <View style={styles.timelineTrack}>
          <View style={styles.timelineCenterLine} />
          {sortedEvents.map((event: MatchEvent, index: number) => {
            const isHomeTeamEvent = event.team?.name === homeTeam;
            const isGoal = event.type === 'Goal';

            return (
              <View key={index} style={styles.timelineEventRow}>
                <View style={[styles.timelineLeft, !isHomeTeamEvent && styles.timelineLeftEmpty]}>
                  {isHomeTeamEvent && (
                    <View style={[styles.eventCard, styles.eventCardHome]}>
                      <Text style={styles.eventPlayerName}>{event.player?.name || 'Unknown'}</Text>
                      {event.assist?.name && event.type === 'Goal' && (
                        <Text style={styles.eventAssistText}>Assist: {event.assist.name}</Text>
                      )}
                      {event.type === 'subst' && (
                        <Text style={styles.eventSubText}>↓ {event.assist?.name}</Text>
                      )}
                      <Text style={styles.eventDetail}>{event.detail}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.timelineCenter}>
                  <View style={[styles.timelineDot, isGoal && styles.timelineDotGoal]}>
                    <Text style={styles.timelineDotEmoji}>{renderEventIcon(event.type, event.detail)}</Text>
                  </View>
                  <View style={styles.timelineTimePill}>
                    <Text style={styles.timelineTimeText}>
                      {event.time.elapsed}&apos;{event.time.extra ? `+${event.time.extra}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={[styles.timelineRight, isHomeTeamEvent && styles.timelineRightEmpty]}>
                  {!isHomeTeamEvent && (
                    <View style={[styles.eventCard, styles.eventCardAway]}>
                      <Text style={[styles.eventPlayerName, styles.textRight]}>{event.player?.name || 'Unknown'}</Text>
                      {event.assist?.name && event.type === 'Goal' && (
                        <Text style={[styles.eventAssistText, styles.textRight]}>Assist: {event.assist.name}</Text>
                      )}
                      {event.type === 'subst' && (
                        <Text style={[styles.eventSubText, styles.textRight]}>↓ {event.assist?.name}</Text>
                      )}
                      <Text style={[styles.eventDetail, styles.textRight]}>{event.detail}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderLineupsTab = () => {
    if (lineups.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}><Users size={32} color={tokens.textMuted} /></View>
          <Text style={styles.emptyStateTitle}>Lineups not available</Text>
          <Text style={styles.emptyStateSub}>Lineups will be available closer to kick-off</Text>
        </View>
      );
    }

    const homeLineup = lineups.find((l: TeamLineup) => l.team?.name === homeTeam) || lineups[0];
    const awayLineup = lineups.find((l: TeamLineup) => l.team?.name === awayTeam) || lineups[1];

    return (
      <View style={styles.lineupsSection}>
        <LineupListView
          homeLineup={homeLineup}
          awayLineup={awayLineup}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeTeamLogo={homeTeamLogo}
          awayTeamLogo={awayTeamLogo}
        />

        <View style={styles.subsCard}>
          <View style={styles.xiHeader}>
            <View style={[styles.xiHeaderIcon, { backgroundColor: '#FFB80018' }]}>
              <Activity size={13} color="#FFB800" />
            </View>
            <Text style={styles.xiHeaderText}>Substitutes</Text>
          </View>

          <View style={styles.subsColumns}>
            <View style={styles.subsCol}>
              <View style={styles.subsColHeader}>
                {homeTeamLogo ? (
                  <Image source={{ uri: homeTeamLogo }} style={styles.subsColLogo} resizeMode="contain" />
                ) : null}
                <Text style={styles.subsColName} numberOfLines={1}>{homeTeam}</Text>
              </View>
              {homeLineup?.substitutes?.slice(0, 7).map((item: any, idx: number) => (
                <View key={idx} style={styles.subRow}>
                  <LineupPlayerAvatar size="sm" player={item.player} accentColor={HOME_COLOR} />
                  <View style={[styles.subNum, { backgroundColor: HOME_COLOR }]}>
                    <Text style={styles.subNumText}>{item.player?.number}</Text>
                  </View>
                  <Text style={styles.subName} numberOfLines={1}>{item.player?.name}</Text>
                </View>
              ))}
            </View>
            <View style={styles.subsDivider} />
            <View style={styles.subsCol}>
              <View style={[styles.subsColHeader, { justifyContent: 'flex-end' }]}>
                <Text style={styles.subsColName} numberOfLines={1}>{awayTeam}</Text>
                {awayTeamLogo ? (
                  <Image source={{ uri: awayTeamLogo }} style={styles.subsColLogo} resizeMode="contain" />
                ) : null}
              </View>
              {awayLineup?.substitutes?.slice(0, 7).map((item: any, idx: number) => (
                <View key={idx} style={styles.subRow}>
                  <LineupPlayerAvatar size="sm" player={item.player} accentColor={AWAY_COLOR} />
                  <View style={[styles.subNum, { backgroundColor: AWAY_COLOR }]}>
                    <Text style={styles.subNumText}>{item.player?.number}</Text>
                  </View>
                  <Text style={[styles.subName, { textAlign: 'right' }]} numberOfLines={1}>{item.player?.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderStatsTab = () => {
    if (statistics.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}><BarChart3 size={32} color={tokens.textMuted} /></View>
          <Text style={styles.emptyStateTitle}>Statistics not available</Text>
          <Text style={styles.emptyStateSub}>Stats will be available during/after the match</Text>
        </View>
      );
    }

    const homeStats = statistics.find((s: TeamStatistic) => s.team?.name === homeTeam) || statistics[0];
    const awayStats = statistics.find((s: TeamStatistic) => s.team?.name === awayTeam) || statistics[1];

    const getStatValue = (stats: TeamStatistic, type: string): number | string => {
      const stat = stats?.statistics?.find((s: any) => s.type === type);
      return stat?.value ?? 0;
    };

    const statTypes = [
      { type: 'Ball Possession', label: 'Possession' },
      { type: 'Total Shots', label: 'Total Shots' },
      { type: 'Shots on Goal', label: 'Shots on Target' },
      { type: 'Corner Kicks', label: 'Corners' },
      { type: 'Fouls', label: 'Fouls' },
      { type: 'Offsides', label: 'Offsides' },
      { type: 'Yellow Cards', label: 'Yellow Cards' },
      { type: 'Red Cards', label: 'Red Cards' },
      { type: 'Passes accurate', label: 'Accurate Passes' },
      { type: 'Passes %', label: 'Pass Accuracy' },
    ];

    return (
      <View style={styles.statsSection}>
        <View style={styles.statsTeamRow}>
          <View style={styles.statsTeamCol}>
            {homeTeamLogo ? (
              <Image source={{ uri: homeTeamLogo }} style={styles.statsTeamLogo} resizeMode="contain" />
            ) : (
              <View style={[styles.statsTeamLogo, styles.statsTeamLogoFallback]}>
                <Text style={styles.statsTeamInit}>{homeTeam.charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.statsTeamName} numberOfLines={1}>{homeTeam}</Text>
          </View>
          <Text style={styles.statsVsText}>VS</Text>
          <View style={styles.statsTeamCol}>
            {awayTeamLogo ? (
              <Image source={{ uri: awayTeamLogo }} style={styles.statsTeamLogo} resizeMode="contain" />
            ) : (
              <View style={[styles.statsTeamLogo, styles.statsTeamLogoFallback]}>
                <Text style={styles.statsTeamInit}>{awayTeam.charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.statsTeamName} numberOfLines={1}>{awayTeam}</Text>
          </View>
        </View>

        <View style={styles.statsListCard}>
          {statTypes.map((stat, index) => (
            <AnimatedStatBar
              key={stat.type}
              homeValue={getStatValue(homeStats, stat.type)}
              awayValue={getStatValue(awayStats, stat.type)}
              label={stat.label}
              delay={index * 60}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderVenueTab = () => {
    const venueInfo: VenueInfo = {
      name: fixture?.fixture?.venue?.name,
      city: fixture?.fixture?.venue?.city,
      capacity: fixture?.fixture?.venue?.capacity,
      image: fixture?.fixture?.venue?.image,
    };

    return (
      <View style={styles.venueSection}>
        {venueInfo.image ? (
          <View style={styles.venueImageContainer}>
            <Image source={{ uri: venueInfo.image }} style={styles.venueImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
              locations={[0, 0.5, 1]}
              style={styles.venueImageOverlay}
            />
            <View style={styles.venueImageInfo}>
              <Text style={styles.venueImageName}>{venueInfo.name || 'Stadium'}</Text>
              {!!venueInfo.city && (
                <View style={styles.venueLocationRow}>
                  <MapPin size={12} color={tokens.accent} />
                  <Text style={styles.venueImageCity}>{venueInfo.city}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.venueNoImage}>
            <Building2 size={36} color={tokens.textMuted} />
            <Text style={styles.venueNoImageName}>{venueInfo.name || 'Stadium TBA'}</Text>
            {!!venueInfo.city && (
              <View style={styles.venueLocationRow}>
                <MapPin size={12} color={tokens.textSecondary} />
                <Text style={styles.venueNoImageCity}>{venueInfo.city}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.venueDetailsGrid}>
          <View style={styles.venueDetailBox}>
            <Building2 size={18} color={tokens.accent} />
            <Text style={styles.venueDetailLabel}>Stadium</Text>
            <Text style={styles.venueDetailVal} numberOfLines={2}>{venueInfo.name || 'TBA'}</Text>
          </View>
          <View style={styles.venueDetailBox}>
            <Users size={18} color="#10B981" />
            <Text style={styles.venueDetailLabel}>Capacity</Text>
            <Text style={styles.venueDetailVal}>{venueInfo.capacity ? venueInfo.capacity.toLocaleString() : 'N/A'}</Text>
          </View>
          <View style={styles.venueDetailBox}>
            <MapPin size={18} color="#FFB800" />
            <Text style={styles.venueDetailLabel}>Location</Text>
            <Text style={styles.venueDetailVal}>{venueInfo.city || 'TBA'}</Text>
          </View>
          <View style={styles.venueDetailBox}>
            <Globe size={18} color={tokens.accentSecondary} />
            <Text style={styles.venueDetailLabel}>Country</Text>
            <Text style={styles.venueDetailVal}>{leagueCountry}</Text>
          </View>
        </View>

        <View style={styles.broadcastCard}>
          <View style={styles.broadcastCardHeader}>
            <Tv size={16} color={tokens.accent} />
            <Text style={styles.broadcastCardTitle}>Where to Watch</Text>
          </View>
          <View style={styles.broadcastChips}>
            {broadcastData.channels.map((channel, index) => (
              <View key={`${channel.name}-${index}`} style={styles.broadcastChip}>
                <Text style={{ fontSize: 10 }}>{channel.icon || '📺'}</Text>
                <Text style={styles.broadcastChipText}>{channel.name}</Text>
                <Text style={styles.broadcastRegionSmall}>{channel.region}</Text>
              </View>
            ))}
          </View>
          {!!broadcastData.note && <Text style={styles.broadcastNote}>{broadcastData.note}</Text>}
          <Text style={styles.broadcastNote}>Availability may vary by region and subscription</Text>
        </View>

        {!!venueInfo.city && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherCardHeader}>
              <Cloud size={16} color="#60A5FA" />
              <Text style={styles.weatherCardTitle}>Match Day Weather</Text>
            </View>
            {weatherLoading ? (
              <View style={styles.weatherLoadingRow}>
                <ActivityIndicator size="small" color="#60A5FA" />
                <Text style={styles.weatherLoadingText}>Loading weather...</Text>
              </View>
            ) : weatherData ? (
              <View style={styles.weatherContent}>
                <View style={styles.weatherMainRow}>
                  <Image
                    source={{ uri: `https://openweathermap.org/img/wn/${weatherData.icon}@2x.png` }}
                    style={styles.weatherIcon}
                  />
                  <View>
                    <Text style={styles.weatherTemp}>{weatherData.temp}°C</Text>
                    <Text style={styles.weatherDesc}>{weatherData.description}</Text>
                  </View>
                </View>
                <View style={styles.weatherDetailsRow}>
                  <View style={styles.weatherDetailItem}>
                    <Thermometer size={12} color="#60A5FA" />
                    <Text style={styles.weatherDetailLabel}>Feels</Text>
                    <Text style={styles.weatherDetailVal}>{weatherData.feels_like}°C</Text>
                  </View>
                  <View style={styles.weatherDetailItem}>
                    <Droplets size={12} color="#60A5FA" />
                    <Text style={styles.weatherDetailLabel}>Humidity</Text>
                    <Text style={styles.weatherDetailVal}>{weatherData.humidity}%</Text>
                  </View>
                  <View style={styles.weatherDetailItem}>
                    <Wind size={12} color="#60A5FA" />
                    <Text style={styles.weatherDetailLabel}>Wind</Text>
                    <Text style={styles.weatherDetailVal}>{weatherData.wind_speed} km/h</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.weatherUnavail}>Weather data unavailable</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const getFormResult = (match: any, teamId: number): 'W' | 'D' | 'L' => {
    const isHome = match.teams?.home?.id === teamId;
    const homeGoals = match.goals?.home ?? 0;
    const awayGoals = match.goals?.away ?? 0;
    if (isHome) {
      if (homeGoals > awayGoals) return 'W';
      if (homeGoals < awayGoals) return 'L';
      return 'D';
    } else {
      if (awayGoals > homeGoals) return 'W';
      if (awayGoals < homeGoals) return 'L';
      return 'D';
    }
  };

  const getFormColor = (result: 'W' | 'D' | 'L'): string => {
    if (result === 'W') return '#10B981';
    if (result === 'L') return '#EF4444';
    return '#6B7280';
  };

  const renderFormTab = () => {
    const homeTeamId = fixture?.teams?.home?.id;
    const awayTeamId = fixture?.teams?.away?.id;
    const leagueName = fixture?.league?.name || league;

    if (homeFormData.length === 0 && awayFormData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}><TrendingUp size={32} color={tokens.textMuted} /></View>
          <Text style={styles.emptyStateTitle}>Form not available</Text>
          <Text style={styles.emptyStateSub}>Recent results will appear when available</Text>
        </View>
      );
    }

    const renderTeamForm = (formMatches: any[], teamId: number, teamName: string, teamLogo?: string, accent: string = HOME_COLOR) => {
      const results = formMatches.map(m => getFormResult(m, teamId));
      const wins = results.filter(r => r === 'W').length;
      const draws = results.filter(r => r === 'D').length;
      const losses = results.filter(r => r === 'L').length;

      return (
        <View style={styles.formTeamCard}>
          <View style={styles.formTeamHeader}>
            <View style={styles.formTeamInfo}>
              {teamLogo ? (
                <Image source={{ uri: teamLogo }} style={styles.formTeamLogo} resizeMode="contain" />
              ) : (
                <View style={[styles.formTeamLogoFallback, { backgroundColor: accent + '20' }]}>
                  <Shield size={14} color={accent} />
                </View>
              )}
              <View>
                <Text style={styles.formTeamName} numberOfLines={1}>{teamName}</Text>
                <Text style={styles.formLeagueName}>{leagueName}</Text>
              </View>
            </View>
            <View style={styles.formWDL}>
              <View style={[styles.formWDLPill, { backgroundColor: '#10B98118' }]}>
                <Text style={[styles.formWDLText, { color: '#10B981' }]}>{wins}W</Text>
              </View>
              <View style={[styles.formWDLPill, { backgroundColor: '#6B728018' }]}>
                <Text style={[styles.formWDLText, { color: '#6B7280' }]}>{draws}D</Text>
              </View>
              <View style={[styles.formWDLPill, { backgroundColor: '#EF444418' }]}>
                <Text style={[styles.formWDLText, { color: '#EF4444' }]}>{losses}L</Text>
              </View>
            </View>
          </View>

          <View style={styles.formDotsRow}>
            {results.map((result, i) => (
              <View key={i} style={[styles.formDot, { backgroundColor: getFormColor(result) }, i === results.length - 1 && styles.formDotLatest]}>
                <Text style={[styles.formDotText, i === results.length - 1 && styles.formDotTextLatest]}>{result}</Text>
              </View>
            ))}
          </View>

          {formMatches.map((match: any, index: number) => {
            const isHome = match.teams?.home?.id === teamId;
            const result = getFormResult(match, teamId);
            const resultColor = getFormColor(result);
            const matchDate = match.fixture?.date ? new Date(match.fixture.date) : null;
            const opponent = isHome ? match.teams?.away : match.teams?.home;
            const homeGoals = match.goals?.home ?? 0;
            const awayGoals = match.goals?.away ?? 0;

            return (
              <View key={index} style={styles.formMatchRow}>
                <View style={[styles.formResultBadge, { backgroundColor: resultColor }]}>
                  <Text style={styles.formResultText}>{result}</Text>
                </View>
                <View style={styles.formMatchInfo}>
                  <View style={styles.formMatchOpponent}>
                    {opponent?.logo && <Image source={{ uri: opponent.logo }} style={styles.formOpponentLogo} resizeMode="contain" />}
                    <Text style={styles.formOpponentName} numberOfLines={1}>{isHome ? 'vs' : '@'} {opponent?.name || 'Unknown'}</Text>
                  </View>
                  {matchDate && <Text style={styles.formMatchDate}>{matchDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>}
                </View>
                <View style={[styles.formScorePill, { borderColor: resultColor + '40' }]}>
                  <Text style={[styles.formScoreText, { color: resultColor }]}>{homeGoals} - {awayGoals}</Text>
                </View>
              </View>
            );
          })}
        </View>
      );
    };

    return (
      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Last 5 {leagueName} Matches</Text>
        {homeTeamId && homeFormData.length > 0 && renderTeamForm(homeFormData, homeTeamId, homeTeam, homeTeamLogo, HOME_COLOR)}
        {awayTeamId && awayFormData.length > 0 && renderTeamForm(awayFormData, awayTeamId, awayTeam, awayTeamLogo, AWAY_COLOR)}
      </View>
    );
  };

  const renderH2HTab = () => {
    if (headToHead.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}><History size={32} color={tokens.textMuted} /></View>
          <Text style={styles.emptyStateTitle}>No head-to-head data</Text>
          <Text style={styles.emptyStateSub}>H2H history will appear when available</Text>
        </View>
      );
    }

    const homeWins = headToHead.filter((m: H2HMatch) =>
      (m.teams.home.name === homeTeam && m.teams.home.winner) ||
      (m.teams.away.name === homeTeam && m.teams.away.winner)
    ).length;
    const awayWins = headToHead.filter((m: H2HMatch) =>
      (m.teams.home.name === awayTeam && m.teams.home.winner) ||
      (m.teams.away.name === awayTeam && m.teams.away.winner)
    ).length;
    const draws = headToHead.filter((m: H2HMatch) =>
      m.teams.home.winner === null && m.teams.away.winner === null
    ).length;
    const total = homeWins + awayWins + draws;

    return (
      <View style={styles.h2hSection}>
        <View style={styles.h2hSummaryCard}>
          <View style={styles.h2hTeam}>
            {homeTeamLogo ? (
              <Image source={{ uri: homeTeamLogo }} style={styles.h2hTeamLogo} resizeMode="contain" />
            ) : (
              <View style={[styles.h2hTeamLogo, styles.h2hTeamLogoFallback]}>
                <Text style={styles.h2hTeamInit}>{homeTeam.charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.h2hWinCount}>{homeWins}</Text>
            <Text style={styles.h2hTeamName} numberOfLines={1}>{homeTeam}</Text>
            <View style={styles.h2hBar}>
              <View style={[styles.h2hBarFill, { width: `${total > 0 ? (homeWins / total) * 100 : 0}%`, backgroundColor: HOME_COLOR }]} />
            </View>
          </View>

          <View style={styles.h2hCenter}>
            <View style={styles.h2hDrawCircle}>
              <Text style={styles.h2hDrawCount}>{draws}</Text>
            </View>
            <Text style={styles.h2hDrawLabel}>Draws</Text>
            <Text style={styles.h2hTotalText}>{total} played</Text>
          </View>

          <View style={styles.h2hTeam}>
            {awayTeamLogo ? (
              <Image source={{ uri: awayTeamLogo }} style={styles.h2hTeamLogo} resizeMode="contain" />
            ) : (
              <View style={[styles.h2hTeamLogo, styles.h2hTeamLogoFallback]}>
                <Text style={styles.h2hTeamInit}>{awayTeam.charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.h2hWinCount}>{awayWins}</Text>
            <Text style={styles.h2hTeamName} numberOfLines={1}>{awayTeam}</Text>
            <View style={styles.h2hBar}>
              <View style={[styles.h2hBarFill, { width: `${total > 0 ? (awayWins / total) * 100 : 0}%`, backgroundColor: AWAY_COLOR }]} />
            </View>
          </View>
        </View>

        <Text style={styles.h2hRecentTitle}>Recent Meetings</Text>
        {headToHead.slice(0, 5).map((match: H2HMatch, index: number) => {
          const matchDate = new Date(match.fixture.date);
          const isHomeWin = match.teams.home.winner;
          const isAwayWin = match.teams.away.winner;

          return (
            <View key={index} style={styles.h2hMatchCard}>
              <View style={styles.h2hMatchTeams}>
                <Text style={[styles.h2hMatchTeamName, isHomeWin && styles.h2hMatchWinner]} numberOfLines={1}>
                  {match.teams.home.name}
                </Text>
                <View style={styles.h2hMatchScoreBox}>
                  <Text style={styles.h2hMatchScoreText}>
                    {match.goals.home ?? 0} - {match.goals.away ?? 0}
                  </Text>
                </View>
                <Text style={[styles.h2hMatchTeamName, styles.textRight, isAwayWin && styles.h2hMatchWinner]} numberOfLines={1}>
                  {match.teams.away.name}
                </Text>
              </View>
              <Text style={styles.h2hMatchDate}>
                {matchDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • {match.league.name}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const matchDateStr = fixture?.fixture?.date
    ? new Date(fixture.fixture.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <MatchModalShellContext.Provider value={{ tokens, styles }}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        <Animated.View
          style={[styles.modalSheet, {
            transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [800, 0] }) }],
          }]}
        >
          <View style={styles.modalHandle}>
            <View style={styles.handleBar} />
          </View>

          <LinearGradient
            colors={[tokens.surfaceMain, tokens.gradientMid, tokens.surfaceMain]}
            style={styles.modalBody}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Animated.View style={[styles.topBar, { opacity: headerAnim }]}>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <X size={20} color={tokens.textPrimary} />
              </TouchableOpacity>
              <View
                style={styles.topBarCenter}
                accessibilityRole="image"
                accessibilityLabel={`${leagueName} competition`}
              >
                {leagueLogo ? (
                  <Image
                    source={{ uri: leagueLogo }}
                    style={styles.topBarLeagueLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.topBarLeagueFallback}>
                    <Text style={styles.topBarLeagueFallbackText}>
                      {leagueName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ width: 36 }} />
            </Animated.View>

            <Animated.View style={[styles.heroSection, { opacity: headerAnim }]}>
              <View style={styles.heroTeamsRow}>
                <View style={styles.heroTeamCol}>
                  <View style={styles.heroLogoRing}>
                    {homeTeamLogo ? (
                      <Image source={{ uri: homeTeamLogo }} style={styles.heroLogo} resizeMode="contain" />
                    ) : (
                      <Text style={styles.heroLogoInit}>{homeTeam.charAt(0)}</Text>
                    )}
                  </View>
                  <Text style={styles.heroTeamName} numberOfLines={2}>{homeTeam}</Text>
                </View>

                <View style={styles.heroScoreArea}>
                  <View style={styles.heroScoreContainer}>
                    <Text style={styles.heroScore}>{homeScore ?? 0}</Text>
                    <View style={styles.heroScoreDivider}>
                      <View style={styles.heroScoreDividerDot} />
                      <View style={styles.heroScoreDividerDot} />
                    </View>
                    <Text style={styles.heroScore}>{awayScore ?? 0}</Text>
                  </View>
                  {isLive && fixture?.fixture?.status?.elapsed && (
                    <View style={styles.liveBadge}>
                      <View style={styles.livePulse} />
                      <Text style={styles.liveText}>
                        {fixture.fixture.status.elapsed}&apos; • LIVE
                      </Text>
                    </View>
                  )}
                  {isCompleted && (
                    <View style={styles.ftBadge}>
                      <Text style={styles.ftText}>{matchStatus}</Text>
                    </View>
                  )}
                  {!isLive && !isCompleted && matchDateStr !== '' && (
                    <Text style={styles.heroMatchDate}>{matchDateStr}</Text>
                  )}
                  {roundLabel ? (
                    <View
                      style={[
                        styles.heroRoundBadge,
                        isKnockoutRound && styles.heroRoundBadgeKnockout,
                      ]}
                    >
                      <Text
                        style={[
                          styles.heroRoundText,
                          isKnockoutRound && styles.heroRoundTextKnockout,
                        ]}
                      >
                        {roundLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.heroTeamCol}>
                  <View style={styles.heroLogoRing}>
                    {awayTeamLogo ? (
                      <Image source={{ uri: awayTeamLogo }} style={styles.heroLogo} resizeMode="contain" />
                    ) : (
                      <Text style={styles.heroLogoInit}>{awayTeam.charAt(0)}</Text>
                    )}
                  </View>
                  <Text style={styles.heroTeamName} numberOfLines={2}>{awayTeam}</Text>
                </View>
              </View>

              {fixture?.fixture?.venue?.name && (
                <View style={styles.heroVenueRow}>
                  <MapPin size={11} color={tokens.textMuted} />
                  <Text style={styles.heroVenueText}>{fixture.fixture.venue.name}</Text>
                </View>
              )}
            </Animated.View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabScroll}
              contentContainerStyle={styles.tabScrollContent}
            >
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabPill, activeTab === tab.id && styles.tabPillActive]}
                  onPress={() => handleTabPress(tab.id)}
                  activeOpacity={0.7}
                >
                  {tab.icon}
                  <Text style={[styles.tabPillText, activeTab === tab.id && styles.tabPillTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
              {isLoading ? (
                <View style={styles.loadingArea}>
                  <ActivityIndicator size="large" color={tokens.accent} />
                  <Text style={styles.loadingText}>Loading match details...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorArea}>
                  <AlertTriangle size={32} color={COLORS.error} />
                  <Text style={styles.errorText}>Failed to load match details</Text>
                  <Text style={styles.errorSub}>Please try again later</Text>
                </View>
              ) : (
                <>
                  {activeTab === 'events' && renderEventsTab()}
                  {activeTab === 'lineups' && renderLineupsTab()}
                  {activeTab === 'stats' && renderStatsTab()}
                  {activeTab === 'form' && renderFormTab()}
                  {activeTab === 'h2h' && renderH2HTab()}
                  {activeTab === 'venue' && renderVenueTab()}
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </View>
      </MatchModalShellContext.Provider>
    </Modal>
  );
}

function createMatchModalStyles(t: MatchModalTokens) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: t.surfaceMain,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '95%',
    overflow: 'hidden',
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: t.surfaceMain,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.handleBar,
  },
  modalBody: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  topBarLeagueLogo: {
    width: 32,
    height: 32,
  },
  topBarLeagueFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarLeagueFallbackText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: t.textSecondary,
  },
  heroRoundBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: t.surfaceElevated,
  },
  heroRoundBadgeKnockout: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  heroRoundText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: t.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  heroRoundTextKnockout: {
    color: '#D97706',
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  heroTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTeamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  /** Layout only — logo renders without ring/border (same pattern as onboarding team pickers) */
  heroLogoRing: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroLogo: {
    width: 52,
    height: 52,
  },
  heroLogoInit: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: t.textPrimary,
  },
  heroTeamName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: t.textPrimary,
    textAlign: 'center',
    maxWidth: 95,
  },
  heroScoreArea: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  heroScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroScore: {
    fontSize: 36,
    fontWeight: '900' as const,
    color: t.heroScore,
    letterSpacing: -1,
  },
  heroScoreDivider: {
    gap: 4,
    alignItems: 'center',
  },
  heroScoreDividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.textMuted,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EF444420',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#EF4444',
    letterSpacing: 0.3,
  },
  ftBadge: {
    backgroundColor: t.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  ftText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: t.textSecondary,
    letterSpacing: 0.5,
  },
  heroMatchDate: {
    fontSize: 11,
    color: t.textMuted,
    marginTop: 8,
  },
  heroVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
  },
  heroVenueText: {
    fontSize: 11,
    color: t.textMuted,
    fontWeight: '500' as const,
  },
  tabScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: t.surfaceCard,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  tabPillActive: {
    backgroundColor: t.accent + '15',
    borderColor: t.accent + '40',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: t.textMuted,
  },
  tabPillTextActive: {
    color: t.accent,
    fontWeight: '700' as const,
  },
  contentScroll: {
    flex: 1,
  },
  loadingArea: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    color: t.textSecondary,
    fontWeight: '500' as const,
  },
  errorArea: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: t.textPrimary,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 13,
    color: t.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    paddingVertical: 50,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: t.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: t.textPrimary,
    textAlign: 'center',
  },
  emptyStateSub: {
    fontSize: 13,
    color: t.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  highlightsCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: t.surfaceMain,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: t.borderSubtle,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  highlightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.borderSubtle,
    backgroundColor: t.surfaceCard,
  },
  highlightsTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  highlightsIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: t.surfaceElevated,
    borderWidth: 1,
    borderColor: t.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightsTitleTextCol: {
    gap: 2,
    flexShrink: 1,
  },
  highlightsKicker: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.6,
    color: t.textMuted,
  },
  highlightsHeadline: {
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: t.textPrimary,
  },
  highlightsDatePill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: t.surfaceElevated,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  highlightsDate: {
    fontSize: 11,
    color: t.textSecondary,
    fontWeight: '600' as const,
  },
  highlightsVideoTouch: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  highlightsVideoBg: {
    paddingVertical: 22,
    paddingHorizontal: 14,
    alignItems: 'center',
    minHeight: 168,
    justifyContent: 'space-between',
  },
  highlightsVideoSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 72,
  },
  highlightsTeamsDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 4,
  },
  highlightsTeamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  highlightsLogoRing: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  highlightsTeamLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  highlightsTeamLogoFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightsTeamInit: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  highlightsTeamNameOnDark: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 14,
  },
  highlightsScoreCol: {
    alignItems: 'center',
    paddingHorizontal: 8,
    minWidth: 96,
  },
  highlightsScoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  highlightsScoreText: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  highlightsScoreDivider: {
    fontSize: 26,
    fontWeight: '300' as const,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 2,
  },
  highlightsFtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  highlightsFtDot: {
    width: 12,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  highlightsFTLabel: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2,
  },
  highlightsPlayColumn: {
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingBottom: 2,
  },
  highlightsPlayGlass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  highlightsPlayCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  highlightsPlayIconNudge: {
    marginLeft: 3,
  },
  highlightsPlayPrimary: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  highlightsYtHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightsYtDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF0033',
  },
  highlightsPlaySecondary: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.2,
  },
  highlightsGoalsList: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.borderSubtle,
    backgroundColor: t.surfaceCard,
  },
  highlightsGoalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  highlightsGoalsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  highlightsGoalsTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: t.textPrimary,
    letterSpacing: -0.2,
  },
  highlightsGoalsCaption: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: t.textMuted,
  },
  highlightsGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingLeft: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  highlightsGoalTintHome: {
    backgroundColor: HOME_COLOR + '0D',
  },
  highlightsGoalTintAway: {
    backgroundColor: AWAY_COLOR + '0D',
  },
  highlightsGoalBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightsGoalIcon: {
    fontSize: 15,
  },
  highlightsGoalInfo: {
    flex: 1,
    gap: 2,
  },
  highlightsGoalPlayer: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: t.textPrimary,
    letterSpacing: -0.2,
  },
  highlightsGoalAssist: {
    fontSize: 12,
    color: t.textMuted,
    fontWeight: '500' as const,
  },
  highlightsGoalAssistName: {
    color: t.textSecondary,
    fontWeight: '600' as const,
  },
  highlightsGoalTimeShell: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: t.surfaceElevated,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  highlightsGoalTimeText: {
    fontSize: 12,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'],
  },
  highlightsSources: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.borderSubtle,
    backgroundColor: t.surfaceMain,
    gap: 10,
  },
  highlightsSourcesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightsSourcesLabel: {
    fontSize: 11,
    color: t.textSecondary,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  highlightsSourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlightsSourceChip: {
    backgroundColor: t.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  highlightsSourceText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: t.textSecondary,
    letterSpacing: -0.1,
  },
  eventsSection: {
    paddingBottom: 20,
  },
  timelineTrack: {
    paddingHorizontal: 16,
    position: 'relative',
  },
  timelineCenterLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: t.borderSubtle,
  },
  timelineEventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timelineLeft: {
    flex: 1,
    paddingRight: 8,
    alignItems: 'flex-end',
  },
  timelineLeftEmpty: {
    opacity: 0,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 8,
  },
  timelineRightEmpty: {
    opacity: 0,
  },
  timelineCenter: {
    alignItems: 'center',
    width: 50,
    zIndex: 2,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: t.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: t.surfaceCard,
  },
  timelineDotGoal: {
    backgroundColor: '#FFB80030',
    borderColor: '#FFB80050',
  },
  timelineDotEmoji: {
    fontSize: 13,
  },
  timelineTimePill: {
    backgroundColor: t.surfaceMain,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  timelineTimeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: t.textSecondary,
  },
  eventCard: {
    padding: 10,
    borderRadius: 10,
    maxWidth: '95%',
  },
  eventCardHome: {
    backgroundColor: HOME_COLOR + '0D',
    borderWidth: 1,
    borderColor: HOME_COLOR + '15',
    alignSelf: 'flex-end',
  },
  eventCardAway: {
    backgroundColor: AWAY_COLOR + '0D',
    borderWidth: 1,
    borderColor: AWAY_COLOR + '15',
    alignSelf: 'flex-start',
  },
  eventPlayerName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: t.textPrimary,
    marginBottom: 2,
  },
  eventAssistText: {
    fontSize: 11,
    color: t.textSecondary,
  },
  eventSubText: {
    fontSize: 11,
    color: t.accent,
  },
  eventDetail: {
    fontSize: 10,
    color: t.textMuted,
    marginTop: 2,
  },
  textRight: {
    textAlign: 'right',
  },
  lineupsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  lineupContainer: {
    marginBottom: 16,
  },
  lineupToggle: {
    flexDirection: 'row',
    backgroundColor: t.surfaceCard,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  lineupToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  lineupToggleLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  lineupToggleLogoFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineupToggleInitial: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  lineupToggleName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: t.textMuted,
    flex: 1,
  },
  lineupToggleIndicator: {
    width: 3,
    height: 20,
    borderRadius: 2,
  },
  lineupInfoCard: {
    backgroundColor: t.surfaceCard,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
  },
  lineupInfoAccent: {
    height: 3,
  },
  lineupInfoBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  lineupInfoLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  lineupInfoLogoFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineupInfoLogoInit: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  lineupInfoText: {
    flex: 1,
  },
  lineupInfoTeamName: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: t.textPrimary,
    marginBottom: 4,
  },
  lineupInfoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formationChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  formationChipText: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  lineupCoachText: {
    fontSize: 11,
    color: t.textMuted,
    fontWeight: '500' as const,
  },
  xiSection: {
    marginBottom: 4,
  },
  xiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  xiHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  xiHeaderText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: t.textPrimary,
  },
  posGroup: {
    marginBottom: 12,
  },
  posGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  posGroupLine: {
    flex: 1,
    height: 1,
  },
  posGroupLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: t.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  playersList: {
    gap: 4,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surfaceCard,
    borderRadius: 10,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  playerAvatar: {
    borderWidth: 1,
    overflow: 'hidden' as const,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.surfaceElevated,
    borderColor: t.borderSubtle,
  },
  playerAvatarInitial: {
    fontWeight: '800' as const,
  },
  playerNum: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerNumText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#000',
  },
  playerName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: t.textPrimary,
    flex: 1,
  },
  playerPos: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: t.textMuted,
    backgroundColor: t.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subsCard: {
    backgroundColor: t.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  subsColumns: {
    flexDirection: 'row',
  },
  subsCol: {
    flex: 1,
  },
  subsDivider: {
    width: 1,
    backgroundColor: t.borderSubtle,
    marginHorizontal: 10,
  },
  subsColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: t.borderSubtle,
  },
  subsColLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  subsColName: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: t.textPrimary,
    flex: 1,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  subNum: {
    width: 20,
    height: 20,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subNumText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#000',
  },
  subName: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: t.textSecondary,
    flex: 1,
  },
  statsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  statsTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  statsTeamCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statsTeamLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  statsTeamLogoFallback: {
    backgroundColor: t.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsTeamInit: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: t.textPrimary,
  },
  statsTeamName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: t.textSecondary,
    textAlign: 'center',
    maxWidth: 100,
  },
  statsVsText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: t.textMuted,
    letterSpacing: 1,
  },
  statsListCard: {
    backgroundColor: t.surfaceCard,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.borderSubtle,
  },
  statValue: {
    width: 48,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700' as const,
    color: t.textSecondary,
  },
  statWinner: {
    color: HOME_COLOR,
    fontSize: 15,
  },
  statWinnerAway: {
    color: AWAY_COLOR,
    fontSize: 15,
  },
  statCenter: {
    flex: 1,
    paddingHorizontal: 10,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: t.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  statBarTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: t.surfaceElevated,
  },
  statBarHome: {
    backgroundColor: HOME_COLOR,
    height: '100%',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  statBarAway: {
    backgroundColor: AWAY_COLOR,
    height: '100%',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  venueSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  venueImageContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  venueImage: {
    width: '100%',
    height: '100%',
  },
  venueImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  venueImageInfo: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  venueImageName: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#fff',
    marginBottom: 4,
  },
  venueLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  venueImageCity: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600' as const,
  },
  venueNoImage: {
    height: 140,
    backgroundColor: t.surfaceCard,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  venueNoImageName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: t.textPrimary,
  },
  venueNoImageCity: {
    fontSize: 13,
    color: t.textSecondary,
  },
  venueDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  venueDetailBox: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: t.surfaceCard,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  venueDetailLabel: {
    fontSize: 10,
    color: t.textMuted,
    fontWeight: '500' as const,
  },
  venueDetailVal: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: t.textPrimary,
    textAlign: 'center',
  },
  broadcastCard: {
    backgroundColor: t.surfaceCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  broadcastCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  broadcastCardTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: t.textPrimary,
  },
  broadcastChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  broadcastChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: t.surfaceElevated,
    borderWidth: 1,
    borderColor: t.accent + '15',
  },
  broadcastChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: t.accent,
  },
  broadcastNote: {
    fontSize: 10,
    color: t.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  weatherCard: {
    backgroundColor: t.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.15)',
  },
  weatherCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  weatherCardTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: t.textPrimary,
  },
  weatherLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  weatherLoadingText: {
    fontSize: 12,
    color: '#60A5FA',
  },
  weatherContent: {
    gap: 12,
  },
  weatherMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weatherIcon: {
    width: 52,
    height: 52,
  },
  weatherTemp: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#60A5FA',
  },
  weatherDesc: {
    fontSize: 13,
    color: t.textSecondary,
    textTransform: 'capitalize',
  },
  weatherDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: t.surfaceElevated,
    borderRadius: 10,
    padding: 10,
  },
  weatherDetailItem: {
    alignItems: 'center',
    gap: 3,
  },
  weatherDetailLabel: {
    fontSize: 9,
    color: t.textMuted,
    fontWeight: '500' as const,
  },
  weatherDetailVal: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#60A5FA',
  },
  weatherUnavail: {
    fontSize: 12,
    color: t.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  h2hSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  h2hSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.surfaceCard,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  h2hTeam: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  h2hTeamLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  h2hTeamLogoFallback: {
    backgroundColor: t.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  h2hTeamInit: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: t.textPrimary,
  },
  h2hWinCount: {
    fontSize: 30,
    fontWeight: '900' as const,
    color: t.textPrimary,
  },
  h2hTeamName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: t.textSecondary,
    textAlign: 'center',
    maxWidth: 75,
  },
  h2hBar: {
    width: '80%',
    height: 3,
    borderRadius: 2,
    backgroundColor: t.surfaceElevated,
    overflow: 'hidden',
  },
  h2hBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  h2hCenter: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  h2hDrawCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  h2hDrawCount: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: t.textPrimary,
  },
  h2hDrawLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: t.textSecondary,
  },
  h2hTotalText: {
    fontSize: 9,
    color: t.textMuted,
    marginTop: 3,
  },
  h2hRecentTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: t.textPrimary,
    marginBottom: 10,
  },
  h2hMatchCard: {
    backgroundColor: t.surfaceCard,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  h2hMatchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  h2hMatchTeamName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500' as const,
    color: t.textSecondary,
  },
  h2hMatchWinner: {
    fontWeight: '700' as const,
    color: '#10B981',
  },
  h2hMatchScoreBox: {
    backgroundColor: t.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  h2hMatchScoreText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: t.textPrimary,
  },
  h2hMatchDate: {
    fontSize: 10,
    color: t.textMuted,
    textAlign: 'center',
  },
  formSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: t.textPrimary,
    marginBottom: 16,
  },
  formTeamCard: {
    backgroundColor: t.surfaceCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  formTeamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  formTeamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  formTeamLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  formTeamLogoFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTeamName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: t.textPrimary,
    maxWidth: 110,
  },
  formLeagueName: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: t.textMuted,
    marginTop: 1,
  },
  formWDL: {
    flexDirection: 'row',
    gap: 4,
  },
  formWDLPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  formWDLText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  formDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  formDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formDotLatest: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  formDotText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  formDotTextLatest: {
    fontSize: 14,
  },
  formMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: t.borderSubtle,
    gap: 8,
  },
  formResultBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formResultText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  formMatchInfo: {
    flex: 1,
  },
  formMatchOpponent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  formOpponentLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  formOpponentName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: t.textSecondary,
    flex: 1,
  },
  formMatchDate: {
    fontSize: 10,
    color: t.textMuted,
    marginTop: 1,
  },
  formScorePill: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: t.surfaceElevated,
  },
  formScoreText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  watchCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  watchCardGradient: {
    padding: 16,
  },
  watchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  watchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  watchIconBg: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: t.textPrimary,
  },
  watchTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: t.accent + '12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  watchTimeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: t.accent,
  },
  watchChannelsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  watchChannelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  watchChannelIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchChannelEmoji: {
    fontSize: 12,
  },
  watchChannelInfo: {
    gap: 1,
  },
  watchChannelName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: t.textPrimary,
  },
  watchChannelRegion: {
    fontSize: 9,
    fontWeight: '500' as const,
    color: t.textMuted,
  },
  watchNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  watchNoteText: {
    fontSize: 11,
    color: t.textSecondary,
    fontWeight: '500' as const,
  },
  watchDisclaimer: {
    fontSize: 9,
    color: t.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  broadcastRegionSmall: {
    fontSize: 9,
    color: t.textMuted,
    fontWeight: '500' as const,
  },
});
}
