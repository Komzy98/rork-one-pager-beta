import { Platform } from 'react-native';

let Location: typeof import('expo-location') | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Location = require('expo-location');
  } catch {
    console.log('expo-location not available');
  }
}

async function getReverseGeocodedCity(latitude: number, longitude: number): Promise<string | null> {
  try {
    if (Platform.OS !== 'web' && Location) {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results && results.length > 0) {
        const place = results[0];
        const name = place.subregion || place.city || place.district || place.name || place.region;
        console.log('📍 [Weather] Reverse geocoded location:', { subregion: place.subregion, city: place.city, district: place.district, name: place.name, region: place.region });
        return name || null;
      }
    } else {
      const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${OPENWEATHER_API_KEY}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const localName = data[0].local_names?.en || data[0].name;
          console.log('📍 [Weather] Reverse geocoded (web):', localName);
          return localName || null;
        }
      }
    }
  } catch (error) {
    console.log('⚠️ [Weather] Reverse geocoding failed:', error);
  }
  return null;
}

interface WeatherCondition {
  main: string;
  description: string;
  icon: string;
}

interface WeatherData {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: WeatherCondition[];
  wind: {
    speed: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    sunrise: number;
    sunset: number;
  };
  name: string;
}

interface ProcessedWeatherData {
  condition: string;
  description: string;
  temp: number;
  humidity: number;
  windSpeed: number;
  cloudiness: number;
  isDayTime: boolean;
  isRaining: boolean;
  isSnowing: boolean;
  isCloudy: boolean;
  isClear: boolean;
  isStormy: boolean;
  city: string;
  isTimeBased?: boolean;
  uvi?: number;
  rain?: number;
  feelsLike?: number;
}

export interface ForecastDay {
  date: string;
  dayName: string;
  temp: {
    min: number;
    max: number;
  };
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  uvi: number;
  rain: number;
  pop: number;
}

export type UvHourlyPoint = {
  hour: string;
  uvi: number;
  isNow?: boolean;
};

export interface ExtendedWeatherData {
  current: ProcessedWeatherData;
  forecast: ForecastDay[];
  uvIndex: {
    value: number;
    level: 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';
    protection: string;
    peakToday: number;
    hourly: UvHourlyPoint[];
  };
  skinProtection: SkinProtection;
  visibilityKm: number;
  fetchedAt: number;
}

const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY || '46c8345d509d2bcf5dd59cf39c188752';
const CACHE_DURATION = 30 * 60 * 1000;

let cachedWeather: ProcessedWeatherData | null = null;
let lastFetchTime = 0;

