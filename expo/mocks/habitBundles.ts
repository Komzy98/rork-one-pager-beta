import { CommunityHabit } from '@/types/habit';
import { COMMUNITY_HABITS } from './communityHabits';

export interface HabitBundle {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  gradient: [string, string];
  habitIds: string[];
  category: 'morning' | 'evening' | 'productivity' | 'health' | 'mindfulness' | 'fitness';
  estimatedTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  benefits: string[];
  popularityScore: number;
}

export interface CuratedCollection {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  filter: (habit: CommunityHabit) => boolean;
  sortBy?: 'saves' | 'likes' | 'trending' | 'difficulty';
}

export const HABIT_BUNDLES: HabitBundle[] = [
  {
    id: 'bundle-morning-energy',
    name: 'Morning Energy Pack',
    description: 'Start your day with clarity, movement, and intention',
    emoji: '🌅',
    color: '#FF9500',
    gradient: ['#FF9500', '#FF6B35'],
    habitIds: ['ch-2', 'ch-20', 'ch-12'], // Morning Meditation, Morning Sunlight, Yoga Flow
    category: 'morning',
    estimatedTime: '40 min',
    difficulty: 'Easy',
    benefits: ['Better focus all day', 'Reduced stress', 'More energy'],
    popularityScore: 9500,
  },
  {
    id: 'bundle-productivity',
    name: 'Deep Work System',
    description: 'Maximize output with proven productivity techniques',
    emoji: '🧠',
    color: '#5856D6',
    gradient: ['#5856D6', '#AF52DE'],
    habitIds: ['ch-11', 'ch-22', 'ch-9'], // Deep Work, Time Blocking, No Social Media Before Noon
    category: 'productivity',
    estimatedTime: '3+ hours',
    difficulty: 'Medium',
    benefits: ['2-3x productivity', 'Better focus', 'Less distraction'],
    popularityScore: 8200,
  },
  {
    id: 'bundle-sleep-optimization',
    name: 'Sleep Optimization',
    description: 'Transform your sleep quality with evening rituals',
    emoji: '🌙',
    color: '#5AC8FA',
    gradient: ['#5AC8FA', '#007AFF'],
    habitIds: ['ch-14', 'ch-34', 'ch-26'], // Evening Wind-Down, Digital Sunset, Sleep Consistency
    category: 'evening',
    estimatedTime: '1-2 hours',
    difficulty: 'Medium',
    benefits: ['Better sleep', 'More energy', 'Improved recovery'],
    popularityScore: 7800,
  },
  {
    id: 'bundle-stress-relief',
    name: 'Stress Relief Kit',
    description: 'Science-backed techniques to calm your mind',
    emoji: '🧘',
    color: '#34C759',
    gradient: ['#34C759', '#00C7BE'],
    habitIds: ['ch-16', 'ch-17', 'ch-6'], // Box Breathing, PMR, Gratitude Journal
    category: 'mindfulness',
    estimatedTime: '20 min',
    difficulty: 'Easy',
    benefits: ['Lower anxiety', 'Better mood', 'Mental clarity'],
    popularityScore: 9100,
  },
  {
    id: 'bundle-fitness-foundation',
    name: 'Fitness Foundation',
    description: 'Build strength and endurance from scratch',
    emoji: '💪',
    color: '#FF3B30',
    gradient: ['#FF3B30', '#FF6B6B'],
    habitIds: ['ch-8', 'ch-29', 'ch-33'], // 10K Steps, Resistance Bands, Mobility Flow
    category: 'fitness',
    estimatedTime: '60 min',
    difficulty: 'Easy',
    benefits: ['Build muscle', 'Improve flexibility', 'More energy'],
    popularityScore: 8500,
  },
  {
    id: 'bundle-brain-boost',
    name: 'Brain Boost Stack',
    description: 'Sharpen your mind and accelerate learning',
    emoji: '📚',
    color: '#FF2D55',
    gradient: ['#FF2D55', '#AF52DE'],
    habitIds: ['ch-3', 'ch-45', 'ch-37'], // Read 30 Pages, Spaced Repetition, Active Recall
    category: 'productivity',
    estimatedTime: '1 hour',
    difficulty: 'Medium',
    benefits: ['Better memory', 'Faster learning', 'More knowledge'],
    popularityScore: 7200,
  },
  {
    id: 'bundle-metabolic-health',
    name: 'Metabolic Health',
    description: 'Optimise nutrition and energy levels',
    emoji: '🥗',
    color: '#00C7BE',
    gradient: ['#00C7BE', '#34C759'],
    habitIds: ['ch-4', 'ch-19', 'ch-23'], // IF 16:8, Protein First, Drink 3L Water
    category: 'health',
    estimatedTime: 'All day',
    difficulty: 'Medium',
    benefits: ['Weight management', 'Stable energy', 'Better digestion'],
    popularityScore: 8800,
  },
  {
    id: 'bundle-creative-flow',
    name: 'Creative Flow',
    description: 'Unlock your creative potential daily',
    emoji: '🎨',
    color: '#AF52DE',
    gradient: ['#AF52DE', '#FF2D55'],
    habitIds: ['ch-13', 'ch-42', 'ch-15'], // Creative Writing, Sketch Daily, Practice Guitar
    category: 'mindfulness',
    estimatedTime: '1 hour',
    difficulty: 'Medium',
    benefits: ['Enhanced creativity', 'Self-expression', 'New skills'],
    popularityScore: 5600,
  },
];

