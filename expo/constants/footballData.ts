import { UserTeam, UserCountry } from '@/types/habit';

export const FOOTBALL_COUNTRIES: UserCountry[] = [
  {
    id: 'england',
    name: 'England',
    code: 'GB',
    flag: '🇬🇧',
    leagues: ['Premier League', 'Championship', 'League One', 'League Two']
  },
  {
    id: 'spain',
    name: 'Spain',
    code: 'ES',
    flag: '🇪🇸',
    leagues: ['La Liga', 'Segunda División']
  },
  {
    id: 'germany',
    name: 'Germany',
    code: 'DE',
    flag: '🇩🇪',
    leagues: ['Bundesliga', '2. Bundesliga']
  },
  {
    id: 'italy',
    name: 'Italy',
    code: 'IT',
    flag: '🇮🇹',
    leagues: ['Serie A', 'Serie B']
  },
  {
    id: 'france',
    name: 'France',
    code: 'FR',
    flag: '🇫🇷',
    leagues: ['Ligue 1', 'Ligue 2']
  },
  {
    id: 'netherlands',
    name: 'Netherlands',
    code: 'NL',
    flag: '🇳🇱',
    leagues: ['Eredivisie']
  },
  {
    id: 'portugal',
    name: 'Portugal',
    code: 'PT',
    flag: '🇵🇹',
    leagues: ['Primeira Liga']
  },
  {
    id: 'brazil',
    name: 'Brazil',
    code: 'BR',
    flag: '🇧🇷',
    leagues: ['Série A', 'Série B']
  },
  {
    id: 'argentina',
    name: 'Argentina',
    code: 'AR',
    flag: '🇦🇷',
    leagues: ['Primera División']
  },
  {
    id: 'usa',
    name: 'United States',
    code: 'US',
    flag: '🇺🇸',
    leagues: ['MLS']
  },
  {
    id: 'mexico',
    name: 'Mexico',
    code: 'MX',
    flag: '🇲🇽',
    leagues: ['Liga MX']
  },
  {
    id: 'belgium',
    name: 'Belgium',
    code: 'BE',
    flag: '🇧🇪',
    leagues: ['Pro League']
  },
  {
    id: 'turkey',
    name: 'Turkey',
    code: 'TR',
    flag: '🇹🇷',
    leagues: ['Süper Lig']
  },
  {
    id: 'russia',
    name: 'Russia',
    code: 'RU',
    flag: '🇷🇺',
    leagues: ['Premier League']
  },
  {
    id: 'scotland',
    name: 'Scotland',
    code: 'GB-SCT',
    flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    leagues: ['Scottish Premiership']
  },
  // African Countries
  {
    id: 'nigeria',
    name: 'Nigeria',
    code: 'NG',
    flag: '🇳🇬',
    leagues: ['NPFL', 'CAF Champions League', 'CAF Confederation Cup']
  },
  {
    id: 'egypt',
    name: 'Egypt',
    code: 'EG',
    flag: '🇪🇬',
    leagues: ['Egyptian Premier League', 'CAF Champions League']
  },
  {
    id: 'morocco',
    name: 'Morocco',
    code: 'MA',
    flag: '🇲🇦',
    leagues: ['Botola Pro', 'CAF Champions League']
  },
  {
    id: 'south-africa',
    name: 'South Africa',
    code: 'ZA',
    flag: '🇿🇦',
    leagues: ['Premier Soccer League', 'CAF Champions League']
  },
  {
    id: 'ghana',
    name: 'Ghana',
    code: 'GH',
    flag: '🇬🇭',
    leagues: ['Ghana Premier League', 'CAF Champions League']
  },
  {
    id: 'senegal',
    name: 'Senegal',
    code: 'SN',
    flag: '🇸🇳',
    leagues: ['Ligue 1 Senegal', 'CAF Champions League']
  },
  {
    id: 'ivory-coast',
    name: 'Ivory Coast',
    code: 'CI',
    flag: '🇨🇮',
    leagues: ['Ligue 1 Ivory Coast', 'CAF Champions League']
  },
  {
    id: 'cameroon',
    name: 'Cameroon',
    code: 'CM',
    flag: '🇨🇲',
    leagues: ['Elite One', 'CAF Champions League']
  },
  {
    id: 'tunisia',
    name: 'Tunisia',
    code: 'TN',
    flag: '🇹🇳',
    leagues: ['Tunisian Ligue Professionnelle 1', 'CAF Champions League']
  },
  {
    id: 'algeria',
    name: 'Algeria',
    code: 'DZ',
    flag: '🇩🇿',
    leagues: ['Ligue Professionnelle 1', 'CAF Champions League']
  },
  {
    id: 'kenya',
    name: 'Kenya',
    code: 'KE',
    flag: '🇰🇪',
    leagues: ['Kenyan Premier League', 'CAF Confederation Cup']
  },
  {
    id: 'ethiopia',
    name: 'Ethiopia',
    code: 'ET',
    flag: '🇪🇹',
    leagues: ['Ethiopian Premier League', 'CAF Confederation Cup']
  },
  // Additional European Countries
  {
    id: 'austria',
    name: 'Austria',
    code: 'AT',
    flag: '🇦🇹',
    leagues: ['Austrian Bundesliga']
  },
  {
    id: 'switzerland',
    name: 'Switzerland',
    code: 'CH',
    flag: '🇨🇭',
    leagues: ['Swiss Super League']
  },
  {
    id: 'denmark',
    name: 'Denmark',
    code: 'DK',
    flag: '🇩🇰',
    leagues: ['Danish Superliga']
  },
  {
    id: 'norway',
    name: 'Norway',
    code: 'NO',
    flag: '🇳🇴',
    leagues: ['Eliteserien']
  },
  {
    id: 'sweden',
    name: 'Sweden',
    code: 'SE',
    flag: '🇸🇪',
    leagues: ['Allsvenskan']
  },
  {
    id: 'finland',
    name: 'Finland',
    code: 'FI',
    flag: '🇫🇮',
    leagues: ['Veikkausliiga']
  },
  {
    id: 'czech-republic',
    name: 'Czech Republic',
    code: 'CZ',
    flag: '🇨🇿',
    leagues: ['Czech First League']
  },
  {
    id: 'poland',
    name: 'Poland',
    code: 'PL',
    flag: '🇵🇱',
    leagues: ['Ekstraklasa']
  },
  {
    id: 'ukraine',
    name: 'Ukraine',
    code: 'UA',
    flag: '🇺🇦',
    leagues: ['Ukrainian Premier League']
  },
  {
    id: 'croatia',
    name: 'Croatia',
    code: 'HR',
    flag: '🇭🇷',
    leagues: ['Croatian First League']
  },
  {
    id: 'serbia',
    name: 'Serbia',
    code: 'RS',
    flag: '🇷🇸',
    leagues: ['Serbian SuperLiga']
  },
  {
    id: 'greece',
    name: 'Greece',
    code: 'GR',
    flag: '🇬🇷',
    leagues: ['Greek Super League']
  },
  {
    id: 'romania',
    name: 'Romania',
    code: 'RO',
    flag: '🇷🇴',
    leagues: ['Liga I']
  },
  {
    id: 'bulgaria',
    name: 'Bulgaria',
    code: 'BG',
    flag: '🇧🇬',
    leagues: ['Bulgarian First League']
  },
  // Asian Countries
  {
    id: 'japan',
    name: 'Japan',
    code: 'JP',
    flag: '🇯🇵',
    leagues: ['J1 League', 'J2 League']
  },
  {
    id: 'south-korea',
    name: 'South Korea',
    code: 'KR',
    flag: '🇰🇷',
    leagues: ['K League 1', 'K League 2']
  },
  {
    id: 'china',
    name: 'China',
    code: 'CN',
    flag: '🇨🇳',
    leagues: ['Chinese Super League']
  },
  {
    id: 'australia',
    name: 'Australia',
    code: 'AU',
    flag: '🇦🇺',
    leagues: ['A-League Men', 'A-League Women']
  },
  {
    id: 'india',
    name: 'India',
    code: 'IN',
    flag: '🇮🇳',
    leagues: ['Indian Super League', 'I-League']
  },
  {
    id: 'saudi-arabia',
    name: 'Saudi Arabia',
    code: 'SA',
    flag: '🇸🇦',
    leagues: ['Saudi Pro League']
  },
  {
    id: 'uae',
    name: 'UAE',
    code: 'AE',
    flag: '🇦🇪',
    leagues: ['UAE Pro League']
  },
  {
    id: 'qatar',
    name: 'Qatar',
    code: 'QA',
    flag: '🇶🇦',
    leagues: ['Qatar Stars League']
  },
  // Additional South American Countries
  {
    id: 'colombia',
    name: 'Colombia',
    code: 'CO',
    flag: '🇨🇴',
    leagues: ['Primera A', 'Primera B']
  },
  {
    id: 'chile',
    name: 'Chile',
    code: 'CL',
    flag: '🇨🇱',
    leagues: ['Primera División']
  },
  {
    id: 'uruguay',
    name: 'Uruguay',
    code: 'UY',
    flag: '🇺🇾',
    leagues: ['Primera División']
  },
  {
    id: 'paraguay',
    name: 'Paraguay',
    code: 'PY',
    flag: '🇵🇾',
    leagues: ['Primera División']
  },
  {
    id: 'ecuador',
    name: 'Ecuador',
    code: 'EC',
    flag: '🇪🇨',
    leagues: ['Serie A']
  },
  {
    id: 'peru',
    name: 'Peru',
    code: 'PE',
    flag: '🇵🇪',
    leagues: ['Primera División']
  },
  {
    id: 'venezuela',
    name: 'Venezuela',
    code: 'VE',
    flag: '🇻🇪',
    leagues: ['Primera División']
  },
  // North American Countries
  {
    id: 'canada',
    name: 'Canada',
    code: 'CA',
    flag: '🇨🇦',
    leagues: ['Canadian Premier League', 'MLS']
  }
];

