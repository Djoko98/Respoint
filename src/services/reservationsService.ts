import { supabase, executeSupabaseQuery } from '../utils/supabaseClient';
import { Reservation } from '../types/reservation';
import { statisticsService } from './statisticsService';

// Tipovi za Supabase tabelu
interface ReservationDB {
  id: string;
  user_id: string;
  guest_name: string;
  date: string;
  time: string;
  number_of_guests: number;
  zone_id: string;
  table_ids: string[] | any; // JSONB array (can be string[] or parsed JSON)
  phone?: string;
  email?: string;
  notes?: string;
  color?: string;
  status: 'waiting' | 'confirmed' | 'arrived' | 'not_arrived' | 'cancelled';
  cleared?: boolean;
  is_vip?: boolean;
  is_deleted?: boolean; // For soft delete
  created_at?: string;
  updated_at?: string;
}

// Konvertuje iz DB formata u aplikacijski format
const mapFromDB = (dbReservation: ReservationDB): Reservation => ({
  id: dbReservation.id,
  user_id: dbReservation.user_id,
  guestName: dbReservation.guest_name,
  isVip: dbReservation.is_vip === true,
  date: dbReservation.date,
  time: dbReservation.time,
  numberOfGuests: dbReservation.number_of_guests,
  zoneId: dbReservation.zone_id,
  tableIds: Array.isArray(dbReservation.table_ids) 
    ? dbReservation.table_ids 
    : (dbReservation.table_ids ? JSON.parse(dbReservation.table_ids) : []),
  phone: dbReservation.phone,
  email: dbReservation.email,
  notes: dbReservation.notes,
  color: dbReservation.color,
  status: dbReservation.status,
  cleared: dbReservation.cleared === true,
  isDeleted: dbReservation.is_deleted,
  createdAt: dbReservation.created_at
});

// Konvertuje iz aplikacijskog formata u DB format
const mapToDB = (reservation: Partial<Reservation>): Partial<ReservationDB> => {
  console.log("🔄 Mapping reservation to DB format:", reservation);
  
  const dbReservation: Partial<ReservationDB> = {};
  
  if (reservation.user_id !== undefined) {
    dbReservation.user_id = reservation.user_id;
    console.log("🔑 Mapped user_id:", dbReservation.user_id);
  }
  if (reservation.guestName !== undefined) {
    dbReservation.guest_name = reservation.guestName;
    console.log("👤 Mapped guest_name:", dbReservation.guest_name);
  }
  if (reservation.date !== undefined) {
    dbReservation.date = reservation.date;
    console.log("📅 Mapped date:", dbReservation.date);
  }
  if (reservation.time !== undefined) {
    dbReservation.time = reservation.time;
    console.log("⏰ Mapped time:", dbReservation.time);
  }
  if (reservation.numberOfGuests !== undefined) {
    dbReservation.number_of_guests = reservation.numberOfGuests;
    console.log("👥 Mapped number_of_guests:", dbReservation.number_of_guests);
  }
  if (reservation.zoneId !== undefined) {
    dbReservation.zone_id = reservation.zoneId;
    console.log("🏢 Mapped zone_id:", dbReservation.zone_id);
  }
  if (reservation.tableIds !== undefined) {
    // Ensure table_ids is properly formatted for JSONB
    dbReservation.table_ids = Array.isArray(reservation.tableIds) 
      ? reservation.tableIds 
      : [];
    console.log("🏷️ Mapped table_ids:", dbReservation.table_ids);
  }
  if (reservation.phone !== undefined) {
    dbReservation.phone = reservation.phone;
    console.log("📞 Mapped phone:", dbReservation.phone);
  }
  if (reservation.email !== undefined) {
    dbReservation.email = reservation.email;
    console.log("📧 Mapped email:", dbReservation.email);
  }
  if (reservation.notes !== undefined) {
    dbReservation.notes = reservation.notes;
    console.log("📝 Mapped notes:", dbReservation.notes);
  }
  if (reservation.color !== undefined) {
    dbReservation.color = reservation.color;
    console.log("🎨 Mapped color:", dbReservation.color);
  }
  if (reservation.status !== undefined) {
    dbReservation.status = reservation.status;
    console.log("📊 Mapped status:", dbReservation.status);
  }
  if ((reservation as any).isVip !== undefined) {
    (dbReservation as any).is_vip = (reservation as any).isVip === true;
    console.log("⭐ Mapped is_vip:", (dbReservation as any).is_vip);
  }
  if ((reservation as any).cleared !== undefined) {
    (dbReservation as any).cleared = (reservation as any).cleared as boolean;
    console.log("🧹 Mapped cleared:", (dbReservation as any).cleared);
  }
  if (reservation.isDeleted !== undefined) {
    dbReservation.is_deleted = reservation.isDeleted;
    console.log("🗑️ Mapped is_deleted:", dbReservation.is_deleted);
  }
  
  console.log("🎯 Final DB reservation object:", dbReservation);
  return dbReservation;
};

