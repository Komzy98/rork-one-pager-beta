import { Linking, Alert } from 'react-native';
import { tmdbApi, WatchProvider, CountryWatchProviders } from './tmdbApi';
import { Show } from '@/types/habit';

// Platform-specific deep link URLs
const PLATFORM_DEEP_LINKS = {
  Netflix: {
    ios: 'nflx://www.netflix.com/title/',
    android: 'https://www.netflix.com/title/',
    web: 'https://www.netflix.com/title/'
  },
  'Prime': {
    ios: 'aiv://aiv/resume?asin=',
    android: 'https://app.primevideo.com/detail?gti=',
    web: 'https://www.primevideo.com/detail/'
  },
  'Disney+': {
    ios: 'disneyplus://content/movies/',
    android: 'https://www.disneyplus.com/movies/',
    web: 'https://www.disneyplus.com/movies/'
  },
  'HBO': {
    ios: 'hbomax://series/',
    android: 'https://play.hbomax.com/page/',
    web: 'https://www.hbomax.com/series/'
  },
  'Hulu': {
    ios: 'hulu://watch/',
    android: 'https://www.hulu.com/watch/',
    web: 'https://www.hulu.com/watch/'
  },
  'YouTube': {
    ios: 'youtube://watch?v=',
    android: 'https://www.youtube.com/watch?v=',
    web: 'https://www.youtube.com/watch?v='
  }
};

// Provider name mapping from TMDB to our platform names
const PROVIDER_NAME_MAPPING: Record<string, keyof typeof PLATFORM_DEEP_LINKS> = {
  'Netflix': 'Netflix',
  'Amazon Prime Video': 'Prime',
  'Disney Plus': 'Disney+',
  'HBO Max': 'HBO',
  'Hulu': 'Hulu',
  'YouTube': 'YouTube'
};

export interface NavigationResult {
  success: boolean;
  action: 'streaming' | 'trailer' | 'justwatch' | 'none';
  url?: string;
  message?: string;
}

