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

export function getTeamColor(abbreviation: string): string {
  const colors: Record<string, string> = {
    CLE: '#860038',
    BOS: '#007A33',
    NYK: '#006BB6',
    IND: '#002D62',
    MIL: '#00471B',
    DET: '#C8102E',
    ORL: '#0077C0',
    MIA: '#98002E',
    OKC: '#007AC1',
    HOU: '#CE1141',
    LAC: '#C8102E',
    LAL: '#552583',
    DEN: '#0E2240',
    MIN: '#0C2340',
    GSW: '#1D428A',
    MEM: '#5D76A9',
  };
  return colors[abbreviation] || '#333333';
}
