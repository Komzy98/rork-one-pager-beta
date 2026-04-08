export interface UnifiedActivity {
  id: string;
  type: 'habit' | 'task' | 'show' | 'sport' | 'calendar';
  title: string;
  description?: string;
  status: 'upcoming' | 'active' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledTime?: string;
  duration?: number;
  category: string;
  tags: string[];
  progress?: number;
  metadata: {
    originalId: string;
    source: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ActivityInsight {
  id: string;
  type: 'pattern' | 'recommendation' | 'achievement' | 'warning';
  title: string;
  description: string;
  confidence: number; // 0-1
  actionable: boolean;
  actions?: {
    label: string;
    action: string;
    params?: Record<string, any>;
  }[];
  relatedActivities: string[];
  createdAt: string;
}

export interface ActivityPattern {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  activities: string[];
  strength: number; // 0-1
  lastOccurrence: string;
  predictedNext?: string;
}

export interface SmartRecommendation {
  id: string;
  type: 'schedule' | 'habit' | 'task' | 'break' | 'focus' | 'notification' | 'entertainment';
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  suggestedTime?: string;
  estimatedBenefit: number; // 0-1
  difficulty: number; // 0-1
  relatedActivities: string[];
  createdAt: string;
}

export interface CrossActivityInsight {
  id: string;
  title: string;
  description: string;
  correlatedActivities: {
    activityId: string;
    activityType: string;
    correlation: number; // -1 to 1
    impact: 'positive' | 'negative' | 'neutral';
  }[];
  insight: string;
  actionable: boolean;
  confidence: number;
}

export interface UnifiedTimeline {
  date: string;
  activities: UnifiedActivity[];
  insights: ActivityInsight[];
  recommendations: SmartRecommendation[];
  productivity: {
    score: number;
    factors: {
      name: string;
      impact: number;
      description: string;
    }[];
  };
  mood?: {
    score: number;
    factors: string[];
  };
}

export interface ActivityAnalytics {
  totalActivities: number;
  completionRate: number;
  averageProductivity: number;
  streaks: {
    current: number;
    longest: number;
    type: string;
  }[];
  patterns: ActivityPattern[];
  insights: CrossActivityInsight[];
  timeDistribution: {
    category: string;
    hours: number;
    percentage: number;
  }[];
  weeklyTrends: {
    week: string;
    completionRate: number;
    productivity: number;
    activities: number;
  }[];
}

export interface OptimalTimeSlot {
  startTime: string;
  endTime: string;
  confidence: number;
  reasoning: string;
  activityTypes: string[];
  historicalPerformance: number;
}

export interface ActivityIntelligence {
  timeline: UnifiedTimeline[];
  analytics: ActivityAnalytics;
  recommendations: SmartRecommendation[];
  optimalTimes: OptimalTimeSlot[];
  patterns: ActivityPattern[];
  insights: ActivityInsight[];
}