import { CalendarEvent, ImportedCalendar } from '@/types/habit';

export const parseICSFile = (icsContent: string, calendarName: string): ImportedCalendar => {
  console.log('Parsing ICS file:', calendarName);
  console.log('ICS content preview:', icsContent.substring(0, 200));
  
  if (!icsContent || icsContent.trim().length === 0) {
    throw new Error('ICS file is empty or invalid');
  }
  
  if (!icsContent.includes('BEGIN:VCALENDAR')) {
    throw new Error('Invalid ICS file format - missing VCALENDAR');
  }
  
  try {
    const events: CalendarEvent[] = [];
    const lines = icsContent.split(/\r?\n/);
    let currentEvent: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Handle line folding (lines starting with space or tab)
      while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
        i++;
        line += lines[i].substring(1);
      }
      
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        const calendarEvent = parseEventFromObject(currentEvent);
        if (calendarEvent) {
          events.push(calendarEvent);
        }
        currentEvent = null;
      } else if (currentEvent && line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const property = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        
        // Handle property parameters (e.g., DTSTART;TZID=America/New_York:20230101T120000)
        const [propertyName, ...params] = property.split(';');
        
        switch (propertyName.toUpperCase()) {
          case 'UID':
            currentEvent.uid = value;
            break;
          case 'SUMMARY':
            currentEvent.summary = value;
            break;
          case 'DESCRIPTION':
            currentEvent.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
            break;
          case 'LOCATION':
            currentEvent.location = value;
            break;
          case 'DTSTART':
            currentEvent.dtstart = { value, params };
            break;
          case 'DTEND':
            currentEvent.dtend = { value, params };
            break;
          case 'CATEGORIES':
            currentEvent.categories = value.split(',').map(cat => cat.trim());
            break;
          case 'ORGANIZER':
            currentEvent.organizer = value;
            break;
          case 'ATTENDEE':
            if (!currentEvent.attendees) currentEvent.attendees = [];
            currentEvent.attendees.push(value);
            break;
          case 'RRULE':
            currentEvent.rrule = value;
            break;
          case 'STATUS':
            currentEvent.status = value;
            break;
          case 'CREATED':
            currentEvent.created = value;
            break;
          case 'LAST-MODIFIED':
            currentEvent.lastModified = value;
            break;
        }
      }
    }
    
    console.log(`Parsed ${events.length} events from ICS file`);
    
    return {
      id: generateCalendarId(),
      name: calendarName,
      source: 'file',
      sourceData: icsContent,
      events,
      lastSynced: new Date().toISOString(),
      isActive: true,
      color: generateRandomColor(),
    };
  } catch (error) {
    console.error('Error parsing ICS file:', error);
    throw new Error('Failed to parse ICS file. Please check the file format.');
  }
};

const parseEventFromObject = (eventObj: any): CalendarEvent | null => {
  if (!eventObj.summary && !eventObj.dtstart) {
    return null;
  }
  
  const startDate = parseICSDate(eventObj.dtstart?.value);
  const endDate = parseICSDate(eventObj.dtend?.value) || new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration
  
  return {
    id: eventObj.uid || generateEventId(),
    title: eventObj.summary || 'Untitled Event',
    description: eventObj.description || undefined,
    location: eventObj.location || undefined,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    isAllDay: isAllDayFromICSDate(eventObj.dtstart),
    category: eventObj.categories ? eventObj.categories.join(', ') : undefined,
    organizer: eventObj.organizer ? extractEmailFromOrganizer(eventObj.organizer) : undefined,
    attendees: eventObj.attendees ? extractAttendeesEmails(eventObj.attendees) : undefined,
    recurrence: parseRecurrence(eventObj.rrule),
    status: parseEventStatus(eventObj.status),
    createdAt: eventObj.created ? parseICSDate(eventObj.created).toISOString() : new Date().toISOString(),
    updatedAt: eventObj.lastModified ? parseICSDate(eventObj.lastModified).toISOString() : new Date().toISOString(),
  };
};

const parseICSDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  // Handle different ICS date formats
  // YYYYMMDD
  if (/^\d{8}$/.test(dateString)) {
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateString.substring(6, 8));
    return new Date(year, month, day);
  }
  
  // YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  if (/^\d{8}T\d{6}Z?$/.test(dateString)) {
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1;
    const day = parseInt(dateString.substring(6, 8));
    const hour = parseInt(dateString.substring(9, 11));
    const minute = parseInt(dateString.substring(11, 13));
    const second = parseInt(dateString.substring(13, 15));
    
    const date = new Date(year, month, day, hour, minute, second);
    
    // If it ends with Z, it's UTC
    if (dateString.endsWith('Z')) {
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    }
    
    return date;
  }
  
  // Fallback to standard date parsing
  return new Date(dateString);
};

const isAllDayFromICSDate = (dtstart: any): boolean => {
  if (!dtstart?.value) return false;
  
  // All-day events are typically in YYYYMMDD format (no time component)
  return /^\d{8}$/.test(dtstart.value);
};

const generateEventId = (): string => {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};



const extractEmailFromOrganizer = (organizer: any): string | undefined => {
  if (typeof organizer === 'string') {
    const emailMatch = organizer.match(/mailto:([^\s]+)/);
    return emailMatch ? emailMatch[1] : organizer;
  }
  return organizer?.val || undefined;
};

