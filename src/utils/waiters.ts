import { supabase } from './supabaseClient';

export const WAITER_ASSIGNMENTS_KEY = 'respoint_waiter_assignments';

type AssignmentMap = Record<string, string[] | string>;

const readMap = (): AssignmentMap => {
  try {
    const raw = localStorage.getItem(WAITER_ASSIGNMENTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as AssignmentMap : {};
  } catch {
    return {};
  }
};

const writeMap = (map: AssignmentMap) => {
  try { localStorage.setItem(WAITER_ASSIGNMENTS_KEY, JSON.stringify(map)); } catch {}
};

const coerceToArray = (value: string[] | string | undefined): string[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

// Helper: get current user id
const getUserId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
};

export const getAssignedWaiters = (reservationId: string): string[] => {
  const map = readMap();
  return coerceToArray(map[reservationId]);
};

export const syncAssignedWaitersFromServer = async (reservationId: string) => {
  const userId = await getUserId();
  if (!userId) return;
  const { data, error } = await supabase
    .from('reservation_waiters')
    .select('waiter_name')
    .eq('user_id', userId)
    .eq('reservation_id', reservationId);
  if (error) return;
  // Normalize, deduplicate and persist
  const serverList = Array.from(new Set(
    ((data || []).map(r => (r as any).waiter_name) as (string | null | undefined)[])
      .filter(Boolean)
      .map(name => (name as string).trim())
      .filter(name => name.length > 0)
  ));
  const map = readMap();
  if (serverList.length === 0) {
    // Remove the key entirely to avoid stale chips on other devices
    if (reservationId in map) delete map[reservationId];
  } else {
    map[reservationId] = serverList;
  }
  writeMap(map);
};

// Sync all assignments for the current user, rebuilding the entire local cache.
export const syncAllAssignedWaitersFromServer = async (): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;
  const { data, error } = await supabase
    .from('reservation_waiters')
    .select('reservation_id,waiter_name')
    .eq('user_id', userId);
  if (error) return;
  const map: AssignmentMap = {};
  (data || []).forEach((row: any) => {
    const reservationId = String(row.reservation_id || '').trim();
    const name = String(row.waiter_name || '').trim();
    if (!reservationId) return;
    if (!map[reservationId]) map[reservationId] = [];
    if (name.length > 0) {
      const list = coerceToArray(map[reservationId]);
      if (!list.includes(name)) list.push(name);
      map[reservationId] = list;
    }
  });
  writeMap(map);
};

export const setAssignedWaiter = async (reservationId: string, waiterName: string) => {
  const trimmed = (waiterName || '').trim();
  if (!trimmed) return;
  const userId = await getUserId();
  // Update local cache immediately (optimistic)
  {
    const map = readMap();
    const list = Array.from(new Set([...
      coerceToArray(map[reservationId]),
      trimmed
    ] as string[]));
    map[reservationId] = list;
    writeMap(map);
    // Notify UI immediately
    try { window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId, name: trimmed } })); } catch {}
  }
  if (!userId) return;
  // Try to resolve waiter_id by name for more robust linking
  let waiterId: string | null = null;
  try {
    const { data: w } = await supabase
      .from('waiters')
      .select('id')
      .eq('user_id', userId)
      .eq('name', trimmed)
      .maybeSingle();
    waiterId = w?.id || null;
  } catch {}

  if (waiterId) {
    await supabase.from('reservation_waiters').upsert({
      user_id: userId,
      reservation_id: reservationId,
      waiter_id: waiterId,
      waiter_name: trimmed
    }, { onConflict: 'user_id,reservation_id,waiter_id' });
  } else {
    await supabase.from('reservation_waiters').upsert({
      user_id: userId,
      reservation_id: reservationId,
      waiter_id: null as any,
      waiter_name: trimmed
    }, { onConflict: 'user_id,reservation_id,waiter_name' });
  }
};

export const removeAssignedWaiter = async (reservationId: string, waiterName?: string) => {
  const userId = await getUserId();

  // Update local cache optimistically (even if we don't have the key yet)
  {
    const map = readMap();
    if (!waiterName) {
      if (reservationId in map) delete map[reservationId];
      writeMap(map);
    } else {
      const current = coerceToArray(map[reservationId]);
      const next = current.filter(n => n !== waiterName);
      if (next.length === 0) delete map[reservationId];
      else map[reservationId] = next;
      writeMap(map);
    }
    try { window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId, name: null } })); } catch {}
  }

  if (!userId) return;

  // Server-side deletion: prefer waiter_id if resolvable, then fall back to waiter_name or delete-all
  try {
    if (!waiterName) {
      await supabase
        .from('reservation_waiters')
        .delete()
        .eq('user_id', userId)
        .eq('reservation_id', reservationId);
    } else {
      // Try delete by waiter_id (more reliable)
      let deleted = false;
      try {
        const { data: w } = await supabase
          .from('waiters')
          .select('id')
          .eq('user_id', userId)
          .eq('name', waiterName)
          .maybeSingle();
        const waiterId = (w as any)?.id as string | undefined;
        if (waiterId) {
          const { error } = await supabase
            .from('reservation_waiters')
            .delete()
            .eq('user_id', userId)
            .eq('reservation_id', reservationId)
            .eq('waiter_id', waiterId);
          if (!error) deleted = true;
        }
      } catch {}

      if (!deleted) {
        // Fallback by waiter_name
        await supabase
          .from('reservation_waiters')
          .delete()
          .eq('user_id', userId)
          .eq('reservation_id', reservationId)
          .eq('waiter_name', waiterName);
      }
    }
  } finally {
    // Ensure local cache is aligned with server after delete
    try { await syncAssignedWaitersFromServer(reservationId); } catch {}
    try { window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId, name: null } })); } catch {}
  }
};