export const CURATED_COLLECTIONS: CuratedCollection[] = [
  {
    id: 'collection-30-day',
    name: '30-Day Challenges',
    description: 'Transform your life in just one month',
    emoji: '🎯',
    color: '#FF3B30',
    filter: (habit) => 
      habit.programLength?.includes('30') || 
      habit.goalType === 'progressive' ||
      habit.name.toLowerCase().includes('challenge'),
    sortBy: 'saves',
  },
  {
    id: 'collection-5-min',
    name: '5-Minute Habits',
    description: 'Quick wins that fit any schedule',
    emoji: '⚡',
    color: '#FF9500',
    filter: (habit) => {
      const duration = habit.estimatedDuration?.toLowerCase() || '';
      return duration.includes('5 min') || 
             duration.includes('5min') ||
             (duration.includes('min') && parseInt(duration) <= 10);
    },
    sortBy: 'saves',
  },
  {
    id: 'collection-morning',
    name: 'Morning Routines',
    description: 'Start every day with purpose',
    emoji: '🌅',
    color: '#FF9500',
    filter: (habit) => 
      habit.name.toLowerCase().includes('morning') ||
      habit.tags.some(t => t.toLowerCase().includes('morning')) ||
      !!habit.description?.toLowerCase().includes('start your day'),
    sortBy: 'saves',
  },
  {
    id: 'collection-beginner',
    name: 'Beginner Friendly',
    description: 'Perfect starting points for new habits',
    emoji: '🌱',
    color: '#34C759',
    filter: (habit) => habit.difficulty === 'Easy',
    sortBy: 'saves',
  },
  {
    id: 'collection-science',
    name: 'Science-Backed',
    description: 'Proven by research and studies',
    emoji: '🔬',
    color: '#5856D6',
    filter: (habit) => 
      !!habit.scientificBacking || 
      !!habit.description?.toLowerCase().includes('research') ||
      !!habit.description?.toLowerCase().includes('study'),
    sortBy: 'saves',
  },
  {
    id: 'collection-trending',
    name: 'Trending Now',
    description: 'Most popular this week',
    emoji: '🔥',
    color: '#FF2D55',
    filter: (habit) => habit.trending === true,
    sortBy: 'trending',
  },
  {
    id: 'collection-mental-health',
    name: 'Mental Wellness',
    description: 'Habits for a healthier mind',
    emoji: '🧠',
    color: '#5AC8FA',
    filter: (habit) => 
      habit.category === 'Mindfulness' ||
      habit.tags.some(t => 
        t.toLowerCase().includes('mental') ||
        t.toLowerCase().includes('anxiety') ||
        t.toLowerCase().includes('stress')
      ),
    sortBy: 'saves',
  },
  {
    id: 'collection-no-equipment',
    name: 'No Equipment Needed',
    description: 'Build habits anywhere, anytime',
    emoji: '🏠',
    color: '#00C7BE',
    filter: (habit) => 
      !habit.equipment || 
      habit.equipment.length === 0 ||
      habit.equipment.every(e => 
        e.toLowerCase().includes('none') ||
        e.toLowerCase().includes('nothing') ||
        e.toLowerCase().includes('optional')
      ),
    sortBy: 'saves',
  },
];

