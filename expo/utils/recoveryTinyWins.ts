import type { Task } from '@/types/task';
import { generateMinimalHabits } from '@/utils/habitFormationAnalysis';

const GENERIC_TINY_WINS = [
  'Get outside for ten minutes.',
  'Drink a glass of water.',
  'Text someone you trust.',
  'Take five slow breaths.',
  'Step away from your screen for five minutes.',
  'Eat something nourishing.',
  'Write down one thing that went okay today.',
  'Stretch for two minutes.',
  'Open a window and get fresh air.',
  'Listen to one song you love.',
] as const;

export function pickTinyWin(
  todayYmd: string,
  habitTasks: Task[],
  existingWin?: string,
  existingDate?: string
): string {
  if (existingWin && existingDate === todayYmd) return existingWin;

  const minimal = generateMinimalHabits(habitTasks.filter((t) => t.isHabit));
  const personalized = minimal
    .filter((m) => m.hasQuickVersion)
    .map((m) => m.minimalVersion);

  const pool = personalized.length > 0 ? personalized : [...GENERIC_TINY_WINS];
  let hash = 0;
  for (let i = 0; i < todayYmd.length; i++) {
    hash = (hash * 31 + todayYmd.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length] ?? GENERIC_TINY_WINS[0];
}