export const FOOTBALL_TEAMS: UserTeam[] = [
  // Premier League (England)
  { id: 'man-utd', name: 'Manchester United', league: 'Premier League', country: 'England', apiId: 33 },
  { id: 'liverpool', name: 'Liverpool', league: 'Premier League', country: 'England', apiId: 40 },
  { id: 'man-city', name: 'Manchester City', league: 'Premier League', country: 'England', apiId: 50 },
  { id: 'chelsea', name: 'Chelsea', league: 'Premier League', country: 'England', apiId: 49 },
  { id: 'arsenal', name: 'Arsenal', league: 'Premier League', country: 'England', apiId: 42 },
  { id: 'tottenham', name: 'Tottenham Hotspur', league: 'Premier League', country: 'England', apiId: 47 },
  { id: 'newcastle', name: 'Newcastle United', league: 'Premier League', country: 'England', apiId: 34 },
  { id: 'aston-villa', name: 'Aston Villa', league: 'Premier League', country: 'England', apiId: 66 },
  { id: 'west-ham', name: 'West Ham United', league: 'Premier League', country: 'England', apiId: 48 },
  { id: 'brighton', name: 'Brighton & Hove Albion', league: 'Premier League', country: 'England', apiId: 51 },
  { id: 'crystal-palace', name: 'Crystal Palace', league: 'Premier League', country: 'England', apiId: 52 },
  { id: 'fulham', name: 'Fulham', league: 'Premier League', country: 'England', apiId: 36 },
  { id: 'brentford', name: 'Brentford', league: 'Premier League', country: 'England', apiId: 55 },
  { id: 'wolves', name: 'Wolverhampton Wanderers', league: 'Premier League', country: 'England', apiId: 39 },
  { id: 'everton', name: 'Everton', league: 'Premier League', country: 'England', apiId: 45 },
  { id: 'nottingham-forest', name: 'Nottingham Forest', league: 'Premier League', country: 'England', apiId: 65 },
  { id: 'bournemouth', name: 'AFC Bournemouth', league: 'Premier League', country: 'England', apiId: 35 },
  { id: 'sheffield-utd', name: 'Sheffield United', league: 'Premier League', country: 'England', apiId: 62 },
  { id: 'burnley', name: 'Burnley', league: 'Premier League', country: 'England', apiId: 44 },
  { id: 'luton', name: 'Luton Town', league: 'Premier League', country: 'England', apiId: 163 },

  // La Liga (Spain)
  { id: 'real-madrid', name: 'Real Madrid', league: 'La Liga', country: 'Spain', apiId: 541 },
  { id: 'barcelona', name: 'Barcelona', league: 'La Liga', country: 'Spain', apiId: 529 },
  { id: 'atletico-madrid', name: 'Atlético Madrid', league: 'La Liga', country: 'Spain', apiId: 530 },
  { id: 'sevilla', name: 'Sevilla', league: 'La Liga', country: 'Spain', apiId: 536 },
  { id: 'real-sociedad', name: 'Real Sociedad', league: 'La Liga', country: 'Spain', apiId: 548 },
  { id: 'real-betis', name: 'Real Betis', league: 'La Liga', country: 'Spain', apiId: 543 },
  { id: 'villarreal', name: 'Villarreal', league: 'La Liga', country: 'Spain', apiId: 533 },
  { id: 'valencia', name: 'Valencia', league: 'La Liga', country: 'Spain', apiId: 532 },
  { id: 'athletic-bilbao', name: 'Athletic Bilbao', league: 'La Liga', country: 'Spain', apiId: 531 },
  { id: 'celta-vigo', name: 'Celta Vigo', league: 'La Liga', country: 'Spain', apiId: 538 },
  { id: 'espanyol', name: 'Espanyol', league: 'La Liga', country: 'Spain', apiId: 540 },
  { id: 'getafe', name: 'Getafe', league: 'La Liga', country: 'Spain', apiId: 546 },
  { id: 'osasuna', name: 'Osasuna', league: 'La Liga', country: 'Spain', apiId: 727 },
  { id: 'rayo-vallecano', name: 'Rayo Vallecano', league: 'La Liga', country: 'Spain', apiId: 728 },
  { id: 'mallorca', name: 'Mallorca', league: 'La Liga', country: 'Spain', apiId: 798 },
  { id: 'cadiz', name: 'Cádiz', league: 'La Liga', country: 'Spain', apiId: 724 },
  { id: 'elche', name: 'Elche', league: 'La Liga', country: 'Spain', apiId: 797 },
  { id: 'almeria', name: 'Almería', league: 'La Liga', country: 'Spain', apiId: 723 },
  { id: 'girona', name: 'Girona', league: 'La Liga', country: 'Spain', apiId: 547 },
  { id: 'las-palmas', name: 'Las Palmas', league: 'La Liga', country: 'Spain', apiId: 472 },

  // Bundesliga (Germany)
  { id: 'bayern-munich', name: 'Bayern Munich', league: 'Bundesliga', country: 'Germany', apiId: 157 },
  { id: 'borussia-dortmund', name: 'Borussia Dortmund', league: 'Bundesliga', country: 'Germany', apiId: 165 },
  { id: 'rb-leipzig', name: 'RB Leipzig', league: 'Bundesliga', country: 'Germany', apiId: 173 },
  { id: 'bayer-leverkusen', name: 'Bayer Leverkusen', league: 'Bundesliga', country: 'Germany', apiId: 168 },
  { id: 'borussia-mgladbach', name: 'Borussia Mönchengladbach', league: 'Bundesliga', country: 'Germany', apiId: 163 },
  { id: 'eintracht-frankfurt', name: 'Eintracht Frankfurt', league: 'Bundesliga', country: 'Germany', apiId: 169 },
  { id: 'vfb-stuttgart', name: 'VfB Stuttgart', league: 'Bundesliga', country: 'Germany', apiId: 170 },
  { id: 'werder-bremen', name: 'Werder Bremen', league: 'Bundesliga', country: 'Germany', apiId: 162 },
  { id: 'fc-koln', name: '1. FC Köln', league: 'Bundesliga', country: 'Germany', apiId: 161 },
  { id: 'hoffenheim', name: 'TSG Hoffenheim', league: 'Bundesliga', country: 'Germany', apiId: 176 },
  { id: 'wolfsburg', name: 'VfL Wolfsburg', league: 'Bundesliga', country: 'Germany', apiId: 178 },
  { id: 'union-berlin', name: 'Union Berlin', league: 'Bundesliga', country: 'Germany', apiId: 182 },
  { id: 'freiburg', name: 'SC Freiburg', league: 'Bundesliga', country: 'Germany', apiId: 160 },
  { id: 'mainz', name: 'Mainz 05', league: 'Bundesliga', country: 'Germany', apiId: 164 },
  { id: 'augsburg', name: 'FC Augsburg', league: 'Bundesliga', country: 'Germany', apiId: 159 },
  { id: 'hertha-berlin', name: 'Hertha Berlin', league: 'Bundesliga', country: 'Germany', apiId: 172 },
  { id: 'schalke', name: 'Schalke 04', league: 'Bundesliga', country: 'Germany', apiId: 167 },
  { id: 'bochum', name: 'VfL Bochum', league: 'Bundesliga', country: 'Germany', apiId: 180 },

  // Serie A (Italy)
  { id: 'juventus', name: 'Juventus', league: 'Serie A', country: 'Italy', apiId: 496 },
  { id: 'ac-milan', name: 'AC Milan', league: 'Serie A', country: 'Italy', apiId: 489 },
  { id: 'inter-milan', name: 'Inter Milan', league: 'Serie A', country: 'Italy', apiId: 505 },
  { id: 'napoli', name: 'Napoli', league: 'Serie A', country: 'Italy', apiId: 492 },
  { id: 'roma', name: 'AS Roma', league: 'Serie A', country: 'Italy', apiId: 497 },
  { id: 'lazio', name: 'Lazio', league: 'Serie A', country: 'Italy', apiId: 487 },
  { id: 'atalanta', name: 'Atalanta', league: 'Serie A', country: 'Italy', apiId: 499 },
  { id: 'fiorentina', name: 'Fiorentina', league: 'Serie A', country: 'Italy', apiId: 502 },
  { id: 'torino', name: 'Torino', league: 'Serie A', country: 'Italy', apiId: 503 },
  { id: 'sassuolo', name: 'Sassuolo', league: 'Serie A', country: 'Italy', apiId: 488 },
  { id: 'bologna', name: 'Bologna', league: 'Serie A', country: 'Italy', apiId: 500 },
  { id: 'udinese', name: 'Udinese', league: 'Serie A', country: 'Italy', apiId: 494 },
  { id: 'sampdoria', name: 'Sampdoria', league: 'Serie A', country: 'Italy', apiId: 584 },
  { id: 'genoa', name: 'Genoa', league: 'Serie A', country: 'Italy', apiId: 586 },
  { id: 'cagliari', name: 'Cagliari', league: 'Serie A', country: 'Italy', apiId: 490 },
  { id: 'empoli', name: 'Empoli', league: 'Serie A', country: 'Italy', apiId: 511 },
  { id: 'spezia', name: 'Spezia', league: 'Serie A', country: 'Italy', apiId: 515 },
  { id: 'venezia', name: 'Venezia', league: 'Serie A', country: 'Italy', apiId: 517 },
  { id: 'salernitana', name: 'Salernitana', league: 'Serie A', country: 'Italy', apiId: 514 },
  { id: 'hellas-verona', name: 'Hellas Verona', league: 'Serie A', country: 'Italy', apiId: 504 },

  // Ligue 1 (France)
  { id: 'psg', name: 'Paris Saint-Germain', league: 'Ligue 1', country: 'France', apiId: 85 },
  { id: 'marseille', name: 'Marseille', league: 'Ligue 1', country: 'France', apiId: 81 },
  { id: 'lyon', name: 'Lyon', league: 'Ligue 1', country: 'France', apiId: 80 },
  { id: 'monaco', name: 'AS Monaco', league: 'Ligue 1', country: 'France', apiId: 82 },
  { id: 'lille', name: 'Lille', league: 'Ligue 1', country: 'France', apiId: 79 },
  { id: 'rennes', name: 'Rennes', league: 'Ligue 1', country: 'France', apiId: 94 },
  { id: 'nice', name: 'Nice', league: 'Ligue 1', country: 'France', apiId: 84 },
  { id: 'strasbourg', name: 'Strasbourg', league: 'Ligue 1', country: 'France', apiId: 576 },
  { id: 'lens', name: 'Lens', league: 'Ligue 1', country: 'France', apiId: 116 },
  { id: 'montpellier', name: 'Montpellier', league: 'Ligue 1', country: 'France', apiId: 78 },
  { id: 'nantes', name: 'Nantes', league: 'Ligue 1', country: 'France', apiId: 83 },
  { id: 'bordeaux', name: 'Bordeaux', league: 'Ligue 1', country: 'France', apiId: 77 },
  { id: 'saint-etienne', name: 'Saint-Étienne', league: 'Ligue 1', country: 'France', apiId: 86 },
  { id: 'reims', name: 'Reims', league: 'Ligue 1', country: 'France', apiId: 547 },
  { id: 'angers', name: 'Angers', league: 'Ligue 1', country: 'France', apiId: 532 },
  { id: 'brest', name: 'Brest', league: 'Ligue 1', country: 'France', apiId: 512 },
  { id: 'clermont', name: 'Clermont Foot', league: 'Ligue 1', country: 'France', apiId: 541 },
  { id: 'lorient', name: 'Lorient', league: 'Ligue 1', country: 'France', apiId: 107 },
  { id: 'troyes', name: 'Troyes', league: 'Ligue 1', country: 'France', apiId: 110 },
  { id: 'metz', name: 'Metz', league: 'Ligue 1', country: 'France', apiId: 545 },

  // Eredivisie (Netherlands)
  { id: 'ajax', name: 'Ajax', league: 'Eredivisie', country: 'Netherlands', apiId: 194 },
  { id: 'psv', name: 'PSV Eindhoven', league: 'Eredivisie', country: 'Netherlands', apiId: 202 },
  { id: 'feyenoord', name: 'Feyenoord', league: 'Eredivisie', country: 'Netherlands', apiId: 195 },
  { id: 'az-alkmaar', name: 'AZ Alkmaar', league: 'Eredivisie', country: 'Netherlands', apiId: 198 },
  { id: 'vitesse', name: 'Vitesse', league: 'Eredivisie', country: 'Netherlands', apiId: 203 },
  { id: 'fc-utrecht', name: 'FC Utrecht', league: 'Eredivisie', country: 'Netherlands', apiId: 200 },
  { id: 'fc-twente', name: 'FC Twente', league: 'Eredivisie', country: 'Netherlands', apiId: 201 },
  { id: 'groningen', name: 'FC Groningen', league: 'Eredivisie', country: 'Netherlands', apiId: 197 },
  { id: 'heerenveen', name: 'SC Heerenveen', league: 'Eredivisie', country: 'Netherlands', apiId: 196 },
  { id: 'heracles', name: 'Heracles Almelo', league: 'Eredivisie', country: 'Netherlands', apiId: 199 },

  // Primeira Liga (Portugal)
  { id: 'porto', name: 'FC Porto', league: 'Primeira Liga', country: 'Portugal', apiId: 212 },
  { id: 'benfica', name: 'Benfica', league: 'Primeira Liga', country: 'Portugal', apiId: 211 },
  { id: 'sporting-cp', name: 'Sporting CP', league: 'Primeira Liga', country: 'Portugal', apiId: 228 },
  { id: 'braga', name: 'SC Braga', league: 'Primeira Liga', country: 'Portugal', apiId: 218 },
  { id: 'vitoria-guimaraes', name: 'Vitória Guimarães', league: 'Primeira Liga', country: 'Portugal', apiId: 229 },
  { id: 'boavista', name: 'Boavista', league: 'Primeira Liga', country: 'Portugal', apiId: 217 },
  { id: 'rio-ave', name: 'Rio Ave', league: 'Primeira Liga', country: 'Portugal', apiId: 227 },
  { id: 'maritimo', name: 'Marítimo', league: 'Primeira Liga', country: 'Portugal', apiId: 221 },
  { id: 'moreirense', name: 'Moreirense', league: 'Primeira Liga', country: 'Portugal', apiId: 224 },
  { id: 'pacos-ferreira', name: 'Paços de Ferreira', league: 'Primeira Liga', country: 'Portugal', apiId: 226 },

  // MLS (United States)
  { id: 'lafc', name: 'Los Angeles FC', league: 'MLS', country: 'United States', apiId: 1613 },
  { id: 'la-galaxy', name: 'LA Galaxy', league: 'MLS', country: 'United States', apiId: 1616 },
  { id: 'atlanta-united', name: 'Atlanta United FC', league: 'MLS', country: 'United States', apiId: 1614 },
  { id: 'seattle-sounders', name: 'Seattle Sounders FC', league: 'MLS', country: 'United States', apiId: 1635 },
  { id: 'portland-timbers', name: 'Portland Timbers', league: 'MLS', country: 'United States', apiId: 1633 },
  { id: 'nycfc', name: 'New York City FC', league: 'MLS', country: 'United States', apiId: 1668 },
  { id: 'ny-red-bulls', name: 'New York Red Bulls', league: 'MLS', country: 'United States', apiId: 1631 },
  { id: 'toronto-fc', name: 'Toronto FC', league: 'MLS', country: 'United States', apiId: 1636 },
  { id: 'inter-miami', name: 'Inter Miami CF', league: 'MLS', country: 'United States', apiId: 1611 },
  { id: 'orlando-city', name: 'Orlando City SC', league: 'MLS', country: 'United States', apiId: 1669 },

  // Liga MX (Mexico)
  { id: 'america', name: 'Club América', league: 'Liga MX', country: 'Mexico', apiId: 2448 },
  { id: 'chivas', name: 'Guadalajara', league: 'Liga MX', country: 'Mexico', apiId: 2449 },
  { id: 'cruz-azul', name: 'Cruz Azul', league: 'Liga MX', country: 'Mexico', apiId: 2447 },
  { id: 'pumas', name: 'Pumas UNAM', league: 'Liga MX', country: 'Mexico', apiId: 2450 },
  { id: 'tigres', name: 'Tigres UANL', league: 'Liga MX', country: 'Mexico', apiId: 2451 },
  { id: 'monterrey', name: 'Monterrey', league: 'Liga MX', country: 'Mexico', apiId: 2452 },
  { id: 'santos-laguna', name: 'Santos Laguna', league: 'Liga MX', country: 'Mexico', apiId: 2453 },
  { id: 'leon', name: 'León', league: 'Liga MX', country: 'Mexico', apiId: 2454 },
  { id: 'toluca', name: 'Toluca', league: 'Liga MX', country: 'Mexico', apiId: 2455 },
  { id: 'pachuca', name: 'Pachuca', league: 'Liga MX', country: 'Mexico', apiId: 2456 },

  // Série A (Brazil)
  { id: 'flamengo', name: 'Flamengo', league: 'Série A', country: 'Brazil', apiId: 127 },
  { id: 'palmeiras', name: 'Palmeiras', league: 'Série A', country: 'Brazil', apiId: 128 },
  { id: 'corinthians', name: 'Corinthians', league: 'Série A', country: 'Brazil', apiId: 129 },
  { id: 'sao-paulo', name: 'São Paulo', league: 'Série A', country: 'Brazil', apiId: 130 },
  { id: 'santos', name: 'Santos', league: 'Série A', country: 'Brazil', apiId: 131 },
  { id: 'gremio', name: 'Grêmio', league: 'Série A', country: 'Brazil', apiId: 132 },
  { id: 'internacional', name: 'Internacional', league: 'Série A', country: 'Brazil', apiId: 133 },
  { id: 'atletico-mineiro', name: 'Atlético Mineiro', league: 'Série A', country: 'Brazil', apiId: 134 },
  { id: 'cruzeiro', name: 'Cruzeiro', league: 'Série A', country: 'Brazil', apiId: 135 },
  { id: 'botafogo', name: 'Botafogo', league: 'Série A', country: 'Brazil', apiId: 136 },

  // Primera División (Argentina)
  { id: 'boca-juniors', name: 'Boca Juniors', league: 'Primera División', country: 'Argentina', apiId: 451 },
  { id: 'river-plate', name: 'River Plate', league: 'Primera División', country: 'Argentina', apiId: 435 },
  { id: 'racing-club', name: 'Racing Club', league: 'Primera División', country: 'Argentina', apiId: 450 },
  { id: 'independiente', name: 'Independiente', league: 'Primera División', country: 'Argentina', apiId: 449 },
  { id: 'san-lorenzo', name: 'San Lorenzo', league: 'Primera División', country: 'Argentina', apiId: 452 },
  { id: 'estudiantes', name: 'Estudiantes', league: 'Primera División', country: 'Argentina', apiId: 448 },
  { id: 'velez-sarsfield', name: 'Vélez Sarsfield', league: 'Primera División', country: 'Argentina', apiId: 453 },
  { id: 'lanus', name: 'Lanús', league: 'Primera División', country: 'Argentina', apiId: 454 },
  { id: 'newells-old-boys', name: "Newell's Old Boys", league: 'Primera División', country: 'Argentina', apiId: 455 },
  { id: 'rosario-central', name: 'Rosario Central', league: 'Primera División', country: 'Argentina', apiId: 456 },

  // Scottish Premiership
  { id: 'celtic', name: 'Celtic', league: 'Scottish Premiership', country: 'Scotland', apiId: 247 },
  { id: 'rangers', name: 'Rangers', league: 'Scottish Premiership', country: 'Scotland', apiId: 246 },
  { id: 'aberdeen', name: 'Aberdeen', league: 'Scottish Premiership', country: 'Scotland', apiId: 248 },
  { id: 'hearts', name: 'Heart of Midlothian', league: 'Scottish Premiership', country: 'Scotland', apiId: 249 },
  { id: 'hibernian', name: 'Hibernian', league: 'Scottish Premiership', country: 'Scotland', apiId: 250 },
  { id: 'dundee-united', name: 'Dundee United', league: 'Scottish Premiership', country: 'Scotland', apiId: 251 },
  { id: 'motherwell', name: 'Motherwell', league: 'Scottish Premiership', country: 'Scotland', apiId: 252 },
  { id: 'st-johnstone', name: 'St. Johnstone', league: 'Scottish Premiership', country: 'Scotland', apiId: 253 },
  { id: 'kilmarnock', name: 'Kilmarnock', league: 'Scottish Premiership', country: 'Scotland', apiId: 254 },
  { id: 'livingston', name: 'Livingston', league: 'Scottish Premiership', country: 'Scotland', apiId: 255 },

  // Pro League (Belgium)
  { id: 'club-brugge', name: 'Club Brugge', league: 'Pro League', country: 'Belgium', apiId: 569 },
  { id: 'anderlecht', name: 'Anderlecht', league: 'Pro League', country: 'Belgium', apiId: 570 },
  { id: 'genk', name: 'KRC Genk', league: 'Pro League', country: 'Belgium', apiId: 571 },
  { id: 'standard-liege', name: 'Standard Liège', league: 'Pro League', country: 'Belgium', apiId: 572 },
  { id: 'gent', name: 'KAA Gent', league: 'Pro League', country: 'Belgium', apiId: 573 },
  { id: 'antwerp', name: 'Royal Antwerp', league: 'Pro League', country: 'Belgium', apiId: 574 },
  { id: 'mechelen', name: 'KV Mechelen', league: 'Pro League', country: 'Belgium', apiId: 575 },
  { id: 'charleroi', name: 'Charleroi', league: 'Pro League', country: 'Belgium', apiId: 576 },
  { id: 'oostende', name: 'KV Oostende', league: 'Pro League', country: 'Belgium', apiId: 577 },
  { id: 'kortrijk', name: 'KV Kortrijk', league: 'Pro League', country: 'Belgium', apiId: 578 },

  // Süper Lig (Turkey)
  { id: 'galatasaray', name: 'Galatasaray', league: 'Süper Lig', country: 'Turkey', apiId: 610 },
  { id: 'fenerbahce', name: 'Fenerbahçe', league: 'Süper Lig', country: 'Turkey', apiId: 611 },
  { id: 'besiktas', name: 'Beşiktaş', league: 'Süper Lig', country: 'Turkey', apiId: 612 },
  { id: 'trabzonspor', name: 'Trabzonspor', league: 'Süper Lig', country: 'Turkey', apiId: 613 },
  { id: 'basaksehir', name: 'İstanbul Başakşehir', league: 'Süper Lig', country: 'Turkey', apiId: 614 },
  { id: 'sivasspor', name: 'Sivasspor', league: 'Süper Lig', country: 'Turkey', apiId: 615 },
  { id: 'alanyaspor', name: 'Alanyaspor', league: 'Süper Lig', country: 'Turkey', apiId: 616 },
  { id: 'antalyaspor', name: 'Antalyaspor', league: 'Süper Lig', country: 'Turkey', apiId: 617 },
  { id: 'konyaspor', name: 'Konyaspor', league: 'Süper Lig', country: 'Turkey', apiId: 618 },
  { id: 'gaziantep', name: 'Gaziantep FK', league: 'Süper Lig', country: 'Turkey', apiId: 619 },

  // Championship (England)
  { id: 'leicester', name: 'Leicester City', league: 'Championship', country: 'England', apiId: 46 },
  { id: 'leeds-united', name: 'Leeds United', league: 'Championship', country: 'England', apiId: 63 },
  { id: 'southampton', name: 'Southampton', league: 'Championship', country: 'England', apiId: 41 },
  { id: 'ipswich', name: 'Ipswich Town', league: 'Championship', country: 'England', apiId: 1359 },
  { id: 'west-brom', name: 'West Bromwich Albion', league: 'Championship', country: 'England', apiId: 60 },
  { id: 'middlesbrough', name: 'Middlesbrough', league: 'Championship', country: 'England', apiId: 1371 },
  { id: 'norwich', name: 'Norwich City', league: 'Championship', country: 'England', apiId: 1370 },
  { id: 'coventry', name: 'Coventry City', league: 'Championship', country: 'England', apiId: 1346 },
  { id: 'preston', name: 'Preston North End', league: 'Championship', country: 'England', apiId: 1345 },
  { id: 'bristol-city', name: 'Bristol City', league: 'Championship', country: 'England', apiId: 1358 },

  // Segunda División (Spain)
  { id: 'real-zaragoza', name: 'Real Zaragoza', league: 'Segunda División', country: 'Spain', apiId: 2687 },
  { id: 'real-oviedo', name: 'Real Oviedo', league: 'Segunda División', country: 'Spain', apiId: 2688 },
  { id: 'sporting-gijon', name: 'Sporting Gijón', league: 'Segunda División', country: 'Spain', apiId: 2689 },
  { id: 'malaga', name: 'Málaga', league: 'Segunda División', country: 'Spain', apiId: 2690 },
  { id: 'deportivo', name: 'Deportivo La Coruña', league: 'Segunda División', country: 'Spain', apiId: 2691 },
  { id: 'racing-santander', name: 'Racing Santander', league: 'Segunda División', country: 'Spain', apiId: 2692 },
  { id: 'real-valladolid', name: 'Real Valladolid', league: 'Segunda División', country: 'Spain', apiId: 720 },
  { id: 'levante', name: 'Levante', league: 'Segunda División', country: 'Spain', apiId: 2693 },
  { id: 'tenerife', name: 'CD Tenerife', league: 'Segunda División', country: 'Spain', apiId: 2694 },
  { id: 'eibar', name: 'SD Eibar', league: 'Segunda División', country: 'Spain', apiId: 2695 },

  // 2. Bundesliga (Germany)
  { id: 'hamburger-sv', name: 'Hamburger SV', league: '2. Bundesliga', country: 'Germany', apiId: 171 },
  { id: 'st-pauli', name: 'FC St. Pauli', league: '2. Bundesliga', country: 'Germany', apiId: 1842 },
  { id: 'fortuna-dusseldorf', name: 'Fortuna Düsseldorf', league: '2. Bundesliga', country: 'Germany', apiId: 1843 },
  { id: 'hannover-96', name: 'Hannover 96', league: '2. Bundesliga', country: 'Germany', apiId: 1844 },
  { id: 'kaiserslautern', name: '1. FC Kaiserslautern', league: '2. Bundesliga', country: 'Germany', apiId: 1845 },
  { id: 'karlsruher-sc', name: 'Karlsruher SC', league: '2. Bundesliga', country: 'Germany', apiId: 1846 },
  { id: 'paderborn', name: 'SC Paderborn 07', league: '2. Bundesliga', country: 'Germany', apiId: 1847 },
  { id: 'darmstadt', name: 'SV Darmstadt 98', league: '2. Bundesliga', country: 'Germany', apiId: 1848 },
  { id: 'greuther-furth', name: 'SpVgg Greuther Fürth', league: '2. Bundesliga', country: 'Germany', apiId: 1849 },
  { id: 'nurnberg', name: '1. FC Nürnberg', league: '2. Bundesliga', country: 'Germany', apiId: 1850 },

  // Serie B (Italy)
  { id: 'parma', name: 'Parma', league: 'Serie B', country: 'Italy', apiId: 1106 },
  { id: 'como', name: 'Como', league: 'Serie B', country: 'Italy', apiId: 1107 },
  { id: 'venezia-fc', name: 'Venezia FC', league: 'Serie B', country: 'Italy', apiId: 517 },
  { id: 'cremonese', name: 'Cremonese', league: 'Serie B', country: 'Italy', apiId: 1108 },
  { id: 'palermo', name: 'Palermo', league: 'Serie B', country: 'Italy', apiId: 1109 },
  { id: 'brescia', name: 'Brescia', league: 'Serie B', country: 'Italy', apiId: 1110 },
  { id: 'sampdoria-b', name: 'Sampdoria', league: 'Serie B', country: 'Italy', apiId: 584 },
  { id: 'catanzaro', name: 'Catanzaro', league: 'Serie B', country: 'Italy', apiId: 1111 },
  { id: 'cosenza', name: 'Cosenza', league: 'Serie B', country: 'Italy', apiId: 1112 },
  { id: 'modena', name: 'Modena', league: 'Serie B', country: 'Italy', apiId: 1113 },

  // Ligue 2 (France)
  { id: 'auxerre', name: 'AJ Auxerre', league: 'Ligue 2', country: 'France', apiId: 1395 },
  { id: 'amiens', name: 'Amiens SC', league: 'Ligue 2', country: 'France', apiId: 1396 },
  { id: 'bastia', name: 'SC Bastia', league: 'Ligue 2', country: 'France', apiId: 1397 },
  { id: 'caen', name: 'SM Caen', league: 'Ligue 2', country: 'France', apiId: 1398 },
  { id: 'grenoble', name: 'Grenoble Foot 38', league: 'Ligue 2', country: 'France', apiId: 1399 },
  { id: 'laval', name: 'Stade Lavallois', league: 'Ligue 2', country: 'France', apiId: 1400 },
  { id: 'pau-fc', name: 'Pau FC', league: 'Ligue 2', country: 'France', apiId: 1401 },
  { id: 'quevilly', name: 'US Quevilly-Rouen', league: 'Ligue 2', country: 'France', apiId: 1402 },
  { id: 'rodez', name: 'Rodez AF', league: 'Ligue 2', country: 'France', apiId: 1403 },
  { id: 'sochaux', name: 'FC Sochaux-Montbéliard', league: 'Ligue 2', country: 'France', apiId: 1404 },

  // African Teams - Nigeria (NPFL)
  { id: 'rivers-united', name: 'Rivers United', league: 'NPFL', country: 'Nigeria', apiId: 2001 },
  { id: 'plateau-united', name: 'Plateau United', league: 'NPFL', country: 'Nigeria', apiId: 2002 },
  { id: 'kano-pillars', name: 'Kano Pillars', league: 'NPFL', country: 'Nigeria', apiId: 2003 },
  { id: 'enyimba', name: 'Enyimba FC', league: 'NPFL', country: 'Nigeria', apiId: 2004 },
  { id: 'rangers-intl', name: 'Rangers International', league: 'NPFL', country: 'Nigeria', apiId: 2005 },
  { id: 'akwa-united', name: 'Akwa United', league: 'NPFL', country: 'Nigeria', apiId: 2006 },
  { id: 'kwara-united', name: 'Kwara United', league: 'NPFL', country: 'Nigeria', apiId: 2007 },
  { id: 'heartland-fc', name: 'Heartland FC', league: 'NPFL', country: 'Nigeria', apiId: 2008 },
  { id: 'lobi-stars', name: 'Lobi Stars', league: 'NPFL', country: 'Nigeria', apiId: 2009 },
  { id: 'shooting-stars', name: 'Shooting Stars SC', league: 'NPFL', country: 'Nigeria', apiId: 2010 },

  // African Teams - Egypt (Egyptian Premier League)
  { id: 'al-ahly', name: 'Al Ahly SC', league: 'Egyptian Premier League', country: 'Egypt', apiId: 2011 },
  { id: 'zamalek', name: 'Zamalek SC', league: 'Egyptian Premier League', country: 'Egypt', apiId: 2012 },
  { id: 'pyramids-fc', name: 'Pyramids FC', league: 'Egyptian Premier League', country: 'Egypt', apiId: 2013 },
  { id: 'ismaily', name: 'Ismaily SC', league: 'Egyptian Premier League', country: 'Egypt', apiId: 2014 },
  { id: 'al-masry', name: 'Al Masry SC', league: 'Egyptian Premier League', country: 'Egypt', apiId: 2015 },
  { id: 'el-gouna', name: 'El Gouna FC', league: 'Egyptian Premier League', country: 'Egypt', apiId: 2016 },

  // African Teams - Morocco (Botola Pro)
  { id: 'wydad-casablanca', name: 'Wydad Casablanca', league: 'Botola Pro', country: 'Morocco', apiId: 2017 },
  { id: 'raja-casablanca', name: 'Raja Casablanca', league: 'Botola Pro', country: 'Morocco', apiId: 2018 },
  { id: 'far-rabat', name: 'FAR Rabat', league: 'Botola Pro', country: 'Morocco', apiId: 2019 },
  { id: 'renaissance-berkane', name: 'Renaissance Berkane', league: 'Botola Pro', country: 'Morocco', apiId: 2020 },
  { id: 'hassania-agadir', name: 'Hassania Agadir', league: 'Botola Pro', country: 'Morocco', apiId: 2021 },

  // African Teams - South Africa (Premier Soccer League)
  { id: 'mamelodi-sundowns', name: 'Mamelodi Sundowns', league: 'Premier Soccer League', country: 'South Africa', apiId: 2022 },
  { id: 'kaizer-chiefs', name: 'Kaizer Chiefs', league: 'Premier Soccer League', country: 'South Africa', apiId: 2023 },
  { id: 'orlando-pirates', name: 'Orlando Pirates', league: 'Premier Soccer League', country: 'South Africa', apiId: 2024 },
  { id: 'supersport-united', name: 'SuperSport United', league: 'Premier Soccer League', country: 'South Africa', apiId: 2025 },
  { id: 'cape-town-city', name: 'Cape Town City FC', league: 'Premier Soccer League', country: 'South Africa', apiId: 2026 },

  // African Teams - Ghana (Ghana Premier League)
  { id: 'asante-kotoko', name: 'Asante Kotoko SC', league: 'Ghana Premier League', country: 'Ghana', apiId: 2027 },
  { id: 'hearts-of-oak', name: 'Hearts of Oak SC', league: 'Ghana Premier League', country: 'Ghana', apiId: 2028 },
  { id: 'aduana-stars', name: 'Aduana Stars FC', league: 'Ghana Premier League', country: 'Ghana', apiId: 2029 },
  { id: 'medeama-sc', name: 'Medeama SC', league: 'Ghana Premier League', country: 'Ghana', apiId: 2030 },

  // African Teams - Senegal (Ligue 1 Senegal)
  { id: 'generation-foot', name: 'Génération Foot', league: 'Ligue 1 Senegal', country: 'Senegal', apiId: 2031 },
  { id: 'casa-sports', name: 'Casa Sports', league: 'Ligue 1 Senegal', country: 'Senegal', apiId: 2032 },
  { id: 'jaraaf', name: 'Jaraaf de Dakar', league: 'Ligue 1 Senegal', country: 'Senegal', apiId: 2033 },

  // African Teams - Ivory Coast (Ligue 1 Ivory Coast)
  { id: 'asec-mimosas', name: 'ASEC Mimosas', league: 'Ligue 1 Ivory Coast', country: 'Ivory Coast', apiId: 2034 },
  { id: 'africa-sports', name: 'Africa Sports', league: 'Ligue 1 Ivory Coast', country: 'Ivory Coast', apiId: 2035 },
  { id: 'san-pedro', name: 'San-Pédro FC', league: 'Ligue 1 Ivory Coast', country: 'Ivory Coast', apiId: 2036 },

  // African Teams - Cameroon (Elite One)
  { id: 'canon-yaounde', name: 'Canon Yaoundé', league: 'Elite One', country: 'Cameroon', apiId: 2037 },
  { id: 'cotonsport', name: 'Cotonsport Garoua', league: 'Elite One', country: 'Cameroon', apiId: 2038 },
  { id: 'union-douala', name: 'Union Douala', league: 'Elite One', country: 'Cameroon', apiId: 2039 },

  // African Teams - Tunisia (Tunisian Ligue Professionnelle 1)
  { id: 'esperance-tunis', name: 'Espérance de Tunis', league: 'Tunisian Ligue Professionnelle 1', country: 'Tunisia', apiId: 2040 },
  { id: 'club-africain', name: 'Club Africain', league: 'Tunisian Ligue Professionnelle 1', country: 'Tunisia', apiId: 2041 },
  { id: 'etoile-sahel', name: 'Étoile du Sahel', league: 'Tunisian Ligue Professionnelle 1', country: 'Tunisia', apiId: 2042 },

  // African Teams - Algeria (Ligue Professionnelle 1)
  { id: 'cr-belouizdad', name: 'CR Belouizdad', league: 'Ligue Professionnelle 1', country: 'Algeria', apiId: 2043 },
  { id: 'js-kabylie', name: 'JS Kabylie', league: 'Ligue Professionnelle 1', country: 'Algeria', apiId: 2044 },
  { id: 'mc-alger', name: 'MC Alger', league: 'Ligue Professionnelle 1', country: 'Algeria', apiId: 2045 },

  // African Teams - Kenya (Kenyan Premier League)
  { id: 'gor-mahia', name: 'Gor Mahia FC', league: 'Kenyan Premier League', country: 'Kenya', apiId: 2046 },
  { id: 'afc-leopards', name: 'AFC Leopards', league: 'Kenyan Premier League', country: 'Kenya', apiId: 2047 },
  { id: 'tusker-fc', name: 'Tusker FC', league: 'Kenyan Premier League', country: 'Kenya', apiId: 2048 },

  // African Teams - Ethiopia (Ethiopian Premier League)
  { id: 'saint-george', name: 'Saint George SC', league: 'Ethiopian Premier League', country: 'Ethiopia', apiId: 2049 },
  { id: 'defence-force', name: 'Defence Force SC', league: 'Ethiopian Premier League', country: 'Ethiopia', apiId: 2050 },
  { id: 'fasil-kenema', name: 'Fasil Kenema SC', league: 'Ethiopian Premier League', country: 'Ethiopia', apiId: 2051 },

  // Additional European Teams
  // Austrian Bundesliga
  { id: 'red-bull-salzburg', name: 'Red Bull Salzburg', league: 'Austrian Bundesliga', country: 'Austria', apiId: 2052 },
  { id: 'rapid-vienna', name: 'Rapid Vienna', league: 'Austrian Bundesliga', country: 'Austria', apiId: 2053 },
  { id: 'austria-vienna', name: 'Austria Vienna', league: 'Austrian Bundesliga', country: 'Austria', apiId: 2054 },

  // Swiss Super League
  { id: 'basel', name: 'FC Basel', league: 'Swiss Super League', country: 'Switzerland', apiId: 2055 },
  { id: 'young-boys', name: 'Young Boys', league: 'Swiss Super League', country: 'Switzerland', apiId: 2056 },
  { id: 'zurich', name: 'FC Zurich', league: 'Swiss Super League', country: 'Switzerland', apiId: 2057 },

  // Danish Superliga
  { id: 'fc-copenhagen', name: 'FC Copenhagen', league: 'Danish Superliga', country: 'Denmark', apiId: 2058 },
  { id: 'brondby', name: 'Brøndby IF', league: 'Danish Superliga', country: 'Denmark', apiId: 2059 },
  { id: 'fc-midtjylland', name: 'FC Midtjylland', league: 'Danish Superliga', country: 'Denmark', apiId: 2060 },

  // Norwegian Eliteserien
  { id: 'rosenborg', name: 'Rosenborg BK', league: 'Eliteserien', country: 'Norway', apiId: 2061 },
  { id: 'molde', name: 'Molde FK', league: 'Eliteserien', country: 'Norway', apiId: 2062 },
  { id: 'bodo-glimt', name: 'Bodø/Glimt', league: 'Eliteserien', country: 'Norway', apiId: 2063 },

  // Swedish Allsvenskan
  { id: 'malmo-ff', name: 'Malmö FF', league: 'Allsvenskan', country: 'Sweden', apiId: 2064 },
  { id: 'aik', name: 'AIK', league: 'Allsvenskan', country: 'Sweden', apiId: 2065 },
  { id: 'djurgardens-if', name: 'Djurgårdens IF', league: 'Allsvenskan', country: 'Sweden', apiId: 2066 },

  // Finnish Veikkausliiga
  { id: 'hjk-helsinki', name: 'HJK Helsinki', league: 'Veikkausliiga', country: 'Finland', apiId: 2067 },
  { id: 'kups', name: 'KuPS', league: 'Veikkausliiga', country: 'Finland', apiId: 2068 },

  // Czech First League
  { id: 'slavia-prague', name: 'Slavia Prague', league: 'Czech First League', country: 'Czech Republic', apiId: 2069 },
  { id: 'sparta-prague', name: 'Sparta Prague', league: 'Czech First League', country: 'Czech Republic', apiId: 2070 },
  { id: 'viktoria-plzen', name: 'Viktoria Plzen', league: 'Czech First League', country: 'Czech Republic', apiId: 2071 },

  // Polish Ekstraklasa
  { id: 'legia-warsaw', name: 'Legia Warsaw', league: 'Ekstraklasa', country: 'Poland', apiId: 2072 },
  { id: 'lech-poznan', name: 'Lech Poznań', league: 'Ekstraklasa', country: 'Poland', apiId: 2073 },
  { id: 'cracovia', name: 'Cracovia', league: 'Ekstraklasa', country: 'Poland', apiId: 2074 },

  // Ukrainian Premier League
  { id: 'dynamo-kyiv', name: 'Dynamo Kyiv', league: 'Ukrainian Premier League', country: 'Ukraine', apiId: 2075 },
  { id: 'shakhtar-donetsk', name: 'Shakhtar Donetsk', league: 'Ukrainian Premier League', country: 'Ukraine', apiId: 2076 },

  // Croatian First League
  { id: 'dinamo-zagreb', name: 'Dinamo Zagreb', league: 'Croatian First League', country: 'Croatia', apiId: 2077 },
  { id: 'hajduk-split', name: 'Hajduk Split', league: 'Croatian First League', country: 'Croatia', apiId: 2078 },
  { id: 'rijeka', name: 'HNK Rijeka', league: 'Croatian First League', country: 'Croatia', apiId: 2079 },

  // Serbian SuperLiga
  { id: 'red-star-belgrade', name: 'Red Star Belgrade', league: 'Serbian SuperLiga', country: 'Serbia', apiId: 2080 },
  { id: 'partizan', name: 'Partizan', league: 'Serbian SuperLiga', country: 'Serbia', apiId: 2081 },

  // Greek Super League
  { id: 'olympiacos', name: 'Olympiacos', league: 'Greek Super League', country: 'Greece', apiId: 2082 },
  { id: 'panathinaikos', name: 'Panathinaikos', league: 'Greek Super League', country: 'Greece', apiId: 2083 },
  { id: 'aek-athens', name: 'AEK Athens', league: 'Greek Super League', country: 'Greece', apiId: 2084 },

  // Romanian Liga I
  { id: 'steaua-bucharest', name: 'FCSB', league: 'Liga I', country: 'Romania', apiId: 2085 },
  { id: 'cfr-cluj', name: 'CFR Cluj', league: 'Liga I', country: 'Romania', apiId: 2086 },

  // Bulgarian First League
  { id: 'ludogorets', name: 'Ludogorets Razgrad', league: 'Bulgarian First League', country: 'Bulgaria', apiId: 2087 },
  { id: 'cska-sofia', name: 'CSKA Sofia', league: 'Bulgarian First League', country: 'Bulgaria', apiId: 2088 },

  // Asian Teams
  // Japanese J1 League
  { id: 'kashima-antlers', name: 'Kashima Antlers', league: 'J1 League', country: 'Japan', apiId: 2089 },
  { id: 'urawa-reds', name: 'Urawa Red Diamonds', league: 'J1 League', country: 'Japan', apiId: 2090 },
  { id: 'yokohama-marinos', name: 'Yokohama F. Marinos', league: 'J1 League', country: 'Japan', apiId: 2091 },
  { id: 'kawasaki-frontale', name: 'Kawasaki Frontale', league: 'J1 League', country: 'Japan', apiId: 2092 },
  { id: 'gamba-osaka', name: 'Gamba Osaka', league: 'J1 League', country: 'Japan', apiId: 2093 },
  { id: 'cerezo-osaka', name: 'Cerezo Osaka', league: 'J1 League', country: 'Japan', apiId: 2094 },

  // South Korean K League 1
  { id: 'jeonbuk-motors', name: 'Jeonbuk Hyundai Motors', league: 'K League 1', country: 'South Korea', apiId: 2095 },
  { id: 'ulsan-hyundai', name: 'Ulsan Hyundai', league: 'K League 1', country: 'South Korea', apiId: 2096 },
  { id: 'fc-seoul', name: 'FC Seoul', league: 'K League 1', country: 'South Korea', apiId: 2097 },
  { id: 'suwon-samsung', name: 'Suwon Samsung Bluewings', league: 'K League 1', country: 'South Korea', apiId: 2098 },

  // Chinese Super League
  { id: 'guangzhou-fc', name: 'Guangzhou FC', league: 'Chinese Super League', country: 'China', apiId: 2099 },
  { id: 'shanghai-sipg', name: 'Shanghai Port', league: 'Chinese Super League', country: 'China', apiId: 2100 },
  { id: 'beijing-guoan', name: 'Beijing Guoan', league: 'Chinese Super League', country: 'China', apiId: 2101 },
  { id: 'shandong-taishan', name: 'Shandong Taishan', league: 'Chinese Super League', country: 'China', apiId: 2102 },

  // Australian A-League
  { id: 'melbourne-city', name: 'Melbourne City FC', league: 'A-League Men', country: 'Australia', apiId: 2103 },
  { id: 'sydney-fc', name: 'Sydney FC', league: 'A-League Men', country: 'Australia', apiId: 2104 },
  { id: 'melbourne-victory', name: 'Melbourne Victory', league: 'A-League Men', country: 'Australia', apiId: 2105 },
  { id: 'western-sydney', name: 'Western Sydney Wanderers', league: 'A-League Men', country: 'Australia', apiId: 2106 },

  // Indian Super League
  { id: 'mumbai-city', name: 'Mumbai City FC', league: 'Indian Super League', country: 'India', apiId: 2107 },
  { id: 'atk-mohun-bagan', name: 'ATK Mohun Bagan', league: 'Indian Super League', country: 'India', apiId: 2108 },
  { id: 'bengaluru-fc', name: 'Bengaluru FC', league: 'Indian Super League', country: 'India', apiId: 2109 },
  { id: 'kerala-blasters', name: 'Kerala Blasters FC', league: 'Indian Super League', country: 'India', apiId: 2110 },

  // Saudi Pro League
  { id: 'al-hilal', name: 'Al Hilal', league: 'Saudi Pro League', country: 'Saudi Arabia', apiId: 2111 },
  { id: 'al-nassr', name: 'Al Nassr', league: 'Saudi Pro League', country: 'Saudi Arabia', apiId: 2112 },
  { id: 'al-ittihad', name: 'Al Ittihad', league: 'Saudi Pro League', country: 'Saudi Arabia', apiId: 2113 },
  { id: 'al-ahli-saudi', name: 'Al Ahli', league: 'Saudi Pro League', country: 'Saudi Arabia', apiId: 2114 },

  // UAE Pro League
  { id: 'al-ain', name: 'Al Ain FC', league: 'UAE Pro League', country: 'UAE', apiId: 2115 },
  { id: 'al-ahli-dubai', name: 'Al Ahli Dubai', league: 'UAE Pro League', country: 'UAE', apiId: 2116 },
  { id: 'sharjah-fc', name: 'Sharjah FC', league: 'UAE Pro League', country: 'UAE', apiId: 2117 },

  // Qatar Stars League
  { id: 'al-sadd', name: 'Al Sadd', league: 'Qatar Stars League', country: 'Qatar', apiId: 2118 },
  { id: 'al-duhail', name: 'Al Duhail', league: 'Qatar Stars League', country: 'Qatar', apiId: 2119 },
  { id: 'al-rayyan', name: 'Al Rayyan', league: 'Qatar Stars League', country: 'Qatar', apiId: 2120 },

  // Additional South American Teams
  // Colombian Primera A
  { id: 'millonarios', name: 'Millonarios FC', league: 'Primera A', country: 'Colombia', apiId: 2121 },
  { id: 'america-cali', name: 'América de Cali', league: 'Primera A', country: 'Colombia', apiId: 2122 },
  { id: 'atletico-nacional', name: 'Atlético Nacional', league: 'Primera A', country: 'Colombia', apiId: 2123 },
  { id: 'santa-fe', name: 'Independiente Santa Fe', league: 'Primera A', country: 'Colombia', apiId: 2124 },

  // Chilean Primera División
  { id: 'colo-colo', name: 'Colo-Colo', league: 'Primera División', country: 'Chile', apiId: 2125 },
  { id: 'universidad-chile', name: 'Universidad de Chile', league: 'Primera División', country: 'Chile', apiId: 2126 },
  { id: 'universidad-catolica', name: 'Universidad Católica', league: 'Primera División', country: 'Chile', apiId: 2127 },

  // Uruguayan Primera División
  { id: 'penarol', name: 'Peñarol', league: 'Primera División', country: 'Uruguay', apiId: 2128 },
  { id: 'nacional-uruguay', name: 'Nacional', league: 'Primera División', country: 'Uruguay', apiId: 2129 },
  { id: 'defensor-sporting', name: 'Defensor Sporting', league: 'Primera División', country: 'Uruguay', apiId: 2130 },

  // Paraguayan Primera División
  { id: 'olimpia-paraguay', name: 'Olimpia', league: 'Primera División', country: 'Paraguay', apiId: 2131 },
  { id: 'cerro-porteno', name: 'Cerro Porteño', league: 'Primera División', country: 'Paraguay', apiId: 2132 },
  { id: 'libertad', name: 'Libertad', league: 'Primera División', country: 'Paraguay', apiId: 2133 },

  // Ecuadorian Serie A
  { id: 'barcelona-sc', name: 'Barcelona SC', league: 'Serie A', country: 'Ecuador', apiId: 2134 },
  { id: 'emelec', name: 'Emelec', league: 'Serie A', country: 'Ecuador', apiId: 2135 },
  { id: 'ldu-quito', name: 'LDU Quito', league: 'Serie A', country: 'Ecuador', apiId: 2136 },

  // Peruvian Primera División
  { id: 'alianza-lima', name: 'Alianza Lima', league: 'Primera División', country: 'Peru', apiId: 2137 },
  { id: 'universitario', name: 'Universitario', league: 'Primera División', country: 'Peru', apiId: 2138 },
  { id: 'sporting-cristal', name: 'Sporting Cristal', league: 'Primera División', country: 'Peru', apiId: 2139 },

  // Venezuelan Primera División
  { id: 'caracas-fc', name: 'Caracas FC', league: 'Primera División', country: 'Venezuela', apiId: 2140 },
  { id: 'deportivo-tachira', name: 'Deportivo Táchira', league: 'Primera División', country: 'Venezuela', apiId: 2141 },

  // Canadian Premier League
  { id: 'forge-fc', name: 'Forge FC', league: 'Canadian Premier League', country: 'Canada', apiId: 2142 },
  { id: 'cavalry-fc', name: 'Cavalry FC', league: 'Canadian Premier League', country: 'Canada', apiId: 2143 },
  { id: 'pacific-fc', name: 'Pacific FC', league: 'Canadian Premier League', country: 'Canada', apiId: 2144 },

  // Additional MLS Teams
  { id: 'cf-montreal', name: 'CF Montréal', league: 'MLS', country: 'Canada', apiId: 2145 },
  { id: 'vancouver-whitecaps', name: 'Vancouver Whitecaps FC', league: 'MLS', country: 'Canada', apiId: 2146 },
  { id: 'chicago-fire', name: 'Chicago Fire FC', league: 'MLS', country: 'United States', apiId: 2147 },
  { id: 'columbus-crew', name: 'Columbus Crew', league: 'MLS', country: 'United States', apiId: 2148 },
  { id: 'dc-united', name: 'D.C. United', league: 'MLS', country: 'United States', apiId: 2149 },
  { id: 'new-england-revolution', name: 'New England Revolution', league: 'MLS', country: 'United States', apiId: 2150 },
  { id: 'philadelphia-union', name: 'Philadelphia Union', league: 'MLS', country: 'United States', apiId: 2151 },
  { id: 'nashville-sc', name: 'Nashville SC', league: 'MLS', country: 'United States', apiId: 2152 },
  { id: 'austin-fc', name: 'Austin FC', league: 'MLS', country: 'United States', apiId: 2153 },
  { id: 'fc-dallas', name: 'FC Dallas', league: 'MLS', country: 'United States', apiId: 2154 },
  { id: 'houston-dynamo', name: 'Houston Dynamo FC', league: 'MLS', country: 'United States', apiId: 2155 },
  { id: 'sporting-kc', name: 'Sporting Kansas City', league: 'MLS', country: 'United States', apiId: 2156 },
  { id: 'minnesota-united', name: 'Minnesota United FC', league: 'MLS', country: 'United States', apiId: 2157 },
  { id: 'colorado-rapids', name: 'Colorado Rapids', league: 'MLS', country: 'United States', apiId: 2158 },
  { id: 'real-salt-lake', name: 'Real Salt Lake', league: 'MLS', country: 'United States', apiId: 2159 },
  { id: 'san-jose-earthquakes', name: 'San Jose Earthquakes', league: 'MLS', country: 'United States', apiId: 2160 },

  // More African Teams
  // Moroccan Botola Pro (Additional)
  { id: 'rs-berkane', name: 'RS Berkane', league: 'Botola Pro', country: 'Morocco', apiId: 2161 },
  { id: 'maghreb-fez', name: 'Maghreb de Fès', league: 'Botola Pro', country: 'Morocco', apiId: 2162 },
  { id: 'olympique-safi', name: 'Olympique de Safi', league: 'Botola Pro', country: 'Morocco', apiId: 2163 },

  // Egyptian Premier League (Additional)
  { id: 'al-masry-port-said', name: 'Al Masry Port Said', league: 'Egyptian Premier League', country: 'Egypt', apiId: 2164 },
  { id: 'future-fc', name: 'Future FC', league: 'Egyptian Premier League', country: 'Egypt', apiId: 2165 },
  { id: 'ceramica-cleopatra', name: 'Ceramica Cleopatra', league: 'Egyptian Premier League', country: 'Egypt', apiId: 2166 },

  // Tunisian Ligue Professionnelle 1 (Additional)
  { id: 'cs-sfaxien', name: 'CS Sfaxien', league: 'Tunisian Ligue Professionnelle 1', country: 'Tunisia', apiId: 2167 },
  { id: 'ca-bizertin', name: 'CA Bizertin', league: 'Tunisian Ligue Professionnelle 1', country: 'Tunisia', apiId: 2168 },

  // Algerian Ligue Professionnelle 1 (Additional)
  { id: 'usm-alger', name: 'USM Alger', league: 'Ligue Professionnelle 1', country: 'Algeria', apiId: 2169 },
  { id: 'es-setif', name: 'ES Sétif', league: 'Ligue Professionnelle 1', country: 'Algeria', apiId: 2170 },

  // South African Premier Soccer League (Additional)
  { id: 'amazulu', name: 'AmaZulu FC', league: 'Premier Soccer League', country: 'South Africa', apiId: 2171 },
  { id: 'golden-arrows', name: 'Golden Arrows', league: 'Premier Soccer League', country: 'South Africa', apiId: 2172 },
  { id: 'stellenbosch-fc', name: 'Stellenbosch FC', league: 'Premier Soccer League', country: 'South Africa', apiId: 2173 },

  // Nigerian NPFL (Additional)
  { id: 'katsina-united', name: 'Katsina United', league: 'NPFL', country: 'Nigeria', apiId: 2174 },
  { id: 'nasarawa-united', name: 'Nasarawa United', league: 'NPFL', country: 'Nigeria', apiId: 2175 },
  { id: 'wikki-tourists', name: 'Wikki Tourists', league: 'NPFL', country: 'Nigeria', apiId: 2176 },

  // Ghanaian Premier League (Additional)
  { id: 'great-olympics', name: 'Great Olympics', league: 'Ghana Premier League', country: 'Ghana', apiId: 2177 },
  { id: 'legon-cities', name: 'Legon Cities FC', league: 'Ghana Premier League', country: 'Ghana', apiId: 2178 },

  // Kenyan Premier League (Additional)
  { id: 'kariobangi-sharks', name: 'Kariobangi Sharks', league: 'Kenyan Premier League', country: 'Kenya', apiId: 2179 },
  { id: 'kakamega-homeboyz', name: 'Kakamega Homeboyz', league: 'Kenyan Premier League', country: 'Kenya', apiId: 2180 },

  // Cameroonian Elite One (Additional)
  { id: 'new-stars-douala', name: 'New Stars de Douala', league: 'Elite One', country: 'Cameroon', apiId: 2181 },
  { id: 'ums-loum', name: 'UMS de Loum', league: 'Elite One', country: 'Cameroon', apiId: 2182 },

  // Ivorian Ligue 1 (Additional)
  { id: 'so-armee', name: 'SO Armée', league: 'Ligue 1 Ivory Coast', country: 'Ivory Coast', apiId: 2183 },
  { id: 'stella-adjame', name: 'Stella Club d\'Adjamé', league: 'Ligue 1 Ivory Coast', country: 'Ivory Coast', apiId: 2184 },

  // Senegalese Ligue 1 (Additional)
  { id: 'teungueth-fc', name: 'Teungueth FC', league: 'Ligue 1 Senegal', country: 'Senegal', apiId: 2185 },
  { id: 'diambars', name: 'Diambars FC', league: 'Ligue 1 Senegal', country: 'Senegal', apiId: 2186 },

  // National Teams
  { id: 'nt-nigeria', name: 'Nigeria', league: 'International', country: 'Nigeria', apiId: 2396, isNationalTeam: true },
  { id: 'nt-england', name: 'England', league: 'International', country: 'England', apiId: 10, isNationalTeam: true },
  { id: 'nt-brazil', name: 'Brazil', league: 'International', country: 'Brazil', apiId: 6, isNationalTeam: true },
  { id: 'nt-argentina', name: 'Argentina', league: 'International', country: 'Argentina', apiId: 26, isNationalTeam: true },
  { id: 'nt-france', name: 'France', league: 'International', country: 'France', apiId: 2, isNationalTeam: true },
  { id: 'nt-spain', name: 'Spain', league: 'International', country: 'Spain', apiId: 9, isNationalTeam: true },
  { id: 'nt-germany', name: 'Germany', league: 'International', country: 'Germany', apiId: 25, isNationalTeam: true },
  { id: 'nt-italy', name: 'Italy', league: 'International', country: 'Italy', apiId: 768, isNationalTeam: true },
  { id: 'nt-portugal', name: 'Portugal', league: 'International', country: 'Portugal', apiId: 27, isNationalTeam: true },
  { id: 'nt-netherlands', name: 'Netherlands', league: 'International', country: 'Netherlands', apiId: 1118, isNationalTeam: true },
  { id: 'nt-belgium', name: 'Belgium', league: 'International', country: 'Belgium', apiId: 1, isNationalTeam: true },
  { id: 'nt-uruguay', name: 'Uruguay', league: 'International', country: 'Uruguay', apiId: 7, isNationalTeam: true },
  { id: 'nt-croatia', name: 'Croatia', league: 'International', country: 'Croatia', apiId: 3, isNationalTeam: true },
  { id: 'nt-morocco', name: 'Morocco', league: 'International', country: 'Morocco', apiId: 31, isNationalTeam: true },
  { id: 'nt-senegal', name: 'Senegal', league: 'International', country: 'Senegal', apiId: 13, isNationalTeam: true },
  { id: 'nt-ghana', name: 'Ghana', league: 'International', country: 'Ghana', apiId: 1569, isNationalTeam: true },
  { id: 'nt-cameroon', name: 'Cameroon', league: 'International', country: 'Cameroon', apiId: 1530, isNationalTeam: true },
  { id: 'nt-egypt', name: 'Egypt', league: 'International', country: 'Egypt', apiId: 1563, isNationalTeam: true },
  { id: 'nt-ivory-coast', name: 'Ivory Coast', league: 'International', country: 'Ivory Coast', apiId: 1501, isNationalTeam: true },
  { id: 'nt-south-africa', name: 'South Africa', league: 'International', country: 'South Africa', apiId: 21, isNationalTeam: true },
  { id: 'nt-tunisia', name: 'Tunisia', league: 'International', country: 'Tunisia', apiId: 28, isNationalTeam: true },
  { id: 'nt-algeria', name: 'Algeria', league: 'International', country: 'Algeria', apiId: 1503, isNationalTeam: true },
  { id: 'nt-mali', name: 'Mali', league: 'International', country: 'Mali', apiId: 1511, isNationalTeam: true },
  { id: 'nt-burkina-faso', name: 'Burkina Faso', league: 'International', country: 'Burkina Faso', apiId: 1504, isNationalTeam: true },
  { id: 'nt-guinea', name: 'Guinea', league: 'International', country: 'Guinea', apiId: 1521, isNationalTeam: true },
  { id: 'nt-kenya', name: 'Kenya', league: 'International', country: 'Kenya', apiId: 1509, isNationalTeam: true },
  { id: 'nt-ethiopia', name: 'Ethiopia', league: 'International', country: 'Ethiopia', apiId: 1505, isNationalTeam: true },
  { id: 'nt-usa', name: 'USA', league: 'International', country: 'United States', apiId: 2384, isNationalTeam: true },
  { id: 'nt-mexico', name: 'Mexico', league: 'International', country: 'Mexico', apiId: 16, isNationalTeam: true },
  { id: 'nt-canada', name: 'Canada', league: 'International', country: 'Canada', apiId: 1118, isNationalTeam: true },
  { id: 'nt-japan', name: 'Japan', league: 'International', country: 'Japan', apiId: 12, isNationalTeam: true },
  { id: 'nt-south-korea', name: 'South Korea', league: 'International', country: 'South Korea', apiId: 17, isNationalTeam: true },
  { id: 'nt-australia', name: 'Australia', league: 'International', country: 'Australia', apiId: 2378, isNationalTeam: true },
  { id: 'nt-saudi-arabia', name: 'Saudi Arabia', league: 'International', country: 'Saudi Arabia', apiId: 23, isNationalTeam: true },
  { id: 'nt-iran', name: 'Iran', league: 'International', country: 'Iran', apiId: 22, isNationalTeam: true },
  { id: 'nt-qatar', name: 'Qatar', league: 'International', country: 'Qatar', apiId: 1569, isNationalTeam: true },
  { id: 'nt-colombia', name: 'Colombia', league: 'International', country: 'Colombia', apiId: 8, isNationalTeam: true },
  { id: 'nt-chile', name: 'Chile', league: 'International', country: 'Chile', apiId: 2382, isNationalTeam: true },
  { id: 'nt-ecuador', name: 'Ecuador', league: 'International', country: 'Ecuador', apiId: 2380, isNationalTeam: true },
  { id: 'nt-peru', name: 'Peru', league: 'International', country: 'Peru', apiId: 2383, isNationalTeam: true },
  { id: 'nt-venezuela', name: 'Venezuela', league: 'International', country: 'Venezuela', apiId: 2379, isNationalTeam: true },
  { id: 'nt-paraguay', name: 'Paraguay', league: 'International', country: 'Paraguay', apiId: 2381, isNationalTeam: true },
  { id: 'nt-costa-rica', name: 'Costa Rica', league: 'International', country: 'Costa Rica', apiId: 2385, isNationalTeam: true },
  { id: 'nt-jamaica', name: 'Jamaica', league: 'International', country: 'Jamaica', apiId: 2387, isNationalTeam: true },
  { id: 'nt-poland', name: 'Poland', league: 'International', country: 'Poland', apiId: 24, isNationalTeam: true },
  { id: 'nt-switzerland', name: 'Switzerland', league: 'International', country: 'Switzerland', apiId: 15, isNationalTeam: true },
  { id: 'nt-denmark', name: 'Denmark', league: 'International', country: 'Denmark', apiId: 21, isNationalTeam: true },
  { id: 'nt-sweden', name: 'Sweden', league: 'International', country: 'Sweden', apiId: 5, isNationalTeam: true },
  { id: 'nt-austria', name: 'Austria', league: 'International', country: 'Austria', apiId: 775, isNationalTeam: true },
  { id: 'nt-czech-republic', name: 'Czech Republic', league: 'International', country: 'Czech Republic', apiId: 770, isNationalTeam: true },
  { id: 'nt-turkey', name: 'Turkey', league: 'International', country: 'Turkey', apiId: 777, isNationalTeam: true },
  { id: 'nt-ukraine', name: 'Ukraine', league: 'International', country: 'Ukraine', apiId: 772, isNationalTeam: true },
  { id: 'nt-serbia', name: 'Serbia', league: 'International', country: 'Serbia', apiId: 14, isNationalTeam: true },
  { id: 'nt-russia', name: 'Russia', league: 'International', country: 'Russia', apiId: 4, isNationalTeam: true },
  { id: 'nt-wales', name: 'Wales', league: 'International', country: 'Wales', apiId: 767, isNationalTeam: true },
  { id: 'nt-scotland', name: 'Scotland', league: 'International', country: 'Scotland', apiId: 1101, isNationalTeam: true },
  { id: 'nt-northern-ireland', name: 'Northern Ireland', league: 'International', country: 'Northern Ireland', apiId: 773, isNationalTeam: true },
  { id: 'nt-republic-of-ireland', name: 'Republic of Ireland', league: 'International', country: 'Ireland', apiId: 1569, isNationalTeam: true }
];

