export type DailySummaryHabit = {
  name: string;
  done: boolean;
  streak?: number;
  scheduledToday?: boolean;
};

export type DailySummaryHabitRollup = {
  scheduledCount: number;
  completedCount: number;
  incompleteCount: number;
  incompleteNames: string[];
  ratioLabel: string;
};

export type DailySummaryPriorityTask = {
  title: string;
  priority: string;
  completed: boolean;
  category?: string;
};

export type DailySummaryCalendarEvent = {
  title: string;
  timeLabel: string;
  isAllDay: boolean;
  location?: string;
};

export type DailySummaryContinueWatching = {
  title: string;
  episode?: string;
  platform?: string;
};

export type DailySummarySportsBeat = {
  kind: 'recent_win' | 'live_now' | 'match_today';
  headline: string;
  whenLabel?: string;
};

export type DailySummary = {
  date: string;
  summary: string;
  wins: string[];
  challenges: string[];
  streaks: { name: string; length: number }[];
  metrics?: {
    steps?: number;
    workouts?: number;
    screen_time_hours?: number;
    time_spent_minutes?: { activity: string; minutes: number }[];
  };
  recommendations: string[];
  sentiment: "positive" | "neutral" | "negative";
  score: number; // 0..100
  weather?: {
    condition: string;
    temp: number;
    description: string;
  };
  upcomingEvents?: { title: string; time: string; date: string }[];
};

export type DailySummaryYesterdayContext = {
  habitsLabel: string;
  tasksLabel?: string | null;
  scoreLabel?: string | null;
};

export type DailySummaryScoreInput = {
  habits?: DailySummaryHabit[];
  habitRollup?: DailySummaryHabitRollup | null;
  tasks?: { name: string; completed: boolean; priority?: string; category?: string }[];
  priorityTasks?: DailySummaryPriorityTask[];
};

/**
 * Deterministic 0–100 day score derived from real completion data so it actually
 * reflects the day (habits weighted 70%, tasks 30%). Previously the score came
 * from the LLM, which just echoed the "85" example in the prompt template.
 */
export function computeDailyScore(input: DailySummaryScoreInput): number {
  const rollup = input.habitRollup;
  const habitsScheduled =
    rollup?.scheduledCount ?? (input.habits?.filter((h) => h.scheduledToday !== false).length ?? 0);
  const habitsDone = rollup?.completedCount ?? (input.habits?.filter((h) => h.done).length ?? 0);

  const tasks = input.tasks ?? [];
  const priority = input.priorityTasks ?? [];
  // Prefer the explicit task list; fall back to priority tasks.
  const taskTotal = tasks.length > 0 ? tasks.length : priority.length;
  const taskDone =
    tasks.length > 0 ? tasks.filter((t) => t.completed).length : priority.filter((t) => t.completed).length;

  const parts: { ratio: number; weight: number }[] = [];
  if (habitsScheduled > 0) parts.push({ ratio: habitsDone / habitsScheduled, weight: 0.7 });
  if (taskTotal > 0) parts.push({ ratio: taskDone / taskTotal, weight: 0.3 });

  // Nothing scheduled today → neutral rather than a fake-perfect score.
  if (parts.length === 0) return 50;

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  const weighted = parts.reduce((sum, p) => sum + p.ratio * p.weight, 0) / totalWeight;
  return Math.max(0, Math.min(100, Math.round(weighted * 100)));
}

