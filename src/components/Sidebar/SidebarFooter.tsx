import React, { useContext, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserRound, Plus, BookOpen, X } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { UserContext } from "../../context/UserContext";
import { useLanguage } from "../../context/LanguageContext";
import { setAssignedWaiter } from "../../utils/waiters";
import { getZoomAdjustedScreenCoordinates } from "../../utils/zoom";
import { ThemeContext } from "../../context/ThemeContext";

interface SidebarFooterProps {
  onAddReservation: () => void;
}

const STORAGE_KEY = "respoint_waiters";

interface WaiterItem { id?: string; name: string }

const SidebarFooter: React.FC<SidebarFooterProps> = ({ onAddReservation }) => {
  const { user, activeRole } = useContext(UserContext);
  const { t, currentLanguage } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [waiters, setWaiters] = useState<WaiterItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newWaiterName, setNewWaiterName] = useState("");

  const footerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const waiterBtnRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isDraggingWaiterRef = useRef(false);

  // Global dragover to allow dropping waiter anywhere relevant
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      if (isDraggingWaiterRef.current) {
        e.preventDefault();
        try { (e as any).dataTransfer.dropEffect = 'copy'; } catch {}
      }
    };
    document.addEventListener('dragover', handleGlobalDragOver as any);
    return () => document.removeEventListener('dragover', handleGlobalDragOver as any);
  }, []);

  // Load waiters: try Supabase first (if logged in), else localStorage
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      // Try Supabase if user is available
      if (user?.id) {
        const { data, error } = await supabase
          .from('waiters')
          .select('id,name')
          .eq('user_id', user.id)
          .order('name', { ascending: true });

        if (!error && Array.isArray(data)) {
          if (!isMounted) return;
          const items: WaiterItem[] = data.map(w => ({ id: w.id as string, name: (w.name as string) || '' }));
          setWaiters(items);
          // Also mirror to localStorage as cache
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(i => i.name))); } catch {}
          return;
        }
      }

      // Fallback to localStorage cache
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const onlyStrings = parsed.filter((v) => typeof v === "string");
            if (!isMounted) return;
            setWaiters(onlyStrings.map((n: string) => ({ name: n })));
          }
        }
      } catch (_) {
        // ignore parse errors
      }
    };
    load();
    return () => { isMounted = false };
  }, [user?.id]);

  // Persist waiters
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(waiters.map(w => w.name)));
    } catch (_) {
      // ignore save errors
    }
  }, [waiters]);

  // Close on click outside
  useEffect(() => {
    if (!isPanelOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        target &&
        panelRef.current &&
        !panelRef.current.contains(target) &&
        waiterBtnRef.current &&
        !waiterBtnRef.current.contains(target)
      ) {
        setIsPanelOpen(false);
        setIsAdding(false);
        setNewWaiterName("");
        // ensure timeline returns when panel is closed via outside click
        setTimeout(() => { try { window.dispatchEvent(new CustomEvent('waiter-close')); } catch {} }, 250);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isPanelOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isPanelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPanelOpen(false);
        setIsAdding(false);
        setNewWaiterName("");
        waiterBtnRef.current?.focus();
        // ensure timeline returns when panel is closed via Escape
        setTimeout(() => { try { window.dispatchEvent(new CustomEvent('waiter-close')); } catch {} }, 250);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPanelOpen]);

  // Focus input when starting to add
  useEffect(() => {
    if (isPanelOpen && isAdding) {
      inputRef.current?.focus();
    }
  }, [isPanelOpen, isAdding]);

  const handleAddClick = () => {
    setIsAdding(true);
  };

  const commitNewWaiter = async () => {
    const trimmed = newWaiterName.trim();
    if (trimmed.length > 0) {
      // Prevent duplicates (case-insensitive)
      const exists = waiters.some(w => w.name.toLowerCase() === trimmed.toLowerCase());
      if (!exists) {
        if (user?.id) {
          const { data, error } = await supabase
            .from('waiters')
            .insert({ user_id: user.id, name: trimmed })
            .select('id,name')
            .single();
          if (!error && data) {
            setWaiters((prev) => [...prev, { id: data.id as string, name: data.name as string }]);
          } else {
            // Fallback to local-only if insert fails
            setWaiters((prev) => [...prev, { name: trimmed }]);
          }
        } else {
          setWaiters((prev) => [...prev, { name: trimmed }]);
        }
      }
    }
    setNewWaiterName("");
    setIsAdding(false);
  };

  const removeWaiter = async (item: WaiterItem, index: number) => {
    if (item.id && user?.id) {
      const { error } = await supabase.from('waiters').delete().eq('id', item.id).eq('user_id', user.id);
      if (error) {
        // If deletion fails, still remove locally to match UI intent
        setWaiters((prev) => prev.filter((_, i) => i !== index));
        return;
      }
    }
    setWaiters((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitNewWaiter();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsAdding(false);
      setNewWaiterName("");
    }
  };

  const waiterChips = useMemo(() => waiters, [waiters]);

  // ===== Custom drag support for waiter chips =====
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const startCustomDrag = (name: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDraggingWaiterRef.current = true;

    const ghost = document.createElement('div');
    ghost.className = 'fixed z-[9999] pointer-events-none px-2 py-1 rounded-full bg-[#0F243A] border border-gray-800 text-gray-200 text-xs shadow-xl';
    ghost.textContent = name;
    {
      const { x, y } = getZoomAdjustedScreenCoordinates(e.clientX, e.clientY);
      ghost.style.left = `${x + 10}px`;
      ghost.style.top = `${y + 10}px`;
    }
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    const onMove = (ev: MouseEvent) => {
      if (!ghostRef.current) return;
      const { x, y } = getZoomAdjustedScreenCoordinates(ev.clientX, ev.clientY);
      ghostRef.current.style.left = `${x + 10}px`;
      ghostRef.current.style.top = `${y + 10}px`;
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (ghostRef.current) { ghostRef.current.remove(); ghostRef.current = null; }
      isDraggingWaiterRef.current = false;

      const target = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      let node: HTMLElement | null = target;
      let reservationId: string | null = null;
      while (node && node !== document.body) {
        const rid = node.getAttribute && node.getAttribute('data-reservation-id');
        const rid2 = node.getAttribute && node.getAttribute('data-table-reservation-id');
        if (rid) { reservationId = rid; break; }
        if (rid2) { reservationId = rid2; break; }
        node = node.parentElement as HTMLElement | null;
      }
      if (reservationId) {
        try {
          setAssignedWaiter(reservationId, name);
        } catch {}
        try { window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId, name } })); } catch {}
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Manage body class to hide timeline while panel is open
  useEffect(() => {
    if (isPanelOpen) {
      try { document.body.classList.add('waiter-panel-open'); } catch {}
    } else {
      try { document.body.classList.remove('waiter-panel-open'); } catch {}
    }
    return () => { try { document.body.classList.remove('waiter-panel-open'); } catch {} };
  }, [isPanelOpen]);

  const [isGuestbookOpen, setIsGuestbookOpen] = useState(false);
  const GuestbookModalLazy = React.useMemo(() => React.lazy(() => import('./GuestbookModal')), []);

  return (
    <div ref={footerRef} className="relative p-4 border-t border-[#1E2A34]">
      {/* Spacer to reserve height for absolute buttons */}
      <div className="h-12" />

      {/* Guestbook button at 25% */}
      <button
        aria-label="Guestbook"
        className={
          `w-10 h-10 rounded-full text-white flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 hover:ring-2 absolute left-[25%] -translate-x-1/2 top-1/2 -translate-y-1/2 ` +
          (theme === 'light' ? 'focus:ring-black/40 hover:ring-black/30' : 'focus:ring-white/60 hover:ring-white/80')
        }
        onClick={() => setIsGuestbookOpen(true)}
      >
        <BookOpen size={16} strokeWidth={2} />
      </button>

      {/* Centered plus button */}
      <button
        aria-label="Add reservation"
        className="w-12 h-12 rounded-full border-2 border-[#FFB800] text-[#FFB800] flex items-center justify-center hover:bg-[#FFB800] hover:text-[#0A1929] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFB800]/60 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2"
        onClick={onAddReservation}
      >
        <Plus size={20} strokeWidth={2} />
      </button>

      {/* Waiter button at 75% (disabled for waiter role) */}
      <button
        ref={waiterBtnRef}
        aria-label="Manage waiters"
        aria-expanded={isPanelOpen}
        className={`w-10 h-10 rounded-full text-white flex items-center justify-center transition-all duration-200 focus:outline-none absolute left-[75%] -translate-x-1/2 top-1/2 -translate-y-1/2 ${activeRole === 'waiter' ? 'opacity-50 cursor-not-allowed' : `focus:ring-2 hover:ring-2 ${theme === 'light' ? 'focus:ring-black/40 hover:ring-black/30' : 'focus:ring-white/60 hover:ring-white/80'}`}`}
        onClick={() => {
          if (activeRole === 'waiter') return;
          setTimeout(() => {}, 0);
          if (!isPanelOpen) {
            try { window.dispatchEvent(new CustomEvent('waiter-open')); } catch {}
            setTimeout(() => setIsPanelOpen(true), 250);
          } else {
            setIsPanelOpen(false);
            setTimeout(() => { try { window.dispatchEvent(new CustomEvent('waiter-close')); } catch {} }, 250);
          }
        }}
      >
        <UserRound size={16} strokeWidth={2} />
      </button>

      {/* Slide-in panel above footer */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label="Waiter management panel"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="fixed left-80 right-0 bottom-0 z-[200]"
          >
            <div className="w-full h-20 flex items-center bg-[#000814] border border-gray-800 shadow-2xl px-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Plus chip (always first) */}
                <button
                  aria-label={currentLanguage === 'srb' ? 'Dodaj konobara' : 'Add waiter'}
                  onClick={handleAddClick}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-[#FFB800] text-[#FFB800] hover:bg-[#FFB800] hover:text-[#0A1929] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFB800]/60"
                >
                  <Plus size={14} />
                  <span className="text-xs">{currentLanguage === 'srb' ? 'Dodaj' : 'Add'}</span>
                </button>

                {/* Inline input when adding */}
                {isAdding && (
                  <input
                    ref={inputRef}
                    aria-label={currentLanguage === 'srb' ? 'Ime novog konobara' : 'New waiter name'}
                    type="text"
                    value={newWaiterName}
                    onChange={(e) => setNewWaiterName(e.target.value)}
                    onBlur={commitNewWaiter}
                    onKeyDown={handleInputKeyDown}
                    className="px-3 py-2 text-sm rounded border bg-[#0A1929] border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                    placeholder={currentLanguage === 'srb' ? 'Unesi ime' : 'Enter name'}
                  />)
                }

                {/* Waiter chips */}
                {waiterChips.map((w, idx) => (
                  <div
                    key={`${w.name}-${w.id || idx}`}
                    className="group relative inline-flex items-center px-2.5 py-1 rounded-full bg-[#0F243A] border border-gray-800 text-gray-200 text-xs select-none cursor-grab active:cursor-grabbing"
                    aria-label={`Waiter ${w.name}`}
                    onMouseDown={(e) => startCustomDrag(w.name, e)}
                  >
                    <span className="mr-1 inline-flex">
                      <UserRound size={12} className="text-gray-400" />
                    </span>
                    <span>{w.name}</span>
                    <button
                      aria-label={`Remove waiter ${w.name}`}
                      onClick={() => removeWaiter(w, idx)}
                      className="absolute -top-1 -right-1 z-10 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-600 text-white hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/60 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                    >
                      <X size={10} strokeWidth={2} color="#FFFFFF" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Guestbook modal */}
      {isGuestbookOpen && (
        <Suspense fallback={null}>
          <GuestbookModalLazy isOpen={isGuestbookOpen} onClose={() => setIsGuestbookOpen(false)} />
        </Suspense>
      )}
    </div>
  );
};

export default SidebarFooter;


