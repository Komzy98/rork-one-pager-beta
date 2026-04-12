export interface NBAPlayer {
  id: string;
  name: string;
  position: string;
  jersey?: string;
  image?: string;
}

export interface NBALineups {
  home: NBAPlayer[];
  away: NBAPlayer[];
}

export interface NBAGame {
  id: number;
  date: string;
  status: 'upcoming' | 'completed' | 'live';
  season: string;
  arena: string;
  city: string;
  broadcast?: string;
  series?: string;
  team1: {
    name: string;
    abbreviation: string;
    conference: string;
    record?: string;
    score?: number;
    logo?: string;
    winner?: boolean;
  };
  team2: {
    name: string;
    abbreviation: string;
    conference: string;
    record?: string;
    score?: number;
    logo?: string;
    winner?: boolean;
  };
  quarter?: number;
  timeRemaining?: string;
  highlights?: string;
  highlightPlayer?: {
    name: string;
    image: string;
  };
  startTime?: string;
  lineups?: NBALineups;
}

export interface NBATeamStanding {
  id: string;
  name: string;
  abbreviation: string;
  conference: 'Eastern' | 'Western';
  wins: number;
  losses: number;
  pct: string;
  streak: string;
  last10: string;
}

export const NBA_EASTERN_STANDINGS: NBATeamStanding[] = [
  { id: 'cle', name: 'Cleveland Cavaliers', abbreviation: 'CLE', conference: 'Eastern', wins: 64, losses: 18, pct: '.780', streak: 'W3', last10: '8-2' },
  { id: 'bos', name: 'Boston Celtics', abbreviation: 'BOS', conference: 'Eastern', wins: 61, losses: 21, pct: '.744', streak: 'W5', last10: '7-3' },
  { id: 'nyk', name: 'New York Knicks', abbreviation: 'NYK', conference: 'Eastern', wins: 55, losses: 27, pct: '.671', streak: 'L1', last10: '6-4' },
  { id: 'ind', name: 'Indiana Pacers', abbreviation: 'IND', conference: 'Eastern', wins: 50, losses: 32, pct: '.610', streak: 'W2', last10: '7-3' },
  { id: 'mil', name: 'Milwaukee Bucks', abbreviation: 'MIL', conference: 'Eastern', wins: 48, losses: 34, pct: '.585', streak: 'W1', last10: '5-5' },
  { id: 'det', name: 'Detroit Pistons', abbreviation: 'DET', conference: 'Eastern', wins: 44, losses: 38, pct: '.537', streak: 'L2', last10: '4-6' },
  { id: 'orl', name: 'Orlando Magic', abbreviation: 'ORL', conference: 'Eastern', wins: 42, losses: 40, pct: '.512', streak: 'W1', last10: '5-5' },
  { id: 'mia', name: 'Miami Heat', abbreviation: 'MIA', conference: 'Eastern', wins: 40, losses: 42, pct: '.488', streak: 'L3', last10: '4-6' },
];

