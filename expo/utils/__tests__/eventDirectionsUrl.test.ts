import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildEventDirectionsUrl } from '../eventDirectionsUrl';

describe('Live route handoff', () => {
  it('uses Apple Maps navigation for a valid coordinate', () => {
    assert.match(buildEventDirectionsUrl('ios','O2 Apollo','Manchester',53.46,-2.21,'transit'), /maps.apple.com.*53.46%2C-2.21.*dirflg=r/);
  });
  it('uses the real venue if provider coordinates are missing or placeholder zero', () => {
    assert.match(buildEventDirectionsUrl('android','Theatre Royal','Manchester',0,0,'walking'), /destination=Theatre%20Royal%2C%20Manchester&travelmode=walking/);
  });
  it('does not invent a journey time or starting address', () => {
    const url = buildEventDirectionsUrl('web','Venue','London',undefined,undefined,'driving');
    assert.match(url,/maps\/dir/);
    assert.doesNotMatch(url,/origin=/);
    assert.doesNotMatch(url,/minutes=/);
  });
});