// Helper function to get teams by country
export const getTeamsByCountry = (countryId: string): UserTeam[] => {
  const country = FOOTBALL_COUNTRIES.find(c => c.id === countryId);
  if (!country) return [];
  
  return FOOTBALL_TEAMS.filter(team => 
    team.country?.toLowerCase() === country.name.toLowerCase()
  );
};

// Helper function to get teams by league
export const getTeamsByLeague = (league: string): UserTeam[] => {
  return FOOTBALL_TEAMS.filter(team => 
    team.league.toLowerCase() === league.toLowerCase()
  );
};

// Helper function to search teams
export const searchTeams = (query: string): UserTeam[] => {
  const searchTerm = query.toLowerCase();
  return FOOTBALL_TEAMS.filter(team => 
    team.name.toLowerCase().includes(searchTerm) ||
    team.league.toLowerCase().includes(searchTerm) ||
    team.country?.toLowerCase().includes(searchTerm)
  );
};

// Get popular teams (top teams from major leagues including African powerhouses)
export const getPopularTeams = (): UserTeam[] => {
  const popularTeamIds = [
    // European Giants
    'man-utd', 'liverpool', 'man-city', 'chelsea', 'arsenal', 'tottenham',
    'real-madrid', 'barcelona', 'atletico-madrid',
    'bayern-munich', 'borussia-dortmund', 'rb-leipzig',
    'juventus', 'ac-milan', 'inter-milan', 'napoli',
    'psg', 'marseille', 'lyon', 'monaco',
    'ajax', 'psv', 'feyenoord',
    'porto', 'benfica', 'sporting-cp',
    // South American Giants
    'flamengo', 'palmeiras', 'corinthians',
    'boca-juniors', 'river-plate',
    // British Isles
    'celtic', 'rangers',
    // African Powerhouses
    'al-ahly', 'zamalek', 'wydad-casablanca', 'raja-casablanca',
    'mamelodi-sundowns', 'kaizer-chiefs', 'orlando-pirates',
    'asante-kotoko', 'hearts-of-oak', 'enyimba', 'rivers-united',
    'esperance-tunis', 'club-africain', 'cr-belouizdad'
  ];
  
  return FOOTBALL_TEAMS.filter(team => popularTeamIds.includes(team.id));
};

