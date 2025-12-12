import React, { useState, useContext, useEffect, memo, useCallback } from "react";
import { getAssignedWaiters, removeAssignedWaiter as removeAssignedWaiterUtil, setAssignedWaiter } from "../../utils/waiters";
import SidebarFooter from "./SidebarFooter";
import { ReservationContext } from "../../context/ReservationContext";
import type { Reservation } from "../../types/reservation";
import { ZoneContext } from "../../context/ZoneContext";
import { LayoutContext } from "../../context/LayoutContext";
import { useFocus } from "../../context/FocusContext";
import { formatTableNames } from "../../utils/tableHelper";
import { useLanguage } from "../../context/LanguageContext";
import { ThemeContext } from "../../context/ThemeContext";
import { matchServiceTypeDefinition, parseServiceTypeTokens, ServiceTypeDefinition, SERVICE_TYPE_DEFINITIONS } from "../../constants/serviceTypes";
import { EventContext } from "../../context/EventContext";
import type { Event, EventReservation, EventPaymentStatus } from "../../types/event";
import CreateEventModal from "../Event/CreateEventModal";
import EditEventModal from "../Event/EditEventModal";
import EventReservationForm from "../Event/EventReservationForm";
import { createPortal } from "react-dom";

interface SidebarProps {
  onAddReservation: () => void;
  selectedDate: Date;
  onEditReservation?: (reservation: Reservation) => void;
}

