import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNotifications } from '@/hooks/useBackgroundServices';
import type { LocalEvent } from '@/types/events';
import { parseEventStartDateTime } from '@/utils/eventDiscovery';
import { notificationService } from '@/utils/notificationService';

export function useEventReminders() {
  const { profile } = useUserProfile();
  const { isEnabled, requestPermissions } = useNotifications();

  const scheduleEventReminder = useCallback(
    async (event: LocalEvent): Promise<boolean> => {
      const start = parseEventStartDateTime(event);
      if (!start) {
        Alert.alert('Remind me', 'Could not parse this event’s date.');
        return false;
      }

      if (Platform.OS !== 'web' && !isEnabled) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert('Remind me', 'Enable notifications in Settings to get event reminders.');
          return false;
        }
      }

      const leadMinutes = profile?.notificationSettings?.eventReminderLeadMinutes ?? 30;
      const identifier = await notificationService.scheduleEventReminder(
        event.id,
        event.title,
        event.venue,
        start,
        leadMinutes
      );

      if (!identifier) {
        Alert.alert('Remind me', 'This event is too soon to schedule a reminder.');
        return false;
      }

      Alert.alert(
        'Reminder set',
        `We’ll remind you ${leadMinutes} minutes before doors.`
      );
      return true;
    },
    [isEnabled, profile?.notificationSettings?.eventReminderLeadMinutes, requestPermissions]
  );

  return { scheduleEventReminder };
}
