import { useEffect } from 'react';
import type { LiveFootballMatch } from '@/types/habit';
import { notificationService } from '@/utils/notificationService';

const HOUR_MS = 60 * 60 * 1000;

export function useInterestReminderSync(params: {
  matches: readonly LiveFootballMatch[];
  enabled: boolean;
  userId?: string;
}) {
  const { matches, enabled, userId } = params;

  useEffect(() => {
    notificationService.setActiveUser(userId);

    if (!enabled || matches.length === 0) return;

    let cancelled = false;

    const sync = async () => {
      const permission = await notificationService.getPermissionStatus();
      if (permission !== 'granted' || cancelled) return;

      const alreadyScheduled = await notificationService.getScheduledNotifications();
      const existingIds = new Set(alreadyScheduled.map((item) => item.id));
      const now = Date.now();

      for (const match of matches.slice(0, 8)) {
        if (cancelled) return;

        const kickoffMs = new Date(match.date).getTime();
        if (!Number.isFinite(kickoffMs) || kickoffMs <= now) continue;

        const reminders = [
          { key: '24h', leadMs: 24 * HOUR_MS, title: '⚽ Match tomorrow' },
          { key: '60m', leadMs: HOUR_MS, title: '⚽ Match in 1 hour' },
        ] as const;

        for (const reminder of reminders) {
          const triggerMs = kickoffMs - reminder.leadMs;
          if (triggerMs <= now + 30_000) continue;

          const id = `interest:football:${match.id}:${reminder.key}`;
          if (existingIds.has(id)) continue;

          const kickoff = new Date(kickoffMs);
          const kickoffLabel = kickoff.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          await notificationService.scheduleNotification(
            reminder.title,
            `${match.homeTeam} vs ${match.awayTeam} · ${kickoffLabel}`,
            new Date(triggerMs),
            {
              type: 'interest_reminder',
              id,
              payload: {
                domain: 'football',
                matchId: match.id,
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                matchTime: match.date,
              },
            },
          );

          existingIds.add(id);
        }
      }
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [enabled, matches, userId]);
}
