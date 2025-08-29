import React, { createContext, useState, ReactNode, useEffect, useContext, useMemo, useCallback } from "react";
import { supabase } from "../utils/supabaseClient";
import { UserContext } from "./UserContext";
import { Reservation } from "../types/reservation";
import { reservationsService } from "../services/reservationsService";
import { notificationService } from "../services/notificationService";
import { getCurrentWindow, UserAttentionType } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

interface ReservationContextType {
  reservations: Reservation[];
  loading: boolean;
  setReservations: (r: Reservation[]) => void;
  addReservation: (reservation: Omit<Reservation, 'id' | 'createdAt'>) => Promise<void>;
  updateReservation: (id: string, updates: Partial<Reservation>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  fetchReservations: () => Promise<void>;
}

export const ReservationContext = createContext<ReservationContextType>({
  reservations: [],
  loading: false,
  setReservations: () => {},
  addReservation: async () => {},
  updateReservation: async () => {},
  deleteReservation: async () => {},
  fetchReservations: async () => {},
});

export const ReservationProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  const { user } = useContext(UserContext);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch reservations function
  const fetchReservations = useCallback(async () => {
    if (!user?.id) {
      console.log('🚫 ReservationContext: No user ID, clearing reservations');
      setReservations([]);
      setLoading(false);
      return;
    }

    console.log('📋 ReservationContext: Fetching reservations for user:', user.id);
    console.log('🔍 Current user object:', user);
    setLoading(true);
    
    try {
      console.log('🚀 ReservationContext: Calling reservationsService.getAll...');
      const data = await reservationsService.getAll(user.id);
      console.log('✅ ReservationContext: Service returned data:', data);
      console.log('📊 ReservationContext: Data count:', data.length);
      
      setReservations(data);
      console.log('📊 ReservationContext: State updated with reservations');
    } catch (error) {
      console.error("❌ ReservationContext: Error fetching reservations:", error);
      console.error("📋 ReservationContext: Error details:", error);
      setReservations([]);
    } finally {
      setLoading(false);
      console.log('🏁 ReservationContext: Fetch operation completed');
    }
  }, [user?.id]);

