const path = require("path");

// Ensures EXPO_PUBLIC_* are available when resolving config (surfaces in Constants.expoConfig.extra).
require("dotenv").config({ path: path.join(__dirname, ".env") });

const appJson = require("./app.json");
const { getGoogleIosUrlScheme } = require("./utils/googleSignIn.native.js");

const iosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "").trim();
const googleIosUrlScheme = iosClientId ? getGoogleIosUrlScheme(iosClientId) : null;

const plugins = [...(appJson.expo.plugins || [])];
if (googleIosUrlScheme) {
  plugins.push([
    "@react-native-google-signin/google-signin",
    { iosUrlScheme: googleIosUrlScheme },
  ]);
}
plugins.push([
  "expo-build-properties",
  {
    ios: {
      extraPods: [
        { name: "AppCheckCore", version: "11.2.0" },
        { name: "GoogleUtilities", modular_headers: true },
        { name: "RecaptchaInterop", modular_headers: true },
      ],
    },
  },
]);

module.exports = {
  expo: {
    ...appJson.expo,
    ios: {
      ...appJson.expo.ios,
      ...(iosClientId
        ? {
            infoPlist: {
              ...(appJson.expo.ios?.infoPlist ?? {}),
              GIDClientID: iosClientId,
            },
          }
        : {}),
    },
    plugins,
    extra: {
      ...appJson.expo.extra,
      younifyAuthUrl: (process.env.EXPO_PUBLIC_YOUNIFY_AUTH_URL || "").trim(),
      googleWebClientId: (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "").trim(),
      googleIosClientId: iosClientId,
      publicSupabase: {
        url: (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim(),
        anonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim(),
      },
      googleIosClientConfigured: !!iosClientId,
    },
  },
};
