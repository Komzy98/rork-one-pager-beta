import { Alert, Linking, Platform } from 'react-native';
import type { LocalEvent } from '@/types/events';
import { buildWazeEventUrl } from '@/utils/wazeEventLink';
import { buildEventDirectionsUrl, type EventTravelMode } from '@/utils/eventDirectionsUrl';
import { isUsableTicketLink } from '@/utils/eventTicketLinks';

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
  // Reject insecure and local destinations; do not launch arbitrary URL schemes.
  if (!isUsableTicketLink(url)) {
    Alert.alert('Tickets', 'This event has an invalid ticket link.');
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Tickets', 'Unable to open the ticket provider right now. Try again later.');
  }
}

export async function openEventDirections(
  event: LocalEvent,
  mode: EventTravelMode = 'driving',
): Promise<void> {
  const url = buildEventDirectionsUrl(
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    event.venue, event.location, event.latitude, event.longitude, mode,
  );
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Directions', 'Could not open Maps. Please check the venue address.');
  }
}

export async function openEventInWaze(event: LocalEvent): Promise<void> {
  const url = buildWazeEventUrl(event);
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Waze', 'Unable to open Waze on this device.');
  }
}
