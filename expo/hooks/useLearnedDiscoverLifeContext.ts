import { useMemo } from 'react';

import { useDiscoverLifeContext } from '@/hooks/useDiscoverLifeContext';
import { useExperienceFeedback } from '@/hooks/useExperienceFeedback';
import { applyExperienceDiscoveryBoost } from '@/utils/experienceDiscoveryBoost';
import { buildDiscoverSignalChips } from '@/utils/discoverSignalChips';

/**
 * Shared app-level Life Context with outcome learning layered on top of the core engine.
 * The base hook still owns all network queries; this wrapper only changes ranking, so
 * Today / My Life / Discover do not create duplicate API trees.
 */
export function useLearnedDiscoverLifeContext() {
  const base = useDiscoverLifeContext();
  const experience = useExperienceFeedback();

  const engine = useMemo(
    () => applyExperienceDiscoveryBoost(base.engine, experience.state),
    [base.engine, experience.state],
  );

  const signalChips = useMemo(
    () => buildDiscoverSignalChips({
      profile: base.profile,
      context: base.lifeContext,
      engine,
      sportSignals: base.sportSignals,
    }),
    [base.profile, base.lifeContext, engine, base.sportSignals],
  );

  const lifeContext = useMemo(
    () => ({ ...base.lifeContext, signalChips }),
    [base.lifeContext, signalChips],
  );

  return {
    ...base,
    lifeContext,
    engine,
    experience: {
      hydrated: experience.hydrated,
      state: experience.state,
      record: experience.record,
      getEntry: experience.getEntry,
    },
  };
}
