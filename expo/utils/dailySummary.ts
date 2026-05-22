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

export async function summarizeDailyProgress(input: {
  date: string; // e.g., "2025-09-08"
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
  upcomingEvents?: { title: string; startDate: string; endDate: string; location?: string; isAllDay?: boolean }[];
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
            content: `You are an assistant that writes crisp, motivational daily progress summaries for the One-Pager app.
Rules:
- Keep "summary" ≤ 80 words. Be specific, motivational, and warm — the user should feel seen.
- MUST name at least one real habit or task by exact title in "summary" (never only "your main task" or "a habit").
- NAMED WIN (required): "wins" MUST include at least one bullet that names a completed habit or completed priority task by exact title from habits/priorityTasks/habitRollup data.
- NAMED OPEN ITEM (required when openItems is non-empty): "challenges" MUST include at least one bullet naming a specific open habit or incomplete task from openItems — frame as gentle tomorrow focus, not guilt.
- If openItems is empty, challenges may note proportionate recovery (rest, weather, calendar load) without inventing titles.
- HABIT ROLLUP: If habitRollup is provided and completedCount < scheduledCount, praise proportionate effort (e.g. "5/7 habits — you didn't need a perfect day"). If completedCount === scheduledCount and scheduledCount > 0, celebrate a full sweep. Mention 1–2 incomplete habit names gently as optional tomorrow focus, not failure.
- PRIORITY TASKS: If priorityTasks lists completed urgent/high items, cite at least one by exact title in summary or wins. Incomplete urgent/high can go in challenges.
- TODAY CALENDAR + WEATHER: If todayCalendar and weather exist, weave one sentence when natural (e.g. "Between [Event] and the rain, you still [named win]"). todayCalendar is already filtered to today only.
- SPORTS BEATS: Prefer sportsBeats headlines for emotional colour (recent win, live match, match today) over raw fixture lists. Only use beats provided — tie to discipline/mood lightly if a win exists, never invent scores.
- CONTINUE WATCHING: If continueWatching has entries, you may mention one show by title as part of a balanced day (leisure counts) — do not invent episodes.
- TOUGH WEATHER (rain, snow, storms, cold ≤8°C, strong wind, fog): acknowledge local conditions and praise effort for showing up indoors or despite weather.
- Include upcoming matches for favourite teams if available (mention next 1-2 important matches) when sportsBeats is empty.
- CRITICAL: When mentioning match timing, compare the match date to TODAY'S DATE (${input.date}). If the match date equals today's date, say "today". If it's the next day, say "tomorrow". Be accurate!
- CRITICAL: For upcomingEvents (broader calendar), compare each event's startDate to TODAY'S DATE (${input.date}). Only say "today" if the date EXACTLY matches ${input.date}.
- "wins" must include 2–4 specific bullets from real data (habits done, priority tasks, sports beats, calendar survived, weather grit). At least one bullet uses an exact habit/task title.
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
  "score": 85
}`
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
    return summary;
  } catch (error) {
    console.error('Error generating daily summary:', error);
    // Return a fallback summary
    return {
      date: input.date,
      summary: "Keep building momentum with your daily activities and habits!",
      wins: ["Stayed consistent with tracking"],
      challenges: ["Continue building routines"],
      streaks: [],
      recommendations: ["Focus on one habit at a time", "Set specific daily goals", "Celebrate small wins"],
      sentiment: "positive",
      score: 75
    };
  }
}