export interface BoxingFight {
  id: number;
  date: string;
  status: 'upcoming' | 'completed' | 'live';
  event: string;
  venue: string;
  city: string;
  country: string;
  division: string;
  rounds: number;
  titleFight: boolean;
  belts?: string[];
  fighter1: {
    name: string;
    nickname?: string;
    record: string;
    country: string;
    countryFlag: string;
    photo?: string;
    winner?: boolean;
  };
  fighter2: {
    name: string;
    nickname?: string;
    record: string;
    country: string;
    countryFlag: string;
    photo?: string;
    winner?: boolean;
  };
  result?: {
    method: string;
    round?: number;
    time?: string;
    scores?: string[];
  };
}

export interface BoxingDivision {
  id: string;
  name: string;
  weightLimit: string;
  champion?: string;
}

export const BOXING_DIVISIONS: BoxingDivision[] = [
  { id: 'heavyweight', name: 'Heavyweight', weightLimit: '200+ lbs', champion: 'Oleksandr Usyk' },
  { id: 'cruiserweight', name: 'Cruiserweight', weightLimit: '200 lbs', champion: 'Jai Opetaia' },
  { id: 'light-heavyweight', name: 'Light Heavyweight', weightLimit: '175 lbs', champion: 'Artur Beterbiev' },
  { id: 'super-middleweight', name: 'Super Middleweight', weightLimit: '168 lbs', champion: 'Saul Alvarez' },
  { id: 'middleweight', name: 'Middleweight', weightLimit: '160 lbs', champion: 'Janibek Alimkhanuly' },
  { id: 'super-welterweight', name: 'Super Welterweight', weightLimit: '154 lbs', champion: 'Terence Crawford' },
  { id: 'welterweight', name: 'Welterweight', weightLimit: '147 lbs', champion: 'Terence Crawford' },
  { id: 'super-lightweight', name: 'Super Lightweight', weightLimit: '140 lbs', champion: 'Teofimo Lopez' },
  { id: 'lightweight', name: 'Lightweight', weightLimit: '135 lbs', champion: 'Gervonta Davis' },
  { id: 'super-featherweight', name: 'Super Featherweight', weightLimit: '130 lbs', champion: 'Emanuel Navarrete' },
  { id: 'featherweight', name: 'Featherweight', weightLimit: '126 lbs', champion: 'Naoya Inoue' },
  { id: 'super-bantamweight', name: 'Super Bantamweight', weightLimit: '122 lbs', champion: 'Naoya Inoue' },
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

export const BOXING_UPCOMING_FIGHTS: BoxingFight[] = [
  {
    id: 1001,
    date: futureDate(12),
    status: 'upcoming',
    event: 'Riyadh Season',
    venue: 'Kingdom Arena',
    city: 'Riyadh',
    country: 'Saudi Arabia',
    division: 'Heavyweight',
    rounds: 12,
    titleFight: true,
    belts: ['WBA', 'WBC', 'IBF', 'WBO'],
    fighter1: {
      name: 'Oleksandr Usyk',
      nickname: 'The Cat',
      record: '22-0-0',
      country: 'Ukraine',
      countryFlag: '🇺🇦',
    },
    fighter2: {
      name: 'Daniel Dubois',
      nickname: 'DDD',
      record: '22-2-0',
      country: 'United Kingdom',
      countryFlag: '🇬🇧',
    },
  },
  {
    id: 1002,
    date: futureDate(19),
    status: 'upcoming',
    event: 'DAZN Boxing',
    venue: 'T-Mobile Arena',
    city: 'Las Vegas',
    country: 'USA',
    division: 'Super Middleweight',
    rounds: 12,
    titleFight: true,
    belts: ['WBA', 'WBC', 'WBO'],
    fighter1: {
      name: 'Canelo Alvarez',
      nickname: 'Canelo',
      record: '62-2-2',
      country: 'Mexico',
      countryFlag: '🇲🇽',
    },
    fighter2: {
      name: 'William Scull',
      nickname: 'El Elegante',
      record: '22-0-0',
      country: 'Cuba',
      countryFlag: '🇨🇺',
    },
  },
  {
    id: 1003,
    date: futureDate(26),
    status: 'upcoming',
    event: 'Top Rank Boxing',
    venue: 'Barclays Center',
    city: 'Brooklyn',
    country: 'USA',
    division: 'Lightweight',
    rounds: 12,
    titleFight: true,
    belts: ['WBA'],
    fighter1: {
      name: 'Gervonta Davis',
      nickname: 'Tank',
      record: '30-0-0',
      country: 'USA',
      countryFlag: '🇺🇸',
    },
    fighter2: {
      name: 'Vasyl Lomachenko',
      nickname: 'Loma',
      record: '18-3-0',
      country: 'Ukraine',
      countryFlag: '🇺🇦',
    },
  },
  {
    id: 1004,
    date: futureDate(40),
    status: 'upcoming',
    event: 'Matchroom Boxing',
    venue: 'Tokyo Dome',
    city: 'Tokyo',
    country: 'Japan',
    division: 'Super Bantamweight',
    rounds: 12,
    titleFight: true,
    belts: ['WBA', 'WBC', 'IBF', 'WBO'],
    fighter1: {
      name: 'Naoya Inoue',
      nickname: 'Monster',
      record: '28-0-0',
      country: 'Japan',
      countryFlag: '🇯🇵',
    },
    fighter2: {
      name: 'Murodjon Akhmadaliev',
      nickname: 'MJ',
      record: '12-1-0',
      country: 'Uzbekistan',
      countryFlag: '🇺🇿',
    },
  },
  {
    id: 1005,
    date: futureDate(55),
    status: 'upcoming',
    event: 'PBC on Showtime',
    venue: 'MGM Grand Garden Arena',
    city: 'Las Vegas',
    country: 'USA',
    division: 'Welterweight',
    rounds: 12,
    titleFight: true,
    belts: ['WBA', 'WBO'],
    fighter1: {
      name: 'Terence Crawford',
      nickname: 'Bud',
      record: '41-0-0',
      country: 'USA',
      countryFlag: '🇺🇸',
    },
    fighter2: {
      name: 'Jaron Ennis',
      nickname: 'Boots',
      record: '32-0-0',
      country: 'USA',
      countryFlag: '🇺🇸',
    },
  },
  {
    id: 1006,
    date: futureDate(68),
    status: 'upcoming',
    event: 'Queensberry Promotions',
    venue: 'Wembley Stadium',
    city: 'London',
    country: 'United Kingdom',
    division: 'Light Heavyweight',
    rounds: 12,
    titleFight: true,
    belts: ['WBA', 'WBC', 'IBF', 'WBO'],
    fighter1: {
      name: 'Artur Beterbiev',
      nickname: 'The Beast',
      record: '21-0-0',
      country: 'Russia',
      countryFlag: '🇷🇺',
    },
    fighter2: {
      name: 'Dmitry Bivol',
      nickname: null,
      record: '23-1-0',
      country: 'Russia',
      countryFlag: '🇷🇺',
    },
  },
];

export const BOXING_COMPLETED_FIGHTS: BoxingFight[] = [
  {
    id: 2001,
    date: pastDate(7),
    status: 'completed',
    event: 'Riyadh Season',
    venue: 'Kingdom Arena',
    city: 'Riyadh',
    country: 'Saudi Arabia',
    division: 'Heavyweight',
    rounds: 12,
    titleFight: true,
    belts: ['WBA', 'WBC', 'IBF', 'WBO'],
    fighter1: {
      name: 'Oleksandr Usyk',
      nickname: 'The Cat',
      record: '22-0-0',
      country: 'Ukraine',
      countryFlag: '🇺🇦',
      winner: true,
    },
    fighter2: {
      name: 'Tyson Fury',
      nickname: 'The Gypsy King',
      record: '34-2-1',
      country: 'United Kingdom',
      countryFlag: '🇬🇧',
      winner: false,
    },
    result: {
      method: 'Unanimous Decision',
      scores: ['116-112', '116-112', '115-113'],
    },
  },
  {
    id: 2002,
    date: pastDate(14),
    status: 'completed',
    event: 'DAZN Boxing',
    venue: 'T-Mobile Arena',
    city: 'Las Vegas',
    country: 'USA',
    division: 'Super Middleweight',
    rounds: 12,
    titleFight: true,
    belts: ['WBA', 'WBC', 'WBO'],
    fighter1: {
      name: 'Canelo Alvarez',
      nickname: 'Canelo',
      record: '62-2-2',
      country: 'Mexico',
      countryFlag: '🇲🇽',
      winner: true,
    },
    fighter2: {
      name: 'Edgar Berlanga',
      nickname: 'The Chosen One',
      record: '22-1-0',
      country: 'USA',
      countryFlag: '🇺🇸',
      winner: false,
    },
    result: {
      method: 'Unanimous Decision',
      scores: ['118-109', '118-109', '117-110'],
    },
  },
  {
    id: 2003,
    date: pastDate(21),
    status: 'completed',
    event: 'Top Rank Boxing',
    venue: 'Madison Square Garden',
    city: 'New York',
    country: 'USA',
    division: 'Lightweight',
    rounds: 12,
    titleFight: false,
    fighter1: {
      name: 'Shakur Stevenson',
      record: '22-0-0',
      country: 'USA',
      countryFlag: '🇺🇸',
      winner: true,
    },
    fighter2: {
      name: 'Edwin De Los Santos',
      record: '18-2-0',
      country: 'Dominican Republic',
      countryFlag: '🇩🇴',
      winner: false,
    },
    result: {
      method: 'TKO',
      round: 8,
      time: '2:15',
    },
  },
  {
    id: 2004,
    date: pastDate(30),
    status: 'completed',
    event: 'Matchroom Boxing',
    venue: 'Ariake Arena',
    city: 'Tokyo',
    country: 'Japan',
    division: 'Super Bantamweight',
    rounds: 12,
    titleFight: true,
    belts: ['WBA', 'WBC', 'IBF', 'WBO'],
    fighter1: {
      name: 'Naoya Inoue',
      nickname: 'Monster',
      record: '28-0-0',
      country: 'Japan',
      countryFlag: '🇯🇵',
      winner: true,
    },
    fighter2: {
      name: 'TJ Doheny',
      record: '26-5-0',
      country: 'Ireland',
      countryFlag: '🇮🇪',
      winner: false,
    },
    result: {
      method: 'KO',
      round: 7,
      time: '1:32',
    },
  },
  {
    id: 2005,
    date: pastDate(42),
    status: 'completed',
    event: 'PBC on Showtime',
    venue: 'Crypto.com Arena',
    city: 'Los Angeles',
    country: 'USA',
    division: 'Super Lightweight',
    rounds: 12,
    titleFight: true,
    belts: ['WBO'],
    fighter1: {
      name: 'Teofimo Lopez',
      nickname: 'The Takeover',
      record: '21-1-0',
      country: 'USA',
      countryFlag: '🇺🇸',
      winner: true,
    },
    fighter2: {
      name: 'Sandor Martin',
      record: '42-3-0',
      country: 'Spain',
      countryFlag: '🇪🇸',
      winner: false,
    },
    result: {
      method: 'Split Decision',
      scores: ['115-113', '113-115', '116-112'],
    },
  },
  {
    id: 2006,
    date: pastDate(56),
    status: 'completed',
    event: 'Queensberry Promotions',
    venue: 'O2 Arena',
    city: 'London',
    country: 'United Kingdom',
    division: 'Light Heavyweight',
    rounds: 12,
    titleFight: true,
    belts: ['WBA', 'WBC', 'IBF', 'WBO'],
    fighter1: {
      name: 'Artur Beterbiev',
      nickname: 'The Beast',
      record: '21-0-0',
      country: 'Russia',
      countryFlag: '🇷🇺',
      winner: true,
    },
    fighter2: {
      name: 'Dmitry Bivol',
      record: '23-1-0',
      country: 'Russia',
      countryFlag: '🇷🇺',
      winner: false,
    },
    result: {
      method: 'Majority Decision',
      scores: ['116-112', '115-113', '114-114'],
    },
  },
];

export function getNextFight(): BoxingFight | null {
  const now = new Date().getTime();
  const upcoming = BOXING_UPCOMING_FIGHTS
    .filter(f => new Date(f.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming[0] || null;
}

export function getUpcomingFights(): BoxingFight[] {
  const now = new Date().getTime();
  return BOXING_UPCOMING_FIGHTS
    .filter(f => new Date(f.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getCompletedFights(): BoxingFight[] {
  return BOXING_COMPLETED_FIGHTS
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getMethodColor(method: string): string {
  const m = method.toLowerCase();
  if (m.includes('ko') || m.includes('tko')) return '#EF4444';
  if (m.includes('unanimous')) return '#3B82F6';
  if (m.includes('split')) return '#F59E0B';
  if (m.includes('majority')) return '#8B5CF6';
  if (m.includes('draw')) return '#6B7280';
  return '#10B981';
}

export function getMethodShort(method: string): string {
  const m = method.toLowerCase();
  if (m.includes('tko')) return 'TKO';
  if (m.includes('ko')) return 'KO';
  if (m.includes('unanimous')) return 'UD';
  if (m.includes('split')) return 'SD';
  if (m.includes('majority')) return 'MD';
  if (m.includes('draw')) return 'DRAW';
  if (m.includes('rtd') || m.includes('retired')) return 'RTD';
  if (m.includes('disq')) return 'DQ';
  return 'W';
}
