import type { TMDBMovie, TMDBTVShow } from '@/utils/tmdbApi';

export type AroundYouRegion = 'Salford' | 'Manchester' | 'London' | 'UK Wide';

export const AROUND_YOU_REGIONS: AroundYouRegion[] = [
  'Salford',
  'Manchester',
  'London',
  'UK Wide',
];

export type AroundYouStubTv = TMDBTVShow & { media_type?: 'tv' };
export type AroundYouStubMovie = TMDBMovie & { media_type?: 'movie' };

function tv(
  base: Pick<TMDBTVShow, 'id' | 'name' | 'poster_path' | 'backdrop_path'>,
  extra?: Partial<TMDBTVShow>,
): AroundYouStubTv {
  return {
    overview: extra?.overview ?? '',
    first_air_date: extra?.first_air_date ?? '2024-01-01',
    vote_average: extra?.vote_average ?? 8.2,
    genre_ids: extra?.genre_ids ?? [18],
    origin_country: extra?.origin_country ?? ['GB', 'US'],
    ...base,
    ...extra,
  };
}

function movie(
  base: Pick<TMDBMovie, 'id' | 'title' | 'poster_path' | 'backdrop_path'>,
  extra?: Partial<TMDBMovie>,
): AroundYouStubMovie {
  return {
    overview: extra?.overview ?? '',
    release_date: extra?.release_date ?? '1988-12-16',
    vote_average: extra?.vote_average ?? 8,
    genre_ids: extra?.genre_ids ?? [18],
    adult: false,
    ...base,
    ...extra,
  };
}

/** Featured hero slides (backdrop + headline metrics). */
export type AroundYouHeroSlide = {
  key: string;
  backdropPath: string;
  title: string;
  watchingNow: number;
  surgeTonight: string;
  tmdb: AroundYouStubTv | AroundYouStubMovie;
  mediaType: 'movie' | 'tv';
};

export type AroundYouRailItem = {
  key: string;
  title: string;
  posterPath: string;
  badge: string;
  tmdb: AroundYouStubTv | AroundYouStubMovie;
  mediaType: 'movie' | 'tv';
  /** Streaming provider label (Trending ranked cards). */
  provider?: string;
  /** Extra surge line e.g. "+35% tonight" for ranked row. */
  surgeLabel?: string;
};

export type AroundYouMoodPulse = {
  label: string;
  change: string;
  up: boolean;
};

export type AroundYouBundle = {
  region: AroundYouRegion;
  activeViewers: number;
  trendingTitlesCount: number;
  activityVsYesterday: string;
  peakEveningPct: number;
  heroEyebrow: string;
  heroMoodLine: string;
  heroSlides: AroundYouHeroSlide[];
  topThree: {
    title: string;
    watching: number;
    surge: string;
    tmdb: AroundYouStubTv | AroundYouStubMovie;
    mediaType: 'movie' | 'tv';
  }[];
  hotRail: AroundYouRailItem[];
  climbingRail: AroundYouRailItem[];
  watchMoodTitle: string;
  watchMoodBody: string;
  genreBreakdown: { label: string; pct: number; color: string }[];
  peakTimeLabel: string;
  hiddenGem: {
    title: string;
    body: string;
    watching: string;
    posterPath: string;
    tmdb: AroundYouStubMovie;
  };
  tasteSectionTitle: string;
  tasteSectionSubtitle: string;
  tasteRail: AroundYouRailItem[];
  /** Watch Mood: genre / format momentum vs last night (simulated). */
  moodGenrePulse: AroundYouMoodPulse[];
  /** Watch Mood: titles that fit tonight’s local pattern. */
  moodSuggestionRail: AroundYouRailItem[];
};

