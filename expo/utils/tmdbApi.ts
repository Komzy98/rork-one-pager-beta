const TMDB_API_KEY = '9c4ca7924ae21a581e065517c106f1cc';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';


export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  adult: boolean;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  genre_ids: number[];
  origin_country: string[];
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  vote_average: number;
  runtime: number | null;
}

export interface TMDBSeason {
  id: number;
  name: string;
  overview: string;
  air_date: string | null;
  season_number: number;
  poster_path: string | null;
  episode_count: number;
  episodes?: TMDBEpisode[];
}

export interface TMDBTVShowDetails extends TMDBTVShow {
  number_of_seasons: number;
  number_of_episodes: number;
  status: string; // 'Returning Series', 'Ended', 'Canceled', 'In Production'
  seasons: TMDBSeason[];
  next_episode_to_air: TMDBEpisode | null;
  last_episode_to_air: TMDBEpisode | null;
  genres: { id: number; name: string }[];
}

export interface TMDBSearchResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface WatchProvider {
  display_priority: number;
  logo_path: string;
  provider_id: number;
  provider_name: string;
}

export interface CountryWatchProviders {
  link?: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

export interface WatchProvidersResponse {
  id: number;
  results: Record<string, CountryWatchProviders>;
}

export interface TMDBVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  official: boolean;
  published_at: string;
  site: string;
  size: number;
  type: string;
}

export interface TMDBVideosResponse {
  id: number;
  results: TMDBVideo[];
}

