import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { getMatchesRoute, getMatchesBundleRoute, getMatchDetailsRoute, getLeagueStandingsRoute, getTeamLogosRoute, getLeagueTopPlayersRoute } from "./routes/football/matches/route";
import { searchTeamsRoute, getClubProfileRoute } from "./routes/football/club/route";
import { getMmaFightsRoute } from "./routes/mma/fights/route";
import { generateVoiceRoute } from "./routes/ai/voice/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
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
  ai: createTRPCRouter({
    generateVoice: generateVoiceRoute,
  }),
});

export type AppRouter = typeof appRouter;