const SLIDES_SALFORD: AroundYouHeroSlide[] = [
  {
    key: 'adolescence',
    backdropPath: '/iArhVCRBCmpe4ub9q6K9hXecIvj.jpg',
    title: 'Adolescence',
    watchingNow: 214,
    surgeTonight: '+38%',
    tmdb: tv({
      id: 249042,
      name: 'Adolescence',
      poster_path: '/iArhVCRBCmpe4ub9q6K9hXecIvj.jpg',
      backdrop_path: '/iArhVCRBCmpe4ub9q6K9hXecIvj.jpg',
    }),
    mediaType: 'tv',
  },
  {
    key: 'blackmirror',
    backdropPath: '/5DUMP8zIJ951nbBWyFR5Md56zn9.jpg',
    title: 'Black Mirror',
    watchingNow: 189,
    surgeTonight: '+22%',
    tmdb: tv({
      id: 42009,
      name: 'Black Mirror',
      poster_path: '/7PRddO7z7mcHi21IM4vBkEIanSZ.jpg',
      backdrop_path: '/5DUMP8zIJ951nbBWyFR5Md56zn9.jpg',
    }),
    mediaType: 'tv',
  },
  {
    key: 'tlou',
    backdropPath: '/rLbR5BRDFURIqlAGKZ8AhkuXM2.jpg',
    title: 'The Last of Us',
    watchingNow: 176,
    surgeTonight: '+31%',
    tmdb: tv({
      id: 100088,
      name: 'The Last of Us',
      poster_path: '/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
      backdrop_path: '/rLbR5BRDFURIqlAGKZ8AhkuXM2.jpg',
    }),
    mediaType: 'tv',
  },
];

function hashRegion(r: AroundYouRegion): number {
  const s = r.charCodeAt(0) + (r.charCodeAt(r.length - 1) ?? 0);
  return s % 5;
}

