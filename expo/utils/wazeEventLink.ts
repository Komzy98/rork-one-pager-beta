/** Waze universal link — opens the app when installed, otherwise Waze web / store. */
export function buildWazeEventUrl(event: {
  venue: string;
  location: string;
  latitude?: number;
  longitude?: number;
}): string {
  const label = encodeURIComponent(`${event.venue}, ${event.location}`.replace(/,\s*$/, ''));
  const { latitude, longitude } = event;
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
  if (hasCoords) {
    return `https://waze.com/ul?q=${label}&ll=${latitude},${longitude}&navigate=yes`;
  }
  return `https://waze.com/ul?q=${label}&navigate=yes`;
}
