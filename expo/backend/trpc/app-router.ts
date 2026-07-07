import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { getMatchesRoute, getMatchesBundleRoute, getMatchDetailsRoute, getLeagueStandingsRoute, getTeamLogosRoute, getLeagueTopPlayersRoute } from "./routes/football/matches/route";
import { searchTeamsRoute, getClubProfileRoute } from "./routes/football/club/route";
import { getMmaFightsRoute } from "./routes/mma/fights/route";
import { getSeasonBundleRoute, getLiveWeekendRoute } from "./routes/f1/route";
import {
  getRaceDetailRoute,
  getDriverProfileRoute,
  getTeamProfileRoute,
  getCircuitRoute,
} from "./routes/f1/apiSports";
import { generateVoiceRoute } from "./routes/ai/voice/route";
import { getNearbyEventsRoute } from "./routes/events/nearby/route";
import { signInWithPasswordRoute } from "./routes/auth/signIn/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    signInWithPassword: signInWithPasswordRoute,
  }),
  football: createTRPCRouter({
    getMatches: getMatchesRoute,
    getMatchesBundle: getMatchesBundleRoute,
    getMatchDetails: getMatchDetailsRoute,
    getLeagueStandings: getLeagueStandingsRoute,
    getTeamLogos: getTeamLogosRoute,
    getLeagueTopPlayers: getLeagueTopPlayersRoute,
    searchTeams: searchTeamsRoute,
    getClubProfile: getClubProfileRoute,
  }),
  mma: createTRPCRouter({
    getFights: getMmaFightsRoute,
  }),
  f1: createTRPCRouter({
    getSeasonBundle: getSeasonBundleRoute,
    getLiveWeekend: getLiveWeekendRoute,
    getRaceDetail: getRaceDetailRoute,
    getDriverProfile: getDriverProfileRoute,
    getTeamProfile: getTeamProfileRoute,
    getCircuit: getCircuitRoute,
  }),
  ai: createTRPCRouter({
    generateVoice: generateVoiceRoute,
  }),
  events: createTRPCRouter({
    getNearby: getNearbyEventsRoute,
  }),
});

export type AppRouter = typeof appRouter;
