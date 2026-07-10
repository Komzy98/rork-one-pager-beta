export interface GoalCompletion {
  id: string;
  date: string; // YYYY-MM-DD format
  timestamp: string; // Full ISO timestamp
  notes?: string;
  mood?: 'excellent' | 'good' | 'okay' | 'difficult'; // How they felt completing it
  effort?: 1 | 2 | 3 | 4 | 5; // Effort level (1 = very easy, 5 = very hard)
  duration?: number; // Time spent in minutes
  location?: string; // Where they completed it
  weather?: string; // Weather condition if relevant
  companions?: string[]; // Who they were with
  tags?: string[]; // Custom tags for this completion
}

export interface DailyTask {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
  completedAt?: string;
  order: number;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  completed: boolean;
  completedAt?: string;
  requiredCompletions: number; // Number of daily tasks to complete
  currentCompletions: number;
}

export interface StreakFreeze {
  availableFreezes: number;
  frozenDates: string[];
  lastFreezeRefill: string;
  freezesUsedThisWeek: number;
}

export type FrequencyType = 'specific_days' | 'times_per_week';

export interface GracePeriod {
  enabled: boolean;
  graceHours: number; // default 24
  recoveredDates: string[]; // YYYY-MM-DD dates where grace was used to recover streak
}

export interface ComebackBonus {
  lastAbsenceEnd?: string; // YYYY-MM-DD when user returned after missing days
  bonusXpAwarded: number; // Total bonus XP awarded for comebacks
  comebackCount: number; // Number of times user came back after absence
  lastBonusDate?: string; // YYYY-MM-DD last bonus was given
}

export interface PartialCredit {
  monthlyRates: Record<string, number>; // YYYY-MM -> completion rate (0-100)
  weeklyRates: Record<string, number>; // YYYY-Www -> completion rate (0-100)
  allTimeRate: number; // Overall completion rate (0-100)
  totalScheduledDays: number;
  totalCompletedDays: number;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  frequency: {
    type: FrequencyType;
    days: number[]; // 0 = Sunday, 1 = Monday, etc. Used when type is 'specific_days'
    timesPerWeek?: number; // Used when type is 'times_per_week' (e.g. 3 = 3 times any day of the week)
  };
  completions: Record<string, boolean>; // date string (YYYY-MM-DD) -> completed
  completionLogs: GoalCompletion[]; // Detailed completion logs
  createdAt: string;
  
  // Streak freeze
  streakFreeze?: StreakFreeze;
  
  // Grace period
  gracePeriod?: GracePeriod;
  
  // Comeback bonus
  comebackBonus?: ComebackBonus;
  
  // Partial credit (auto-calculated)  
  partialCredit?: PartialCredit;
  
  // Goal breakdown features
  goalType?: 'simple' | 'progressive'; // simple = regular habit, progressive = broken down goal
  mainGoal?: string; // The ultimate goal
  goalDeadline?: string; // Target date to achieve the goal
  dailyTasks?: Record<string, DailyTask[]>; // date string -> tasks for that day
  milestones?: Milestone[];
  currentLevel?: number; // For progressive difficulty
  adaptiveDifficulty?: boolean; // Auto-adjust task difficulty based on performance
  minimumDailyTasks?: number; // Minimum tasks to complete per day
  maximumDailyTasks?: number; // Maximum tasks per day to prevent burnout

  /** Copied from community programs that pair with the Cooking tab */
  dietTags?: string[];
  dietLabel?: string;
}

export type HabitWithStats = Habit & {
  streak: number;
  completedToday: boolean;
  totalCompletions: number;
}

export interface NewHabitFormData {
  name: string;
  description?: string;
  icon?: string;
  color: string;
  frequency: {
    type: FrequencyType;
    days: number[];
    timesPerWeek?: number;
  };
  gracePeriodEnabled?: boolean;
  goalType?: 'simple' | 'progressive';
  mainGoal?: string;
  goalDeadline?: string;
  milestones?: Omit<Milestone, 'id' | 'completed' | 'completedAt' | 'currentCompletions'>[];
  adaptiveDifficulty?: boolean;
  minimumDailyTasks?: number;
  maximumDailyTasks?: number;
}

export interface GoalCompletionFormData {
  notes?: string;
  mood?: GoalCompletion['mood'];
  effort?: GoalCompletion['effort'];
  duration?: number;
  location?: string;
  companions?: string[];
  tags?: string[];
}

