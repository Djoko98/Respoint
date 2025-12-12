import { supabase, executeSupabaseQuery } from '../utils/supabaseClient';
import type {
  EventReservation,
  EventReservationDB,
  EventPaymentStatus,
} from '../types/event';
import { generateEventReservationCode } from '../utils/eventCode';

// Map DB row -> application EventReservation
const mapFromDB = (row: EventReservationDB): EventReservation => {
  let tableIds: string[] | undefined;
  try {
    if (Array.isArray(row.table_ids)) {
      tableIds = row.table_ids.map((t: any) => String(t));
    } else if (row.table_ids != null) {
      const parsed = typeof row.table_ids === 'string'
        ? JSON.parse(row.table_ids)
        : row.table_ids;
      if (Array.isArray(parsed)) {
        tableIds = parsed.map((t: any) => String(t));
      }
    }
  } catch {
    tableIds = undefined;
  }

  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    guestName: row.guest_name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    date: row.date,
    time: row.time,
    numberOfGuests: row.number_of_guests,
    zoneId: row.zone_id ?? undefined,
    tableIds,
    color: row.color ?? undefined,
    isVip: row.is_vip ?? false,
    reservationCode: row.reservation_code,
    paymentStatus: row.payment_status,
    depositRequired: row.deposit_required ?? undefined,
    depositPaid: row.deposit_paid ?? undefined,
    ticketPrice: row.ticket_price ?? undefined,
    ticketPaid: row.ticket_paid ?? undefined,
    status: row.status,
    checkedInAt: row.checked_in_at ?? null,
    isDeleted: row.is_deleted ?? false,
    cleared: row.cleared ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// Map application EventReservation -> DB shape for insert/update
// Empty strings are converted to null for nullable fields
const mapToDB = (
  reservation: Partial<EventReservation>
): Partial<EventReservationDB> => {
  const db: Partial<EventReservationDB> = {};

  if (reservation.eventId !== undefined) db.event_id = reservation.eventId;
  if (reservation.userId !== undefined) db.user_id = reservation.userId;
  if (reservation.guestName !== undefined) db.guest_name = reservation.guestName;
  if (reservation.phone !== undefined) db.phone = reservation.phone || null;
  if (reservation.email !== undefined) db.email = reservation.email || null;
  if (reservation.notes !== undefined) db.notes = reservation.notes || null;
  if (reservation.date !== undefined) db.date = reservation.date;
  if (reservation.time !== undefined) db.time = reservation.time;
  if (reservation.numberOfGuests !== undefined) {
    db.number_of_guests = reservation.numberOfGuests;
  }
  if (reservation.zoneId !== undefined) db.zone_id = reservation.zoneId || null;
  if (reservation.tableIds !== undefined) {
    db.table_ids = reservation.tableIds?.length ? reservation.tableIds : null;
  }
  if (reservation.color !== undefined) db.color = reservation.color || null;
  if (reservation.isVip !== undefined) db.is_vip = reservation.isVip ?? null;
  if (reservation.reservationCode !== undefined) {
    db.reservation_code = reservation.reservationCode;
  }
  if (reservation.paymentStatus !== undefined) {
    db.payment_status = reservation.paymentStatus;
  }
  if (reservation.depositRequired !== undefined) {
    db.deposit_required = reservation.depositRequired ?? null;
  }
  if (reservation.depositPaid !== undefined) {
    db.deposit_paid = reservation.depositPaid ?? null;
  }
  if (reservation.ticketPrice !== undefined) {
    db.ticket_price = reservation.ticketPrice ?? null;
  }
  if (reservation.ticketPaid !== undefined) {
    db.ticket_paid = reservation.ticketPaid ?? null;
  }
  if (reservation.status !== undefined) db.status = reservation.status;
  if (reservation.checkedInAt !== undefined) {
    db.checked_in_at = reservation.checkedInAt;
  }
  if (reservation.cleared !== undefined) db.cleared = reservation.cleared;

  return db;
};

export const eventReservationsService = {
  async getByEvent(
    eventId: string,
    userId: string
  ): Promise<EventReservation[]> {
    if (!eventId) {
      throw new Error('eventId is required to fetch event reservations');
    }
    if (!userId) {
      throw new Error('userId is required to fetch event reservations');
    }

    return executeSupabaseQuery(async () => {
      const { data, error } = await supabase
        .from<EventReservationDB>('event_reservations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .neq('is_deleted', true) // Filter out soft deleted reservations
        .order('time', { ascending: true });

      if (error) {
        console.error('❌ Supabase error fetching event reservations:', error);
        throw error;
      }

      return (data || []).map(mapFromDB);
    });
  },

  async findByCode(
    userId: string,
    code: string
  ): Promise<EventReservation | null> {
    if (!userId) {
      throw new Error('userId is required to search reservations by code');
    }
    const trimmed = (code || '').trim();
    if (!trimmed) return null;

    return executeSupabaseQuery(async () => {
      const { data, error } = await supabase
        .from<EventReservationDB>('event_reservations')
        .select('*')
        .eq('user_id', userId)
        .eq('reservation_code', trimmed)
        .maybeSingle();

      if (error) {
        console.error('❌ Supabase error searching reservation by code:', error);
        throw error;
      }

      return data ? mapFromDB(data as EventReservationDB) : null;
    });
  },

  async create(input: {
    eventId: string;
    userId: string;
    guestName: string;
    date: string;
    time: string;
    numberOfGuests: number;
    zoneId?: string;
    tableIds?: string[];
    color?: string;
    isVip?: boolean;
    notes?: string;
    phone?: string;
    email?: string;
    paymentStatus?: EventPaymentStatus;
    depositRequired?: number;
    ticketPrice?: number;
    reservationCode?: string;
  }): Promise<EventReservation> {
    const {
      eventId,
      userId,
      guestName,
      date,
      time,
      numberOfGuests,
      zoneId,
      tableIds,
      color,
      isVip,
      notes,
      phone,
      email,
      paymentStatus = 'unpaid',
      depositRequired,
      ticketPrice,
      reservationCode: inputReservationCode,
    } = input;

    if (!eventId || !userId) {
      throw new Error('eventId and userId are required when creating event reservations');
    }

    // Try a few times in case of random code collision
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxAttempts) {
      attempt += 1;
      const reservationCode =
        attempt === 1 && inputReservationCode
          ? inputReservationCode
          : generateEventReservationCode(date);

      const dbReservation = mapToDB({
        eventId,
        userId,
        guestName,
        date,
        time,
        numberOfGuests,
        zoneId,
        tableIds,
        color,
        isVip,
        notes,
        phone,
        email,
        paymentStatus,
        depositRequired,
        ticketPrice,
        reservationCode,
        status: 'booked',
      });

      const { data, error } = await supabase
        .from<EventReservationDB>('event_reservations')
        .insert(dbReservation)
        .select()
        .single();

      if (error) {
        lastError = error;
        // Unique violation for reservation_code – try again with another code
        if ((error as any).code === '23505' || (error as any).message?.includes('unique')) {
          // eslint-disable-next-line no-continue
          continue;
        }
        console.error('❌ Supabase error creating event reservation:', error);
        throw error;
      }

      return mapFromDB(data as EventReservationDB);
    }

    console.error('❌ Failed to create event reservation after retries:', lastError);
    throw lastError || new Error('Failed to create event reservation');
  },

  async update(
    id: string,
    updates: Partial<EventReservation>
  ): Promise<EventReservation> {
    const dbUpdates = mapToDB(updates);

    const { data, error } = await supabase
      .from<EventReservationDB>('event_reservations')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error updating event reservation:', error);
      throw error;
    }

    return mapFromDB(data as EventReservationDB);
  },

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error('userId is required to delete an event reservation');
    }

    const { error } = await supabase
      .from('event_reservations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Supabase error deleting event reservation:', error);
      throw error;
    }
  },

  // Soft delete event reservation (marks as deleted but keeps in database for statistics)
  async softDelete(id: string, userId: string): Promise<void> {
    console.log("🗑️ eventReservationsService.softDelete called with:", { id, userId });
    
    if (!id) {
      console.error("❌ No reservation ID provided for soft deletion");
      throw new Error("Reservation ID is required for soft deletion");
    }
    
    if (!userId) {
      console.error("❌ No userId provided for soft deletion");
      throw new Error("User ID is required for soft deletion");
    }
    
    try {
      // Update reservation to mark as deleted
      const { error } = await supabase
        .from('event_reservations')
        .update({ is_deleted: true })
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) {
        console.error("❌ Supabase error soft deleting event reservation:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log("✅ Event reservation soft deleted successfully:", id);
      
    } catch (error) {
      console.error("❌ Soft delete operation failed:", error);
      throw error;
    }
  },

  // Get all event reservations for analytics (including soft deleted)
  async getForAnalytics(userId: string, startDate?: string, endDate?: string): Promise<EventReservation[]> {
    if (!userId) {
      throw new Error('userId is required to fetch event reservations for analytics');
    }

    return executeSupabaseQuery(async () => {
      let query = supabase
        .from<EventReservationDB>('event_reservations')
        .select('*')
        .eq('user_id', userId);
      // Do NOT filter out soft deleted for analytics - we want ALL historical data

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query.order('date', { ascending: false }).order('time', { ascending: false });

      if (error) {
        console.error('❌ Supabase error fetching event reservations for analytics:', error);
        throw error;
      }

      return (data || []).map(mapFromDB);
    });
  },
};


