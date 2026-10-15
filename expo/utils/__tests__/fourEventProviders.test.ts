import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractUkPostcode, normalizeCandidate } from '@/backend/services/extraEventProviderCommon';
import { fetchFientaUkEvents } from '@/backend/services/fientaPublicDiscovery';
import { fetchEnts24LicensedEvents } from '@/backend/services/ents24PartnerDiscovery';

const input = { latitude: 53.48, longitude: -2.25, radiusMiles: 25, size: 20 };
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: {'Content-Type': 'application/json'} });
describe('Four events providers', () => {
  it('requires a real UK postcode and valid event details', () => {
    assert.equal(extractUkPostcode('Manchester, M1 1AE'), 'M1 1AE');
    assert.equal(extractUkPostcode('No postcode here'), null);
    assert.equal(normalizeCandidate({ id:'1', title:'No location', venue:'Venue', city:'', lat:NaN, lon:NaN, startIso:new Date(Date.now()+86400000).toISOString(), ticketUrl:'https://fienta.com/1', source:'fienta' }), null);
  });
  it('maps live public Fienta listings using postcode coordinates', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).includes('api.postcodes.io')) return json({result:[{query:'M1 1AE',result:{latitude:53.483487,longitude:-2.231182,admin_district:'Manchester'}}]});
      assert.ok(String(url).includes('country=GB'));
      const dt = new Date(Date.now()+86400000).toISOString().slice(0,10)+' 19:00:00';
      return json({pagination:{last_page:1},events:[{id:999, title:'Manchester jazz evening', starts_at:dt, ends_at:dt, venue:'Jazz Hall', address_postal_code:'M1 1AE', url:'https://fienta.com/jazz-fixture',image_url:'https://fienta.com/jazz.jpg', event_status:'scheduled'}]});
    };
    try {
      const events = await fetchFientaUkEvents({...input, keyword:'jazz'});
      assert.equal(events.length,1);
      assert.equal(events[0].listingSource,'fienta');
      assert.equal(events[0].latitude,53.483487);
    } finally { globalThis.fetch=orig; }
  });
  it('does not call Ents24 with an unapproved domain',async()=>{
    await assert.rejects(fetchEnts24LicensedEvents(input,'https://evil.example/events','Bearer abc'),/approved provider host/);
  });
});
