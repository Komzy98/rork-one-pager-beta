import { useCallback, useMemo } from 'react';

import { useAppSafe } from '@/hooks/useHabitsStore';
import { useTasksSafe } from '@/hooks/useTasksStore';
import { useExperienceFeedback } from '@/hooks/useExperienceFeedback';
import type { ExperienceEntry, ExperienceKind } from '@/utils/experienceFeedback';

export type ExperienceCheckInOption = {
  label: string;
  emoji: string;
  value: number;
};

export type ExperienceCheckIn = {
  id: string;
  kind: 'recipe' | 'show' | 'routine';
  subjectId: string;
  title: string;
  eyebrow: string;
  question: string;
  hint: string;
  options: ExperienceCheckInOption[];
  timestamp: number;
  tags?: string[];
};

const ENJOYMENT_OPTIONS: ExperienceCheckInOption[] = [
  { label: 'Loved it', emoji: '🤩', value: 5 },
  { label: 'Good', emoji: '😊', value: 4 },
  { label: 'Meh', emoji: '😐', value: 2 },
];

const DIFFICULTY_OPTIONS: ExperienceCheckInOption[] = [
  { label: 'Easy', emoji: '😌', value: 2 },
  { label: 'Fine', emoji: '👍', value: 3 },
  { label: 'Hard', emoji: '😮‍💨', value: 5 },
];

function time(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sameLocalDay(value: string | undefined, now: Date) {
  if (!value) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toDateString() === now.toDateString();
}

function feedbackCoversMoment(entry: ExperienceEntry | null | undefined, moment: number) {
  if (!entry) return false;
  return time(entry.lastFeedbackAt) >= moment || time(entry.lastPromptDismissedAt) >= moment;
}

export function useExperienceCheckIn() {
  const app = useAppSafe();
  const tasks = useTasksSafe();
  const experience = useExperienceFeedback();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const prompt = useMemo<ExperienceCheckIn | null>(() => {
    const candidates: ExperienceCheckIn[] = [];
    const nowMs = now.getTime();

    // Recipe completion is explicit via “Mark cooked” / guided-cook completion.
    for (const entry of Object.values(experience.state.entries)) {
      if (entry.kind !== 'recipe' || !entry.lastCompletedAt) continue;
      const completedAt = time(entry.lastCompletedAt);
      if (!completedAt || nowMs - completedAt > 3 * 24 * 60 * 60 * 1000) continue;
      if (feedbackCoversMoment(entry, completedAt)) continue;
      const title = entry.title?.trim() || 'that recipe';
      candidates.push({
        id: `recipe-${entry.subjectId}`,
        kind: 'recipe',
        subjectId: entry.subjectId,
        title,
        eyebrow: 'AFTER COOKING',
        question: `How was ${title}?`,
        hint: 'What you actually cook and enjoy should shape future food picks.',
        options: ENJOYMENT_OPTIONS,
        timestamp: completedAt,
        tags: entry.tags,
      });
    }

    // A Completed show is stronger evidence than a watchlist save.
    for (const show of app.shows) {
      if (show.status !== 'Completed') continue;
      const completedAt = time(show.updatedAt || show.createdAt);
      if (!completedAt || nowMs - completedAt > 7 * 24 * 60 * 60 * 1000) continue;
      const entry = experience.getEntry('show', show.id);
      if (feedbackCoversMoment(entry, completedAt)) continue;
      candidates.push({
        id: `show-${show.id}`,
        kind: 'show',
        subjectId: show.id,
        title: show.title,
        eyebrow: 'AFTER WATCHING',
        question: `Was ${show.title} worth it?`,
        hint: 'Finishing a title tells One Pager more than simply adding it to a watchlist.',
        options: ENJOYMENT_OPTIONS,
        timestamp: completedAt,
        tags: [show.platform, show.type],
      });
    }

    // Ask at most one routine question per day. Completion is already explicit in the task store.
    const completedRoutine = tasks.allTasks
      .filter((task) => task.isHabit && task.habitCompletions?.[today] === true)
      .find((task) => {
        const entry = experience.getEntry('routine', task.id);
        return !sameLocalDay(entry?.lastFeedbackAt, now) && !sameLocalDay(entry?.lastPromptDismissedAt, now);
      });
    if (completedRoutine) {
      candidates.push({
        id: `routine-${completedRoutine.id}`,
        kind: 'routine',
        subjectId: completedRoutine.id,
        title: completedRoutine.title,
        eyebrow: 'AFTER YOUR ROUTINE',
        question: `How did ${completedRoutine.title} feel today?`,
        hint: 'Difficulty helps One Pager learn when to push and when to make the plan lighter.',
        options: DIFFICULTY_OPTIONS,
        timestamp: nowMs,
        tags: [completedRoutine.category, ...(completedRoutine.tags ?? [])],
      });
    }

    return candidates.sort((a, b) => b.timestamp - a.timestamp)[0] ?? null;
  }, [app.shows, experience.state.entries, experience.getEntry, now, tasks.allTasks, today]);

  const respond = useCallback(async (value: number) => {
    if (!prompt) return;
    const entry = experience.getEntry(prompt.kind as ExperienceKind, prompt.subjectId);
    if (prompt.kind === 'show') {
      if (!entry?.lastCompletedAt) {
        await experience.record({
          kind: 'show',
          subjectId: prompt.subjectId,
          title: prompt.title,
          action: 'completed',
          tags: prompt.tags,
          source: 'experience-check-in',
        });
      }
      await experience.record({
        kind: 'show',
        subjectId: prompt.subjectId,
        title: prompt.title,
        action: 'enjoyed',
        value,
        tags: prompt.tags,
        source: 'experience-check-in',
      });
      return;
    }
    if (prompt.kind === 'recipe') {
      await experience.record({
        kind: 'recipe',
        subjectId: prompt.subjectId,
        title: prompt.title,
        action: 'enjoyed',
        value,
        tags: prompt.tags,
        source: 'experience-check-in',
      });
      return;
    }

    if (!sameLocalDay(entry?.lastCompletedAt, new Date())) {
      await experience.record({
        kind: 'routine',
        subjectId: prompt.subjectId,
        title: prompt.title,
        action: 'completed',
        tags: prompt.tags,
        source: 'experience-check-in',
      });
    }
    await experience.record({
      kind: 'routine',
      subjectId: prompt.subjectId,
      title: prompt.title,
      action: 'difficulty',
      value,
      tags: prompt.tags,
      source: 'experience-check-in',
    });
  }, [experience, prompt]);

  const dismiss = useCallback(async () => {
    if (!prompt) return;
    await experience.record({
      kind: prompt.kind,
      subjectId: prompt.subjectId,
      title: prompt.title,
      action: 'dismissed',
      tags: prompt.tags,
      source: 'experience-check-in',
    });
  }, [experience, prompt]);

  return {
    prompt,
    respond,
    dismiss,
  };
}