export type DailySummaryGroundingInput = {
  habits?: DailySummaryHabit[];
  habitRollup?: DailySummaryHabitRollup | null;
  priorityTasks?: DailySummaryPriorityTask[];
  openItems?: string[];
};

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function joinNaturalTitles(titles: string[]): string {
  if (titles.length === 0) return '';
  if (titles.length === 1) return titles[0];
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(', ')}, and ${titles[titles.length - 1]}`;
}

/**
 * Grounding gate for the Overview wrap-up.
 *
 * The model can still help with secondary recommendations, but the copy that
 * describes what the user actually did is built from verified app data only.
 * This prevents sports results, weather, shows, or stylistic embellishment from
 * being misrepresented as the user's achievement, mood, or energy.
 */
export function buildGroundedDailySummary(
  input: DailySummaryGroundingInput
): Pick<DailySummary, 'summary' | 'wins' | 'challenges' | 'streaks' | 'sentiment'> {
  const scheduledHabits = (input.habits ?? []).filter((habit) => habit.scheduledToday !== false);
  const completedHabits = scheduledHabits.filter((habit) => habit.done);
  const completedPriorityTasks = (input.priorityTasks ?? []).filter((task) => task.completed);

  const scheduledCount = input.habitRollup?.scheduledCount ?? scheduledHabits.length;
  const completedCount = input.habitRollup?.completedCount ?? completedHabits.length;
  const openItems = uniqueNonEmpty(
    input.openItems?.length
      ? input.openItems
      : input.habitRollup?.incompleteNames ?? []
  );

  const wins = uniqueNonEmpty([
    ...completedHabits.map((habit) => habit.name),
    ...completedPriorityTasks.map((task) => task.title),
  ]).slice(0, 4);

  const streaks = completedHabits
    .filter((habit) => (habit.streak ?? 0) >= 2)
    .map((habit) => ({ name: habit.name, length: habit.streak ?? 0 }));

  const sentences: string[] = [];

  if (scheduledCount > 0) {
    sentences.push(
      `You completed ${completedCount} of ${scheduledCount} habit${scheduledCount === 1 ? '' : 's'} today.`
    );
  }

  const completedHabitNames = completedHabits.map((habit) => habit.name).slice(0, 2);
  if (completedHabitNames.length > 0) {
    const names = joinNaturalTitles(completedHabitNames);
    sentences.push(
      `${names} ${completedHabitNames.length === 1 ? 'is' : 'are'} complete.`
    );
  }

  const completedTaskTitle = completedPriorityTasks[0]?.title;
  if (completedTaskTitle) {
    sentences.push(`You also finished ${completedTaskTitle}.`);
  }

  if (openItems.length > 0) {
    sentences.push(
      `${openItems[0]} is still open; finish it if it still matters today, or carry it into tomorrow.`
    );
  } else if (scheduledCount > 0 && completedCount === scheduledCount) {
    sentences.push('Everything scheduled in your habit list is complete.');
  }

  if (sentences.length === 0) {
    sentences.push("There isn't enough completed activity logged yet to give you a useful wrap-up.");
  }

  const completionRatio = scheduledCount > 0 ? completedCount / scheduledCount : 0;
  const sentiment: DailySummary['sentiment'] = completionRatio >= 0.7 ? 'positive' : 'neutral';

  return {
    summary: sentences.join(' '),
    wins,
    challenges: openItems.slice(0, 3),
    streaks,
    sentiment,
  };
}

const RECOVERY_SYSTEM_PROMPT = `You are a compassionate recovery coach for One Pager during Turbulent Times / Recovery Mode.
Rules:
- Keep "summary" ≤ 80 words. Warm, human, zero guilt.
- NEVER mention broken streaks, overdue counts, or incomplete task totals.
- Acknowledge difficulty first when signals suggest a hard period.
- Offer exactly ONE tiny win for today (e.g. ten minutes outside, water, text someone).
- Include one Daily Hope if sportsBeats, continueWatching, or todayCalendar provides it — something to look forward to.
- "wins" should celebrate any small effort (one habit, one moment of rest, showing up).
- "challenges" must be gentle — frame as optional, never shame.
- "streaks" MUST be an empty array [] — do not surface streak data in recovery mode.
- "recommendations" ≤ 2, tiny and achievable only.
- sentiment should lean neutral or gently positive — never punitive negative.
- Do not invent data. Output valid JSON with the exact structure provided.`;

export async function summarizeDailyProgress(input: {
  date: string; // e.g., "2025-09-08"
  recoveryMode?: boolean;
  activities?: { name: string; minutes?: number; details?: string }[];
  habits?: DailySummaryHabit[];
  habitRollup?: DailySummaryHabitRollup | null;
  tasks?: { name: string; completed: boolean; priority?: string; category?: string }[];
  priorityTasks?: DailySummaryPriorityTask[];
  openItems?: string[];
  shows?: { title: string; episode?: string }[];
  continueWatching?: DailySummaryContinueWatching[];
  sports?: { team: string; result?: string }[];
  sportsBeats?: DailySummarySportsBeat[];
  upcomingMatches?: { homeTeam: string; awayTeam: string; date: string; time: string; competition: string }[];
  recentWins?: { team: string; opponent: string; score: string; date: string }[];
  upcomingEvents?: {
    title: string;
    dateLabel: string;
    timeLabel: string;
    timing: 'past' | 'today' | 'upcoming';
    intent: 'scheduled' | 'saved';
    location?: string;
    isAllDay?: boolean;
  }[];
  savedDiscoveryEvents?: {
    title: string;
    dateLabel: string;
    timeLabel?: string;
    venue: string;
    daysUntil: number | null;
    timing: 'past' | 'today' | 'upcoming';
    intent: 'saved';
  }[];
  todayCalendar?: DailySummaryCalendarEvent[];
  weather?: { condition: string; temp: number; description: string; city: string; humidity?: number; windSpeed?: number };
  notes?: string;
  yesterdayContext?: DailySummaryYesterdayContext | null;
}): Promise<DailySummary> {
  try {
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: input.recoveryMode
              ? RECOVERY_SYSTEM_PROMPT
              : `You are an assistant that writes crisp, motivational daily progress summaries for the One-Pager app.
