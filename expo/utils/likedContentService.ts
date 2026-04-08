import { unifiedStorage } from '@/utils/unifiedStorage';

export interface LikedItem {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  genreIds: number[];
  voteAverage: number;
  overview: string;
  likedAt: string;
}

const STORAGE_KEY = 'liked_content';

let cachedLikes: LikedItem[] | null = null;

async function loadLikes(): Promise<LikedItem[]> {
  if (cachedLikes !== null) return cachedLikes;
  try {
    const stored = await unifiedStorage.getItem(STORAGE_KEY);
    cachedLikes = stored ? JSON.parse(stored) : [];
    console.log('❤️ Loaded', cachedLikes!.length, 'liked items from storage');
    return cachedLikes!;
  } catch (error) {
    console.error('Failed to load liked content:', error);
    cachedLikes = [];
    return [];
  }
}

async function saveLikes(likes: LikedItem[]): Promise<void> {
  cachedLikes = likes;
  try {
    await unifiedStorage.setItem(STORAGE_KEY, JSON.stringify(likes));
    console.log('❤️ Saved', likes.length, 'liked items to storage');
  } catch (error) {
    console.error('Failed to save liked content:', error);
  }
}

export const likedContentService = {
  async getLikedItems(): Promise<LikedItem[]> {
    return loadLikes();
  },

  async isLiked(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<boolean> {
    const likes = await loadLikes();
    return likes.some(item => item.id === tmdbId && item.mediaType === mediaType);
  },

  async toggleLike(item: {
    id: number;
    mediaType: 'movie' | 'tv';
    title: string;
    poster_path: string | null;
    backdrop_path: string | null;
    genre_ids?: number[];
    vote_average: number;
    overview?: string;
  }): Promise<boolean> {
    const likes = await loadLikes();
    const existingIndex = likes.findIndex(
      l => l.id === item.id && l.mediaType === item.mediaType
    );

    if (existingIndex !== -1) {
      likes.splice(existingIndex, 1);
      await saveLikes(likes);
      console.log('💔 Unliked:', item.title);
      return false;
    } else {
      const newLike: LikedItem = {
        id: item.id,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
        genreIds: item.genre_ids || [],
        voteAverage: item.vote_average,
        overview: item.overview || '',
        likedAt: new Date().toISOString(),
      };
      likes.unshift(newLike);
      await saveLikes(likes);
      console.log('❤️ Liked:', item.title);
      return true;
    }
  },

  async getLikedGenres(): Promise<{ genreId: number; count: number }[]> {
    const likes = await loadLikes();
    const genreCounts: Record<number, number> = {};
    likes.forEach(item => {
      item.genreIds.forEach(gid => {
        genreCounts[gid] = (genreCounts[gid] || 0) + 1;
      });
    });
    return Object.entries(genreCounts)
      .map(([id, count]) => ({ genreId: Number(id), count }))
      .sort((a, b) => b.count - a.count);
  },

  async getPreferredMediaType(): Promise<'movie' | 'tv' | 'both'> {
    const likes = await loadLikes();
    const movies = likes.filter(l => l.mediaType === 'movie').length;
    const tv = likes.filter(l => l.mediaType === 'tv').length;
    if (movies === 0 && tv === 0) return 'both';
    if (movies > tv * 2) return 'movie';
    if (tv > movies * 2) return 'tv';
    return 'both';
  },

  clearCache() {
    cachedLikes = null;
  },
};