// Get African teams specifically
export const getAfricanTeams = (): UserTeam[] => {
  const africanCountries = ['Nigeria', 'Egypt', 'Morocco', 'South Africa', 'Ghana', 'Senegal', 'Ivory Coast', 'Cameroon', 'Tunisia', 'Algeria', 'Kenya', 'Ethiopia'];
  return FOOTBALL_TEAMS.filter(team => 
    team.country && africanCountries.includes(team.country)
  );
};

// Get European teams specifically
export const getEuropeanTeams = (): UserTeam[] => {
  const europeanCountries = [
    'England', 'Spain', 'Germany', 'Italy', 'France', 'Netherlands', 'Portugal', 
    'Belgium', 'Turkey', 'Russia', 'Scotland', 'Austria', 'Switzerland', 'Denmark', 
    'Norway', 'Sweden', 'Finland', 'Czech Republic', 'Poland', 'Ukraine', 'Croatia', 
    'Serbia', 'Greece', 'Romania', 'Bulgaria'
  ];
  return FOOTBALL_TEAMS.filter(team => 
    team.country && europeanCountries.includes(team.country)
  );
};

// Get Asian teams specifically
export const getAsianTeams = (): UserTeam[] => {
  const asianCountries = ['Japan', 'South Korea', 'China', 'India', 'Saudi Arabia', 'UAE', 'Qatar'];
  return FOOTBALL_TEAMS.filter(team => 
    team.country && asianCountries.includes(team.country)
  );
};

