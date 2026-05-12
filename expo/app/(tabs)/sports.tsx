import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  Users,
  Globe,
  ChevronDown,
  BarChart3,
  ArrowLeft,
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
import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FootballSmartFilter } from '@/components/SportsSmartFilter';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getCompetitionById } from '@/constants/competitions';
import MatchDetailsModal from '@/components/MatchDetailsModal';
import LeagueStandingsModal from '@/components/LeagueStandingsModal';
import TabWalkthrough from '@/components/TabWalkthrough';
import UFCFightDetailModal from '@/components/UFCFightDetailModal';
import F1Section from '@/components/F1Section';
import NBASection from '@/components/NBASection';
import FootballPremiumHeroInner, {
  type FootballHeroFavoriteClub,
} from '@/components/FootballPremiumHeroInner';
import FootballTeamSearchModal, {
  type FootballClubProfilePreset,
} from '@/components/FootballTeamSearchModal';
import { getFootballTeamLogoUrl } from '@/constants/footballData';
import { PremiumSportsMatchCard } from '@/components/PremiumSportsMatchCard';
import { sportsFixedPalette } from '@/utils/sportsPalette';
import { isMmaCompletedFightPayload, isMmaLiveStatusShort } from '@/utils/mmaFightStatus';
import {
  TOP_LEAGUE_BUNDLE_IDS,
  applyFootballVisibilityRules,
  buildFootballQueryContext,
} from '@/utils/footballQueryContext';
import { getTeamIdFromName } from '@/utils/footballApi';
import {
  HERO_SPORT_STRIP_OVERLAP_HERO_PX,
  HERO_SECONDARY_GAP_BELOW_SPORT_STRIP,
  getSportsHeroEdgePad,
  getSportsHeroImageScale,
} from '@/constants/sportsHeroLayout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Tall stadium heroes (Football / F1 use `stadiumHeroRootFootball`). */
const FOOTBALL_HERO_MIN_HEIGHT_PX = 470;
/** Football hero: bottom crop ~4% of min height (parent overflow clips; was 3%). */
const FOOTBALL_HERO_BOTTOM_CROP_PX = Math.round(FOOTBALL_HERO_MIN_HEIGHT_PX * 0.04);
/** F1 hero: bottom crop 3% (was 5%; reduced by 2pp — same scale as football). */
const F1_HERO_BOTTOM_CROP_PX = Math.round(FOOTBALL_HERO_MIN_HEIGHT_PX * 0.03);

/** UFC Fight Center hero — bundled promotional artwork. */
const UFC_HERO_IMAGE = require('../../assets/images/ufc-hero.png');
/** F1 Race Center hero — bundled promotional artwork (same art as schedule card, lives under sport strip). */
const F1_HERO_IMAGE = require('../../assets/images/f1-race-center-hero.png');

/** UFC Fight Center — palette aligned with `UfcTab.tsx` reference. */
const UFC_BG = '#050507';
const UFC_RED = '#E50914';
const UFC_SURFACE = '#111214';
const UFC_BORDER = 'rgba(255,255,255,0.11)';
const UFC_MUTED = '#A5A6AA';
const UFC_TEXT = '#F5F5F6';
const UFC_WIN_GREEN = '#2ECC71';
/** Loser ring uses brand red (reference `loserRing`). */
const UFC_LOSS_RING = UFC_RED;
const UFC_SEGMENT_TRACK = '#0C0D0F';

const FOOTBALL_SMART_FILTER_OPTIONS: {
  id: FootballSmartFilter;
  label: string;
  Icon: typeof Sparkles;
}[] = [
  { id: 'for-you', label: 'For You', Icon: Sparkles },
  { id: 'following', label: 'Following', Icon: Users },
  { id: 'top-leagues', label: 'Top Leagues', Icon: Trophy },
  { id: 'worldwide', label: 'Worldwide', Icon: Globe },
];

type SportMode = 'football' | 'ufc' | 'f1' | 'nba';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

