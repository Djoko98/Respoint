import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../common/Modal';
import { GuestbookEntry } from '../../types/guestbook';
import { guestbookService } from '../../services/guestbookService';
import { uploadGuestAvatar } from '../../services/storageService';
import { storageService } from '../../services/storageService';
import { supabase } from '../../utils/supabaseClient';
import { useLanguage } from '../../context/LanguageContext';
import { ThemeContext } from '../../context/ThemeContext';

interface GuestbookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emptyForm: Omit<GuestbookEntry, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  phone: '',
  email: '',
  avatarUrl: '',
  visitFrequency: '',
  specialRelationNote: '',
  preferredSeating: '',
  favoriteDrinks: '',
  favoriteFoods: '',
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
  const [avatarError, setAvatarError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { theme } = React.useContext(ThemeContext);
  const isLight = theme === 'light';

  const normalizeUrl = (url?: string) => {
    const u = (url || '').trim();
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
    return `https://${u}`;
  };

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const list = await guestbookService.list();
      setEntries(list);
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!selectedId) {
      setForm(emptyForm);
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
        averageBill: current.averageBill as any,
        notes: current.notes || '',
        lastVisitAt: current.lastVisitAt || ''
      });
    }
  }, [selectedId, entries]);

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
    const updated = await guestbookService.update(selectedId, {
      ...form,
      averageBill: form.averageBill ? Number(form.averageBill) : undefined
    });
    if (updated) {
      setEntries(prev => prev.map(e => (e.id === updated.id ? updated : e)));
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

  const selected = useMemo(() => entries.find(e => e.id === selectedId) || null, [entries, selectedId]);

  const avatarPreviewUrl = normalizeUrl((isEdit ? form.avatarUrl : selected?.avatarUrl) || selected?.avatarUrl);

  const panelContainerClass = isLight ? 'flex h-[70vh] bg-white text-[#0f172a]' : 'flex h-[70vh] bg-[#000814] text-white';
  const leftPanelClass = isLight ? 'w-72 border-r border-gray-200 p-3 flex flex-col bg-white' : 'w-72 border-r border-[#1E2A34] p-3 flex flex-col bg-[#000814]';
  const headerTextClass = isLight ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm';
  const addBtnClass = isLight ? 'px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50' : 'px-2 py-1 text-xs rounded border border-gray-700 text-gray-200 hover:bg-white/10 disabled:opacity-50';
  const searchInputClass = isLight ? 'w-full pl-8 pr-3 py-2 text-sm rounded bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400' : 'w-full pl-8 pr-3 py-2 text-sm rounded bg-[#0A1929] border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600';
  const rightPanelClass = isLight ? 'flex-1 p-4 overflow-y-auto light-transparent-scrollbar bg-white' : 'flex-1 p-4 overflow-y-auto light-transparent-scrollbar bg-[#000814]';
  const bigAvatarClass = isLight ? 'w-20 h-20 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center text-gray-700' : 'w-20 h-20 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center';
  const nameClass = isLight ? 'text-2xl text-gray-900 font-medium truncate' : 'text-2xl text-white font-medium truncate';
  const vipBtnClass = isLight ? `p-1 rounded ${selected?.isVip ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'}` : `p-1 rounded ${selected?.isVip ? 'text-yellow-500' : 'text-gray-500 hover:text-gray-300'}`;
  const actionBtnClass = isLight ? 'px-2 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100' : 'px-2 py-1.5 text-xs rounded border border-gray-700 text-gray-200 hover:bg-white/10';
  const statsBorderClass = isLight ? 'border-t border-gray-200 pt-3' : 'border-t border-gray-800 pt-3';
  const statsTitleClass = isLight ? 'text-gray-500 text-sm mb-2' : 'text-gray-400 text-sm mb-2';
  const statsGridText = isLight ? 'text-sm text-gray-700' : 'text-sm text-gray-300';
  const tagChipClass = isLight ? 'px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs flex items-center gap-1' : 'px-2 py-0.5 rounded-full bg-white/10 text-gray-200 text-xs flex items-center gap-1';
  const tagRemoveClass = isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-white';
  const tagAddBtnClass = isLight ? 'px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100' : 'px-2 py-1 text-xs rounded-full border border-gray-700 text-gray-200 hover:bg-white/10';
  const tagInputClass = isLight ? 'px-3 py-1 text-xs rounded-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400' : 'px-3 py-1 text-xs rounded-full bg-[#0A1929] border border-gray-800 text-white placeholder-gray-500';
  const inputClass = isLight ? 'px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400' : 'px-3 py-2 rounded bg-[#0A1929] border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600';
  const dangerBtnClass = isLight ? 'px-3 py-2 text-sm rounded bg-red-50 text-red-700 hover:bg-red-100' : 'px-3 py-2 text-sm rounded bg-red-900/40 text-red-300 hover:bg-red-900/60';
  const footerBtnClass = isLight ? 'px-3 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100' : 'px-3 py-2 text-sm rounded border border-gray-700 text-gray-300 hover:bg-white/10';
  const saveBtnClass = isLight ? 'px-3 py-2 text-sm rounded bg-blue-600 text-blue-100 hover:bg-blue-500 disabled:opacity-50' : 'px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={currentLanguage === 'srb' ? 'Knjiga gostiju' : 'Guestbook'} size="xl">
      <div className={panelContainerClass}>
        {/* Left list */}
        <div className={leftPanelClass}>
          <div className="flex items-center justify-between mb-2">
            <div className={`flex items-center gap-2 ${headerTextClass}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 4h18M3 10h18M3 16h18"/></svg>
              <span>{currentLanguage === 'srb' ? 'Gosti' : 'Guests'}</span>
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
          <div className="flex-1 overflow-y-auto light-transparent-scrollbar space-y-1">
            {filtered.map(e => {
              const itemClass = isLight
                ? (selectedId === e.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50')
                : (selectedId === e.id ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5');
              return (
                <button
                  key={e.id}
                  onClick={() => { setSelectedId(e.id); setIsEdit(false); }}
                  className={`w-full text-left px-2 py-2 rounded text-sm flex items-start gap-2 ${itemClass}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${isLight ? 'bg-gray-300 text-gray-700' : 'bg-gray-700'}`}>
                    {normalizeUrl(e.avatarUrl) ? <img src={normalizeUrl(e.avatarUrl)} alt="avatar" className="w-full h-full object-cover"/> : <span className="text-xs">{(e.name|| (currentLanguage === 'srb' ? 'Bez imena' : 'Unnamed')).slice(0,1)}</span>}
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
            <div className="max-w-3xl space-y-3">
              {/* Header with avatar, name, contact, VIP */}
              <div className="flex items-start gap-4">
                <div className={bigAvatarClass}>
                  {avatarPreviewUrl && !avatarError ? (
                    <img src={avatarPreviewUrl} alt="" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
                  ) : (
                    <span className="text-lg text-gray-500">{(selected.name||'?').slice(0,1)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
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
                    <button
                      className={actionBtnClass}
                      title={currentLanguage === 'srb' ? 'Dodaj u rezervaciju' : 'Add to reservation'}
                      onClick={async () => {
                        try {
                          const payload = {
                            guestName: selected.name || '',
                            phone: selected.phone || ''
                          };
                          localStorage.setItem(PREFILL_KEY, JSON.stringify(payload));
                        } catch {}
                        // Increment total visits and set last visit date to today
                        try {
                          const newCount = (selected.totalVisits || 0) + 1;
                          const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
                          const updated = await guestbookService.update(selected.id, { totalVisits: newCount, lastVisitAt: today });
                          if (updated) setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
                        } catch {}
                        // Close guestbook first, then open reservation form
                        try { onClose(); } catch {}
                        setTimeout(() => {
                          try { window.dispatchEvent(new CustomEvent('respoint-open-reservation')); } catch {}
                        }, 0);
                      }}
                    >
                      {currentLanguage === 'srb' ? 'Dodaj u rezervaciju' : 'Add to reservation'}
                    </button>
                  </div>
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

              {/* Stats grid */}
              <div className={statsBorderClass}>
                <div className={statsTitleClass}>{currentLanguage === 'srb' ? 'Statistika' : 'Statistics'}</div>
                <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 ${statsGridText}`}>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Poslednja poseta' : 'Last visit'}</div>
                    <div>{selected.lastVisitAt ? new Date(selected.lastVisitAt).toLocaleDateString('en-GB') : '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Ukupno poseta' : 'Total visits'}</div>
                    <div>{selected.totalVisits ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Prosečan račun' : 'Average bill'}</div>
                    <div>{typeof selected.averageBill === 'number' ? selected.averageBill : (selected.averageBill ? String(selected.averageBill) : '-')}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Omiljeno piće' : 'Favorite drink'}</div>
                    <div className="truncate">{selected.favoriteDrinks || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{currentLanguage === 'srb' ? 'Omiljena hrana' : 'Favorite food'}</div>
                    <div className="truncate">{selected.favoriteFoods || '-'}</div>
                  </div>
                </div>

                {/* Tags list and add */}
                <div className="mt-3">
                  <div className={isLight ? 'text-gray-500 text-xs mb-1' : 'text-gray-400 text-xs mb-1'}>{currentLanguage === 'srb' ? 'Tagovi' : 'Tags'}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selected.tags && selected.tags.map(tag => (
                      <span key={tag} className={tagChipClass}>
                        {tag}
                        <button
                          className={tagRemoveClass}
                          onClick={async () => {
                            if (!selectedId) return;
                            const updated = await guestbookService.update(selectedId, { tags: (selected.tags || []).filter(t => t !== tag) });
                            if (updated) setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
                          }}
                          title={currentLanguage === 'srb' ? 'Ukloni' : 'Remove'}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {!isAddingTag ? (
                      <button
                        className={tagAddBtnClass}
                        onClick={() => { setIsAddingTag(true); setTimeout(() => tagInputRef.current?.focus(), 0); }}
                        title={currentLanguage === 'srb' ? 'Dodaj tag' : 'Add tag'}
                      >
                        +
                      </button>
                    ) : (
                      <input
                        ref={tagInputRef}
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onBlur={() => { if (!newTag) setIsAddingTag(false); }}
                        onKeyDown={async (e) => {
                          if (e.key === 'Escape') { setIsAddingTag(false); setNewTag(''); return; }
                          if (e.key === 'Enter') {
                            const tag = newTag.trim();
                            if (!tag) { setIsAddingTag(false); return; }
                            if (!selectedId) return;
                            const current = selected?.tags || [];
                            if (current.includes(tag)) { setNewTag(''); setIsAddingTag(false); return; }
                            const updated = await guestbookService.update(selectedId, { tags: [...current, tag] });
                            if (updated) setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
                            setNewTag('');
                            setIsAddingTag(false);
                          }
                        }}
                        placeholder={currentLanguage === 'srb' ? 'Dodaj tag' : 'Add tag'}
                        className={tagInputClass}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Ime' : 'Name'}</span>
                  <input className={inputClass}
                         value={form.name}
                         onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </label>
                <div className="flex flex-col" role="group" aria-label="Profile picture">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Profilna slika' : 'Profile picture'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      className={isLight ? 'px-2 py-2 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100' : 'px-2 py-2 text-xs rounded border border-gray-700 text-gray-200 hover:bg-white/10'}
                      title={currentLanguage === 'srb' ? 'Otpremi sa računara' : 'Upload from file'}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {currentLanguage === 'srb' ? 'Otpremi' : 'Upload'}
                    </button>
                    {form.avatarUrl && (
                      <button
                        className={isLight ? 'px-2 py-2 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50' : 'px-2 py-2 text-xs rounded border border-gray-700 text-red-300 hover:bg-red-900/30'}
                        title={currentLanguage === 'srb' ? 'Ukloni profilnu' : 'Remove avatar'}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const currentUrl = form.avatarUrl;
                          setForm(f => ({ ...f, avatarUrl: '' }));
                          if (selected) await guestbookService.update(selected.id, { avatarUrl: '' });
                          // Try delete from storage if it's ours
                          if (currentUrl.includes('/guest-avatars/')) {
                            try { await storageService.deleteGuestAvatar(currentUrl); } catch {}
                          }
                        }}
                      >
                        {currentLanguage === 'srb' ? 'Ukloni' : 'Remove'}
                      </button>
                    )}
                  </div>
                </div>
                {/* hidden file input for avatar upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    if (!selected) return;
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const { data: { user } } = await supabase.auth.getUser();
                    const userId = user?.id || 'local';
                    const publicUrl = await uploadGuestAvatar(userId, selected.id, file);
                    if (publicUrl) {
                      setForm(f => ({ ...f, avatarUrl: publicUrl }));
                      const updated = await guestbookService.update(selected.id, { avatarUrl: publicUrl });
                      if (updated) setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
                    }
                    // reset input value to allow re-upload same file later
                    (e.target as HTMLInputElement).value = '';
                  }}
                />
                <label className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Telefon' : 'Phone'}</span>
                  <input className={inputClass}
                         value={form.phone}
                         onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </label>
                <label className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">Email</span>
                  <input className={inputClass}
                         value={form.email}
                         onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </label>
                <label className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Učestalost poseta' : 'Visit frequency'}</span>
                  <input className={inputClass}
                         value={form.visitFrequency}
                         onChange={e => setForm(f => ({ ...f, visitFrequency: e.target.value }))} />
                </label>
                <label className="col-span-2 flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Posebna veza' : 'Special relation'}</span>
                  <input className={inputClass}
                         value={form.specialRelationNote}
                         onChange={e => setForm(f => ({ ...f, specialRelationNote: e.target.value }))} />
                </label>
                <label className="col-span-2 flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Omiljeno sedenje' : 'Preferred seating'}</span>
                  <input className={inputClass}
                         value={form.preferredSeating}
                         onChange={e => setForm(f => ({ ...f, preferredSeating: e.target.value }))} />
                </label>
                <label className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Omiljena pića' : 'Favorite drinks'}</span>
                  <input className={inputClass}
                         value={form.favoriteDrinks}
                         onChange={e => setForm(f => ({ ...f, favoriteDrinks: e.target.value }))} />
                </label>
                <label className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Omiljena hrana' : 'Favorite foods'}</span>
                  <input className={inputClass}
                         value={form.favoriteFoods}
                         onChange={e => setForm(f => ({ ...f, favoriteFoods: e.target.value }))} />
                </label>
                <label className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Prosečan račun' : 'Average bill'}</span>
                  <input type="number" min={0} step={1}
                         className={`${inputClass} hide-number-arrows`}
                         value={form.averageBill ?? ''}
                         onChange={e => setForm(f => ({ ...f, averageBill: e.target.value as any }))} />
                </label>
                <label className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Poslednja poseta' : 'Last visit'}</span>
                  <input type="date"
                         className={inputClass}
                         value={form.lastVisitAt ? form.lastVisitAt.slice(0,10) : ''}
                         onChange={e => setForm(f => ({ ...f, lastVisitAt: e.target.value }))} />
                </label>
                <label className="col-span-2 flex flex-col">
                  <span className="text-gray-500 text-xs mb-1">{currentLanguage === 'srb' ? 'Beleške / želje' : 'Notes / wishes'}</span>
                  <textarea rows={4}
                            className={inputClass}
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </label>
              </div>
              <div className={isLight ? 'flex justify-between pt-2 border-t border-gray-200 mt-2' : 'flex justify-between pt-2 border-t border-gray-800 mt-2'}>
                <button onClick={handleDelete} className={dangerBtnClass}>{currentLanguage === 'srb' ? 'Obriši' : 'Delete'}</button>
                <div className="flex gap-2">
                  <button onClick={onClose} className={footerBtnClass}>{currentLanguage === 'srb' ? 'Zatvori' : 'Close'}</button>
                  <button onClick={handleSave} disabled={isSaving} className={saveBtnClass}>{currentLanguage === 'srb' ? 'Sačuvaj' : 'Save'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default GuestbookModal;