export async function getCurrentWeather(lat?: number, lon?: number): Promise<ProcessedWeatherData> {
  const now = Date.now();
  
  if (cachedWeather && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('☀️ [Weather] Using cached weather data:', cachedWeather);
    return cachedWeather;
  }

  try {
    let latitude = lat;
    let longitude = lon;

    if (!latitude || !longitude) {
      console.log('🌍 [Weather] Fetching user location...');
      
      if (Platform.OS === 'web') {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error('Geolocation not supported'));
              return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              enableHighAccuracy: true,
            });
          });
          
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          console.log('📍 [Weather] Web location:', { latitude, longitude });
        } catch {
          console.log('⚠️ [Weather] Geolocation not available, using time-based fallback');
          const hour = new Date().getHours();
          const isDayTime = hour >= 7 && hour < 19;
          
          return {
            condition: isDayTime ? 'clear' : 'clear',
            description: isDayTime ? 'sunny day' : 'clear night',
            temp: 20,
            humidity: 50,
            windSpeed: 5,
            cloudiness: isDayTime ? 10 : 30,
            isDayTime,
            isRaining: false,
            isSnowing: false,
            isCloudy: false,
            isClear: true,
            isStormy: false,
            city: 'Your Location',
            isTimeBased: true,
          };
        }
      } else {
        try {
          const { status } = await Location!.requestForegroundPermissionsAsync();
          
          if (status !== 'granted') {
            console.log('⚠️ [Weather] Location permission denied, using fallback');
            throw new Error('Location permission denied');
          }
          
          const location = await Location!.getCurrentPositionAsync({
            accuracy: Location!.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 0,
          });
          
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
          console.log('📍 [Weather] Native location:', { latitude, longitude });
        } catch (locationError) {
          console.log('⚠️ [Weather] Failed to get location, using time-based fallback:', locationError);
          const hour = new Date().getHours();
          const isDayTime = hour >= 7 && hour < 19;
          
          return {
            condition: isDayTime ? 'clear' : 'clear',
            description: isDayTime ? 'sunny day' : 'clear night',
            temp: 20,
            humidity: 50,
            windSpeed: 5,
            cloudiness: isDayTime ? 10 : 30,
            isDayTime,
            isRaining: false,
            isSnowing: false,
            isCloudy: false,
            isClear: true,
            isStormy: false,
            city: 'Your Location',
            isTimeBased: true,
          };
        }
      }
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    
    console.log('🌦️ [Weather] Fetching from URL:', url);
    console.log('🔑 [Weather] API Key:', OPENWEATHER_API_KEY);
    const response = await fetch(url);
    
    console.log('📡 [Weather] Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Weather] API error response:', errorText);
      throw new Error(`Weather API error: ${response.status} - ${errorText}`);
    }

    const data: WeatherData = await response.json();
    console.log('✅ [Weather] Raw data received:', JSON.stringify(data, null, 2));

    const currentTime = Date.now() / 1000;
    const isDayTime = currentTime >= data.sys.sunrise && currentTime <= data.sys.sunset;
    
    const condition = data.weather[0]?.main.toLowerCase() || 'clear';
    
    let cityName = data.name;
    if (latitude && longitude) {
      const geocodedCity = await getReverseGeocodedCity(latitude, longitude);
      if (geocodedCity) {
        cityName = geocodedCity;
      }
    }

    const processed: ProcessedWeatherData = {
      condition,
      description: data.weather[0]?.description || 'clear sky',
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      cloudiness: data.clouds.all,
      isDayTime,
      isRaining: condition.includes('rain') || condition.includes('drizzle'),
      isSnowing: condition.includes('snow'),
      isCloudy: data.clouds.all > 50,
      isClear: data.clouds.all < 20 && !condition.includes('rain') && !condition.includes('snow'),
      isStormy: condition.includes('thunder') || condition.includes('storm'),
      city: cityName,
    };

    cachedWeather = processed;
    lastFetchTime = now;

    console.log('🌤️ [Weather] Processed successfully:', JSON.stringify(processed, null, 2));
    return processed;
  } catch (error) {
    console.error('❌ [Weather] Error:', error);
    
    if (cachedWeather) {
      console.log('♻️ [Weather] Using stale cache due to error');
      return cachedWeather;
    }

    console.log('🕐 [Weather] Using time-based fallback');
    const hour = new Date().getHours();
    const isDayTime = hour >= 7 && hour < 19;
    
    return {
      condition: isDayTime ? 'clear' : 'clear',
      description: isDayTime ? 'sunny day' : 'clear night',
      temp: 20,
      humidity: 50,
      windSpeed: 5,
      cloudiness: isDayTime ? 10 : 30,
      isDayTime,
      isRaining: false,
      isSnowing: false,
      isCloudy: false,
      isClear: true,
      isStormy: false,
      city: 'Unknown',
      isTimeBased: true,
    };
  }
}

export function clearWeatherCache(): void {
  cachedWeather = null;
  lastFetchTime = 0;
  cachedExtendedWeather = null;
  lastExtendedFetchTime = 0;
  console.log('🗑️ [Weather] Cache cleared');
}

let cachedExtendedWeather: ExtendedWeatherData | null = null;
let lastExtendedFetchTime = 0;
const EXTENDED_CACHE_DURATION = 60 * 60 * 1000;

