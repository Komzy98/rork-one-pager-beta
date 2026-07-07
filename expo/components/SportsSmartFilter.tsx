import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart3, Check, Filter, Search, Shield, Target, Trophy, X } from 'lucide-react-native';
import FootballLeagueLogo from '@/components/FootballLeagueLogo';

/** Primary football surface filter (2 pills). */
export type FootballSmartFilter = 'for-you' | 'explore';

/** @deprecated Migrated to `explore` on read — kept for AsyncStorage migration only. */
export type LegacyFootballSmartFilter = 'top-leagues' | 'worldwide';

/** @deprecated Legacy storage values; migrate to FootballSmartFilter */
export type FootballFocusMode =
  | FootballSmartFilter
  | 'all'
  | 'my-teams'
  | 'my-countries'
  | 'my-leagues';

type LeagueOption = {
  id: number;
  name: string;
  country?: string;
  logo?: string;
};

interface SportsSmartFilterProps {
  isDark: boolean;
  focusMode: FootballFocusMode;
  onFocusModeChange: (mode: FootballFocusMode) => void;
  selectedLeagueIds: number[];
  onSelectedLeagueIdsChange: (leagueIds: number[]) => void;
  availableLeagues: LeagueOption[];
  recommendedLeagueIds?: number[];
  favoriteTeamsCount: number;
  nationalityCount: number;
  onTablesPress?: () => void;
  tablesDisabled?: boolean;
}

const FOCUS_OPTIONS: {
  id: FootballFocusMode;
  labelShort: string;
  accessibilityLabel: string;
  icon: React.ComponentType<any>;
}[] = [
  { id: 'all', labelShort: 'All', accessibilityLabel: 'All matches', icon: Filter },
  { id: 'my-teams', labelShort: 'Teams', accessibilityLabel: 'My teams', icon: Shield },
  { id: 'my-countries', labelShort: 'Countries', accessibilityLabel: 'My countries', icon: Target },
  { id: 'my-leagues', labelShort: 'Saved', accessibilityLabel: 'My saved leagues', icon: Trophy },
];

