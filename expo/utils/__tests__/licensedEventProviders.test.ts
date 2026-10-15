import assert from 'node:assert/strict';
import { it } from 'node:test';
import { fetchDataThistleEvents } from '@/backend/services/dataThistleDiscovery';
import { fetchMeetupProEvents } from '@/backend/services/meetupProDiscovery';

const input = { latitude: 53.48, longitude: -2.25, radiusMiles: 25, size: 20 };
const json = (x: unknown) => new Response(JSON.stringify(x), { headers: { 'Content-Type': 'application/json' } });
it('Data Thistle respects bearer authentication and maps a licensed venue schedule', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('postcodes.io')) return json({ result: [{ query:'M1 1AE', result: {latitude:53.48,longitude:-2.25,admin_district:'Manchester'} }] });
    assert.equal(new Headers(opts?.headers).get('Authorization'), 'Bearer thistle-test');
    return json([{event_id:'1234',name:'Manchester Comedy Evening',status:'live', schedules:[{
      place_id:'p1',place:{name:'Hall',town:'Manchester',postal_code:'M1 1AE'},
      performances:[{ts:new Date(Date.now()+86400000).toISOString(), links:[{type:'booking',url:'https://tickets.example.com/show'}]}],
    }]}]);
  };
  try {
    const result = await fetchDataThistleEvents({...input, keyword:'Comedy Evening'}, 'thistle-test');
    assert.equal(result.length,1);
    assert.equal(result[0].listingSource,'datathistle');
    assert.equal(result[0].latitude,53.48);
  } finally {globalThis.fetch = orig;}
});
it('Meetup Pro uses its own network GraphQL, excluding unlocated events', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    assert.equal(String(url),'https://api.meetup.com/gql-ext');
    assert.equal(new Headers(opts?.headers).get('Authorization'),'Bearer meetup-test');
    const req=JSON.parse(String(opts?.body));
    assert.equal(req.variables.network,'network-test');
    return json({data:{proNetwork:{eventsSearch:{edges:[
      {node:{id:'e99',title:'Manchester networking meetup',dateTime:new Date(Date.now()+86400000).toISOString(),
        eventUrl:'https://www.meetup.com/group/events/e99/', venue:{name:'Main Hall',city:'Manchester',lat:53.48,lon:-2.25}}},
      {node:{id:'e100',title:'No venue',dateTime:new Date(Date.now()+86400000).toISOString(),
        eventUrl:'https://www.meetup.com/group/events/e100/'}},
    ]}}}});
  };
  try{
    const result = await fetchMeetupProEvents({...input,keyword:'networking'},'meetup-test','network-test');
    assert.equal(result.length,1);
    assert.equal(result[0].listingSource,'meetup');
  }finally{globalThis.fetch=orig;}
});
