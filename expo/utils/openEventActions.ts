import { Alert, Linking, Platform } from 'react-native';
import type { LocalEvent } from '@/types/events';
import { buildWazeEventUrl } from '@/utils/wazeEventLink';

export { getEventCalendarRange } from '@/utils/eventDiscovery';
export { buildWazeEventUrl } from '@/utils/wazeEventLink';

export async function openEventTickets(event: LocalEvent): Promise<void> {
  const url = event.ticketUrl?.trim();
  if (!url) {
    Alert.alert(
      'Tickets',
      event.price === 'Free'
        ? 'No registration link for this sample event.'
        : 'No ticket link available for this event yet.'
    );
    return;
  }
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert('Tickets', 'Unable to open the ticket link.');
    return;
  }
  await Linking.openURL(url);
}

export async function openEventDirections(event: LocalEvent): Promise<void> {
  const label = encodeURIComponent(`${event.venue}, ${event.location}`);
  const { latitude, longitude } = event;
  const url =
    Platform.OS === 'ios'
      ? `maps:0,0?q=${label}@${latitude},${longitude}`
      : Platform.OS === 'android'
        ? `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`
        : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    await Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    );
    return;
  }
  await Linking.openURL(url);
}

export async function openEventInWaze(event: LocalEvent): Promise<void> {
  const url = buildWazeEventUrl(event);
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Waze', 'Unable to open Waze on this device.');
  }
}
