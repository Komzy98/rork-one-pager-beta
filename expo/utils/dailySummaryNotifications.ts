import { notificationService } from '@/utils/notificationService';
import {
  getAutoSummarySchedule,
  isAutoSummaryEnabled,
} from '@/utils/dailySummaryStats';

export async function syncDailySummaryNotification(params: {
  userId: string;
  autoEnabled?: boolean;
  notifyEnabled?: boolean;
  hour?: number;
  minute?: number;
}): Promise<void> {
  const userId = params.userId;
  const autoEnabled =
    params.autoEnabled ?? (await isAutoSummaryEnabled(userId));
  const schedule = await getAutoSummarySchedule(userId);
  const notifyEnabled = params.notifyEnabled ?? schedule.notifyEnabled;
  const hour = params.hour ?? schedule.hour;
  const minute = params.minute ?? schedule.minute;

  await notificationService.cancelNotificationsByType('daily_summary');

  if (!autoEnabled || !notifyEnabled) return;

  const status = await notificationService.getPermissionStatus();
  if (status !== 'granted') return;

  await notificationService.scheduleDailySummaryReminder(hour, minute);
}
