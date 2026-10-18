import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { UserProfile, UserTeam, UserCountry, Book, Chronotype, ChronotypeInfo, UserNationality } from '@/types/habit';
import { MAX_FOLLOWED_NATIONALITIES } from '@/constants/nationalTeams';
import { getChronotypeInfo } from '@/constants/chronotypes';
import { useAuth } from './useAuth';
import { getTeamIdFromName } from '@/utils/footballApi';
import { trpcClient } from '@/lib/trpc';
import { useSupabaseSync } from '@/utils/supabaseUserSync';
import { unifiedStorage } from '@/utils/unifiedStorage';
import { createDefaultUserProfile, seedDefaultUserProfile } from '@/utils/userProfileBootstrap';
import { resolveNationalTeamApiId } from '@/utils/nationalTeamApiIds';
import {
  canAddOptionalLeagueId,
  isWorldCupFamilyLeagueId,
  normalizeFavoriteLeagueIds,
} from '@/utils/footballLeagueFamily';
import {
  mergeProfilesFromCloud,
  reconcileProfileWithSession,
  type CloudPullPayload,
} from '@/utils/syncMerge';
import { sortMiddleTabsByUsage } from '@/utils/tabUsage';
import { profilePatchForInterestsUpdate } from '@/utils/onboardingProfileSave';
import {
  dataOwnedBySession,
  sanitizeUserProfileForSession,
} from '@/utils/accountIsolation';

const PROFILE_LOAD_TIMEOUT_MS = 12_000;

