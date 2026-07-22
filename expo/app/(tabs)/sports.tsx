import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  RefreshControl, 
  Image,
  ImageBackground,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
  useWindowDimensions,
  StatusBar,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import { 
  Trophy, 
  Calendar,
  CalendarDays,
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
  Clock,
  Pin,
  Swords,
  Flag,
  Zap,
  Sparkles,
  TrendingUp,
  Globe,
  ChevronDown,
  BarChart3,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { getNationalitySignals } from '@/utils/nationalityPersonalization';
import {
  isFavoriteClubOrNationalMatch,
  matchInvolvesNationalInterest,
  sortMatchesBySmartForYou,
  sortMatchesForDisplay,
  type FootballPersonalizationContext,
} from '@/utils/footballMatchPersonalization';
import { pickAiInsightMatch, pickFeaturedUpcomingMatch } from '@/utils/footballInsightPicker';
import {
  buildKnockoutInsightContextLine,
  isKnockoutFixture,
  type KnockoutFixtureLite,
} from '@/utils/footballKnockout';
import {
  buildCompactInsightTableLine,
  clampInsightCopy,
  findHomeAwayInStandings,
} from '@/utils/footballInsightCopy';
import {
  buildFootballAiInsightCard,
  isTrustworthyInsightMatch,
  type InsightTrustContext,
} from '@/utils/footballInsightTrust';
import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useFootballBundle, type FootballBundleInput } from '@/contexts/FootballBundleContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FootballSmartFilter } from '@/components/SportsSmartFilter';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getCompetitionById } from '@/constants/competitions';
import MatchDetailsModal from '@/components/MatchDetailsModal';
import LeagueStandingsModal from '@/components/LeagueStandingsModal';
import FootballLeagueLogo from '@/components/FootballLeagueLogo';
import TabWalkthrough from '@/components/TabWalkthrough';
import UFCFightDetailModal from '@/components/UFCFightDetailModal';
import F1Section from '@/components/F1Section';
import UFCPremiumHeroInner from '@/components/UFCPremiumHeroInner';
import NBASection from '@/components/NBASection';
import FootballPremiumHeroInner, {
  type FootballHeroFavoriteClub,
} from '@/components/FootballPremiumHeroInner';
import FootballTeamSearchModal, {
  type FootballClubProfilePreset,
} from '@/components/FootballTeamSearchModal';
import { getFootballTeamLogoUrl } from '@/constants/footballData';
import { getFootballMatchPersonalizationChip } from '@/utils/footballMatchReasons';
import { PremiumSportsMatchCard } from '@/components/PremiumSportsMatchCard';
import { sportsFixedPalette, ufcFixedPalette, UFC_BRAND } from '@/utils/sportsPalette';
import {
  isMmaCompletedFightPayload,
  isMmaLiveStatusShort,
  resolveMmaFighterWinner,
} from '@/utils/mmaFightStatus';
import {
  computeUfcDivisionLeaders,
  computeUfcStatsRow,
  computeUfcWinLeaderboard,
  type UfcStatCell,
} from '@/utils/ufcFeedStats';
import {
  TOP_LEAGUE_BUNDLE_IDS,
  ALWAYS_VISIBLE_INTERNATIONAL_LEAGUE_IDS,
  FIFA_WORLD_CUP_LEAGUE_ID,
  applyFootballVisibilityRules,
  buildFootballQueryContext,
  isWorldCupMatch,
  normalizeFootballSmartFilter,
  withWorldCupLeagueIds,
} from '@/utils/footballQueryContext';
import { getTeamIdFromName } from '@/utils/footballApi';
import { formatFootballLeagueLabel, resolveMatchLeagueLogo, resolveLeagueLogoSource } from '@/utils/footballLeagueLabel';
import { collectNationalTeamApiIds } from '@/utils/nationalTeamApiIds';
import { usePinnedMatches } from '@/hooks/usePinnedMatches';
import { sportsCardModelToLiveFootball } from '@/utils/pinnedMatches';
import type { LiveFootballMatch } from '@/types/habit';
import {
  HERO_SECONDARY_GAP_BELOW_SPORT_STRIP,
  getSportsHeroEdgePad,
  getSportsHeroImageStyle,
  getHeroSecondaryRowStyle,
  getHeroSportStripSlotStyle,
  getSportsTallHeroMinHeight,
  getSportsHeroBottomCropPx,
} from '@/constants/sportsHeroLayout';
import { FOOTBALL_HERO_CHROME_GREEN } from '@/constants/footballHeroChrome';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** UFC Fight Center hero — bundled promotional artwork. */
const UFC_HERO_IMAGE = require('../../assets/images/ufc-hero.png');
/** UFC Fight Center — palette aligned with `UfcTab.tsx` reference. */
const UFC_BG = UFC_BRAND.bg;
const UFC_RED = UFC_BRAND.red;
const UFC_SURFACE = UFC_BRAND.surface;
const UFC_BORDER = UFC_BRAND.border;
const UFC_MUTED = UFC_BRAND.muted;
const UFC_TEXT = UFC_BRAND.text;
const UFC_WIN_GREEN = UFC_BRAND.winGreen;
/** Loser ring uses brand red (reference `loserRing`). */
const UFC_LOSS_RING = UFC_RED;
const UFC_SEGMENT_TRACK = UFC_BRAND.segmentTrack;

const FOOTBALL_SMART_FILTER_OPTIONS: {
  id: FootballSmartFilter;
  label: string;
  Icon: typeof Sparkles;
}[] = [
  { id: 'for-you', label: 'For You', Icon: Sparkles },
  { id: 'explore', label: 'Explore', Icon: Globe },
];

type SportMode = 'football' | 'ufc' | 'f1' | 'nba';

/**
 * Live Now carousel cards: fixed forest→navy gradient + light text.
 * Intentionally NOT tied to `sf.text` / light theme — the reference design is always a dark
 * green card on a light app background; using theme body colors made light mode render dark text
 * on a gradient that ended in white, which broke the old look.
 */
const LIVE_TICKER_GRADIENT = ['#0A1A12', '#145A32', '#1A1A2E'] as const;
const LIVE_TICKER_SHEEN = 'rgba(50, 215, 75, 0.22)';
const LIVE_TICKER_TEXT = {
  team: 'rgba(255,255,255,0.96)',
  score: '#FFFFFF',
  league: 'rgba(255,255,255,0.52)',
  live: '#FF4757',
  elapsedBg: 'rgba(0,0,0,0.38)',
  elapsedText: '#FFFFFF',
} as const;

/** Stadium hero + dark green chrome for Football tab (light / dark hero art). */
const FOOTBALL_CHROME = {
  /** Same as NEXT FEATURED MATCH label in `FootballPremiumHeroInner`. */
  featuredGreen: FOOTBALL_HERO_CHROME_GREEN,
  accentDark: '#32D74B',
  accentLight: '#15803D',
  stadiumLightImage: require('../../assets/images/football-center-hero-light.png'),
  stadiumDarkImage: require('../../assets/images/football-center-hero.png'),
} as const;

function footballChrome(isDark: boolean) {
  return {
    accent: isDark ? FOOTBALL_CHROME.accentDark : FOOTBALL_CHROME.accentLight,
    title: isDark ? '#FFFFFF' : '#0F172A',
    subtitleMuted: isDark ? '#A1A1AA' : '#64748B',
    pillTrack: isDark ? 'rgba(24,28,26,0.92)' : 'rgba(255,255,255,0.92)',
    pillBorder: isDark ? 'rgba(50,215,75,0.22)' : 'rgba(21,128,61,0.25)',
  };
}

function getSportsMainHeaderGradient(sportMode: SportMode, isDark: boolean): [string, string, string] {
  if (isDark) {
    switch (sportMode) {
      case 'football':
        return ['#0A1A0F', '#0D1A14', '#0D0D1A'];
      case 'f1':
        return ['#1A0505', '#180A0A', '#0D0D1A'];
      case 'nba':
        return ['#0A0A1E', '#0D1225', '#0D0D1A'];
      case 'ufc':
        return ['#060408', '#100A0C', '#080510'];
      default:
        return ['#1A0A08', '#1A0D10', '#0D0D1A'];
    }
  }
  switch (sportMode) {
    case 'football':
      return ['#E8F5EC', '#F0F5F2', '#F2F2F7'];
    case 'f1':
      return ['#F5E8E8', '#F5F0F0', '#F2F2F7'];
    case 'nba':
      return ['#E8EEF5', '#F0F2F5', '#F2F2F7'];
    case 'ufc':
      return ['#FFFDF9', '#FFF8F0', '#F5F6FA'];
    default:
      return ['#F5EDE8', '#F5F0EC', '#F2F2F7'];
  }
}

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

function normalizeMmaPhotoUrl(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (s.length < 4) return undefined;
    if (s.startsWith('//')) return `https:${s}`;
    return s;
  }
  if (typeof raw === 'object' && raw !== null && 'url' in raw && typeof (raw as { url?: string }).url === 'string') {
    return normalizeMmaPhotoUrl((raw as { url: string }).url);
  }
  return undefined;
}

function extractMmaFighterPhoto(f: Record<string, unknown> | null | undefined): string | undefined {
  if (!f || typeof f !== 'object') return undefined;
  const o = f as Record<string, unknown>;
  return (
    normalizeMmaPhotoUrl(o.photo) ??
    normalizeMmaPhotoUrl(o.logo) ??
    normalizeMmaPhotoUrl(o.image) ??
    normalizeMmaPhotoUrl(o.picture) ??
    normalizeMmaPhotoUrl(o.thumbnail)
  );
}

/** Normalize api-sports MMA (and similar) fighter shapes to { first, second }. */
function getMmaFighterPair(fight: any): { first: any; second: any } {
  const F = fight?.fighters;
  if (F && typeof F === 'object' && !Array.isArray(F) && (F.first != null || F.second != null)) {
    return { first: F.first ?? {}, second: F.second ?? {} };
  }
  if (Array.isArray(F) && F.length >= 2) {
    return { first: F[0] ?? {}, second: F[1] ?? {} };
  }
  if (fight?.fighter1 != null || fight?.fighter2 != null) {
    return { first: fight.fighter1 ?? {}, second: fight.fighter2 ?? {} };
  }
  const fa = fight?.fighter;
  if (Array.isArray(fa) && fa.length >= 2) {
    return { first: fa[0] ?? {}, second: fa[1] ?? {} };
  }
  if (fight?.home != null || fight?.away != null) {
    return { first: fight.home ?? {}, second: fight.away ?? {} };
  }
  if (fight?.first != null || fight?.second != null) {
    return { first: fight.first ?? {}, second: fight.second ?? {} };
  }
  return { first: {}, second: {} };
}

/** Unwrap tRPC / MMA procedure payloads — shape varies by client version. */
function extractMmaFightArray(payload: unknown): any[] {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.response)) return p.response as any[];
  const data = p.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.response)) return d.response as any[];
  }
  const json = p.json;
  if (json && typeof json === 'object') {
    const j = json as Record<string, unknown>;
    if (Array.isArray(j.response)) return j.response as any[];
  }
  return [];
}

