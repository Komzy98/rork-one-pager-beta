import React, { useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Shield, ChevronRight, Trophy } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LiveFootballMatch } from '@/types/habit';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WIDGET_WIDTH = SCREEN_WIDTH - 32;
const COMPACT_WIDGET_WIDTH = (SCREEN_WIDTH - 44) / 2;

interface MatchScoreWidgetProps {
  liveMatches: LiveFootballMatch[];
  upcomingMatches: LiveFootballMatch[];
  completedMatches: LiveFootballMatch[];
  onMatchPress?: (match: LiveFootballMatch) => void;
  onViewAll?: () => void;
}

const getTeamAbbrev = (name: string): string => {
  if (name.length <= 3) return name.toUpperCase();
  const words = name.split(/[\s-]+/);
  if (words.length >= 3) return words.map(w => w[0]).join('').toUpperCase().slice(0, 3);
  if (words.length === 2) {
    if (words[0].length <= 3) return words[0].toUpperCase();
    return (words[0].slice(0, 2) + words[1][0]).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
};

const LiveDot = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 2.5, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim, opacityAnim]);

  return (
    <View style={widgetStyles.liveDotContainer}>
      <Animated.View
        style={[
          widgetStyles.liveDotPulse,
          { transform: [{ scale: pulseAnim }], opacity: opacityAnim },
        ]}
      />
      <View style={widgetStyles.liveDotCore} />
    </View>
  );
};

