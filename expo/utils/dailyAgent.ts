import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';

export const DailyAgentReportSchema = z.object({
  headline: z.string().describe('One punchy headline summarising the day (max 8 words)'),
  subheadline: z.string().describe('Short supportive sentence under the headline (max 18 words)'),
  productivityScore: z.number().min(0).max(100).describe('Overall productivity score 0-100'),
  productivityGrade: z.enum(['A+', 'A', 'B', 'C', 'D', 'F']).describe('Letter grade for the day'),
  productivityBreakdown: z.object({
    focus: z.number().min(0).max(100),
    consistency: z.number().min(0).max(100),
    balance: z.number().min(0).max(100),
    momentum: z.number().min(0).max(100),
  }),
  behaviourInsights: z
    .array(
      z.object({
        title: z.string().describe('Short insight title (max 6 words)'),
        description: z.string().describe('1-2 sentence explanation grounded in the data'),
        trend: z.enum(['up', 'down', 'stable']).describe('Direction of the pattern'),
        category: z.enum(['habits', 'tasks', 'shows', 'sports', 'calendar', 'balance']),
      })
    )
    .min(2)
    .max(5),
  lifestyleBalance: z.object({
    summary: z.string().describe('1-2 sentence analysis of balance across life areas'),
    dimensions: z
      .array(
        z.object({
          name: z.enum(['Work', 'Health', 'Leisure', 'Social', 'Learning', 'Rest']),
          score: z.number().min(0).max(100),
          note: z.string().describe('Brief note about this dimension (max 14 words)'),
        })
      )
      .min(3)
      .max(6),
  }),
  recommendations: z
    .array(
      z.object({
        title: z.string().describe('Action title (max 8 words)'),
        description: z.string().describe('Why this matters and how to do it (1-2 sentences)'),
        category: z.enum(['habit', 'task', 'rest', 'social', 'learning', 'focus', 'health']),
        priority: z.enum(['high', 'medium', 'low']),
        suggestedTime: z
          .string()
          .describe("When to do it tomorrow, e.g. '08:00', 'Morning', 'After work'")
          .optional(),
      })
    )
    .min(3)
    .max(5)
    .describe('Actionable, personalised recommendations for tomorrow'),
});

export type DailyAgentReport = z.infer<typeof DailyAgentReportSchema>;

export interface DailyAgentInput {
  date: string;
  userName?: string;
  habits: {
    name: string;
    completedToday: boolean;
    streak: number;
    totalCompletions: number;
    frequencyType?: string;
    last7DaysCompleted: number;
  }[];
  tasks: {
    title: string;
    status: 'todo' | 'in-progress' | 'completed' | 'cancelled';
    priority: string;
    category: string;
    completedToday: boolean;
    dueToday: boolean;
    overdue: boolean;
  }[];
  shows: {
    title: string;
    status: string;
    platform: string;
    progress?: string;
  }[];
  sports: {
    favouriteTeam: string;
    upcomingMatches: number;
    watchedThisWeek: number;
  };
  calendar: {
    eventsToday: number;
    eventsTomorrow: number;
    upcomingTitles: string[];
  };
  aggregates: {
    habitsCompletedToday: number;
    habitsTotal: number;
    tasksCompletedToday: number;
    tasksOpen: number;
    tasksOverdue: number;
    activeStreaks: number;
    longestStreak: number;
    totalFocusMinutesToday?: number;
  };
}

const SYSTEM_PROMPT = `You are "Pulse", a thoughtful personal AI daily analyst inside a lifestyle & productivity app.
Your job is to analyse a user's activity across habits, tasks, shows/entertainment, sports engagement, and calendar events, then produce a structured daily report.

Rules:
- Be specific: reference THEIR habits, tasks, shows, or teams by name when possible.
- Be honest but warm. No fluff. No generic "keep going" filler.
- Never invent data. Only use what is provided. If a category has no data, score it neutrally and note it.
- Productivity score must reflect the data: completion rates, overdue tasks, streak health, balance.
- Lifestyle balance should consider work vs rest vs social vs health vs leisure.
- Recommendations must be concrete and doable tomorrow (time-bound when useful).
- Keep strings within the length constraints described in the schema.
- Output must strictly match the JSON schema.`;

export async function generateDailyAgentReport(input: DailyAgentInput): Promise<DailyAgentReport> {
  console.log('[DailyAgent] Generating report with input summary:', {
    date: input.date,
    habits: input.habits.length,
    tasks: input.tasks.length,
    shows: input.shows.length,
    events: input.calendar.eventsToday + input.calendar.eventsTomorrow,
  });

  const userContent = `Date: ${input.date}
User: ${input.userName ?? 'friend'}

AGGREGATES:
${JSON.stringify(input.aggregates, null, 2)}

HABITS (${input.habits.length}):
${JSON.stringify(input.habits, null, 2)}

TASKS (${input.tasks.length}):
${JSON.stringify(input.tasks.slice(0, 40), null, 2)}

SHOWS (${input.shows.length}):
${JSON.stringify(input.shows.slice(0, 10), null, 2)}

SPORTS ENGAGEMENT:
${JSON.stringify(input.sports, null, 2)}

CALENDAR:
${JSON.stringify(input.calendar, null, 2)}

Analyse patterns across these domains. Produce the daily report.`;

  const report = await generateObject({
    messages: [
      { role: 'assistant', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    schema: DailyAgentReportSchema,
  });

  console.log('[DailyAgent] Got report, score:', report.productivityScore);
  return report;
}
