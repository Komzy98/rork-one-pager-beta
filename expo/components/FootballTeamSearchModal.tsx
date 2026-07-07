import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Heart,
  MapPin,
  Search,
  Trophy,
  Users,
} from 'lucide-react-native';
import {
  type ApiStandingRow,
  getFootballCurrentSeason,
  type CoachLite,
  type SquadPlayerLite,
  type TeamLeagueEntry,
} from '@/utils/footballApi';
import { trpc } from '@/lib/trpc';
import type { LiveFootballMatch, UserTeam } from '@/types/habit';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getFootballTeamLogoUrl } from '@/constants/footballData';
import {
  PremiumSportsMatchCard,
  liveFootballMatchToCardModel,
} from '@/components/PremiumSportsMatchCard';

const GREEN = '#2E9A3F';
const GREEN_BRIGHT = '#3CCD59';
const GREEN_DEEP = '#1a6b2c';

/** Single source of truth for club profile chrome — avoids mixed greens, blues, and golds. */
function clubProfileTheme(isDark: boolean) {
  return {
    canvas: isDark ? '#0E1014' : '#E8E6E1',
    surface: isDark ? '#161A21' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(21, 24, 31, 0.1)',
    ink: isDark ? '#F2F0EB' : '#15181F',
    inkMuted: isDark ? '#9BA3AE' : '#5E6672',
    inkSoft: isDark ? '#6B7480' : '#8A929E',
    accent: isDark ? '#6B9B7A' : '#4A7C59',
    accentSoft: isDark ? 'rgba(107, 155, 122, 0.18)' : 'rgba(74, 124, 89, 0.12)',
    label: isDark ? '#B8AA82' : '#7A6F4A',
    formW: isDark ? '#5A9B6E' : '#3D7A52',
    formD: isDark ? '#6B7280' : '#94A3B8',
    formL: isDark ? '#B87070' : '#C45C5C',
    matchCard: {
      card: isDark ? '#161A21' : '#FFFFFF',
      border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(21, 24, 31, 0.1)',
      surfaceSecondary: isDark ? '#1E242C' : '#F3F2EF',
      text: isDark ? '#F2F0EB' : '#15181F',
      textMuted: isDark ? '#9BA3AE' : '#5E6672',
      primary: isDark ? '#6B9B7A' : '#4A7C59',
      warning: isDark ? '#B8AA82' : '#7A6F4A',
    },
  };
}

/** Open modal straight to a club (e.g. from hero “My clubs” crests). */
export type FootballClubProfilePreset = {
  apiId?: number;
  name: string;
  logo: string;
};

export type FootballTeamSearchModalProps = {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  /** When set while opening, resolves team ID and shows club profile instead of search. */
  initialClub?: FootballClubProfilePreset | null;
};

type SearchHit = { id: number; name: string; logo: string };

type LoadedClubProfile = {
  info: {
    id: number;
    name: string;
    logo: string;
    country: string;
    venue?: string;
    founded?: number;
  };
  league: TeamLeagueEntry | null;
  season: number;
  standing: ApiStandingRow | null;
  statsForm?: string;
};

function parseMatchKickoffMs(m: LiveFootballMatch): number {
  try {
    if (m.date.includes('T')) return new Date(m.date).getTime();
    const timePart = (m.time || '12:00').trim();
    const parts = timePart.split(':');
    const h = Number(parts[0]);
    const min = Number(parts[1]);
    const base = new Date(`${m.date}T12:00:00`);
    if (!Number.isNaN(h)) base.setHours(h, Number.isFinite(min) ? min : 0, 0, 0);
    return base.getTime();
  } catch {
    return 0;
  }
}

const MAX_FIXTURES_SHOWN = 3;

