const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 5;

interface AttemptRecord {
  timestamps: number[];
}

const attemptStore: Record<string, AttemptRecord> = {};

function cleanOldAttempts(record: AttemptRecord, now: number): number[] {
  return record.timestamps.filter((t) => now - t < AUTH_WINDOW_MS);
}

export function checkAuthRateLimit(action: string = "login"): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number | null;
} {
  // Dev-only: do not lock engineers out while debugging network/auth issues.
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    return {
      allowed: true,
      remainingAttempts: AUTH_MAX_ATTEMPTS,
      retryAfterSeconds: null,
    };
  }

  const now = Date.now();
  const key = `auth_${action}`;

  if (!attemptStore[key]) {
    attemptStore[key] = { timestamps: [] };
  }

  const record = attemptStore[key];
  record.timestamps = cleanOldAttempts(record, now);

  if (record.timestamps.length >= AUTH_MAX_ATTEMPTS) {
    const oldestAttempt = record.timestamps[0];
    const retryAfterMs = AUTH_WINDOW_MS - (now - oldestAttempt);
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    console.log(
      `🚫 Auth rate limit hit for "${action}": ${record.timestamps.length}/${AUTH_MAX_ATTEMPTS} attempts`
    );

    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remainingAttempts: AUTH_MAX_ATTEMPTS - record.timestamps.length,
    retryAfterSeconds: null,
  };
}

export function recordAuthAttempt(action: string = "login"): void {
  const now = Date.now();
  const key = `auth_${action}`;

  if (!attemptStore[key]) {
    attemptStore[key] = { timestamps: [] };
  }

  const record = attemptStore[key];
  record.timestamps = cleanOldAttempts(record, now);
  record.timestamps.push(now);

  console.log(
    `📝 Auth attempt recorded for "${action}": ${record.timestamps.length}/${AUTH_MAX_ATTEMPTS}`
  );
}

export function formatRetryMessage(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `Too many attempts. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`;
  }
  return `Too many attempts. Please try again in ${seconds} second${seconds > 1 ? "s" : ""}.`;
}
