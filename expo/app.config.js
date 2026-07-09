const path = require("path");

// Ensures EXPO_PUBLIC_* are available when resolving config (surfaces in Constants.expoConfig.extra).
require("dotenv").config({ path: path.join(__dirname, ".env") });

const appJson = require("./app.json");

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      younifyAuthUrl: (process.env.EXPO_PUBLIC_YOUNIFY_AUTH_URL || "").trim(),
      googleWebClientId: (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "").trim(),
      googleIosClientId: (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "").trim(),
      publicSupabase: {
        url: (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim(),
        anonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim(),
      },
      googleIosClientConfigured: !!(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "").trim(),
    },
  },
};
