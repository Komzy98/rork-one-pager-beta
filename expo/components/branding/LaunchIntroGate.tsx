import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AnimatedLogoIntro } from '@/components/branding/AnimatedLogoIntro';
import { hasSeenLaunchIntro, markLaunchIntroSeen } from '@/utils/launchIntro';

interface LaunchIntroGateProps {
  children: React.ReactNode;
}

type LaunchPhase = 'checking' | 'intro' | 'ready';

export function LaunchIntroGate({ children }: LaunchIntroGateProps) {
  const [phase, setPhase] = useState<LaunchPhase>('checking');

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const seen = await hasSeenLaunchIntro();
      if (!mounted) return;

      try {
        await SplashScreen.hideAsync();
      } catch {
        // Native splash may already be hidden.
      }

      setPhase(seen ? 'ready' : 'intro');
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleIntroFinish = useCallback(() => {
    void markLaunchIntroSeen();
    setPhase('ready');
  }, []);

  return (
    <View style={styles.root}>
      {phase === 'ready' ? children : null}
      {phase === 'intro' ? <AnimatedLogoIntro onFinish={handleIntroFinish} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
