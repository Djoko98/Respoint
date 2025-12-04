import React, { createContext, useState, ReactNode, useEffect, useContext, useMemo, useCallback } from "react";
import { supabase } from "../utils/supabaseClient";
import { UserContext } from "./UserContext";
import { Reservation } from "../types/reservation";
import { reservationsService } from "../services/reservationsService";
import { notificationService } from "../services/notificationService";
import { getCurrentWindow, UserAttentionType } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { reservationAdjustmentsService } from "../services/reservationAdjustmentsService";
import { guestbookService } from "../services/guestbookService";

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
        status: reservation.status || 'waiting',
        is_vip: (reservation as any)?.isVip === true
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
          isVip: data?.is_vip === true,
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

        // Link this reservation to a selected guestbook entry if present
        try {
          const gbId = localStorage.getItem('respoint_selected_guestbook_id');
          if (gbId) {
            let map: Record<string, string> = {};
            try {
              const raw = localStorage.getItem('respoint_res_to_guestbook');
              map = raw ? JSON.parse(raw) : {};
            } catch { map = {}; }
            map[data.id] = gbId;
            localStorage.setItem('respoint_res_to_guestbook', JSON.stringify(map));
            localStorage.removeItem('respoint_selected_guestbook_id');
          }
        } catch {}
        
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
    const previous = reservations.find(r => r.id === id);
    
    try {
      const updated = await reservationsService.updateReservation(id, updates);
      console.log('✅ Reservation updated successfully:', updated);
      
      setReservations(prev => {
        const updatedList = prev.map(r => {
          if (r.id !== id) return r;
          // Preserve local-only flags like isVip if not provided in updates/service result
          const next: Reservation = { ...updated, isVip: (updates as any)?.isVip ?? r.isVip };
          return next;
        });
        console.log('📊 Updated reservations list:', updatedList);
        return updatedList;
      });

      // If status just became arrived, update guestbook lastVisit/totalVisits
      try {
        if (updated?.status === 'arrived' && previous?.status !== 'arrived') {
          const normalizeText = (s: string) =>
            (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const normalizePhone = (p?: string) => (p || '').replace(/\D+/g, '');
          const guestName = normalizeText(updated.guestName || '');
          const phoneDigits = normalizePhone(updated.phone);
          let list = await guestbookService.list();
          let matched = undefined as any;
          // 1) Check explicit mapping reservation -> guestbookId
          try {
            const rawMap = localStorage.getItem('respoint_res_to_guestbook');
            if (rawMap) {
              const map: Record<string, string> = JSON.parse(rawMap);
              const gbId = map[updated.id];
              if (gbId) {
                matched = list.find(e => e.id === gbId) || matched;
              }
            }
          } catch {}
          // 2) Prefer phone match if sufficiently specific
          if (!matched && phoneDigits && phoneDigits.length >= 5) {
            matched = list.find(e => normalizePhone(e.phone) === phoneDigits);
          }
          // 3) Fallback to exact normalized name
          if (!matched && guestName) {
            matched = list.find(e => normalizeText(e.name || '') === guestName);
          }
          if (matched && matched.id) {
            const dateOnly = (updated.date || '').slice(0, 10);
            const lastVisitDate = (matched.lastVisitAt || '').slice(0, 10);
            const alreadyCounted = dateOnly && lastVisitDate === dateOnly;
            const newTotal = (matched.totalVisits || 0) + (alreadyCounted ? 0 : 1);
            // Compute average weekly visit frequency using all ARRIVED reservations for this guest
            const normalizePhone2 = (p?: string) => (p || '').replace(/\D+/g, '');
            const normalizeText2 = (s: string) =>
              (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            // Build reservation list including current update
            const allAfterUpdate = reservations.map(r => (r.id === id ? { ...r, ...updated } : r));
            let map: Record<string, string> = {};
            try {
              const raw = localStorage.getItem('respoint_res_to_guestbook');
              map = raw ? JSON.parse(raw) : {};
            } catch { map = {}; }
            const sameGuestReservations = allAfterUpdate.filter((r) => {
              if (!r) return false;
              if (map[r.id] === matched.id) return true;
              const phoneEq =
                normalizePhone2(r.phone) &&
                normalizePhone2(matched.phone) &&
                normalizePhone2(r.phone) === normalizePhone2(matched.phone) &&
                normalizePhone2(matched.phone).length >= 5;
              if (phoneEq) return true;
              const nameEq =
                normalizeText2(r.guestName || '') === normalizeText2(matched.name || '');
              return nameEq;
            });
            const arrived = sameGuestReservations.filter((r) => (r as any)?.status === 'arrived');
            let visitFrequencyStr: string | undefined = undefined;
            if (arrived.length > 0) {
              const times = arrived
                .map((r) => new Date((r.date || '').slice(0, 10)).getTime())
                .filter((t) => !Number.isNaN(t))
                .sort((a, b) => a - b);
              const first = times[0];
              const last = times[times.length - 1];
              const diffDays = Math.max(0, Math.round((last - first) / (1000 * 60 * 60 * 24)));
              const weeks = Math.max(1, diffDays / 7 || 1);
              const perWeek = arrived.length / weeks;
              visitFrequencyStr = `${Number(perWeek.toFixed(1))} / week`;
              // Average seats per reservation from arrived
              const avgSeats =
                arrived.reduce((acc, r) => acc + (Number((r as any).numberOfGuests) || 0), 0) /
                Math.max(1, arrived.length);
              // Persist lightweight stats locally so they remain visible after clearing/deleting reservations
              try {
                const rawStats = localStorage.getItem('respoint_guest_stats');
                const statsMap: Record<string, { weekly: number; avgSeats: number }> = rawStats ? JSON.parse(rawStats) : {};
                statsMap[matched.id] = { weekly: Number(perWeek.toFixed(1)), avgSeats: Number(avgSeats.toFixed(1)) };
                localStorage.setItem('respoint_guest_stats', JSON.stringify(statsMap));
              } catch {}
            }
            await guestbookService.update(matched.id, { totalVisits: newTotal, lastVisitAt: dateOnly, ...(visitFrequencyStr ? { visitFrequency: visitFrequencyStr } : {}) });
          }
        }
      } catch (guestErr) {
        console.warn('⚠️ Failed to update guestbook on arrived status (non-fatal):', guestErr);
      }

      // Keep Timeline Overlay in sync with edited reservation time/date
      try {
        if (updated?.time) {
          const [hh, mm] = updated.time.split(':').map(Number);
          const newStartMin = (hh % 24) * 60 + (mm % 60);
          const dateKey = updated.date;

          // Load existing local adjustments for the target date
          let localMap: any = {};
          try {
            const raw = localStorage.getItem(`respoint-duration-adjustments:${dateKey}`);
            localMap = raw ? JSON.parse(raw) : {};
          } catch {
            localMap = {};
          }
          const existing = localMap?.[id] || {};

          // Shift end to preserve duration if it exists, otherwise leave undefined
          let nextStart = newStartMin;
          let nextEnd: number | undefined = undefined;
          if (typeof existing.start === 'number' && typeof existing.end === 'number') {
            const duration = Math.max(15, existing.end - existing.start);
            nextEnd = Math.max(nextStart + 15, Math.min(1440, nextStart + duration));
          } else if (typeof existing.end === 'number' && existing.start === undefined) {
            // If only end existed, attempt to preserve absolute end by shifting relative to newStart
            const duration = Math.max(15, existing.end - newStartMin);
            nextEnd = Math.max(nextStart + 15, Math.min(1440, newStartMin + duration));
          }

          // Persist locally
          try {
            localMap[id] = { start: nextStart, ...(nextEnd !== undefined ? { end: nextEnd } : {}) };
            localStorage.setItem(`respoint-duration-adjustments:${dateKey}`, JSON.stringify(localMap));
          } catch {}

          // Persist to DB
          try {
            await reservationAdjustmentsService.upsertAdjustment(dateKey, id, { start: nextStart, end: nextEnd });
          } catch {}

          // Notify listeners (TimelineOverlay / Seated timers)
          try { window.dispatchEvent(new CustomEvent('respoint-duration-adjustments-changed', { detail: { date: dateKey } })); } catch {}
        }
      } catch (syncErr) {
        console.warn('⚠️ Failed to sync overlay adjustments after time change', syncErr);
      }
    } catch (error) {
      console.error('❌ Failed to update reservation:', error);
      throw error;
    }
  }, [user?.id, reservations]);

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