function transformMmaFightData(fights: any[]): UFCFight[] {
  if (!Array.isArray(fights)) return [];

  return fights.filter(Boolean).map((fight: any, _index: number) => {
    const rawShort =
      fight.status?.short || fight.status?.code || (typeof fight.status === 'string' ? fight.status : null);
    const statusShort =
      rawShort != null && String(rawShort).trim() !== ''
        ? String(rawShort).trim().toUpperCase()
        : 'NS';
    let fightStatus: 'Upcoming' | 'Live' | 'Completed' = 'Upcoming';
    if (isMmaCompletedFightPayload(fight)) {
      fightStatus = 'Completed';
    } else if (isMmaLiveStatusShort(statusShort)) {
      fightStatus = 'Live';
    }

    const rawDate =
      fight.date ??
      fight.datetime ??
      (typeof fight.timestamp === 'number'
        ? new Date(fight.timestamp < 1e12 ? fight.timestamp * 1000 : fight.timestamp).toISOString()
        : undefined);
    const date = new Date(rawDate ?? Date.now());
    const timeString = Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });

    const { first: f1, second: f2 } = getMmaFighterPair(fight);

    const result = fight.result || fight.score || {};
    const r1 = result.first || result.home || {};
    const r2 = result.second || result.away || {};

    const f1Photo = extractMmaFighterPhoto(f1);
    const f2Photo = extractMmaFighterPhoto(f2);

    const eventName =
      fight.league?.name ||
      fight.event?.name ||
      fight.tournament?.name ||
      (typeof fight.league === 'string' ? fight.league : null) ||
      (typeof fight.event === 'string' ? fight.event : null) ||
      (typeof fight.slug === 'string' && fight.slug.trim().length > 0 ? fight.slug.trim() : null) ||
      'UFC Fight Night';

    const categoryName =
      fight.category?.name || fight.weight?.name || fight.weight_class?.name || fight.division?.name || 'TBD';

    return {
      id: typeof fight.id === 'number' && fight.id > 0 ? fight.id : -(++mmaIdCounter),
      date: (typeof rawDate === 'string' && rawDate.length > 0 ? rawDate : null) ?? fight.date ?? new Date().toISOString(),
      time: timeString,
      status: fightStatus,
      statusShort,
      event: eventName,
      category: categoryName,
      fighter1: {
        id: typeof f1.id === 'number' ? f1.id : 0,
        name: f1.name || 'TBA',
        photo: f1Photo,
        winner: resolveMmaFighterWinner(fightStatus, 'first', {
          resultSideWinner: r1.winner === true,
          fighterWinner: f1.winner === true,
          resultWinner: result.winner ?? null,
        }),
      },
      fighter2: {
        id: typeof f2.id === 'number' ? f2.id : 0,
        name: f2.name || 'TBA',
        photo: f2Photo,
        winner: resolveMmaFighterWinner(fightStatus, 'second', {
          resultSideWinner: r2.winner === true,
          fighterWinner: f2.winner === true,
          resultWinner: result.winner ?? null,
        }),
      },
      result:
        result.method != null || result.round != null || result.time != null
          ? {
              method: result.method,
              round: result.round,
              time: result.time,
            }
          : undefined,
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
  round?: string;
  leagueSeason?: number;
  elapsed?: number;
}

function sportsTabMatchToLive(m: Match): LiveFootballMatch {
  const leagueId = m.leagueId > 0 ? m.leagueId : undefined;
  return sportsCardModelToLiveFootball({
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    league: m.league,
    leagueId: m.leagueId,
    leagueCountry: m.leagueCountry,
    date: m.date,
    time: m.time,
    venue: m.venue,
    venueCity: m.venueCity,
    homeTeamLogo: m.homeTeamLogo,
    awayTeamLogo: m.awayTeamLogo,
    leagueLogo: resolveMatchLeagueLogo({
      leagueId,
      league: m.league,
      leagueLogo: m.leagueLogo,
      round: m.round,
    }),
    round: m.round,
    elapsed: m.elapsed,
  });
}

function countFormWinsInLastN(form: any[] | undefined, teamId: number | undefined, n: number): number {
  if (!form?.length || !teamId) return 0;
  let wins = 0;
  for (const m of form.slice(0, n)) {
    const hid = m?.teams?.home?.id;
    const aid = m?.teams?.away?.id;
    const hg = m?.goals?.home;
    const ag = m?.goals?.away;
    if (hg == null || ag == null) continue;
    if (hid === teamId && hg > ag) wins++;
    else if (aid === teamId && ag > hg) wins++;
  }
  return wins;
}

function shortTeamLabel(name: string): string {
  const w = name.trim().split(/\s+/);
  if (w.length === 1) return w[0].length <= 6 ? w[0] : `${w[0].slice(0, 5)}…`;
  const first = w[0];
  return first.length > 5 ? `${first.slice(0, 4)}…` : first;
}

function abbrevPlayerName(name: string): string {
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return p[0];
  return `${p[0][0]}. ${p[p.length - 1]}`;
}

function coercePositivePlayerId(row: {
  playerId?: number | string | null;
  id?: number | string | null;
}): number | null {
  const candidates = [row.playerId, row.id];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c) && c > 0) return c;
    if (typeof c === 'string' && /^\d+$/.test(c.trim())) {
      const n = Number(c.trim());
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

/** Resolves api-sports player headshots: full URL, relative CDN path, or id-based PNG (same as lineups). */
function footballLeaderPortraitUri(row: {
  photo?: string | null;
  playerId?: number | string | null;
  id?: number | string | null;
}): string | null {
  const raw = typeof row.photo === 'string' ? row.photo.trim() : '';
  if (raw.length > 4) {
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('//') && /\./.test(raw)) return `https:${raw}`;
    if (raw.startsWith('/') && /\/football\/players\//i.test(raw)) {
      return `https://media.api-sports.io${raw}`;
    }
    if (/^media\.api-sports\.io\//i.test(raw)) return `https://${raw}`;
    if (/^football\/players\/\d+/i.test(raw)) return `https://media.api-sports.io/${raw}`;
  }
  const id = coercePositivePlayerId(row);
  if (id != null) return `https://media.api-sports.io/football/players/${id}.png`;
  return null;
}

function footballLeaderPortraitFallbackUris(row: {
  photo?: string | null;
  playerId?: number | string | null;
  id?: number | string | null;
}): string[] {
  const ordered: string[] = [];
  const primary = footballLeaderPortraitUri(row);
  if (primary) ordered.push(primary);
  const id = coercePositivePlayerId(row);
  if (id != null) {
    ordered.push(
      `https://media.api-sports.io/football/players/${id}.png`,
      `https://media.api-sports.io/football/players/${id}.jpg`,
    );
  }
  return [...new Set(ordered)];
}

const TrendingLeaderAvatar = React.memo(function TrendingLeaderAvatar({
  row,
  style,
  placeholderStyle,
}: {
  row: { photo?: string | null; playerId?: number | null; id?: number | null; playerName?: string };
  style: object;
  placeholderStyle: object;
}) {
  const fallbackUris = useMemo(() => footballLeaderPortraitFallbackUris(row), [row.photo, row.playerId, row.id]);
  const [uriIndex, setUriIndex] = useState(0);

  useEffect(() => {
    setUriIndex(0);
  }, [fallbackUris.join('|')]);

  const initial =
    typeof row.playerName === 'string' && row.playerName.trim().length > 0
      ? row.playerName.trim().charAt(0).toUpperCase()
      : '?';

  const initialBadge = (
    <View style={[placeholderStyle, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.85)' }}>{initial}</Text>
    </View>
  );

  if (fallbackUris.length === 0 || uriIndex >= fallbackUris.length) {
    return initialBadge;
  }

  const uri = fallbackUris[uriIndex];

  return (
    <ExpoImage
      source={{ uri }}
      style={style}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={180}
      onError={() => setUriIndex((i) => i + 1)}
    />
  );
});

function migrateStoredFootballFocus(raw: string | null): FootballSmartFilter {
  return normalizeFootballSmartFilter(raw);
}

let footballIdCounter = 0;
function transformApiFootballData(fixtures: any[]): Match[] {
  if (!Array.isArray(fixtures)) return [];
  const LIVE_SHORT_STATUSES = new Set(['LIVE', '1H', '2H', 'HT', 'ET', 'P', 'BT', 'INT', 'SUSP']);
  const COMPLETED_SHORT_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);
  
  return fixtures.map((fixture: any, _index: number) => {
    const status = fixture.fixture?.status?.short;
    let matchStatus: 'Live' | 'Upcoming' | 'Completed' = 'Upcoming';
    
    if (LIVE_SHORT_STATUSES.has(String(status || '').toUpperCase())) {
      matchStatus = 'Live';
    } else if (COMPLETED_SHORT_STATUSES.has(String(status || '').toUpperCase())) {
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
      league: formatFootballLeagueLabel(
        fixture.league?.name || 'League',
        fixture.league?.country,
        fixture.league?.id,
        fixture.league?.round,
      ),
      leagueId:
        fixture.league?.id ||
        (String(fixture.league?.name ?? '')
          .toLowerCase()
          .includes('world cup')
          ? 1
          : 0),
      leagueCountry: fixture.league?.country || '',
      date: fixture.fixture?.date || new Date().toISOString(),
      time: timeString,
      venue: fixture.fixture?.venue?.name,
      venueCity: fixture.fixture?.venue?.city,
      homeTeamLogo: fixture.teams?.home?.logo,
      awayTeamLogo: fixture.teams?.away?.logo,
      leagueLogo: resolveMatchLeagueLogo({
        leagueId: fixture.league?.id,
        league: fixture.league?.name,
        leagueLogo: fixture.league?.logo,
        round: fixture.league?.round,
      }),
      round: fixture.league?.round,
      leagueSeason:
        typeof fixture.league?.season === 'number'
          ? fixture.league.season
          : undefined,
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

const LIVE_TICKER_H_PADDING = 20;
/** Full-bleed width inside hero horizontal padding (`tickerList` uses the same inset). */
const LIVE_TICKER_SOLO_CARD_WIDTH = SCREEN_WIDTH - LIVE_TICKER_H_PADDING * 2;

const LiveTickerCard = React.memo(({
  match,
  onPress,
  solo = false,
}: {
  match: Match;
  onPress: () => void;
  index: number;
  /** One live match: span the row like the featured match card instead of a narrow carousel chip. */
  solo?: boolean;
}) => {
  const handlePress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [onPress]);

  const homeScoreVal = Number(match.homeScore ?? 0);
  const awayScoreVal = Number(match.awayScore ?? 0);
  const homeMomentum = ((homeScoreVal + 1) / (homeScoreVal + awayScoreVal + 2)) * 100;
  const leagueLogoSource = resolveLeagueLogoSource({
    leagueId: match.leagueId,
    league: match.league,
    leagueLogo: match.leagueLogo,
    round: match.round,
  });

  return (
    <View style={[styles.tickerCardWrapper, solo && styles.tickerCardWrapperSolo]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.92}>
        <LinearGradient
          colors={[...LIVE_TICKER_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tickerCard}
        >
          <LinearGradient
            colors={[LIVE_TICKER_SHEEN, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tickerSheen}
            pointerEvents="none"
          />
          <View style={styles.tickerTopRow}>
            <View style={styles.tickerLiveBadge}>
              <LivePulse color={LIVE_TICKER_TEXT.live} size={3} />
              <Text style={styles.tickerLiveText}>LIVE</Text>
            </View>
            {match.elapsed ? (
              <View style={[styles.tickerElapsedPill, { backgroundColor: LIVE_TICKER_TEXT.elapsedBg }]}>
                <Text style={[styles.tickerElapsed, { color: LIVE_TICKER_TEXT.elapsedText }]}>
                  {match.elapsed}&apos;
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.tickerTeams}>
            <View style={styles.tickerTeamRow}>
              <View style={styles.tickerLogoWrap}>
                {match.homeTeamLogo ? (
                  <Image source={{ uri: match.homeTeamLogo }} style={styles.tickerLogo} />
                ) : (
                  <Shield size={8} color="rgba(255,255,255,0.45)" />
                )}
              </View>
              <Text style={[styles.tickerTeamName, { color: LIVE_TICKER_TEXT.team }]} numberOfLines={1}>
                {match.homeTeam}
              </Text>
              <Text style={[styles.tickerScore, { color: LIVE_TICKER_TEXT.score }]}>
                {match.homeScore ?? 0}
              </Text>
            </View>
            <View style={styles.tickerTeamRow}>
              <View style={styles.tickerLogoWrap}>
                {match.awayTeamLogo ? (
                  <Image source={{ uri: match.awayTeamLogo }} style={styles.tickerLogo} />
                ) : (
                  <Shield size={8} color="rgba(255,255,255,0.45)" />
                )}
              </View>
              <Text style={[styles.tickerTeamName, { color: LIVE_TICKER_TEXT.team }]} numberOfLines={1}>
                {match.awayTeam}
              </Text>
              <Text style={[styles.tickerScore, { color: LIVE_TICKER_TEXT.score }]}>
                {match.awayScore ?? 0}
              </Text>
            </View>
          </View>

          <View style={styles.tickerMomentumRow}>
            <Text style={styles.tickerMomentumLabel}>Momentum</Text>
            <View style={styles.tickerMomentumTrack}>
              <LinearGradient
                colors={['rgba(50,215,75,0.9)', 'rgba(50,215,75,0.35)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.tickerMomentumFill, { width: `${Math.max(16, Math.min(84, homeMomentum))}%` }]}
              />
            </View>
          </View>

          <View style={styles.tickerLeague}>
            {leagueLogoSource ? (
              <Image source={leagueLogoSource} style={styles.tickerLeagueLogo} resizeMode="contain" />
            ) : (
              <Trophy size={6} color="rgba(255,255,255,0.45)" />
            )}
            <Text style={[styles.tickerLeagueName, { color: LIVE_TICKER_TEXT.league }]} numberOfLines={1}>
              {match.league}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

const TabPill = React.memo(({ 
  tabs, 
  activeTab, 
  onTabChange,
  counts,
  variant = 'default',
}: { 
  tabs: { key: string; label: string; icon: any; color: string }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: Record<string, number>;
  variant?: 'default' | 'football' | 'ufc';
}) => {
  const { isDark } = useTheme();
  const sf = sportsFixedPalette(isDark);
  const fc = footballChrome(isDark);
  
  const handlePress = useCallback(async (tab: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onTabChange(tab);
  }, [onTabChange]);
  
  const isFootball = variant === 'football';
  const isUfc = variant === 'ufc';

  return (
    <View
      style={[
        styles.pillContainer, 
        isFootball
          ? {
              backgroundColor: fc.pillTrack,
              borderWidth: 0.5,
              borderColor: fc.pillBorder,
            }
          : isUfc
          ? {
              backgroundColor: isDark ? 'rgba(14, 11, 18, 0.96)' : 'rgba(255, 252, 248, 0.98)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(225, 6, 0, 0.35)' : 'rgba(225, 6, 0, 0.22)',
              shadowColor: UFC_RED,
              shadowOpacity: isDark ? 0.14 : 0.09,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }
          : {
              backgroundColor: sf.surfaceSecondary,
              borderWidth: 0.5,
              borderColor: sf.border,
            },
      ]}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        const count = counts[tab.key] || 0;
        const accent = fc.accent;

        return (
          <TouchableOpacity 
            key={tab.key}
            onPress={() => handlePress(tab.key)} 
            activeOpacity={0.6} 
            style={[
              styles.pillTab,
              isFootball && isActive && {
                backgroundColor: isDark ? 'rgba(50,215,75,0.14)' : 'rgba(21,128,61,0.12)',
                borderRadius: 11,
                marginVertical: 2,
                borderWidth: 0.8,
                borderColor: accent,
              },
              isUfc && isActive && {
                backgroundColor: isDark ? 'rgba(225, 6, 0, 0.12)' : 'rgba(225, 6, 0, 0.08)',
                borderRadius: 11,
                marginVertical: 2,
                borderWidth: 1,
                borderColor: 'rgba(225, 6, 0, 0.45)',
              },
            ]}
          >
            <View style={[
              styles.pillTabIconWrap,
              !isFootball && !isUfc && isActive && {
                shadowColor: tab.color,
                shadowOpacity: isDark ? 0.6 : 0.4,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 0 },
                elevation: 6,
              },
              isUfc && isActive && {
                shadowColor: UFC_RED,
                shadowOpacity: isDark ? 0.45 : 0.28,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
                elevation: 6,
              },
            ]}>
              <Icon 
                size={14} 
                color={
                  isFootball
                    ? (isActive ? accent : sf.textMuted)
                    : isUfc
                      ? (isActive ? UFC_RED : sf.textMuted)
                      : (isActive ? tab.color : sf.textMuted)
                } 
                strokeWidth={isActive ? 2.8 : 2}
              />
            </View>
            <Text style={[
              styles.pillLabel, 
              {
                color: isFootball
                  ? (isActive ? (isDark ? '#F4FFF6' : '#0F172A') : sf.textMuted)
                  : isUfc
                    ? (isActive ? (isDark ? '#FAF8F5' : '#1A1410') : sf.textMuted)
                  : (isActive ? sf.text : sf.textMuted),
              },
              isActive && { fontWeight: '700' as const, letterSpacing: -0.2 }
            ]}>
              {tab.label}
            </Text>
            {count > 0 && (
              <View style={[
                styles.pillBadge,
                isFootball
                  ? (isActive
                      ? { backgroundColor: accent }
                      : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' })
                  : isUfc
                    ? (isActive
                        ? { backgroundColor: UFC_RED }
                        : { backgroundColor: 'rgba(255,255,255,0.06)' })
                  : (isActive 
                      ? { backgroundColor: tab.color } 
                      : { backgroundColor: sf.surfaceSecondary }),
              ]}>
                <Text style={[
                  styles.pillBadgeText,
                  {
                    color: isFootball
                      ? (isActive ? '#FFFFFF' : sf.textMuted)
                      : isUfc
                        ? (isActive ? '#FFFFFF' : sf.textMuted)
                      : (isActive ? sf.textInverse : sf.textMuted),
                  }
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

const DateHeader = React.memo(({ date }: { date: string }) => {
  const { isDark } = useTheme();
  const sf = sportsFixedPalette(isDark);
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
      <View style={[styles.dateLine, { backgroundColor: sf.border }]} />
      <Text style={[styles.dateText, { color: sf.textMuted }]}>
        {formatDate(date)}
      </Text>
      <View style={[styles.dateLine, { backgroundColor: sf.border }]} />
    </View>
  );
});

const EMPTY_CONFIG = {
  live: { icon: Radio, color: '#FF3B30', bg: ['#FF3B30', '#FF6B6B'] as [string, string], title: 'No Live Matches', sub: 'Check back when games kick off' },
  upcoming: { icon: Calendar, color: '#007AFF', bg: ['#007AFF', '#4DA3FF'] as [string, string], title: 'No Upcoming Matches', sub: 'Fixtures will appear when scheduled' },
  results: { icon: Trophy, color: '#34C759', bg: ['#34C759', '#6FE08A'] as [string, string], title: 'No Recent Results', sub: 'Completed matches will show here' },
};

const UFC_EMPTY_CONFIG = {
  upcoming: {
    icon: Calendar,
    color: UFC_RED,
    bg: ['#B5050F', '#E50914'] as [string, string],
    title: 'No Upcoming Fights',
    sub: 'No upcoming MMA fights found. Pull down to refresh or check back later.',
  },
  results: {
    icon: Trophy,
    color: UFC_RED,
    bg: ['#8B0409', '#E50914'] as [string, string],
    title: 'No Recent Results',
    sub: 'No recent MMA results found. Pull down to refresh or check back later.',
  },
};

const UFCCountdown = React.memo(({ fight }: { fight: UFCFight }) => {
  const ufc = ufcFixedPalette();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0 });

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

  const boutSubtitle = useMemo(() => {
    const d = new Date(fight.date);
    const datePart = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return fight.time?.trim() ? `${datePart} · ${fight.time.trim()}` : datePart;
  }, [fight.date, fight.time]);

  return (
    <View style={ufcStyles.countdownCard}>
      <LinearGradient
        colors={[...ufc.ufcGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={ufcStyles.countdownGradient}
      >
        <View style={ufcStyles.countdownAccentBar} />
        <Text style={ufcStyles.countdownLabel}>NEXT BOUT</Text>
        <Text style={ufcStyles.countdownEvent} numberOfLines={2}>
          {fight.event}
        </Text>
        <Text style={[ufcStyles.countdownSubtitle, { color: ufc.textMuted }]}>{boutSubtitle}</Text>
        <View style={ufcStyles.countdownFighters}>
          <View style={ufcStyles.countdownFighterWrap}>
            <View style={[ufcStyles.countdownAvatar, { backgroundColor: ufc.surfaceSecondary }]}>
              {fight.fighter1.photo ? (
                <ExpoImage
                  source={{ uri: fight.fighter1.photo }}
                  style={ufcStyles.countdownAvatarImg}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={ufcStyles.countdownAvatarInitial}>{fight.fighter1.name.charAt(0)}</Text>
              )}
            </View>
            <Text style={[ufcStyles.countdownFighterName, { color: ufc.text }]} numberOfLines={2}>
              {fight.fighter1.name}
            </Text>
          </View>
          <View style={ufcStyles.countdownVsWrap}>
            <LinearGradient colors={[UFC_BRAND.redBright, UFC_BRAND.redDark]} style={ufcStyles.countdownVsBadge}>
              <Text style={ufcStyles.countdownVsText}>VS</Text>
            </LinearGradient>
          </View>
          <View style={ufcStyles.countdownFighterWrap}>
            <View style={[ufcStyles.countdownAvatar, { backgroundColor: ufc.surfaceSecondary }]}>
              {fight.fighter2.photo ? (
                <ExpoImage
                  source={{ uri: fight.fighter2.photo }}
                  style={ufcStyles.countdownAvatarImg}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={ufcStyles.countdownAvatarInitial}>{fight.fighter2.name.charAt(0)}</Text>
              )}
            </View>
            <Text style={[ufcStyles.countdownFighterName, { color: ufc.text }]} numberOfLines={2}>
              {fight.fighter2.name}
            </Text>
          </View>
        </View>
        <Text style={[ufcStyles.countdownSectionLabel, { color: ufc.textMuted }]}>Starts in</Text>
        <View style={ufcStyles.countdownTimerRow}>
          <View style={ufcStyles.countdownTimeBox}>
            <Text style={ufcStyles.countdownTimeValue}>{timeLeft.days}</Text>
            <Text style={[ufcStyles.countdownTimeUnit, { color: ufc.textMuted }]}>DAYS</Text>
          </View>
          <Text style={[ufcStyles.countdownTimeSep, { color: ufc.textMuted }]}>:</Text>
          <View style={ufcStyles.countdownTimeBox}>
            <Text style={ufcStyles.countdownTimeValue}>{timeLeft.hours}</Text>
            <Text style={[ufcStyles.countdownTimeUnit, { color: ufc.textMuted }]}>HRS</Text>
          </View>
          <Text style={[ufcStyles.countdownTimeSep, { color: ufc.textMuted }]}>:</Text>
          <View style={ufcStyles.countdownTimeBox}>
            <Text style={ufcStyles.countdownTimeValue}>{timeLeft.mins}</Text>
            <Text style={[ufcStyles.countdownTimeUnit, { color: ufc.textMuted }]}>MIN</Text>
          </View>
        </View>
        {fight.category !== 'TBD' ? (
          <View style={ufcStyles.countdownWeightRow}>
            <View style={ufcStyles.countdownWeightBadge}>
              <Text style={ufcStyles.countdownWeightText}>{fight.category}</Text>
            </View>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
});

const UFCEventBanner = React.memo(({ eventName, fightCount, eventDate }: { eventName: string; fightCount: number; eventDate?: string }) => {
  const ufc = ufcFixedPalette();
  const slideAnim = useRef(new Animated.Value(8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 78, friction: 14, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
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
    <Animated.View
      style={[ufcStyles.eventBanner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <View style={ufcStyles.eventBannerCard}>
        <View style={ufcStyles.eventBannerAccentBar} />
        <View style={ufcStyles.eventBannerContent}>
          <View style={ufcStyles.eventBannerLeft}>
            <LinearGradient
              colors={[UFC_BRAND.redBright, UFC_BRAND.redDark]}
              style={ufcStyles.eventBannerIcon}
            >
              <Swords size={15} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
            <View style={ufcStyles.eventBannerTextWrap}>
              <Text style={[ufcStyles.eventBannerTitle, { color: ufc.text }]} numberOfLines={2}>
                {eventName}
              </Text>
              <View style={ufcStyles.eventBannerMetaRow}>
                <Text style={[ufcStyles.eventBannerSub, { color: ufc.textSecondary }]}>
                  {fightCount} bout{fightCount !== 1 ? 's' : ''}
                  {eventDate ? ` · ${getEventDateLabel()}` : ''}
                </Text>
              </View>
            </View>
          </View>
          <View style={ufcStyles.eventBannerBadge}>
            <Text style={ufcStyles.eventBannerBadgeText}>CARD</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

const UFCFightCard = React.memo(({ fight, isFirst, isLast, onPress }: { fight: UFCFight; isFirst?: boolean; isLast?: boolean; onPress?: () => void }) => {
  const ufc = ufcFixedPalette();
  const isCompleted = fight.status === 'Completed';
  const isLive = fight.status === 'Live';
  const isUpcoming = !isCompleted && !isLive;
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
    return UFC_RED;
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
        isLive
          ? { borderColor: `${ufc.live}55`, shadowColor: ufc.live, shadowOpacity: 0.15, shadowRadius: 20 }
          : undefined,
      ]}>
        {isLive && (
          <LinearGradient
            colors={[`${ufc.live}14`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={ufcStyles.liveGlow}
          />
        )}

        <View style={[ufcStyles.fightHeader, isUpcoming && ufcStyles.fightHeaderCompact]}>
          <View style={ufcStyles.fightEventRow}>
            {fight.category !== 'TBD' && (
              <View style={ufcStyles.weightBadge}>
                <Text style={ufcStyles.weightBadgeText}>
                  {fight.category}
                </Text>
              </View>
            )}
            {fight.event ? (
              <Text style={[ufcStyles.fightEventName, { color: ufc.textMuted }]} numberOfLines={isUpcoming ? 2 : 1}>
                {fight.event}
              </Text>
            ) : null}
          </View>
          {isLive ? (
            <View style={ufcStyles.fightLiveBadge}>
              <LivePulse color={ufc.live} size={6} />
              <Text style={[ufcStyles.fightLiveText, { color: ufc.live }]}>LIVE</Text>
            </View>
          ) : isCompleted ? (
            <View style={[ufcStyles.fightStatusBadge, { backgroundColor: `${ufc.success}18` }]}>
              <CheckCircle2 size={11} color={ufc.success} />
              <Text style={[ufcStyles.fightStatusText, { color: ufc.success }]}>Final</Text>
            </View>
          ) : (
            <View style={ufcStyles.fightStatusBadgeUpcoming}>
              <Clock size={11} color={UFC_RED} />
              <Text style={ufcStyles.fightStatusTextUpcoming}>{getFightTime()}</Text>
            </View>
          )}
        </View>

        <View style={ufcStyles.fightersRow}>
          <View style={ufcStyles.fightCardFighterSide}>
            <View style={[
              ufcStyles.fighterAvatarOuter,
              isCompleted && fight.fighter1.winner && { borderColor: '#10B981', borderWidth: 2 },
              isCompleted && !fight.fighter1.winner && fight.fighter2.winner && { opacity: 0.6 },
            ]}>
              <View style={[ufcStyles.fighterAvatar, { backgroundColor: ufc.surfaceSecondary }]}>
                {fight.fighter1.photo ? (
                  <ExpoImage
                    source={{ uri: fight.fighter1.photo }}
                    style={ufcStyles.fighterPhoto}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <LinearGradient
                    colors={[ufc.surfaceSecondary, ufc.backgroundTertiary]}
                    style={ufcStyles.fighterAvatarFallback}
                  >
                    <Text style={[ufcStyles.fighterInitials, { color: ufc.textMuted }]}>
                      {getFighterInitial(fight.fighter1.name)}
                    </Text>
                  </LinearGradient>
                )}
              </View>
            </View>
            <Text
              style={[
                ufcStyles.fighterName,
                { color: ufc.text },
                isCompleted && fight.fighter1.winner && { color: ufc.success },
                isCompleted && !fight.fighter1.winner && fight.fighter2.winner && { opacity: 0.5 },
                fight.fighter1.name === 'TBA' && { color: ufc.textTertiary, fontStyle: 'italic' as const },
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
                <Text style={[ufcStyles.loserBadgeText, { color: ufc.textSecondary }]}>LOSS</Text>
              </View>
            )}
          </View>

          <View style={ufcStyles.vsCenter}>
            <View style={ufcStyles.vsLine} />
            <LinearGradient
              colors={
                isLive
                  ? [ufc.live, ufc.error]
                  : [UFC_BRAND.redBright, UFC_BRAND.redDark]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={ufcStyles.vsCircle}
            >
              <Text style={ufcStyles.vsText}>VS</Text>
            </LinearGradient>
            <View style={ufcStyles.vsLine} />
          </View>

          <View style={ufcStyles.fightCardFighterSide}>
            <View style={[
              ufcStyles.fighterAvatarOuter,
              isCompleted && fight.fighter2.winner && { borderColor: '#10B981', borderWidth: 2 },
              isCompleted && !fight.fighter2.winner && fight.fighter1.winner && { opacity: 0.6 },
            ]}>
              <View style={[ufcStyles.fighterAvatar, { backgroundColor: ufc.surfaceSecondary }]}>
                {fight.fighter2.photo ? (
                  <ExpoImage
                    source={{ uri: fight.fighter2.photo }}
                    style={ufcStyles.fighterPhoto}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <LinearGradient
                    colors={[ufc.surfaceSecondary, ufc.backgroundTertiary]}
                    style={ufcStyles.fighterAvatarFallback}
                  >
                    <Text style={[ufcStyles.fighterInitials, { color: ufc.textMuted }]}>
                      {getFighterInitial(fight.fighter2.name)}
                    </Text>
                  </LinearGradient>
                )}
              </View>
            </View>
            <Text
              style={[
                ufcStyles.fighterName,
                { color: ufc.text },
                isCompleted && fight.fighter2.winner && { color: ufc.success },
                isCompleted && !fight.fighter2.winner && fight.fighter1.winner && { opacity: 0.5 },
                fight.fighter2.name === 'TBA' && { color: ufc.textTertiary, fontStyle: 'italic' as const },
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
                <Text style={[ufcStyles.loserBadgeText, { color: ufc.textSecondary }]}>LOSS</Text>
              </View>
            )}
          </View>
        </View>

        {isCompleted && fight.result?.method && (
          <View style={[ufcStyles.resultRow, { borderTopColor: ufc.border }]}>
            <View style={ufcStyles.resultMethodContainer}>
              <Text style={[ufcStyles.resultMethodEmoji, { color: getMethodColor(fight.result.method) }]}>{getMethodIcon(fight.result.method)}</Text>
              <Text style={[ufcStyles.resultMethod, { color: getMethodColor(fight.result.method) }]}>
                {fight.result.method}
              </Text>
              {fight.result.round ? (
                <View style={[ufcStyles.resultDetailChip, { backgroundColor: ufc.surfaceSecondary }]}>
                  <Text style={[ufcStyles.resultDetailText, { color: ufc.textSecondary }]}>R{fight.result.round}</Text>
                </View>
              ) : null}
              {fight.result.time ? (
                <View style={[ufcStyles.resultDetailChip, { backgroundColor: ufc.surfaceSecondary }]}>
                  <Clock size={9} color={ufc.textMuted} />
                  <Text style={[ufcStyles.resultDetailText, { color: ufc.textSecondary }]}>{fight.result.time}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {isUpcoming ? (
          <View style={[ufcStyles.upcomingScheduleStrip, { borderTopColor: ufc.border }]}>
            <View style={[ufcStyles.schedulePill, { backgroundColor: ufc.surfaceSecondary }]}>
              <Calendar size={13} color={UFC_RED} />
              <Text style={[ufcStyles.schedulePillText, { color: ufc.text }]}>
                {new Date(fight.date).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
            {fight.time?.trim() ? (
              <View style={[ufcStyles.schedulePill, { backgroundColor: ufc.surfaceSecondary }]}>
                <Clock size={13} color={UFC_RED} />
                <Text style={[ufcStyles.schedulePillText, { color: ufc.text }]}>{fight.time.trim()}</Text>
              </View>
            ) : null}
            <View style={ufcStyles.schedulePillEmphasis}>
              <Text style={ufcStyles.schedulePillEmphasisText}>{getDaysUntil()}</Text>
            </View>
          </View>
        ) : null}
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const SportFetchingBanner = React.memo(
  ({
    accentColor,
    textColor,
    surfaceColor,
    message = 'Getting latest updates',
    floating = false,
    topInset = 0,
  }: {
    accentColor: string;
    textColor: string;
    surfaceColor: string;
    message?: string;
    floating?: boolean;
    topInset?: number;
  }) => (
    <View
      style={
        floating
          ? [styles.sportUpdateFloatingWrap, { paddingTop: topInset + 8 }]
          : styles.sportFetchingInline
      }
      pointerEvents="none"
    >
      <BlurView
        intensity={floating ? 48 : 24}
        tint="dark"
        style={[styles.sportFetchingBanner, { backgroundColor: surfaceColor }]}
      >
        <ActivityIndicator size="small" color={accentColor} />
        <Text style={[styles.sportFetchingText, { color: textColor }]}>{message}</Text>
      </BlurView>
    </View>
  ),
);

const EmptyState = React.memo(
  ({ type, hint }: { type: 'live' | 'upcoming' | 'results'; hint?: string | null }) => {
  const { colors } = useTheme();
  const { icon: Icon, bg, title, sub } = EMPTY_CONFIG[type];
  
  return (
    <View style={styles.emptyState}>
      <LinearGradient colors={bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyIconCircle}>
        <Icon size={28} color={colors.textInverse} strokeWidth={2} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{hint?.trim() || sub}</Text>
    </View>
  );
});

function SportsScreenInner() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  /** Edge inset for hero strip / tabs: tight phones need smaller padding so flex rows are not clipped by overflow:hidden. */
  const sportsEdgePad = useMemo(
    () => getSportsHeroEdgePad(windowWidth, insets.left, insets.right),
    [windowWidth, insets.left, insets.right],
  );
  const sportsHeroMinHeight = useMemo(() => getSportsTallHeroMinHeight(windowWidth), [windowWidth]);
  const footballHeroBottomCropPx = useMemo(
    () => getSportsHeroBottomCropPx(sportsHeroMinHeight, 0.04),
    [sportsHeroMinHeight],
  );
  const sportsHeroImageStyle = useMemo(
    () => (bottomCropPx: number) =>
      getSportsHeroImageStyle(windowWidth, bottomCropPx, sportsHeroMinHeight),
    [windowWidth, sportsHeroMinHeight],
  );
  const { isFavoriteTeam, profile, updateProfile } = useUserProfile();
  const { user } = useAuth();
  const { isPinned: isMatchPinned, togglePin: toggleMatchPin } = usePinnedMatches();
  const { colors, isDark } = useTheme();
  const sf = sportsFixedPalette(isDark);
  const fc = footballChrome(isDark);
  const scopedKey = useCallback(
    (base: string) => `${base}_${user?.id || 'guest'}`,
    [user?.id]
  );
  const [refreshing, setRefreshing] = useState(false);
  const [sportMode, setSportMode] = useState<SportMode>('football');
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'results'>('upcoming');
  const [ufcTab, setUfcTab] = useState<'upcoming' | 'results'>('upcoming');
  const [ufcShowStatsRankings, setUfcShowStatsRankings] = useState(false);
  const [selectedLeagues, setSelectedLeagues] = useState<number[]>([]);
  const [footballSmartFilter, setFootballSmartFilter] = useState<FootballSmartFilter>('for-you');
  const [contextTopLeagueIds, setContextTopLeagueIds] = useState<number[] | null>(null);
  const [showFootballContextSheet, setShowFootballContextSheet] = useState(false);
  const [footballSortMode, setFootballSortMode] = useState<'kickoff' | 'competition' | 'smart'>('smart');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showStandingsModal, setShowStandingsModal] = useState(false);
  const [selectedLeagueForStandings, setSelectedLeagueForStandings] = useState<{
    id: number;
    name: string;
    season?: number;
  } | null>(null);
  const [showLeaguePicker, setShowLeaguePicker] = useState(false);
  const [showFootballFilterPicker, setShowFootballFilterPicker] = useState(false);
  const [insightCarouselIndex, setInsightCarouselIndex] = useState(0);
  const [notifiedMatches, setNotifiedMatches] = useState<Set<string>>(new Set());
  const [selectedFight, setSelectedFight] = useState<UFCFight | null>(null);
  const [showFightModal, setShowFightModal] = useState(false);
  const [footballTeamSearchOpen, setFootballTeamSearchOpen] = useState(false);
  const [footballClubProfilePreset, setFootballClubProfilePreset] =
    useState<FootballClubProfilePreset | null>(null);
  /** Local hour — football hero art switches between day / evening assets. */
  const [localHour, setLocalHour] = useState(() => new Date().getHours());

  const headerAnim = useRef(new Animated.Value(0)).current;
  const ufcEventsFlatListRef = useRef<FlatList>(null);
  
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  useEffect(() => {
    const timer = setInterval(() => setLocalHour(new Date().getHours()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [scopedLeagues, scopedNotifications, scopedFocusMode] = await Promise.all([
          AsyncStorage.getItem(scopedKey('sports_selected_leagues')),
          AsyncStorage.getItem(scopedKey('sports_notified_matches')),
          AsyncStorage.getItem(scopedKey('sports_football_focus_mode')),
        ]);
        let savedLeagues = scopedLeagues;
        let savedNotifications = scopedNotifications;
        let savedFocusMode = scopedFocusMode;
        if (!savedLeagues && !savedNotifications && !savedFocusMode) {
          const [legacyLeagues, legacyNotifications] = await Promise.all([
            AsyncStorage.getItem('sports_selected_leagues'),
            AsyncStorage.getItem('sports_notified_matches'),
          ]);
          savedLeagues = legacyLeagues;
          savedNotifications = legacyNotifications;
          await Promise.all([
            legacyLeagues ? AsyncStorage.setItem(scopedKey('sports_selected_leagues'), legacyLeagues) : Promise.resolve(),
            legacyNotifications ? AsyncStorage.setItem(scopedKey('sports_notified_matches'), legacyNotifications) : Promise.resolve(),
          ]);
        }
        if (savedLeagues) {
          const parsed = JSON.parse(savedLeagues);
          if (Array.isArray(parsed)) setSelectedLeagues(parsed);
        } else {
          setSelectedLeagues([]);
        }
        if (savedNotifications) {
          const parsed = JSON.parse(savedNotifications);
          if (Array.isArray(parsed)) setNotifiedMatches(new Set(parsed));
        } else {
          setNotifiedMatches(new Set());
        }
        if (savedFocusMode) {
          setFootballSmartFilter(migrateStoredFootballFocus(savedFocusMode));
        } else {
          setFootballSmartFilter('for-you');
        }
      } catch (e) {
        console.log('Failed to load league preferences:', e);
      } finally {
        setPreferencesLoaded(true);
      }
    };
    void loadPreferences();
  }, [scopedKey, profile?.favoriteTeams?.length]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    AsyncStorage.setItem(scopedKey('sports_football_focus_mode'), footballSmartFilter).catch((e) =>
      console.log('Failed to save football focus mode:', e)
    );
  }, [footballSmartFilter, preferencesLoaded, scopedKey]);

  const teamApiIds = useMemo(() => {
    if (!profile?.favoriteTeams) return [];
    return profile.favoriteTeams
      .map(team => team.apiId)
      .filter((id): id is number => id !== undefined);
  }, [profile?.favoriteTeams]);

  const nationalTeamApiIds = useMemo(
    () => collectNationalTeamApiIds(profile?.nationalities),
    [profile?.nationalities],
  );

  const hasNationalTeams = nationalTeamApiIds.length > 0;
  const favoriteTeamApiIdSet = useMemo(() => new Set(teamApiIds), [teamApiIds]);
  const nationalitySignals = useMemo(() => getNationalitySignals(profile), [profile]);
  const countryInterestNamesLower = useMemo(() => {
    const fromNationalities = nationalitySignals.countryNamesLower;
    const fromFavoriteCountries = (profile?.favoriteCountries ?? [])
      .map((country) => country.name?.toLowerCase().trim())
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set([...fromNationalities, ...fromFavoriteCountries]));
  }, [nationalitySignals.countryNamesLower, profile?.favoriteCountries]);
  const selectedProfileLeagueIds = useMemo(() => {
    return new Set((profile?.favoriteLeagues ?? []).filter((id): id is number => typeof id === 'number' && id > 0));
  }, [profile?.favoriteLeagues]);
  const sportsFeedPrefs = profile?.sportsFeedPrefs;

  useEffect(() => {
    if (footballSmartFilter !== 'explore') {
      setShowFootballContextSheet(false);
    }
  }, [footballSmartFilter]);

  const profileFavoriteLeagueIds = useMemo(
    () => (profile?.favoriteLeagues ?? []).filter((id): id is number => typeof id === 'number' && id > 0),
    [profile?.favoriteLeagues],
  );

  const followedTeamLeagues = useMemo(
    () =>
      (profile?.favoriteTeams ?? []).map((team) => ({
        league: team.league,
        country: team.country,
      })),
    [profile?.favoriteTeams],
  );

  const footballQueryContext = useMemo(
    () =>
      buildFootballQueryContext({
        smartFilter: footballSmartFilter,
        manualLeagueIds: selectedLeagues,
        contextTopLeagueIds,
        contextFollowingTeamIds: null,
        followedTeamApiIds: teamApiIds,
        strictFollowing: sportsFeedPrefs?.strictFollowing,
        favoriteLeagueIds: profileFavoriteLeagueIds,
        followedTeams: followedTeamLeagues,
        countryInterestNamesLower,
        prioritizeDomesticLeagues: sportsFeedPrefs?.prioritizeDomesticLeagues,
        includeFollowedLeagues: sportsFeedPrefs?.includeFollowedLeagues,
        discoveryLevel: sportsFeedPrefs?.discoveryLevel,
      }),
    [
      footballSmartFilter,
      selectedLeagues,
      contextTopLeagueIds,
      teamApiIds,
      sportsFeedPrefs?.strictFollowing,
      sportsFeedPrefs?.prioritizeDomesticLeagues,
      sportsFeedPrefs?.includeFollowedLeagues,
      sportsFeedPrefs?.discoveryLevel,
      profileFavoriteLeagueIds,
      followedTeamLeagues,
      countryInterestNamesLower,
    ],
  );

  const queryLeagueIds = footballQueryContext.leagueIds;
  const queryTeamIds = footballQueryContext.teamIds;

  const [hasViewedLive, setHasViewedLive] = useState(false);
  const [hasViewedResults, setHasViewedResults] = useState(false);

  useEffect(() => {
    if (activeTab === 'live') setHasViewedLive(true);
    if (activeTab === 'results') setHasViewedResults(true);
  }, [activeTab]);

  const includeResultsTab = activeTab === 'results' || hasViewedResults;

  const { query: footballBundleQuery, publishBundleInput, setPollLive, requestIncludeResults } =
    useFootballBundle();

  const footballBundleInput = useMemo<FootballBundleInput | null>(() => {
    if (sportMode !== 'football') return null;
    /** Fetch national-team fixtures whenever the user follows countries (not only in Following mode). */
    const scopeNationalTeamsOnApi =
      hasNationalTeams &&
      (footballSmartFilter === 'for-you' || footballSmartFilter === 'explore');
    const narrowApiByFollowedTeams =
      footballSmartFilter === 'for-you' && sportsFeedPrefs?.strictFollowing === true;
    const resolvedTeamIds =
      queryTeamIds && queryTeamIds.length > 0
        ? queryTeamIds
        : teamApiIds.length > 0
          ? teamApiIds
          : undefined;
    /**
     * For You / Explore use a broad league + international feed on the Sports tab. Followed club
     * and national team ids are still merged in FootballBundleContext so Overview My Teams keeps
     * per-team fixture fetches.
     */
    const apiTeamIds: number[] | undefined = narrowApiByFollowedTeams
      ? resolvedTeamIds
      : [];
    const apiLeagueIds =
      queryLeagueIds && queryLeagueIds.length > 0
        ? withWorldCupLeagueIds(queryLeagueIds)
        : footballSmartFilter === 'for-you' || footballSmartFilter === 'explore'
          ? withWorldCupLeagueIds([FIFA_WORLD_CUP_LEAGUE_ID])
          : undefined;
    return {
      days: 14,
      teamIds: apiTeamIds,
      leagueIds: apiLeagueIds,
      nationalTeamIds: scopeNationalTeamsOnApi ? nationalTeamApiIds : undefined,
      includeAfcon: scopeNationalTeamsOnApi ? true : undefined,
      includeResults: includeResultsTab,
    };
  }, [
    sportMode,
    footballSmartFilter,
    queryTeamIds,
    queryLeagueIds,
    teamApiIds,
    hasNationalTeams,
    nationalTeamApiIds,
    includeResultsTab,
    sportsFeedPrefs?.strictFollowing,
  ]);

  const isSportsScreenFocused = useIsFocused();

  useEffect(() => {
    if (!isSportsScreenFocused) {
      publishBundleInput(null);
      return;
    }
    publishBundleInput(footballBundleInput);
  }, [isSportsScreenFocused, footballBundleInput, publishBundleInput]);

  useEffect(() => {
    setPollLive(sportMode === 'football' && activeTab === 'live');
  }, [sportMode, activeTab, setPollLive]);

  useEffect(() => {
    if (includeResultsTab) requestIncludeResults();
  }, [includeResultsTab, requestIncludeResults]);

  useEffect(() => {
    if (sportMode !== 'football' || activeTab !== 'results' || !isSportsScreenFocused) return;
    void footballBundleQuery.refetch();
    const intervalId = setInterval(() => void footballBundleQuery.refetch(), 90 * 1000);
    return () => clearInterval(intervalId);
  }, [sportMode, activeTab, isSportsScreenFocused, footballBundleQuery]);

  const liveMatches = useMemo(() => {
    const data = footballBundleQuery.data?.live?.response;
    if (!data || !Array.isArray(data)) return [];
    return transformApiFootballData(data);
  }, [footballBundleQuery.data?.live]);

  const upcomingMatches = useMemo(() => {
    const data = footballBundleQuery.data?.upcoming?.response;
    if (!data || !Array.isArray(data)) return [];
    return transformApiFootballData(data).filter(m => m.status === 'Upcoming')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [footballBundleQuery.data?.upcoming]);

  const completedMatches = useMemo(() => {
    const data = footballBundleQuery.data?.results?.response;
    if (!data || !Array.isArray(data)) return [];
    return transformApiFootballData(data).filter(m => m.status === 'Completed');
  }, [footballBundleQuery.data?.results]);

  const nationalTeamApiIdSet = useMemo(() => new Set(nationalTeamApiIds), [nationalTeamApiIds]);

  const applyFootballFiltersEarly = useCallback(
    (matches: Match[]) =>
      applyFootballVisibilityRules(matches, {
        smartFilter: footballSmartFilter,
        manualLeagueIds: footballSmartFilter === 'explore' ? selectedLeagues : [],
        favoriteTeamIds: favoriteTeamApiIdSet,
        nationalTeamIds: hasNationalTeams ? nationalTeamApiIdSet : undefined,
        nationalityNamesLower: nationalitySignals.countryNamesLower,
        prioritizeNationalTeams: sportsFeedPrefs?.prioritizeNationalTeams ?? hasNationalTeams,
        scopedLeagueIds: queryLeagueIds,
      }),
    [
      footballSmartFilter,
      selectedLeagues,
      favoriteTeamApiIdSet,
      nationalTeamApiIdSet,
      nationalitySignals.countryNamesLower,
      queryLeagueIds,
      hasNationalTeams,
      sportsFeedPrefs?.prioritizeNationalTeams,
    ],
  );

  const availableLeaguesForStandings = useMemo(() => {
    /** Use full bundle (not visibility-filtered) so World Cup / intl tables stay discoverable. */
    const allMatches = [...liveMatches, ...upcomingMatches, ...completedMatches];
    const leagueMap = new Map<
      number,
      { id: number; name: string; logo?: string; country: string; season?: number }
    >();
    const leagueScore = new Map<number, number>();

    allMatches.forEach((m) => {
      if (!m.leagueId || m.leagueId <= 0) return;

      const leagueNameLower = m.league.toLowerCase();
      const isFriendly =
        leagueNameLower.includes('friendly') || leagueNameLower.includes('friendlies');
      if (isFriendly) return;

      if (!leagueMap.has(m.leagueId)) {
        leagueMap.set(m.leagueId, {
          id: m.leagueId,
          name: m.league,
          logo: m.leagueLogo,
          country: m.leagueCountry || '',
          season: m.leagueSeason,
        });
      } else if (m.leagueSeason != null && leagueMap.get(m.leagueId)?.season == null) {
        const existing = leagueMap.get(m.leagueId)!;
        leagueMap.set(m.leagueId, { ...existing, season: m.leagueSeason });
      }

      let score = leagueScore.get(m.leagueId) ?? 0;
      if (m.leagueId === 1) score += 20;
      if (selectedLeagues.includes(m.leagueId)) score += 8;
      if (selectedProfileLeagueIds.has(m.leagueId)) score += 6;
      if (
        (typeof m.homeTeamId === 'number' && favoriteTeamApiIdSet.has(m.homeTeamId)) ||
        (typeof m.awayTeamId === 'number' && favoriteTeamApiIdSet.has(m.awayTeamId))
      ) {
        score += 5;
      }
      if (
        (typeof m.homeTeamId === 'number' && nationalTeamApiIdSet.has(m.homeTeamId)) ||
        (typeof m.awayTeamId === 'number' && nationalTeamApiIdSet.has(m.awayTeamId))
      ) {
        score += 6;
      }
      const matchCountry = (m.leagueCountry || '').toLowerCase();
      if (countryInterestNamesLower.some((country) => matchCountry.includes(country))) {
        score += 3;
      }
      if (m.status === 'Live') score += 1;
      leagueScore.set(m.leagueId, score);
    });

    const calendarYear = new Date().getFullYear();
    if (!leagueMap.has(1)) {
      const worldCup = getCompetitionById(1);
      if (worldCup) {
        leagueMap.set(1, {
          id: 1,
          name: 'World Cup',
          country: 'World',
          season: calendarYear,
        });
        leagueScore.set(1, (leagueScore.get(1) ?? 0) + 25);
      }
    }

    const leagues = Array.from(leagueMap.values());
    const TOP_LEAGUES = ['premier league', 'la liga', 'bundesliga', 'serie a', 'ligue 1', 'champions league', 'europa league', 'world cup'];
    return leagues.sort((a, b) => {
      const scoreDiff = (leagueScore.get(b.id) ?? 0) - (leagueScore.get(a.id) ?? 0);
      if (scoreDiff !== 0) return scoreDiff;

      const aIdx = TOP_LEAGUES.findIndex((l) => a.name.toLowerCase().includes(l));
      const bIdx = TOP_LEAGUES.findIndex((l) => b.name.toLowerCase().includes(l));
      if (aIdx !== -1 && bIdx === -1) return -1;
      if (bIdx !== -1 && aIdx === -1) return 1;
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      return a.name.localeCompare(b.name);
    });
  }, [
    liveMatches,
    upcomingMatches,
    completedMatches,
    selectedLeagues,
    selectedProfileLeagueIds,
    favoriteTeamApiIdSet,
    nationalTeamApiIdSet,
    countryInterestNamesLower,
  ]);
  
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
  
  const handleSelectLeagueForStandings = useCallback(async (league: {
    id: number;
    name: string;
    season?: number;
  }) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowLeaguePicker(false);
    setSelectedLeagueForStandings(league);
    setShowStandingsModal(true);
  }, []);

  const leagueFixturesForStandings = useMemo((): KnockoutFixtureLite[] | undefined => {
    if (!selectedLeagueForStandings) return undefined;
    const lid = selectedLeagueForStandings.id;
    return [...liveMatches, ...upcomingMatches, ...completedMatches]
      .filter((m) => m.leagueId === lid)
      .map((m) => ({
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
        round: m.round,
        date: m.date,
        time: m.time,
        homeTeamLogo: m.homeTeamLogo,
        awayTeamLogo: m.awayTeamLogo,
        leagueId: m.leagueId,
      }));
  }, [selectedLeagueForStandings, liveMatches, upcomingMatches, completedMatches]);

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
    /** Keep international tournaments (e.g. World Cup) even when out of their date window —
     *  they're often empty between rounds/off-season and would otherwise be wrongly pruned. */
    const pruned = selectedLeagues.filter(
      id => availableLeagueIds.has(id) || ALWAYS_VISIBLE_INTERNATIONAL_LEAGUE_IDS.has(id),
    );
    if (pruned.length !== selectedLeagues.length) {
      console.log('🧹 Pruning stale league filter:', selectedLeagues, '->', pruned);
      setSelectedLeagues(pruned);
      AsyncStorage.setItem(scopedKey('sports_selected_leagues'), JSON.stringify(pruned)).catch(() => {});
    }
  }, [availableLeagueIds, selectedLeagues, preferencesLoaded, scopedKey]);

  const footballPersonalizationCtx = useMemo<FootballPersonalizationContext>(
    () => ({
      favoriteClubApiIds: favoriteTeamApiIdSet,
      nationalTeamApiIds,
      countryInterestNamesLower,
      selectedProfileLeagueIds,
      manualFilterLeagueIds: selectedLeagues,
    }),
    [
      favoriteTeamApiIdSet,
      nationalTeamApiIds,
      countryInterestNamesLower,
      selectedProfileLeagueIds,
      selectedLeagues,
    ],
  );

  const isFavoriteMatchByTeamId = useCallback(
    (match: Match) =>
      isFavoriteClubOrNationalMatch(
        match,
        favoriteTeamApiIdSet,
        nationalTeamApiIds,
      ),
    [favoriteTeamApiIdSet, nationalTeamApiIds],
  );

  const matchesNationalityCountry = useCallback(
    (match: Match) =>
      matchInvolvesNationalInterest(
        match,
        nationalTeamApiIds,
        countryInterestNamesLower,
      ),
    [nationalTeamApiIds, countryInterestNamesLower],
  );

  const applyFootballFilters = applyFootballFiltersEarly;

  const sortMatchesBySmartForYouLocal = useCallback(
    (matches: Match[]) => sortMatchesBySmartForYou(matches, footballPersonalizationCtx),
    [footballPersonalizationCtx],
  );

  const sortMatchesForDisplayLocal = useCallback(
    (matches: Match[]) =>
      sortMatchesForDisplay(matches, footballSortMode, footballPersonalizationCtx),
    [footballSortMode, footballPersonalizationCtx],
  );

  const filteredLiveMatches = useMemo(() => applyFootballFilters(liveMatches), [liveMatches, applyFootballFilters]);
  const filteredUpcomingMatches = useMemo(() => applyFootballFilters(upcomingMatches), [upcomingMatches, applyFootballFilters]);
  const filteredCompletedMatches = useMemo(() => applyFootballFilters(completedMatches), [completedMatches, applyFootballFilters]);

  const smartSortedLiveMatches = useMemo(
    () => sortMatchesBySmartForYouLocal(filteredLiveMatches),
    [filteredLiveMatches, sortMatchesBySmartForYouLocal],
  );
  const smartSortedUpcomingMatches = useMemo(
    () => sortMatchesBySmartForYouLocal(filteredUpcomingMatches),
    [filteredUpcomingMatches, sortMatchesBySmartForYouLocal],
  );

  const featuredUpcomingMatch = useMemo((): Match | null =>
      pickFeaturedUpcomingMatch({
        filteredUpcomingMatches,
        smartSortedUpcomingMatches,
        footballSmartFilter,
        ctx: footballPersonalizationCtx,
      }),
    [
      filteredUpcomingMatches,
      smartSortedUpcomingMatches,
      footballSmartFilter,
      footballPersonalizationCtx,
    ],
  );

  /** Insight target: club live → World Cup live → smart-ranked (see footballInsightPicker). */
  const aiInsightMatch = useMemo((): Match | null =>
      pickAiInsightMatch({
        activeTab,
        filteredLiveMatches,
        featuredUpcomingMatch,
        ctx: footballPersonalizationCtx,
      }),
    [activeTab, filteredLiveMatches, featuredUpcomingMatch, footballPersonalizationCtx],
  );

  const insightFixtureNumericId = useMemo(() => {
    const raw = aiInsightMatch?.id;
    if (!raw || String(raw).startsWith('gen')) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [aiInsightMatch?.id]);

  const footballSeasonYear = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    if (month < 6) return year - 1;
    return year;
  }, []);

  const insightMatchDetailsQuery = trpc.football.getMatchDetails.useQuery(
    { fixtureId: insightFixtureNumericId! },
    {
      enabled: sportMode === 'football' && insightFixtureNumericId != null,
      staleTime: 60 * 1000,
    }
  );

  const trendingLeagueId = useMemo(() => {
    const raw = insightMatchDetailsQuery.data?.fixture?.league?.id ?? aiInsightMatch?.leagueId ?? 0;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
  }, [insightMatchDetailsQuery.data?.fixture?.league?.id, aiInsightMatch?.leagueId]);

  const trendingSeason = useMemo(() => {
    const raw = insightMatchDetailsQuery.data?.fixture?.league?.season ?? footballSeasonYear;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw >= 1900 && raw <= 2100 ? Math.trunc(raw) : footballSeasonYear;
    }
    const n = parseInt(String(raw), 10);
    return Number.isFinite(n) && n >= 1900 && n <= 2100 ? n : footballSeasonYear;
  }, [insightMatchDetailsQuery.data?.fixture?.league?.season, footballSeasonYear]);

  /** Polls when insight targets a league so we detect live fixtures even off the Live tab (bundle may not refresh live). */
  const insightLiveProbeQuery = trpc.football.getMatches.useQuery(
    { type: 'live' },
    {
      enabled: sportMode === 'football' && trendingLeagueId > 0,
      staleTime: 15 * 1000,
      refetchInterval: sportMode === 'football' && trendingLeagueId > 0 ? 45 * 1000 : false,
    }
  );

  const insightLeagueHasLiveMatch = useMemo(() => {
    if (trendingLeagueId <= 0) return false;
    const rows = insightLiveProbeQuery.data?.response;
    if (Array.isArray(rows) && rows.some((m: { league?: { id?: number } }) => m?.league?.id === trendingLeagueId)) {
      return true;
    }
    return liveMatches.some((m) => m.leagueId === trendingLeagueId);
  }, [trendingLeagueId, insightLiveProbeQuery.data?.response, liveMatches]);

  const trendingFocusTeamIds = useMemo(() => {
    const home = insightMatchDetailsQuery.data?.fixture?.teams?.home?.id ?? aiInsightMatch?.homeTeamId;
    const away = insightMatchDetailsQuery.data?.fixture?.teams?.away?.id ?? aiInsightMatch?.awayTeamId;
    return [home, away].filter((id): id is number => typeof id === 'number' && id > 0);
  }, [
    insightMatchDetailsQuery.data?.fixture?.teams?.home?.id,
    insightMatchDetailsQuery.data?.fixture?.teams?.away?.id,
    aiInsightMatch?.homeTeamId,
    aiInsightMatch?.awayTeamId,
  ]);

  const leagueTopPlayersQuery = trpc.football.getLeagueTopPlayers.useQuery(
    {
      leagueId: trendingLeagueId,
      season: trendingSeason,
      ...(trendingFocusTeamIds.length > 0 ? { focusTeamIds: trendingFocusTeamIds } : {}),
    },
    {
      enabled: sportMode === 'football' && trendingLeagueId > 0,
      staleTime: 45 * 60 * 1000,
    }
  );

  const insightStandingsQuery = trpc.football.getLeagueStandings.useQuery(
    { leagueId: trendingLeagueId, season: trendingSeason },
    {
      enabled: sportMode === 'football' && trendingLeagueId > 0,
      staleTime: insightLeagueHasLiveMatch ? 0 : 5 * 60 * 1000,
      refetchInterval: insightLeagueHasLiveMatch ? 45 * 1000 : false,
    },
  );

  const insightTrustCtx = useMemo((): InsightTrustContext => {
    const favoriteClubNamesByApiId = new Map<number, string>();
    for (const team of profile?.favoriteTeams ?? []) {
      if (typeof team.apiId === 'number' && team.apiId > 0) {
        favoriteClubNamesByApiId.set(team.apiId, team.name);
      }
    }
    return {
      favoriteClubApiIds: favoriteTeamApiIdSet,
      favoriteClubNamesByApiId,
      nationalTeamApiIds,
      nationalityNames: (profile?.nationalities ?? []).map((n) => n.name),
      countryInterestNamesLower,
      selectedProfileLeagueIds,
      manualFilterLeagueIds: selectedLeagues,
    };
  }, [
    favoriteTeamApiIdSet,
    profile?.favoriteTeams,
    nationalTeamApiIds,
    profile?.nationalities,
    countryInterestNamesLower,
    selectedProfileLeagueIds,
    selectedLeagues,
  ]);

  const showFootballInsight = useMemo(
    () => isTrustworthyInsightMatch(aiInsightMatch, insightTrustCtx),
    [aiInsightMatch, insightTrustCtx],
  );

  const aiInsightData = useMemo(() => {
    if (!aiInsightMatch || !showFootballInsight) return null;

    let standingsLine: string | null = null;
    if (sportMode === 'football') {
      const hid =
        insightMatchDetailsQuery.data?.fixture?.teams?.home?.id ?? aiInsightMatch.homeTeamId;
      const aid =
        insightMatchDetailsQuery.data?.fixture?.teams?.away?.id ?? aiInsightMatch.awayTeamId;

      if (isKnockoutFixture(aiInsightMatch)) {
        const knockoutLine = buildKnockoutInsightContextLine({
          homeTeam: aiInsightMatch.homeTeam,
          awayTeam: aiInsightMatch.awayTeam,
          homeTeamId: hid,
          awayTeamId: aid,
          round: aiInsightMatch.round,
          homeForm: insightMatchDetailsQuery.data?.homeForm,
          awayForm: insightMatchDetailsQuery.data?.awayForm,
        });
        if (knockoutLine) {
          standingsLine = clampInsightCopy(knockoutLine, 200);
        }
      } else {
        const rows = findHomeAwayInStandings(insightStandingsQuery.data?.response, hid, aid);
        if (rows) {
          standingsLine = clampInsightCopy(
            buildCompactInsightTableLine(
              aiInsightMatch.homeTeam,
              aiInsightMatch.awayTeam,
              rows.home,
              rows.away,
            ),
            200,
          );
        }
      }
    }

    return buildFootballAiInsightCard({
      match: aiInsightMatch,
      ctx: insightTrustCtx,
      standingsLine,
    });
  }, [
    aiInsightMatch,
    showFootballInsight,
    insightTrustCtx,
    sportMode,
    insightMatchDetailsQuery.data,
    insightStandingsQuery.data?.response,
  ]);

  const footballTrendingPreview = useMemo(() => {
    const match = aiInsightMatch;
    if (!match) return null;
    const det = insightMatchDetailsQuery.data;
    const homeId = det?.fixture?.teams?.home?.id ?? match.homeTeamId;
    const awayId = det?.fixture?.teams?.away?.id ?? match.awayTeamId;
    const homeWins = countFormWinsInLastN(det?.homeForm, homeId, 5);
    const awayWins = countFormWinsInLastN(det?.awayForm, awayId, 5);

    const favIds = new Set(
      (profile?.favoriteTeams ?? [])
        .map((t) => t.apiId)
        .filter((id): id is number => typeof id === 'number' && id > 0)
    );

    let formName = match.homeTeam;
    let formLogo = match.homeTeamLogo;
    let wins = homeWins;
    if (homeId && favIds.has(homeId)) {
      formName = match.homeTeam;
      formLogo = match.homeTeamLogo;
      wins = homeWins;
    } else if (awayId && favIds.has(awayId)) {
      formName = match.awayTeam;
      formLogo = match.awayTeamLogo;
      wins = awayWins;
    } else if (awayWins > homeWins && awayId) {
      formName = match.awayTeam;
      formLogo = match.awayTeamLogo;
      wins = awayWins;
    }

    const formSub =
      wins > 0
        ? `${wins} wins in last 5`
        : det?.homeForm?.length || det?.awayForm?.length
          ? 'Recent form updating'
          : 'Match context';

    const scorers = leagueTopPlayersQuery.data?.topScorers ?? [];
    const assists = leagueTopPlayersQuery.data?.topAssists ?? [];

    const normalizeTeamName = (name: string) =>
      name.toLowerCase().replace(/\s+/g, ' ').trim();
    const focusTeamIds = new Set(
      [homeId, awayId].filter((id): id is number => typeof id === 'number' && id > 0),
    );
    const focusTeamNames = new Set(
      [match.homeTeam, match.awayTeam].map(normalizeTeamName).filter(Boolean),
    );

    const rowMatchesFocusTeam = (row: { teamId?: number | null; teamName?: string | null }) => {
      if (row.teamId != null && focusTeamIds.has(row.teamId)) return true;
      const name = row.teamName ? normalizeTeamName(row.teamName) : '';
      return name.length > 0 && focusTeamNames.has(name);
    };

    // National-team tournaments aggregate unrelated teams under one league id, so only
    // surface leaders from the two sides in this fixture — never the overall leader
    // (e.g. a Morocco scorer on a Belgium vs Egypt card).
    const isAggregatedComp =
      ALWAYS_VISIBLE_INTERNATIONAL_LEAGUE_IDS.has(trendingLeagueId) || trendingLeagueId === 667;

    type ScorerRow = (typeof scorers)[number];
    type AssistRow = (typeof assists)[number];

    const pickScorer = () => {
      const forTeams = scorers
        .filter(rowMatchesFocusTeam)
        .sort((a: ScorerRow, b: ScorerRow) => (b.goals ?? 0) - (a.goals ?? 0));
      if (forTeams.length) return forTeams[0];
      return isAggregatedComp ? null : scorers[0] ?? null;
    };
    const pickAssist = () => {
      const forTeams = assists
        .filter(rowMatchesFocusTeam)
        .sort((a: AssistRow, b: AssistRow) => (b.assists ?? 0) - (a.assists ?? 0));
      if (forTeams.length) return forTeams[0];
      return isAggregatedComp ? null : assists[0] ?? null;
    };

    const leadersUnavailableHint =
      match.status === 'Upcoming' ? 'No tournament goals yet' : 'Not available';

    return {
      formName,
      formLogo,
      formSub,
      topScorer: pickScorer(),
      topAssist: pickAssist(),
      leagueLabel: match.league,
      leadersUnavailableHint,
    };
  }, [
    aiInsightMatch,
    insightMatchDetailsQuery.data,
    leagueTopPlayersQuery.data?.topScorers,
    leagueTopPlayersQuery.data?.topAssists,
    profile?.favoriteTeams,
    trendingLeagueId,
  ]);

  useEffect(() => {
    setInsightCarouselIndex(0);
  }, [aiInsightMatch?.id]);

  const insightCarouselWidth = useMemo(
    () => SCREEN_WIDTH - sportsEdgePad * 2,
    [sportsEdgePad],
  );

  const recommendedLeagueIds = useMemo(() => {
    const ranked = new Map<number, number>();
    const allMatches = [...liveMatches, ...upcomingMatches, ...completedMatches];
    allMatches.forEach((match) => {
      if (!match.leagueId || match.leagueId <= 0) return;
      let score = ranked.get(match.leagueId) ?? 0;
      if (isFavoriteMatchByTeamId(match)) score += 5;
      if (matchesNationalityCountry(match)) score += 3;
      if (selectedLeagues.includes(match.leagueId)) score += 6;
      if (selectedProfileLeagueIds.has(match.leagueId)) score += 4;
      ranked.set(match.leagueId, score);
    });
    const sortedBySignal = Array.from(ranked.entries())
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([leagueId]) => leagueId);
    if (sortedBySignal.length > 0) return sortedBySignal;
    return Array.from(selectedProfileLeagueIds).slice(0, 8);
  }, [
    liveMatches,
    upcomingMatches,
    completedMatches,
    isFavoriteMatchByTeamId,
    matchesNationalityCountry,
    selectedLeagues,
    selectedProfileLeagueIds,
  ]);

  const displayMatches = useMemo(() => {
    let base: Match[];
    switch (activeTab) {
      case 'live':
        base = filteredLiveMatches;
        break;
      case 'upcoming':
        base = filteredUpcomingMatches;
        break;
      case 'results':
        base = filteredCompletedMatches;
        break;
      default:
        base = [];
    }
    if (activeTab === 'results') {
      return [...base].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }
    return sortMatchesForDisplayLocal(base);
  }, [
    activeTab,
    filteredLiveMatches,
    filteredUpcomingMatches,
    filteredCompletedMatches,
    sortMatchesForDisplayLocal,
  ]);

  const groupedMatches = useMemo(() => {
    if (activeTab === 'live') return null;
    const groups: { date: string; matches: Match[] }[] = [];
    displayMatches.forEach((match) => {
      const dateKey = match.date.includes('T') ? match.date.split('T')[0] : match.date;
      const existing = groups.find((g) => g.date === dateKey);
      if (existing) {
        existing.matches.push(match);
      } else {
        groups.push({ date: dateKey, matches: [match] });
      }
    });
    groups.sort((a, b) =>
      activeTab === 'results' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
    );
    return groups;
  }, [displayMatches, activeTab]);

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
      AsyncStorage.setItem(scopedKey('sports_notified_matches'), JSON.stringify([...next])).catch(e =>
        console.log('Failed to save notified matches:', e)
      );
      return next;
    });
  }, [scopedKey]);

  const handleToggleMatchPin = useCallback(
    (matchId: string) => {
      const pools = [...liveMatches, ...upcomingMatches, ...completedMatches];
      const found = pools.find((m) => m.id === matchId);
      if (found) {
        void toggleMatchPin(sportsTabMatchToLive(found));
      }
    },
    [liveMatches, upcomingMatches, completedMatches, toggleMatchPin],
  );

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

  const getMatchPersonalizationChip = useCallback(
    (match: Match) =>
      getFootballMatchPersonalizationChip(match, footballPersonalizationCtx, profile),
    [footballPersonalizationCtx, profile],
  );

  const renderFlatListItem = useCallback(({ item }: { item: FlatListItem }) => {
    if (item.type === 'date') {
      return <DateHeader date={item.date} />;
    }
    const match = item.match;
    return (
      <PremiumSportsMatchCard
        match={match}
        isFavoriteTeam={isFavoriteTeam}
        isNotified={notifiedMatches.has(match.id)}
        onToggleNotification={toggleMatchNotification}
        isPinned={isMatchPinned(match.id)}
        onTogglePin={handleToggleMatchPin}
        onPress={() => handleMatchCardPress(match)}
        personalizationChipLabel={getMatchPersonalizationChip(match)}
      />
    );
  }, [getMatchPersonalizationChip, isFavoriteTeam, notifiedMatches, toggleMatchNotification, handleMatchCardPress, isMatchPinned, handleToggleMatchPin]);

  const flatListKeyExtractor = useCallback((item: FlatListItem) => item.key, []);

  const ufcUpcomingQuery = trpc.mma.getFights.useQuery(
    { type: 'upcoming' },
    {
      enabled: sportMode === 'ufc',
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    }
  );

  const ufcResultsQuery = trpc.mma.getFights.useQuery(
    { type: 'results' },
    {
      enabled: sportMode === 'ufc',
      staleTime: 3 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    }
  );

  const ufcUpcomingFights = useMemo(() => {
    return transformMmaFightData(extractMmaFightArray(ufcUpcomingQuery.data as unknown));
  }, [ufcUpcomingQuery.data]);

  const ufcResultsFights = useMemo(() => {
    return transformMmaFightData(extractMmaFightArray(ufcResultsQuery.data as unknown));
  }, [ufcResultsQuery.data]);

  const ufcDisplayFights = useMemo(() => {
    return ufcTab === 'upcoming' ? ufcUpcomingFights : ufcResultsFights;
  }, [ufcTab, ufcUpcomingFights, ufcResultsFights]);

  const ufcWinLeaderboard = useMemo(
    () => computeUfcWinLeaderboard(ufcResultsFights),
    [ufcResultsFights],
  );

  const ufcDivisionLeaders = useMemo(
    () => computeUfcDivisionLeaders(ufcResultsFights),
    [ufcResultsFights],
  );

  useEffect(() => {
    if (sportMode !== 'ufc') setUfcShowStatsRankings(false);
  }, [sportMode]);

  useEffect(() => {
    if (!showFightModal || sportMode !== 'ufc') return;
    void Promise.all([ufcUpcomingQuery.refetch(), ufcResultsQuery.refetch()]);
  }, [showFightModal, sportMode, ufcUpcomingQuery, ufcResultsQuery]);

  useEffect(() => {
    if (!showFightModal) return;
    setSelectedFight((prev) => {
      if (!prev) return prev;
      const merged = [...ufcUpcomingFights, ...ufcResultsFights];
      const next = merged.find((f) => f.id === prev.id);
      if (!next) return prev;
      const changed =
        next.date !== prev.date ||
        next.time !== prev.time ||
        next.status !== prev.status ||
        next.result?.method !== prev.result?.method ||
        next.result?.round !== prev.result?.round ||
        next.result?.time !== prev.result?.time;
      return changed ? next : prev;
    });
  }, [ufcUpcomingFights, ufcResultsFights, showFightModal]);

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

  const ufcStatsRowCells = useMemo(
    () => computeUfcStatsRow(ufcTab, ufcDisplayFights, ufcGroupedByEvent),
    [ufcTab, ufcDisplayFights, ufcGroupedByEvent],
  );

  const ufcResultsGroupedByEvent = useMemo(() => {
    const eventMap = new Map<string, { event: string; date: string; fights: UFCFight[] }>();
    ufcResultsFights.forEach((fight) => {
      const eventKey = fight.event || 'Unknown Event';
      const existing = eventMap.get(eventKey);
      if (existing) existing.fights.push(fight);
      else eventMap.set(eventKey, { event: eventKey, date: fight.date, fights: [fight] });
    });
    return Array.from(eventMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [ufcResultsFights]);

  const ufcRankingsStatsRowCells = useMemo(
    () => computeUfcStatsRow('results', ufcResultsFights, ufcResultsGroupedByEvent),
    [ufcResultsFights, ufcResultsGroupedByEvent],
  );

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
          <UFCCountdown fight={item.fight} />
        </TouchableOpacity>
      );
    }
    if (item.type === 'event') {
      return <UFCEventBanner eventName={item.event} fightCount={item.fightCount} eventDate={item.eventDate} />;
    }
    return <UFCFightCard fight={item.fight} isFirst={item.isFirst} isLast={item.isLast} onPress={() => handleFightCardPress(item.fight)} />;
  }, [handleFightCardPress]);

  const ufcFlatListKeyExtractor = useCallback((item: UFCFlatListItem) => item.key, []);

  type UFCEventListItem = { type: 'eventCard'; event: string; mainFight: UFCFight; fightCount: number; eventDate: string; eventNumber: string; key: string };

  const ufcEventListData = useMemo<UFCEventListItem[]>(() => {
    return ufcGroupedByEvent.map((group, idx) => {
      // Headliner is typically the LAST fight on the card (main event order).
      const fights = group.fights;
      const headliner = fights[fights.length - 1] || fights[0];
      // Try to pull "UFC 328" / event number from event name.
      const numMatch = group.event.match(/UFC\s*(\w+\s*)?(\d{2,4})/i);
      const eventNumber = numMatch?.[2] ? numMatch[2] : (numMatch?.[0] || '').replace(/UFC\s*/i, '').trim() || '—';
      return {
        type: 'eventCard' as const,
        event: group.event,
        mainFight: headliner,
        fightCount: fights.length,
        eventDate: group.date,
        eventNumber,
        key: `ufc-event-card-${group.event}-${idx}`,
      };
    });
  }, [ufcGroupedByEvent]);

  const renderUfcEventListItem = useCallback(({ item }: { item: UFCEventListItem }) => {
    return (
      <UFCNewEventCard
        event={item.event}
        eventNumber={item.eventNumber}
        mainFight={item.mainFight}
        fightCount={item.fightCount}
        eventDate={item.eventDate}
        onPress={() => handleFightCardPress(item.mainFight)}
      />
    );
  }, [handleFightCardPress]);

  const ufcEventListKeyExtractor = useCallback((item: UFCEventListItem) => item.key, []);

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
      await footballBundleQuery.refetch();
    } else {
      await Promise.all([ufcUpcomingQuery.refetch(), ufcResultsQuery.refetch()]);
    }
    setRefreshing(false);
  }, [footballBundleQuery, ufcUpcomingQuery, ufcResultsQuery, sportMode]);

  const hasAnyFootballData = (footballBundleQuery.data?.live?.response?.length ?? 0) > 0
    || (footballBundleQuery.data?.upcoming?.response?.length ?? 0) > 0
    || (footballBundleQuery.data?.results?.response?.length ?? 0) > 0;
  const ufcHasCachedData = ufcUpcomingFights.length > 0 || ufcResultsFights.length > 0;
  const isInitialSportLoad =
    sportMode === 'football'
      ? footballBundleQuery.isLoading && !hasAnyFootballData
      : sportMode === 'ufc'
        ? (ufcUpcomingQuery.isPending || ufcResultsQuery.isPending) && !ufcHasCachedData
        : false;
  const isSportFetching =
    sportMode === 'football'
      ? footballBundleQuery.isFetching && hasAnyFootballData
      : sportMode === 'ufc'
        ? (ufcUpcomingQuery.isFetching || ufcResultsQuery.isFetching) && ufcHasCachedData
        : false;
  const sportFetchAccent =
    sportMode === 'ufc'
      ? UFC_RED
      : sportMode === 'f1'
        ? '#F20D18'
        : sportMode === 'nba'
          ? '#F58426'
          : colors.primary;
  const hasConfigError = sportMode === 'football'
    ? !!(footballBundleQuery.data?.live?.errors?.config
      || footballBundleQuery.data?.upcoming?.errors?.config
      || footballBundleQuery.data?.results?.errors?.config)
    : sportMode === 'ufc'
      ? !!(ufcUpcomingQuery.data?.errors?.config || ufcResultsQuery.data?.errors?.config)
      : false;
  const ufcMmaApiHint =
    sportMode === 'ufc'
      ? (ufcUpcomingQuery.data?.errors?.rateLimit as string | undefined) ||
        (ufcResultsQuery.data?.errors?.rateLimit as string | undefined)
      : undefined;
  const footballRateLimitHint =
    sportMode === 'football'
      ? (footballBundleQuery.data?.live?.errors?.rateLimit as string | undefined) ||
        (footballBundleQuery.data?.upcoming?.errors?.rateLimit as string | undefined) ||
        (footballBundleQuery.data?.results?.errors?.rateLimit as string | undefined)
      : undefined;
  const allFootballErrored =
    footballBundleQuery.isFetched && footballBundleQuery.isError;
  const hasError = sportMode === 'football'
    ? (allFootballErrored && !isInitialSportLoad && !hasAnyFootballData && !hasConfigError)
    : sportMode === 'ufc'
      ? ((ufcUpcomingQuery.isError && ufcResultsQuery.isError) && !isInitialSportLoad)
      : false;
  const footballErrorDetail = useMemo(() => {
    const candidate =
      footballBundleQuery.error?.message ||
      (footballBundleQuery.data?.live?.errors
        ? JSON.stringify(footballBundleQuery.data.live.errors)
        : '') ||
      (footballBundleQuery.data?.upcoming?.errors
        ? JSON.stringify(footballBundleQuery.data.upcoming.errors)
        : '');
    return candidate ? String(candidate).slice(0, 220) : null;
  }, [footballBundleQuery.error?.message, footballBundleQuery.data?.live?.errors, footballBundleQuery.data?.upcoming?.errors]);

  const tabs = useMemo(
    () => [
      { key: 'live', label: 'Live', icon: Flame, color: '#FF3B30' },
      { key: 'upcoming', label: 'Upcoming', icon: Calendar, color: '#007AFF' },
      { key: 'results', label: 'Results', icon: Trophy, color: '#34C759' },
    ],
    [],
  );

  const footballTabs = useMemo(() => {
    const accent = footballChrome(isDark).accent;
    return [
      { key: 'live', label: 'Live', icon: Flame, color: accent },
      { key: 'upcoming', label: 'Upcoming', icon: Calendar, color: accent },
      { key: 'results', label: 'Results', icon: Trophy, color: accent },
    ];
  }, [isDark]);

  const counts: Record<string, number> = {
    live: filteredLiveMatches.length,
    upcoming: filteredUpcomingMatches.length,
    results: filteredCompletedMatches.length,

  };
  const hasTeams = teamApiIds.length > 0 || nationalTeamApiIds.length > 0;

  const ufcTabs = useMemo(
    () => [
      { key: 'upcoming', label: 'Upcoming', icon: Calendar, color: UFC_RED },
      { key: 'results', label: 'Results', icon: Trophy, color: UFC_RED },
    ],
    [],
  );

  const ufcCounts: Record<string, number> = {
    upcoming: ufcUpcomingFights.length,
    results: ufcResultsFights.length,
  };

  const footballHeroClubSlots = useMemo<FootballHeroFavoriteClub[]>(
    () =>
      (profile?.favoriteTeams ?? []).map((t) => ({
        apiId: t.apiId ?? getTeamIdFromName(t.name) ?? null,
        name: t.name,
        logoUri: getFootballTeamLogoUrl(t) ?? '',
      })),
    [profile?.favoriteTeams],
  );
  const competitionQuickPicks = useMemo(() => {
    const competitionMatchers = [
      { key: 'ucl', label: 'Champions League', matcher: /(champions league|uefa champions league)/i, rank: 1 },
      { key: 'uel', label: 'Europa League', matcher: /(europa league|uefa europa league)/i, rank: 2 },
      { key: 'uecl', label: 'Conference League', matcher: /(conference league|uefa conference league)/i, rank: 3 },
      { key: 'uwcl', label: "Women's Champions", matcher: /(women.?s champions league|uwcl)/i, rank: 4 },
      { key: 'usc', label: 'UEFA Super Cup', matcher: /(uefa super cup|super cup)/i, rank: 5 },
    ] as const;

    const found: { id: number; label: string; rank: number; logo?: string }[] = [];
    const worldCup = getCompetitionById(1);
    if (worldCup) {
      found.push({
        id: worldCup.id,
        label: 'World Cup',
        rank: 0,
      });
    }

    availableLeaguesForStandings.forEach((league) => {
      const name = league.name || '';
      const matched = competitionMatchers.find((c) => c.matcher.test(name));
      if (!matched) return;
      if (found.some((item) => item.id === league.id)) return;
      found.push({ id: league.id, label: matched.label, rank: matched.rank, logo: league.logo });
    });

    return found.sort((a, b) => a.rank - b.rank).slice(0, 5);
  }, [availableLeaguesForStandings]);
  const footballFilterSummary = useMemo(() => {
    switch (footballSmartFilter) {
      case 'for-you':
        return 'For You · your leagues & teams';
      case 'explore':
        return footballQueryContext.manualLeagueScopeActive
          ? `Explore · ${selectedLeagues.length} competition${selectedLeagues.length === 1 ? '' : 's'}`
          : 'Explore';
      default:
        return 'For You';
    }
  }, [footballSmartFilter, footballQueryContext.manualLeagueScopeActive, selectedLeagues.length]);

  const liveEmptyHint = useMemo(() => {
    if (activeTab !== 'live' || filteredLiveMatches.length > 0) return null;
    if (liveMatches.length === 0) return null;
    if (featuredUpcomingMatch) {
      return `No live games for your teams or leagues right now. Next up: ${featuredUpcomingMatch.homeTeam} vs ${featuredUpcomingMatch.awayTeam}.`;
    }
    return 'No live games for your teams or leagues right now. Switch to Explore or add clubs in Profile.';
  }, [activeTab, filteredLiveMatches.length, liveMatches.length, featuredUpcomingMatch]);

  const strictFollowingEnabled = sportsFeedPrefs?.strictFollowing === true;

  const handleToggleStrictFollowing = useCallback(
    (value: boolean) => {
      updateProfile({
        sportsFeedPrefs: {
          strictFollowing: value,
          includeFollowedLeagues: sportsFeedPrefs?.includeFollowedLeagues ?? true,
          discoveryLevel: sportsFeedPrefs?.discoveryLevel ?? 'med',
          prioritizeDomesticLeagues: sportsFeedPrefs?.prioritizeDomesticLeagues ?? true,
          prioritizeNationalTeams: sportsFeedPrefs?.prioritizeNationalTeams ?? true,
        },
      });
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [updateProfile, sportsFeedPrefs],
  );

  const topLeagueContextLabel = useMemo(() => {
    const ids = contextTopLeagueIds ?? TOP_LEAGUE_BUNDLE_IDS;
    if (ids.length === 0) return 'Competitions';
    const firstId = ids[0];
    const name = getCompetitionById(firstId)?.name ?? 'Competition';
    const short = name.replace(/^UEFA\s+/i, '').trim().slice(0, 24);
    const n = ids.length - 1;
    return n > 0 ? `${short} +${n}` : short;
  }, [contextTopLeagueIds]);

  const toggleTopLeagueContextId = useCallback(
    (id: number) => {
      const all = TOP_LEAGUE_BUNDLE_IDS;
      const effective = contextTopLeagueIds ?? [...all];
      const set = new Set(effective);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      const next = all.filter((lid) => set.has(lid));
      if (next.length === 0 || next.length === all.length) {
        setContextTopLeagueIds(null);
      } else {
        setContextTopLeagueIds(next);
      }
    },
    [contextTopLeagueIds],
  );

  /** After 18:00 local: darker hero; before then: bright daytime hero (`football-center-hero-light.png`). */
  const footballHeroUseDarkArt = localHour >= 18;

  const renderFootballHeader = () => {
    return (
    <View>
      <ImageBackground
        source={footballHeroUseDarkArt ? FOOTBALL_CHROME.stadiumDarkImage : FOOTBALL_CHROME.stadiumLightImage}
        style={[
          styles.headerGradient,
          styles.headerGradientFootballBleed,
          styles.stadiumHeroRoot,
          styles.stadiumHeroRootFootball,
          { minHeight: sportsHeroMinHeight, paddingTop: insets.top, paddingBottom: 4 },
        ]}
        imageStyle={sportsHeroImageStyle(footballHeroBottomCropPx)}
      >
        <View
          style={[
            styles.stadiumHeroForeground,
            styles.stadiumHeroForegroundFill,
            styles.stadiumHeroForegroundFootballInset,
            { paddingHorizontal: sportsEdgePad },
          ]}
        >
          {sportsMainHeaderInner}
        </View>
      </ImageBackground>
      {sportStripOverlapSlot}
      <View style={[styles.tabWrapperFootball, getHeroSecondaryRowStyle(sportsEdgePad, 'football')]}>
        <TabPill
          variant="football"
          tabs={footballTabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as 'live' | 'upcoming' | 'results')}
          counts={counts}
        />
      </View>
      <View style={[styles.filterArea, { paddingHorizontal: sportsEdgePad }]}>
        <View style={styles.footballFilterCompactRow}>
          <View style={styles.footballSmartPillsRowCompact}>
            {FOOTBALL_SMART_FILTER_OPTIONS.map((opt) => {
              const Icon = opt.Icon;
              const active = footballSmartFilter === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  activeOpacity={0.85}
                  onPress={() => setFootballSmartFilter(opt.id)}
                  style={[
                    styles.footballSmartPill,
                    {
                      backgroundColor: sf.surfaceSecondary,
                      borderColor: active ? `${fc.accent}88` : sf.border,
                    },
                    active && { shadowColor: fc.accent, shadowOpacity: 0.28, shadowRadius: 6 },
                  ]}
                >
                  <Icon size={12} color={active ? fc.accent : sf.textSecondary} />
                  <Text
                    style={[styles.footballSmartPillText, { color: active ? fc.accent : sf.text }]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            onPress={() => setShowFootballFilterPicker(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Feed options, ${footballFilterSummary}`}
            style={[styles.footballOptionsIconBtn, { backgroundColor: sf.surfaceSecondary, borderColor: sf.border }]}
          >
            <SlidersHorizontal size={15} color={sf.textSecondary} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={[styles.strictFollowingRowCompact, { backgroundColor: sf.surfaceSecondary, borderColor: sf.border }]}>
            <Switch
              value={strictFollowingEnabled}
              onValueChange={handleToggleStrictFollowing}
              trackColor={{ false: sf.border, true: `${fc.accent}88` }}
              thumbColor={strictFollowingEnabled ? fc.accent : sf.textMuted}
              style={styles.strictSwitchCompact}
            />
          </View>
        </View>

        {footballSmartFilter === 'explore' ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowFootballContextSheet(true)}
            style={[styles.footballContextChipCompact, { backgroundColor: sf.surfaceSecondary, borderColor: sf.border }]}
          >
            <Text style={[styles.footballContextChipTitle, { color: sf.textMuted }]} numberOfLines={1}>
              Scope
            </Text>
            <Text style={[styles.footballContextChipValue, { color: sf.text }]} numberOfLines={1}>
              {topLeagueContextLabel}
            </Text>
            <ChevronDown size={14} color={sf.textSecondary} />
          </TouchableOpacity>
        ) : null}

        {footballQueryContext.manualLeagueScopeActive ? (
          <Text style={[styles.footballFilterHintText, { color: sf.textMuted }]}>
            Explore narrowed to selected competitions
          </Text>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="League tables and stats"
          accessibilityHint="Opens standings, top scorers, and assists"
          accessibilityState={{ disabled: availableLeaguesForStandings.length === 0 }}
          activeOpacity={0.88}
          disabled={availableLeaguesForStandings.length === 0}
          onPress={handleLeagueTablesPress}
          style={[
            styles.footballLeagueTablesCta,
            {
              backgroundColor:
                availableLeaguesForStandings.length === 0
                  ? sf.surfaceSecondary
                  : isDark
                    ? 'rgba(52, 199, 89, 0.14)'
                    : 'rgba(52, 199, 89, 0.1)',
              borderColor:
                availableLeaguesForStandings.length === 0 ? sf.border : fc.accent,
              opacity: availableLeaguesForStandings.length === 0 ? 0.55 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.footballLeagueTablesIconWrap,
              {
                backgroundColor:
                  availableLeaguesForStandings.length === 0
                    ? sf.border
                    : isDark
                      ? 'rgba(52, 199, 89, 0.22)'
                      : 'rgba(52, 199, 89, 0.18)',
              },
            ]}
          >
            <BarChart3
              size={18}
              color={availableLeaguesForStandings.length === 0 ? sf.textMuted : fc.accent}
              strokeWidth={2.4}
            />
          </View>
          <Text style={[styles.footballLeagueTablesTitle, { color: sf.text }]} numberOfLines={1}>
            {availableLeaguesForStandings.length === 0
              ? 'Tables & stats'
              : `Tables & stats · ${availableLeaguesForStandings.length} leagues`}
          </Text>
          <ChevronRight
            size={18}
            color={availableLeaguesForStandings.length === 0 ? sf.textMuted : fc.accent}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>
      {sportMode === 'football' && showFootballInsight && aiInsightMatch && footballTrendingPreview ? (
        <View style={[styles.insightCarouselShell, { marginHorizontal: sportsEdgePad }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const page = Math.round(x / insightCarouselWidth);
              setInsightCarouselIndex(Math.min(1, Math.max(0, page)));
            }}
            style={{ width: insightCarouselWidth, alignSelf: 'center' }}
            contentContainerStyle={{ width: insightCarouselWidth * 2 }}
          >
            <View style={{ width: insightCarouselWidth }}>
              <LinearGradient
                colors={isDark ? ['#08160D', '#0B0B0F'] : ['#ECFDF3', '#F8FAFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.insightCarouselPage}
              >
                <View style={styles.aiInsightTopRow}>
                  <LinearGradient
                    colors={[`${fc.accent}DD`, fc.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiInsightOrb}
                  >
                    <Sparkles size={15} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.aiInsightTitleBlock}>
                    <Text style={[styles.aiLabel, { color: fc.accent }]}>INSIGHT</Text>
                    <Text
                      style={[styles.aiHeadline, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
                      numberOfLines={1}
                    >
                      {aiInsightMatch.homeTeam} vs {aiInsightMatch.awayTeam}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.aiSub, { color: isDark ? '#9AB0A0' : '#5B6475' }]}
                  textBreakStrategy="simple"
                  numberOfLines={2}
                >
                  {aiInsightData?.summary ??
                    (aiInsightMatch.status === 'Live'
                      ? 'Best live pick for your feed.'
                      : 'Top upcoming pick for your feed.')}
                </Text>
                {aiInsightData ? (
                  <View
                    style={[
                      styles.aiConfidencePill,
                      { backgroundColor: isDark ? 'rgba(50,215,75,0.2)' : 'rgba(22,163,74,0.14)' },
                    ]}
                  >
                    <Zap size={12} color={fc.accent} />
                    <Text style={[styles.aiConfidenceText, { color: fc.accent }]}>
                      {aiInsightData.whyLabel}
                    </Text>
                  </View>
                ) : null}
              </LinearGradient>
            </View>

            <View style={{ width: insightCarouselWidth }}>
              <LinearGradient
                colors={isDark ? ['#0B1220', '#151B2C'] : ['#1E293B', '#0F172A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trendingCardInner}
              >
                <View style={styles.trendingCardHeader}>
                  <TrendingUp size={14} color={fc.accent} />
                  <Text style={[styles.trendingNowLabel, { color: fc.accent }]}>TRENDING NOW</Text>
                  <View style={{ flex: 1 }} />
                  {leagueTopPlayersQuery.isFetching ? (
                    <ActivityIndicator size="small" color={fc.accent} />
                  ) : null}
                </View>
                <Text style={styles.trendingMatchContext} numberOfLines={1}>
                  Around {aiInsightMatch.homeTeam} vs {aiInsightMatch.awayTeam}
                </Text>
                <View style={styles.trendingThreeCol}>
                  <View style={styles.trendingCol}>
                    <Text style={styles.trendingColTag}>Top form</Text>
                    {footballTrendingPreview.formLogo ? (
                      <Image
                        source={{ uri: footballTrendingPreview.formLogo }}
                        style={styles.trendingTeamLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.trendingLogoPlaceholder} />
                    )}
                    <Text numberOfLines={1} style={styles.trendingColTitle}>
                      {shortTeamLabel(footballTrendingPreview.formName)}
                    </Text>
                    <Text numberOfLines={2} style={styles.trendingColSub}>
                      {footballTrendingPreview.formSub}
                    </Text>
                  </View>
                  <View style={styles.trendingCol}>
                    <Text style={styles.trendingColTag}>Top scorer</Text>
                    {footballTrendingPreview.topScorer ? (
                      <TrendingLeaderAvatar
                        row={footballTrendingPreview.topScorer}
                        style={styles.trendingPlayerAvatar}
                        placeholderStyle={styles.trendingPlayerPlaceholder}
                      />
                    ) : (
                      <View style={styles.trendingPlayerPlaceholder} />
                    )}
                    <Text numberOfLines={1} style={styles.trendingColTitle}>
                      {footballTrendingPreview.topScorer
                        ? abbrevPlayerName(footballTrendingPreview.topScorer.playerName)
                        : '—'}
                    </Text>
                    <Text numberOfLines={1} style={styles.trendingColSub}>
                      {footballTrendingPreview.topScorer
                        ? `${footballTrendingPreview.topScorer.goals} goals`
                        : footballTrendingPreview.leadersUnavailableHint}
                    </Text>
                  </View>
                  <View style={styles.trendingCol}>
                    <Text style={styles.trendingColTag}>Most assists</Text>
                    {footballTrendingPreview.topAssist ? (
                      <TrendingLeaderAvatar
                        row={footballTrendingPreview.topAssist}
                        style={styles.trendingPlayerAvatar}
                        placeholderStyle={styles.trendingPlayerPlaceholder}
                      />
                    ) : (
                      <View style={styles.trendingPlayerPlaceholder} />
                    )}
                    <Text numberOfLines={1} style={styles.trendingColTitle}>
                      {footballTrendingPreview.topAssist
                        ? abbrevPlayerName(footballTrendingPreview.topAssist.playerName)
                        : '—'}
                    </Text>
                    <Text numberOfLines={1} style={styles.trendingColSub}>
                      {footballTrendingPreview.topAssist
                        ? `${footballTrendingPreview.topAssist.assists} assists`
                        : footballTrendingPreview.leadersUnavailableHint}
                    </Text>
                  </View>
                </View>
                <View style={styles.trendingLeagueFoot}>
                  <Text style={styles.trendingLeagueFootText} numberOfLines={1}>
                    {footballTrendingPreview.leagueLabel} · leaders {trendingSeason}
                  </Text>
                  <ChevronRight size={14} color="rgba(255,255,255,0.42)" />
                </View>
              </LinearGradient>
            </View>
          </ScrollView>
          <View style={styles.insightPageDots}>
            <View
              style={[
                styles.insightDot,
                insightCarouselIndex === 0 && { backgroundColor: fc.accent },
              ]}
            />
            <View
              style={[
                styles.insightDot,
                insightCarouselIndex === 1 && { backgroundColor: fc.accent },
              ]}
            />
          </View>
        </View>
      ) : null}
    </View>
    );
  };

  const heroGlassSportStrip =
    sportMode === 'football' || sportMode === 'ufc' || sportMode === 'f1' || sportMode === 'nba';

  const sportToggleRow = useMemo(
    () => (
      <>
          {enabledSports.includes('football') && (
            <TouchableOpacity
              style={sportToggleStyles.option}
              onPress={() => handleSportModeChange('football')}
              activeOpacity={0.7}
            >
              <View style={sportToggleStyles.optionInner}>
                <View
                  style={[
                    sportToggleStyles.iconGlowWrap,
                    sportMode === 'football' && {
                      shadowColor: FOOTBALL_CHROME.featuredGreen,
                      shadowOpacity: 0.95,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 6,
                    },
                  ]}
                >
                  <Trophy
                    size={15}
                    color={
                      sportMode === 'football'
                        ? FOOTBALL_CHROME.featuredGreen
                        : isDark
                          ? '#8E8E93'
                          : '#AEAEB2'
                    }
                  />
                </View>
                <Text
                  style={[
                    sportToggleStyles.optionLabel,
                    {
                      color:
                        sportMode === 'football'
                          ? FOOTBALL_CHROME.featuredGreen
                          : isDark
                            ? '#8E8E93'
                            : '#AEAEB2',
                    },
                    sportMode === 'football' && sportToggleStyles.footballLabelActive,
                  ]}
                >
                  Football
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {enabledSports.includes('ufc') && (
            <TouchableOpacity style={[sportToggleStyles.option]} onPress={() => handleSportModeChange('ufc')} activeOpacity={0.7}>
              <View style={sportToggleStyles.optionInner}>
                <View
                  style={[
                    sportToggleStyles.iconGlowWrap,
                    sportMode === 'ufc' && {
                      shadowColor: UFC_RED,
                      shadowOpacity: isDark ? 0.55 : 0.4,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 5,
                    },
                  ]}
                >
                  <Swords
                    size={15}
                    color={sportMode === 'ufc' ? UFC_RED : isDark ? '#8E8E93' : '#AEAEB2'}
                  />
                </View>
                <Text
                  style={[
                    sportToggleStyles.optionLabel,
                    {
                      color:
                        sportMode === 'ufc' ? UFC_RED : isDark ? '#8E8E93' : '#AEAEB2',
                    },
                    sportMode === 'ufc' && { fontWeight: '700' as const },
                  ]}
                >
                  UFC
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {enabledSports.includes('f1') && (
            <TouchableOpacity style={[sportToggleStyles.option]} onPress={() => handleSportModeChange('f1')} activeOpacity={0.7}>
              <View style={sportToggleStyles.optionInner}>
                <View
                  style={[
                    sportToggleStyles.iconGlowWrap,
                    sportMode === 'f1' && {
                      shadowColor: isDark ? '#FF453A' : '#B80000',
                      shadowOpacity: isDark ? 0.55 : 0.35,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 5,
                    },
                  ]}
                >
                  <Flag
                    size={15}
                    color={sportMode === 'f1' ? (isDark ? '#FF453A' : '#B80000') : isDark ? '#8E8E93' : '#AEAEB2'}
                  />
                </View>
                <Text
                  style={[
                    sportToggleStyles.optionLabel,
                    {
                      color:
                        sportMode === 'f1' ? (isDark ? '#FF453A' : '#B80000') : isDark ? '#8E8E93' : '#AEAEB2',
                    },
                    sportMode === 'f1' && { fontWeight: '700' as const },
                  ]}
                >
                  F1
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {enabledSports.includes('nba') && (
            <TouchableOpacity style={[sportToggleStyles.option]} onPress={() => handleSportModeChange('nba')} activeOpacity={0.7}>
              <View style={sportToggleStyles.optionInner}>
                <View
                  style={[
                    sportToggleStyles.iconGlowWrap,
                    sportMode === 'nba' && {
                      shadowColor: isDark ? '#0A84FF' : '#1D428A',
                      shadowOpacity: isDark ? 0.55 : 0.35,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 5,
                    },
                  ]}
                >
                  <Trophy
                    size={15}
                    color={sportMode === 'nba' ? (isDark ? '#0A84FF' : '#1D428A') : isDark ? '#8E8E93' : '#AEAEB2'}
                  />
                </View>
                <Text
                  style={[
                    sportToggleStyles.optionLabel,
                    {
                      color:
                        sportMode === 'nba' ? (isDark ? '#0A84FF' : '#1D428A') : isDark ? '#8E8E93' : '#AEAEB2',
                    },
                    sportMode === 'nba' && { fontWeight: '700' as const },
                  ]}
                >
                  NBA
                </Text>
              </View>
            </TouchableOpacity>
          )}
      </>
    ),
    [enabledSports, sportMode, isDark, handleSportModeChange],
  );

  const sportModeToggleEl =
    enabledSports.length > 1 ? (
      <View style={sportToggleStyles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEnabled={enabledSports.length > 4}
          {...(Platform.OS === 'ios'
            ? { contentInsetAdjustmentBehavior: 'never' as const }
            : {})}
          style={sportToggleStyles.trackScroll}
          contentContainerStyle={sportToggleStyles.trackScrollContent}
        >
        {heroGlassSportStrip ? (
          <View style={sportToggleStyles.trackShellOverHero}>
            <View style={[sportToggleStyles.track, sportToggleStyles.trackOverHero]}>
              {sportToggleRow}
            </View>
          </View>
        ) : (
          <View
            style={[
              sportToggleStyles.track,
              {
                backgroundColor: sf.surfaceSecondary,
                borderWidth: 1,
                borderColor: sf.border,
              },
            ]}
          >
            {sportToggleRow}
          </View>
        )}
        </ScrollView>
      </View>
    ) : null;

  const sportStripOverlapSlot =
    enabledSports.length > 1 ? (
      <View
        style={[
          styles.heroSportStripOverlapSlot,
          getHeroSportStripSlotStyle(
            sportMode === 'football' || sportMode === 'ufc' || sportMode === 'f1' || sportMode === 'nba'
              ? sportMode
              : 'football',
          ),
          { paddingHorizontal: sportsEdgePad },
        ]}
        pointerEvents="box-none"
      >
        {sportModeToggleEl}
      </View>
    ) : null;

  const featuredUfcFight = ufcUpcomingFights[0] ?? null;

  const renderUfcChromeHeader = () => (
    <View>
      <ImageBackground
        source={UFC_HERO_IMAGE}
        style={[
          styles.headerGradient,
          styles.headerGradientFootballBleed,
          styles.stadiumHeroRoot,
          styles.stadiumHeroRootFootball,
          {
            minHeight: sportsHeroMinHeight,
            paddingTop: insets.top,
            paddingBottom: 4,
            backgroundColor: UFC_BG,
          },
        ]}
        imageStyle={sportsHeroImageStyle(0)}
      >
        <View
          style={[
            styles.stadiumHeroForeground,
            styles.stadiumHeroForegroundFootballInset,
            styles.stadiumHeroForegroundFill,
            { paddingHorizontal: sportsEdgePad },
          ]}
        >
          <UFCPremiumHeroInner
            featuredFight={featuredUfcFight}
            onRefresh={() => {
              void Promise.all([ufcUpcomingQuery.refetch(), ufcResultsQuery.refetch()]);
            }}
            onFeaturedPress={() => {
              if (featuredUfcFight) handleFightCardPress(featuredUfcFight);
            }}
          />
        </View>
      </ImageBackground>
      {sportStripOverlapSlot}
      <View style={[styles.tabWrapper, styles.tabWrapperUfc, getHeroSecondaryRowStyle(sportsEdgePad, 'ufc')]}>
        <UFCSegmentToggle
          activeTab={ufcTab}
          onTabChange={(tab) => {
            setUfcShowStatsRankings(false);
            setUfcTab(tab as 'upcoming' | 'results');
          }}
          counts={ufcCounts}
        />
      </View>
      <View style={[styles.ufcQuickLinksBelowTabs, { paddingHorizontal: sportsEdgePad }]}>
        <UFCFeatureRow
          onUpcoming={() => {
            setUfcShowStatsRankings(false);
            setUfcTab('upcoming');
          }}
          onResults={() => {
            setUfcShowStatsRankings(false);
            setUfcTab('results');
          }}
          onRankings={() => setUfcShowStatsRankings(true)}
          onFavorites={() => router.push('/(tabs)/profile' as any)}
        />
      </View>
    </View>
  );

  const ufcListHeader = (
    <View>
      {renderUfcChromeHeader()}
      <UFCStatsRow stats={ufcStatsRowCells} />
      <View style={ufcStyles.sectionHeaderRow}>
        <Text style={ufcStyles.sectionHeaderTitle}>
          {ufcTab === 'results' ? 'LATEST RESULTS' : 'UPCOMING FIGHTS'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            if (Platform.OS !== 'web') {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            ufcEventsFlatListRef.current?.scrollToEnd({ animated: true });
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={ufcStyles.sectionHeaderActionRow}
        >
          <Text style={ufcStyles.sectionHeaderAction}>View All</Text>
          <ChevronRight size={16} color={UFC_RED} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ufcListEmpty = (
    <View style={{ paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center' }}>
      <Text
        style={{
          color: isDark ? UFC_MUTED : 'rgba(165, 166, 170, 0.95)',
          fontSize: 14,
          textAlign: 'center',
          lineHeight: 20,
        }}
      >
        {ufcTab === 'upcoming'
          ? 'No upcoming fights in this feed yet. Switch to Results or pull down to refresh.'
          : 'No completed fights in this feed yet. Switch to Upcoming or pull down to refresh.'}
      </Text>
    </View>
  );

  const sportsMainHeaderInner = (
    <>
      {sportMode === 'football' ? (
        <View style={[styles.nonFootballHeroAnchor, { flex: 1, minHeight: 0 }]}>
          <View style={styles.ufcHeroTopFill}>
            <FootballPremiumHeroInner
              liveCount={filteredLiveMatches.length}
              clubSlots={footballHeroClubSlots}
              featuredMatch={featuredUpcomingMatch}
              onSearch={() => {
                setFootballClubProfilePreset(null);
                setFootballTeamSearchOpen(true);
              }}
              onClubAvatarPress={(club) => {
                setFootballClubProfilePreset({
                  apiId: club.apiId != null && club.apiId > 0 ? club.apiId : undefined,
                  name: club.name,
                  logo: club.logoUri,
                });
                setFootballTeamSearchOpen(true);
              }}
              onRefresh={onRefresh}
              onMyClubs={() => {
                setFootballClubProfilePreset(null);
                setFootballTeamSearchOpen(true);
              }}
              onFeaturedPress={() => {
                if (featuredUpcomingMatch) handleMatchCardPress(featuredUpcomingMatch);
              }}
              onAddClub={() => {
                setFootballClubProfilePreset(null);
                setFootballTeamSearchOpen(true);
              }}
            />
          </View>
        </View>
      ) : null}
    </>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            sportMode === 'ufc'
              ? UFC_BG
              : sportMode === 'f1'
                ? '#050506'
                : isDark
                  ? colors.background
                  : '#F6F8F7',
        },
      ]}
    >
      <TabWalkthrough tabName="sports" />
      <StatusBar barStyle={sportMode === 'ufc' || sportMode === 'f1' || isDark ? 'light-content' : 'dark-content'} />

      {isSportFetching ? (
        <SportFetchingBanner
          floating
          topInset={insets.top}
          accentColor={sportFetchAccent}
          textColor="#F4F4F8"
          surfaceColor="rgba(16, 17, 19, 0.82)"
        />
      ) : null}

      {sportMode !== 'football' && sportMode !== 'nba' && sportMode !== 'ufc' && sportMode !== 'f1' && (
        <Animated.View style={[
          styles.header,
          {
            /** Safe area lives on the hero surface (same as Football ImageBackground), not here — avoids stacking `insets.top` + `headerGradient.paddingTop`. */
            paddingTop: 0,
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] })
            }]
          }
        ]}>
          <LinearGradient
            colors={getSportsMainHeaderGradient(sportMode, isDark)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.headerGradient,
              styles.stadiumHeroRoot,
              styles.stadiumHeroRootFootball,
              { minHeight: sportsHeroMinHeight, paddingTop: insets.top, paddingBottom: 4, paddingHorizontal: sportsEdgePad },
            ]}
          >
            <View style={styles.stadiumHeroForeground}>{sportsMainHeaderInner}</View>
          </LinearGradient>
          {sportStripOverlapSlot}
        </Animated.View>
      )}

      {sportMode === 'football' &&
      !hasTeams &&
      !hasAnyFootballData &&
      !isInitialSportLoad &&
      !hasError &&
      !hasConfigError ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {renderFootballHeader()}
          <View style={styles.setupPrompt}>
            <LinearGradient
              colors={[colors.success, colors.successLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.setupIconCircle}
            >
              <Shield size={32} color={colors.textInverse} />
            </LinearGradient>
            <Text style={[styles.setupTitle, { color: colors.text }]}>Follow Your Teams</Text>
            <Text style={[styles.setupSub, { color: colors.textSecondary }]}>
              Add your favourite clubs and national teams to see live scores, upcoming fixtures, and results
            </Text>
            <TouchableOpacity
              style={styles.setupBtn}
              onPress={() => router.push('/(tabs)/profile' as any)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.success, colors.successLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.setupBtnGradient}
              >
                <Heart size={16} color={colors.textInverse} />
                <Text style={styles.setupBtnText}>Set Up Teams</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : sportMode === 'ufc' ? (
        hasConfigError ? (
          <View style={styles.errorContainer}>
            <View style={[styles.errorIcon, { backgroundColor: colors.errorLight }]}>
              <AlertCircle size={28} color={colors.warning} strokeWidth={2} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.text }]}>API Configuration Required</Text>
            <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
              MMA API key is not configured on the server
            </Text>
          </View>
        ) : hasError ? (
          <View style={styles.errorContainer}>
            <View style={[styles.errorIcon, { backgroundColor: colors.errorLight }]}>
              <AlertCircle size={28} color={colors.error} strokeWidth={2} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to Load</Text>
            <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
              Please check your connection and try again
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh} activeOpacity={0.85}>
              <RefreshCw size={16} color={colors.warning} />
              <Text style={[styles.retryBtnText, { color: colors.warning }]}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : ufcShowStatsRankings ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UFC_RED} colors={[UFC_RED]} />
            }
          >
            {renderUfcChromeHeader()}
            <UFCStatsRankingsPanel
              stats={ufcRankingsStatsRowCells}
              winLeaderboard={ufcWinLeaderboard}
              divisionLeaders={ufcDivisionLeaders}
              resultsCount={ufcResultsFights.length}
              onBack={() => setUfcShowStatsRankings(false)}
            />
          </ScrollView>
        ) : ufcUpcomingFights.length === 0 && ufcResultsFights.length === 0 ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 140 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UFC_RED} colors={[UFC_RED]} />
            }
          >
            {renderUfcChromeHeader()}
            {isInitialSportLoad ? (
              <SportFetchingBanner
                accentColor={UFC_RED}
                textColor={isDark ? UFC_TEXT : '#F7F6FA'}
                surfaceColor={isDark ? 'rgba(16, 17, 19, 0.88)' : 'rgba(5, 5, 6, 0.9)'}
              />
            ) : (
            <View style={ufcStyles.emptyHero}>
              <LinearGradient
                colors={[...sf.ufcGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ufcStyles.emptyHeroGradient}
              >
                <View style={ufcStyles.emptyHeroTopAccent} />
                <LinearGradient
                  colors={['#FF3B43', '#B30710']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={ufcStyles.emptyHeroIconCircle}
                >
                  <Swords size={32} color="#FFFFFF" strokeWidth={2} />
                </LinearGradient>
                <Text
                  style={[
                    ufcStyles.emptyHeroTitle,
                    { color: isDark ? sf.text : '#F7F6FA' },
                  ]}
                >
                  {UFC_EMPTY_CONFIG[ufcTab].title}
                </Text>
                <Text
                  style={[
                    ufcStyles.emptyHeroSub,
                    {
                      color: isDark ? UFC_MUTED : 'rgba(165, 166, 170, 0.95)',
                    },
                  ]}
                >
                  {hasConfigError
                    ? 'The MMA API requires a separate subscription on api-sports.io (free plan available). Your football API key works for football but MMA needs its own activation.'
                    : ufcMmaApiHint || UFC_EMPTY_CONFIG[ufcTab].sub}
                </Text>
                {hasConfigError ? (
                  <>
                    <View style={ufcStyles.emptyHeroDivider} />
                    <View style={ufcStyles.emptyHeroInfoRow}>
                      <AlertCircle size={14} color={UFC_RED} />
                      <Text
                        style={[
                          ufcStyles.emptyHeroInfoText,
                          {
                            color: isDark ? sf.textMuted : 'rgba(230, 228, 242, 0.78)',
                          },
                        ]}
                      >
                        Visit api-sports.io, log in with your account, and subscribe to the MMA API (free plan with 100 requests/day).
                      </Text>
                    </View>
                    <View style={[ufcStyles.emptyHeroInfoRow, { marginTop: 8 }]}>
                      <RefreshCw
                        size={14}
                        color={isDark ? sf.textMuted : 'rgba(220, 218, 235, 0.75)'}
                      />
                      <Text
                        style={[
                          ufcStyles.emptyHeroInfoText,
                          {
                            color: isDark ? sf.textMuted : 'rgba(230, 228, 242, 0.78)',
                          },
                        ]}
                      >
                        After subscribing, pull down to refresh.
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={ufcStyles.emptyHeroDivider} />
                    <View style={ufcStyles.emptyHeroInfoRow}>
                      <RefreshCw
                        size={14}
                        color={isDark ? sf.textMuted : 'rgba(220, 218, 235, 0.75)'}
                      />
                      <Text
                        style={[
                          ufcStyles.emptyHeroInfoText,
                          {
                            color: isDark ? sf.textMuted : 'rgba(230, 228, 242, 0.78)',
                          },
                        ]}
                      >
                        Pull down to refresh and try again.
                      </Text>
                    </View>
                  </>
                )}
              </LinearGradient>
            </View>
            )}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            {ufcTab === 'upcoming' ? (
              <FlatList
                ref={ufcEventsFlatListRef}
                data={ufcFlatListData}
                renderItem={renderUfcItem}
                keyExtractor={ufcFlatListKeyExtractor}
                style={styles.scrollView}
                contentContainerStyle={[
                  styles.scrollContent,
                  { flexGrow: 1, paddingBottom: insets.bottom + 120, paddingTop: 4 },
                ]}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={ufcListHeader}
                initialNumToRender={6}
                maxToRenderPerBatch={4}
                windowSize={5}
                removeClippedSubviews={false}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UFC_RED} colors={[UFC_RED]} />
                }
                ListEmptyComponent={ufcListEmpty}
              />
            ) : (
              <FlatList
                ref={ufcEventsFlatListRef}
                data={ufcEventListData}
                renderItem={renderUfcEventListItem}
                keyExtractor={ufcEventListKeyExtractor}
                style={styles.scrollView}
                contentContainerStyle={[
                  styles.scrollContent,
                  { flexGrow: 1, paddingBottom: insets.bottom + 120, paddingTop: 4 },
                ]}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={ufcListHeader}
                initialNumToRender={6}
                maxToRenderPerBatch={4}
                windowSize={5}
                removeClippedSubviews={false}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UFC_RED} colors={[UFC_RED]} />
                }
                ListEmptyComponent={ufcListEmpty}
              />
            )}
          </View>
        )
      ) : sportMode === 'football' && isInitialSportLoad ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {renderFootballHeader()}
          <SportFetchingBanner
            accentColor={colors.primary}
            textColor={colors.text}
            surfaceColor={isDark ? 'rgba(16, 17, 19, 0.88)' : 'rgba(255, 255, 255, 0.92)'}
          />
        </ScrollView>
      ) : hasConfigError ? (
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: colors.errorLight }]}>
            <AlertCircle size={28} color={colors.warning} strokeWidth={2} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>API Configuration Required</Text>
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
            Football API key is not configured on the server
          </Text>
        </View>
      ) : hasError ? (
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: colors.errorLight }]}>
            <AlertCircle size={28} color={colors.error} strokeWidth={2} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to Load</Text>
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
            Please check your connection and try again
          </Text>
          {sportMode === 'football' && footballErrorDetail ? (
            <Text style={[styles.errorDetail, { color: colors.textTertiary }]}>
              {footballErrorDetail}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh} activeOpacity={0.85}>
            <RefreshCw size={16} color={colors.primary} />
            <Text style={[styles.retryBtnText, { color: colors.primary }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : sportMode === 'football' && displayMatches.length === 0 && !isInitialSportLoad ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {renderFootballHeader()}
          <EmptyState
            type={activeTab}
            hint={
              liveEmptyHint ??
              (footballRateLimitHint
                ? 'Football data is temporarily unavailable — your API-Football daily request limit was reached. Wait for the quota to reset (usually midnight UTC) or upgrade at api-football.com.'
                : null)
            }
          />
        </ScrollView>
      ) : sportMode === 'football' && !isInitialSportLoad ? (
        <FlatList
          data={flatListData}
          renderItem={renderFlatListItem}
          keyExtractor={flatListKeyExtractor}
          ListHeaderComponent={<>{renderFootballHeader()}</>}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        />
      ) : null}

      {sportMode === 'f1' && (
        <F1Section
          isDark={isDark}
          insets={insets}
          edgePad={sportsEdgePad}
          sportToggleSlot={sportModeToggleEl}
        />
      )}

      {sportMode === 'nba' ? (
        <View style={{ flex: 1 }}>
          <NBASection isDark={isDark} insets={insets} sportToggleSlot={sportModeToggleEl} />
        </View>
      ) : null}
      
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
          leagueLogo={selectedMatch.leagueLogo}
          round={selectedMatch.round}
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
          season={selectedLeagueForStandings.season}
          leagueFixtures={leagueFixturesForStandings}
        />
      )}
      
      {selectedFight && showFightModal && (
        <UFCFightDetailModal
          visible={showFightModal}
          onClose={() => { setShowFightModal(false); setSelectedFight(null); }}
          fight={selectedFight}
        />
      )}

      <Modal
        visible={showFootballFilterPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFootballFilterPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowFootballFilterPicker(false)} />
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHandle} />
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Feed options</Text>
              <TouchableOpacity onPress={() => setShowFootballFilterPicker(false)} style={styles.pickerClose}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.unifiedFilterSectionTitle, { color: colors.textSecondary }]}>Sort order</Text>
              <View style={styles.unifiedFilterModeGrid}>
                {(
                  [
                    { id: 'smart' as const, label: 'Smart (For You)' },
                    { id: 'kickoff' as const, label: 'Kickoff time' },
                    { id: 'competition' as const, label: 'Competition' },
                  ] as const
                ).map((item) => {
                  const selected = footballSortMode === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => setFootballSortMode(item.id)}
                      style={[
                        styles.unifiedFilterModeChip,
                        {
                          borderColor: selected ? `${fc.accent}66` : colors.border,
                          backgroundColor: selected ? `${fc.accent}18` : colors.surfaceSecondary,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.unifiedFilterModeChipText, { color: selected ? fc.accent : colors.text }]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.unifiedFilterSectionTitle, { color: colors.textSecondary, marginTop: 14 }]}>
                Explore competitions
              </Text>
              <Text style={[styles.refineModalHint, { color: colors.textMuted }]}>
                Narrow Explore to specific leagues. For You uses your saved leagues, countries, and followed clubs only.
              </Text>
              <View style={styles.competitionQuickFilterWrap}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedLeagues([]);
                    if (footballSmartFilter !== 'explore') setFootballSmartFilter('explore');
                  }}
                  style={[
                    styles.competitionQuickChip,
                    {
                      backgroundColor: selectedLeagues.length === 0 ? `${fc.accent}22` : colors.surfaceSecondary,
                      borderColor: selectedLeagues.length === 0 ? `${fc.accent}66` : colors.border,
                    },
                  ]}
                >
                  <Trophy size={12} color={selectedLeagues.length === 0 ? fc.accent : colors.textSecondary} />
                  <Text style={[styles.competitionQuickChipText, { color: selectedLeagues.length === 0 ? fc.accent : colors.textSecondary }]}>
                    All competitions
                  </Text>
                </TouchableOpacity>
                {competitionQuickPicks.map((competition) => {
                  const selected = selectedLeagues.length === 1 && selectedLeagues[0] === competition.id;
                  return (
                    <TouchableOpacity
                      key={competition.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedLeagues([competition.id]);
                        if (footballSmartFilter !== 'explore') setFootballSmartFilter('explore');
                      }}
                      style={[
                        styles.competitionQuickChip,
                        {
                          backgroundColor: selected ? `${fc.accent}22` : colors.surfaceSecondary,
                          borderColor: selected ? `${fc.accent}66` : colors.border,
                        },
                      ]}
                    >
                      {competition.logo ? (
                        <Image source={{ uri: competition.logo }} style={styles.competitionQuickChipLogo} resizeMode="contain" />
                      ) : competition.id === 1 ? (
                        <FootballLeagueLogo
                          leagueId={1}
                          leagueName="World Cup"
                          size={18}
                          fallbackIconSize={11}
                          fallbackColor={selected ? fc.accent : colors.textSecondary}
                        />
                      ) : (
                        <Trophy size={11} color={selected ? fc.accent : colors.textSecondary} />
                      )}
                      <Text style={[styles.competitionQuickChipText, { color: selected ? fc.accent : colors.textSecondary }]}>
                        {competition.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFootballContextSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFootballContextSheet(false)}
      >
        <View style={styles.pickerOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowFootballContextSheet(false)}
          />
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHandle} />
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Explore competitions</Text>
              <TouchableOpacity onPress={() => setShowFootballContextSheet(false)} style={styles.pickerClose}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {TOP_LEAGUE_BUNDLE_IDS.map((leagueId) => {
                const effective = contextTopLeagueIds ?? TOP_LEAGUE_BUNDLE_IDS;
                const selected = effective.includes(leagueId);
                const name = getCompetitionById(leagueId)?.name ?? `League ${leagueId}`;
                const logoUri = `https://media.api-sports.io/football/leagues/${leagueId}.png`;
                return (
                  <TouchableOpacity
                    key={leagueId}
                    style={[styles.footballContextSheetRow, { borderBottomColor: colors.border }]}
                    activeOpacity={0.75}
                    onPress={() => toggleTopLeagueContextId(leagueId)}
                  >
                    <Image source={{ uri: logoUri }} style={styles.footballContextLogo} resizeMode="contain" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{name}</Text>
                    </View>
                    {selected ? <CheckCircle2 size={20} color={fc.accent} /> : null}
                  </TouchableOpacity>
                );
              })}
              <View style={styles.footballContextSheetFooter}>
                <TouchableOpacity
                  style={styles.footballContextResetBtn}
                  onPress={() => setContextTopLeagueIds(null)}
                >
                  <Text style={{ color: fc.accent, fontWeight: '700' }}>Use full selection</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLeaguePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLeaguePicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowLeaguePicker(false)} />
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHandle} />
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>League tables & stats</Text>
              <TouchableOpacity onPress={() => setShowLeaguePicker(false)} style={styles.pickerClose}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {availableLeaguesForStandings.map((league) => (
                <TouchableOpacity
                  key={league.id}
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectLeagueForStandings(league)}
                  activeOpacity={0.7}
                >
                  <FootballLeagueLogo
                    leagueId={league.id}
                    leagueName={league.name}
                    leagueLogo={league.logo}
                    size={36}
                    style={styles.pickerLogo}
                    fallbackStyle={{ ...styles.pickerLogoFallback, backgroundColor: colors.surfaceSecondary }}
                    fallbackIconSize={16}
                    fallbackColor={colors.textMuted}
                  />
                  <View style={styles.pickerInfo}>
                    <Text style={[styles.pickerName, { color: colors.text }]}>{league.name}</Text>
                    {league.country ? (
                      <Text style={[styles.pickerCountry, { color: colors.textSecondary }]}>{league.country}</Text>
                    ) : null}
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FootballTeamSearchModal
        visible={footballTeamSearchOpen}
        onClose={() => {
          setFootballTeamSearchOpen(false);
          setFootballClubProfilePreset(null);
        }}
        isDark={isDark}
        initialClub={footballClubProfilePreset}
      />
    </View>
  );
}

export default function SportsScreen() {
  return (
    <ErrorBoundary>
      <SportsScreenInner />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    zIndex: 10,
  },
  heroSportStripOverlapSlot: {},
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  /** Football hero: full-bleed image (strip overlaps bottom like UFC/F1/NBA); content inset separately. */
  headerGradientFootballBleed: {
    paddingHorizontal: 0,
  },
  stadiumHeroForegroundFootballInset: {
    paddingHorizontal: 20,
    width: '100%',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  /** Column shell: flex upper slot + sport-mode strip inside the football hero. */
  nonFootballHeroAnchor: {
    width: '100%',
    justifyContent: 'space-between',
  },
  /** Fills space above the sport strip inside `nonFootballHeroAnchor`. */
  ufcHeroTopFill: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  headerInfoLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 4,
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
  stadiumHeroRoot: {
    overflow: 'hidden' as const,
    minHeight: 170,
    justifyContent: 'flex-end' as const,
  },
  /** Tall hero must anchor content to the top; `stadiumHeroRoot` uses flex-end for the short legacy bar only. */
  stadiumHeroRootFootball: {
    justifyContent: 'flex-start' as const,
  },
  stadiumHeroForeground: {
    position: 'relative' as const,
    zIndex: 1,
  },
  stadiumHeroForegroundFill: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
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
    paddingTop: 5,
    paddingBottom: 11,
  },
  tickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  tickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tickerLiveDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tickerTitle: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: -0.15,
  },
  tickerCountBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 5,
    minWidth: 13,
    alignItems: 'center' as const,
  },
  tickerCountText: {
    fontSize: 7,
    fontWeight: '800' as const,
    color: '#FF3B30',
  },
  tickerSeeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  tickerSeeAll: {
    fontSize: 8,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  tickerList: {
    paddingHorizontal: LIVE_TICKER_H_PADDING,
    gap: 8,
  },
  /** Single live match fills the padded row so it aligns with hero width (no orphaned left chip). */
  tickerListSolo: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  tickerCardWrapper: {
    width: SCREEN_WIDTH * 0.4,
  },
  tickerCardWrapperSolo: {
    width: LIVE_TICKER_SOLO_CARD_WIDTH,
  },
  tickerCard: {
    borderRadius: 13,
    height: 121,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0.6,
    borderColor: 'rgba(46, 204, 113, 0.18)',
    shadowColor: '#2ECC71',
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    overflow: 'hidden' as const,
  },
  tickerSheen: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 48,
  },
  tickerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  tickerLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 71, 87, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 71, 87, 0.2)',
    shadowColor: '#FF4757',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  tickerElapsedPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tickerLiveText: {
    fontSize: 6,
    fontWeight: '800' as const,
    color: '#FF4757',
    letterSpacing: 0.5,
  },
  tickerElapsed: {
    fontSize: 6,
    fontWeight: '800' as const,
    color: '#F5F5FA',
    letterSpacing: 0.15,
  },
  tickerTeams: {
    gap: 5,
    marginBottom: 6,
  },
  tickerTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tickerLogoWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tickerLogo: {
    width: 13,
    height: 13,
    resizeMode: 'contain',
  },
  tickerTeamName: {
    flex: 1,
    fontSize: 8,
    fontWeight: '600' as const,
    color: '#C8C8D8',
    letterSpacing: -0.05,
  },
  tickerScore: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#E4E4ED',
    minWidth: 14,
    textAlign: 'right' as const,
    letterSpacing: -0.25,
  },
  tickerLeague: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.03)',
    paddingTop: 6,
  },
  tickerMomentumRow: {
    marginBottom: 5,
  },
  tickerMomentumLabel: {
    fontSize: 6,
    fontWeight: '700' as const,
    color: '#7D8AA8',
    marginBottom: 4,
    letterSpacing: 0.1,
    textTransform: 'uppercase' as const,
  },
  tickerMomentumTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden' as const,
  },
  tickerMomentumFill: {
    height: '100%',
    borderRadius: 999,
  },
  tickerLeagueLogo: {
    width: 8,
    height: 8,
  },
  tickerLeagueName: {
    fontSize: 6,
    fontWeight: '600' as const,
    color: '#6B6B85',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.18,
  },
  tabWrapper: {
    marginBottom: 12,
  },
  tabWrapperFootball: {
    marginBottom: 4,
  },
  tabWrapperUfc: {
    marginBottom: 8,
  },
  /** Quick links sit below Upcoming/Results so they cannot overflow the hero and cover the segment control. */
  ufcQuickLinksBelowTabs: {
    paddingHorizontal: 16,
    marginBottom: 10,
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
    paddingVertical: 8,
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
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  footballFilterCompactRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    width: '100%' as const,
  },
  footballSmartPillsRowCompact: {
    flex: 1,
    flexDirection: 'row' as const,
    gap: 6,
    minWidth: 0,
    flexShrink: 1,
  },
  footballOptionsIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  strictFollowingRowCompact: {
    width: 52,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
    overflow: 'hidden' as const,
  },
  strictSwitchCompact: {
    transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }],
  },
  footballSmartSectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  footballSmartPillsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'nowrap' as const,
    gap: 8,
  },
  footballFilterHintText: {
    fontSize: 10,
    fontWeight: '600' as const,
    marginTop: 4,
    letterSpacing: 0.1,
  },
  footballSmartPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 5,
    borderRadius: 11,
    borderWidth: 1,
  },
  footballSmartPillText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  footballContextChipCompact: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
    borderWidth: 1,
  },
  footballContextChipTitle: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    flexShrink: 0,
  },
  footballContextChipValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  footballLeagueTablesCta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginTop: 6,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  footballLeagueTablesIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  footballLeagueTablesTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  refineModalHint: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 10,
    marginTop: -4,
  },
  footballContextSheetRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  footballContextLogo: {
    width: 28,
    height: 28,
  },
  footballContextSheetFooter: {
    paddingTop: 14,
    paddingBottom: 6,
  },
  footballContextResetBtn: {
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  heroMetaRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap' as const,
  },
  heroMetaChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroMetaText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  emotionalHookCard: {
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  emotionalHookLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  emotionalHookMatch: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  featuredHeroCard: {
    marginTop: 14,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden' as const,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  featuredHeroLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  featuredHeroMatch: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  featuredHeroTime: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  aiCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  insightCarouselShell: {
    marginBottom: 6,
  },
  insightCarouselPage: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: 'hidden' as const,
    minHeight: 108,
    flexGrow: 0,
  },
  aiInsightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiInsightOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInsightTitleBlock: {
    flex: 1,
  },
  trendingCardInner: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: 'hidden' as const,
    minHeight: 108,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  trendingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  trendingNowLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  trendingMatchContext: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(226,232,240,0.72)',
    marginBottom: 6,
  },
  trendingThreeCol: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  trendingCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  trendingColTag: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: 'rgba(148,163,184,0.95)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  trendingTeamLogo: {
    width: 28,
    height: 28,
    marginBottom: 6,
  },
  trendingLogoPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  trendingPlayerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  trendingPlayerPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  trendingColTitle: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#F8FAFC',
    textAlign: 'center' as const,
  },
  trendingColSub: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(226,232,240,0.78)',
    textAlign: 'center' as const,
  },
  trendingLeagueFoot: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  trendingLeagueFootText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(226,232,240,0.62)',
  },
  insightPageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  insightDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(100,116,139,0.45)',
  },
  aiLabel: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  aiHeadline: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  aiSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 17,
    flexShrink: 1,
  },
  aiConfidencePill: {
    marginTop: 5,
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiConfidenceText: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.1,
  },
  unifiedFilterTrigger: {
    paddingHorizontal: 20,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unifiedFilterIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unifiedFilterTextWrap: {
    flex: 1,
  },
  unifiedFilterLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  unifiedFilterValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  unifiedFilterSectionTitle: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
  },
  unifiedFilterModeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  unifiedFilterModeChip: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
    width: '48%',
  },
  unifiedFilterModeChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  competitionQuickFilterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 8,
    paddingBottom: 8,
  },
  competitionQuickFilterScroll: {
    gap: 8,
    paddingRight: 8,
    paddingBottom: 8,
  },
  competitionQuickChip: {
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  competitionQuickChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  competitionQuickChipLogo: {
    width: 13,
    height: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  matchesList: {
    gap: 8,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
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
    marginBottom: 6,
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
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  upcomingPremiumCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(185, 145, 58, 0.35)',
    shadowColor: '#B9913A',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  liveAccentBar: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#FF3B30',
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
    fontWeight: '900' as const,
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
    marginTop: 10,
    paddingTop: 9,
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
    width: '100%',
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
    width: '100%',
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
  sportFetchingInline: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  sportFetchingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  sportFetchingText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  sportUpdateFloatingWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingHorizontal: 16,
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
  errorDetail: {
    fontSize: 12,
    textAlign: 'center' as const,
    lineHeight: 17,
    marginTop: 8,
    paddingHorizontal: 18,
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

/** Hero quick links — matches `UfcTab.tsx` FeatureRow; wires into real tab state + navigation. */
const UFCFeatureRow = React.memo(
  ({
    onUpcoming,
    onResults,
    onRankings,
    onFavorites,
  }: {
    onUpcoming: () => void;
    onResults: () => void;
    onRankings: () => void;
    onFavorites: () => void;
  }) => {
    const tap = useCallback(async (fn: () => void) => {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      fn();
    }, []);
    return (
      <View style={ufcStyles.featureRow}>
        <TouchableOpacity style={ufcStyles.featureItem} activeOpacity={0.85} onPress={() => tap(onUpcoming)}>
          <CalendarDays size={22} color={UFC_RED} />
          <Text style={ufcStyles.featureText}>{`Upcoming\nEvents`}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ufcStyles.featureItem} activeOpacity={0.85} onPress={() => tap(onResults)}>
          <Trophy size={22} color={UFC_RED} />
          <Text style={ufcStyles.featureText}>{`Fight\nResults`}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ufcStyles.featureItem} activeOpacity={0.85} onPress={() => tap(onRankings)}>
          <BarChart3 size={22} color={UFC_RED} />
          <Text style={ufcStyles.featureText}>{`Rankings &\nStats`}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ufcStyles.featureItemLast} activeOpacity={0.85} onPress={() => tap(onFavorites)}>
          <Star size={22} color={UFC_RED} />
          <Text style={ufcStyles.featureText}>{`Favourite\nFighters`}</Text>
        </TouchableOpacity>
      </View>
    );
  }
);

const sportToggleStyles = StyleSheet.create({
  container: {
    marginTop: 0,
    marginBottom: 0,
    alignSelf: 'stretch',
    width: '100%',
  },
  trackScroll: {
    alignSelf: 'stretch',
  },
  trackScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  /** Hero sport strip: no chrome — icons + labels only. */
  trackOverHero: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    gap: 0,
    minHeight: 44,
  },
  trackShellOverHero: {
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    backgroundColor: 'transparent',
    overflow: 'visible' as const,
  },
  trackShell: {
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative' as const,
    backgroundColor: 'transparent',
  },
  /** Equal-width segments: `flex: 1` alone can mis-measure on RN when only two children are shown. */
  option: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 11,
  },
  footballLabelActive: {
    fontWeight: '700' as const,
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  iconGlowWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionEmoji: {
    fontSize: 15,
  },
  optionLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
});

