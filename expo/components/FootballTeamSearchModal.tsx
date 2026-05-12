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
  TrendingUp,
  Users,
} from 'lucide-react-native';
import {
  ApiStandingRow,
  findTeamStandingRow,
  footballApi,
  getFootballCurrentSeason,
  pickPrimaryLeagueForTeam,
  type CoachLite,
  type SquadPlayerLite,
  type TeamLeagueEntry,
} from '@/utils/footballApi';
import type { LiveFootballMatch, UserTeam } from '@/types/habit';
import { useUserProfile } from '@/hooks/useUserProfile';

const GREEN = '#2E9A3F';
const GREEN_BRIGHT = '#3CCD59';
const GREEN_DEEP = '#1a6b2c';
const GREEN_BORDER_SOFT = 'rgba(46, 154, 63, 0.22)';

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

/** Fixture window — club schedules can have gaps beyond ~6 weeks. */
const FIXTURE_FETCH_DAYS = 120;
const MAX_FIXTURES_SHOWN = 12;

function formatFixtureKickoff(m: LiveFootballMatch): { dateLabel: string; timeLabel: string } {
  try {
    if (m.date.includes('T')) {
      const d = new Date(m.date);
      if (!Number.isNaN(d.getTime())) {
        return {
          dateLabel: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
          timeLabel: m.time && m.time !== 'TBD' ? m.time : 'TBD',
        };
      }
    }
    const seg = m.date.split('-');
    if (seg.length === 3) {
      const y = Number(seg[0]);
      const mo = Number(seg[1]);
      const day = Number(seg[2]);
      const d = new Date(y, mo - 1, day);
      if (!Number.isNaN(d.getTime())) {
        return {
          dateLabel: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
          timeLabel: m.time && m.time !== 'TBD' ? m.time : 'TBD',
        };
      }
    }
  } catch {
    /* fall through */
  }
  return { dateLabel: m.date, timeLabel: m.time || '—' };
}

