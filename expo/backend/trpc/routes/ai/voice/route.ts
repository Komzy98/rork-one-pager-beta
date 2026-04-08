import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
const DEFAULT_VOICE_NAME = 'Rachel';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

export const generateVoiceRoute = publicProcedure
  .input(
    z.object({
      text: z.string().trim().min(1).max(4000),
      voiceId: z.string().trim().min(1).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = input.voiceId ?? DEFAULT_VOICE_ID;

    console.log('🎤 [ElevenLabs] Voice generation request received', {
      textLength: input.text.length,
      hasApiKey: Boolean(apiKey),
      voiceId,
      voiceName: DEFAULT_VOICE_NAME,
    });

    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const url = `${ELEVENLABS_API_URL}/${voiceId}?output_format=mp3_44100_128`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: input.text,
        model_id: DEFAULT_MODEL_ID,
        voice_settings: {
          stability: 0.38,
          similarity_boost: 0.88,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ [ElevenLabs] Voice generation failed', {
        status: response.status,
        body: errorText.slice(0, 300),
      });
      throw new Error('Failed to generate ElevenLabs voice audio');
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioDataUri = `data:audio/mpeg;base64,${audioBase64}`;

    console.log('✅ [ElevenLabs] Voice generation succeeded', {
      bytes: audioBuffer.byteLength,
      voiceId,
      voiceName: DEFAULT_VOICE_NAME,
    });

    return {
      audioDataUri,
      voiceId,
      voiceName: DEFAULT_VOICE_NAME,
      provider: 'elevenlabs' as const,
    };
  });
