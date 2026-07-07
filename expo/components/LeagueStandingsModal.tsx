import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { X, Shield } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { trpc } from '@/lib/trpc';
import { useTheme } from '@/hooks/useTheme';
import { getCompetitionById } from '@/constants/competitions';
import FootballLeagueLogo from '@/components/FootballLeagueLogo';
import {
  buildKnockoutRoundGroups,
  detectKnockoutPhase,
  mapApiFixturesToKnockoutLite,
  type KnockoutFixtureLite,
} from '@/utils/footballKnockout';
import * as Haptics from 'expo-haptics';

interface LeagueStandingsModalProps {
  visible: boolean;
  onClose: () => void;
  leagueId: number;
  leagueName: string;
  /** When known from fixtures, improves first fetch (API season year). */
  season?: number;
  /** Fixtures for this league from the feed — powers knockout bracket without an extra fetch. */
  leagueFixtures?: KnockoutFixtureLite[];
  onFixturePress?: (fixture: KnockoutFixtureLite) => void;
}

type StatsTabKey = 'knockout' | 'groups' | 'table' | 'goals' | 'assists';

export default function LeagueStandingsModal({
  visible,
  onClose,
  leagueId,
  leagueName,
  season: seasonHint,
  leagueFixtures,
  onFixturePress,
}: LeagueStandingsModalProps) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = windowWidth;
  const pagerRef = useRef<ScrollView>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [statsTabIndex, setStatsTabIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setStatsTabIndex(0);
      setSelectedGroup('all');
    }
  }, [visible]);

  const liveFootballQuery = trpc.football.getMatches.useQuery(
    { type: 'live' },
    {
      enabled: visible,
      staleTime: 15 * 1000,
      refetchInterval: visible ? 30 * 1000 : false,
    },
  );

  const leagueHasLiveFixture = useMemo(() => {
    const rows = liveFootballQuery.data?.response;
    if (!Array.isArray(rows)) return false;
    return rows.some((m: { league?: { id?: number } }) => m?.league?.id === leagueId);
  }, [liveFootballQuery.data?.response, leagueId]);

  const needsFixtureFetch = visible && (!leagueFixtures || leagueFixtures.length === 0);
  const tournamentBundleQuery = trpc.football.getMatchesBundle.useQuery(
    {
      leagueIds: [leagueId],
      days: 90,
      teamIds: [],
      includeResults: true,
    },
    {
      enabled: needsFixtureFetch,
      staleTime: 5 * 60 * 1000,
    },
  );

  const effectiveLeagueFixtures = useMemo((): KnockoutFixtureLite[] => {
    if (leagueFixtures && leagueFixtures.length > 0) {
      return leagueFixtures.filter((f) => !f.leagueId || f.leagueId === leagueId);
    }
    const bundle = tournamentBundleQuery.data;
    if (!bundle) return [];
    const raw = [
      ...(bundle.live?.response ?? []),
      ...(bundle.upcoming?.response ?? []),
      ...(bundle.results?.response ?? []),
    ];
    const seen = new Set<string>();
    return mapApiFixturesToKnockoutLite(raw)
      .filter((f) => f.leagueId === leagueId || f.leagueId == null)
      .filter((f) => {
        if (!f.id || seen.has(f.id)) return false;
        seen.add(f.id);
        return true;
      });
  }, [leagueFixtures, tournamentBundleQuery.data, leagueId]);

  const knockoutPhase = useMemo(
    () => detectKnockoutPhase(effectiveLeagueFixtures),
    [effectiveLeagueFixtures],
  );

  const knockoutRoundGroups = useMemo(
    () => buildKnockoutRoundGroups(effectiveLeagueFixtures),
    [effectiveLeagueFixtures],
  );

  const statsTabs = useMemo((): { key: StatsTabKey; label: string }[] => {
    if (knockoutPhase) {
      return [
        { key: 'knockout', label: 'Knockout' },
        { key: 'groups', label: 'Final standings' },
        { key: 'goals', label: 'Top scorers' },
        { key: 'assists', label: 'Assists' },
      ];
    }
    return [
      { key: 'table', label: 'Table' },
      { key: 'goals', label: 'Top scorers' },
      { key: 'assists', label: 'Assists' },
    ];
  }, [knockoutPhase]);

  useEffect(() => {
    setStatsTabIndex(0);
    setSelectedGroup('all');
    pagerRef.current?.scrollTo({ x: 0, animated: false });
  }, [leagueId, knockoutPhase]);

  const standingsQuery = trpc.football.getLeagueStandings.useQuery(
    { leagueId, ...(seasonHint != null ? { season: seasonHint } : {}) },
    {
      enabled: visible,
      staleTime: leagueHasLiveFixture ? 0 : 5 * 60 * 1000,
      refetchInterval: visible && leagueHasLiveFixture ? 45 * 1000 : false,
    },
  );

  const leagueSeason =
    standingsQuery.data?.seasonUsed ??
    (standingsQuery.data?.response?.[0] as { league?: { season?: number } } | undefined)?.league
      ?.season ??
    seasonHint;

  const topPlayersQuery = trpc.football.getLeagueTopPlayers.useQuery(
    {
      leagueId,
      ...(leagueSeason != null ? { season: Number(leagueSeason) } : {}),
    },
    {
      enabled: visible && standingsQuery.isSuccess && leagueSeason != null,
    },
  );

  const handleClose = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const goToTab = useCallback(
    (idx: number) => {
      const i = Math.min(statsTabs.length - 1, Math.max(0, idx));
      setStatsTabIndex(i);
      pagerRef.current?.scrollTo({ x: i * pageWidth, animated: true });
      if (Platform.OS !== 'web') {
        void Haptics.selectionAsync();
      }
    },
    [pageWidth, statsTabs.length],
  );

  const onPagerMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / pageWidth);
      setStatsTabIndex(Math.min(statsTabs.length - 1, Math.max(0, idx)));
    },
    [pageWidth, statsTabs.length],
  );

  const standings = standingsQuery.data?.response?.[0]?.league?.standings;
  const leagueData = standingsQuery.data?.response?.[0]?.league;
  const hasStandingsRows = useMemo(() => {
    if (!Array.isArray(standings) || standings.length === 0) return false;
    return standings.some((group) => Array.isArray(group) && group.length > 0);
  }, [standings]);
  const hasMultipleGroups = hasStandingsRows && standings!.length > 1;
  const noTableReason = standingsQuery.data?.noTableReason;
  const competitionMeta = useMemo(() => getCompetitionById(leagueId), [leagueId]);
  const isCupCompetition = competitionMeta?.type === 'cup' || noTableReason === 'cup';

  const topScorers = topPlayersQuery.data?.topScorers ?? [];
  const topAssists = topPlayersQuery.data?.topAssists ?? [];

  const getFormColor = (result: string) => {
    switch (result) {
      case 'W':
        return colors.success;
      case 'L':
        return colors.error;
      case 'D':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getQualificationColor = (_rank: number, description?: string) => {
    if (!description) return 'transparent';

    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('champions league')) return '#00FF8720';
    if (lowerDesc.includes('europa league') || lowerDesc.includes('uefa europa league')) return '#FF670020';
    if (lowerDesc.includes('relegation')) return '#FF3B3020';
    if (lowerDesc.includes('promotion')) return '#00FF8720';

    return 'transparent';
  };

  const renderKnockoutBody = () => {
    if (knockoutRoundGroups.length === 0) {
      return (
        <View style={styles.leadersEmpty}>
          <Text style={[styles.leadersEmptyText, { color: colors.textSecondary }]}>
            Knockout fixtures will appear here once the bracket is published.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.standingsScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <Text style={[styles.knockoutHint, { color: colors.textSecondary }]}>
          Live bracket from tournament fixtures — group tables are under Final standings.
        </Text>
        {knockoutRoundGroups.map((group) => (
          <View key={group.roundLabel} style={styles.knockoutRoundBlock}>
            <Text style={[styles.knockoutRoundTitle, { color: colors.text }]}>{group.roundLabel}</Text>
            {group.fixtures.map((fixture) => {
              const scoreKnown =
                fixture.homeScore != null &&
                fixture.awayScore != null &&
                fixture.status !== 'Upcoming';
              const row = (
                <>
                  <View style={styles.knockoutTeamSide}>
                    {fixture.homeTeamLogo ? (
                      <Image source={{ uri: fixture.homeTeamLogo }} style={styles.knockoutCrest} />
                    ) : (
                      <Shield size={16} color={colors.textSecondary} />
                    )}
                    <Text style={[styles.knockoutTeamName, { color: colors.text }]} numberOfLines={2}>
                      {fixture.homeTeam}
                    </Text>
                  </View>
                  <View style={styles.knockoutScoreBlock}>
                    {fixture.status === 'Live' ? (
                      <Text style={[styles.knockoutLiveBadge, { color: colors.error }]}>LIVE</Text>
                    ) : null}
                    <Text style={[styles.knockoutScore, { color: colors.text }]}>
                      {scoreKnown
                        ? `${fixture.homeScore} – ${fixture.awayScore}`
                        : fixture.time ?? 'vs'}
                    </Text>
                  </View>
                  <View style={[styles.knockoutTeamSide, styles.knockoutTeamSideAway]}>
                    {fixture.awayTeamLogo ? (
                      <Image source={{ uri: fixture.awayTeamLogo }} style={styles.knockoutCrest} />
                    ) : (
                      <Shield size={16} color={colors.textSecondary} />
                    )}
                    <Text
                      style={[styles.knockoutTeamName, styles.knockoutTeamNameAway, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {fixture.awayTeam}
                    </Text>
                  </View>
                </>
              );
              return onFixturePress ? (
                <TouchableOpacity
                  key={fixture.id}
                  style={[styles.knockoutFixtureRow, { borderBottomColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    onFixturePress(fixture);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${fixture.homeTeam} vs ${fixture.awayTeam}`}
                >
                  {row}
                </TouchableOpacity>
              ) : (
                <View
                  key={fixture.id}
                  style={[styles.knockoutFixtureRow, { borderBottomColor: colors.border }]}
                >
                  {row}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderStandingsBody = () => {
    if (!standings) {
      return (
        <View style={styles.leadersEmpty}>
          <Text style={[styles.leadersEmptyText, { color: colors.textSecondary }]}>
            Final group tables are not available right now.
          </Text>
        </View>
      );
    }
    return (
      <ScrollView style={styles.standingsScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <View style={[styles.tableHeader, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={styles.positionHeader}>
            <Text style={[styles.headerText2, { color: colors.textSecondary }]}>#</Text>
          </View>
          <View style={styles.teamHeader}>
            <Text style={[styles.headerText2, { color: colors.textSecondary }]}>Team</Text>
          </View>
          <View style={styles.statsHeader}>
            <Text style={[styles.headerText2, { color: colors.textSecondary }]}>P</Text>
            <Text style={[styles.headerText2, { color: colors.textSecondary }]}>W</Text>
            <Text style={[styles.headerText2, { color: colors.textSecondary }]}>D</Text>
            <Text style={[styles.headerText2, { color: colors.textSecondary }]}>L</Text>
            <Text style={[styles.headerText2, { color: colors.textSecondary }]}>GD</Text>
            <Text style={[styles.headerText2, { color: colors.textSecondary }]}>Pts</Text>
          </View>
        </View>

        {(selectedGroup === 'all' ? standings : [standings[parseInt(selectedGroup.split('-')[1], 10)]]).map(
          (group: any) =>
            group.map((team: any) => (
              <View
                key={team.team.id}
                style={[
                  styles.teamRow,
                  {
                    backgroundColor: getQualificationColor(team.rank, team.description),
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={styles.positionCell}>
                  <Text
                    style={[
                      styles.positionText,
                      { color: colors.text },
                      team.rank <= 4 && { color: colors.primary, fontWeight: '700' },
                    ]}
                  >
                    {team.rank}
                  </Text>
                </View>
                <View style={styles.teamCell}>
                  {team.team.logo ? (
                    <Image source={{ uri: team.team.logo }} style={styles.teamLogo} />
                  ) : (
                    <Shield size={16} color={colors.textSecondary} />
                  )}
                  <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                    {team.team.name}
                  </Text>
                </View>
                <View style={styles.statsCell}>
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>{team.all.played}</Text>
                  <Text style={[styles.statText, { color: colors.success }]}>{team.all.win}</Text>
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>{team.all.draw}</Text>
                  <Text style={[styles.statText, { color: colors.error }]}>{team.all.lose}</Text>
                  <Text
                    style={[styles.statText, { color: team.goalsDiff >= 0 ? colors.success : colors.error }]}
                  >
                    {team.goalsDiff > 0 ? '+' : ''}
                    {team.goalsDiff}
                  </Text>
                  <Text style={[styles.pointsText, { color: colors.text }]}>{team.points}</Text>
                </View>
              </View>
            )),
        )}

        <View style={styles.formSection}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Recent form</Text>
          {(selectedGroup === 'all' ? standings[0] : standings[parseInt(selectedGroup.split('-')[1], 10) || 0])
            ?.slice(0, 5)
            .map((team: any) => (
              <View key={team.team.id} style={styles.formRow}>
                <View style={styles.formTeam}>
                  {team.team.logo && <Image source={{ uri: team.team.logo }} style={styles.formTeamLogo} />}
                  <Text style={[styles.formTeamName, { color: colors.text }]} numberOfLines={1}>
                    {team.team.name}
                  </Text>
                </View>
                <View style={styles.formResults}>
                  {team.form
                    ?.split('')
                    .slice(-5)
                    .map((result: string, i: number) => {
                      const color = getFormColor(result);
                      return (
                        <View key={i} style={[styles.formBadge, { backgroundColor: `${color}15` }]}>
                          <Text style={[styles.formBadgeText, { color }]}>{result}</Text>
                        </View>
                      );
                    })}
                </View>
              </View>
            ))}
        </View>
      </ScrollView>
    );
  };

  const renderLeaderRow = (
    rank: number,
    name: string,
    photo: string | null | undefined,
    teamLogo: string | null | undefined,
    statLabel: string,
    statValue: number,
  ) => (
    <View key={`${name}-${rank}`} style={[styles.leaderRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.leaderRank, { color: colors.textSecondary }]}>{rank}</Text>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.leaderPhoto} />
      ) : (
        <View style={[styles.leaderPhoto, { backgroundColor: colors.surfaceSecondary }]} />
      )}
      <View style={styles.leaderMid}>
        <Text style={[styles.leaderName, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        {teamLogo ? (
          <Image source={{ uri: teamLogo }} style={styles.leaderTeamLogoSmall} />
        ) : (
          <Shield size={14} color={colors.textSecondary} style={{ marginTop: 4 }} />
        )}
      </View>
      <View style={styles.leaderStat}>
        <Text style={[styles.leaderStatVal, { color: colors.primary }]}>{statValue}</Text>
        <Text style={[styles.leaderStatLbl, { color: colors.textSecondary }]}>{statLabel}</Text>
      </View>
    </View>
  );

  const renderGoalsPage = () => {
    if (topPlayersQuery.isLoading) {
      return (
        <View style={styles.leadersLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading top scorers…</Text>
        </View>
      );
    }
    if (topScorers.length === 0) {
      return (
        <View style={styles.leadersEmpty}>
          <Text style={[styles.leadersEmptyText, { color: colors.textSecondary }]}>
            No scorer data for this league season yet.
          </Text>
        </View>
      );
    }
    return (
      <ScrollView style={styles.leadersScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <Text style={[styles.leadersHint, { color: colors.textSecondary }]}>
          Goals in domestic league matches (season {String(leagueSeason ?? '')}).
        </Text>
        {topScorers.map((row, index) =>
          renderLeaderRow(index + 1, row.playerName, row.photo, row.teamLogo, 'goals', row.goals),
        )}
      </ScrollView>
    );
  };

  const renderAssistsPage = () => {
    if (topPlayersQuery.isLoading) {
      return (
        <View style={styles.leadersLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading assists…</Text>
        </View>
      );
    }
    if (topAssists.length === 0) {
      return (
        <View style={styles.leadersEmpty}>
          <Text style={[styles.leadersEmptyText, { color: colors.textSecondary }]}>
            No assist data for this league season yet.
          </Text>
        </View>
      );
    }
    return (
      <ScrollView style={styles.leadersScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <Text style={[styles.leadersHint, { color: colors.textSecondary }]}>
          Assists in domestic league matches (season {String(leagueSeason ?? '')}).
        </Text>
        {topAssists.map((row, index) =>
          renderLeaderRow(index + 1, row.playerName, row.photo, row.teamLogo, 'assists', row.assists),
        )}
      </ScrollView>
    );
  };

  const canShowStatsPager = hasStandingsRows || knockoutPhase;
  const statsDataLoading =
    standingsQuery.isLoading ||
    (needsFixtureFetch && tournamentBundleQuery.isLoading && effectiveLeagueFixtures.length === 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
        )}

        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerContent}>
              <FootballLeagueLogo
                leagueId={leagueId}
                leagueName={leagueData?.name || leagueName}
                leagueLogo={leagueData?.logo}
                size={40}
                style={styles.leagueLogo}
                fallbackStyle={{ backgroundColor: colors.surfaceSecondary }}
                fallbackIconSize={18}
                fallbackColor={colors.textSecondary}
              />
              <View style={styles.headerText}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {leagueData?.name || leagueName}
                </Text>
                <Text style={[styles.seasonText, { color: colors.textSecondary }]}>
                  {leagueSeason != null ? `${leagueSeason} season` : 'Season'} · tables & leaders
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeButton, { backgroundColor: colors.surfaceSecondary }]}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {hasMultipleGroups && statsTabIndex === (knockoutPhase ? 1 : 0) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.groupSelector}
              contentContainerStyle={styles.groupSelectorContent}
            >
              <TouchableOpacity
                style={[
                  styles.groupChip,
                  { backgroundColor: colors.surfaceSecondary },
                  selectedGroup === 'all' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setSelectedGroup('all')}
              >
                <Text
                  style={[
                    styles.groupChipText,
                    { color: colors.text },
                    selectedGroup === 'all' && { color: colors.card },
                  ]}
                >
                  All Groups
                </Text>
              </TouchableOpacity>
              {standings?.map((_group: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.groupChip,
                    { backgroundColor: colors.surfaceSecondary },
                    selectedGroup === `group-${index}` && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedGroup(`group-${index}`)}
                >
                  <Text
                    style={[
                      styles.groupChipText,
                      { color: colors.text },
                      selectedGroup === `group-${index}` && { color: colors.card },
                    ]}
                  >
                    Group {String.fromCharCode(65 + index)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {statsDataLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading standings…</Text>
            </View>
          ) : !canShowStatsPager ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {isCupCompetition
                  ? 'No league table for this cup'
                  : 'Failed to load standings'}
              </Text>
              <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
                {isCupCompetition
                  ? 'Knockout competitions use brackets instead of season tables. Try top scorers from match stats or pick a league competition.'
                  : 'Check your connection or try again in a moment.'}
              </Text>
            </View>
          ) : (
            <View style={styles.pagerShell}>
              <View style={[styles.statsTabBar, { borderBottomColor: colors.border }]}>
                {statsTabs.map((tab, idx) => {
                  const active = statsTabIndex === idx;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.statsTab,
                        active && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
                      ]}
                      onPress={() => goToTab(idx)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={tab.label}
                    >
                      <Text
                        style={[
                          styles.statsTabLabel,
                          { color: active ? colors.primary : colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <ScrollView
                ref={pagerRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onPagerMomentumEnd}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                style={styles.pager}
              >
                {statsTabs.map((tab) => (
                  <View key={tab.key} style={[styles.pagerPage, { width: pageWidth }]}>
                    {tab.key === 'knockout' ? renderKnockoutBody() : null}
                    {tab.key === 'groups' || tab.key === 'table' ? renderStandingsBody() : null}
                    {tab.key === 'goals' ? renderGoalsPage() : null}
                    {tab.key === 'assists' ? renderAssistsPage() : null}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  leagueLogo: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  headerText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  seasonText: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupSelector: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  groupSelectorContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  groupChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  groupChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  pagerShell: {
    flex: 1,
    minHeight: 0,
  },
  statsTabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  statsTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: -StyleSheet.hairlineWidth,
  },
  statsTabLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  pager: {
    flex: 1,
  },
  pagerPage: {
    flex: 1,
  },
  standingsScroll: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  positionHeader: {
    width: 40,
    alignItems: 'center',
  },
  teamHeader: {
    flex: 1,
  },
  statsHeader: {
    flexDirection: 'row',
    width: 180,
    justifyContent: 'space-between',
  },
  headerText2: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  teamRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  positionCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  teamCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamLogo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },

  teamName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statsCell: {
    flexDirection: 'row',
    width: 180,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
    width: 28,
    textAlign: 'center',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '700',
    width: 28,
    textAlign: 'center',
  },
  formSection: {
    padding: 20,
    gap: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  formTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  formTeamLogo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  formTeamName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formResults: {
    flexDirection: 'row',
    gap: 6,
  },
  formBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  leadersScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  leadersHint: {
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 17,
  },
  leadersLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  leadersEmpty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  leadersEmptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  leaderRank: {
    width: 28,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  leaderPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  leaderMid: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 6,
  },
  leaderName: {
    fontSize: 15,
    fontWeight: '700',
  },
  leaderTeamLogoSmall: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  leaderStat: {
    alignItems: 'flex-end',
    minWidth: 52,
  },
  leaderStatVal: {
    fontSize: 17,
    fontWeight: '800',
  },
  leaderStatLbl: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  knockoutHint: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  knockoutRoundBlock: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  knockoutRoundTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  knockoutFixtureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  knockoutTeamSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  knockoutTeamSideAway: {
    flexDirection: 'row-reverse',
  },
  knockoutCrest: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  knockoutTeamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  knockoutTeamNameAway: {
    textAlign: 'right',
  },
  knockoutScoreBlock: {
    alignItems: 'center',
    minWidth: 56,
    gap: 2,
  },
  knockoutScore: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  knockoutLiveBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
