import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  RefreshControl, 
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { 
  Trophy, 
  Calendar, 
  RefreshCw, 
  Star, 
  AlertCircle,
  MapPin,
  Shield,
  Radio,
  CheckCircle2,
  ChevronRight,
  Flame,
  X,
  Heart,
  BarChart3,
  Clock,
  Bell,
  BellOff,
  Pin,
  Swords,
  Flag,
} from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTheme } from '@/hooks/useTheme';
import { trpc } from '@/lib/trpc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CompetitionFilter from '@/components/CompetitionFilter';
import MatchDetailsModal from '@/components/MatchDetailsModal';
import LeagueStandingsModal from '@/components/LeagueStandingsModal';
import TabWalkthrough from '@/components/TabWalkthrough';
import UFCFightDetailModal from '@/components/UFCFightDetailModal';
import F1Section from '@/components/F1Section';
import NBASection from '@/components/NBASection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SportMode = 'football' | 'ufc' | 'f1' | 'nba';

interface UFCFight {
  id: number;
  date: string;
  time: string;
  status: 'Upcoming' | 'Live' | 'Completed';
  statusShort: string;
  event: string;
  category: string;
  fighter1: {
    id: number;
    name: string;
    photo?: string;
    winner?: boolean;
  };
  fighter2: {
    id: number;
    name: string;
    photo?: string;
    winner?: boolean;
  };
  result?: {
    method?: string;
    round?: number;
    time?: string;
  };
}

let mmaIdCounter = 0;
function transformMmaFightData(fights: any[]): UFCFight[] {
  if (!Array.isArray(fights)) return [];

  return fights.map((fight: any, _index: number) => {
    const statusShort = fight.status?.short || 'NS';
    let fightStatus: 'Upcoming' | 'Live' | 'Completed' = 'Upcoming';
    if (statusShort === 'FT' || statusShort === 'EOR' || statusShort === 'AW') {
      fightStatus = 'Completed';
    } else if (statusShort === 'LIVE' || statusShort === 'IN') {
      fightStatus = 'Live';
    }

    const date = new Date(fight.date || Date.now());
    const timeString = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });

    const fighters = fight.fighters || {};
    const f1 = fighters.first || fighters[0] || {};
    const f2 = fighters.second || fighters[1] || {};

    const result = fight.result || {};
    const r1 = result.first || {};
    const r2 = result.second || {};

    const f1Photo = f1.photo || f1.logo || undefined;
    const f2Photo = f2.photo || f2.logo || undefined;

    console.log(`[MMA Transform] Fight ${fight.id}: ${f1.name || 'TBA'} vs ${f2.name || 'TBA'} | Status: ${statusShort} | Photos: ${!!f1Photo}, ${!!f2Photo} | Method: ${result.method || 'N/A'}`);

    return {
      id: fight.id || -(++mmaIdCounter),
      date: fight.date || new Date().toISOString(),
      time: timeString,
      status: fightStatus,
      statusShort,
      event: fight.league?.name || fight.slug || 'UFC Event',
      category: fight.category?.name || fight.weight?.name || 'TBD',
      fighter1: {
        id: f1.id || 0,
        name: f1.name || 'TBA',
        photo: f1Photo,
        winner: r1.winner === true || f1.winner === true,
      },
      fighter2: {
        id: f2.id || 0,
        name: f2.name || 'TBA',
        photo: f2Photo,
        winner: r2.winner === true || f2.winner === true,
      },
      result: (result.method || result.round || result.time) ? {
        method: result.method,
        round: result.round,
        time: result.time,
      } : undefined,
    };
  });
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: number;
  awayTeamId?: number;
  homeScore: number | null;
  awayScore: number | null;
  status: 'Live' | 'Upcoming' | 'Completed';
  league: string;
  leagueId: number;
  leagueCountry: string;
  date: string;
  time: string;
  venue?: string;
  venueCity?: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  leagueLogo?: string;
  elapsed?: number;
}

let footballIdCounter = 0;
function transformApiFootballData(fixtures: any[]): Match[] {
  if (!Array.isArray(fixtures)) return [];
  
  return fixtures.map((fixture: any, _index: number) => {
    const status = fixture.fixture?.status?.short;
    let matchStatus: 'Live' | 'Upcoming' | 'Completed' = 'Upcoming';
    
    if (status === 'LIVE' || status === '1H' || status === '2H' || status === 'HT' || status === 'ET' || status === 'P' || status === 'BT') {
      matchStatus = 'Live';
    } else if (status === 'FT' || status === 'AET' || status === 'PEN' || status === 'AWD' || status === 'WO') {
      matchStatus = 'Completed';
    }

    const date = new Date(fixture.fixture?.date || Date.now());
    const timeString = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });

    return {
      id: String(fixture.fixture?.id || `gen-${++footballIdCounter}`),
      homeTeam: fixture.teams?.home?.name || 'Home Team',
      awayTeam: fixture.teams?.away?.name || 'Away Team',
      homeTeamId: fixture.teams?.home?.id,
      awayTeamId: fixture.teams?.away?.id,
      homeScore: fixture.goals?.home ?? null,
      awayScore: fixture.goals?.away ?? null,
      status: matchStatus,
      league: fixture.league?.name || 'League',
      leagueId: fixture.league?.id || 0,
      leagueCountry: fixture.league?.country || '',
      date: fixture.fixture?.date || new Date().toISOString(),
      time: timeString,
      venue: fixture.fixture?.venue?.name,
      venueCity: fixture.fixture?.venue?.city,
      homeTeamLogo: fixture.teams?.home?.logo,
      awayTeamLogo: fixture.teams?.away?.logo,
      leagueLogo: fixture.league?.logo,
      elapsed: fixture.fixture?.status?.elapsed,
    };
  });
}

const LivePulse = ({ color = '#FF3B30', size = 8 }: { color?: string; size?: number }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 2.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, opacityAnim]);
  
  return (
    <View style={[styles.livePulseContainer, { width: size, height: size }]}>
      <Animated.View 
        style={[
          styles.livePulseRing, 
          { 
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: pulseAnim }], 
            opacity: opacityAnim 
          }
        ]} 
      />
      <View style={[styles.livePulseDot, { backgroundColor: color, width: size * 0.75, height: size * 0.75, borderRadius: size * 0.375 }]} />
    </View>
  );
};