export function getAroundYouBundle(region: AroundYouRegion): AroundYouBundle {
  const h = hashRegion(region);
  const scale = region === 'UK Wide' ? 2.4 : region === 'London' ? 1.8 : region === 'Manchester' ? 1.2 : 1;

  const activeViewers = Math.round((1284 + h * 37) * scale);
  const moodBodies: Record<AroundYouRegion, string> = {
    Salford:
      'Psychological thrillers and crime dramas are surging after 9PM. Comedy specials dipped slightly as viewers lean darker tonight.',
    Manchester:
      'Manchester viewers are heavily favouring dark dramas and prestige miniseries tonight — especially UK co-productions.',
    London:
      'London is splitting between late-night comedy drops and gritty crime — peak energy is building toward 10PM.',
    'UK Wide':
      'Nationwide, crime and thriller titles are pacing ahead of comedy. Sci-fi is holding steady in second place.',
  };

  const heroMoods: Record<AroundYouRegion, string> = {
    Salford: 'Crime drama is dominating local screens',
    Manchester: 'Dark drama is leading the North West tonight',
    London: 'Thrillers and limited series own the capital tonight',
    'UK Wide': 'Crime & thriller are the UK’s top mood tonight',
  };

  const hotRail: AroundYouRailItem[] = [
    {
      key: 'h1',
      title: 'Adolescence',
      posterPath: '/iArhVCRBCmpe4ub9q6K9hXecIvj.jpg',
      badge: '1.2K watching',
      surgeLabel: '+35%',
      provider: 'Netflix',
      tmdb: SLIDES_SALFORD[0].tmdb,
      mediaType: 'tv',
    },
    {
      key: 'h2',
      title: 'Black Mirror',
      posterPath: '/7PRddO7z7mcHi21IM4vBkEIanSZ.jpg',
      badge: '980 watching',
      surgeLabel: '+28%',
      provider: 'Netflix',
      tmdb: SLIDES_SALFORD[1].tmdb,
      mediaType: 'tv',
    },
    {
      key: 'h3',
      title: 'The Last of Us',
      posterPath: '/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
      badge: '890 watching',
      surgeLabel: '+19%',
      provider: 'HBO',
      tmdb: SLIDES_SALFORD[2].tmdb,
      mediaType: 'tv',
    },
    {
      key: 'h4',
      title: 'Baby Reindeer',
      posterPath: '/pVULkpCfoeSxTOFIeI6fRbg4bEY.jpg',
      badge: '720 watching',
      surgeLabel: '+41%',
      provider: 'Netflix',
      tmdb: tv({
        id: 130052,
        name: 'Baby Reindeer',
        poster_path: '/pVULkpCfoeSxTOFIeI6fRbg4bEY.jpg',
        backdrop_path: '/pVULkpCfoeSxTOFIeI6fRbg4bEY.jpg',
      }),
      mediaType: 'tv',
    },
    {
      key: 'h5',
      title: 'The Gentlemen',
      posterPath: '/jPMJ8PZbCeJTEf4bl3XspqowKjy.jpg',
      badge: '540 watching',
      surgeLabel: '+14%',
      provider: 'Netflix',
      tmdb: tv({
        id: 202555,
        name: 'The Gentlemen',
        poster_path: '/jPMJ8PZbCeJTEf4bl3XspqowKjy.jpg',
        backdrop_path: '/jPMJ8PZbCeJTEf4bl3XspqowKjy.jpg',
      }),
      mediaType: 'tv',
    },
  ];

  const climbingRail: AroundYouRailItem[] = [
    {
      key: 'c1',
      title: '3 Body Problem',
      posterPath: '/ykZ7jpSACPnjO8RJp7vEPelVqBK.jpg',
      badge: '↑ 61%',
      tmdb: tv({
        id: 125988,
        name: '3 Body Problem',
        poster_path: '/ykZ7jpSACPnjO8RJp7vEPelVqBK.jpg',
        backdrop_path: '/ykZ7jpSACPnjO8RJp7vEPelVqBK.jpg',
      }),
      mediaType: 'tv',
    },
    {
      key: 'c2',
      title: 'The Night Agent',
      posterPath: '/z8y0qtSsTVZK61DzMvJ906U8Llq.jpg',
      badge: '↑ 48%',
      tmdb: tv({
        id: 129552,
        name: 'The Night Agent',
        poster_path: '/z8y0qtSsTVZK61DzMvJ906U8Llq.jpg',
        backdrop_path: '/z8y0qtSsTVZK61DzMvJ906U8Llq.jpg',
      }),
      mediaType: 'tv',
    },
    {
      key: 'c3',
      title: 'The Bear',
      posterPath: '/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg',
      badge: '↑ 35%',
      tmdb: tv({
        id: 136315,
        name: 'The Bear',
        poster_path: '/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg',
        backdrop_path: '/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg',
      }),
      mediaType: 'tv',
    },
    {
      key: 'c4',
      title: 'Succession',
      posterPath: '/7WWqySvEP0bB4yFC7KoYJ78PZhY.jpg',
      badge: '↑ 29%',
      tmdb: tv({
        id: 76331,
        name: 'Succession',
        poster_path: '/7WWqySvEP0bB4yFC7KoYJ78PZhY.jpg',
        backdrop_path: '/7WWqySvEP0bB4yFC7KoYJ78PZhY.jpg',
      }),
      mediaType: 'tv',
    },
    {
      key: 'c5',
      title: 'No Country for Old Men',
      posterPath: '/6JoRhgzfanfC1i8xnx7NWJBqAk8.jpg',
      badge: '↑ 24%',
      tmdb: movie({
        id: 6977,
        title: 'No Country for Old Men',
        poster_path: '/6JoRhgzfanfC1i8xnx7NWJBqAk8.jpg',
        backdrop_path: '/6JoRhgzfanfC1i8xnx7NWJBqAk8.jpg',
      }),
      mediaType: 'movie',
    },
  ];

  const tasteRail: AroundYouRailItem[] = [
    {
      key: 't1',
      title: 'Tom Segura: Sledgehammer',
      posterPath: '/b9ENFUI7QOZbV0AEyXMbwmWI3lP.jpg',
      badge: '+52 watching',
      tmdb: movie({
        id: 1158870,
        title: 'Tom Segura: Sledgehammer',
        poster_path: '/b9ENFUI7QOZbV0AEyXMbwmWI3lP.jpg',
        backdrop_path: '/b9ENFUI7QOZbV0AEyXMbwmWI3lP.jpg',
      }),
      mediaType: 'movie',
    },
    {
      key: 't2',
      title: 'Dave Chappelle: The Dreamer',
      posterPath: '/9GuvODauvWAWyV5hZPKXvb9PjBJ.jpg',
      badge: '+41 watching',
      tmdb: movie({
        id: 1212142,
        title: 'Dave Chappelle: The Dreamer',
        poster_path: '/9GuvODauvWAWyV5hZPKXvb9PjBJ.jpg',
        backdrop_path: '/9GuvODauvWAWyV5hZPKXvb9PjBJ.jpg',
      }),
      mediaType: 'movie',
    },
    {
      key: 't3',
      title: 'John Mulaney: Baby J',
      posterPath: '/jXPlkwTUwtBpQS83YQ92c6v6p2C.jpg',
      badge: '+38 watching',
      tmdb: movie({
        id: 1100099,
        title: 'John Mulaney: Baby J',
        poster_path: '/jXPlkwTUwtBpQS83YQ92c6v6p2C.jpg',
        backdrop_path: '/jXPlkwTUwtBpQS83YQ92c6v6p2C.jpg',
      }),
      mediaType: 'movie',
    },
    {
      key: 't4',
      title: 'Bo Burnham: Inside',
      posterPath: '/kODL0ggN7mkndryI3fpbcfkX6qY.jpg',
      badge: '+33 watching',
      tmdb: movie({
        id: 823754,
        title: 'Bo Burnham: Inside',
        poster_path: '/kODL0ggN7mkndryI3fpbcfkX6qY.jpg',
        backdrop_path: '/kODL0ggN7mkndryI3fpbcfkX6qY.jpg',
      }),
      mediaType: 'movie',
    },
  ];

  const hiddenGem = {
    title: 'Rain Man',
    body: 'Rain Man is quietly becoming one of the most watched titles nearby tonight — word-of-mouth is spreading fast.',
    watching: '+76 watching now',
    posterPath: '/vwY5JHB4WT8Ur9n2PCXeqqnfEkv.jpg',
    tmdb: movie({
      id: 380,
      title: 'Rain Man',
      poster_path: '/vwY5JHB4WT8Ur9n2PCXeqqnfEkv.jpg',
      backdrop_path: '/npFVnHfDHY6FuuRXfa8C1SZOJda.jpg',
    }),
  };

  return {
    region,
    activeViewers,
    trendingTitlesCount: 28 + h,
    activityVsYesterday: '+18%',
    peakEveningPct: 72 - (h % 4),
    heroEyebrow: `Around ${region === 'UK Wide' ? 'the UK' : region} tonight`,
    heroMoodLine: heroMoods[region],
    heroSlides: SLIDES_SALFORD,
    topThree: [
      {
        title: 'Adolescence',
        watching: 214 + h * 3,
        surge: '+38%',
        tmdb: SLIDES_SALFORD[0].tmdb,
        mediaType: 'tv' as const,
      },
      {
        title: 'Black Mirror',
        watching: 189 + h * 2,
        surge: '+22%',
        tmdb: SLIDES_SALFORD[1].tmdb,
        mediaType: 'tv' as const,
      },
      {
        title: 'The Last of Us',
        watching: 176 + h,
        surge: '+31%',
        tmdb: SLIDES_SALFORD[2].tmdb,
        mediaType: 'tv' as const,
      },
    ],
    hotRail,
    climbingRail,
    watchMoodTitle: `${region === 'UK Wide' ? 'UK' : region} watch mood`,
    watchMoodBody: moodBodies[region],
    genreBreakdown: [
      { label: 'Crime / Thriller', pct: 38, color: '#E50914' },
      { label: 'Drama', pct: 27, color: '#FF6B6B' },
      { label: 'Comedy', pct: 14, color: '#7C8CFF' },
      { label: 'Sci‑Fi', pct: 12, color: '#64D2FF' },
      { label: 'Other', pct: 9, color: '#52525B' },
    ],
    peakTimeLabel: 'Peak time tonight · 9PM',
    hiddenGem,
    tasteSectionTitle: 'People like you nearby also watched',
    tasteSectionSubtitle:
      'People near you who watch stand-up comedy also jumped into these tonight',
    tasteRail,
    moodGenrePulse: [
      { label: 'Crime & thriller', change: `+${18 + h}% vs last night`, up: true },
      { label: 'Comedy (specials & late night)', change: '+12%', up: true },
      { label: 'Documentaries', change: '−8%', up: false },
      { label: 'Sci‑fi / genre', change: '+4%', up: true },
    ],
    moodSuggestionRail: [
      { ...hotRail[0], key: 'm1', badge: 'Matches mood' },
      { ...hotRail[2], key: 'm2', badge: 'Peak time hit' },
      { ...climbingRail[0], key: 'm3', badge: 'Surging' },
      { ...climbingRail[2], key: 'm4', badge: 'Local pick' },
    ],
  };
}