const extractAttendeesEmails = (attendees: any): string[] | undefined => {
  if (!attendees) return undefined;
  
  const attendeeList = Array.isArray(attendees) ? attendees : [attendees];
  return attendeeList.map((attendee) => {
    if (typeof attendee === 'string') {
      const emailMatch = attendee.match(/mailto:([^\s]+)/);
      return emailMatch ? emailMatch[1] : attendee;
    }
    return attendee?.val || attendee;
  }).filter(Boolean);
};

const parseRecurrence = (rrule: any): CalendarEvent['recurrence'] | undefined => {
  if (!rrule) return undefined;
  
  try {
    const ruleString = typeof rrule === 'string' ? rrule : rrule.toString();
    const rules = ruleString.split(';').reduce((acc: any, rule: string) => {
      const [key, value] = rule.split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    if (rules.FREQ) {
      return {
        frequency: rules.FREQ as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY',
        interval: rules.INTERVAL ? parseInt(rules.INTERVAL) : undefined,
        until: rules.UNTIL ? new Date(rules.UNTIL).toISOString() : undefined,
        count: rules.COUNT ? parseInt(rules.COUNT) : undefined,
      };
    }
  } catch (error) {
    console.warn('Failed to parse recurrence rule:', error);
  }
  
  return undefined;
};

const parseEventStatus = (status: any): CalendarEvent['status'] => {
  if (!status) return 'CONFIRMED';
  
  const statusString = typeof status === 'string' ? status.toUpperCase() : status.toString().toUpperCase();
  
  switch (statusString) {
    case 'TENTATIVE':
      return 'TENTATIVE';
    case 'CANCELLED':
    case 'CANCELED':
      return 'CANCELLED';
    default:
      return 'CONFIRMED';
  }
};

const generateCalendarId = (): string => {
  return `calendar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateRandomColor = (): string => {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#84CC16', // Lime
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const getUpcomingEvents = (calendars: ImportedCalendar[], days: number = 7): CalendarEvent[] => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const futureDate = new Date(startOfToday.getTime() + days * 24 * 60 * 60 * 1000);
  
  const allEvents = calendars
    .filter(calendar => calendar.isActive)
    .flatMap(calendar => calendar.events);
  
  return allEvents
    .filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      
      // Include events that:
      // 1. Start today or in the future (within the days range)
      // 2. Are ongoing (started before but end after now)
      return (
        (eventStart >= startOfToday && eventStart <= futureDate) ||
        (eventStart < now && eventEnd > now)
      ) && event.status !== 'CANCELLED';
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
};

export const getTodayEvents = (calendars: ImportedCalendar[]): CalendarEvent[] => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  const allEvents = calendars
    .filter(calendar => calendar.isActive)
    .flatMap(calendar => calendar.events);
  
  return allEvents
    .filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      
      // Event starts today or is ongoing
      return (
        (eventStart >= startOfDay && eventStart < endOfDay) ||
        (eventStart < startOfDay && eventEnd > startOfDay)
      ) && event.status !== 'CANCELLED';
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
};

export const formatEventTime = (event: CalendarEvent): string => {
  if (event.isAllDay) {
    return 'All day';
  }
  
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };
  
  const startTime = formatTime(start);
  const endTime = formatTime(end);
  
  // If same day, show time range
  if (start.toDateString() === end.toDateString()) {
    return `${startTime} - ${endTime}`;
  }
  
  // Multi-day event
  return `${startTime} - ${end.toLocaleDateString()} ${endTime}`;
};

export const formatEventDate = (event: CalendarEvent): string => {
  const start = new Date(event.startDate);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  
  if (start.toDateString() === today.toDateString()) {
    return 'Today';
  }
  
  if (start.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  
  // Check if it's within the next week
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (start <= nextWeek) {
    return start.toLocaleDateString('en-GB', { weekday: 'long' });
  }
  
  return start.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: start.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
};

export const getCategoryIcon = (category?: string): string => {
  if (!category) return '📅';
  
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('work') || categoryLower.includes('meeting')) return '💼';
  if (categoryLower.includes('personal') || categoryLower.includes('family')) return '👨‍👩‍👧‍👦';
  if (categoryLower.includes('health') || categoryLower.includes('doctor') || categoryLower.includes('medical')) return '🏥';
  if (categoryLower.includes('fitness') || categoryLower.includes('gym') || categoryLower.includes('workout')) return '🏋️';
  if (categoryLower.includes('travel') || categoryLower.includes('vacation') || categoryLower.includes('trip')) return '✈️';
  if (categoryLower.includes('education') || categoryLower.includes('class') || categoryLower.includes('course')) return '📚';
  if (categoryLower.includes('social') || categoryLower.includes('party') || categoryLower.includes('event')) return '🎉';
  if (categoryLower.includes('food') || categoryLower.includes('dinner') || categoryLower.includes('lunch')) return '🍽️';
  if (categoryLower.includes('birthday') || categoryLower.includes('anniversary')) return '🎂';
  if (categoryLower.includes('holiday')) return '🎄';
  
  return '📅';
};