function getUVLevel(uvi: number): 'low' | 'moderate' | 'high' | 'very_high' | 'extreme' {
  if (uvi <= 2) return 'low';
  if (uvi <= 5) return 'moderate';
  if (uvi <= 7) return 'high';
  if (uvi <= 10) return 'very_high';
  return 'extreme';
}

function getUVProtection(uvi: number): string {
  if (uvi <= 2) return 'No protection needed. Enjoy the outdoors!';
  if (uvi <= 5) return 'Wear sunglasses on bright days. Use SPF 30+ if outdoors for 30+ minutes.';
  if (uvi <= 7) return 'Seek shade during midday. Wear protective clothing, hat, sunglasses, and SPF 30+ sunscreen.';
  if (uvi <= 10) return 'Avoid sun exposure between 10am-4pm. Wear SPF 50+, hat, sunglasses, and protective clothing.';
  return 'Take all precautions! Avoid sun exposure. Wear SPF 50+, full protective clothing, and seek shade.';
}

export type SkinProtection = {
  spfRecommendation: string;
  sunExposureTime: string;
  precautions: string[];
};

function getSafeExposureMinutes(uvi: number): number | null {
  if (uvi <= 2) return null;
  if (uvi <= 3) return 60;
  if (uvi <= 5) return Math.round(55 - (uvi - 3) * 7.5);
  if (uvi <= 7) return Math.round(40 - (uvi - 5) * 7.5);
  if (uvi <= 10) return Math.round(25 - (uvi - 7) * 5);
  return 10;
}

/** SPF, safe exposure, and tips from current UV (and optional peak later today). */
export function getSkinProtection(uvi: number, peakToday?: number): SkinProtection {
  const current = Math.round(uvi * 10) / 10;
  const peak = peakToday != null ? Math.round(peakToday * 10) / 10 : current;

  let spfRecommendation: string;
  if (uvi <= 2) spfRecommendation = 'SPF 15+ optional';
  else if (uvi < 6) spfRecommendation = 'SPF 30+';
  else if (uvi < 8) spfRecommendation = 'SPF 40-50';
  else if (uvi < 11) spfRecommendation = 'SPF 50+';
  else spfRecommendation = 'SPF 50+ water-resistant';

  const safeMinutes = getSafeExposureMinutes(uvi);
  let sunExposureTime: string;
  if (uvi <= 2) {
    sunExposureTime = 'Extended outdoor time OK';
  } else if (safeMinutes != null) {
    sunExposureTime = `~${safeMinutes} min without shade`;
  } else {
    sunExposureTime = 'Avoid direct exposure';
  }

  const precautions: string[] = [];

  if (peak > current + 0.5) {
    precautions.push(`UV peaks at ${peak} later — plan extra shade midday`);
  }

  if (uvi <= 2) {
    precautions.push('Sunglasses on bright days', 'Moisturizer with SPF is optional');
  } else {
    precautions.push(`Right now UV is ${current} — apply sunscreen 15 min before going out`);
    if (uvi >= 3) precautions.push('Reapply every 2 hours when outdoors');
    if (uvi >= 4) precautions.push('Wear sunglasses with UV protection');
    if (uvi >= 5) precautions.push('Seek shade during midday hours');
    if (uvi >= 6) precautions.push('Wear a wide-brimmed hat');
    if (uvi >= 7) precautions.push('Use SPF lip balm and protective clothing');
    if (uvi >= 8) precautions.push('Avoid direct sun 10am–4pm when possible');
    if (uvi >= 9) precautions.push('Use water-resistant SPF and cover arms and legs');
    if (uvi >= 11) precautions.push('Stay indoors during peak hours; monitor for heat stress');
  }

  const maxTips = uvi >= 8 ? 5 : 4;
  return {
    spfRecommendation,
    sunExposureTime,
    precautions: precautions.slice(0, maxTips),
  };
}

type OpenMeteoUvResponse = {
  hourly?: { time?: string[]; uv_index?: number[] };
  daily?: { time?: string[]; uv_index_max?: number[] };
  current?: { uv_index?: number };
};

