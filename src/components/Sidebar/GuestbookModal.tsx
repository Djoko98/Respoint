import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { GuestbookEntry } from '../../types/guestbook';
import { guestbookService } from '../../services/guestbookService';
import { uploadGuestAvatar } from '../../services/storageService';
import { storageService } from '../../services/storageService';
import { supabase } from '../../utils/supabaseClient';
import { useLanguage } from '../../context/LanguageContext';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';
import { ThemeContext } from '../../context/ThemeContext';
import { LayoutContext } from '../../context/LayoutContext';
import CustomDatePicker from '../Statistics/CustomDatePicker';
import { ReservationContextExport as ReservationContext } from '../../context/ReservationContext';
import { ZoneContext } from '../../context/ZoneContext';
import { formatZoneName, formatTableNames } from '../../utils/tableHelper';

interface GuestbookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuestForm = Omit<GuestbookEntry, 'id' | 'createdAt' | 'updatedAt'> & {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  twitter?: string;
  website?: string;
  birthDate?: string;
  location?: string;
  favoriteWine?: string;
  foodRequests?: string;
  drinkRequests?: string;
};

const emptyForm: GuestForm = {
  name: '',
  phone: '',
  email: '',
  avatarUrl: '',
  visitFrequency: '',
  specialRelationNote: '',
  preferredSeating: '',
  favoriteDrinks: '',
  favoriteFoods: '',
  allergens: '',
  // Social links kept in form; persisted via tags with prefixes
  instagram: '',
  facebook: '',
  tiktok: '',
  twitter: '',
  website: '',
  birthDate: '',
  location: '',
  favoriteWine: '',
  foodRequests: '',
  drinkRequests: '',
  averageBill: undefined as any,
  notes: '',
  lastVisitAt: ''
};

const PREFILL_KEY = 'respoint_reservation_prefill';

