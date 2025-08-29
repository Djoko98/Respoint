import { supabase } from '../utils/supabaseClient';
import { GuestbookEntry } from '../types/guestbook';

const STORAGE_KEY = 'respoint_guestbook_entries';

function readLocal(): GuestbookEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(entries: GuestbookEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

function generateId(): string {
  const rnd = Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}_${rnd}`;
}

export const guestbookService = {
  list: async (): Promise<GuestbookEntry[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        return readLocal();
      }
      const { data, error } = await supabase
        .from('guestbook_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const mapped: GuestbookEntry[] = (data || []).map(fromDbRow);
      // mirror to local for offline usage
      writeLocal(mapped);
      return mapped;
    } catch {
      return readLocal();
    }
  },

  create: async (partial: Omit<GuestbookEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<GuestbookEntry> => {
    const now = new Date().toISOString();
    const entry: GuestbookEntry = {
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      isVip: false,
      tags: [],
      ...partial
    } as GuestbookEntry;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const payload = toDbRow(entry, user.id);
        const { data, error } = await supabase
          .from('guestbook_entries')
          .insert(payload)
          .select('*')
          .single();
        if (!error && data) {
          const created = fromDbRow(data);
          const all = [created, ...readLocal().filter(e => e.id !== created.id)];
          writeLocal(all);
          return created;
        }
      }
    } catch {}
    const all = readLocal(); all.unshift(entry); writeLocal(all); return entry;
  },

  update: async (id: string, updates: Partial<GuestbookEntry>): Promise<GuestbookEntry | null> => {
    const all = readLocal();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const merged = { ...all[idx], ...updates, updatedAt: now } as GuestbookEntry;
    // optimistic local update
    all[idx] = merged; writeLocal(all);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const payload = toDbRow(merged, user.id);
        const { data, error } = await supabase
          .from('guestbook_entries')
          .upsert(payload, { onConflict: 'id' })
          .select('*')
          .single();
        if (!error && data) {
          const updated = fromDbRow(data);
          const all2 = readLocal();
          const i2 = all2.findIndex(e => e.id === id);
          if (i2 !== -1) { all2[i2] = updated; writeLocal(all2); }
          return updated;
        }
      }
    } catch {}
    return merged;
  },

  remove: async (id: string): Promise<void> => {
    const all = readLocal().filter(e => e.id !== id);
    writeLocal(all);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.from('guestbook_entries').delete().eq('user_id', user.id).eq('id', id);
      }
    } catch {}
  }
};


// Helpers to map DB <-> app
function fromDbRow(row: any): GuestbookEntry {
  return {
    id: row.id,
    name: row.name || '',
    phone: row.phone || '',
    email: row.email || '',
    avatarUrl: row.avatar_url || '',
    visitFrequency: row.visit_frequency || '',
    specialRelationNote: row.special_relation_note || '',
    preferredSeating: row.preferred_seating || '',
    favoriteDrinks: row.favorite_drinks || '',
    favoriteFoods: row.favorite_foods || '',
    averageBill: row.average_bill ?? undefined,
    notes: row.notes || '',
    lastVisitAt: row.last_visit_at || '',
    company: row.company || '',
    joinDate: row.join_date || '',
    source: row.source || '',
    isVip: !!row.is_vip,
    tags: Array.isArray(row.tags) ? row.tags : [],
    totalVisits: row.total_visits ?? 0,
    cancellations: row.cancellations ?? 0,
    noShows: row.no_shows ?? 0,
    totalReservations: row.total_reservations ?? 0,
    reservationsOnline: row.reservations_online ?? 0,
    moneySpent: row.money_spent ?? undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString()
  } as GuestbookEntry;
}

function toDbRow(entry: GuestbookEntry, userId: string) {
  return {
    id: entry.id,
    user_id: userId,
    name: entry.name || null,
    phone: entry.phone || null,
    email: entry.email || null,
    avatar_url: entry.avatarUrl || null,
    visit_frequency: entry.visitFrequency || null,
    special_relation_note: entry.specialRelationNote || null,
    preferred_seating: entry.preferredSeating || null,
    favorite_drinks: entry.favoriteDrinks || null,
    favorite_foods: entry.favoriteFoods || null,
    average_bill: typeof entry.averageBill === 'number' ? entry.averageBill : (entry.averageBill ? Number(entry.averageBill as any) : null),
    notes: entry.notes || null,
    last_visit_at: entry.lastVisitAt || null,
    company: entry.company || null,
    join_date: entry.joinDate || null,
    source: entry.source || null,
    is_vip: !!entry.isVip,
    tags: entry.tags || [],
    total_visits: entry.totalVisits ?? null,
    cancellations: entry.cancellations ?? null,
    no_shows: entry.noShows ?? null,
    total_reservations: entry.totalReservations ?? null,
    reservations_online: entry.reservationsOnline ?? null,
    money_spent: entry.moneySpent ?? null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt
  };
}