export async function navigateToShow(show: Show): Promise<NavigationResult> {
  console.log('Navigating to show:', show.title);
  
  // If show has a direct URL (like netflixUrl), use that first
  if (show.netflixUrl) {
    try {
      const canOpen = await Linking.canOpenURL(show.netflixUrl);
      if (canOpen) {
        await Linking.openURL(show.netflixUrl);
        return {
          success: true,
          action: 'streaming',
          url: show.netflixUrl,
          message: `Opened ${show.title} on ${show.platform}`
        };
      }
    } catch (error) {
      console.error('Failed to open direct URL:', error);
    }
  }
  
  // If show has TMDB ID, try to get watch providers
  if (show.tmdbId && show.mediaType) {
    try {
      const [watchProviders, videos] = await Promise.all([
        tmdbApi.getWatchProviders(show.tmdbId, show.mediaType),
        tmdbApi.getVideos(show.tmdbId, show.mediaType)
      ]);
      
      // Try to find streaming providers first
      const usProviders = watchProviders.results['US'];
      if (usProviders) {
        const streamingResult = await tryStreamingProviders(usProviders, show);
        if (streamingResult.success) {
          return streamingResult;
        }
      }
      
      // If no streaming available, try trailer
      const trailer = tmdbApi.findOfficialTrailer(videos.results);
      if (trailer) {
        const trailerUrl = tmdbApi.getYouTubeTrailerUrl(trailer.key);
        try {
          await Linking.openURL(trailerUrl);
          return {
            success: true,
            action: 'trailer',
            url: trailerUrl,
            message: `Opened ${show.title} trailer`
          };
        } catch (error) {
          console.error('Failed to open trailer:', error);
        }
      }
      
      // Fallback to JustWatch link if available
      if (usProviders?.link) {
        try {
          await Linking.openURL(usProviders.link);
          return {
            success: true,
            action: 'justwatch',
            url: usProviders.link,
            message: `Opened ${show.title} on JustWatch`
          };
        } catch (error) {
          console.error('Failed to open JustWatch link:', error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch TMDB data:', error);
    }
  }
  
  // Final fallback - search for trailer on YouTube
  const searchQuery = encodeURIComponent(`${show.title} ${show.type === 'Movie' ? 'movie' : 'tv show'} trailer`);
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
  
  try {
    await Linking.openURL(youtubeSearchUrl);
    return {
      success: true,
      action: 'trailer',
      url: youtubeSearchUrl,
      message: `Searched for ${show.title} trailer on YouTube`
    };
  } catch (error) {
    console.error('Failed to open YouTube search:', error);
    return {
      success: false,
      action: 'none',
      message: 'Unable to open any streaming platform or trailer'
    };
  }
}

async function tryStreamingProviders(providers: CountryWatchProviders, show: Show): Promise<NavigationResult> {
  // Try flatrate (subscription) providers first
  if (providers.flatrate && providers.flatrate.length > 0) {
    for (const provider of providers.flatrate) {
      const result = await tryOpenProvider(provider, show);
      if (result.success) {
        return result;
      }
    }
  }
  
  // Then try rent providers
  if (providers.rent && providers.rent.length > 0) {
    for (const provider of providers.rent) {
      const result = await tryOpenProvider(provider, show);
      if (result.success) {
        return result;
      }
    }
  }
  
  // Finally try buy providers
  if (providers.buy && providers.buy.length > 0) {
    for (const provider of providers.buy) {
      const result = await tryOpenProvider(provider, show);
      if (result.success) {
        return result;
      }
    }
  }
  
  return {
    success: false,
    action: 'none',
    message: 'No compatible streaming providers found'
  };
}

async function tryOpenProvider(provider: WatchProvider, show: Show): Promise<NavigationResult> {
  const platformName = PROVIDER_NAME_MAPPING[provider.provider_name];
  
  if (!platformName || !PLATFORM_DEEP_LINKS[platformName]) {
    console.log(`No deep link mapping for provider: ${provider.provider_name}`);
    return { success: false, action: 'none' };
  }
  
  const deepLinks = PLATFORM_DEEP_LINKS[platformName];
  
  // For now, we'll use the web URL as we don't have specific content IDs
  // In a production app, you'd need to map TMDB IDs to platform-specific IDs
  const webUrl = deepLinks.web;
  
  try {
    // For Netflix, we can try to use the existing netflixUrl if available
    if (platformName === 'Netflix' && show.netflixUrl) {
      await Linking.openURL(show.netflixUrl);
      return {
        success: true,
        action: 'streaming',
        url: show.netflixUrl,
        message: `Opened ${show.title} on Netflix`
      };
    }
    
    // For other platforms, open their main page
    // In a real app, you'd construct the specific content URL
    const platformUrl = webUrl.replace(/\/$/, ''); // Remove trailing slash
    await Linking.openURL(platformUrl);
    
    return {
      success: true,
      action: 'streaming',
      url: platformUrl,
      message: `Opened ${provider.provider_name} app`
    };
  } catch (error) {
    console.error(`Failed to open ${provider.provider_name}:`, error);
    return { success: false, action: 'none' };
  }
}

export function showNavigationAlert(result: NavigationResult) {
  if (result.success && result.message) {
    // You could show a toast or brief success message here
    console.log('Navigation success:', result.message);
  } else if (!result.success && result.message) {
    Alert.alert(
      'Unable to Open',
      result.message,
      [{ text: 'OK', style: 'default' }]
    );
  }
}

// Helper function to get available watch options for a show
export async function getWatchOptions(show: Show): Promise<{
  streaming: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
  trailer?: string;
  justWatchLink?: string;
}> {
  if (!show.tmdbId || !show.mediaType) {
    return { streaming: [], rent: [], buy: [] };
  }
  
  try {
    const [watchProviders, videos] = await Promise.all([
      tmdbApi.getWatchProviders(show.tmdbId, show.mediaType),
      tmdbApi.getVideos(show.tmdbId, show.mediaType)
    ]);
    
    const usProviders = watchProviders.results['US'];
    const trailer = tmdbApi.findOfficialTrailer(videos.results);
    
    return {
      streaming: usProviders?.flatrate || [],
      rent: usProviders?.rent || [],
      buy: usProviders?.buy || [],
      trailer: trailer ? tmdbApi.getYouTubeTrailerUrl(trailer.key) : undefined,
      justWatchLink: usProviders?.link
    };
  } catch (error) {
    console.error('Failed to fetch watch options:', error);
    return { streaming: [], rent: [], buy: [] };
  }
}