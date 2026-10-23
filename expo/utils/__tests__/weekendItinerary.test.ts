import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LocalEvent } from '@/types/events';
import {
  fridayKey, ukDayAndHour, isEligibleWeekendEvent, weekendCandidateEvents,
  ticketPricePounds, ticketSubtotal, buildWeekendItinerary,
  alternativesForSlot, itineraryShareText,
} from '@/utils/weekendItinerary';

const now=Date.parse('2026-10-23T21:06:00Z'); // Fri 22:06 BST
const fixture=(id:string,startIso:string,category='music',price='£18'):LocalEvent=>({
  id,title:'Experience '+id,venue:'Manchester Hall',location:'Manchester',
  date:'Fri, 23 Oct',time:'19:00',category,price,image:'',isSaved:false,
  description:'',latitude:53.48,longitude:-2.25,startIso,attendees:0,rating:0,tags:[],
  ticketUrl:'https://tickets.example.com/'+id,
});
const at=(day:string,hour:string)=>day+'T'+hour+':00Z';
describe('weekend itinerary engine',()=>{
  it('recognises this weekend late on Friday and next weekend on Monday',()=>{
    assert.equal(fridayKey(now),'2026-10-23');
    assert.equal(fridayKey(Date.parse('2026-10-26T12:00:00Z')),'2026-10-30');
    assert.equal(fridayKey(Date.parse('2026-10-25T12:00:00Z')),'2026-10-23');
  });
  it('uses Europe/London calendar dates during BST instead of UTC day',()=>{
    assert.equal(ukDayAndHour(Date.parse('2026-10-23T23:30:00Z')).day,'saturday');
  });
  it('removes started events and those with insufficient verified travel time',()=>{
    const expired=fixture('expired',at('2026-10-23','21:00'));
    const tooSoon=fixture('soon',at('2026-10-23','21:30'));
    const later=fixture('later',at('2026-10-24','19:00'));
    assert.equal(isEligibleWeekendEvent(expired,{now}),false);
    assert.equal(isEligibleWeekendEvent(tooSoon,{now}),false);
    assert.equal(isEligibleWeekendEvent(later,{now,journeyMinutes:{later:80}}),true);
    assert.equal(isEligibleWeekendEvent(later,{now:Date.parse('2026-10-24T18:00:00Z'),journeyMinutes:{later:70}}),false);
  });
  it('filters mood and budget without inventing unknown ticket prices',()=>{
    const events=[fixture('a',at('2026-10-24','12:00'),'food','£25'),
      fixture('b',at('2026-10-24','20:00'),'music','See tickets')];
    assert.deepEqual(weekendCandidateEvents(events,{now,mood:'food',maxTicketPrice:50}).map(x=>x.id),['a']);
    assert.equal(ticketPricePounds('From £17.50'),17.5);
    assert.equal(ticketPricePounds('See tickets'),null);
    assert.deepEqual(ticketSubtotal(events),{knownPounds:25,knownCount:1,unknownCount:1});
  });
  it('builds four non-clashing slots while respecting day selections',()=>{
    const events=[
      fixture('fri',at('2026-10-23','22:30')),
      fixture('sat-afternoon',at('2026-10-24','13:00'),'food'),
      fixture('sat-too-close',at('2026-10-24','14:00'),'music'),
      fixture('sat-night',at('2026-10-24','20:00')),
      fixture('sun',at('2026-10-25','14:00'),'arts'),
    ];
    const result=buildWeekendItinerary(events,{now});
    assert.deepEqual(result.map(x=>x.slot),['friday-evening','saturday-afternoon','saturday-evening','sunday-daytime']);
    const saturday=buildWeekendItinerary(events,{now,day:'saturday'});
    assert.equal(saturday.length,2);
    assert.ok(saturday.every(x=>x.slot.startsWith('saturday-')));
  });
  it('respects a long-running event published end time',()=>{
    const long={...fixture('festival',at('2026-10-24','13:00'),'music'),endIso:at('2026-10-24','20:30')};
    const evening=fixture('dinner',at('2026-10-24','19:00'),'food');
    const items=buildWeekendItinerary([long,evening],{now,day:'saturday'});
    assert.deepEqual(items.map(x=>x.event.id),['festival']);
  });
  it('supports compatible event swaps and excludes already used events',()=>{
    const events=[
      fixture('sat-1',at('2026-10-24','13:00'),'food'),
      fixture('sat-2',at('2026-10-24','14:00'),'arts'),
      fixture('sat-night',at('2026-10-24','20:00'),'music'),
    ];
    const current=buildWeekendItinerary(events,{now,day:'saturday'});
    const alternate=alternativesForSlot(events,'saturday-afternoon',current,{now,day:'saturday'});
    assert.ok(alternate.some(x=>x.id==='sat-2'));
    const swapped=buildWeekendItinerary(events,{now,day:'saturday'},{'saturday-afternoon':'sat-2'});
    assert.equal(swapped.find(x=>x.slot==='saturday-afternoon')?.event.id,'sat-2');
    assert.notEqual(swapped[0]?.event.id,swapped[1]?.event.id);
  });
  it('shares real event ticket links and clearly describes unknown prices',()=>{
    const items=[{slot:'saturday-evening' as const,event:fixture('x',at('2026-10-24','20:00'),'music','See tickets')}];
    const message=itineraryShareText(items,10);
    assert.ok(message.includes('https://tickets.example.com/x'));
    assert.ok(message.includes('estimated travel £10'));
    assert.ok(message.includes('unknown'));
  });
});