const GuestbookModal: React.FC<GuestbookModalProps> = ({ isOpen, onClose }) => {
  const { currentLanguage } = useLanguage();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [isEdit, setIsEdit] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  // Loyalty tags (Special tab)
  const [newLoyaltyTag, setNewLoyaltyTag] = useState('');
  const [isAddingLoyaltyTag, setIsAddingLoyaltyTag] = useState(false);
  const loyaltyTagInputRef = useRef<HTMLInputElement | null>(null);
  // Tags edited locally during Edit mode (both common and loyalty)
  const [editTags, setEditTags] = useState<string[]>([]);
  const [avatarError, setAvatarError] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string>('');
  const [avatarLocalVersion, setAvatarLocalVersion] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preferredTagInput, setPreferredTagInput] = useState('');
  const [preferredTagsState, setPreferredTagsState] = useState<string[]>([]);
  const preferredInputRef = useRef<HTMLInputElement | null>(null);
  // Allergens as tags (edited via form, saved on Save)
  const [allergenTagInput, setAllergenTagInput] = useState('');
  const [allergenTagsState, setAllergenTagsState] = useState<string[]>([]);
  const allergenInputRef = useRef<HTMLInputElement | null>(null);
  // Birth date manual inputs (DD MM YYYY)
  const [birthDay, setBirthDay] = useState<string>('');
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');
  // Location dropdown (global geocoding)
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ name: string; country?: string; admin1?: string }>>([]);
  const locationDropdownRef = useRef<HTMLDivElement | null>(null);
  const locationAbortRef = useRef<AbortController | null>(null);
  const locationDebounceRef = useRef<number | null>(null);
  // Confirmation modal (remove/reset)
  const [confirmModal, setConfirmModal] = useState<null | { type: 'remove' | 'reset' }>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [upcomingVisitsCount, setUpcomingVisitsCount] = useState<number | null>(null);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingList, setUpcomingList] = useState<any[]>([]);

  const { theme } = React.useContext(ThemeContext);
  const isLight = theme === 'light';
  const { zoneLayouts, savedLayouts, layout } = useContext(LayoutContext);
  const { zones } = useContext(ZoneContext);
  const { reservations } = useContext(ReservationContext);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'general' | 'special' | 'food' | 'seating'>('general');

  // Sorting (left panel)
  type SortMode = 'name' | 'phone' | 'loyalty' | 'visits';
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortBtnRef = useRef<HTMLButtonElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!showSortMenu) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node | null;
      const insideButton = !!(sortBtnRef.current && sortBtnRef.current.contains(t as Node));
      const insideMenu = !!(sortMenuRef.current && sortMenuRef.current.contains(t as Node));
      if (!insideButton && !insideMenu) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showSortMenu]);

  const normalizeUrl = (url?: string) => {
    const u = (url || '').trim();
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
    return `https://${u}`;
  };
  const formatDateDisplay = (s?: string) => {
    try {
      if (!s) return '-';
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('en-GB');
    } catch { return '-'; }
  };

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const list = await guestbookService.list();
      setEntries(list);
    })();
  }, [isOpen]);

  // On open, try to auto-select guest by id stored in localStorage
  useEffect(() => {
    if (!isOpen) return;
    if (selectedId) return; // keep user selection
    try {
      const id = localStorage.getItem('respoint_selected_guestbook_id');
      if (id && entries.some(e => e.id === id)) {
        setSelectedId(id);
      }
    } catch {}
  }, [isOpen, entries, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setForm(emptyForm);
      setEditTags([]);
      return;
    }
    const current = entries.find(e => e.id === selectedId);
    if (current) {
      setForm({
        name: current.name || '',
        phone: current.phone || '',
        email: current.email || '',
        avatarUrl: current.avatarUrl || '',
        visitFrequency: current.visitFrequency || '',
        specialRelationNote: current.specialRelationNote || '',
        preferredSeating: current.preferredSeating || '',
        favoriteDrinks: current.favoriteDrinks || '',
        favoriteFoods: current.favoriteFoods || '',
        allergens: current.allergens || '',
        instagram: current.instagram || '',
        facebook: current.facebook || '',
        tiktok: current.tiktok || '',
        twitter: current.twitter || '',
        website: current.website || '',
        birthDate: current.birthDate as any,
        location: current.location as any,
        favoriteWine: current.favoriteWine as any,
        foodRequests: current.foodRequests as any,
        drinkRequests: current.drinkRequests as any,
        averageBill: current.averageBill as any,
        notes: current.notes || '',
        lastVisitAt: current.lastVisitAt || ''
      });
      setEditTags(Array.isArray(current.tags) ? current.tags : []);
    }
  }, [selectedId]);

  // When entries refresh in the background (e.g., adding loyalty tag), avoid clobbering unsaved edits.
  useEffect(() => {
    if (!selectedId || isEdit) return;
    const current = entries.find(e => e.id === selectedId);
    if (!current) return;
    setForm(prev => {
      // If we are not editing, sync latest values
      return {
        name: current.name || '',
        phone: current.phone || '',
        email: current.email || '',
        avatarUrl: current.avatarUrl || '',
        visitFrequency: current.visitFrequency || '',
        specialRelationNote: current.specialRelationNote || '',
        preferredSeating: current.preferredSeating || '',
        favoriteDrinks: current.favoriteDrinks || '',
        favoriteFoods: current.favoriteFoods || '',
        allergens: current.allergens || '',
        instagram: current.instagram || '',
        facebook: current.facebook || '',
        tiktok: current.tiktok || '',
        twitter: current.twitter || '',
        website: current.website || '',
        birthDate: current.birthDate as any,
        location: current.location as any,
        favoriteWine: current.favoriteWine as any,
        foodRequests: current.foodRequests as any,
        drinkRequests: current.drinkRequests as any,
        averageBill: current.averageBill as any,
        notes: current.notes || '',
        lastVisitAt: current.lastVisitAt || ''
      } as any;
    });
    setEditTags(Array.isArray(current.tags) ? current.tags : []);
  }, [entries, selectedId, isEdit]);

  // Reset avatar error whenever the preview URL changes (form or saved)
  useEffect(() => {
    setAvatarError(false);
  }, [form.avatarUrl, selectedId]);

  const handleAdd = async () => {
    setIsSaving(true);
    const created = await guestbookService.create({ ...emptyForm, name: 'New Guest' });
    setEntries(prev => [created, ...prev]);
    setSelectedId(created.id);
    setIsSaving(false);
    setIsEdit(true);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setIsSaving(true);

    let finalAvatarUrl: string | undefined = undefined;
    try {
      // If there is a pending local avatar file, upload it now and set avatarUrl
      if (pendingAvatarFile && selected) {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || 'local';
        const url = await uploadGuestAvatar(userId, selected.id, pendingAvatarFile);
        if (url) {
          finalAvatarUrl = url;
        }
      } else if (form.avatarUrl === '') {
        // If cleared in form, set empty avatar
        finalAvatarUrl = '';
        // Optionally delete existing from storage if ours
        if (selected?.avatarUrl && selected.avatarUrl.includes('/guest-avatars/')) {
          try { await storageService.deleteGuestAvatar(selected.avatarUrl); } catch {}
        }
      } // else keep existing avatar (no change)
    } catch {}

    const payload = {
      ...form,
      preferredSeating: preferredTags.join(','),
      averageBill: form.averageBill ? Number(form.averageBill) : undefined,
      tags: editTags,
      ...(finalAvatarUrl !== undefined ? { avatarUrl: finalAvatarUrl } : {})
    };

    const updated = await guestbookService.update(selectedId, payload);
    if (updated) {
      setEntries(prev => prev.map(e => (e.id === updated.id ? updated : e)));
    }

    // Clear pending avatar state after save
    if (pendingAvatarPreview) { try { URL.revokeObjectURL(pendingAvatarPreview); } catch {} }
    setPendingAvatarPreview('');
    setPendingAvatarFile(null);
    setAvatarLocalVersion(Date.now());

    setIsSaving(false);
    setIsEdit(false);
  };

  const handleCancel = () => {
    if (!selected) { setIsEdit(false); return; }
    // Revert form to selected values, keep name as is
    setForm({
      ...selectedComparable,
      name: form.name // preserve current name per requirement elsewhere we keep name on reset/cancel
    } as any);
    setPreferredTagsState(parsePreferredTags(selectedComparable.preferredSeating));
    setAllergenTagsState(parseAllergenTags(selectedComparable.allergens));
    setEditTags(Array.isArray(selected.tags) ? selected.tags : []);
    setIsAddingTag(false);
    setIsAddingLoyaltyTag(false);
    setNewTag('');
    setNewLoyaltyTag('');
    // Discard any pending avatar
    if (pendingAvatarPreview) { try { URL.revokeObjectURL(pendingAvatarPreview); } catch {} }
    setPendingAvatarPreview('');
    setPendingAvatarFile(null);
    setIsEdit(false);
  };

  const handleResetAll = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    const keepName = form.name;
    const cleared = {
      name: keepName,
      phone: '',
      email: '',
      avatarUrl: '',
      visitFrequency: '',
      specialRelationNote: '',
      preferredSeating: '',
      favoriteDrinks: '',
      favoriteFoods: '',
      allergens: '',
      tags: [] as string[],
      instagram: '',
      facebook: '',
      tiktok: '',
      twitter: '',
      website: '',
      birthDate: '' as any,
      location: '',
      favoriteWine: '',
      foodRequests: '',
      drinkRequests: '',
      averageBill: undefined as any,
      notes: '',
      lastVisitAt: '',
      // statistics
      totalVisits: 0,
      cancellations: 0,
      noShows: 0,
      totalReservations: 0,
      reservationsOnline: 0,
      moneySpent: undefined as any
    };
    const updated = await guestbookService.update(selectedId, cleared as any);
    if (updated) {
      setEntries(prev => prev.map(e => (e.id === updated.id ? updated : e)));
      setForm(cleared as any);
      setPreferredTagsState([]);
      setAllergenTagsState([]);
      setEditTags([]);
      // also clear cached statistics persisted locally
      try {
        const rawStats = localStorage.getItem('respoint_guest_stats');
        const statsMap: Record<string, any> = rawStats ? JSON.parse(rawStats) : {};
        delete statsMap[selectedId];
        localStorage.setItem('respoint_guest_stats', JSON.stringify(statsMap));
      } catch {}
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    await guestbookService.remove(selectedId);
    setEntries(prev => prev.filter(e => e.id !== selectedId));
    setSelectedId(null);
    setForm(emptyForm);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(e => (e.name || '').toLowerCase().includes(q) || (e.phone || '').includes(q));
  }, [entries, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortMode === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    } else if (sortMode === 'phone') {
      const norm = (p?: string) => (p || '').replace(/\D+/g, '');
      list.sort((a, b) => {
        const aHas = !!norm(a.phone);
        const bHas = !!norm(b.phone);
        // Prvo gosti sa popunjenim brojem, zatim bez broja
        if (aHas !== bHas) return aHas ? -1 : 1;
        return norm(a.phone).localeCompare(norm(b.phone));
      });
    } else if (sortMode === 'loyalty') {
      list.sort((a, b) => {
        const ai = a.isVip ? 1 : 0;
        const bi = b.isVip ? 1 : 0;
        if (ai !== bi) return bi - ai; // VIP first
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      });
    } else if (sortMode === 'visits') {
      list.sort((a, b) => {
        const av = typeof a.totalVisits === 'number' ? a.totalVisits : 0;
        const bv = typeof b.totalVisits === 'number' ? b.totalVisits : 0;
        if (av !== bv) return bv - av; // more visits first
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      });
    }
    return list;
  }, [filtered, sortMode]);

  const selected = useMemo(() => entries.find(e => e.id === selectedId) || null, [entries, selectedId]);

  const avatarPreviewUrl = useMemo(() => {
    // During edit, prefer local pending preview if present
    if (isEdit && pendingAvatarPreview) return pendingAvatarPreview;
    // If user removed avatar in edit mode (and no pending preview), show no image
    if (isEdit && form.avatarUrl === '' && !pendingAvatarPreview) return '';
    const base = (isEdit ? form.avatarUrl : selected?.avatarUrl) || selected?.avatarUrl || '';
    const url = normalizeUrl(base);
    if (!url) return '';
    // Use DB updatedAt when available (server truth). Fall back to local version bump after uploads/removals.
    let v = 0;
    try { v = selected?.updatedAt ? new Date(selected.updatedAt).getTime() : 0; } catch { v = 0; }
    if (!v && avatarLocalVersion) v = avatarLocalVersion;
    return v ? `${url}${url.includes('?') ? '&' : '?'}v=${v}` : url;
  }, [isEdit, form.avatarUrl, selected?.avatarUrl, selected?.updatedAt, avatarLocalVersion, pendingAvatarPreview]);

  // Revoke old object URL when preview changes
  useEffect(() => {
    return () => { try { if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview); } catch {} };
  }, [pendingAvatarPreview]);

  // Valid table numbers across all zones (by numeric table.number or numeric name)
  const validTableNumbers = useMemo(() => {
    const set = new Set<string>();
    try {
      const sources: any[] = [];
      // Default layouts per zone (if present)
      if (zoneLayouts && Object.keys(zoneLayouts).length > 0) {
        sources.push(...Object.values(zoneLayouts));
      }
      // Fallback: current layout in context (current zone)
      if (layout && (layout as any).tables) {
        sources.push(layout);
      }
      // Fallback: any default saved layouts (or first if no default)
      if (savedLayouts && typeof savedLayouts === 'object') {
        for (const zoneId of Object.keys(savedLayouts)) {
          const arr = (savedLayouts as any)[zoneId] || [];
          const def = arr.find((x: any) => x?.is_default) || arr[0];
          if (def?.layout) sources.push(def.layout);
        }
      }
      const tables = sources.flatMap((l: any) => (l?.tables || []));
      for (const t of tables) {
        if (typeof t?.number === 'number' && !Number.isNaN(t.number)) set.add(String(t.number));
        const nameStr = t?.name != null ? String(t.name) : '';
        if (nameStr && /^\d+$/.test(nameStr)) set.add(nameStr);
      }
    } catch {}
    return set;
  }, [zoneLayouts, savedLayouts, layout]);

  // Build a comparable snapshot from the selected entry using the same shape as form
  const selectedComparable = useMemo(() => {
    if (!selected) return emptyForm;
    return {
      name: selected.name || '',
      phone: selected.phone || '',
      email: selected.email || '',
      avatarUrl: selected.avatarUrl || '',
      visitFrequency: selected.visitFrequency || '',
      specialRelationNote: selected.specialRelationNote || '',
      preferredSeating: selected.preferredSeating || '',
      favoriteDrinks: selected.favoriteDrinks || '',
      favoriteFoods: selected.favoriteFoods || '',
      allergens: selected.allergens || '',
      instagram: selected.instagram as any,
      facebook: selected.facebook as any,
      tiktok: selected.tiktok as any,
      twitter: selected.twitter as any,
      website: selected.website as any,
      birthDate: selected.birthDate as any,
      location: selected.location as any,
      favoriteWine: selected.favoriteWine as any,
      foodRequests: selected.foodRequests as any,
      drinkRequests: selected.drinkRequests as any,
      averageBill: selected.averageBill as any,
      notes: selected.notes || '',
      // Store only the date portion for stable comparison
      lastVisitAt: selected.lastVisitAt ? selected.lastVisitAt.slice(0, 10) : ''
    };
  }, [selected]);

  const parsePreferredTags = (value?: string | null): string[] => {
    const tokens = String(value || '')
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s));
    const seen = new Set<string>();
    const next: string[] = [];
    for (const t of tokens) {
      if (!seen.has(t)) {
        seen.add(t);
        next.push(t);
      }
    }
    return next;
  };

  // Parse allergen tags (free text, comma/space separated)
  const parseAllergenTags = (value?: string | null): string[] => {
    const tokens = String(value || '')
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const seen = new Set<string>();
    const next: string[] = [];
    for (const t of tokens) {
      const key = t.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        next.push(t);
      }
    }
    return next;
  };

  const arraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((value, idx) => value === b[idx]);

  // Initialize preferred tags ONLY when switching to a different selected guest
  useEffect(() => {
    if (!selectedId) {
      setPreferredTagsState([]);
      setAllergenTagsState([]);
      return;
    }
    const currentEntry = entries.find((e) => e.id === selectedId);
    if (!currentEntry) return;
    const parsed = parsePreferredTags(currentEntry.preferredSeating);
    setPreferredTagsState(parsed);
    const parsedAllergens = parseAllergenTags(currentEntry.allergens);
    setAllergenTagsState(parsedAllergens);
  }, [selectedId]); 

  // Load upcoming reservations count for the selected guest
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selected) { setUpcomingVisitsCount(null); return; }
      try {
        const count = await guestbookService.countUpcomingVisits(selected.name, selected.phone);
        if (!cancelled) setUpcomingVisitsCount(typeof count === 'number' ? count : 0);
      } catch {
        if (!cancelled) setUpcomingVisitsCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, [selected?.id, selected?.name, selected?.phone]);

  // Reset dropdown state when switching guest
  useEffect(() => {
    setUpcomingOpen(false);
    setUpcomingLoading(false);
    setUpcomingList([]);
  }, [selected?.id]);

  const loadUpcoming = async () => {
    if (!selected) return;
    setUpcomingLoading(true);
    try {
      const list = await guestbookService.listUpcomingVisits(selected.name, selected.phone);
      setUpcomingList(Array.isArray(list) ? list : []);
    } catch {
      setUpcomingList([]);
    } finally {
      setUpcomingLoading(false);
    }
  };

  // Determine if the current form differs from the selected entry
  const isDirty = useMemo(() => {
    if (!selected) return false;

    const formPreferred = (preferredTagsState || []).join(',');
    const selectedPreferred = parsePreferredTags(selectedComparable.preferredSeating).join(',');
    const currentTags = editTags || [];
    const originalTags = Array.isArray(selected.tags) ? selected.tags : [];

    const normalizeA = (f: typeof emptyForm) => ({
      ...f,
      averageBill:
        f.averageBill === undefined || f.averageBill === null || (f as any).averageBill === ''
          ? undefined
          : Number(f.averageBill),
      lastVisitAt: f.lastVisitAt ? f.lastVisitAt.slice(0, 10) : '',
      preferredSeating: formPreferred
    });

    const normalizeB = (f: typeof emptyForm) => ({
      ...f,
      averageBill:
        f.averageBill === undefined || f.averageBill === null || (f as any).averageBill === ''
          ? undefined
          : Number(f.averageBill),
      lastVisitAt: f.lastVisitAt ? f.lastVisitAt.slice(0, 10) : '',
      preferredSeating: selectedPreferred
    });

    const a = normalizeA(form);
    const b = normalizeB(selectedComparable);
    const basicDirty = JSON.stringify(a) !== JSON.stringify(b);
    const tagsDirty = !arraysEqual(currentTags, originalTags);
    // Consider avatar staged changes: new file pending or removed (form.avatarUrl === '' while selected had one)
    const avatarDirty =
      !!pendingAvatarFile ||
      (form.avatarUrl === '' && !!(selectedComparable as any).avatarUrl);
    return basicDirty || tagsDirty || avatarDirty;
  }, [form, selectedComparable, selected, preferredTagsState, editTags, pendingAvatarFile]);

  // Preferred seating tags helpers (stateful so clicks outside don't reset)
  const preferredTags = preferredTagsState;
  const allergenTags = allergenTagsState;

  const commitPreferredTags = (tags: string[]) => {
    const next = tags.filter(t => /^\d+$/.test(t));
    setPreferredTagsState(next);
    const joined = next.join(',');
    setForm((prev) =>
      prev.preferredSeating === joined ? prev : { ...prev, preferredSeating: joined }
    );
  };

  const addPreferredTag = (value: string) => {
    const v = value.trim();
    if (!/^\d+$/.test(v)) return;
    if (!validTableNumbers.has(v)) return;
    if (preferredTags.includes(v)) return;
    commitPreferredTags([...preferredTags, v]);
    setPreferredTagInput('');
  };

  const removePreferredTag = (v: string) => {
    commitPreferredTags(preferredTags.filter(t => t !== v));
  };

  // Commit preferred input value if valid
  const commitPreferredInputIfValid = () => {
    const value = (preferredTagInput || '').trim();
    if (!value) return;
    if (/^\d+$/.test(value)) {
      addPreferredTag(value);
    }
    setPreferredTagInput('');
  };

  const commitAllergenTags = (tags: string[]) => {
    const next = tags
      .map(t => t.trim())
      .filter(t => t.length > 0);
    setAllergenTagsState(next);
    const joined = next.join(', ');
    setForm((prev) =>
      prev.allergens === joined ? prev : { ...prev, allergens: joined }
    );
  };

  const addAllergenTag = (value: string) => {
    const v = value.trim();
    if (!v) return;
    if (allergenTags.some(t => t.toLowerCase() === v.toLowerCase())) return;
    commitAllergenTags([...allergenTags, v]);
    setAllergenTagInput('');
  };

  const removeAllergenTag = (v: string) => {
    commitAllergenTags(allergenTags.filter(t => t !== v));
  };

  // Sync birth date parts from form when selection changes
  useEffect(() => {
    const s = (form as any).birthDate as string | undefined;
    try {
      const d = s ? new Date(s) : null;
      if (d && !Number.isNaN(d.getTime())) {
        setBirthDay(String(d.getDate()).padStart(2, '0'));
        setBirthMonth(String(d.getMonth() + 1).padStart(2, '0'));
        setBirthYear(String(d.getFullYear()));
      } else {
        setBirthDay('');
        setBirthMonth('');
        setBirthYear('');
      }
    } catch {
      setBirthDay('');
      setBirthMonth('');
      setBirthYear('');
    }
  }, [selectedId, (form as any).birthDate]);

  const tryUpdateBirthDate = (dStr: string, mStr: string, yStr: string) => {
    const d = Number(dStr), m = Number(mStr), y = Number(yStr);
    if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return;
    if (d <= 0 || m <= 0 || y <= 0) return;
    if (m > 12 || d > 31) return;
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return;
    // guard for overflow (e.g., 31.02.)
    if (dt.getFullYear() !== y || (dt.getMonth() + 1) !== m || dt.getDate() !== d) return;
    const iso = dt.toISOString().slice(0, 10);
    setForm(prev => ({ ...prev, birthDate: iso } as any));
  };

  // Fetch global location suggestions as user types (Open‑Meteo Geocoding API)
  useEffect(() => {
    if (!isEdit) { setLocationDropdownOpen(false); return; }
    const q = String((form as any).location || '').trim();
    if (locationDebounceRef.current) {
      window.clearTimeout(locationDebounceRef.current);
    }
    if (q.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    locationDebounceRef.current = window.setTimeout(async () => {
      try {
        locationAbortRef.current?.abort();
        const ctrl = new AbortController();
        locationAbortRef.current = ctrl;
        const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en`, { signal: ctrl.signal });
        const data = await resp.json();
        const list = Array.isArray(data?.results)
          ? data.results.map((r: any) => ({ name: r.name, country: r.country, admin1: r.admin1 }))
          : [];
        setLocationSuggestions(list);
        setLocationDropdownOpen(true);
      } catch {
        // ignore
      }
    }, 300);
    return () => {
      if (locationDebounceRef.current) window.clearTimeout(locationDebounceRef.current);
    };
  }, [isEdit, (form as any).location]);

  // Close on outside click
  useEffect(() => {
    if (!locationDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [locationDropdownOpen]);

  const panelContainerClass = isLight ? 'flex h-full w-full min-w-0 bg-white text-[#0f172a]' : 'flex h-full w-full min-w-0 bg-[#000814] text-white';
  const leftPanelClass = isLight ? 'w-72 flex-shrink-0 border-r border-gray-200 p-3 mr-4 flex flex-col bg-white' : 'w-72 flex-shrink-0 border-r border-[#1E2A34] p-3 mr-4 flex flex-col bg-[#000814]';
  const headerTextClass = isLight ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm';
  const addBtnClass = isLight ? 'px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50' : 'px-2 py-1 text-xs rounded border border-gray-700 text-gray-200 hover:bg-white/10 disabled:opacity-50';
  const searchInputClass = isLight ? 'w-full pl-8 pr-3 py-2 text-sm rounded bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400' : 'w-full pl-8 pr-3 py-2 text-sm rounded bg-[#0A1929] border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600';
  const rightPanelClass = isLight ? 'flex-1 min-w-0 p-0 overflow-y-auto custom-scrollbar bg-white' : 'flex-1 min-w-0 p-0 overflow-y-auto custom-scrollbar bg-[#000814]';
  const bigAvatarClass = isLight ? 'w-20 h-20 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center text-gray-700' : 'w-20 h-20 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center';
  const nameClass = isLight ? 'text-2xl text-gray-900 font-medium truncate' : 'text-2xl text-white font-medium truncate';
  const vipBtnClass = isLight ? `p-1 rounded ${selected?.isVip ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'}` : `p-1 rounded ${selected?.isVip ? 'text-yellow-500' : 'text-gray-500 hover:text-gray-300'}`;
  const actionBtnClass = isLight ? 'px-2 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100' : 'px-2 py-1.5 text-xs rounded border border-gray-700 text-gray-200 hover:bg-white/10';
  const statsBorderClass = isLight ? 'border-t border-gray-200 pt-3' : 'border-t border-gray-800 pt-3';
  const statsTitleClass = isLight ? 'text-gray-500 text-sm mb-2' : 'text-gray-400 text-sm mb-2';
  const statsGridText = isLight ? 'text-sm text-gray-700' : 'text-sm text-gray-300';
  const rightSideTabClass = isLight
    ? 'w-72 flex-shrink-0 p-3 border-l border-r border-gray-200 bg-white overflow-y-auto statistics-scrollbar stable-scrollbar'
    : 'w-72 flex-shrink-0 p-3 border-l border-r border-gray-800 bg-[#0A1929] overflow-y-auto statistics-scrollbar stable-scrollbar';
  const sideActionBtnFullClass = isLight
    ? 'w-full px-3 py-2 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100'
    : 'w-full px-3 py-2 text-xs rounded border border-gray-700 text-gray-200 hover:bg-white/10';
  const sideDangerBtnFullClass = 'w-full px-3 py-2 text-xs rounded text-red-400 hover:bg-red-500/10 transition-colors';
  const tagChipClass = isLight ? 'px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs flex items-center gap-1' : 'px-2 py-0.5 rounded-full bg-white/10 text-gray-200 text-xs flex items-center gap-1';
  const tagRemoveClass = isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-white';
  const tagAddBtnClass = isLight ? 'px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100' : 'px-2 py-1 text-xs rounded-full border border-gray-700 text-gray-200 hover:bg-white/10';
  const tagInputClass = isLight ? 'px-3 py-1 text-xs rounded-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400' : 'px-3 py-1 text-xs rounded-full bg-[#0A1929] border border-gray-800 text-white placeholder-gray-500';
  const inputClass = isLight ? 'px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400' : 'px-3 py-2 rounded bg-[#0A1929] border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600';
  const readonlyTextClass = isLight ? 'py-2 text-sm text-gray-800' : 'py-2 text-sm text-gray-200';
  // Align action buttons styling with Reservation form modal
  const dangerBtnClass = 'px-3 py-1.5 text-sm rounded text-red-400 hover:bg-red-500/10 transition-colors';
  const footerBtnClass = 'px-3 py-1.5 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors';
  const saveBtnClass = 'px-4 py-1.5 text-blue-400 text-sm rounded hover:bg-blue-500/10 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed';

  // Derived stats from reservations for currently selected guest
  const { weeklyVisitsAvg, averageSeatsPerReservation } = useMemo(() => {
    if (!selected) return { weeklyVisitsAvg: null as number | null, averageSeatsPerReservation: null as number | null };
    const normalizePhone = (p?: string) => (p || '').replace(/\D+/g, '');
    const normalizeText = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // 1) Prefer cached stats (persist after clearing/deleting)
    try {
      const rawStats = localStorage.getItem('respoint_guest_stats');
      const statsMap: Record<string, { weekly: number; avgSeats: number }> = rawStats ? JSON.parse(rawStats) : {};
      const cached = statsMap[selected.id];
      if (cached && typeof cached.weekly === 'number' && typeof cached.avgSeats === 'number') {
        return { weeklyVisitsAvg: cached.weekly, averageSeatsPerReservation: cached.avgSeats };
      }
    } catch {}
    let map: Record<string, string> = {};
    try {
      const raw = localStorage.getItem('respoint_res_to_guestbook');
      map = raw ? JSON.parse(raw) : {};
    } catch { map = {}; }
    const sameGuest = (reservations || []).filter((r: any) => {
      if (!r) return false;
      if (map[r.id] === selected.id) return true;
      const p1 = normalizePhone(r.phone);
      const p2 = normalizePhone(selected.phone);
      if (p1 && p2 && p1 === p2 && p2.length >= 5) return true;
      if (normalizeText(r.guestName || '') === normalizeText(selected.name || '')) return true;
      return false;
    });
    const arrived = sameGuest.filter((r: any) => r?.status === 'arrived');
    // Weekly average
    let weekly: number | null = null;
    if (arrived.length > 0) {
      const times = arrived
        .map((r: any) => new Date((r.date || '').slice(0, 10)).getTime())
        .filter((t: number) => !Number.isNaN(t))
        .sort((a: number, b: number) => a - b);
      if (times.length > 0) {
        const first = times[0];
        const last = times[times.length - 1];
        const diffDays = Math.max(0, Math.round((last - first) / (1000 * 60 * 60 * 24)));
        const weeks = Math.max(1, diffDays / 7 || 1);
        weekly = arrived.length / weeks;
      }
    }
    // Average seats per reservation (arrived)
    let avgSeats: number | null = null;
    if (arrived.length > 0) {
      const sum = arrived.reduce((acc: number, r: any) => acc + (Number(r.numberOfGuests) || 0), 0);
      avgSeats = sum / arrived.length;
    }
    // 3) Fallback to stored guestbook visitFrequency text when no derived value
    if (weekly == null) {
      const match = String(selected.visitFrequency || '').match(/[\d,.]+/);
      if (match) {
        const n = parseFloat(match[0].replace(',', '.'));
        if (!Number.isNaN(n)) weekly = n;
      }
    }
    return { weeklyVisitsAvg: weekly, averageSeatsPerReservation: avgSeats };
  }, [reservations, selected]);
  
  if (!isOpen) return null;

  const portalTarget = document.getElementById('app-zoom-root') || document.body;

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-sm backdrop-brightness-75 z-[13000] flex items-stretch justify-center p-0">
      <div className="bg-[#000814] w-full h-full max-w-none max-h-none rounded-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-xl font-light text-white tracking-wide">
            {currentLanguage === 'srb' ? 'Knjiga gostiju' : 'Guestbook'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
            aria-label="Close guestbook"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden pb-6">
          <div className={panelContainerClass}>
        {/* Left list */}
        <div className={leftPanelClass}>
          <div className="flex items-center justify-between mb-2">
            <div className={`flex items-center gap-2 ${headerTextClass} relative`}>
              <button
                ref={sortBtnRef}
                onClick={() => setShowSortMenu((v) => !v)}
                className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}
                title={currentLanguage === 'srb' ? 'Sortiraj' : 'Sort'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 4h18M3 10h18M3 16h18"/></svg>
              </button>
              <span>{currentLanguage === 'srb' ? 'Gosti' : 'Guests'}</span>
              {showSortMenu && (
                <div ref={sortMenuRef} className={`absolute left-0 top-full mt-1 w-44 rounded-lg border ${isLight ? 'border-gray-200 bg-white' : 'border-gray-800 bg-[#050B16]'} z-20`}>
                  <div className={isLight ? 'px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200' : 'px-3 py-2 text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-800'}>
                    {currentLanguage === 'srb' ? 'Sortiraj po' : 'Sort by'}
                  </div>
                  <div className="py-1">
                    <button
                      className={`w-full text-left px-3 py-2 text-sm ${isLight ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-white/5 text-gray-200'}`}
                      onClick={() => { setSortMode('name'); setShowSortMenu(false); }}
                    >
                      {currentLanguage === 'srb' ? 'Imenu' : 'Name'}
                    </button>
                    <button
                      className={`w-full text-left px-3 py-2 text-sm ${isLight ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-white/5 text-gray-200'}`}
                      onClick={() => { setSortMode('phone'); setShowSortMenu(false); }}
                    >
                      {currentLanguage === 'srb' ? 'Telefonu' : 'Phone'}
                    </button>
                    <button
                      className={`w-full text-left px-3 py-2 text-sm ${isLight ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-white/5 text-gray-200'}`}
                      onClick={() => { setSortMode('loyalty'); setShowSortMenu(false); }}
                    >
                      {currentLanguage === 'srb' ? 'Loyalty' : 'Loyalty'}
                    </button>
                    <button
                      className={`w-full text-left px-3 py-2 text-sm ${isLight ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-white/5 text-gray-200'}`}
                      onClick={() => { setSortMode('visits'); setShowSortMenu(false); }}
                    >
                      {currentLanguage === 'srb' ? 'Ukupno poseta' : 'Total visits'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleAdd}
              disabled={isSaving}
              className={addBtnClass}
            >
              {currentLanguage === 'srb' ? '+ Dodaj' : '+ Add'}
            </button>
          </div>
          <div className="mb-2">
            <div className="relative">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={currentLanguage === 'srb' ? 'Pretraga po imenu ili telefonu' : 'Search by name or phone'} className={searchInputClass}/>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
            {sorted.map(e => {
              const itemClass = isLight
                ? (selectedId === e.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50')
                : (selectedId === e.id ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5');
              return (
                <button
                  key={e.id}
                  onClick={() => { setSelectedId(e.id); setIsEdit(false); }}
                  className={`w-full text-left px-2 py-2 rounded text-sm flex items-center gap-2 ${itemClass}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${isLight ? 'bg-gray-300 text-gray-700' : 'bg-gray-700'}`}>
                    {(() => {
                      // Left panel should show only persisted state (no pending upload/remove)
                      const base = normalizeUrl(e.avatarUrl);
                      if (!base) {
                        return <span className="text-xs">{(e.name|| (currentLanguage === 'srb' ? 'Bez imena' : 'Unnamed')).slice(0,1)}</span>;
                      }
                      let v = 0;
                      try { v = e.updatedAt ? new Date(e.updatedAt).getTime() : 0; } catch { v = 0; }
                      const src = v ? `${base}${base.includes('?') ? '&' : '?'}v=${v}` : base;
                      return <img src={src} alt="avatar" className="w-full h-full object-cover"/>;
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <div className="truncate">{e.name || (currentLanguage === 'srb' ? 'Bez imena' : 'Unnamed')}</div>
                      {e.isVip && <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500"><path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/></svg>}
                    </div>
                    {e.phone && <div className="text-xs text-gray-500 truncate">{e.phone}</div>}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && entries.length === 0 && (
              <div className="text-gray-500 text-xs px-2 py-4">{currentLanguage === 'srb' ? 'Još uvek nema gostiju.' : 'No guests yet.'}</div>
            )}
            {filtered.length === 0 && entries.length > 0 && (
              <div className="text-gray-500 text-xs px-2 py-4">{currentLanguage === 'srb' ? 'Nema pronađenih gostiju.' : 'No guests found.'}</div>
            )}
          </div>
        </div>

        {/* Right detail */}
        <div className={rightPanelClass}>
          {!selected ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">{currentLanguage === 'srb' ? 'Izaberite gosta da biste videli i uredili detalje.' : 'Select a guest to view and edit details.'}</div>
          ) : (
            <div className="px-6 py-4">
              <div className="flex min-w-0">
                <div className="w-full max-w-4xl mx-auto space-y-3">
              {/* Header with avatar, name, contact, VIP */}
              <div className="flex items-start gap-4">
                <div className={bigAvatarClass}>
                  {avatarPreviewUrl && !avatarError ? (
                    <img src={avatarPreviewUrl} alt="" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
                  ) : (
                    <span className="text-lg text-gray-500">{(selected.name||'?').slice(0,1)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 relative">
                  <div className="flex items-center gap-2">
                    <h3 className={nameClass}>{selected.name}</h3>
                    <button
                      onClick={async () => {
                        if (!selectedId) return;
                        const updated = await guestbookService.update(selectedId, { isVip: !selected.isVip });
                        if (updated) setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
                      }}
                      className={vipBtnClass}
                      title={selected.isVip ? 'VIP' : 'Mark as VIP'}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/></svg>
                    </button>
                    <div className="ml-auto" />
                    {!isEdit ? (
                      <button
                        className={saveBtnClass}
                        title={currentLanguage === 'srb' ? 'Uredi' : 'Edit'}
                        onClick={() => setIsEdit(true)}
                      >
                        {currentLanguage === 'srb' ? 'Uredi' : 'Edit'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          className={footerBtnClass}
                          title={currentLanguage === 'srb' ? 'Otkaži' : 'Cancel'}
                          onClick={handleCancel}
                        >
                          {currentLanguage === 'srb' ? 'Otkaži' : 'Cancel'}
                        </button>
                        <button
                          className={saveBtnClass}
                          title={currentLanguage === 'srb' ? 'Sačuvaj' : 'Save'}
                          onClick={handleSave}
                          disabled={isSaving || !isDirty}
                        >
                          {currentLanguage === 'srb' ? 'Sačuvaj' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Social icons under Edit button */}
                  {(() => {
                    const socials = [
                      { key: 'inst', url: selected.instagram, svg: (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 .001 10.001A5 5 0 0 0 12 7zm6.5-.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>) },
                      { key: 'fb', url: selected.facebook, svg: (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.5 9.9v-7h-2v-3h2v-2.3c0-2 1.2-3.1 3-3.1.9 0 1.8.1 1.8.1v2h-1c-1 0-1.3.6-1.3 1.2V12h2.2l-.3 3h-1.9v7A10 10 0 0 0 22 12z"/></svg>) },
                      { key: 'tt', url: selected.tiktok, svg: (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.7 2.5 2.7 4.4 5.2 4.7v3.2c-1.6 0-3-.5-4.2-1.3v6.6a6 6 0 1 1-6-6c.3 0 .7 0 1 .1v3.2c-.3-.1-.6-.1-1-.1a2.8 2.8 0 0 0 0 5.6c1.6 0 3-1.3 3-2.9V2h2z"/></svg>) },
                      { key: 'tw', url: selected.twitter, svg: (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.9c-.8.4-1.7.6-2.6.8.9-.6 1.6-1.4 1.9-2.5-.9 .5-1.9 .9-2.9 1.1a4.4 4.4 0 0 0-7.6 4c-3.6-.2-6.7-1.9-8.8-4.6a4.4 4.4 0 0 0 1.4 5.9c-.7 0-1.3-.2-1.9-.5V10a4.4 4.4 0 0 0 3.6 4.3c-.6 .2-1.2 .2-1.8 .1a4.4 4.4 0 0 0 4.1 3.1A8.8 8.8 0 0 1 2 19.6c.9 .6 2 1 3.1 1C15 20.6 20 13 20 6.6v-.3c.8-.6 1.5-1.4 2-2.3z"/></svg>) },
                      { key: 'web', url: selected.website, svg: (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-3A15.8 15.8 0 0 0 13 4.2 8 8 0 0 1 18.9 8zM12 4c.9.7 1.8 1.8 2.5 3H9.5C10.2 5.8 11.1 4.7 12 4zM5.1 8A8 8 0 0 1 11 4.2 15.8 15.8 0 0 0 8.1 8h-3zm0 8a8 8 0 0 1 0-8h3c-.4 1.3-.6 2.6-.6 4s.2 2.7.6 4h-3zM12 20c-.9-.7-1.8-1.8-2.5-3h5c-.7 1.2-1.6 2.3-2.5 3zm6.9-4h-3c.4-1.3.6-2.6.6-4s-.2-2.7-.6-4h3a8 8 0 0 1 0 8zM9.5 12c0-1.4.2-2.7.6-4h3.8c.4 1.3.6 2.6.6 4s-.2 2.7-.6 4H10c-.4-1.3-.6-2.6-.6-4z"/></svg>) }
                    ].filter(s => !!s.url);
                    if (socials.length === 0) return null;
                    return (
                      <div className="absolute right-0 bottom-0 flex items-center gap-2 pb-1">
                        {socials.map(s => (
                          <a key={s.key} href={normalizeUrl(s.url)} target="_blank" rel="noreferrer" className={isLight ? 'text-gray-700 hover:text-white/90 bg-gray-200 hover:bg-gray-400 rounded p-1' : 'text-white hover:text-white/90 bg-[#0A1929] border border-gray-800 rounded p-1'}>
                            {s.svg}
                          </a>
                        ))}
                      </div>
                    );
                  })()}
                  <div className={isLight ? 'flex items-center gap-4 text-gray-700 text-sm' : 'flex items-center gap-4 text-gray-300 text-sm'}>
                    {selected.phone && (
                      <div className="flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.66 12.66 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.66 12.66 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>{selected.phone}</div>
                    )}
                    {selected.email && (
                      <div className="flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M22,6 12,13 2,6"/></svg>{selected.email}</div>
                    )}
                  </div>
                  {selected.isVip && (
                    <div className="mt-2 text-yellow-500 text-xs">{currentLanguage === 'srb' ? 'Loyalty gost' : 'Loyalty guest'}</div>
                  )}
                  {/* Tags not displayed here; listed below */}
                </div>
              </div>

              {/* Common Tags list (outside tabs) */}
              <div className="mt-3">
                <div className={`${isLight ? 'bg-white border border-gray-200' : 'bg-[#0A1929] border border-gray-800'} rounded p-3`}>
                  <div className={`flex items-center gap-2 ${isLight ? 'text-gray-600' : 'text-gray-400'} text-xs`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.59 13.41l-7-7A2 2 0 0 0 12.17 6H6a2 2 0 0 0-2 2v6.17a2 2 0 0 0 .59 1.41l7 7a2 2 0 0 0 2.82 0l6.17-6.17a2 2 0 0 0 0-2.82z"/>
                      <path d="M7 7h.01"/>
                    </svg>
                    <span className="uppercase tracking-wide">{currentLanguage === 'srb' ? 'Tagovi' : 'Tags'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                  {(isEdit ? editTags : (selected.tags || [])) && (isEdit ? editTags : (selected.tags || []))
                    .filter(tag => {
                      const low = String(tag || '').toLowerCase();
                      return !(
                        low.startsWith('inst:') || low.startsWith('instagram:') ||
                        low.startsWith('fb:') || low.startsWith('facebook:') ||
                        low.startsWith('tt:') || low.startsWith('tiktok:') ||
                        low.startsWith('tw:') || low.startsWith('twitter:') ||
                        low.startsWith('web:') || low.startsWith('site:') || low.startsWith('www:') || low.startsWith('website:') ||
                        low.startsWith('loy:') ||
                        low.startsWith('bday:') || low.startsWith('dob:') || low.startsWith('birth:') ||
                        low.startsWith('loc:') || low.startsWith('location:') ||
                        low.startsWith('wine:') || low.startsWith('favwine:') || low.startsWith('winefav:') ||
                        low.startsWith('foodreq:') || low.startsWith('food_request:') || low.startsWith('food-req:') ||
                        low.startsWith('drinkreq:') || low.startsWith('drink_request:') || low.startsWith('drink-req:')
                      );
                    })
                    .map(tag => (
                      <span key={tag} className={tagChipClass}>
                      {tag}
                        {isEdit && (
                          <button
                            className={tagRemoveClass}
                            onClick={() => { setEditTags((prev) => prev.filter((t) => t !== tag)); }}
                            title={currentLanguage === 'srb' ? 'Ukloni' : 'Remove'}
                          >
                            ×
                          </button>
                        )}
                    </span>
                  ))}
                  {isEdit && !isAddingTag ? (
                    <button
                      className={tagAddBtnClass}
                      onClick={() => { setIsAddingTag(true); setTimeout(() => tagInputRef.current?.focus(), 0); }}
                      title={currentLanguage === 'srb' ? 'Dodaj tag' : 'Add tag'}
                    >
                      +
                    </button>
                  ) : isEdit ? (
                    <input
                      ref={tagInputRef}
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onBlur={async () => {
                        const tag = newTag.trim();
                        if (!tag) { setIsAddingTag(false); return; }
                        setEditTags(prev => (prev.includes(tag) ? prev : [...prev, tag]));
                        setNewTag('');
                        setIsAddingTag(false);
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Escape') { setIsAddingTag(false); setNewTag(''); return; }
                        if (e.key === 'Enter') {
                          const tag = newTag.trim();
                          if (!tag) { setIsAddingTag(false); return; }
                          setEditTags(prev => (prev.includes(tag) ? prev : [...prev, tag]));
                          setNewTag('');
                          setIsAddingTag(false);
                        }
                      }}
                      placeholder={currentLanguage === 'srb' ? 'Dodaj tag' : 'Add tag'}
                      className={tagInputClass}
                    />
                  ) : null}
                  </div>
                </div>
              </div>

              {/* Simple category tabs row */}
              <div className={`mt-4 ${isLight ? 'border-b border-gray-200' : 'border-b border-gray-800'}`}>
                <div className="flex items-center gap-6 text-sm">
                  <button
                    type="button"
                    onClick={() => setActiveDetailsTab('general')}
                    className={`pb-2 -mb-px inline-flex items-center gap-2 ${activeDetailsTab === 'general' ? (isLight ? 'text-blue-600 border-b-2 border-blue-600' : 'text-blue-400 border-b-2 border-blue-400') : 'text-gray-500 border-b-2 border-transparent hover:text-gray-400'}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="14" rx="2" ry="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>{currentLanguage === 'srb' ? 'Opšte' : 'General'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDetailsTab('special')}
                    className={`pb-2 inline-flex items-center gap-2 ${activeDetailsTab === 'special' ? (isLight ? 'text-blue-600 border-b-2 border-blue-600' : 'text-blue-400 border-b-2 border-blue-400') : 'text-gray-500 border-b-2 border-transparent hover:text-gray-400'}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/></svg>
                    <span>{currentLanguage === 'srb' ? 'Specijalno' : 'Special'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDetailsTab('food')}
                    className={`pb-2 inline-flex items-center gap-2 ${activeDetailsTab === 'food' ? (isLight ? 'text-blue-600 border-b-2 border-blue-600' : 'text-blue-400 border-b-2 border-blue-400') : 'text-gray-500 border-b-2 border-transparent hover:text-gray-400'}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 36 36" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M28.9345 35.9895H27.2078C26.4314 35.9887 25.6871 35.6838 25.1381 35.1418C24.5891 34.5997 24.2803 33.8647 24.2795 33.0981V23.1536C24.281 20.7521 23.5193 18.4644 22.0764 16.5318L22.0218 16.4569C20.9745 15.0585 20.3313 13.4056 20.1608 11.6745C19.9903 9.94346 20.2989 8.19917 21.0537 6.62772L22.5892 3.42772C23.0764 2.39974 23.8516 1.53105 24.8231 0.9244C25.7946 0.317752 26.9217 -0.00147113 28.0711 0.00449406C30.4381 0.00449406 32.538 1.31685 33.5516 3.42921L34.9778 6.4C36.4738 9.5176 36.3206 13.0427 34.5651 15.8292C34.4093 16.0756 34.2433 16.3155 34.0674 16.5483C32.626 18.4659 31.8628 20.9228 31.8628 23.6614V33.0996C31.8628 34.6936 30.5504 35.9895 28.9345 35.9895ZM24.5192 14.7506C26.3429 17.182 27.3236 20.1295 27.3155 23.1551L27.314 33.0996L28.936 32.9948L28.8283 23.6614C28.8283 20.2757 29.7993 17.1985 31.6322 14.7625C31.7581 14.5978 31.875 14.424 31.9888 14.2457C33.1783 12.3581 33.2724 9.84419 32.2361 7.68389L30.8098 4.71311C30.5707 4.19587 30.1843 3.75853 29.6977 3.45446C29.2111 3.1504 28.6454 2.99275 28.0696 3.00075C26.8679 3.00075 25.8453 3.64045 25.3309 4.71311L23.797 7.91011C23.2772 8.99102 23.0644 10.191 23.1811 11.3819C23.2979 12.5729 23.7399 13.7103 24.46 14.6727L24.5192 14.7506ZM15.1728 0C14.3383 0 13.6555 0.674157 13.6555 1.49813V8.2397H12.1382V1.49813C12.1382 0.674157 11.4554 0 10.6209 0C9.78644 0 9.10366 0.674157 9.10366 1.49813V8.2397H7.58639V1.49813C7.58639 0.674157 6.90361 0 6.06911 0C5.23461 0 4.55183 0.674157 4.55183 1.49813V8.2397H3.03455V1.49813C3.03455 0.674157 2.35178 0 1.51728 0C0.682775 0 0 0.674157 0 1.49813L0.0151731 10.2921C0.136555 12.2097 0.971057 14.4419 2.30626 16.4644C3.83871 18.7865 4.55183 21.0637 4.55183 23.6105V33.1236C4.55183 34.6966 5.84152 35.985 7.44983 35.985L9.22505 36H9.24022C10.014 36 10.7423 35.7004 11.2885 35.161C11.8348 34.6217 12.1382 33.9026 12.1382 33.1386V23.6554C12.1382 21.4082 12.8058 19.3109 14.4445 16.3895C15.4762 14.5618 16.5383 12.4195 16.6749 10.2921L16.6901 1.49813C16.6901 0.674157 16.0073 0 15.1728 0ZM11.8044 14.9363C10.4692 17.3034 9.10366 20.1948 9.10366 23.6554V33.0037L7.58639 32.9888V23.6105C7.58639 20.4494 6.72154 17.6629 4.84011 14.8165C4.0663 13.6629 3.50491 12.3745 3.2318 11.236H13.4431C13.1093 12.4944 12.4113 13.8277 11.8044 14.9363Z"/>
                    </svg>
                    <span>{currentLanguage === 'srb' ? 'Hrana & piće' : 'Food & drink'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDetailsTab('seating')}
                    className={`pb-2 inline-flex items-center gap-2 ${activeDetailsTab === 'seating' ? (isLight ? 'text-blue-600 border-b-2 border-blue-600' : 'text-blue-400 border-b-2 border-blue-400') : 'text-gray-500 border-b-2 border-transparent hover:text-gray-400'}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    <span>{currentLanguage === 'srb' ? 'Sedenje' : 'Seating'}</span>
                  </button>
                </div>
              </div>

              {activeDetailsTab === 'general' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1 inline-flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5Z"/>
                    </svg>
                    {currentLanguage === 'srb' ? 'Ime' : 'Name'}
                  </span>
                  {isEdit ? (
                    <input className={inputClass}
                           value={form.name}
                           onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  ) : (
                    <div className={readonlyTextClass}>{form.name || '-'}</div>
                  )}
                </div>
                <div className="flex flex-col" role="group" aria-label="Profile picture">
                  <span className="text-gray-500 text-xs mb-1 inline-flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 95 95" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M47.3437 3.15969e-06C37.6093 -0.00355297 28.1106 2.9947 20.1423 8.5861C12.1739 14.1775 6.12358 22.09 2.81591 31.2452C-0.491767 40.4004 -0.895859 50.3529 1.65871 59.7461C4.21327 69.1393 9.60221 77.5163 17.091 83.7353C17.1226 83.7511 17.1542 83.7827 17.1857 83.7984C25.66 90.8355 36.3285 94.6876 47.3437 94.6876C58.3589 94.6876 69.0273 90.8355 77.5016 83.7984C77.5332 83.7827 77.5648 83.7511 77.5963 83.7353C85.0851 77.5163 90.4741 69.1393 93.0287 59.7461C95.5832 50.3529 95.1791 40.4004 91.8715 31.2452C88.5638 22.09 82.5135 14.1775 74.5451 8.5861C66.5768 2.9947 57.0781 -0.00355297 47.3437 3.15969e-06ZM28.927 41.5994C28.9271 37.963 30.0037 34.408 32.0211 31.3825C34.0386 28.3571 36.9065 25.9966 40.2635 24.5986C43.6204 23.2006 47.3161 22.8277 50.8847 23.5268C54.4532 24.226 57.735 25.966 60.3161 28.5274C62.8973 31.0888 64.6625 34.3571 65.389 37.9202C66.1156 41.4833 65.7711 45.1817 64.3989 48.5493C63.0268 51.9169 60.6884 54.8029 57.6785 56.8435C54.6686 58.8841 51.122 59.9881 47.4857 60.0161C47.4384 60.0161 47.391 60.0003 47.3437 60.0003C47.2963 60.0003 47.2332 60.0161 47.1859 60.0161C42.3312 59.9671 37.6916 58.006 34.2734 54.5583C30.8552 51.1106 28.9342 46.4543 28.927 41.5994ZM47.3437 91.5313C37.4418 91.5371 27.8277 88.2008 20.0579 82.0625C22.128 76.5325 25.832 71.7635 30.6777 68.3893C35.5234 65.0151 41.2812 63.1955 47.1859 63.1723H47.4857C51.2924 63.1779 55.0608 63.9334 58.5755 65.3956C62.0902 66.8578 65.2824 68.9981 67.9698 71.6942C70.897 74.6382 73.1715 78.1655 74.6452 82.0467C66.8747 88.1965 57.2534 91.539 47.3437 91.5313Z"/>
                    </svg>
                    {currentLanguage === 'srb' ? 'Profilna slika' : 'Profile picture'}
                  </span>
                  {isEdit ? (
                    <div className="flex items-center gap-2">
                      <button
                        className={isLight ? 'px-2 py-2 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100' : 'px-2 py-2 text-xs rounded border border-gray-700 text-gray-200 hover:bg-white/10'}
                        title={currentLanguage === 'srb' ? 'Otpremi sa računara' : 'Upload from file'}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {currentLanguage === 'srb' ? 'Otpremi' : 'Upload'}
                      </button>
                      {(pendingAvatarPreview || form.avatarUrl) && (
                        <button
                          className="px-2 py-2 text-xs rounded text-red-400 hover:bg-red-500/10 transition-colors"
                          title={currentLanguage === 'srb' ? 'Ukloni profilnu' : 'Remove avatar'}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setForm(f => ({ ...f, avatarUrl: '' }));
                            // Clear any pending local avatar as well
                            if (pendingAvatarPreview) { try { URL.revokeObjectURL(pendingAvatarPreview); } catch {} }
                            setPendingAvatarPreview('');
                            setPendingAvatarFile(null);
                            // bump local cache key so preview invalidates
                            setAvatarLocalVersion(Date.now());
                          }}
                        >
                          {currentLanguage === 'srb' ? 'Ukloni' : 'Remove'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {form.avatarUrl ? (
                        <>
                          <svg width="14" height="11" viewBox="0 0 70 55" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={isLight ? 'text-gray-600' : 'text-gray-300'}>
                            <path d="M62.9191 0H6.37875C2.85469 0 0 2.85469 0 6.37875V48.0156C0 51.5375 2.85469 54.3922 6.37875 54.3922H62.9191C66.4431 54.3922 69.3 51.5375 69.3 48.0156V6.37875C69.3 2.85469 66.4431 0 62.9191 0ZM9.98812 43.2709L22.505 21.5928L29.6997 34.055L41.3503 13.8687L58.3275 43.2688L9.98812 43.2709ZM56.6431 19.355C54.3725 19.355 52.5284 17.5131 52.5284 15.2425C52.5284 12.9675 54.3725 11.1256 56.6431 11.1256C58.9159 11.1256 60.76 12.9675 60.76 15.2425C60.76 17.5131 58.9159 19.355 56.6431 19.355Z"/>
                          </svg>
                          <span className={readonlyTextClass}>{currentLanguage === 'srb' ? 'Učitana' : 'Uploaded'}</span>
                        </>
                      ) : (
                        <span className={readonlyTextClass}>{currentLanguage === 'srb' ? 'Nije učitana' : 'Not uploaded'}</span>
                      )}
                    </div>
                  )}
                </div>
                {/* hidden file input for avatar upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={!isEdit}
                  onChange={async (e) => {
                    if (!selected) return;
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // Stage locally only (do not upload/save yet)
                    try { if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview); } catch {}
                    const previewUrl = URL.createObjectURL(file);
                    setPendingAvatarPreview(previewUrl);
                    setPendingAvatarFile(file);
                    // Keep form avatar unchanged; preview drives the UI
                    // reset input value to allow re-upload same file later
                    (e.target as HTMLInputElement).value = '';
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1 inline-flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.16 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.98.34 1.94.66 2.86a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.92.32 1.88.54 2.86.66A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    {currentLanguage === 'srb' ? 'Telefon' : 'Phone'}
                  </span>
                  {isEdit ? (
                    <input className={inputClass}
                           value={form.phone}
                           onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  ) : (
                    <div className={readonlyTextClass}>{form.phone || '-'}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1 inline-flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="5" width="18" height="14" rx="2" ry="2"/>
                      <path d="M3 7l9 6 9-6"/>
                    </svg>
                    Email
                  </span>
                  {isEdit ? (
                    <input className={inputClass}
                           value={form.email}
                           onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  ) : (
                    <div className={readonlyTextClass}>{form.email || '-'}</div>
                  )}
                </div>
                {/* Birth date */}
                <div className={`flex flex-col ${!isEdit ? '' : ''}`}>
                  <span className="text-gray-500 text-xs mb-1 inline-flex items-center gap-1">
                    <svg width="9" height="10" viewBox="0 0 459 459" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M378.674 458.667H80.007C64.4528 458.65 49.5406 452.463 38.5421 441.465C27.5436 430.466 21.3573 415.554 21.3403 400V293.973C21.3403 289.73 23.026 285.66 26.0266 282.66C29.0272 279.659 33.0969 277.973 37.3403 277.973C41.5838 277.973 45.6535 279.659 48.654 282.66C51.6546 285.66 53.3403 289.73 53.3403 293.973V400C53.3516 407.069 56.1648 413.845 61.1633 418.844C66.1618 423.842 72.938 426.655 80.007 426.667H378.674C385.743 426.655 392.519 423.842 397.517 418.844C402.516 413.845 405.329 407.069 405.34 400V292.907C405.34 288.663 407.026 284.593 410.027 281.593C413.027 278.592 417.097 276.907 421.34 276.907C425.584 276.907 429.653 278.592 432.654 281.593C435.655 284.593 437.34 288.663 437.34 292.907V400C437.323 415.554 431.137 430.466 420.139 441.465C409.14 452.463 394.228 458.65 378.674 458.667Z"/>
                      <path d="M229.34 330.667C215.413 330.664 201.689 327.321 189.32 320.918C176.952 314.514 166.3 305.238 158.258 293.867C148.42 307.742 134.746 318.444 118.913 324.659C103.08 330.874 85.7767 332.332 69.127 328.853C49.3408 324.485 31.6645 313.431 19.0748 297.554C6.48512 281.677 -0.248816 261.947 0.00703052 241.685V186.667C0.0183231 176.769 3.95527 167.279 10.9542 160.281C17.9531 153.282 27.4424 149.345 37.3404 149.333H421.34C431.238 149.345 440.728 153.282 447.727 160.281C454.725 167.279 458.662 176.769 458.674 186.667V239.552C459.192 262.391 450.93 284.559 435.59 301.487C420.249 318.415 399 328.813 376.22 330.539C361.518 331.317 346.858 328.363 333.605 321.951C320.352 315.539 308.937 305.878 300.423 293.867C292.381 305.238 281.729 314.514 269.36 320.918C256.992 327.321 243.268 330.664 229.34 330.667ZM37.3404 181.333C35.9259 181.333 34.5693 181.895 33.5691 182.895C32.5689 183.896 32.007 185.252 32.007 186.667V241.685C31.7335 254.563 35.9055 267.141 43.8207 277.302C51.7358 287.463 62.9105 294.586 75.463 297.472C83.5064 299.199 91.8341 299.106 99.8368 297.199C107.839 295.293 115.315 291.621 121.716 286.453C128.117 281.286 133.281 274.752 136.832 267.331C140.382 259.91 142.229 251.789 142.236 243.563C142.236 239.319 143.922 235.25 146.923 232.249C149.923 229.248 153.993 227.563 158.236 227.563C162.48 227.563 166.55 229.248 169.55 232.249C172.551 235.25 174.236 239.319 174.236 243.563C174.52 257.992 180.452 271.735 190.757 281.839C201.062 291.944 214.919 297.604 229.351 297.604C243.783 297.604 257.64 291.944 267.945 281.839C278.25 271.735 284.182 257.992 284.466 243.563C284.466 239.319 286.151 235.25 289.152 232.249C292.153 229.248 296.222 227.563 300.466 227.563C304.709 227.563 308.779 229.248 311.779 232.249C314.78 235.25 316.466 239.319 316.466 243.563C316.469 251.049 317.998 258.457 320.958 265.333C323.919 272.21 328.249 278.411 333.684 283.559C339.12 288.707 345.547 292.694 352.574 295.277C359.601 297.86 367.081 298.984 374.556 298.581C389.081 297.113 402.516 290.219 412.178 279.275C421.84 268.332 427.016 254.146 426.674 239.552V186.667C426.674 185.252 426.112 183.896 425.112 182.895C424.111 181.895 422.755 181.333 421.34 181.333H37.3404Z"/>
                      <path d="M24.3403 249.333V170.333H433.84L438.34 258.833L415.34 298.833L385.34 312.333L325.34 303.333L302.34 253.833C293.507 270.333 275.04 303.333 271.84 303.333C268.64 303.333 243.174 309.333 230.84 312.333L185.34 303.333L155.84 249.333L141.34 292.833L89.8403 312.333L37.3403 292.833L24.3403 249.333Z" />
                      <path d="M272.007 181.333H186.674C184.438 181.333 182.227 180.863 180.184 179.956C178.141 179.048 176.311 177.723 174.811 176.065C173.312 174.406 172.176 172.452 171.478 170.328C170.781 168.204 170.535 165.958 170.759 163.733L178.14 88.9174C179.41 76.2433 185.344 64.493 194.789 55.947C204.234 47.401 216.517 42.6688 229.255 42.6688C241.993 42.6688 254.276 47.401 263.721 55.947C273.166 64.493 279.1 76.2433 280.37 88.9174L287.836 163.733C288.059 165.951 287.816 168.19 287.124 170.308C286.431 172.426 285.303 174.376 283.813 176.033C282.323 177.69 280.503 179.017 278.47 179.93C276.437 180.843 274.235 181.321 272.007 181.333ZM204.359 149.333H254.322L248.54 92.096C248.039 87.3364 245.793 82.931 242.236 79.7291C238.679 76.5271 234.062 74.7554 229.276 74.7554C224.49 74.7554 219.874 76.5271 216.317 79.7291C212.76 82.931 210.514 87.3364 210.012 92.096L204.359 149.333Z"/>
                      <path d="M229.34 74.6667C225.097 74.6667 221.027 72.981 218.027 69.9804C215.026 66.9798 213.34 62.9101 213.34 58.6667V16C213.34 11.7565 215.026 7.68687 218.027 4.68629C221.027 1.68571 225.097 0 229.34 0C233.584 0 237.654 1.68571 240.654 4.68629C243.655 7.68687 245.34 11.7565 245.34 16V58.6667C245.34 62.9101 243.655 66.9798 240.654 69.9804C237.654 72.981 233.584 74.6667 229.34 74.6667Z"/>
                    </svg>
                    {currentLanguage === 'srb' ? 'Datum rođenja' : 'Birth date'}
                  </span>
                  {isEdit ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={birthDay}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D+/g, '').slice(0, 2);
                          setBirthDay(v);
                          tryUpdateBirthDate(v, birthMonth, birthYear);
                        }}
                        placeholder={currentLanguage === 'srb' ? 'DD' : 'DD'}
                        className={inputClass + ' w-16 text-center'}
                        inputMode="numeric"
                        pattern="\d*"
                      />
                      <input
                        value={birthMonth}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D+/g, '').slice(0, 2);
                          setBirthMonth(v);
                          tryUpdateBirthDate(birthDay, v, birthYear);
                        }}
                        placeholder={currentLanguage === 'srb' ? 'MM' : 'MM'}
                        className={inputClass + ' w-16 text-center'}
                        inputMode="numeric"
                        pattern="\d*"
                      />
                      <input
                        value={birthYear}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D+/g, '').slice(0, 4);
                          setBirthYear(v);
                          tryUpdateBirthDate(birthDay, birthMonth, v);
                        }}
                        placeholder={currentLanguage === 'srb' ? 'YYYY' : 'YYYY'}
                        className={inputClass + ' w-24 text-center'}
                        inputMode="numeric"
                        pattern="\d*"
                      />
                    </div>
                  ) : (
                    <div className={readonlyTextClass}>{formatDateDisplay((form as any).birthDate)}</div>
                  )}
                </div>
                {/* Location */}
                <div className="flex flex-col" ref={locationDropdownRef}>
                  <span className="text-gray-500 text-xs mb-1 inline-flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10z"/><circle cx="12" cy="11" r="2.5"/>
                    </svg>
                    {currentLanguage === 'srb' ? 'Mesto boravka' : 'Location'}
                  </span>
                  {isEdit ? (
                    <div className="relative">
                      <input
                        className={`${inputClass} pr-8`}
                        value={(form as any).location || ''}
                        onChange={e => setForm(f => ({ ...f, location: e.target.value } as any))}
                        onFocus={() => setLocationDropdownOpen(true)}
                        placeholder={currentLanguage === 'srb' ? 'Unesite grad, država' : 'Enter city, country'}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() => setLocationDropdownOpen(prev => !prev)}
                        title="Toggle"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {locationDropdownOpen && locationSuggestions.length > 0 && (
                        <div className={`absolute z-20 mt-1 w-full rounded-lg border shadow-xl ${isLight ? 'border-gray-200 bg-white' : 'border-gray-800 bg-[#050B16]'}`}>
                          <div className="max-h-72 overflow-y-auto pl-1 pr-3 py-2 space-y-1 statistics-scrollbar stable-scrollbar">
                            {locationSuggestions.map((s, idx) => {
                              const label = `${s.name}${s.admin1 ? ', ' + s.admin1 : ''}${s.country ? ', ' + s.country : ''}`;
                              return (
                                <button
                                  key={`${s.name}-${s.admin1}-${s.country}-${idx}`}
                                  type="button"
                                  onClick={() => { setForm(f => ({ ...f, location: label } as any)); setLocationDropdownOpen(false); }}
                                  className={`w-full text-left pl-2.5 pr-2 py-1 text-sm rounded transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-800' : 'hover:bg-white/5 text-gray-200'}`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={readonlyTextClass}>{(form as any).location || '-'}</div>
                  )}
                </div>
                {/* Notes / wishes */}
                <div className="col-span-2 flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Beleške / želje' : 'Notes / wishes'}</span>
                  {isEdit ? (
                    <textarea
                      rows={4}
                      className={inputClass}
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  ) : (
                    <div
                      className={readonlyTextClass}
                      style={{ whiteSpace: 'pre-wrap' }}
                    >
                      {form.notes || '-'}
                    </div>
                  )}
                </div>
                {/* Average bill */}
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Prosečan račun' : 'Average bill'}</span>
                  {isEdit ? (
                    <input type="number" min={0} step={1}
                           className={`${inputClass} hide-number-arrows`}
                           value={form.averageBill ?? ''}
                           onChange={e => setForm(f => ({ ...f, averageBill: e.target.value as any }))} />
                  ) : (
                    <div className={readonlyTextClass}>{form.averageBill ?? '-'}</div>
                  )}
                </div>
                {/* Last visit */}
                <div className={`flex flex-col ${!isEdit ? 'opacity-100 pointer-events-none' : ''}`}>
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Poslednja poseta' : 'Last visit'}</span>
                  {isEdit ? (
                    <CustomDatePicker
                      value={form.lastVisitAt ? form.lastVisitAt.slice(0,10) : new Date().toISOString().slice(0,10)}
                      onChange={(date) => setForm(f => ({ ...f, lastVisitAt: date }))}
                      type="date"
                      label={currentLanguage === 'srb' ? 'Datum' : 'Date'}
                      hideInlineLabel={true}
                      size="sm"
                      matchInputHeight={true}
                      placement="top"
                    />
                  ) : (
                    <div className={readonlyTextClass}>{formatDateDisplay(form.lastVisitAt)}</div>
                  )}
                </div>
              </div>
              )}

              {/* Special tab content: social links + special relation */}
              {activeDetailsTab === 'special' && (
                <div className="grid grid-cols-2 gap-3">
                {isEdit ? (
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">Instagram</span>
                    <input className={inputClass}
                           disabled={!isEdit}
                           value={(form as any).instagram || ''}
                           onChange={e => setForm(f => ({ ...f, instagram: e.target.value } as any))} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">Facebook</span>
                    <input className={inputClass}
                           disabled={!isEdit}
                           value={(form as any).facebook || ''}
                           onChange={e => setForm(f => ({ ...f, facebook: e.target.value } as any))} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">TikTok</span>
                    <input className={inputClass}
                           disabled={!isEdit}
                           value={(form as any).tiktok || ''}
                           onChange={e => setForm(f => ({ ...f, tiktok: e.target.value } as any))} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">Twitter/X</span>
                    <input className={inputClass}
                           disabled={!isEdit}
                           value={(form as any).twitter || ''}
                           onChange={e => setForm(f => ({ ...f, twitter: e.target.value } as any))} />
                  </div>
                  <div className="flex flex-col col-span-2">
                    <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Veb sajt' : 'Website'}</span>
                    <input className={inputClass}
                           disabled={!isEdit}
                           value={(form as any).website || ''}
                           onChange={e => setForm(f => ({ ...f, website: e.target.value } as any))} />
                  </div>
                </div>
                ) : (
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    {[
                      { label: 'Instagram', val: (form as any).instagram },
                      { label: 'Facebook', val: (form as any).facebook },
                      { label: 'TikTok', val: (form as any).tiktok },
                      { label: 'Twitter/X', val: (form as any).twitter },
                      { label: currentLanguage === 'srb' ? 'Veb sajt' : 'Website', val: (form as any).website, full: true }
                    ].map((s, idx) => (
                      <div key={idx} className={s.full ? 'col-span-2' : ''}>
                        <span className="text-gray-500 text-xs mb-1 block">{s.label}</span>
                        <div className={readonlyTextClass}>
                          {s.val ? <a href={normalizeUrl(s.val)} target="_blank" rel="noreferrer" className={isLight ? 'text-blue-600 hover:underline' : 'text-blue-400 hover:underline'}>{s.val}</a> : '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="col-span-2 flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Posebna veza' : 'Special relation'}</span>
                  {isEdit ? (
                    <input
                      className={inputClass}
                      value={form.specialRelationNote}
                      onChange={e => setForm(f => ({ ...f, specialRelationNote: e.target.value }))} />
                  ) : (
                    <div className={readonlyTextClass}>{form.specialRelationNote?.trim() ? form.specialRelationNote : '-'}</div>
                  )}
                </div>
                {/* Loyalty tags */}
                <div className="col-span-2">
                  <div className={`${isLight ? 'bg-white border border-gray-200' : 'bg-[#0A1929] border border-gray-800'} rounded p-3`}>
                    <div className={`flex items-center gap-2 ${isLight ? 'text-gray-600' : 'text-gray-400'} text-xs`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500"><path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/></svg>
                      <span className="uppercase tracking-wide">{currentLanguage === 'srb' ? 'Loyalty tagovi' : 'Loyalty tags'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {Array.isArray(isEdit ? editTags : selected.tags) && (isEdit ? editTags : (selected.tags || []))
                        .filter(t => String(t || '').toLowerCase().startsWith('loy:'))
                        .map(t => String(t).replace(/^loy:/i, ''))
                        .map(tag => (
                          <span key={`loy-${tag}`} className={tagChipClass}>
                            <span className="inline-flex items-center gap-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500"><path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/></svg>
                              {tag}
                            </span>
                            {isEdit && (
                              <button
                                className={tagRemoveClass}
                                onClick={() => {
                                  const token = `loy:${tag}`;
                                  setEditTags(prev => prev.filter(t => t !== token));
                                }}
                                title={currentLanguage === 'srb' ? 'Ukloni' : 'Remove'}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                      {isEdit && !isAddingLoyaltyTag ? (
                        <button
                          className={tagAddBtnClass}
                          onClick={() => { setIsAddingLoyaltyTag(true); setTimeout(() => loyaltyTagInputRef.current?.focus(), 0); }}
                          title={currentLanguage === 'srb' ? 'Dodaj loyalty tag' : 'Add loyalty tag'}
                        >
                          +
                        </button>
                      ) : isEdit ? (
                        <input
                          ref={loyaltyTagInputRef}
                          value={newLoyaltyTag}
                          onChange={(e) => setNewLoyaltyTag(e.target.value)}
                          onBlur={async () => {
                            const tag = newLoyaltyTag.trim();
                            if (!tag) { setIsAddingLoyaltyTag(false); return; }
                            const token = `loy:${tag}`;
                            setEditTags(prev => (prev.includes(token) ? prev : [...prev, token]));
                            setNewLoyaltyTag('');
                            setIsAddingLoyaltyTag(false);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === 'Escape') { setIsAddingLoyaltyTag(false); setNewLoyaltyTag(''); return; }
                            if (e.key === 'Enter') {
                              const tag = newLoyaltyTag.trim();
                              if (!tag) { setIsAddingLoyaltyTag(false); return; }
                              const token = `loy:${tag}`;
                              setEditTags(prev => (prev.includes(token) ? prev : [...prev, token]));
                              setNewLoyaltyTag('');
                              setIsAddingLoyaltyTag(false);
                            }
                          }}
                          placeholder={currentLanguage === 'srb' ? 'Dodaj loyalty tag' : 'Add loyalty tag'}
                          className={tagInputClass}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Food & drink tab */}
              {activeDetailsTab === 'food' && (
                <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Alergeni (kao tagovi)' : 'Allergens (as tags)'}</span>
                  <div
                    className={`${isEdit ? inputClass : ''} flex items-center gap-2 flex-wrap tag-chip-container`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (!target.closest('button') && isEdit) {
                        allergenInputRef.current?.focus();
                      }
                    }}
                  >
                    {allergenTags.map(tag => (
                      <span key={tag} className={`${tagChipClass} text-sm px-3 py-1 tag-chip pointer-events-none`}>
                        {tag}
                        {isEdit && (
                          <button
                            className={`${tagRemoveClass} pointer-events-auto`}
                            onClick={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation();
                              removeAllergenTag(tag); 
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            title={currentLanguage === 'srb' ? 'Ukloni' : 'Remove'}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {isEdit && (
                    <input
                      ref={allergenInputRef}
                      value={allergenTagInput}
                      onChange={(e) => setAllergenTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',' ) {
                          e.preventDefault();
                          if (allergenTagInput.trim()) {
                            addAllergenTag(allergenTagInput);
                          } else {
                            setAllergenTagInput('');
                          }
                        }
                      }}
                      onBlur={() => {
                        // Normalize: if user typed something and leaves, add it
                        if (allergenTagInput.trim()) {
                          addAllergenTag(allergenTagInput);
                        } else {
                          setAllergenTagInput('');
                        }
                      }}
                      placeholder={currentLanguage === 'srb' ? 'Dodaj alergen...' : 'Add allergen...'}
                      className={`bg-transparent outline-none border-none text-sm flex-1 min-w-[140px] ${isLight ? 'text-black placeholder-gray-500' : 'text-white placeholder-gray-500'}`}
                    />
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Omiljena pića' : 'Favorite drinks'}</span>
                  {isEdit ? (
                    <input className={inputClass}
                           value={form.favoriteDrinks}
                           onChange={e => setForm(f => ({ ...f, favoriteDrinks: e.target.value }))} />
                  ) : (
                    <div className={readonlyTextClass}>{form.favoriteDrinks || '-'}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Omiljena hrana' : 'Favorite foods'}</span>
                  {isEdit ? (
                    <input className={inputClass}
                           value={form.favoriteFoods}
                           onChange={e => setForm(f => ({ ...f, favoriteFoods: e.target.value }))} />
                  ) : (
                    <div className={readonlyTextClass}>{form.favoriteFoods || '-'}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Omiljeno vino' : 'Favorite wine'}</span>
                  {isEdit ? (
                    <input className={inputClass}
                           value={(form as any).favoriteWine || ''}
                           onChange={e => setForm(f => ({ ...f, favoriteWine: e.target.value } as any))} />
                  ) : (
                    <div className={readonlyTextClass}>{(form as any).favoriteWine || '-'}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Posebni zahtevi (hrana)' : 'Special food requests'}</span>
                  {isEdit ? (
                    <input className={inputClass}
                           value={(form as any).foodRequests || ''}
                           onChange={e => setForm(f => ({ ...f, foodRequests: e.target.value } as any))} />
                  ) : (
                    <div className={readonlyTextClass}>{(form as any).foodRequests || '-'}</div>
                  )}
                </div>
                <div className="col-span-2 flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Posebni zahtevi (piće)' : 'Special drink requests'}</span>
                  {isEdit ? (
                    <input className={inputClass}
                           value={(form as any).drinkRequests || ''}
                           onChange={e => setForm(f => ({ ...f, drinkRequests: e.target.value } as any))} />
                  ) : (
                    <div className={readonlyTextClass}>{(form as any).drinkRequests || '-'}</div>
                  )}
                </div>
              </div>
              )}

              {/* Seating tab */}
              {activeDetailsTab === 'seating' && (
                <div className="col-span-2 flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Omiljeno sedenje (brojevi stolova)' : 'Preferred seating (table numbers)'}</span>
                  <div
                    className={`${isEdit ? inputClass : ''} flex items-center gap-2 flex-wrap tag-chip-container`}
                    onMouseDown={(e) => {
                      if (!isEdit) return;
                      const t = e.target as HTMLElement;
                      const inInput = preferredInputRef.current ? preferredInputRef.current.contains(t) : false;
                      const inButton = !!t.closest('button');
                      if (!inInput && !inButton) {
                        commitPreferredInputIfValid();
                      }
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (!target.closest('button') && isEdit) {
                        preferredInputRef.current?.focus();
                      }
                    }}
                  >
                    {preferredTags.map(tag => (
                      <span key={tag} className={`${tagChipClass} text-sm px-3 py-1 tag-chip pointer-events-none`}>
                        {tag}
                        {isEdit && (
                          <button
                            className={`${tagRemoveClass} pointer-events-auto`}
                            onClick={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation();
                              removePreferredTag(tag); 
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            title={currentLanguage === 'srb' ? 'Ukloni' : 'Remove'}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {isEdit && (
                      <input
                        ref={preferredInputRef}
                        value={preferredTagInput}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^\d*$/.test(v)) setPreferredTagInput(v);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                            e.preventDefault();
                            if (preferredTagInput.trim()) {
                              addPreferredTag(preferredTagInput);
                            } else {
                              setPreferredTagInput('');
                            }
                          }
                        }}
                        onBlur={commitPreferredInputIfValid}
                        placeholder={currentLanguage === 'srb' ? 'Dodaj broj stola...' : 'Add table number...'}
                        className={`bg-transparent outline-none border-none text-sm flex-1 min-w-[120px] ${isLight ? 'text-black placeholder-gray-500' : 'text-white placeholder-gray-500'}`}
                        inputMode="numeric"
                        pattern="\d*"
                      />
                    )}
                  </div>
                </div>
              )}
              <div className={isLight ? 'flex justify-between pt-2 border-t border-gray-200 mt-2' : 'flex justify-between pt-2 border-t border-gray-800 mt-2'}>
                <button onClick={() => setConfirmModal({ type: 'reset' })} className={dangerBtnClass}>{currentLanguage === 'srb' ? 'Resetuj sve' : 'Reset All'}</button>
                <div className="flex gap-2" />
              </div>
              </div>
            </div>
            </div>
          )}
        </div>
        {/* Right-side tab OUTSIDE of the form panel */}
        {selected && (
          <aside className={rightSideTabClass}>
            <div className="space-y-3">
              <button
                className={sideActionBtnFullClass}
                title={currentLanguage === 'srb' ? 'Dodaj u rezervaciju' : 'Add to reservation'}
                onClick={async () => {
                  try {
                    const preferred = (selected.preferredSeating || '')
                      .split(/[,\s]+/)
                      .map(s => s.trim())
                      .filter(s => /^\d+$/.test(s) && validTableNumbers.has(s));
                    const payload = {
                      guestName: selected.name || '',
                      phone: selected.phone || '',
                      tableNumbers: preferred
                    };
                    localStorage.setItem(PREFILL_KEY, JSON.stringify(payload));
                    try { localStorage.setItem('respoint_selected_guestbook_id', selected.id); } catch {}
                  } catch {}
                  try { onClose(); } catch {}
                  setTimeout(() => {
                    try { window.dispatchEvent(new CustomEvent('respoint-open-reservation')); } catch {}
                  }, 0);
                }}
              >
                {currentLanguage === 'srb' ? 'Dodaj u rezervaciju' : 'Add to reservation'}
              </button>
              <button className={sideDangerBtnFullClass} onClick={() => setConfirmModal({ type: 'remove' })}>
                {currentLanguage === 'srb' ? 'Ukloni gosta' : 'Remove Guest'}
              </button>
              <div className={statsBorderClass}>
                <div className={statsTitleClass}>{currentLanguage === 'srb' ? 'Pregled' : 'Overview'}</div>
                <div className={`space-y-2 ${statsGridText}`}>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Lokacija' : 'Location'}</div>
                    <div className="truncate">{selected.location || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Poslednja poseta' : 'Last visit'}</div>
                    <div>{selected.lastVisitAt ? new Date(selected.lastVisitAt).toLocaleDateString('en-GB') : '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Ukupno poseta' : 'Total visits'}</div>
                    <div>{selected.totalVisits ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Nadolazeće rezervacije' : 'Upcoming visits'}</div>
                    <button
                      type="button"
                      className={isLight ? 'w-full flex items-center justify-between text-left text-sm text-gray-800 hover:bg-gray-100 rounded pl-0 pr-2 py-1' : 'w-full flex items-center justify-between text-left text-sm text-gray-200 hover:bg-white/10 rounded pl-0 pr-2 py-1'}
                      onClick={async () => {
                        const next = !upcomingOpen;
                        setUpcomingOpen(next);
                        if (next && upcomingList.length === 0) {
                          await loadUpcoming();
                        }
                      }}
                      aria-expanded={upcomingOpen}
                      aria-controls="upcoming-reservations-list"
                    >
                      <span className="truncate">{upcomingVisitsCount != null ? upcomingVisitsCount : '-'}</span>
                      <svg
                        width="12" height="12" viewBox="0 0 20 20"
                        className={upcomingOpen ? 'transform rotate-180 transition-transform' : 'transition-transform'}
                        fill="currentColor" xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"/>
                      </svg>
                    </button>
                    {upcomingOpen && (
                      <div
                        id="upcoming-reservations-list"
                        className={isLight ? 'mt-1 bg-gray-100 rounded shadow-sm' : 'mt-1 bg-gray-800 rounded shadow-sm'}
                      >
                        {upcomingLoading ? (
                          <div className={isLight ? 'px-2 py-1 text-xs text-gray-500' : 'px-2 py-1 text-xs text-gray-400'}>
                            {currentLanguage === 'srb' ? 'Učitavanje...' : 'Loading...'}
                          </div>
                        ) : upcomingList.length === 0 ? (
                          <div className={isLight ? 'px-2 py-1 text-xs text-gray-500' : 'px-2 py-1 text-xs text-gray-400'}>
                            {currentLanguage === 'srb' ? 'Nema nadolazećih rezervacija' : 'No upcoming reservations'}
                          </div>
                        ) : (
                          <ul className="divide-y divide-gray-200 dark:divide-gray-200 text-xs">
                            {upcomingList.map((r: any) => {
                              const dateStr = (() => {
                                try {
                                  const d = new Date(String(r.date));
                                  return Number.isNaN(d.getTime())
                                    ? String(r.date)
                                    : d.toLocaleDateString('en-GB');
                                } catch { return String(r.date); }
                              })();
                              const timeStr = String(r.time || '').slice(0, 5);
                              const tableIds: string[] = Array.isArray(r.table_ids) ? r.table_ids : [];
                              const tableNames = tableIds.length > 0 ? formatTableNames(tableIds, zoneLayouts) : '';
                              const zoneLabel = formatZoneName(String(r.zone_id || ''), null, zones);
                              return (
                                <li key={r.id} className="px-2 py-2">
                                  <div className={isLight ? 'text-gray-800' : 'text-gray-200'}>
                                    {dateStr}{timeStr ? ` • ${timeStr}` : ''}
                                  </div>
                                  <div className={isLight ? 'text-gray-600 mt-1' : 'text-gray-400 mt-1'}>
                                    {currentLanguage === 'srb' ? 'Gosti' : 'Guests'}: {Number(r.number_of_guests) || 0}
                                  </div>
                                  {r.zone_id ? (
                                    <div className={isLight ? 'text-gray-600 mt-0.5' : 'text-gray-400 mt-0.5'}>
                                      {currentLanguage === 'srb' ? 'Zona' : 'Zone'}: {zoneLabel}
                                    </div>
                                  ) : null}
                                  {tableIds.length > 0 ? (
                                    <div className={isLight ? 'text-gray-600 mt-0.5' : 'text-gray-400 mt-0.5'}>
                                      {currentLanguage === 'srb' ? 'Sto' : 'Table'}: {tableNames}
                                    </div>
                                  ) : null}
                                  <div className={isLight ? 'text-gray-500 mt-0.5' : 'text-gray-400 mt-0.5'}>
                                    {currentLanguage === 'srb' ? 'Status' : 'Status'}: {String(r.status)}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                      <div>
                        <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Učestalost poseta (nedeljno)' : 'Visit frequency (per week)'}</div>
                        <div>{weeklyVisitsAvg != null ? Math.round(weeklyVisitsAvg) : '-'}</div>
                      </div>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Prosečan račun' : 'Average bill'}</div>
                    <div>{typeof selected.averageBill === 'number' ? selected.averageBill : (selected.averageBill ? String(selected.averageBill) : '-')}</div>
                  </div>
                      <div>
                        <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Prosečna mesta po rezervaciji' : 'Average seats per reservation'}</div>
                        <div>{averageSeatsPerReservation != null ? Math.round(averageSeatsPerReservation) : '-'}</div>
                      </div>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Omiljena hrana' : 'Favorite food'}</div>
                    <div className="truncate">{selected.favoriteFoods || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Omiljeno piće' : 'Favorite drink'}</div>
                    <div className="truncate">{selected.favoriteDrinks || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Preferirani sto' : 'Preferred seating table'}</div>
                    <div className="truncate">{(() => {
                      const list = parsePreferredTags(selected.preferredSeating).join(', ');
                      return list || '-';
                    })()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Alergeni' : 'Allergens'}</div>
                    <div className="truncate">{selected.allergens || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
          </div>
        </div>
      </div>
      {confirmModal && (
        <DeleteConfirmationModal
          isOpen={true}
          onClose={() => setConfirmModal(null)}
          onConfirm={async () => {
            if (confirmModal.type === 'remove') {
              await handleDelete();
            } else {
              await handleResetAll();
            }
          }}
          title={
            confirmModal.type === 'remove'
              ? (currentLanguage === 'srb' ? 'Confirm Remove' : 'Confirm Remove')
              : (currentLanguage === 'srb' ? 'Reset All' : 'Reset All')
          }
          message={
            confirmModal.type === 'remove'
              ? (currentLanguage === 'srb'
                  ? `Da li sigurno želiš da obrišeš gosta „${selected?.name || ''}”? Ova akcija je trajna.`
                  : `Are you sure you want to remove guest “${selected?.name || ''}”? This action is permanent.`)
              : (currentLanguage === 'srb'
                  ? 'Are you sure you want to reset all information (except name)?'
                  : 'Are you sure you want to reset all information (except name)?')
          }
          confirmText={confirmModal.type === 'remove' ? (currentLanguage === 'srb' ? 'Delete' : 'Delete') : (currentLanguage === 'srb' ? 'Reset' : 'Reset')}
          cancelText={currentLanguage === 'srb' ? 'Otkaži' : 'Cancel'}
          type="danger"
        />
      )}
    </div>,
    portalTarget
  );
};

export default GuestbookModal;