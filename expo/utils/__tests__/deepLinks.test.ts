import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEventAppLink,
  buildEventLink,
  buildEventWebLink,
  parseDeepLink,
  WEB_INVITE_ORIGIN,
} from '@/utils/deepLinks';

describe('deepLinks', () => {
  it('builds HTTPS share links', () => {
    assert.equal(
      buildEventLink('tm-G5vYZ_F6nZj_s'),
      `${WEB_INVITE_ORIGIN}/event/tm-G5vYZ_F6nZj_s`,
    );
  });

  it('builds HTTPS share links with inviter', () => {
    assert.equal(
      buildEventWebLink('tm-abc', { from: 'komzy' }),
      `${WEB_INVITE_ORIGIN}/event/tm-abc?from=komzy`,
    );
  });

  it('builds custom-scheme app links', () => {
    assert.equal(buildEventAppLink('tm-G5vYZ_F6nZj_s'), 'onepager:///event/tm-G5vYZ_F6nZj_s');
  });

  it('parses legacy hostname-style event links', () => {
    const parsed = parseDeepLink('onepager://event/tm-G5vYZ_F6nZj_s');
    assert.deepEqual(parsed, { kind: 'event', id: 'tm-G5vYZ_F6nZj_s' });
  });

  it('parses triple-slash event links', () => {
    const parsed = parseDeepLink('onepager:///event/tm-G5vYZ_F6nZj_s');
    assert.deepEqual(parsed, { kind: 'event', id: 'tm-G5vYZ_F6nZj_s' });
  });

  it('parses HTTPS invite links', () => {
    const parsed = parseDeepLink('https://join.onepagerapp.co.uk/event/tm-G5vYZ_F6nZj_s?from=komzy');
    assert.deepEqual(parsed, { kind: 'event', id: 'tm-G5vYZ_F6nZj_s' });
  });

  it('parses encoded event ids', () => {
    const parsed = parseDeepLink('onepager:///event/tm-abc%2F123');
    assert.deepEqual(parsed, { kind: 'event', id: 'tm-abc/123' });
  });
});
