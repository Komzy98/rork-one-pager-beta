export type TodayPhase = {
  title: string;
  label: string;
};

export function getTodayPhase(hour: number): TodayPhase {
  if (hour < 12) return { title: 'Set the shape of your day.', label: 'Morning brief' };
  if (hour < 17) return { title: 'Use the next window well.', label: 'Afternoon check-in' };
  if (hour < 21) return { title: 'Make the evening count.', label: 'Evening' };
  return { title: 'Close the day well.', label: 'Wind down' };
}
