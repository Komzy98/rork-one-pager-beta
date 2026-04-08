import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { UserProfile, UserTeam, UserCountry, Book, Chronotype, ChronotypeInfo } from '@/types/habit';
import { getChronotypeInfo } from '@/constants/chronotypes';
import { useAuth } from './useAuth';
import { getTeamIdFromName, footballApi } from '@/utils/footballApi';
import { useFirebaseSync } from '@/utils/firebaseUserSync';
import { unifiedStorage } from '@/utils/unifiedStorage';

const createDefaultProfile = (userId: string, email: string, name: string): UserProfile => {
  return {
    id: userId,
    email,
    name,
    favoriteTeams: [],
    favoriteCountries: [],
    favoriteLeagues: [],
    favoriteBooks: [],
    interests: [],
    notificationSettings: {
      liveMatches: true,
      matchReminders: true,
      goalAlerts: true,
      habitReminders: true,
    },
    displayPreferences: {
      showOnlyFavorites: false,
      timeFormat: '12h' as const,
      theme: 'auto' as const
    },
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };
};

export const [UserProfileProvider, useUserProfile] = createContextHook(() => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const firebaseSync = useFirebaseSync(userId);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [teamLogos, setTeamLogos] = useState<Map<number, string>>(new Map());
  const logoFetchedRef = useRef<Set<number>>(new Set());

  const loadProfile = useCallback(async (userId: string, email: string, name: string) => {
    console.log('🔄 [Profile] Loading profile for user:', { userId, email, name, platform: Platform.OS });
    setIsLoading(true);
    
    try {
      const storageKey = `@user_profile_${userId}`;
      console.log('📱 [Profile] Checking storage key:', storageKey, 'on platform:', Platform.OS);
      
      let stored: string | null = null;
      let loadedFromFirebase = false;
      
      if (userId && firebaseSync.loadFromFirebase) {
        try {
          console.log('☁️ [Profile] Loading from Firebase...');
          const firebaseData = await firebaseSync.loadFromFirebase();
          if (firebaseData?.userProfile) {
            console.log('✅ [Profile] Loaded profile from Firebase');
            stored = JSON.stringify(firebaseData.userProfile);
            loadedFromFirebase = true;
            await unifiedStorage.setItem(storageKey, stored);
          } else {
            console.log('📝 [Profile] No profile in Firebase yet');
          }
        } catch (firebaseError) {
          console.log('⚠️ [Profile] Firebase load failed, falling back to local storage:', firebaseError);
        }
      }
      
      if (!stored) {
        stored = await unifiedStorage.getItem(storageKey);
        console.log('📦 [Profile] Local storage result:', stored ? 'Found data' : 'No data', 'Length:', stored?.length || 0);
      }
      
      if (stored) {
        console.log('✅ [Profile] Found existing profile');
        const parsedProfile = JSON.parse(stored);
        console.log('📊 [Profile] Parsed profile:', {
          platform: Platform.OS,
          source: loadedFromFirebase ? 'Firebase' : 'Local Storage',
          name: parsedProfile.name,
          favoriteTeamsCount: parsedProfile.favoriteTeams?.length || 0,
          favoriteTeams: parsedProfile.favoriteTeams?.map((t: UserTeam) => t.name) || []
        });
        
        const updatedProfile = {
          ...parsedProfile,
          interests: parsedProfile.interests || [],

          favoriteCountries: parsedProfile.favoriteCountries || []
        };
        setProfile(updatedProfile);
        console.log('✅ [Profile] Profile loaded successfully on', Platform.OS, ':', updatedProfile.name, 'Teams:', updatedProfile.favoriteTeams?.length, 'Source:', loadedFromFirebase ? 'Firebase' : 'Local');
        
        if (!parsedProfile.interests || !parsedProfile.favoriteCountries) {
          await unifiedStorage.setItem(storageKey, JSON.stringify(updatedProfile));
          console.log('📝 [Profile] Updated profile with new fields');
          
          if (!loadedFromFirebase && userId && firebaseSync.saveToFirebase) {
            try {
              await firebaseSync.saveToFirebase({ userProfile: updatedProfile });
              console.log('☁️ [Profile] Synced updated profile to Firebase');
            } catch (syncError) {
              console.log('⚠️ [Profile] Failed to sync to Firebase:', syncError);
            }
          }
        }
      } else {
        console.log('🆕 [Profile] Creating new profile for user on', Platform.OS);
        const newProfile = createDefaultProfile(userId, email, name);
        await unifiedStorage.setItem(storageKey, JSON.stringify(newProfile));
        setProfile(newProfile);
        console.log('✅ [Profile] New profile created and saved on', Platform.OS, ':', newProfile.name, 'Teams:', newProfile.favoriteTeams?.length);
      }
    } catch (error) {
      console.error('❌ [Profile] Error loading user profile on', Platform.OS, ':', error);
      const defaultProfile = createDefaultProfile(userId, email, name);
      setProfile(defaultProfile);
      console.log('🔄 [Profile] Using fallback default profile on', Platform.OS);
    } finally {
      setIsLoading(false);
      console.log('✅ [Profile] Profile loading complete, platform:', Platform.OS);
    }
  }, [firebaseSync]);

  useEffect(() => {
    console.log('🔄 Profile loading effect triggered:', {
      platform: Platform.OS,
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    });
    
    if (isAuthenticated && user) {
      console.log('✅ Loading profile for authenticated user:', user.email, 'on', Platform.OS);
      loadProfile(user.id, user.email, user.name);
    } else {
      console.log('❌ No authenticated user, clearing profile');
      setProfile(null);
      setIsLoading(false);
    }
  }, [user, isAuthenticated, loadProfile]);

  useEffect(() => {
    if (!profile?.favoriteTeams || !user) return;
    
    const timer = setTimeout(() => {
      let needsUpdate = false;
      let updatedTeams = [...profile.favoriteTeams];
      
      const uniqueTeams: UserTeam[] = [];
      const seenNames = new Set<string>();
      const seenIds = new Set<string>();
      
      for (const team of updatedTeams) {
        const normalizedName = team.name.toLowerCase();
        if (!seenIds.has(team.id) && !seenNames.has(normalizedName)) {
          uniqueTeams.push(team);
          seenIds.add(team.id);
          seenNames.add(normalizedName);
        } else {
          needsUpdate = true;
        }
      }
      
      const teamsWithApiIds = uniqueTeams.map(team => {
        if (!team.apiId) {
          const apiId = getTeamIdFromName(team.name);
          if (apiId) {
            needsUpdate = true;
            return { ...team, apiId };
          }
        }
        return team;
      });
      
      if (needsUpdate) {
        const updatedProfile = { ...profile, favoriteTeams: teamsWithApiIds };
        const storageKey = `@user_profile_${user.id}`;
        
        unifiedStorage.setItem(storageKey, JSON.stringify(updatedProfile))
          .then(() => {
            setProfile(updatedProfile);
          })
          .catch((error) => {
            console.error('Error saving updated profile:', error);
          });
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [profile?.favoriteTeams?.length, user?.id]);

  useEffect(() => {
    if (!profile?.nationalities || !user || profile.nationalities.length === 0) return;
    
    const CORRECT_NATIONAL_TEAM_IDS: Record<string, number> = {
      'nigeria': 1118,
      'cameroon': 1116,
      'egypt': 1536,
      'ghana': 842,
      'ivory-coast': 846,
      'morocco': 1519,
      'senegal': 1544,
      'tunisia': 27,
      'south-africa': 15,
      'mali': 1048,
      'algeria': 1530,
      'england': 10,
      'france': 2,
      'germany': 25,
      'spain': 9,
      'italy': 768,
      'brazil': 6,
      'argentina': 26,
      'portugal': 27,
      'netherlands': 1118,
      'belgium': 1,
      'croatia': 3,
      'uruguay': 7,
      'mexico': 16,
      'japan': 12,
      'south-korea': 17,
      'australia': 20,
    };
    
    const timer = setTimeout(() => {
      let needsUpdate = false;
      const updatedNationalities = profile.nationalities!.map(nation => {
        const correctId = CORRECT_NATIONAL_TEAM_IDS[nation.id];
        if (correctId && nation.apiId !== correctId) {
          console.log(`🔄 Fixing ${nation.name} API ID: ${nation.apiId} -> ${correctId}`);
          needsUpdate = true;
          return { ...nation, apiId: correctId };
        }
        return nation;
      });
      
      if (needsUpdate) {
        const updatedProfile = { ...profile, nationalities: updatedNationalities };
        const storageKey = `@user_profile_${user.id}`;
        
        unifiedStorage.setItem(storageKey, JSON.stringify(updatedProfile))
          .then(() => {
            setProfile(updatedProfile);
            console.log('✅ National team API IDs updated');
          })
          .catch((error) => {
            console.error('Error updating nationality API IDs:', error);
          });
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [profile?.nationalities?.length, user?.id]);

  useEffect(() => {
    if (!profile?.favoriteTeams || profile.favoriteTeams.length === 0) return;
    
    const fetchMissingLogos = async () => {
      const teamsNeedingLogos = profile.favoriteTeams.filter(team => {
        return team.apiId && !team.logo && !logoFetchedRef.current.has(team.apiId);
      });
      
      if (teamsNeedingLogos.length === 0) return;
      
      console.log('🏆 Fetching logos for teams:', teamsNeedingLogos.map(t => t.name));
      
      const teamIds = teamsNeedingLogos
        .map(t => t.apiId)
        .filter((id): id is number => id !== undefined);
      
      teamIds.forEach(id => logoFetchedRef.current.add(id));
      
      try {
        const logos = await footballApi.getMultipleTeamLogos(teamIds);
        
        if (logos.size > 0) {
          setTeamLogos(prev => {
            const newLogos = new Map(prev);
            logos.forEach((logo, id) => newLogos.set(id, logo));
            return newLogos;
          });
          
          const updatedTeams = profile.favoriteTeams.map(team => {
            if (team.apiId && logos.has(team.apiId)) {
              return { ...team, logo: logos.get(team.apiId) };
            }
            return team;
          });
          
          const hasUpdates = updatedTeams.some((team, idx) => 
            team.logo !== profile.favoriteTeams[idx].logo
          );
          
          if (hasUpdates && user) {
            const updatedProfile = { ...profile, favoriteTeams: updatedTeams };
            const storageKey = `@user_profile_${user.id}`;
            
            unifiedStorage.setItem(storageKey, JSON.stringify(updatedProfile))
              .then(() => {
                setProfile(updatedProfile);
                console.log('✅ Team logos saved to profile');
              })
              .catch((error) => {
                console.error('Error saving team logos:', error);
              });
          }
        }
      } catch (error) {
        console.error('Error fetching team logos:', error);
      }
    };
    
    const timer = setTimeout(fetchMissingLogos, 2000);
    return () => clearTimeout(timer);
  }, [profile?.favoriteTeams, user?.id]);

  const getTeamLogo = useCallback((team: UserTeam): string | undefined => {
    if (team.logo) return team.logo;
    
    if (team.apiId && teamLogos.has(team.apiId)) {
      return teamLogos.get(team.apiId);
    }
    
    return undefined;
  }, [teamLogos]);

  const saveProfile = async (newProfile: UserProfile) => {
    if (!user) return;
    
    try {
      const storageKey = `@user_profile_${user.id}`;
      console.log('💾 [Profile] Saving profile:', {
        platform: Platform.OS,
        userId: user.id,
        favoriteTeamsCount: newProfile.favoriteTeams?.length || 0,
        favoriteTeams: newProfile.favoriteTeams?.map(t => t.name) || []
      });
      
      await unifiedStorage.setItem(storageKey, JSON.stringify(newProfile));
      console.log('✅ [Profile] Profile saved to storage on', Platform.OS);
      
      setProfile(newProfile);
      console.log('✅ [Profile] Profile state updated');
      
      if (userId && firebaseSync.saveToFirebase) {
        try {
          await firebaseSync.saveToFirebase({ userProfile: newProfile });
          console.log('✅ [Profile] User profile synced to Firebase');
        } catch (syncError) {
          console.warn('⚠️ [Profile] Firebase sync failed for user profile, data saved locally:', syncError);
        }
      }
    } catch (error) {
      console.error('❌ [Profile] Error saving user profile:', error);
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const updatedProfile = { ...profile, ...updates };
    saveProfile(updatedProfile);
  };

  const addFavoriteTeam = (team: UserTeam) => {
    if (!profile) return;
    
    const isDuplicate = profile.favoriteTeams.some(existing => 
      existing.id === team.id || 
      existing.name.toLowerCase() === team.name.toLowerCase()
    );
    
    if (isDuplicate) {
      return;
    }
    
    const teamWithApiId = {
      ...team,
      apiId: team.apiId || getTeamIdFromName(team.name)
    };
    
    const updatedTeams = [...profile.favoriteTeams, teamWithApiId];
    updateProfile({ favoriteTeams: updatedTeams });
  };

  const removeFavoriteTeam = (teamId: string) => {
    if (!profile) return;
    const updatedTeams = profile.favoriteTeams.filter(team => team.id !== teamId);
    updateProfile({ favoriteTeams: updatedTeams });
  };

  const addFavoriteLeague = (leagueId: number) => {
    if (!profile || profile.favoriteLeagues.includes(leagueId)) return;
    const updatedLeagues = [...profile.favoriteLeagues, leagueId];
    updateProfile({ favoriteLeagues: updatedLeagues });
  };

  const removeFavoriteLeague = (leagueId: number) => {
    if (!profile) return;
    const updatedLeagues = profile.favoriteLeagues.filter(id => id !== leagueId);
    updateProfile({ favoriteLeagues: updatedLeagues });
  };

  const addFavoriteCountry = (country: UserCountry) => {
    if (!profile || profile.favoriteCountries.some(c => c.id === country.id)) return;
    const updatedCountries = [...profile.favoriteCountries, country];
    updateProfile({ favoriteCountries: updatedCountries });
  };

  const removeFavoriteCountry = (countryId: string) => {
    if (!profile) return;
    const updatedCountries = profile.favoriteCountries.filter(c => c.id !== countryId);
    updateProfile({ favoriteCountries: updatedCountries });
  };

  const updateNotificationSettings = (settings: Partial<UserProfile['notificationSettings']>) => {
    if (!profile) return;
    updateProfile({
      notificationSettings: { ...profile.notificationSettings, ...settings }
    });
  };

  const updateDisplayPreferences = (preferences: Partial<UserProfile['displayPreferences']>) => {
    if (!profile) return;
    updateProfile({
      displayPreferences: { ...profile.displayPreferences, ...preferences }
    });
  };

  const addFavoriteBook = (book: Book) => {
    if (!profile) return;
    const updatedBooks = [...profile.favoriteBooks, book];
    updateProfile({ favoriteBooks: updatedBooks });
  };

  const removeFavoriteBook = (bookId: string) => {
    if (!profile) return;
    const updatedBooks = profile.favoriteBooks.filter(book => book.id !== bookId);
    updateProfile({ favoriteBooks: updatedBooks });
  };

  const updateBook = (bookId: string, updates: Partial<Book>) => {
    if (!profile) return;
    const updatedBooks = profile.favoriteBooks.map(book => 
      book.id === bookId ? { ...book, ...updates, updatedAt: new Date().toISOString() } : book
    );
    updateProfile({ favoriteBooks: updatedBooks });
  };

  const completeOnboarding = () => {
    updateProfile({ onboardingCompleted: true });
  };

  const resetOnboarding = () => {
    const baseProfile = profile || createDefaultProfile(userId || '', user?.email || '', user?.name || '');
    void saveProfile({
      ...baseProfile,
      onboardingCompleted: false,
      interests: [],
      favoriteTeams: [],
      favoriteCountries: [],
      nationalities: undefined,
      tabOrder: undefined,
    });
  };

  const isFavoriteTeam = (teamName: string): boolean => {
    if (!profile) return false;
    
    const matchTeamName = teamName.toLowerCase().trim();

    if (profile.nationalities && profile.nationalities.length > 0) {
      const isNationalTeamMatch = profile.nationalities.some(nation => {
        const nationName = nation.name.toLowerCase().trim();
        if (nationName === matchTeamName) return true;
        if (matchTeamName === nationName) return true;
        return false;
      });
      if (isNationalTeamMatch) return true;
    }

    if (!profile.favoriteTeams) return false;
    
    const result = profile.favoriteTeams.some(team => {
      const favoriteTeamName = team.name.toLowerCase().trim();
      
      if (favoriteTeamName === matchTeamName) {
        return true;
      }
      
      const teamVariations: Record<string, string[]> = {
        'manchester united': ['man united', 'man utd', 'manchester utd', 'mufc', 'manchester united fc'],
        'barcelona': ['fc barcelona', 'barca', 'barça', 'barcelona fc'],
        'real madrid': ['real madrid cf', 'rmcf'],
        'bayern munich': ['bayern', 'fc bayern', 'fc bayern munich', 'bayern münchen'],
        'paris saint-germain': ['psg', 'paris sg', 'paris saint germain'],
        'manchester city': ['man city', 'mcfc', 'manchester city fc'],
        'liverpool': ['lfc', 'liverpool fc'],
        'chelsea': ['chelsea fc', 'cfc'],
        'arsenal': ['arsenal fc', 'afc', 'the gunners'],
        'tottenham': ['tottenham hotspur', 'spurs', 'thfc', 'tottenham hotspur fc'],
        'atletico madrid': ['atletico', 'atleti', 'atletico de madrid'],
        'borussia dortmund': ['dortmund', 'bvb', 'bv borussia dortmund'],
        'juventus': ['juve', 'juventus fc', 'juventus turin'],
        'ac milan': ['acm'],
        'inter milan': ['inter', 'internazionale', 'fc internazionale milano']
      };
      
      for (const [mainName, variations] of Object.entries(teamVariations)) {
        const allVariations = [mainName, ...variations];
        
        if (allVariations.includes(favoriteTeamName)) {
          if (allVariations.includes(matchTeamName)) {
            return true;
          }
        }
      }
      
      return false;
    });
    
    return result;
  };

  const isFavoriteLeague = (leagueId: number): boolean => {
    if (!profile) return false;
    return profile.favoriteLeagues.includes(leagueId);
  };

  const updateInterests = (interests: string[]) => {
    updateProfile({ interests });
  };

  const updateChronotype = useCallback((chronotype: Chronotype) => {
    updateProfile({ chronotype });
  }, [updateProfile]);

  const getChronotype = useCallback((): ChronotypeInfo | undefined => {
    if (!profile?.chronotype) return undefined;
    return getChronotypeInfo(profile.chronotype);
  }, [profile?.chronotype]);

  const getPersonalizedTabs = (): string[] => {
    const canonicalOrder = ['activities', 'shows', 'sports', 'cooking', 'learning', 'events', 'tasks', 'discover', 'profile'];

    const sortTabs = (tabs: string[]): string[] => {
      const filtered = tabs.filter(t => t !== 'activities' && t !== 'profile');
      filtered.sort((a, b) => canonicalOrder.indexOf(a) - canonicalOrder.indexOf(b));
      return ['activities', ...filtered, 'profile'];
    };

    if (!profile || !profile.interests.length) {
      const defaultTabs = ['activities', 'tasks', 'discover', 'profile'];
      if (profile?.tabOrder && profile.tabOrder.length > 0) {
        return profile.tabOrder.filter(tab => defaultTabs.includes(tab));
      }
      return sortTabs(defaultTabs);
    }

    const tabMapping: Record<string, string[]> = {
      'football': ['sports'],
      'f1': ['sports'],
      'ufc': ['sports'],
      'fitness': ['habits', 'tasks'],
      'movies': ['shows'],
      'cooking': ['cooking'],

      'learning': ['learning', 'tasks'],

      'events': ['events'],
      'productivity': ['tasks'],
      'work': ['tasks'],
      'business': ['tasks']
    };

    const enabledTabs = new Set<string>();
    
    enabledTabs.add('activities');
    enabledTabs.add('profile');
    enabledTabs.add('discover');
    
    profile.interests.forEach(interest => {
      const tabs = tabMapping[interest] || [];
      tabs.forEach(tab => enabledTabs.add(tab));
    });

    if (profile.interests.some(interest => 
      ['fitness', 'productivity', 'work', 'learning'].includes(interest)
    )) {
      enabledTabs.add('tasks');
    }

    const enabledTabsArray = Array.from(enabledTabs);
    
    if (profile.tabOrder && profile.tabOrder.length > 0) {
      const orderedTabs = profile.tabOrder.filter(tab => enabledTabsArray.includes(tab));
      const newTabs = enabledTabsArray.filter(tab => !profile.tabOrder!.includes(tab));
      return [...orderedTabs, ...newTabs];
    }

    return sortTabs(enabledTabsArray);
  };

  const updateTabOrder = (newOrder: string[]) => {
    updateProfile({ tabOrder: newOrder });
  };

  const resetTabOrder = () => {
    updateProfile({ tabOrder: undefined });
  };

  return {
    profile,
    isLoading,
    updateProfile,
    addFavoriteTeam,
    removeFavoriteTeam,
    addFavoriteLeague,
    removeFavoriteLeague,
    addFavoriteCountry,
    removeFavoriteCountry,
    addFavoriteBook,
    removeFavoriteBook,
    updateBook,
    updateNotificationSettings,
    updateDisplayPreferences,
    updateInterests,
    updateChronotype,
    getChronotype,
    completeOnboarding,
    resetOnboarding,
    isFavoriteTeam,
    isFavoriteLeague,
    getPersonalizedTabs,
    updateTabOrder,
    resetTabOrder,
    getTeamLogo,
    teamLogos
  };
});
