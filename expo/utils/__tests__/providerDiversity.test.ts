import { it } from 'node:test';
import assert from 'node:assert/strict';
import type { LocalEvent } from '@/types/events';
import { mergeDiscoveryWithProviderDiversity } from '@/utils/mergeDiscoveryEvents';
function event(id:string, source:LocalEvent['listingSource'], days:number):LocalEvent {
  const startIso=new Date(Date.now()+days*86400000).toISOString();
  return {id,title:id,venue:id,location:'Manchester',date:'Tue, 20 Oct',time:'19:00',startIso,
    category:'music',price:'Free',image:'',isSaved:false,attendees:0,rating:0,tags:[],description:'',latitude:53.48,longitude:-2.25,listingSource:source};
}
it('reserves places for valid Fienta events beyond the top 50 earliest dates',()=>{
  const major=Array.from({length:50},(_,i)=>event('tm-'+i,'ticketmaster',i+1));
  const local=[event('fi-1','fienta',60),event('fi-2','fienta',61)];
  const result=mergeDiscoveryWithProviderDiversity([local,major],30);
  assert.equal(result.length,30);
  assert.equal(result.filter(e=>e.listingSource==='fienta').length,2);
});