// Activities
export interface Activity {
  id: string;
  title: string;
  category: 'Reading' | 'Work' | 'Travel' | 'Learning' | 'Fitness' | 'Creative' | 'Other';
  status: 'Not Started' | 'In Progress' | 'Completed';
  description?: string;
  timeSpent: number; // in minutes
  sessions: ActivitySession[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivitySession {
  id: string;
  date: string;
  duration: number; // in minutes
  notes?: string;
}

export interface NewActivityFormData {
  title: string;
  category: Activity['category'];
  description?: string;
}

// Shows
export interface Show {
  id: string;
  title: string;
  platform: 'Netflix' | 'Prime' | 'YouTube' | 'Disney+' | 'HBO' | 'Hulu' | 'Other';
  type: 'Movie' | 'Series' | 'Documentary' | 'YouTube Series';
  currentSeason?: number;
  currentEpisode?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
  status: 'Watching' | 'Completed' | 'On Hold' | 'Plan to Watch';
  rating?: number; // 1-5 stars
  notes?: string;
  netflixUrl?: string; // URL to Netflix show/movie
  tmdbId?: number; // TMDB ID for fetching watch providers and trailers
  mediaType?: 'movie' | 'tv'; // TMDB media type
  createdAt: string;
  updatedAt: string;
}

export interface NewShowFormData {
  title: string;
  platform: Show['platform'];
  type: Show['type'];
  currentSeason?: number;
  currentEpisode?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
  netflixUrl?: string;
  tmdbId?: number;
  mediaType?: 'movie' | 'tv';
  status?: Show['status'];
}

// Sports
export interface SportTeam {
  id: string;
  name: string;
  sport: 'Football' | 'Basketball' | 'Soccer' | 'Baseball' | 'Tennis' | 'F1' | 'Other';
  league: string;
  logo?: string;
  isFollowing: boolean;
}

export interface SportMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: SportTeam['sport'];
  league: string;
  date: string;
  time: string;
  status: 'Upcoming' | 'Live' | 'Completed';
  homeScore?: number;
  awayScore?: number;
  platform?: string; // Where to watch
}

// API Football Types
export interface ApiFootballFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number | null;
      second: number | null;
    };
    venue: {
      id: number | null;
      name: string | null;
      city: string | null;
    };
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: {
      home: number | null;
      away: number | null;
    };
    fulltime: {
      home: number | null;
      away: number | null;
    };
    extratime: {
      home: number | null;
      away: number | null;
    };
    penalty: {
      home: number | null;
      away: number | null;
    };
  };
}

export interface ApiFootballResponse {
  get: string;
  parameters: Record<string, any>;
  errors: any[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: ApiFootballFixture[];
}

export interface LiveFootballMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  homeTeamId?: number;
  awayTeamId?: number;
  league: string;
  leagueId?: number;
  leagueLogo?: string;
  country?: string;
  date: string;
  time: string;
  status: 'Live' | 'Upcoming' | 'Completed';
  statusText?: string;
  elapsed?: number;
  homeScore?: number | null;
  awayScore?: number | null;
  venue?: string;
  round?: string;
}

export interface UserTeam {
  id: string;
  name: string;
  logo?: string;
  league: string;
  country?: string;
  apiId?: number;
  isNationalTeam?: boolean;
}

export interface NBAFavoriteTeam {
  id: string;
  name: string;
  abbreviation: string;
  conference: 'Eastern' | 'Western';
  logo?: string;
}

export interface UserCountry {
  id: string;
  name: string;
  code: string; // ISO country code (e.g., 'GB', 'ES', 'DE')
  flag?: string;
  leagues: string[];
}

export interface UserNationality {
  id: string;
  name: string;
  code: string;
  flag: string;
  apiId: number; // National team API ID for fetching matches
}

export type Chronotype = 'lion' | 'bear' | 'wolf' | 'dolphin';

export interface ChronotypeInfo {
  id: Chronotype;
  name: string;
  emoji: string;
  title: string;
  description: string;
  peakHours: { start: number; end: number };
  windDownHour: number;
  wakeHour: number;
  sleepHour: number;
  color: string;
  traits: string[];
}

export type RecoverySignalKind =
  | 'habit_drop'
  | 'difficult_mood'
  | 'task_backlog'
  | 'missed_habits'
  | 'manual';

export interface RecoveryWellbeingLog {
  date: string;
  mood?: 'low' | 'okay' | 'good';
  water?: boolean;
  outside?: boolean;
  movement?: boolean;
  social?: boolean;
  reading?: boolean;
  reflection?: boolean;
  sleep?: 'poor' | 'fair' | 'good';
}

