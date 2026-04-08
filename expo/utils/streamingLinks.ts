import { Platform, Linking } from 'react-native';

export interface StreamingPlatform {
  id: number;
  name: string;
  color: string;
  appScheme?: string;
  iosAppId?: string;
  androidPackage?: string;
  webUrl: string;
  searchUrl?: (title: string, year?: number) => string;
}

export const STREAMING_PLATFORMS: Record<number, StreamingPlatform> = {
  8: {
    id: 8,
    name: 'Netflix',
    color: '#E50914',
    appScheme: 'nflx://',
    iosAppId: '363590051',
    androidPackage: 'com.netflix.mediaclient',
    webUrl: 'https://www.netflix.com',
    searchUrl: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
  },
  9: {
    id: 9,
    name: 'Amazon Prime Video',
    color: '#00A8E1',
    appScheme: 'aiv://',
    iosAppId: '545519333',
    androidPackage: 'com.amazon.avod.thirdpartyclient',
    webUrl: 'https://www.amazon.com/gp/video',
    searchUrl: (title) => `https://www.amazon.com/s?i=instant-video&k=${encodeURIComponent(title)}`,
  },
  337: {
    id: 337,
    name: 'Disney+',
    color: '#113CCF',
    appScheme: 'disneyplus://',
    iosAppId: '1446075923',
    androidPackage: 'com.disney.disneyplus',
    webUrl: 'https://www.disneyplus.com',
    searchUrl: (title) => `https://www.disneyplus.com/search?q=${encodeURIComponent(title)}`,
  },
  384: {
    id: 384,
    name: 'HBO Max',
    color: '#5822B4',
    appScheme: 'hbomax://',
    iosAppId: '971265422',
    androidPackage: 'com.hbo.hbonow',
    webUrl: 'https://www.max.com',
    searchUrl: (title) => `https://www.max.com/search?q=${encodeURIComponent(title)}`,
  },
  1899: {
    id: 1899,
    name: 'Max',
    color: '#002BE7',
    appScheme: 'max://',
    iosAppId: '1666653815',
    androidPackage: 'com.wbd.stream',
    webUrl: 'https://www.max.com',
    searchUrl: (title) => `https://www.max.com/search?q=${encodeURIComponent(title)}`,
  },
  15: {
    id: 15,
    name: 'Hulu',
    color: '#1CE783',
    appScheme: 'hulu://',
    iosAppId: '376510438',
    androidPackage: 'com.hulu.plus',
    webUrl: 'https://www.hulu.com',
    searchUrl: (title) => `https://www.hulu.com/search?q=${encodeURIComponent(title)}`,
  },
  386: {
    id: 386,
    name: 'Peacock',
    color: '#000000',
    appScheme: 'peacock://',
    iosAppId: '1508186374',
    androidPackage: 'com.peacocktv.peacockandroid',
    webUrl: 'https://www.peacocktv.com',
    searchUrl: (title) => `https://www.peacocktv.com/search?q=${encodeURIComponent(title)}`,
  },
  531: {
    id: 531,
    name: 'Paramount+',
    color: '#0064FF',
    appScheme: 'paramountplus://',
    iosAppId: '530168168',
    androidPackage: 'com.cbs.ott',
    webUrl: 'https://www.paramountplus.com',
    searchUrl: (title) => `https://www.paramountplus.com/search/?q=${encodeURIComponent(title)}`,
  },
  350: {
    id: 350,
    name: 'Apple TV+',
    color: '#000000',
    appScheme: 'videos://',
    iosAppId: '1174078549',
    androidPackage: 'com.apple.atve.androidtv.appletv',
    webUrl: 'https://tv.apple.com',
    searchUrl: (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
  },
  283: {
    id: 283,
    name: 'Crunchyroll',
    color: '#F47521',
    appScheme: 'crunchyroll://',
    iosAppId: '329913454',
    androidPackage: 'com.crunchyroll.crunchyroid',
    webUrl: 'https://www.crunchyroll.com',
    searchUrl: (title) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`,
  },
  2: {
    id: 2,
    name: 'Apple iTunes',
    color: '#EA4CC0',
    appScheme: 'itms://',
    iosAppId: '',
    webUrl: 'https://itunes.apple.com',
    searchUrl: (title) => `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=movie`,
  },
  3: {
    id: 3,
    name: 'Google Play Movies',
    color: '#4285F4',
    webUrl: 'https://play.google.com/store/movies',
    searchUrl: (title) => `https://play.google.com/store/search?q=${encodeURIComponent(title)}&c=movies`,
  },
  10: {
    id: 10,
    name: 'Amazon Video',
    color: '#FF9900',
    appScheme: 'aiv://',
    webUrl: 'https://www.amazon.com/gp/video',
    searchUrl: (title) => `https://www.amazon.com/s?i=instant-video&k=${encodeURIComponent(title)}`,
  },
  192: {
    id: 192,
    name: 'YouTube',
    color: '#FF0000',
    appScheme: 'youtube://',
    iosAppId: '544007664',
    androidPackage: 'com.google.android.youtube',
    webUrl: 'https://www.youtube.com',
    searchUrl: (title) => `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`,
  },
  188: {
    id: 188,
    name: 'YouTube Premium',
    color: '#FF0000',
    appScheme: 'youtube://',
    webUrl: 'https://www.youtube.com/premium',
    searchUrl: (title) => `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`,
  },
  257: {
    id: 257,
    name: 'fuboTV',
    color: '#FF6A00',
    appScheme: 'fubo://',
    iosAppId: '905401434',
    androidPackage: 'com.fubo.firetv',
    webUrl: 'https://www.fubo.tv',
    searchUrl: (title) => `https://www.fubo.tv/search?q=${encodeURIComponent(title)}`,
  },
  73: {
    id: 73,
    name: 'Tubi',
    color: '#FA382F',
    appScheme: 'tubi://',
    iosAppId: '886445756',
    androidPackage: 'com.tubitv',
    webUrl: 'https://tubitv.com',
    searchUrl: (title) => `https://tubitv.com/search/${encodeURIComponent(title)}`,
  },
  387: {
    id: 387,
    name: 'Peacock Premium',
    color: '#000000',
    appScheme: 'peacock://',
    webUrl: 'https://www.peacocktv.com',
    searchUrl: (title) => `https://www.peacocktv.com/search?q=${encodeURIComponent(title)}`,
  },
  1770: {
    id: 1770,
    name: 'Plex',
    color: '#EBAF00',
    appScheme: 'plex://',
    iosAppId: '383457673',
    androidPackage: 'com.plexapp.android',
    webUrl: 'https://www.plex.tv',
    searchUrl: (title) => `https://watch.plex.tv/search?q=${encodeURIComponent(title)}`,
  },
  526: {
    id: 526,
    name: 'AMC+',
    color: '#000000',
    appScheme: 'amcplus://',
    iosAppId: '1578728498',
    webUrl: 'https://www.amcplus.com',
    searchUrl: (title) => `https://www.amcplus.com/search?q=${encodeURIComponent(title)}`,
  },
  300: {
    id: 300,
    name: 'Pluto TV',
    color: '#1D1D1D',
    appScheme: 'pluto://',
    iosAppId: '751712884',
    androidPackage: 'tv.pluto.android',
    webUrl: 'https://pluto.tv',
    searchUrl: (title) => `https://pluto.tv/search/details/${encodeURIComponent(title)}`,
  },
  582: {
    id: 582,
    name: 'Rakuten Viki',
    color: '#1E88E5',
    appScheme: 'viki://',
    iosAppId: '445553058',
    androidPackage: 'com.viki.android',
    webUrl: 'https://www.viki.com',
    searchUrl: (title) => `https://www.viki.com/search?q=${encodeURIComponent(title)}`,
  },
};

export function getStreamingPlatform(providerId: number): StreamingPlatform | null {
  return STREAMING_PLATFORMS[providerId] || null;
}

export async function openStreamingApp(
  providerId: number,
  title: string,
  year?: number,
  fallbackUrl?: string
): Promise<boolean> {
  const platform = STREAMING_PLATFORMS[providerId];
  
  if (!platform) {
    console.log(`Unknown streaming provider: ${providerId}`);
    if (fallbackUrl) {
      await Linking.openURL(fallbackUrl);
      return true;
    }
    return false;
  }

  try {
    if (Platform.OS !== 'web' && platform.appScheme) {
      const canOpen = await Linking.canOpenURL(platform.appScheme);
      if (canOpen) {
        await Linking.openURL(platform.appScheme);
        return true;
      }
    }

    const searchUrl = platform.searchUrl?.(title, year) || platform.webUrl;
    await Linking.openURL(searchUrl);
    return true;
  } catch (error) {
    console.error(`Failed to open ${platform.name}:`, error);
    
    if (fallbackUrl) {
      try {
        await Linking.openURL(fallbackUrl);
        return true;
      } catch {
        return false;
      }
    }
    
    return false;
  }
}

export async function openAppStore(platform: StreamingPlatform): Promise<void> {
  try {
    if (Platform.OS === 'ios' && platform.iosAppId) {
      await Linking.openURL(`https://apps.apple.com/app/id${platform.iosAppId}`);
    } else if (Platform.OS === 'android' && platform.androidPackage) {
      await Linking.openURL(`https://play.google.com/store/apps/details?id=${platform.androidPackage}`);
    } else {
      await Linking.openURL(platform.webUrl);
    }
  } catch (error) {
    console.error('Failed to open app store:', error);
    await Linking.openURL(platform.webUrl);
  }
}

export function getProviderColor(providerId: number): string {
  return STREAMING_PLATFORMS[providerId]?.color || '#666666';
}

export function getProviderName(providerId: number): string {
  return STREAMING_PLATFORMS[providerId]?.name || 'Unknown';
}

export const POPULAR_STREAMING_IDS = [8, 337, 1899, 15, 386, 531, 350, 9];
