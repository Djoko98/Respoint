// Helper for generating human-friendly, mostly unique reservation codes for events.
//
// Format: EVT-{YEAR}-{RANDOM}, for example: EVT-2025-ABC123
//
// Uniqueness is ultimately enforced by the database UNIQUE constraint on
// event_reservations.reservation_code; the service layer will retry with a
// new code if an insert fails with a duplicate violation.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // skip ambiguous chars

const randomSegment = (length: number = 6) => {
  let result = '';
  const alphabetLength = ALPHABET.length;
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * alphabetLength);
    result += ALPHABET[idx];
  }
  return result;
};

export const generateEventReservationCode = (eventDate: string): string => {
  let year = new Date().getFullYear();
  try {
    if (eventDate) {
      const parsed = new Date(eventDate);
      if (!Number.isNaN(parsed.getTime())) {
        year = parsed.getFullYear();
      } else if (/^\d{4}/.test(eventDate)) {
        // Fallback: take first 4 chars as year if date is a plain string like "2025-01-01"
        const maybeYear = parseInt(eventDate.slice(0, 4), 10);
        if (!Number.isNaN(maybeYear)) year = maybeYear;
      }
    }
  } catch {
    // ignore and use current year
  }
  const segment = randomSegment(6);
  return `EVT-${year}-${segment}`;
};


