import type { ProcessedWeatherData } from '@/utils/weatherApi';

export type ToughWeatherKind = 'rain' | 'storm' | 'snow' | 'cold' | 'wind' | 'fog';

export type ToughWeatherContext = {
  isToughDay: boolean;
  kinds: ToughWeatherKind[];
  severity: 'moderate' | 'high';
  weatherLabel: string;
};

export type WeatherNudgeStats = {
  completedHabits?: number;
  totalHabits?: number;
  completedTasks?: number;
  totalTasks?: number;
  habitCompletionRate?: number;
};

export type WeatherNudge = {
  headline: string;
  body: string;
  /** Short line for hero subtitle (replaces chronotype tip on tough days). */
  heroLine: string;
  tip: string;
  kinds: ToughWeatherKind[];
  severity: 'moderate' | 'high';
};

function isFoggy(weather: ProcessedWeatherData): boolean {
  const c = weather.condition.toLowerCase();
  const d = weather.description.toLowerCase();
  return (
    c.includes('mist') ||
    c.includes('fog') ||
    c.includes('haze') ||
    d.includes('mist') ||
    d.includes('fog') ||
    d.includes('haze')
  );
}

export function getToughWeatherContext(
  weather: ProcessedWeatherData | null | undefined
): ToughWeatherContext | null {
  if (!weather || weather.isTimeBased) return null;

  const kinds: ToughWeatherKind[] = [];
  let severity: 'moderate' | 'high' = 'moderate';

  if (weather.isStormy) {
    kinds.push('storm');
    severity = 'high';
  }
  if (weather.isRaining) kinds.push('rain');
  if (weather.isSnowing) kinds.push('snow');
  if (weather.temp <= 8 || (weather.feelsLike != null && weather.feelsLike <= 6)) {
    kinds.push('cold');
    if (weather.temp <= 4) severity = 'high';
  }
  if (weather.windSpeed >= 11) {
    kinds.push('wind');
    if (weather.windSpeed >= 16) severity = 'high';
  }
  if (isFoggy(weather)) kinds.push('fog');

  if (kinds.length === 0) return null;

  const labelParts: string[] = [];
  if (weather.isStormy) labelParts.push('storms');
  else if (weather.isRaining) labelParts.push(weather.description || 'rain');
  else if (weather.isSnowing) labelParts.push('snow');
  if (weather.temp <= 8) labelParts.push(`${weather.temp}°`);
  if (weather.windSpeed >= 11 && !weather.isStormy) labelParts.push('windy');
  if (isFoggy(weather) && labelParts.length === 0) labelParts.push('low visibility');

  return {
    isToughDay: true,
    kinds,
    severity,
    weatherLabel: labelParts.join(' · ') || weather.description,
  };
}

function effortRecognition(stats: WeatherNudgeStats): string | null {
  const { completedHabits = 0, totalHabits = 0, completedTasks = 0, totalTasks = 0 } = stats;
  const parts: string[] = [];

  if (totalHabits > 0 && completedHabits > 0) {
    parts.push(
      completedHabits === totalHabits
        ? `you closed all ${totalHabits} habit${totalHabits === 1 ? '' : 's'}`
        : `you checked off ${completedHabits}/${totalHabits} habits`
    );
  }
  if (totalTasks > 0 && completedTasks > 0) {
    parts.push(
      completedTasks === totalTasks
        ? `${completedTasks} task${completedTasks === 1 ? '' : 's'} done`
        : `${completedTasks}/${totalTasks} tasks done`
    );
  }

  if (parts.length === 0) return null;
  return parts.join(' and ');
}

function buildHeadline(ctx: ToughWeatherContext): string {
  if (ctx.kinds.includes('storm')) return 'Rough weather out there';
  if (ctx.kinds.includes('snow')) return 'Snow day — still counts';
  if (ctx.kinds.includes('rain')) return 'Rainy day — your effort still counts';
  if (ctx.kinds.includes('cold')) return 'Cold out — small wins matter';
  if (ctx.kinds.includes('wind')) return 'Windy day — stay steady';
  return 'Tough conditions today';
}

function buildTip(ctx: ToughWeatherContext, stats: WeatherNudgeStats): string {
  const hasProgress =
    (stats.completedHabits ?? 0) > 0 || (stats.completedTasks ?? 0) > 0;

  if (ctx.kinds.includes('storm')) {
    return hasProgress
      ? 'Stay indoors if you can — protect the streak you already built today.'
      : 'Indoor wins only: one 2‑minute habit or a single priority task.';
  }
  if (ctx.kinds.includes('rain') || ctx.kinds.includes('fog')) {
    return hasProgress
      ? 'Keep momentum with quick indoor habits — Busy mode has 2‑minute versions.'
      : 'Try one indoor habit or your smallest task — rain days reward showing up.';
  }
  if (ctx.kinds.includes('snow') || ctx.kinds.includes('cold')) {
    return 'Warm up first, then one small habit — consistency beats intensity in the cold.';
  }
  if (ctx.kinds.includes('wind')) {
    return 'Skip the outdoor push — a short indoor block still protects your rhythm.';
  }
  return 'Pick one achievable indoor win — showing up is the win on days like this.';
}

export function getWeatherNudge(
  weather: ProcessedWeatherData | null | undefined,
  stats: WeatherNudgeStats = {},
  userName?: string
): WeatherNudge | null {
  const ctx = getToughWeatherContext(weather);
  if (!ctx || !weather) return null;

  const name = userName?.trim() || 'you';
  const city = weather.city && weather.city !== 'Your Location' ? weather.city : null;
  const effort = effortRecognition(stats);
  const headline = buildHeadline(ctx);

  let body: string;
  if (effort) {
    body = `It's ${ctx.weatherLabel}${city ? ` around ${city}` : ''} — and ${name === 'you' ? 'you' : name} still made progress: ${effort}. That discipline on a tough day is real.`;
  } else {
    body = `${city ? `Around ${city}, i` : 'I'}t's ${ctx.weatherLabel} today. You don't need a perfect day — one small indoor habit or task still builds your streak.`;
  }

  const heroLine = effort
    ? `Tough weather · ${effort} — that counts`
    : `Tough weather${city ? ` in ${city}` : ''} · showing up still counts`;

  return {
    headline,
    body,
    heroLine,
    tip: buildTip(ctx, stats),
    kinds: ctx.kinds,
    severity: ctx.severity,
  };
}
