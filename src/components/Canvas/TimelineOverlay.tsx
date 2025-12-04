import React, { useContext, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReservationContext } from '../../context/ReservationContext';
import { ZoneContext } from '../../context/ZoneContext';
import { LayoutContext } from '../../context/LayoutContext';
import { useLanguage } from '../../context/LanguageContext';
import { reservationAdjustmentsService } from '../../services/reservationAdjustmentsService';
import { ThemeContext } from '../../context/ThemeContext';

interface TimelineOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
}

// Map reservation color or status to display color
const getReservationColor = (reservation: any) => {
  if (reservation.color) return reservation.color;
  switch (reservation.status) {
    case 'arrived': return '#22c55e';
    case 'confirmed': return '#3b82f6';
    case 'not_arrived': return '#ef4444';
    case 'cancelled': return '#6b7280';
    default: return '#f97316';
  }
};

// Estimate reservation duration (minutes) per request:
// - 2 guests => 60 min
// - 3-4 guests => 120 min
// - 5+ guests => 150 min
const estimateDurationMinutes = (numGuests: number | undefined) => {
  const guests = typeof numGuests === 'number' ? numGuests : 2;
  if (guests <= 2) return 60;
  if (guests <= 4) return 120;
  return 150;
};

// Convert "HH:mm" to minutes from start of day
const timeStringToMinutes = (time: string) => {
  try {
    const parts = String(time || '').split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    const hh = Math.max(0, Math.min(23, Math.floor(h)));
    const mm = Math.max(0, Math.min(59, Math.floor(m)));
    return hh * 60 + mm;
  } catch {
    return 0;
  }
};

// Snap minutes to nearest step (default 5 minutes)
const snapMinutes = (minutes: number, step: number = 5) => {
  return Math.round(minutes / step) * step;
};

