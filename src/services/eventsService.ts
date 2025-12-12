import { supabase, executeSupabaseQuery } from '../utils/supabaseClient';
import type { Event, EventDB } from '../types/event';

// Map DB row -> application Event
const mapEventFromDB = (row: EventDB): Event => {
  let zoneIds: string[] | null = null;
  const rawZoneIds = row.zone_ids;
  try {
    if (Array.isArray(rawZoneIds)) {
      zoneIds = rawZoneIds.map((z: any) => String(z));
    } else if (rawZoneIds != null) {
      const parsed = typeof rawZoneIds === 'string' ? JSON.parse(rawZoneIds) : rawZoneIds;
      if (Array.isArray(parsed)) zoneIds = parsed.map((z: any) => String(z));
    }
  } catch {
    zoneIds = null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? null,
    date: row.date,
    endDate: row.end_date ?? null,
    startTime: row.start_time,
    endTime: row.end_time,
    capacityTotal: row.capacity_total ?? null,
    zoneIds,
    enableDeposit: row.enable_deposit,
    depositType: row.deposit_type,
    depositAmount: row.deposit_amount ?? null,
    enableTicket: row.enable_ticket,
    ticketPrice: row.ticket_price ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// Map application Event -> DB shape for insert/update
const mapEventToDB = (event: Partial<Event>): Partial<EventDB> => {
  const db: Partial<EventDB> = {};

  if (event.userId !== undefined) db.user_id = event.userId;
  if (event.name !== undefined) db.name = event.name;
  if (event.description !== undefined) db.description = event.description;
  if (event.date !== undefined) db.date = event.date;
  if (event.endDate !== undefined) db.end_date = event.endDate ?? null;
  if (event.startTime !== undefined) db.start_time = event.startTime;
  if (event.endTime !== undefined) db.end_time = event.endTime;
  if (event.capacityTotal !== undefined) db.capacity_total = event.capacityTotal ?? null;
  if (event.zoneIds !== undefined) db.zone_ids = event.zoneIds ?? null;
  if (event.enableDeposit !== undefined) db.enable_deposit = event.enableDeposit;
  if (event.depositType !== undefined) db.deposit_type = event.depositType;
  if (event.depositAmount !== undefined) db.deposit_amount = event.depositAmount ?? null;
  if (event.enableTicket !== undefined) db.enable_ticket = event.enableTicket;
  if (event.ticketPrice !== undefined) db.ticket_price = event.ticketPrice ?? null;

  return db;
};

export const eventsService = {
  async getEventsByDate(userId: string, date: string): Promise<Event[]> {
    if (!userId) {
      throw new Error('User ID is required to fetch events');
    }

    return executeSupabaseQuery(async () => {
      // Fetch events that:
      // 1. Start on this date (date = selected date)
      // 2. OR span across this date (date < selected date AND end_date >= selected date)
      const { data, error } = await supabase
        .from<EventDB>('events')
        .select('*')
        .eq('user_id', userId)
        .or(`date.eq.${date},and(date.lt.${date},end_date.gte.${date})`)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('❌ Supabase error fetching events:', error);
        throw error;
      }

      return (data || []).map(mapEventFromDB);
    });
  },

  // Get all event dates for calendar display
  async getAllEventDates(userId: string): Promise<string[]> {
    if (!userId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .select('date, end_date')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Supabase error fetching event dates:', error);
        return [];
      }

      // Collect all dates including multi-day event ranges
      const allDates: string[] = [];
      (data || []).forEach((row: { date: string; end_date?: string | null }) => {
        allDates.push(row.date);
        // If event spans multiple days, add all dates in range
        if (row.end_date && row.end_date !== row.date) {
          const startDate = new Date(row.date);
          const endDate = new Date(row.end_date);
          const current = new Date(startDate);
          current.setDate(current.getDate() + 1); // Start from day after start date
          while (current <= endDate) {
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d = String(current.getDate()).padStart(2, '0');
            allDates.push(`${y}-${m}-${d}`);
            current.setDate(current.getDate() + 1);
          }
        }
      });

      return [...new Set(allDates)];
    } catch (err) {
      console.error('❌ Error fetching event dates:', err);
      return [];
    }
  },

  async createEvent(input: Partial<Event>): Promise<Event> {
    if (!input.userId) {
      throw new Error('userId is required when creating an event');
    }

    const dbEvent = mapEventToDB(input);

    const { data, error } = await supabase
      .from<EventDB>('events')
      .insert(dbEvent)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error creating event:', error);
      throw error;
    }

    return mapEventFromDB(data as EventDB);
  },

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    const dbUpdates = mapEventToDB(updates);

    const { data, error } = await supabase
      .from<EventDB>('events')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error updating event:', error);
      throw error;
    }

    return mapEventFromDB(data as EventDB);
  },

  async deleteEvent(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to delete an event');
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Supabase error deleting event:', error);
      throw error;
    }
  },
};


