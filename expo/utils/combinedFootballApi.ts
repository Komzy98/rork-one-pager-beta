import { LiveFootballMatch } from '@/types/habit';
import { footballApi } from './footballApi';
import { getLocalDateStr } from '@/utils/dateUtils';

// Football API service using API-Football (api-football.com)
export const combinedFootballApi = {
  async getLiveMatches(teamIds?: number[], forceRefresh: boolean = false): Promise<LiveFootballMatch[]> {
    console.log('🔄 Football API: Getting live matches...');
    
    try {
      const matches = await footballApi.getLiveMatches(teamIds, forceRefresh);
      console.log(`✅ Live matches: ${matches.length}`);
      return matches;
    } catch (error) {
      console.error('❌ Error getting live matches:', error);
      return [];
    }
  },

  async getTodayMatches(teamIds?: number[], leagueIds?: number[], forceRefresh: boolean = false): Promise<LiveFootballMatch[]> {
    console.log('🔄 Football API: Getting today matches...');
    
    try {
      const matches = await footballApi.getTodayMatches(teamIds, leagueIds, forceRefresh);
      const sortedMatches = sortMatchesByTime(matches);
      console.log(`✅ Today matches: ${sortedMatches.length}`);
      return sortedMatches;
    } catch (error) {
      console.error('❌ Error getting today matches:', error);
      return [];
    }
  },

  async getUpcomingMatches(days: number = 7, teamIds?: number[], leagueIds?: number[], forceRefresh: boolean = false): Promise<LiveFootballMatch[]> {
    console.log('🔄 Football API: Getting upcoming matches...');
    console.log('📅 Date range:', {
      days,
      from: getLocalDateStr(),
      to: getLocalDateStr(new Date(Date.now() + days * 24 * 60 * 60 * 1000))
    });
    
    try {
      const matches = await footballApi.getUpcomingMatches(days, teamIds, leagueIds, forceRefresh);
      const sortedMatches = sortMatchesByTime(matches);
      console.log(`✅ Upcoming matches: ${sortedMatches.length}`);
      return sortedMatches;
    } catch (error) {
      console.error('❌ Error getting upcoming matches:', error);
      return [];
    }
  },

  async getCompletedTodayMatches(teamIds?: number[], leagueIds?: number[], forceRefresh: boolean = false): Promise<LiveFootballMatch[]> {
    console.log('🔄 Football API: Getting completed today matches...');
    
    try {
      const matches = await footballApi.getCompletedTodayMatches(teamIds, leagueIds, forceRefresh);
      const sortedMatches = sortMatchesByTime(matches);
      console.log(`✅ Completed today matches: ${sortedMatches.length}`);
      return sortedMatches;
    } catch (error) {
      console.error('❌ Error getting completed today matches:', error);
      return [];
    }
  },

  async searchTeams(teamName: string): Promise<{id: number, name: string, logo: string}[]> {
    console.log('🔄 Football API: Searching teams for:', teamName);
    
    try {
      const teams = await footballApi.searchTeams(teamName);
      console.log(`✅ Teams found: ${teams.length}`);
      return teams;
    } catch (error) {
      console.error('❌ Error searching teams:', error);
      return [];
    }
  }
};

// Helper function to sort matches by time
function sortMatchesByTime(matches: LiveFootballMatch[]): LiveFootballMatch[] {
  return matches.sort((a, b) => {
    const dateComparison = a.date.localeCompare(b.date);
    if (dateComparison !== 0) {
      return dateComparison;
    }
    return a.time.localeCompare(b.time);
  });
}

// Export individual API for specific use cases
export { footballApi };