// Get South American teams specifically
export const getSouthAmericanTeams = (): UserTeam[] => {
  const southAmericanCountries = ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Uruguay', 'Paraguay', 'Ecuador', 'Peru', 'Venezuela'];
  return FOOTBALL_TEAMS.filter(team => 
    team.country && southAmericanCountries.includes(team.country)
  );
};

// Get North American teams specifically
export const getNorthAmericanTeams = (): UserTeam[] => {
  const northAmericanCountries = ['United States', 'Mexico', 'Canada'];
  return FOOTBALL_TEAMS.filter(team => 
    team.country && northAmericanCountries.includes(team.country)
  );
};

// Get teams by continent
export const getTeamsByContinent = (continent: 'Europe' | 'Africa' | 'South America' | 'North America' | 'Asia' | 'Oceania'): UserTeam[] => {
  const continentCountries = {
    'Europe': [
      'England', 'Spain', 'Germany', 'Italy', 'France', 'Netherlands', 'Portugal', 
      'Belgium', 'Turkey', 'Russia', 'Scotland', 'Austria', 'Switzerland', 'Denmark', 
      'Norway', 'Sweden', 'Finland', 'Czech Republic', 'Poland', 'Ukraine', 'Croatia', 
      'Serbia', 'Greece', 'Romania', 'Bulgaria'
    ],
    'Africa': [
      'Nigeria', 'Egypt', 'Morocco', 'South Africa', 'Ghana', 'Senegal', 'Ivory Coast', 
      'Cameroon', 'Tunisia', 'Algeria', 'Kenya', 'Ethiopia'
    ],
    'South America': [
      'Brazil', 'Argentina', 'Colombia', 'Chile', 'Uruguay', 'Paraguay', 'Ecuador', 
      'Peru', 'Venezuela'
    ],
    'North America': [
      'United States', 'Mexico', 'Canada'
    ],
    'Asia': [
      'Japan', 'South Korea', 'China', 'India', 'Saudi Arabia', 'UAE', 'Qatar'
    ],
    'Oceania': [
      'Australia'
    ]
  };
  
  return FOOTBALL_TEAMS.filter(team => 
    team.country && continentCountries[continent].includes(team.country)
  );
};

