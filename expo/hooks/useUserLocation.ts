import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { DEFAULT_COORDS } from '@/constants/mockEvents';

export interface UserCoords {
  latitude: number;
  longitude: number;
}

export interface UseUserLocationResult {
  coords: UserCoords;
  areaLabel: string | null;
  isLoading: boolean;
  permissionDenied: boolean;
  refresh: () => Promise<void>;
}

async function reverseGeocodeLabel(latitude: number, longitude: number): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'OnePager/1.0' },
      });
      if (!response.ok) return null;
      const data = (await response.json()) as {
        address?: { city?: string; town?: string; village?: string; state?: string };
      };
      const addr = data.address;
      return addr?.city || addr?.town || addr?.village || addr?.state || null;
    }

    const Location = await import('expo-location');
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!results.length) return null;
    const place = results[0];
    return (
      place.city ||
      place.subregion ||
      place.district ||
      place.region ||
      place.name ||
      null
    );
  } catch {
    return null;
  }
}

async function readDeviceCoords(): Promise<{
  coords: UserCoords;
  permissionDenied: boolean;
}> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
              permissionDenied: false,
            });
          },
          () => resolve({ coords: DEFAULT_COORDS, permissionDenied: true }),
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
        );
      });
    }
    return { coords: DEFAULT_COORDS, permissionDenied: true };
  }

  try {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { coords: DEFAULT_COORDS, permissionDenied: true };
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      coords: {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      },
      permissionDenied: false,
    };
  } catch {
    return { coords: DEFAULT_COORDS, permissionDenied: true };
  }
}

export function useUserLocation(): UseUserLocationResult {
  const [coords, setCoords] = useState<UserCoords>(DEFAULT_COORDS);
  const [areaLabel, setAreaLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { coords: nextCoords, permissionDenied: denied } = await readDeviceCoords();
    setCoords(nextCoords);
    setPermissionDenied(denied);
    const label = await reverseGeocodeLabel(nextCoords.latitude, nextCoords.longitude);
    setAreaLabel(label);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { coords, areaLabel, isLoading, permissionDenied, refresh };
}
