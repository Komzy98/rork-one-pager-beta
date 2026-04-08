export interface F1Race {
  id: number;
  round: number;
  name: string;
  circuit: string;
  country: string;
  city: string;
  date: string;
  time: string;
  flag: string;
  status: 'upcoming' | 'completed' | 'live' | 'cancelled';
  laps: number;
  circuitLength: string;
  winner?: string;
  winnerTeam?: string;
  fastestLap?: string;
  podium?: [string, string, string];
  circuitImage?: string;
}

export interface F1Team {
  id: string;
  name: string;
  color: string;
  drivers: string[];
  constructorPoints?: number;
  logo?: string;
}

export interface F1Driver {
  id: string;
  name: string;
  number: number;
  team: string;
  teamColor: string;
  nationality: string;
  nationalityFlag: string;
  points: number;
  wins: number;
  podiums: number;
  photo?: string;
}

export const F1_TEAM_LOGOS: Record<string, string> = {
  'red-bull': 'https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1320/content/dam/fom-website/2018-redesign-assets/team%20logos/red%20bull',
  'mclaren': 'https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1320/content/dam/fom-website/2018-redesign-assets/team%20logos/mclaren',
  'ferrari': 'https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1320/content/dam/fom-website/2018-redesign-assets/team%20logos/ferrari',
  'mercedes': 'https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1320/content/dam/fom-website/2018-redesign-assets/team%20logos/mercedes',
  'aston-martin': 'https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1320/content/dam/fom-website/2018-redesign-assets/team%20logos/aston%20martin',
  'alpine': 'https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1320/content/dam/fom-website/2018-redesign-assets/team%20logos/alpine',
  'williams': 'https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1320/content/dam/fom-website/2018-redesign-assets/team%20logos/williams',
  'haas': 'https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1320/content/dam/fom-website/2018-redesign-assets/team%20logos/haas',
  'rb': 'https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1320/content/dam/fom-website/2018-redesign-assets/team%20logos/rb',
  'sauber': 'https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1320/content/dam/fom-website/2018-redesign-assets/team%20logos/kick%20sauber',
};

export const F1_TEAMS_2026: F1Team[] = [
  { id: 'red-bull', name: 'Red Bull Racing', color: '#3671C6', drivers: ['Max Verstappen', 'Liam Lawson'], logo: F1_TEAM_LOGOS['red-bull'] },
  { id: 'mclaren', name: 'McLaren', color: '#FF8000', drivers: ['Lando Norris', 'Oscar Piastri'], logo: F1_TEAM_LOGOS['mclaren'] },
  { id: 'ferrari', name: 'Ferrari', color: '#E8002D', drivers: ['Lewis Hamilton', 'Charles Leclerc'], logo: F1_TEAM_LOGOS['ferrari'] },
  { id: 'mercedes', name: 'Mercedes', color: '#27F4D2', drivers: ['George Russell', 'Kimi Antonelli'], logo: F1_TEAM_LOGOS['mercedes'] },
  { id: 'aston-martin', name: 'Aston Martin', color: '#229971', drivers: ['Fernando Alonso', 'Lance Stroll'], logo: F1_TEAM_LOGOS['aston-martin'] },
  { id: 'alpine', name: 'Alpine', color: '#FF87BC', drivers: ['Pierre Gasly', 'Jack Doohan'], logo: F1_TEAM_LOGOS['alpine'] },
  { id: 'williams', name: 'Williams', color: '#64C4FF', drivers: ['Carlos Sainz', 'Alexander Albon'], logo: F1_TEAM_LOGOS['williams'] },
  { id: 'haas', name: 'Haas', color: '#B6BABD', drivers: ['Esteban Ocon', 'Oliver Bearman'], logo: F1_TEAM_LOGOS['haas'] },
  { id: 'rb', name: 'RB', color: '#6692FF', drivers: ['Yuki Tsunoda', 'Isack Hadjar'], logo: F1_TEAM_LOGOS['rb'] },
  { id: 'sauber', name: 'Sauber', color: '#52E252', drivers: ['Nico Hulkenberg', 'Gabriel Bortoleto'], logo: F1_TEAM_LOGOS['sauber'] },
];

const F1_CDN = 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers';

function driverPhoto(letter: string, code: string, first: string, last: string): string {
  return `${F1_CDN}/${letter}/${code}_${first}_${last}/${code.toLowerCase()}.png.transform/1col/image.png`;
}

