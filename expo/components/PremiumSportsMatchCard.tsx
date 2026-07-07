import React, { useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
} from 'react-native';
import {
  Trophy,
  Shield,
  Clock,
  CheckCircle2,
  Star,
  MapPin,
  Pin,
  Bell,
  BellOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { sportsFixedPalette } from '@/utils/sportsPalette';
import { formatMatchRoundLabel, isKnockoutRoundLabel } from '@/utils/matchRoundLabel';
import { resolveLeagueLogoSource } from '@/utils/footballLeagueLabel';
import { formatFootballMatchBadgeTime } from '@/utils/footballKickoffLabel';

/** Favourite club indicator — always gold, independent of sports-tab green chrome. */
const FAVORITE_STAR_COLOR = '#F5B800';
const FAVORITE_STAR_BG = 'rgba(245, 184, 24, 0.22)';

/** Shape expected by the Sports tab list — maps cleanly from `LiveFootballMatch`. */
export type SportsMatchCardModel = {
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
  round?: string;
  elapsed?: number;
};

export function liveFootballMatchToCardModel(m: LiveFootballMatch): SportsMatchCardModel {
  return {
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeScore: m.homeScore ?? null,
    awayScore: m.awayScore ?? null,
    status: m.status,
    league: m.league,
    leagueId: m.leagueId ?? 0,
    leagueCountry: m.country ?? '',
    date: m.date,
    time: m.time,
    venue: m.venue,
    venueCity: undefined,
    homeTeamLogo: m.homeTeamLogo,
    awayTeamLogo: m.awayTeamLogo,
    leagueLogo: m.leagueLogo,
    round: m.round,
    elapsed: m.elapsed,
  };
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
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, opacityAnim]);

  return (
    <View style={[pulseStyles.livePulseContainer, { width: size, height: size }]}>
      <Animated.View
        style={[
          pulseStyles.livePulseRing,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
      <View
        style={[
          pulseStyles.livePulseDot,
          {
            backgroundColor: color,
            width: size * 0.75,
            height: size * 0.75,
            borderRadius: size * 0.375,
          },
        ]}
      />
    </View>
  );
};

export type MatchCardSurfaceColors = {
  card: string;
  border: string;
  surfaceSecondary: string;
  text: string;
  textMuted: string;
  primary: string;
  warning: string;
};

export const PremiumSportsMatchCard = React.memo(
  ({
    match,
    isFavoriteTeam,
    onPress,
    isNotified,
    onToggleNotification,
    isPinned,
    onTogglePin,
    onLeaguePress,
    surfaceColors,
  }: {
    match: SportsMatchCardModel;
    isFavoriteTeam: (name: string) => boolean;
    onPress?: () => void;
    isNotified?: boolean;
    onToggleNotification?: (matchId: string) => void;
    isPinned?: boolean;
    onTogglePin?: (matchId: string) => void;
    onLeaguePress?: (leagueId: number, leagueName: string) => void;
    /** When set (e.g. club profile sheet), card matches parent surface instead of sports-tab gold/blue. */
    surfaceColors?: MatchCardSurfaceColors;
  }) => {
    const { isDark } = useTheme();
    const sfBase = sportsFixedPalette(isDark);
    const sportsTabGreen = !surfaceColors;
    const mc = sportsTabGreen ? sfBase.matchChrome : null;
    const sf = surfaceColors
      ? { ...sfBase, ...surfaceColors }
      : mc
        ? {
            ...sfBase,
            card: mc.card,
            border: mc.border,
            surfaceSecondary: mc.surfaceSecondary,
            primary: mc.accent,
            warning: mc.accent,
          }
        : sfBase;
    const neutralSheet = !!surfaceColors;
    const isLive = match.status === 'Live';
    const isCompleted = match.status === 'Completed';
    const isUpcoming = !isLive && !isCompleted;
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
      return formatFootballMatchBadgeTime(match.date, match.time);
    };

    const getResultStyle = () => {
      if (!hasScore) return null;
      if (match.homeScore! > match.awayScore!) return { home: 'winner' as const, away: 'loser' as const };
      if (match.awayScore! > match.homeScore!) return { home: 'loser' as const, away: 'winner' as const };
      return { home: 'draw' as const, away: 'draw' as const };
    };

    const resultStyle = getResultStyle();
    const roundLabel = formatMatchRoundLabel(match.round);
    const isKnockoutRound = isKnockoutRoundLabel(roundLabel);
    const leagueLogoSource = resolveLeagueLogoSource({
      leagueId: match.leagueId,
      league: match.league,
      leagueLogo: match.leagueLogo,
      round: match.round,
    });

    return (
      <View style={cardStyles.cardWrapper}>
        <TouchableOpacity style={cardStyles.matchCard} onPress={handlePress} activeOpacity={0.95}>
          <View
            style={[
              cardStyles.cardInner,
              { backgroundColor: sf.card, borderColor: sf.border },
              sportsTabGreen && isUpcoming && !isLive && cardStyles.upcomingFootballCard,
              sportsTabGreen && isUpcoming && !isLive && isDark && { borderColor: mc!.border },
              sportsTabGreen && isUpcoming && !isLive && !isDark && {
                backgroundColor: mc!.card,
                borderColor: mc!.border,
                shadowColor: mc!.shadow,
              },
              isLive && cardStyles.liveCardBorder,
              isPinned && !isLive && { borderColor: `${sf.warning}55` },
            ]}
          >
            {isLive ? (
              <LinearGradient
                colors={[`${sf.live}14`, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={cardStyles.cardGlow}
                pointerEvents="none"
              />
            ) : isPinned ? (
              <LinearGradient
                colors={[`${sf.warning}12`, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={cardStyles.cardGlow}
                pointerEvents="none"
              />
            ) : sportsTabGreen && isUpcoming ? (
              <LinearGradient
                colors={[...mc!.glow]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={cardStyles.cardGlow}
                pointerEvents="none"
              />
            ) : null}
            <View style={cardStyles.matchHeader}>
              {onLeaguePress && match.leagueId > 0 ? (
                <TouchableOpacity
                  style={cardStyles.leagueInfo}
                  activeOpacity={0.75}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onLeaguePress(match.leagueId, match.league);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${match.league} in Explore`}
                >
                  {leagueLogoSource ? (
                    <Image source={leagueLogoSource} style={cardStyles.leagueLogo} resizeMode="contain" />
                  ) : (
                    <View style={[cardStyles.leagueIconFallback, { backgroundColor: sf.surfaceSecondary }]}>
                      <Trophy size={11} color={sf.textMuted} />
                    </View>
                  )}
                  <Text style={[cardStyles.leagueName, { color: sf.textMuted }]} numberOfLines={1}>
                    {match.league}
                  </Text>
                  {roundLabel ? (
                    <View
                      style={[
                        cardStyles.roundBadge,
                        isKnockoutRound && cardStyles.roundBadgeKnockout,
                        !isKnockoutRound && /group/i.test(roundLabel) && cardStyles.roundBadgeGroup,
                      ]}
                    >
                      <Text
                        style={[
                          cardStyles.roundBadgeText,
                          isKnockoutRound && cardStyles.roundBadgeTextKnockout,
                          !isKnockoutRound && /group/i.test(roundLabel) && cardStyles.roundBadgeTextGroup,
                        ]}
                        numberOfLines={1}
                      >
                        {roundLabel}
                      </Text>
                    </View>
                  ) : null}
                  {(homeIsFavorite || awayIsFavorite) && (
                    <View style={[cardStyles.favStarHeader, { backgroundColor: FAVORITE_STAR_BG }]}>
                      <Star size={9} color={FAVORITE_STAR_COLOR} fill={FAVORITE_STAR_COLOR} />
                    </View>
                  )}
                </TouchableOpacity>
              ) : (
              <View style={cardStyles.leagueInfo}>
                {leagueLogoSource ? (
                  <Image source={leagueLogoSource} style={cardStyles.leagueLogo} resizeMode="contain" />
                ) : (
                  <View style={[cardStyles.leagueIconFallback, { backgroundColor: sf.surfaceSecondary }]}>
                    <Trophy size={11} color={sf.textMuted} />
                  </View>
                )}
                <Text style={[cardStyles.leagueName, { color: sf.textMuted }]} numberOfLines={1}>
                  {match.league}
                </Text>
                {roundLabel ? (
                  <View
                    style={[
                      cardStyles.roundBadge,
                      isKnockoutRound && cardStyles.roundBadgeKnockout,
                      !isKnockoutRound && /group/i.test(roundLabel) && cardStyles.roundBadgeGroup,
                    ]}
                  >
                    <Text
                      style={[
                        cardStyles.roundBadgeText,
                        isKnockoutRound && cardStyles.roundBadgeTextKnockout,
                        !isKnockoutRound && /group/i.test(roundLabel) && cardStyles.roundBadgeTextGroup,
                      ]}
                      numberOfLines={1}
                    >
                      {roundLabel}
                    </Text>
                  </View>
                ) : null}
                {(homeIsFavorite || awayIsFavorite) && (
                  <View style={[cardStyles.favStarHeader, { backgroundColor: FAVORITE_STAR_BG }]}>
                    <Star size={9} color={FAVORITE_STAR_COLOR} fill={FAVORITE_STAR_COLOR} />
                  </View>
                )}
              </View>
              )}

              {isLive ? (
                <View style={cardStyles.liveIndicator}>
                  <LivePulse color={sf.live} size={6} />
                  <Text style={[cardStyles.liveText, { color: sf.live }]}>LIVE</Text>
                  {match.elapsed ? (
                    <Text style={[cardStyles.elapsedText, { color: sf.live }]}>{match.elapsed}&apos;</Text>
                  ) : null}
                </View>
              ) : isCompleted ? (
                <View style={[cardStyles.statusBadge, { backgroundColor: `${sf.success}22` }]}>
                  <CheckCircle2 size={11} color={sf.success} />
                  <Text style={[cardStyles.statusBadgeText, { color: sf.success }]}>FT</Text>
                </View>
              ) : (
                <View style={[cardStyles.statusBadge, { backgroundColor: `${sf.primary}18` }]}>
                  <Clock size={11} color={sf.primary} />
                  <Text style={[cardStyles.statusBadgeText, { color: sf.primary }]}>{getMatchTime()}</Text>
                </View>
              )}
            </View>

            <View style={cardStyles.matchBody}>
              <View style={cardStyles.teamRowLeft}>
                {match.homeTeamLogo ? (
                  <Image source={{ uri: match.homeTeamLogo }} style={cardStyles.teamLogo} />
                ) : (
                  <Shield size={22} color={sf.textMuted} />
                )}
                <Text
                  style={[
                    cardStyles.teamNameHorizontal,
                    { color: sf.text },
                    resultStyle?.home === 'loser' && { opacity: 0.5 },
                  ]}
                  numberOfLines={2}
                >
                  {match.homeTeam}
                </Text>
              </View>

              <View style={cardStyles.scoreCenter}>
                {hasScore ? (
                  <View
                    style={[
                      cardStyles.scoreBlock,
                      isLive && cardStyles.scoreBlockLive,
                      { backgroundColor: sf.surfaceSecondary },
                    ]}
                  >
                    <Text
                      style={[
                        cardStyles.scoreNum,
                        { color: sf.text },
                        isLive && { color: sf.live },
                        resultStyle?.home === 'winner' && { color: sf.success },
                      ]}
                    >
                      {match.homeScore}
                    </Text>
                    <Text style={[cardStyles.scoreDash, { color: sf.border }]}>:</Text>
                    <Text
                      style={[
                        cardStyles.scoreNum,
                        { color: sf.text },
                        isLive && { color: sf.live },
                        resultStyle?.away === 'winner' && { color: sf.success },
                      ]}
                    >
                      {match.awayScore}
                    </Text>
                  </View>
                ) : (
                  <View style={[cardStyles.vsBlock, { backgroundColor: sf.surfaceSecondary }]}>
                    <Text style={[cardStyles.vsLabel, { color: sf.textMuted }]}>VS</Text>
                  </View>
                )}
              </View>

              <View style={cardStyles.teamRowRight}>
                <Text
                  style={[
                    cardStyles.teamNameHorizontal,
                    { color: sf.text, textAlign: 'right' as const },
                    resultStyle?.away === 'loser' && { opacity: 0.5 },
                  ]}
                  numberOfLines={2}
                >
                  {match.awayTeam}
                </Text>
                {match.awayTeamLogo ? (
                  <Image source={{ uri: match.awayTeamLogo }} style={cardStyles.teamLogo} />
                ) : (
                  <Shield size={22} color={sf.textMuted} />
                )}
              </View>
            </View>

            <View style={[cardStyles.matchFooter, { borderTopColor: sf.border }]}>
              <View style={cardStyles.footerLeft}>
                {isPinned && (
                  <View style={cardStyles.pinnedBadge}>
                    <Pin size={10} color={sf.warning} />
                    <Text style={[cardStyles.pinnedText, { color: sf.warning }]}>Pinned</Text>
                  </View>
                )}
                {match.venue ? (
                  <View style={cardStyles.venueRow}>
                    <MapPin size={10} color={sf.textMuted} />
                    <Text style={[cardStyles.venueText, { color: sf.textMuted }]} numberOfLines={1}>
                      {match.venue}
                      {match.venueCity ? `, ${match.venueCity}` : ''}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={cardStyles.footerActions}>
                {onTogglePin && (
                  <TouchableOpacity
                    style={[
                      cardStyles.actionBtn,
                      {
                        backgroundColor: isPinned ? `${sf.warning}22` : sf.surfaceSecondary,
                      },
                    ]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      onTogglePin(match.id);
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={isPinned ? 'Unpin match' : 'Pin match'}
                  >
                    <Pin
                      size={14}
                      color={isPinned ? sf.warning : sf.textMuted}
                      fill={isPinned ? sf.warning : 'transparent'}
                    />
                  </TouchableOpacity>
                )}
                {match.status !== 'Completed' && onToggleNotification && (
                  <TouchableOpacity
                    style={[
                      cardStyles.actionBtn,
                      { backgroundColor: isNotified ? `${sf.primary}22` : sf.surfaceSecondary },
                    ]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      onToggleNotification(match.id);
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={isNotified ? 'Turn off match notifications' : 'Notify me for this match'}
                  >
                    {isNotified ? (
                      <Bell size={14} color={sf.primary} fill={sf.primary} />
                    ) : (
                      <BellOff size={14} color={sf.textMuted} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  },
  (prev, next) =>
    prev.match.id === next.match.id &&
    prev.match.homeScore === next.match.homeScore &&
    prev.match.awayScore === next.match.awayScore &&
    prev.match.status === next.match.status &&
    prev.match.elapsed === next.match.elapsed &&
    prev.isNotified === next.isNotified &&
    prev.isPinned === next.isPinned &&
    prev.onTogglePin === next.onTogglePin &&
    prev.onLeaguePress === next.onLeaguePress &&
    prev.surfaceColors === next.surfaceColors,
);

const pulseStyles = StyleSheet.create({
  livePulseContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  livePulseRing: {
    position: 'absolute',
  },
  livePulseDot: {},
});

const cardStyles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 12,
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
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    position: 'relative',
  },
  upcomingFootballCard: {
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  liveCardBorder: {
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  roundBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(100, 116, 139, 0.14)',
    flexShrink: 0,
  },
  roundBadgeKnockout: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  roundBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    color: '#64748B',
  },
  roundBadgeTextKnockout: {
    color: '#B45309',
  },
  roundBadgeGroup: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
  roundBadgeTextGroup: {
    color: '#1D4ED8',
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
    fontWeight: '800',
    color: '#FF3B30',
    letterSpacing: 0.8,
  },
  elapsedText: {
    fontSize: 10,
    fontWeight: '700',
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
    fontWeight: '700',
    color: '#10B981',
  },
  matchBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
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
    fontWeight: '600',
    lineHeight: 18,
    flexShrink: 1,
    flexGrow: 1,
  },
  favStarHeader: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  scoreCenter: {
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  scoreBlockLive: {
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.22)',
    shadowColor: '#FF3B30',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  scoreNum: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  scoreDash: {
    fontSize: 18,
    fontWeight: '300',
    marginHorizontal: 2,
  },
  vsBlock: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  vsLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  matchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    fontWeight: '700',
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  venueText: {
    fontSize: 11,
    flex: 1,
    fontWeight: '500',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
