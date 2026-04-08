import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let Calendar: typeof import('expo-calendar') | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Calendar = require('expo-calendar');
  } catch {
    console.log('expo-calendar not available');
  }
}

interface EventKitEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  allDay: boolean;
  calendarId: string;
  calendarTitle?: string;
  calendarColor?: string;
}

interface EventKitCalendar {
  id: string;
  title: string;
  color: string;
  source: {
    name: string;
    type: string;
  };
  allowsModifications: boolean;
  type: string;
}

const EVENTKIT_PERMISSIONS_KEY = 'eventkit_permissions_granted';
const SELECTED_CALENDARS_KEY = 'selected_eventkit_calendars';

export const useEventKit = () => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [calendars, setCalendars] = useState<EventKitCalendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [events, setEvents] = useState<EventKitEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if EventKit is available (iOS only)
  const isEventKitAvailable = Platform.OS === 'ios';

  // Request calendar permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isEventKitAvailable) {
      console.log('EventKit not available on this platform');
      return false;
    }

    try {
      setError(null);
      console.log('Requesting calendar permissions...');
      
      const { status } = await Calendar!.requestCalendarPermissionsAsync();
      console.log('Calendar permission status:', status);
      
      const granted = status === 'granted';
      setHasPermission(granted);
      
      // Store permission status
      await AsyncStorage.setItem(EVENTKIT_PERMISSIONS_KEY, granted.toString());
      
      if (!granted) {
        setError('Calendar access is required to sync with your device calendars');
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      setError('Failed to request calendar permissions');
      return false;
    }
  }, [isEventKitAvailable]);

  // Load calendars from device
  const loadDeviceCalendars = useCallback(async (): Promise<void> => {
    if (!isEventKitAvailable) {
      console.log('Cannot load calendars: EventKit not available');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading device calendars...');
      const deviceCalendars = await Calendar!.getCalendarsAsync(Calendar!.EntityTypes.EVENT);
      console.log(`Found ${deviceCalendars.length} calendars`);
      
      const formattedCalendars: EventKitCalendar[] = deviceCalendars.map(cal => ({
        id: cal.id,
        title: cal.title,
        color: cal.color || '#007AFF',
        source: {
          name: cal.source?.name || 'Unknown',
          type: cal.source?.type || 'unknown'
        },
        allowsModifications: cal.allowsModifications,
        type: cal.type || 'unknown'
      }));
      
      setCalendars(formattedCalendars);
      
      // Load previously selected calendars
      const stored = await AsyncStorage.getItem(SELECTED_CALENDARS_KEY);
      if (stored) {
        const selectedIds = JSON.parse(stored);
        // Filter to only include calendars that still exist
        const validIds = selectedIds.filter((id: string) => 
          formattedCalendars.some(cal => cal.id === id)
        );
        setSelectedCalendarIds(validIds);
        
        // Update stored selection if some calendars were removed
        if (validIds.length !== selectedIds.length) {
          await AsyncStorage.setItem(SELECTED_CALENDARS_KEY, JSON.stringify(validIds));
        }
      }
      
    } catch (error) {
      console.error('Error loading device calendars:', error);
      setError('Failed to load device calendars');
    } finally {
      setIsLoading(false);
    }
  }, [isEventKitAvailable]);

  // Toggle calendar selection
  const toggleCalendarSelection = useCallback(async (calendarId: string): Promise<void> => {
    try {
      const newSelection = selectedCalendarIds.includes(calendarId)
        ? selectedCalendarIds.filter(id => id !== calendarId)
        : [...selectedCalendarIds, calendarId];
      
      setSelectedCalendarIds(newSelection);
      await AsyncStorage.setItem(SELECTED_CALENDARS_KEY, JSON.stringify(newSelection));
      
      console.log(`Calendar ${calendarId} selection toggled. Selected: ${newSelection.length}`);
    } catch (error) {
      console.error('Error toggling calendar selection:', error);
      setError('Failed to update calendar selection');
    }
  }, [selectedCalendarIds]);

  // Use ref to store calendars to avoid dependency issues
  const calendarsRef = useRef<EventKitCalendar[]>([]);
  useEffect(() => {
    calendarsRef.current = calendars;
  }, [calendars]);

  // Use refs to store current values and prevent dependency issues
  const selectedCalendarIdsRef = useRef<string[]>([]);
  const hasPermissionRef = useRef<boolean>(false);
  
  useEffect(() => {
    selectedCalendarIdsRef.current = selectedCalendarIds;
  }, [selectedCalendarIds]);
  
  useEffect(() => {
    hasPermissionRef.current = hasPermission;
  }, [hasPermission]);

  // Load events from selected calendars
  const loadEvents = useCallback(async (startDate: Date, endDate: Date): Promise<void> => {
    if (!isEventKitAvailable || !hasPermissionRef.current || selectedCalendarIdsRef.current.length === 0) {
      console.log('Cannot load events: no permission or no calendars selected');
      setEvents([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Loading events from ${selectedCalendarIdsRef.current.length} calendars between ${startDate.toISOString()} and ${endDate.toISOString()}`);
      
      const allEvents: EventKitEvent[] = [];
      
      for (const calendarId of selectedCalendarIdsRef.current) {
        try {
          const calendarEvents = await Calendar!.getEventsAsync(
            [calendarId],
            startDate,
            endDate
          );
          
          const calendar = calendarsRef.current.find(cal => cal.id === calendarId);
          
          const formattedEvents: EventKitEvent[] = calendarEvents.map(event => ({
            id: event.id,
            title: event.title,
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            location: event.location || undefined,
            notes: event.notes || undefined,
            allDay: event.allDay,
            calendarId: event.calendarId,
            calendarTitle: calendar?.title,
            calendarColor: calendar?.color
          }));
          
          allEvents.push(...formattedEvents);
          console.log(`Loaded ${formattedEvents.length} events from calendar: ${calendar?.title}`);
        } catch (calendarError) {
          console.error(`Error loading events from calendar ${calendarId}:`, calendarError);
        }
      }
      
      // Sort events by start date
      allEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      
      setEvents(allEvents);
      console.log(`Total events loaded: ${allEvents.length}`);
      
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load calendar events');
    } finally {
      setIsLoading(false);
    }
  }, [isEventKitAvailable]);

  // Get today's events
  const getTodayEvents = useCallback((): EventKitEvent[] => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      
      // Event overlaps with today
      return (eventStart <= endOfDay && eventEnd >= startOfDay);
    });
  }, [events]);

  // Get upcoming events (next 7 days)
  const getUpcomingEvents = useCallback((days: number = 7): EventKitEvent[] => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      return eventStart > now && eventStart <= futureDate;
    }).slice(0, 10); // Limit to 10 events
  }, [events]);

  // Create a new event
  const createEvent = useCallback(async (eventDetails: {
    title: string;
    startDate: Date;
    endDate: Date;
    location?: string;
    notes?: string;
    allDay?: boolean;
    calendarId?: string;
  }): Promise<string | null> => {
    if (!isEventKitAvailable || !hasPermission) {
      setError('Calendar access is required to create events');
      return null;
    }

    try {
      setError(null);
      
      // Use the first selected calendar or the first writable calendar
      let targetCalendarId = eventDetails.calendarId;
      if (!targetCalendarId) {
        const writableCalendars = calendars.filter(cal => cal.allowsModifications);
        if (writableCalendars.length === 0) {
          throw new Error('No writable calendars available');
        }
        targetCalendarId = selectedCalendarIds.find(id => 
          writableCalendars.some(cal => cal.id === id)
        ) || writableCalendars[0].id;
      }
      
      console.log('Creating event in calendar:', targetCalendarId);
      
      const eventId = await Calendar!.createEventAsync(targetCalendarId, {
        title: eventDetails.title,
        startDate: eventDetails.startDate,
        endDate: eventDetails.endDate,
        location: eventDetails.location,
        notes: eventDetails.notes,
        allDay: eventDetails.allDay || false,
      });
      
      console.log('Event created with ID:', eventId);
      
      // Reload events to include the new one
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      await loadEvents(startDate, endDate);
      
      return eventId;
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Failed to create calendar event');
      return null;
    }
  }, [isEventKitAvailable, hasPermission, calendars, selectedCalendarIds, loadEvents]);

  // Initialize EventKit
  const initialize = useCallback(async (): Promise<void> => {
    if (!isEventKitAvailable) {
      console.log('EventKit not available on this platform');
      return;
    }

    try {
      setIsLoading(true);
      
      // Check current permission status first
      const { status } = await Calendar!.getCalendarPermissionsAsync();
      const hasAccess = status === 'granted';
      setHasPermission(hasAccess);
      
      if (hasAccess) {
        // Load calendars if we have permission
        await loadDeviceCalendars();
      }
    } catch (error) {
      console.error('Error initializing EventKit:', error);
      setError('Failed to initialize calendar access');
    } finally {
      setIsLoading(false);
    }
  }, [isEventKitAvailable, loadDeviceCalendars]);

  // Auto-refresh events periodically
  const refreshEvents = useCallback(async (): Promise<void> => {
    if (hasPermissionRef.current && selectedCalendarIdsRef.current.length > 0) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      await loadEvents(startDate, endDate);
    }
  }, [loadEvents]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Load events when calendars are selected and we have permission
  // Use a more controlled approach to prevent infinite loops
  useEffect(() => {
    let isMounted = true;
    
    const loadEventsIfNeeded = async () => {
      // Only load if we have permission and selected calendars
      if (!hasPermission || selectedCalendarIds.length === 0) {
        if (isMounted) {
          setEvents([]);
        }
        return;
      }

      try {
        if (isMounted) {
          setIsLoading(true);
          setError(null);
        }
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        
        console.log(`Loading events from ${selectedCalendarIds.length} calendars`);
        
        const allEvents: EventKitEvent[] = [];
        
        for (const calendarId of selectedCalendarIds) {
          try {
            const calendarEvents = await Calendar!.getEventsAsync(
              [calendarId],
              startDate,
              endDate
            );
            
            const calendar = calendars.find(cal => cal.id === calendarId);
            
            const formattedEvents: EventKitEvent[] = calendarEvents.map(event => ({
              id: event.id,
              title: event.title,
              startDate: new Date(event.startDate),
              endDate: new Date(event.endDate),
              location: event.location || undefined,
              notes: event.notes || undefined,
              allDay: event.allDay,
              calendarId: event.calendarId,
              calendarTitle: calendar?.title,
              calendarColor: calendar?.color
            }));
            
            allEvents.push(...formattedEvents);
          } catch (calendarError) {
            console.error(`Error loading events from calendar ${calendarId}:`, calendarError);
          }
        }
        
        // Sort events by start date
        allEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        
        if (isMounted) {
          setEvents(allEvents);
          console.log(`Total events loaded: ${allEvents.length}`);
        }
        
      } catch (error) {
        console.error('Error loading events:', error);
        if (isMounted) {
          setError('Failed to load calendar events');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Only load events if we have calendars available
    if (calendars.length > 0) {
      loadEventsIfNeeded();
    }
    
    return () => {
      isMounted = false;
    };
  }, [hasPermission, selectedCalendarIds, calendars, isEventKitAvailable]);

  return {
    // State
    isEventKitAvailable,
    hasPermission,
    calendars,
    selectedCalendarIds,
    events,
    isLoading,
    error,
    
    // Actions
    requestPermissions,
    loadDeviceCalendars,
    toggleCalendarSelection,
    loadEvents,
    createEvent,
    refreshEvents,
    
    // Computed
    getTodayEvents,
    getUpcomingEvents,
    
    // Utils
    clearError: () => setError(null),
  };
};