export const F1_DRIVERS_2026: F1Driver[] = [
  { id: 'verstappen', name: 'Max Verstappen', number: 1, team: 'Red Bull Racing', teamColor: '#3671C6', nationality: 'Netherlands', nationalityFlag: '🇳🇱', points: 0, wins: 0, podiums: 0, photo: driverPhoto('M', 'MAXVER01', 'Max', 'Verstappen') },
  { id: 'norris', name: 'Lando Norris', number: 4, team: 'McLaren', teamColor: '#FF8000', nationality: 'United Kingdom', nationalityFlag: '🇬🇧', points: 0, wins: 0, podiums: 0, photo: driverPhoto('L', 'LANNOR01', 'Lando', 'Norris') },
  { id: 'piastri', name: 'Oscar Piastri', number: 81, team: 'McLaren', teamColor: '#FF8000', nationality: 'Australia', nationalityFlag: '🇦🇺', points: 0, wins: 0, podiums: 0, photo: driverPhoto('O', 'OSCPIA01', 'Oscar', 'Piastri') },
  { id: 'hamilton', name: 'Lewis Hamilton', number: 44, team: 'Ferrari', teamColor: '#E8002D', nationality: 'United Kingdom', nationalityFlag: '🇬🇧', points: 0, wins: 0, podiums: 0, photo: driverPhoto('L', 'LEWHAM01', 'Lewis', 'Hamilton') },
  { id: 'leclerc', name: 'Charles Leclerc', number: 16, team: 'Ferrari', teamColor: '#E8002D', nationality: 'Monaco', nationalityFlag: '🇲🇨', points: 0, wins: 0, podiums: 0, photo: driverPhoto('C', 'CHALEC01', 'Charles', 'Leclerc') },
  { id: 'russell', name: 'George Russell', number: 63, team: 'Mercedes', teamColor: '#27F4D2', nationality: 'United Kingdom', nationalityFlag: '🇬🇧', points: 0, wins: 0, podiums: 0, photo: driverPhoto('G', 'GEORUS01', 'George', 'Russell') },
  { id: 'antonelli', name: 'Kimi Antonelli', number: 12, team: 'Mercedes', teamColor: '#27F4D2', nationality: 'Italy', nationalityFlag: '🇮🇹', points: 0, wins: 0, podiums: 0, photo: driverPhoto('K', 'KIMANT01', 'Kimi', 'Antonelli') },
  { id: 'alonso', name: 'Fernando Alonso', number: 14, team: 'Aston Martin', teamColor: '#229971', nationality: 'Spain', nationalityFlag: '🇪🇸', points: 0, wins: 0, podiums: 0, photo: driverPhoto('F', 'FERALO01', 'Fernando', 'Alonso') },
  { id: 'stroll', name: 'Lance Stroll', number: 18, team: 'Aston Martin', teamColor: '#229971', nationality: 'Canada', nationalityFlag: '🇨🇦', points: 0, wins: 0, podiums: 0, photo: driverPhoto('L', 'LANSTR01', 'Lance', 'Stroll') },
  { id: 'sainz', name: 'Carlos Sainz', number: 55, team: 'Williams', teamColor: '#64C4FF', nationality: 'Spain', nationalityFlag: '🇪🇸', points: 0, wins: 0, podiums: 0, photo: driverPhoto('C', 'CARSAI01', 'Carlos', 'Sainz') },
  { id: 'albon', name: 'Alexander Albon', number: 23, team: 'Williams', teamColor: '#64C4FF', nationality: 'Thailand', nationalityFlag: '🇹🇭', points: 0, wins: 0, podiums: 0, photo: driverPhoto('A', 'ALEALB01', 'Alexander', 'Albon') },
  { id: 'gasly', name: 'Pierre Gasly', number: 10, team: 'Alpine', teamColor: '#FF87BC', nationality: 'France', nationalityFlag: '🇫🇷', points: 0, wins: 0, podiums: 0, photo: driverPhoto('P', 'PIEGAS01', 'Pierre', 'Gasly') },
  { id: 'doohan', name: 'Jack Doohan', number: 7, team: 'Alpine', teamColor: '#FF87BC', nationality: 'Australia', nationalityFlag: '🇦🇺', points: 0, wins: 0, podiums: 0, photo: driverPhoto('J', 'JACDOO01', 'Jack', 'Doohan') },
  { id: 'ocon', name: 'Esteban Ocon', number: 31, team: 'Haas', teamColor: '#B6BABD', nationality: 'France', nationalityFlag: '🇫🇷', points: 0, wins: 0, podiums: 0, photo: driverPhoto('E', 'ESTOCO01', 'Esteban', 'Ocon') },
  { id: 'bearman', name: 'Oliver Bearman', number: 87, team: 'Haas', teamColor: '#B6BABD', nationality: 'United Kingdom', nationalityFlag: '🇬🇧', points: 0, wins: 0, podiums: 0, photo: driverPhoto('O', 'OLIBEA01', 'Oliver', 'Bearman') },
  { id: 'tsunoda', name: 'Yuki Tsunoda', number: 22, team: 'RB', teamColor: '#6692FF', nationality: 'Japan', nationalityFlag: '🇯🇵', points: 0, wins: 0, podiums: 0, photo: driverPhoto('Y', 'YUKTSU01', 'Yuki', 'Tsunoda') },
  { id: 'hadjar', name: 'Isack Hadjar', number: 6, team: 'RB', teamColor: '#6692FF', nationality: 'France', nationalityFlag: '🇫🇷', points: 0, wins: 0, podiums: 0, photo: driverPhoto('I', 'ISAHAD01', 'Isack', 'Hadjar') },
  { id: 'hulkenberg', name: 'Nico Hulkenberg', number: 27, team: 'Sauber', teamColor: '#52E252', nationality: 'Germany', nationalityFlag: '🇩🇪', points: 0, wins: 0, podiums: 0, photo: driverPhoto('N', 'NICHUL01', 'Nico', 'Hulkenberg') },
  { id: 'bortoleto', name: 'Gabriel Bortoleto', number: 5, team: 'Sauber', teamColor: '#52E252', nationality: 'Brazil', nationalityFlag: '🇧🇷', points: 0, wins: 0, podiums: 0, photo: driverPhoto('G', 'GABBOR01', 'Gabriel', 'Bortoleto') },
  { id: 'lawson', name: 'Liam Lawson', number: 30, team: 'Red Bull Racing', teamColor: '#3671C6', nationality: 'New Zealand', nationalityFlag: '🇳🇿', points: 0, wins: 0, podiums: 0, photo: driverPhoto('L', 'LIALAW01', 'Liam', 'Lawson') },
];

