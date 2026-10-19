import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_ELEVENLABS_VOICE, resolveElevenLabsVoice } from '../elevenLabsVoiceConfig';

describe('Daily summary voice defaults', () => {
  it('uses production-tested George voice by default', () => {
    assert.equal(DEFAULT_ELEVENLABS_VOICE.name, 'George');
    assert.deepEqual(resolveElevenLabsVoice(), {
      voiceId: 'JBFqnCBsd6RMkjVDRZzb',
      voiceName: 'George',
    });
  });
  it('allows Railway and in-request voice overrides', () => {
    assert.deepEqual(resolveElevenLabsVoice(undefined, 'account-voice'), {
      voiceId: 'account-voice',
      voiceName: 'Custom ElevenLabs voice',
    });
    assert.equal(resolveElevenLabsVoice('requested', 'account-voice').voiceId, 'requested');
  });
  it('ignores empty overrides', () => {
    assert.equal(resolveElevenLabsVoice(' ', ' ').voiceId, DEFAULT_ELEVENLABS_VOICE.id);
  });
});
