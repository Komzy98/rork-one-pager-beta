/** UTC-safe departure computation. No made-up directions or timetable data. */
export function computeEventDeparture(
  eventStart: Date,
  durationMinutes: number,
  arriveEarlyMinutes: number,
  now = new Date(),
): { departAt: Date; arriveAt: Date; minutesUntilDeparture: number; alreadyLate: boolean } | null {
  if (Number.isNaN(eventStart.getTime()) ||
      !Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440 ||
      !Number.isFinite(arriveEarlyMinutes) || arriveEarlyMinutes < 0 || arriveEarlyMinutes > 240) return null;

  const arriveAt = new Date(eventStart.getTime() - arriveEarlyMinutes * 60_000);
  const departAt = new Date(arriveAt.getTime() - durationMinutes * 60_000);
  const minutesUntilDeparture = Math.ceil((departAt.getTime() - now.getTime()) / 60_000);
  return { departAt, arriveAt, minutesUntilDeparture, alreadyLate: minutesUntilDeparture <= 0 };
}