export interface RecoveryModeState {
  active: boolean;
  enteredAt?: string;
  lastEvaluatedAt?: string;
  reason?: 'auto' | 'manual';
  signals?: RecoverySignalKind[];
  score?: number;
  dailyWin?: string;
  dailyWinDate?: string;
  dailyHope?: string;
  dailyHopeDate?: string;
  /** Consecutive days with elevated recovery score (auto-enter threshold). */
  consecutiveHighScoreDays?: number;
  /** Consecutive days below exit threshold while active. */
  consecutiveLowScoreDays?: number;
  lastScore?: number;
  lastScoreDate?: string;
  snoozedUntil?: string;
}

export interface JoySources {
  tvShows?: string[];
  youtubers?: string[];
  games?: string[];
  music?: string[];
  podcasts?: string[];
  restaurants?: string[];
  exerciseTypes?: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  favoriteTeams: UserTeam[];
  favoriteNBATeams?: NBAFavoriteTeam[];
  favoriteCountries: UserCountry[];
  favoriteLeagues: number[];
  sportsFeedPrefs?: {
    strictFollowing: boolean;
    includeFollowedLeagues: boolean;
    discoveryLevel: 'low' | 'med' | 'high';
    prioritizeDomesticLeagues: boolean;
    /** Pin and keep national-team fixtures in For You (World Cup, qualifiers, friendlies). */
    prioritizeNationalTeams?: boolean;
  };
  favoriteBooks: Book[];
  interests: string[];
  /** Bento event categories picked during onboarding (music, comedy, tech, etc.). */
  favoriteEventCategories?: string[];
  chronotype?: Chronotype;
  nationalities?: UserNationality[]; // User's nationalities for national team matches (AFCON, World Cup, etc.)
  notificationSettings: {
    liveMatches: boolean;
    matchReminders: boolean;
    goalAlerts: boolean;
    habitReminders: boolean;
    habitRiskAlerts?: boolean;
    socialNotifications?: boolean;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string; // HH:mm
    quietHoursEnd?: string; // HH:mm
    eventReminderLeadMinutes?: number;
  };
  displayPreferences: {
    showOnlyFavorites: boolean;
    timeFormat: '12h' | '24h';
    theme: 'light' | 'dark' | 'auto';
  };
  /** Drives Pro app themes in Profile; set by purchase / server sync. */
  subscriptionTier?: 'free' | 'pro';
  tabOrder?: string[];
  /** Visit counts for scrollable tabs; drives left-side prioritization in the tab bar. */
  tabVisitCounts?: Record<string, number>;
  onboardingCompleted: boolean;
  /** Long-term identity reminders surfaced during Recovery Mode. */
  identityGoals?: string[];
  joySources?: JoySources;
  recoveryMode?: RecoveryModeState;
  wellbeingLogs?: RecoveryWellbeingLog[];
  /** Events the user added to their One Pager from the Events tab. */
  savedEvents?: import('@/types/events').SavedEventSnapshot[];
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  totalPages?: number;
  currentPage: number;
  status: 'Reading' | 'Completed' | 'Want to Read' | 'Paused';
  rating?: number; // 1-5 stars
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface PersonalizationData {
  favoriteTeams: UserTeam[];
  favoriteLeagues: number[];
  interests: string[];
  habitCategories: string[];
}

// Calendar Events from .ics files
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  category?: string;
  organizer?: string;
  attendees?: string[];
  recurrence?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    interval?: number;
    until?: string;
    count?: number;
  };
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface ImportedCalendar {
  id: string;
  name: string;
  source: 'file' | 'url';
  sourceData: string; // file content or URL
  events: CalendarEvent[];
  lastSynced: string;
  isActive: boolean;
  color: string;
}

// Predictive Personalization Types
export interface PersonalizationInsight {
  id: string;
  type: 'correlation' | 'prediction' | 'suggestion' | 'seasonal';
  title: string;
  description: string;
  confidence: number; // 0-1
  actionable: boolean;
  category: 'habits' | 'activities' | 'shows' | 'sports' | 'general';
  data?: any;
  createdAt: string;
}

export interface HabitCorrelation {
  habitId1: string;
  habitId2: string;
  correlation: number; // -1 to 1
  description: string;
  sampleSize: number;
}

export interface SeasonalPattern {
  habitId: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  averageCompletion: number;
  suggestedDifficulty: 'easier' | 'normal' | 'harder';
  reasoning: string;
}

export interface MoodBasedRecommendation {
  id: string;
  type: 'show' | 'activity' | 'habit';
  title: string;
  reason: string;
  mood: 'celebration' | 'comfort' | 'motivation' | 'relaxation';
  confidence: number;
  metadata?: any;
}