export const NBA_WESTERN_STANDINGS: NBATeamStanding[] = [
  { id: 'okc', name: 'Oklahoma City Thunder', abbreviation: 'OKC', conference: 'Western', wins: 68, losses: 14, pct: '.829', streak: 'W7', last10: '9-1' },
  { id: 'hou', name: 'Houston Rockets', abbreviation: 'HOU', conference: 'Western', wins: 52, losses: 30, pct: '.634', streak: 'W2', last10: '6-4' },
  { id: 'lac', name: 'LA Clippers', abbreviation: 'LAC', conference: 'Western', wins: 50, losses: 32, pct: '.610', streak: 'L1', last10: '7-3' },
  { id: 'lal', name: 'Los Angeles Lakers', abbreviation: 'LAL', conference: 'Western', wins: 50, losses: 32, pct: '.610', streak: 'W3', last10: '6-4' },
  { id: 'den', name: 'Denver Nuggets', abbreviation: 'DEN', conference: 'Western', wins: 50, losses: 32, pct: '.610', streak: 'W1', last10: '5-5' },
  { id: 'min', name: 'Minnesota Timberwolves', abbreviation: 'MIN', conference: 'Western', wins: 49, losses: 33, pct: '.598', streak: 'L1', last10: '6-4' },
  { id: 'gsw', name: 'Golden State Warriors', abbreviation: 'GSW', conference: 'Western', wins: 46, losses: 36, pct: '.561', streak: 'W2', last10: '5-5' },
  { id: 'mem', name: 'Memphis Grizzlies', abbreviation: 'MEM', conference: 'Western', wins: 45, losses: 37, pct: '.549', streak: 'L2', last10: '4-6' },
];

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function pastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export const NBA_UPCOMING_GAMES: NBAGame[] = [
  {
    id: 3000,
    date: futureDate(0),
    status: 'upcoming',
    season: '2025-26 Playoffs R1',
    arena: 'Rocket Mortgage FieldHouse',
    city: 'Cleveland',
    broadcast: 'ESPN',
    series: 'CLE leads 1-0',
    team1: {
      name: 'Cleveland Cavaliers',
      abbreviation: 'CLE',
      conference: 'Eastern',
      record: '64-18',
    },
    team2: {
      name: 'Miami Heat',
      abbreviation: 'MIA',
      conference: 'Eastern',
      record: '40-42',
    },
  },
  {
    id: 3001,
    date: futureDate(0),
    status: 'upcoming',
    season: '2025-26 Playoffs R1',
    arena: 'TD Garden',
    city: 'Boston',
    broadcast: 'TNT',
    series: 'Series tied 1-1',
    team1: {
      name: 'Boston Celtics',
      abbreviation: 'BOS',
      conference: 'Eastern',
      record: '61-21',
    },
    team2: {
      name: 'Orlando Magic',
      abbreviation: 'ORL',
      conference: 'Eastern',
      record: '42-40',
    },
  },
  {
    id: 3002,
    date: futureDate(1),
    status: 'upcoming',
    season: '2025-26 Playoffs R1',
    arena: 'Paycom Center',
    city: 'Oklahoma City',
    broadcast: 'ABC',
    series: 'OKC leads 2-0',
    team1: {
      name: 'Oklahoma City Thunder',
      abbreviation: 'OKC',
      conference: 'Western',
      record: '68-14',
    },
    team2: {
      name: 'Memphis Grizzlies',
      abbreviation: 'MEM',
      conference: 'Western',
      record: '45-37',
    },
  },
  {
    id: 3003,
    date: futureDate(1),
    status: 'upcoming',
    season: '2025-26 Playoffs R1',
    arena: 'Madison Square Garden',
    city: 'New York',
    broadcast: 'ESPN',
    series: 'NYK leads 2-1',
    team1: {
      name: 'New York Knicks',
      abbreviation: 'NYK',
      conference: 'Eastern',
      record: '55-27',
    },
    team2: {
      name: 'Detroit Pistons',
      abbreviation: 'DET',
      conference: 'Eastern',
      record: '44-38',
    },
  },
  {
    id: 3004,
    date: futureDate(2),
    status: 'upcoming',
    season: '2025-26 Playoffs R1',
    arena: 'Crypto.com Arena',
    city: 'Los Angeles',
    broadcast: 'TNT',
    series: 'Series tied 1-1',
    team1: {
      name: 'Los Angeles Lakers',
      abbreviation: 'LAL',
      conference: 'Western',
      record: '50-32',
    },
    team2: {
      name: 'Golden State Warriors',
      abbreviation: 'GSW',
      conference: 'Western',
      record: '46-36',
    },
  },
  {
    id: 3005,
    date: futureDate(3),
    status: 'upcoming',
    season: '2025-26 Playoffs R1',
    arena: 'Toyota Center',
    city: 'Houston',
    broadcast: 'ABC',
    series: 'HOU leads 2-0',
    team1: {
      name: 'Houston Rockets',
      abbreviation: 'HOU',
      conference: 'Western',
      record: '52-30',
    },
    team2: {
      name: 'Minnesota Timberwolves',
      abbreviation: 'MIN',
      conference: 'Western',
      record: '49-33',
    },
  },
  {
    id: 3006,
    date: futureDate(4),
    status: 'upcoming',
    season: '2025-26 Playoffs R1',
    arena: 'Gainbridge Fieldhouse',
    city: 'Indianapolis',
    broadcast: 'ESPN',
    series: 'IND leads 2-1',
    team1: {
      name: 'Indiana Pacers',
      abbreviation: 'IND',
      conference: 'Eastern',
      record: '50-32',
    },
    team2: {
      name: 'Milwaukee Bucks',
      abbreviation: 'MIL',
      conference: 'Eastern',
      record: '48-34',
    },
  },
];