async function fetchLiveUvData(latitude: number, longitude: number): Promise<{
  current: number;
  peakToday: number;
  hourly: UvHourlyPoint[];
  dailyByDate: Map<string, number>;
} | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      '&current=uv_index&hourly=uv_index&daily=uv_index_max&timezone=auto&forecast_days=7';
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as OpenMeteoUvResponse;
    const now = new Date();
    const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const hourlyTimes = data.hourly?.time ?? [];
    const hourlyUvi = data.hourly?.uv_index ?? [];
    const todayHours: UvHourlyPoint[] = [];
    let peakToday = 0;

    for (let i = 0; i < hourlyTimes.length; i++) {
      const t = hourlyTimes[i];
      if (!t?.startsWith(todayYmd)) continue;
      const uvi = Math.round((hourlyUvi[i] ?? 0) * 10) / 10;
      peakToday = Math.max(peakToday, uvi);
      const hourLabel = new Date(t).toLocaleTimeString('en-GB', { hour: 'numeric' });
      const isNow = Math.abs(new Date(t).getTime() - now.getTime()) < 45 * 60 * 1000;
      todayHours.push({ hour: hourLabel, uvi, isNow });
    }

    let displayHours: UvHourlyPoint[] = [];
    if (todayHours.length > 0) {
      const nowIdx = Math.max(0, todayHours.findIndex((h) => h.isNow));
      const start = Math.max(0, nowIdx - 3);
      displayHours = todayHours.slice(start, start + 8);
      if (displayHours.length < 4) {
        displayHours = todayHours.filter((_, idx) => idx % 2 === 0).slice(0, 8);
      }
    }

    const dailyByDate = new Map<string, number>();
    const dailyTimes = data.daily?.time ?? [];
    const dailyMax = data.daily?.uv_index_max ?? [];
    dailyTimes.forEach((date, i) => {
      dailyByDate.set(date, Math.round((dailyMax[i] ?? 0) * 10) / 10);
    });

    const current =
      typeof data.current?.uv_index === 'number'
        ? Math.round(data.current.uv_index * 10) / 10
        : peakToday || displayHours.find((h) => h.isNow)?.uvi || 0;

    return {
      current,
      peakToday: peakToday || current,
      hourly: displayHours.length > 0 ? displayHours : [{ hour: 'Now', uvi: current, isNow: true }],
      dailyByDate,
    };
  } catch (error) {
    console.log('⚠️ [Weather] Open-Meteo UV fetch failed:', error);
    return null;
  }
}

