import type { LocalEvent } from '@/types/events';

export type WeekendDay = 'friday' | 'saturday' | 'sunday';
export type WeekendMood = 'any' | 'social' | 'relaxed' | 'date' | 'music' | 'food' | 'active';
export type WeekendSlot = 'friday-evening' | 'saturday-afternoon' | 'saturday-evening' | 'sunday-daytime';
export type PlannedWeekendEvent = { slot: WeekendSlot; event: LocalEvent };
export type PlannerOptions = {
  now?: number;
  day?: WeekendDay | 'any';
  mood?: WeekendMood;
  maxTicketPrice?: number | null;
  categoryFilter?: string | null;
  journeyMinutes?: Record<string, number | null>;
  excludeIds?: string[];
};
export type TicketEstimate = { knownPounds: number; unknownCount: number; knownCount: number };
const SLOT_ORDER: WeekendSlot[] = ['friday-evening', 'saturday-afternoon', 'saturday-evening', 'sunday-daytime'];
const SLOT_DAY: Record<WeekendSlot, WeekendDay> = {
  'friday-evening': 'friday', 'saturday-afternoon': 'saturday',
  'saturday-evening': 'saturday', 'sunday-daytime': 'sunday',
};
const MOOD_CATEGORIES: Record<Exclude<WeekendMood, 'any'>, string[]> = {
  social: ['comedy','nightlife','networking','music','food'],
  relaxed: ['arts','theatre','food','fitness','wellness','family'],
  date: ['food','arts','theatre','music','comedy'],
  music: ['music','nightlife'],
  food: ['food'],
  active: ['fitness','sports','outdoors'],
};

