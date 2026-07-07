/** App Store Connect app id (EAS submit ascAppId). */
export const IOS_APP_STORE_ID = '6761662079';

export const ANDROID_PACKAGE = 'app.rork.opbeta';

export const MARKETING_SITE_URL = 'https://onepagerapp.co.uk';

export function iosAppStoreUrl(): string {
  return `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`;
}

export function androidPlayStoreUrl(): string {
  return `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
}