class TMDBApi {
  private async makeRequest<T>(endpoint: string, retries: number = 2): Promise<T> {
    const url = `${TMDB_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`;

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
          if (response.status >= 500 && attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
            continue;
          }
          throw new Error(`TMDB API error: ${response.status}`);
        }
        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
        const isNetworkError =
          error instanceof TypeError ||
          (error instanceof Error && error.name === 'AbortError');
        if (isNetworkError && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        }
        break;
      }
    }
    if (lastError instanceof TypeError) {
      console.warn('TMDB API network unavailable:', (lastError as Error).message);
    } else {
      console.error('TMDB API request failed:', lastError);
    }
    throw lastError instanceof Error ? lastError : new Error('TMDB API request failed');
  }

  async searchMovies(query: string, page: number = 1): Promise<TMDBSearchResponse<TMDBMovie>> {
    return this.makeRequest(`/search/movie?query=${encodeURIComponent(query)}&page=${page}`);
  }

  async searchTVShows(query: string, page: number = 1): Promise<TMDBSearchResponse<TMDBTVShow>> {
    return this.makeRequest(`/search/tv?query=${encodeURIComponent(query)}&page=${page}`);
  }

  async getTrendingMovies(timeWindow: 'day' | 'week' = 'week'): Promise<TMDBSearchResponse<TMDBMovie>> {
    return this.makeRequest(`/trending/movie/${timeWindow}`);
  }

  async getTrendingTVShows(timeWindow: 'day' | 'week' = 'week'): Promise<TMDBSearchResponse<TMDBTVShow>> {
    return this.makeRequest(`/trending/tv/${timeWindow}`);
  }

  async getPopularMovies(page: number = 1): Promise<TMDBSearchResponse<TMDBMovie>> {
    return this.makeRequest(`/movie/popular?page=${page}`);
  }

  async getPopularTVShows(page: number = 1): Promise<TMDBSearchResponse<TMDBTVShow>> {
    return this.makeRequest(`/tv/popular?page=${page}`);
  }

  async getMovieDetails(movieId: number): Promise<TMDBMovie & { runtime: number; genres: { id: number; name: string }[] }> {
    return this.makeRequest(`/movie/${movieId}`);
  }

  async getTVShowDetails(tvId: number): Promise<TMDBTVShowDetails> {
    return this.makeRequest(`/tv/${tvId}`);
  }

  async getTVSeasonDetails(tvId: number, seasonNumber: number): Promise<TMDBSeason> {
    return this.makeRequest(`/tv/${tvId}/season/${seasonNumber}`);
  }

  async getNextEpisodeAirDate(tvId: number): Promise<{ nextEpisode: TMDBEpisode | null; showName: string; status: string }> {
    try {
      const showDetails = await this.getTVShowDetails(tvId);
      return {
        nextEpisode: showDetails.next_episode_to_air,
        showName: showDetails.name,
        status: showDetails.status,
      };
    } catch (error) {
      console.error('Error fetching next episode:', error);
      return { nextEpisode: null, showName: '', status: '' };
    }
  }

  async getTopRatedMovies(page: number = 1): Promise<TMDBSearchResponse<TMDBMovie>> {
    return this.makeRequest(`/movie/top_rated?page=${page}`);
  }

  async getTopRatedTVShows(page: number = 1): Promise<TMDBSearchResponse<TMDBTVShow>> {
    return this.makeRequest(`/tv/top_rated?page=${page}`);
  }

  async getUpcomingMovies(page: number = 1): Promise<TMDBSearchResponse<TMDBMovie>> {
    return this.makeRequest(`/movie/upcoming?page=${page}`);
  }

  async getNowPlayingMovies(page: number = 1): Promise<TMDBSearchResponse<TMDBMovie>> {
    return this.makeRequest(`/movie/now_playing?page=${page}`);
  }

  async getAiringTodayTVShows(page: number = 1): Promise<TMDBSearchResponse<TMDBTVShow>> {
    return this.makeRequest(`/tv/airing_today?page=${page}`);
  }

  async getOnTheAirTVShows(page: number = 1): Promise<TMDBSearchResponse<TMDBTVShow>> {
    return this.makeRequest(`/tv/on_the_air?page=${page}`);
  }

  async getTrendingMoviesByRegion(region: string, timeWindow: 'day' | 'week' = 'week'): Promise<TMDBSearchResponse<TMDBMovie>> {
    return this.makeRequest(`/trending/movie/${timeWindow}?region=${region}`);
  }

  async getTrendingTVShowsByRegion(region: string, timeWindow: 'day' | 'week' = 'week'): Promise<TMDBSearchResponse<TMDBTVShow>> {
    return this.makeRequest(`/trending/tv/${timeWindow}?region=${region}`);
  }

  async getPopularMoviesByRegion(region: string, page: number = 1): Promise<TMDBSearchResponse<TMDBMovie>> {
    return this.makeRequest(`/movie/popular?page=${page}&region=${region}`);
  }

  async getPopularTVShowsByRegion(region: string, page: number = 1): Promise<TMDBSearchResponse<TMDBTVShow>> {
    return this.makeRequest(`/tv/popular?page=${page}&watch_region=${region}`);
  }

  getImageUrl(path: string | null, size: 'w200' | 'w300' | 'w500' | 'w780' | 'original' = 'w500'): string | null {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  async searchMulti(query: string, page: number = 1): Promise<TMDBSearchResponse<(TMDBMovie | TMDBTVShow) & { media_type: 'movie' | 'tv' }>> {
    return this.makeRequest(`/search/multi?query=${encodeURIComponent(query)}&page=${page}`);
  }

  async getMovieWatchProviders(movieId: number): Promise<WatchProvidersResponse> {
    return this.makeRequest(`/movie/${movieId}/watch/providers`);
  }

  async getTVWatchProviders(tvId: number): Promise<WatchProvidersResponse> {
    return this.makeRequest(`/tv/${tvId}/watch/providers`);
  }

  async getWatchProviders(id: number, mediaType: 'movie' | 'tv'): Promise<WatchProvidersResponse> {
    return mediaType === 'movie' 
      ? this.getMovieWatchProviders(id)
      : this.getTVWatchProviders(id);
  }

  async getMovieVideos(movieId: number): Promise<TMDBVideosResponse> {
    return this.makeRequest(`/movie/${movieId}/videos`);
  }

  async getTVVideos(tvId: number): Promise<TMDBVideosResponse> {
    return this.makeRequest(`/tv/${tvId}/videos`);
  }

  async getVideos(id: number, mediaType: 'movie' | 'tv'): Promise<TMDBVideosResponse> {
    return mediaType === 'movie' 
      ? this.getMovieVideos(id)
      : this.getTVVideos(id);
  }

  getYouTubeTrailerUrl(videoKey: string): string {
    return `https://www.youtube.com/watch?v=${videoKey}`;
  }

  findOfficialTrailer(videos: TMDBVideo[]): TMDBVideo | null {
    // Look for official trailers first
    const officialTrailer = videos.find(video => 
      video.site === 'YouTube' && 
      video.type === 'Trailer' && 
      video.official
    );
    
    if (officialTrailer) return officialTrailer;
    
    // Fallback to any trailer
    const anyTrailer = videos.find(video => 
      video.site === 'YouTube' && 
      video.type === 'Trailer'
    );
    
    return anyTrailer || null;
  }

  getProviderLogoUrl(logoPath: string | null): string | null {
    if (!logoPath) return null;
    return `https://image.tmdb.org/t/p/w92${logoPath}`;
  }

  formatWatchProviders(providers: CountryWatchProviders, country: string = 'US'): {
    streaming: WatchProvider[];
    rent: WatchProvider[];
    buy: WatchProvider[];
    link?: string;
  } {
    return {
      streaming: providers.flatrate || [],
      rent: providers.rent || [],
      buy: providers.buy || [],
      link: providers.link
    };
  }

  getWhereToWatchUrl(id: number, mediaType: 'movie' | 'tv'): string {
    return `https://www.themoviedb.org/${mediaType}/${id}/watch`;
  }

  getTMDBUrl(id: number, mediaType: 'movie' | 'tv'): string {
    return `https://www.themoviedb.org/${mediaType}/${id}`;
  }
}

export const tmdbApi = new TMDBApi();

// Genre mapping for better UX
export const MOVIE_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

export const TV_GENRES: Record<number, string> = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western'
};

export function getGenreNames(genreIds: number[], isTV: boolean = false): string[] {
  const genreMap = isTV ? TV_GENRES : MOVIE_GENRES;
  return genreIds.map(id => genreMap[id]).filter(Boolean);
}

export function formatReleaseDate(dateString: string): string {
  if (!dateString) return 'TBA';
  const date = new Date(dateString);
  return date.getFullYear().toString();
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}