function FormPillStrip({
  form,
  theme,
}: {
  form: string;
  theme: ReturnType<typeof clubProfileTheme>;
}) {
  const chars = form
    .replace(/[^WDL]/gi, '')
    .slice(-5)
    .toUpperCase()
    .split('');
  if (!chars.length) return null;

  const pillColor = (c: string) => {
    if (c === 'W') return theme.formW;
    if (c === 'D') return theme.formD;
    if (c === 'L') return theme.formL;
    return theme.inkSoft;
  };

  return (
    <View style={styles.formPillRow}>
      {chars.map((c, i) => (
        <View key={`${c}-${i}`} style={[styles.formPill, { backgroundColor: pillColor(c) }]}>
          <Text style={styles.formPillText}>{c}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionHeader({
  kicker,
  title,
  trailing,
  theme,
}: {
  kicker: string;
  title: string;
  trailing?: React.ReactNode;
  theme: ReturnType<typeof clubProfileTheme>;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionKickerRow}>
        <View style={[styles.sectionKickerDot, { backgroundColor: theme.accent }]} />
        <Text style={[styles.sectionKicker, { color: theme.label }]}>{kicker}</Text>
      </View>
      <View style={styles.sectionHeadLine}>
        <Text style={[styles.sectionHeading, { color: theme.ink }]}>{title}</Text>
        {trailing}
      </View>
      <View style={[styles.sectionRule, { backgroundColor: theme.border }]} />
    </View>
  );
}

export default function FootballTeamSearchModal({
  visible,
  onClose,
  isDark,
  initialClub = null,
}: FootballTeamSearchModalProps) {
  const insets = useSafeAreaInsets();
  const { profile, addFavoriteTeam } = useUserProfile();
  const cp = useMemo(() => clubProfileTheme(isDark), [isDark]);

  const bg = isDark ? '#121412' : '#FAFBFA';
  const card = isDark ? '#1D221E' : '#FFFFFF';
  const border = isDark ? '#2D352E' : '#EBEEF1';
  const text = isDark ? '#F2F5F2' : '#101828';
  const muted = isDark ? '#A7B0A8' : '#667085';

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selected, setSelected] = useState<SearchHit | null>(null);

  const profileShellBg = selected ? cp.canvas : bg;
  const profileBorder = selected ? cp.border : border;
  const profileMuted = selected ? cp.inkMuted : muted;
  const profileText = selected ? cp.ink : text;

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setDebouncedQuery('');
      setSelected(null);
    }
  }, [visible]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 380);
    return () => clearTimeout(t);
  }, [query]);

  const initialClubName = initialClub?.name?.trim() ?? '';
  const initialClubSearchQuery = trpc.football.searchTeams.useQuery(
    { query: initialClubName },
    {
      enabled:
        visible &&
        !!initialClub &&
        (initialClub.apiId == null || initialClub.apiId <= 0) &&
        initialClubName.length >= 2,
      staleTime: 24 * 60 * 60 * 1000,
    },
  );

  useEffect(() => {
    if (!visible || !initialClub) return;
    const aid = initialClub.apiId;
    if (aid != null && aid > 0) {
      setSelected({
        id: aid,
        name: initialClub.name,
        logo: initialClub.logo,
      });
      return;
    }
    const hit = initialClubSearchQuery.data?.teams?.[0];
    if (hit) {
      setSelected({
        id: hit.id,
        name: hit.name,
        logo: hit.logo || initialClub.logo,
      });
    }
  }, [visible, initialClub, initialClubSearchQuery.data]);

  const teamSearchQuery = trpc.football.searchTeams.useQuery(
    { query: debouncedQuery },
    {
      enabled: visible && debouncedQuery.length >= 2,
      staleTime: 10 * 60 * 1000,
    },
  );

  const results: SearchHit[] =
    debouncedQuery.length >= 2 ? (teamSearchQuery.data?.teams ?? []) : [];
  const searchLoading = debouncedQuery.length >= 2 && teamSearchQuery.isFetching;

  const clubProfileQuery = trpc.football.getClubProfile.useQuery(
    { teamId: selected?.id ?? 0, nextFixtures: 15 },
    {
      enabled: visible && !!selected?.id,
      staleTime: 15 * 60 * 1000,
    },
  );

  const clubProfile = useMemo((): LoadedClubProfile | null => {
    if (!selected) return null;
    const d = clubProfileQuery.data;
    if (!d?.info && clubProfileQuery.isLoading) return null;
    const info = d?.info;
    return {
      info: info
        ? {
            id: info.id ?? selected.id,
            name: info.name,
            logo: info.logo,
            country: info.country,
            venue: info.venue,
            founded: typeof info.founded === 'number' ? info.founded : undefined,
          }
        : {
            id: selected.id,
            name: selected.name,
            logo: selected.logo,
            country: '',
          },
      league: d?.primaryLeague ?? null,
      season: d?.season ?? getFootballCurrentSeason(),
      standing: (d?.standing as ApiStandingRow | null) ?? null,
      statsForm: d?.statsForm,
    };
  }, [selected, clubProfileQuery.data, clubProfileQuery.isLoading]);

  const profileLoading = !!selected && (clubProfileQuery.isLoading || clubProfileQuery.isFetching);
  const profileError =
    clubProfileQuery.isError ||
    (clubProfileQuery.data?.errors && 'config' in clubProfileQuery.data.errors)
      ? 'Could not load club profile.'
      : null;
  const fixturesLoading = profileLoading;
  const squadExtrasLoading = profileLoading;

  const squadPlayers: SquadPlayerLite[] = clubProfileQuery.data?.squad ?? [];
  const coaches: CoachLite[] = clubProfileQuery.data?.coaches ?? [];

  const nextMatches = useMemo((): LiveFootballMatch[] => {
    const upcoming = clubProfileQuery.data?.upcoming ?? [];
    const now = Date.now();
    const up = upcoming.filter((m: LiveFootballMatch) => {
      if (m.status === 'Completed') return false;
      if (m.status === 'Upcoming') return true;
      return parseMatchKickoffMs(m) >= now - 3 * 60 * 60 * 1000;
    });
    up.sort((a: LiveFootballMatch, b: LiveFootballMatch) => parseMatchKickoffMs(a) - parseMatchKickoffMs(b));
    return up.slice(0, MAX_FIXTURES_SHOWN);
  }, [clubProfileQuery.data?.upcoming]);

  const formDisplay =
    (clubProfile?.standing?.form && String(clubProfile.standing.form)) || clubProfile?.statsForm || '—';

  const leagueRank = clubProfile?.standing?.rank;
  const leaguePoints = clubProfile?.standing?.points;
  const hasSeasonPerformance =
    !!clubProfile?.league || !!clubProfile?.standing || formDisplay !== '—';

  const alreadyFavorite = useMemo(() => {
    if (!selected || !profile?.favoriteTeams) return false;
    const sid = selected.id;
    const sname = selected.name.toLowerCase().trim();
    return profile.favoriteTeams.some(
      (t) => (t.apiId != null && t.apiId === sid) || t.name.toLowerCase().trim() === sname,
    );
  }, [selected, profile?.favoriteTeams]);

  const onPickTeam = useCallback((hit: SearchHit) => {
    setSelected(hit);
  }, []);

  const goBackToSearch = useCallback(() => {
    setSelected(null);
  }, []);

  const addToFavourites = useCallback(() => {
    if (!selected || alreadyFavorite || !profile) return;
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const team: UserTeam = {
      id: `api-${selected.id}`,
      name: selected.name,
      league: clubProfile?.league?.name ?? 'Football',
      country: clubProfile?.info.country || undefined,
      logo: selected.logo || clubProfile?.info.logo,
      apiId: selected.id,
    };
    addFavoriteTeam(team);
    setSelected(null);
    setQuery('');
    setDebouncedQuery('');
  }, [selected, alreadyFavorite, profile, clubProfile, addFavoriteTeam]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: profileShellBg, paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {selected ? (
          <BlurView
            intensity={isDark ? 48 : 72}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.headerRow, styles.headerRowPremium, { borderBottomColor: cp.border, backgroundColor: cp.surface }]}
          >
            <TouchableOpacity onPress={goBackToSearch} style={[styles.iconBtnPremium, { backgroundColor: cp.accentSoft }]} accessibilityRole="button">
              <ArrowLeft size={20} color={cp.ink} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
              <Text style={[styles.headerTitle, styles.headerTitlePremium, { color: cp.ink }]} numberOfLines={1}>
                {selected.name}
              </Text>
              <Text style={[styles.headerSubtitle, { color: cp.inkMuted }]} numberOfLines={1}>
                {clubProfile?.league?.name ?? 'Club profile'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.donePill, { backgroundColor: cp.accentSoft }]} hitSlop={12}>
              <Text style={[styles.donePillText, { color: cp.accent }]}>Done</Text>
            </TouchableOpacity>
          </BlurView>
        ) : (
          <View style={[styles.headerRow, { borderBottomColor: border }]}>
            <View style={{ width: 40 }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.headerTitle, { color: text }]}>Find a team</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closePad} hitSlop={12}>
              <Text style={{ color: GREEN, fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {!selected ? (
          <View style={styles.pad}>
            <View style={[styles.searchBox, { backgroundColor: card, borderColor: border }]}>
              <Search size={18} color={muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search clubs (e.g. Liverpool, Barça)…"
                placeholderTextColor={muted}
                style={[styles.searchInput, { color: text }]}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                autoFocus
              />
              {searchLoading ? <ActivityIndicator size="small" color={GREEN} /> : null}
            </View>
            <Text style={[styles.hint, { color: muted }]}>Type at least 2 characters. Results from live football data.</Text>
            {profile?.favoriteTeams && profile.favoriteTeams.length > 0 ? (
              <View style={styles.favoritesSection}>
                <Text style={[styles.favoritesLabel, { color: muted }]}>
                  Your clubs ({profile.favoriteTeams.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.favoritesRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {profile.favoriteTeams.map((team) => {
                    const logoUri = getFootballTeamLogoUrl(team) ?? team.logo;
                    const apiId = team.apiId;
                    return (
                      <Pressable
                        key={team.id}
                        onPress={() => {
                          if (apiId != null && apiId > 0) {
                            onPickTeam({ id: apiId, name: team.name, logo: logoUri });
                          }
                        }}
                        style={({ pressed }) => [
                          styles.favoriteChip,
                          { backgroundColor: card, borderColor: border, opacity: pressed ? 0.85 : 1 },
                        ]}
                      >
                        {logoUri ? (
                          <Image source={{ uri: logoUri }} style={styles.favoriteChipLogo} contentFit="contain" />
                        ) : (
                          <View style={[styles.favoriteChipLogo, { backgroundColor: border }]} />
                        )}
                        <Text style={[styles.favoriteChipName, { color: text }]} numberOfLines={1}>
                          {team.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
            <FlatList
              data={results}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              ListEmptyComponent={
                query.trim().length >= 2 && !searchLoading ? (
                  <Text style={{ color: muted, marginTop: 16 }}>No teams found. Try another spelling.</Text>
                ) : null
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onPickTeam(item)}
                  style={({ pressed }) => [
                    styles.resultRow,
                    { backgroundColor: card, borderColor: border, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  {item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.crest} contentFit="contain" />
                  ) : (
                    <View style={[styles.crest, { backgroundColor: border }]} />
                  )}
                  <Text style={[styles.resultName, { color: text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingBottom: insets.bottom + (alreadyFavorite ? 32 : 100),
              paddingHorizontal: 18,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.heroOuter,
                Platform.OS === 'ios'
                  ? {
                      shadowColor: cp.ink,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: isDark ? 0.35 : 0.08,
                      shadowRadius: 16,
                    }
                  : { elevation: isDark ? 6 : 3 },
              ]}
            >
              <View style={[styles.heroGradient, { backgroundColor: cp.surface, borderColor: cp.border }]}>
                <View style={[styles.heroAccentBar, { backgroundColor: cp.accent }]} />
                <View style={styles.heroTop}>
                  <View style={[styles.heroLogoRing, { borderColor: cp.border, backgroundColor: cp.accentSoft }]}>
                    <View style={[styles.heroLogoInner, { backgroundColor: cp.surface }]}>
                      {selected.logo ? (
                        <Image source={{ uri: selected.logo }} style={styles.heroLogo} contentFit="contain" />
                      ) : (
                        <View style={[styles.heroLogo, { backgroundColor: cp.border }]} />
                      )}
                    </View>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.heroKicker, { color: cp.label }]}>Club profile</Text>
                    <Text style={[styles.clubName, styles.clubNamePremium, { color: cp.ink }]} numberOfLines={2}>
                      {selected.name}
                    </Text>
                    {clubProfile?.info.country ? (
                      <Text style={[styles.meta, { color: cp.inkMuted }]}>{clubProfile.info.country}</Text>
                    ) : null}
                    {clubProfile?.info.founded ? (
                      <Text style={[styles.meta, { color: cp.inkMuted }]}>Founded {clubProfile.info.founded}</Text>
                    ) : null}
                    {clubProfile?.info.venue ? (
                      <View style={styles.venueRow}>
                        <MapPin size={14} color={cp.inkSoft} />
                        <Text style={[styles.meta, { color: cp.inkMuted, flex: 1 }]} numberOfLines={2}>
                          {clubProfile.info.venue}
                        </Text>
                      </View>
                    ) : null}
                    {clubProfile?.league ? (
                      <View style={[styles.leagueChip, { backgroundColor: cp.accentSoft }]}>
                        {clubProfile.league.logo ? (
                          <Image source={{ uri: clubProfile.league.logo }} style={styles.leagueChipLogo} contentFit="contain" />
                        ) : (
                          <Trophy size={12} color={cp.accent} />
                        )}
                        <Text style={[styles.leagueChipText, { color: cp.ink }]} numberOfLines={1}>
                          {clubProfile.league.name}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                {!profileLoading && (leagueRank != null || leaguePoints != null || formDisplay !== '—') ? (
                  <View style={[styles.heroStatsPanel, { borderColor: cp.border }]}>
                    {leagueRank != null ? (
                      <View style={styles.heroStatBlock}>
                        <Text style={[styles.heroStatLabel, { color: cp.inkMuted }]}>Rank</Text>
                        <Text style={[styles.heroStatValue, { color: cp.ink }]}>#{leagueRank}</Text>
                      </View>
                    ) : null}
                    {leaguePoints != null ? (
                      <View style={[styles.heroStatBlock, styles.heroStatBlockMid, { borderColor: cp.border }]}>
                        <Text style={[styles.heroStatLabel, { color: cp.inkMuted }]}>Points</Text>
                        <Text style={[styles.heroStatValue, { color: cp.ink }]}>{leaguePoints}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.heroStatBlock, styles.heroStatBlockForm]}>
                      <Text style={[styles.heroStatLabel, { color: cp.inkMuted }]}>Form</Text>
                      {formDisplay !== '—' ? (
                        <FormPillStrip form={formDisplay} theme={cp} />
                      ) : (
                        <Text style={[styles.heroStatValue, { color: cp.ink }]}>—</Text>
                      )}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader kicker="Competition" title="Season performance" theme={cp} />
              {profileLoading ? (
                <View style={styles.centerPad}>
                  <ActivityIndicator size="large" color={cp.accent} />
                  <Text style={{ color: cp.inkMuted, marginTop: 10 }}>Loading league standings…</Text>
                </View>
              ) : profileError ? (
                <Text style={{ color: '#FF3B30', marginTop: 4 }}>{profileError}</Text>
              ) : hasSeasonPerformance ? (
                <View
                  style={[
                    styles.statsCard,
                    styles.statsCardPremium,
                    { backgroundColor: cp.surface, borderColor: cp.border },
                    Platform.OS === 'ios'
                      ? {
                          shadowColor: cp.ink,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isDark ? 0.2 : 0.06,
                          shadowRadius: 12,
                        }
                      : { elevation: 2 },
                  ]}
                >
                  {clubProfile?.league ? (
                    <View style={[styles.statsLeagueBand, { backgroundColor: cp.accentSoft }]}>
                      <View style={styles.statsHead}>
                        <Trophy size={18} color={cp.label} />
                        <Text style={[styles.statsTitle, { color: cp.ink }]} numberOfLines={2}>
                          {clubProfile.league.name} · {clubProfile.season}/{String(clubProfile.season + 1).slice(-2)}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {clubProfile?.standing ? (
                    <>
                      <View style={styles.rowMetrics}>
                        <View style={[styles.metric, { backgroundColor: cp.accentSoft, borderColor: cp.border }]}>
                          <Text style={[styles.metricLbl, { color: cp.inkMuted }]}>Position</Text>
                          <Text style={[styles.metricVal, { color: cp.ink }]}>
                            {clubProfile.standing.rank != null ? `${clubProfile.standing.rank}` : '—'}
                          </Text>
                        </View>
                        <View style={[styles.metric, { backgroundColor: cp.accentSoft, borderColor: cp.border }]}>
                          <Text style={[styles.metricLbl, { color: cp.inkMuted }]}>Points</Text>
                          <Text style={[styles.metricVal, { color: cp.ink }]}>
                            {clubProfile.standing.points ?? '—'}
                          </Text>
                        </View>
                        <View style={[styles.metric, { backgroundColor: cp.accentSoft, borderColor: cp.border }]}>
                          <Text style={[styles.metricLbl, { color: cp.inkMuted }]}>Played</Text>
                          <Text style={[styles.metricVal, { color: cp.ink }]}>
                            {clubProfile.standing.all?.played ?? '—'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.rowMetrics}>
                        <View style={[styles.metric, { backgroundColor: cp.accentSoft, borderColor: cp.border }]}>
                          <Text style={[styles.metricLbl, { color: cp.inkMuted }]}>W</Text>
                          <Text style={[styles.metricVal, { color: cp.ink }]}>
                            {clubProfile.standing.all?.win ?? '—'}
                          </Text>
                        </View>
                        <View style={[styles.metric, { backgroundColor: cp.accentSoft, borderColor: cp.border }]}>
                          <Text style={[styles.metricLbl, { color: cp.inkMuted }]}>D</Text>
                          <Text style={[styles.metricVal, { color: cp.ink }]}>
                            {clubProfile.standing.all?.draw ?? '—'}
                          </Text>
                        </View>
                        <View style={[styles.metric, { backgroundColor: cp.accentSoft, borderColor: cp.border }]}>
                          <Text style={[styles.metricLbl, { color: cp.inkMuted }]}>L</Text>
                          <Text style={[styles.metricVal, { color: cp.ink }]}>
                            {clubProfile.standing.all?.lose ?? '—'}
                          </Text>
                        </View>
                        <View style={[styles.metric, { backgroundColor: cp.accentSoft, borderColor: cp.border }]}>
                          <Text style={[styles.metricLbl, { color: cp.inkMuted }]}>GD</Text>
                          <Text style={[styles.metricVal, { color: cp.ink }]}>
                            {clubProfile.standing.goalsDiff != null
                              ? `${clubProfile.standing.goalsDiff > 0 ? '+' : ''}${clubProfile.standing.goalsDiff}`
                              : '—'}
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <Text style={{ color: cp.inkMuted, marginBottom: 10 }}>
                      League table position isn&apos;t available for this competition or season yet.
                    </Text>
                  )}
                  {formDisplay !== '—' ? (
                    <View style={[styles.formRow, styles.formRowPremium, { backgroundColor: cp.accentSoft, borderColor: cp.border }]}>
                      <Text style={[styles.formLbl, { color: cp.inkMuted }]}>Recent form</Text>
                      <FormPillStrip form={formDisplay} theme={cp} />
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={{ color: cp.inkMuted, marginTop: 4, lineHeight: 20 }}>
                  Season stats aren&apos;t available for this club right now.
                </Text>
              )}
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader
                kicker="Schedule"
                title="Next 3 fixtures"
                theme={cp}
                trailing={
                  !fixturesLoading && nextMatches.length > 0 ? (
                    <Text style={[styles.sectionCountQuiet, { color: cp.inkSoft }]}>Upcoming</Text>
                  ) : null
                }
              />
              {fixturesLoading ? (
                <View style={[styles.loadingCard, { backgroundColor: cp.accentSoft, borderColor: cp.border }]}>
                  <ActivityIndicator color={cp.accent} />
                  <Text style={{ color: cp.inkMuted, marginTop: 10, fontSize: 14 }}>Loading fixtures…</Text>
                </View>
              ) : nextMatches.length > 0 ? (
                <View style={styles.fixtureList}>
                  {nextMatches.slice(0, MAX_FIXTURES_SHOWN).map((m) => (
                    <PremiumSportsMatchCard
                      key={m.id}
                      match={liveFootballMatchToCardModel(m)}
                      surfaceColors={cp.matchCard}
                      isFavoriteTeam={(teamName) => {
                        const normalized = teamName.toLowerCase().trim();
                        const club = selected.name.toLowerCase().trim();
                        if (normalized === club) return true;
                        if (m.homeTeamId === selected.id && normalized === m.homeTeam.toLowerCase().trim()) {
                          return true;
                        }
                        if (m.awayTeamId === selected.id && normalized === m.awayTeam.toLowerCase().trim()) {
                          return true;
                        }
                        return false;
                      }}
                    />
                  ))}
                </View>
              ) : (
                <View style={[styles.fixtureEmpty, { backgroundColor: cp.accentSoft, borderColor: cp.border }]}>
                  <Calendar size={22} color={cp.inkSoft} />
                  <Text style={[styles.fixtureEmptyTitle, { color: profileText }]}>No upcoming fixtures</Text>
                  <Text style={[styles.fixtureEmptySub, { color: profileMuted }]}>
                    No matches scheduled in the current fixture window.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader kicker="Team" title="Coach & squad" theme={cp} />
              {squadExtrasLoading ? (
                <View style={[styles.loadingCard, { backgroundColor: cp.accentSoft, borderColor: cp.border }]}>
                  <ActivityIndicator color={cp.accent} />
                  <Text style={{ color: cp.inkMuted, marginTop: 10, fontSize: 14 }}>Loading squad…</Text>
                </View>
              ) : coaches.length > 0 || squadPlayers.length > 0 ? (
                <View
                  style={[
                    styles.sectionCard,
                    styles.sectionCardPremium,
                    { backgroundColor: cp.surface, borderColor: cp.border },
                    Platform.OS === 'ios'
                      ? {
                          shadowColor: cp.ink,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isDark ? 0.18 : 0.06,
                          shadowRadius: 10,
                        }
                      : { elevation: 2 },
                  ]}
                >
                  <View style={styles.sectionHead}>
                    <Users size={18} color={cp.label} />
                    <Text style={[styles.sectionTitle, { color: cp.ink }]}>Squad depth</Text>
                  </View>
                  {coaches.map((c, idx) => (
                    <View key={`coach-${idx}-${c.name}`} style={styles.coachBlock}>
                      <Text style={[styles.roleLbl, { color: cp.inkMuted }]}>Coach</Text>
                      <View style={styles.coachRow}>
                        {c.photo ? (
                          <Image
                            source={{ uri: c.photo }}
                            style={[styles.coachPhoto, { borderWidth: 2, borderColor: cp.border }]}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.coachPhoto, { backgroundColor: cp.border }]} />
                        )}
                        <Text style={[styles.coachName, { color: cp.ink }]} numberOfLines={2}>
                          {c.name}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {squadPlayers.length > 0 ? (
                    <View style={styles.squadWrap}>
                      <Text style={[styles.roleLbl, { color: cp.inkMuted, marginBottom: 10 }]}>Players</Text>
                      <View style={styles.squadGrid}>
                        {squadPlayers.map((p) => (
                          <View key={p.id} style={[styles.playerCell, { backgroundColor: cp.accentSoft }]}>
                            {p.photo ? (
                              <Image
                                source={{ uri: p.photo }}
                                style={[styles.playerPhoto, { borderWidth: 1, borderColor: cp.border }]}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={[styles.playerPhoto, { backgroundColor: cp.border }]} />
                            )}
                            <Text style={[styles.playerName, { color: cp.ink }]} numberOfLines={2}>
                              {p.name}
                            </Text>
                            {p.position ? (
                              <Text style={[styles.playerPos, { color: cp.inkMuted }]} numberOfLines={1}>
                                {p.position}
                              </Text>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : coaches.length === 0 ? (
                    <Text style={{ color: cp.inkMuted }}>Squad list not available from the API right now.</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={{ color: cp.inkMuted, marginTop: 4 }}>
                  Squad details aren&apos;t available for this club right now.
                </Text>
              )}
            </View>
          </ScrollView>
          </View>
        )}

        {selected && !alreadyFavorite && profile ? (
          <BlurView
            intensity={isDark ? 55 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.fabBar, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: cp.border }]}
          >
            <TouchableOpacity
              onPress={addToFavourites}
              activeOpacity={0.92}
              accessibilityRole="button"
              accessibilityLabel="Add team to favourites"
              style={[styles.favBtnOuter, { backgroundColor: cp.accent }]}
            >
              <Heart size={18} color="#FFF" fill="#FFF" />
              <Text style={styles.favBtnText}>Add to favourites</Text>
            </TouchableOpacity>
          </BlurView>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRowPremium: {
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerTitlePremium: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 2, letterSpacing: 0.2 },
  iconBtn: { width: 40, height: 40, justifyContent: 'center' },
  iconBtnPremium: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(127,127,127,0.12)',
  },
  donePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 154, 63, 0.14)',
  },
  donePillText: { fontWeight: '700', fontSize: 14 },
  closePad: { paddingHorizontal: 8, paddingVertical: 8 },
  pad: { flex: 1, paddingHorizontal: 18 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  hint: { fontSize: 12, marginTop: 8, marginBottom: 12 },
  favoritesSection: { marginBottom: 8 },
  favoritesLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  favoritesRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  favoriteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 160,
  },
  favoriteChipLogo: { width: 22, height: 22, borderRadius: 11 },
  favoriteChipName: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  crest: { width: 40, height: 40, borderRadius: 10 },
  resultName: { flex: 1, fontSize: 16, fontWeight: '700' },
  heroOuter: {
    marginTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroGradient: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  heroShine: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  heroSheenBand: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  heroLogoRing: {
    padding: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  heroLogoInner: {
    padding: 7,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 2.2,
    textTransform: 'uppercase' as const,
    marginBottom: 5,
  },
  heroAccentBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
    alignSelf: 'stretch',
  },
  heroTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  heroLogo: { width: 82, height: 82, borderRadius: 16 },
  clubNamePremium: {
    fontSize: 26,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  leagueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  leagueChipLogo: { width: 16, height: 16 },
  leagueChipText: { fontSize: 12, fontWeight: '700', maxWidth: 200 },
  heroStatsPanel: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    alignItems: 'stretch',
  },
  heroStatBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  heroStatBlockMid: { borderLeftWidth: 1, borderRightWidth: 1 },
  heroStatBlockForm: { flex: 1.2 },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroStatValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  formPillRow: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  formPill: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formPillText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  sectionBlock: { marginTop: 28 },
  sectionTitleRow: { marginBottom: 14, gap: 6 },
  sectionKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionKickerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionRule: {
    height: 1,
    opacity: 0.35,
    marginTop: 10,
  },
  sectionCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sectionHeadLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  sectionHeading: { fontSize: 21, fontWeight: '800', flexShrink: 1, letterSpacing: -0.4 },
  sectionCount: { fontSize: 12, fontWeight: '700' },
  sectionCountQuiet: { fontSize: 12, fontWeight: '600' },
  loadingCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fixtureList: {
    marginHorizontal: -6,
  },
  fixtureEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  fixtureEmptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  fixtureEmptySub: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  clubName: { fontSize: 22, fontWeight: '800' },
  meta: { fontSize: 13, marginTop: 4 },
  venueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
  centerPad: { alignItems: 'center', paddingVertical: 28 },
  statsCard: {
    marginTop: 0,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  statsCardPremium: {
    borderRadius: 18,
    overflow: 'hidden' as const,
  },
  statsLeagueBand: {
    paddingBottom: 14,
    marginBottom: 12,
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.12)',
  },
  statsHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 0 },
  statsTitle: { flex: 1, fontSize: 15, fontWeight: '800' },
  rowMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metric: {
    minWidth: '22%',
    flexGrow: 1,
    backgroundColor: 'rgba(127,127,127,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  metricLbl: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  metricVal: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  formRowPremium: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  formLbl: { fontSize: 13, fontWeight: '600' },
  formStr: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  sectionCard: {
    marginTop: 0,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  sectionCardPremium: {
    borderRadius: 18,
    overflow: 'hidden' as const,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  roleLbl: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  coachBlock: { marginBottom: 14 },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  coachPhoto: { width: 64, height: 64, borderRadius: 32 },
  coachName: { flex: 1, fontSize: 17, fontWeight: '700' },
  squadWrap: { marginTop: 8 },
  squadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  playerCell: {
    width: '30%',
    minWidth: 96,
    marginBottom: 12,
    padding: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(127,127,127,0.06)',
  },
  playerPhoto: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    maxHeight: 96,
  },
  playerName: { fontSize: 11, fontWeight: '700', marginTop: 6 },
  playerPos: { fontSize: 9, marginTop: 2 },
  fabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  favBtnOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  favBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