export async function getExtendedWeather(
  lat?: number,
  lon?: number,
  options?: { forceRefresh?: boolean }
): Promise<ExtendedWeatherData> {
  const now = Date.now();

  if (
    !options?.forceRefresh &&
    cachedExtendedWeather &&
    now - lastExtendedFetchTime < EXTENDED_CACHE_DURATION
  ) {
    console.log('☀️ [Weather] Using cached extended weather data');
    return cachedExtendedWeather;
  }

  try {
    let latitude = lat;
    let longitude = lon;

    if (!latitude || !longitude) {
      console.log('🌍 [Weather] Fetching user location for extended data...');
      
      if (Platform.OS === 'web') {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error('Geolocation not supported'));
              return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              enableHighAccuracy: true,
            });
          });
          
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch {
          return getDefaultExtendedWeather();
        }
      } else {
        try {
          const { status } = await Location!.requestForegroundPermissionsAsync();
          
          if (status !== 'granted') {
            throw new Error('Location permission denied');
          }
          
          const location = await Location!.getCurrentPositionAsync({
            accuracy: Location!.Accuracy.High,
          });
          
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
        } catch {
          return getDefaultExtendedWeather();
        }
      }
    }

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    
    console.log('🌦️ [Weather] Fetching extended forecast...');
    
    const [forecastResponse, currentResponse] = await Promise.all([
      fetch(forecastUrl),
      fetch(currentUrl)
    ]);

    if (!forecastResponse.ok || !currentResponse.ok) {
      throw new Error('Weather API error');
    }

    const forecastData = await forecastResponse.json();
    const currentData = await currentResponse.json();

    const currentTime = Date.now() / 1000;
    const isDayTime = currentTime >= currentData.sys.sunrise && currentTime <= currentData.sys.sunset;
    const condition = currentData.weather[0]?.main.toLowerCase() || 'clear';
    
    let extCityName = currentData.name;
    if (latitude && longitude) {
      const geocodedCity = await getReverseGeocodedCity(latitude, longitude);
      if (geocodedCity) {
        extCityName = geocodedCity;
      }
    }

    const current: ProcessedWeatherData = {
      condition,
      description: currentData.weather[0]?.description || 'clear sky',
      temp: Math.round(currentData.main.temp),
      humidity: currentData.main.humidity,
      windSpeed: currentData.wind.speed,
      cloudiness: currentData.clouds.all,
      isDayTime,
      isRaining: condition.includes('rain') || condition.includes('drizzle'),
      isSnowing: condition.includes('snow'),
      isCloudy: currentData.clouds.all > 50,
      isClear: currentData.clouds.all < 20 && !condition.includes('rain') && !condition.includes('snow'),
      isStormy: condition.includes('thunder') || condition.includes('storm'),
      city: extCityName,
      feelsLike: Math.round(currentData.main.feels_like),
      rain: currentData.rain?.['1h'] || currentData.rain?.['3h'] || 0,
    };

    const dailyForecasts: Map<string, any[]> = new Map();
    forecastData.list.forEach((item: any) => {
      const date = item.dt_txt.split(' ')[0];
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, []);
      }
      dailyForecasts.get(date)!.push(item);
    });

    const forecast: ForecastDay[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    dailyForecasts.forEach((items, date) => {
      if (forecast.length >= 5) return;
      
      const temps = items.map(i => i.main.temp);
      const midDay = items.find((i: any) => i.dt_txt.includes('12:00')) || items[Math.floor(items.length / 2)];
      const dateParts = date.split('-').map(Number);
      const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      
      const totalRain = items.reduce((sum: number, i: any) => sum + (i.rain?.['3h'] || 0), 0);
      const maxPop = Math.max(...items.map((i: any) => i.pop || 0));
      
      forecast.push({
        date,
        dayName: dayNames[dateObj.getDay()],
        temp: {
          min: Math.round(Math.min(...temps)),
          max: Math.round(Math.max(...temps))
        },
        condition: midDay.weather[0]?.main || 'Clear',
        description: midDay.weather[0]?.description || 'clear sky',
        icon: midDay.weather[0]?.icon || '01d',
        humidity: Math.round(items.reduce((sum: number, i: any) => sum + i.main.humidity, 0) / items.length),
        windSpeed: Math.round(items.reduce((sum: number, i: any) => sum + i.wind.speed, 0) / items.length * 10) / 10,
        uvi: 0,
        rain: Math.round(totalRain * 10) / 10,
        pop: Math.round(maxPop * 100)
      });
    });

    const uvLive =
      latitude != null && longitude != null
        ? await fetchLiveUvData(latitude, longitude)
        : null;

    const currentUvi = uvLive?.current ?? 0;
    const peakToday = uvLive?.peakToday ?? currentUvi;

    forecast.forEach((day) => {
      const fromApi = uvLive?.dailyByDate.get(day.date);
      day.uvi = fromApi ?? day.uvi;
    });
    if (forecast[0] && !forecast[0].uvi) {
      forecast[0].uvi = currentUvi;
    }

    const visibilityKm =
      typeof currentData.visibility === 'number'
        ? Math.round((currentData.visibility / 1000) * 10) / 10
        : 10;

    const extendedData: ExtendedWeatherData = {
      current,
      forecast,
      uvIndex: {
        value: currentUvi,
        level: getUVLevel(currentUvi),
        protection: getUVProtection(currentUvi),
        peakToday,
        hourly: uvLive?.hourly ?? [{ hour: 'Now', uvi: currentUvi, isNow: true }],
      },
      skinProtection: getSkinProtection(currentUvi, peakToday),
      visibilityKm,
      fetchedAt: now,
    };

    cachedExtendedWeather = extendedData;
    lastExtendedFetchTime = now;

    console.log('✅ [Weather] Extended data fetched successfully');
    return extendedData;
  } catch (error) {
    console.error('❌ [Weather] Extended weather error:', error);
    return getDefaultExtendedWeather();
  }
}

