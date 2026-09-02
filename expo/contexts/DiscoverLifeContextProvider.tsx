import React, { createContext, useContext, type ReactNode } from 'react';

import { useLearnedDiscoverLifeContext } from '@/hooks/useLearnedDiscoverLifeContext';

type DiscoverLifeContextValue = ReturnType<typeof useLearnedDiscoverLifeContext>;

const DiscoverLifeContext = createContext<DiscoverLifeContextValue | null>(null);

export function DiscoverLifeContextProvider({ children }: { children: ReactNode }) {
  const value = useLearnedDiscoverLifeContext();
  return (
    <DiscoverLifeContext.Provider value={value}>
      {children}
    </DiscoverLifeContext.Provider>
  );
}

export function useSharedDiscoverLifeContext(): DiscoverLifeContextValue {
  const value = useContext(DiscoverLifeContext);
  if (!value) {
    throw new Error('useSharedDiscoverLifeContext must be used within DiscoverLifeContextProvider');
  }
  return value;
}
