export type InviteRsvpStatus = 'in' | 'maybe' | 'cant';

export const INVITE_RSVP_NUDGE_PREFIX = 'op:invite-rsvp:';

export interface InviteRsvpNudgePayload {
  responderName: string;
  status: InviteRsvpStatus;
  eventTitle: string;
  eventId: string;
}

export function buildInviteRsvpNudgeMessage(payload: InviteRsvpNudgePayload): string {
  return `${INVITE_RSVP_NUDGE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseInviteRsvpNudgeMessage(
  message: string | null | undefined,
): InviteRsvpNudgePayload | null {
  if (!message?.startsWith(INVITE_RSVP_NUDGE_PREFIX)) return null;
  try {
    const parsed = JSON.parse(message.slice(INVITE_RSVP_NUDGE_PREFIX.length)) as InviteRsvpNudgePayload;
    if (!parsed?.responderName || !parsed?.eventTitle || !parsed?.eventId) return null;
    if (!['in', 'maybe', 'cant'].includes(parsed.status)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getInviteRsvpNotificationContent(payload: InviteRsvpNudgePayload): {
  title: string;
  body: string;
} {
  const name = payload.responderName.trim() || 'Someone';
  const title =
    payload.status === 'in'
      ? `${name} is in!`
      : payload.status === 'maybe'
        ? `${name} might go`
        : `${name} can't make it`;
  const body = payload.eventTitle.trim() || 'Your event invite';
  return { title, body };
}
