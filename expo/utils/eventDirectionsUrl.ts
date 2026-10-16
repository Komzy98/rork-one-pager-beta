export type EventTravelMode = 'driving' | 'transit' | 'walking' | 'cycling';

export function buildEventDirectionsUrl(
  platform: 'ios' | 'android' | 'web',
  venue: string,
  city: string,
  latitude: number | undefined,
  longitude: number | undefined,
  mode: EventTravelMode = 'driving',
): string {
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude) &&
    (latitude !== 0 || longitude !== 0) &&
    Math.abs(latitude!) <= 90 && Math.abs(longitude!) <= 180;
  const destination = hasCoordinates ? `${latitude},${longitude}` : [venue, city].filter(Boolean).join(', ');
  if (platform === 'ios') {
    const appleMode: Record<EventTravelMode, string> = {
      driving: 'd', transit: 'r', walking: 'w', cycling: 'w',
    };
    return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=${appleMode[mode]}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=${mode}`;
}