export default function FootballTeamSearchModal({
  visible,
  onClose,
  isDark,
  initialClub = null,
}: FootballTeamSearchModalProps) {
  const insets = useSafeAreaInsets();
  const { profile, addFavoriteTeam } = useUserProfile();

  const bg = isDark ? '#121412' : '#FAFBFA';
  const card = isDark ? '#1D221E' : '#FFFFFF';
  const border = isDark ? '#2D352E' : '#EBEEF1';
  const text = isDark ? '#F2F5F2' : '#101828';
  const muted = isDark ? '#A7B0A8' : '#667085';

  /** Richer surfaces when viewing a club profile (vs search list). */
  const profileShellBg = selected ? (isDark ? '#080A09' : '#F1F7F3') : bg;
  const profileCard = selected ? (isDark ? '#141916' : '#FFFFFF') : card;
  const profileBorder = selected ? (isDark ? 'rgba(82, 214, 130, 0.20)' : 'rgba(46, 154, 63, 0.14)') : border;
  const profileMuted = selected ? (isDark ? '#8B9690' : '#5C6570') : muted;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [clubProfile, setClubProfile] = useState<LoadedClubProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [squadExtrasLoading, setSquadExtrasLoading] = useState(false);
  const [squadPlayers, setSquadPlayers] = useState<SquadPlayerLite[]>([]);
  const [coaches, setCoaches] = useState<CoachLite[]>([]);
  const [nextMatches, setNextMatches] = useState<LiveFootballMatch[]>([]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setSelected(null);
      setClubProfile(null);
      setProfileError(null);
      setSquadPlayers([]);
      setCoaches([]);
      setNextMatches([]);
    }
  }, [visible]);

  /** Hero “My clubs” → jump to profile (resolve API id via preset or name search). */
  useEffect(() => {
    if (!visible || !initialClub) return;
    let cancelled = false;
    void (async () => {
      const aid = initialClub.apiId;
      if (aid != null && aid > 0) {
        if (!cancelled) {
          setSelected({
            id: aid,
            name: initialClub.name,
            logo: initialClub.logo,
          });
        }
        return;
      }
      try {
        const hits = await footballApi.searchTeams(initialClub.name);
        const hit = hits[0];
        if (cancelled || !hit) return;
        setSelected({
          id: hit.id,
          name: hit.name,
          logo: hit.logo || initialClub.logo,
        });
      } catch {
        /* keep search UI */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, initialClub]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const t = setTimeout(() => {
      void (async () => {
        try {
          const hits = await footballApi.searchTeams(q);
          setResults(hits);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 380);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!selected) {
      setClubProfile(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);
    void (async () => {
      try {
        const season = getFootballCurrentSeason();
        const [info, leagues] = await Promise.all([
          footballApi.getTeamInfo(selected.id),
          footballApi.getTeamLeaguesCurrent(selected.id),
        ]);
        if (cancelled) return;
        const primary = pickPrimaryLeagueForTeam(leagues);
        let standing: ApiStandingRow | null = null;
        let statsForm: string | undefined;
        if (primary) {
          const [standingsRaw, stats] = await Promise.all([
            footballApi.getLeagueStandingsRaw(primary.id, season),
            footballApi.getTeamSeasonStatistics(selected.id, primary.id, season),
          ]);
          if (cancelled) return;
          standing = findTeamStandingRow(standingsRaw, selected.id);
          const form = stats && 'form' in stats ? stats.form : undefined;
          statsForm = typeof form === 'string' ? form : undefined;
        }
        setClubProfile({
          info:
            info ??
            ({
              id: selected.id,
              name: selected.name,
              logo: selected.logo,
              country: '',
            } as LoadedClubProfile['info']),
          league: primary,
          season,
          standing,
          statsForm,
        });
      } catch {
        if (!cancelled) setProfileError('Could not load club profile.');
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setNextMatches([]);
      return;
    }
    let cancelled = false;
    setFixturesLoading(true);
    void (async () => {
      try {
        const upcoming = await footballApi.getUpcomingMatches(FIXTURE_FETCH_DAYS, [selected.id]);
        if (cancelled) return;
        const up = (upcoming ?? []).filter((m) => m.status === 'Upcoming');
        up.sort((a, b) => parseMatchKickoffMs(a) - parseMatchKickoffMs(b));
        setNextMatches(up.slice(0, MAX_FIXTURES_SHOWN));
      } finally {
        if (!cancelled) setFixturesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setSquadPlayers([]);
      setCoaches([]);
      return;
    }
    let cancelled = false;
    setSquadExtrasLoading(true);
    void (async () => {
      try {
        const [players, coachList] = await Promise.all([
          footballApi.getTeamSquadPlayers(selected.id),
          footballApi.getTeamCoaches(selected.id),
        ]);
        if (cancelled) return;
        setSquadPlayers(players);
        setCoaches(coachList);
      } finally {
        if (!cancelled) setSquadExtrasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const formDisplay =
    (clubProfile?.standing?.form && String(clubProfile.standing.form)) || clubProfile?.statsForm || '—';

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
    setClubProfile(null);
    setProfileError(null);
    setSquadPlayers([]);
    setCoaches([]);
    setNextMatches([]);
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
  }, [selected, alreadyFavorite, profile, clubProfile, addFavoriteTeam]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: profileShellBg, paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.headerRow,
            {
              borderBottomColor: selected ? (isDark ? 'rgba(52, 211, 92, 0.18)' : 'rgba(46, 154, 63, 0.12)') : border,
              backgroundColor: selected ? (isDark ? 'rgba(20, 25, 22, 0.94)' : 'rgba(255, 255, 255, 0.72)') : 'transparent',
            },
          ]}
        >
          {selected ? (
            <TouchableOpacity onPress={goBackToSearch} style={styles.iconBtn} accessibilityRole="button">
              <ArrowLeft size={22} color={text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
            <Text style={[styles.headerTitle, { color: text }]}>
              {selected ? 'Club profile' : 'Find a team'}
            </Text>
            {selected ? (
              <Text style={[styles.headerSubtitle, { color: profileMuted }]} numberOfLines={1}>
                Standings · fixtures · squad
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closePad} hitSlop={12}>
            <Text style={{ color: GREEN, fontWeight: '700' }}>Done</Text>
          </TouchableOpacity>
        </View>

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
              />
              {searchLoading ? <ActivityIndicator size="small" color={GREEN} /> : null}
            </View>
            <Text style={[styles.hint, { color: muted }]}>Type at least 2 characters. Results from live football data.</Text>
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
                      shadowColor: GREEN,
                      shadowOffset: { width: 0, height: 14 },
                      shadowOpacity: isDark ? 0.22 : 0.14,
                      shadowRadius: 22,
                    }
                  : { elevation: isDark ? 8 : 5 },
              ]}
            >
              <LinearGradient
                colors={
                  isDark
                    ? ['#1a3328', '#0f1612', '#0a0e0c']
                    : ['#e8f8ee', '#f6fffa', '#ffffff']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroGradient, { borderColor: profileBorder }]}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)', 'transparent']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 0.55 }}
                  pointerEvents="none"
                  style={styles.heroShine}
                />
                <LinearGradient
                  colors={[`${GREEN}66`, 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  pointerEvents="none"
                  style={styles.heroSheenBand}
                />
                <View style={[styles.heroAccentBar, { backgroundColor: GREEN_BRIGHT }]} />
                <View style={styles.heroTop}>
                  <LinearGradient
                    colors={[GREEN_BRIGHT, GREEN, GREEN_DEEP]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroLogoRing}
                  >
                    <View style={[styles.heroLogoInner, { backgroundColor: profileCard }]}>
                      {selected.logo ? (
                        <Image source={{ uri: selected.logo }} style={styles.heroLogo} contentFit="contain" />
                      ) : (
                        <View style={[styles.heroLogo, { backgroundColor: profileBorder }]} />
                      )}
                    </View>
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.heroKicker, { color: GREEN_BRIGHT }]}>Club profile</Text>
                    <Text style={[styles.clubName, styles.clubNamePremium, { color: text }]} numberOfLines={2}>
                      {selected.name}
                    </Text>
                    {clubProfile?.info.country ? (
                      <Text style={[styles.meta, { color: profileMuted }]}>{clubProfile.info.country}</Text>
                    ) : null}
                    {clubProfile?.info.founded ? (
                      <Text style={[styles.meta, { color: profileMuted }]}>Founded {clubProfile.info.founded}</Text>
                    ) : null}
                    {clubProfile?.info.venue ? (
                      <View style={styles.venueRow}>
                        <MapPin size={14} color={profileMuted} />
                        <Text style={[styles.meta, { color: profileMuted, flex: 1 }]} numberOfLines={2}>
                          {clubProfile.info.venue}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionKicker, { color: GREEN_BRIGHT }]}>Schedule</Text>
                <View style={styles.sectionHeadLine}>
                  <Text style={[styles.sectionHeading, { color: text }]}>Upcoming fixtures</Text>
                  {!fixturesLoading && nextMatches.length > 0 ? (
                    <Text style={[styles.sectionCount, { color: profileMuted }]}>
                      Next {Math.min(nextMatches.length, MAX_FIXTURES_SHOWN)}
                    </Text>
                  ) : null}
                </View>
              </View>
              {fixturesLoading ? (
                <View style={[styles.loadingCard, { backgroundColor: profileCard, borderColor: profileBorder }]}>
                  <ActivityIndicator color={GREEN_BRIGHT} />
                  <Text style={{ color: profileMuted, marginTop: 10, fontSize: 14 }}>Loading fixtures…</Text>
                </View>
              ) : nextMatches.length > 0 ? (
                nextMatches.map((m) => {
                  const { dateLabel, timeLabel } = formatFixtureKickoff(m);
                  const homeHighlight = m.homeTeamId === selected.id;
                  const awayHighlight = m.awayTeamId === selected.id;
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.fixtureCard,
                        styles.fixtureCardPremium,
                        {
                          backgroundColor: profileCard,
                          borderColor: profileBorder,
                          borderLeftColor: GREEN_BRIGHT,
                          borderLeftWidth: 4,
                        },
                      ]}
                    >
                      <View style={styles.fixtureLeagueRow}>
                        {m.leagueLogo ? (
                          <Image source={{ uri: m.leagueLogo }} style={styles.fixtureLeagueLogo} contentFit="contain" />
                        ) : null}
                        <Text style={[styles.fixtureLeagueName, { color: profileMuted }]} numberOfLines={1}>
                          {m.league}
                          {m.round ? ` · ${m.round}` : ''}
                        </Text>
                      </View>
                      <View style={styles.fixtureVsRow}>
                        <View style={[styles.fixtureTeamCol, homeHighlight && styles.fixtureTeamColHi]}>
                          {m.homeTeamLogo ? (
                            <Image source={{ uri: m.homeTeamLogo }} style={styles.fixtureCrest} contentFit="contain" />
                          ) : (
                            <View style={[styles.fixtureCrest, { backgroundColor: profileBorder }]} />
                          )}
                          <Text
                            style={[styles.fixtureTeamName, { color: text }, homeHighlight && { fontWeight: '800' }]}
                            numberOfLines={2}
                          >
                            {m.homeTeam}
                          </Text>
                          {homeHighlight ? (
                            <Text style={[styles.youBadge, { color: GREEN_BRIGHT }]}>This club</Text>
                          ) : null}
                        </View>
                        <View style={[styles.fixtureVsPill, { backgroundColor: isDark ? 'rgba(60,205,100,0.18)' : 'rgba(46,154,63,0.12)' }]}>
                          <Text style={[styles.fixtureVsTextInner, { color: GREEN_BRIGHT }]}>vs</Text>
                        </View>
                        <View style={[styles.fixtureTeamCol, awayHighlight && styles.fixtureTeamColHi]}>
                          {m.awayTeamLogo ? (
                            <Image source={{ uri: m.awayTeamLogo }} style={styles.fixtureCrest} contentFit="contain" />
                          ) : (
                            <View style={[styles.fixtureCrest, { backgroundColor: profileBorder }]} />
                          )}
                          <Text
                            style={[styles.fixtureTeamName, { color: text }, awayHighlight && { fontWeight: '800' }]}
                            numberOfLines={2}
                          >
                            {m.awayTeam}
                          </Text>
                          {awayHighlight ? (
                            <Text style={[styles.youBadge, { color: GREEN_BRIGHT }]}>This club</Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={[styles.fixtureFooter, { borderTopColor: profileBorder }]}>
                        <View style={styles.fixtureWhenBlock}>
                          <Calendar size={15} color={GREEN_BRIGHT} />
                          <View>
                            <Text style={[styles.fixtureDateMain, { color: text }]}>{dateLabel}</Text>
                            <Text style={[styles.fixtureTimeSub, { color: profileMuted }]}>{timeLabel}</Text>
                          </View>
                        </View>
                        {m.venue ? (
                          <View style={styles.fixtureVenueBlock}>
                            <MapPin size={14} color={profileMuted} />
                            <Text style={[styles.fixtureVenueTxt, { color: profileMuted }]} numberOfLines={2}>
                              {m.venue}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={[styles.fixtureEmpty, { backgroundColor: profileCard, borderColor: profileBorder }]}>
                  <Calendar size={26} color={profileMuted} />
                  <Text style={[styles.fixtureEmptyTitle, { color: text }]}>No fixtures in view</Text>
                  <Text style={[styles.fixtureEmptySub, { color: profileMuted }]}>
                    Nothing scheduled for this club in the next {FIXTURE_FETCH_DAYS} days — draws, cups, or international
                    breaks can leave gaps until fixtures are published.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionKicker, { color: GREEN_BRIGHT }]}>Competition</Text>
                <Text style={[styles.sectionHeading, { color: text }]}>Season performance</Text>
              </View>
              {profileLoading ? (
                <View style={styles.centerPad}>
                  <ActivityIndicator size="large" color={GREEN_BRIGHT} />
                  <Text style={{ color: profileMuted, marginTop: 10 }}>Loading league standings…</Text>
                </View>
              ) : profileError ? (
                <Text style={{ color: '#FF3B30', marginTop: 4 }}>{profileError}</Text>
              ) : clubProfile?.league ? (
                <View
                  style={[
                    styles.statsCard,
                    styles.statsCardPremium,
                    { backgroundColor: profileCard, borderColor: profileBorder },
                    Platform.OS === 'ios'
                      ? {
                          shadowColor: GREEN,
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: isDark ? 0.18 : 0.1,
                          shadowRadius: 14,
                        }
                      : { elevation: 3 },
                  ]}
                >
                  <LinearGradient
                    colors={
                      isDark
                        ? ['rgba(60, 205, 100, 0.14)', 'rgba(60, 205, 100, 0)']
                        : ['rgba(46, 154, 63, 0.1)', 'rgba(46, 154, 63, 0)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statsLeagueBand}
                  >
                    <View style={styles.statsHead}>
                      <Trophy size={18} color={GREEN_BRIGHT} />
                      <Text style={[styles.statsTitle, { color: text }]} numberOfLines={2}>
                        {clubProfile.league.name} · {clubProfile.season}/{String(clubProfile.season + 1).slice(-2)}
                      </Text>
                    </View>
                  </LinearGradient>
                  {clubProfile.standing ? (
                    <>
                      <View style={styles.rowMetrics}>
                        <View
                          style={[
                            styles.metric,
                            isDark ? styles.metricPremiumDark : styles.metricPremiumLight,
                            { borderColor: GREEN_BORDER_SOFT },
                          ]}
                        >
                          <Text style={[styles.metricLbl, { color: profileMuted }]}>Position</Text>
                          <Text style={[styles.metricVal, { color: text }]}>
                            {clubProfile.standing.rank != null ? `${clubProfile.standing.rank}` : '—'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.metric,
                            isDark ? styles.metricPremiumDark : styles.metricPremiumLight,
                            { borderColor: GREEN_BORDER_SOFT },
                          ]}
                        >
                          <Text style={[styles.metricLbl, { color: profileMuted }]}>Points</Text>
                          <Text style={[styles.metricVal, { color: text }]}>
                            {clubProfile.standing.points ?? '—'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.metric,
                            isDark ? styles.metricPremiumDark : styles.metricPremiumLight,
                            { borderColor: GREEN_BORDER_SOFT },
                          ]}
                        >
                          <Text style={[styles.metricLbl, { color: profileMuted }]}>Played</Text>
                          <Text style={[styles.metricVal, { color: text }]}>
                            {clubProfile.standing.all?.played ?? '—'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.rowMetrics}>
                        <View
                          style={[
                            styles.metric,
                            isDark ? styles.metricPremiumDark : styles.metricPremiumLight,
                            { borderColor: GREEN_BORDER_SOFT },
                          ]}
                        >
                          <Text style={[styles.metricLbl, { color: profileMuted }]}>W</Text>
                          <Text style={[styles.metricVal, { color: text }]}>
                            {clubProfile.standing.all?.win ?? '—'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.metric,
                            isDark ? styles.metricPremiumDark : styles.metricPremiumLight,
                            { borderColor: GREEN_BORDER_SOFT },
                          ]}
                        >
                          <Text style={[styles.metricLbl, { color: profileMuted }]}>D</Text>
                          <Text style={[styles.metricVal, { color: text }]}>
                            {clubProfile.standing.all?.draw ?? '—'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.metric,
                            isDark ? styles.metricPremiumDark : styles.metricPremiumLight,
                            { borderColor: GREEN_BORDER_SOFT },
                          ]}
                        >
                          <Text style={[styles.metricLbl, { color: profileMuted }]}>L</Text>
                          <Text style={[styles.metricVal, { color: text }]}>
                            {clubProfile.standing.all?.lose ?? '—'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.metric,
                            isDark ? styles.metricPremiumDark : styles.metricPremiumLight,
                            { borderColor: GREEN_BORDER_SOFT },
                          ]}
                        >
                          <Text style={[styles.metricLbl, { color: profileMuted }]}>GD</Text>
                          <Text style={[styles.metricVal, { color: text }]}>
                            {clubProfile.standing.goalsDiff != null
                              ? `${clubProfile.standing.goalsDiff > 0 ? '+' : ''}${clubProfile.standing.goalsDiff}`
                              : '—'}
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <Text style={{ color: profileMuted, marginBottom: 10 }}>
                      League table position isn&apos;t available for this competition or season yet.
                    </Text>
                  )}
                  <View
                    style={[
                      styles.formRow,
                      styles.formRowPremium,
                      {
                        backgroundColor: isDark ? 'rgba(46, 154, 63, 0.12)' : 'rgba(46, 154, 63, 0.08)',
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: isDark ? 'rgba(82, 214, 130, 0.25)' : 'rgba(46, 154, 63, 0.18)',
                      },
                    ]}
                  >
                    <TrendingUp size={16} color={GREEN_BRIGHT} />
                    <Text style={[styles.formLbl, { color: profileMuted }]}>Recent form</Text>
                    <Text style={[styles.formStr, { color: text }]}>{formDisplay}</Text>
                  </View>
                </View>
              ) : (
                <Text style={{ color: profileMuted, marginTop: 4 }}>
                  No current domestic league found for this squad in the API (e.g. national teams or off-season). Try another
                  club.
                </Text>
              )}
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionKicker, { color: GREEN_BRIGHT }]}>Team</Text>
                <Text style={[styles.sectionHeading, { color: text }]}>Coach & squad</Text>
              </View>
              {squadExtrasLoading ? (
                <View style={[styles.loadingCard, { backgroundColor: profileCard, borderColor: profileBorder }]}>
                  <ActivityIndicator color={GREEN_BRIGHT} />
                  <Text style={{ color: profileMuted, marginTop: 10, fontSize: 14 }}>Loading squad…</Text>
                </View>
              ) : coaches.length > 0 || squadPlayers.length > 0 ? (
                <View
                  style={[
                    styles.sectionCard,
                    styles.sectionCardPremium,
                    { backgroundColor: profileCard, borderColor: profileBorder },
                    Platform.OS === 'ios'
                      ? {
                          shadowColor: GREEN,
                          shadowOffset: { width: 0, height: 5 },
                          shadowOpacity: isDark ? 0.14 : 0.08,
                          shadowRadius: 12,
                        }
                      : { elevation: 3 },
                  ]}
                >
                  <View style={styles.sectionHead}>
                    <Users size={18} color={GREEN_BRIGHT} />
                    <Text style={[styles.sectionTitle, { color: text }]}>Squad depth</Text>
                  </View>
                  {coaches.map((c, idx) => (
                    <View key={`coach-${idx}-${c.name}`} style={styles.coachBlock}>
                      <Text style={[styles.roleLbl, { color: profileMuted }]}>Coach</Text>
                      <View style={styles.coachRow}>
                        {c.photo ? (
                          <Image
                            source={{ uri: c.photo }}
                            style={[styles.coachPhoto, { borderWidth: 2, borderColor: GREEN_BORDER_SOFT }]}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.coachPhoto, { backgroundColor: profileBorder }]} />
                        )}
                        <Text style={[styles.coachName, { color: text }]} numberOfLines={2}>
                          {c.name}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {squadPlayers.length > 0 ? (
                    <View style={styles.squadWrap}>
                      <Text style={[styles.roleLbl, { color: profileMuted, marginBottom: 10 }]}>Players</Text>
                      <View style={styles.squadGrid}>
                        {squadPlayers.map((p) => (
                          <View key={p.id} style={styles.playerCell}>
                            {p.photo ? (
                              <Image
                                source={{ uri: p.photo }}
                                style={[styles.playerPhoto, { borderWidth: 1, borderColor: GREEN_BORDER_SOFT }]}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={[styles.playerPhoto, { backgroundColor: profileBorder }]} />
                            )}
                            <Text style={[styles.playerName, { color: text }]} numberOfLines={2}>
                              {p.name}
                            </Text>
                            {p.position ? (
                              <Text style={[styles.playerPos, { color: profileMuted }]} numberOfLines={1}>
                                {p.position}
                              </Text>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : coaches.length === 0 ? (
                    <Text style={{ color: profileMuted }}>Squad list not available from the API right now.</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={{ color: profileMuted, marginTop: 4 }}>
                  Squad details aren&apos;t available for this club right now.
                </Text>
              )}
            </View>
          </ScrollView>
          </View>
        )}

        {selected && !alreadyFavorite && profile ? (
          <View
            style={[
              styles.fabBar,
              {
                paddingBottom: Math.max(insets.bottom, 12),
                backgroundColor: profileShellBg,
                borderTopColor: profileBorder,
              },
            ]}
          >
            <TouchableOpacity
              onPress={addToFavourites}
              activeOpacity={0.92}
              accessibilityRole="button"
              accessibilityLabel="Add team to favourites"
              style={styles.favBtnOuter}
            >
              <LinearGradient
                colors={[GREEN_BRIGHT, GREEN, GREEN_DEEP]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.favBtnGradient}
              >
                <Heart size={20} color="#FFF" />
                <Text style={styles.favBtnText}>Add to favourites</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 2, letterSpacing: 0.2 },
  iconBtn: { width: 40, height: 40, justifyContent: 'center' },
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
    padding: 2,
    borderRadius: 20,
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
  heroLogo: { width: 76, height: 76, borderRadius: 14 },
  clubNamePremium: {
    fontSize: 24,
    letterSpacing: -0.7,
    lineHeight: 30,
  },
  sectionBlock: { marginTop: 24 },
  sectionTitleRow: { marginBottom: 12, gap: 4 },
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
  loadingCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fixtureCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  fixtureCardPremium: {
    borderRadius: 20,
  },
  fixtureVsPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 11,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    marginTop: 10,
  },
  fixtureVsTextInner: {
    fontSize: 11,
    fontWeight: '900' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  fixtureLeagueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  fixtureLeagueLogo: { width: 20, height: 20, borderRadius: 4 },
  fixtureLeagueName: { flex: 1, fontSize: 12, fontWeight: '700' },
  fixtureVsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  fixtureTeamCol: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  fixtureTeamColHi: {
    backgroundColor: 'rgba(46, 154, 63, 0.09)',
  },
  fixtureCrest: { width: 40, height: 40, marginBottom: 8, borderRadius: 10 },
  fixtureTeamName: { fontSize: 13, fontWeight: '600', textAlign: 'center', width: '100%' },
  youBadge: { fontSize: 10, fontWeight: '800', marginTop: 4, letterSpacing: 0.3 },
  fixtureFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fixtureWhenBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  fixtureDateMain: { fontSize: 15, fontWeight: '800' },
  fixtureTimeSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  fixtureVenueBlock: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6, minWidth: 0 },
  fixtureVenueTxt: { flex: 1, fontSize: 12, lineHeight: 16 },
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
    marginBottom: 4,
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingTop: 16,
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
  metricPremiumLight: {
    backgroundColor: 'rgba(46, 154, 63, 0.07)',
  },
  metricPremiumDark: {
    backgroundColor: 'rgba(72, 214, 130, 0.08)',
  },
  metricLbl: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  metricVal: { fontSize: 17, fontWeight: '800' },
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
  playerCell: { width: '30%', minWidth: 96, marginBottom: 12 },
  playerPhoto: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
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
    borderRadius: 15,
    overflow: 'hidden' as const,
    ...Platform.select({
      ios: {
        shadowColor: GREEN,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
    }),
  },
  favBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: 20,
    borderRadius: 15,
  },
  favBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
});
