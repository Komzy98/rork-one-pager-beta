import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { resolveElevenLabsVoice } from '@/utils/elevenLabsVoiceConfig';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
// The voice is resolved from a verified, free-plan-compatible narrator.
const DEFAULT_MODEL_ID = 'eleven_v4';

export const generateVoiceRoute = publicProcedure
  .input(
    z.object({
      text: z.string().trim().min(1).max(4000),
      voiceId: z.string().trim().min(1).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const { voiceId, voiceName } = resolveElevenLabsVoice(input.voiceId, process.env.ELEVENLABS_VOICE_ID);
    const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID;

    console.log('🎤 [ElevenLabs] Natural summary narration requested', {
      textLength: input.text.length,
      hasApiKey: Boolean(apiKey),
      voiceId,
      modelId,
    });

    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const url = `${ELEVENLABS_API_URL}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        // The v4 model understands a gentle delivery cue. The underlying words
        // remain the actual grounded daily summary (no invented achievements).
        text: `[warm, natural, relaxed conversational tone] ${input.text}`,
        model_id: modelId,
        language_code: 'en',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ [ElevenLabs] Voice generation failed', {
        status: response.status,
        body: errorText.slice(0, 300),
        modelId,
      });
      throw new Error('Failed to generate ElevenLabs voice audio');
    }

    const audioBuffer = await response.arrayBuffer();
    if (!audioBuffer.byteLength) throw new Error('ElevenLabs returned empty audio');

    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`;

    console.log('✅ [ElevenLabs] Voice generation succeeded', {
      bytes: audioBuffer.byteLength,
      voiceId,
      modelId,
    });

    return {
      audioDataUri,
      voiceId,
      voiceName,
      provider: 'elevenlabs' as const,
    };
  });