// Get teams by region for better organization
export const getTeamsByRegion = (region: 'Western Europe' | 'Eastern Europe' | 'North Africa' | 'Sub-Saharan Africa' | 'Middle East' | 'East Asia' | 'South Asia' | 'North America' | 'South America'): UserTeam[] => {
  const regionCountries = {
    'Western Europe': ['England', 'Spain', 'Germany', 'Italy', 'France', 'Netherlands', 'Portugal', 'Belgium', 'Scotland', 'Austria', 'Switzerland', 'Denmark', 'Norway', 'Sweden', 'Finland'],
    'Eastern Europe': ['Russia', 'Czech Republic', 'Poland', 'Ukraine', 'Croatia', 'Serbia', 'Greece', 'Romania', 'Bulgaria'],
    'North Africa': ['Egypt', 'Morocco', 'Tunisia', 'Algeria'],
    'Sub-Saharan Africa': ['Nigeria', 'South Africa', 'Ghana', 'Senegal', 'Ivory Coast', 'Cameroon', 'Kenya', 'Ethiopia'],
    'Middle East': ['Turkey', 'Saudi Arabia', 'UAE', 'Qatar'],
    'East Asia': ['Japan', 'South Korea', 'China'],
    'South Asia': ['India'],
    'North America': ['United States', 'Mexico', 'Canada'],
    'South America': ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Uruguay', 'Paraguay', 'Ecuador', 'Peru', 'Venezuela']
  };
  
  return FOOTBALL_TEAMS.filter(team => 
    team.country && regionCountries[region].includes(team.country)
  );
};