export const getCollectionHabits = (collection: CuratedCollection): CommunityHabit[] => {
  let habits = COMMUNITY_HABITS.filter(collection.filter);
  
  switch (collection.sortBy) {
    case 'saves':
      habits = habits.sort((a, b) => b.saves - a.saves);
      break;
    case 'likes':
      habits = habits.sort((a, b) => b.likes - a.likes);
      break;
    case 'trending':
      habits = habits.sort((a, b) => {
        if (a.trending && !b.trending) return -1;
        if (!a.trending && b.trending) return 1;
        return b.saves - a.saves;
      });
      break;
    case 'difficulty':
      const diffOrder = { 'Easy': 0, 'Medium': 1, 'Hard': 2 };
      habits = habits.sort((a, b) => 
        (diffOrder[a.difficulty || 'Medium'] || 1) - (diffOrder[b.difficulty || 'Medium'] || 1)
      );
      break;
  }
  
  return habits;
};

export const getBundleHabits = (bundle: HabitBundle): CommunityHabit[] => {
  return bundle.habitIds
    .map(id => COMMUNITY_HABITS.find(h => h.id === id))
    .filter((h): h is CommunityHabit => h !== undefined);
};

export const getForYouRecommendations = (
  userHabits: { category?: string; tags?: string[] }[],
  savedHabitIds: string[]
): CommunityHabit[] => {
  const userCategories = new Set(userHabits.map(h => h.category).filter(Boolean));
  const userTags = new Set(userHabits.flatMap(h => h.tags || []));
  
  const categoryGaps = ['Fitness', 'Health', 'Mindfulness', 'Productivity', 'Learning', 'Creative']
    .filter(cat => !userCategories.has(cat));
  
  let recommendations: CommunityHabit[] = [];
  
  if (userCategories.size > 0) {
    const relatedHabits = COMMUNITY_HABITS.filter(h => 
      !savedHabitIds.includes(h.id) &&
      (userCategories.has(h.category) || h.tags.some(t => userTags.has(t)))
    ).sort((a, b) => b.saves - a.saves);
    
    recommendations.push(...relatedHabits.slice(0, 4));
  }
  
  if (categoryGaps.length > 0) {
    const gapFillers = COMMUNITY_HABITS.filter(h =>
      !savedHabitIds.includes(h.id) &&
      categoryGaps.includes(h.category) &&
      h.difficulty === 'Easy' &&
      !recommendations.some(r => r.id === h.id)
    ).sort((a, b) => b.saves - a.saves);
    
    recommendations.push(...gapFillers.slice(0, 3));
  }
  
  if (recommendations.length < 6) {
    const trending = COMMUNITY_HABITS.filter(h =>
      !savedHabitIds.includes(h.id) &&
      h.trending &&
      !recommendations.some(r => r.id === h.id)
    ).sort((a, b) => b.saves - a.saves);
    
    recommendations.push(...trending.slice(0, 6 - recommendations.length));
  }
  
  return recommendations.slice(0, 8);
};
