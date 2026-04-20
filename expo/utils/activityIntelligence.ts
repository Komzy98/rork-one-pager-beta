import {
  UnifiedActivity,
  ActivityInsight,
  ActivityPattern,
  SmartRecommendation,
  CrossActivityInsight,
  UnifiedTimeline,
} from '@/types/activity';
import { getLocalDateStr } from '@/utils/dateUtils';

class ActivityIntelligenceService {
  unifyActivities(
    habits: any[],
    tasks: any[],
    activities: any[],
    shows: any[],
    sports: any[],
    calendarEvents: any[]
  ): UnifiedActivity[] {
    const unified: UnifiedActivity[] = [];
    const now = new Date().toISOString();

    for (const habit of habits) {
      unified.push({
        id: `habit-${habit.id}`,
        type: 'habit',
        title: habit.name || habit.title || 'Untitled Habit',
        description: habit.description,
        status: habit.completedToday ? 'completed' : 'active',
        priority: 'medium',
        category: habit.category || 'habits',
        tags: habit.tags || [],
        progress: habit.streak ? Math.min(habit.streak / 30, 1) * 100 : 0,
        metadata: { originalId: habit.id, source: 'habits' },
        createdAt: habit.createdAt || now,
        updatedAt: habit.updatedAt || now,
      });
    }

    for (const task of tasks) {
      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
      unified.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title || 'Untitled Task',
        description: task.description,
        status: task.status === 'completed' ? 'completed' : isOverdue ? 'overdue' : 'active',
        priority: task.priority || 'medium',
        scheduledTime: task.dueDate,
        category: task.category || 'tasks',
        tags: task.tags || [],
        progress: task.progress || 0,
        metadata: { originalId: task.id, source: 'tasks' },
        createdAt: task.createdAt || now,
        updatedAt: task.updatedAt || now,
      });
    }

    for (const activity of activities) {
      unified.push({
        id: `activity-${activity.id}`,
        type: 'habit',
        title: activity.name || activity.title || 'Activity',
        description: activity.description,
        status: activity.completed ? 'completed' : 'active',
        priority: 'low',
        category: activity.category || 'activities',
        tags: activity.tags || [],
        metadata: { originalId: activity.id, source: 'activities' },
        createdAt: activity.createdAt || now,
        updatedAt: activity.updatedAt || now,
      });
    }

    for (const show of shows) {
      unified.push({
        id: `show-${show.id}`,
        type: 'show',
        title: show.name || show.title || 'Show',
        description: show.description,
        status: show.status === 'completed' ? 'completed' : 'active',
        priority: 'low',
        category: 'entertainment',
        tags: show.genres || [],
        progress: show.progress || 0,
        metadata: { originalId: show.id, source: 'shows' },
        createdAt: show.createdAt || now,
        updatedAt: show.updatedAt || now,
      });
    }

    for (const sport of sports) {
      unified.push({
        id: `sport-${sport.id}`,
        type: 'sport',
        title: sport.title || `${sport.homeTeam} vs ${sport.awayTeam}`,
        status: sport.status === 'finished' ? 'completed' : 'upcoming',
        priority: 'low',
        scheduledTime: sport.date || sport.startTime,
        category: 'sports',
        tags: [],
        metadata: { originalId: sport.id, source: 'sports' },
        createdAt: sport.createdAt || now,
        updatedAt: sport.updatedAt || now,
      });
    }

    for (const event of calendarEvents) {
      unified.push({
        id: `cal-${event.id}`,
        type: 'calendar',
        title: event.title || 'Calendar Event',
        description: event.notes,
        status: new Date(event.endDate || event.startDate) < new Date() ? 'completed' : 'upcoming',
        priority: 'medium',
        scheduledTime: event.startDate,
        duration: event.duration,
        category: 'calendar',
        tags: [],
        metadata: { originalId: event.id, source: 'calendar' },
        createdAt: event.createdAt || now,
        updatedAt: event.updatedAt || now,
      });
    }

    return unified;
  }

  detectPatterns(activities: UnifiedActivity[]): ActivityPattern[] {
    const patterns: ActivityPattern[] = [];
    const typeGroups = new Map<string, UnifiedActivity[]>();

    for (const activity of activities) {
      const key = activity.type;
      if (!typeGroups.has(key)) {
        typeGroups.set(key, []);
      }
      typeGroups.get(key)!.push(activity);
    }

    typeGroups.forEach((group, type) => {
      if (group.length >= 3) {
        patterns.push({
          id: `pattern-${type}-${Date.now()}`,
          name: `${type} pattern`,
          description: `You have ${group.length} ${type} activities`,
          frequency: 'daily',
          activities: group.map(a => a.id),
          strength: Math.min(group.length / 10, 1),
          lastOccurrence: new Date().toISOString(),
        });
      }
    });

    return patterns;
  }

  async generateInsights(activities: UnifiedActivity[]): Promise<ActivityInsight[]> {
    const insights: ActivityInsight[] = [];
    const now = new Date().toISOString();

    const completed = activities.filter(a => a.status === 'completed');
    const overdue = activities.filter(a => a.status === 'overdue');
    const total = activities.length;

    if (total > 0) {
      const completionRate = completed.length / total;
      insights.push({
        id: `insight-completion-${Date.now()}`,
        type: completionRate > 0.7 ? 'achievement' : completionRate < 0.3 ? 'warning' : 'pattern',
        title: completionRate > 0.7 ? 'Great Progress!' : completionRate < 0.3 ? 'Falling Behind' : 'Steady Progress',
        description: `You've completed ${Math.round(completionRate * 100)}% of your activities.`,
        confidence: 0.8,
        actionable: completionRate < 0.5,
        relatedActivities: completed.map(a => a.id).slice(0, 5),
        createdAt: now,
      });
    }

    if (overdue.length > 0) {
      insights.push({
        id: `insight-overdue-${Date.now()}`,
        type: 'warning',
        title: 'Overdue Items',
        description: `You have ${overdue.length} overdue ${overdue.length === 1 ? 'item' : 'items'} that need attention.`,
        confidence: 1,
        actionable: true,
        actions: [{
          label: 'Review overdue items',
          action: 'navigate',
          params: { screen: 'tasks' },
        }],
        relatedActivities: overdue.map(a => a.id).slice(0, 5),
        createdAt: now,
      });
    }

    return insights;
  }

  async generateSmartRecommendations(
    activities: UnifiedActivity[],
    _patterns: ActivityPattern[]
  ): Promise<SmartRecommendation[]> {
    const recommendations: SmartRecommendation[] = [];
    const now = new Date().toISOString();

    const highPriority = activities.filter(a => a.priority === 'high' || a.priority === 'urgent');
    if (highPriority.length > 0) {
      recommendations.push({
        id: `rec-focus-${Date.now()}`,
        type: 'focus',
        title: 'Focus on High Priority',
        description: `You have ${highPriority.length} high-priority items. Consider tackling them first.`,
        reasoning: 'High priority items have the most impact on your goals.',
        confidence: 0.9,
        estimatedBenefit: 0.8,
        difficulty: 0.5,
        relatedActivities: highPriority.map(a => a.id).slice(0, 3),
        createdAt: now,
      });
    }

    const active = activities.filter(a => a.status === 'active');
    if (active.length > 5) {
      recommendations.push({
        id: `rec-break-${Date.now()}`,
        type: 'break',
        title: 'Take a Break',
        description: 'You have many active items. Consider taking a short break to recharge.',
        reasoning: 'Regular breaks improve productivity and focus.',
        confidence: 0.7,
        estimatedBenefit: 0.6,
        difficulty: 0.1,
        relatedActivities: [],
        createdAt: now,
      });
    }

    return recommendations;
  }

  generateCrossActivityInsights(activities: UnifiedActivity[]): CrossActivityInsight[] {
    const crossInsights: CrossActivityInsight[] = [];

    const types = new Set(activities.map(a => a.type));
    if (types.size >= 2) {
      const typeArray = Array.from(types);
      crossInsights.push({
        id: `cross-${Date.now()}`,
        title: 'Activity Balance',
        description: `You're engaged in ${types.size} different activity types: ${typeArray.join(', ')}.`,
        correlatedActivities: typeArray.map(type => ({
          activityId: activities.find(a => a.type === type)?.id || '',
          activityType: type,
          correlation: 0.5,
          impact: 'positive' as const,
        })),
        insight: 'Maintaining variety across activities helps with overall well-being.',
        actionable: false,
        confidence: 0.7,
      });
    }

    return crossInsights;
  }

  async createUnifiedTimeline(
    activities: UnifiedActivity[],
    insights: ActivityInsight[],
    recommendations: SmartRecommendation[]
  ): Promise<UnifiedTimeline[]> {
    const dateMap = new Map<string, UnifiedActivity[]>();
    const today = getLocalDateStr();

    for (const activity of activities) {
      const date = activity.scheduledTime
        ? activity.scheduledTime.split('T')[0]
        : today;
      if (!dateMap.has(date)) {
        dateMap.set(date, []);
      }
      dateMap.get(date)!.push(activity);
    }

    const timeline: UnifiedTimeline[] = [];
    dateMap.forEach((dayActivities, date) => {
      const completed = dayActivities.filter(a => a.status === 'completed').length;
      const total = dayActivities.length;
      const score = total > 0 ? (completed / total) * 100 : 0;

      timeline.push({
        date,
        activities: dayActivities,
        insights: date === today ? insights : [],
        recommendations: date === today ? recommendations : [],
        productivity: {
          score: Math.round(score),
          factors: [
            { name: 'Completion Rate', impact: score, description: `${completed}/${total} completed` },
          ],
        },
      });
    });

    return timeline.sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const activityIntelligence = new ActivityIntelligenceService();