// Component for countdown timer with clock icon
interface CountdownTimerProps {
  reservationDate: string;
  reservationTime: string;
  reservationId: string;
  onStatusUpdate: (reservationId: string, status: 'arrived' | 'not_arrived') => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = React.memo(({ 
  reservationDate, 
  reservationTime, 
  reservationId, 
  onStatusUpdate 
}) => {
  const { t, currentLanguage } = useLanguage();
  const { theme } = React.useContext(ThemeContext);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const updateCountdown = () => {
      const reservationDateTime = new Date(`${reservationDate}T${reservationTime}`);
      const now = new Date();
      const difference = reservationDateTime.getTime() - now.getTime();

      if (difference > 0) {
        const totalMinutes = Math.floor(difference / (1000 * 60));
        const totalHours = Math.floor(totalMinutes / 60);
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        const minutes = totalMinutes % 60;
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else if (totalHours > 0) {
          setTimeLeft(`${totalHours}h ${minutes}m`);
        } else if (totalMinutes > 0) {
          setTimeLeft(`${minutes}m`);
        } else {
          setTimeLeft(`${seconds}s`);
        }

        setIsExpired(false);
        setShowConfirmation(false);
      } else {
        // Time has expired, show confirmation
        setIsExpired(true);
        setShowConfirmation(true);
        setTimeLeft('');
        // Clear interval when expired
        if (interval) {
          clearInterval(interval);
        }
      }
    };

    updateCountdown();
    // Only set interval if not expired
    if (!isExpired) {
      interval = setInterval(updateCountdown, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [reservationDate, reservationTime, isExpired]);

  const handleConfirmArrival = (arrived: boolean) => {
    onStatusUpdate(reservationId, arrived ? 'arrived' : 'not_arrived');
  };

  // Regular countdown display
  if (!isExpired && timeLeft) {
    return (
      <div
        className={
          `flex items-center gap-1 px-2 py-1 rounded transition-colors ` +
          (theme === 'light'
            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            : 'bg-orange-900/30 text-orange-400 hover:bg-orange-900/40')
        }
      >
        {/* Clock icon */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <span className="text-xs">{timeLeft}</span>
      </div>
    );
  }

  // Confirmation prompt when time expired
  if (showConfirmation) {
    return (
      <div className="flex flex-col items-center gap-1">
        {/* Question */}
        <div className={
          `flex items-center gap-1 px-2 py-1 rounded text-xs ` +
          (theme === 'light' ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-400')
        }>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="m9,9a3,3,0,1,1,5.5,2c-.4.5-1.5,1-1.5,2"/>
            <path d="M12,17h.01"/>
          </svg>
          <span>{t('arrivedQuestion')}</span>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleConfirmArrival(true); }}
            className={
              `p-1 rounded transition-colors ` +
              (theme === 'light' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50')
            }
            title={t('markAsArrived')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleConfirmArrival(false); }}
            className={
              `p-1 rounded transition-colors ` +
              (theme === 'light' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-red-900/30 text-red-400 hover:bg-red-900/50')
            }
            title={t('markAsNotArrived')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18,6 6,18"/>
              <path d="M6,6 18,18"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return null;
});

// Estimate reservation duration (minutes) based on party size (aligned with TimelineOverlay)
const estimateDurationMinutes = (numGuests?: number) => {
  const guests = typeof numGuests === 'number' ? numGuests : 2;
  if (guests <= 2) return 60;
  if (guests <= 4) return 120;
  return 150;
};

// Timer for seated guests - counts down until the estimated end time, then shows "Cleared?"
interface SeatedTimerProps {
  reservationDate: string;
  reservationTime: string;
  numberOfGuests?: number;
  reservationId: string;
  tableIds?: string[];
  onStatusUpdate: (reservationId: string, status: 'cancelled' | 'arrived') => void;
}

const SeatedTimer: React.FC<SeatedTimerProps> = React.memo(({
  reservationDate,
  reservationTime,
  numberOfGuests,
  reservationId,
  tableIds,
  onStatusUpdate
}) => {
  const { t } = useLanguage();
  const { theme } = React.useContext(ThemeContext);
  const { updateReservation, reservations } = React.useContext(ReservationContext);
  const { eventReservations, updateEventReservation } = React.useContext(EventContext);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [adjustment, setAdjustment] = useState<{ start?: number; end?: number } | null>(null);

  // Also try to fetch persisted adjustment from Supabase
  const fetchDbAdjustment = React.useCallback(async () => {
    try {
      const { reservationAdjustmentsService } = await import('../../services/reservationAdjustmentsService');
      const res = await reservationAdjustmentsService.getOne(reservationDate, reservationId);
      if (res) setAdjustment(res);
    } catch {}
  }, [reservationDate, reservationId]);

  // Load current adjustment from shared storage
  useEffect(() => {
    const dateKey = reservationDate;
    try {
      const raw = localStorage.getItem(`respoint-duration-adjustments:${dateKey}`);
      const parsed = raw ? JSON.parse(raw) : null;
      const adj = parsed?.[reservationId] ?? null;
      setAdjustment(adj);
    } catch {
      setAdjustment(null);
    }
    // Additionally fetch from DB (overrides local)
    fetchDbAdjustment();
    const handler = (e: any) => {
      try {
        if (!e?.detail || e.detail.date !== dateKey) return;
        const raw = localStorage.getItem(`respoint-duration-adjustments:${dateKey}`);
        const parsed = raw ? JSON.parse(raw) : null;
        const adj = parsed?.[reservationId] ?? null;
        setAdjustment(adj);
      } catch {}
    };
    window.addEventListener('respoint-duration-adjustments-changed', handler as any);
    return () => window.removeEventListener('respoint-duration-adjustments-changed', handler as any);
  }, [reservationDate, reservationId, fetchDbAdjustment]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateCountdown = () => {
      const defaultStart = new Date(`${reservationDate}T${reservationTime}`);
      const durationMin = estimateDurationMinutes(numberOfGuests);
      // If there is an adjustment, compute end from minutes-of-day; else default based on duration
      let end: Date;
      if (adjustment?.end !== undefined && adjustment.end !== null) {
        const midnight = new Date(`${reservationDate}T00:00:00`);
        end = new Date(midnight.getTime() + Math.max(0, Math.min(2880, adjustment.end)) * 60 * 1000);
      } else {
        end = new Date(defaultStart.getTime() + durationMin * 60 * 1000);
      }
      const now = new Date();
      const difference = end.getTime() - now.getTime();

      if (difference > 0) {
        const totalMinutes = Math.floor(difference / (1000 * 60));
        const totalHours = Math.floor(totalMinutes / 60);
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        const minutes = totalMinutes % 60;
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else if (totalHours > 0) {
          setTimeLeft(`${totalHours}h ${minutes}m`);
        } else if (totalMinutes > 0) {
          setTimeLeft(`${minutes}m`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
        setIsExpired(false);
        setShowConfirmation(false);
      } else {
        setIsExpired(true);
        setShowConfirmation(true);
        setTimeLeft('');
        if (interval) clearInterval(interval);
      }
    };

    updateCountdown();
    if (!isExpired) {
      interval = setInterval(updateCountdown, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [reservationDate, reservationTime, numberOfGuests, isExpired, adjustment?.end]);

  const handleConfirmCleared = (cleared: boolean) => {
    if (cleared) {
      try {
        // Mark reservation as arrived and cleared (guest came and left)
        updateReservation(reservationId, { status: 'arrived', cleared: true } as any);
      } catch {
        // Fallback to status update only
        onStatusUpdate(reservationId, 'arrived');
      }
    } else {
      // Extend for additional 15 minutes: update adjustments (DB + local) and resume countdown
      try {
        const now = new Date();
        const midnight = new Date(`${reservationDate}T00:00:00`);
        // Minutes from start of reservation day for current time
        const nowMin = Math.max(0, now.getHours() * 60 + now.getMinutes());
        const extendedEnd = Math.min(2880, nowMin + 15);

        // Get current adjustments
        const key = `respoint-duration-adjustments:${reservationDate}`;
        let parsed: Record<string, { start?: number; end?: number }> = {};
        try {
          const raw = localStorage.getItem(key);
          parsed = raw ? JSON.parse(raw) : {};
        } catch {}
        
        const current = parsed?.[reservationId] || {};
        const previousEnd = current.end ?? (adjustment?.end ?? nowMin);
        
        // Update localStorage adjustments
        try {
          parsed[reservationId] = { start: current.start, end: extendedEnd };
          localStorage.setItem(key, JSON.stringify(parsed));
        } catch {}

        // Persist to DB
        (async () => {
          try {
            const { reservationAdjustmentsService } = await import('../../services/reservationAdjustmentsService');
            await reservationAdjustmentsService.upsertAdjustment(reservationDate, reservationId, { end: extendedEnd, start: adjustment?.start });
          } catch {}
        })();

        // Auto-shift subsequent reservations if extending caused overlap
        if (tableIds && tableIds.length > 0 && extendedEnd > previousEnd) {
          try {
            // Helper to convert time to minutes
            const timeToMin = (time: string) => {
              const parts = String(time || '').split(':');
              const h = Number(parts[0]) || 0;
              const m = Number(parts[1]) || 0;
              return (h % 24) * 60 + (m % 60);
            };
            
            // Find all reservations on the same table(s) that would overlap
            const overlappingRegular = (reservations || []).filter(r => {
              if (r.id === reservationId) return false;
              if (r.date !== reservationDate) return false;
              if (r.status === 'arrived') return false; // Don't shift seated
              if ((r as any).cleared) return false;
              if (!(r.status === 'waiting' || r.status === 'confirmed')) return false;
              
              // Check if shares any table
              const rTables = (r.tableIds || []) as string[];
              const sharesTables = tableIds.some(tid => rTables.includes(tid));
              if (!sharesTables) return false;
              
              // Check if starts within the extended time
              const adj = parsed[r.id] || {};
              const rStartMin = adj.start ?? timeToMin(r.time);
              return rStartMin < extendedEnd && rStartMin >= previousEnd;
            });
            
            const overlappingEvent = (eventReservations || []).filter(er => {
              if (er.date !== reservationDate) return false;
              if (er.status === 'arrived') return false;
              if (er.cleared) return false;
              if (er.status !== 'booked') return false;
              
              const erTables = (er.tableIds || []) as string[];
              const sharesTables = tableIds.some(tid => erTables.includes(tid));
              if (!sharesTables) return false;
              
              const adj = parsed[er.id] || {};
              const erStartMin = adj.start ?? timeToMin(er.time);
              return erStartMin < extendedEnd && erStartMin >= previousEnd;
            });
            
            // Shift overlapping reservations (async IIFE)
            (async () => {
              for (const r of overlappingRegular) {
                const adj = parsed[r.id] || {};
                const rStartMin = adj.start ?? timeToMin(r.time);
                const rEndMin = adj.end ?? Math.min(1440, rStartMin + estimateDurationMinutes(r.numberOfGuests));
                
                const shiftAmount = extendedEnd - rStartMin;
                const newStartMin = rStartMin + shiftAmount;
                const newEndMin = Math.min(1440, rEndMin + shiftAmount);
                
                const newHour = Math.floor(newStartMin / 60);
                const newMinute = newStartMin % 60;
                const newTime = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
                
                try {
                  await updateReservation(r.id, { time: newTime });
                  const { reservationAdjustmentsService } = await import('../../services/reservationAdjustmentsService');
                  await reservationAdjustmentsService.upsertAdjustment(reservationDate, r.id, { start: newStartMin, end: newEndMin });
                  parsed[r.id] = { start: newStartMin, end: newEndMin };
                } catch {}
              }
              
              for (const er of overlappingEvent) {
                const adj = parsed[er.id] || {};
                const erStartMin = adj.start ?? timeToMin(er.time);
                const erEndMin = adj.end ?? Math.min(1440, erStartMin + estimateDurationMinutes(er.numberOfGuests));
                
                const shiftAmount = extendedEnd - erStartMin;
                const newStartMin = erStartMin + shiftAmount;
                const newEndMin = Math.min(1440, erEndMin + shiftAmount);
                
                const newHour = Math.floor(newStartMin / 60);
                const newMinute = newStartMin % 60;
                const newTime = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
                
                try {
                  await updateEventReservation(er.id, { time: newTime });
                  const { reservationAdjustmentsService } = await import('../../services/reservationAdjustmentsService');
                  await reservationAdjustmentsService.upsertAdjustment(reservationDate, er.id, { start: newStartMin, end: newEndMin });
                  parsed[er.id] = { start: newStartMin, end: newEndMin };
                } catch {}
              }
              
              // Update localStorage with all changes
              try {
                localStorage.setItem(key, JSON.stringify(parsed));
              } catch {}
            })();
          } catch (err) {
            console.error('Failed to shift overlapping reservations:', err);
          }
        }

        // Notify listeners (timeline overlay) and resume timer
        try { window.dispatchEvent(new CustomEvent('respoint-duration-adjustments-changed', { detail: { date: reservationDate } })); } catch {}
        setAdjustment(prev => ({ start: prev?.start, end: extendedEnd }));
        setIsExpired(false);
        setShowConfirmation(false);
      } catch {
        // If anything fails, keep prompt visible
        setShowConfirmation(true);
      }
    }
  };

  if (!isExpired && timeLeft) {
    return (
      <div
        className={
          `flex items-center gap-1 px-2 py-1 rounded transition-colors ` +
          (theme === 'light'
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-green-900/30 text-green-400 hover:bg-green-900/40')
        }
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <span className="text-xs">{timeLeft}</span>
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className={
          `flex items-center gap-1 px-2 py-1 rounded text-xs ` +
          (theme === 'light' ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-400')
        }>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="m9,9a3,3,0,1,1,5.5,2c-.4.5-1.5,1-1.5,2"/>
            <path d="M12,17h.01"/>
          </svg>
          <span>{t('clearedQuestion')}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleConfirmCleared(true); }}
            className={
              `p-1 rounded transition-colors ` +
              (theme === 'light' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50')
            }
            title={t('markAsCleared')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleConfirmCleared(false); }}
            className={
              `p-1 rounded transition-colors ` +
              (theme === 'light' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-red-900/30 text-red-400 hover:bg-red-900/50')
            }
            title={t('markAsNotCleared')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18,6 6,18"/>
              <path d="M6,6 18,18"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return null;
});

// Timer for seated event guests - counts down until the estimated end time, then shows "Cleared?"
interface EventSeatedTimerProps {
  reservationDate: string;
  reservationTime: string;
  numberOfGuests?: number;
  reservationId: string;
  tableIds?: string[];
  onClearConfirm: (reservationId: string) => void;
  onExtend: (reservationId: string, newEnd: number) => void;
}

const EventSeatedTimer: React.FC<EventSeatedTimerProps> = React.memo(({
  reservationDate,
  reservationTime,
  numberOfGuests,
  reservationId,
  tableIds,
  onClearConfirm,
  onExtend
}) => {
  const { t } = useLanguage();
  const { theme } = React.useContext(ThemeContext);
  const { updateReservation, reservations } = React.useContext(ReservationContext);
  const { eventReservations, updateEventReservation } = React.useContext(EventContext);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [adjustment, setAdjustment] = useState<{ start?: number; end?: number } | null>(null);

  // Also try to fetch persisted adjustment from Supabase
  const fetchDbAdjustment = React.useCallback(async () => {
    try {
      const { reservationAdjustmentsService } = await import('../../services/reservationAdjustmentsService');
      const res = await reservationAdjustmentsService.getOne(reservationDate, reservationId);
      if (res) setAdjustment(res);
    } catch {}
  }, [reservationDate, reservationId]);

  // Load current adjustment from shared storage
  useEffect(() => {
    const dateKey = reservationDate;
    try {
      const raw = localStorage.getItem(`respoint-duration-adjustments:${dateKey}`);
      const parsed = raw ? JSON.parse(raw) : null;
      const adj = parsed?.[reservationId] ?? null;
      setAdjustment(adj);
    } catch {
      setAdjustment(null);
    }
    // Additionally fetch from DB (overrides local)
    fetchDbAdjustment();
    const handler = (e: any) => {
      try {
        if (!e?.detail || e.detail.date !== dateKey) return;
        const raw = localStorage.getItem(`respoint-duration-adjustments:${dateKey}`);
        const parsed = raw ? JSON.parse(raw) : null;
        const adj = parsed?.[reservationId] ?? null;
        setAdjustment(adj);
      } catch {}
    };
    window.addEventListener('respoint-duration-adjustments-changed', handler as any);
    return () => window.removeEventListener('respoint-duration-adjustments-changed', handler as any);
  }, [reservationDate, reservationId, fetchDbAdjustment]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateCountdown = () => {
      const defaultStart = new Date(`${reservationDate}T${reservationTime}`);
      const durationMin = estimateDurationMinutes(numberOfGuests);
      // If there is an adjustment, compute end from minutes-of-day; else default based on duration
      let end: Date;
      if (adjustment?.end !== undefined && adjustment.end !== null) {
        const midnight = new Date(`${reservationDate}T00:00:00`);
        end = new Date(midnight.getTime() + Math.max(0, Math.min(2880, adjustment.end)) * 60 * 1000);
      } else {
        end = new Date(defaultStart.getTime() + durationMin * 60 * 1000);
      }
      const now = new Date();
      const difference = end.getTime() - now.getTime();

      if (difference > 0) {
        const totalMinutes = Math.floor(difference / (1000 * 60));
        const totalHours = Math.floor(totalMinutes / 60);
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        const minutes = totalMinutes % 60;
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else if (totalHours > 0) {
          setTimeLeft(`${totalHours}h ${minutes}m`);
        } else if (totalMinutes > 0) {
          setTimeLeft(`${minutes}m`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
        setIsExpired(false);
        setShowConfirmation(false);
      } else {
        setIsExpired(true);
        setShowConfirmation(true);
        setTimeLeft('');
        if (interval) clearInterval(interval);
      }
    };

    updateCountdown();
    if (!isExpired) {
      interval = setInterval(updateCountdown, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [reservationDate, reservationTime, numberOfGuests, isExpired, adjustment?.end]);

  const handleConfirmCleared = (cleared: boolean) => {
    if (cleared) {
      onClearConfirm(reservationId);
    } else {
      // Extend for additional 15 minutes: update adjustments (DB + local) and resume countdown
      try {
        const now = new Date();
        // Minutes from start of reservation day for current time
        const nowMin = Math.max(0, now.getHours() * 60 + now.getMinutes());
        const extendedEnd = Math.min(2880, nowMin + 15);

        // Get current adjustments
        const key = `respoint-duration-adjustments:${reservationDate}`;
        let parsed: Record<string, { start?: number; end?: number }> = {};
        try {
          const raw = localStorage.getItem(key);
          parsed = raw ? JSON.parse(raw) : {};
        } catch {}
        
        const current = parsed?.[reservationId] || {};
        const previousEnd = current.end ?? (adjustment?.end ?? nowMin);

        // Update localStorage adjustments
        try {
          parsed[reservationId] = { start: current.start, end: extendedEnd };
          localStorage.setItem(key, JSON.stringify(parsed));
        } catch {}

        // Persist to DB
        (async () => {
          try {
            const { reservationAdjustmentsService } = await import('../../services/reservationAdjustmentsService');
            await reservationAdjustmentsService.upsertAdjustment(reservationDate, reservationId, { end: extendedEnd, start: adjustment?.start });
          } catch {}
        })();

        // Auto-shift subsequent reservations if extending caused overlap
        if (tableIds && tableIds.length > 0 && extendedEnd > previousEnd) {
          try {
            // Helper to convert time to minutes
            const timeToMin = (time: string) => {
              const parts = String(time || '').split(':');
              const h = Number(parts[0]) || 0;
              const m = Number(parts[1]) || 0;
              return (h % 24) * 60 + (m % 60);
            };
            
            // Find overlapping regular reservations
            const overlappingRegular = (reservations || []).filter(r => {
              if (r.id === reservationId) return false;
              if (r.date !== reservationDate) return false;
              if (r.status === 'arrived') return false;
              if ((r as any).cleared) return false;
              if (!(r.status === 'waiting' || r.status === 'confirmed')) return false;
              
              const rTables = (r.tableIds || []) as string[];
              const sharesTables = tableIds.some(tid => rTables.includes(tid));
              if (!sharesTables) return false;
              
              const adj = parsed[r.id] || {};
              const rStartMin = adj.start ?? timeToMin(r.time);
              return rStartMin < extendedEnd && rStartMin >= previousEnd;
            });
            
            // Find overlapping event reservations
            const overlappingEvent = (eventReservations || []).filter(er => {
              if (er.id === reservationId) return false;
              if (er.date !== reservationDate) return false;
              if (er.status === 'arrived') return false;
              if (er.cleared) return false;
              if (er.status !== 'booked') return false;
              
              const erTables = (er.tableIds || []) as string[];
              const sharesTables = tableIds.some(tid => erTables.includes(tid));
              if (!sharesTables) return false;
              
              const adj = parsed[er.id] || {};
              const erStartMin = adj.start ?? timeToMin(er.time);
              return erStartMin < extendedEnd && erStartMin >= previousEnd;
            });
            
            // Shift reservations (async IIFE)
            (async () => {
              for (const r of overlappingRegular) {
                const adj = parsed[r.id] || {};
                const rStartMin = adj.start ?? timeToMin(r.time);
                const rEndMin = adj.end ?? Math.min(1440, rStartMin + estimateDurationMinutes(r.numberOfGuests));
                
                const shiftAmount = extendedEnd - rStartMin;
                const newStartMin = rStartMin + shiftAmount;
                const newEndMin = Math.min(1440, rEndMin + shiftAmount);
                
                const newHour = Math.floor(newStartMin / 60);
                const newMinute = newStartMin % 60;
                const newTime = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
                
                try {
                  await updateReservation(r.id, { time: newTime });
                  const { reservationAdjustmentsService } = await import('../../services/reservationAdjustmentsService');
                  await reservationAdjustmentsService.upsertAdjustment(reservationDate, r.id, { start: newStartMin, end: newEndMin });
                  parsed[r.id] = { start: newStartMin, end: newEndMin };
                } catch {}
              }
              
              for (const er of overlappingEvent) {
                const adj = parsed[er.id] || {};
                const erStartMin = adj.start ?? timeToMin(er.time);
                const erEndMin = adj.end ?? Math.min(1440, erStartMin + estimateDurationMinutes(er.numberOfGuests));
                
                const shiftAmount = extendedEnd - erStartMin;
                const newStartMin = erStartMin + shiftAmount;
                const newEndMin = Math.min(1440, erEndMin + shiftAmount);
                
                const newHour = Math.floor(newStartMin / 60);
                const newMinute = newStartMin % 60;
                const newTime = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
                
                try {
                  await updateEventReservation(er.id, { time: newTime });
                  const { reservationAdjustmentsService } = await import('../../services/reservationAdjustmentsService');
                  await reservationAdjustmentsService.upsertAdjustment(reservationDate, er.id, { start: newStartMin, end: newEndMin });
                  parsed[er.id] = { start: newStartMin, end: newEndMin };
                } catch {}
              }
              
              // Save all changes
              try {
                localStorage.setItem(key, JSON.stringify(parsed));
              } catch {}
            })();
          } catch (err) {
            console.error('Failed to shift overlapping reservations:', err);
          }
        }

        // Notify listeners (timeline overlay) and resume timer
        try { window.dispatchEvent(new CustomEvent('respoint-duration-adjustments-changed', { detail: { date: reservationDate } })); } catch {}
        setAdjustment(prev => ({ start: prev?.start, end: extendedEnd }));
        setIsExpired(false);
        setShowConfirmation(false);

        // Call the onExtend callback
        onExtend(reservationId, extendedEnd);
      } catch {
        // If anything fails, keep prompt visible
        setShowConfirmation(true);
      }
    }
  };

  if (!isExpired && timeLeft) {
    return (
      <div
        className={
          `flex items-center gap-1 px-2 py-1 rounded transition-colors ` +
          (theme === 'light'
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-green-900/30 text-green-400 hover:bg-green-900/40')
        }
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <span className="text-xs">{timeLeft}</span>
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className={
          `flex items-center gap-1 px-2 py-1 rounded text-xs ` +
          (theme === 'light' ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-400')
        }>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="m9,9a3,3,0,1,1,5.5,2c-.4.5-1.5,1-1.5,2"/>
            <path d="M12,17h.01"/>
          </svg>
          <span>{t('clearedQuestion')}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleConfirmCleared(true); }}
            className={
              `p-1 rounded transition-colors ` +
              (theme === 'light' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50')
            }
            title={t('markAsCleared')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleConfirmCleared(false); }}
            className={
              `p-1 rounded transition-colors ` +
              (theme === 'light' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-red-900/30 text-red-400 hover:bg-red-900/50')
            }
            title={t('markAsNotCleared')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18,6 6,18"/>
              <path d="M6,6 18,18"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return null;
});

const Sidebar: React.FC<SidebarProps> = ({ onAddReservation, selectedDate, onEditReservation }) => {
  const { t, currentLanguage } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  const { reservations, updateReservation, addReservation } = useContext(ReservationContext);
  const { zones } = useContext(ZoneContext);
  const { zoneLayouts, savedLayouts } = useContext(LayoutContext);
  const {
    events,
    activeEventId,
    setActiveEventId,
    eventReservations,
    loadingEvents,
    loadingReservations,
    updateEventReservation,
    deleteEvent,
  } = useContext(EventContext);
  const { focusGeneration } = useFocus();
  const [activeTab, setActiveTab] = useState<'open' | 'event' | 'closed'>('open');
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'time' | 'a-z' | 'tables' | 'guests' | 'zone'>('time');
  const [isBookedOpen, setIsBookedOpen] = useState(true);
  const [isClearedOpen, setIsClearedOpen] = useState(true);
  const [isSeatedOpen, setIsSeatedOpen] = useState(true);
  const [isEventSeatedOpen, setIsEventSeatedOpen] = useState(true);
  const [isEventOpen, setIsEventOpen] = useState(true);
  const [showEventInfo, setShowEventInfo] = useState(true);
  const [, forceWaiterRerender] = useState(0);
  const [isServiceTypeMenuOpen, setIsServiceTypeMenuOpen] = useState(false);
  const [serviceTypeSortKey, setServiceTypeSortKey] = useState<string | null>(null);
  const serviceMenuRef = React.useRef<HTMLDivElement>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [editingEventForModal, setEditingEventForModal] = useState<Event | null>(null);
  const [isEventReservationFormOpen, setIsEventReservationFormOpen] = useState(false);
  const [editingEventReservation, setEditingEventReservation] = useState<EventReservation | null>(null);
  const [eventPaymentFilter, setEventPaymentFilter] = useState<EventPaymentStatus | null>(null);
  const [isEventPaymentRowOpen, setIsEventPaymentRowOpen] = useState(true);

  // Animation states for event clearing
  const [isEventClearingAnimation, setIsEventClearingAnimation] = useState(false);
  const [showEventClearSuccess, setShowEventClearSuccess] = useState(false);

  // Animation state for transferring reservation to event
  const [transferringReservationId, setTransferringReservationId] = useState<string | null>(null);

  // Listen for reservation transfer animation events
  useEffect(() => {
    const handleTransferring = (e: CustomEvent<{ reservationId: string }>) => {
      setTransferringReservationId(e.detail.reservationId);
      // Don't clear - keep it animated until reservation is removed from list
    };
    const handleTransferComplete = () => {
      setTransferringReservationId(null);
    };
    window.addEventListener('respoint-reservation-transferring', handleTransferring as EventListener);
    window.addEventListener('respoint-reservation-transfer-complete', handleTransferComplete);
    return () => {
      window.removeEventListener('respoint-reservation-transferring', handleTransferring as EventListener);
      window.removeEventListener('respoint-reservation-transfer-complete', handleTransferComplete);
    };
  }, []);

  // Service type parsing helpers
  const getServiceTypeDefinitions = useCallback((rawValue?: string) => {
    const tokens = parseServiceTypeTokens(rawValue);
    const seen = new Set<string>();
    const matches: ServiceTypeDefinition[] = [];
    tokens.forEach((token) => {
      const match = matchServiceTypeDefinition(token);
      if (match && !seen.has(match.key)) {
        seen.add(match.key);
        matches.push(match);
      }
    });
    return matches;
  }, []);

  // Collect ALL tables across all zones/layouts so table display and sorting
  // never depend on which zone is currently selected or which layouts are loaded.
  const allTablesAcrossZones = React.useMemo(() => {
    const tables: any[] = [];
    const seenIds = new Set<string>();
    try {
      // 1) Working/default layouts from zoneLayouts
      Object.values(zoneLayouts || {}).forEach((l: any) => {
        const arr = Array.isArray(l?.tables) ? l.tables : [];
        arr.forEach((t: any) => {
          if (t && typeof t.id === 'string' && !seenIds.has(t.id)) {
            seenIds.add(t.id);
            tables.push(t);
          }
        });
      });
      // 2) Fallback to all saved layouts (for zones not present in zoneLayouts)
      Object.values((savedLayouts as any) || {}).forEach((list: any) => {
        (list || []).forEach((sl: any) => {
          const layout = sl?.layout;
          const arr = Array.isArray(layout?.tables) ? layout.tables : [];
          arr.forEach((t: any) => {
            if (t && typeof t.id === 'string' && !seenIds.has(t.id)) {
              seenIds.add(t.id);
              tables.push(t);
            }
          });
        });
      });
    } catch {
      // In case of any unexpected shape, just return what we have so far.
    }
    return tables;
  }, [zoneLayouts, savedLayouts]);

  // Adapter for formatTableNames: it expects a ZoneLayouts map, but internally
  // it just flattens all .tables. We can safely pass a synthetic single-zone map
  // that contains the union of all tables across zones.
  const allTablesZoneLayouts = React.useMemo(() => {
    return {
      __all__: {
        tables: allTablesAcrossZones,
        walls: [],
        texts: [],
      },
    } as any;
  }, [allTablesAcrossZones]);

  // Map of tableId -> zoneId so we can detect multi-zone reservations
  const tableIdToZoneIdMap = React.useMemo(() => {
    const map = new Map<string, string>();
    try {
      // 1) Working/default layouts from zoneLayouts
      Object.entries(zoneLayouts || {}).forEach(([zoneId, layout]: [string, any]) => {
        const tables = Array.isArray(layout?.tables) ? layout.tables : [];
        tables.forEach((t: any) => {
          if (t && typeof t.id === 'string' && !map.has(t.id)) {
            map.set(t.id, zoneId);
          }
        });
      });
      // 2) Fallback: all saved layouts (for zones not present in zoneLayouts)
      Object.entries((savedLayouts as any) || {}).forEach(([zoneId, list]: [string, any]) => {
        const layoutsForZone = Array.isArray(list) ? list : [];
        layoutsForZone.forEach((sl: any) => {
          const tables = Array.isArray(sl?.layout?.tables) ? sl.layout.tables : [];
          tables.forEach((t: any) => {
            if (t && typeof t.id === 'string' && !map.has(t.id)) {
              map.set(t.id, zoneId);
            }
          });
        });
      });
    } catch {
      // In case of any unexpected shape, just return what we have so far.
    }
    return map;
  }, [zoneLayouts, savedLayouts]);

  // Map of table number/name -> zoneId (for event reservations which store table numbers as strings)
  const tableNumberToZoneIdMap = React.useMemo(() => {
    const map = new Map<string, string>();
    try {
      // 1) Working/default layouts from zoneLayouts
      Object.entries(zoneLayouts || {}).forEach(([zoneId, layout]: [string, any]) => {
        const tables = Array.isArray(layout?.tables) ? layout.tables : [];
        tables.forEach((t: any) => {
          // Map by table name
          if (t?.name && !map.has(t.name)) {
            map.set(t.name, zoneId);
          }
          // Also map by table number (as string)
          if (t?.number !== undefined && t?.number !== null) {
            const numStr = String(t.number);
            if (!map.has(numStr)) {
              map.set(numStr, zoneId);
            }
          }
        });
      });
      // 2) Fallback: all saved layouts
      Object.entries((savedLayouts as any) || {}).forEach(([zoneId, list]: [string, any]) => {
        const layoutsForZone = Array.isArray(list) ? list : [];
        layoutsForZone.forEach((sl: any) => {
          const tables = Array.isArray(sl?.layout?.tables) ? sl.layout.tables : [];
          tables.forEach((t: any) => {
            if (t?.name && !map.has(t.name)) {
              map.set(t.name, zoneId);
            }
            if (t?.number !== undefined && t?.number !== null) {
              const numStr = String(t.number);
              if (!map.has(numStr)) {
                map.set(numStr, zoneId);
              }
            }
          });
        });
      });
    } catch {
      // ignore
    }
    return map;
  }, [zoneLayouts, savedLayouts]);

  // Helper: get zone label for a reservation (handles multi-zone tables)
  const getReservationZoneLabel = useCallback((reservation: Reservation): string | null => {
    try {
      const zoneIds = new Set<string>();
      if (Array.isArray(reservation.tableIds)) {
        reservation.tableIds.forEach((tableId) => {
          const zId = tableIdToZoneIdMap.get(tableId);
          if (zId) zoneIds.add(zId);
        });
      }

      // If tables span multiple zones, show "Merged Zones"
      if (zoneIds.size > 1) {
        return t('mergedZones');
      }

      // Single zone from tables
      if (zoneIds.size === 1) {
        const onlyZoneId = Array.from(zoneIds)[0];
        const z = zones.find(z => z.id === onlyZoneId);
        return z?.name || null;
      }

      // Fallback to reservation.zoneId if no tables or mapping
      if (reservation.zoneId) {
        const z = zones.find(z => z.id === reservation.zoneId);
        return z?.name || null;
      }
    } catch {
      // ignore and fall through
    }
    return null;
  }, [tableIdToZoneIdMap, zones, t]);

  // Helper: get zone label for EVENT reservation (uses table numbers instead of UUIDs)
  const getEventReservationZoneLabel = useCallback((reservation: EventReservation): string | null => {
    try {
      const zoneIds = new Set<string>();
      // Event reservations store table numbers as strings in tableIds
      if (Array.isArray(reservation.tableIds)) {
        reservation.tableIds.forEach((tableNumber) => {
          const zId = tableNumberToZoneIdMap.get(tableNumber);
          if (zId) zoneIds.add(zId);
        });
      }

      // If tables span multiple zones, show "Merged Zones"
      if (zoneIds.size > 1) {
        return t('mergedZones');
      }

      // Single zone from tables
      if (zoneIds.size === 1) {
        const onlyZoneId = Array.from(zoneIds)[0];
        const z = zones.find(z => z.id === onlyZoneId);
        return z?.name || null;
      }

      // Fallback to reservation.zoneId if no tables or mapping
      if (reservation.zoneId) {
        const z = zones.find(z => z.id === reservation.zoneId);
        return z?.name || null;
      }
    } catch {
      // ignore and fall through
    }
    return null;
  }, [tableNumberToZoneIdMap, zones, t]);

  // Close event reservation modal when regular reservation form opens
  useEffect(() => {
    const handler = () => {
      setIsEventReservationFormOpen(false);
      setEditingEventReservation(null);
    };
    window.addEventListener('respoint-open-regular-reservation-form', handler as any);
    return () => window.removeEventListener('respoint-open-regular-reservation-form', handler as any);
  }, []);

  const renderReservationBadges = useCallback(
    (reservation: { isVip?: boolean; notes?: string; status?: string; cleared?: boolean }, options?: { showCheck?: boolean; showCancelled?: boolean; showNotArrived?: boolean }) => {
    const badges: React.ReactNode[] = [];
    const borderColor = theme === 'light' ? '#E5E7EB' : '#1F2937';

    // Determine badge type based on status:
    // - Arrived (or cleared): Green checkmark
    // - Not Arrived: Red X
    // - Cancelled: Gray X
    const isArrived = reservation.status === 'arrived' || (reservation.status === 'cancelled' && reservation.cleared === true);
    const isNotArrived = reservation.status === 'not_arrived';
    const isCancelled = reservation.status === 'cancelled' && !reservation.cleared;

    if (options?.showCheck || options?.showCancelled || options?.showNotArrived) {
      if (isNotArrived || options?.showNotArrived) {
        // Red X for not arrived
      badges.push(
        <div
            key="not-arrived"
          className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
          style={{ border: `2px solid ${borderColor}` }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
      } else if (isCancelled || options?.showCancelled) {
        // Gray X for cancelled
        badges.push(
          <div
            key="cancelled"
            className="w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center"
            style={{ border: `2px solid ${borderColor}` }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );
      } else if (isArrived || options?.showCheck) {
        // Green checkmark for arrived/cleared
      badges.push(
        <div
          key="check"
          className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
          style={{ border: `2px solid ${borderColor}` }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
            <polyline points="20,6 9,17 4,12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
      }
    }

    if (reservation.isVip) {
      badges.push(
        <div
          key="vip"
          className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center"
          style={{ border: `2px solid ${borderColor}` }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/>
          </svg>
        </div>
      );
    }

    const serviceDefinitions = getServiceTypeDefinitions(reservation.notes);
    serviceDefinitions.forEach((serviceDefinition, index) => {
      badges.push(
        <div
          key={`service-${serviceDefinition.key}-${index}`}
          className="w-5 h-5 rounded-full flex items-center justify-center text-[11px]"
          style={{
            backgroundColor: serviceDefinition.iconBg,
            color: serviceDefinition.iconColor,
            border: `2px solid ${borderColor}`,
            boxShadow: serviceDefinition.ringColor ? `0 0 0 1px ${serviceDefinition.ringColor}` : undefined,
          }}
        >
          {serviceDefinition.icon}
        </div>
      );
    });

    if (badges.length === 0) return null;

    return (
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none z-10"
        aria-hidden="true"
      >
        {badges}
      </div>
    );
  },
  [getServiceTypeDefinitions, theme]);

  // Re-render sidebar on waiter assignment events
  useEffect(() => {
    const handler = () => forceWaiterRerender(n => n + 1);
    window.addEventListener('respoint-waiter-assigned', handler as any);
    return () => window.removeEventListener('respoint-waiter-assigned', handler as any);
  }, []);

  // Debug log when focus changes
  useEffect(() => {
    console.log('🎯 Sidebar: Focus generation changed:', focusGeneration);
  }, [focusGeneration]);

  // Close service type dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!isServiceTypeMenuOpen) return;
      const target = e.target as Node;
      if (serviceMenuRef.current && !serviceMenuRef.current.contains(target)) {
        setIsServiceTypeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isServiceTypeMenuOpen]);

  // Filter reservations for selected date (include cancelled for Closed tab)
  // + also include "spillover" reservations from previous day that end after midnight
  const selectedDateReservations = React.useMemo(() => {
    const selectedKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const todayKey = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    })();
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;

    const base = reservations.filter((res) => {
      const resDateKey = String(res.date || '');
      if (resDateKey !== selectedKey) return false;
      // After midnight has passed (todayKey > selectedKey), reservations that spill into next day
      // should no longer appear on the previous day list; they "move" to the next day.
      if (todayKey > selectedKey) {
        try {
          // Load adjustments for THIS selected day to detect spillovers
          const raw = localStorage.getItem(`respoint-duration-adjustments:${selectedKey}`);
          const parsed = raw ? JSON.parse(raw) : {};
          const adj = parsed?.[res.id] || {};
          const timeToMin = (time: string) => {
            const parts = String(time || '').split(':');
            const h = Number(parts[0]) || 0;
            const m = Number(parts[1]) || 0;
            return (h % 24) * 60 + (m % 60);
          };
          const startMin = typeof adj.start === 'number' ? adj.start : timeToMin(res.time);
          const endMin = typeof adj.end === 'number' ? adj.end : (startMin + estimateDurationMinutes(res.numberOfGuests));
          if (endMin > 1440) {
            return false;
          }
        } catch {
          // ignore
        }
      }
      return true;
    });

    // Load adjustments for prev day from localStorage to detect spillovers quickly
    const prevAdjustments: Record<string, { start?: number; end?: number }> = (() => {
      try {
        const raw = localStorage.getItem(`respoint-duration-adjustments:${prevKey}`);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    })();
    const timeToMin = (time: string) => {
      const parts = String(time || '').split(':');
      const h = Number(parts[0]) || 0;
      const m = Number(parts[1]) || 0;
      return (h % 24) * 60 + (m % 60);
    };

    const spilloverFromPrev = reservations
      .filter((res) => {
        if (res.date !== prevKey) return false;
        // Only show active-ish reservations in Open tab lists; keep cleared out
        if ((res as any).cleared) return false;
        if (!(res.status === 'waiting' || res.status === 'confirmed' || res.status === 'arrived')) return false;
        return true;
      })
      .filter((res) => {
        const adj = prevAdjustments?.[res.id] || {};
        const startMin = typeof adj.start === 'number' ? adj.start : timeToMin(res.time);
        const endMin = typeof adj.end === 'number' ? adj.end : (startMin + estimateDurationMinutes(res.numberOfGuests));
        return endMin > 1440;
      })
      .map((res) => ({
        ...res,
        __spilloverFromPrevDay: true,
        __spilloverSourceDate: prevKey,
        __spilloverSelectedDate: selectedKey,
      }));

    return [...base, ...spilloverFromPrev];
  }, [reservations, selectedDate]);

  console.log('📊 Sidebar: After date filtering:', {
    totalReservations: reservations.length,
    selectedDateReservations: selectedDateReservations.length,
    selectedDate: selectedDate.toDateString(),
  });

  // Filter for Open/Closed tabs
  const openReservations = selectedDateReservations.filter(
    res => res.status === 'waiting' || res.status === 'confirmed'
  );
  
  // Closed = reservations that have finished their stay (arrived+cleared), cancelled, or never showed (not_arrived)
  const closedReservations = selectedDateReservations.filter(
    res => res.status === 'not_arrived' || res.status === 'cancelled' || (res.status === 'arrived' && res.cleared)
  );
  
  console.log('📊 Sidebar: After Open/Closed filtering:', {
    activeTab,
    openReservations: openReservations.length,
    closedReservations: closedReservations.length,
    openStatuses: openReservations.map(r => ({ guestName: r.guestName, status: r.status })),
    closedStatuses: closedReservations.map(r => ({ guestName: r.guestName, status: r.status }))
  });
  
  const reservationsToDisplay = activeTab === 'open' ? openReservations : closedReservations;

  console.log('📊 Sidebar: Final reservations to display:', {
    count: reservationsToDisplay.length,
    reservations: reservationsToDisplay.map(r => ({ guestName: r.guestName, status: r.status, time: r.time }))
  });

  // Events for the currently selected date (defensive filter in case context is ahead/behind)
  const selectedDateKey = React.useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const eventsForSelectedDate = React.useMemo(
    () => events.filter((e) => {
      // Event starts on this date
      if (e.date === selectedDateKey) return true;
      // Multi-day event: check if selectedDate is within the event's date range
      if (e.endDate) {
        const startDate = new Date(e.date);
        const endDate = new Date(e.endDate);
        const selectedDateObj = new Date(selectedDateKey);
        return selectedDateObj >= startDate && selectedDateObj <= endDate;
      }
      return false;
    }),
    [events, selectedDateKey]
  );

  const activeEvent = React.useMemo(
    () => eventsForSelectedDate.find((e) => e.id === activeEventId) || eventsForSelectedDate[0] || null,
    [eventsForSelectedDate, activeEventId]
  );

  // Timer tick for real-time event expiration checking
  const [eventExpireTick, setEventExpireTick] = React.useState(0);
  React.useEffect(() => {
    // Update every 10 seconds to check if event has expired in real-time
    const timer = setInterval(() => {
      setEventExpireTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Check if the active event has expired
  const isEventExpired = React.useMemo(() => {
    // Include eventExpireTick to force re-evaluation on timer
    void eventExpireTick;
    if (!activeEvent) return false;
    
    const now = new Date();
    const [endH, endM] = (activeEvent.endTime || '23:59').split(':').map(Number);
    
    // Determine the event end date
    const endDateStr = activeEvent.endDate || activeEvent.date;
    const endDate = new Date(endDateStr);
    endDate.setHours(endH, endM, 0, 0);
    
    return now > endDate;
  }, [activeEvent, eventExpireTick]);

  // Auto-show event info when event expires
  React.useEffect(() => {
    if (isEventExpired) {
      setShowEventInfo(true);
    }
  }, [isEventExpired]);

  // Compute event spillover reservations from previous day
  const eventSpilloverFromPrevDay = React.useMemo(() => {
    const selectedKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
    
    // Load adjustments for prev day from localStorage to detect spillovers
    const prevAdjustments: Record<string, { start?: number; end?: number }> = (() => {
      try {
        const raw = localStorage.getItem(`respoint-duration-adjustments:${prevKey}`);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    })();
    
    const timeToMin = (time: string) => {
      const parts = String(time || '').split(':');
      const h = Number(parts[0]) || 0;
      const m = Number(parts[1]) || 0;
      return (h % 24) * 60 + (m % 60);
    };
    
    return eventReservations
      .filter((r) => {
        if (r.date !== prevKey) return false;
        if (r.cleared) return false;
        if (!(r.status === 'booked' || r.status === 'arrived')) return false;
        return true;
      })
      .filter((r) => {
        const adj = prevAdjustments?.[r.id] || {};
        const startMin = typeof adj.start === 'number' ? adj.start : timeToMin(r.time);
        const endMin = typeof adj.end === 'number' ? adj.end : (startMin + estimateDurationMinutes(r.numberOfGuests));
        return endMin > 1440;
      })
      .map((r) => ({
        ...r,
        __spilloverFromPrevDay: true,
        __spilloverSourceDate: prevKey,
        __spilloverSelectedDate: selectedKey,
      }));
  }, [eventReservations, selectedDate]);

  // Active event reservations (exclude cancelled for Event tab)
  // Active event reservations: only 'booked' status (waiting for arrival)
  // 'arrived' goes to SEATED section, 'cancelled'/'not_arrived' go to Closed tab
  // IMPORTANT: Only show reservations for the selected date (not all event dates)
  // Spillover reservations from previous day are added separately
  const activeEventReservations = React.useMemo(
    () => {
      const selectedKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      
      const baseList = activeEventId
        ? eventReservations.filter((r) => r.eventId === activeEventId && r.status === 'booked' && r.date === selectedKey)
        : eventReservations.filter((r) => r.status === 'booked' && r.date === selectedKey);
      
      // Add spillover booked event reservations from previous day (these already have __spilloverFromPrevDay)
      const spilloverBooked = eventSpilloverFromPrevDay.filter(r => r.status === 'booked');
      return [...baseList, ...spilloverBooked];
    },
    [eventReservations, activeEventId, eventSpilloverFromPrevDay, selectedDate]
  );

  // Closed event reservations for Closed tab (cancelled, not_arrived, arrived+cleared)
  const closedEventReservations = React.useMemo(
    () => eventReservations.filter((r) => {
      // Filter by selected date
      const resDate = new Date(r.date);
      const datesMatch = resDate.toDateString() === selectedDate.toDateString();
      // Cleared reservations have status='arrived' with cleared=true
      return datesMatch && (r.status === 'cancelled' || r.status === 'not_arrived' || (r.status === 'arrived' && r.cleared));
    }),
    [eventReservations, selectedDate]
  );

  const activeEventTotalGuests = React.useMemo(
    () => activeEventReservations.reduce((acc, res) => acc + (res.numberOfGuests || 0), 0),
    [activeEventReservations]
  );

  // Seated event reservations (status === 'arrived' but not cleared) - for SEATED section in Event tab
  // IMPORTANT: Only show reservations for the selected date (not all event dates)
  // Spillover reservations from previous day are added separately
  const seatedEventReservationsAll = React.useMemo(
    () => {
      const selectedKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      
      const baseList = activeEventId
        ? eventReservations.filter((r) => r.eventId === activeEventId && r.status === 'arrived' && !r.cleared && r.date === selectedKey)
        : eventReservations.filter((r) => r.status === 'arrived' && !r.cleared && r.date === selectedKey);
      
      // Add spillover seated event reservations from previous day (these already have __spilloverFromPrevDay)
      const spilloverSeated = eventSpilloverFromPrevDay.filter(r => r.status === 'arrived' && !r.cleared);
      return [...baseList, ...spilloverSeated];
    },
    [eventReservations, activeEventId, eventSpilloverFromPrevDay, selectedDate]
  );

  // Sort seated event reservations using the same criteria as regular seated reservations
  const sortedSeatedEventReservations = React.useMemo(() => {
    return [...seatedEventReservationsAll].sort((a, b) => {
      // Primary: group by selected service type (if any)
      if (serviceTypeSortKey) {
        const aDefs = getServiceTypeDefinitions(a.notes);
        const bDefs = getServiceTypeDefinitions(b.notes);
        const aHas = aDefs.some(d => d.key === serviceTypeSortKey);
        const bHas = bDefs.some(d => d.key === serviceTypeSortKey);
        if (aHas !== bHas) return aHas ? -1 : 1;
      }
      switch(sortBy) {
        case 'time':
          return (a.time || '').localeCompare(b.time || '');
        case 'a-z':
          return a.guestName.localeCompare(b.guestName);
        case 'tables':
          const allTables = Object.values(zoneLayouts || {}).flatMap(l => l.tables || []);
          const tableA = a.tableIds?.[0] ? allTables.find(t => String(t.id) === a.tableIds![0] || String(t.number) === a.tableIds![0]) : null;
          const tableB = b.tableIds?.[0] ? allTables.find(t => String(t.id) === b.tableIds![0] || String(t.number) === b.tableIds![0]) : null;
          const numberA = tableA?.number || 0;
          const numberB = tableB?.number || 0;
          return numberA - numberB;
        case 'guests':
          return (a.numberOfGuests || 0) - (b.numberOfGuests || 0);
        case 'zone':
          const zoneA = zones.find(z => z.id === a.zoneId)?.name || '';
          const zoneB = zones.find(z => z.id === b.zoneId)?.name || '';
          return zoneA.localeCompare(zoneB);
        default:
          return 0;
      }
    });
  }, [seatedEventReservationsAll, sortBy, serviceTypeSortKey, getServiceTypeDefinitions, zoneLayouts, zones]);

  // Filter seated event reservations by search query
  const filteredSeatedEventReservations = sortedSeatedEventReservations.filter(res =>
    res.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.phone?.includes(searchQuery) ||
    (res.reservationCode || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSeatedEventGuests = filteredSeatedEventReservations.reduce((acc, res) => acc + (res.numberOfGuests || 0), 0);

  // Handle status click to manually mark as arrived/waiting
  const handleStatusClick = (e: React.MouseEvent, reservation: Reservation) => {
    e.stopPropagation();
    if (reservation.status === 'waiting') {
      updateReservation(reservation.id, { status: 'arrived' });
    } else if (reservation.status === 'arrived') {
      updateReservation(reservation.id, { status: 'waiting' });
    }
  };

  // Sort reservations
  const sortedReservations = [...reservationsToDisplay].sort((a, b) => {
    // Primary: group by selected service type (if any)
    if (serviceTypeSortKey) {
      const aDefs = getServiceTypeDefinitions(a.notes);
      const bDefs = getServiceTypeDefinitions(b.notes);
      const aHas = aDefs.some(d => d.key === serviceTypeSortKey);
      const bHas = bDefs.some(d => d.key === serviceTypeSortKey);
      if (aHas !== bHas) return aHas ? -1 : 1;
    }
    // Secondary: existing sort
    switch (sortBy) {
      case 'time':
        return a.time.localeCompare(b.time);
      case 'a-z':
        return a.guestName.localeCompare(b.guestName);
      case 'tables':
        const allTables = allTablesAcrossZones;
        const tableA = a.tableIds?.[0] ? allTables.find(t => t.id === a.tableIds![0]) : null;
        const tableB = b.tableIds?.[0] ? allTables.find(t => t.id === b.tableIds![0]) : null;
        const numberA = tableA?.number || 0;
        const numberB = tableB?.number || 0;
        return numberA - numberB;
      case 'guests':
        return a.numberOfGuests - b.numberOfGuests;
      case 'zone':
        const zoneA = zones.find(z => z.id === a.zoneId)?.name || '';
        const zoneB = zones.find(z => z.id === b.zoneId)?.name || '';
        return zoneA.localeCompare(zoneB);
      default:
        return 0;
    }
  });

  // Filter by search
  const filteredReservations = sortedReservations.filter(res =>
    res.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.phone?.includes(searchQuery) ||
    res.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total guests
  const totalGuests = filteredReservations.reduce((acc, res) => acc + res.numberOfGuests, 0);

  // Seated reservations (arrived but not cleared) for SEATED section in Open tab
  const seatedReservationsAll = selectedDateReservations.filter(res => res.status === 'arrived' && !res.cleared);
  const sortedSeatedReservations = [...seatedReservationsAll].sort((a, b) => {
    // Primary: group by selected service type (if any)
    if (serviceTypeSortKey) {
      const aDefs = getServiceTypeDefinitions(a.notes);
      const bDefs = getServiceTypeDefinitions(b.notes);
      const aHas = aDefs.some(d => d.key === serviceTypeSortKey);
      const bHas = bDefs.some(d => d.key === serviceTypeSortKey);
      if (aHas !== bHas) return aHas ? -1 : 1;
    }
    switch(sortBy) {
      case 'time':
        return a.time.localeCompare(b.time);
      case 'a-z':
        return a.guestName.localeCompare(b.guestName);
      case 'tables':
        const allTables = Object.values(zoneLayouts || {}).flatMap(l => l.tables || []);
        const tableA = a.tableIds?.[0] ? allTables.find(t => t.id === a.tableIds![0]) : null;
        const tableB = b.tableIds?.[0] ? allTables.find(t => t.id === b.tableIds![0]) : null;
        const numberA = tableA?.number || 0;
        const numberB = tableB?.number || 0;
        return numberA - numberB;
      case 'guests':
        return a.numberOfGuests - b.numberOfGuests;
      case 'zone':
        const zoneA = zones.find(z => z.id === a.zoneId)?.name || '';
        const zoneB = zones.find(z => z.id === b.zoneId)?.name || '';
        return zoneA.localeCompare(zoneB);
      default:
        return 0;
    }
  });
  const filteredSeatedReservations = sortedSeatedReservations.filter(res =>
    res.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.phone?.includes(searchQuery) ||
    res.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalSeatedGuests = filteredSeatedReservations.reduce((acc, res) => acc + res.numberOfGuests, 0);

  // Format date for display
  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('today');
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return t('tomorrow');
    } else {
      // dd/MM/yyyy for consistency
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  const handleReservationClick = (reservation: Reservation) => {
    if (onEditReservation) {
      // Close event reservation form if open to prevent both modals being open
      if (isEventReservationFormOpen) {
        setIsEventReservationFormOpen(false);
        setEditingEventReservation(null);
      }
      onEditReservation(reservation);
    }
  };

  // Handle waiter drag over reservation to allow drop
  const handleReservationDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    const types = e.dataTransfer.types;
    if (types.includes('application/x-respoint-waiter') || types.includes('text/waiter') || types.includes('text/plain')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleReservationDrop = (reservationId: string, e: React.DragEvent<HTMLDivElement>) => {
    try {
      let name: string | null = null;
      const custom = e.dataTransfer.getData('application/x-respoint-waiter');
      if (custom) {
        const data = JSON.parse(custom);
        name = data?.name || null;
      }
      if (!name) {
        const payload = e.dataTransfer.getData('text/waiter');
        if (payload) {
          const data = JSON.parse(payload);
          name = data?.name || null;
        }
      }
      if (!name) {
        const txt = e.dataTransfer.getData('text/plain');
        if (txt) name = txt;
      }
      if (name) {
        setAssignedWaiter(reservationId, name);
        try { window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId, name } })); } catch {}
      }
    } catch {}
  };

  const handleRemoveWaiter = (reservationId: string, e?: React.MouseEvent, waiterName?: string) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      removeAssignedWaiterUtil(reservationId, waiterName);
      window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId, name: null } }));
    } catch {}
  };

  return (
    <aside className="relative z-[130] w-80 bg-[#000814] border-r border-[#1E2A34] flex flex-col">
      {/* Tabs */}
      <div className="px-4 pt-3">
        <div className="flex">
          <button
            onClick={() => setActiveTab('open')}
            className={`flex-1 py-3 font-medium text-sm transition-colors ${
              activeTab === 'open'
                ? 'text-[#FFB800] border-b-2 border-[#FFB800]'
                : 'text-gray-500 border-b-2 border-transparent hover:text-gray-300'
            }`}
          >
            {t('open')}
          </button>
          <button
            onClick={() => setActiveTab('event')}
            className={`flex-1 py-3 font-medium text-sm transition-colors border-b-2 border-transparent relative ${
              activeTab === 'event'
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span
              className={
                activeTab === 'event'
                  ? 'bg-clip-text text-transparent bg-gradient-to-r from-[#8066D7] via-[#D759BE] via-[#3773EA] to-[#8137EA]'
                  : ''
              }
            >
              {currentLanguage === 'srb' ? 'Event' : 'Event'}
            </span>
            {activeTab === 'event' && (
              <span className="pointer-events-none absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-[#8066D7] via-[#D759BE] via-[#3773EA] to-[#8137EA]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={`flex-1 py-3 font-medium text-sm transition-colors ${
              activeTab === 'closed'
                ? 'text-[#FFB800] border-b-2 border-[#FFB800]'
                : 'text-gray-500 border-b-2 border-transparent hover:text-gray-300'
            }`}
          >
            {t('closed')}
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="p-4 space-y-3">
        {/* Search bar (shared across tabs, including Event) */}
        <div className="relative">
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search')}
            className={
              `w-full pl-10 pr-4 py-1.5 rounded-lg text-sm focus:outline-none transition-colors ` +
              (theme === 'light'
                ? 'bg-[#F8FAFC] text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-gray-300'
                : 'bg-[#0A1929] text-white placeholder-gray-500 border border-gray-800 focus:border-gray-600')
            }
          />
        </div>

        {/* Sort options (shared across tabs; used also by Event reservations) */}
        <div className="flex flex-col gap-1 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 flex-1">
              {/* Service type dropdown trigger */}
              <div className="relative" ref={serviceMenuRef}>
                <button
                  aria-label="Service type sort menu"
                  title={currentLanguage === 'srb' ? 'Sortiraj po tipu usluge' : 'Sort by service type'}
                  onClick={(e) => { e.stopPropagation(); setIsServiceTypeMenuOpen(o => !o); }}
                  className={
                    `p-1.5 rounded transition-colors ` +
                    (theme === 'light'
                      ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-[#0A1929]/60')
                  }
                >
                  {/* 3 vertical dots */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>
                {isServiceTypeMenuOpen && (
                  <div
                    className={
                      `absolute left-0 mt-2 w-56 rounded-lg shadow-lg z-[200] ` +
                      (theme === 'light' ? 'bg-white border border-gray-200' : 'bg-[#0A1929] border border-gray-800')
                    }
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2">
                      <div className={theme === 'light' ? 'text-xs text-gray-500 px-2 pb-1' : 'text-xs text-gray-400 px-2 pb-1'}>
                        {currentLanguage === 'srb' ? 'Sortiraj po usluzi' : 'Sort by service'}
                      </div>
                      <button
                        onClick={() => { setServiceTypeSortKey(null); setIsServiceTypeMenuOpen(false); }}
                        className={
                          `w-full text-left px-2 py-1.5 rounded text-sm transition-colors ` +
                          (theme === 'light'
                            ? 'hover:bg-gray-100 text-gray-700'
                            : 'hover:bg-[#0F243A] text-gray-200')
                        }
                      >
                        {currentLanguage === 'srb' ? 'Sve usluge' : 'All services'}
                      </button>
                      <div className={theme === 'light' ? 'mt-1 border-t border-gray-200' : 'mt-1 border-t border-gray-800'} />
                      <div className="max-h-56 overflow-y-auto py-1 statistics-scrollbar stable-scrollbar">
                        {SERVICE_TYPE_DEFINITIONS.map(def => (
                          <button
                            key={def.key}
                            onClick={() => { setServiceTypeSortKey(def.key); setIsServiceTypeMenuOpen(false); }}
                            className={
                              `w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ` +
                              (serviceTypeSortKey === def.key
                                ? (theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-[#0F243A] text-white')
                                : (theme === 'light' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-[#0F243A] text-gray-200'))
                            }
                          >
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px]"
                              style={{ backgroundColor: def.iconBg, color: def.iconColor, boxShadow: def.ringColor ? `0 0 0 1px ${def.ringColor}` : undefined }}
                            >
                              {def.icon}
                            </span>
                            <span>{currentLanguage === 'srb' ? def.label.srb : def.label.eng}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setSortBy('time')}
                className={`px-1.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  sortBy === 'time' 
                    ? 'bg-[#0A1929] text-white border border-gray-800' 
                    : (theme === 'light' ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' : 'text-gray-400 hover:text-gray-300')
                }`}
              >
                {t('time')}
              </button>
              <button 
                onClick={() => setSortBy('a-z')}
                className={`px-1.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  sortBy === 'a-z' 
                    ? 'bg-[#0A1929] text-white border border-gray-800' 
                    : (theme === 'light' ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' : 'text-gray-400 hover:text-gray-300')
                }`}
              >
                {t('name')}
              </button>
              <button 
                onClick={() => setSortBy('tables')}
                className={`px-1.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  sortBy === 'tables' 
                    ? 'bg-[#0A1929] text-white border border-gray-800' 
                    : (theme === 'light' ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' : 'text-gray-400 hover:text-gray-300')
                }`}
              >
                {t('table')}
              </button>
              <button 
                onClick={() => setSortBy('guests')}
                className={`px-1.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  sortBy === 'guests' 
                    ? 'bg-[#0A1929] text-white border border-gray-800' 
                    : (theme === 'light' ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' : 'text-gray-400 hover:text-gray-300')
                }`}
              >
                {t('guests')}
              </button>
              <button 
                onClick={() => setSortBy('zone')}
                className={`px-1.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  sortBy === 'zone' 
                    ? 'bg-[#0A1929] text-white border border-gray-800' 
                    : (theme === 'light' ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' : 'text-gray-400 hover:text-gray-300')
                }`}
              >
                {t('zone')}
              </button>
            </div>

            {activeTab === 'event' && (
              <button
                type="button"
                aria-label={currentLanguage === 'srb' ? 'Prikaži/sakrij sortiranje po plaćanju' : 'Toggle payment sort row'}
                onClick={() => setIsEventPaymentRowOpen(o => !o)}
                className={
                  `p-1.5 rounded transition-colors ` +
                  (theme === 'light'
                    ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#0A1929]/60')
                }
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${isEventPaymentRowOpen ? '' : '-rotate-90'}`}
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>

        {/* Second row: payment status filter (Event tab only, collapsible) */}
        {activeTab === 'event' && isEventPaymentRowOpen && (
          <div className="flex items-center justify-center gap-1 flex-wrap text-[11px] w-full">
            <button
              type="button"
              onClick={() => setEventPaymentFilter(prev => (prev === 'unpaid' ? null : 'unpaid'))}
              className={
                'inline-flex items-center px-2 py-0.5 rounded border text-[10px] transition-colors ' +
                (eventPaymentFilter === 'unpaid'
                  ? (isLight
                      ? 'border-red-500 bg-red-100 text-red-700'
                      : 'border-red-400 bg-red-500/20 text-red-300')
                  : (isLight
                      ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                      : 'border-red-400/50 bg-red-500/10 text-red-400 hover:bg-red-500/20'))
              }
            >
              {currentLanguage === 'srb' ? 'Neplaćeno' : 'Unpaid'}
            </button>
            <button
              type="button"
              onClick={() => setEventPaymentFilter(prev => (prev === 'partial' ? null : 'partial'))}
              className={
                'inline-flex items-center px-2 py-0.5 rounded border text-[10px] transition-colors ' +
                (eventPaymentFilter === 'partial'
                  ? (isLight
                      ? 'border-yellow-500 bg-yellow-100 text-yellow-700'
                      : 'border-yellow-400 bg-yellow-500/20 text-yellow-400')
                  : (isLight
                      ? 'border-yellow-300 bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                      : 'border-yellow-400/60 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'))
              }
            >
              {currentLanguage === 'srb' ? 'Delimično' : 'Partial'}
            </button>
            <button
              type="button"
              onClick={() => setEventPaymentFilter(prev => (prev === 'paid' ? null : 'paid'))}
              className={
                'inline-flex items-center px-2 py-0.5 rounded border text-[10px] transition-colors ' +
                (eventPaymentFilter === 'paid'
                  ? (isLight
                      ? 'border-green-500 bg-green-100 text-green-700'
                      : 'border-green-400 bg-green-500/20 text-green-300')
                  : (isLight
                      ? 'border-green-300 bg-green-50 text-green-600 hover:bg-green-100'
                      : 'border-green-400/60 bg-green-500/10 text-green-400 hover:bg-green-500/20'))
              }
            >
              {currentLanguage === 'srb' ? 'Plaćeno' : 'Paid'}
            </button>
            <button
              type="button"
              onClick={() => setEventPaymentFilter(prev => (prev === 'not_required' ? null : 'not_required'))}
              className={
                'inline-flex items-center px-2 py-0.5 rounded border text-[10px] transition-colors ' +
                (eventPaymentFilter === 'not_required'
                  ? (isLight
                      ? 'border-gray-400 bg-gray-200 text-gray-800'
                      : 'border-gray-400 bg-gray-500/20 text-gray-200')
                  : (isLight
                      ? 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'border-gray-400/60 bg-gray-500/10 text-gray-300 hover:bg-gray-500/20'))
              }
            >
              {currentLanguage === 'srb' ? 'Bez plaćanja' : 'No payment'}
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Reservations / Event content */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 sidebar-scrollbar">
        {activeTab === 'event' && (
          <div className="pt-0 pb-4 relative h-full">
            {loadingEvents && (
              <div className="flex flex-col items-center justify-center py-6 text-gray-400 text-sm">
                <div className="mb-3 h-4 w-4 rounded-full border-2 border-gray-600 border-t-transparent animate-spin" />
                <span>
                  {currentLanguage === 'srb' ? 'Učitavanje eventova...' : 'Loading events...'}
                </span>
              </div>
            )}
            {!loadingEvents && eventsForSelectedDate.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <p className="text-gray-400 text-sm mb-4">
                  {currentLanguage === 'srb'
                    ? 'Nema eventova za ovaj dan - kreiraj novi!'
                    : 'There are no events for this day - create one!'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateEventOpen(true)}
                  disabled={(() => {
                    // Disable if selected date is in the past
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const selected = new Date(selectedDate);
                    selected.setHours(0, 0, 0, 0);
                    return selected < today;
                  })()}
                  className={`h-8 rounded-[15px] relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#D759BE]/60 px-6 ${
                    (() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const selected = new Date(selectedDate);
                      selected.setHours(0, 0, 0, 0);
                      return selected < today;
                    })() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div
                    className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity"
                    style={{
                      background:
                        'linear-gradient(90deg,#8066D7 0%,#D759BE 28%,#3773EA 73%,#8137EA 100%)',
                    }}
                  />
                  <div className="absolute inset-[1px] rounded-[14px] border border-white/20" />
                    <span
                    className="relative z-10 text-xs font-medium tracking-wide"
                    style={{ color: '#FFFFFF' }}
                    >
                    {currentLanguage === 'srb' ? 'Kreiraj Event' : 'Create Event'}
                    </span>
                </button>
                  </div>
            )}
            {/* Success animation overlay for event clearing */}
            {showEventClearSuccess && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="relative">
                  {/* Green circle with animated checkmark */}
                  <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center animate-[scaleIn_0.3s_ease-out]">
                    <svg 
                      className="w-14 h-14 text-white" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="3"
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path 
                        d="M5 13l4 4L19 7" 
                        className="animate-[drawCheck_0.5s_ease-out_0.2s_forwards]"
                        style={{
                          strokeDasharray: 30,
                          strokeDashoffset: 30,
                        }}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}
            {!loadingEvents && eventsForSelectedDate.length > 0 && activeEvent && (
              <div className="relative">
                {/* Event info section (above Booked section) */}
                {showEventInfo ? (
                  <div className="mb-4 flex flex-col items-center text-center space-y-1.5">
                    <div>
                    <div
                      className={`text-[13px] font-medium max-w-full truncate ${
                        isLight ? 'text-gray-800' : 'text-gray-100'
                      }`}
                      title={activeEvent.name}
                    >
                      {activeEvent.name}
                    </div>
                    <div
                      className={`text-[11px] ${
                        isLight ? 'text-gray-600' : 'text-gray-400'
                      }`}
                    >
                        {`${formatDate(selectedDate)} • ${activeEvent.startTime}–${activeEvent.endTime}${activeEvent.endDate ? ` (${activeEvent.endDate.split('-').reverse().join('.')})` : ''}`}
                      </div>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-[11px]">
                      <span className={`inline-flex items-center gap-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          className={isLight ? 'text-gray-500' : 'text-gray-400'}
                        >
                          <path
                            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="9"
                            cy="7"
                            r="4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M23 21v-2a4 4 0 0 0-3-3.87"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M16 3.13a4 4 0 0 1 0 7.75"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>
                          {activeEvent.capacityTotal != null
                            ? `${activeEventTotalGuests}/${activeEvent.capacityTotal}`
                            : activeEventTotalGuests}
                        </span>
                      </span>
                      {activeEvent.enableDeposit && activeEvent.depositAmount != null && (
                        <span className={isLight ? 'text-gray-700' : 'text-gray-200'}>
                          {currentLanguage === 'srb' ? 'Depozit' : 'Deposit'} - {activeEvent.depositAmount}
                        </span>
                      )}
                      {activeEvent.enableTicket && activeEvent.ticketPrice != null && (
                        <span className={isLight ? 'text-gray-700' : 'text-gray-200'}>
                          {currentLanguage === 'srb' ? 'Ulaznica' : 'Ticket'} - {activeEvent.ticketPrice}
                        </span>
                      )}
                    </div>

                    {isEventExpired ? (
                      <>
                        {/* Event is Done button (gradient, no action) */}
                        <button
                          type="button"
                          disabled
                          className="mt-2 w-full inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-[#8066D7] via-[#D759BE] via-[#3773EA] to-[#8137EA] !text-white cursor-default shadow-sm rp-event-done-glow"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="mr-1.5"
                          >
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {currentLanguage === 'srb' ? 'Event je završen!' : 'Event is Done!'}
                        </button>

                        {/* Clear Event button */}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              // Get all reservations for this event
                              const bookedReservations = eventReservations.filter(
                                (r) => r.eventId === activeEvent.id && r.status === 'booked'
                              );
                              const seatedReservations = eventReservations.filter(
                                (r) => r.eventId === activeEvent.id && r.status === 'arrived' && !r.cleared
                              );
                              
                              // Mark all booked (not arrived) reservations as not_arrived
                              for (const res of bookedReservations) {
                                await updateEventReservation(res.id, { status: 'not_arrived' } as any);
                              }
                              
                              // If there are seated reservations, show animation and convert them to regular reservations
                              if (seatedReservations.length > 0) {
                                // Start slide-out animation
                                setIsEventClearingAnimation(true);
                                
                                // Wait for animation
                                await new Promise(resolve => setTimeout(resolve, 500));
                                
                                // Convert seated event reservations to regular reservations
                                for (const res of seatedReservations) {
                                  // Create a regular reservation with same details
                                  await addReservation({
                                    guestName: res.guestName,
                                    date: res.date,
                                    time: res.time,
                                    numberOfGuests: res.numberOfGuests,
                                    zoneId: res.zoneId || '',
                                    tableIds: res.tableIds || [],
                                    phone: res.phone || '',
                                    email: res.email || '',
                                    notes: res.notes || '',
                                    color: res.color || '#8B5CF6',
                                    status: 'arrived', // Already seated
                                    isVip: res.isVip || false,
                                  });
                                  
                                  // Mark event reservation as cleared (processed)
                                  await updateEventReservation(res.id, { status: 'arrived', cleared: true } as any);
                                }
                                
                                // Show success animation
                                setIsEventClearingAnimation(false);
                                setShowEventClearSuccess(true);
                                
                                // Wait for success animation then clear it
                                await new Promise(resolve => setTimeout(resolve, 1500));
                                setShowEventClearSuccess(false);
                              }
                              
                              // Delete the event
                              await deleteEvent(activeEvent.id);
                            } catch (err) {
                              console.error('Failed to clear event:', err);
                              setIsEventClearingAnimation(false);
                              setShowEventClearSuccess(false);
                            }
                        }}
                          className={
                            'mt-1 w-full inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ' +
                            (isLight
                              ? 'bg-[#F8FAFC] hover:bg-white border border-gray-300 text-gray-900'
                              : 'bg-[#111827] hover:bg-[#1F2937] border border-gray-700 !text-white')
                          }
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="mr-1.5"
                          >
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {currentLanguage === 'srb' ? 'Očisti event' : 'Clear Event'}
                        </button>
                      </>
                    ) : (
                      <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventForModal(activeEvent);
                        setIsEditEventOpen(true);
                      }}
                      className={
                        'mt-2 w-full inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ' +
                        (isLight
                          ? 'bg-[#F8FAFC] hover:bg-white border border-gray-200 text-gray-900'
                          : 'bg-[#0A1929] hover:bg-[#0A1929]/80 border border-gray-800 text-gray-100')
                      }
                    >
                      {currentLanguage === 'srb' ? 'Edituj event' : 'Edit event'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowEventInfo(false)}
                      className={
                        'mt-1 w-full inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ' +
                        (isLight
                          ? 'bg-[#F8FAFC] hover:bg-white border border-gray-200 text-gray-900'
                          : 'bg-[#0A1929] hover:bg-[#0A1929]/80 border border-gray-800 text-gray-100')
                      }
                    >
                      {currentLanguage === 'srb' ? 'Sakrij info' : 'Hide info'}
                    </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mb-4 flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => setShowEventInfo(true)}
                      className={
                        'w-full inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ' +
                        (isEventExpired
                          ? 'bg-gradient-to-r from-[#8066D7] via-[#D759BE] via-[#3773EA] to-[#8137EA] text-white shadow-sm hover:brightness-110 rp-event-done-glow'
                          : isLight
                          ? 'bg-[#F8FAFC] hover:bg-white border border-gray-200 text-gray-900'
                          : 'bg-[#0A1929] hover:bg-[#0A1929]/80 border border-gray-800 text-gray-100')
                      }
                    >
                      {isEventExpired 
                        ? (currentLanguage === 'srb' ? 'Event je završen!' : 'Event is Done!')
                        : (currentLanguage === 'srb' ? 'Prikaži info' : 'Show info')}
                    </button>
                  </div>
                )}

                {/* BOOKED section header */}
                <div
                  className="flex items-center justify-between mb-3 cursor-pointer select-none"
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsEventOpen((o) => !o)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsEventOpen((o) => !o);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      className={`text-gray-400 transition-transform duration-200 ${
                        isEventOpen ? '' : '-rotate-90'
                      }`}
                    >
                      <path
                        d="M19 9l-7 7-7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">
                      {t('booked')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Event reservations count */}
                    <div className="flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-400"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <span className="text-gray-400 text-sm">
                        {activeEventReservations.length}
                      </span>
                    </div>
                    {/* Event guests */}
                    <div className="flex items-center gap-1">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-gray-400"
                      >
                        <path
                          d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="9"
                          cy="7"
                          r="4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M23 21v-2a4 4 0 0 0-3-3.87"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M16 3.13a4 4 0 0 1 0 7.75"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-gray-400 text-sm">
                        {activeEventTotalGuests}
                      </span>
                    </div>
                  </div>
                </div>

                {isEventOpen && (
                  <>
                {/* Event reservations list */}
                <div className="mt-2 mb-4">
                  {loadingReservations ? (
                    <div
                      className={`flex flex-col items-center justify-center gap-2 text-sm py-6 ${
                        isLight ? 'text-gray-600' : 'text-gray-400'
                      }`}
                    >
                      <div className="h-4 w-4 rounded-full border-2 border-gray-600 border-t-transparent animate-spin" />
                      <span>
                        {currentLanguage === 'srb'
                          ? 'Učitavanje rezervacija za event...'
                          : 'Loading event reservations...'}
                      </span>
                    </div>
                  ) : activeEventReservations.length === 0 ? (
                    <div className="px-1 py-3 text-center text-sm text-gray-500">
                      {currentLanguage === 'srb'
                        ? 'Još nema rezervacija za ovaj event. Dodaj jednu preko plus dugmeta...'
                        : 'There are no reservations for this event. Add one on plus button...'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeEventReservations
                        .filter((res) => {
                          const q = searchQuery.trim().toLowerCase();
                          if (q) {
                            const matchesSearch =
                              res.guestName.toLowerCase().includes(q) ||
                              (res.phone || '').toLowerCase().includes(q) ||
                              (res.reservationCode || '').toLowerCase().includes(q);
                            if (!matchesSearch) return false;
                          }

                          if (eventPaymentFilter) {
                            return res.paymentStatus === eventPaymentFilter;
                          }

                          return true;
                        })
                        .sort((a, b) => {
                          if (serviceTypeSortKey) {
                            const aDefs = getServiceTypeDefinitions(a.notes);
                            const bDefs = getServiceTypeDefinitions(b.notes);
                            const aHas = aDefs.some((d) => d.key === serviceTypeSortKey);
                            const bHas = bDefs.some((d) => d.key === serviceTypeSortKey);
                            if (aHas !== bHas) return aHas ? -1 : 1;
                          }

                          switch (sortBy) {
                            case 'a-z':
                              return a.guestName.localeCompare(b.guestName);
                            case 'guests':
                              return (a.numberOfGuests || 0) - (b.numberOfGuests || 0);
                            case 'time':
                            default:
                              return (a.time || '').localeCompare(b.time || '');
                          }
                        })
                        .map((reservation) => {
                          const paymentLabel =
                            reservation.paymentStatus === 'paid'
                              ? currentLanguage === 'srb'
                                ? 'Plaćeno'
                                : 'Paid'
                              : reservation.paymentStatus === 'partial'
                              ? currentLanguage === 'srb'
                                ? 'Delimično'
                                : 'Partial'
                              : reservation.paymentStatus === 'not_required'
                              ? currentLanguage === 'srb'
                                ? 'Bez plaćanja'
                                : 'No payment'
                              : currentLanguage === 'srb'
                              ? 'Neplaćeno'
                              : 'Unpaid';
                          const paymentClass =
                            reservation.paymentStatus === 'paid'
                              ? (isLight
                                  ? 'bg-green-100 text-green-700 border border-green-300'
                                  : 'bg-green-500/15 text-green-300 border border-green-500/40')
                              : reservation.paymentStatus === 'partial'
                              ? (isLight
                                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                  : 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/40')
                              : reservation.paymentStatus === 'not_required'
                              ? (isLight
                                  ? 'bg-gray-200 text-gray-700 border border-gray-300'
                                  : 'bg-gray-500/15 text-gray-300 border border-gray-500/40')
                              : (isLight
                                  ? 'bg-red-100 text-red-700 border border-red-300'
                                  : 'bg-red-500/10 text-red-300 border border-red-500/40');

                          // Use reservation's color field if available, otherwise use default purple
                          const reservationColor = reservation.color || '#8B5CF6';

                          // Use helper to detect multi-zone (merged zones) for event reservations
                          const zoneName = getEventReservationZoneLabel(reservation);

                          return (
                            <div
                              key={reservation.id}
                              className={
                                `rounded-lg cursor-pointer relative overflow-visible border ` +
                                (theme === 'light'
                                  ? 'bg-[#F8FAFC] hover:bg-white border-gray-200'
                                  : 'bg-[#0A1929] hover:bg-[#0A1929]/80 border-gray-800')
                              }
                              onClick={() => {
                                try {
                                  // Dispatch event to close regular reservation form if open
                                  window.dispatchEvent(new CustomEvent('respoint-close-regular-reservation-form'));
                                  window.dispatchEvent(
                                    new CustomEvent('respoint-open-event-reservation-form')
                                  );
                                } catch {}
                                setEditingEventReservation(reservation);
                                setIsEventReservationFormOpen(true);
                              }}
                              onDragOver={handleReservationDragOver}
                              onDrop={(e) => handleReservationDrop(reservation.id, e)}
                              data-reservation-id={reservation.id}
                            >
                              {renderReservationBadges({ isVip: reservation.isVip, notes: reservation.notes })}

                              <div className="relative rounded-lg overflow-hidden">
                                {/* Color indicator using reservation's color */}
                                <div
                                  className="absolute left-0 top-0 bottom-0 w-1"
                                  style={{ backgroundColor: reservationColor }}
                                />

                                <div className="p-4 pl-6">
                                  {/* Top row: guest name + countdown */}
                                  <div className="flex justify-between items-start mb-2 gap-2">
                                    <h4
                                      className={
                                        theme === 'light'
                                          ? 'text-gray-900 font-medium'
                                          : 'text-white font-medium'
                                      }
                                    >
                                      {(reservation as any).__spilloverFromPrevDay ? (
                                        <span
                                          className="mr-1 inline-flex items-center align-middle text-blue-400"
                                          title={currentLanguage === 'srb' ? 'Nastavak iz prethodnog dana' : 'Continues from previous day'}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M7 7h7a4 4 0 0 1 4 4v6" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M7 7l4-4M7 7l4 4" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        </span>
                                      ) : null}
                                      {reservation.guestName}
                                    </h4>
                                    <CountdownTimer
                                      reservationDate={(reservation as any).__spilloverFromPrevDay ? (reservation as any).__spilloverSourceDate : reservation.date}
                                      reservationTime={reservation.time || activeEvent?.startTime || '20:00'}
                                      reservationId={reservation.id}
                                      onStatusUpdate={(id, status) => {
                                        try {
                                          updateEventReservation(id, { status } as any);
                                        } catch {}
                                      }}
                                    />
                                  </div>

                                  {/* Main info line: time, guests, tables */}
                                  <div
                                    className={
                                      theme === 'light'
                                        ? 'flex items-center gap-4 text-sm text-gray-700 mb-1'
                                        : 'flex items-center gap-4 text-sm text-gray-300 mb-1'
                                    }
                                  >
                                    <span
                                      className={
                                        theme === 'light'
                                          ? 'font-medium text-gray-800'
                                          : 'font-medium'
                                      }
                                    >
                                      {reservation.time || '--:--'}
                                    </span>

                                    <div className="flex items-center gap-1">
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="text-gray-400"
                                      >
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                      </svg>
                                      <span
                                        className={
                                          theme === 'light' ? 'text-gray-700' : undefined
                                        }
                                      >
                                        {reservation.numberOfGuests || 0}
                                      </span>
                                    </div>

                                    {reservation.tableIds && reservation.tableIds.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        <svg
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          className="text-gray-400"
                                        >
                                          <rect
                                            x="2"
                                            y="3"
                                            width="20"
                                            height="14"
                                            rx="2"
                                            ry="2"
                                          />
                                          <line x1="8" y1="21" x2="16" y2="21" />
                                          <line x1="12" y1="17" x2="12" y2="21" />
                                        </svg>
                                        <span
                                          className={
                                            theme === 'light' ? 'text-gray-700' : undefined
                                          }
                                        >
                                          {formatTableNames(reservation.tableIds, allTablesZoneLayouts)}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Secondary info line: code and payment status */}
                                  <div
                                    className={
                                      theme === 'light'
                                        ? 'flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500'
                                        : 'flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500'
                                    }
                                  >
                                    <span
                                      className={
                                        'font-mono ' +
                                        (theme === 'light'
                                          ? 'text-gray-800'
                                          : 'text-gray-300')
                                      }
                                    >
                                      {reservation.reservationCode}
                                    </span>
                                    {/* Payment status badge - rectangular */}
                                    <span
                                      className={
                                        'inline-flex items-center px-2 py-0.5 rounded text-[10px] cursor-pointer ' +
                                        paymentClass
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const order: EventPaymentStatus[] = [
                                          'unpaid',
                                          'partial',
                                          'paid',
                                          'not_required',
                                        ];
                                        const currentIndex = order.indexOf(
                                          reservation.paymentStatus
                                        );
                                        const nextStatus =
                                          order[(currentIndex + 1 + order.length) % order.length];
                                        try {
                                          updateEventReservation(reservation.id, {
                                            paymentStatus: nextStatus,
                                          });
                                        } catch {}
                                      }}
                                    >
                                      {paymentLabel}
                                    </span>
                                  </div>

                                  {/* Service type and zone line (like regular reservations) */}
                                  {(() => {
                                    const serviceDefinitions = getServiceTypeDefinitions(reservation.notes);
                                    const hasServiceTypes = serviceDefinitions.length > 0;
                                    const serviceLabel = hasServiceTypes
                                      ? serviceDefinitions
                                          .map((def) =>
                                            currentLanguage === 'srb'
                                              ? def.label.srb
                                              : def.label.eng
                                          )
                                          .join(', ')
                                      : '';

                                    if (!hasServiceTypes && !zoneName) return null;

                                    return (
                                      <div
                                        className={
                                          theme === 'light'
                                            ? 'flex items-center gap-4 text-xs text-gray-500'
                                            : 'flex items-center gap-4 text-xs text-gray-500'
                                        }
                                      >
                                        {hasServiceTypes && (
                                          <span
                                            className={
                                              theme === 'light' ? 'text-gray-500' : undefined
                                            }
                                          >
                                            {serviceLabel}
                                          </span>
                                        )}
                                        {zoneName && (
                                          <>
                                            {hasServiceTypes && <span>•</span>}
                                            <span
                                              className={
                                                theme === 'light' ? 'text-gray-500' : undefined
                                              }
                                            >
                                              {zoneName}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* Waiters row for event reservations */}
                                  {(() => {
                                    const list = getAssignedWaiters(reservation.id);
                                    if (!list || list.length === 0) return null;
                                    return (
                                      <div className="mt-1 flex flex-wrap items-center gap-1">
                                        {list.map((w) => (
                                          <span key={w} className={
                                            `group relative inline-flex items-center text-[10px] pl-1.5 pr-1.5 py-0.5 rounded border ` +
                                            (theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-[#0F243A] border-gray-800 text-gray-300')
                                          }>
                                            <span className="pr-1">{w}</span>
                                            <button
                                              aria-label={`Remove ${w}`}
                                              title={`Remove ${w}`}
                                              onClick={(e) => handleRemoveWaiter(reservation.id, e, w)}
                                              className={
                                                `absolute -top-1 -right-1 z-10 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-white focus:outline-none focus:ring-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition ` +
                                                (theme === 'light' ? 'bg-gray-500 hover:bg-gray-400 focus:ring-gray-400/60' : 'bg-gray-600 hover:bg-gray-400 focus:ring-gray-400/60')
                                              }
                                            >
                                              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={theme === 'light' ? '#FFFFFF' : 'currentColor'} strokeWidth="3">
                                                <path d="M18 6L6 18M6 6l12 12" />
                                              </svg>
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
                </>
                )}

                {/* SEATED section for event reservations (outside BOOKED dropdown) */}
                <div>
                  <div
                    className="flex items-center justify-between mb-3 mt-4 cursor-pointer select-none"
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsEventSeatedOpen(o => !o)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsEventSeatedOpen(o => !o); } }}
                  >
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`text-gray-400 transition-transform duration-200 ${isEventSeatedOpen ? '' : '-rotate-90'}`}>
                        <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">{t('seated')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <span className="text-gray-400 text-sm">{filteredSeatedEventReservations.length}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-gray-400 text-sm">{totalSeatedEventGuests}</span>
                      </div>
                    </div>
                  </div>

                  {isEventSeatedOpen && (filteredSeatedEventReservations.length > 0 ? (
                    <div className="space-y-2 mb-6">
                      {filteredSeatedEventReservations.map((reservation) => {
                        const reservationColor = reservation.color || '#8B5CF6';
                        const zoneName = getEventReservationZoneLabel(reservation);
                        const serviceDefinitions = getServiceTypeDefinitions(reservation.notes);
                        const hasServiceTypes = serviceDefinitions.length > 0;

                        return (
                          <div
                            key={`event-seated-${reservation.id}`}
                            onClick={() => {
                              try {
                                window.dispatchEvent(new CustomEvent('respoint-close-regular-reservation-form'));
                                window.dispatchEvent(new CustomEvent('respoint-open-event-reservation-form'));
                              } catch {}
                              setEditingEventReservation(reservation);
                              setIsEventReservationFormOpen(true);
                            }}
                            onDragOver={handleReservationDragOver}
                            onDrop={(e) => handleReservationDrop(reservation.id, e)}
                            className={
                              `rounded-lg cursor-pointer relative overflow-visible border ` +
                              (isEventClearingAnimation
                                ? 'transition-all duration-200 transform -translate-x-full opacity-0 '
                                : '') +
                              (theme === 'light'
                                ? 'bg-[#F8FAFC] hover:bg-white border-gray-200'
                                : 'bg-[#0A1929] hover:bg-[#0A1929]/80 border-gray-800')
                            }
                            data-reservation-id={reservation.id}
                          >
                            {renderReservationBadges({ isVip: reservation.isVip, notes: reservation.notes, status: 'arrived' }, { showCheck: true })}

                            <div className="relative rounded-lg overflow-hidden">
                              <div
                                className="absolute left-0 top-0 bottom-0 w-1"
                                style={{ backgroundColor: reservationColor }}
                              />

                              <div className="p-4 pl-6">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className={theme === 'light' ? 'text-gray-900 font-medium' : 'text-white font-medium'}>
                                    {(reservation as any).__spilloverFromPrevDay ? (
                                      <span
                                        className="mr-1 inline-flex items-center align-middle text-blue-400"
                                        title={currentLanguage === 'srb' ? 'Nastavak iz prethodnog dana' : 'Continues from previous day'}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M7 7h7a4 4 0 0 1 4 4v6" strokeLinecap="round" strokeLinejoin="round" />
                                          <path d="M7 7l4-4M7 7l4 4" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      </span>
                                    ) : null}
                                    {reservation.guestName}
                                  </h4>
                                  <EventSeatedTimer
                                    reservationDate={(reservation as any).__spilloverFromPrevDay ? (reservation as any).__spilloverSourceDate : reservation.date}
                                    reservationTime={reservation.time || activeEvent?.startTime || '20:00'}
                                    numberOfGuests={reservation.numberOfGuests}
                                    reservationId={reservation.id}
                                    tableIds={reservation.tableIds}
                                    onClearConfirm={(id) => {
                                      try {
                                        // Mark as arrived with cleared flag (guest came and left)
                                        updateEventReservation(id, { status: 'arrived', cleared: true } as any);
                                      } catch {}
                                    }}
                                    onExtend={() => {}}
                                  />
                                </div>

                                {/* Main info line: time, guests, table */}
                                <div className={theme === 'light' ? 'flex items-center gap-4 text-sm text-gray-700 mb-1' : 'flex items-center gap-4 text-sm text-gray-300 mb-1'}>
                                  <span className={theme === 'light' ? 'font-medium text-gray-800' : 'font-medium'}>{reservation.time || '--:--'}</span>

                                  <div className="flex items-center gap-1">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={theme === 'light' ? 'text-gray-400' : 'text-gray-400'}>
                                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                      <circle cx="9" cy="7" r="4"/>
                                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                    <span className={theme === 'light' ? 'text-gray-700' : undefined}>{reservation.numberOfGuests || 0}</span>
                                  </div>

                                  {reservation.tableIds && reservation.tableIds.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={theme === 'light' ? 'text-gray-400' : 'text-gray-400'}>
                                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                        <line x1="8" y1="21" x2="16" y2="21"/>
                                        <line x1="12" y1="17" x2="12" y2="21"/>
                                      </svg>
                                      <span className={theme === 'light' ? 'text-gray-700' : undefined}>
                                        {formatTableNames(reservation.tableIds, allTablesZoneLayouts)}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Reservation code and Event badge */}
                                <div className={theme === 'light' ? 'flex flex-wrap items-center gap-3 text-xs text-gray-500' : 'flex flex-wrap items-center gap-3 text-xs text-gray-500'}>
                                  <span className={'font-mono ' + (theme === 'light' ? 'text-gray-800' : 'text-gray-300')}>
                                    {reservation.reservationCode}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] border ${theme === 'light' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                                    {currentLanguage === 'srb' ? 'Event' : 'Event'}
                                  </span>
                                </div>

                                {/* Service type and zone line */}
                                {(hasServiceTypes || zoneName) && (
                                  <div className={theme === 'light' ? 'flex items-center gap-4 text-xs text-gray-500 mt-1' : 'flex items-center gap-4 text-xs text-gray-500 mt-1'}>
                                    {hasServiceTypes && (
                                      <span className={theme === 'light' ? 'text-gray-500' : undefined}>
                                        {serviceDefinitions.map(def => currentLanguage === 'srb' ? def.label.srb : def.label.eng).join(', ')}
                                      </span>
                                    )}
                                    {zoneName && (
                                      <>
                                        {hasServiceTypes && <span>•</span>}
                                        <span className={theme === 'light' ? 'text-gray-500' : undefined}>
                                          {zoneName}
                                        </span>
                </>
                )}
              </div>
            )}

                                {/* Waiters row under zone */}
                                {(() => {
                                  const list = getAssignedWaiters(reservation.id);
                                  if (!list || list.length === 0) return null;
                                  return (
                                    <div className="mt-1 flex flex-wrap items-center gap-1">
                                      {list.map((w) => (
                                        <span key={w} className={
                                          `group relative inline-flex items-center text-[10px] pl-1.5 pr-1.5 py-0.5 rounded border ` +
                                          (theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-[#0F243A] border-gray-800 text-gray-300')
                                        }>
                                          <span className="pr-1">{w}</span>
                                          <button
                                            aria-label={`Remove ${w}`}
                                            title={`Remove ${w}`}
                                            onClick={(e) => handleRemoveWaiter(reservation.id, e, w)}
                                            className={
                                              `absolute -top-1 -right-1 z-10 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-white focus:outline-none focus:ring-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition ` +
                                              (theme === 'light' ? 'bg-gray-500 hover:bg-gray-400 focus:ring-gray-400/60' : 'bg-gray-600 hover:bg-gray-400 focus:ring-gray-400/60')
                                            }
                                          >
                                            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={theme === 'light' ? '#FFFFFF' : 'currentColor'} strokeWidth="3">
                                              <path d="M18 6L6 18M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <p className="text-gray-500 text-sm">{t('noSeatedReservations')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab !== 'event' && (
          <div>
        {/* Booked/Cleared section (Booked in Open, Cleared in Closed) */}
        <div
          className="flex items-center justify-between mb-3 cursor-pointer select-none"
          role="button"
          tabIndex={0}
          onClick={() => (activeTab === 'closed' ? setIsClearedOpen(o => !o) : setIsBookedOpen(o => !o))}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (activeTab === 'closed' ? setIsClearedOpen(o => !o) : setIsBookedOpen(o => !o)); } }}
        >
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`text-gray-400 transition-transform duration-200 ${ (activeTab === 'closed' ? isClearedOpen : isBookedOpen) ? '' : '-rotate-90' }`}>
              <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">
              {activeTab === 'closed' ? t('cleared') : t('booked')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Reservations count */}
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span className="text-gray-400 text-sm">{filteredReservations.length}</span>
            </div>
            {/* Guests count */}
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-gray-400 text-sm">{totalGuests}</span>
            </div>
          </div>
        </div>

        {/* Reservation items or empty state */}
        {(activeTab === 'closed' ? isClearedOpen : isBookedOpen) && ((filteredReservations.length > 0 || (activeTab === 'closed' && closedEventReservations.length > 0)) ? (
          <div className="space-y-2">
            {filteredReservations.map((reservation) => (
              <div 
                key={reservation.id}
                onClick={() => handleReservationClick(reservation)}
                onDragOver={handleReservationDragOver}
                onDrop={(e) => handleReservationDrop(reservation.id, e)}
                className={
                  `rounded-lg cursor-pointer relative overflow-visible border ` +
                  (transferringReservationId === reservation.id
                    ? 'transition-all duration-300 translate-x-full opacity-0'
                    : '') +
                  (theme === 'light'
                    ? ' bg-[#F8FAFC] hover:bg-white border-gray-200'
                    : ' bg-[#0A1929] hover:bg-[#0A1929]/80 border-gray-800')
                }
                data-reservation-id={reservation.id}
              >
                {renderReservationBadges(reservation, { showCheck: activeTab === 'closed' })}

                <div className="relative rounded-lg overflow-hidden">
                  {/* Color indicator */}
                  {reservation.color && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: reservation.color }}
                    />
                  )}

                  <div className="p-4 pl-6">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`truncate min-w-0 ${theme === 'light' ? 'text-gray-900 font-medium' : 'text-white font-medium'}`}>
                        {(reservation as any).__spilloverFromPrevDay ? (
                          <span
                            className="mr-1 inline-flex items-center align-middle text-blue-400"
                            title={currentLanguage === 'srb' ? 'Nastavak iz prethodnog dana' : 'Continues from previous day'}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M7 7h7a4 4 0 0 1 4 4v6" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M7 7l4-4M7 7l4 4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        ) : null}
                        {reservation.guestName}
                      </h4>
                      {reservation.status === 'waiting' ? (
                        <CountdownTimer 
                          reservationDate={reservation.date}
                          reservationTime={reservation.time}
                          reservationId={reservation.id}
                          onStatusUpdate={(id, status) => updateReservation(id, { status }) }
                        />
                      ) : (
                        <span 
                          onClick={(e) => handleStatusClick(e, reservation)}
                          className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors whitespace-nowrap flex-shrink-0 ${
                            reservation.status === 'confirmed' 
                              ? (theme === 'light' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/40')
                              : (reservation.status === 'arrived' || (activeTab === 'closed' && reservation.status === 'cancelled' && (reservation as any).cleared))
                              ? (theme === 'light' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-green-900/30 text-green-400 hover:bg-green-900/40')
                              : reservation.status === 'not_arrived'
                              ? (theme === 'light' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-red-900/30 text-red-400 hover:bg-red-900/40')
                              : reservation.status === 'cancelled'
                              ? (theme === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-gray-900/30 text-gray-400 cursor-default')
                              : (theme === 'light' ? 'bg-gray-200 text-gray-700' : 'bg-gray-700 text-gray-300')
                          }`}
                        >
                          {reservation.status === 'not_arrived' ? (
                            <div className="flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18,6 6,18"/>
                                <path d="M6,6 18,18"/>
                              </svg>
                              <span>{t('notArrived')}</span>
                            </div>
                          ) : (reservation.status === 'arrived' || (activeTab === 'closed' && reservation.status === 'cancelled' && (reservation as any).cleared)) ? (
                            <div className="flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20,6 9,17 4,12"/>
                              </svg>
                              <span>{t('arrived')}</span>
                            </div>
                          ) : reservation.status === 'cancelled' ? (
                            <div className="flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 9L15 15"/>
                                <path d="M15 9L9 15"/>
                              </svg>
                              <span>{t('cancelled')}</span>
                            </div>
                          ) : (
                            reservation.status
                          )}
                        </span>
                      )}
                    </div>
                    
                    {/* Main info line: time, guests, table */}
                    <div className={theme === 'light' ? 'flex items-center gap-4 text-sm text-gray-700 mb-1' : 'flex items-center gap-4 text-sm text-gray-300 mb-1'}>
                      <span className={theme === 'light' ? 'font-medium text-gray-800' : 'font-medium'}>{reservation.time}</span>
                      
                      <div className="flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={theme === 'light' ? 'text-gray-400' : 'text-gray-400'}>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <span className={theme === 'light' ? 'text-gray-700' : undefined}>{reservation.numberOfGuests}</span>
                      </div>
                      
                      {reservation.tableIds && reservation.tableIds.length > 0 && (
                        <div className="flex items-center gap-1">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={theme === 'light' ? 'text-gray-400' : 'text-gray-400'}>
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                          </svg>
                          <span className={theme === 'light' ? 'text-gray-700' : undefined}>
                            {formatTableNames(reservation.tableIds, allTablesZoneLayouts)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Secondary info line: service type and zone */}
                    <div className={theme === 'light' ? 'flex items-center gap-4 text-xs text-gray-500' : 'flex items-center gap-4 text-xs text-gray-500'}>
                      {reservation.notes && (
                        <span className={theme === 'light' ? 'text-gray-500' : undefined}>{reservation.notes}</span>
                      )}
                      {(() => {
                        const zoneLabel = getReservationZoneLabel(reservation);
                        if (!zoneLabel) return null;
                        return (
                          <>
                            {reservation.notes && <span>•</span>}
                            <span className={theme === 'light' ? 'text-gray-500' : undefined}>{zoneLabel}</span>
                          </>
                        );
                      })()}
                    </div>

                    {/* Waiters row under zone */}
                    {(() => {
                      const list = getAssignedWaiters(reservation.id);
                      if (!list || list.length === 0) return null;
                      return (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {list.map((w) => (
                            <span key={w} className={
                              `group relative inline-flex items-center text-[10px] pl-1.5 pr-1.5 py-0.5 rounded border ` +
                              (theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-[#0F243A] border-gray-800 text-gray-300')
                            }>
                              <span className="pr-1">{w}</span>
                              <button
                                aria-label={`Remove ${w}`}
                                title={`Remove ${w}`}
                                onClick={(e) => handleRemoveWaiter(reservation.id, e, w)}
                                className={
                                  `absolute -top-1 -right-1 z-10 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-white focus:outline-none focus:ring-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition ` +
                                  (theme === 'light' ? 'bg-gray-500 hover:bg-gray-400 focus:ring-gray-400/60' : 'bg-gray-600 hover:bg-gray-400 focus:ring-gray-400/60')
                                }
                              >
                                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={theme === 'light' ? '#FFFFFF' : 'currentColor'} strokeWidth="3">
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}

            {/* Closed Event Reservations in Closed tab (cancelled + not_arrived + cleared) */}
            {activeTab === 'closed' && closedEventReservations.map((reservation) => {
              const zoneName = getEventReservationZoneLabel(reservation);
              const serviceDefinitions = getServiceTypeDefinitions(reservation.notes);
              const hasServiceTypes = serviceDefinitions.length > 0;
              const reservationColor = reservation.color || '#8B5CF6';
              const isNotArrived = reservation.status === 'not_arrived';
              const isCancelled = reservation.status === 'cancelled' && !reservation.cleared;
              const isArrived = reservation.status === 'arrived' || (reservation.status === 'cancelled' && reservation.cleared === true);

              return (
                <div
                  key={`event-${reservation.id}`}
                  className={
                    `rounded-lg cursor-pointer relative overflow-visible border ` +
                    (theme === 'light'
                      ? 'bg-[#F8FAFC] hover:bg-white border-gray-200'
                      : 'bg-[#0A1929] hover:bg-[#0A1929]/80 border-gray-800')
                  }
                  onClick={() => {
                    // Dispatch event to close regular reservation form if open
                    try { window.dispatchEvent(new CustomEvent('respoint-close-regular-reservation-form')); } catch {}
                    setEditingEventReservation(reservation);
                    setIsEventReservationFormOpen(true);
                  }}
                >
                  {/* Badges for closed event reservations - based on status */}
                  {renderReservationBadges(
                    { isVip: reservation.isVip, notes: reservation.notes, status: reservation.status, cleared: reservation.cleared },
                    { showCheck: true }
                  )}

                  <div className="relative rounded-lg overflow-hidden">
                    {/* Color indicator */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: reservationColor }}
                    />

                    <div className="p-4 pl-6">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className={`truncate min-w-0 ${theme === 'light' ? 'text-gray-900 font-medium' : 'text-white font-medium'}`}>
                          {(reservation as any).__spilloverFromPrevDay ? (
                            <span
                              className="mr-1 inline-flex items-center align-middle text-blue-400"
                              title={currentLanguage === 'srb' ? 'Nastavak iz prethodnog dana' : 'Continues from previous day'}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M7 7h7a4 4 0 0 1 4 4v6" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M7 7l4-4M7 7l4 4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                          ) : null}
                          {reservation.guestName}
                        </h4>
                        {/* Status badge - Arrived (cleared), Not Arrived, or Cancelled */}
                        <span className={`px-2 py-1 rounded text-xs whitespace-nowrap flex-shrink-0 ${
                          isArrived
                            ? (theme === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-400')
                            : isNotArrived
                              ? (theme === 'light' ? 'bg-red-100 text-red-700' : 'bg-red-900/30 text-red-400')
                              : (theme === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-gray-900/30 text-gray-400')
                        }`}>
                          <div className="flex items-center gap-1">
                            {isArrived ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20,6 9,17 4,12"/>
                              </svg>
                            ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 9L15 15"/>
                              <path d="M15 9L9 15"/>
                            </svg>
                            )}
                            <span>{isArrived ? t('arrived') : (isNotArrived ? t('notArrived') : t('cancelled'))}</span>
                          </div>
                        </span>
                      </div>

                      {/* Main info line */}
                      <div className={theme === 'light' ? 'flex items-center gap-4 text-sm text-gray-700 mb-1' : 'flex items-center gap-4 text-sm text-gray-300 mb-1'}>
                        <span className={theme === 'light' ? 'font-medium text-gray-800' : 'font-medium'}>
                          {reservation.time || '--:--'}
                        </span>

                        <div className="flex items-center gap-1">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span className={theme === 'light' ? 'text-gray-700' : undefined}>
                            {reservation.numberOfGuests || 0}
                          </span>
                        </div>

                        {reservation.tableIds && reservation.tableIds.length > 0 && (
                          <div className="flex items-center gap-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                              <line x1="8" y1="21" x2="16" y2="21" />
                              <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            <span className={theme === 'light' ? 'text-gray-700' : undefined}>
                              {formatTableNames(reservation.tableIds, allTablesZoneLayouts)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Secondary info line: code */}
                      <div className={theme === 'light' ? 'flex flex-wrap items-center gap-3 text-xs text-gray-500' : 'flex flex-wrap items-center gap-3 text-xs text-gray-500'}>
                        <span className={'font-mono ' + (theme === 'light' ? 'text-gray-800' : 'text-gray-300')}>
                          {reservation.reservationCode}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${theme === 'light' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                          {currentLanguage === 'srb' ? 'Event' : 'Event'}
                        </span>
                      </div>

                      {/* Service type and zone line */}
                      <div className={theme === 'light' ? 'flex items-center gap-4 text-xs text-gray-500 mt-1' : 'flex items-center gap-4 text-xs text-gray-500 mt-1'}>
                        {hasServiceTypes && (
                          <span className={theme === 'light' ? 'text-gray-500' : undefined}>
                            {serviceDefinitions.map(def => currentLanguage === 'srb' ? def.label.srb : def.label.eng).join(', ')}
                          </span>
                        )}
                        {zoneName && (
                          <>
                            {hasServiceTypes && <span>•</span>}
                            <span className={theme === 'light' ? 'text-gray-500' : undefined}>
                              {zoneName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <p className="text-gray-500 text-sm">
              {activeTab === 'open' 
                ? `${t('noOpenReservations')} ${formatDate(selectedDate)}.`
                : t('noClosedReservations')
              }
            </p>
            {activeTab === 'open' && (
              <p className="text-gray-500 text-sm mt-1">{t('addOneOnPlusButton')}</p>
            )}
          </div>
        ))}

        {/* SEATED section (only in Open tab) */}
        {activeTab === 'open' && (
          <div>
            <div
              className="flex items-center justify-between mb-3 mt-4 cursor-pointer select-none"
              role="button"
              tabIndex={0}
              onClick={() => setIsSeatedOpen(o => !o)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsSeatedOpen(o => !o); } }}
            >
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`text-gray-400 transition-transform duration-200 ${isSeatedOpen ? '' : '-rotate-90'}`}>
                  <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">{t('seated')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <span className="text-gray-400 text-sm">{filteredSeatedReservations.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-gray-400 text-sm">{totalSeatedGuests}</span>
                </div>
              </div>
            </div>

            {isSeatedOpen && (filteredSeatedReservations.length > 0 ? (
              <div className="space-y-2 mb-6">
                {filteredSeatedReservations.map((reservation) => (
                  <div 
                    key={`seated-${reservation.id}`}
                    onClick={() => handleReservationClick(reservation)}
                    onDragOver={handleReservationDragOver}
                    onDrop={(e) => handleReservationDrop(reservation.id, e)}
                    className={
                      `rounded-lg cursor-pointer relative overflow-visible border ` +
                      (transferringReservationId === reservation.id
                        ? 'transition-all duration-300 translate-x-full opacity-0'
                        : '') +
                      (theme === 'light'
                        ? ' bg-[#F8FAFC] hover:bg-white border-gray-200'
                        : ' bg-[#0A1929] hover:bg-[#0A1929]/80 border-gray-800')
                    }
                    data-reservation-id={reservation.id}
                  >
                    {renderReservationBadges(reservation, { showCheck: true })}

                    <div className="relative rounded-lg overflow-hidden">
                      {reservation.color && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ backgroundColor: reservation.color }}
                        />
                      )}

                      <div className="p-4 pl-6">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className={theme === 'light' ? 'text-gray-900 font-medium' : 'text-white font-medium'}>
                          {(reservation as any).__spilloverFromPrevDay ? (
                            <span
                              className="mr-1 inline-flex items-center align-middle text-blue-400"
                              title={currentLanguage === 'srb' ? 'Nastavak iz prethodnog dana' : 'Continues from previous day'}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M7 7h7a4 4 0 0 1 4 4v6" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M7 7l4-4M7 7l4 4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                          ) : null}
                          {reservation.guestName}
                        </h4>
                        <SeatedTimer
                          reservationDate={reservation.date}
                          reservationTime={reservation.time}
                          numberOfGuests={reservation.numberOfGuests}
                          reservationId={reservation.id}
                          tableIds={reservation.tableIds}
                          onStatusUpdate={(id, status) => updateReservation(id, { status }) }
                        />
                      </div>

                      {/* Main info line: time, guests, table */}
                      <div className={theme === 'light' ? 'flex items-center gap-4 text-sm text-gray-700 mb-1' : 'flex items-center gap-4 text-sm text-gray-300 mb-1'}>
                        <span className={theme === 'light' ? 'font-medium text-gray-800' : 'font-medium'}>{reservation.time}</span>

                        <div className="flex items-center gap-1">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={theme === 'light' ? 'text-gray-400' : 'text-gray-400'}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          <span className={theme === 'light' ? 'text-gray-700' : undefined}>{reservation.numberOfGuests}</span>
                        </div>

                    {reservation.tableIds && reservation.tableIds.length > 0 && (
                          <div className="flex items-center gap-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={theme === 'light' ? 'text-gray-400' : 'text-gray-400'}>
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                              <line x1="8" y1="21" x2="16" y2="21"/>
                              <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                            <span className={theme === 'light' ? 'text-gray-700' : undefined}>
                              {formatTableNames(reservation.tableIds, allTablesZoneLayouts)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Secondary info line: service type and zone */}
                      <div className={theme === 'light' ? 'flex items-center gap-4 text-xs text-gray-500' : 'flex items-center gap-4 text-xs text-gray-500'}>
                        {reservation.notes && (
                          <span className={theme === 'light' ? 'text-gray-500' : undefined}>{reservation.notes}</span>
                        )}
                        {(() => {
                          const zoneLabel = getReservationZoneLabel(reservation);
                          if (!zoneLabel) return null;
                          return (
                            <>
                              {reservation.notes && <span>•</span>}
                              <span className={theme === 'light' ? 'text-gray-500' : undefined}>{zoneLabel}</span>
                            </>
                          );
                        })()}
                      </div>

                      {/* Waiters row under zone */}
                      {(() => {
                        const list = getAssignedWaiters(reservation.id);
                        if (!list || list.length === 0) return null;
                        return (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {list.map((w) => (
                              <span key={w} className={
                                `group relative inline-flex items-center text-[10px] pl-1.5 pr-1.5 py-0.5 rounded border ` +
                                (theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-[#0F243A] border-gray-800 text-gray-300')
                              }>
                                <span className="pr-1">{w}</span>
                                <button
                                  aria-label={`Remove ${w}`}
                                  title={`Remove ${w}`}
                                  onClick={(e) => handleRemoveWaiter(reservation.id, e, w)}
                                  className={
                                    `absolute -top-1 -right-1 z-10 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-white focus:outline-none focus:ring-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition ` +
                                    (theme === 'light' ? 'bg-gray-500 hover:bg-gray-400 focus:ring-gray-400/60' : 'bg-gray-600 hover:bg-gray-400 focus:ring-gray-400/60')
                                  }
                                >
                                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={theme === 'light' ? '#FFFFFF' : 'currentColor'} strokeWidth="3">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <p className="text-gray-500 text-sm">{t('noSeatedReservations')}</p>
              </div>
            ))}
          </div>
        )}
          </div>
        )}
      </div>

      <SidebarFooter
        onAddReservation={() => {
          if (activeTab === 'event' && activeEvent) {
            setEditingEventReservation(null);
            try {
              // Dispatch event to close regular reservation form if open
              window.dispatchEvent(new CustomEvent('respoint-close-regular-reservation-form'));
              window.dispatchEvent(
                new CustomEvent('respoint-open-event-reservation-form')
              );
            } catch {}
            setIsEventReservationFormOpen(true);
          } else {
            onAddReservation();
          }
        }}
        isEventMode={activeTab === 'event'}
        isAddDisabled={(activeTab === 'event' && !activeEvent) || (activeTab === 'event' && isEventExpired)}
      />

      {/* Create Event modal */}
      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        initialDate={selectedDate}
      />
      {/* Edit Event modal */}
      {editingEventForModal && (
        <EditEventModal
          isOpen={isEditEventOpen}
          onClose={() => {
            setIsEditEventOpen(false);
            setEditingEventForModal(null);
          }}
          event={editingEventForModal}
        />
      )}
      {/* Event reservation form (rendered inside canvas overlay container) */}
      {activeEvent &&
        createPortal(
          <EventReservationForm
            isOpen={isEventReservationFormOpen}
            onClose={() => {
              setIsEventReservationFormOpen(false);
              setEditingEventReservation(null);
            }}
            event={activeEvent}
            existingReservation={editingEventReservation || undefined}
          />,
          document.getElementById('canvas-overlay-root') ?? document.body
        )}

    </aside>
  );
};

export default Sidebar;