export const NBA_COMPLETED_GAMES: NBAGame[] = [
  {
    id: 4001,
    date: pastDate(1),
    status: 'completed',
    season: '2025-26 Playoffs R1',
    arena: 'Rocket Mortgage FieldHouse',
    city: 'Cleveland',
    broadcast: 'ESPN',
    series: 'Game 1',
    team1: {
      name: 'Cleveland Cavaliers',
      abbreviation: 'CLE',
      conference: 'Eastern',
      record: '64-18',
      score: 118,
      winner: true,
    },
    team2: {
      name: 'Miami Heat',
      abbreviation: 'MIA',
      conference: 'Eastern',
      record: '40-42',
      score: 95,
      winner: false,
    },
    highlights: 'Donovan Mitchell: 35 PTS, 8 AST',
    highlightPlayer: {
      name: 'Donovan Mitchell',
      image: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/3468.png&w=350&h=254',
    },
  },
  {
    id: 4002,
    date: pastDate(1),
    status: 'completed',
    season: '2025-26 Playoffs R1',
    arena: 'Paycom Center',
    city: 'Oklahoma City',
    broadcast: 'TNT',
    series: 'Game 2',
    team1: {
      name: 'Oklahoma City Thunder',
      abbreviation: 'OKC',
      conference: 'Western',
      record: '68-14',
      score: 132,
      winner: true,
    },
    team2: {
      name: 'Memphis Grizzlies',
      abbreviation: 'MEM',
      conference: 'Western',
      record: '45-37',
      score: 110,
      winner: false,
    },
    highlights: 'Shai Gilgeous-Alexander: 42 PTS, 6 REB',
    highlightPlayer: {
      name: 'Shai Gilgeous-Alexander',
      image: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/4278104.png&w=350&h=254',
    },
  },
  {
    id: 4003,
    date: pastDate(2),
    status: 'completed',
    season: '2025-26 Playoffs R1',
    arena: 'TD Garden',
    city: 'Boston',
    broadcast: 'ABC',
    series: 'Game 2',
    team1: {
      name: 'Boston Celtics',
      abbreviation: 'BOS',
      conference: 'Eastern',
      record: '61-21',
      score: 104,
      winner: false,
    },
    team2: {
      name: 'Orlando Magic',
      abbreviation: 'ORL',
      conference: 'Eastern',
      record: '42-40',
      score: 108,
      winner: true,
    },
    highlights: 'Paolo Banchero: 28 PTS, 10 REB',
    highlightPlayer: {
      name: 'Paolo Banchero',
      image: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/4706013.png&w=350&h=254',
    },
  },
  {
    id: 4004,
    date: pastDate(2),
    status: 'completed',
    season: '2025-26 Playoffs R1',
    arena: 'Madison Square Garden',
    city: 'New York',
    broadcast: 'ESPN',
    series: 'Game 3',
    team1: {
      name: 'New York Knicks',
      abbreviation: 'NYK',
      conference: 'Eastern',
      record: '55-27',
      score: 121,
      winner: true,
    },
    team2: {
      name: 'Detroit Pistons',
      abbreviation: 'DET',
      conference: 'Eastern',
      record: '44-38',
      score: 102,
      winner: false,
    },
    highlights: 'Jalen Brunson: 38 PTS, 12 AST',
    highlightPlayer: {
      name: 'Jalen Brunson',
      image: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/3934672.png&w=350&h=254',
    },
  },
  {
    id: 4005,
    date: pastDate(3),
    status: 'completed',
    season: '2025-26 Playoffs R1',
    arena: 'Crypto.com Arena',
    city: 'Los Angeles',
    broadcast: 'TNT',
    series: 'Game 2',
    team1: {
      name: 'Los Angeles Lakers',
      abbreviation: 'LAL',
      conference: 'Western',
      record: '50-32',
      score: 115,
      winner: true,
    },
    team2: {
      name: 'Golden State Warriors',
      abbreviation: 'GSW',
      conference: 'Western',
      record: '46-36',
      score: 112,
      winner: false,
    },
    highlights: 'LeBron James: 30 PTS, 9 REB, 7 AST',
    highlightPlayer: {
      name: 'LeBron James',
      image: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/1966.png&w=350&h=254',
    },
  },
  {
    id: 4006,
    date: pastDate(4),
    status: 'completed',
    season: '2025-26 Playoffs R1',
    arena: 'Gainbridge Fieldhouse',
    city: 'Indianapolis',
    broadcast: 'ABC',
    series: 'Game 2',
    team1: {
      name: 'Indiana Pacers',
      abbreviation: 'IND',
      conference: 'Eastern',
      record: '50-32',
      score: 126,
      winner: true,
    },
    team2: {
      name: 'Milwaukee Bucks',
      abbreviation: 'MIL',
      conference: 'Eastern',
      record: '48-34',
      score: 119,
      winner: false,
    },
    highlights: 'Tyrese Haliburton: 29 PTS, 14 AST',
    highlightPlayer: {
      name: 'Tyrese Haliburton',
      image: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/4433218.png&w=350&h=254',
    },
  },
];