// CRUD operacije za rezervacije
export const reservationsService = {
  // Dobavi sve rezervacije za trenutnog korisnika
  async getAll(userId: string): Promise<Reservation[]> {
    console.log("🚀 reservationsService.getAll called with userId:", userId);
    
    if (!userId) {
      console.error("❌ No userId provided for fetching reservations");
      throw new Error("User ID is required for fetching reservations");
    }
    
    return executeSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .neq('is_deleted', true) // Filter out soft deleted reservations
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    
    if (error) {
      console.error('❌ Supabase error fetching reservations:', error);
      console.error('📋 Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log("✅ Supabase returned raw data:", data);
    console.log("📊 Raw data count:", data?.length || 0);
    
    const mappedReservations = (data || []).map(mapFromDB);
    console.log("🎉 Mapped reservations:", mappedReservations);
    console.log("📊 Final count:", mappedReservations.length);
    
    return mappedReservations;
    });
  },

  // Dobavi jednu rezervaciju po ID-ju
  async getById(id: string, userId: string): Promise<Reservation | null> {
    return executeSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching reservation:', error);
      throw error;
    }
    
    return data ? mapFromDB(data) : null;
    });
  },

  // Kreiraj novu rezervaciju
  async createReservation(reservation: Partial<Reservation>): Promise<Reservation> {
    console.log("🚀 reservationsService.createReservation called with:", reservation);
    
    const dbReservation = mapToDB(reservation);
    
    console.log("📝 Mapped DB reservation:", dbReservation);
    console.log("🔑 User ID being used:", dbReservation.user_id);
    
    if (!dbReservation.user_id) {
      console.error("❌ No user_id provided for reservation creation");
      throw new Error("User ID is required for creating reservations");
    }
    
    const { data, error } = await supabase
      .from('reservations')
      .insert(dbReservation)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase error creating reservation:', error);
      console.error('📋 Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log("✅ Supabase returned data:", data);
    
    // Update statistics
    try {
      await statisticsService.updateDailyStatistics(reservation.user_id!, reservation.date!);
      console.log("📊 Statistics updated successfully");
    } catch (error) {
      console.error('⚠️ Error updating statistics (non-fatal):', error);
    }
    
    const mappedResult = mapFromDB(data);
    console.log("🎉 Final mapped reservation:", mappedResult);
    
    return mappedResult;
  },

  // Ažuriraj postojeću rezervaciju
  async updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation> {
    console.log("🚀 reservationsService.updateReservation called with:", { id, updates });
    
    // NOTE: We keep tableIds for historical statistics tracking
    // No longer clearing tableIds when status is finalized to preserve top tables data
    
    const dbUpdates = mapToDB(updates);
    console.log("📝 Mapped DB updates:", dbUpdates);
    
    const { data, error } = await supabase
      .from('reservations')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase error updating reservation:', error);
      console.error('📋 Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log("✅ Supabase returned updated data:", data);
    
    // Update statistics if status changed
    if (updates.status) {
      try {
        await statisticsService.updateDailyStatistics(data.user_id, data.date);
        console.log("📊 Statistics updated for status change");
      } catch (error) {
        console.error('⚠️ Error updating statistics (non-fatal):', error);
      }
    }
    
    const mappedResult = mapFromDB(data);
    console.log("🎉 Final updated reservation:", mappedResult);
    
    return mappedResult;
  },

  // Obriši rezervaciju
  async deleteReservation(id: string, userId?: string): Promise<void> {
    console.log("🚀 reservationsService.deleteReservation called with:", { id, userId });
    
    if (!id) {
      console.error("❌ No reservation ID provided for deletion");
      throw new Error("Reservation ID is required for deletion");
    }
    
    if (!userId) {
      console.error("❌ No userId provided for deletion");
      throw new Error("User ID is required for deletion");
    }
    
    // First, let's check if the reservation exists and belongs to the user
    console.log("🔍 First checking if reservation exists...");
    try {
      const { data: existingReservation, error: checkError } = await supabase
        .from('reservations')
        .select('id, user_id, guest_name')
        .eq('id', id)
        .maybeSingle();
        
      console.log("📋 Existing reservation check result:");
      console.log("  - data:", existingReservation);
      console.log("  - error:", checkError);
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error("❌ Error checking reservation existence:", checkError);
        throw checkError;
      }
      
      if (!existingReservation) {
        console.error("❌ Reservation not found with ID:", id);
        throw new Error("Reservation not found");
      }
      
      if (existingReservation.user_id !== userId) {
        console.error("❌ Reservation belongs to different user:");
        console.error("  - Reservation user_id:", existingReservation.user_id);
        console.error("  - Current user_id:", userId);
        throw new Error("You don't have permission to delete this reservation");
      }
      
      console.log("✅ Reservation exists and belongs to current user:", existingReservation.guest_name);
      
    } catch (error) {
      console.error("❌ Pre-check failed:", error);
      throw error;
    }
    
    // Now attempt the delete with simplified query
    console.log("🗃️ Proceeding with DELETE operation...");
    
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      console.log("📋 DELETE query completed, error:", error);
      
      if (error) {
        console.error('❌ Supabase error deleting reservation:', error);
        console.error('📋 Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log("✅ DELETE operation completed without error");
      
      // Final verification
      console.log("🔍 Final verification - checking if reservation still exists...");
      const { data: verifyData, error: verifyError } = await supabase
        .from('reservations')
        .select('id')
        .eq('id', id)
        .maybeSingle();
        
      console.log("📋 Verification result:");
      console.log("  - data:", verifyData);
      console.log("  - error:", verifyError);
        
      if (verifyData) {
        console.error("❌ DELETION FAILED: Reservation still exists after delete!");
        throw new Error("Reservation was not deleted from database");
      } else {
        console.log("✅ VERIFICATION PASSED: Reservation successfully deleted");
      }
      
    } catch (error) {
      console.error("❌ DELETE operation failed:", error);
      throw error;
    }
    
    console.log("🎉 Delete operation completed successfully");
  },

  // Dobavi rezervacije za određeni datum
  async getByDate(date: string, userId: string): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .neq('is_deleted', true) // Filter out soft deleted reservations
      .order('time', { ascending: true });
    
    if (error) {
      console.error('Error fetching reservations by date:', error);
      throw error;
    }
    
    return (data || []).map(mapFromDB);
  },

  // Dobavi rezervacije za određenu zonu
  async getByZone(zoneId: string, userId: string): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .eq('zone_id', zoneId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    
    if (error) {
      console.error('Error fetching reservations by zone:', error);
      throw error;
    }
    
    return (data || []).map(mapFromDB);
  },

  // Dobavi rezervacije za određeni period (startDate do endDate)
  async getReservations(userId: string, startDate: string, endDate: string): Promise<Reservation[]> {
    console.log("🚀 reservationsService.getReservations called with:", { userId, startDate, endDate });
    
    if (!userId) {
      console.error("❌ No userId provided for fetching reservations");
      throw new Error("User ID is required for fetching reservations");
    }
    
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .neq('is_deleted', true) // Filter out soft deleted reservations
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    
    if (error) {
      console.error('❌ Supabase error fetching reservations by date range:', error);
      console.error('📋 Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log("✅ Supabase returned reservation data:", data);
    console.log("📊 Reservation count:", data?.length || 0);
    
    const mappedReservations = (data || []).map(mapFromDB);
    console.log("🎉 Mapped reservations:", mappedReservations);
    
    return mappedReservations;
  },

  // Dobavi sve rezervacije za analitiku (uključujući cancelled)
  async getReservationsForAnalytics(userId: string, startDate: string, endDate: string): Promise<Reservation[]> {
    console.log("📊 reservationsService.getReservationsForAnalytics called with:", { userId, startDate, endDate });
    
    if (!userId) {
      console.error("❌ No userId provided for fetching analytics reservations");
      throw new Error("User ID is required for fetching analytics reservations");
    }
    
    // First try to get reservations with zone names using LEFT JOIN
    let { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        zones:zone_id (
          name
        )
      `)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      // Do NOT filter out soft deleted for analytics - we want ALL historical data for statistics
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    // If JOIN fails, fallback to simple query
    if (error) {
      console.warn('📊 JOIN with zones failed, falling back to simple query:', error);
      const fallbackResult = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        // Do NOT filter out soft deleted for analytics - we want ALL historical data
        .order('date', { ascending: false })
        .order('time', { ascending: false });
      
      data = fallbackResult.data;
      error = fallbackResult.error;
    }
    
    if (error) {
      console.error('❌ Supabase error fetching analytics reservations:', error);
      throw error;
    }
    
    console.log("✅ Analytics data returned:", data?.length || 0, "reservations");
    
    // Get zone names if not already included
    let zoneNamesMap: { [key: string]: string } = {};
    
    // Check if we have zone data from JOIN
    const hasZoneData = data?.some((r: any) => r.zones && r.zones.name);
    
    if (!hasZoneData && data && data.length > 0) {
      // Get unique zone IDs
      const zoneIds = [...new Set(data.map((r: any) => r.zone_id).filter(Boolean))];
      
      if (zoneIds.length > 0) {
        try {
          console.log("📊 Fetching zone names for IDs:", zoneIds);
          const { data: zones } = await supabase
            .from('zones')
            .select('id, name')
            .in('id', zoneIds);
          
          if (zones) {
            zoneNamesMap = zones.reduce((acc: any, zone: any) => {
              acc[zone.id] = zone.name;
              return acc;
            }, {});
            console.log("📊 Zone names map:", zoneNamesMap);
          }
        } catch (zoneError) {
          console.warn("⚠️ Failed to fetch zone names:", zoneError);
        }
      }
    }
    
    const mappedReservations = (data || []).map((reservation: any) => {
      const mapped = mapFromDB(reservation);
      
      // Add zone name from JOIN or separate query
      if (reservation.zones && reservation.zones.name) {
        mapped.zoneName = reservation.zones.name;
      } else if (reservation.zone_id && zoneNamesMap[reservation.zone_id]) {
        mapped.zoneName = zoneNamesMap[reservation.zone_id];
      }
      
      return mapped;
    });
    
    return mappedReservations;
  },

  // Soft delete rezervacije (označava kao obrisanu ali ostaje u bazi za statistike)
  async softDeleteReservation(id: string, userId?: string): Promise<void> {
    console.log("🗑️ reservationsService.softDeleteReservation called with:", { id, userId });
    
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
        .from('reservations')
        .update({ is_deleted: true })
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) {
        console.error('❌ Supabase error soft deleting reservation:', error);
        console.error('📋 Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log("✅ Reservation soft deleted successfully:", id);
      
      // Update statistics to reflect the change
      const { data: reservation } = await supabase
        .from('reservations')
        .select('date, user_id')
        .eq('id', id)
        .single();
        
      if (reservation) {
        await statisticsService.updateDailyStatistics(reservation.user_id, reservation.date);
        console.log("📊 Statistics updated after soft delete");
      }
      
    } catch (error) {
      console.error("❌ Soft delete operation failed:", error);
      throw error;
    }
  }
}; 