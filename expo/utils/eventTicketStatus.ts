export type TicketStatus = 'unknown' | 'need' | 'secured' | 'not_needed';

export function getTicketStatusLabel(status: TicketStatus): string {
  switch (status) {
    case 'secured': return 'Ticket secured';
    case 'need': return 'Ticket needed';
    case 'not_needed': return 'No ticket required';
    default: return 'Ticket not confirmed';
  }
}

export function toPersonalAttendance(row: {
  status: string;
  ticket_status: string;
  updated_at: string;
}) {
  return {
    status: row.status as 'in' | 'maybe' | 'cant',
    ticketStatus: row.ticket_status as TicketStatus,
    updatedAt: row.updated_at,
  };
}