export function eventTime(event: LocalEvent): number | null {
  if (!event.startIso) return null;
  const at = Date.parse(event.startIso);
  return Number.isFinite(at) ? at : null;
}
export function ukDayAndHour(instant: number): {day: WeekendDay | null; hour: number} {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', weekday: 'short', hour: '2-digit',
    minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const pick = (kind: string) => parts.find(p => p.type === kind)?.value ?? '';
  const day = ({ Fri:'friday', Sat:'saturday', Sun:'sunday' } as Record<string, WeekendDay>)[pick('weekday')] ?? null;
  return {day, hour: Number(pick('hour')) + Number(pick('minute')) / 60};
}
export function fridayKey(now = Date.now()): string {
  const ukDate = new Intl.DateTimeFormat('en-CA', {
    timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit', weekday:'short',
  }).formatToParts(new Date(now));
  const pick = (kind: string) => ukDate.find(p => p.type === kind)?.value ?? '';
  // Use calendar date values, not GMT-hour arithmetic (works over BST transitions).
  const base = new Date(Date.UTC(Number(pick('year')), Number(pick('month'))-1, Number(pick('day'))));
  const day = ({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6} as Record<string,number>)[pick('weekday')];
  const untilFriday = (5 - day + 7) % 7;
  // Monday–Thursday: upcoming Friday. Fri–Sun: this Friday, even late on Friday.
  base.setUTCDate(base.getUTCDate() + (day === 0 ? -2 : day >= 5 ? 5 - day : untilFriday));
  return base.toISOString().slice(0,10);
}
export function isEligibleWeekendEvent(event: LocalEvent, options: PlannerOptions = {}): boolean {
  const at = eventTime(event), now = options.now ?? Date.now();
  if (!at) return false;
  // Use formatToParts to avoid locale-specific date order.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit',
  }).formatToParts(new Date(at));
  const get = (k:string) => parts.find(p=>p.type===k)?.value ?? '';
  const key = get('year') + '-' + get('month') + '-' + get('day');
  const start = fridayKey(now);
  const last = new Date(Date.parse(start + 'T00:00:00Z'));
  last.setUTCDate(last.getUTCDate()+2);
  if (key < start || key > last.toISOString().slice(0,10)) return false;
  const {day} = ukDayAndHour(at);
  if (!day || (options.day && options.day !== 'any' && options.day !== day)) return false;
  const leadMinutes = options.journeyMinutes?.[event.id];
  // Never recommend a past or imminently starting event; check real ETA if known.
  if (at - now < (Math.max(45, (leadMinutes ?? 0) + 20)) * 60000) return false;
  const cap = options.maxTicketPrice;
  const price = ticketPricePounds(event.price);
  if (cap != null && (price == null || price > cap)) return false;
  if (options.mood && options.mood !== 'any' && !MOOD_CATEGORIES[options.mood].includes(event.category)) return false;
  if (options.excludeIds?.includes(event.id)) return false;
  return true;
}
export function ticketPricePounds(value?: string | null): number | null {
  const s = value?.trim() ?? '';
  if (/\bfree\b/i.test(s)) return 0;
  const match = s.match(/£\s*(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
}
export function ticketSubtotal(events: LocalEvent[]): TicketEstimate {
  return events.reduce<TicketEstimate>((sum, event) => {
    const amount = ticketPricePounds(event.price);
    return amount == null
      ? {...sum, unknownCount: sum.unknownCount+1}
      : {...sum, knownCount:sum.knownCount+1, knownPounds:sum.knownPounds+amount};
  }, {knownPounds:0,unknownCount:0,knownCount:0});
}
function fitsSlot(event: LocalEvent, slot: WeekendSlot): boolean {
  const at = eventTime(event);
  if (!at) return false;
  const {day,hour} = ukDayAndHour(at);
  if (day !== SLOT_DAY[slot]) return false;
  if (slot === 'friday-evening') return hour >= 16;
  if (slot === 'saturday-afternoon') return hour >= 10 && hour < 17;
  if (slot === 'saturday-evening') return hour >= 16;
  return hour >= 9 && hour < 19;
}
function compatible(a: LocalEvent, b: LocalEvent, travelMinutes?: Record<string,number | null>): boolean {
  const ta = eventTime(a), tb = eventTime(b);
  if (ta == null || tb == null) return false;
  const earlier = ta <= tb ? a : b, later = ta <= tb ? b : a;
  const earlierAt = Math.min(ta,tb), laterAt = Math.max(ta,tb);
  // Honour a genuine provider end timestamp, otherwise reserve two hours.
  const recordedEnd = earlier.endIso ? Date.parse(earlier.endIso) : NaN;
  const earlierEnd = Number.isFinite(recordedEnd) && recordedEnd > earlierAt
    ? recordedEnd : earlierAt + 120 * 60000;
  // Include a transfer buffer; use a verified inter-venue route when available.
  const minutes = travelMinutes?.[earlier.id + '|' + later.id];
  return laterAt - earlierEnd >= Math.max(45, minutes ?? 45) * 60000;
}
export function weekendCandidateEvents(events: LocalEvent[], options: PlannerOptions = {}): LocalEvent[] {
  const deduped = new Map<string,LocalEvent>();
  for(const ev of events) {
    if (!isEligibleWeekendEvent(ev,options)) continue;
    if (!deduped.has(ev.id)) deduped.set(ev.id,ev);
  }
  return [...deduped.values()].sort((a,b) => (eventTime(a)??0) - (eventTime(b)??0));
}
export function buildWeekendItinerary(
  events: LocalEvent[], options: PlannerOptions = {}, overrides: Partial<Record<WeekendSlot,string>> = {},
): PlannedWeekendEvent[] {
  const eligible = weekendCandidateEvents(events,options);
  const picked: PlannedWeekendEvent[] = [];
  const excluded = new Set<string>();
  const activeSlots = SLOT_ORDER.filter(slot => options.day === undefined || options.day === 'any' || SLOT_DAY[slot] === options.day);
  for(const slot of activeSlots) {
    const candidates = eligible.filter(event => fitsSlot(event,slot) && !excluded.has(event.id) &&
      picked.every(prev => compatible(prev.event,event,options.journeyMinutes)));
    // Prefer an explicitly picked event if it's still eligible. Fill other slots with diverse categories.
    const override = candidates.find(e=>e.id===overrides[slot]);
    const chosen = override ?? [...candidates].sort((a,b)=>{
      const newA = !picked.some(x=>x.event.category===a.category) ? 1:0;
      const newB = !picked.some(x=>x.event.category===b.category) ? 1:0;
      return newB-newA || (eventTime(a)??0)-(eventTime(b)??0);
    })[0];
    if(chosen) {picked.push({slot,event:chosen});excluded.add(chosen.id);}
  }
  return picked;
}
export function alternativesForSlot(
  events: LocalEvent[], slot:WeekendSlot, current:PlannedWeekendEvent[], options:PlannerOptions = {},
): LocalEvent[] {
  const rest = current.filter(x=>x.slot!==slot).map(x=>x.event);
  return weekendCandidateEvents(events,options).filter(e=>fitsSlot(e,slot) &&
    !rest.some(x=>x.id===e.id) &&
    rest.every(x=>compatible(x,e,options.journeyMinutes))).slice(0,12);
}
export function itineraryShareText(plan:PlannedWeekendEvent[], travelPerEventPounds:number):string {
  const costs = ticketSubtotal(plan.map(item=>item.event));
  const travel = travelPerEventPounds * plan.length;
  const header = 'My One Pager weekend plan\n';
  const lines = plan.map(({slot,event})=> {
    const source = event.ticketUrl ? '\n' + event.ticketUrl : '';
    return slot.replace('-', ' ').toUpperCase() + ': ' + event.title +
      '\n' + event.date + ' · ' + event.time + ' · ' + event.venue + source;
  });
  const money = (value: number) => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:0,maximumFractionDigits:2}).format(value);
  const known = 'Known tickets ' + money(costs.knownPounds) +
    ' + estimated travel ' + money(travel);
  const note = costs.unknownCount ? ' (' + costs.unknownCount + ' ticket price' + (costs.unknownCount>1?'s':'') + ' unknown)' : '';
  return header + '\n' + lines.join('\n\n') + '\n\n' + known + note +
    '\nCheck ticket availability and travel fares before booking.';
}
