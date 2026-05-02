import { unifiedStorage } from '@/utils/unifiedStorage';
import { tmdbApi } from '@/utils/tmdbApi';
import { notificationService } from '@/utils/notificationService';

const TRACKED_SHOWS_KEY = 'tracked_shows_notifications';
const LEGACY_TRACKED_SHOWS_KEY = TRACKED_SHOWS_KEY;
let activeUserId: string = 'guest';

function getTrackedShowsKey() {
  return `${TRACKED_SHOWS_KEY}_${activeUserId}`;
}

export interface TrackedShow {
  id: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  notificationsEnabled: boolean;
  lastKnownEpisode: {
    seasonNumber: number;
    episodeNumber: number;
    airDate: string | null;
  } | null;
  nextEpisode: {
    seasonNumber: number;
    episodeNumber: number;
    airDate: string | null;
    name: string;
  } | null;
  showStatus: string;
  lastChecked: string;
  notificationScheduled: boolean;
  scheduledNotificationId: string | null;
}

export interface NewEpisodeAlert {
  showId: string;
  showTitle: string;
  episodeName: string;
  seasonNumber: number;
  episodeNumber: number;
  airDate: string;
}

class EpisodeNotificationService {
  setActiveUser(userId?: string) {
    activeUserId = userId || 'guest';
  }

  async getTrackedShows(): Promise<TrackedShow[]> {
    try {
      const scopedKey = getTrackedShowsKey();
      let stored = await unifiedStorage.getItem(scopedKey);
      if (!stored) {
        const legacy = await unifiedStorage.getItem(LEGACY_TRACKED_SHOWS_KEY);
        if (legacy) {
          stored = legacy;
          await unifiedStorage.setItem(scopedKey, legacy);
        }
      }
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Error getting tracked shows:', error);
      return [];
    }
  }

  async saveTrackedShows(shows: TrackedShow[]): Promise<void> {
    try {
      await unifiedStorage.setItem(getTrackedShowsKey(), JSON.stringify(shows));
    } catch (error) {
      console.error('❌ Error saving tracked shows:', error);
    }
  }

  async addTrackedShow(
    tmdbId: number,
    title: string,
    posterPath: string | null
  ): Promise<TrackedShow | null> {
    try {
      console.log('📺 Adding tracked show:', title, 'TMDB ID:', tmdbId);
      
      const shows = await this.getTrackedShows();
      
      const existingIndex = shows.findIndex(s => s.tmdbId === tmdbId);
      if (existingIndex >= 0) {
        shows[existingIndex].notificationsEnabled = true;
        await this.saveTrackedShows(shows);
        console.log('✅ Notifications re-enabled for:', title);
        return shows[existingIndex];
      }

      const { nextEpisode, showName, status } = await tmdbApi.getNextEpisodeAirDate(tmdbId);

      const newTrackedShow: TrackedShow = {
        id: `tracked-${tmdbId}-${Date.now()}`,
        tmdbId,
        title: showName || title,
        posterPath,
        notificationsEnabled: true,
        lastKnownEpisode: null,
        nextEpisode: nextEpisode ? {
          seasonNumber: nextEpisode.season_number,
          episodeNumber: nextEpisode.episode_number,
          airDate: nextEpisode.air_date,
          name: nextEpisode.name,
        } : null,
        showStatus: status,
        lastChecked: new Date().toISOString(),
        notificationScheduled: false,
        scheduledNotificationId: null,
      };

      if (nextEpisode?.air_date) {
        await this.scheduleEpisodeNotification(newTrackedShow);
      }

      shows.push(newTrackedShow);
      await this.saveTrackedShows(shows);
      
      console.log('✅ Show tracked successfully:', title);
      console.log('📅 Next episode:', nextEpisode);
      
      return newTrackedShow;
    } catch (error) {
      console.error('❌ Error adding tracked show:', error);
      return null;
    }
  }

  async removeTrackedShow(tmdbId: number): Promise<void> {
    try {
      const shows = await this.getTrackedShows();
      const showIndex = shows.findIndex(s => s.tmdbId === tmdbId);
      
      if (showIndex >= 0) {
        const show = shows[showIndex];
        
        if (show.scheduledNotificationId) {
          await notificationService.cancelNotification(show.scheduledNotificationId);
        }
        
        shows.splice(showIndex, 1);
        await this.saveTrackedShows(shows);
        console.log('🗑️ Removed tracked show:', show.title);
      }
    } catch (error) {
      console.error('❌ Error removing tracked show:', error);
    }
  }

  async toggleNotifications(tmdbId: number, enabled: boolean): Promise<void> {
    try {
      const shows = await this.getTrackedShows();
      const showIndex = shows.findIndex(s => s.tmdbId === tmdbId);
      
      if (showIndex >= 0) {
        shows[showIndex].notificationsEnabled = enabled;
        
        if (!enabled && shows[showIndex].scheduledNotificationId) {
          await notificationService.cancelNotification(shows[showIndex].scheduledNotificationId!);
          shows[showIndex].scheduledNotificationId = null;
          shows[showIndex].notificationScheduled = false;
        } else if (enabled && shows[showIndex].nextEpisode?.airDate) {
          await this.scheduleEpisodeNotification(shows[showIndex]);
        }
        
        await this.saveTrackedShows(shows);
        console.log(`📺 Notifications ${enabled ? 'enabled' : 'disabled'} for:`, shows[showIndex].title);
      }
    } catch (error) {
      console.error('❌ Error toggling notifications:', error);
    }
  }

