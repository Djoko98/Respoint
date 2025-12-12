export type EventPaymentStatus = 'unpaid' | 'partial' | 'paid' | 'not_required';

// Database representation of the `events` table (matches Supabase schema)
export interface EventDB {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  date: string;
  end_date?: string | null; // For multi-day events (e.g., event ends next day at 01:00)
  start_time: string;
  end_time: string;
  capacity_total?: number | null;
  zone_ids?: any; // jsonb
  enable_deposit: boolean;
  deposit_type: 'fixed' | 'per_person';
  deposit_amount?: number | null;
  enable_ticket: boolean;
  ticket_price?: number | null;
  created_at?: string;
  updated_at?: string;
}

// Application-friendly representation used in React components
export interface Event {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  date: string;
  endDate?: string | null; // For multi-day events (e.g., event ends next day at 01:00)
  startTime: string;
  endTime: string;
  capacityTotal?: number | null;
  zoneIds?: string[] | null;
  enableDeposit: boolean;
  depositType: 'fixed' | 'per_person';
  depositAmount?: number | null;
  enableTicket: boolean;
  ticketPrice?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export type EventReservationStatus = 'booked' | 'arrived' | 'cancelled' | 'not_arrived';

// Database representation of the `event_reservations` table
export interface EventReservationDB {
  id: string;
  event_id: string;
  user_id: string;
  guest_name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  date: string;
  time: string;
  number_of_guests: number;
  zone_id?: string | null;
  table_ids?: any; // jsonb
  color?: string | null;
  is_vip?: boolean | null;
  reservation_code: string;
  payment_status: EventPaymentStatus;
  deposit_required?: number | null;
  deposit_paid?: number | null;
  ticket_price?: number | null;
  ticket_paid?: number | null;
  status: EventReservationStatus;
  checked_in_at?: string | null;
  is_deleted?: boolean; // For soft delete
  cleared?: boolean; // True when guest arrived and left (vs cancelled before arriving)
  created_at?: string;
  updated_at?: string;
}

// Application-level representation
export interface EventReservation {
  id: string;
  eventId: string;
  userId: string;
  guestName: string;
  phone?: string;
  email?: string;
  notes?: string;
  date: string;
  time: string;
  numberOfGuests: number;
  zoneId?: string;
  tableIds?: string[];
  color?: string;
  isVip?: boolean;
  reservationCode: string;
  paymentStatus: EventPaymentStatus;
  depositRequired?: number;
  depositPaid?: number;
  ticketPrice?: number;
  ticketPaid?: number;
  status: EventReservationStatus;
  checkedInAt?: string | null;
  isDeleted?: boolean; // For soft delete
  cleared?: boolean; // True when guest arrived and left (vs cancelled before arriving)
  createdAt?: string;
  updatedAt?: string;
  // Optional denormalised relation for easier UI access
  event?: Event;
}