export interface HabitStack {
  id: string;
  name: string;
  description: string;
  habits: string[]; // habit IDs
  successRate: number;
  averageCompletionTime: number;
  bestTimeOfDay?: string;
  tags: string[];
  createdAt: string;
}

// Community Habits Types
export interface CommunityHabitUser {
  id: string;
  name: string;
  avatar?: string;
  followersCount?: number;
  habitsShared?: number;
}

export interface ProgramWeek {
  week: number;
  title?: string;
  description?: string;
  days: ProgramDay[];
}

export interface ProgramDay {
  day: number;
  title: string;
  description: string;
  duration: string;
  activities: string[];
  notes?: string;
  restDay?: boolean;
}

export interface ExerciseFormGuide {
  musclesWorked: string[];
  setup: string;
  steps: string[];
  commonMistakes: string[];
  tips: string[];
}

export interface ProgramPhase {
  phase: number;
  title: string;
  description: string;
  weeks: number[];
  focusAreas: string[];
}

export interface CommunityHabit {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  frequency: {
    type?: FrequencyType;
    days: number[];
    timesPerWeek?: number;
  };
  category: 'Fitness' | 'Health' | 'Productivity' | 'Mindfulness' | 'Learning' | 'Social' | 'Creative' | 'Religion' | 'Other' | 'Finance' | 'Self-Care' | 'Career' | 'Household';
  user: CommunityHabitUser;
  likes: number;
  saves: number;
  trending?: boolean;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  estimatedDuration?: string;
  tags: string[];
  createdAt: string;
  goalType?: 'simple' | 'progressive';
  mainGoal?: string;
  
  // Detailed program information
  longDescription?: string;
  benefits?: string[];
  equipment?: string[];
  prerequisites?: string[];
  scientificBacking?: string;
  resources?: { title: string; url?: string; description?: string }[];
  
  // Program structure
  programLength?: string; // e.g., '8 weeks', '30 days', '12 weeks'
  phases?: ProgramPhase[];
  weeks?: ProgramWeek[];
  dailyStructure?: string; // For daily habits without week structure
  
  // Target audience
  targetAudience?: string; // e.g., 'Great for beginners', 'Best for busy professionals', 'Advanced / gym access required'
  
  // Exercise demonstration GIFs
  exerciseGifs?: Record<string, string>; // Maps exercise name to GIF URL for form demonstrations
  exerciseFormGuides?: Record<string, ExerciseFormGuide>; // Maps exercise name to detailed form guide

  // Diet integration - links to cooking tab
  dietTags?: string[]; // e.g. ['mediterranean', 'healthy'] - used to filter recipes in cooking tab
  dietLabel?: string; // Pretty label for the diet, e.g. 'Mediterranean Diet'
}

// Saved community habit - tracks which community habits user has added
export interface SavedCommunityHabit {
  id: string; // Unique ID for this saved instance
  communityHabitId: string; // Reference to the original community habit
  habitId: string; // Reference to the created habit in user's habits list
  savedAt: string;
  originalCreator: {
    id: string;
    name: string;
    avatar?: string;
  };
}

// Extended habit with source info
export interface HabitSource {
  type: 'personal' | 'community';
  communityHabitId?: string;
  originalCreator?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface SmartNotification {
  id: string;
  type: 'habit_reminder' | 'match_reminder' | 'task_suggestion' | 'show_recommendation';
  title: string;
  message: string;
  scheduledFor: string;
  priority: 'low' | 'medium' | 'high';
  actionData?: any;
  delivered: boolean;
  createdAt: string;
}

export interface PersonalizationSettings {
  enableSeasonalAdaptation: boolean;
  enableMoodBasedCuration: boolean;
  enableHabitStacking: boolean;
  enableSmartNotifications: boolean;
  enableCrossActivityInsights: boolean;
  notificationFrequency: 'minimal' | 'moderate' | 'frequent';
  adaptationSensitivity: 'low' | 'medium' | 'high';
}

// Dashboard Summary
export interface DashboardSummary {
  habits: {
    completed: number;
    total: number;
    currentStreak: number;
  };
  activities: {
    inProgress: number;
    totalTimeToday: number; // in minutes
    recentActivity?: Activity;
  };
  shows: {
    watching: number;
    nextToWatch?: Show;
  };
  sports: {
    upcomingMatches: SportMatch[];
    todayMatches: SportMatch[];
  };
  calendar: {
    upcomingEvents: CalendarEvent[];
    todayEvents: CalendarEvent[];
  };
  personalization?: {
    insights: PersonalizationInsight[];
    recommendations: MoodBasedRecommendation[];
    suggestedStacks: HabitStack[];
    upcomingNotifications: SmartNotification[];
  };
}