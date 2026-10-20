import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Task } from '@/types/task';
import type { Habit } from '@/types/habit';
import { unifiedStorage } from '@/utils/unifiedStorage';
import { notificationService } from '@/utils/notificationService';
import { buildHabitReminderPlan, collectHabitReminderSources, localDateKey, type QuietPeriod } from '@/utils/habitReminderPlanner';

const KEY_PREFIX = 'habit_reminder_suppression_v1:';
export const HABIT_NOTIFICATION_CATEGORY = 'onepager-habit-actions';
export const HABIT_SNOOZE_ACTION = 'onepager-habit-snooze';
export const HABIT_DONE_ACTION = 'onepager-habit-done';
export const HABIT_SKIP_ACTION = 'onepager-habit-skip';
let queue: Promise<unknown> = Promise.resolve();
const storeKey = (userId: string) => KEY_PREFIX + userId;
export type HabitReminderHistoryEvent = {
  at:string;id:string;title?:string;kind:'scheduled'|'cancelled'|'received'|'opened'|'snoozed'|'muted'|'completed';
};
export async function getHabitReminderHistory(userId:string):Promise<HabitReminderHistoryEvent[]> {
  try {
    const raw=await unifiedStorage.getItem(`habit_reminder_history_v1:${userId}`);
    return raw?JSON.parse(raw) as HabitReminderHistoryEvent[]:[];
  }catch{return [];}
}
export async function logHabitReminderHistory(userId:string,id:string,kind:HabitReminderHistoryEvent['kind'],title?:string) {
  const old=await getHabitReminderHistory(userId);
  const entry:HabitReminderHistoryEvent={at:new Date().toISOString(),id,kind,title:title?.slice(0,120)};
  await unifiedStorage.setItem(`habit_reminder_history_v1:${userId}`,JSON.stringify([entry,...old].slice(0,80)));
}


async function readSuppressions(userId: string): Promise<Record<string,string>> {
  try {
    const raw = await unifiedStorage.getItem(storeKey(userId));
    const value = raw ? JSON.parse(raw) : {};
    return typeof value === 'object' && value ? value : {};
  } catch { return {}; }
}

export async function setHabitReminderDisposition(
  userId: string, habitId: string, date: string,
  kind: 'skip' | 'snooze', now = new Date(),
): Promise<void> {
  const old = await readSuppressions(userId);
  const next = { ...old };
  const key = `${habitId}:${date}`;
  next[key] = kind === 'skip' ? 'skip' : new Date(now.getTime() + 20*60_000).toISOString();
  // Limit retained preferences to a rolling fortnight.
  const entries = Object.entries(next).sort(([a],[b])=>b.localeCompare(a)).slice(0,100);
  await unifiedStorage.setItem(storeKey(userId),JSON.stringify(Object.fromEntries(entries)));
  await logHabitReminderHistory(userId,`${userId}|${habitId}|${date}`,kind === 'skip' ? 'muted' : 'snoozed');
}

export async function installHabitNotificationActions(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync(HABIT_NOTIFICATION_CATEGORY, [
    { identifier:HABIT_DONE_ACTION,buttonTitle:'Mark Done',options:{ opensAppToForeground:true } },
    { identifier:HABIT_SNOOZE_ACTION,buttonTitle:'In 20 minutes',options:{ opensAppToForeground:true } },
    { identifier:HABIT_SKIP_ACTION,buttonTitle:'No more today',options:{ opensAppToForeground:true, isDestructive:false } },
  ]);
}

/**
 * Reconcile one-shot local notifications rather than scheduling repeating
 * weekly alarms. They can be cancelled when a completion is synced and are
 * rebuilt when preferences, dates, or time zones change while the app is open.
 * iOS cannot run arbitrary background logic after a notification has fired;
 * later follow-ups must therefore be explicitly opted into.
 */
export function reconcileHabitNotifications(input: {
  userId: string;
  enabled: boolean;
  tasks: readonly Task[];
  habits: readonly Habit[];
  quiet: QuietPeriod;
  now?: Date;
}): Promise<void> {
  const run = async () => {
    if (Platform.OS === 'web') return;
    const now = input.now ?? new Date();
    const suppressed = await readSuppressions(input.userId);
    const plans = input.enabled
      ? buildHabitReminderPlan({
        userId:input.userId,
        habits:collectHabitReminderSources(input.tasks,input.habits),
        now,quiet:input.quiet,suppressedDays:suppressed,
        daysAhead:7,limit:35,
      }) : [];
    const wanted = new Map(plans.map(p=>[p.id,p]));
    const saved = await notificationService.getScheduledNotifications();
    const native = await Notifications.getAllScheduledNotificationsAsync();
    const live = new Set(native.map(x=>x.identifier));
    // A shared device must not surface reminders from a previously signed-in account.
    // Older weekly habit reminders predate account ownership tags.
    for (const pending of native) {
      const data = pending.content.data as Record<string,unknown> | undefined;
      if (data?.type === 'habit_reminder' && data.ownerId !== input.userId) {
        await Notifications.cancelScheduledNotificationAsync(pending.identifier);
        live.delete(pending.identifier);
      }
    }
    // Legacy weekly reminders are cancelled on first reconciliation.
    const owned = saved.filter(n=>n.type==='habit_reminder' && (
      n.id.startsWith(input.userId+'|') ||
      n.id.startsWith('habit_') ||
      !!n.data?.habitId
    ));
    for (const old of owned) {
      const desired = wanted.get(old.id);
      if (!input.enabled || !desired || old.scheduledTime!==desired.at.toISOString() || !live.has(old.identifier)) {
        await notificationService.cancelNotification(old.identifier);
        if(old.id.startsWith(input.userId+'|'))await logHabitReminderHistory(input.userId,old.id,'cancelled',old.title);
      } else {
        wanted.delete(old.id);
      }
    }
    if (!input.enabled) return;
    for (const p of wanted.values()) {
      const result=await notificationService.scheduleNotification(p.title,p.body,p.at,{
        type:'habit_reminder',id:p.id,
        payload:{
          habitId:p.habitId,day:p.day,kind:p.kind,ownerId:input.userId,
          category:HABIT_NOTIFICATION_CATEGORY,
        },
      });
      if(result)await logHabitReminderHistory(input.userId,p.id,'scheduled',p.title);
    }
  };
  // Cross-render / app foreground events must not race with one another.
  const pending=queue.then(run,run);
  queue=pending.catch(error=>console.warn('[HabitReminders] reconciliation failed:',error));
  return pending;
}

export async function dismissHabitRemindersForToday(userId:string,habitId:string,date=localDateKey(new Date())) {
  const saved=await notificationService.getScheduledNotifications();
  for(const item of saved) {
    if(item.type==='habit_reminder' && item.id.startsWith(`${userId}|${habitId}|${date}|`)) {
      await notificationService.cancelNotification(item.identifier);
    }
  }
}
