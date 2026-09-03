import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export type StepAuthorizationRequestStatus =
  | 'should_request'
  | 'unnecessary'
  | 'unknown'
  | 'unavailable';

type OnePagerHealthNative = {
  isHealthDataAvailable(): boolean;
  getStepAuthorizationRequestStatus(): Promise<StepAuthorizationRequestStatus>;
  requestStepAuthorization(): Promise<boolean>;
  getTodaySteps(): Promise<number | null>;
};

const nativeModule = Platform.OS === 'ios'
  ? requireOptionalNativeModule<OnePagerHealthNative>('OnePagerHealth')
  : null;

export function isAppleHealthAvailable(): boolean {
  if (!nativeModule) return false;
  try {
    return nativeModule.isHealthDataAvailable();
  } catch {
    return false;
  }
}

export async function getStepAuthorizationRequestStatus(): Promise<StepAuthorizationRequestStatus> {
  if (!nativeModule) return 'unavailable';
  try {
    return await nativeModule.getStepAuthorizationRequestStatus();
  } catch {
    return 'unknown';
  }
}

export async function requestStepAuthorization(): Promise<boolean> {
  if (!nativeModule) return false;
  try {
    return await nativeModule.requestStepAuthorization();
  } catch {
    return false;
  }
}

export async function getTodaySteps(): Promise<number | null> {
  if (!nativeModule) return null;
  try {
    const value = await nativeModule.getTodaySteps();
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  } catch {
    return null;
  }
}