export function getNextGame(): NBAGame | null {
  const now = new Date().getTime();
  const upcoming = NBA_UPCOMING_GAMES
    .filter(g => new Date(g.date).getTime() > now - 86400000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming[0] || null;
}

export function getUpcomingGames(): NBAGame[] {
  const now = new Date().getTime();
  return NBA_UPCOMING_GAMES
    .filter(g => new Date(g.date).getTime() > now - 86400000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getCompletedGames(): NBAGame[] {
  return NBA_COMPLETED_GAMES
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getTeamLogo(abbreviation: string): string {
  const logos: Record<string, string> = {
    ATL: 'https://a.espncdn.com/i/teamlogos/nba/500/atl.png',
    BOS: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png',
    BKN: 'https://a.espncdn.com/i/teamlogos/nba/500/bkn.png',
    CHA: 'https://a.espncdn.com/i/teamlogos/nba/500/cha.png',
    CHI: 'https://a.espncdn.com/i/teamlogos/nba/500/chi.png',
    CLE: 'https://a.espncdn.com/i/teamlogos/nba/500/cle.png',
    DAL: 'https://a.espncdn.com/i/teamlogos/nba/500/dal.png',
    DEN: 'https://a.espncdn.com/i/teamlogos/nba/500/den.png',
    DET: 'https://a.espncdn.com/i/teamlogos/nba/500/det.png',
    GSW: 'https://a.espncdn.com/i/teamlogos/nba/500/gs.png',
    HOU: 'https://a.espncdn.com/i/teamlogos/nba/500/hou.png',
    IND: 'https://a.espncdn.com/i/teamlogos/nba/500/ind.png',
    LAC: 'https://a.espncdn.com/i/teamlogos/nba/500/lac.png',
    LAL: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png',
    MEM: 'https://a.espncdn.com/i/teamlogos/nba/500/mem.png',
    MIA: 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png',
    MIL: 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png',
    MIN: 'https://a.espncdn.com/i/teamlogos/nba/500/min.png',
    NOP: 'https://a.espncdn.com/i/teamlogos/nba/500/no.png',
    NYK: 'https://a.espncdn.com/i/teamlogos/nba/500/ny.png',
    OKC: 'https://a.espncdn.com/i/teamlogos/nba/500/okc.png',
    ORL: 'https://a.espncdn.com/i/teamlogos/nba/500/orl.png',
    PHI: 'https://a.espncdn.com/i/teamlogos/nba/500/phi.png',
    PHX: 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png',
    POR: 'https://a.espncdn.com/i/teamlogos/nba/500/por.png',
    SAC: 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png',
    SAS: 'https://a.espncdn.com/i/teamlogos/nba/500/sa.png',
    TOR: 'https://a.espncdn.com/i/teamlogos/nba/500/tor.png',
    UTA: 'https://a.espncdn.com/i/teamlogos/nba/500/uta.png',
    WAS: 'https://a.espncdn.com/i/teamlogos/nba/500/wsh.png',
  };
  return logos[abbreviation] || `https://a.espncdn.com/i/teamlogos/nba/500/${abbreviation.toLowerCase()}.png`;
}

export interface NBATeamInfo {
  id: string;
  name: string;
  abbreviation: string;
  conference: 'Eastern' | 'Western';
  logo: string;
  color: string;
}

export const ALL_NBA_TEAMS: NBATeamInfo[] = [
  { id: 'atl', name: 'Atlanta Hawks', abbreviation: 'ATL', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/atl.png', color: '#E03A3E' },
  { id: 'bos', name: 'Boston Celtics', abbreviation: 'BOS', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png', color: '#007A33' },
  { id: 'bkn', name: 'Brooklyn Nets', abbreviation: 'BKN', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bkn.png', color: '#000000' },
  { id: 'cha', name: 'Charlotte Hornets', abbreviation: 'CHA', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/cha.png', color: '#1D1160' },
  { id: 'chi', name: 'Chicago Bulls', abbreviation: 'CHI', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/chi.png', color: '#CE1141' },
  { id: 'cle', name: 'Cleveland Cavaliers', abbreviation: 'CLE', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/cle.png', color: '#860038' },
  { id: 'dal', name: 'Dallas Mavericks', abbreviation: 'DAL', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/dal.png', color: '#00538C' },
  { id: 'den', name: 'Denver Nuggets', abbreviation: 'DEN', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/den.png', color: '#0E2240' },
  { id: 'det', name: 'Detroit Pistons', abbreviation: 'DET', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/det.png', color: '#C8102E' },
  { id: 'gsw', name: 'Golden State Warriors', abbreviation: 'GSW', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/gs.png', color: '#1D428A' },
  { id: 'hou', name: 'Houston Rockets', abbreviation: 'HOU', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/hou.png', color: '#CE1141' },
  { id: 'ind', name: 'Indiana Pacers', abbreviation: 'IND', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ind.png', color: '#002D62' },
  { id: 'lac', name: 'LA Clippers', abbreviation: 'LAC', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lac.png', color: '#C8102E' },
  { id: 'lal', name: 'Los Angeles Lakers', abbreviation: 'LAL', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png', color: '#552583' },
  { id: 'mem', name: 'Memphis Grizzlies', abbreviation: 'MEM', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mem.png', color: '#5D76A9' },
  { id: 'mia', name: 'Miami Heat', abbreviation: 'MIA', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png', color: '#98002E' },
  { id: 'mil', name: 'Milwaukee Bucks', abbreviation: 'MIL', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png', color: '#00471B' },
  { id: 'min', name: 'Minnesota Timberwolves', abbreviation: 'MIN', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/min.png', color: '#0C2340' },
  { id: 'nop', name: 'New Orleans Pelicans', abbreviation: 'NOP', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/no.png', color: '#0C2340' },
  { id: 'nyk', name: 'New York Knicks', abbreviation: 'NYK', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ny.png', color: '#006BB6' },
  { id: 'okc', name: 'Oklahoma City Thunder', abbreviation: 'OKC', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/okc.png', color: '#007AC1' },
  { id: 'orl', name: 'Orlando Magic', abbreviation: 'ORL', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/orl.png', color: '#0077C0' },
  { id: 'phi', name: 'Philadelphia 76ers', abbreviation: 'PHI', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phi.png', color: '#006BB6' },
  { id: 'phx', name: 'Phoenix Suns', abbreviation: 'PHX', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png', color: '#1D1160' },
  { id: 'por', name: 'Portland Trail Blazers', abbreviation: 'POR', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/por.png', color: '#E03A3E' },
  { id: 'sac', name: 'Sacramento Kings', abbreviation: 'SAC', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png', color: '#5A2D81' },
  { id: 'sas', name: 'San Antonio Spurs', abbreviation: 'SAS', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sa.png', color: '#C4CED4' },
  { id: 'tor', name: 'Toronto Raptors', abbreviation: 'TOR', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/tor.png', color: '#CE1141' },
  { id: 'uta', name: 'Utah Jazz', abbreviation: 'UTA', conference: 'Western', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/uta.png', color: '#002B5C' },
  { id: 'was', name: 'Washington Wizards', abbreviation: 'WAS', conference: 'Eastern', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/wsh.png', color: '#002B5C' },
];

export function searchNBATeams(query: string): NBATeamInfo[] {
  const q = query.toLowerCase().trim();
  if (!q) return ALL_NBA_TEAMS;
  return ALL_NBA_TEAMS.filter(team =>
    team.name.toLowerCase().includes(q) ||
    team.abbreviation.toLowerCase().includes(q) ||
    team.conference.toLowerCase().includes(q)
  );
}

export function getNBATeamsByConference(conference: 'Eastern' | 'Western'): NBATeamInfo[] {
  return ALL_NBA_TEAMS.filter(team => team.conference === conference);
}

export function getUpcomingGamesForTeam(teamAbbreviation: string): NBAGame[] {
  return getUpcomingGames().filter(game =>
    game.team1.abbreviation === teamAbbreviation ||
    game.team2.abbreviation === teamAbbreviation
  );
}

export function getCompletedGamesForTeam(teamAbbreviation: string): NBAGame[] {
  return getCompletedGames().filter(game =>
    game.team1.abbreviation === teamAbbreviation ||
    game.team2.abbreviation === teamAbbreviation
  );
}

export function getTeamColor(abbreviation: string): string {
  const colors: Record<string, string> = {
    ATL: '#E03A3E',
    BOS: '#007A33',
    BKN: '#000000',
    CHA: '#1D1160',
    CHI: '#CE1141',
    CLE: '#860038',
    DAL: '#00538C',
    DEN: '#0E2240',
    DET: '#C8102E',
    GSW: '#1D428A',
    HOU: '#CE1141',
    IND: '#002D62',
    LAC: '#C8102E',
    LAL: '#552583',
    MEM: '#5D76A9',
    MIA: '#98002E',
    MIL: '#00471B',
    MIN: '#0C2340',
    NOP: '#0C2340',
    NYK: '#006BB6',
    OKC: '#007AC1',
    ORL: '#0077C0',
    PHI: '#006BB6',
    PHX: '#1D1160',
    POR: '#E03A3E',
    SAC: '#5A2D81',
    SAS: '#C4CED4',
    TOR: '#CE1141',
    UTA: '#002B5C',
    WAS: '#002B5C',
  };
  return colors[abbreviation] || '#333333';
}
