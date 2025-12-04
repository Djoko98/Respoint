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
  onStatusUpdate: (reservationId: string, status: 'cancelled' | 'arrived') => void;
}

const SeatedTimer: React.FC<SeatedTimerProps> = React.memo(({
  reservationDate,
  reservationTime,
  numberOfGuests,
  reservationId,
  onStatusUpdate
}) => {
  const { t } = useLanguage();
  const { theme } = React.useContext(ThemeContext);
  const { updateReservation } = React.useContext(ReservationContext);
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
        end = new Date(midnight.getTime() + Math.max(0, Math.min(1440, adjustment.end)) * 60 * 1000);
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
        // Mark reservation finished; keep status 'cancelled' for Closed pipeline but flag as cleared
        updateReservation(reservationId, { status: 'cancelled', cleared: true } as any);
      } catch {
        // Fallback to status update only
        onStatusUpdate(reservationId, 'cancelled');
      }
    } else {
      // Extend for additional 15 minutes: update adjustments (DB + local) and resume countdown
      try {
        const now = new Date();
        const midnight = new Date(`${reservationDate}T00:00:00`);
        // Minutes from start of reservation day for current time
        const nowMin = Math.max(0, Math.min(1440, now.getHours() * 60 + now.getMinutes()));
        const extendedEnd = Math.min(1440, nowMin + 15);

        // Update localStorage adjustments
        try {
          const key = `respoint-duration-adjustments:${reservationDate}`;
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : {};
          const current = parsed?.[reservationId] || {};
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

const Sidebar: React.FC<SidebarProps> = ({ onAddReservation, selectedDate, onEditReservation }) => {
  const { t, currentLanguage } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const { reservations, updateReservation } = useContext(ReservationContext);
  const { zones } = useContext(ZoneContext);
  const { zoneLayouts } = useContext(LayoutContext);
  const { focusGeneration } = useFocus();
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'time' | 'a-z' | 'tables' | 'guests' | 'zone'>('time');
  const [isBookedOpen, setIsBookedOpen] = useState(true);
  const [isClearedOpen, setIsClearedOpen] = useState(true);
  const [isSeatedOpen, setIsSeatedOpen] = useState(true);
  const [, forceWaiterRerender] = useState(0);
  const [isServiceTypeMenuOpen, setIsServiceTypeMenuOpen] = useState(false);
  const [serviceTypeSortKey, setServiceTypeSortKey] = useState<string | null>(null);
  const serviceMenuRef = React.useRef<HTMLDivElement>(null);

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

  const renderReservationBadges = useCallback((reservation: Reservation, options?: { showCheck?: boolean }) => {
    const badges: React.ReactNode[] = [];
    const borderColor = theme === 'light' ? '#E5E7EB' : '#1F2937';

    if (options?.showCheck) {
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
  }, [getServiceTypeDefinitions, theme]);

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
  const selectedDateReservations = reservations.filter(res => {
    const resDate = new Date(res.date);
    const datesMatch = resDate.toDateString() === selectedDate.toDateString();
    
    console.log('🔍 Sidebar: Filtering reservation:', {
      reservation: { id: res.id, guestName: res.guestName, date: res.date, status: res.status },
      resDate: resDate.toDateString(),
      selectedDate: selectedDate.toDateString(),
      datesMatch: datesMatch,
      passesFilter: datesMatch
    });
    
    return datesMatch;
  });

  console.log('📊 Sidebar: After date filtering:', {
    totalReservations: reservations.length,
    selectedDateReservations: selectedDateReservations.length,
    selectedDate: selectedDate.toDateString(),
    reservations: reservations.map(r => ({ id: r.id, guestName: r.guestName, date: r.date, status: r.status }))
  });

  // Filter for Open/Closed tabs
  const openReservations = selectedDateReservations.filter(
    res => res.status === 'waiting' || res.status === 'confirmed'
  );
  
  // Closed = only reservations that have finished their stay (cleared/cancelled) or never showed (not_arrived)
  const closedReservations = selectedDateReservations.filter(
    res => res.status === 'not_arrived' || res.status === 'cancelled'
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

  // Filter by search
  const filteredReservations = sortedReservations.filter(res =>
    res.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.phone?.includes(searchQuery) ||
    res.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total guests
  const totalGuests = filteredReservations.reduce((acc, res) => acc + res.numberOfGuests, 0);

  // Seated reservations (arrived) for SEATED section in Open tab
  const seatedReservationsAll = selectedDateReservations.filter(res => res.status === 'arrived');
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
      <div className="px-4 pt-4">
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
        {/* Search bar */}
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
              `w-full pl-10 pr-4 py-2.5 rounded-lg focus:outline-none transition-colors ` +
              (theme === 'light'
                ? 'bg-[#F8FAFC] text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-gray-300'
                : 'bg-[#0A1929] text-white placeholder-gray-500 border border-gray-800 focus:border-gray-600')
            }
          />
        </div>

        {/* Sort options */}
        <div className="flex items-center gap-1 whitespace-nowrap">
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
      </div>

      {/* Reservations list */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 sidebar-scrollbar">
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
        {(activeTab === 'closed' ? isClearedOpen : isBookedOpen) && (filteredReservations.length > 0 ? (
          <div className="space-y-2">
            {filteredReservations.map((reservation) => (
              <div 
                key={reservation.id}
                onClick={() => handleReservationClick(reservation)}
                onDragOver={handleReservationDragOver}
                onDrop={(e) => handleReservationDrop(reservation.id, e)}
                className={
                  `rounded-lg transition-colors cursor-pointer relative overflow-visible border ` +
                  (theme === 'light'
                    ? 'bg-[#F8FAFC] hover:bg-white border-gray-200'
                    : 'bg-[#0A1929] hover:bg-[#0A1929]/80 border-gray-800')
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
                      <h4 className={theme === 'light' ? 'text-gray-900 font-medium' : 'text-white font-medium'}>
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
                          className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
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
                          <span className={theme === 'light' ? 'text-gray-700' : undefined}>{formatTableNames(reservation.tableIds, zoneLayouts)}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Secondary info line: service type and zone */}
                    <div className={theme === 'light' ? 'flex items-center gap-4 text-xs text-gray-500' : 'flex items-center gap-4 text-xs text-gray-500'}>
                      {reservation.notes && (
                        <span className={theme === 'light' ? 'text-gray-500' : undefined}>{reservation.notes}</span>
                      )}
                      {reservation.zoneId && (
                        <>
                          {reservation.notes && <span>•</span>}
                          <span className={theme === 'light' ? 'text-gray-500' : undefined}>{zones.find(z => z.id === reservation.zoneId)?.name || 'Unknown Zone'}</span>
                        </>
                      )}
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
          <>
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
                      `rounded-lg transition-colors cursor-pointer relative overflow-visible border ` +
                      (theme === 'light'
                        ? 'bg-[#F8FAFC] hover:bg-white border-gray-200'
                        : 'bg-[#0A1929] hover:bg-[#0A1929]/80 border-gray-800')
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
                          {reservation.guestName}
                        </h4>
                        <SeatedTimer
                          reservationDate={reservation.date}
                          reservationTime={reservation.time}
                          numberOfGuests={reservation.numberOfGuests}
                          reservationId={reservation.id}
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
                            <span className={theme === 'light' ? 'text-gray-700' : undefined}>{formatTableNames(reservation.tableIds, zoneLayouts)}</span>
                          </div>
                        )}
                      </div>

                      {/* Secondary info line: service type and zone */}
                      <div className={theme === 'light' ? 'flex items-center gap-4 text-xs text-gray-500' : 'flex items-center gap-4 text-xs text-gray-500'}>
                        {reservation.notes && (
                          <span className={theme === 'light' ? 'text-gray-500' : undefined}>{reservation.notes}</span>
                        )}
                        {reservation.zoneId && (
                          <>
                            {reservation.notes && <span>•</span>}
                            <span className={theme === 'light' ? 'text-gray-500' : undefined}>{zones.find(z => z.id === reservation.zoneId)?.name || 'Unknown Zone'}</span>
                          </>
                        )}
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
          </>
        )}
      </div>

      <SidebarFooter onAddReservation={onAddReservation} />
    </aside>
  );
};

export default Sidebar;
