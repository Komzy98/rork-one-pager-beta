import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Check, Search, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useApp } from '@/hooks/useHabitsStore';
import { useTasks } from '@/hooks/useTasksStore';
import OnboardingProgress from '@/components/OnboardingProgress';
import { useOnboardingStepMeta } from '@/hooks/useOnboardingStepMeta';
import { getQuickSetupFocus } from '@/utils/onboardingFlow';
import { ONBOARDING_EVENT_CATEGORIES } from '@/utils/onboardingEventCategories';
import { ONBOARDING_EVENT_CITIES, type OnboardingEventCity } from '@/utils/onboardingEventCities';
import { getPopularTeams, searchTeams, getFootballTeamLogoUrl } from '@/constants/footballData';
import { ALL_NATIONS } from '@/constants/nations';
import { ALL_NBA_TEAMS, searchNBATeams } from '@/constants/nbaData';
import { tmdbApi, type TMDBTVShow } from '@/utils/tmdbApi';
import type { NBAFavoriteTeam, UserNationality, UserTeam } from '@/types/habit';
import { COLORS } from '@/constants/colors';

const MAX_PICKS = 3;
const looksLikeTask = (v: string) => v.trim().length >= 3;

export default function QuickSetupScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useUserProfile();
  const { addShow, shows } = useApp();
  const { addTask, allTasks } = useTasks();
  const { currentStep, totalSteps } = useOnboardingStepMeta('quick-setup');
  const focus = returnTo === 'events' ? 'events' : getQuickSetupFocus(profile?.interests ?? []);
  const [query, setQuery] = useState('');
  const [clubIds, setClubIds] = useState<string[]>([]);
  const [countryIds, setCountryIds] = useState<string[]>([]);
  const [nbaIds, setNbaIds] = useState<string[]>([]);
  const [eventCategories, setEventCategories] = useState<string[]>([]);
  const [city, setCity] = useState<OnboardingEventCity | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [showResults, setShowResults] = useState<TMDBTVShow[]>([]);
  const [selectedShow, setSelectedShow] = useState<TMDBTVShow | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setClubIds(profile.favoriteTeams.map(t => t.id));
    setCountryIds((profile.nationalities ?? []).map(n => n.id));
    setNbaIds((profile.favoriteNBATeams ?? []).map(t => t.id));
    setEventCategories(profile.favoriteEventCategories ?? []);
    setCity(profile.preferredEventsCity ?? null);
  }, [profile?.id]); // Initialise only when the signed-in account changes.

  useEffect(() => {
    if (profile && !focus) router.replace('/(onboarding)/complete' as any);
  }, [focus, profile, router]);

  const clubs = useMemo(() => {
    return (query.trim() ? searchTeams(query.trim()) : getPopularTeams()).slice(0, 16);
  }, [query]);
  const nations = useMemo(() => {
    const priority = ['Nigeria', 'England', 'Scotland', 'Ghana', 'France', 'Spain'];
    const list = query.trim()
      ? ALL_NATIONS.filter(n => n.name.toLowerCase().includes(query.trim().toLowerCase()))
      : ALL_NATIONS.filter(n => priority.includes(n.name));
    return list.slice(0, 12);
  }, [query]);
  const nbaTeams = useMemo(() =>
    (query.trim() ? searchNBATeams(query.trim()) : ALL_NBA_TEAMS).slice(0, 14), [query]);

  const toggleLimited = (id: string, ids: string[], setter: (next: string[]) => void) => {
    void Haptics.selectionAsync();
    if (ids.includes(id)) setter(ids.filter(x => x !== id));
    else if (ids.length < MAX_PICKS) setter([...ids, id]);
  };

  const searchTV = useCallback(async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError(null);
    try {
      const response = await tmdbApi.searchTVShows(query.trim());
      setShowResults((response.results ?? []).slice(0, 8));
    } catch {
      setShowResults([]);
      setSearchError('Unable to search right now. You can add shows from the Shows tab.');
    } finally {
      setSearching(false);
    }
  }, [query]);

  const finish = useCallback(async (skip = false) => {
    if (saving) return;
    setSaving(true);
    try {
      if (!skip && focus === 'football') {
        const pool = [...getPopularTeams(), ...searchTeams('')];
        const teams: UserTeam[] = clubIds
          .map(id => pool.find(t => t.id === id) ?? profile?.favoriteTeams.find(t => t.id === id))
          .filter((t): t is UserTeam => Boolean(t));
        const nationalities: UserNationality[] = countryIds
          .map(id => ALL_NATIONS.find(n => n.id === id))
          .filter((n): n is (typeof ALL_NATIONS)[number] => Boolean(n))
          .map(({ id, name, code, flag, apiId }) => ({ id, name, code, flag, apiId }));
        await updateProfile({ favoriteTeams: teams, nationalities });
      } else if (!skip && focus === 'nba') {
        const teams: NBAFavoriteTeam[] = nbaIds
          .map(id => ALL_NBA_TEAMS.find(t => t.id === id))
          .filter((t): t is typeof ALL_NBA_TEAMS[number] => Boolean(t))
          .map(t => ({ id: t.id, name: t.name, abbreviation: t.abbreviation, conference: t.conference, logo: t.logo }));
        await updateProfile({ favoriteNBATeams: teams });
      } else if (!skip && focus === 'events') {
        await updateProfile({
          favoriteEventCategories: eventCategories,
          preferredEventsCity: city ?? undefined,
        });
      } else if (!skip && focus === 'movies' && selectedShow) {
        const alreadyTracked = (shows ?? []).some(s => s.tmdbId === selectedShow.id && s.mediaType === 'tv');
        if (!alreadyTracked) {
          addShow({
            title: selectedShow.name, tmdbId: selectedShow.id, mediaType: 'tv',
            type: 'Series', platform: 'Other', status: 'Plan to Watch',
          });
        }
      } else if (!skip && focus === 'task' && looksLikeTask(taskTitle)) {
        if (!allTasks.some(t => t.title.trim().toLowerCase() === taskTitle.trim().toLowerCase())) {
          addTask({
            title: taskTitle.trim(), category: 'personal', priority: 'medium',
            status: 'todo', tags: [], subTasks: [], reminders: [],
            attachments: [], completionLogs: [], progress: 0, isRecurring: false,
            isHabit: false,
          });
        }
      }
      router.replace((returnTo === 'events' ? '/(tabs)/events' : '/(onboarding)/complete') as any);
    } catch (error) {
      console.warn('[QuickSetup] Could not save preference', error);
      setSearchError('Could not save your choice. Please try again or skip.');
    } finally {
      setSaving(false);
    }
  }, [saving, focus, clubIds, countryIds, nbaIds, eventCategories, city,
    taskTitle, selectedShow, profile?.favoriteTeams, shows, allTasks,
    updateProfile, addShow, addTask, router, returnTo]);

  const titles = {
    football: ['Follow your teams', 'Pick up to three clubs and countries. Your Sports feed will follow them.'],
    nba: ['Which NBA teams?', 'Pick up to three teams to keep their games close.'],
    events: ['Find your kind of events', 'Choose your interests and a city. You can change both anytime.'],
    movies: ['Add your first show', 'Search for something you watch or want to watch.'],
    task: ['Add one thing to do', 'Give your Overview something useful from day one.'],
  } as const;

  const choice = focus ? titles[focus] : ['Make it yours', 'A quick personal preference'];
  const hasChoice = focus === 'football' ? clubIds.length + countryIds.length > 0
    : focus === 'nba' ? nbaIds.length > 0
    : focus === 'events' ? eventCategories.length > 0 || city !== null
    : focus === 'movies' ? selectedShow !== null
    : looksLikeTask(taskTitle);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={21} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.progress}><OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} /></View>
        <TouchableOpacity onPress={() => void finish(true)} disabled={saving} accessibilityLabel="Skip this step">
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroIcon}><Sparkles size={22} color={COLORS.primary} /></View>
        <Text style={styles.eyebrow}>A LITTLE PERSONALISATION</Text>
        <Text style={styles.title}>{choice[0]}</Text>
        <Text style={styles.subtitle}>{choice[1]}</Text>

        {(focus === 'football' || focus === 'nba' || focus === 'movies') && (
          <View style={styles.searchRow}>
            <Search color={COLORS.textMuted} size={18} />
            <TextInput
              value={query} onChangeText={t => { setQuery(t); setShowResults([]); setSelectedShow(null); }}
              placeholder={focus === 'movies' ? 'Search TV shows' : 'Search teams or countries'}
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              autoCorrect={false} returnKeyType="search"
              onSubmitEditing={focus === 'movies' ? () => void searchTV() : undefined}
            />
            {focus === 'movies' && (
              <TouchableOpacity onPress={() => void searchTV()} disabled={searching} style={styles.searchButton}>
                {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchButtonText}>Find</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {focus === 'football' && (
          <>
            <Text style={styles.section}>Clubs <Text style={styles.counter}>{clubIds.length}/3</Text></Text>
            <View style={styles.pillGrid}>
              {clubs.map(team => {
                const active = clubIds.includes(team.id);
                return <TouchableOpacity key={team.id} onPress={() => toggleLimited(team.id, clubIds, setClubIds)}
                  accessibilityRole="checkbox" accessibilityState={{ checked: active }}
                  style={[styles.teamChip, active && styles.selected]}>
                  {getFootballTeamLogoUrl(team) ? <Image source={{ uri: getFootballTeamLogoUrl(team) }} style={styles.logo} /> : null}
                  <Text style={[styles.chipText, active && styles.selectedText]} numberOfLines={1}>{team.name}</Text>
                  {active ? <Check size={14} color={COLORS.primary} /> : null}
                </TouchableOpacity>;
              })}
            </View>
            <Text style={styles.section}>National teams <Text style={styles.counter}>{countryIds.length}/3</Text></Text>
            <View style={styles.pillGrid}>
              {nations.map(n => {
                const active = countryIds.includes(n.id);
                return <TouchableOpacity key={n.id} onPress={() => toggleLimited(n.id, countryIds, setCountryIds)}
                  accessibilityRole="checkbox" accessibilityState={{ checked: active }}
                  style={[styles.teamChip, active && styles.selected]}>
                  <Text style={styles.flag}>{n.flag}</Text>
                  <Text style={[styles.chipText, active && styles.selectedText]}>{n.name}</Text>
                </TouchableOpacity>;
              })}
            </View>
          </>
        )}

        {focus === 'nba' && (
          <View style={styles.pillGrid}>
            {nbaTeams.map(team => {
              const active = nbaIds.includes(team.id);
              return <TouchableOpacity key={team.id} onPress={() => toggleLimited(team.id, nbaIds, setNbaIds)}
                accessibilityRole="checkbox" accessibilityState={{ checked: active }}
                style={[styles.teamChip, active && styles.selected]}>
                {team.logo ? <Image source={{ uri: team.logo }} style={styles.logo} /> : null}
                <Text style={[styles.chipText, active && styles.selectedText]}>{team.name}</Text>
              </TouchableOpacity>;
            })}
          </View>
        )}

        {focus === 'events' && (
          <>
            <Text style={styles.section}>What do you like?</Text>
            <View style={styles.pillGrid}>
              {ONBOARDING_EVENT_CATEGORIES.map(cat => {
                const active = eventCategories.includes(cat.id);
                return <TouchableOpacity key={cat.id} onPress={() => setEventCategories(p => p.includes(cat.id) ? p.filter(x => x !== cat.id) : [...p, cat.id])}
                  accessibilityRole="checkbox" accessibilityState={{ checked: active }}
                  style={[styles.teamChip, active && styles.selected]}>
                  <cat.icon size={17} color={active ? COLORS.primary : cat.color} />
                  <Text style={[styles.chipText, active && styles.selectedText]}>{cat.label}</Text>
                </TouchableOpacity>;
              })}
            </View>
            <Text style={styles.section}>Where should we look?</Text>
            <Text style={styles.hint}>Select a city to get local events without sharing your precise location.</Text>
            <View style={styles.pillGrid}>
              {ONBOARDING_EVENT_CITIES.map(candidate => {
                const active = city?.name === candidate.name;
                return <TouchableOpacity key={candidate.name} onPress={() => setCity(active ? null : candidate)}
                  accessibilityRole="radio" accessibilityState={{ selected: active }}
                  style={[styles.teamChip, active && styles.selected]}>
                  <Text style={[styles.chipText, active && styles.selectedText]}>{candidate.name}</Text>
                  {active ? <Check size={15} color={COLORS.primary} /> : null}
                </TouchableOpacity>;
              })}
            </View>
          </>
        )}

        {focus === 'movies' && (
          <>
            <Text style={styles.hint}>Choose one result. You can link streaming providers later.</Text>
            {searchResultsMessage(showResults, searching, query)}
            {showResults.map(show => {
              const active = selectedShow?.id === show.id;
              return <TouchableOpacity key={show.id} onPress={() => setSelectedShow(show)}
                accessibilityRole="radio" accessibilityState={{ selected: active }}
                style={[styles.showRow, active && styles.selected]}>
                <View style={styles.poster}>
                  {show.poster_path ? <Image source={{ uri: 'https://image.tmdb.org/t/p/w154' + show.poster_path }} style={styles.posterImage} /> : <Text style={styles.posterFallback}>TV</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.showTitle} numberOfLines={2}>{show.name}</Text>
                  <Text style={styles.hint}>{show.first_air_date?.slice(0, 4) || 'Series'}</Text>
                </View>
                {active ? <Check size={19} color={COLORS.primary} /> : null}
              </TouchableOpacity>;
            })}
          </>
        )}

        {focus === 'task' && (
          <>
            <Text style={styles.section}>My first task</Text>
            <TextInput value={taskTitle} onChangeText={setTaskTitle}
              placeholder={profile?.interests.includes('fitness') ? 'e.g. Go for a 20-minute walk' : 'e.g. Finish my presentation'}
              placeholderTextColor={COLORS.textMuted}
              style={styles.taskInput} maxLength={110} returnKeyType="done" />
            <Text style={styles.hint}>It will appear in Overview and Tasks. You can add reminders or make it recurring later.</Text>
          </>
        )}
        {searchError ? <Text style={styles.error}>{searchError}</Text> : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity onPress={() => void finish(false)} disabled={saving || !hasChoice}
          style={[styles.primary, (!hasChoice || saving) && styles.disabled]}
          accessibilityLabel="Save choice and continue">
          {saving ? <ActivityIndicator color="#fff" /> : <><Text style={styles.primaryText}>Continue</Text><ArrowRight size={18} color="#fff" /></>}
        </TouchableOpacity>
        {!hasChoice && <Text style={styles.footerHint}>Or choose Skip to add this later.</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

function searchResultsMessage(shows: readonly TMDBTVShow[], searching: boolean, query: string) {
  if (searching || shows.length > 0 || query.trim().length < 2) return null;
  return <Text style={styles.hint}>Tap Find to search for TV shows.</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14 },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },
  progress: { flex: 1 }, skip: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  scroll: { flex: 1 }, content: { paddingHorizontal: 24, paddingBottom: 42 },
  heroIcon: { height: 45, width: 45, borderRadius: 15, backgroundColor: '#E6ECFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 2.2, marginBottom: 10 },
  title: { color: COLORS.text, fontSize: 30, fontWeight: '800', letterSpacing: -1.1, marginBottom: 9 },
  subtitle: { fontSize: 15, lineHeight: 23, color: COLORS.textSecondary, marginBottom: 22 },
  section: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginTop: 24, marginBottom: 12 },
  counter: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  hint: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  teamChip: { paddingHorizontal: 12, minHeight: 45, paddingVertical: 10, backgroundColor: '#fff', borderColor: '#DFE4EF', borderWidth: 1, borderRadius: 13, alignItems: 'center', flexDirection: 'row', gap: 8, maxWidth: '100%' },
  selected: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  chipText: { color: COLORS.text, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  selectedText: { color: COLORS.primary },
  logo: { width: 21, height: 21, resizeMode: 'contain' }, flag: { fontSize: 18 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#fff', borderColor: '#DFE4EF', borderWidth: 1, borderRadius: 14, paddingLeft: 14, minHeight: 52 },
  searchInput: { color: COLORS.text, fontSize: 15, flex: 1, paddingVertical: 11 },
  searchButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 10, marginRight: 5 },
  searchButtonText: { color: '#fff', fontWeight: '700' },
  taskInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DFE4EF', borderRadius: 14, fontSize: 16, padding: 18, color: COLORS.text, marginBottom: 12 },
  showRow: { flexDirection: 'row', padding: 11, alignItems: 'center', gap: 12, borderRadius: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DFE4EF', marginBottom: 10 },
  poster: { width: 42, height: 62, borderRadius: 7, backgroundColor: '#E9ECF3', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  posterImage: { width: '100%', height: '100%' }, posterFallback: { color: COLORS.textMuted },
  showTitle: { fontSize: 15, color: COLORS.text, fontWeight: '700' },
  footer: { paddingHorizontal: 22, paddingTop: 14, backgroundColor: 'rgba(248,250,255,0.96)', borderTopWidth: 1, borderTopColor: '#E6EAF4' },
  primary: { height: 54, borderRadius: 14, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.45 }, footerHint: { textAlign: 'center', paddingTop: 9, color: COLORS.textMuted, fontSize: 12 },
  error: { marginTop: 12, color: '#B42318', fontSize: 13 },
});
