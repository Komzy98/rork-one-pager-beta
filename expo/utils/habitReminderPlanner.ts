import type { Task } from '@/types/task';
import type { Habit } from '@/types/habit';

export type HabitReminderMode = 'smart' | 'fixed' | 'off';
export type HabitReminderSettings = {
  mode?: HabitReminderMode;
  time?: string; // HH:mm in the user's current local time zone
  followUp?: boolean;
};
export type HabitReminderSource = {
  id: string;
  title: string;
  days: number[];
  completions: Record<string, boolean>;
  completionHours: number[];
  settings: HabitReminderSettings;
  windowStart?: string;
  windowEnd?: string;
  timesPerWeek?: number;
  fallback?: string;
};

export interface QuietPeriod {
  enabled?: boolean;
  start?: string;
  end?: string;
}

export interface HabitReminderPlan {
  id: string;
  habitId: string;
  day: string;
  kind: 'primary' | 'followup' | 'snooze';
  at: Date;
  title: string;
  body: string;
  source: 'task' | 'legacy';
}

export function parseLocalTime(value?: string): number | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}
export function formatLocalTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function localDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
}
export function bestHabitHour(title: string): number {
  const t = title.toLowerCase();
  if (/prayer|devotion|meditat|breakfast|morning/.test(t)) return 8;
  if (/gym|workout|strength|run|walk|steps/.test(t)) return 18;
  if (/read|journal|reflect|skincare|evening|night/.test(t)) return 20;
  if (/water|hydrate/.test(t)) return 9;
  if (/lunch/.test(t)) return 12;
  return 17;
}
export function proposedReminderMinutes(habit: HabitReminderSource): number | null {
  if (habit.settings.mode === 'off') return null;
  // Explicit user choice overrides all inferences.
  const explicit = parseLocalTime(habit.settings.time);
  if (habit.settings.mode === 'fixed') return explicit ?? parseLocalTime(habit.windowStart) ?? bestHabitHour(habit.title)*60;
  const earliest = parseLocalTime(habit.windowStart);
  const latest = parseLocalTime(habit.windowEnd);
  const validHours = habit.completionHours.filter(h=>Number.isInteger(h) && h>=0 && h<=23);
  let chosen = bestHabitHour(habit.title)*60;
  // Require at least four logged completions before claiming to learn a habit's time.
  if (validHours.length >= 4) {
    const buckets = new Map<number,number>();
    for (const hour of validHours) buckets.set(hour, (buckets.get(hour) ?? 0)+1);
    const ordered = [...buckets].sort((a,b)=>b[1]-a[1] || a[0]-b[0]);
    chosen = ordered[0][0]*60;
  }
  if (earliest != null) chosen = Math.max(chosen, earliest);
  if (latest != null && (earliest == null || latest >= earliest)) chosen = Math.min(chosen, latest);
  return chosen;
}
export function isQuietTime(minutes: number, quiet: QuietPeriod): boolean {
  if (!quiet.enabled) return false;
  const from = parseLocalTime(quiet.start) ?? 22*60+30;
  const to = parseLocalTime(quiet.end) ?? 7*60;
  if (from === to) return false;
  return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}
