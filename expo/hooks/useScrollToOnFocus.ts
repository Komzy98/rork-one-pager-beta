import { useCallback, useRef } from 'react';
import type { ScrollView } from 'react-native';

/** Scroll a KeyboardAwareScrollView so a focused input (near anchorY) stays visible. */
export function useScrollToOnFocus(scrollRef: React.RefObject<ScrollView | null>) {
  const anchorY = useRef(0);

  const bindScrollAnchor = useCallback((y: number) => {
    anchorY.current = y;
  }, []);

  const scrollInputIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, anchorY.current - 12),
        animated: true,
      });
    });
  }, [scrollRef]);

  return { bindScrollAnchor, scrollInputIntoView };
}
