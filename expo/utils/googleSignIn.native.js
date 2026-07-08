/** CommonJS helper for app.config.js (Node cannot import the TS module). */
function getGoogleIosUrlScheme(iosClientId) {
  const trimmed = String(iosClientId || "").trim();
  if (!trimmed.endsWith(".apps.googleusercontent.com")) return null;
  const prefix = trimmed.replace(/\.apps\.googleusercontent\.com$/, "");
  return `com.googleusercontent.apps.${prefix}`;
}

module.exports = { getGoogleIosUrlScheme };