function getDefaultExtendedWeather(): ExtendedWeatherData {
  const hour = new Date().getHours();
  const isDayTime = hour >= 7 && hour < 19;
  
  return {
    current: {
      condition: 'clear',
      description: isDayTime ? 'sunny day' : 'clear night',
      temp: 20,
      humidity: 50,
      windSpeed: 5,
      cloudiness: 10,
      isDayTime,
      isRaining: false,
      isSnowing: false,
      isCloudy: false,
      isClear: true,
      isStormy: false,
      city: 'Your Location',
      isTimeBased: true,
      feelsLike: 20,
      rain: 0,
    },
    forecast: [
      ...Array.from({ length: 5 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return {
          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
          dayName: names[d.getDay()],
          temp: { min: 15 - i, max: 22 - i },
          condition: ['Clear', 'Clouds', 'Clear', 'Rain', 'Clouds'][i],
          description: ['clear sky', 'partly cloudy', 'sunny', 'light rain', 'overcast'][i],
          icon: ['01d', '02d', '01d', '10d', '04d'][i],
          humidity: [50, 55, 45, 70, 65][i],
          windSpeed: [5, 6, 4, 8, 7][i],
          uvi: [5, 4, 6, 2, 3][i],
          rain: [0, 0, 0, 2.5, 0][i],
          pop: [10, 20, 5, 60, 30][i],
        };
      }),
    ],
    uvIndex: {
      value: 5,
      level: 'moderate',
      protection: 'Wear sunglasses on bright days. Use SPF 30+ if outdoors for 30+ minutes.',
      peakToday: 6,
      hourly: [
        { hour: '9 AM', uvi: 2 },
        { hour: '12 PM', uvi: 5, isNow: true },
        { hour: '3 PM', uvi: 4 },
      ],
    },
    skinProtection: getSkinProtection(5, 6),
    visibilityKm: 10,
    fetchedAt: Date.now(),
  };
}

export type HeroTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type HeroGradientOptions = {
  description?: string;
  timeOfDay?: HeroTimeOfDay;
  hour?: number;
};

