import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { Bell, CarFront, Check, Clock3, MapPinned, Navigation, TrainFront, Footprints, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpcClient } from '@/lib/trpc';
import { notificationService } from '@/utils/notificationService';
import { computeEventDeparture } from '@/utils/eventDeparturePlan';
import { parseEventStartDateTime } from '@/utils/eventDiscovery';
import type { LocalEvent } from '@/types/events';
import type { EventsPalette } from '@/utils/eventsPalette';
import type { EventTravelMode } from '@/utils/eventDirectionsUrl';

type Coords = { latitude: number; longitude: number };
type Mode = 'driving' | 'walking' | 'transit';

interface Props {
  event: LocalEvent;
  palette: EventsPalette;
  onDirections: (mode: EventTravelMode) => void;
}

const MODES: { id: Mode; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: 'driving', label: 'Drive', icon: CarFront },
  { id: 'walking', label: 'Walk', icon: Footprints },
  { id: 'transit', label: 'Transit', icon: TrainFront },
];

export function EventTravelPlanner({ event, palette, onDirections }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('driving');
  const [origin, setOrigin] = useState<Coords | null>(null);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [originBusy, setOriginBusy] = useState(false);
  const [pickMapOpen, setPickMapOpen] = useState(false);
  const [mapPin, setMapPin] = useState<Coords | null>(null);
  const [early, setEarly] = useState(20);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [leaveReminderSet, setLeaveReminderSet] = useState(false);
  const clearOutdatedDepartureAlert = useCallback(() => {
    if (leaveReminderSet) void notificationService.cancelEventReminder(`departure:${event.id}`);
    setLeaveReminderSet(false);
  }, [leaveReminderSet, event.id]);

  const destinationValid = Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
    && (event.latitude !== 0 || event.longitude !== 0)
    && Math.abs(event.latitude) <= 90 && Math.abs(event.longitude) <= 180;
  const destination: Coords | null = destinationValid
    ? { latitude: event.latitude, longitude: event.longitude } : null;

  const route = useQuery({
    queryKey: ['event-route-v1', origin?.latitude.toFixed(4), origin?.longitude.toFixed(4), event.id, destination?.latitude, destination?.longitude, mode],
    enabled: !!origin && !!destination && mode !== 'transit',
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: () => trpcClient.events.estimateRoute.mutate({
      origin: origin!,
      destination: destination!,
      mode: mode as 'walking' | 'driving',
    }),
  });

  const eventStart = useMemo(() => parseEventStartDateTime(event), [event]);
  const leavePlan = useMemo(
    () => eventStart && route.data ? computeEventDeparture(eventStart, route.data.durationMinutes, early) : null,
    [eventStart, route.data, early],
  );
  const formatTime = (date: Date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const useCurrentLocation = useCallback(async () => {
    setOriginBusy(true);
    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) throw new Error('Location is unavailable in this browser.');
        const current = await new Promise<Coords>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
            () => reject(new Error('Allow location access or select a starting point on the map.')),
            { enableHighAccuracy: false, timeout: 12_000, maximumAge: 30_000 },
          );
        });
        setOrigin(current);
      } else {
        const Location = await import('expo-location');
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          throw new Error('Enable location access or select your starting point on the map.');
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      }
      setOriginLabel('Current location');
      clearOutdatedDepartureAlert();
    } catch (error) {
      Alert.alert('Starting point', error instanceof Error ? error.message : 'Location unavailable.');
    } finally {
      setOriginBusy(false);
    }
  }, [clearOutdatedDepartureAlert]);

  const setMapOrigin = useCallback(() => {
    if (!mapPin) return;
    setOrigin(mapPin);
    setOriginLabel('Selected map pin');
    clearOutdatedDepartureAlert();
    setPickMapOpen(false);
  }, [mapPin, clearOutdatedDepartureAlert]);

  const scheduleLeaveReminder = useCallback(async () => {
    if (!leavePlan || leavePlan.alreadyLate || !route.data) return;
    setReminderBusy(true);
    try {
      const permission = await notificationService.requestPermissions();
      if (!permission) throw new Error('Enable notifications in Settings to get a departure alert.');
      const key = `departure:${event.id}`;
      await notificationService.cancelEventReminder(key);
      const identifier = await notificationService.scheduleNotification(
        'Time to leave for your event',
        `Leave now for ${event.title} at ${event.venue}. Estimated ${route.data.durationMinutes} min ${mode === 'walking' ? 'walk' : 'drive'} — check current conditions.`,
        leavePlan.departAt,
        { type: 'event_reminder', id: key, payload: { eventId: event.id, destination: event.venue } },
      );
      if (!identifier) throw new Error('Could not schedule this alert. Check notification settings.');
      setLeaveReminderSet(true);
      Alert.alert('Departure reminder set', `We'll remind you at ${formatTime(leavePlan.departAt)}. Recheck the route before travelling.`);
    } catch (error) {
      Alert.alert('Reminder', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setReminderBusy(false);
    }
  }, [event.id, event.title, event.venue, route.data, mode, leavePlan]);

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.titleRow}>
        <Navigation size={19} color={palette.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: palette.text }]}>Your journey</Text>
          <Text style={[styles.sub, { color: palette.textSecondary }]}>Real walking and road routes — only when you ask</Text>
        </View>
      </View>

      <Text style={[styles.label, { color: palette.text }]}>Starting point</Text>
      <View style={styles.twoActions}>
        <TouchableOpacity style={[styles.action, { borderColor: palette.border }]} onPress={() => void useCurrentLocation()} disabled={originBusy}>
          {originBusy ? <ActivityIndicator size="small" color={palette.primary} /> : <MapPinned size={15} color={palette.primary} />}
          <Text style={[styles.actionText, { color: palette.text }]}>Use my location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.action, { borderColor: palette.border }]} onPress={() => { setMapPin(origin); setPickMapOpen(true); }}>
          <Navigation size={15} color={palette.primary} />
          <Text style={[styles.actionText, { color: palette.text }]}>Pick on map</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.hint, { color: palette.textSecondary }]}>
        {originLabel ? `From: ${originLabel}` : 'No starting location selected. We never assume your saved city is your home.'}
      </Text>
      <View style={styles.modes}>
        {MODES.map(({ id, label, icon: Icon }) => (
          <TouchableOpacity
            key={id} style={[styles.mode, { backgroundColor: mode === id ? palette.primaryLight : palette.surfaceLight, borderColor: mode === id ? palette.primary : palette.border }]}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === id }}
            onPress={() => { if (mode !== id) clearOutdatedDepartureAlert(); setMode(id); }}
          >
            <Icon size={15} color={mode === id ? palette.primary : palette.textSecondary} />
            <Text style={{ color: mode === id ? palette.primary : palette.textSecondary, fontWeight: '700', fontSize: 12 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!destination ? (
        <Text style={[styles.hint, { color: palette.textSecondary }]}>The provider hasn't supplied a reliable venue pin. Open Maps and confirm the address.</Text>
      ) : mode === 'transit' ? (
        <Text style={[styles.hint, { color: palette.textSecondary }]}>Public transport routes depend on live timetables and service updates. Check them directly in Maps.</Text>
      ) : !origin ? (
        <Text style={[styles.hint, { color: palette.textSecondary }]}>Choose your starting point to see a route-based estimate.</Text>
      ) : route.isLoading ? (
        <ActivityIndicator style={{ alignSelf: 'flex-start' }} color={palette.primary} />
      ) : route.error ? (
        <Text style={[styles.hint, { color: palette.textSecondary }]}>Couldn't calculate this route. Open Maps for directions.</Text>
      ) : route.data ? (
        <>
          <View style={[styles.estimate, { backgroundColor: palette.surfaceLight, borderColor: palette.border }]}>
            <Text style={[styles.bigTime, { color: palette.text }]}>
              ~{route.data.durationMinutes} min
            </Text>
            <Text style={[styles.hint, { color: palette.textSecondary }]}>
              {route.data.distanceKm.toFixed(1)} km · {mode === 'walking' ? 'Walking' : 'Driving'} · OpenStreetMap route estimate
            </Text>
          </View>
          {leavePlan ? (
            <>
              <Text style={[styles.label, { color: palette.text }]}>Arrive ahead of the event</Text>
              <View style={styles.buffers}>
                {[15, 20, 30, 45].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[styles.buffer, { borderColor: early === minutes ? palette.primary : palette.border, backgroundColor: early === minutes ? palette.primaryLight : palette.card }]}
                    onPress={() => { if (early !== minutes) clearOutdatedDepartureAlert(); setEarly(minutes); }}
                  >
                    <Text style={{ color: early === minutes ? palette.primary : palette.textSecondary, fontWeight: '700', fontSize: 12 }}>{minutes}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.departure, { backgroundColor: palette.primaryLight }]}>
                <Clock3 size={17} color={palette.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.primary, fontSize: 15, fontWeight: '800' }}>
                    {leavePlan.alreadyLate ? 'Leave now / check your route' : `Aim to leave by ${formatTime(leavePlan.departAt)}`}
                  </Text>
                  <Text style={{ color: palette.textSecondary, fontSize: 11, marginTop: 3 }}>
                    Based on your route and {early} min early arrival; no traffic or timetable prediction
                  </Text>
                </View>
              </View>
              {!leavePlan.alreadyLate ? (
                <TouchableOpacity style={[styles.action, { borderColor: palette.primary }]} disabled={reminderBusy} onPress={() => void scheduleLeaveReminder()}>
                  {leaveReminderSet ? <Check size={15} color={palette.primary} /> : <Bell size={15} color={palette.primary} />}
                  <Text style={[styles.actionText, { color: palette.primary }]}>
                    {leaveReminderSet ? 'Departure reminder set' : 'Remind me when to leave'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
      <TouchableOpacity style={[styles.primary, { backgroundColor: palette.primary }]} onPress={() => onDirections(mode)}>
        <Navigation size={16} color={palette.textInverse} />
        <Text style={{ color: palette.textInverse, fontSize: 13, fontWeight: '800' }}>Open {mode === 'transit' ? 'transit options' : 'route'} in Maps</Text>
      </TouchableOpacity>
      <Text style={[styles.disclaimer, { color: palette.textSecondary }]}>
        When you request a route, One Pager sends the chosen points to an OpenStreetMap routing server.
        They aren't saved as your home address. Traffic and public transport conditions may change.
      </Text>

      <Modal visible={pickMapOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickMapOpen(false)}>
        <View style={[styles.mapModal, { backgroundColor: palette.background, paddingTop: insets.top + 12 }]}>
          <View style={styles.mapTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: palette.text }]}>Choose a starting point</Text>
              <Text style={[styles.sub, { color: palette.textSecondary }]}>Tap the map where you'll be leaving from</Text>
            </View>
            <TouchableOpacity accessibilityLabel="Close map" onPress={() => setPickMapOpen(false)}>
              <X size={22} color={palette.text} />
            </TouchableOpacity>
          </View>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: destination?.latitude ?? 53.48, longitude: destination?.longitude ?? -2.24,
              latitudeDelta: 0.14, longitudeDelta: 0.14,
            }}
            onPress={(e: MapPressEvent) => setMapPin(e.nativeEvent.coordinate)}
          >
            {mapPin ? <Marker coordinate={mapPin} title="Start from here" /> : null}
            {destination ? <Marker coordinate={destination} title={event.venue} pinColor={palette.primary} /> : null}
          </MapView>
          <TouchableOpacity
            disabled={!mapPin}
            style={[styles.primary, { backgroundColor: palette.primary, opacity: mapPin ? 1 : 0.45, margin: 16, marginBottom: Math.max(16, insets.bottom) }]}
            onPress={setMapOrigin}
          >
            <Check size={16} color={palette.textInverse} />
            <Text style={{ color: palette.textInverse, fontWeight: '800' }}>Use this starting point</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 11 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '800' },
  twoActions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, borderWidth: 1, borderRadius: 12, minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9 },
  actionText: { fontSize: 12, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18 },
  modes: { flexDirection: 'row', gap: 7 },
  mode: { flex: 1, borderWidth: 1, borderRadius: 11, minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  estimate: { borderWidth: 1, borderRadius: 12, padding: 11, gap: 3 },
  bigTime: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  buffers: { flexDirection: 'row', gap: 7 },
  buffer: { flex: 1, minHeight: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1 },
  departure: { padding: 12, borderRadius: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  primary: { minHeight: 47, borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  disclaimer: { fontSize: 10, lineHeight: 16 },
  mapModal: { flex: 1 },
  mapTop: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingBottom: 12 },
});