Rules:
- Keep "summary" ≤ 80 words. Be specific, calm, and useful.
- Use plain language. No hype, slang, cutesy metaphors, cheerleading, or playful rewrites of user data.
- NEVER infer the user's mood, energy, allegiance, motivation, or emotional reaction from weather, sports, shows, calendar items, or completion data.
- Habit/task titles must be used exactly as provided. Do not decorate them with adjectives or metaphors.
- MUST name at least one real habit or task by exact title in "summary" (never only "your main task" or "a habit").
- NAMED WIN (required): "wins" MUST include at least one bullet that names a completed habit or completed priority task by exact title from habits/priorityTasks/habitRollup data.
- NAMED OPEN ITEM (required when openItems is non-empty): "challenges" MUST include at least one bullet naming a specific open habit or incomplete task from openItems — frame as gentle tomorrow focus, not guilt.
- If openItems is empty, challenges may note proportionate recovery (rest, weather, calendar load) without inventing titles.
- HABIT ROLLUP: If habitRollup is provided and completedCount < scheduledCount, praise proportionate effort (e.g. "5/7 habits — you didn't need a perfect day"). If completedCount === scheduledCount and scheduledCount > 0, celebrate a full sweep. Mention 1–2 incomplete habit names gently as optional tomorrow focus, not failure.
- PRIORITY TASKS: If priorityTasks lists completed urgent/high items, cite at least one by exact title in summary or wins. Incomplete urgent/high can go in challenges.
- TODAY CALENDAR + WEATHER: If todayCalendar and weather exist, weave one sentence when natural (e.g. "Between [Event] and the rain, you still [named win]"). todayCalendar is already filtered to today only.
- SPORTS CONTEXT: Sports results and fixtures are context only. Never count them as the user's win, never infer support for either team, and never describe a result as a boost, lift, disappointment, or mood change. If mentioned, state the fixture/result neutrally and only when it is genuinely useful.
- CONTINUE WATCHING: If continueWatching has entries, you may mention one show by exact title as neutral leisure context — do not infer that watching it is deserved, productive, restorative, or emotionally beneficial.
- WEATHER: Weather is context only. Do not claim it caused the user's mood, energy, motivation, or success. Mention it only when directly useful for a concrete recommendation.
- Include upcoming matches for favourite teams if available (mention next 1-2 important matches) when sportsBeats is empty.
- CRITICAL: When mentioning match timing, compare the match date to TODAY'S DATE (${input.date}). If the match date equals today's date, say "today". If it's the next day, say "tomorrow". Be accurate!
- SAVED DISCOVERY EVENTS: If savedDiscoveryEvents has entries the user saved from the Events tab, mention at most one by exact title when planning the week (e.g. comedy night Friday — weave with habits/tasks if relevant). Do not invent events.
- EVENT TIMING (critical): Always use each event's timeLabel for times — NEVER infer time from ISO timestamps or guess.
- EVENT INTENT (critical): savedDiscoveryEvents and upcomingEvents with intent "saved" or "scheduled" mean the user bookmarked or planned something — say "saved", "planned", or "coming up". NEVER say they "attended", "went to", or "enjoyed" an event unless timing is "past".
- EVENT TIMING LABELS: Use timing field — "today" only when timing is "today"; "tomorrow" only when daysUntil is 1; otherwise use dateLabel. For timing "upcoming", frame as looking forward, not something that already happened.
- UPCOMING CALENDAR: upcomingEvents lists scheduled calendar entries with dateLabel + timeLabel. Compare dateLabel to TODAY'S DATE (${input.date}) for today/tomorrow wording.
- "wins" must describe only actions the user actually completed: completed habits or completed priority tasks. Never put sports results, weather, shows, or calendar events in "wins". At least one bullet uses an exact habit/task title when one exists.
- "streaks": include every habit in habits[] with streak ≥ 2 and done true today; use exact habit name and day count.
- If yesterdayContext is provided, you may reference momentum vs yesterday in summary (one short clause) — do not invent numbers beyond yesterdayContext.
- "recommendations" should be concrete and achievable (≤ 3). On nice weather suggest outdoor wins; on tough weather suggest indoor habits or one small task — never guilt-trip.
- Do not invent data—only use what is provided.
- If a metric is missing, omit it; never guess.
- Output must be valid JSON with the exact structure provided.`
          },
          {
            role: 'user',
            content: `TODAY'S DATE IS: ${input.date}

