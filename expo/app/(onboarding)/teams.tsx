import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/** @deprecated Merged into football-favorites */
export default function TeamsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(onboarding)/football-favorites' as any);
  }, [router]);
  return null;
}
