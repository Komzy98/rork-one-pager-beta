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

export interface ExtendedWeatherData {
  current: ProcessedWeatherData;
  forecast: ForecastDay[];
  uvIndex: {
    value: number;
    level: 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';
    protection: string;
  };
  skinProtection: {
    spfRecommendation: string;
    sunExposureTime: string;
    precautions: string[];
  };
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

function getSkinProtection(uvi: number): { spfRecommendation: string; sunExposureTime: string; precautions: string[] } {
  if (uvi <= 2) {
    return {
      spfRecommendation: 'SPF 15-30 (optional)',
      sunExposureTime: 'Safe for extended periods',
      precautions: ['Sunglasses recommended on bright days']
    };
  }
  if (uvi <= 5) {
    return {
      spfRecommendation: 'SPF 30+',
      sunExposureTime: 'Limit exposure to 45-60 minutes',
      precautions: [
        'Apply sunscreen 15 min before going out',
        'Wear sunglasses',
        'Reapply every 2 hours'
      ]
    };
  }
  if (uvi <= 7) {
    return {
      spfRecommendation: 'SPF 30-50',
      sunExposureTime: 'Limit to 30-45 minutes',
      precautions: [
        'Seek shade during midday hours',
        'Wear wide-brimmed hat',
        'Use SPF lip balm',
        'Wear protective clothing'
      ]
    };
  }
  if (uvi <= 10) {
    return {
      spfRecommendation: 'SPF 50+',
      sunExposureTime: 'Limit to 15-25 minutes',
      precautions: [
        'Avoid sun from 10am to 4pm',
        'Wear UV-blocking sunglasses',
        'Apply water-resistant sunscreen',
        'Cover arms and legs',
        'Stay hydrated'
      ]
    };
  }
  return {
    spfRecommendation: 'SPF 50+ (water-resistant)',
    sunExposureTime: 'Avoid direct exposure',
    precautions: [
      'Stay indoors during peak hours',
      'Full protective clothing required',
      'UV-blocking sunglasses essential',
      'Reapply sunscreen every hour if outside',
      'Seek air-conditioned spaces',
      'Monitor for heat exhaustion'
    ]
  };
}

export async function getExtendedWeather(lat?: number, lon?: number): Promise<ExtendedWeatherData> {
  const now = Date.now();
  
  if (cachedExtendedWeather && (now - lastExtendedFetchTime) < EXTENDED_CACHE_DURATION) {
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
      
      const estimatedUvi = (() => {
        const cond = midDay.weather[0]?.main.toLowerCase() || '';
        const month = dateObj.getMonth();
        const baseUvi = month >= 4 && month <= 8 ? 7 : 4;
        
        if (cond.includes('rain') || cond.includes('storm')) return baseUvi * 0.3;
        if (cond.includes('cloud')) return baseUvi * 0.6;
        return baseUvi;
      })();

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
        uvi: Math.round(estimatedUvi * 10) / 10,
        rain: Math.round(totalRain * 10) / 10,
        pop: Math.round(maxPop * 100)
      });
    });

    const currentUvi = forecast[0]?.uvi || 5;
    
    const extendedData: ExtendedWeatherData = {
      current,
      forecast,
      uvIndex: {
        value: currentUvi,
        level: getUVLevel(currentUvi),
        protection: getUVProtection(currentUvi)
      },
      skinProtection: getSkinProtection(currentUvi)
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
      protection: 'Wear sunglasses on bright days. Use SPF 30+ if outdoors for 30+ minutes.'
    },
    skinProtection: getSkinProtection(5)
  };
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
