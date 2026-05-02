import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { CalendarEvent, ImportedCalendar } from '@/types/habit';
import { parseICSFile, getUpcomingEvents, getTodayEvents } from '@/utils/calendarUtils';
import { Platform } from 'react-native';
import { useEventKit } from './useEventKit';
import { useAuth } from './useAuth';

let DocumentPicker: typeof import('expo-document-picker') | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    DocumentPicker = require('expo-document-picker');
  } catch {
    console.log('expo-document-picker not available');
  }
}


const getCalendarsStorageKey = (userId?: string) => `imported_calendars_${userId || 'guest'}`;

export const [CalendarProvider, useCalendar] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id;
  const CALENDARS_STORAGE_KEY = getCalendarsStorageKey(userId);
  const [calendars, setCalendars] = useState<ImportedCalendar[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // EventKit integration
  const eventKit = useEventKit();

  // Load calendars from storage
  const loadCalendars = useCallback(async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(CALENDARS_STORAGE_KEY);
      if (stored) {
        const parsedCalendars = JSON.parse(stored);
        setCalendars(parsedCalendars);
        console.log(`Loaded ${parsedCalendars.length} calendars from storage`);
      } else {
        // Important on account switch: don't keep previous user's calendars in memory.
        setCalendars([]);
        console.log('No stored calendars for current user, reset in-memory calendars');
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
      setError('Failed to load calendars');
    } finally {
      setIsLoading(false);
    }
  }, [CALENDARS_STORAGE_KEY]);

  // Save calendars to storage
  const saveCalendars = useCallback(async (calendarsToSave: ImportedCalendar[]) => {
    try {
      await AsyncStorage.setItem(CALENDARS_STORAGE_KEY, JSON.stringify(calendarsToSave));
      console.log(`Saved ${calendarsToSave.length} calendars to storage`);
    } catch (error) {
      console.error('Error saving calendars:', error);
      setError('Failed to save calendars');
    }
  }, [CALENDARS_STORAGE_KEY]);

  // Import calendar from file
  const importCalendarFromFile = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      console.log('Starting file import process...');
      
      if (Platform.OS === 'web') {
        // Web file picker
        if (typeof document === 'undefined') {
          console.error('Document not available in this environment');
          setError('File picker not available in this environment');
          return false;
        }
        
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.ics,text/calendar';
          input.style.display = 'none';
          
          const handleFileSelect = async (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            
            // Clean up event listeners and DOM element
            input.removeEventListener('change', handleFileSelect);
            input.removeEventListener('cancel', handleCancel);
            document.body.removeChild(input);
            
            if (file) {
              try {
                console.log('File selected:', file.name, 'Type:', file.type);
                const content = await file.text();
                console.log('File content length:', content.length);
                
                const calendarName = file.name.replace(/\.(ics|ICS)$/, '') || 'Imported Calendar';
                const calendar = parseICSFile(content, calendarName);
                
                // Get fresh calendars state
                setCalendars(currentCalendars => {
                  const updatedCalendars = [...currentCalendars, calendar];
                  saveCalendars(updatedCalendars).catch(err => {
                    console.error('Error saving calendars:', err);
                  });
                  return updatedCalendars;
                });
                
                console.log(`Successfully imported calendar: ${calendar.name} with ${calendar.events.length} events`);
                resolve(true);
              } catch (error) {
                console.error('Error importing calendar:', error);
                setError(error instanceof Error ? error.message : 'Failed to import calendar file');
                resolve(false);
              }
            } else {
              console.log('No file selected');
              resolve(false);
            }
          };
          
          const handleCancel = () => {
            console.log('File picker cancelled');
            input.removeEventListener('change', handleFileSelect);
            input.removeEventListener('cancel', handleCancel);
            if (document.body.contains(input)) {
              document.body.removeChild(input);
            }
            resolve(false);
          };
          
          input.addEventListener('change', handleFileSelect);
          input.addEventListener('cancel', handleCancel);
          
          // Add to DOM temporarily
          document.body.appendChild(input);
          
          console.log('Opening file picker...');
          input.click();
        });
      } else {
        // Mobile file picker
        console.log('Opening mobile document picker...');
        const result = await DocumentPicker!.getDocumentAsync({
          type: ['text/calendar', 'text/plain', '*/*'],
          copyToCacheDirectory: true,
        });

        console.log('Document picker result:', result);

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          console.log('Selected file:', asset.name, 'URI:', asset.uri);
          
          try {
            // Read file content
            const response = await fetch(asset.uri);
            if (!response.ok) {
              throw new Error(`Failed to read file: ${response.statusText}`);
            }
            
            const content = await response.text();
            console.log('File content length:', content.length);
            
            const calendarName = asset.name.replace(/\.(ics|ICS)$/, '') || 'Imported Calendar';
            const calendar = parseICSFile(content, calendarName);
            
            // Get fresh calendars state
            setCalendars(currentCalendars => {
              const updatedCalendars = [...currentCalendars, calendar];
              saveCalendars(updatedCalendars).catch(err => {
                console.error('Error saving calendars:', err);
              });
              return updatedCalendars;
            });
            
            console.log(`Successfully imported calendar: ${calendar.name} with ${calendar.events.length} events`);
            return true;
          } catch (error) {
            console.error('Error processing selected file:', error);
            setError(error instanceof Error ? error.message : 'Failed to process selected file');
            return false;
          }
        }
        
        console.log('No file selected or picker was cancelled');
        return false;
      }
    } catch (error) {
      console.error('Error in importCalendarFromFile:', error);
      setError(error instanceof Error ? error.message : 'Failed to import calendar file');
      return false;
    }
  }, [saveCalendars]);

  // Import calendar from URL
  const importCalendarFromURL = useCallback(async (url: string, name: string): Promise<boolean> => {
    try {
      setError(null);
      console.log('Attempting to import calendar from URL:', url);
      
      // Validate URL format
      let validUrl: URL;
      try {
        validUrl = new URL(url);
      } catch {
        throw new Error('Invalid URL format. Please enter a valid calendar URL.');
      }
      
      // Check if it's a supported protocol
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported.');
      }
      
      // Provide specific guidance for common calendar providers
      if (validUrl.hostname.includes('google.com')) {
        if (!url.includes('/ical/') && !url.endsWith('.ics')) {
          throw new Error(
            'For Google Calendar, please use the public .ics URL. You can find this by:\n\n' +
            '1. Go to your Google Calendar\n' +
            '2. Click on the calendar settings (three dots)\n' +
            '3. Select "Settings and sharing"\n' +
            '4. Make the calendar public\n' +
            '5. Copy the "Secret address in iCal format" URL'
          );
        }
      } else if (validUrl.hostname.includes('outlook.') || validUrl.hostname.includes('office.com')) {
        if (!url.includes('/owa/calendar/') && !url.endsWith('.ics')) {
          throw new Error(
            'For Outlook/Office 365, please use the calendar sharing URL that ends with .ics or contains /owa/calendar/'
          );
        }
      }
      
      let response: Response;
      let content: string;
      
      try {
        // Try direct fetch first
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/calendar, text/plain, */*',
            'User-Agent': 'Calendar-Importer/1.0',
          },
          mode: 'cors',
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        content = await response.text();
        
      } catch (fetchError: any) {
        console.log('Direct fetch failed, trying CORS proxy...', fetchError.message);
        
        // If direct fetch fails (likely due to CORS), try with a CORS proxy
        const corsProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        
        try {
          response = await fetch(corsProxyUrl);
          
          if (!response.ok) {
            throw new Error(`CORS proxy responded with ${response.status}: ${response.statusText}`);
          }
          
          const proxyData = await response.json();
          
          if (!proxyData.contents) {
            throw new Error('No content received from the calendar URL.');
          }
          
          content = proxyData.contents;
          
        } catch (proxyError: any) {
          console.error('CORS proxy also failed:', proxyError);
          
          // Provide specific error messages based on the error type
          if (fetchError.message.includes('Failed to fetch')) {
            throw new Error(
              'Unable to access the calendar URL. This might be due to:\n\n' +
              '• CORS restrictions (the calendar provider blocks cross-origin requests)\n' +
              '• Network connectivity issues\n' +
              '• The URL requires authentication\n' +
              '• The URL is not publicly accessible\n\n' +
              'Try using a direct download link or check if the calendar is publicly shared.'
            );
          } else if (fetchError.message.includes('NetworkError')) {
            throw new Error('Network error. Please check your internet connection and try again.');
          } else {
            throw new Error(`Failed to fetch calendar: ${fetchError.message}`);
          }
        }
      }
      
      // Validate that we received calendar content
      if (!content || content.trim().length === 0) {
        throw new Error('The URL returned empty content. Please check if the URL is correct.');
      }
      
      console.log('Content preview (first 500 chars):', content.substring(0, 500));
      console.log('Content type from response:', response.headers.get('content-type'));
      
      // Check if content looks like an ICS file
      const contentUpper = content.toUpperCase();
      if (!contentUpper.includes('BEGIN:VCALENDAR') && !contentUpper.includes('BEGIN:VEVENT')) {
        // Check if it might be HTML (common when URLs redirect to login pages)
        if (content.includes('<html') || content.includes('<!DOCTYPE')) {
          throw new Error(
            'The URL returned an HTML page instead of calendar data. This usually means:\n\n' +
            '• The calendar requires authentication\n' +
            '• The URL redirects to a login page\n' +
            '• The calendar is not publicly accessible\n\n' +
            'Please make sure the calendar is publicly shared and try using a direct .ics download link.'
          );
        }
        
        // Check if it might be JSON (API response)
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          throw new Error(
            'The URL returned JSON data instead of calendar data. Please make sure you\'re using a direct link to an .ics file, not an API endpoint.'
          );
        }
        
        throw new Error(
          'The URL does not appear to contain calendar data. Please make sure you\'re using a direct link to an .ics file or a calendar feed URL.\n\n' +
          'Content preview: ' + content.substring(0, 200) + (content.length > 200 ? '...' : '')
        );
      }
      
      console.log('Successfully fetched calendar content, length:', content.length);
      
      const calendar = parseICSFile(content, name);
      calendar.source = 'url';
      calendar.sourceData = url;
      
      // Get fresh calendars state
      setCalendars(currentCalendars => {
        const updatedCalendars = [...currentCalendars, calendar];
        saveCalendars(updatedCalendars).catch(err => {
          console.error('Error saving calendars:', err);
        });
        return updatedCalendars;
      });
      
      console.log(`Successfully imported calendar from URL: ${name} with ${calendar.events.length} events`);
      return true;
      
    } catch (error) {
      console.error('Error importing calendar from URL:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import calendar from URL';
      setError(errorMessage);
      return false;
    }
  }, [saveCalendars]);

  // Remove calendar
  const removeCalendar = useCallback(async (calendarId: string) => {
    try {
      const updatedCalendars = calendars.filter(cal => cal.id !== calendarId);
      setCalendars(updatedCalendars);
      await saveCalendars(updatedCalendars);
      console.log(`Removed calendar: ${calendarId}`);
    } catch (error) {
      console.error('Error removing calendar:', error);
      setError('Failed to remove calendar');
    }
  }, [calendars, saveCalendars]);

  // Toggle calendar active state
  const toggleCalendar = useCallback(async (calendarId: string) => {
    try {
      const updatedCalendars = calendars.map(cal => 
        cal.id === calendarId ? { ...cal, isActive: !cal.isActive } : cal
      );
      setCalendars(updatedCalendars);
      await saveCalendars(updatedCalendars);
      console.log(`Toggled calendar: ${calendarId}`);
    } catch (error) {
      console.error('Error toggling calendar:', error);
      setError('Failed to toggle calendar');
    }
  }, [calendars, saveCalendars]);

  // Sync calendar from URL
  const syncCalendar = useCallback(async (calendarId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const calendar = calendars.find(cal => cal.id === calendarId);
      if (!calendar || calendar.source !== 'url') {
        throw new Error('Calendar not found or not from URL');
      }
      
      console.log('Syncing calendar from URL:', calendar.sourceData);
      
      let response: Response;
      let content: string;
      
      try {
        // Try direct fetch first
        response = await fetch(calendar.sourceData, {
          method: 'GET',
          headers: {
            'Accept': 'text/calendar, text/plain, */*',
            'User-Agent': 'Calendar-Importer/1.0',
          },
          mode: 'cors',
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        content = await response.text();
        
      } catch (fetchError: any) {
        console.log('Direct fetch failed during sync, trying CORS proxy...', fetchError.message);
        
        // If direct fetch fails, try with CORS proxy
        const corsProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(calendar.sourceData)}`;
        
        response = await fetch(corsProxyUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to sync calendar: ${response.statusText}`);
        }
        
        const proxyData = await response.json();
        
        if (!proxyData.contents) {
          throw new Error('No content received during sync.');
        }
        
        content = proxyData.contents;
      }
      
      const updatedCalendar = parseICSFile(content, calendar.name);
      updatedCalendar.id = calendar.id;
      updatedCalendar.source = 'url';
      updatedCalendar.sourceData = calendar.sourceData;
      updatedCalendar.isActive = calendar.isActive;
      updatedCalendar.color = calendar.color;
      
      const updatedCalendars = calendars.map(cal => 
        cal.id === calendarId ? updatedCalendar : cal
      );
      
      setCalendars(updatedCalendars);
      await saveCalendars(updatedCalendars);
      
      console.log(`Successfully synced calendar: ${calendar.name} with ${updatedCalendar.events.length} events`);
      return true;
    } catch (error) {
      console.error('Error syncing calendar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync calendar';
      setError(errorMessage);
      return false;
    }
  }, [calendars, saveCalendars]);

  // Get upcoming events (combines imported calendars and EventKit)
  const getUpcomingCalendarEvents = useCallback((days: number = 7): CalendarEvent[] => {
    const importedEvents = getUpcomingEvents(calendars, days);
    
    // Add EventKit events if available
    if (eventKit.isEventKitAvailable && eventKit.hasPermission) {
      const eventKitEvents = eventKit.getUpcomingEvents(days);
      const convertedEventKitEvents: CalendarEvent[] = eventKitEvents.map(event => ({
        id: event.id,
        title: event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        location: event.location,
        description: event.notes,
        isAllDay: event.allDay,
        status: 'CONFIRMED' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      // Combine and sort by start date
      const allEvents = [...importedEvents, ...convertedEventKitEvents];
      return allEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }
    
    return importedEvents;
  }, [calendars, eventKit]);

  // Get today's events (combines imported calendars and EventKit)
  const getTodayCalendarEvents = useCallback((): CalendarEvent[] => {
    const importedEvents = getTodayEvents(calendars);
    
    // Add EventKit events if available
    if (eventKit.isEventKitAvailable && eventKit.hasPermission) {
      const eventKitEvents = eventKit.getTodayEvents();
      const convertedEventKitEvents: CalendarEvent[] = eventKitEvents.map(event => ({
        id: event.id,
        title: event.title,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        location: event.location,
        description: event.notes,
        isAllDay: event.allDay,
        status: 'CONFIRMED' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      // Combine and sort by start date
      const allEvents = [...importedEvents, ...convertedEventKitEvents];
      return allEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }
    
    return importedEvents;
  }, [calendars, eventKit]);

  // Load calendars on mount
  useEffect(() => {
    loadCalendars();
  }, [loadCalendars]);

  return {
    calendars,
    isLoading,
    error,
    importCalendarFromFile,
    importCalendarFromURL,
    removeCalendar,
    toggleCalendar,
    syncCalendar,
    getUpcomingCalendarEvents,
    getTodayCalendarEvents,
    clearError: () => setError(null),
    
    // EventKit integration
    eventKit,
  };
});