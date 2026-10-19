/**
 * Default daily-summary narrator. George was verified with the production
 * ElevenLabs API on the project's current plan using model eleven_v4.
 * Keep overrides available for user-selected voices and Railway configuration.
 */
export const DEFAULT_ELEVENLABS_VOICE = {
  id: 'JBFqnCBsd6RMkjVDRZzb',
  name: 'George',
} as const;

export function resolveElevenLabsVoice(
  requestedVoiceId?: string | null,
  configuredVoiceId?: string | null,
): { voiceId: string; voiceName: string } {
  const voiceId = requestedVoiceId?.trim() || configuredVoiceId?.trim() || DEFAULT_ELEVENLABS_VOICE.id;
  return {
    voiceId,
    voiceName: voiceId === DEFAULT_ELEVENLABS_VOICE.id ? DEFAULT_ELEVENLABS_VOICE.name : 'Custom ElevenLabs voice',
  };
}
