import { UserProfile } from '@/types/habit';

type CountryPreset = {
  recipeTags: string[];
  eventKeywords: string[];
};

const PRESETS: Record<string, CountryPreset> = {
  NG: {
    recipeTags: ['nigerian', 'west-african', 'african', 'jollof', 'suya'],
    eventKeywords: ['nigeria', 'nigerian', 'lagos', 'abuja', 'afrobeats', 'nollywood'],
  },
  GH: {
    recipeTags: ['ghanaian', 'west-african', 'african', 'jollof'],
    eventKeywords: ['ghana', 'ghanaian', 'accra', 'afrobeats'],
  },
  KE: {
    recipeTags: ['kenyan', 'east-african', 'african'],
    eventKeywords: ['kenya', 'kenyan', 'nairobi'],
  },
  ZA: {
    recipeTags: ['south-african', 'african'],
    eventKeywords: ['south africa', 'south-african', 'johannesburg', 'cape town'],
  },
  IN: {
    recipeTags: ['indian', 'curry', 'masala'],
    eventKeywords: ['india', 'indian', 'bollywood'],
  },
  JP: {
    recipeTags: ['japanese', 'sushi', 'ramen'],
    eventKeywords: ['japan', 'japanese', 'tokyo'],
  },
  KR: {
    recipeTags: ['korean', 'kimchi', 'k-food'],
    eventKeywords: ['korea', 'korean', 'seoul', 'k-pop'],
  },
  BR: {
    recipeTags: ['brazilian', 'latin'],
    eventKeywords: ['brazil', 'brazilian', 'rio', 'sao paulo'],
  },
  MX: {
    recipeTags: ['mexican', 'latin'],
    eventKeywords: ['mexico', 'mexican'],
  },
};

export type NationalitySignals = {
  primaryCode: string | null;
  primaryName: string | null;
  countryCodes: string[];
  countryNamesLower: string[];
  recipeTags: string[];
  eventKeywords: string[];
};

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean).map((v) => v.toLowerCase())));
}

export function getNationalitySignals(profile: UserProfile | null | undefined): NationalitySignals {
  const nationalities = profile?.nationalities ?? [];
  const primary = nationalities[0];
  const countryCodes = nationalities.map((n) => (n.code || '').toUpperCase()).filter(Boolean);
  const countryNamesLower = dedupe(nationalities.map((n) => n.name || ''));

  const presetRecipeTags = countryCodes.flatMap((c) => PRESETS[c]?.recipeTags ?? []);
  const presetEventKeywords = countryCodes.flatMap((c) => PRESETS[c]?.eventKeywords ?? []);

  const genericRecipeTags = [
    ...countryNamesLower,
    ...countryNamesLower.map((name) => `${name} food`),
  ];
  const genericEventKeywords = [
    ...countryNamesLower,
    ...countryNamesLower.map((name) => `${name} event`),
    ...countryNamesLower.map((name) => `${name} music`),
  ];

  return {
    primaryCode: primary?.code?.toUpperCase() ?? null,
    primaryName: primary?.name ?? null,
    countryCodes,
    countryNamesLower,
    recipeTags: dedupe([...presetRecipeTags, ...genericRecipeTags]),
    eventKeywords: dedupe([...presetEventKeywords, ...genericEventKeywords]),
  };
}