const UFCSegmentToggle = React.memo(({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: 'upcoming' | 'results';
  onTabChange: (tab: 'upcoming' | 'results') => void;
  counts: Record<string, number>;
}) => {
  const handlePress = useCallback(async (tab: 'upcoming' | 'results') => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onTabChange(tab);
  }, [onTabChange]);

  return (
    <View style={ufcStyles.segmentOuter}>
      <View style={ufcStyles.segmentRow}>
        {([
          { key: 'upcoming' as const, label: 'Upcoming', Icon: CalendarDays },
          { key: 'results' as const, label: 'Results', Icon: Trophy },
        ]).map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.Icon;
          const count = counts[tab.key] || 0;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.85}
              onPress={() => handlePress(tab.key)}
              style={[
                ufcStyles.segmentPill,
                isActive ? ufcStyles.segmentPillActive : ufcStyles.segmentPillInactive,
              ]}
            >
              <Icon size={16} color={isActive ? UFC_RED : UFC_MUTED} strokeWidth={isActive ? 2.4 : 2} />
              <Text style={[ufcStyles.segmentLabel, isActive ? ufcStyles.segmentLabelActive : ufcStyles.segmentLabelInactive]}>
                {tab.label}
              </Text>
              {isActive && count > 0 ? (
                <View style={ufcStyles.segmentCountBadge}>
                  <Text style={ufcStyles.segmentCountText}>{count}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const UFCStatsRow = React.memo(({ stats }: { stats: UfcStatCell[] }) => {
  return (
    <View style={ufcStyles.statsRowOuter}>
      <View style={ufcStyles.statsRow}>
        {stats.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 ? <View style={ufcStyles.statsDivider} /> : null}
            <View style={ufcStyles.statsCell}>
              <Text style={[ufcStyles.statsValue, s.active && { color: UFC_RED }]}>{s.value}</Text>
              <Text style={ufcStyles.statsLabel}>{s.label}</Text>
              {s.active ? <View style={ufcStyles.statsUnderline} /> : <View style={ufcStyles.statsUnderlineSpacer} />}
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
});

const UFCStatsRankingsPanel = React.memo(
  ({
    stats,
    winLeaderboard,
    divisionLeaders,
    resultsCount,
    onBack,
  }: {
    stats: UfcStatCell[];
    winLeaderboard: { name: string; wins: number }[];
    divisionLeaders: { category: string; name: string; wins: number }[];
    resultsCount: number;
    onBack: () => void;
  }) => {
    return (
      <View style={ufcStyles.statsRankingsRoot}>
        <TouchableOpacity
          style={ufcStyles.statsRankingsBackRow}
          onPress={onBack}
          activeOpacity={0.8}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <ArrowLeft size={22} color={UFC_RED} strokeWidth={2.4} />
          <Text style={ufcStyles.statsRankingsBackLabel}>Back to fights</Text>
        </TouchableOpacity>

        <UFCStatsRow stats={stats} />

        <Text style={ufcStyles.statsRankingsDisclaimer}>
          Stats and leaders are calculated from fights loaded in this app ({resultsCount} results
          bouts). Official UFC rankings are not available from the data provider.
        </Text>

        <View style={[ufcStyles.sectionHeaderRow, { marginTop: 12 }]}>
          <Text style={ufcStyles.sectionHeaderTitle}>Division leaders (feed)</Text>
        </View>
        {divisionLeaders.length === 0 ? (
          <Text style={ufcStyles.statsRankingsEmpty}>
            No division leaders yet. Open Results and pull to refresh loaded fight cards.
          </Text>
        ) : (
          <View style={[ufcStyles.statsRankingsList, { marginBottom: 16 }]}>
            {divisionLeaders.map((row, idx) => (
              <View
                key={`${row.category}-${row.name}`}
                style={[
                  ufcStyles.rankRow,
                  idx === divisionLeaders.length - 1 && ufcStyles.rankRowLast,
                ]}
              >
                <Text style={[ufcStyles.rankName, { flex: 1.2 }]} numberOfLines={1}>
                  {row.category}
                </Text>
                <Text style={[ufcStyles.rankName, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={ufcStyles.rankWins}>{row.wins} W</Text>
              </View>
            ))}
          </View>
        )}

        <View style={ufcStyles.sectionHeaderRow}>
          <Text style={ufcStyles.sectionHeaderTitle}>Overall win leaders</Text>
        </View>
        {winLeaderboard.length === 0 ? (
          <Text style={ufcStyles.statsRankingsEmpty}>
            No finished bouts with a recorded winner yet. Switch to Results or pull to refresh.
          </Text>
        ) : (
          <View style={ufcStyles.statsRankingsList}>
            {winLeaderboard.map((row, idx) => (
              <View
                key={`${row.name}-${idx}`}
                style={[ufcStyles.rankRow, idx === winLeaderboard.length - 1 && ufcStyles.rankRowLast]}
              >
                <Text style={ufcStyles.rankPos}>#{idx + 1}</Text>
                <Text style={ufcStyles.rankName} numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={ufcStyles.rankWins}>{row.wins} W</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  },
);

function surnameUpper(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].toUpperCase();
  return parts[parts.length - 1].toUpperCase();
}

function fullNameUpper(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
}

/** Two-line stacked names like the `UfcTab.tsx` reference (`Sean\\nStrickland`). */
function nameTwoLinesUpper(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0]?.toUpperCase() ?? '';
  const last = parts.pop()!;
  const first = parts.join(' ');
  return `${first.toUpperCase()}\n${last.toUpperCase()}`;
}

function methodLineFor(fight: UFCFight): { primary: string; secondary: string } {
  if (fight.status !== 'Completed') {
    const d = new Date(fight.date);
    const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return { primary: fight.time?.trim() || 'TBA', secondary: datePart.toUpperCase() };
  }
  const method = (fight.result?.method || '').trim();
  const lower = method.toLowerCase();
  let primary = 'FINAL';
  let secondary = method ? method.toUpperCase() : 'DECISION';
  if (lower.includes('ko') || lower.includes('tko')) {
    secondary = method.toUpperCase();
  } else if (lower.includes('sub')) {
    secondary = method.toUpperCase();
  } else if (lower.includes('dec') || lower.includes('unanimous') || lower.includes('split') || lower.includes('majority')) {
    const variant = lower.includes('split') ? '(SPLIT)' : lower.includes('majority') ? '(MAJORITY)' : '(UNANIMOUS)';
    return { primary: 'FINAL', secondary: `DECISION ${variant}` };
  }
  if (fight.result?.round) {
    secondary = `${secondary}\nRD ${fight.result.round}`;
  }
  return { primary, secondary };
}

const UFCNewEventCard = React.memo(({
  event,
  eventNumber,
  mainFight,
  fightCount,
  eventDate,
  onPress,
}: {
  event: string;
  eventNumber: string;
  mainFight: UFCFight;
  fightCount: number;
  eventDate: string;
  onPress: () => void;
}) => {
  const isCompleted = mainFight.status === 'Completed';

  const handlePress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [onPress]);

  const dateLabel = useMemo(() => {
    const d = new Date(eventDate);
    return d
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      .toUpperCase();
  }, [eventDate]);

  const headlineMatchup = useMemo(() => {
    const a = surnameUpper(mainFight.fighter1.name);
    const b = surnameUpper(mainFight.fighter2.name);
    return `${a} vs ${b}`;
  }, [mainFight.fighter1.name, mainFight.fighter2.name]);

  const methodLine = useMemo(() => methodLineFor(mainFight), [mainFight]);

  /** Reference UI: winner / green ring on the left, loser on the right (real API order may differ). */
  const displaySides = useMemo(() => {
    const f1 = mainFight.fighter1;
    const f2 = mainFight.fighter2;
    if (!isCompleted) {
      return { left: f1, right: f2 };
    }
    if (f1.winner) return { left: f1, right: f2 };
    if (f2.winner) return { left: f2, right: f1 };
    return { left: f1, right: f2 };
  }, [mainFight.fighter1, mainFight.fighter2, isCompleted]);

  const leftWin = !!displaySides.left.winner;
  const rightWin = !!displaySides.right.winner;

  const leftAvatarBorder = useMemo(() => {
    if (!isCompleted) return UFC_BORDER;
    if (leftWin || rightWin) return leftWin ? UFC_WIN_GREEN : UFC_LOSS_RING;
    return UFC_BORDER;
  }, [isCompleted, leftWin, rightWin]);

  const rightAvatarBorder = useMemo(() => {
    if (!isCompleted) return UFC_BORDER;
    if (leftWin || rightWin) return rightWin ? UFC_WIN_GREEN : UFC_LOSS_RING;
    return UFC_BORDER;
  }, [isCompleted, leftWin, rightWin]);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={handlePress} style={ufcStyles.eventCardWrap}>
      <View style={ufcStyles.eventCard}>
        {/* Top row: UFC chip + event title + meta + CARD pill */}
        <View style={ufcStyles.eventCardTopRow}>
          <View style={ufcStyles.ufcChip}>
            <Text style={ufcStyles.ufcChipBrand}>UFC</Text>
            <Text style={ufcStyles.ufcChipNumber} numberOfLines={1}>
              {eventNumber}
            </Text>
          </View>
          <View style={ufcStyles.eventCardTitleWrap}>
            <Text style={ufcStyles.eventCardTitle} numberOfLines={1}>
              {headlineMatchup}
            </Text>
            <Text style={ufcStyles.eventCardMeta} numberOfLines={1}>
              {fightCount} BOUT{fightCount === 1 ? '' : 'S'} • {dateLabel}
            </Text>
          </View>
          <View style={ufcStyles.cardActionPill}>
            <Text style={ufcStyles.cardActionPillText}>CARD</Text>
          </View>
        </View>

        {/* Fight row — centered columns like `UfcTab.tsx` ResultCard */}
        <View style={ufcStyles.matchupRow}>
          <View style={ufcStyles.eventCardFighterSide}>
            <View style={[ufcStyles.fighterAvatarRingLarge, { borderColor: leftAvatarBorder }]}>
              <View style={ufcStyles.fighterAvatarInnerLarge}>
                {displaySides.left.photo ? (
                  <ExpoImage
                    source={{ uri: displaySides.left.photo }}
                    style={ufcStyles.fighterAvatarImg}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Text style={ufcStyles.fighterInitialFallback}>
                    {(displaySides.left.name || '?').charAt(0)}
                  </Text>
                )}
              </View>
            </View>
            <Text style={ufcStyles.fighterNameCenter} numberOfLines={2}>
              {nameTwoLinesUpper(displaySides.left.name)}
            </Text>
            {isCompleted ? (
              <View style={[ufcStyles.resultPill, leftWin ? ufcStyles.winPill : ufcStyles.lossPill]}>
                <Text style={ufcStyles.resultPillLabel}>{leftWin ? 'WIN' : 'LOSS'}</Text>
              </View>
            ) : null}
          </View>

          <View style={ufcStyles.methodBlock}>
            <Text style={ufcStyles.finalLabel}>{methodLine.primary}</Text>
            <Text style={ufcStyles.methodDetail} numberOfLines={4}>
              {methodLine.secondary}
            </Text>
          </View>

          <View style={ufcStyles.eventCardFighterSide}>
            <View style={[ufcStyles.fighterAvatarRingLarge, { borderColor: rightAvatarBorder }]}>
              <View style={ufcStyles.fighterAvatarInnerLarge}>
                {displaySides.right.photo ? (
                  <ExpoImage
                    source={{ uri: displaySides.right.photo }}
                    style={ufcStyles.fighterAvatarImg}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Text style={ufcStyles.fighterInitialFallback}>
                    {(displaySides.right.name || '?').charAt(0)}
                  </Text>
                )}
              </View>
            </View>
            <Text style={ufcStyles.fighterNameCenter} numberOfLines={2}>
              {nameTwoLinesUpper(displaySides.right.name)}
            </Text>
            {isCompleted ? (
              <View style={[ufcStyles.resultPill, rightWin ? ufcStyles.winPill : ufcStyles.lossPill]}>
                <Text style={ufcStyles.resultPillLabel}>{rightWin ? 'WIN' : 'LOSS'}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const ufcStyles = StyleSheet.create({
  eventBanner: {
    marginBottom: 10,
    marginTop: 14,
  },
  eventBannerCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UFC_BORDER,
    backgroundColor: UFC_SURFACE,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  eventBannerAccentBar: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: UFC_RED,
  },
  eventBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 16,
    gap: 10,
  },
  eventBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  eventBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventBannerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  eventBannerTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    letterSpacing: -0.25,
    lineHeight: 19,
  },
  eventBannerSub: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 3,
    letterSpacing: -0.1,
  },
  eventBannerMetaRow: {
    marginTop: 0,
  },
  eventBannerBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UFC_BRAND.redBorder,
    backgroundColor: UFC_BRAND.redSoft,
  },
  eventBannerBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: UFC_RED,
    letterSpacing: 1.2,
  },
  ufcStatsBarOuter: {
    paddingVertical: 10,
    paddingBottom: 12,
    marginBottom: 2,
  },
  ufcStatsScrollInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    paddingHorizontal: 20,
    paddingRight: 28,
  },
  ufcStatItem: {
    minWidth: 82,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
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
    borderColor: UFC_BORDER,
    backgroundColor: UFC_SURFACE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fightHeaderCompact: {
    marginBottom: 12,
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
    backgroundColor: UFC_BRAND.redSoft,
  },
  weightBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    color: UFC_RED,
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
  fightStatusBadgeUpcoming: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: UFC_BRAND.redSoft,
  },
  fightStatusTextUpcoming: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: UFC_RED,
  },
  fightersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  fightCardFighterSide: {
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
    backgroundColor: 'rgba(229, 9, 20, 0.25)',
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
    color: '#FFFFFF',
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
    backgroundColor: UFC_BRAND.redSoft,
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
  upcomingScheduleStrip: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: 8,
  },
  schedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  schedulePillText: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  schedulePillEmphasis: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UFC_BRAND.redBorder,
    backgroundColor: UFC_BRAND.redSoft,
    marginLeft: 'auto',
  },
  schedulePillEmphasisText: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
    color: UFC_RED,
  },
  fightEventName: {
    fontSize: 11,
    fontWeight: '600' as const,
    flex: 1,
    lineHeight: 14,
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
    marginBottom: 14,
    borderRadius: 18,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  countdownGradient: {
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  countdownAccentBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: UFC_RED,
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: UFC_RED,
    letterSpacing: 2.8,
    marginBottom: 8,
  },
  countdownEvent: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#F0F0FA',
    letterSpacing: -0.35,
    marginBottom: 6,
    textAlign: 'center' as const,
    paddingHorizontal: 8,
    lineHeight: 22,
  },
  countdownSubtitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 18,
    textAlign: 'center' as const,
  },
  countdownSectionLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
    alignSelf: 'center' as const,
  },
  countdownFighters: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 18,
  },
  countdownFighterWrap: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 8,
  },
  countdownAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden' as const,
    borderWidth: 2,
    borderColor: UFC_BRAND.redBorder,
  },
  countdownAvatarImg: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  countdownAvatarInitial: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: UFC_RED,
  },
  countdownFighterName: {
    fontSize: 12,
    fontWeight: '800' as const,
    textAlign: 'center' as const,
    maxWidth: 108,
    marginTop: 8,
    lineHeight: 15,
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
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap' as const,
  },
  countdownTimeBox: {
    backgroundColor: UFC_BRAND.redSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: UFC_BRAND.redBorder,
    minWidth: 60,
  },
  countdownTimeValue: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: UFC_RED,
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
    justifyContent: 'center',
    gap: 10,
    marginTop: 2,
  },
  countdownWeightBadge: {
    backgroundColor: UFC_BRAND.redSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UFC_BRAND.redBorder,
  },
  countdownWeightText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: UFC_RED,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  countdownDateText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#6B6B85',
  },
  emptyHero: {
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: UFC_BORDER,
  },
  emptyHeroGradient: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  emptyHeroTopAccent: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: UFC_RED,
  },
  emptyHeroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.35)',
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
    color: UFC_MUTED,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyHeroDivider: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(229, 9, 20, 0.28)',
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

  // --- New UFC tab styles (segment toggle, stats row, section header, event card) ---
  segmentOuter: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: UFC_SEGMENT_TRACK,
    borderWidth: 1,
    borderColor: UFC_BORDER,
    flexDirection: 'row',
    padding: 5,
  },
  segmentRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  segmentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentPillInactive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  segmentPillActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderColor: UFC_RED,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  segmentLabelInactive: {
    color: UFC_MUTED,
  },
  segmentLabelActive: {
    color: UFC_RED,
  },
  segmentCountBadge: {
    backgroundColor: UFC_RED,
    borderRadius: 8,
    minWidth: 20,
    height: 18,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },
  segmentCountText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  statsRowOuter: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
    minHeight: 84,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: UFC_BORDER,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flex: 1,
  },
  statsCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    paddingVertical: 8,
  },
  statsValue: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: UFC_MUTED,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  statsUnderline: {
    position: 'absolute' as const,
    bottom: 10,
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: UFC_RED,
  },
  statsUnderlineSpacer: {
    width: 42,
    height: 3,
  },
  statsDivider: {
    width: 1,
    backgroundColor: UFC_BORDER,
    marginVertical: 4,
  },

  statsRankingsRoot: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  statsRankingsBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
  },
  statsRankingsBackLabel: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: UFC_TEXT,
    letterSpacing: 0.2,
  },
  statsRankingsDisclaimer: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: UFC_MUTED,
    paddingHorizontal: 16,
    marginTop: -4,
    marginBottom: 14,
    lineHeight: 17,
  },
  statsRankingsEmpty: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: UFC_MUTED,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  statsRankingsList: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UFC_BORDER,
    backgroundColor: 'rgba(255,255,255,0.035)',
    overflow: 'hidden' as const,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  rankRowLast: {
    borderBottomWidth: 0,
  },
  rankPos: {
    width: 36,
    fontSize: 14,
    fontWeight: '900' as const,
    color: UFC_RED,
  },
  rankName: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '800' as const,
    color: UFC_TEXT,
    textTransform: 'uppercase' as const,
    letterSpacing: -0.2,
  },
  rankWins: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: UFC_MUTED,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textTransform: 'uppercase' as const,
  },
  sectionHeaderActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionHeaderAction: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: UFC_RED,
    letterSpacing: -0.1,
  },

  eventCardWrap: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  eventCard: {
    borderRadius: 16,
    backgroundColor: UFC_SURFACE,
    borderWidth: 1,
    borderColor: UFC_BORDER,
    overflow: 'hidden' as const,
  },
  eventCardTopRow: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  ufcChip: {
    width: 54,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  ufcChipBrand: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: UFC_RED,
    fontStyle: 'italic' as const,
    letterSpacing: -0.4,
    lineHeight: 14,
  },
  ufcChipNumber: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: UFC_RED,
    letterSpacing: -0.2,
    lineHeight: 14,
    marginTop: 2,
  },
  eventCardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  eventCardTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textTransform: 'uppercase' as const,
  },
  eventCardMeta: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: UFC_MUTED,
    letterSpacing: 0.4,
    marginTop: 3,
    textTransform: 'uppercase' as const,
  },
  cardActionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UFC_RED,
    backgroundColor: 'transparent',
  },
  cardActionPillText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: UFC_RED,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  eventCardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UFC_BORDER,
    marginHorizontal: 16,
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 22,
    paddingHorizontal: 14,
  },
  eventCardFighterSide: {
    width: '32%',
    alignItems: 'center',
  },
  fighterAvatarRingLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  fighterAvatarInnerLarge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: UFC_SURFACE,
    overflow: 'hidden' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fighterAvatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fighterAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: UFC_SURFACE,
    overflow: 'hidden' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fighterAvatarImg: {
    width: '100%',
    height: '100%',
  },
  fighterInitialFallback: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: 'rgba(235,235,245,0.7)',
  },
  fighterNameCenter: {
    color: UFC_TEXT,
    fontSize: 15,
    fontWeight: '900' as const,
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    lineHeight: 18,
  },
  methodBlock: {
    width: '30%',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  finalLabel: {
    color: UFC_WIN_GREEN,
    fontSize: 14,
    fontWeight: '900' as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  methodDetail: {
    color: UFC_MUTED,
    fontSize: 12,
    fontWeight: '800' as const,
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    lineHeight: 17,
  },
  resultPill: {
    overflow: 'hidden' as const,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 99,
  },
  winPill: {
    backgroundColor: 'rgba(46,204,113,0.55)',
  },
  lossPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  resultPillLabel: {
    color: UFC_TEXT,
    fontSize: 11,
    fontWeight: '900' as const,
    letterSpacing: 1,
    textAlign: 'center' as const,
  },
  featureRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingTop: 14,
    marginTop: 0,
  },
  featureItem: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  featureItemLast: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  featureText: {
    color: UFC_TEXT,
    fontSize: 10,
    fontWeight: '800' as const,
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
});
