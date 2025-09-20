import React, { useState, useContext, useEffect, memo } from "react";
import { getAssignedWaiters, removeAssignedWaiter as removeAssignedWaiterUtil, setAssignedWaiter } from "../../utils/waiters";
import SidebarFooter from "./SidebarFooter";
import { ReservationContext, Reservation } from "../../context/ReservationContext";
import { ZoneContext } from "../../context/ZoneContext";
import { LayoutContext } from "../../context/LayoutContext";
import { useFocus } from "../../context/FocusContext";
import { formatTableNames } from "../../utils/tableHelper";
import { useLanguage } from "../../context/LanguageContext";
import { ThemeContext } from "../../context/ThemeContext";

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
  const { t } = useLanguage();
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

const Sidebar: React.FC<SidebarProps> = ({ onAddReservation, selectedDate, onEditReservation }) => {
  const { t } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const { reservations, updateReservation } = useContext(ReservationContext);
  const { zones } = useContext(ZoneContext);
  const { zoneLayouts } = useContext(LayoutContext);
  const { focusGeneration } = useFocus();
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'time' | 'a-z' | 'tables' | 'guests' | 'zone'>('time');
  const [, forceWaiterRerender] = useState(0);

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
  
  const closedReservations = selectedDateReservations.filter(
    res => res.status === 'arrived' || res.status === 'not_arrived' || res.status === 'cancelled'
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

  // Filter by search
  const filteredReservations = sortedReservations.filter(res =>
    res.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.phone?.includes(searchQuery) ||
    res.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total guests
  const totalGuests = filteredReservations.reduce((acc, res) => acc + res.numberOfGuests, 0);

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
    <aside className="w-80 bg-[#000814] border-r border-[#1E2A34] flex flex-col">
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
                ? 'bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-gray-400'
                : 'bg-[#0A1929] text-white placeholder-gray-500 border border-gray-800 focus:border-gray-600')
            }
          />
        </div>

        {/* Sort options */}
        <div className="flex gap-2">
          <button 
            onClick={() => setSortBy('time')}
            className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
              sortBy === 'time' 
                ? 'bg-[#0A1929] text-white border border-gray-800' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t('time')}
          </button>
          <button 
            onClick={() => setSortBy('a-z')}
            className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
              sortBy === 'a-z' 
                ? 'bg-[#0A1929] text-white border border-gray-800' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t('name')}
          </button>
          <button 
            onClick={() => setSortBy('tables')}
            className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
              sortBy === 'tables' 
                ? 'bg-[#0A1929] text-white border border-gray-800' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t('table')}
          </button>
          <button 
            onClick={() => setSortBy('guests')}
            className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
              sortBy === 'guests' 
                ? 'bg-[#0A1929] text-white border border-gray-800' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t('guests')}
          </button>
          <button 
            onClick={() => setSortBy('zone')}
            className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
              sortBy === 'zone' 
                ? 'bg-[#0A1929] text-white border border-gray-800' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t('zone')}
          </button>
        </div>
      </div>

      {/* Reservations list */}
      <div className="flex-1 overflow-y-auto px-4 sidebar-scrollbar">
        {/* Booked section */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
              <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">{t('booked')}</span>
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
        {filteredReservations.length > 0 ? (
          <div className="space-y-2">
            {filteredReservations.map((reservation) => (
              <div 
                key={reservation.id}
                onClick={() => handleReservationClick(reservation)}
                onDragOver={handleReservationDragOver}
                onDrop={(e) => handleReservationDrop(reservation.id, e)}
                className={
                  `rounded-lg transition-colors cursor-pointer relative overflow-hidden border ` +
                  (theme === 'light'
                    ? 'bg-white hover:bg-gray-50 border-gray-200'
                    : 'bg-[#0A1929] hover:bg-[#0A1929]/80 border-gray-800')
                }
                data-reservation-id={reservation.id}
              >
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
                          : reservation.status === 'arrived'
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
                        ) : reservation.status === 'arrived' ? (
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
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
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
        )}
      </div>

      <SidebarFooter onAddReservation={onAddReservation} />
    </aside>
  );
};

export default Sidebar;
