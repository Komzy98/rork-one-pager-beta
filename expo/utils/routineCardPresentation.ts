/** Only show the compact accountability shortcut on habits actively shared with an approved partner. */
export function getActiveAccountabilityHabitIds(
  approvedPartnerIds: readonly string[],
  sharesFor: (partnerId: string) => readonly { habitId: string }[],
): Set<string> {
  const result = new Set<string>();
  for (const partnerId of approvedPartnerIds) {
    for (const share of sharesFor(partnerId)) {
      if (share.habitId) result.add(share.habitId);
    }
  }
  return result;
}
