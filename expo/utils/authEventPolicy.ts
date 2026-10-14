/** Only an explicit app-initiated logout should clear cached identity synchronously.
 * SDK SIGNED_OUT can also occur after a temporary token refresh failure. */
export function shouldClearCachedIdentity(event: string, explicitSignOut: boolean): boolean {
  return event === 'SIGNED_OUT' && explicitSignOut;
}