  // Load reservations when user changes
  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Supabase Realtime: notify on new reservations for this user (desktop notifications)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`reservations_insert_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reservations', filter: `user_id=eq.${user.id}` }, async (payload) => {
        try {
          const ok = await notificationService.requestPermission();
          if (ok) {
            const r: any = payload.new;
            const guest = r?.guest_name || 'Nova rezervacija';
            const time = r?.time ? ` u ${r.time}` : '';
            await notificationService.send('Nova rezervacija', `${guest}${time}`);
          }
          // If window isn't focused, flash taskbar button until user focuses the app
          try {
            const appWindow = getCurrentWindow();
            const focused = await appWindow.isFocused();
            if (!focused) {
              await appWindow.requestUserAttention(UserAttentionType.Critical);
            }
          } catch (e) {
            console.warn('requestUserAttention failed', e);
          }
          // Update overlay badge count (max 9+)
          try {
            const appWindow = getCurrentWindow();
            const focused = await appWindow.isFocused();
            // If not focused, increment overlay; if focused, clear
            if (!focused) {
              setUnreadCount(prev => {
                const next = Math.min(prev + 1, 99);
                invoke('set_taskbar_overlay', { count: next }).catch(() => {});
                return next;
              });
            } else {
              await invoke('set_taskbar_overlay', { count: 0 });
              setUnreadCount(0);
            }
          } catch (e) {
            console.warn('set_taskbar_overlay failed', e);
          }
        } catch (e) {
          console.error('Notification error:', e);
        }
        // Refresh list to include the new reservation
        fetchReservations();
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch (_) {}
    };
  }, [user?.id, fetchReservations]);

  // Add window focus event listener to refetch data when app comes back to focus
  useEffect(() => {
    let lastRefreshTime = Date.now();
    
    const handleWindowFocus = async () => {
      console.log('🔄 Window focused - refetching reservations');
      
      // Debounce to avoid multiple calls
      const now = Date.now();
      if (now - lastRefreshTime < 2000) {
        console.log('⏳ Skipping reservation refresh - too soon after last refresh');
        return;
      }
      lastRefreshTime = now;
      
      if (user?.id) {
        // Just try to refresh reservations without checking session
        // If there's an auth error, the service will handle it
        await fetchReservations();
      }
    };

    const onFocus = async () => {
      try { await invoke('set_taskbar_overlay', { count: 0 }); } catch (_) {}
      setUnreadCount(0);
      handleWindowFocus();
    };
    window.addEventListener('focus', onFocus);
    
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchReservations, user?.id]);

  // Add reservation function with detailed logging
  const addReservation = useCallback(async (reservation: Omit<Reservation, 'id' | 'createdAt'>) => {
    if (!user?.id) {
      console.error('🚫 ReservationContext: Cannot add reservation: No user ID');
      console.error('🔍 Current user object:', user);
      return;
    }
    
    console.log('➕ ReservationContext: Adding reservation for user:', user.id);
    console.log('📝 ReservationContext: Input reservation data:', reservation);
    
    try {
      // DIRECT SUPABASE DEBUG - dodano na zahtev korisnika
      console.log('🧪 DEBUG: Trying direct Supabase insert...');
      
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔍 Current session:', session?.user?.id, 'Error:', sessionError);
      
      if (!session?.user?.id) {
        console.error('❌ No active session found!');
        alert('No active session - please login again');
        return;
      }
      
      // Direct Supabase insert for debugging
      const directInsertData = {
        zone_id: reservation.zoneId,
        guest_name: reservation.guestName,
        date: reservation.date,
        time: reservation.time,
        number_of_guests: reservation.numberOfGuests,
        user_id: session.user.id, // OBAVEZNO
        table_ids: reservation.tableIds || [],
        phone: reservation.phone,
        email: reservation.email,
        notes: reservation.notes,
        color: reservation.color,
        status: reservation.status || 'waiting'
      };
      
      console.log('📤 Direct Supabase insert data:', directInsertData);
      
      const { error, data } = await supabase
        .from('reservations')
        .insert(directInsertData)
        .select()
        .single();

      if (error) {
        console.error("❌ Error inserting reservation:", error.message);
        console.error("📋 Full error object:", error);
        alert(`RLS/Database Error: ${error.message}`); // vidi da li je RLS blokira
        return;
      } else {
        console.log("✅ Inserted reservation:", data);
        
        // Convert to app format and add to state
        const newReservation = {
          id: data.id,
          user_id: data.user_id,
          guestName: data.guest_name,
          date: data.date,
          time: data.time,
          numberOfGuests: data.number_of_guests,
          zoneId: data.zone_id,
          tableIds: Array.isArray(data.table_ids) ? data.table_ids : [],
          phone: data.phone,
          email: data.email,
          notes: data.notes,
          color: data.color,
          status: data.status,
          createdAt: data.created_at
        };
        
        // Add to local state
        setReservations(prev => {
          const updated = [...prev, newReservation];
          console.log('📊 ReservationContext: Updated local state - previous count:', prev.length, 'new count:', updated.length);
          return updated;
        });
        
        console.log('✅ Direct insert successful, skipping service call');
        return;
      }
      
    } catch (error) {
      console.error('❌ ReservationContext: Failed to add reservation:', error);
      console.error('📋 ReservationContext: Error details:', error);
      throw error; // Re-throw so UI can handle the error
    }
  }, [user?.id]);

  // Update reservation function with detailed logging
  const updateReservation = useCallback(async (id: string, updates: Partial<Reservation>) => {
    if (!user?.id) {
      console.error('🚫 Cannot update reservation: No user ID');
      return;
    }
    
    console.log('✏️ Updating reservation:', id);
    console.log('📝 Update data:', updates);
    
    try {
      const updated = await reservationsService.updateReservation(id, updates);
      console.log('✅ Reservation updated successfully:', updated);
      
      setReservations(prev => {
        const updatedList = prev.map(r => r.id === id ? updated : r);
        console.log('📊 Updated reservations list:', updatedList);
        return updatedList;
      });
    } catch (error) {
      console.error('❌ Failed to update reservation:', error);
      throw error;
    }
  }, [user?.id]);

  // Delete reservation function with detailed logging
  const deleteReservation = useCallback(async (id: string) => {
    if (!user?.id) {
      console.error('🚫 Cannot delete reservation: No user ID');
      return;
    }
    
    console.log('🗑️ ReservationContext: Deleting reservation:', id, 'for user:', user.id);
    console.log('📊 Current reservations before deletion:', reservations.map(r => ({ id: r.id, guestName: r.guestName })));
    
    try {
      console.log('🚀 ReservationContext: Calling service...');
      await reservationsService.deleteReservation(id, user.id);
      console.log('✅ ReservationContext: Service call completed successfully');
      
      console.log('🔄 ReservationContext: Updating local state...');
      setReservations(prev => {
        console.log('📊 Previous reservations count:', prev.length);
        const filteredList = prev.filter(r => r.id !== id);
        console.log('📊 New reservations count after filter:', filteredList.length);
        console.log('📊 Remaining reservations:', filteredList.map(r => ({ id: r.id, guestName: r.guestName })));
        
        if (prev.length === filteredList.length) {
          console.warn('⚠️ No reservation was removed from state - ID might not match');
          console.warn('🔍 Looking for ID:', id);
          console.warn('🔍 Available IDs:', prev.map(r => r.id));
        }
        
        return filteredList;
      });
      
      // Verify deletion by refetching from database
      console.log('🔍 ReservationContext: Verifying deletion by refetching...');
      try {
        const freshReservations = await reservationsService.getAll(user.id);
        console.log('📊 Fresh data from DB:', freshReservations.map(r => ({ id: r.id, guestName: r.guestName })));
        
        const deletedReservationStillExists = freshReservations.find(r => r.id === id);
        if (deletedReservationStillExists) {
          console.error('❌ VERIFICATION FAILED: Reservation still exists in database!');
          console.error('📋 This means the DELETE operation failed silently');
          // Update state with fresh data
          setReservations(freshReservations);
        } else {
          console.log('✅ VERIFICATION PASSED: Reservation no longer exists in database');
        }
      } catch (verificationError) {
        console.error('⚠️ Could not verify deletion:', verificationError);
      }
      
      console.log('🎉 ReservationContext: Delete operation completed');
    } catch (error) {
      console.error('❌ ReservationContext: Failed to delete reservation:', error);
      console.error('📋 ReservationContext: Error type:', typeof error);
      console.error('📋 ReservationContext: Error message:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, [user?.id, reservations]);

  // Memoize context value with all required functions
  const contextValue = useMemo(() => ({
    reservations,
    loading,
    setReservations,
    addReservation,
    updateReservation,
    deleteReservation,
    fetchReservations
  }), [reservations, loading, addReservation, updateReservation, deleteReservation, fetchReservations]);

  return (
    <ReservationContext.Provider value={contextValue}>
      {children}
    </ReservationContext.Provider>
  );
});

export { ReservationContext as ReservationContextExport };
