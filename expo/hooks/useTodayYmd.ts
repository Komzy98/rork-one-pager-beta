import { useEffect, useState } from 'react';
import { getTodayYmd } from '@/utils/dailySummaryStats';

function msUntilLocalMidnight(from = new Date()): number {
  const next = new Date(from);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - from.getTime();
}

/** Current local calendar date (YYYY-MM-DD), refreshed at midnight. */
export function useTodayYmd(): string {
  const [todayYmd, setTodayYmd] = useState(() => getTodayYmd());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        setTodayYmd(getTodayYmd());
        schedule();
      }, msUntilLocalMidnight());
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  return todayYmd;
}
