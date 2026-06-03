import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
    return () => subscription.remove();
  }, []);

  return reduceMotion;
}
