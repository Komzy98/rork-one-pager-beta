/** Ticketmaster Discovery API key — server-side only. */
export function getTicketmasterApiKeyFromEnv(): string {
  return (
    process.env.TICKETMASTER_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY?.trim() ||
    ''
  );
}