export const [UserProfileProvider, useUserProfile] = createContextHook(() => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const supabaseSync = useSupabaseSync(userId);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  /** Never treat a failed restore as a new, un-onboarded user. */
  const [profileRestoreError, setProfileRestoreError] = useState(false);
  const [teamLogos, setTeamLogos] = useState<Map<number, string>>(new Map());
  const logoFetchedRef = useRef<Set<number>>(new Set());
  const loadInFlightRef = useRef<string | null>(null);
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  /** Latest profile for synchronous merges — avoids back-to-back updateProfile clobbering fields. */
  const profileRef = useRef<UserProfile | null>(null);
  /** Serialize writes so rapid event updates cannot be persisted out of order. */
  const profileWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const profileMutationCountRef = useRef(0);
  const cloudRestorePendingUserRef = useRef<string | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const loadProfile = useCallback(async (userId: string, email: string, name: string) => {
    if (loadInFlightRef.current === userId && loadPromiseRef.current) {
      console.log('⏳ [Profile] Awaiting in-flight load for', userId);
      return loadPromiseRef.current;
    }
    loadInFlightRef.current = userId;
    setProfileRestoreError(false);
    const mutationCountAtStart = profileMutationCountRef.current;
    console.log('🔄 [Profile] Loading profile for user:', { userId, email, name, platform: Platform.OS });
    if (loadedUserIdRef.current !== userId) {
      setIsLoading(true);
    }

    const run = async () => {
    try {
      const storageKey = `@user_profile_${userId}`;
      console.log('📱 [Profile] Checking storage key:', storageKey, 'on platform:', Platform.OS);

      const stillActive = () => loadInFlightRef.current === userId;
      
      let stored: string | null = await unifiedStorage.getItem(storageKey);
      const hadLocalProfile = !!stored;
      let loadedFromSupabase = false;

      // A previously registered user's cloud profile may be the only remaining copy.
      // Do not expose a writable default account while restoring it.
      if (!hadLocalProfile) cloudRestorePendingUserRef.current = userId;

      if (!hadLocalProfile && userId && !userId.startsWith('guest_') && supabaseSync.loadFromCloud) {
        try {
          console.log('☁️ [Profile] Loading from Supabase...');
          const cloudData = await supabaseSync.loadFromCloud({ strictProfileRestore: true });
          if (!stillActive()) return;
          if (cloudData?.userProfile) {
            if (!dataOwnedBySession(userId, cloudData.userProfile.id)) {
              console.error('❌ [Profile] Supabase returned another user’s profile — ignored', {
                expected: userId,
                got: cloudData.userProfile.id,
              });
              throw new Error('Remote profile belongs to another account');
            } else {
              console.log('✅ [Profile] Loaded profile from Supabase');
              if (!stillActive()) return;
              stored = JSON.stringify(cloudData.userProfile);
              loadedFromSupabase = true;
              if (profileMutationCountRef.current !== mutationCountAtStart) {
                console.warn('[Profile] Cloud response arrived after local edits; retaining latest local state');
                return;
              }
              await unifiedStorage.setItem(storageKey, stored);
              cloudRestorePendingUserRef.current = null;
            }
          } else {
            cloudRestorePendingUserRef.current = null;
            console.log('📝 [Profile] No profile in Supabase yet');
          }
        } catch (cloudError) {
          console.warn('⚠️ [Profile] Cloud profile restore failed:', cloudError);
          // A previously onboarded account may have no local copy after reinstall.
          // Do not seed an un-onboarded profile or overwrite remote settings.
          throw new Error('Cloud profile restoration unavailable');
        }
      }

      if (!stored) {
        console.log('📦 [Profile] Local storage result:', 'No data');
      }
      
      if (stored) {
        console.log('✅ [Profile] Found existing profile');
        let parsedProfile = JSON.parse(stored) as UserProfile;
        if (!dataOwnedBySession(userId, parsedProfile.id)) {
          console.error('❌ [Profile] Storage contained another user’s profile — discarding', {
            expected: userId,
            got: parsedProfile.id,
          });
          await unifiedStorage.removeItem(storageKey).catch(() => {});
          parsedProfile = createDefaultUserProfile(userId, email, name);
          stored = JSON.stringify(parsedProfile);
          await unifiedStorage.setItem(storageKey, stored);
        }
        console.log('📊 [Profile] Parsed profile:', {
          platform: Platform.OS,
          source: loadedFromSupabase ? 'Supabase' : 'Local Storage',
          name: parsedProfile.name,
          favoriteTeamsCount: parsedProfile.favoriteTeams?.length || 0,
          favoriteTeams: parsedProfile.favoriteTeams?.map((t: UserTeam) => t.name) || []
        });

        const sessionReconciledProfile = reconcileProfileWithSession(parsedProfile, {
          userId,
          email,
          displayName: name,
        });
        const sessionReconciled =
          parsedProfile.id !== sessionReconciledProfile.id ||
          parsedProfile.email !== sessionReconciledProfile.email ||
          parsedProfile.name !== sessionReconciledProfile.name;

        const updatedProfile: UserProfile = {
          ...sessionReconciledProfile,
          interests: parsedProfile.interests || [],
          favoriteCountries: parsedProfile.favoriteCountries || [],
          favoriteLeagues: normalizeFavoriteLeagueIds(parsedProfile.favoriteLeagues || []),
          sportsFeedPrefs: {
            strictFollowing: parsedProfile.sportsFeedPrefs?.strictFollowing ?? false,
            includeFollowedLeagues: parsedProfile.sportsFeedPrefs?.includeFollowedLeagues ?? true,
            discoveryLevel: parsedProfile.sportsFeedPrefs?.discoveryLevel ?? 'med',
            prioritizeDomesticLeagues: parsedProfile.sportsFeedPrefs?.prioritizeDomesticLeagues ?? true,
            prioritizeNationalTeams: parsedProfile.sportsFeedPrefs?.prioritizeNationalTeams ?? true,
          },
          notificationSettings: {
            liveMatches: parsedProfile.notificationSettings?.liveMatches ?? true,
            matchReminders: parsedProfile.notificationSettings?.matchReminders ?? true,
            goalAlerts: parsedProfile.notificationSettings?.goalAlerts ?? true,
            habitReminders: parsedProfile.notificationSettings?.habitReminders ?? true,
            habitRiskAlerts: parsedProfile.notificationSettings?.habitRiskAlerts ?? true,
            quietHoursEnabled: parsedProfile.notificationSettings?.quietHoursEnabled ?? true,
            quietHoursStart: parsedProfile.notificationSettings?.quietHoursStart || '22:30',
            quietHoursEnd: parsedProfile.notificationSettings?.quietHoursEnd || '07:00',
            eventReminderLeadMinutes: parsedProfile.notificationSettings?.eventReminderLeadMinutes ?? 30,
          },
        };
        if (!stillActive()) return;
        if (profileMutationCountRef.current !== mutationCountAtStart) return;
        profileRef.current = updatedProfile;
        cloudRestorePendingUserRef.current = null;
        setProfile(updatedProfile);
        console.log('✅ [Profile] Profile loaded successfully on', Platform.OS, ':', updatedProfile.name, 'Teams:', updatedProfile.favoriteTeams?.length, 'Source:', loadedFromSupabase ? 'Supabase' : 'Local');
        if (sessionReconciled) {
          console.log('📝 [Profile] Reconciled stored profile with session (id/email/name)');
          try {
            await unifiedStorage.setItem(storageKey, JSON.stringify(updatedProfile));
            if (userId && supabaseSync.saveToCloud) {
              void supabaseSync.saveToCloud({ userProfile: updatedProfile }).catch((syncErr) => {
                console.log('⚠️ [Profile] Failed to persist reconciled profile:', syncErr);
              });
            }
          } catch (syncErr) {
            console.log('⚠️ [Profile] Failed to persist reconciled profile:', syncErr);
          }
        }

        if (!parsedProfile.interests || !parsedProfile.favoriteCountries) {
          await unifiedStorage.setItem(storageKey, JSON.stringify(updatedProfile));
          console.log('📝 [Profile] Updated profile with new fields');
          
          if (!loadedFromSupabase && userId && supabaseSync.saveToCloud) {
            void supabaseSync.saveToCloud({ userProfile: updatedProfile }).catch((syncError) => {
              console.log('⚠️ [Profile] Failed to sync to Supabase:', syncError);
            });
          }
        }
        loadedUserIdRef.current = userId;
      } else if (!hadLocalProfile) {
        const seeded = createDefaultUserProfile(userId, email, name);
        if (!stillActive() || profileMutationCountRef.current !== mutationCountAtStart) return;
        profileRef.current = seeded;
        setProfile(seeded);
        await unifiedStorage.setItem(storageKey, JSON.stringify(seeded)).catch(() => {});
        if (cloudRestorePendingUserRef.current !== userId) {
          void supabaseSync.saveToCloud?.({ userProfile: seeded }).catch(() => {});
        }
        loadedUserIdRef.current = userId;
      }
    } catch (error) {
      console.error('❌ [Profile] Error loading user profile on', Platform.OS, ':', error);
      setProfileRestoreError(true);
      if (loadInFlightRef.current === userId && !profileRef.current) {
        // An unreadable local profile is not evidence of an empty account.
        // Show a temporary fallback without overwriting storage or cloud.
        const fallback = createDefaultUserProfile(userId, email, name);
        cloudRestorePendingUserRef.current = userId;
        profileRef.current = fallback;
        setProfile(fallback);
      }
      console.warn('[Profile] Keeping stored profile intact after failed load');
    }
    };

    const loadPromise = (async () => {
      try {
        await Promise.race([
          run(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Profile load timed out')), PROFILE_LOAD_TIMEOUT_MS),
          ),
        ]);
      } catch (timeoutErr) {
        console.warn('⚠️ [Profile] Load timed out; keeping stored data intact:', timeoutErr);
        setProfileRestoreError(true);
        // Invalidate the late cloud/storage response so it cannot overwrite edits.
        if (loadInFlightRef.current === userId) loadInFlightRef.current = null;
        if (!profileRef.current || profileRef.current.id !== userId) {
          // Display-only fallback. Never replace the on-disk profile on timeout.
          const fallback = createDefaultUserProfile(userId, email, name);
          profileRef.current = fallback;
          setProfile(fallback);
        }
      } finally {
        if (loadInFlightRef.current === userId) {
          loadInFlightRef.current = null;
        }
        loadPromiseRef.current = null;
        setIsLoading(false);
        console.log('✅ [Profile] Profile loading complete, platform:', Platform.OS);
      }
    })();

    loadPromiseRef.current = loadPromise;
    return loadPromise;
  }, [supabaseSync]);

  useEffect(() => {
    console.log('🔄 Profile loading effect triggered:', {
      platform: Platform.OS,
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    });
    
    if (isAuthenticated && user) {
      if (loadedUserIdRef.current !== user.id) {
        profileRef.current = null;
        setProfile(null);
        setIsLoading(true);
      }
      console.log('✅ Loading profile for authenticated user:', user.email, 'on', Platform.OS);
      loadProfile(user.id, user.email, user.name);
    } else {
      console.log('❌ No authenticated user, clearing profile');
      profileRef.current = null;
      setProfileRestoreError(false);
      cloudRestorePendingUserRef.current = null;
      setProfile(null);
      loadedUserIdRef.current = null;
      loadInFlightRef.current = null;
      setIsLoading(false);
    }
  }, [user?.id, user?.email, user?.name, isAuthenticated, loadProfile]);

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

    const timer = setTimeout(() => {
      let needsUpdate = false;
      const updatedNationalities = profile.nationalities!.map((nation) => {
        const correctId = resolveNationalTeamApiId(nation);
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
      
      const logos = new Map<number, string>();

      try {
        const result = await trpcClient.football.getTeamLogos.query({ teamIds });
        Object.entries(result.logos).forEach(([id, logo]) => {
          logos.set(Number(id), logo as string);
        });
      } catch (error) {
        console.log('⚠️ tRPC logo fetch failed, using CDN fallback:', error);
        teamIds.forEach(id => {
          logos.set(id, `https://media.api-sports.io/football/teams/${id}.png`);
        });
      }

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
            .catch((saveError) => {
              console.error('Error saving team logos:', saveError);
            });
        }
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

  const saveProfile = async (newProfile: UserProfile): Promise<void> => {
    if (!user) return;
    if (!dataOwnedBySession(user.id, newProfile.id)) {
      throw new Error('Cannot save a profile belonging to a different account.');
    }
    const ownerId = user.id;
    const toSave: UserProfile = {
      ...sanitizeUserProfileForSession(ownerId, newProfile),
      id: ownerId,
      email: user.email,
    };

    // Publish the state immediately. Other operations use profileRef to see
    // the latest savedEvents, even before React has committed a render.
    profileMutationCountRef.current += 1;
    profileRef.current = toSave;
    setProfile(toSave);

    const persist = async () => {
      const storageKey = `@user_profile_${ownerId}`;
      await unifiedStorage.setItem(storageKey, JSON.stringify(toSave));
      // Cloud sync is best effort; failure must not undo an on-device save.
      if (cloudRestorePendingUserRef.current !== ownerId && supabaseSync.saveToCloud) {
        try {
          await supabaseSync.saveToCloud({ userProfile: toSave });
        } catch (error) {
          console.warn('[Profile] Cloud sync unavailable; local changes kept:', error);
        }
      }
    };
    const queued = profileWriteQueueRef.current.then(persist, persist);
    // Keep the queue reusable even after an individual storage failure.
    profileWriteQueueRef.current = queued.catch(() => {});
    try {
      await queued;
      setProfileSaveError(null);
    } catch (error) {
      setProfileSaveError('Some changes could not be saved to this device. Check storage and try again.');
      throw error;
    }
  };

  const updateProfile = (updates: Partial<UserProfile> | ((current: UserProfile) => Partial<UserProfile>)): Promise<void> => {
    const current = profileRef.current ?? profile;
    if (!current || !user?.id) return Promise.resolve();
    if (!dataOwnedBySession(user.id, current.id)) {
      return Promise.reject(new Error('Cannot update a profile belonging to another account.'));
    }
    // Functional patches are evaluated against the latest in-memory profile,
    // not a closure holding an older savedEvents array.
    const patch = typeof updates === 'function' ? updates(current) : updates;
    const updatedProfile = { ...current, ...patch, id: user.id, email: user.email };
    const save = saveProfile(updatedProfile);
    // Many profile setters are intentionally fire-and-forget. Install a handler
    // without swallowing errors from callers that explicitly await the save.
    void save.catch((error) => console.error('[Profile] Failed to persist update:', error));
    return save;
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
    if (!profile) return;
    if (isWorldCupFamilyLeagueId(leagueId)) {
      if (profile.favoriteLeagues.includes(leagueId)) return;
      updateProfile({
        favoriteLeagues: normalizeFavoriteLeagueIds([...profile.favoriteLeagues, leagueId]),
      });
      return;
    }
    if (!canAddOptionalLeagueId(profile.favoriteLeagues, leagueId)) return;
    updateProfile({
      favoriteLeagues: normalizeFavoriteLeagueIds([...profile.favoriteLeagues, leagueId]),
    });
  };

  const removeFavoriteLeague = (leagueId: number) => {
    if (!profile) return;
    if (isWorldCupFamilyLeagueId(leagueId)) return;
    const updatedLeagues = profile.favoriteLeagues.filter((id) => id !== leagueId);
    updateProfile({ favoriteLeagues: normalizeFavoriteLeagueIds(updatedLeagues) });
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

  const addNationality = (nationality: UserNationality) => {
    if (!profile) return;
    const current = profile.nationalities ?? [];
    if (current.some((n) => n.id === nationality.id)) return;
    if (current.length >= MAX_FOLLOWED_NATIONALITIES) return;
    updateProfile({ nationalities: [...current, nationality] });
  };

  const removeNationality = (nationalityId: string) => {
    if (!profile?.nationalities?.length) return;
    updateProfile({
      nationalities: profile.nationalities.filter((n) => n.id !== nationalityId),
    });
  };

  const setNationalities = (nationalities: UserNationality[]) => {
    if (!profile) return;
    updateProfile({ nationalities: nationalities.slice(0, MAX_FOLLOWED_NATIONALITIES) });
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

  const completeOnboarding = async (): Promise<void> => {
    if (isLoading || profileRestoreError) {
      throw new Error('Wait for your saved profile to finish loading.');
    }
    if (!profile) {
      if (!user) throw new Error('Sign in before completing onboarding.');
      await saveProfile({
        ...createDefaultUserProfile(user.id, user.email, user.name),
        onboardingCompleted: true,
      });
      return;
    }
    await updateProfile({ onboardingCompleted: true });
  };

  const retryLoadProfile = async (): Promise<void> => {
    if (!user?.id) return;
    setProfileRestoreError(false);
    setIsLoading(true);
    profileRef.current = null;
    setProfile(null);
    loadedUserIdRef.current = null;
    await loadProfile(user.id, user.email, user.name);
  };

  const resetOnboarding = () => {
    const baseProfile =
      profile || createDefaultUserProfile(userId || '', user?.email || '', user?.name || '');
    void saveProfile({
      ...baseProfile,
      onboardingCompleted: false,
      interests: [],
      favoriteTeams: [],
      favoriteCountries: [],
      nationalities: undefined,
      tabOrder: undefined,
    }).catch((error) => console.warn('[Profile] Could not reset onboarding:', error));
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
    updateProfile(profilePatchForInterestsUpdate(interests));
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
    const visitCounts = profile?.tabVisitCounts;

    const sortTabs = (tabs: string[]): string[] =>
      sortMiddleTabsByUsage(tabs, visitCounts, canonicalOrder);

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
      'nba': ['sports'],
      'fitness': ['discover', 'tasks'],
      'movies': ['shows'],
      'cooking': ['cooking'],

      'learning': ['tasks'],

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
      return [...orderedTabs, ...sortTabs(newTabs).filter((tab) => newTabs.includes(tab))];
    }

    return sortTabs(enabledTabsArray);
  };

  /** Batch tab usage into one delayed profile write, never per navigation tap. */
  const recordTabVisits = useCallback((visitDeltas: Record<string, number>) => {
    const valid = Object.entries(visitDeltas).filter(
      ([tab, count]) => tab !== 'activities' && tab !== 'profile' &&
        Number.isInteger(count) && count > 0,
    );
    if (!valid.length || !profileRef.current) return;
    void updateProfile(current => {
      const counts = { ...(current.tabVisitCounts ?? {}) };
      for (const [tab, delta] of valid) counts[tab] = (counts[tab] ?? 0) + delta;
      return { tabVisitCounts: counts };
    });
  }, [updateProfile]);

  const recordTabVisit = useCallback((tabName: string) => {
    recordTabVisits({ [tabName]: 1 });
  }, [recordTabVisits]);

  const updateTabOrder = (newOrder: string[]) => {
    updateProfile({ tabOrder: newOrder });
  };

  const resetTabOrder = () => {
    updateProfile({ tabOrder: undefined });
  };

  const mergeProfileFromCloud = useCallback(
    async (cloudPayload: CloudPullPayload['userProfile']): Promise<boolean> => {
      if (!user || !cloudPayload || typeof cloudPayload !== 'object') return false;
      const displayName =
        user.name?.trim() ||
        profile?.name?.trim() ||
        (user.email ? user.email.split('@')[0] : '') ||
        'there';
      const localProfile = profileRef.current ?? profile;
      const merged = mergeProfilesFromCloud(localProfile, cloudPayload as UserProfile, {
        userId: user.id,
        email: user.email,
        displayName,
      });
      if (!merged) return false;
      await saveProfile(merged);
      return true;
    },
    [user, profile, saveProfile]
  );

  return {
    profile,
    isLoading,
    profileRestoreError,
    retryLoadProfile,
    profileSaveError,
    updateProfile,
    addFavoriteTeam,
    removeFavoriteTeam,
    addFavoriteLeague,
    removeFavoriteLeague,
    addFavoriteCountry,
    removeFavoriteCountry,
    addNationality,
    removeNationality,
    setNationalities,
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
    recordTabVisit,
    recordTabVisits,
    updateTabOrder,
    resetTabOrder,
    getTeamLogo,
    teamLogos,
    mergeProfileFromCloud,
  };
});
