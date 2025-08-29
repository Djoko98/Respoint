export type ReservationStatus = 'waiting' | 'confirmed' | 'arrived' | 'cancelled' | 'not_arrived';

// Database interface matching the exact Supabase schema
export interface ReservationDB {
  id: string; // uuid
  user_id: string; // uuid
  zone_id: string; // text (not uuid in reservations table)
  guest_name: string; // text
  date: string; // text
  time: string; // text
  number_of_guests: number; // integer
  table_ids: any; // jsonb
  phone?: string; // text
  email?: string; // text
  notes?: string; // text
  color?: string; // text
  status: ReservationStatus; // text
  is_deleted?: boolean; // boolean for soft delete
  created_at?: string; // timestamp with time zone
  updated_at?: string; // timestamp with time zone
}

// Application interface for easier use in components
export interface Reservation {
  id: string;
  user_id?: string;
  guestName: string;
  date: string;
  time: string;
  numberOfGuests: number;
  zoneId: string;
  zoneName?: string; // Optional zone name for display
  tableIds?: string[]; // JSONB array from Supabase
  phone?: string;
  email?: string;
  notes?: string;
  color?: string;
  status: ReservationStatus;
  isDeleted?: boolean; // For soft delete
  createdAt?: string;
  updatedAt?: string;
}