export function getTimeOfDayFromHour(hour?: number): HeroTimeOfDay {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

type HeroGradient = [string, string, string];

const HERO_GRADIENTS = {
  storm: {
    morning: ['#3D4F62', '#556575', '#6E7F8F'] as HeroGradient,
    afternoon: ['#4A5568', '#5E6B7D', '#748191'] as HeroGradient,
    evening: ['#2D3544', '#3D4758', '#4F5A6C'] as HeroGradient,
    night: ['#0C0E14', '#161B28', '#232A3A'] as HeroGradient,
  },
  rain: {
    light: {
      morning: ['#9BB4C8', '#B4C8D8', '#D0DEE8'] as HeroGradient,
      afternoon: ['#7B9AAE', '#94AFC2', '#B0C4D4'] as HeroGradient,
      evening: ['#6B7A8A', '#8494A4', '#9EACBA'] as HeroGradient,
      night: ['#1A2434', '#283648', '#364658'] as HeroGradient,
    },
    heavy: {
      morning: ['#6E8498', '#849AAE', '#9CB0C0'] as HeroGradient,
      afternoon: ['#556575', '#6A7D8F', '#8294A4'] as HeroGradient,
      evening: ['#455565', '#5A6A7A', '#708090'] as HeroGradient,
      night: ['#121A26', '#1E2A3A', '#2C3A4C'] as HeroGradient,
    },
  },
  snow: {
    morning: ['#D8E8F4', '#E8F2FA', '#F4F8FC'] as HeroGradient,
    afternoon: ['#C4D8E8', '#D8E8F4', '#ECF4FA'] as HeroGradient,
    evening: ['#A8B8C8', '#BCC8D8', '#D0DCE8'] as HeroGradient,
    night: ['#1E2838', '#2C3848', '#3C4A5C'] as HeroGradient,
  },
  fog: {
    morning: ['#D8D0C4', '#E4DCD0', '#F0E8DC'] as HeroGradient,
    afternoon: ['#B8C4D0', '#C8D4E0', '#D8E4EC'] as HeroGradient,
    evening: ['#A89888', '#B8A898', '#C8B8A8'] as HeroGradient,
    night: ['#22262C', '#2E343C', '#3A424C'] as HeroGradient,
  },
  cloud: {
    few: {
      morning: ['#7EC8E8', '#A8DCF4', '#E0F4FC'] as HeroGradient,
      afternoon: ['#4A9FD4', '#6BB8E8', '#A8D8F4'] as HeroGradient,
      evening: ['#D4A878', '#E8C090', '#F4D8B0'] as HeroGradient,
      night: ['#141E30', '#1E2C44', '#2A3C58'] as HeroGradient,
    },
    scattered: {
      morning: ['#88B8D8', '#A8D0E8', '#D0E8F4'] as HeroGradient,
      afternoon: ['#6898BE', '#88B4D4', '#B0D0E8'] as HeroGradient,
      evening: ['#B8A090', '#C8B4A4', '#D8C8B8'] as HeroGradient,
      night: ['#182030', '#243448', '#30445C'] as HeroGradient,
    },
    broken: {
      morning: ['#98A8B8', '#B0BCC8', '#C8D4E0'] as HeroGradient,
      afternoon: ['#788898', '#94A4B4', '#B0C0D0'] as HeroGradient,
      evening: ['#988878', '#A89888', '#B8A8A0'] as HeroGradient,
      night: ['#1C2434', '#283444', '#344454'] as HeroGradient,
    },
    overcast: {
      morning: ['#8A98A8', '#A0ACB8', '#B8C4D0'] as HeroGradient,
      afternoon: ['#708090', '#8898A8', '#A0B0C0'] as HeroGradient,
      evening: ['#787068', '#888078', '#989088'] as HeroGradient,
      night: ['#1A2030', '#262E40', '#323C50'] as HeroGradient,
    },
  },
  clear: {
    morning: ['#F0C878', '#F8DC98', '#FEF0C8'] as HeroGradient,
    afternoon: ['#1D6FD4', '#3B8FE8', '#7EC4F8'] as HeroGradient,
    evening: ['#D45820', '#F07830', '#F8A858'] as HeroGradient,
    night: ['#080C18', '#101828', '#1A2840'] as HeroGradient,
  },
} as const;

function resolveHeroTimeOfDay(
  isDayTime: boolean,
  options?: HeroGradientOptions
): HeroTimeOfDay {
  if (!isDayTime) return 'night';
  return options?.timeOfDay ?? getTimeOfDayFromHour(options?.hour);
}

function pickByTime(
  table: Record<HeroTimeOfDay, HeroGradient>,
  time: HeroTimeOfDay
): HeroGradient {
  return table[time] ?? table.afternoon;
}

function isHeavyRain(description: string): boolean {
  return (
    description.includes('heavy') ||
    description.includes('extreme') ||
    description.includes('torrential')
  );
}

function cloudCoverTier(
  cloudiness: number,
  description: string,
  condition: string
): 'few' | 'scattered' | 'broken' | 'overcast' {
  const desc = description.toLowerCase();
  const cond = condition.toLowerCase();
  if (desc.includes('overcast') || desc.includes('broken') && cloudiness >= 55) return 'overcast';
  if (desc.includes('overcast') || cloudiness >= 75) return 'overcast';
  if (desc.includes('broken') || cloudiness >= 55) return 'broken';
  if (desc.includes('scattered') || (cloudiness >= 30 && cloudiness < 55)) return 'scattered';
  if (desc.includes('few') || cloudiness < 30) return 'few';
  if (cond.includes('cloud') && cloudiness >= 70) return 'overcast';
  if (cloudiness >= 50) return 'broken';
  if (cloudiness >= 25) return 'scattered';
  return 'few';
}

/** Sky gradient matched to condition, cloud %, description, and time of day. */
export function getHeroGradientColors(
  condition: string,
  isDayTime: boolean,
  cloudiness: number,
  options?: HeroGradientOptions
): HeroGradient {
  const cond = condition.toLowerCase();
  const desc = (options?.description ?? '').toLowerCase();
  const time = resolveHeroTimeOfDay(isDayTime, options);
  const clouds = Math.max(0, Math.min(100, cloudiness));

  if (
    cond.includes('thunder') ||
    cond.includes('storm') ||
    cond.includes('squall') ||
    cond.includes('tornado') ||
    desc.includes('thunder')
  ) {
    return pickByTime(HERO_GRADIENTS.storm, time);
  }

  if (cond.includes('snow') || cond.includes('sleet') || cond.includes('blizzard') || desc.includes('snow')) {
    return pickByTime(HERO_GRADIENTS.snow, time);
  }

  if (
    cond.includes('rain') ||
    cond.includes('drizzle') ||
    desc.includes('rain') ||
    desc.includes('shower') ||
    desc.includes('drizzle')
  ) {
    const rainSet = isHeavyRain(desc) ? HERO_GRADIENTS.rain.heavy : HERO_GRADIENTS.rain.light;
    return pickByTime(rainSet, time);
  }

  if (
    cond.includes('mist') ||
    cond.includes('fog') ||
    cond.includes('haze') ||
    cond.includes('smoke') ||
    cond.includes('dust') ||
    cond.includes('sand') ||
    desc.includes('mist') ||
    desc.includes('fog') ||
    desc.includes('haze')
  ) {
    return pickByTime(HERO_GRADIENTS.fog, time);
  }

  if (cond.includes('cloud') || clouds >= 12) {
    const tier = cloudCoverTier(clouds, desc, cond);
    return pickByTime(HERO_GRADIENTS.cloud[tier], time);
  }

  return pickByTime(HERO_GRADIENTS.clear, time);
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }
  return null;
}