  async isShowTracked(tmdbId: number): Promise<boolean> {
    const shows = await this.getTrackedShows();
    return shows.some(s => s.tmdbId === tmdbId && s.notificationsEnabled);
  }

  async getTrackedShow(tmdbId: number): Promise<TrackedShow | null> {
    const shows = await this.getTrackedShows();
    return shows.find(s => s.tmdbId === tmdbId) || null;
  }

  private async scheduleEpisodeNotification(show: TrackedShow): Promise<void> {
    if (!show.nextEpisode?.airDate || !show.notificationsEnabled) {
      return;
    }

    try {
      const airDate = new Date(show.nextEpisode.airDate);
      airDate.setHours(9, 0, 0, 0);
      
      if (airDate <= new Date()) {
        console.log('⚠️ Episode air date is in the past, skipping notification');
        return;
      }

      if (show.scheduledNotificationId) {
        await notificationService.cancelNotification(show.scheduledNotificationId);
      }

      const identifier = await notificationService.scheduleNotification(
        `🎬 New Episode: ${show.title}`,
        `S${show.nextEpisode.seasonNumber}E${show.nextEpisode.episodeNumber} "${show.nextEpisode.name}" is now available!`,
        airDate,
        {
          type: 'reading_reminder',
          id: show.id,
          payload: {
            tmdbId: show.tmdbId,
            showTitle: show.title,
            seasonNumber: show.nextEpisode.seasonNumber,
            episodeNumber: show.nextEpisode.episodeNumber,
            episodeName: show.nextEpisode.name,
          },
        }
      );

      if (identifier) {
        const shows = await this.getTrackedShows();
        const index = shows.findIndex(s => s.tmdbId === show.tmdbId);
        if (index >= 0) {
          shows[index].scheduledNotificationId = identifier;
          shows[index].notificationScheduled = true;
          await this.saveTrackedShows(shows);
        }
        
        console.log(`📅 Scheduled notification for ${show.title} S${show.nextEpisode.seasonNumber}E${show.nextEpisode.episodeNumber} on`, airDate);
      }
    } catch (error) {
      console.error('❌ Error scheduling episode notification:', error);
    }
  }

  async checkForNewEpisodes(): Promise<NewEpisodeAlert[]> {
    const alerts: NewEpisodeAlert[] = [];
    
    try {
      const shows = await this.getTrackedShows();
      const now = new Date();
      
      for (const show of shows) {
        if (!show.notificationsEnabled) continue;
        
        const lastChecked = new Date(show.lastChecked);
        const hoursSinceCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceCheck < 6) continue;

        try {
          const { nextEpisode, status } = await tmdbApi.getNextEpisodeAirDate(show.tmdbId);
          
          if (nextEpisode && nextEpisode.air_date) {
            const hasNewEpisode = !show.nextEpisode || 
              nextEpisode.season_number !== show.nextEpisode.seasonNumber ||
              nextEpisode.episode_number !== show.nextEpisode.episodeNumber;

            if (hasNewEpisode) {
              show.nextEpisode = {
                seasonNumber: nextEpisode.season_number,
                episodeNumber: nextEpisode.episode_number,
                airDate: nextEpisode.air_date,
                name: nextEpisode.name,
              };
              
              await this.scheduleEpisodeNotification(show);
              
              const airDate = new Date(nextEpisode.air_date);
              if (airDate <= now) {
                alerts.push({
                  showId: show.id,
                  showTitle: show.title,
                  episodeName: nextEpisode.name,
                  seasonNumber: nextEpisode.season_number,
                  episodeNumber: nextEpisode.episode_number,
                  airDate: nextEpisode.air_date,
                });
              }
            }
          }
          
          show.showStatus = status;
          show.lastChecked = now.toISOString();
        } catch (error) {
          console.error(`❌ Error checking episodes for ${show.title}:`, error);
        }
      }
      
      await this.saveTrackedShows(shows);
      
      console.log(`📺 Checked ${shows.length} shows, found ${alerts.length} new episodes`);
      return alerts;
    } catch (error) {
      console.error('❌ Error checking for new episodes:', error);
      return alerts;
    }
  }

  async sendNewEpisodeNotification(alert: NewEpisodeAlert): Promise<void> {
    await notificationService.sendImmediateNotification(
      `🎬 New Episode Available!`,
      `${alert.showTitle} S${alert.seasonNumber}E${alert.episodeNumber} "${alert.episodeName}" is now streaming!`,
      {
        type: 'reading_reminder',
        id: alert.showId,
        payload: alert,
      }
    );
  }

  async getUpcomingEpisodes(): Promise<(TrackedShow & { daysUntilAir: number })[]> {
    const shows = await this.getTrackedShows();
    const now = new Date();
    
    return shows
      .filter(show => show.notificationsEnabled && show.nextEpisode?.airDate)
      .map(show => {
        const airDate = new Date(show.nextEpisode!.airDate!);
        const daysUntilAir = Math.ceil((airDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...show, daysUntilAir };
      })
      .filter(show => show.daysUntilAir >= 0)
      .sort((a, b) => a.daysUntilAir - b.daysUntilAir);
  }
}

export const episodeNotificationService = new EpisodeNotificationService();
