import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isUsableEventPosterUrl, pickEventPosterUrl, resolveEventPosterUrl } from '../eventPosterImage';
import { getTicketStatusLabel, toPersonalAttendance } from '../eventTicketStatus';

describe('Event poster trust', () => {
  it('never invents an unrelated default photograph', () => {
    assert.equal(resolveEventPosterUrl(''), '');
    assert.equal(pickEventPosterUrl(undefined, null, 'invalid'), '');
  });
  it('keeps a real provider poster', () => {
    assert.equal(resolveEventPosterUrl('https://img.example.org/event.jpg'), 'https://img.example.org/event.jpg');
    assert.equal(pickEventPosterUrl('bad', 'https://img.example.org/legit.jpg'), 'https://img.example.org/legit.jpg');
  });
  it('rejects obviously tiny thumbnails and unsafe schemes', () => {
    assert.equal(isUsableEventPosterUrl('https://img.example.org/p.png?w=85'), false);
    assert.equal(isUsableEventPosterUrl('file:///tmp/example.jpg'), false);
    assert.equal(isUsableEventPosterUrl('javascript:alert(1)'), false);
  });
});

describe('Private attendance and ticket tracking', () => {
  it('maps status without assuming a ticket was bought', () => {
    const attendance = toPersonalAttendance({ status: 'in', ticket_status: 'unknown', updated_at: '2026-10-16T12:00:00Z' });
    assert.equal(attendance.status, 'in');
    assert.equal(attendance.ticketStatus, 'unknown');
    assert.equal(getTicketStatusLabel(attendance.ticketStatus), 'Ticket not confirmed');
  });
  it('distinguishes a ticket needed from a secured ticket', () => {
    assert.equal(getTicketStatusLabel('need'), 'Ticket needed');
    assert.equal(getTicketStatusLabel('secured'), 'Ticket secured');
  });
});
