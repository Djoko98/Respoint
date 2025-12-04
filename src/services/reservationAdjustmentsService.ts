import { supabase } from '../utils/supabaseClient';

export interface ReservationAdjustment {
  reservation_id: string;
  date: string; // 'YYYY-MM-DD'
  start_min?: number | null;
  end_min?: number | null;
  user_id?: string;
  updated_at?: string;
}

const TABLE = 'reservation_adjustments';

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  } catch {
    return null;
  }
}

export const reservationAdjustmentsService = {
  // Returns a map reservationId -> { start, end }
  async getByDate(date: string): Promise<Record<string, { start?: number; end?: number }>> {
    const userId = await getCurrentUserId();
    if (!userId) return {};
    const { data, error } = await supabase
      .from<ReservationAdjustment>(TABLE as any)
      .select('reservation_id, start_min, end_min')
      .eq('user_id', userId)
      .eq('date', date);
    if (error) {
      console.warn('reservationAdjustmentsService.getByDate error', error);
      return {};
    }
    const map: Record<string, { start?: number; end?: number }> = {};
    (data || []).forEach(row => {
      map[row.reservation_id] = {
        start: row.start_min ?? undefined,
        end: row.end_min ?? undefined
      };
    });
    return map;
  },

  async getOne(date: string, reservationId: string): Promise<{ start?: number; end?: number } | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const { data, error } = await supabase
      .from<ReservationAdjustment>(TABLE as any)
      .select('reservation_id, start_min, end_min')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('reservation_id', reservationId)
      .maybeSingle();
    if (error) {
      console.warn('reservationAdjustmentsService.getOne error', error);
      return null;
    }
    if (!data) return null;
    return {
      start: data.start_min ?? undefined,
      end: data.end_min ?? undefined
    };
  },

  async upsertAdjustment(date: string, reservationId: string, payload: { start?: number; end?: number }) {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const row: ReservationAdjustment = {
      user_id: userId,
      date,
      reservation_id: reservationId,
      start_min: payload.start ?? null,
      end_min: payload.end ?? null,
    };
    const { error } = await supabase
      .from(TABLE)
      .upsert(row as any, { onConflict: 'user_id,reservation_id,date' });
    if (error) {
      console.warn('reservationAdjustmentsService.upsertAdjustment error', error);
    }
  }
};


