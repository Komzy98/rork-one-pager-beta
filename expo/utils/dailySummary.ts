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

export async function summarizeDailyProgress(input: {
  date: string; // e.g., "2025-09-08"
  activities?: { name: string; minutes?: number; details?: string }[];
  habits?: { name: string; done: boolean; streak?: number }[];
  tasks?: { name: string; completed: boolean; priority?: string; category?: string }[];
  shows?: { title: string; episode?: string }[];
  sports?: { team: string; result?: string }[];
  upcomingMatches?: { homeTeam: string; awayTeam: string; date: string; time: string; competition: string }[];
  recentWins?: { team: string; opponent: string; score: string; date: string }[];
  upcomingEvents?: { title: string; startDate: string; endDate: string; location?: string; isAllDay?: boolean }[];
  weather?: { condition: string; temp: number; description: string; city: string; humidity?: number; windSpeed?: number };
  notes?: string;
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
- Keep "summary" ≤ 80 words. Be specific, motivational, and neutral in tone.
- Include completed tasks and habits in your summary
- Highlight task completions as wins, especially high priority ones
- Include upcoming matches for favourite teams if available (mention next 1-2 important matches)
- CRITICAL: When mentioning match timing, compare the match date to TODAY'S DATE (${input.date}). If the match date equals today's date, say "today". If it's the next day, say "tomorrow". Be accurate!
- Include recent wins for favourite teams as part of wins section
- Include weather information naturally in the summary (e.g., "sunny day ahead" or "rainy weather expected")
- CRITICAL: For calendar events, you MUST compare each event's startDate to TODAY'S DATE (${input.date}). Only say "today" if the event's date EXACTLY matches ${input.date}. If the event is on the NEXT day, say "tomorrow". For any other date, use the actual date. NEVER say an event is "today" if its date does not match ${input.date}.
- Only highlight today's events prominently. Mention tomorrow's events briefly. Do not emphasize events further out.
- "recommendations" should be concrete and achievable (≤ 3). Consider weather in recommendations (e.g., outdoor activities on nice days)
- Do not invent data—only use what is provided.
- If a metric is missing, omit it; never guess.
- Output must be valid JSON with the exact structure provided.`
          },
          {
            role: 'user',
            content: `TODAY'S DATE IS: ${input.date}

User context for ${input.date}:
Activities: ${JSON.stringify(input.activities ?? [])}
Habits: ${JSON.stringify(input.habits ?? [])}
Tasks: ${JSON.stringify(input.tasks ?? [])}
Shows: ${JSON.stringify(input.shows ?? [])}
Sports: ${JSON.stringify(input.sports ?? [])}
Upcoming Matches (compare dates to today ${input.date} - same date = today, next day = tomorrow): ${JSON.stringify(input.upcomingMatches ?? [])}
Recent Team Wins: ${JSON.stringify(input.recentWins ?? [])}
Upcoming Calendar Events (IMPORTANT: compare each event's startDate to today ${input.date}. ONLY events with startDate starting with "${input.date}" are today. All others are future events): ${JSON.stringify(input.upcomingEvents ?? [])}
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