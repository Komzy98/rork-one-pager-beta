import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { unifiedStorage } from '@/utils/unifiedStorage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type:
    | 'match_live'
    | 'match_reminder'
    | 'goal_alert'
    | 'habit_reminder'
    | 'task_due'
    | 'reading_reminder'
    | 'weekly_recap'
    | 'streak_protection'
    | 'daily_summary'
    | 'social'
    | 'challenge'
    | 'achievement'
    | 'event_reminder';
  id?: string;
  payload?: Record<string, any>;
}

export interface ScheduledNotification {
  id: string;
  identifier: string;
  type: NotificationData['type'];
  title: string;
  body: string;
  scheduledTime: string;
  data?: Record<string, any>;
}

const SCHEDULED_NOTIFICATIONS_KEY = 'scheduled_notifications';
const LEGACY_SCHEDULED_NOTIFICATIONS_KEY = SCHEDULED_NOTIFICATIONS_KEY;
let activeUserId: string = 'guest';

function getScheduledNotificationsKey() {
  return `${SCHEDULED_NOTIFICATIONS_KEY}_${activeUserId}`;
}

export const notificationService = {
  setActiveUser(userId?: string) {
    activeUserId = userId || 'guest';
  },

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          console.log('📱 Web notification permission:', permission);
          return permission === 'granted';
        }
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      console.log('📱 Notification permission status:', finalStatus);
      return finalStatus === 'granted';
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  },

  async getPermissionStatus(): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        if ('Notification' in window) {
          return Notification.permission;
        }
        return 'unavailable';
      }

      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('❌ Error getting permission status:', error);
      return 'unavailable';
    }
  },

  async sendImmediateNotification(
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('⚠️ No notification permission');
        return null;
      }

      if (Platform.OS === 'web') {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
          console.log('📤 Web notification sent:', title);
          return 'web-notification';
        }
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data as any,
          sound: true,
        },
        trigger: null,
      });

      console.log('📤 Notification sent:', identifier, title);
      return identifier;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return null;
    }
  },

  async scheduleNotification(
    title: string,
    body: string,
    triggerDate: Date,
    data?: NotificationData
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('⚠️ No notification permission');
        return null;
      }

      if (Platform.OS === 'web') {
        console.log('⚠️ Scheduled notifications not fully supported on web');
        return null;
      }

      const now = new Date();
      const delay = triggerDate.getTime() - now.getTime();
      
      if (delay <= 0) {
        console.log('⚠️ Trigger date is in the past');
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data as any,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      await this.saveScheduledNotification({
        id: data?.id || identifier,
        identifier,
        type: data?.type || 'habit_reminder',
        title,
        body,
        scheduledTime: triggerDate.toISOString(),
        data: data?.payload,
      });

      console.log('📅 Notification scheduled:', identifier, 'for', triggerDate.toISOString());
      return identifier;
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      return null;
    }
  },

  async scheduleHabitReminder(
    habitId: string,
    habitName: string,
    hour: number,
    minute: number,
    days: number[]
  ): Promise<string[]> {
    const identifiers: string[] = [];

    try {
      if (Platform.OS === 'web') {
        console.log('⚠️ Recurring notifications not supported on web');
        return identifiers;
      }

      await this.cancelHabitReminders(habitId);

      for (const day of days) {
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎯 Habit Reminder',
            body: `Time to complete: ${habitName}`,
            data: {
              type: 'habit_reminder',
              id: habitId,
              habitName,
            },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: day === 0 ? 1 : day + 1,
            hour,
            minute,
          },
        });

        identifiers.push(identifier);
        
        await this.saveScheduledNotification({
          id: `habit_${habitId}_${day}`,
          identifier,
          type: 'habit_reminder',
          title: '🎯 Habit Reminder',
          body: `Time to complete: ${habitName}`,
          scheduledTime: `${hour}:${minute} on day ${day}`,
          data: { habitId, habitName, day },
        });
      }

      console.log('📅 Habit reminders scheduled for', habitName, ':', identifiers.length, 'notifications');
      return identifiers;
    } catch (error) {
      console.error('❌ Error scheduling habit reminders:', error);
      return identifiers;
    }
  },

  async scheduleTaskDueReminder(
    taskId: string,
    taskTitle: string,
    dueDate: Date,
    reminderMinutesBefore: number = 60
  ): Promise<string | null> {
    try {
      const reminderTime = new Date(dueDate.getTime() - reminderMinutesBefore * 60 * 1000);
      
      if (reminderTime <= new Date()) {
        console.log('⚠️ Task reminder time is in the past');
        return null;
      }

      await this.cancelTaskReminder(taskId);

      const identifier = await this.scheduleNotification(
        '📋 Task Due Soon',
        `"${taskTitle}" is due in ${reminderMinutesBefore} minutes`,
        reminderTime,
        {
          type: 'task_due',
          id: taskId,
          payload: { taskTitle, dueDate: dueDate.toISOString() },
        }
      );

      console.log('📅 Task reminder scheduled for', taskTitle);
      return identifier;
    } catch (error) {
      console.error('❌ Error scheduling task reminder:', error);
      return null;
    }
  },

  async scheduleMatchReminder(
    matchId: string,
    homeTeam: string,
    awayTeam: string,
    matchTime: Date,
    reminderMinutesBefore: number = 30
  ): Promise<string | null> {
    try {
      const reminderTime = new Date(matchTime.getTime() - reminderMinutesBefore * 60 * 1000);
      
      if (reminderTime <= new Date()) {
        console.log('⚠️ Match reminder time is in the past');
        return null;
      }

      await this.cancelMatchReminder(matchId);

      const identifier = await this.scheduleNotification(
        '⚽ Match Starting Soon',
        `${homeTeam} vs ${awayTeam} kicks off in ${reminderMinutesBefore} minutes!`,
        reminderTime,
        {
          type: 'match_reminder',
          id: matchId,
          payload: { homeTeam, awayTeam, matchTime: matchTime.toISOString() },
        }
      );

      console.log('📅 Match reminder scheduled for', homeTeam, 'vs', awayTeam);
      return identifier;
    } catch (error) {
      console.error('❌ Error scheduling match reminder:', error);
      return null;
    }
  },

  async sendLiveMatchAlert(
    matchId: string,
    homeTeam: string,
    awayTeam: string,
    event: string,
    score?: { home: number; away: number }
  ): Promise<string | null> {
    try {
      let body = event;
      if (score) {
        body = `${homeTeam} ${score.home} - ${score.away} ${awayTeam}\n${event}`;
      }

      const identifier = await this.sendImmediateNotification(
        '⚽ Live Match Update',
        body,
        {
          type: 'match_live',
          id: matchId,
          payload: { homeTeam, awayTeam, event, score },
        }
      );

      return identifier;
    } catch (error) {
      console.error('❌ Error sending live match alert:', error);
      return null;
    }
  },

  async sendGoalAlert(
    matchId: string,
    scoringTeam: string,
    scorer: string,
    homeTeam: string,
    awayTeam: string,
    score: { home: number; away: number }
  ): Promise<string | null> {
    try {
      const identifier = await this.sendImmediateNotification(
        '⚽ GOAL!',
        `${scorer} scores for ${scoringTeam}!\n${homeTeam} ${score.home} - ${score.away} ${awayTeam}`,
        {
          type: 'goal_alert',
          id: matchId,
          payload: { scoringTeam, scorer, homeTeam, awayTeam, score },
        }
      );

      return identifier;
    } catch (error) {
      console.error('❌ Error sending goal alert:', error);
      return null;
    }
  },

  async cancelNotification(identifier: string): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      await Notifications.cancelScheduledNotificationAsync(identifier);
      await this.removeScheduledNotification(identifier);
      console.log('🗑️ Notification cancelled:', identifier);
    } catch (error) {
      console.error('❌ Error cancelling notification:', error);
    }
  },

  async cancelHabitReminders(habitId: string): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const habitNotifications = scheduled.filter(
        n => n.type === 'habit_reminder' && n.data?.habitId === habitId
      );

      for (const notification of habitNotifications) {
        await this.cancelNotification(notification.identifier);
      }

      console.log('🗑️ Cancelled', habitNotifications.length, 'habit reminders for', habitId);
    } catch (error) {
      console.error('❌ Error cancelling habit reminders:', error);
    }
  },

  async cancelTaskReminder(taskId: string): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const taskNotifications = scheduled.filter(
        n => n.type === 'task_due' && n.id === taskId
      );

      for (const notification of taskNotifications) {
        await this.cancelNotification(notification.identifier);
      }
    } catch (error) {
      console.error('❌ Error cancelling task reminder:', error);
    }
  },

  async cancelMatchReminder(matchId: string): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const matchNotifications = scheduled.filter(
        n => n.type === 'match_reminder' && n.id === matchId
      );

      for (const notification of matchNotifications) {
        await this.cancelNotification(notification.identifier);
      }
    } catch (error) {
      console.error('❌ Error cancelling match reminder:', error);
    }
  },

  async scheduleEventReminder(
    eventId: string,
    title: string,
    venue: string,
    eventTime: Date,
    reminderMinutesBefore: number = 30
  ): Promise<string | null> {
    try {
      const reminderTime = new Date(eventTime.getTime() - reminderMinutesBefore * 60 * 1000);

      if (reminderTime <= new Date()) {
        console.log('⚠️ Event reminder time is in the past');
        return null;
      }

      await this.cancelEventReminder(eventId);

      const identifier = await this.scheduleNotification(
        '🎟️ Event Starting Soon',
        `"${title}" at ${venue} starts in ${reminderMinutesBefore} minutes`,
        reminderTime,
        {
          type: 'event_reminder',
          id: eventId,
          payload: { title, venue, eventTime: eventTime.toISOString() },
        }
      );

      return identifier;
    } catch (error) {
      console.error('❌ Error scheduling event reminder:', error);
      return null;
    }
  },

  async cancelEventReminder(eventId: string): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const eventNotifications = scheduled.filter(
        (n) => n.type === 'event_reminder' && n.id === eventId
      );

      for (const notification of eventNotifications) {
        await this.cancelNotification(notification.identifier);
      }
    } catch (error) {
      console.error('❌ Error cancelling event reminder:', error);
    }
  },

  async cancelNotificationsByType(type: NotificationData['type']): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const matches = scheduled.filter((n) => n.type === type);
      for (const notification of matches) {
        await this.cancelNotification(notification.identifier);
      }
      if (matches.length > 0) {
        console.log('🗑️ Cancelled', matches.length, type, 'notification(s)');
      }
    } catch (error) {
      console.error('❌ Error cancelling notifications by type:', type, error);
    }
  },

  async scheduleDailySummaryReminder(hour: number, minute: number): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        console.log('⚠️ Daily summary reminders not supported on web');
        return null;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      await this.cancelNotificationsByType('daily_summary');

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '✨ Your daily summary is ready',
          body: 'See today\'s wins, streaks, and what\'s still open on Overview.',
          data: {
            type: 'daily_summary',
            id: 'daily_summary_reminder',
          },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: Math.max(0, Math.min(23, hour)),
          minute: Math.max(0, Math.min(59, minute)),
        },
      });

      await this.saveScheduledNotification({
        id: 'daily_summary_reminder',
        identifier,
        type: 'daily_summary',
        title: '✨ Your daily summary is ready',
        body: 'See today\'s wins, streaks, and what\'s still open on Overview.',
        scheduledTime: `${hour}:${String(minute).padStart(2, '0')} daily`,
        data: { hour, minute },
      });

      console.log('📅 Daily summary reminder scheduled for', hour, minute);
      return identifier;
    } catch (error) {
      console.error('❌ Error scheduling daily summary reminder:', error);
      return null;
    }
  },

  async cancelAllNotifications(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      await Notifications.cancelAllScheduledNotificationsAsync();
      await unifiedStorage.removeItem(getScheduledNotificationsKey());
      console.log('🗑️ All notifications cancelled');
    } catch (error) {
      console.error('❌ Error cancelling all notifications:', error);
    }
  },

  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      const scopedKey = getScheduledNotificationsKey();
      let stored = await unifiedStorage.getItem(scopedKey);
      if (!stored) {
        const legacy = await unifiedStorage.getItem(LEGACY_SCHEDULED_NOTIFICATIONS_KEY);
        if (legacy) {
          stored = legacy;
          await unifiedStorage.setItem(scopedKey, legacy);
        }
      }
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Error getting scheduled notifications:', error);
      return [];
    }
  },

  async saveScheduledNotification(notification: ScheduledNotification): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const existingIndex = scheduled.findIndex(n => n.identifier === notification.identifier);
      
      if (existingIndex >= 0) {
        scheduled[existingIndex] = notification;
      } else {
        scheduled.push(notification);
      }

      await unifiedStorage.setItem(getScheduledNotificationsKey(), JSON.stringify(scheduled));
    } catch (error) {
      console.error('❌ Error saving scheduled notification:', error);
    }
  },

  async removeScheduledNotification(identifier: string): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const filtered = scheduled.filter(n => n.identifier !== identifier);
      await unifiedStorage.setItem(getScheduledNotificationsKey(), JSON.stringify(filtered));
    } catch (error) {
      console.error('❌ Error removing scheduled notification:', error);
    }
  },

  async getBadgeCount(): Promise<number> {
    try {
      if (Platform.OS === 'web') return 0;
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('❌ Error getting badge count:', error);
      return 0;
    }
  },

  async setBadgeCount(count: number): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('❌ Error setting badge count:', error);
    }
  },

  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  },
};

export default notificationService;