/** Stadium hero + neon green chrome for Football tab (light / dark hero art). */
const FOOTBALL_CHROME = {
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
      fight.slug ||
      'UFC Event';

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
        winner: r1.winner === true || f1.winner === true || result.winner === 'first',
      },
      fighter2: {
        id: typeof f2.id === 'number' ? f2.id : 0,
        name: f2.name || 'TBA',
        photo: f2Photo,
        winner: r2.winner === true || f2.winner === true || result.winner === 'second',
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
  elapsed?: number;
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

function isMajorLeagueName(name: string): boolean {
  return /premier league|la liga|bundesliga|serie a|ligue 1|champions league|europa league|conference league|uefa super/i.test(
    name,
  );
}

function hoursUntilMatchKickoff(m: Match): number {
  return (new Date(m.date).getTime() - Date.now()) / 3600000;
}

type StandingRowLite = {
  rank: number;
  points: number;
  team: { id: number; name: string };
  description?: string | null;
};

function findHomeAwayInStandings(
  response: unknown,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
): { home: StandingRowLite; away: StandingRowLite } | null {
  if (!homeTeamId || !awayTeamId) return null;
  const standings = (response as { league?: { standings?: unknown[] } }[])?.[0]?.league?.standings;
  if (!Array.isArray(standings)) return null;
  for (const group of standings) {
    if (!Array.isArray(group)) continue;
    const home = group.find((t: { team?: { id?: number } }) => t?.team?.id === homeTeamId);
    const away = group.find((t: { team?: { id?: number } }) => t?.team?.id === awayTeamId);
    if (home && away) {
      return {
        home: {
          rank: home.rank,
          points: home.points,
          team: home.team,
          description: home.description,
        },
        away: {
          rank: away.rank,
          points: away.points,
          team: away.team,
          description: away.description,
        },
      };
    }
  }
  return null;
}

function ordinalRank(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function shortZoneHint(description: string | undefined | null): string | null {
  if (!description || typeof description !== 'string') return null;
  const d = description.trim();
  if (!d) return null;
  return d.length > 40 ? `${d.slice(0, 37)}…` : d;
}

/** Deterministic copy: how a win for either side affects points / ladder (GD caveat). */
function buildTablestakesSummary(
  leagueName: string,
  homeLabel: string,
  awayLabel: string,
  home: StandingRowLite,
  away: StandingRowLite,
): string {
  const hr = home.rank;
  const ar = away.rank;
  const hp = home.points;
  const ap = away.points;
  const homeWinPts = hp + 3;
  const awayWinPts = ap + 3;
  const rankGap = Math.abs(hr - ar);
  const ptsGap = Math.abs(hp - ap);
  const homeHigher = hr < ar;
  const tight = rankGap <= 2 || (rankGap <= 4 && ptsGap <= 6);

  const leagueBit = leagueName ? `${leagueName} table: ` : 'Table: ';

  let core: string;
  if (tight) {
    core = `${leagueBit}${homeLabel} ${ordinalRank(hr)} (${hp} pts) vs ${awayLabel} ${ordinalRank(ar)} (${ap} pts)—a classic “six-pointer” feel; a ${homeLabel} win → ~${homeWinPts} pts, an ${awayLabel} win → ~${awayWinPts} pts, often enough to swap places on goal difference.`;
  } else if (homeHigher) {
    core = `${leagueBit}${homeLabel} ${ordinalRank(hr)} (${hp} pts) sit above ${awayLabel} ${ordinalRank(ar)} (${ap} pts); an away win pushes ${awayLabel} toward ~${awayWinPts} pts and tightens the race for places above.`;
  } else {
    core = `${leagueBit}${awayLabel} ${ordinalRank(ar)} (${ap} pts) lead ${homeLabel} ${ordinalRank(hr)} (${hp} pts); a home win lifts ${homeLabel} toward ~${homeWinPts} pts and applies pressure higher up.`;
  }

  const outcomes = ` If ${homeLabel} win: ~${homeWinPts} pts; if ${awayLabel} win: ~${awayWinPts} pts (order among tied teams depends on GD).`;

  const zh = shortZoneHint(home.description) ?? shortZoneHint(away.description);
  const zone = zh ? ` Zone: ${zh}.` : '';

  return `${core}${outcomes}${zone}`;
}

function migrateStoredFootballFocus(raw: string | null): FootballSmartFilter {
  if (
    raw === 'for-you' ||
    raw === 'following' ||
    raw === 'top-leagues' ||
    raw === 'worldwide'
  ) {
    return raw;
  }
  if (raw === 'my-teams') return 'following';
  if (raw === 'my-leagues') return 'top-leagues';
  if (raw === 'my-countries' || raw === 'all') return 'worldwide';
  return 'for-you';
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
            {match.leagueLogo ? (
              <Image source={{ uri: match.leagueLogo }} style={styles.tickerLeagueLogo} resizeMode="contain" />
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
                        ? { backgroundColor: 'rgba(201, 162, 39, 0.85)' }
                        : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' })
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
                        ? (isActive ? '#0A0806' : sf.textMuted)
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
  const { isDark } = useTheme();
  const sf = sportsFixedPalette(isDark);
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
        colors={[...sf.ufcGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={ufcStyles.countdownGradient}
      >
        <View style={ufcStyles.countdownGoldBar} />
        <Text style={ufcStyles.countdownLabel}>NEXT BOUT</Text>
        <Text style={ufcStyles.countdownEvent} numberOfLines={2}>
          {fight.event}
        </Text>
        <Text style={[ufcStyles.countdownSubtitle, { color: sf.textMuted }]}>{boutSubtitle}</Text>
        <View style={ufcStyles.countdownFighters}>
          <View style={ufcStyles.countdownFighterWrap}>
            <View style={[ufcStyles.countdownAvatar, { backgroundColor: sf.surfaceSecondary }]}>
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
            <Text style={[ufcStyles.countdownFighterName, { color: sf.text }]} numberOfLines={2}>
              {fight.fighter1.name}
            </Text>
          </View>
          <View style={ufcStyles.countdownVsWrap}>
            <LinearGradient colors={['#D4AF37', '#9A7209']} style={ufcStyles.countdownVsBadge}>
              <Text style={ufcStyles.countdownVsText}>VS</Text>
            </LinearGradient>
          </View>
          <View style={ufcStyles.countdownFighterWrap}>
            <View style={[ufcStyles.countdownAvatar, { backgroundColor: sf.surfaceSecondary }]}>
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
            <Text style={[ufcStyles.countdownFighterName, { color: sf.text }]} numberOfLines={2}>
              {fight.fighter2.name}
            </Text>
          </View>
        </View>
        <Text style={[ufcStyles.countdownSectionLabel, { color: sf.textMuted }]}>Starts in</Text>
        <View style={ufcStyles.countdownTimerRow}>
          <View style={[ufcStyles.countdownTimeBox, { borderColor: 'rgba(212, 175, 55, 0.22)' }]}>
            <Text style={ufcStyles.countdownTimeValue}>{timeLeft.days}</Text>
            <Text style={[ufcStyles.countdownTimeUnit, { color: sf.textMuted }]}>DAYS</Text>
          </View>
          <Text style={[ufcStyles.countdownTimeSep, { color: sf.textMuted }]}>:</Text>
          <View style={[ufcStyles.countdownTimeBox, { borderColor: 'rgba(212, 175, 55, 0.22)' }]}>
            <Text style={ufcStyles.countdownTimeValue}>{timeLeft.hours}</Text>
            <Text style={[ufcStyles.countdownTimeUnit, { color: sf.textMuted }]}>HRS</Text>
          </View>
          <Text style={[ufcStyles.countdownTimeSep, { color: sf.textMuted }]}>:</Text>
          <View style={[ufcStyles.countdownTimeBox, { borderColor: 'rgba(212, 175, 55, 0.22)' }]}>
            <Text style={ufcStyles.countdownTimeValue}>{timeLeft.mins}</Text>
            <Text style={[ufcStyles.countdownTimeUnit, { color: sf.textMuted }]}>MIN</Text>
          </View>
        </View>
        {fight.category !== 'TBD' ? (
          <View style={ufcStyles.countdownWeightRow}>
            <View style={[ufcStyles.countdownWeightBadge, { borderColor: 'rgba(212, 175, 55, 0.25)' }]}>
              <Text style={ufcStyles.countdownWeightText}>{fight.category}</Text>
            </View>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
});

const UFCEventBanner = React.memo(({ eventName, fightCount, eventDate }: { eventName: string; fightCount: number; eventDate?: string }) => {
  const { isDark } = useTheme();
  const sf = sportsFixedPalette(isDark);
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
      <View style={[ufcStyles.eventBannerCard, { backgroundColor: sf.card, borderColor: sf.border }]}>
        <View style={ufcStyles.eventBannerAccentBar} />
        <View style={ufcStyles.eventBannerContent}>
          <View style={ufcStyles.eventBannerLeft}>
            <LinearGradient
              colors={['#C9A227', '#8B6914']}
              style={ufcStyles.eventBannerIcon}
            >
              <Swords size={15} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
            <View style={ufcStyles.eventBannerTextWrap}>
              <Text style={[ufcStyles.eventBannerTitle, { color: sf.text }]} numberOfLines={2}>
                {eventName}
              </Text>
              <View style={ufcStyles.eventBannerMetaRow}>
                <Text style={[ufcStyles.eventBannerSub, { color: sf.textSecondary }]}>
                  {fightCount} bout{fightCount !== 1 ? 's' : ''}
                  {eventDate ? ` · ${getEventDateLabel()}` : ''}
                </Text>
              </View>
            </View>
          </View>
          <View style={[ufcStyles.eventBannerBadge, { borderColor: 'rgba(201, 162, 39, 0.35)' }]}>
            <Text style={ufcStyles.eventBannerBadgeText}>CARD</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

const UFCFightCard = React.memo(({ fight, isFirst, isLast, onPress }: { fight: UFCFight; isFirst?: boolean; isLast?: boolean; onPress?: () => void }) => {
  const { isDark } = useTheme();
  const sf = sportsFixedPalette(isDark);
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
        { backgroundColor: sf.card, borderWidth: 1 },
        isLive
          ? { borderColor: `${sf.live}55`, shadowColor: sf.live, shadowOpacity: 0.15, shadowRadius: 20 }
          : { borderColor: `${sf.warning}22` },
      ]}>
        {isLive && (
          <LinearGradient
            colors={[`${sf.live}14`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={ufcStyles.liveGlow}
          />
        )}

        <View style={[ufcStyles.fightHeader, isUpcoming && ufcStyles.fightHeaderCompact]}>
          <View style={ufcStyles.fightEventRow}>
            {fight.category !== 'TBD' && (
              <View style={[ufcStyles.weightBadge, { backgroundColor: `${sf.warning}18` }]}>
                <Text style={[ufcStyles.weightBadgeText, { color: sf.warning }]}>
                  {fight.category}
                </Text>
              </View>
            )}
            {fight.event ? (
              <Text style={[ufcStyles.fightEventName, { color: sf.textMuted }]} numberOfLines={isUpcoming ? 2 : 1}>
                {fight.event}
              </Text>
            ) : null}
          </View>
          {isLive ? (
            <View style={ufcStyles.fightLiveBadge}>
              <LivePulse color={sf.live} size={6} />
              <Text style={[ufcStyles.fightLiveText, { color: sf.live }]}>LIVE</Text>
            </View>
          ) : isCompleted ? (
            <View style={[ufcStyles.fightStatusBadge, { backgroundColor: `${sf.success}18` }]}>
              <CheckCircle2 size={11} color={sf.success} />
              <Text style={[ufcStyles.fightStatusText, { color: sf.success }]}>Final</Text>
            </View>
          ) : (
            <View style={[ufcStyles.fightStatusBadge, { backgroundColor: `${sf.warning}14` }]}>
              <Clock size={11} color={sf.warning} />
              <Text style={[ufcStyles.fightStatusText, { color: sf.warning }]}>{getFightTime()}</Text>
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
              <View style={[ufcStyles.fighterAvatar, { backgroundColor: sf.surfaceSecondary }]}>
                {fight.fighter1.photo ? (
                  <ExpoImage
                    source={{ uri: fight.fighter1.photo }}
                    style={ufcStyles.fighterPhoto}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <LinearGradient
                    colors={[sf.surfaceSecondary, sf.backgroundTertiary]}
                    style={ufcStyles.fighterAvatarFallback}
                  >
                    <Text style={[ufcStyles.fighterInitials, { color: sf.textMuted }]}>
                      {getFighterInitial(fight.fighter1.name)}
                    </Text>
                  </LinearGradient>
                )}
              </View>
            </View>
            <Text
              style={[
                ufcStyles.fighterName,
                { color: sf.text },
                isCompleted && fight.fighter1.winner && { color: sf.success },
                isCompleted && !fight.fighter1.winner && fight.fighter2.winner && { opacity: 0.5 },
                fight.fighter1.name === 'TBA' && { color: sf.textTertiary, fontStyle: 'italic' as const },
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
                <Text style={[ufcStyles.loserBadgeText, { color: sf.textSecondary }]}>LOSS</Text>
              </View>
            )}
          </View>

          <View style={ufcStyles.vsCenter}>
            <View style={ufcStyles.vsLine} />
            <LinearGradient
              colors={isLive ? [sf.live, sf.error] : [sf.surfaceSecondary, sf.backgroundTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={ufcStyles.vsCircle}
            >
              <Text style={[
                ufcStyles.vsText,
                { color: isLive ? sf.textInverse : sf.textMuted },
              ]}>VS</Text>
            </LinearGradient>
            <View style={ufcStyles.vsLine} />
          </View>

          <View style={ufcStyles.fightCardFighterSide}>
            <View style={[
              ufcStyles.fighterAvatarOuter,
              isCompleted && fight.fighter2.winner && { borderColor: '#10B981', borderWidth: 2 },
              isCompleted && !fight.fighter2.winner && fight.fighter1.winner && { opacity: 0.6 },
            ]}>
              <View style={[ufcStyles.fighterAvatar, { backgroundColor: sf.surfaceSecondary }]}>
                {fight.fighter2.photo ? (
                  <ExpoImage
                    source={{ uri: fight.fighter2.photo }}
                    style={ufcStyles.fighterPhoto}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <LinearGradient
                    colors={[sf.surfaceSecondary, sf.backgroundTertiary]}
                    style={ufcStyles.fighterAvatarFallback}
                  >
                    <Text style={[ufcStyles.fighterInitials, { color: sf.textMuted }]}>
                      {getFighterInitial(fight.fighter2.name)}
                    </Text>
                  </LinearGradient>
                )}
              </View>
            </View>
            <Text
              style={[
                ufcStyles.fighterName,
                { color: sf.text },
                isCompleted && fight.fighter2.winner && { color: sf.success },
                isCompleted && !fight.fighter2.winner && fight.fighter1.winner && { opacity: 0.5 },
                fight.fighter2.name === 'TBA' && { color: sf.textTertiary, fontStyle: 'italic' as const },
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
                <Text style={[ufcStyles.loserBadgeText, { color: sf.textSecondary }]}>LOSS</Text>
              </View>
            )}
          </View>
        </View>

        {isCompleted && fight.result?.method && (
          <View style={[ufcStyles.resultRow, { borderTopColor: sf.border }]}>
            <View style={[ufcStyles.resultMethodContainer, { backgroundColor: `${sf.warning}10` }]}>
              <Text style={[ufcStyles.resultMethodEmoji, { color: getMethodColor(fight.result.method) }]}>{getMethodIcon(fight.result.method)}</Text>
              <Text style={[ufcStyles.resultMethod, { color: getMethodColor(fight.result.method) }]}>
                {fight.result.method}
              </Text>
              {fight.result.round ? (
                <View style={[ufcStyles.resultDetailChip, { backgroundColor: sf.surfaceSecondary }]}>
                  <Text style={[ufcStyles.resultDetailText, { color: sf.textSecondary }]}>R{fight.result.round}</Text>
                </View>
              ) : null}
              {fight.result.time ? (
                <View style={[ufcStyles.resultDetailChip, { backgroundColor: sf.surfaceSecondary }]}>
                  <Clock size={9} color={sf.textMuted} />
                  <Text style={[ufcStyles.resultDetailText, { color: sf.textSecondary }]}>{fight.result.time}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {isUpcoming ? (
          <View style={[ufcStyles.upcomingScheduleStrip, { borderTopColor: sf.border }]}>
            <View style={[ufcStyles.schedulePill, { backgroundColor: sf.surfaceSecondary }]}>
              <Calendar size={13} color={sf.warning} />
              <Text style={[ufcStyles.schedulePillText, { color: sf.text }]}>
                {new Date(fight.date).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
            {fight.time?.trim() ? (
              <View style={[ufcStyles.schedulePill, { backgroundColor: sf.surfaceSecondary }]}>
                <Clock size={13} color={sf.primary} />
                <Text style={[ufcStyles.schedulePillText, { color: sf.text }]}>{fight.time.trim()}</Text>
              </View>
            ) : null}
            <View
              style={[
                ufcStyles.schedulePillEmphasis,
                { backgroundColor: `${sf.warning}12`, borderColor: `${sf.warning}30` },
              ]}
            >
              <Text style={[ufcStyles.schedulePillEmphasisText, { color: sf.warning }]}>{getDaysUntil()}</Text>
            </View>
          </View>
        ) : null}
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const EmptyState = React.memo(({ type }: { type: 'live' | 'upcoming' | 'results' }) => {
  const { colors } = useTheme();
  const { icon: Icon, bg, title, sub } = EMPTY_CONFIG[type];
  
  return (
    <View style={styles.emptyState}>
      <LinearGradient colors={bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyIconCircle}>
        <Icon size={28} color={colors.textInverse} strokeWidth={2} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{sub}</Text>
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
  /** `cover` hero PNGs crop sides on narrow screens — slight zoom-out preserves artwork. */
  const narrowHeroArtScale = useMemo(() => getSportsHeroImageScale(windowWidth), [windowWidth]);
  const { isFavoriteTeam, profile } = useUserProfile();
  const { user } = useAuth();
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
  const [contextFollowingTeamIds, setContextFollowingTeamIds] = useState<number[] | null>(null);
  const [contextTopLeagueIds, setContextTopLeagueIds] = useState<number[] | null>(null);
  const [showFootballContextSheet, setShowFootballContextSheet] = useState(false);
  const [footballSortMode, setFootballSortMode] = useState<'kickoff' | 'competition' | 'smart'>('smart');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showStandingsModal, setShowStandingsModal] = useState(false);
  const [selectedLeagueForStandings, setSelectedLeagueForStandings] = useState<{ id: number; name: string } | null>(null);
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
        } else if ((profile?.favoriteTeams?.length ?? 0) > 0) {
          setFootballSmartFilter('following');
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

  const nationalTeamApiIds = useMemo(() => {
    if (!profile?.nationalities) return [];
    return profile.nationalities
      .map(nation => nation.apiId)
      .filter((id): id is number => id !== undefined && id > 0);
  }, [profile?.nationalities]);

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

  // Self-heal: Following needs at least one followed club in the app.
  useEffect(() => {
    if (!preferencesLoaded) return;
    const hasFavoriteTeams = teamApiIds.length > 0;
    if (footballSmartFilter === 'following' && !hasFavoriteTeams) {
      setFootballSmartFilter('for-you');
    }
  }, [footballSmartFilter, preferencesLoaded, teamApiIds.length]);

  useEffect(() => {
    if (footballSmartFilter !== 'following' && footballSmartFilter !== 'top-leagues') {
      setShowFootballContextSheet(false);
    }
  }, [footballSmartFilter]);



  const profileFavoriteLeagueIds = useMemo(
    () => (profile?.favoriteLeagues ?? []).filter((id): id is number => typeof id === 'number' && id > 0),
    [profile?.favoriteLeagues],
  );

  const footballQueryContext = useMemo(
    () =>
      buildFootballQueryContext({
        smartFilter: footballSmartFilter,
        manualLeagueIds: selectedLeagues,
        contextTopLeagueIds,
        contextFollowingTeamIds,
        followedTeamApiIds: teamApiIds,
        strictFollowing: sportsFeedPrefs?.strictFollowing,
        favoriteLeagueIds: profileFavoriteLeagueIds,
        countryInterestNamesLower,
        prioritizeDomesticLeagues: sportsFeedPrefs?.prioritizeDomesticLeagues,
        includeFollowedLeagues: sportsFeedPrefs?.includeFollowedLeagues,
        discoveryLevel: sportsFeedPrefs?.discoveryLevel,
      }),
    [
      footballSmartFilter,
      selectedLeagues,
      contextTopLeagueIds,
      contextFollowingTeamIds,
      teamApiIds,
      sportsFeedPrefs?.strictFollowing,
      sportsFeedPrefs?.prioritizeDomesticLeagues,
      sportsFeedPrefs?.includeFollowedLeagues,
      sportsFeedPrefs?.discoveryLevel,
      profileFavoriteLeagueIds,
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

  const footballBundleQuery = trpc.football.getMatchesBundle.useQuery(
    {
      days: 14,
      teamIds: queryTeamIds,
      leagueIds: queryLeagueIds,
      nationalTeamIds: hasNationalTeams ? nationalTeamApiIds : undefined,
      includeAfcon: hasNationalTeams ? true : undefined,
      includeResults: includeResultsTab,
    },
    {
      enabled: sportMode === 'football',
      refetchInterval: activeTab === 'live' ? 60 * 1000 : false,
      staleTime: 45 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 5000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    }
  );

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

  const availableLeaguesForStandings = useMemo(() => {
    const allMatches = [...liveMatches, ...upcomingMatches, ...completedMatches];
    const leagueMap = new Map<number, { id: number; name: string; logo?: string; country: string }>();
    const leagueScore = new Map<number, number>();

    allMatches.forEach((m) => {
      if (!m.leagueId || m.leagueId <= 0) return;

      const leagueNameLower = m.league.toLowerCase();
      const isInternational =
        leagueNameLower.includes('world cup') ||
        leagueNameLower.includes('euro') ||
        leagueNameLower.includes('afcon') ||
        leagueNameLower.includes('copa america') ||
        leagueNameLower.includes('nations league') ||
        leagueNameLower.includes('friendly') ||
        leagueNameLower.includes('qualification');

      if (isInternational) return;

      if (!leagueMap.has(m.leagueId)) {
        leagueMap.set(m.leagueId, {
          id: m.leagueId,
          name: m.league,
          logo: m.leagueLogo,
          country: m.leagueCountry || '',
        });
      }

      let score = leagueScore.get(m.leagueId) ?? 0;
      if (selectedLeagues.includes(m.leagueId)) score += 8;
      if (selectedProfileLeagueIds.has(m.leagueId)) score += 6;
      if (
        (typeof m.homeTeamId === 'number' && favoriteTeamApiIdSet.has(m.homeTeamId)) ||
        (typeof m.awayTeamId === 'number' && favoriteTeamApiIdSet.has(m.awayTeamId))
      ) {
        score += 5;
      }
      const matchCountry = (m.leagueCountry || '').toLowerCase();
      if (countryInterestNamesLower.some((country) => matchCountry.includes(country))) {
        score += 3;
      }
      if (m.status === 'Live') score += 1;
      leagueScore.set(m.leagueId, score);
    });

    const leagues = Array.from(leagueMap.values());
    const TOP_LEAGUES = ['premier league', 'la liga', 'bundesliga', 'serie a', 'ligue 1', 'champions league', 'europa league'];
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
      AsyncStorage.setItem(scopedKey('sports_selected_leagues'), JSON.stringify(pruned)).catch(() => {});
    }
  }, [availableLeagueIds, selectedLeagues, preferencesLoaded, scopedKey]);

  const isFavoriteMatchByTeamId = useCallback((match: Match) => {
    if (favoriteTeamApiIdSet.size === 0) return false;
    if (typeof match.homeTeamId === 'number' && favoriteTeamApiIdSet.has(match.homeTeamId)) return true;
    if (typeof match.awayTeamId === 'number' && favoriteTeamApiIdSet.has(match.awayTeamId)) return true;
    return false;
  }, [favoriteTeamApiIdSet]);

  const nationalityCountryRegexes = useMemo(() => {
    return countryInterestNamesLower.map((country) => new RegExp(`\\b${escapeRegExp(country)}\\b`, 'i'));
  }, [countryInterestNamesLower]);

  const matchesNationalityCountry = useCallback((match: Match) => {
    if (nationalityCountryRegexes.length === 0 && nationalTeamApiIds.length === 0) return false;
    if (
      (typeof match.homeTeamId === 'number' && nationalTeamApiIds.includes(match.homeTeamId)) ||
      (typeof match.awayTeamId === 'number' && nationalTeamApiIds.includes(match.awayTeamId))
    ) {
      return true;
    }
    const normalizedCountry = match.leagueCountry?.trim() || '';
    if (!normalizedCountry) return false;
    return nationalityCountryRegexes.some((regex) => regex.test(normalizedCountry));
  }, [nationalityCountryRegexes, nationalTeamApiIds]);

  const pinFavorites = useCallback((matches: Match[]) => {
    const pinned: Match[] = [];
    const rest: Match[] = [];
    matches.forEach((m) => {
      if (isFavoriteMatchByTeamId(m)) {
        pinned.push(m);
      } else {
        rest.push(m);
      }
    });
    return [...pinned, ...rest];
  }, [isFavoriteMatchByTeamId]);

  const applyFootballFilters = useCallback(
    (matches: Match[]) =>
      applyFootballVisibilityRules(matches, {
        smartFilter: footballSmartFilter,
        manualLeagueIds: selectedLeagues,
        favoriteTeamIds: favoriteTeamApiIdSet,
      }),
    [footballSmartFilter, selectedLeagues, favoriteTeamApiIdSet],
  );

  const sortMatchesForDisplay = useCallback(
    (matches: Match[]) => {
      const arr = [...matches];
      const scoreForYou = (m: Match) => {
        let s = 0;
        if (isFavoriteMatchByTeamId(m)) s += 100;
        if (isMajorLeagueName(m.league)) s += 40;
        if (m.status === 'Live') s += 80;
        const h = hoursUntilMatchKickoff(m);
        if (h >= 0 && h < 2) s += 45;
        else if (h >= 0 && h < 6) s += 30;
        else if (h >= 0 && h < 24) s += 15;
        if (matchesNationalityCountry(m)) s += 20;
        if (selectedProfileLeagueIds.has(m.leagueId)) s += 25;
        if (selectedLeagues.includes(m.leagueId)) s += 20;
        return s;
      };

      if (footballSortMode === 'competition') {
        arr.sort((a, b) => {
          const c = a.league.localeCompare(b.league);
          if (c !== 0) return c;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        return arr;
      }
      if (footballSortMode === 'smart') {
        arr.sort((a, b) => scoreForYou(b) - scoreForYou(a));
        return arr;
      }
      arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return pinFavorites(arr);
    },
    [
      footballSortMode,
      isFavoriteMatchByTeamId,
      matchesNationalityCountry,
      selectedProfileLeagueIds,
      selectedLeagues,
      pinFavorites,
    ],
  );

  const filteredLiveMatches = useMemo(() => applyFootballFilters(liveMatches), [liveMatches, applyFootballFilters]);
  const filteredUpcomingMatches = useMemo(() => applyFootballFilters(upcomingMatches), [upcomingMatches, applyFootballFilters]);
  const filteredCompletedMatches = useMemo(() => applyFootballFilters(completedMatches), [completedMatches, applyFootballFilters]);
  const featuredUpcomingMatch = filteredUpcomingMatches[0] ?? null;
  const aiInsightMatch = filteredLiveMatches[0] ?? featuredUpcomingMatch;

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

  const leagueTopPlayersQuery = trpc.football.getLeagueTopPlayers.useQuery(
    { leagueId: trendingLeagueId, season: trendingSeason },
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

  const aiInsightData = useMemo(() => {
    if (!aiInsightMatch) return null;

    const isFav = isFavoriteMatchByTeamId(aiInsightMatch);
    const isCountryAligned = matchesNationalityCountry(aiInsightMatch);
    const isLeagueSelected = selectedLeagues.includes(aiInsightMatch.leagueId);
    const isLeagueProfileAligned = selectedProfileLeagueIds.has(aiInsightMatch.leagueId);
    const isLive = aiInsightMatch.status === 'Live';
    const hasScores = aiInsightMatch.homeScore !== null && aiInsightMatch.awayScore !== null;

    let score = 52;
    if (isLive) score += 12;
    if (isFav) score += 14;
    if (isCountryAligned) score += 8;
    if (isLeagueSelected) score += 8;
    if (isLeagueProfileAligned) score += 6;
    if (hasScores) score += 4;
    const confidence = Math.max(55, Math.min(95, score));

    const signalTokens: string[] = [];
    if (isFav) signalTokens.push('club');
    if (isLeagueSelected || isLeagueProfileAligned) signalTokens.push('league');
    if (isCountryAligned) signalTokens.push('country');
    if (isLive) signalTokens.push('live');
    if (hasScores) signalTokens.push('scoreline');
    const signalSuffix =
      signalTokens.length > 0 ? ` (${signalTokens.slice(0, 2).join(' + ')} signal)` : '';

    let summary = isLive
      ? `${aiInsightMatch.homeTeam} vs ${aiInsightMatch.awayTeam} is the best live spot right now${signalSuffix}.`
      : `${aiInsightMatch.homeTeam} vs ${aiInsightMatch.awayTeam} is the strongest next fixture${signalSuffix}.`;

    if (sportMode === 'football') {
      const hid =
        insightMatchDetailsQuery.data?.fixture?.teams?.home?.id ?? aiInsightMatch.homeTeamId;
      const aid =
        insightMatchDetailsQuery.data?.fixture?.teams?.away?.id ?? aiInsightMatch.awayTeamId;
      const rows = findHomeAwayInStandings(insightStandingsQuery.data?.response, hid, aid);
      if (rows) {
        const tableStakes = buildTablestakesSummary(
          aiInsightMatch.league,
          aiInsightMatch.homeTeam,
          aiInsightMatch.awayTeam,
          rows.home,
          rows.away,
        );
        // Keep this card fast to scan: one short line + one short stakes clause.
        const shortTableStakes =
          tableStakes.length > 118 ? `${tableStakes.slice(0, 115).trimEnd()}...` : tableStakes;
        summary = `${summary} ${shortTableStakes}`;
      }
    }

    const confidenceLabel =
      confidence >= 82 ? 'High confidence' : confidence >= 70 ? 'Medium confidence' : 'Early signal';

    return {
      summary,
      confidence,
      confidenceLabel,
    };
  }, [
    aiInsightMatch,
    isFavoriteMatchByTeamId,
    matchesNationalityCountry,
    selectedLeagues,
    selectedProfileLeagueIds,
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

    const pickScorer = () => {
      const forTeams = scorers.find(
        (r: (typeof scorers)[number]) =>
          r.teamId != null && (r.teamId === homeId || r.teamId === awayId)
      );
      return forTeams ?? scorers[0] ?? null;
    };
    const pickAssist = () => {
      const forTeams = assists.find(
        (r: (typeof assists)[number]) =>
          r.teamId != null && (r.teamId === homeId || r.teamId === awayId)
      );
      return forTeams ?? assists[0] ?? null;
    };

    return {
      formName,
      formLogo,
      formSub,
      topScorer: pickScorer(),
      topAssist: pickAssist(),
      leagueLabel: match.league,
    };
  }, [
    aiInsightMatch,
    insightMatchDetailsQuery.data,
    leagueTopPlayersQuery.data?.topScorers,
    leagueTopPlayersQuery.data?.topAssists,
    profile?.favoriteTeams,
  ]);

  useEffect(() => {
    setInsightCarouselIndex(0);
  }, [aiInsightMatch?.id]);

  const insightCarouselWidth = SCREEN_WIDTH - 40;

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
    return sortMatchesForDisplay(base);
  }, [
    activeTab,
    filteredLiveMatches,
    filteredUpcomingMatches,
    filteredCompletedMatches,
    sortMatchesForDisplay,
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
      return <DateHeader date={item.date} />;
    }
    const match = item.match;
    return (
      <PremiumSportsMatchCard
        match={match}
        isFavoriteTeam={isFavoriteTeam}
        isNotified={notifiedMatches.has(match.id)}
        onToggleNotification={toggleMatchNotification}
        isPinned={isFavoriteMatchByTeamId(match)}
        onPress={() => handleMatchCardPress(match)}
      />
    );
  }, [isFavoriteTeam, notifiedMatches, toggleMatchNotification, handleMatchCardPress, isFavoriteMatchByTeamId]);

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
      staleTime: 3 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
      refetchOnWindowFocus: false,
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

  /** Win counts from loaded results only — not official UFC rankings. */
  const ufcWinLeaderboard = useMemo(() => {
    const wins = new Map<string, { name: string; wins: number }>();
    const addWin = (name: string) => {
      const trimmed = name.trim();
      const key = trimmed.toLowerCase();
      if (!key || key === 'tba') return;
      const prev = wins.get(key);
      if (prev) prev.wins += 1;
      else wins.set(key, { name: trimmed, wins: 1 });
    };
    for (const f of ufcResultsFights) {
      if (f.fighter1.winner) addWin(f.fighter1.name);
      else if (f.fighter2.winner) addWin(f.fighter2.name);
    }
    return Array.from(wins.values()).sort((a, b) => b.wins - a.wins).slice(0, 20);
  }, [ufcResultsFights]);

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

  const isLoading =
    sportMode === 'football'
      ? footballBundleQuery.isLoading
      : sportMode === 'ufc'
        ? ufcUpcomingQuery.isPending || ufcResultsQuery.isPending
        : false;
  const hasAnyFootballData = (footballBundleQuery.data?.live?.response?.length ?? 0) > 0
    || (footballBundleQuery.data?.upcoming?.response?.length ?? 0) > 0
    || (footballBundleQuery.data?.results?.response?.length ?? 0) > 0;
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
  const allFootballErrored =
    footballBundleQuery.isFetched && footballBundleQuery.isError;
  const hasError = sportMode === 'football'
    ? (allFootballErrored && !isLoading && !hasAnyFootballData && !hasConfigError)
    : sportMode === 'ufc'
      ? ((ufcUpcomingQuery.isError && ufcResultsQuery.isError) && !isLoading)
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
      { key: 'upcoming', label: 'Upcoming', icon: Calendar, color: '#D4AF37' },
      { key: 'results', label: 'Results', icon: Trophy, color: '#34C759' },
    ],
    [],
  );

  const ufcCounts: Record<string, number> = {
    upcoming: ufcUpcomingFights.length,
    results: ufcResultsFights.length,
  };

  const footballHeroClubSlots = useMemo<FootballHeroFavoriteClub[]>(
    () =>
      (profile?.favoriteTeams?.slice(0, 4) ?? []).map((t) => ({
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
    const modeLabel =
      footballSmartFilter === 'for-you'
        ? 'For You'
        : footballSmartFilter === 'following'
          ? 'Following'
          : footballSmartFilter === 'top-leagues'
            ? 'Top leagues'
            : 'Worldwide';
    const sortLabel =
      footballSortMode === 'smart'
        ? 'Smart order'
        : footballSortMode === 'kickoff'
          ? 'Kickoff time'
          : 'Competition';
    const leagueHint = selectedLeagues.length > 0 ? ` · ${selectedLeagues.length} competition(s)` : '';
    return `${modeLabel} · ${sortLabel}${leagueHint}`;
  }, [footballSmartFilter, footballSortMode, selectedLeagues.length]);

  const followingContextLabel = useMemo(() => {
    const teams = profile?.favoriteTeams?.filter((t) => t.apiId && t.apiId > 0) ?? [];
    if (teams.length === 0) return 'Add clubs';
    const activeIds = contextFollowingTeamIds ?? teams.map((t) => t.apiId!);
    const ordered = teams.filter((t) => activeIds.includes(t.apiId!));
    const primary = ordered[0] ?? teams[0];
    const n = Math.max(0, ordered.length - 1);
    const label = shortTeamLabel(primary.name ?? 'Club');
    return n > 0 ? `${label} +${n}` : label;
  }, [profile?.favoriteTeams, contextFollowingTeamIds]);

  const topLeagueContextLabel = useMemo(() => {
    const ids = contextTopLeagueIds ?? TOP_LEAGUE_BUNDLE_IDS;
    if (ids.length === 0) return 'Competitions';
    const firstId = ids[0];
    const name = getCompetitionById(firstId)?.name ?? 'Competition';
    const short = name.replace(/^UEFA\s+/i, '').trim().slice(0, 24);
    const n = ids.length - 1;
    return n > 0 ? `${short} +${n}` : short;
  }, [contextTopLeagueIds]);

  const toggleFollowingContextTeam = useCallback(
    (id: number) => {
      if (teamApiIds.length === 0) return;
      const all = teamApiIds;
      const effective = contextFollowingTeamIds ?? [...all];
      const set = new Set(effective);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      const next = all.filter((tid) => set.has(tid));
      if (next.length === 0 || next.length === all.length) {
        setContextFollowingTeamIds(null);
      } else {
        setContextFollowingTeamIds(next);
      }
    },
    [teamApiIds, contextFollowingTeamIds],
  );

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
      <View style={styles.heroStackWithSportStrip}>
      <ImageBackground
        source={footballHeroUseDarkArt ? FOOTBALL_CHROME.stadiumDarkImage : FOOTBALL_CHROME.stadiumLightImage}
        style={[
          styles.headerGradient,
          styles.headerGradientFootballBleed,
          styles.stadiumHeroRoot,
          styles.stadiumHeroRootFootball,
          { paddingTop: insets.top, paddingBottom: 4 },
        ]}
        imageStyle={[styles.stadiumHeroImage, styles.stadiumHeroImageCropBottomFootball]}
      >
        <View
          style={[
            styles.stadiumHeroForeground,
            styles.ufcHeroContentWrap,
            styles.stadiumHeroForegroundFootballInset,
            { paddingHorizontal: sportsEdgePad },
          ]}
        >
          {sportsMainHeaderInner}
        </View>
      </ImageBackground>
      {sportStripOverlapSlot}
      </View>
      <View style={[styles.tabWrapperFootball, { paddingHorizontal: sportsEdgePad }]}>
        <TabPill
          variant="football"
          tabs={footballTabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as 'live' | 'upcoming' | 'results')}
          counts={counts}
        />
      </View>
      <View style={[styles.filterArea, { paddingHorizontal: sportsEdgePad }]}>
        <TouchableOpacity
          onPress={() => setShowFootballFilterPicker(true)}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
        >
          <Text style={[styles.footballSmartSectionLabel, { color: sf.textMuted }]}>Smart filters</Text>
        </TouchableOpacity>
        <View style={styles.footballSmartPillsRow}>
          {FOOTBALL_SMART_FILTER_OPTIONS.map((opt) => {
            const Icon = opt.Icon;
            const active = footballSmartFilter === opt.id;
            const disabled = opt.id === 'following' && teamApiIds.length === 0;
            return (
              <TouchableOpacity
                key={opt.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled }}
                disabled={disabled}
                activeOpacity={0.85}
                onPress={() => setFootballSmartFilter(opt.id)}
                style={[
                  styles.footballSmartPill,
                  {
                    backgroundColor: sf.surfaceSecondary,
                    borderColor: active ? `${fc.accent}88` : sf.border,
                    opacity: disabled ? 0.4 : 1,
                  },
                  active && { shadowColor: fc.accent, shadowOpacity: 0.35, shadowRadius: 10 },
                ]}
              >
                <Icon size={13} color={active ? fc.accent : sf.textSecondary} />
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
        {footballQueryContext.manualLeagueScopeActive ? (
          <Text style={[styles.footballFilterHintText, { color: sf.textMuted }]}>
            Manual league selection active
          </Text>
        ) : null}

        {(footballSmartFilter === 'following' || footballSmartFilter === 'top-leagues') ? (
          <View style={styles.footballContextRow}>
            {footballSmartFilter === 'following' ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowFootballContextSheet(true)}
                style={[styles.footballContextChip, { backgroundColor: sf.surfaceSecondary, borderColor: sf.border }]}
              >
                <Text style={[styles.footballContextChipTitle, { color: sf.text }]} numberOfLines={1}>
                  {followingContextLabel}
                </Text>
                <ChevronDown size={16} color={sf.textSecondary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowFootballContextSheet(true)}
                style={[styles.footballContextChip, { backgroundColor: sf.surfaceSecondary, borderColor: sf.border }]}
              >
                <Text style={[styles.footballContextChipTitle, { color: sf.text }]} numberOfLines={1}>
                  {topLeagueContextLabel}
                </Text>
                <ChevronDown size={16} color={sf.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
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
              size={22}
              color={availableLeaguesForStandings.length === 0 ? sf.textMuted : fc.accent}
              strokeWidth={2.4}
            />
          </View>
          <View style={styles.footballLeagueTablesTextCol}>
            <Text style={[styles.footballLeagueTablesTitle, { color: sf.text }]}>League tables & stats</Text>
            <Text style={[styles.footballLeagueTablesSub, { color: sf.textMuted }]} numberOfLines={1}>
              {availableLeaguesForStandings.length === 0
                ? 'Follow clubs or pick leagues to unlock standings'
                : `Table, scorers & assists · ${availableLeaguesForStandings.length} competition${
                    availableLeaguesForStandings.length === 1 ? '' : 's'
                  }`}
            </Text>
          </View>
          <ChevronRight
            size={20}
            color={availableLeaguesForStandings.length === 0 ? sf.textMuted : fc.accent}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>
      {sportMode === 'football' && aiInsightMatch && footballTrendingPreview ? (
        <View style={styles.insightCarouselShell}>
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
                    <Sparkles size={18} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.aiInsightTitleBlock}>
                    <Text style={[styles.aiLabel, { color: fc.accent }]}>ONE PAGER INSIGHT AI</Text>
                    <Text style={[styles.aiHeadline, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                      {aiInsightMatch.homeTeam} vs {aiInsightMatch.awayTeam}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.aiSub, { color: isDark ? '#9AB0A0' : '#5B6475' }]}>
                  {aiInsightData?.summary ??
                    (aiInsightMatch.status === 'Live'
                      ? 'Live now. Momentum is shifting — watch the next 10 minutes.'
                      : 'Upcoming fixture with strong engagement from your followed interests.')}
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
                      {aiInsightData.confidenceLabel} {aiInsightData.confidence}%
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
                        : 'League leaders'}
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
                        : 'League leaders'}
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
  const sportToggleGlassBorder =
    sportMode === 'ufc'
      ? UFC_BORDER
      : sportMode === 'nba'
        ? 'rgba(90, 141, 239, 0.30)'
        : sportMode === 'football'
          ? 'rgba(52, 209, 87, 0.28)'
          : 'rgba(255,255,255,0.12)';

  const sportToggleRow = useMemo(
    () => (
      <>
          {enabledSports.includes('football') && (
            <TouchableOpacity
              style={[
                sportToggleStyles.option,
                sportMode === 'football' && sportToggleStyles.optionFootballActive,
              ]}
              onPress={() => handleSportModeChange('football')}
              activeOpacity={0.7}
            >
              <View style={sportToggleStyles.optionInner}>
                <View style={sportToggleStyles.iconGlowWrap}>
                  <Trophy
                    size={15}
                    color={
                      sportMode === 'football'
                        ? '#FFFFFF'
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
                          ? '#FFFFFF'
                          : isDark
                            ? '#8E8E93'
                            : '#AEAEB2',
                    },
                    sportMode === 'football' && { fontWeight: '700' as const },
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
        {heroGlassSportStrip && Platform.OS !== 'web' ? (
          <View style={sportToggleStyles.trackShell}>
            <BlurView
              pointerEvents="none"
              intensity={isDark ? 52 : 78}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFillObject}
            />
            <View
              style={[
                sportToggleStyles.track,
                {
                  zIndex: 1,
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: sportToggleGlassBorder,
                  minHeight: 52,
                },
              ]}
            >
              {sportToggleRow}
            </View>
          </View>
        ) : (
          <View
            style={[
              sportToggleStyles.track,
              heroGlassSportStrip
                ? {
                    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
                    borderWidth: 1,
                    borderColor: sportToggleGlassBorder,
                    minHeight: 52,
                  }
                : {
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
      <View style={[styles.heroSportStripOverlapSlot, { paddingHorizontal: sportsEdgePad }]}>
        {sportModeToggleEl}
      </View>
    ) : null;

  const renderUfcChromeHeader = () => (
    <View>
      <View style={styles.heroStackWithSportStrip}>
        <ImageBackground
          source={UFC_HERO_IMAGE}
          style={[
            styles.headerGradient,
            styles.headerGradientFootballBleed,
            styles.stadiumHeroRoot,
            styles.stadiumHeroRootFootball,
            { paddingTop: insets.top, paddingBottom: 4 },
          ]}
          imageStyle={
            narrowHeroArtScale < 1
              ? [styles.ufcHeroBackgroundImage, { transform: [{ scale: narrowHeroArtScale }] }]
              : styles.ufcHeroBackgroundImage
          }
        >
          <View style={[styles.stadiumHeroForeground, styles.ufcHeroContentWrap]}>
            <View style={[styles.nonFootballHeroAnchor, { flex: 1, minHeight: 0 }]}>
              <View style={styles.ufcHeroTopFill} />
            </View>
          </View>
        </ImageBackground>
        {sportStripOverlapSlot}
      </View>
      <View style={[styles.tabWrapper, styles.tabWrapperUfc, { paddingHorizontal: sportsEdgePad }]}>
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

  const renderF1ChromeHeader = () => (
    <View style={styles.heroStackWithSportStrip}>
      <ImageBackground
        source={F1_HERO_IMAGE}
        style={[
          styles.headerGradient,
          styles.headerGradientFootballBleed,
          styles.stadiumHeroRoot,
          styles.stadiumHeroRootFootball,
          { paddingTop: insets.top, paddingBottom: 4 },
        ]}
        imageStyle={[
          styles.f1HeroBackgroundImage,
          {
            transform: [
              { translateY: -F1_HERO_BOTTOM_CROP_PX },
              ...(narrowHeroArtScale < 1 ? [{ scale: narrowHeroArtScale } as const] : []),
            ],
          },
        ]}
      >
        <View style={[styles.stadiumHeroForeground, styles.ufcHeroContentWrap]}>
          <View style={[styles.nonFootballHeroAnchor, { flex: 1, minHeight: 0 }]}>
            <View style={styles.ufcHeroTopFill} />
          </View>
        </View>
      </ImageBackground>
      {sportStripOverlapSlot}
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
                setFootballSmartFilter('following');
                setActiveTab('upcoming');
              }}
              onFeaturedPress={() => {
                if (featuredUpcomingMatch) handleMatchCardPress(featuredUpcomingMatch);
              }}
              onAddClub={() => router.push('/(tabs)/profile' as any)}
            />
          </View>
        </View>
      ) : sportMode === 'f1' || sportMode === 'ufc' ? (
        <View style={[styles.nonFootballHeroAnchor, { flex: 1, minHeight: 0 }]}>
          <View style={styles.ufcHeroTopFill} />
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
          <View style={styles.heroStackWithSportStrip}>
            <LinearGradient
              colors={getSportsMainHeaderGradient(sportMode, isDark)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.headerGradient,
                styles.stadiumHeroRoot,
                styles.stadiumHeroRootFootball,
                { paddingTop: insets.top, paddingBottom: 4, paddingHorizontal: sportsEdgePad },
              ]}
            >
              <View style={[styles.stadiumHeroForeground, styles.ufcHeroContentWrap]}>
                {sportsMainHeaderInner}
              </View>
            </LinearGradient>
            {sportStripOverlapSlot}
          </View>
        </Animated.View>
      )}

      {sportMode === 'football' &&
      !hasTeams &&
      !hasAnyFootballData &&
      !isLoading &&
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
        isLoading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingPulse}>
              <ActivityIndicator size="large" color={UFC_RED} />
            </View>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading fights...</Text>
          </View>
        ) : hasConfigError ? (
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
              ufcTab={ufcTab}
              fightsCount={ufcDisplayFights.length}
              eventsCount={ufcGroupedByEvent.length}
              koTkoCount={
                ufcTab === 'results'
                  ? ufcDisplayFights.filter(f => /ko|tko/i.test(f.result?.method || '')).length
                  : 0
              }
              subCount={
                ufcTab === 'results'
                  ? ufcDisplayFights.filter(f => /sub/i.test(f.result?.method || '')).length
                  : 0
              }
              leaderboard={ufcWinLeaderboard}
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
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
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
              ListHeaderComponent={
                <View>
                  {renderUfcChromeHeader()}
                  <UFCStatsRow
                    ufcTab={ufcTab}
                    fightsCount={ufcDisplayFights.length}
                    eventsCount={ufcGroupedByEvent.length}
                    koTkoCount={
                      ufcTab === 'results'
                        ? ufcDisplayFights.filter(f => /ko|tko/i.test(f.result?.method || '')).length
                        : 0
                    }
                    subCount={
                      ufcTab === 'results'
                        ? ufcDisplayFights.filter(f => /sub/i.test(f.result?.method || '')).length
                        : 0
                    }
                  />
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
              }
              initialNumToRender={6}
              maxToRenderPerBatch={4}
              windowSize={5}
              removeClippedSubviews={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UFC_RED} colors={[UFC_RED]} />
              }
              ListEmptyComponent={
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
              }
            />
          </View>
        )
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingPulse}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading matches...</Text>
        </View>
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
      ) : sportMode === 'football' && displayMatches.length === 0 && !isLoading ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {renderFootballHeader()}
          <EmptyState type={activeTab} />
        </ScrollView>
      ) : sportMode === 'football' && !isLoading ? (
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
        <F1Section isDark={isDark} insets={insets} stackHeader={renderF1ChromeHeader()} />
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
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Football Filters</Text>
              <TouchableOpacity onPress={() => setShowFootballFilterPicker(false)} style={styles.pickerClose}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.unifiedFilterSectionTitle, { color: colors.textSecondary }]}>Sort</Text>
              <Text style={[styles.refineModalHint, { color: colors.textMuted }]}>
                {footballFilterSummary}
              </Text>
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
                Saved competitions
              </Text>
              <View style={styles.competitionQuickFilterWrap}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedLeagues([])}
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
                      onPress={() => setSelectedLeagues([competition.id])}
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
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                {footballSmartFilter === 'following' ? 'Followed clubs' : 'Top competitions'}
              </Text>
              <TouchableOpacity onPress={() => setShowFootballContextSheet(false)} style={styles.pickerClose}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {footballSmartFilter === 'following'
                ? (profile?.favoriteTeams ?? [])
                    .filter((t) => t.apiId && t.apiId > 0)
                    .map((team) => {
                      const effective = contextFollowingTeamIds ?? teamApiIds;
                      const selected = effective.includes(team.apiId!);
                      return (
                        <TouchableOpacity
                          key={String(team.id ?? team.apiId)}
                          style={[styles.footballContextSheetRow, { borderBottomColor: colors.border }]}
                          activeOpacity={0.75}
                          onPress={() => toggleFollowingContextTeam(team.apiId!)}
                        >
                          {team.logo ? (
                            <Image
                              source={{ uri: team.logo }}
                              style={styles.footballContextLogo}
                              resizeMode="contain"
                            />
                          ) : (
                            <View
                              style={[styles.footballContextLogo, { backgroundColor: colors.surfaceSecondary }]}
                            />
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: '700' }}>{team.name}</Text>
                          </View>
                          {selected ? <CheckCircle2 size={20} color={fc.accent} /> : null}
                        </TouchableOpacity>
                      );
                    })
                : TOP_LEAGUE_BUNDLE_IDS.map((leagueId) => {
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
                  onPress={() => {
                    if (footballSmartFilter === 'following') setContextFollowingTeamIds(null);
                    else setContextTopLeagueIds(null);
                  }}
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
                  {league.logo ? (
                    <Image source={{ uri: league.logo }} style={styles.pickerLogo} resizeMode="contain" />
                  ) : (
                    <View style={[styles.pickerLogoFallback, { backgroundColor: colors.surfaceSecondary }]}>
                      <Trophy size={16} color={colors.textMuted} />
                    </View>
                  )}
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
  heroStackWithSportStrip: {
    position: 'relative' as const,
    zIndex: 1,
  },
  heroSportStripOverlapSlot: {
    marginTop: -HERO_SPORT_STRIP_OVERLAP_HERO_PX,
    paddingHorizontal: 20,
    zIndex: 20,
    elevation: 12,
  },
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
  /** Column shell: flex upper slot + sport-mode strip so the strip sits on the same baseline as other sports (`stadiumHeroRootFootball` minHeight). */
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
  ufcHeroBackgroundImage: {
    resizeMode: 'cover' as const,
  },
  /** F1 hero — full-bleed art; bottom crop ~3% of tall hero min height. */
  f1HeroBackgroundImage: {
    resizeMode: 'cover' as const,
  },
  ufcHeroContentWrap: {
    flex: 1,
    position: 'relative' as const,
    zIndex: 1,
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
    minHeight: FOOTBALL_HERO_MIN_HEIGHT_PX,
    justifyContent: 'flex-start' as const,
  },
  stadiumHeroImage: {
    resizeMode: 'cover' as const,
  },
  /** Shift cover image up ~4% of football hero min height; parent `overflow: hidden` clips the bottom. */
  stadiumHeroImageCropBottomFootball: {
    transform: [{ translateY: -FOOTBALL_HERO_BOTTOM_CROP_PX }],
  },
  stadiumHeroForeground: {
    position: 'relative' as const,
    zIndex: 1,
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
    paddingHorizontal: 20,
    marginTop: 0,
    marginBottom: 12,
    zIndex: 12,
    elevation: 6,
  },
  tabWrapperFootball: {
    paddingHorizontal: 20,
    marginTop: HERO_SECONDARY_GAP_BELOW_SPORT_STRIP,
    marginBottom: 12,
    zIndex: 12,
    elevation: 6,
  },
  tabWrapperUfc: {
    marginTop: HERO_SECONDARY_GAP_BELOW_SPORT_STRIP,
    marginBottom: 8,
    paddingHorizontal: 16,
    zIndex: 12,
    elevation: 6,
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
    paddingHorizontal: 20,
  },
  footballSmartSectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  },
  footballSmartPillsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'nowrap' as const,
    gap: 8,
    marginBottom: 12,
  },
  footballFilterHintText: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: -6,
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  footballSmartPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  footballSmartPillText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  footballContextRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  footballContextChip: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  footballContextChipTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  footballLeagueTablesCta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 2,
  },
  footballLeagueTablesIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  footballLeagueTablesTextCol: {
    flex: 1,
    minWidth: 0,
  },
  footballLeagueTablesTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: -0.35,
  },
  footballLeagueTablesSub: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 3,
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
    marginHorizontal: 20,
    marginBottom: 12,
  },
  insightCarouselPage: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden' as const,
    minHeight: 148,
  },
  aiInsightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiInsightOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInsightTitleBlock: {
    flex: 1,
  },
  trendingCardInner: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden' as const,
    minHeight: 148,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  trendingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  trendingNowLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  trendingMatchContext: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(226,232,240,0.72)',
    marginBottom: 10,
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
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 8,
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
    gap: 6,
    marginTop: 8,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(100,116,139,0.45)',
  },
  aiLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  aiHeadline: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  aiSub: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  aiConfidencePill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  aiConfidenceText: {
    fontSize: 11,
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
    gap: 10,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
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
  /** Shell for BlurView + hairline (F1 / UFC hero strip). */
  trackShell: {
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative' as const,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
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
  /** Solid pill on glass strip — forest green on busy pitch/blur reads poorly without this. */
  optionFootballActive: {
    backgroundColor: '#15803D',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
        shadowRadius: 5,
      },
      android: { elevation: 3 },
    }),
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

const UFCStatsRow = React.memo(({
  ufcTab,
  fightsCount,
  eventsCount,
  koTkoCount,
  subCount,
}: {
  ufcTab: 'upcoming' | 'results';
  fightsCount: number;
  eventsCount: number;
  koTkoCount: number;
  subCount: number;
}) => {
  const stats =
    ufcTab === 'results'
      ? [
          { label: 'RESULTS', value: fightsCount, active: true },
          { label: 'EVENTS', value: eventsCount, active: false },
          { label: 'KO/TKO', value: koTkoCount, active: false },
          { label: 'SUB', value: subCount, active: false },
        ]
      : [
          { label: 'FIGHTS', value: fightsCount, active: true },
          { label: 'EVENTS', value: eventsCount, active: false },
          { label: 'CARDS', value: eventsCount, active: false },
          { label: 'NEXT', value: fightsCount > 0 ? 1 : 0, active: false },
        ];
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
    ufcTab,
    fightsCount,
    eventsCount,
    koTkoCount,
    subCount,
    leaderboard,
    onBack,
  }: {
    ufcTab: 'upcoming' | 'results';
    fightsCount: number;
    eventsCount: number;
    koTkoCount: number;
    subCount: number;
    leaderboard: { name: string; wins: number }[];
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

        <UFCStatsRow
          ufcTab={ufcTab}
          fightsCount={fightsCount}
          eventsCount={eventsCount}
          koTkoCount={koTkoCount}
          subCount={subCount}
        />

        <View style={[ufcStyles.sectionHeaderRow, { marginTop: 8 }]}>
          <Text style={ufcStyles.sectionHeaderTitle}>Win leaders</Text>
        </View>
        <Text style={ufcStyles.statsRankingsDisclaimer}>
          In-app win counts from your loaded results feed — not official UFC rankings.
        </Text>

        {leaderboard.length === 0 ? (
          <Text style={ufcStyles.statsRankingsEmpty}>
            No finished bouts with a recorded winner yet. Switch to Results or pull to refresh.
          </Text>
        ) : (
          <View style={ufcStyles.statsRankingsList}>
            {leaderboard.map((row, idx) => (
              <View
                key={`${row.name}-${idx}`}
                style={[ufcStyles.rankRow, idx === leaderboard.length - 1 && ufcStyles.rankRowLast]}
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
  }
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
    overflow: 'hidden' as const,
    position: 'relative' as const,
    shadowColor: '#C9A227',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 6,
  },
  eventBannerAccentBar: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#C9A227',
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
    backgroundColor: 'rgba(201, 162, 39, 0.08)',
  },
  eventBannerBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#C9A227',
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
    borderColor: 'rgba(201, 162, 39, 0.14)',
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
    borderColor: 'rgba(201, 162, 39, 0.11)',
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
    marginLeft: 'auto',
  },
  schedulePillEmphasisText: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
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
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  countdownAvatarImg: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  countdownAvatarInitial: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#D4AF37',
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
    justifyContent: 'center',
    gap: 10,
    marginTop: 2,
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