const LiveTickerCard = React.memo(({ 
  match, 
  onPress, 
}: { 
  match: Match; 
  onPress: () => void; 
  index: number;
}) => {
  const handlePress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [onPress]);

  return (
    <View style={styles.tickerCardWrapper}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.95}>
        <LinearGradient
          colors={['#1A1A2E', '#16213E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tickerCard}
        >
          <View style={styles.tickerLiveBadge}>
            <LivePulse color="#FF4757" size={6} />
            <Text style={styles.tickerLiveText}>LIVE</Text>
            {match.elapsed && (
              <Text style={styles.tickerElapsed}>{match.elapsed}&apos;</Text>
            )}
          </View>
          
          <View style={styles.tickerTeams}>
            <View style={styles.tickerTeamRow}>
              <View style={styles.tickerLogoWrap}>
                {match.homeTeamLogo ? (
                  <Image source={{ uri: match.homeTeamLogo }} style={styles.tickerLogo} />
                ) : (
                  <Shield size={16} color="#6B7280" />
                )}
              </View>
              <Text style={styles.tickerTeamName} numberOfLines={1}>{match.homeTeam}</Text>
              <Text style={[styles.tickerScore, (match.homeScore ?? 0) > (match.awayScore ?? 0) && styles.tickerScoreWinning]}>
                {match.homeScore ?? 0}
              </Text>
            </View>
            <View style={styles.tickerTeamRow}>
              <View style={styles.tickerLogoWrap}>
                {match.awayTeamLogo ? (
                  <Image source={{ uri: match.awayTeamLogo }} style={styles.tickerLogo} />
                ) : (
                  <Shield size={16} color="#6B7280" />
                )}
              </View>
              <Text style={styles.tickerTeamName} numberOfLines={1}>{match.awayTeam}</Text>
              <Text style={[styles.tickerScore, (match.awayScore ?? 0) > (match.homeScore ?? 0) && styles.tickerScoreWinning]}>
                {match.awayScore ?? 0}
              </Text>
            </View>
          </View>
          
          <View style={styles.tickerLeague}>
            {match.leagueLogo ? (
              <Image source={{ uri: match.leagueLogo }} style={styles.tickerLeagueLogo} resizeMode="contain" />
            ) : null}
            <Text style={styles.tickerLeagueName} numberOfLines={1}>{match.league}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

const PremiumMatchCard = React.memo(({ 
  match, 
  isFavoriteTeam, 
  onPress,
  isDark,
  isNotified,
  onToggleNotification,
  isPinned,
}: { 
  match: Match; 
  isFavoriteTeam: (name: string) => boolean; 
  onPress?: () => void;
  index: number;
  isDark: boolean;
  isNotified?: boolean;
  onToggleNotification?: (matchId: string) => void;
  isPinned?: boolean;
}) => {
  const isLive = match.status === 'Live';
  const isCompleted = match.status === 'Completed';
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const homeIsFavorite = isFavoriteTeam(match.homeTeam);
  const awayIsFavorite = isFavoriteTeam(match.awayTeam);

  const handlePress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  }, [onPress]);

  const getMatchTime = () => {
    if (isLive && match.elapsed) return `${match.elapsed}'`;
    if (isCompleted) return 'FT';
    
    let matchDate: Date;
    if (match.date.includes('T')) {
      matchDate = new Date(match.date);
    } else {
      const [year, month, day] = match.date.split('-').map(Number);
      matchDate = new Date(year, month - 1, day);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const matchDateNormalized = new Date(matchDate);
    matchDateNormalized.setHours(0, 0, 0, 0);
    
    if (matchDateNormalized.getTime() === today.getTime()) return match.time;
    if (matchDateNormalized.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return matchDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const getResultStyle = () => {
    if (!hasScore) return null;
    if (match.homeScore! > match.awayScore!) return { home: 'winner' as const, away: 'loser' as const };
    if (match.awayScore! > match.homeScore!) return { home: 'loser' as const, away: 'winner' as const };
    return { home: 'draw' as const, away: 'draw' as const };
  };

  const resultStyle = getResultStyle();

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity 
        style={styles.matchCard}
        onPress={handlePress}
        activeOpacity={0.95}
      >
        <View style={[
          styles.cardInner,
          { backgroundColor: isDark ? '#151528' : '#FFFFFF' },
          isDark && styles.cardInnerDark,
          isLive && styles.liveCardBorder,
        ]}>
          <View style={styles.matchHeader}>
            <View style={styles.leagueInfo}>
              {match.leagueLogo ? (
                <Image source={{ uri: match.leagueLogo }} style={styles.leagueLogo} resizeMode="contain" />
              ) : (
                <View style={[styles.leagueIconFallback, { backgroundColor: isDark ? '#1E1E38' : '#F0F0F5' }]}>
                  <Trophy size={11} color={isDark ? '#8B8BA7' : '#6B7A99'} />
                </View>
              )}
              <Text style={[styles.leagueName, { color: isDark ? '#6B6B85' : '#8E8E93' }]} numberOfLines={1}>
                {match.league}
              </Text>
              {(homeIsFavorite || awayIsFavorite) && (
                <View style={[styles.favStarHeader, { backgroundColor: isDark ? '#3D2F0A' : '#FEF3C7' }]}>
                  <Star size={9} color="#F59E0B" fill="#F59E0B" />
                </View>
              )}
            </View>
            
            {isLive ? (
              <View style={styles.liveIndicator}>
                <LivePulse color="#FF3B30" size={6} />
                <Text style={styles.liveText}>LIVE</Text>
                {match.elapsed ? (
                  <Text style={styles.elapsedText}>{match.elapsed}&apos;</Text>
                ) : null}
              </View>
            ) : isCompleted ? (
              <View style={[styles.statusBadge, { backgroundColor: isDark ? '#1A3D2E' : '#ECFDF5' }]}>
                <CheckCircle2 size={11} color="#10B981" />
                <Text style={styles.statusBadgeText}>FT</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: isDark ? '#1A2E4A' : '#EFF6FF' }]}>
                <Clock size={11} color="#3B82F6" />
                <Text style={[styles.statusBadgeText, { color: '#3B82F6' }]}>{getMatchTime()}</Text>
              </View>
            )}
          </View>

          <View style={styles.matchBody}>
            <View style={styles.teamRowLeft}>
                {match.homeTeamLogo ? (
                  <Image source={{ uri: match.homeTeamLogo }} style={styles.teamLogo} />
                ) : (
                  <Shield size={22} color={isDark ? '#5A5A7A' : '#C7C7CC'} />
                )}
              <Text style={[
                styles.teamNameHorizontal,
                { color: isDark ? '#E4E4ED' : '#1C1C1E' },
                resultStyle?.home === 'loser' && { opacity: 0.5 },
              ]} numberOfLines={2}>
                {match.homeTeam}
              </Text>
            </View>
            
            <View style={styles.scoreCenter}>
              {hasScore ? (
                <View style={[
                  styles.scoreBlock,
                  isLive && styles.scoreBlockLive,
                  { backgroundColor: isDark ? '#1A1A32' : '#F8F8FC' },
                ]}>
                  <Text style={[
                    styles.scoreNum,
                    { color: isDark ? '#FAFAFA' : '#1C1C1E' },
                    isLive && { color: '#FF3B30' },
                    resultStyle?.home === 'winner' && { color: '#10B981' },
                  ]}>
                    {match.homeScore}
                  </Text>
                  <Text style={[
                    styles.scoreDash,
                    { color: isDark ? '#2E2E4E' : '#D4D4DA' },
                  ]}>:</Text>
                  <Text style={[
                    styles.scoreNum,
                    { color: isDark ? '#FAFAFA' : '#1C1C1E' },
                    isLive && { color: '#FF3B30' },
                    resultStyle?.away === 'winner' && { color: '#10B981' },
                  ]}>
                    {match.awayScore}
                  </Text>
                </View>
              ) : (
                <View style={[styles.vsBlock, { backgroundColor: isDark ? '#1A1A32' : '#F5F5FA' }]}>
                  <Text style={[styles.vsLabel, { color: isDark ? '#444466' : '#BEBEC4' }]}>VS</Text>
                </View>
              )}
            </View>
            
            <View style={styles.teamRowRight}>
              <Text style={[
                styles.teamNameHorizontal,
                { color: isDark ? '#E4E4ED' : '#1C1C1E', textAlign: 'right' as const },
                resultStyle?.away === 'loser' && { opacity: 0.5 },
              ]} numberOfLines={2}>
                {match.awayTeam}
              </Text>
                {match.awayTeamLogo ? (
                  <Image source={{ uri: match.awayTeamLogo }} style={styles.teamLogo} />
                ) : (
                  <Shield size={22} color={isDark ? '#5A5A7A' : '#C7C7CC'} />
                )}
            </View>
          </View>

          <View style={[styles.matchFooter, { borderTopColor: isDark ? '#1E1E38' : '#F0F0F5' }]}>
            <View style={styles.footerLeft}>
              {isPinned && (
                <View style={styles.pinnedBadge}>
                  <Pin size={10} color="#F59E0B" />
                  <Text style={styles.pinnedText}>Pinned</Text>
                </View>
              )}
              {match.venue ? (
                <View style={styles.venueRow}>
                  <MapPin size={10} color={isDark ? '#52526E' : '#AEAEB2'} />
                  <Text style={[styles.venueText, { color: isDark ? '#52526E' : '#AEAEB2' }]} numberOfLines={1}>
                    {match.venue}{match.venueCity ? `, ${match.venueCity}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
            {match.status !== 'Completed' && onToggleNotification && (
              <TouchableOpacity
                style={[
                  styles.bellBtn,
                  { backgroundColor: isNotified ? (isDark ? '#1A2E4A' : '#EFF6FF') : (isDark ? '#1C1C2E' : '#F5F5F7') },
                ]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onToggleNotification(match.id);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isNotified ? (
                  <Bell size={14} color="#007AFF" fill="#007AFF" />
                ) : (
                  <BellOff size={14} color={isDark ? '#52526E' : '#AEAEB2'} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.match.id === nextProps.match.id &&
    prevProps.match.homeScore === nextProps.match.homeScore &&
    prevProps.match.awayScore === nextProps.match.awayScore &&
    prevProps.match.status === nextProps.match.status &&
    prevProps.match.elapsed === nextProps.match.elapsed &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.isNotified === nextProps.isNotified &&
    prevProps.isPinned === nextProps.isPinned
  );
});

const TabPill = React.memo(({ 
  tabs, 
  activeTab, 
  onTabChange,
  counts,
  isDark
}: { 
  tabs: { key: string; label: string; icon: any; color: string }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: Record<string, number>;
  isDark: boolean;
}) => {
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
  
  const handlePress = useCallback(async (tab: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onTabChange(tab);
  }, [onTabChange]);
  
  const activeColor = tabs[activeIndex]?.color || '#007AFF';
  
  return (
    <View 
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={[
        styles.pillContainer, 
        { 
          backgroundColor: isDark ? '#111122' : '#EAEAF0',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        }
      ]}
    >
      <Animated.View 
        style={[
          styles.pillIndicator,
          { 
            width: tabWidth - 8,
            transform: [{ translateX: indicatorAnim }],
          }
        ]} 
      >
        <LinearGradient
          colors={isDark 
            ? [activeColor + '25', activeColor + '12'] 
            : [activeColor + '18', activeColor + '08']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[
            styles.pillIndicatorInner,
            { 
              borderColor: activeColor + (isDark ? '30' : '25'),
              shadowColor: activeColor,
              shadowOpacity: isDark ? 0.3 : 0.15,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }
          ]}
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
            style={styles.pillTab}
          >
            <View style={[
              styles.pillTabIconWrap,
              isActive && { backgroundColor: tab.color + '20' }
            ]}>
              <Icon 
                size={14} 
                color={isActive ? tab.color : (isDark ? '#555570' : '#9999A8')} 
                strokeWidth={isActive ? 2.8 : 2}
              />
            </View>
            <Text style={[
              styles.pillLabel, 
              { color: isActive ? (isDark ? '#F0F0FA' : '#1A1A24') : (isDark ? '#555570' : '#9999A8') },
              isActive && { fontWeight: '700' as const, letterSpacing: -0.2 }
            ]}>
              {tab.label}
            </Text>
            {count > 0 && (
              <View style={[
                styles.pillBadge,
                isActive 
                  ? { backgroundColor: tab.color } 
                  : { backgroundColor: isDark ? '#252540' : '#D8D8E0' }
              ]}>
                <Text style={[
                  styles.pillBadgeText,
                  { color: isActive ? '#FFFFFF' : (isDark ? '#6B6B85' : '#8E8E93') }
                ]}>
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const DateHeader = React.memo(({ date, isDark }: { date: string; isDark: boolean }) => {
  const formatDate = (dateStr: string) => {
    let d: Date;
    if (dateStr.includes('T')) {
      d = new Date(dateStr);
    } else {
      const [year, month, day] = dateStr.split('-').map(Number);
      d = new Date(year, month - 1, day);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dn = new Date(d);
    dn.setHours(0, 0, 0, 0);
    
    if (dn.getTime() === today.getTime()) return 'Today';
    if (dn.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return d.toLocaleDateString('en-GB', { weekday: 'long', month: 'short', day: 'numeric' });
  };
  
  return (
    <View style={styles.dateHeader}>
      <View style={[styles.dateLine, { backgroundColor: isDark ? '#2A2A44' : '#E5E5EA' }]} />
      <Text style={[styles.dateText, { color: isDark ? '#7B7B95' : '#8E8E93' }]}>
        {formatDate(date)}
      </Text>
      <View style={[styles.dateLine, { backgroundColor: isDark ? '#2A2A44' : '#E5E5EA' }]} />
    </View>
  );
});

const EMPTY_CONFIG = {
  live: { icon: Radio, color: '#FF3B30', bg: ['#FF3B30', '#FF6B6B'] as [string, string], title: 'No Live Matches', sub: 'Check back when games kick off' },
  upcoming: { icon: Calendar, color: '#007AFF', bg: ['#007AFF', '#4DA3FF'] as [string, string], title: 'No Upcoming Matches', sub: 'Fixtures will appear when scheduled' },
  results: { icon: Trophy, color: '#34C759', bg: ['#34C759', '#6FE08A'] as [string, string], title: 'No Recent Results', sub: 'Completed matches will show here' },
};

const UFC_EMPTY_CONFIG = {
  upcoming: { icon: Calendar, color: '#D4AF37', bg: ['#D4AF37', '#F0D060'] as [string, string], title: 'No Upcoming Fights', sub: 'No upcoming MMA fights found. Pull down to refresh or check back later.' },
  results: { icon: Trophy, color: '#34C759', bg: ['#34C759', '#6FE08A'] as [string, string], title: 'No Recent Results', sub: 'No recent MMA results found. Pull down to refresh or check back later.' },
};

const UFCCountdown = React.memo(({ fight, isDark }: { fight: UFCFight; isDark: boolean }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0 });
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const target = new Date(fight.date).getTime();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      });
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [fight.date]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[ufcStyles.countdownCard, { transform: [{ scale: pulseAnim }] }]}>
      <LinearGradient
        colors={['#1A0808', '#1C0A18', '#0F0A1E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={ufcStyles.countdownGradient}
      >
        <View style={ufcStyles.countdownGoldBar} />
        <Text style={ufcStyles.countdownLabel}>NEXT EVENT</Text>
        <Text style={ufcStyles.countdownEvent} numberOfLines={1}>{fight.event}</Text>
        <View style={ufcStyles.countdownFighters}>
          <View style={ufcStyles.countdownFighterWrap}>
            <View style={[ufcStyles.countdownAvatar, { backgroundColor: isDark ? '#1E1E3A' : '#2A2A4A' }]}>
              {fight.fighter1.photo ? (
                <Image source={{ uri: fight.fighter1.photo }} style={ufcStyles.countdownAvatarImg} />
              ) : (
                <Text style={ufcStyles.countdownAvatarInitial}>{fight.fighter1.name.charAt(0)}</Text>
              )}
            </View>
            <Text style={ufcStyles.countdownFighterName} numberOfLines={1}>{fight.fighter1.name}</Text>
          </View>
          <View style={ufcStyles.countdownVsWrap}>
            <LinearGradient
              colors={['#D4AF37', '#B8860B']}
              style={ufcStyles.countdownVsBadge}
            >
              <Text style={ufcStyles.countdownVsText}>VS</Text>
            </LinearGradient>
          </View>
          <View style={ufcStyles.countdownFighterWrap}>
            <View style={[ufcStyles.countdownAvatar, { backgroundColor: isDark ? '#1E1E3A' : '#2A2A4A' }]}>
              {fight.fighter2.photo ? (
                <Image source={{ uri: fight.fighter2.photo }} style={ufcStyles.countdownAvatarImg} />
              ) : (
                <Text style={ufcStyles.countdownAvatarInitial}>{fight.fighter2.name.charAt(0)}</Text>
              )}
            </View>
            <Text style={ufcStyles.countdownFighterName} numberOfLines={1}>{fight.fighter2.name}</Text>
          </View>
        </View>
        <View style={ufcStyles.countdownTimerRow}>
          <View style={ufcStyles.countdownTimeBox}>
            <Text style={ufcStyles.countdownTimeValue}>{timeLeft.days}</Text>
            <Text style={ufcStyles.countdownTimeUnit}>DAYS</Text>
          </View>
          <Text style={ufcStyles.countdownTimeSep}>:</Text>
          <View style={ufcStyles.countdownTimeBox}>
            <Text style={ufcStyles.countdownTimeValue}>{timeLeft.hours}</Text>
            <Text style={ufcStyles.countdownTimeUnit}>HRS</Text>
          </View>
          <Text style={ufcStyles.countdownTimeSep}>:</Text>
          <View style={ufcStyles.countdownTimeBox}>
            <Text style={ufcStyles.countdownTimeValue}>{timeLeft.mins}</Text>
            <Text style={ufcStyles.countdownTimeUnit}>MIN</Text>
          </View>
        </View>
        {fight.category !== 'TBD' && (
          <View style={ufcStyles.countdownWeightRow}>
            <View style={ufcStyles.countdownWeightBadge}>
              <Text style={ufcStyles.countdownWeightText}>{fight.category}</Text>
            </View>
            <Text style={ufcStyles.countdownDateText}>
              {new Date(fight.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
});

const UFCEventBanner = React.memo(({ eventName, fightCount, eventDate, isDark }: { eventName: string; fightCount: number; eventDate?: string; isDark: boolean }) => {
  const slideAnim = useRef(new Animated.Value(-10)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const getEventDateLabel = () => {
    if (!eventDate) return '';
    const d = new Date(eventDate);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  return (
    <Animated.View style={[ufcStyles.eventBanner, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
      <LinearGradient
        colors={isDark ? ['#1A0A0A', '#1A1020', '#0D0D1A'] : ['#1A0505', '#2A1020', '#1A0A2A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={ufcStyles.eventBannerGradient}
      >
        <View style={ufcStyles.eventBannerAccent} />
        <View style={ufcStyles.eventBannerContent}>
          <View style={ufcStyles.eventBannerLeft}>
            <View style={ufcStyles.eventBannerIconWrap}>
              <LinearGradient
                colors={['#D4AF37', '#B8860B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ufcStyles.eventBannerIcon}
              >
                <Swords size={14} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </View>
            <View style={ufcStyles.eventBannerTextWrap}>
              <Text style={ufcStyles.eventBannerTitle} numberOfLines={1}>{eventName}</Text>
              <View style={ufcStyles.eventBannerMetaRow}>
                <Text style={ufcStyles.eventBannerSub}>{fightCount} fight{fightCount !== 1 ? 's' : ''}</Text>
                {eventDate ? (
                  <>
                    <View style={ufcStyles.eventBannerDot} />
                    <Text style={ufcStyles.eventBannerDateLabel}>{getEventDateLabel()}</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>
          <View style={ufcStyles.eventBannerBadge}>
            <Text style={ufcStyles.eventBannerBadgeText}>MMA</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

const UFCFightCard = React.memo(({ fight, isDark, isFirst, isLast, onPress }: { fight: UFCFight; isDark: boolean; isFirst?: boolean; isLast?: boolean; onPress?: () => void }) => {
  const isCompleted = fight.status === 'Completed';
  const isLive = fight.status === 'Live';
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, opacityAnim, slideAnim]);

  const handlePress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  }, [onPress]);

  const getFightTime = () => {
    if (isLive) return 'LIVE';
    if (isCompleted) return 'Final';
    const d = new Date(fight.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dn = new Date(d);
    dn.setHours(0, 0, 0, 0);
    if (dn.getTime() === today.getTime()) return fight.time;
    if (dn.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getMethodIcon = (method?: string) => {
    if (!method) return null;
    const m = method.toLowerCase();
    if (m.includes('ko') || m.includes('tko')) return 'KO';
    if (m.includes('submission') || m.includes('sub')) return 'SUB';
    if (m.includes('decision') || m.includes('dec')) return 'DEC';
    return 'W';
  };

  const getMethodColor = (method?: string) => {
    if (!method) return '#8B8BA7';
    const m = method.toLowerCase();
    if (m.includes('ko') || m.includes('tko')) return '#FF6B6B';
    if (m.includes('submission') || m.includes('sub')) return '#7C3AED';
    if (m.includes('decision') || m.includes('dec')) return '#3B82F6';
    return '#D4AF37';
  };

  const getDaysUntil = () => {
    const now = new Date();
    const d = new Date(fight.date);
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff > 0) return `${diff}d away`;
    return '';
  };

  const getFighterInitial = (name: string) => {
    if (!name || name === 'TBA') return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
    return name.charAt(0);
  };

  return (
    <Animated.View style={[
      ufcStyles.fightCardWrapper,
      { opacity: opacityAnim, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] },
      isFirst && { marginTop: 0 },
      isLast && { marginBottom: 16 },
    ]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.92}>
      <View style={[
        ufcStyles.fightCard,
        { backgroundColor: isDark ? '#111125' : '#FFFFFF' },
        isDark && { borderColor: 'rgba(212, 175, 55, 0.08)' },
        isLive && { borderColor: 'rgba(255, 59, 48, 0.35)', borderWidth: 1.5 },
        isLive && { shadowColor: '#FF3B30', shadowOpacity: 0.15, shadowRadius: 20 },
      ]}>
        {isLive && (
          <LinearGradient
            colors={['rgba(255, 59, 48, 0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={ufcStyles.liveGlow}
          />
        )}

        <View style={ufcStyles.fightHeader}>
          <View style={ufcStyles.fightEventRow}>
            {fight.category !== 'TBD' && (
              <View style={[ufcStyles.weightBadge, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(184, 134, 11, 0.08)' }]}>
                <Text style={[ufcStyles.weightBadgeText, { color: isDark ? '#D4AF37' : '#B8860B' }]}>
                  {fight.category}
                </Text>
              </View>
            )}
            {fight.event && (
              <Text style={[ufcStyles.fightEventName, { color: isDark ? '#4A4A6A' : '#AEAEB2' }]} numberOfLines={1}>
                {fight.event}
              </Text>
            )}
          </View>
          {isLive ? (
            <View style={ufcStyles.fightLiveBadge}>
              <LivePulse color="#FF3B30" size={6} />
              <Text style={ufcStyles.fightLiveText}>LIVE</Text>
            </View>
          ) : isCompleted ? (
            <View style={[ufcStyles.fightStatusBadge, { backgroundColor: isDark ? '#0D2818' : '#ECFDF5' }]}>
              <CheckCircle2 size={11} color="#10B981" />
              <Text style={[ufcStyles.fightStatusText, { color: '#10B981' }]}>Final</Text>
            </View>
          ) : (
            <View style={[ufcStyles.fightStatusBadge, { backgroundColor: isDark ? '#1F1C0E' : '#FFFBEB' }]}>
              <Clock size={11} color="#D4AF37" />
              <Text style={[ufcStyles.fightStatusText, { color: '#D4AF37' }]}>{getFightTime()}</Text>
            </View>
          )}
        </View>

        <View style={ufcStyles.fightersRow}>
          <View style={ufcStyles.fighterSide}>
            <View style={[
              ufcStyles.fighterAvatarOuter,
              isCompleted && fight.fighter1.winner && { borderColor: '#10B981', borderWidth: 2 },
              isCompleted && !fight.fighter1.winner && fight.fighter2.winner && { opacity: 0.6 },
            ]}>
              <View style={[ufcStyles.fighterAvatar, { backgroundColor: isDark ? '#1A1A35' : '#F0F0F5' }]}>
                {fight.fighter1.photo ? (
                  <Image source={{ uri: fight.fighter1.photo }} style={ufcStyles.fighterPhoto} />
                ) : (
                  <LinearGradient
                    colors={isDark ? ['#1E1E3A', '#2A2A50'] : ['#E8E8F0', '#D8D8E0']}
                    style={ufcStyles.fighterAvatarFallback}
                  >
                    <Text style={[ufcStyles.fighterInitials, { color: isDark ? '#6B6B90' : '#8E8E93' }]}>
                      {getFighterInitial(fight.fighter1.name)}
                    </Text>
                  </LinearGradient>
                )}
              </View>
            </View>
            <Text
              style={[
                ufcStyles.fighterName,
                { color: isDark ? '#F0F0FA' : '#1C1C1E' },
                isCompleted && fight.fighter1.winner && { color: '#10B981' },
                isCompleted && !fight.fighter1.winner && fight.fighter2.winner && { opacity: 0.5 },
                fight.fighter1.name === 'TBA' && { color: isDark ? '#4A4A6A' : '#BEBEC4', fontStyle: 'italic' as const },
              ]}
              numberOfLines={2}
            >
              {fight.fighter1.name === 'TBA' ? 'To Be Announced' : fight.fighter1.name}
            </Text>
            {isCompleted && fight.fighter1.winner && (
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ufcStyles.winnerBadge}
              >
                <Text style={ufcStyles.winnerBadgeText}>WIN</Text>
              </LinearGradient>
            )}
            {isCompleted && !fight.fighter1.winner && fight.fighter2.winner && (
              <View style={ufcStyles.loserBadge}>
                <Text style={[ufcStyles.loserBadgeText, { color: isDark ? '#5A5A7A' : '#AEAEB2' }]}>LOSS</Text>
              </View>
            )}
          </View>

          <View style={ufcStyles.vsCenter}>
            <View style={ufcStyles.vsLine} />
            <LinearGradient
              colors={isLive ? ['#FF3B30', '#CC2D26'] : isDark ? ['#1E1E3A', '#2A2A4A'] : ['#EAEAF0', '#E0E0E8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={ufcStyles.vsCircle}
            >
              <Text style={[
                ufcStyles.vsText,
                { color: isLive ? '#FFF' : (isDark ? '#6B6B85' : '#AEAEB2') },
              ]}>VS</Text>
            </LinearGradient>
            <View style={ufcStyles.vsLine} />
          </View>

          <View style={ufcStyles.fighterSide}>
            <View style={[
              ufcStyles.fighterAvatarOuter,
              isCompleted && fight.fighter2.winner && { borderColor: '#10B981', borderWidth: 2 },
              isCompleted && !fight.fighter2.winner && fight.fighter1.winner && { opacity: 0.6 },
            ]}>
              <View style={[ufcStyles.fighterAvatar, { backgroundColor: isDark ? '#1A1A35' : '#F0F0F5' }]}>
                {fight.fighter2.photo ? (
                  <Image source={{ uri: fight.fighter2.photo }} style={ufcStyles.fighterPhoto} />
                ) : (
                  <LinearGradient
                    colors={isDark ? ['#1E1E3A', '#2A2A50'] : ['#E8E8F0', '#D8D8E0']}
                    style={ufcStyles.fighterAvatarFallback}
                  >
                    <Text style={[ufcStyles.fighterInitials, { color: isDark ? '#6B6B90' : '#8E8E93' }]}>
                      {getFighterInitial(fight.fighter2.name)}
                    </Text>
                  </LinearGradient>
                )}
              </View>
            </View>
            <Text
              style={[
                ufcStyles.fighterName,
                { color: isDark ? '#F0F0FA' : '#1C1C1E' },
                isCompleted && fight.fighter2.winner && { color: '#10B981' },
                isCompleted && !fight.fighter2.winner && fight.fighter1.winner && { opacity: 0.5 },
                fight.fighter2.name === 'TBA' && { color: isDark ? '#4A4A6A' : '#BEBEC4', fontStyle: 'italic' as const },
              ]}
              numberOfLines={2}
            >
              {fight.fighter2.name === 'TBA' ? 'To Be Announced' : fight.fighter2.name}
            </Text>
            {isCompleted && fight.fighter2.winner && (
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ufcStyles.winnerBadge}
              >
                <Text style={ufcStyles.winnerBadgeText}>WIN</Text>
              </LinearGradient>
            )}
            {isCompleted && !fight.fighter2.winner && fight.fighter1.winner && (
              <View style={ufcStyles.loserBadge}>
                <Text style={[ufcStyles.loserBadgeText, { color: isDark ? '#5A5A7A' : '#AEAEB2' }]}>LOSS</Text>
              </View>
            )}
          </View>
        </View>

        {isCompleted && fight.result?.method && (
          <View style={[ufcStyles.resultRow, { borderTopColor: isDark ? '#1A1A32' : '#F0F0F5' }]}>
            <View style={[ufcStyles.resultMethodContainer, { backgroundColor: isDark ? 'rgba(212,175,55,0.06)' : 'rgba(184,134,11,0.04)' }]}>
              <Text style={[ufcStyles.resultMethodEmoji, { color: getMethodColor(fight.result.method) }]}>{getMethodIcon(fight.result.method)}</Text>
              <Text style={[ufcStyles.resultMethod, { color: getMethodColor(fight.result.method) }]}>
                {fight.result.method}
              </Text>
              {fight.result.round ? (
                <View style={[ufcStyles.resultDetailChip, { backgroundColor: isDark ? '#1A1A32' : '#F0F0F5' }]}>
                  <Text style={[ufcStyles.resultDetailText, { color: isDark ? '#8B8BA7' : '#6B7A99' }]}>R{fight.result.round}</Text>
                </View>
              ) : null}
              {fight.result.time ? (
                <View style={[ufcStyles.resultDetailChip, { backgroundColor: isDark ? '#1A1A32' : '#F0F0F5' }]}>
                  <Clock size={9} color={isDark ? '#6B6B85' : '#8E8E93'} />
                  <Text style={[ufcStyles.resultDetailText, { color: isDark ? '#8B8BA7' : '#6B7A99' }]}>{fight.result.time}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {!isCompleted && !isLive && (
          <View style={[ufcStyles.upcomingFooter, { borderTopColor: isDark ? '#1A1A32' : '#F0F0F5' }]}>
            <View style={ufcStyles.upcomingFooterRow}>
              <Calendar size={11} color={isDark ? '#5A5A7A' : '#AEAEB2'} />
              <Text style={[ufcStyles.upcomingFooterText, { color: isDark ? '#5A5A7A' : '#AEAEB2' }]}>
                {new Date(fight.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <View style={ufcStyles.upcomingFooterRight}>
              {fight.time ? (
                <View style={ufcStyles.upcomingFooterRow}>
                  <Clock size={11} color={isDark ? '#5A5A7A' : '#AEAEB2'} />
                  <Text style={[ufcStyles.upcomingFooterText, { color: isDark ? '#5A5A7A' : '#AEAEB2' }]}>
                    {fight.time}
                  </Text>
                </View>
              ) : null}
              <View style={[ufcStyles.daysAwayBadge, { backgroundColor: isDark ? 'rgba(212,175,55,0.1)' : 'rgba(184,134,11,0.06)' }]}>
                <Text style={[ufcStyles.daysAwayText, { color: '#D4AF37' }]}>{getDaysUntil()}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={ufcStyles.tapHintRow}>
          <ChevronRight size={12} color={isDark ? '#3A3A5A' : '#C0C0CC'} />
          <Text style={[ufcStyles.tapHintText, { color: isDark ? '#3A3A5A' : '#C0C0CC' }]}>Tap for details</Text>
        </View>
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const EmptyState = React.memo(({ type, isDark }: { type: 'live' | 'upcoming' | 'results'; isDark: boolean }) => {
  const { icon: Icon, bg, title, sub } = EMPTY_CONFIG[type];
  
  return (
    <View style={styles.emptyState}>
      <LinearGradient colors={bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyIconCircle}>
        <Icon size={28} color="#FFFFFF" strokeWidth={2} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: isDark ? '#E4E4ED' : '#1C1C1E' }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>{sub}</Text>
    </View>
  );
});

export default function SportsScreen() {
  const insets = useSafeAreaInsets();
  const { isFavoriteTeam, profile } = useUserProfile();
  const { colors: _colors, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [sportMode, setSportMode] = useState<SportMode>('football');
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'results'>('upcoming');
  const [ufcTab, setUfcTab] = useState<'upcoming' | 'results'>('upcoming');
  const [selectedLeagues, setSelectedLeagues] = useState<number[]>([]);
  const [favoriteLeagues, setFavoriteLeagues] = useState<number[]>([]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showStandingsModal, setShowStandingsModal] = useState(false);
  const [selectedLeagueForStandings, setSelectedLeagueForStandings] = useState<{ id: number; name: string } | null>(null);
  const [showLeaguePicker, setShowLeaguePicker] = useState(false);
  const [notifiedMatches, setNotifiedMatches] = useState<Set<string>>(new Set());
  const [selectedFight, setSelectedFight] = useState<UFCFight | null>(null);
  const [showFightModal, setShowFightModal] = useState(false);
  
  const headerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [savedLeagues, savedFavorites, savedNotifications] = await Promise.all([
          AsyncStorage.getItem('sports_selected_leagues'),
          AsyncStorage.getItem('sports_favorite_leagues'),
          AsyncStorage.getItem('sports_notified_matches'),
        ]);
        if (savedLeagues) {
          const parsed = JSON.parse(savedLeagues);
          if (Array.isArray(parsed)) setSelectedLeagues(parsed);
        }
        if (savedFavorites) {
          const parsed = JSON.parse(savedFavorites);
          if (Array.isArray(parsed)) setFavoriteLeagues(parsed);
        }
        if (savedNotifications) {
          const parsed = JSON.parse(savedNotifications);
          if (Array.isArray(parsed)) setNotifiedMatches(new Set(parsed));
        }
      } catch (e) {
        console.log('Failed to load league preferences:', e);
      } finally {
        setPreferencesLoaded(true);
      }
    };
    void loadPreferences();
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    AsyncStorage.setItem('sports_favorite_leagues', JSON.stringify(favoriteLeagues)).catch(e =>
      console.log('Failed to save favorite leagues:', e)
    );
  }, [favoriteLeagues, preferencesLoaded]);

  const teamApiIds = useMemo(() => {
    if (!profile?.favoriteTeams) return [];
    return profile.favoriteTeams
      .map(team => team.apiId)
      .filter((id): id is number => id !== undefined);
  }, [profile?.favoriteTeams]);

  const nationalTeamApiIds = useMemo(() => {
    if (!profile?.nationalities) return [];
    return profile.nationalities
      .map(nation => nation.apiId)
      .filter((id): id is number => id !== undefined && id > 0);
  }, [profile?.nationalities]);

  const hasNationalTeams = nationalTeamApiIds.length > 0;



  const queryLeagueIds = useMemo(() => {
    if (selectedLeagues.length === 0) return undefined;
    return selectedLeagues;
  }, [selectedLeagues]);

  const [hasViewedLive, setHasViewedLive] = useState(false);
  const [hasViewedResults, setHasViewedResults] = useState(false);

  useEffect(() => {
    if (activeTab === 'live') setHasViewedLive(true);
    if (activeTab === 'results') setHasViewedResults(true);
  }, [activeTab]);

  const liveQuery = trpc.football.getMatches.useQuery(
    { 
      type: 'live', 
      teamIds: teamApiIds.length > 0 ? teamApiIds : undefined,
      leagueIds: queryLeagueIds,
      nationalTeamIds: hasNationalTeams ? nationalTeamApiIds : undefined,
      includeAfcon: hasNationalTeams ? true : undefined,
    },
    { 
      enabled: sportMode === 'football',
      refetchInterval: activeTab === 'live' ? 60 * 1000 : false,
      staleTime: 45 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      retryDelay: 1500,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    }
  );

  const upcomingQuery = trpc.football.getMatches.useQuery(
    { 
      type: 'upcoming', 
      days: 14, 
      teamIds: teamApiIds.length > 0 ? teamApiIds : undefined,
      leagueIds: queryLeagueIds,
      nationalTeamIds: hasNationalTeams ? nationalTeamApiIds : undefined,
      includeAfcon: hasNationalTeams ? true : undefined,
    },
    { 
      enabled: sportMode === 'football',
      refetchInterval: false,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      retryDelay: 1500,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    }
  );

  const resultsQuery = trpc.football.getMatches.useQuery(
    { 
      type: 'results', 
      teamIds: teamApiIds.length > 0 ? teamApiIds : undefined,
      leagueIds: queryLeagueIds,
      nationalTeamIds: hasNationalTeams ? nationalTeamApiIds : undefined,
      includeAfcon: hasNationalTeams ? true : undefined,
    },
    { 
      enabled: sportMode === 'football' && (activeTab === 'results' || hasViewedResults),
      refetchInterval: false,
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 1,
      retryDelay: 1500,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    }
  );

  const liveMatches = useMemo(() => {
    const data = liveQuery.data?.response;
    if (!data || !Array.isArray(data)) return [];
    return transformApiFootballData(data);
  }, [liveQuery.data]);

  const upcomingMatches = useMemo(() => {
    const data = upcomingQuery.data?.response;
    if (!data || !Array.isArray(data)) return [];
    return transformApiFootballData(data).filter(m => m.status === 'Upcoming')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [upcomingQuery.data]);

  const completedMatches = useMemo(() => {
    const data = resultsQuery.data?.response;
    if (!data || !Array.isArray(data)) return [];
    return transformApiFootballData(data).filter(m => m.status === 'Completed');
  }, [resultsQuery.data]);

  const availableLeaguesForStandings = useMemo(() => {
    const allMatches = [...liveMatches, ...upcomingMatches, ...completedMatches];
    const leagueMap = new Map<number, { id: number; name: string; logo?: string; country: string }>();
    allMatches.forEach(m => {
      if (m.leagueId && m.leagueId > 0 && !leagueMap.has(m.leagueId)) {
        const leagueName = m.league.toLowerCase();
        const isInternational = 
          leagueName.includes('world cup') || leagueName.includes('euro') ||
          leagueName.includes('afcon') || leagueName.includes('copa america') ||
          leagueName.includes('nations league') || leagueName.includes('friendly') ||
          leagueName.includes('qualification');
        if (!isInternational) {
          leagueMap.set(m.leagueId, { id: m.leagueId, name: m.league, logo: m.leagueLogo, country: m.leagueCountry || '' });
        }
      }
    });
    const leagues = Array.from(leagueMap.values());
    const TOP_LEAGUES = ['premier league', 'la liga', 'bundesliga', 'serie a', 'ligue 1', 'champions league', 'europa league'];
    return leagues.sort((a, b) => {
      const aIdx = TOP_LEAGUES.findIndex(l => a.name.toLowerCase().includes(l));
      const bIdx = TOP_LEAGUES.findIndex(l => b.name.toLowerCase().includes(l));
      if (aIdx !== -1 && bIdx === -1) return -1;
      if (bIdx !== -1 && aIdx === -1) return 1;
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      return a.name.localeCompare(b.name);
    });
  }, [liveMatches, upcomingMatches, completedMatches]);
  
  const handleLeagueTablesPress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (availableLeaguesForStandings.length === 0) return;
    if (availableLeaguesForStandings.length === 1) {
      setSelectedLeagueForStandings(availableLeaguesForStandings[0]);
      setShowStandingsModal(true);
    } else {
      setShowLeaguePicker(true);
    }
  }, [availableLeaguesForStandings]);
  
  const handleSelectLeagueForStandings = useCallback(async (league: { id: number; name: string }) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowLeaguePicker(false);
    setSelectedLeagueForStandings(league);
    setShowStandingsModal(true);
  }, []);

  const availableLeagueIds = useMemo(() => {
    const ids = new Set<number>();
    [...liveMatches, ...upcomingMatches, ...completedMatches].forEach(m => {
      if (m.leagueId) ids.add(m.leagueId);
    });
    return ids;
  }, [liveMatches, upcomingMatches, completedMatches]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    if (selectedLeagues.length === 0) return;
    if (availableLeagueIds.size === 0) return;
    const pruned = selectedLeagues.filter(id => availableLeagueIds.has(id));
    if (pruned.length !== selectedLeagues.length) {
      console.log('🧹 Pruning stale league filter:', selectedLeagues, '->', pruned);
      setSelectedLeagues(pruned);
      AsyncStorage.setItem('sports_selected_leagues', JSON.stringify(pruned)).catch(() => {});
    }
  }, [availableLeagueIds, selectedLeagues, preferencesLoaded]);

  const filterMatchesByLeague = useCallback((matches: Match[]) => {
    if (selectedLeagues.length === 0) return matches;
    const filtered = matches.filter(match => selectedLeagues.includes(match.leagueId));
    if (filtered.length === 0 && matches.length > 0) return matches;
    return filtered;
  }, [selectedLeagues]);

  const filteredLiveMatches = useMemo(() => filterMatchesByLeague(liveMatches), [liveMatches, filterMatchesByLeague]);
  const filteredUpcomingMatches = useMemo(() => filterMatchesByLeague(upcomingMatches), [upcomingMatches, filterMatchesByLeague]);
  const filteredCompletedMatches = useMemo(() => filterMatchesByLeague(completedMatches), [completedMatches, filterMatchesByLeague]);

  const pinFavorites = useCallback((matches: Match[]) => {
    const pinned: Match[] = [];
    const rest: Match[] = [];
    matches.forEach(m => {
      if (isFavoriteTeam(m.homeTeam) || isFavoriteTeam(m.awayTeam)) {
        pinned.push(m);
      } else {
        rest.push(m);
      }
    });
    return [...pinned, ...rest];
  }, [isFavoriteTeam]);

  const displayMatches = useMemo(() => {
    switch (activeTab) {
      case 'live': return pinFavorites(filteredLiveMatches);
      case 'upcoming': return pinFavorites(filteredUpcomingMatches);
      case 'results': return pinFavorites(filteredCompletedMatches);
      default: return [];
    }
  }, [activeTab, filteredLiveMatches, filteredUpcomingMatches, filteredCompletedMatches, pinFavorites]);

  const groupedMatches = useMemo(() => {
    if (activeTab === 'live') return null;
    const groups: { date: string; matches: Match[] }[] = [];
    displayMatches.forEach(match => {
      const dateKey = match.date.includes('T') ? match.date.split('T')[0] : match.date;
      const existing = groups.find(g => g.date === dateKey);
      if (existing) {
        existing.matches.push(match);
      } else {
        groups.push({ date: dateKey, matches: [match] });
      }
    });
    return groups;
  }, [displayMatches, activeTab]);

  const toggleFavoriteLeague = useCallback((leagueId: number) => {
    setFavoriteLeagues(prev => 
      prev.includes(leagueId) ? prev.filter(id => id !== leagueId) : [...prev, leagueId]
    );
  }, []);

  const toggleMatchNotification = useCallback(async (matchId: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setNotifiedMatches(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      AsyncStorage.setItem('sports_notified_matches', JSON.stringify([...next])).catch(e =>
        console.log('Failed to save notified matches:', e)
      );
      return next;
    });
  }, []);

  type FlatListItem = { type: 'date'; date: string; key: string } | { type: 'match'; match: Match; key: string };

  const flatListData = useMemo<FlatListItem[]>(() => {
    if (activeTab === 'live') {
      return displayMatches.map((match, idx) => ({ type: 'match' as const, match, key: `live-${match.id}-${idx}` }));
    }
    if (!groupedMatches) return [];
    const items: FlatListItem[] = [];
    groupedMatches.forEach((group, gIdx) => {
      items.push({ type: 'date', date: group.date, key: `date-${group.date}-${gIdx}` });
      group.matches.forEach((match, mIdx) => {
        items.push({ type: 'match', match, key: `match-${group.date}-${match.id}-${mIdx}` });
      });
    });
    return items;
  }, [activeTab, displayMatches, groupedMatches]);

  const handleMatchCardPress = useCallback((match: Match) => {
    setSelectedMatch(match);
    setShowMatchModal(true);
  }, []);

  const renderFlatListItem = useCallback(({ item }: { item: FlatListItem }) => {
    if (item.type === 'date') {
      return <DateHeader date={item.date} isDark={isDark} />;
    }
    const match = item.match;
    return (
      <PremiumMatchCard
        match={match}
        isFavoriteTeam={isFavoriteTeam}
        index={0}
        isDark={isDark}
        isNotified={notifiedMatches.has(match.id)}
        onToggleNotification={toggleMatchNotification}
        isPinned={isFavoriteTeam(match.homeTeam) || isFavoriteTeam(match.awayTeam)}
        onPress={() => handleMatchCardPress(match)}
      />
    );
  }, [isDark, isFavoriteTeam, notifiedMatches, toggleMatchNotification, handleMatchCardPress]);

  const flatListKeyExtractor = useCallback((item: FlatListItem) => item.key, []);

  const ufcUpcomingQuery = trpc.mma.getFights.useQuery(
    { type: 'upcoming' },
    {
      enabled: sportMode === 'ufc',
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
      refetchOnWindowFocus: false,
    }
  );

  const ufcResultsQuery = trpc.mma.getFights.useQuery(
    { type: 'results' },
    {
      enabled: sportMode === 'ufc',
      staleTime: 15 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
      refetchOnWindowFocus: false,
    }
  );

  const ufcUpcomingFights = useMemo(() => {
    const data = ufcUpcomingQuery.data?.response;
    if (!data || !Array.isArray(data)) return [];
    return transformMmaFightData(data);
  }, [ufcUpcomingQuery.data]);

  const ufcResultsFights = useMemo(() => {
    const data = ufcResultsQuery.data?.response;
    if (!data || !Array.isArray(data)) return [];
    return transformMmaFightData(data);
  }, [ufcResultsQuery.data]);

  const ufcDisplayFights = useMemo(() => {
    return ufcTab === 'upcoming' ? ufcUpcomingFights : ufcResultsFights;
  }, [ufcTab, ufcUpcomingFights, ufcResultsFights]);

  const ufcGroupedByEvent = useMemo(() => {
    const eventMap = new Map<string, { event: string; date: string; fights: UFCFight[] }>();
    ufcDisplayFights.forEach(fight => {
      const eventKey = fight.event || 'Unknown Event';
      const existing = eventMap.get(eventKey);
      if (existing) {
        existing.fights.push(fight);
      } else {
        eventMap.set(eventKey, { event: eventKey, date: fight.date, fights: [fight] });
      }
    });
    return Array.from(eventMap.values()).sort((a, b) => {
      if (ufcTab === 'results') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [ufcDisplayFights, ufcTab]);

  type UFCFlatListItem = 
    | { type: 'countdown'; fight: UFCFight; key: string }
    | { type: 'event'; event: string; fightCount: number; eventDate: string; key: string }
    | { type: 'fight'; fight: UFCFight; isFirst: boolean; isLast: boolean; key: string };

  const ufcFlatListData = useMemo<UFCFlatListItem[]>(() => {
    const items: UFCFlatListItem[] = [];
    if (ufcTab === 'upcoming' && ufcUpcomingFights.length > 0) {
      items.push({ type: 'countdown', fight: ufcUpcomingFights[0], key: 'ufc-countdown-hero' });
    }
    ufcGroupedByEvent.forEach((group) => {
      items.push({ type: 'event', event: group.event, fightCount: group.fights.length, eventDate: group.date, key: `ufc-event-${group.event}-${items.length}` });
      group.fights.forEach((fight, idx) => {
        items.push({ 
          type: 'fight', 
          fight, 
          isFirst: idx === 0, 
          isLast: idx === group.fights.length - 1, 
          key: `ufc-fight-${fight.id}-${group.event}-${idx}` 
        });
      });
    });
    return items;
  }, [ufcGroupedByEvent, ufcTab, ufcUpcomingFights]);

  const handleFightCardPress = useCallback((fight: UFCFight) => {
    setSelectedFight(fight);
    setShowFightModal(true);
  }, []);

  const renderUfcItem = useCallback(({ item }: { item: UFCFlatListItem }) => {
    if (item.type === 'countdown') {
      return (
        <TouchableOpacity activeOpacity={0.92} onPress={() => handleFightCardPress(item.fight)}>
          <UFCCountdown fight={item.fight} isDark={isDark} />
        </TouchableOpacity>
      );
    }
    if (item.type === 'event') {
      return <UFCEventBanner eventName={item.event} fightCount={item.fightCount} eventDate={item.eventDate} isDark={isDark} />;
    }
    return <UFCFightCard fight={item.fight} isDark={isDark} isFirst={item.isFirst} isLast={item.isLast} onPress={() => handleFightCardPress(item.fight)} />;
  }, [isDark, handleFightCardPress]);

  const ufcFlatListKeyExtractor = useCallback((item: UFCFlatListItem) => item.key, []);

  const enabledSports = useMemo((): SportMode[] => {
    const interests = profile?.interests || [];
    const sports: SportMode[] = [];
    if (interests.includes('football')) sports.push('football');
    if (interests.includes('ufc')) sports.push('ufc');
    if (interests.includes('f1')) sports.push('f1');
    if (interests.includes('nba')) sports.push('nba');
    if (sports.length === 0) sports.push('football');
    return sports;
  }, [profile?.interests]);

  useEffect(() => {
    if (!enabledSports.includes(sportMode)) {
      setSportMode(enabledSports[0]);
    }
  }, [enabledSports, sportMode]);

  const handleSportModeChange = useCallback(async (mode: SportMode) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSportMode(mode);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (sportMode === 'football') {
      await Promise.all([liveQuery.refetch(), upcomingQuery.refetch(), resultsQuery.refetch()]);
    } else {
      await Promise.all([ufcUpcomingQuery.refetch(), ufcResultsQuery.refetch()]);
    }
    setRefreshing(false);
  }, [liveQuery, upcomingQuery, resultsQuery, ufcUpcomingQuery, ufcResultsQuery, sportMode]);

  const isLoading = sportMode === 'football'
    ? (liveQuery.isLoading && upcomingQuery.isLoading && resultsQuery.isLoading)
    : sportMode === 'ufc'
      ? (ufcUpcomingQuery.isLoading && ufcResultsQuery.isLoading)
      : false;
  const hasAnyFootballData = (liveQuery.data?.response?.length ?? 0) > 0
    || (upcomingQuery.data?.response?.length ?? 0) > 0
    || (resultsQuery.data?.response?.length ?? 0) > 0;
  const allFootballErrored = liveQuery.isError && upcomingQuery.isError && resultsQuery.isError;
  const hasError = sportMode === 'football'
    ? (allFootballErrored && !isLoading && !hasAnyFootballData)
    : sportMode === 'ufc'
      ? ((ufcUpcomingQuery.isError && ufcResultsQuery.isError) && !isLoading)
      : false;
  const hasConfigError = sportMode === 'football'
    ? (liveQuery.data?.errors?.config || upcomingQuery.data?.errors?.config || resultsQuery.data?.errors?.config)
    : sportMode === 'ufc'
      ? (ufcUpcomingQuery.data?.errors?.config || ufcResultsQuery.data?.errors?.config)
      : null;

  const tabs = [
    { key: 'live', label: 'Live', icon: Flame, color: '#FF3B30' },
    { key: 'upcoming', label: 'Upcoming', icon: Calendar, color: '#007AFF' },
    { key: 'results', label: 'Results', icon: Trophy, color: '#34C759' },
  ];

  const counts: Record<string, number> = {
    live: filteredLiveMatches.length,
    upcoming: filteredUpcomingMatches.length,
    results: filteredCompletedMatches.length,

  };

  const hasTeams = teamApiIds.length > 0 || nationalTeamApiIds.length > 0;

  const ufcTabs = [
    { key: 'upcoming', label: 'Upcoming', icon: Calendar, color: '#D4AF37' },
    { key: 'results', label: 'Results', icon: Trophy, color: '#34C759' },
  ];

  const ufcCounts: Record<string, number> = {
    upcoming: ufcUpcomingFights.length,
    results: ufcResultsFights.length,
  };

  const footballHeader = (
    <View>
      {sportMode === 'football' && filteredLiveMatches.length > 0 && (
        <View style={styles.tickerSection}>
          <View style={styles.tickerHeader}>
            <View style={styles.tickerHeaderLeft}>
              <View style={styles.tickerLiveDot}>
                <LivePulse color="#FF3B30" size={8} />
              </View>
              <Text style={[styles.tickerTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>Live Now</Text>
              <View style={[styles.tickerCountBadge, { backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.08)' }]}>
                <Text style={styles.tickerCountText}>{filteredLiveMatches.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setActiveTab('live')}
              activeOpacity={0.7}
              style={styles.tickerSeeAllBtn}
            >
              <Text style={styles.tickerSeeAll}>See All</Text>
              <ChevronRight size={14} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredLiveMatches}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tickerList}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <LiveTickerCard
                match={item}
                index={index}
                onPress={() => {
                  setSelectedMatch(item);
                  setShowMatchModal(true);
                }}
              />
            )}
          />
        </View>
      )}
      <View style={styles.tabWrapper}>
        <TabPill
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as 'live' | 'upcoming' | 'results')}
          counts={counts}
          isDark={isDark}
        />
      </View>
      <View style={styles.filterArea}>
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <CompetitionFilter
              selectedLeagues={selectedLeagues}
              onLeaguesChange={setSelectedLeagues}
              favoriteLeagues={favoriteLeagues}
              onToggleFavorite={toggleFavoriteLeague}
              isDark={isDark}
            />
          </View>
        </View>
        <View style={styles.filterActionsRow}>
          <TouchableOpacity
            style={[
              styles.standingsBtn,
              { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.12)' : 'rgba(52, 199, 89, 0.08)' },
              availableLeaguesForStandings.length === 0 && { opacity: 0.3 },
            ]}
            onPress={handleLeagueTablesPress}
            activeOpacity={0.7}
            disabled={availableLeaguesForStandings.length === 0}
          >
            <BarChart3 size={15} color="#34C759" />
            <Text style={styles.standingsBtnText}>Tables</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D1A' : '#F2F2F7' }]}>
      <TabWalkthrough tabName="sports" />
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Animated.View style={[
        styles.header, 
        { 
          paddingTop: insets.top,
          opacity: headerAnim,
          transform: [{
            translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] })
          }]
        }
      ]}>
        <LinearGradient
          colors={isDark 
            ? (sportMode === 'football' 
              ? ['#0A1A0F', '#0D1A14', '#0D0D1A'] 
              : sportMode === 'f1'
                ? ['#1A0505', '#180A0A', '#0D0D1A']
                : sportMode === 'nba'
                  ? ['#0A0A1E', '#0D1225', '#0D0D1A']
                  : ['#1A0A08', '#1A0D10', '#0D0D1A'])
            : (sportMode === 'football'
              ? ['#E8F5EC', '#F0F5F2', '#F2F2F7']
              : sportMode === 'f1'
                ? ['#F5E8E8', '#F5F0F0', '#F2F2F7']
                : sportMode === 'nba'
                  ? ['#E8EEF5', '#F0F2F5', '#F2F2F7']
                  : ['#F5EDE8', '#F5F0EC', '#F2F2F7'])}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View style={styles.titleArea}>
              <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
                {sportMode === 'football' ? 'Football' : sportMode === 'f1' ? 'Formula 1' : sportMode === 'nba' ? 'NBA' : 'UFC'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
                {sportMode === 'football'
                  ? (filteredLiveMatches.length > 0 
                      ? `${filteredLiveMatches.length} live now`
                      : 'Matches & results')
                  : sportMode === 'f1'
                    ? 'Races & standings'
                    : sportMode === 'nba'
                      ? 'Games & standings'
                      : (ufcUpcomingFights.length > 0
                          ? `${ufcUpcomingFights.length} upcoming`
                          : 'Fights & results')
                }
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.refreshBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
              onPress={onRefresh}
              activeOpacity={0.7}
            >
              <RefreshCw size={16} color={isDark ? '#7B7B95' : '#8E8E93'} />
            </TouchableOpacity>
          </View>

          {enabledSports.length > 1 && (
          <View style={sportToggleStyles.container}>
            <View style={[
              sportToggleStyles.track,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
            ]}>
              {enabledSports.includes('football') && (
              <TouchableOpacity
                style={[
                  sportToggleStyles.option,
                  sportMode === 'football' && sportToggleStyles.optionActive,
                  sportMode === 'football' && {
                    backgroundColor: isDark ? 'rgba(46, 204, 113, 0.12)' : '#FFFFFF',
                    shadowColor: isDark ? '#2ECC71' : '#000',
                    shadowOpacity: isDark ? 0.2 : 0.06,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 3,
                  },
                ]}
                onPress={() => handleSportModeChange('football')}
                activeOpacity={0.7}
              >
                <Trophy size={15} color={sportMode === 'football' ? (isDark ? '#2ECC71' : '#1B6B34') : (isDark ? '#555570' : '#AEAEB2')} />
                <Text style={[
                  sportToggleStyles.optionLabel,
                  { color: sportMode === 'football'
                    ? (isDark ? '#2ECC71' : '#1B6B34')
                    : (isDark ? '#555570' : '#AEAEB2')
                  },
                  sportMode === 'football' && { fontWeight: '700' as const },
                ]}>Football</Text>
              </TouchableOpacity>
              )}
              {enabledSports.includes('ufc') && (
              <TouchableOpacity
                style={[
                  sportToggleStyles.option,
                  sportMode === 'ufc' && sportToggleStyles.optionActive,
                  sportMode === 'ufc' && {
                    backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : '#FFFFFF',
                    shadowColor: isDark ? '#D4AF37' : '#000',
                    shadowOpacity: isDark ? 0.2 : 0.06,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 3,
                  },
                ]}
                onPress={() => handleSportModeChange('ufc')}
                activeOpacity={0.7}
              >
                <Swords size={15} color={sportMode === 'ufc' ? (isDark ? '#D4AF37' : '#8B0000') : (isDark ? '#555570' : '#AEAEB2')} />
                <Text style={[
                  sportToggleStyles.optionLabel,
                  { color: sportMode === 'ufc'
                    ? (isDark ? '#D4AF37' : '#8B0000')
                    : (isDark ? '#555570' : '#AEAEB2')
                  },
                  sportMode === 'ufc' && { fontWeight: '700' as const },
                ]}>UFC</Text>
              </TouchableOpacity>
              )}
              {enabledSports.includes('f1') && (
              <TouchableOpacity
                style={[
                  sportToggleStyles.option,
                  sportMode === 'f1' && sportToggleStyles.optionActive,
                  sportMode === 'f1' && {
                    backgroundColor: isDark ? 'rgba(225, 6, 0, 0.12)' : '#FFFFFF',
                    shadowColor: isDark ? '#E10600' : '#000',
                    shadowOpacity: isDark ? 0.2 : 0.06,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 3,
                  },
                ]}
                onPress={() => handleSportModeChange('f1')}
                activeOpacity={0.7}
              >
                <Flag size={15} color={sportMode === 'f1' ? (isDark ? '#E10600' : '#B80000') : (isDark ? '#555570' : '#AEAEB2')} />
                <Text style={[
                  sportToggleStyles.optionLabel,
                  { color: sportMode === 'f1'
                    ? (isDark ? '#E10600' : '#B80000')
                    : (isDark ? '#555570' : '#AEAEB2')
                  },
                  sportMode === 'f1' && { fontWeight: '700' as const },
                ]}>F1</Text>
              </TouchableOpacity>
              )}
              {enabledSports.includes('nba') && (
              <TouchableOpacity
                style={[
                  sportToggleStyles.option,
                  sportMode === 'nba' && sportToggleStyles.optionActive,
                  sportMode === 'nba' && {
                    backgroundColor: isDark ? 'rgba(29, 66, 138, 0.12)' : '#FFFFFF',
                    shadowColor: isDark ? '#1D428A' : '#000',
                    shadowOpacity: isDark ? 0.2 : 0.06,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 3,
                  },
                ]}
                onPress={() => handleSportModeChange('nba')}
                activeOpacity={0.7}
              >
                <Trophy size={15} color={sportMode === 'nba' ? (isDark ? '#F26522' : '#1D428A') : (isDark ? '#555570' : '#AEAEB2')} />
                <Text style={[
                  sportToggleStyles.optionLabel,
                  { color: sportMode === 'nba'
                    ? (isDark ? '#F26522' : '#1D428A')
                    : (isDark ? '#555570' : '#AEAEB2')
                  },
                  sportMode === 'nba' && { fontWeight: '700' as const },
                ]}>NBA</Text>
              </TouchableOpacity>
              )}
            </View>
          </View>
          )}

        </LinearGradient>
      </Animated.View>

      {sportMode === 'ufc' && (
        <View style={styles.tabWrapper}>
          <TabPill
            tabs={ufcTabs}
            activeTab={ufcTab}
            onTabChange={(tab) => setUfcTab(tab as 'upcoming' | 'results')}
            counts={ufcCounts}
            isDark={isDark}
          />
        </View>
      )}

      {sportMode === 'football' && (!hasTeams && !isLoading && !hasError && !hasConfigError) ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" colors={['#007AFF']} />
          }
        >
          {footballHeader}
          <View style={styles.setupPrompt}>
            <LinearGradient
              colors={['#1B6B34', '#2ECC71']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.setupIconCircle}
            >
              <Shield size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.setupTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>Follow Your Teams</Text>
            <Text style={[styles.setupSub, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
              Add your favourite clubs and national teams to see live scores, upcoming fixtures, and results
            </Text>
            <TouchableOpacity
              style={styles.setupBtn}
              onPress={() => router.push('/(tabs)/profile' as any)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#1B6B34', '#2ECC71']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.setupBtnGradient}
              >
                <Heart size={16} color="#FFFFFF" />
                <Text style={styles.setupBtnText}>Set Up Teams</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingPulse}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
          <Text style={[styles.loadingText, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>Loading matches...</Text>
        </View>
      ) : hasConfigError ? (
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: isDark ? '#2A1A1A' : '#FFF5F5' }]}>
            <AlertCircle size={28} color="#FF9500" strokeWidth={2} />
          </View>
          <Text style={[styles.errorTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>API Configuration Required</Text>
          <Text style={[styles.errorSub, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
            Football API key is not configured on the server
          </Text>
        </View>
      ) : hasError ? (
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: isDark ? '#2A1A1A' : '#FFF5F5' }]}>
            <AlertCircle size={28} color="#FF3B30" strokeWidth={2} />
          </View>
          <Text style={[styles.errorTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>Unable to Load</Text>
          <Text style={[styles.errorSub, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
            Please check your connection and try again
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh} activeOpacity={0.85}>
            <RefreshCw size={16} color="#007AFF" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : sportMode === 'football' && displayMatches.length === 0 && !isLoading ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" colors={['#007AFF']} />
          }
        >
          {footballHeader}
          <EmptyState type={activeTab} isDark={isDark} />
        </ScrollView>
      ) : sportMode === 'football' && !isLoading ? (
        <FlatList
          data={flatListData}
          renderItem={renderFlatListItem}
          keyExtractor={flatListKeyExtractor}
          ListHeaderComponent={<>{footballHeader}</>}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" colors={['#007AFF']} />
          }
        />
      ) : sportMode === 'ufc' && isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingPulse}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
          <Text style={[styles.loadingText, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>Loading fights...</Text>
        </View>
      ) : sportMode === 'ufc' && hasConfigError ? (
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: isDark ? '#2A1A1A' : '#FFF5F5' }]}>
            <AlertCircle size={28} color="#FF9500" strokeWidth={2} />
          </View>
          <Text style={[styles.errorTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>API Configuration Required</Text>
          <Text style={[styles.errorSub, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
            MMA API key is not configured on the server
          </Text>
        </View>
      ) : sportMode === 'ufc' && hasError ? (
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: isDark ? '#2A1A1A' : '#FFF5F5' }]}>
            <AlertCircle size={28} color="#FF3B30" strokeWidth={2} />
          </View>
          <Text style={[styles.errorTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>Unable to Load</Text>
          <Text style={[styles.errorSub, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
            Please check your connection and try again
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh} activeOpacity={0.85}>
            <RefreshCw size={16} color="#D4AF37" />
            <Text style={[styles.retryBtnText, { color: '#D4AF37' }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : sportMode === 'ufc' && ufcDisplayFights.length === 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" colors={['#D4AF37']} />
          }
        >
          <View style={ufcStyles.emptyHero}>
            <LinearGradient
              colors={['#1A0808', '#1C0A18', '#0F0A1E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={ufcStyles.emptyHeroGradient}
            >
              <View style={ufcStyles.emptyHeroGoldAccent} />
              <LinearGradient
                colors={['#D4AF37', '#B8860B']}
                style={ufcStyles.emptyHeroIconCircle}
              >
                <Swords size={32} color="#FFFFFF" strokeWidth={2} />
              </LinearGradient>
              <Text style={ufcStyles.emptyHeroTitle}>
                {UFC_EMPTY_CONFIG[ufcTab].title}
              </Text>
              <Text style={ufcStyles.emptyHeroSub}>
                {hasConfigError
                  ? 'The MMA API requires a separate subscription on api-sports.io (free plan available). Your football API key works for football but MMA needs its own activation.'
                  : UFC_EMPTY_CONFIG[ufcTab].sub}
              </Text>
              {hasConfigError ? (
                <>
                  <View style={ufcStyles.emptyHeroDivider} />
                  <View style={ufcStyles.emptyHeroInfoRow}>
                    <AlertCircle size={14} color="#D4AF37" />
                    <Text style={ufcStyles.emptyHeroInfoText}>
                      Visit api-sports.io, log in with your account, and subscribe to the MMA API (free plan with 100 requests/day).
                    </Text>
                  </View>
                  <View style={[ufcStyles.emptyHeroInfoRow, { marginTop: 8 }]}>
                    <RefreshCw size={14} color="#6B6B85" />
                    <Text style={ufcStyles.emptyHeroInfoText}>
                      After subscribing, pull down to refresh.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={ufcStyles.emptyHeroDivider} />
                  <View style={ufcStyles.emptyHeroInfoRow}>
                    <RefreshCw size={14} color="#6B6B85" />
                    <Text style={ufcStyles.emptyHeroInfoText}>
                      Pull down to refresh and try again.
                    </Text>
                  </View>
                </>
              )}
            </LinearGradient>
          </View>
        </ScrollView>
      ) : sportMode === 'ufc' ? (
        <View style={{ flex: 1 }}>
          <View style={ufcStyles.ufcStatsBar}>
            <View style={[ufcStyles.ufcStatItem, { backgroundColor: isDark ? '#111125' : '#F5F5FA' }]}>
              <Text style={[ufcStyles.ufcStatValue, { color: isDark ? '#D4AF37' : '#B8860B' }]}>
                {ufcTab === 'upcoming' ? ufcUpcomingFights.length : ufcResultsFights.length}
              </Text>
              <Text style={[ufcStyles.ufcStatLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
                {ufcTab === 'upcoming' ? 'FIGHTS' : 'RESULTS'}
              </Text>
            </View>
            <View style={[ufcStyles.ufcStatItem, { backgroundColor: isDark ? '#111125' : '#F5F5FA' }]}>
              <Text style={[ufcStyles.ufcStatValue, { color: isDark ? '#D4AF37' : '#B8860B' }]}>
                {ufcGroupedByEvent.length}
              </Text>
              <Text style={[ufcStyles.ufcStatLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
                EVENTS
              </Text>
            </View>
            {ufcTab === 'results' && (
              <View style={[ufcStyles.ufcStatItem, { backgroundColor: isDark ? '#111125' : '#F5F5FA' }]}>
                <Text style={[ufcStyles.ufcStatValue, { color: isDark ? '#FF6B6B' : '#DC2626' }]}>
                  {ufcResultsFights.filter(f => f.result?.method?.toLowerCase().includes('ko') || f.result?.method?.toLowerCase().includes('tko')).length}
                </Text>
                <Text style={[ufcStyles.ufcStatLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
                  KO/TKO
                </Text>
              </View>
            )}
            {ufcTab === 'results' && (
              <View style={[ufcStyles.ufcStatItem, { backgroundColor: isDark ? '#111125' : '#F5F5FA' }]}>
                <Text style={[ufcStyles.ufcStatValue, { color: isDark ? '#7C3AED' : '#6D28D9' }]}>
                  {ufcResultsFights.filter(f => f.result?.method?.toLowerCase().includes('sub')).length}
                </Text>
                <Text style={[ufcStyles.ufcStatLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
                  SUB
                </Text>
              </View>
            )}
            {ufcTab === 'upcoming' && ufcUpcomingFights.length > 0 && (
              <View style={[ufcStyles.ufcStatItem, { backgroundColor: isDark ? '#111125' : '#F5F5FA' }]}>
                <Text style={[ufcStyles.ufcStatValue, { color: isDark ? '#3B82F6' : '#2563EB' }]}>
                  {(() => {
                    const next = ufcUpcomingFights[0];
                    const d = new Date(next.date);
                    const now = new Date();
                    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diff > 0 ? `${diff}d` : 'Today';
                  })()}
                </Text>
                <Text style={[ufcStyles.ufcStatLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
                  NEXT
                </Text>
              </View>
            )}
            {ufcTab === 'upcoming' && ufcGroupedByEvent.length > 0 && (
              <View style={[ufcStyles.ufcStatItem, { backgroundColor: isDark ? '#111125' : '#F5F5FA' }]}>
                <Text style={[ufcStyles.ufcStatValue, { color: isDark ? '#10B981' : '#059669' }]}>
                  {ufcUpcomingFights.filter(f => f.fighter1.name !== 'TBA' && f.fighter2.name !== 'TBA').length}
                </Text>
                <Text style={[ufcStyles.ufcStatLabel, { color: isDark ? '#6B6B85' : '#8E8E93' }]}>
                  CONFIRMED
                </Text>
              </View>
            )}
          </View>
          <FlatList
            data={ufcFlatListData}
            renderItem={renderUfcItem}
            keyExtractor={ufcFlatListKeyExtractor}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews={Platform.OS !== 'web'}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" colors={['#D4AF37']} />
            }
          />
        </View>
      ) : null}

      {sportMode === 'f1' && (
        <F1Section isDark={isDark} insets={insets} />
      )}

      {sportMode === 'nba' && (
        <NBASection isDark={isDark} insets={insets} />
      )}
      
      {selectedMatch && showMatchModal && (
        <MatchDetailsModal
          visible={showMatchModal}
          onClose={() => { setShowMatchModal(false); setSelectedMatch(null); }}
          fixtureId={parseInt(selectedMatch.id, 10)}
          homeTeam={selectedMatch.homeTeam}
          awayTeam={selectedMatch.awayTeam}
          homeScore={selectedMatch.homeScore}
          awayScore={selectedMatch.awayScore}
          league={selectedMatch.league}
          homeTeamLogo={selectedMatch.homeTeamLogo}
          awayTeamLogo={selectedMatch.awayTeamLogo}
        />
      )}
      
      {selectedLeagueForStandings && (
        <LeagueStandingsModal
          visible={showStandingsModal}
          onClose={() => { setShowStandingsModal(false); setSelectedLeagueForStandings(null); }}
          leagueId={selectedLeagueForStandings.id}
          leagueName={selectedLeagueForStandings.name}
        />
      )}
      
      {selectedFight && showFightModal && (
        <UFCFightDetailModal
          visible={showFightModal}
          onClose={() => { setShowFightModal(false); setSelectedFight(null); }}
          fight={selectedFight}
          isDark={isDark}
        />
      )}

      <Modal
        visible={showLeaguePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLeaguePicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowLeaguePicker(false)} />
          <View style={[styles.pickerContainer, { backgroundColor: isDark ? '#1C1C2E' : '#FFFFFF' }]}>
            <View style={styles.pickerHandle} />
            <View style={[styles.pickerHeader, { borderBottomColor: isDark ? '#2A2A44' : '#F2F2F7' }]}>
              <Text style={[styles.pickerTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>League Tables</Text>
              <TouchableOpacity onPress={() => setShowLeaguePicker(false)} style={styles.pickerClose}>
                <X size={20} color={isDark ? '#7B7B95' : '#8E8E93'} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {availableLeaguesForStandings.map((league) => (
                <TouchableOpacity
                  key={league.id}
                  style={[styles.pickerItem, { borderBottomColor: isDark ? '#2A2A44' : '#F2F2F7' }]}
                  onPress={() => handleSelectLeagueForStandings(league)}
                  activeOpacity={0.7}
                >
                  {league.logo ? (
                    <Image source={{ uri: league.logo }} style={styles.pickerLogo} resizeMode="contain" />
                  ) : (
                    <View style={[styles.pickerLogoFallback, { backgroundColor: isDark ? '#252540' : '#F5F5F7' }]}>
                      <Trophy size={16} color={isDark ? '#6B6B85' : '#AEAEB2'} />
                    </View>
                  )}
                  <View style={styles.pickerInfo}>
                    <Text style={[styles.pickerName, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>{league.name}</Text>
                    {league.country ? (
                      <Text style={[styles.pickerCountry, { color: isDark ? '#6B6B85' : '#AEAEB2' }]}>{league.country}</Text>
                    ) : null}
                  </View>
                  <ChevronRight size={18} color={isDark ? '#3A3A5A' : '#D1D5DB'} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    zIndex: 10,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleArea: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  tickerSection: {
    paddingTop: 6,
    paddingBottom: 14,
  },
  tickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tickerLiveDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,59,48,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tickerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  tickerCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 22,
    alignItems: 'center' as const,
  },
  tickerCountText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#FF3B30',
  },
  tickerSeeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tickerSeeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  tickerList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tickerCardWrapper: {
    width: SCREEN_WIDTH * 0.58,
  },
  tickerCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.15)',
    shadowColor: '#FF3B30',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  tickerLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  tickerLiveText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FF4757',
    letterSpacing: 0.8,
  },
  tickerElapsed: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: 'rgba(255, 71, 87, 0.7)',
  },
  tickerTeams: {
    gap: 6,
    marginBottom: 10,
  },
  tickerTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tickerLogoWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tickerLogo: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  tickerTeamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#E4E4ED',
  },
  tickerScore: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#E4E4ED',
    minWidth: 20,
    textAlign: 'right' as const,
  },
  tickerScoreWinning: {
    color: '#2ECC71',
  },
  tickerLeague: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 8,
  },
  tickerLeagueLogo: {
    width: 14,
    height: 14,
  },
  tickerLeagueName: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#6B6B85',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
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
  filterArea: {
    marginBottom: 12,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  standingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.12)',
  },
  standingsBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#34C759',
    letterSpacing: -0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  matchesList: {
    gap: 10,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  },
  cardWrapper: {
    width: '100%',
    marginBottom: 8,
  },
  matchCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  cardInner: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  cardInnerDark: {
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  liveCardBorder: {
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  leagueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  leagueLogo: {
    width: 20,
    height: 20,
  },
  leagueIconFallback: {
    width: 20,
    height: 20,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueName: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  leagueCountry: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.15)',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FF3B30',
    letterSpacing: 0.8,
  },
  elapsedText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FF3B30',
    opacity: 0.8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  matchBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  teamRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  teamRowRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    minWidth: 0,
  },
  teamLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  teamNameHorizontal: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    flexShrink: 1,
    flexGrow: 1,
  },
  favStarInline: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favStarHeader: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginLeft: 4,
  },
  scoreCenter: {
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  scoreBlockLive: {
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.15)',
  },
  scoreNum: {
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  scoreDash: {
    fontSize: 18,
    fontWeight: '300' as const,
    marginHorizontal: 2,
  },
  vsBlock: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  vsLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  matchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  venueText: {
    fontSize: 11,
    flex: 1,
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '700' as const,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 21,
  },
  setupPrompt: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  setupIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  setupSub: {
    fontSize: 15,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 24,
  },
  setupBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  setupBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  setupBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 100,
    gap: 16,
  },
  loadingPulse: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  errorSub: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  livePulseContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  livePulseRing: {
    position: 'absolute',
  },
  livePulseDot: {},
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  pickerHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  pickerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerScroll: {
    paddingVertical: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  pickerLogo: {
    width: 36,
    height: 36,
  },
  pickerLogoFallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerInfo: {
    flex: 1,
  },
  pickerName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  pickerCountry: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  footerLeft: {
    flex: 1,
    gap: 6,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinnedText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#F59E0B',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

const sportToggleStyles = StyleSheet.create({
  container: {
    marginTop: 0,
  },
  track: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    gap: 3,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  optionActive: {
    borderWidth: 0,
  },
  optionEmoji: {
    fontSize: 15,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
});

const ufcStyles = StyleSheet.create({
  eventBanner: {
    marginBottom: 8,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  eventBannerGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    position: 'relative' as const,
  },
  eventBannerAccent: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#D4AF37',
    borderRadius: 2,
  },
  eventBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  eventBannerIconWrap: {
    borderRadius: 10,
    overflow: 'hidden' as const,
  },
  eventBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventBannerTextWrap: {
    flex: 1,
  },
  eventBannerTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#F0F0FA',
    letterSpacing: -0.2,
  },
  eventBannerSub: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#6B6B85',
  },
  eventBannerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  eventBannerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#4A4A6A',
  },
  eventBannerDateLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#D4AF37',
  },
  eventBannerBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  eventBannerBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#D4AF37',
    letterSpacing: 1,
  },
  ufcStatsBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  ufcStatItem: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.08)',
  },
  ufcStatValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  ufcStatLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  fightCardWrapper: {
    width: '100%',
    marginBottom: 6,
  },
  fightCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    overflow: 'hidden' as const,
  },
  liveGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  fightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fightEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  weightBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  weightBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  fightLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  fightLiveText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FF3B30',
    letterSpacing: 0.8,
  },
  fightStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  fightStatusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  fightersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  fighterSide: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'flex-start' as const,
    gap: 8,
  },
  fighterAvatarOuter: {
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  fighterAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fighterPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    resizeMode: 'cover' as const,
  },
  fighterName: {
    fontSize: 13,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  winnerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  winnerBadgeText: {
    fontSize: 9,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  loserBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  loserBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  vsCenter: {
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    gap: 6,
  },
  vsLine: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  vsCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  resultRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center' as const,
  },
  resultMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  resultMethodEmoji: {
    fontSize: 13,
  },
  resultMethod: {
    fontSize: 12,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    letterSpacing: -0.1,
  },
  resultDetailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resultDetailText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  upcomingFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  upcomingFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upcomingFooterText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  upcomingFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  daysAwayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  daysAwayText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  fightEventName: {
    fontSize: 10,
    fontWeight: '500' as const,
    flex: 1,
  },
  fighterAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fighterInitials: {
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  countdownCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden' as const,
    shadowColor: '#D4AF37',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  countdownGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  countdownGoldBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#D4AF37',
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#D4AF37',
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  countdownEvent: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#F0F0FA',
    letterSpacing: -0.3,
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  countdownFighters: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  countdownFighterWrap: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 8,
  },
  countdownAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden' as const,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  countdownAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  countdownAvatarInitial: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#D4AF37',
  },
  countdownFighterName: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#E0E0F0',
    textAlign: 'center' as const,
    maxWidth: 100,
  },
  countdownVsWrap: {
    paddingHorizontal: 12,
  },
  countdownVsBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownVsText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  countdownTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  countdownTimeBox: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    minWidth: 60,
  },
  countdownTimeValue: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#D4AF37',
    letterSpacing: -0.5,
  },
  countdownTimeUnit: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: '#6B6B85',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  countdownTimeSep: {
    fontSize: 20,
    fontWeight: '300' as const,
    color: '#4A4A6A',
  },
  countdownWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countdownWeightBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
  },
  countdownWeightText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#D4AF37',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  countdownDateText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#6B6B85',
  },
  emptyHero: {
    marginTop: 40,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden' as const,
  },
  emptyHeroGradient: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  emptyHeroGoldAccent: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#D4AF37',
  },
  emptyHeroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyHeroTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#F0F0FA',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyHeroSub: {
    fontSize: 14,
    color: '#6B6B85',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyHeroDivider: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    marginBottom: 16,
  },
  emptyHeroInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyHeroInfoText: {
    fontSize: 12,
    color: '#5A5A7A',
    flex: 1,
  },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(212, 175, 55, 0.06)',
  },
  tapHintText: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
});