export function collectHabitReminderSources(tasks: readonly Task[], legacy: readonly Habit[]): HabitReminderSource[] {
  const sources: HabitReminderSource[] = [];
  const names = new Set<string>();
  for (const t of tasks) {
    if (!t.isHabit || !t.habitFrequency || t.status === 'cancelled') continue;
    const name = t.title.trim().toLowerCase();
    if (!name) continue;
    names.add(name);
    sources.push({
      id: `task:${t.id}`, title:t.title, days:t.habitFrequency.days,
      completions:t.habitCompletions ?? {},
      completionHours:[
        ...(t.completionLogs ?? []).map(x=>x.completedAt),
        ...(t.habitEngine?.attemptLogs ?? []).flatMap(x=>x.completedAt ? [x.completedAt] : []),
      ].map(iso=>new Date(iso).getHours()).filter(x=>Number.isInteger(x)),
      settings:{mode:t.habitEngine?.reminderMode ?? 'smart',time:t.habitEngine?.reminderTime,followUp:t.habitEngine?.reminderFollowUp ?? false},
      windowStart:t.habitEngine?.windowStart,windowEnd:t.habitEngine?.windowEnd,
      timesPerWeek:t.habitFrequency.type === 'times_per_week' ? t.habitFrequency.timesPerWeek : undefined,
      fallback:t.habitEngine?.minimumVersion,
    });
  }
  for (const h of legacy) {
    if (!h.name.trim() || names.has(h.name.trim().toLowerCase())) continue;
    sources.push({
      id:`legacy:${h.id}`,title:h.name,days:h.frequency.days,completions:h.completions ?? {},
      completionHours:(h.completionLogs??[]).map(log=>new Date(log.timestamp).getHours()).filter(Number.isInteger),
      settings:h.reminder ?? {mode:'smart',followUp:false},
      timesPerWeek:h.frequency.type === 'times_per_week' ? h.frequency.timesPerWeek : undefined,
    });
  }
  return sources;
}
export function buildHabitReminderPlan(input: {
  userId: string;
  habits: readonly HabitReminderSource[];
  now: Date;
  quiet: QuietPeriod;
  daysAhead?: number;
  limit?: number;
  suppressedDays?: Record<string,string>; // key is habit id + local date; value is 'skip' or a snooze ISO
}): HabitReminderPlan[] {
  const { userId,habits,now,quiet }=input;
  const limit=Math.min(48,Math.max(1,input.limit ?? 40));
  const out:HabitReminderPlan[]=[];
  for (const h of habits) {
    const minutes=proposedReminderMinutes(h);
    if (minutes==null || !h.days.length && !h.timesPerWeek) continue;
    for(let offset=0;offset<Math.min(7, input.daysAhead ?? 7);offset++) {
      const day = new Date(now.getFullYear(),now.getMonth(),now.getDate()+offset);
      const ymd=localDateKey(day);
      if (!h.timesPerWeek && !h.days.includes(day.getDay())) continue;
      if (h.completions[ymd]) continue;
      if (h.timesPerWeek) {
        const weekStart = new Date(day.getFullYear(),day.getMonth(),day.getDate()-day.getDay());
        let count=0;
        for(let n=0;n<7;n++) {
          const k=localDateKey(new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+n));
          if(h.completions[k])count++;
        }
        if(count>=h.timesPerWeek)continue;
      }
      const suppressed=input.suppressedDays?.[`${h.id}:${ymd}`];
      if(suppressed === 'skip')continue;
      if(suppressed && offset===0) {
        const snooze = new Date(suppressed);
        if(Number.isFinite(snooze.getTime()) && snooze>now && localDateKey(snooze)===ymd && !isQuietTime(snooze.getHours()*60+snooze.getMinutes(),quiet)) {
          out.push({id:`${userId}|${h.id}|${ymd}|snooze`,habitId:h.id,day:ymd,kind:'snooze',at:snooze,title:`Time for ${h.title}`,body:'Ready to give it a go?',source:h.id.startsWith('task:')?'task':'legacy'});
        }
        continue;
      }
      const start = new Date(day.getFullYear(),day.getMonth(),day.getDate(),Math.floor(minutes/60),minutes%60);
      if(start>now && !isQuietTime(minutes,quiet)) {
        out.push({id:`${userId}|${h.id}|${ymd}|primary`,habitId:h.id,day:ymd,kind:'primary',at:start,title:`Time for ${h.title}`,body:h.fallback?`Start small: ${h.fallback}`:'Your habit is ready when you are.',source:h.id.startsWith('task:')?'task':'legacy'});
      }
      if (h.settings.followUp === true) {
        const later=minutes+90;
        const winEnd=parseLocalTime(h.windowEnd);
        if(later<24*60 && (winEnd==null || later<=winEnd) && !isQuietTime(later,quiet)){
          const follow = new Date(day.getFullYear(),day.getMonth(),day.getDate(),Math.floor(later/60),later%60);
          if(follow>now)out.push({id:`${userId}|${h.id}|${ymd}|followup`,habitId:h.id,day:ymd,kind:'followup',at:follow,title:`${h.title} is still available`,body:'A small step counts. You can mute reminders for today if needed.',source:h.id.startsWith('task:')?'task':'legacy'});
        }
      }
    }
  }
  // Cap daily notification volume. Primary reminders take precedence over
  // optional follow-ups, and intentional snoozes take precedence over both.
  const priority=(p:HabitReminderPlan)=>p.kind==='snooze'?0:p.kind==='primary'?1:2;
  const perDay=new Map<string,number>();
  const selected:HabitReminderPlan[]=[];
  for(const p of out.sort((a,b)=>a.day.localeCompare(b.day)||priority(a)-priority(b)||a.at.getTime()-b.at.getTime())) {
    if((perDay.get(p.day)??0)>=6)continue;
    perDay.set(p.day,(perDay.get(p.day)??0)+1);
    selected.push(p);
  }
  return selected.sort((a,b)=>a.at.getTime()-b.at.getTime() || a.id.localeCompare(b.id)).slice(0,limit);
}
