import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, ChevronRight, Clapperboard, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Show } from '@/types/habit';
import { tmdbApi, type TMDBSeason, type TMDBTVShowDetails } from '@/utils/tmdbApi';
import { nextWatchedEpisode } from '@/utils/showsLibrary';

type Position = { season: number; episode: number };
const TODAY = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function EpisodeProgressSheet({ show, onClose, onSave }: {
  show: Show | null;
  onClose: () => void;
  onSave: (updated: Show) => void;
}) {
  const insets = useSafeAreaInsets();
  const [details, setDetails] = useState<TMDBTVShowDetails | null>(null);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [inventory, setInventory] = useState<TMDBSeason | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tmdbId = show?.tmdbId;

  useEffect(() => {
    if (!show || !tmdbId) { setDetails(null); return; }
    let cancelled = false;
    setDetails(null);
    setError(null);
    setSeason(Math.max(1, show.currentSeason ?? 1));
    setEpisode(Math.max(1, show.currentEpisode ?? 1));
    void tmdbApi.getTVShowDetails(tmdbId)
      .then(data => { if (!cancelled) setDetails(data); })
      .catch(() => { if (!cancelled) setError('Episode details are unavailable right now. Try again later.'); });
    return () => { cancelled = true; };
  }, [show?.id, tmdbId]);

  useEffect(() => {
    if (!show?.tmdbId || !details) { setInventory(null); return; }
    let cancelled = false;
    setLoading(true);
    setInventory(null);
    void tmdbApi.getTVSeasonDetails(show.tmdbId, season)
      .then(data => { if (!cancelled) setInventory(data); })
      .catch(() => { if (!cancelled) setError('Could not load episodes for this season.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [show?.tmdbId, details, season]);

  const airedEpisodes = useMemo(() =>
    (inventory?.episodes || []).filter(ep => ep.episode_number > 0 && ep.air_date && ep.air_date <= TODAY()),
    [inventory],
  );
  const selected = airedEpisodes.find(ep => ep.episode_number === episode);
  const seasons = (details?.seasons || []).filter(s => s.season_number > 0);
  const saveNext = () => {
    if (!show || !selected) return;
    onSave({ ...show, currentSeason: season, currentEpisode: episode, status: 'Watching' });
  };
  const markWatched = useCallback(async () => {
    if (!show?.tmdbId || !show || !selected || !inventory || working) return;
    setWorking(true);
    try {
      // Only include aired episodes. Never create fictitious episode numbers.
      const futureSeason = seasons.find(s => s.season_number > season && s.air_date && s.air_date <= TODAY());
      const nextInventory = futureSeason
        ? await tmdbApi.getTVSeasonDetails(show.tmdbId, futureSeason.season_number)
        : null;
      const result = nextWatchedEpisode({ season, episode },
        nextInventory ? [inventory, nextInventory] : [inventory], TODAY());
      const reallyEnded = details?.status === 'Ended' || details?.status === 'Canceled';
      const next = result.next;
      const updated: Show = {
        ...show,
        lastWatchedSeason: season,
        lastWatchedEpisode: episode,
        currentSeason: next?.season ?? season,
        currentEpisode: next?.episode ?? episode,
        status: next ? 'Watching' : reallyEnded && !futureSeason ? 'Completed' : 'Watching',
      };
      onSave(updated);
      if (!next && !reallyEnded) {
        Alert.alert('All caught up', 'You have watched the latest released episode. We will not mark the series completed while future episodes may arrive.');
      }
    } catch {
      setError('Could not verify the next episode. Your watch progress has not changed.');
    } finally {
      setWorking(false);
    }
  }, [show, selected, inventory, working, season, episode, seasons, details, onSave]);

  if (!show) return null;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handle}/>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subtitle}>EPISODE TRACKING</Text>
              <Text style={styles.title} numberOfLines={2}>{show.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}><X size={22} color="#FFF"/></TouchableOpacity>
          </View>
          {!tmdbId ? (
            <Text style={styles.help}>Link this TV series to its TMDB title before tracking individual episodes.</Text>
          ) : !details ? (
            <View style={styles.center}>
              {error ? <Text style={styles.help}>{error}</Text> : <ActivityIndicator color="#E50914" />}
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}
                contentContainerStyle={styles.seasons}>
                {seasons.map(s => (
                  <TouchableOpacity key={s.season_number}
                    style={[styles.seasonChip, season === s.season_number && styles.seasonActive]}
                    onPress={() => { setSeason(s.season_number); setEpisode(1); setError(null); }}>
                    <Text style={[styles.seasonText, season === s.season_number && { color: '#FFF' }]}>
                      Season {s.season_number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.help}>Choose the episode you are about to watch, or mark the one you have finished. Unreleased episodes cannot be marked watched.</Text>
              <ScrollView style={styles.episodes} contentContainerStyle={styles.episodeList}>
                {loading ? <ActivityIndicator color="#E50914" /> : airedEpisodes.length ? (
                  airedEpisodes.map(ep => (
                    <TouchableOpacity key={ep.episode_number}
                      style={[styles.episodeRow, episode === ep.episode_number && styles.episodeSelected]}
                      onPress={() => setEpisode(ep.episode_number)}>
                      <Clapperboard size={17} color={episode === ep.episode_number ? '#E50914' : '#9B9BA8'}/>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.episodeName} numberOfLines={2}>
                          {ep.episode_number}. {ep.name || `Episode ${ep.episode_number}`}
                        </Text>
                        <Text style={styles.episodeMeta}>{ep.runtime ? `${ep.runtime} min · ` : ''}{ep.air_date}</Text>
                      </View>
                      {episode === ep.episode_number && <Check size={18} color="#4ADE80"/>}
                    </TouchableOpacity>
                  ))
                ) : <Text style={styles.help}>{error || 'No aired episodes found for this season.'}</Text>}
              </ScrollView>
              {show.lastWatchedSeason != null && show.lastWatchedEpisode != null && (
                <Text style={styles.help}>
                  Last marked watched: S{show.lastWatchedSeason} E{show.lastWatchedEpisode}
                </Text>
              )}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.secondary} disabled={!selected || working} onPress={saveNext}>
                  <Text style={styles.secondaryText}>Set as Next</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primary, (!selected || working) && { opacity: 0.4 }]}
                  disabled={!selected || working} onPress={() => void markWatched()}>
                  <Check size={17} color="#FFF"/>
                  <Text style={styles.primaryText}>{working ? 'Saving…' : 'Mark Watched'}</Text>
                  <ChevronRight size={15} color="#FFF"/>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111116', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', borderColor: '#24242C', borderWidth: 1 },
  handle: { width: 36, height: 4, borderRadius: 5, backgroundColor: '#52525B', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  subtitle: { fontSize: 11, fontWeight: '700', color: '#9B9BA8', letterSpacing: 1 },
  title: { color: '#FFF', fontSize: 20, fontWeight: '700', marginTop: 4 },
  help: { paddingHorizontal: 20, marginBottom: 10, color: '#9B9BA8', fontSize: 12, lineHeight: 18 },
  center: { minHeight: 130, justifyContent: 'center', alignItems: 'center' },
  seasons: { paddingHorizontal: 20, gap: 8, paddingVertical: 6, marginBottom: 10 },
  seasonChip: { backgroundColor: '#24242C', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11 },
  seasonActive: { backgroundColor: '#CB1D26' },
  seasonText: { color: '#ADADB6', fontSize: 13, fontWeight: '700' },
  episodes: { minHeight: 100, maxHeight: 340, paddingHorizontal: 18 },
  episodeList: { gap: 8, paddingBottom: 10 },
  episodeRow: { backgroundColor: '#1B1B22', borderWidth: 1, borderColor: 'transparent', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  episodeSelected: { borderColor: '#CB1D26' },
  episodeName: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  episodeMeta: { color: '#9B9BA8', fontSize: 11, marginTop: 4 },
  actions: { paddingHorizontal: 18, paddingTop: 12, flexDirection: 'row', gap: 10 },
  secondary: { flex: 1, backgroundColor: '#292930', alignItems: 'center', justifyContent: 'center', padding: 13, borderRadius: 12 },
  primary: { flex: 1.3, flexDirection: 'row', backgroundColor: '#CB1D26', alignItems: 'center', justifyContent: 'center', padding: 13, borderRadius: 12, gap: 6 },
  secondaryText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  primaryText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
