import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { SavedEventSnapshot } from '@/types/events';
import { addSavedEvent, removeSavedEvent } from '@/utils/savedEventList';

const event = (id: string): SavedEventSnapshot => ({
  id, title: id, category: 'music', startAt: '2026-12-01T20:00:00Z',
  venueName: 'Test venue', latitude: 53.48, longitude: -2.24,
  source: 'manual', savedAt: '2026-10-15T00:00:00Z',
});

describe('saved event updates', () => {
  it('removes two events one after another without resurrecting the first', () => {
    let latest = [event('a'), event('b'), event('c')];
    const apply = (change: (current: SavedEventSnapshot[]) => SavedEventSnapshot[]) => {
      latest = change(latest);
    };
    apply((current) => removeSavedEvent(current, 'a'));
    apply((current) => removeSavedEvent(current, 'b'));
    assert.deepEqual(latest.map((saved) => saved.id), ['c']);
  });
  it('makes repeat unsave safe and does not change other events', () => {
    const original = [event('a'), event('b')];
    const once = removeSavedEvent(original, 'a');
    assert.deepEqual(removeSavedEvent(once, 'a'), once);
    assert.deepEqual(original.map((saved) => saved.id), ['a', 'b']);
  });
  it('never duplicates the same saved event', () => {
    const original = [event('a')];
    assert.equal(addSavedEvent(original, event('a')), original);
  });
});
