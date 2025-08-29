import { supabase, executeSupabaseQuery } from '../utils/supabaseClient';

export interface Statistics {
  id: string;
  user_id: string;
  date: string;
  total_reservations: number;
  total_guests: number;
  arrived_reservations: number; // renamed from arrived_guests
  cancelled_reservations: number;
  not_arrived_reservations: number; // new field
  waiting_reservations: number; // new field for waiting/confirmed
  revenue: number;
  created_at: string;
  updated_at: string;
}

export const statisticsService = {
  // Učitaj statistike za korisnika i period
  async getStatistics(userId: string, startDate?: string, endDate?: string) {
    console.log('Getting statistics:', { userId, startDate, endDate });
    
    return executeSupabaseQuery(async () => {
    let query = supabase
      .from('statistics')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }

    return data || [];
    });
  },

  // Ažuriraj ili kreiraj statistiku za određeni dan
  async updateDailyStatistics(userId: string, date: string) {
    console.log('Updating daily statistics:', { userId, date });
    
    return executeSupabaseQuery(async () => {
    try {
      // Prvo prebrojimo rezervacije za taj dan (uključujući i obrisane za statistike)
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date);
        // Ne filtriramo is_deleted za statistike - trebaju sve rezervacije

      if (resError) throw resError;

      const stats = {
        total_reservations: reservations?.length || 0,
        total_guests: reservations?.reduce((sum, r) => sum + r.number_of_guests, 0) || 0,
        arrived_reservations: reservations?.filter(r => r.status === 'arrived').length || 0, // renamed and counts reservations not guests
        cancelled_reservations: reservations?.filter(r => r.status === 'cancelled').length || 0,
        not_arrived_reservations: reservations?.filter(r => r.status === 'not_arrived').length || 0, // only explicit not_arrived
        waiting_reservations: reservations?.filter(r => r.status === 'waiting' || r.status === 'confirmed').length || 0, // waiting + confirmed
        // Revenue možete izračunati na osnovu vaše logike
        revenue: 0 
      };

      // Proveravamo da li već postoji statistika za taj dan
      const { data: existing } = await supabase
        .from('statistics')
        .select('id')
        .eq('user_id', userId)
        .eq('date', date)
        .single();

      if (existing) {
        // Ažuriramo postojeću
        const { data, error } = await supabase
          .from('statistics')
          .update(stats)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Kreiramo novu
        const { data, error } = await supabase
          .from('statistics')
          .insert({
            user_id: userId,
            date,
            ...stats
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating daily statistics:', error);
      throw error;
    }
    });
  },

  // Agregirane statistike za period
  async getAggregatedStatistics(userId: string, startDate?: string, endDate?: string) {
    console.log('📊 Getting aggregated statistics:', { userId, startDate, endDate });
    
    // Always calculate directly from reservations to ensure accuracy
    console.log('📊 Calculating directly from reservations for accuracy');
    return await this.getAggregatedStatisticsFromReservations(userId, startDate, endDate);
  },

  // Direktno računanje agregirane statistike iz rezervacija (backup metoda)
  async getAggregatedStatisticsFromReservations(userId: string, startDate?: string, endDate?: string) {
    console.log('📊 Getting aggregated statistics directly from reservations:', { userId, startDate, endDate });
    
    return executeSupabaseQuery(async () => {
      let query = supabase
        .from('reservations')
        .select('*')
        .eq('user_id', userId);
        // Do NOT filter out soft deleted reservations for statistics - we want ALL historical data

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data: reservations, error } = await query;

      if (error) {
        console.error('Error getting reservations for statistics:', error);
        throw error;
      }

      console.log('📊 Found reservations for direct calculation:', reservations?.length || 0);
      console.log('📊 Reservation statuses:', reservations?.map((r: any) => r.status) || []);
      console.log('📊 Raw reservations data:', reservations);

      const result = {
        totalReservations: reservations?.length || 0,
        totalGuests: reservations?.reduce((sum: number, r: any) => sum + r.number_of_guests, 0) || 0,
        arrivedReservations: reservations?.filter((r: any) => r.status === 'arrived').length || 0,
        cancelledReservations: reservations?.filter((r: any) => r.status === 'cancelled').length || 0,
        notArrivedReservations: reservations?.filter((r: any) => r.status === 'not_arrived').length || 0, // only explicit not_arrived
        waitingReservations: reservations?.filter((r: any) => r.status === 'waiting' || r.status === 'confirmed').length || 0, // waiting + confirmed
        totalRevenue: 0,
        averageGuests: reservations?.length > 0 
          ? Math.round((reservations?.reduce((sum: number, r: any) => sum + r.number_of_guests, 0) || 0) / reservations.length)
          : 0
      };

      console.log('📊 Direct calculation result:', result);
      return result;
    });
  }
}; 