/** Pick light vs dark hero typography from the actual sky gradient (avoids API day/night mismatches). */
export function heroGradientNeedsLightText(gradient: readonly string[]): boolean {
  const sample = gradient[0] ?? gradient[Math.floor(gradient.length / 2)];
  if (!sample) return false;
  const rgb = parseHexColor(sample);
  if (!rgb) return false;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance < 0.42;
}

export function getWeatherIcon(condition: string, isDayTime: boolean = true): string {
  const cond = condition.toLowerCase();
  
  if (cond.includes('thunder') || cond.includes('storm')) return '⛈️';
  if (cond.includes('rain') || cond.includes('drizzle')) return isDayTime ? '🌧️' : '🌧️';
  if (cond.includes('snow')) return '❄️';
  if (cond.includes('mist') || cond.includes('fog') || cond.includes('haze')) return '🌫️';
  if (cond.includes('cloud') && cond.includes('scatter')) return isDayTime ? '⛅' : '☁️';
  if (cond.includes('cloud')) return '☁️';
  return isDayTime ? '☀️' : '🌙';
}

export function getUVColor(level: string): string {
  switch (level) {
    case 'low': return '#4ADE80';
    case 'moderate': return '#FACC15';
    case 'high': return '#FB923C';
    case 'very_high': return '#EF4444';
    case 'extreme': return '#A855F7';
    default: return '#6B7280';
  }
}