// Get national teams only
export const getNationalTeams = (): UserTeam[] => {
  return FOOTBALL_TEAMS.filter(team => team.isNationalTeam === true);
};

// Get national teams by continent
export const getNationalTeamsByContinent = (continent: 'Europe' | 'Africa' | 'South America' | 'North America' | 'Asia'): UserTeam[] => {
  const continentCountries = {
    'Europe': ['England', 'France', 'Spain', 'Germany', 'Italy', 'Portugal', 'Netherlands', 'Belgium', 'Croatia', 'Poland', 'Switzerland', 'Denmark', 'Sweden', 'Austria', 'Czech Republic', 'Turkey', 'Ukraine', 'Serbia', 'Russia', 'Wales', 'Scotland', 'Northern Ireland', 'Ireland'],
    'Africa': ['Nigeria', 'Morocco', 'Senegal', 'Ghana', 'Cameroon', 'Egypt', 'Ivory Coast', 'South Africa', 'Tunisia', 'Algeria', 'Mali', 'Burkina Faso', 'Guinea', 'Kenya', 'Ethiopia'],
    'South America': ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Uruguay', 'Paraguay', 'Ecuador', 'Peru', 'Venezuela'],
    'North America': ['United States', 'Mexico', 'Canada', 'Costa Rica', 'Jamaica'],
    'Asia': ['Japan', 'South Korea', 'Saudi Arabia', 'Iran', 'Qatar', 'Australia']
  };
  
  return FOOTBALL_TEAMS.filter(team => 
    team.isNationalTeam === true && 
    team.country && 
    continentCountries[continent].includes(team.country)
  );
};