const WidgetMatchCard = React.memo(({
  match,
  onPress,
  variant = 'full',
}: {
  match: LiveFootballMatch;
  onPress?: () => void;
  variant?: 'full' | 'compact';
}) => {
  const { colors } = useTheme();
  const isLive = match.status === 'Live';
  const isCompleted = match.status === 'Completed';
  const hasScore = match.homeScore != null && match.awayScore != null;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress?.();
  }, [onPress, scaleAnim]);

  const getMatchTimeLabel = () => {
    if (isLive && match.elapsed) return `${match.elapsed}'`;
    if (isLive) return 'LIVE';
    if (isCompleted) return 'FT';
    const d = new Date(match.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const matchDay = new Date(d);
    matchDay.setHours(0, 0, 0, 0);
    if (matchDay.getTime() === now.getTime()) return match.time;
    if (matchDay.getTime() === tomorrow.getTime()) return 'TMR';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const isDark = colors.background !== '#F8F9FA' && colors.background !== '#FFFFFF';

  if (variant === 'compact') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.92}
          style={[
            widgetStyles.compactWidget,
            {
              backgroundColor: isDark ? '#1C1C2E' : '#FFFFFF',
              shadowColor: isDark ? '#000' : '#8E8E93',
            },
          ]}
        >
          <View style={widgetStyles.compactTop}>
            {isLive && <LiveDot />}
            <View style={[
              widgetStyles.compactTimeBadge,
              {
                backgroundColor: isLive
                  ? 'rgba(255, 59, 48, 0.12)'
                  : isCompleted
                    ? 'rgba(16, 185, 129, 0.10)'
                    : 'rgba(0, 122, 255, 0.10)',
              },
            ]}>
              <Text style={[
                widgetStyles.compactTimeText,
                {
                  color: isLive ? '#FF3B30' : isCompleted ? '#10B981' : '#007AFF',
                },
              ]}>
                {getMatchTimeLabel()}
              </Text>
            </View>
          </View>

          <View style={widgetStyles.compactTeams}>
            <View style={widgetStyles.compactTeamRow}>
              <View style={[widgetStyles.compactLogoBox, { backgroundColor: isDark ? '#252540' : '#F5F5FA' }]}>
                {match.homeTeamLogo ? (
                  <Image source={{ uri: match.homeTeamLogo }} style={widgetStyles.compactLogo} />
                ) : (
                  <Shield size={14} color={isDark ? '#5A5A7A' : '#C7C7CC'} />
                )}
              </View>
              <Text style={[widgetStyles.compactTeamName, { color: isDark ? '#E8E8F0' : '#1C1C1E' }]} numberOfLines={1}>
                {getTeamAbbrev(match.homeTeam)}
              </Text>
              {hasScore && (
                <Text style={[
                  widgetStyles.compactScore,
                  { color: isDark ? '#F0F0FA' : '#1C1C1E' },
                  isLive && { color: '#FF3B30' },
                  isCompleted && (match.homeScore ?? 0) > (match.awayScore ?? 0) && { color: '#10B981' },
                ]}>
                  {match.homeScore}
                </Text>
              )}
            </View>
            <View style={widgetStyles.compactTeamRow}>
              <View style={[widgetStyles.compactLogoBox, { backgroundColor: isDark ? '#252540' : '#F5F5FA' }]}>
                {match.awayTeamLogo ? (
                  <Image source={{ uri: match.awayTeamLogo }} style={widgetStyles.compactLogo} />
                ) : (
                  <Shield size={14} color={isDark ? '#5A5A7A' : '#C7C7CC'} />
                )}
              </View>
              <Text style={[widgetStyles.compactTeamName, { color: isDark ? '#E8E8F0' : '#1C1C1E' }]} numberOfLines={1}>
                {getTeamAbbrev(match.awayTeam)}
              </Text>
              {hasScore && (
                <Text style={[
                  widgetStyles.compactScore,
                  { color: isDark ? '#F0F0FA' : '#1C1C1E' },
                  isLive && { color: '#FF3B30' },
                  isCompleted && (match.awayScore ?? 0) > (match.homeScore ?? 0) && { color: '#10B981' },
                ]}>
                  {match.awayScore}
                </Text>
              )}
            </View>
          </View>

          <Text style={[widgetStyles.compactLeague, { color: isDark ? '#5A5A70' : '#AEAEB2' }]} numberOfLines={1}>
            {match.league}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.92}
        style={[
          widgetStyles.fullWidget,
          {
            backgroundColor: isDark ? '#1C1C2E' : '#FFFFFF',
            shadowColor: isDark ? '#000' : '#8E8E93',
          },
          isLive && widgetStyles.fullWidgetLive,
        ]}
      >
        <View style={widgetStyles.fullHeader}>
          <View style={widgetStyles.fullLeagueRow}>
            {match.leagueLogo ? (
              <Image source={{ uri: match.leagueLogo }} style={widgetStyles.fullLeagueLogo} />
            ) : null}
            <Text style={[widgetStyles.fullLeagueName, { color: isDark ? '#7A7A95' : '#8E8E93' }]} numberOfLines={1}>
              {match.league}
            </Text>
          </View>
          <View style={[
            widgetStyles.fullTimeBadge,
            {
              backgroundColor: isLive
                ? 'rgba(255, 59, 48, 0.12)'
                : isCompleted
                  ? 'rgba(16, 185, 129, 0.10)'
                  : 'rgba(0, 122, 255, 0.08)',
            },
          ]}>
            {isLive && <LiveDot />}
            <Text style={[
              widgetStyles.fullTimeText,
              {
                color: isLive ? '#FF3B30' : isCompleted ? '#10B981' : '#007AFF',
                fontWeight: isLive ? '700' as const : '600' as const,
              },
            ]}>
              {getMatchTimeLabel()}
            </Text>
          </View>
        </View>

        <View style={widgetStyles.fullBody}>
          <View style={widgetStyles.fullTeamSide}>
            <View style={[widgetStyles.fullLogoBox, { backgroundColor: isDark ? '#252540' : '#F5F5FA' }]}>
              {match.homeTeamLogo ? (
                <Image source={{ uri: match.homeTeamLogo }} style={widgetStyles.fullLogo} />
              ) : (
                <Shield size={24} color={isDark ? '#5A5A7A' : '#C7C7CC'} />
              )}
            </View>
            <Text style={[widgetStyles.fullTeamAbbrev, { color: isDark ? '#B0B0C8' : '#3C3C43' }]}>
              {getTeamAbbrev(match.homeTeam)}
            </Text>
          </View>

          <View style={widgetStyles.fullScoreCenter}>
            {hasScore ? (
              <View style={widgetStyles.fullScoreRow}>
                <Text style={[
                  widgetStyles.fullScoreNum,
                  { color: isDark ? '#F0F0FA' : '#1C1C1E' },
                  isLive && { color: '#FF3B30' },
                  isCompleted && (match.homeScore ?? 0) > (match.awayScore ?? 0) && { color: '#10B981' },
                ]}>
                  {match.homeScore}
                </Text>
                <View style={widgetStyles.fullScoreDivider}>
                  <Text style={[widgetStyles.fullScoreDash, { color: isDark ? '#3A3A55' : '#D1D1D6' }]}>-</Text>
                </View>
                <Text style={[
                  widgetStyles.fullScoreNum,
                  { color: isDark ? '#F0F0FA' : '#1C1C1E' },
                  isLive && { color: '#FF3B30' },
                  isCompleted && (match.awayScore ?? 0) > (match.homeScore ?? 0) && { color: '#10B981' },
                ]}>
                  {match.awayScore}
                </Text>
              </View>
            ) : (
              <View style={[widgetStyles.fullVsBadge, { backgroundColor: isDark ? '#252540' : '#F0F0F5' }]}>
                <Text style={[widgetStyles.fullVsText, { color: isDark ? '#5A5A70' : '#BEBEC4' }]}>VS</Text>
              </View>
            )}
          </View>

          <View style={widgetStyles.fullTeamSide}>
            <View style={[widgetStyles.fullLogoBox, { backgroundColor: isDark ? '#252540' : '#F5F5FA' }]}>
              {match.awayTeamLogo ? (
                <Image source={{ uri: match.awayTeamLogo }} style={widgetStyles.fullLogo} />
              ) : (
                <Shield size={24} color={isDark ? '#5A5A7A' : '#C7C7CC'} />
              )}
            </View>
            <Text style={[widgetStyles.fullTeamAbbrev, { color: isDark ? '#B0B0C8' : '#3C3C43' }]}>
              {getTeamAbbrev(match.awayTeam)}
            </Text>
          </View>
        </View>

        {match.venue && (
          <Text style={[widgetStyles.fullVenue, { color: isDark ? '#44445E' : '#C7C7CC' }]} numberOfLines={1}>
            {match.venue}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function MatchScoreWidget({
  liveMatches,
  upcomingMatches,
  completedMatches,
  onMatchPress,
  onViewAll,
}: MatchScoreWidgetProps) {
  const { colors } = useTheme();
  const isDark = colors.background !== '#F8F9FA' && colors.background !== '#FFFFFF';

  const featuredMatch = liveMatches[0] || completedMatches[0] || upcomingMatches[0];
  const sideMatches = [
    ...(liveMatches.length > 1 ? liveMatches.slice(1) : []),
    ...(featuredMatch?.status === 'Live' ? completedMatches.slice(0, 1) : []),
    ...upcomingMatches.slice(0, 3),
    ...completedMatches.slice(featuredMatch?.status === 'Completed' ? 1 : 0, 3),
  ].filter((m, i, arr) => arr.findIndex(a => a.id === m.id) === i && m.id !== featuredMatch?.id).slice(0, 4);

  const totalMatches = liveMatches.length + upcomingMatches.length + completedMatches.length;

  if (!featuredMatch && totalMatches === 0) return null;

  return (
    <View style={widgetStyles.container}>
      <View style={widgetStyles.headerRow}>
        <View style={widgetStyles.headerLeft}>
          <View style={[widgetStyles.headerIcon, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.10)' }]}>
            <Trophy size={16} color="#007AFF" />
          </View>
          <Text style={[widgetStyles.headerTitle, { color: isDark ? '#E8E8F0' : '#1C1C1E' }]}>Match Scores</Text>
          {liveMatches.length > 0 && (
            <View style={widgetStyles.liveCountBadge}>
              <Text style={widgetStyles.liveCountText}>{liveMatches.length} LIVE</Text>
            </View>
          )}
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} style={widgetStyles.viewAllBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={widgetStyles.viewAllText}>View All</Text>
            <ChevronRight size={14} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {featuredMatch && (
        <WidgetMatchCard
          match={featuredMatch}
          onPress={() => onMatchPress?.(featuredMatch)}
          variant="full"
        />
      )}

      {sideMatches.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={widgetStyles.compactScroll}
          snapToInterval={COMPACT_WIDGET_WIDTH + 10}
          decelerationRate="fast"
        >
          {sideMatches.map((match) => (
            <WidgetMatchCard
              key={match.id}
              match={match}
              onPress={() => onMatchPress?.(match)}
              variant="compact"
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const widgetStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  liveCountBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  liveCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },

  fullWidget: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  fullWidgetLive: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fullLeagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  fullLeagueLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  fullLeagueName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  fullTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  fullTimeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
  },
  fullBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  fullTeamSide: {
    alignItems: 'center',
    width: 80,
    gap: 8,
  },
  fullLogoBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullLogo: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  fullTeamAbbrev: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    textAlign: 'center' as const,
  },
  fullScoreCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fullScoreNum: {
    fontSize: 38,
    fontWeight: '800' as const,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  fullScoreDivider: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScoreDash: {
    fontSize: 26,
    fontWeight: '300' as const,
  },
  fullVsBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  fullVsText: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  fullVenue: {
    fontSize: 11,
    fontWeight: '400' as const,
    textAlign: 'center' as const,
    marginTop: 12,
  },

  compactScroll: {
    gap: 10,
    paddingRight: 4,
  },
  compactWidget: {
    width: COMPACT_WIDGET_WIDTH,
    borderRadius: 16,
    padding: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 10,
    gap: 5,
  },
  compactTimeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  compactTimeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  compactTeams: {
    gap: 6,
    marginBottom: 8,
  },
  compactTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactLogoBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactLogo: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  compactTeamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  compactScore: {
    fontSize: 18,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'],
    minWidth: 22,
    textAlign: 'right' as const,
  },
  compactLeague: {
    fontSize: 10,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },

  liveDotContainer: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDotPulse: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
  },
  liveDotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
});
