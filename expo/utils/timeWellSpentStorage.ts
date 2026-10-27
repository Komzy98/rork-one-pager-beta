import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationService } from './notificationService';
import { unifiedStorage } from './unifiedStorage';
import {
  planTimelyReminders, summarizeTimeOutcomes,
  type AggregateMoment, type TimeOpportunityKind, type TimeOutcome,
  type TimeWellSpentInput,
} from './timeWellSpent';

const PREF = 'onepager:timely-reminders:v1:';
const OUTCOMES = 'onepager:worthwhile-outcomes:v1:';
const OUR_PREFIX = 'time-well-spent:';
const scoped = (prefix: string, userId: string) => prefix + (userId || 'guest');
let reminderQueue: Promise<unknown> = Promise.resolve();
const outcomeQueues = new Map<string, Promise<unknown>>();

export async function getTimelyRemindersEnabled(userId: string): Promise<boolean> {
  return (await unifiedStorage.getItem(scoped(PREF, userId))) === 'true';
}
export async function saveTimelyRemindersEnabled(userId: string, enabled: boolean): Promise<void> {
  await unifiedStorage.setItem(scoped(PREF, userId), enabled ? 'true' : 'false');
}

/** One-shot local alerts only; schedules are rebuilt when the app opens or data changes.
 * No background polling, unconsented push, guessed kickoff times, or system permission prompt.
 */
export function syncTimeWellSpentReminders(
  userId: string,
  enabled: boolean,
  input: Pick<TimeWellSpentInput, 'signals' | 'episodes'>,
): Promise<void> {
  const run = async () => {
    if (Platform.OS === 'web') return;
    notificationService.setActiveUser(userId);
    const stored = await notificationService.getScheduledNotifications();
    const native = await Notifications.getAllScheduledNotificationsAsync();
    const live = new Set(native.map(n => n.identifier));
    const ours = stored.filter(n => n.type === 'interest_reminder' && n.id.startsWith(OUR_PREFIX));
    const permission = enabled && (await notificationService.getPermissionStatus()) === 'granted';
    const desired = permission ? planTimelyReminders(input) : [];
    const wanted = new Map(desired.map(p => [p.id, p]));
    for (const item of ours) {
      const plan = wanted.get(item.id);
      if (!plan || !live.has(item.identifier) ||
        item.scheduledTime !== plan.at.toISOString()) {
        if (live.has(item.identifier)) await notificationService.cancelNotification(item.identifier);
        else await notificationService.removeScheduledNotification(item.identifier);
      }
    }
    if (!permission) return;
    const refreshed = await notificationService.getScheduledNotifications();
    const retained = new Set(refreshed.filter(n =>
      n.type === 'interest_reminder' && n.id.startsWith(OUR_PREFIX) &&
      live.has(n.identifier)).map(n => n.id));
    for (const plan of desired) {
      if (retained.has(plan.id)) continue;
      await notificationService.scheduleNotification(plan.title, plan.body, plan.at, {
        type: 'interest_reminder',
        id: plan.id,
        payload: { source: plan.kind, route: plan.kind === 'football' ? '/(tabs)/sports' : '/(tabs)/shows' },
      });
    }
  };
  const next = reminderQueue.then(run, run);
  reminderQueue = next.catch(err => console.warn('[WorthYourTime] Sync failed:', err));
  return next;
}

export async function readTimeOutcomes(userId: string): Promise<AggregateMoment[]> {
  try {
    const raw = await unifiedStorage.getItem(scoped(OUTCOMES, userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item =>
      item && typeof item.day === 'string' && typeof item.kind === 'string' &&
      ['opened', 'acted', 'not_useful'].includes(item.outcome) &&
      Number.isInteger(item.count) && item.count > 0) as AggregateMoment[];
  } catch { return []; }
}

/** Device-only, category-level counters. No show titles, fixtures, user text,
 * event IDs, health information or location are uploaded or stored here.
 */
export async function recordTimeOutcome(
  userId: string, kind: TimeOpportunityKind, outcome: TimeOutcome,
  now = new Date(),
): Promise<ReturnType<typeof summarizeTimeOutcomes>> {
  const key = scoped(OUTCOMES, userId);
  const run = async () => {
    const today = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const minDay = cutoff.getFullYear() + '-' +
      String(cutoff.getMonth() + 1).padStart(2, '0') + '-' +
      String(cutoff.getDate()).padStart(2, '0');
    const records = (await readTimeOutcomes(userId)).filter(x => x.day >= minDay && x.day <= today);
    const previous = records.find(x => x.day === today && x.kind === kind && x.outcome === outcome);
    const cap = outcome === 'opened' ? 5 : 1;
    if (previous) previous.count = Math.min(cap, previous.count + 1);
    else records.push({ day: today, kind, outcome, count: 1 });
    await unifiedStorage.setItem(key, JSON.stringify(records.slice(-150)));
    return summarizeTimeOutcomes(records, now);
  };
  const pending = (outcomeQueues.get(key) ?? Promise.resolve()).then(run, run);
  outcomeQueues.set(key, pending.catch(() => {}));
  return pending;
}