export const F1_CALENDAR_2026: F1Race[] = [
  { id: 1, round: 1, name: 'Australian Grand Prix', circuit: 'Albert Park Circuit', country: 'Australia', city: 'Melbourne', date: '2026-03-15', time: '05:00', flag: '🇦🇺', status: 'completed', laps: 58, circuitLength: '5.278 km', winner: 'Max Verstappen', winnerTeam: 'Red Bull Racing', podium: ['Max Verstappen', 'Lando Norris', 'Charles Leclerc'], circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Circuit%20702702702702702maps%2016702702702702702x9/Australia_702702702702702Circuit.png.transform/7col/image.png' },
  { id: 2, round: 2, name: 'Chinese Grand Prix', circuit: 'Shanghai International Circuit', country: 'China', city: 'Shanghai', date: '2026-03-29', time: '07:00', flag: '🇨🇳', status: 'completed', laps: 56, circuitLength: '5.451 km', winner: 'Oscar Piastri', winnerTeam: 'McLaren', podium: ['Oscar Piastri', 'Lewis Hamilton', 'Max Verstappen'], circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245030/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/China_Circuit.png.transform/7col/image.png' },
  { id: 3, round: 3, name: 'Japanese Grand Prix', circuit: 'Suzuka International Racing Course', country: 'Japan', city: 'Suzuka', date: '2026-04-06', time: '06:00', flag: '🇯🇵', status: 'completed', laps: 53, circuitLength: '5.807 km', winner: 'Lando Norris', winnerTeam: 'McLaren', podium: ['Lando Norris', 'Max Verstappen', 'George Russell'], circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245032/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Japan_Circuit.png.transform/7col/image.png' },
  { id: 4, round: 4, name: 'Bahrain Grand Prix', circuit: 'Bahrain International Circuit', country: 'Bahrain', city: 'Sakhir', date: '2026-04-13', time: '15:00', flag: '🇧🇭', status: 'upcoming', laps: 57, circuitLength: '5.412 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Bahrain_Circuit.png.transform/7col/image.png' },
  { id: 5, round: 5, name: 'Saudi Arabian Grand Prix', circuit: 'Jeddah Corniche Circuit', country: 'Saudi Arabia', city: 'Jeddah', date: '2026-04-20', time: '17:00', flag: '🇸🇦', status: 'upcoming', laps: 50, circuitLength: '6.174 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245030/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Saudi_Arabia_Circuit.png.transform/7col/image.png' },
  { id: 6, round: 6, name: 'Miami Grand Prix', circuit: 'Miami International Autodrome', country: 'USA', city: 'Miami', date: '2026-05-04', time: '20:00', flag: '🇺🇸', status: 'upcoming', laps: 57, circuitLength: '5.412 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Miami_Circuit.png.transform/7col/image.png' },
  { id: 7, round: 7, name: 'Emilia Romagna Grand Prix', circuit: 'Autodromo Enzo e Dino Ferrari', country: 'Italy', city: 'Imola', date: '2026-05-18', time: '14:00', flag: '🇮🇹', status: 'upcoming', laps: 63, circuitLength: '4.909 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245030/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Emilia_Romagna_Circuit.png.transform/7col/image.png' },
  { id: 8, round: 8, name: 'Monaco Grand Prix', circuit: 'Circuit de Monaco', country: 'Monaco', city: 'Monte Carlo', date: '2026-05-25', time: '14:00', flag: '🇲🇨', status: 'upcoming', laps: 78, circuitLength: '3.337 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245032/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Monaco_Circuit.png.transform/7col/image.png' },
  { id: 9, round: 9, name: 'Spanish Grand Prix', circuit: 'Circuit de Barcelona-Catalunya', country: 'Spain', city: 'Barcelona', date: '2026-06-01', time: '14:00', flag: '🇪🇸', status: 'upcoming', laps: 66, circuitLength: '4.675 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245030/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Spain_Circuit.png.transform/7col/image.png' },
  { id: 10, round: 10, name: 'Canadian Grand Prix', circuit: 'Circuit Gilles Villeneuve', country: 'Canada', city: 'Montreal', date: '2026-06-15', time: '19:00', flag: '🇨🇦', status: 'upcoming', laps: 70, circuitLength: '4.361 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245030/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Canada_Circuit.png.transform/7col/image.png' },
  { id: 11, round: 11, name: 'Austrian Grand Prix', circuit: 'Red Bull Ring', country: 'Austria', city: 'Spielberg', date: '2026-06-29', time: '14:00', flag: '🇦🇹', status: 'upcoming', laps: 71, circuitLength: '4.318 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245030/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Austria_Circuit.png.transform/7col/image.png' },
  { id: 12, round: 12, name: 'British Grand Prix', circuit: 'Silverstone Circuit', country: 'United Kingdom', city: 'Silverstone', date: '2026-07-06', time: '14:00', flag: '🇬🇧', status: 'upcoming', laps: 52, circuitLength: '5.891 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245033/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Great_Britain_Circuit.png.transform/7col/image.png' },
  { id: 13, round: 13, name: 'Belgian Grand Prix', circuit: 'Circuit de Spa-Francorchamps', country: 'Belgium', city: 'Spa', date: '2026-07-27', time: '14:00', flag: '🇧🇪', status: 'upcoming', laps: 44, circuitLength: '7.004 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245030/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Belgium_Circuit.png.transform/7col/image.png' },
  { id: 14, round: 14, name: 'Hungarian Grand Prix', circuit: 'Hungaroring', country: 'Hungary', city: 'Budapest', date: '2026-08-03', time: '14:00', flag: '🇭🇺', status: 'upcoming', laps: 70, circuitLength: '4.381 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245032/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Hungary_Circuit.png.transform/7col/image.png' },
  { id: 15, round: 15, name: 'Dutch Grand Prix', circuit: 'Circuit Zandvoort', country: 'Netherlands', city: 'Zandvoort', date: '2026-08-31', time: '14:00', flag: '🇳🇱', status: 'upcoming', laps: 72, circuitLength: '4.259 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245032/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Netherlands_Circuit.png.transform/7col/image.png' },
  { id: 16, round: 16, name: 'Italian Grand Prix', circuit: 'Autodromo Nazionale di Monza', country: 'Italy', city: 'Monza', date: '2026-09-07', time: '14:00', flag: '🇮🇹', status: 'upcoming', laps: 53, circuitLength: '5.793 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245032/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Italy_Circuit.png.transform/7col/image.png' },
  { id: 17, round: 17, name: 'Azerbaijan Grand Prix', circuit: 'Baku City Circuit', country: 'Azerbaijan', city: 'Baku', date: '2026-09-21', time: '12:00', flag: '🇦🇿', status: 'upcoming', laps: 51, circuitLength: '6.003 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245030/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Azerbaijan_Circuit.png.transform/7col/image.png' },
  { id: 18, round: 18, name: 'Singapore Grand Prix', circuit: 'Marina Bay Street Circuit', country: 'Singapore', city: 'Singapore', date: '2026-10-05', time: '13:00', flag: '🇸🇬', status: 'upcoming', laps: 62, circuitLength: '4.940 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Singapore_Circuit.png.transform/7col/image.png' },
  { id: 19, round: 19, name: 'United States Grand Prix', circuit: 'Circuit of the Americas', country: 'USA', city: 'Austin', date: '2026-10-19', time: '19:00', flag: '🇺🇸', status: 'upcoming', laps: 56, circuitLength: '5.513 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/USA_Circuit.png.transform/7col/image.png' },
  { id: 20, round: 20, name: 'Mexico City Grand Prix', circuit: 'Autódromo Hermanos Rodríguez', country: 'Mexico', city: 'Mexico City', date: '2026-10-26', time: '20:00', flag: '🇲🇽', status: 'upcoming', laps: 71, circuitLength: '4.304 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245032/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Mexico_Circuit.png.transform/7col/image.png' },
  { id: 21, round: 21, name: 'São Paulo Grand Prix', circuit: 'Autódromo José Carlos Pace', country: 'Brazil', city: 'São Paulo', date: '2026-11-09', time: '17:00', flag: '🇧🇷', status: 'upcoming', laps: 71, circuitLength: '4.309 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245030/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Brazil_Circuit.png.transform/7col/image.png' },
  { id: 22, round: 22, name: 'Las Vegas Grand Prix', circuit: 'Las Vegas Strip Circuit', country: 'USA', city: 'Las Vegas', date: '2026-11-22', time: '06:00', flag: '🇺🇸', status: 'upcoming', laps: 50, circuitLength: '6.201 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245032/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Las_Vegas_Circuit.png.transform/7col/image.png' },
  { id: 23, round: 23, name: 'Qatar Grand Prix', circuit: 'Lusail International Circuit', country: 'Qatar', city: 'Lusail', date: '2026-11-29', time: '16:00', flag: '🇶🇦', status: 'upcoming', laps: 57, circuitLength: '5.419 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245035/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Qatar_Circuit.png.transform/7col/image.png' },
  { id: 24, round: 24, name: 'Abu Dhabi Grand Prix', circuit: 'Yas Marina Circuit', country: 'UAE', city: 'Abu Dhabi', date: '2026-12-06', time: '13:00', flag: '🇦🇪', status: 'upcoming', laps: 58, circuitLength: '5.281 km', circuitImage: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677245030/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Abu_Dhabi_Circuit.png.transform/7col/image.png' },
];

export function getNextRace(): F1Race | undefined {
  const now = new Date();
  return F1_CALENDAR_2026.find(race => {
    if (race.status === 'upcoming' || race.status === 'live') {
      return new Date(race.date + 'T' + race.time + ':00Z').getTime() > now.getTime() - 24 * 60 * 60 * 1000;
    }
    return false;
  });
}

export function getCompletedRaces(): F1Race[] {
  return F1_CALENDAR_2026.filter(race => race.status === 'completed');
}

export function getUpcomingRaces(): F1Race[] {
  return F1_CALENDAR_2026.filter(race => race.status === 'upcoming' || race.status === 'live');
}

export function getDriverStandings(): F1Driver[] {
  const standings = [...F1_DRIVERS_2026];
  const completedRaces = getCompletedRaces();

  completedRaces.forEach(race => {
    if (race.podium) {
      const [p1, p2, p3] = race.podium;
      const d1 = standings.find(d => d.name === p1);
      const d2 = standings.find(d => d.name === p2);
      const d3 = standings.find(d => d.name === p3);
      if (d1) { d1.points += 25; d1.wins += 1; d1.podiums += 1; }
      if (d2) { d2.points += 18; d2.podiums += 1; }
      if (d3) { d3.points += 15; d3.podiums += 1; }
    }
  });

  return standings.sort((a, b) => b.points - a.points);
}

export function getDriverPhoto(driverName: string): string | undefined {
  return F1_DRIVERS_2026.find(d => d.name === driverName)?.photo;
}

export function getTeamLogo(teamName: string): string | undefined {
  return F1_TEAMS_2026.find(t => t.name === teamName)?.logo;
}

export function getConstructorStandings(): { name: string; color: string; points: number; drivers: string[]; logo?: string }[] {
  const driverStandings = getDriverStandings();
  const teamMap = new Map<string, { name: string; color: string; points: number; drivers: string[] }>();

  F1_TEAMS_2026.forEach(team => {
    teamMap.set(team.name, { name: team.name, color: team.color, points: 0, drivers: team.drivers, logo: team.logo });
  });

  driverStandings.forEach(driver => {
    const team = teamMap.get(driver.team);
    if (team) {
      team.points += driver.points;
    }
  });

  return Array.from(teamMap.values()).sort((a, b) => b.points - a.points);
}
