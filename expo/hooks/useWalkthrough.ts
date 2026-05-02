import { useState, useEffect, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';

const WALKTHROUGH_KEY = '@tab_walkthroughs_seen';

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface TabWalkthroughData {
  tabName: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  steps: WalkthroughStep[];
  accentColor: string;
}

const TAB_WALKTHROUGHS: Record<string, TabWalkthroughData> = {
  activities: {
    tabName: 'activities',
    welcomeTitle: 'Your Daily Overview',
    welcomeSubtitle: 'Everything happening today, at a glance',
    accentColor: '#007AFF',
    steps: [
      {
        id: 'activities-1',
        title: 'Unified Timeline',
        description: 'See your habits, tasks, calendar events, and sports scores all in one place.',
        icon: 'timeline',
      },
      {
        id: 'activities-2',
        title: 'Weather & Context',
        description: 'Get weather updates and smart suggestions based on your schedule.',
        icon: 'weather',
      },
      {
        id: 'activities-3',
        title: 'Quick Actions',
        description: 'Tap cards to complete habits, check off tasks, or dive into details.',
        icon: 'action',
      },
    ],
  },
  shows: {
    tabName: 'shows',
    welcomeTitle: 'Movies & TV',
    welcomeSubtitle: 'Track what you watch and discover new favorites',
    accentColor: '#FF4444',
    steps: [
      {
        id: 'shows-1',
        title: 'Track Your Watchlist',
        description: 'Add shows and movies to your personal collection with a single tap.',
        icon: 'watchlist',
      },
      {
        id: 'shows-2',
        title: 'Discover Trending',
        description: 'Browse what\'s popular and get personalised recommendations.',
        icon: 'trending',
      },
      {
        id: 'shows-3',
        title: 'Search & Filter',
        description: 'Find any title instantly with powerful search and genre filters.',
        icon: 'search',
      },
    ],
  },
  sports: {
    tabName: 'sports',
    welcomeTitle: 'Live Sports',
    welcomeSubtitle: 'Follow your favourite teams and leagues',
    accentColor: '#FF9500',
    steps: [
      {
        id: 'sports-1',
        title: 'Live Scores',
        description: 'Real-time scores and match updates from leagues around the world.',
        icon: 'live',
      },
      {
        id: 'sports-2',
        title: 'Favourite Teams',
        description: 'Pin your teams for quick access to their upcoming and live matches.',
        icon: 'favorite',
      },
      {
        id: 'sports-3',
        title: 'Match Details',
        description: 'Tap any match to see lineups, stats, events, and standings.',
        icon: 'details',
      },
    ],
  },
  tasks: {
    tabName: 'tasks',
    welcomeTitle: 'Tasks & Focus',
    welcomeSubtitle: 'Stay productive with smart task management',
    accentColor: '#34C759',
    steps: [
      {
        id: 'tasks-1',
        title: 'Organise Your Day',
        description: 'Create tasks with priorities, categories, and due dates.',
        icon: 'organize',
      },
      {
        id: 'tasks-2',
        title: 'Focus Timer',
        description: 'Use the built-in Pomodoro timer to stay in flow and track deep work.',
        icon: 'timer',
      },
      {
        id: 'tasks-3',
        title: 'Swipe to Complete',
        description: 'Swipe tasks to mark them done, snooze, or delete them quickly.',
        icon: 'swipe',
      },
    ],
  },
  discover: {
    tabName: 'discover',
    welcomeTitle: 'Discover',
    welcomeSubtitle: 'Explore habits, routines, and new ideas',
    accentColor: '#5856D6',
    steps: [
      {
        id: 'discover-1',
        title: 'Browse Templates',
        description: 'Find pre-built habits and routines that match your goals.',
        icon: 'browse',
      },
      {
        id: 'discover-2',
        title: 'Personalised For You',
        description: 'Recommendations based on your interests and activity patterns.',
        icon: 'personalized',
      },
      {
        id: 'discover-3',
        title: 'Quick Add',
        description: 'Add any suggestion to your daily routine with a single tap.',
        icon: 'add',
      },
    ],
  },
  profile: {
    tabName: 'profile',
    welcomeTitle: 'Your Profile',
    welcomeSubtitle: 'Settings, stats, and personalisation',
    accentColor: '#AF52DE',
    steps: [
      {
        id: 'profile-1',
        title: 'Your Stats',
        description: 'See your streaks, completion rates, and progress over time.',
        icon: 'stats',
      },
      {
        id: 'profile-2',
        title: 'Customise Experience',
        description: 'Set your themes, notifications, and display preferences.',
        icon: 'customize',
      },
      {
        id: 'profile-3',
        title: 'Sync & Backup',
        description: 'Keep your data safe with cloud sync across all your devices.',
        icon: 'sync',
      },
    ],
  },
};

export const [WalkthroughProvider, useWalkthrough] = createContextHook(() => {
  const { user } = useAuth();
  const scopedKey = `${WALKTHROUGH_KEY}_${user?.id || 'guest'}`;
  const [seenTabs, setSeenTabs] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        let stored = await AsyncStorage.getItem(scopedKey);
        if (!stored) {
          const legacy = await AsyncStorage.getItem(WALKTHROUGH_KEY);
          if (legacy) {
            stored = legacy;
            await AsyncStorage.setItem(scopedKey, legacy);
          }
        }
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          setSeenTabs(new Set(parsed));
        } else {
          setSeenTabs(new Set());
        }
      } catch (e) {
        console.log('[Walkthrough] Failed to load seen tabs:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    void load();
  }, [scopedKey]);

  const markTabSeen = useCallback(async (tabName: string) => {
    setSeenTabs((prev) => {
      const next = new Set(prev);
      next.add(tabName);
      AsyncStorage.setItem(scopedKey, JSON.stringify([...next])).catch((e) =>
        console.log('[Walkthrough] Failed to save:', e)
      );
      return next;
    });
  }, [scopedKey]);

  const shouldShowWalkthrough = useCallback(
    (tabName: string): boolean => {
      if (!isLoaded) return false;
      return !seenTabs.has(tabName);
    },
    [seenTabs, isLoaded]
  );

  const getWalkthroughData = useCallback((tabName: string): TabWalkthroughData | null => {
    return TAB_WALKTHROUGHS[tabName] ?? null;
  }, []);

  const resetAllWalkthroughs = useCallback(async () => {
    setSeenTabs(new Set());
    await AsyncStorage.removeItem(scopedKey).catch(() => {});
  }, [scopedKey]);

  return {
    seenTabs,
    isLoaded,
    markTabSeen,
    shouldShowWalkthrough,
    getWalkthroughData,
    resetAllWalkthroughs,
  };
});
