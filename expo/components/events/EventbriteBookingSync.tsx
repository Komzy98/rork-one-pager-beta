import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { CalendarCheck, RefreshCcw } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/utils/supabaseClient';
import type { SavedEventSnapshot } from '@/types/events';

type Booking = {
  id: string; title: string; startAt: string; endAt?: string; venueName: string;
  city: string; address?: string; latitude: number; longitude: number;
  imageUrl?: string; ticketUrl?: string; description?: string;
};
const API_BASE = (process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '').trim().replace(/\\/$/, '');

export function EventbriteBookingSync() {
  const { supabaseUser, isGuest } = useAuth();
  const { profile, updateProfile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Import confirmed Eventbrite bookings into My Events.');
  const sync = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (!API_BASE) throw new Error('Booking sync requires a configured API server.');
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) throw new Error('Sign in to One Pager to sync bookings.');
      const response = await fetch(API_BASE + '/api/eventbrite/my-bookings', {
        headers: { Authorization: 'Bearer ' + data.session.access_token },
      });
      if (response.status === 403) throw new Error('The Eventbrite account email does not match your One Pager account. Account linking is not configured.');
      if (!response.ok) throw new Error('Eventbrite sync is unavailable. Try again later.');
      const json = await response.json() as { bookings: Booking[] };
      const existing = profile?.savedEvents ?? [];
      const known = new Set(existing.map(e => e.id));
      const incoming: SavedEventSnapshot[] = json.bookings
        .filter(b => b.id && b.startAt && !known.has(b.id))
        .map(b => ({
          id: b.id, title: b.title, description: b.description, imageUrl: b.imageUrl,
          category: 'other', startAt: b.startAt, endAt: b.endAt,
          venueName: b.venueName, address: b.address, city: b.city,
          latitude: b.latitude, longitude: b.longitude, ticketUrl: b.ticketUrl,
          source: 'eventbrite', savedAt: new Date().toISOString(),
          planningStatus: 'going', tags: ['Eventbrite booking'],
        }));
      if (incoming.length) await updateProfile({ savedEvents: [...incoming, ...existing].slice(0, 50) });
      setMessage(incoming.length ? `Imported ${incoming.length} bookings into My Events.` : `Sync complete — ${json.bookings.length} bookings found, no new events.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Booking sync failed.');
    } finally {
      setLoading(false);
    }
  };
  if (isGuest || !supabaseUser) return null;
  return (
    <View style={{ marginHorizontal: 20, marginVertical: 12, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(120,120,120,0.22)', backgroundColor: '#191C26' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <CalendarCheck color="#F5F5FF" size={19} />
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', flex: 1 }}>Eventbrite bookings</Text>
        <TouchableOpacity disabled={loading} onPress={() => { void sync(); }} accessibilityRole="button" accessibilityLabel="Sync Eventbrite bookings"
          style={{ borderRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {loading ? <ActivityIndicator size="small" color="#151822" /> : <RefreshCcw color="#151822" size={14} />}
          <Text style={{ color: '#151822', fontWeight: '800', fontSize: 12 }}>{loading ? 'Syncing' : 'Sync now'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color: '#C5C7D0', fontSize: 12, lineHeight: 18 }}>{message}</Text>
    </View>
  );
}