User context for ${input.date}:
Activities: ${JSON.stringify(input.activities ?? [])}
Habit rollup (scheduled today): ${JSON.stringify(input.habitRollup ?? null)}
Habits (scheduled today): ${JSON.stringify(input.habits ?? [])}
Tasks (all): ${JSON.stringify(input.tasks ?? [])}
Priority tasks (urgent/high): ${JSON.stringify(input.priorityTasks ?? [])}
Open items (incomplete habits/tasks — use one in challenges): ${JSON.stringify(input.openItems ?? [])}
Yesterday vs today: ${input.yesterdayContext ? JSON.stringify(input.yesterdayContext) : 'No prior day stats'}
Shows (watching): ${JSON.stringify(input.shows ?? [])}
Continue watching: ${JSON.stringify(input.continueWatching ?? [])}
Sports beats (emotional, use these first): ${JSON.stringify(input.sportsBeats ?? [])}
Sports (fixtures): ${JSON.stringify(input.sports ?? [])}
Upcoming Matches: ${JSON.stringify(input.upcomingMatches ?? [])}
Recent Team Wins: ${JSON.stringify(input.recentWins ?? [])}
Today's calendar (already today-only): ${JSON.stringify(input.todayCalendar ?? [])}
Upcoming Calendar Events (future window): ${JSON.stringify(input.upcomingEvents ?? [])}
Saved discovery events (Events tab — user chose these): ${JSON.stringify(input.savedDiscoveryEvents ?? [])}
Weather: ${input.weather ? `${input.weather.condition}, ${input.weather.temp}°C, ${input.weather.description} in ${input.weather.city}` : 'Not available'}
Other notes: ${input.notes ?? ""}

Generate a daily summary with this exact JSON structure:
{
  "date": "${input.date}",
  "summary": "string (≤80 words)",
  "wins": ["string"],
  "challenges": ["string"],
  "streaks": [{"name": "string", "length": 0}],
  "recommendations": ["string"],
  "sentiment": "positive|neutral|negative",
  "score": 0
}
(Note: "score" is recalculated by the app from real completion data — any value here is ignored.)`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    let completionText = data.completion;
    
    // Clean up markdown formatting if present
    if (completionText.includes('```json')) {
      completionText = completionText.replace(/```json\s*/g, '').replace(/\s*```$/g, '');
    } else if (completionText.includes('```')) {
      completionText = completionText.replace(/```\s*/g, '').replace(/\s*```$/g, '');
    }
    
    // Additional cleanup for any remaining backticks or markdown
    completionText = completionText.replace(/^`+|`+$/g, '').trim();
    
    // Remove any leading/trailing whitespace and newlines
    completionText = completionText.replace(/^\s+|\s+$/g, '');
    
    // Find JSON object boundaries more reliably
    const jsonStart = completionText.indexOf('{');
    const jsonEnd = completionText.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      console.error('No valid JSON object found in response:', completionText.substring(0, 100));
      throw new Error('No valid JSON object found in response');
    }
    
    // Extract only the JSON part
    completionText = completionText.substring(jsonStart, jsonEnd + 1);
    
    // Validate JSON before parsing
    if (!completionText.startsWith('{') || !completionText.endsWith('}')) {
      console.error('Invalid JSON format in response:', completionText.substring(0, 100));
      throw new Error('Invalid JSON format in response');
    }
    
    const summary = JSON.parse(completionText) as DailySummary;
    // The model tends to echo the example score (85); always use the real,
    // data-derived score so it reflects the actual day.
    summary.score = computeDailyScore(input);

    if (input.recoveryMode) {
      summary.streaks = [];
    } else {
      // User-facing progress copy is generated from verified One Pager data,
      // not model interpretation. The LLM may still supply recommendations,
      // but it cannot turn a match result, weather, or a habit title into an
      // invented feeling or achievement.
      const grounded = buildGroundedDailySummary(input);
      summary.summary = grounded.summary;
      summary.wins = grounded.wins;
      summary.challenges = grounded.challenges;
      summary.streaks = grounded.streaks;
      summary.sentiment = grounded.sentiment;
    }

    return summary;
  } catch (error) {
    console.error('Error generating daily summary:', error);
    if (input.recoveryMode) {
      return {
        date: input.date,
        summary: "You've been carrying a lot. One small win today is enough — be gentle with yourself.",
        wins: ["You're still here, still trying"],
        challenges: ["Rest is allowed"],
        streaks: [],
        recommendations: ["Ten minutes outside", "Text someone you trust"],
        sentiment: "neutral",
        score: computeDailyScore(input),
      };
    }
    // Return a fallback summary
    return {
      date: input.date,
      summary: "Keep building momentum with your daily activities and habits!",
      wins: ["Stayed consistent with tracking"],
      challenges: ["Continue building routines"],
      streaks: [],
      recommendations: ["Focus on one habit at a time", "Set specific daily goals", "Celebrate small wins"],
      sentiment: "positive",
      score: computeDailyScore(input)
    };
  }
}