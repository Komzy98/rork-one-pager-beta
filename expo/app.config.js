const path = require("path");

// Ensures EXPO_PUBLIC_* are available when resolving config (surfaces in Constants.expoConfig.extra).
// Metro may still inline env at bundle time; this fallback fixes missing vars when using alternate starters or stale caches.
require("dotenv").config({ path: path.join(__dirname, ".env") });

const appJson = require("./app.json");

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      publicSupabase: {
        url: (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim(),
        anonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim(),
      },
    },
  },
};
