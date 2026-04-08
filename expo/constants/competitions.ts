export interface Competition {
  id: number;
  name: string;
  country: string;
  logo?: string;
  type: 'league' | 'cup' | 'international';
  tier?: number;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  flag: string;
  competitions: Competition[];
}

export interface Continent {
  id: string;
  name: string;
  emoji: string;
  countries: Country[];
}

export const COMPETITIONS_DATA: Continent[] = [
  {
    id: 'europe',
    name: 'Europe',
    emoji: '🇪🇺',
    countries: [
      {
        id: 'england',
        name: 'England',
        code: 'GB-ENG',
        flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        competitions: [
          { id: 39, name: 'Premier League', country: 'England', type: 'league', tier: 1 },
          { id: 40, name: 'Championship', country: 'England', type: 'league', tier: 2 },
          { id: 41, name: 'League One', country: 'England', type: 'league', tier: 3 },
          { id: 42, name: 'League Two', country: 'England', type: 'league', tier: 4 },
          { id: 45, name: 'FA Cup', country: 'England', type: 'cup' },
          { id: 46, name: 'EFL Cup', country: 'England', type: 'cup' },
          { id: 48, name: 'Community Shield', country: 'England', type: 'cup' },
        ]
      },
      {
        id: 'spain',
        name: 'Spain',
        code: 'ES',
        flag: '🇪🇸',
        competitions: [
          { id: 140, name: 'La Liga', country: 'Spain', type: 'league', tier: 1 },
          { id: 141, name: 'Segunda División', country: 'Spain', type: 'league', tier: 2 },
          { id: 143, name: 'Copa del Rey', country: 'Spain', type: 'cup' },
          { id: 556, name: 'Super Cup', country: 'Spain', type: 'cup' },
        ]
      },
      {
        id: 'germany',
        name: 'Germany',
        code: 'DE',
        flag: '🇩🇪',
        competitions: [
          { id: 78, name: 'Bundesliga', country: 'Germany', type: 'league', tier: 1 },
          { id: 79, name: '2. Bundesliga', country: 'Germany', type: 'league', tier: 2 },
          { id: 80, name: '3. Liga', country: 'Germany', type: 'league', tier: 3 },
          { id: 81, name: 'DFB Pokal', country: 'Germany', type: 'cup' },
          { id: 529, name: 'DFL Super Cup', country: 'Germany', type: 'cup' },
        ]
      },
      {
        id: 'italy',
        name: 'Italy',
        code: 'IT',
        flag: '🇮🇹',
        competitions: [
          { id: 135, name: 'Serie A', country: 'Italy', type: 'league', tier: 1 },
          { id: 136, name: 'Serie B', country: 'Italy', type: 'league', tier: 2 },
          { id: 137, name: 'Coppa Italia', country: 'Italy', type: 'cup' },
          { id: 547, name: 'Serie C', country: 'Italy', type: 'league', tier: 3 },
        ]
      },
      {
        id: 'france',
        name: 'France',
        code: 'FR',
        flag: '🇫🇷',
        competitions: [
          { id: 61, name: 'Ligue 1', country: 'France', type: 'league', tier: 1 },
          { id: 62, name: 'Ligue 2', country: 'France', type: 'league', tier: 2 },
          { id: 66, name: 'Coupe de France', country: 'France', type: 'cup' },
          { id: 65, name: 'Coupe de la Ligue', country: 'France', type: 'cup' },
        ]
      },
      {
        id: 'netherlands',
        name: 'Netherlands',
        code: 'NL',
        flag: '🇳🇱',
        competitions: [
          { id: 88, name: 'Eredivisie', country: 'Netherlands', type: 'league', tier: 1 },
          { id: 89, name: 'Eerste Divisie', country: 'Netherlands', type: 'league', tier: 2 },
          { id: 90, name: 'KNVB Beker', country: 'Netherlands', type: 'cup' },
        ]
      },
      {
        id: 'portugal',
        name: 'Portugal',
        code: 'PT',
        flag: '🇵🇹',
        competitions: [
          { id: 94, name: 'Primeira Liga', country: 'Portugal', type: 'league', tier: 1 },
          { id: 95, name: 'Segunda Liga', country: 'Portugal', type: 'league', tier: 2 },
          { id: 96, name: 'Taça de Portugal', country: 'Portugal', type: 'cup' },
        ]
      },
      {
        id: 'belgium',
        name: 'Belgium',
        code: 'BE',
        flag: '🇧🇪',
        competitions: [
          { id: 144, name: 'Pro League', country: 'Belgium', type: 'league', tier: 1 },
          { id: 145, name: 'First Division B', country: 'Belgium', type: 'league', tier: 2 },
        ]
      },
      {
        id: 'turkey',
        name: 'Turkey',
        code: 'TR',
        flag: '🇹🇷',
        competitions: [
          { id: 203, name: 'Süper Lig', country: 'Turkey', type: 'league', tier: 1 },
          { id: 204, name: '1. Lig', country: 'Turkey', type: 'league', tier: 2 },
        ]
      },
      {
        id: 'scotland',
        name: 'Scotland',
        code: 'GB-SCT',
        flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
        competitions: [
          { id: 179, name: 'Premiership', country: 'Scotland', type: 'league', tier: 1 },
          { id: 180, name: 'Championship', country: 'Scotland', type: 'league', tier: 2 },
        ]
      },
      {
        id: 'austria',
        name: 'Austria',
        code: 'AT',
        flag: '🇦🇹',
        competitions: [
          { id: 218, name: 'Bundesliga', country: 'Austria', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'switzerland',
        name: 'Switzerland',
        code: 'CH',
        flag: '🇨🇭',
        competitions: [
          { id: 207, name: 'Super League', country: 'Switzerland', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'denmark',
        name: 'Denmark',
        code: 'DK',
        flag: '🇩🇰',
        competitions: [
          { id: 119, name: 'Superliga', country: 'Denmark', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'sweden',
        name: 'Sweden',
        code: 'SE',
        flag: '🇸🇪',
        competitions: [
          { id: 113, name: 'Allsvenskan', country: 'Sweden', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'norway',
        name: 'Norway',
        code: 'NO',
        flag: '🇳🇴',
        competitions: [
          { id: 103, name: 'Eliteserien', country: 'Norway', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'poland',
        name: 'Poland',
        code: 'PL',
        flag: '🇵🇱',
        competitions: [
          { id: 106, name: 'Ekstraklasa', country: 'Poland', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'russia',
        name: 'Russia',
        code: 'RU',
        flag: '🇷🇺',
        competitions: [
          { id: 235, name: 'Premier League', country: 'Russia', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'ukraine',
        name: 'Ukraine',
        code: 'UA',
        flag: '🇺🇦',
        competitions: [
          { id: 333, name: 'Premier League', country: 'Ukraine', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'greece',
        name: 'Greece',
        code: 'GR',
        flag: '🇬🇷',
        competitions: [
          { id: 197, name: 'Super League', country: 'Greece', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'croatia',
        name: 'Croatia',
        code: 'HR',
        flag: '🇭🇷',
        competitions: [
          { id: 210, name: 'HNL', country: 'Croatia', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'serbia',
        name: 'Serbia',
        code: 'RS',
        flag: '🇷🇸',
        competitions: [
          { id: 286, name: 'Super Liga', country: 'Serbia', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'czech',
        name: 'Czech Republic',
        code: 'CZ',
        flag: '🇨🇿',
        competitions: [
          { id: 345, name: 'First League', country: 'Czech Republic', type: 'league', tier: 1 },
        ]
      },
    ]
  },
  {
    id: 'south-america',
    name: 'South America',
    emoji: '🌎',
    countries: [
      {
        id: 'brazil',
        name: 'Brazil',
        code: 'BR',
        flag: '🇧🇷',
        competitions: [
          { id: 71, name: 'Série A', country: 'Brazil', type: 'league', tier: 1 },
          { id: 72, name: 'Série B', country: 'Brazil', type: 'league', tier: 2 },
          { id: 73, name: 'Copa do Brasil', country: 'Brazil', type: 'cup' },
        ]
      },
      {
        id: 'argentina',
        name: 'Argentina',
        code: 'AR',
        flag: '🇦🇷',
        competitions: [
          { id: 128, name: 'Primera División', country: 'Argentina', type: 'league', tier: 1 },
          { id: 131, name: 'Primera Nacional', country: 'Argentina', type: 'league', tier: 2 },
          { id: 130, name: 'Copa Argentina', country: 'Argentina', type: 'cup' },
        ]
      },
      {
        id: 'colombia',
        name: 'Colombia',
        code: 'CO',
        flag: '🇨🇴',
        competitions: [
          { id: 239, name: 'Primera A', country: 'Colombia', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'chile',
        name: 'Chile',
        code: 'CL',
        flag: '🇨🇱',
        competitions: [
          { id: 265, name: 'Primera División', country: 'Chile', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'uruguay',
        name: 'Uruguay',
        code: 'UY',
        flag: '🇺🇾',
        competitions: [
          { id: 268, name: 'Primera División', country: 'Uruguay', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'ecuador',
        name: 'Ecuador',
        code: 'EC',
        flag: '🇪🇨',
        competitions: [
          { id: 242, name: 'Serie A', country: 'Ecuador', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'peru',
        name: 'Peru',
        code: 'PE',
        flag: '🇵🇪',
        competitions: [
          { id: 281, name: 'Liga 1', country: 'Peru', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'paraguay',
        name: 'Paraguay',
        code: 'PY',
        flag: '🇵🇾',
        competitions: [
          { id: 279, name: 'División de Honor', country: 'Paraguay', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'venezuela',
        name: 'Venezuela',
        code: 'VE',
        flag: '🇻🇪',
        competitions: [
          { id: 299, name: 'Primera División', country: 'Venezuela', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'bolivia',
        name: 'Bolivia',
        code: 'BO',
        flag: '🇧🇴',
        competitions: [
          { id: 157, name: 'División Profesional', country: 'Bolivia', type: 'league', tier: 1 },
        ]
      },
    ]
  },
  {
    id: 'north-america',
    name: 'North America',
    emoji: '🌎',
    countries: [
      {
        id: 'usa',
        name: 'United States',
        code: 'US',
        flag: '🇺🇸',
        competitions: [
          { id: 253, name: 'MLS', country: 'United States', type: 'league', tier: 1 },
          { id: 254, name: 'USL Championship', country: 'United States', type: 'league', tier: 2 },
          { id: 257, name: 'US Open Cup', country: 'United States', type: 'cup' },
        ]
      },
      {
        id: 'mexico',
        name: 'Mexico',
        code: 'MX',
        flag: '🇲🇽',
        competitions: [
          { id: 262, name: 'Liga MX', country: 'Mexico', type: 'league', tier: 1 },
          { id: 263, name: 'Liga de Expansión', country: 'Mexico', type: 'league', tier: 2 },
          { id: 264, name: 'Copa MX', country: 'Mexico', type: 'cup' },
        ]
      },
      {
        id: 'canada',
        name: 'Canada',
        code: 'CA',
        flag: '🇨🇦',
        competitions: [
          { id: 459, name: 'Canadian Premier League', country: 'Canada', type: 'league', tier: 1 },
        ]
      },
    ]
  },
  {
    id: 'africa',
    name: 'Africa',
    emoji: '🌍',
    countries: [
      {
        id: 'egypt',
        name: 'Egypt',
        code: 'EG',
        flag: '🇪🇬',
        competitions: [
          { id: 233, name: 'Premier League', country: 'Egypt', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'morocco',
        name: 'Morocco',
        code: 'MA',
        flag: '🇲🇦',
        competitions: [
          { id: 200, name: 'Botola Pro', country: 'Morocco', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'south-africa',
        name: 'South Africa',
        code: 'ZA',
        flag: '🇿🇦',
        competitions: [
          { id: 288, name: 'Premier Soccer League', country: 'South Africa', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'nigeria',
        name: 'Nigeria',
        code: 'NG',
        flag: '🇳🇬',
        competitions: [
          { id: 332, name: 'NPFL', country: 'Nigeria', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'tunisia',
        name: 'Tunisia',
        code: 'TN',
        flag: '🇹🇳',
        competitions: [
          { id: 202, name: 'Ligue Professionnelle 1', country: 'Tunisia', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'algeria',
        name: 'Algeria',
        code: 'DZ',
        flag: '🇩🇿',
        competitions: [
          { id: 187, name: 'Ligue 1', country: 'Algeria', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'ghana',
        name: 'Ghana',
        code: 'GH',
        flag: '🇬🇭',
        competitions: [
          { id: 310, name: 'Premier League', country: 'Ghana', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'senegal',
        name: 'Senegal',
        code: 'SN',
        flag: '🇸🇳',
        competitions: [
          { id: 307, name: 'Ligue 1', country: 'Senegal', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'ivory-coast',
        name: 'Ivory Coast',
        code: 'CI',
        flag: '🇨🇮',
        competitions: [
          { id: 308, name: 'Ligue 1', country: 'Ivory Coast', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'cameroon',
        name: 'Cameroon',
        code: 'CM',
        flag: '🇨🇲',
        competitions: [
          { id: 309, name: 'Elite One', country: 'Cameroon', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'kenya',
        name: 'Kenya',
        code: 'KE',
        flag: '🇰🇪',
        competitions: [
          { id: 276, name: 'Premier League', country: 'Kenya', type: 'league', tier: 1 },
        ]
      },
    ]
  },
  {
    id: 'asia',
    name: 'Asia',
    emoji: '🌏',
    countries: [
      {
        id: 'japan',
        name: 'Japan',
        code: 'JP',
        flag: '🇯🇵',
        competitions: [
          { id: 98, name: 'J1 League', country: 'Japan', type: 'league', tier: 1 },
          { id: 99, name: 'J2 League', country: 'Japan', type: 'league', tier: 2 },
          { id: 517, name: 'Emperor Cup', country: 'Japan', type: 'cup' },
        ]
      },
      {
        id: 'south-korea',
        name: 'South Korea',
        code: 'KR',
        flag: '🇰🇷',
        competitions: [
          { id: 292, name: 'K League 1', country: 'South Korea', type: 'league', tier: 1 },
          { id: 293, name: 'K League 2', country: 'South Korea', type: 'league', tier: 2 },
        ]
      },
      {
        id: 'china',
        name: 'China',
        code: 'CN',
        flag: '🇨🇳',
        competitions: [
          { id: 169, name: 'Super League', country: 'China', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'saudi-arabia',
        name: 'Saudi Arabia',
        code: 'SA',
        flag: '🇸🇦',
        competitions: [
          { id: 307, name: 'Pro League', country: 'Saudi Arabia', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'uae',
        name: 'UAE',
        code: 'AE',
        flag: '🇦🇪',
        competitions: [
          { id: 305, name: 'Pro League', country: 'UAE', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'qatar',
        name: 'Qatar',
        code: 'QA',
        flag: '🇶🇦',
        competitions: [
          { id: 302, name: 'Stars League', country: 'Qatar', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'india',
        name: 'India',
        code: 'IN',
        flag: '🇮🇳',
        competitions: [
          { id: 323, name: 'Indian Super League', country: 'India', type: 'league', tier: 1 },
          { id: 324, name: 'I-League', country: 'India', type: 'league', tier: 2 },
        ]
      },
      {
        id: 'australia',
        name: 'Australia',
        code: 'AU',
        flag: '🇦🇺',
        competitions: [
          { id: 188, name: 'A-League', country: 'Australia', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'thailand',
        name: 'Thailand',
        code: 'TH',
        flag: '🇹🇭',
        competitions: [
          { id: 296, name: 'Thai League', country: 'Thailand', type: 'league', tier: 1 },
        ]
      },
      {
        id: 'indonesia',
        name: 'Indonesia',
        code: 'ID',
        flag: '🇮🇩',
        competitions: [
          { id: 274, name: 'Liga 1', country: 'Indonesia', type: 'league', tier: 1 },
        ]
      },
    ]
  },
];

export const INTERNATIONAL_COMPETITIONS: Competition[] = [
  { id: 2, name: 'UEFA Champions League', country: 'Europe', type: 'international' },
  { id: 3, name: 'UEFA Europa League', country: 'Europe', type: 'international' },
  { id: 848, name: 'UEFA Conference League', country: 'Europe', type: 'international' },
  { id: 531, name: 'UEFA Super Cup', country: 'Europe', type: 'cup' },
  { id: 4, name: 'UEFA Euro Championship', country: 'Europe', type: 'international' },
  { id: 960, name: 'Euro Qualifiers', country: 'Europe', type: 'international' },
  { id: 5, name: 'UEFA Nations League', country: 'Europe', type: 'international' },
  { id: 1, name: 'FIFA World Cup', country: 'World', type: 'international' },
  { id: 15, name: 'World Cup Qualifiers - UEFA', country: 'Europe', type: 'international' },
  { id: 16, name: 'World Cup Qualifiers - CONMEBOL', country: 'South America', type: 'international' },
  { id: 17, name: 'World Cup Qualifiers - CONCACAF', country: 'North America', type: 'international' },
  { id: 18, name: 'World Cup Qualifiers - AFC', country: 'Asia', type: 'international' },
  { id: 19, name: 'World Cup Qualifiers - CAF', country: 'Africa', type: 'international' },
  { id: 20, name: 'World Cup Qualifiers - OFC', country: 'Oceania', type: 'international' },
  { id: 9, name: 'Copa América', country: 'South America', type: 'international' },
  { id: 13, name: 'CONMEBOL Libertadores', country: 'South America', type: 'international' },
  { id: 14, name: 'CONMEBOL Sudamericana', country: 'South America', type: 'international' },
  { id: 11, name: 'CONCACAF Champions Cup', country: 'North America', type: 'international' },
  { id: 21, name: 'CONCACAF Gold Cup', country: 'North America', type: 'international' },
  { id: 6, name: 'Africa Cup of Nations', country: 'Africa', type: 'international' },
  { id: 12, name: 'CAF Champions League', country: 'Africa', type: 'international' },
  { id: 36, name: 'CAF Confederation Cup', country: 'Africa', type: 'international' },
  { id: 7, name: 'AFC Asian Cup', country: 'Asia', type: 'international' },
  { id: 17000, name: 'AFC Champions League', country: 'Asia', type: 'international' },
  { id: 15000, name: 'FIFA Club World Cup', country: 'World', type: 'international' },
  { id: 667, name: 'Club Friendlies', country: 'World', type: 'international' },
  { id: 10, name: 'International Friendlies', country: 'World', type: 'international' },
];

export const QUICK_FILTERS = [
  { id: 'top5', name: 'Top 5 Leagues', icon: '⭐', leagueIds: [39, 140, 78, 135, 61] },
  { id: 'champions', name: 'Champions League', icon: '🏆', leagueIds: [2] },
  { id: 'europa', name: 'Europa League', icon: '🥈', leagueIds: [3] },
  { id: 'afcon', name: 'AFCON', icon: '🏆', leagueIds: [6] },
  { id: 'worldcup', name: 'World Cup', icon: '🌍', leagueIds: [1, 15, 16, 17, 18, 19, 20] },
  { id: 'euro', name: 'Euro', icon: '🇪🇺', leagueIds: [4, 960, 5] },
  { id: 'copa', name: 'Copa América', icon: '🏆', leagueIds: [9, 13, 14, 16] },
  { id: 'africa', name: 'African Cups', icon: '🌍', leagueIds: [6, 12, 20, 19] },
  { id: 'asia', name: 'Asian Cups', icon: '🌏', leagueIds: [7, 17, 18] },
];

export const getLeagueIdsByContinent = (continentId: string): number[] => {
  const continent = COMPETITIONS_DATA.find(c => c.id === continentId);
  if (!continent) return [];
  
  return continent.countries.flatMap(country => 
    country.competitions.map(comp => comp.id)
  );
};

export const getLeagueIdsByCountry = (countryId: string): number[] => {
  for (const continent of COMPETITIONS_DATA) {
    const country = continent.countries.find(c => c.id === countryId);
    if (country) {
      return country.competitions.map(comp => comp.id);
    }
  }
  return [];
};

export const getAllLeagueIds = (): number[] => {
  const domesticIds = COMPETITIONS_DATA.flatMap(continent =>
    continent.countries.flatMap(country =>
      country.competitions.map(comp => comp.id)
    )
  );
  const internationalIds = INTERNATIONAL_COMPETITIONS.map(comp => comp.id);
  return [...new Set([...domesticIds, ...internationalIds])];
};

export const getCompetitionById = (id: number): Competition | undefined => {
  for (const continent of COMPETITIONS_DATA) {
    for (const country of continent.countries) {
      const comp = country.competitions.find(c => c.id === id);
      if (comp) return comp;
    }
  }
  return INTERNATIONAL_COMPETITIONS.find(c => c.id === id);
};

export const searchCompetitions = (query: string): Competition[] => {
  const lowerQuery = query.toLowerCase();
  const results: Competition[] = [];
  
  for (const continent of COMPETITIONS_DATA) {
    for (const country of continent.countries) {
      for (const comp of country.competitions) {
        if (
          comp.name.toLowerCase().includes(lowerQuery) ||
          comp.country.toLowerCase().includes(lowerQuery)
        ) {
          results.push(comp);
        }
      }
    }
  }
  
  for (const comp of INTERNATIONAL_COMPETITIONS) {
    if (
      comp.name.toLowerCase().includes(lowerQuery) ||
      comp.country.toLowerCase().includes(lowerQuery)
    ) {
      results.push(comp);
    }
  }
  
  return results;
};
