import AsyncStorage from '@react-native-async-storage/async-storage';

const LAUNCH_INTRO_SEEN_KEY = '@onepager/launch_intro_seen_v1';

export async function hasSeenLaunchIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(LAUNCH_INTRO_SEEN_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markLaunchIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAUNCH_INTRO_SEEN_KEY, '1');
  } catch {
    // Non-critical — intro may replay on next cold start if storage fails.
  }
}

/** Dev helper: reset to replay the launch intro. */
export async function resetLaunchIntroForDev(): Promise<void> {
  if (!__DEV__) return;
  await AsyncStorage.removeItem(LAUNCH_INTRO_SEEN_KEY);
}
