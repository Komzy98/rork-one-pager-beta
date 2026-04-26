import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { getMatchesRoute, getMatchDetailsRoute, getLeagueStandingsRoute, getTeamLogosRoute } from "./routes/football/matches/route";
import { getMmaFightsRoute } from "./routes/mma/fights/route";
import { generateVoiceRoute } from "./routes/ai/voice/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  football: createTRPCRouter({
    getMatches: getMatchesRoute,
    getMatchDetails: getMatchDetailsRoute,
    getLeagueStandings: getLeagueStandingsRoute,
    getTeamLogos: getTeamLogosRoute,
  }),
  mma: createTRPCRouter({
    getFights: getMmaFightsRoute,
  }),
  ai: createTRPCRouter({
    generateVoice: generateVoiceRoute,
  }),
});

export type AppRouter = typeof appRouter;