// Map minutes [0..1439] to percentage position along a 24h track (00 -> 24)
const minutesToPercent = (minutesOfDay: number) => (minutesOfDay / 1440) * 100;

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const TimelineOverlay: React.FC<TimelineOverlayProps> = ({ isOpen, onClose, selectedDate }) => {
  const { t } = useLanguage();
  const { reservations, updateReservation } = useContext(ReservationContext);
  const { currentZone } = useContext(ZoneContext);
  const { zoneLayouts } = useContext(LayoutContext);
  const { theme } = React.useContext(ThemeContext);
  // Local, lightweight drag state (avoids recomputing blocksByTable on every mousemove)
  const [draggingBlock, setDraggingBlock] = useState<null | { id: string; startMin: number; endMin: number }>(null);
  const dragRafRef = useRef<number>(0);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);

  // Zoom: 1/4 (far), 1/8 (closer), 1/12 (closest)
  const [zoom, setZoom] = useState<'1/4' | '1/6' | '1/8' | '1/12' | '1/16'>('1/4');
  const zoomScale = useMemo(() => {
    // Explicit mapping to make steps visibly distinct
    switch (zoom) {
      case '1/4': return 1;    // baseline
      case '1/6': return 1.7;  // more noticeable than 1.5
      case '1/8': return 2;
      case '1/12': return 3;
      case '1/16': return 4;
      default: return 1;
    }
  }, [zoom]);
  const minorStepMinutes = useMemo(() => {
    const denom = Number(zoom.split('/')[1]);
    if (denom >= 16) return 10;
    if (denom >= 12) return 15;
    if (denom >= 8) return 30;
    return 60; // 1/4 and 1/6
  }, [zoom]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {}
    };
  }, [isOpen, onClose]);

  // Filter reservations for the selected day
  const dateKey = formatDate(selectedDate || new Date());
  const todaysReservations = useMemo(() => {
    const allowed: string[] = ['waiting', 'confirmed', 'arrived', 'pending'];
    return reservations.filter(r =>
      r.date === dateKey && allowed.includes((r.status as unknown as string))
    );
  }, [reservations, dateKey]);

  // Manual block adjustments (per reservation id) - start/end in minutes from 00:00
  const [blockAdjustments, setBlockAdjustments] = useState<Record<string, { start: number; end: number }>>({});
  // Load saved adjustments for this date (DB first, fallback to localStorage) - shared with sidebar timers
  useEffect(() => {
    let didCancel = false;
    (async () => {
      const fromDb = await reservationAdjustmentsService.getByDate(dateKey);
      if (!didCancel && fromDb && Object.keys(fromDb).length > 0) {
        setBlockAdjustments(fromDb as any);
        return;
      }
      try {
        const key = `respoint-duration-adjustments:${dateKey}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (!didCancel) setBlockAdjustments(parsed);
          }
        } else {
          if (!didCancel) setBlockAdjustments({});
        }
      } catch {
        if (!didCancel) setBlockAdjustments({});
      }
    })();
    return () => { didCancel = true; };
  }, [dateKey]);

  // Live adjustments listener (respond to external +15 extensions or edits)
  useEffect(() => {
    if (!isOpen) return;
    let isActive = true;
    const reloadAdjustments = async () => {
      if (!isActive) return;
      const fromDb = await reservationAdjustmentsService.getByDate(dateKey);
      if (isActive && fromDb && Object.keys(fromDb).length > 0) {
        setBlockAdjustments(fromDb as any);
        return;
      }
      try {
        const key = `respoint-duration-adjustments:${dateKey}`;
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : {};
        if (isActive) setBlockAdjustments(parsed || {});
      } catch {
        if (isActive) setBlockAdjustments({});
      }
    };
    const handler = (e: any) => {
      if (!e?.detail || e.detail.date !== dateKey) return;
      reloadAdjustments();
    };
    window.addEventListener('respoint-duration-adjustments-changed', handler as any);
    return () => {
      isActive = false;
      window.removeEventListener('respoint-duration-adjustments-changed', handler as any);
    };
  }, [isOpen, dateKey]);
  // Persist adjustments and notify listeners (sidebar seated timers)
  useEffect(() => {
    try {
      const key = `respoint-duration-adjustments:${dateKey}`;
      localStorage.setItem(key, JSON.stringify(blockAdjustments || {}));
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('respoint-duration-adjustments-changed', { detail: { date: dateKey } }));
    } catch {}
  }, [blockAdjustments, dateKey]);
  const MIN_BLOCK_MINUTES = 15;

  // Tables to display (current zone only for now)
  const tables = useMemo(() => {
    const layout = currentZone ? zoneLayouts[currentZone.id] : null;
    // Only real tables; exclude chairs
    const list = (layout?.tables || []).filter((t: any) => t?.type !== 'chair');
    return [...list].sort((a, b) => {
      const an = a.number ?? 0;
      const bn = b.number ?? 0;
      return an - bn;
    });
  }, [currentZone?.id, zoneLayouts]);

  // Helper: resolve reservation's table reference to a table number within current zone
  const resolveTableInCurrentZone = useMemo(() => {
    const allZoneTables: Array<{ zoneId: string; table: any }> = [];
    Object.entries(zoneLayouts || {}).forEach(([zid, layout]) => {
      (layout?.tables || []).forEach((t: any) => allZoneTables.push({ zoneId: zid, table: t }));
    });
    return (tableIdRaw: string | number, reservationZoneId?: string | null) => {
      if (!currentZone) return null;
      const currentTables = (zoneLayouts?.[currentZone.id]?.tables || []) as any[];
      const ref = String(tableIdRaw);

      // 1) Direct match by ID in CURRENT zone
      let direct = currentTables.find(t => String(t.id) === ref);
      if (direct) return direct;

      // 2) If ref is numeric-like, try by number in CURRENT zone
      const numeric = /^\d+$/.test(ref) ? ref : null;
      if (numeric) {
        const byNumberInCurrent = currentTables.find(t => String(t.number ?? '') === numeric);
        if (byNumberInCurrent) return byNumberInCurrent;
      }

      // 3) Find the table anywhere by ID or number to discover its number/name,
      //    then map that to a table in CURRENT zone by number/name
      let anywhere =
        allZoneTables.find(x => String(x.table.id) === ref)?.table ||
        allZoneTables.find(x => String(x.table.number ?? '') === ref)?.table ||
        null;

      if (anywhere) {
        const byNumber = currentTables.find(t => String(t.number ?? '') === String(anywhere.number ?? ''));
        if (byNumber) return byNumber;
        if ((anywhere.name ?? '').trim() !== '') {
          const byName = currentTables.find(t => String(t.name ?? '') === String(anywhere.name ?? ''));
          if (byName) return byName;
        }
      }

      // 4) If rezervacija je za trenutnu zonu, probaj još jednom po broju (za slučaj drift-a)
      if (reservationZoneId && reservationZoneId === currentZone.id && numeric) {
        const byNumber = currentTables.find(t => String(t.number ?? '') === numeric);
        if (byNumber) return byNumber;
      }

      return null;
    };
  }, [zoneLayouts, currentZone?.id]);

  // Build per-table reservation blocks with positions
  const blocksByTable: Record<string | number, Array<{
    id: string;
    left: number; // %
    width: number; // %
    color: string;
    label: string;
    time: string;
    guests: number;
    startMin: number;
    endMin: number;
    serviceType?: string;
    status?: string;
    isVip?: boolean;
  }>> = useMemo(() => {
    const map: Record<string | number, Array<any>> = {};
    for (const r of todaysReservations) {
      const defaultStart = snapMinutes(timeStringToMinutes(r.time));
      const defaultEnd = snapMinutes(Math.min(1440, defaultStart + estimateDurationMinutes(r.numberOfGuests)));
      const adj = blockAdjustments[r.id];
      const startMin = snapMinutes(Math.max(0, Math.min(1440, adj?.start ?? defaultStart)));
      const endMin = snapMinutes(Math.max(startMin + MIN_BLOCK_MINUTES, Math.min(1440, adj?.end ?? defaultEnd)));
      const left = minutesToPercent(snapMinutes(startMin));
      const right = minutesToPercent(snapMinutes(endMin));
      const width = Math.max(0.5, right - left); // min visual width
      const color = getReservationColor(r);
      const block = {
        id: r.id,
        left,
        width,
        color,
        label: r.guestName || '',
        time: r.time,
        guests: r.numberOfGuests || 0,
        startMin,
        endMin,
        serviceType: (r as any).notes || (r as any).serviceType || '',
        status: (r as any).status || 'waiting',
        isVip: !!r.isVip
      };
      const tableIds: any[] = Array.isArray(r.tableIds) ? r.tableIds : [];
      for (const tableIdRaw of tableIds) {
        const tableObj = resolveTableInCurrentZone(tableIdRaw, (r as any).zoneId || null);
        if (!tableObj) continue;
        const key: string | number = (typeof tableObj.number === 'number' ? tableObj.number : tableObj.id);
        if (!map[key]) map[key] = [];
        map[key].push(block);
      }
    }
    // Optional: sort blocks per table by left
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.left - b.left);
    }
    return map;
  }, [todaysReservations, tables, blockAdjustments]);

  // Hours for header marks (00..23)
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  // Current time indicator (updates periodically)
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000); // update every 30s
    return () => clearInterval(id);
  }, []);
  const showNow = selectedDate && formatDate(selectedDate) === formatDate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowPercent = showNow ? minutesToPercent(nowMinutes) : 0;
  const nowLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  // Helper: center the "now" line in the scroll viewport
  const centerNowInView = React.useCallback((smooth: boolean) => {
    if (!showNow) return;
    const wrapper = scrollWrapperRef.current;
    if (!wrapper) return;
    // Use scrollWidth to account for zoomed content width
    const contentWidth = Math.max(wrapper.scrollWidth, wrapper.clientWidth);
    const visible = wrapper.clientWidth || 1;
    const nowX = (nowMinutes / 1440) * contentWidth;
    const target = Math.max(0, Math.min(contentWidth - visible, nowX - visible / 2));
    try {
      if (smooth) {
        wrapper.scrollTo({ left: target, behavior: 'smooth' });
      } else {
        wrapper.scrollLeft = target;
      }
    } catch {
      wrapper.scrollLeft = target;
    }
  }, [nowMinutes, showNow]);

  // Center on open and when zoom changes
  useEffect(() => {
    if (!isOpen) return;
    // wait a frame for layout
    const id = requestAnimationFrame(() => centerNowInView(false));
    return () => cancelAnimationFrame(id);
  }, [isOpen, zoomScale, centerNowInView]);

  // Keep following current time while overlay is open (every 30s update)
  useEffect(() => {
    if (!isOpen) return;
    centerNowInView(true);
  }, [nowMinutes, centerNowInView, isOpen]);

  // Total reserved guests per table for the selected date (current zone)
  const reservedGuestsByTable = useMemo(() => {
    const map: Record<string | number, number> = {};
    todaysReservations.forEach(r => {
      const tableIds: any[] = Array.isArray(r.tableIds) ? r.tableIds : [];
      tableIds.forEach(idRaw => {
        const t = resolveTableInCurrentZone(idRaw, (r as any).zoneId || null);
        if (!t) return;
        const key: string | number = (typeof t.number === 'number' ? t.number : t.id);
        map[key] = (map[key] || 0) + (r.numberOfGuests || 0);
      });
    });
    return map;
  }, [todaysReservations, resolveTableInCurrentZone]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'tween', duration: 0.25 }}
          className={`absolute inset-0 z-[1200] ${
            theme === 'light' ? 'bg-white border-t border-gray-200' : 'bg-[#000814] border-t border-[#1E2A34]'
          } flex flex-col`}
          onDoubleClick={(e) => { e.stopPropagation(); }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-3 border-b ${theme === 'light' ? 'border-gray-200' : 'border-[#1E2A34]'}`}>
            <div className="flex items-center gap-3">
              <div className={`${theme === 'light' ? 'text-black/90' : 'text-white/90'} text-sm tracking-wide`}>
                {dateKey}
              </div>
              <div className="text-gray-500 text-xs">
                {currentZone?.name || '-'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs hidden md:inline">{/* hint */}Esc</span>
              <button
                aria-label="Close timeline"
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  theme === 'light'
                    ? 'bg-white border border-gray-200 text-slate-900 hover:bg-gray-50'
                    : 'bg-[#0A1929] border border-[#1E2A34] text-white hover:bg-[#0f253b]'
                }`}
                onClick={onClose}
              >
                {t('close')}
              </button>
            </div>
          </div>

          {/* Scrollable area containing axis + rows */}
          <div className="relative flex-1 min-w-0 min-h-0">
            <div ref={scrollWrapperRef} className="timeline-scroll-wrapper account-settings-scrollbar">
              {/* Content width/height area */}
              <div className="relative timeline-grid" style={{ width: `${zoomScale * 100}%` }}>
                {/* Top axis with sticky left column headers */}
                <div className={`sticky top-0 z-[95] h-8 border-b ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#000814] border-[#1E2A34]'} flex`}>
                  {/* Sticky headers for left columns (Tables | Guests) */}
                  <div className={`sticky left-0 z-10 w-40 h-full ${
                      theme === 'light' ? 'bg-white border-r border-gray-200' : 'bg-[#000814] border-r border-[#1E2A34]'
                    } flex`}>
                    <div className="w-24 flex items-center justify-center">
                      <span className={`text-[11px] ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-wide text-center`}>Tables</span>
                    </div>
                    <div className={`w-16 px-2 border-l ${theme === 'light' ? 'border-gray-200' : 'border-[#1E2A34]'} flex items-center justify-center`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </div>
                  </div>
                  {/* Hour labels track */}
                  <div className="relative flex-1 mr-0 h-full">
                    {showNow && (
                      <div
                        className="absolute inset-y-0 left-0 z-[1] pointer-events-none"
                        style={nowPercent <= 0 ? { width: 0 } : { width: `${nowPercent}%`, background: theme === 'light' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0,0,0,0.4)' }}
                      />
                    )}
                    {hours.map((h) => {
                      const left = minutesToPercent(h * 60);
                      const isZero = h === 0;
                      if (isZero) return null; // Hide 00h label
                      return (
                        <div key={`h-${h}`} className="absolute top-0 h-full flex items-center"
                          style={{ left: `${left}%`, transform: 'translateX(-50%)' }}>
                          <div className={`text-[10px] ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} text-center`}>
                            {h.toString().padStart(2, '0')}h
                          </div>
                        </div>
                      );
                    })}
                    {showNow && (
                      <div className="absolute inset-y-0 z-[5] pointer-events-none" style={nowPercent <= 0 ? { left: 0, transform: 'none' } : { left: `${nowPercent}%`, transform: 'translateX(-50%)' }}>
                        <div className="w-[1px] h-full bg-blue-400/60" />
                        {/* Time label inside header row */}
                        <div className="absolute inset-y-0 flex items-center" style={{ left: 0, transform: 'translateX(-50%)' }}>
                          <div className="px-2 py-0.5 rounded border text-[11px] select-none"
                               style={{
                                 backgroundColor: '#3b82f6', // solid blue-500
                                 borderColor: '#60a5fa',      // blue-400
                                 color: '#ffffff',            // white text
                                 boxShadow: '0 1px 2px rgba(0,0,0,0.25)'
                               }}>
                            {nowLabel}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Grid + rows */}
                <div className="relative">
                  {/* Grid vertical lines + now indicator */}
                  <div className="absolute top-0 bottom-0 left-40 right-0 pointer-events-none">
                    <div className="relative h-full w-full">
                      {showNow && (
                        <div
                          className="absolute top-0 bottom-0 left-0 z-[1]"
                          style={nowPercent <= 0 ? { width: 0 } : { width: `${nowPercent}%`, background: theme === 'light' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0,0,0,0.4)' }}
                        />
                      )}
                      {/* Minor grid lines */}
                      {Array.from({ length: (1440 / minorStepMinutes) + 1 }, (_, i) => i * minorStepMinutes).map((min) => {
                        const left = minutesToPercent(min);
                        const isHour = min % 60 === 0;
                        return (
                          <div key={`g-${min}`} className="absolute top-0 bottom-0"
                            style={min === 0 ? { left: 0, transform: 'none' } : { left: `${left}%`, transform: 'translateX(-50%)' }}>
                            <div className={`w-px h-full ${isHour ? (theme === 'light' ? 'bg-gray-200' : 'bg-[#1E2A34]') : (theme === 'light' ? 'bg-gray-100' : 'bg-[#0f1a23]')}`} />
                          </div>
                        );
                      })}
                      {showNow && (
                        <div className="absolute top-0 bottom-0 z-[5] pointer-events-none" style={nowPercent <= 0 ? { left: 0, transform: 'none' } : { left: `${nowPercent}%`, transform: 'translateX(-50%)' }}>
                          <div className="w-[2px] h-full bg-blue-400/60" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="relative">
                    {tables.map(table => {
                      const blocks = blocksByTable[typeof table.number === 'number' ? table.number : table.id] || [];
                      return (
                        <div key={table.id} className={`relative flex items-stretch h-12 border-b ${theme === 'light' ? 'border-gray-200' : 'border-[#0f1a23]'}`}>
                          {/* Sticky left columns (total width = w-40 to match grid offset) */}
                          <div className={`sticky left-0 z-10 w-40 ${theme === 'light' ? 'bg-white border-r border-gray-200' : 'bg-[#000814] border-r border-[#0f1a23]'}`}>
                            <div className="h-full w-full flex">
                              {/* Column 1: Table number/name */}
                              <div className="w-24 flex items-center justify-center">
                                <div className="leading-tight text-center">
                                  <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} truncate`}>
                                    {table.number ?? table.name ?? '—'}
                                  </div>
                                  <div className={`text-[10px] ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>Table</div>
                                </div>
                              </div>
                              {/* Column 2: Reserved guests count (if any) */}
                              <div className={`w-16 px-2 border-l ${theme === 'light' ? 'border-gray-200' : 'border-[#0f1a23]'} flex items-center justify-center`}>
                                {reservedGuestsByTable[typeof table.number === 'number' ? table.number : table.id] ? (
                                  <div className={`flex items-center gap-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                      <circle cx="9" cy="7" r="4"/>
                                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                    <span className="text-xs">{reservedGuestsByTable[typeof table.number === 'number' ? table.number : table.id]}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-600">—</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Blocks layer */}
                          <div className="relative flex-1">
                            <div className="relative h-full w-full rp-row-track">
                              {blocks.map(b => {
                                const currentStart = draggingBlock?.id === b.id ? draggingBlock.startMin : b.startMin;
                                const currentEnd = draggingBlock?.id === b.id ? draggingBlock.endMin : b.endMin;
                                const startRounded = Math.round(currentStart);
                                const endRounded = Math.round(currentEnd);
                                const startLabelHr = Math.floor(startRounded / 60).toString().padStart(2, '0');
                                const startLabelMin = (startRounded % 60).toString().padStart(2, '0');
                                const endLabelHr = Math.floor(endRounded / 60).toString().padStart(2, '0');
                                const endLabelMin = (endRounded % 60).toString().padStart(2, '0');
                                const timeRange = `${startLabelHr}:${startLabelMin}–${endLabelHr}:${endLabelMin}`;
                                const prevBlockEnd = (() => {
                                  let maxEnd = 0;
                                  for (const other of blocks) {
                                    if (other.id === b.id) continue;
                                    if (other.endMin <= b.startMin) {
                                      if (other.endMin > maxEnd) maxEnd = other.endMin;
                                    }
                                  }
                                  return maxEnd;
                                })();
                                const nextBlockStart = (() => {
                                  let minStart = 1440;
                                  for (const other of blocks) {
                                    if (other.id === b.id) continue;
                                    if (other.startMin >= b.endMin && other.startMin < minStart) {
                                      minStart = other.startMin;
                                    }
                                  }
                                  return minStart;
                                })();
                                return (
                                  <div
                                    key={`${table.id}-${b.id}-${b.left}`}
                                    className={`absolute top-1 bottom-1 rounded-md border ${theme === 'light' ? 'border-gray-200' : 'border-black/30'} shadow-sm overflow-visible group cursor-grab active:cursor-grabbing`}
                                    style={{
                                      // Use local dragging override for smooth visuals without recomputing maps
                                      left: (() => {
                                        const start = draggingBlock?.id === b.id ? draggingBlock.startMin : b.startMin;
                                        const pct = minutesToPercent(snapMinutes(start));
                                        return `${pct}%`;
                                      })(),
                                      width: (() => {
                                        const start = draggingBlock?.id === b.id ? draggingBlock.startMin : b.startMin;
                                        const end = draggingBlock?.id === b.id ? draggingBlock.endMin : b.endMin;
                                        const left = minutesToPercent(snapMinutes(start));
                                        const right = minutesToPercent(snapMinutes(end));
                                        return `${Math.max(0.05, right - left)}%`;
                                      })(),
                                      backgroundColor: b.color,
                                      willChange: 'left, width'
                                    }}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      try {
                                        window.dispatchEvent(new CustomEvent('respoint-open-reservation', { detail: { reservationId: b.id } }));
                                      } catch {}
                                    }}
                                    onMouseDown={(e) => {
                                      if (e.button !== 0) return;
                                      // Ignore if grabbing a resize handle
                                      const target = e.target as HTMLElement;
                                      if (target && target.closest('.cursor-ew-resize')) return;
                                      // Disable moving entire block for arrived reservations
                                      if (b.status === 'arrived') return;
                                      e.preventDefault();
                                      const track = (e.currentTarget as HTMLElement).closest('.rp-row-track') as HTMLElement | null;
                                      if (!track) return;
                                      const trackRect = track.getBoundingClientRect();
                                      const trackWidth = Math.max(1, (track as HTMLElement).clientWidth || trackRect.width || 0);
                                      const pixelsToMinutes = 1440 / trackWidth;
                                      // Normalize initial start/end to avoid partial/NaN data
                                      const initialStart = snapMinutes(Math.max(0, Math.min(1440, (blockAdjustments[b.id]?.start ?? b.startMin))));
                                      const initialEnd = snapMinutes(Math.max(initialStart + MIN_BLOCK_MINUTES, Math.min(1440, (blockAdjustments[b.id]?.end ?? b.endMin))));
                                      const widthMin = Math.max(MIN_BLOCK_MINUTES, initialEnd - initialStart);
                                      const startPointerMinRaw = (e.clientX - trackRect.left) * pixelsToMinutes;
                                      const startPointerMin = Math.max(0, Math.min(1440, Number.isFinite(startPointerMinRaw) ? startPointerMinRaw : 0));
                                      // UX: prevent selection while dragging
                                      const prevSelect = document.body.style.userSelect;
                                      const prevCursor = document.body.style.cursor;
                                      document.body.style.userSelect = 'none';
                                      document.body.style.cursor = 'grabbing';
                                      let frame = 0;
                                      let currentStartMin = initialStart;
                                      let currentEndMin = initialEnd;
                                      const scheduleUpdate = (ns: number, ne: number) => {
                                        if (frame) return;
                                        frame = requestAnimationFrame(() => {
                                          setDraggingBlock({ id: b.id, startMin: ns, endMin: ne });
                                          frame = 0;
                                        });
                                      };
                                      const onMove = (ev: MouseEvent) => {
                                        const pointerMinRaw = (ev.clientX - trackRect.left) * pixelsToMinutes;
                                        const pointerMin = Math.max(0, Math.min(1440, Number.isFinite(pointerMinRaw) ? pointerMinRaw : 0));
                                        const delta = pointerMin - startPointerMin;
                                        const deltaSnap = snapMinutes(delta);
                                        const minStartAllowed = showNow ? snapMinutes(now.getHours() * 60 + now.getMinutes()) : 0;
                                        const effectiveNextStart = Number.isFinite(nextBlockStart) ? nextBlockStart : 1440;
                                        const neighborMinStart = Math.max(prevBlockEnd, minStartAllowed);
                                        const neighborMaxStart = Math.min(effectiveNextStart - widthMin, 1440 - widthMin);
                                        let ns = initialStart + deltaSnap;
                                        const absoluteMin = Math.max(neighborMinStart, 0);
                                        const absoluteMax = Math.max(absoluteMin, Math.min(neighborMaxStart, 1440 - widthMin));
                                        ns = Math.max(absoluteMin, Math.min(absoluteMax, ns));
                                        const ne = ns + widthMin;
                                        if (ns !== currentStartMin || ne !== currentEndMin) {
                                          currentStartMin = ns;
                                          currentEndMin = ne;
                                          scheduleUpdate(ns, ne);
                                        }
                                      };
                                      const onUp = () => {
                                        if (frame) cancelAnimationFrame(frame);
                                        window.removeEventListener('mousemove', onMove);
                                        window.removeEventListener('mouseup', onUp);
                                        // Persist adjustments if values are valid
                                        reservationAdjustmentsService.upsertAdjustment(dateKey, b.id, { start: currentStartMin, end: currentEndMin });
                                        setBlockAdjustments(prev => ({ ...prev, [b.id]: { start: currentStartMin, end: currentEndMin } }));
                                        // Update reservation time to keep Sidebar and sorting in sync
                                        const hh = Math.floor(currentStartMin / 60);
                                        const mm = currentStartMin % 60;
                                        const hhStr = hh.toString().padStart(2, '0');
                                        const mmStr = mm.toString().padStart(2, '0');
                                        try { updateReservation(b.id, { time: `${hhStr}:${mmStr}` }); } catch {}
                                        setDraggingBlock(null);
                                        // Restore body styles
                                        document.body.style.userSelect = prevSelect;
                                        document.body.style.cursor = prevCursor;
                                      };
                                      window.addEventListener('mousemove', onMove);
                                      window.addEventListener('mouseup', onUp);
                                    }}
                                    title={`${b.label} • ${timeRange} • ${b.guests || 0}`}
                                  >
                                    {b.isVip ? (
                                      <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
                                        <div
                                          className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                            theme === 'light' ? 'bg-yellow-400 border border-yellow-500' : 'bg-yellow-500 border border-yellow-300'
                                          }`}
                                        >
                                          <svg width="9" height="9" viewBox="0 0 24 24" fill="white" stroke="#ffffff" strokeWidth="2">
                                            <path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/>
                                          </svg>
                                        </div>
                                      </div>
                                    ) : null}
                                    {/* Resize handles */}
                                    <div
                                      className={`absolute inset-y-0 left-0 w-1.5 cursor-ew-resize ${theme === 'light' ? 'bg-white/40' : 'bg-black/20'} ${b.status === 'arrived' ? 'opacity-30 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        const track = (e.currentTarget as HTMLElement).closest('.rp-row-track') as HTMLElement | null;
                                        if (!track) return;
                                        const trackRect = track.getBoundingClientRect();
                                        const trackWidth = Math.max(1, (track as HTMLElement).clientWidth || trackRect.width || 0);
                                        const pixelsToMinutes = 1440 / trackWidth;
                                        const initialStart = snapMinutes(Math.max(0, Math.min(1440, (blockAdjustments[b.id]?.start ?? b.startMin))));
                                        const initialEnd = snapMinutes(Math.max(initialStart + MIN_BLOCK_MINUTES, Math.min(1440, (blockAdjustments[b.id]?.end ?? b.endMin))));
                                      // Improve UX: prevent text selection and show resize cursor
                                      const prevSelect = document.body.style.userSelect;
                                      const prevCursor = document.body.style.cursor;
                                      document.body.style.userSelect = 'none';
                                      document.body.style.cursor = 'ew-resize';
                                      // Throttle updates with rAF to prevent jitter
                                      let frame = 0;
                                      const scheduleUpdate = (newStart: number) => {
                                        if (frame) return;
                                        frame = requestAnimationFrame(() => {
                                          setDraggingBlock({ id: b.id, startMin: newStart, endMin: initialEnd });
                                          frame = 0;
                                        });
                                      };
                                      let currentStart = initialStart;
                                      const onMove = (ev: MouseEvent) => {
                                          const relX = ev.clientX - trackRect.left;
                                          const pointerMinRaw = relX * pixelsToMinutes;
                                          if (!Number.isFinite(pointerMinRaw)) return;
                                          const pointerMin = Math.max(0, Math.min(1440, pointerMinRaw));
                                          const snapped = snapMinutes(pointerMin);
                                          if (!Number.isFinite(snapped)) return;
                                          const minStartAllowed = showNow ? snapMinutes(now.getHours() * 60 + now.getMinutes()) : 0;
                                          if (!Number.isFinite(minStartAllowed)) return;
                                          const neighborMinStart = Math.max(prevBlockEnd, minStartAllowed);
                                          const newStart = Math.max(neighborMinStart, Math.min(initialEnd - MIN_BLOCK_MINUTES, snapped));
                                        if (newStart !== currentStart) {
                                          currentStart = newStart;
                                          scheduleUpdate(currentStart);
                                        }
                                        };
                                        const onUp = () => {
                                        if (frame) cancelAnimationFrame(frame);
                                          window.removeEventListener('mousemove', onMove);
                                          window.removeEventListener('mouseup', onUp);
                                          // Persist to DB
                                          reservationAdjustmentsService.upsertAdjustment(dateKey, b.id, { start: currentStart, end: initialEnd });
                                          // Commit to global adjustments once (recomputes maps a single time)
                                          setBlockAdjustments(prev => ({ ...prev, [b.id]: { start: currentStart, end: initialEnd } }));
                                          // Update reservation start time so Sidebar reflects the change immediately
                                          try {
                                            const hh = Math.floor(currentStart / 60);
                                            const mm = currentStart % 60;
                                            const hhStr = hh.toString().padStart(2, '0');
                                            const mmStr = mm.toString().padStart(2, '0');
                                            updateReservation(b.id, { time: `${hhStr}:${mmStr}` });
                                          } catch {}
                                          setDraggingBlock(null);
                                        // Restore body styles
                                        document.body.style.userSelect = prevSelect;
                                        document.body.style.cursor = prevCursor;
                                        };
                                        window.addEventListener('mousemove', onMove);
                                        window.addEventListener('mouseup', onUp);
                                      }}
                                    />
                                    <div
                                      className={`absolute inset-y-0 right-0 w-1.5 cursor-ew-resize ${theme === 'light' ? 'bg-white/40' : 'bg-black/20'} opacity-0 group-hover:opacity-100`}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        const track = (e.currentTarget as HTMLElement).closest('.rp-row-track') as HTMLElement | null;
                                        if (!track) return;
                                        const trackRect = track.getBoundingClientRect();
                                        const trackWidth = Math.max(1, (track as HTMLElement).clientWidth || trackRect.width || 0);
                                        const pixelsToMinutes = 1440 / trackWidth;
                                        const initialStart = snapMinutes(Math.max(0, Math.min(1440, (blockAdjustments[b.id]?.start ?? b.startMin))));
                                        const initialEnd = snapMinutes(Math.max(initialStart + MIN_BLOCK_MINUTES, Math.min(1440, (blockAdjustments[b.id]?.end ?? b.endMin))));
                                        // Improve UX: prevent text selection and show resize cursor
                                        const prevSelect = document.body.style.userSelect;
                                        const prevCursor = document.body.style.cursor;
                                        document.body.style.userSelect = 'none';
                                        document.body.style.cursor = 'ew-resize';
                                        // Throttle updates with rAF to prevent jitter
                                        let frame = 0;
                                        const scheduleUpdate = (newEnd: number) => {
                                          if (frame) return;
                                          frame = requestAnimationFrame(() => {
                                            setDraggingBlock({ id: b.id, startMin: initialStart, endMin: newEnd });
                                            frame = 0;
                                          });
                                        };
                                        let currentEnd = initialEnd;
                                      const onMove = (ev: MouseEvent) => {
                                          const relX = ev.clientX - trackRect.left;
                                          const pointerMinRaw = relX * pixelsToMinutes;
                                          const pointerMin = Math.max(0, Math.min(1440, Number.isFinite(pointerMinRaw) ? pointerMinRaw : 0));
                                          const snapped = snapMinutes(pointerMin);
                                          // Allow both extend and shorten, but keep at least MIN_BLOCK_MINUTES after start
                                          const neighborMaxEnd = Math.min(Number.isFinite(nextBlockStart) ? nextBlockStart : 1440, 1440);
                                          const newEnd = Math.min(neighborMaxEnd, Math.max(initialStart + MIN_BLOCK_MINUTES, snapped));
                                          if (newEnd !== currentEnd) {
                                            currentEnd = newEnd;
                                            scheduleUpdate(currentEnd);
                                          }
                                        };
                                        const onUp = () => {
                                          if (frame) cancelAnimationFrame(frame);
                                          window.removeEventListener('mousemove', onMove);
                                          window.removeEventListener('mouseup', onUp);
                                          // Persist to DB
                                          reservationAdjustmentsService.upsertAdjustment(dateKey, b.id, { start: initialStart, end: currentEnd });
                                          // Commit once to global map
                                          setBlockAdjustments(prev => ({ ...prev, [b.id]: { start: initialStart, end: currentEnd } }));
                                          setDraggingBlock(null);
                                          // Restore body styles
                                          document.body.style.userSelect = prevSelect;
                                          document.body.style.cursor = prevCursor;
                                        };
                                        window.addEventListener('mousemove', onMove);
                                        window.addEventListener('mouseup', onUp);
                                      }}
                                    />
                                    <div className="h-full w-full px-3 py-1 flex flex-col justify-center overflow-hidden">
                                      {/* Top row: Timer + Guest name • people */}
                                      <div className="flex items-center gap-2 text-[12px] text-white/95 whitespace-nowrap overflow-hidden">
                                        {/* Left: circular countdown - visible only when arrived */}
                                        {b.status === 'arrived' ? (() => {
                                          const nowMin = now.getHours() * 60 + now.getMinutes();
                                          const duration = Math.max(1, b.endMin - b.startMin);
                                          const elapsed = Math.max(0, Math.min(duration, nowMin - b.startMin));
                                          const progress = elapsed / duration;
                                          const deg = Math.round(progress * 360);
                                          return (
                                            <div className="relative w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                                              <div
                                                className="absolute inset-0 rounded-full"
                                                style={{
                                                  // Progress in 20% white; remainder in solid white
                                                  background: `conic-gradient(rgba(255,255,255,0.2) ${deg}deg, #ffffff ${deg}deg)`
                                                }}
                                              />
                                              <div className="absolute inset-[2px] rounded-full" />
                                            </div>
                                          );
                                        })() : null}
                                        <span className="font-medium truncate max-w-[62%]">{b.label}</span>
                                        <span className="opacity-80">•</span>
                                        <span className="flex items-center gap-1 text-white/90">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                            <circle cx="9" cy="7" r="4"/>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                          </svg>
                                          <span className="leading-none">{b.guests || 0}</span>
                                        </span>
                                      </div>
                                      {/* Bottom row: Service type • time range */}
                                      <div className="mt-0.5 text-[11px] text-white/90 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-2">
                                        {b.serviceType ? (
                                          <>
                                            <span className="truncate">{b.serviceType}</span>
                                            <span className="opacity-80">•</span>
                                          </>
                                        ) : null}
                                        <span className="opacity-90">{timeRange}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {tables.length === 0 && (
                      <div className="p-6 text-sm text-gray-500">
                        No tables in the current zone.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom zoom bar */}
          <div className={`border-t px-4 py-2 flex items-center justify-between ${theme === 'light' ? 'border-gray-200' : 'border-[#1E2A34]'}`}>
            <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>Zoom</div>
            <div className="flex items-center gap-2">
              {(['1/4','1/6','1/8','1/12','1/16'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setZoom(level)}
                  className={`px-3 py-1.5 text-xs rounded border ${
                    theme === 'light'
                      ? (zoom === level
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'bg-white border-gray-300 text-black-700 hover:bg-blue-100')
                      : (zoom === level
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-[#0A1929] border-[#1E2A34] text-gray-300 hover:bg-[#0f253b]')}
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TimelineOverlay;