// Get teams by league tier
export const getTeamsByTier = (tier: 'top' | 'second' | 'domestic'): UserTeam[] => {
  const tierLeagues = {
    'top': [
      'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1', 'Eredivisie', 
      'Primeira Liga', 'MLS', 'Liga MX', 'Série A', 'Primera División', 'Scottish Premiership',
      'Pro League', 'Süper Lig', 'Saudi Pro League', 'J1 League', 'K League 1'
    ],
    'second': [
      'Championship', 'Segunda División', '2. Bundesliga', 'Serie B', 'Ligue 2',
      'Canadian Premier League'
    ],
    'domestic': [
      'NPFL', 'Egyptian Premier League', 'Botola Pro', 'Premier Soccer League',
      'Ghana Premier League', 'Ligue 1 Senegal', 'Ligue 1 Ivory Coast', 'Elite One',
      'Tunisian Ligue Professionnelle 1', 'Ligue Professionnelle 1', 'Kenyan Premier League',
      'Ethiopian Premier League', 'Austrian Bundesliga', 'Swiss Super League',
      'Danish Superliga', 'Eliteserien', 'Allsvenskan', 'Veikkausliiga',
      'Czech First League', 'Ekstraklasa', 'Ukrainian Premier League',
      'Croatian First League', 'Serbian SuperLiga', 'Greek Super League',
      'Liga I', 'Bulgarian First League', 'Chinese Super League', 'A-League Men',
      'Indian Super League', 'UAE Pro League', 'Qatar Stars League',
      'Primera A', 'Primera División'
    ]
  };
  
  return FOOTBALL_TEAMS.filter(team => 
    tierLeagues[tier].includes(team.league)
  );
};