export default function SportsSmartFilter({
  isDark,
  focusMode,
  onFocusModeChange,
  selectedLeagueIds,
  onSelectedLeagueIdsChange,
  availableLeagues,
  recommendedLeagueIds = [],
  favoriteTeamsCount,
  nationalityCount,
  onTablesPress,
  tablesDisabled,
}: SportsSmartFilterProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const availableById = useMemo(() => new Set(availableLeagues.map((l) => l.id)), [availableLeagues]);

  const prunedSelectedLeagues = useMemo(
    () => selectedLeagueIds.filter((id) => availableById.has(id)),
    [selectedLeagueIds, availableById]
  );

  const recommendedLeagueSet = useMemo(() => new Set(recommendedLeagueIds), [recommendedLeagueIds]);

  const sortedLeagues = useMemo(() => {
    const topLeagueKeywords = [
      'premier league',
      'la liga',
      'bundesliga',
      'serie a',
      'ligue 1',
      'champions league',
      'europa league',
    ];
    const withPriority = availableLeagues.map((league) => {
      const lowerName = league.name.toLowerCase();
      const topRank = topLeagueKeywords.findIndex((keyword) => lowerName.includes(keyword));
      const selectedRank = prunedSelectedLeagues.includes(league.id) ? 0 : 1;
      const recommendedRank = recommendedLeagueSet.has(league.id) ? 0 : 1;
      const premiumRank = topRank === -1 ? 99 : topRank;
      return { league, selectedRank, recommendedRank, premiumRank };
    });
    withPriority.sort((a, b) => {
      if (a.selectedRank !== b.selectedRank) return a.selectedRank - b.selectedRank;
      if (a.recommendedRank !== b.recommendedRank) return a.recommendedRank - b.recommendedRank;
      if (a.premiumRank !== b.premiumRank) return a.premiumRank - b.premiumRank;
      return a.league.name.localeCompare(b.league.name);
    });
    return withPriority.map((item) => item.league);
  }, [availableLeagues, prunedSelectedLeagues, recommendedLeagueSet]);

  const filteredLeagues = useMemo(() => {
    if (!searchQuery.trim()) return sortedLeagues;
    const q = searchQuery.toLowerCase();
    return sortedLeagues.filter((league) =>
      `${league.name} ${league.country ?? ''}`.toLowerCase().includes(q)
    );
  }, [sortedLeagues, searchQuery]);

  const recommendedLeagues = useMemo(() => {
    if (searchQuery.trim()) return [];
    return filteredLeagues.filter((league) => recommendedLeagueSet.has(league.id)).slice(0, 8);
  }, [filteredLeagues, searchQuery, recommendedLeagueSet]);

  const remainingLeagues = useMemo(() => {
    if (searchQuery.trim()) return filteredLeagues;
    const recommendedIds = new Set(recommendedLeagues.map((league) => league.id));
    return filteredLeagues.filter((league) => !recommendedIds.has(league.id));
  }, [filteredLeagues, recommendedLeagues, searchQuery]);

  const toggleLeague = (leagueId: number) => {
    if (prunedSelectedLeagues.includes(leagueId)) {
      onSelectedLeagueIdsChange(prunedSelectedLeagues.filter((id) => id !== leagueId));
      return;
    }
    onSelectedLeagueIdsChange([...prunedSelectedLeagues, leagueId]);
  };

  const surfaceTrack = isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.72)';
  const borderTrack = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,24,39,0.08)';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.track, { backgroundColor: surfaceTrack, borderColor: borderTrack }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.stripContent}
        >
          {FOCUS_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = focusMode === option.id;
            const disabled =
              (option.id === 'my-teams' && favoriteTeamsCount === 0) ||
              (option.id === 'my-countries' && nationalityCount === 0);

            return (
              <TouchableOpacity
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={option.accessibilityLabel}
                accessibilityState={{ selected: active, disabled }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isDark ? 'rgba(28,34,56,0.85)' : 'rgba(255,255,255,0.88)',
                    borderColor: 'transparent',
                    opacity: disabled ? 0.45 : 1,
                  },
                  active && { backgroundColor: isDark ? 'rgba(10,132,255,0.24)' : 'rgba(10,132,255,0.12)', borderColor: '#0A84FF44' },
                ]}
                activeOpacity={0.85}
                disabled={disabled}
                onPress={() => onFocusModeChange(option.id)}
              >
                <Icon size={13} color={active ? '#0A84FF' : isDark ? '#A8B2D1' : '#52627B'} />
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? '#0A84FF' : isDark ? '#E8ECFA' : '#1C2740' },
                  ]}
                  numberOfLines={1}
                >
                  {option.labelShort}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={[styles.stripDivider, { backgroundColor: borderTrack }]} />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Choose leagues to filter"
            style={[
              styles.chip,
              styles.chipAccent,
              {
                backgroundColor: isDark ? 'rgba(21,34,56,0.86)' : 'rgba(239,246,255,0.84)',
                borderColor: 'transparent',
              },
            ]}
            activeOpacity={0.85}
            onPress={() => setIsModalVisible(true)}
          >
            <Filter size={13} color="#0A84FF" />
            <Text style={[styles.chipText, { color: '#0A84FF' }]} numberOfLines={1}>
              Leagues
            </Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{prunedSelectedLeagues.length}</Text>
            </View>
          </TouchableOpacity>

          {prunedSelectedLeagues.length > 0 ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear league filter"
              style={[
                styles.chip,
                {
                  backgroundColor: isDark ? 'rgba(42,24,32,0.85)' : 'rgba(255,241,242,0.9)',
                  borderColor: 'transparent',
                },
              ]}
              activeOpacity={0.85}
              onPress={() => onSelectedLeagueIdsChange([])}
            >
              <X size={13} color="#FF375F" />
              <Text style={[styles.chipText, { color: '#FF375F' }]} numberOfLines={1}>
                Clear
              </Text>
            </TouchableOpacity>
          ) : null}

          {onTablesPress ? (
            <>
              <View style={[styles.stripDivider, { backgroundColor: borderTrack }]} />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="League tables and stats"
                style={[
                  styles.chip,
                  {
                    backgroundColor: isDark ? 'rgba(21,40,31,0.84)' : 'rgba(236,253,245,0.86)',
                    borderColor: 'transparent',
                    opacity: tablesDisabled ? 0.35 : 1,
                  },
                ]}
                activeOpacity={0.85}
                disabled={tablesDisabled}
                onPress={onTablesPress}
              >
                <BarChart3 size={13} color="#34C759" />
                <Text
                  style={[styles.chipText, { color: isDark ? '#6EE7B7' : '#15803D' }]}
                  numberOfLines={1}
                >
                  Tables · stats
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </View>

      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsModalVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: isDark ? '#0D1225' : '#FFFFFF' }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: isDark ? '#252F4A' : '#E6ECF5' }]}>
              <Text style={[styles.sheetTitle, { color: isDark ? '#F3F7FF' : '#12203A' }]}>Choose leagues</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                <X size={18} color={isDark ? '#A3B1D1' : '#5B6D8D'} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: isDark ? '#141C35' : '#F3F6FB' }]}>
              <Search size={15} color={isDark ? '#A3B1D1' : '#6C7FA3'} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search league or country"
                placeholderTextColor={isDark ? '#7E8DB2' : '#8EA0C2'}
                style={[styles.searchInput, { color: isDark ? '#F3F7FF' : '#12203A' }]}
              />
            </View>

            <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
              {recommendedLeagues.length > 0 ? (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionLabel, { color: isDark ? '#8EA0C4' : '#60769F' }]}>Smart picks for you</Text>
                  {recommendedLeagues.map((league) => {
                    const selected = prunedSelectedLeagues.includes(league.id);
                    return (
                      <TouchableOpacity
                        key={`recommended-${league.id}`}
                        style={[
                          styles.leagueRow,
                          { borderColor: isDark ? '#27406B' : '#C8DDFB', backgroundColor: isDark ? '#0F1D38' : '#EFF6FF' },
                          selected && { borderColor: '#0A84FFAA', backgroundColor: '#0A84FF24' },
                        ]}
                        activeOpacity={0.85}
                        onPress={() => toggleLeague(league.id)}
                      >
                        <View style={styles.logoWrap}>
                          <FootballLeagueLogo
                            leagueId={league.id}
                            leagueName={league.name}
                            leagueLogo={league.logo}
                            size={28}
                            style={styles.logo}
                            fallbackIconSize={13}
                            fallbackColor={isDark ? '#99AED8' : '#6288C8'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.leagueName, { color: isDark ? '#F2F6FF' : '#12203A' }]}>{league.name}</Text>
                          {league.country ? (
                            <Text style={[styles.leagueCountry, { color: isDark ? '#92A2C7' : '#5F749C' }]}>
                              {league.country}
                            </Text>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.checkCircle,
                            { borderColor: isDark ? '#385078' : '#97B3E2' },
                            selected && { backgroundColor: '#0A84FF', borderColor: '#0A84FF' },
                          ]}
                        >
                          {selected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#8EA0C4' : '#60769F' }]}>
                  {searchQuery.trim() ? 'Search results' : 'All available leagues'}
                </Text>
                {remainingLeagues.map((league) => {
                  const selected = prunedSelectedLeagues.includes(league.id);
                  return (
                    <TouchableOpacity
                      key={league.id}
                      style={[
                        styles.leagueRow,
                        { borderColor: isDark ? '#232D46' : '#E3EAF5', backgroundColor: isDark ? '#111931' : '#FAFCFF' },
                        selected && { borderColor: '#0A84FF66', backgroundColor: '#0A84FF1A' },
                      ]}
                      activeOpacity={0.85}
                      onPress={() => toggleLeague(league.id)}
                    >
                      <View style={styles.logoWrap}>
                        <FootballLeagueLogo
                          leagueId={league.id}
                          leagueName={league.name}
                          leagueLogo={league.logo}
                          size={28}
                          style={styles.logo}
                          fallbackIconSize={13}
                          fallbackColor={isDark ? '#8CA0CA' : '#7A95C2'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.leagueName, { color: isDark ? '#F2F6FF' : '#12203A' }]}>{league.name}</Text>
                        {league.country ? (
                          <Text style={[styles.leagueCountry, { color: isDark ? '#92A2C7' : '#5F749C' }]}>
                            {league.country}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.checkCircle,
                          { borderColor: isDark ? '#385078' : '#97B3E2' },
                          selected && { backgroundColor: '#0A84FF', borderColor: '#0A84FF' },
                        ]}
                      >
                        {selected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: 20,
  },
  track: {
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  stripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexGrow: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 0.5,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexShrink: 0,
  },
  chipAccent: {},
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
    maxWidth: 96,
  },
  stripDivider: {
    width: 1,
    height: 22,
    alignSelf: 'center',
    flexShrink: 0,
    opacity: 0.9,
  },
  countPill: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: '#0A84FF28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0A84FF',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 19, fontWeight: '800' },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  searchBox: {
    marginHorizontal: 18,
    marginTop: 14,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  sheetContent: { paddingHorizontal: 18, paddingTop: 6 },
  sectionBlock: { marginBottom: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  leagueRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 18,
    height: 18,
  },
  leagueName: { fontSize: 14, fontWeight: '700' },
  leagueCountry: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
