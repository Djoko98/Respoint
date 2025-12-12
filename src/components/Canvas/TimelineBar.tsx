import React, { useContext, useMemo, useEffect, useState, useCallback } from 'react';
import { ReservationContext } from '../../context/ReservationContext';
import { EventContext } from '../../context/EventContext';
import { ZoneContext } from '../../context/ZoneContext';
import { LayoutContext } from '../../context/LayoutContext';
import { useLanguage } from '../../context/LanguageContext';

interface TimelineBarProps {
  selectedDate?: Date;
}

// Shared TimeMarker component to ensure consistency
interface TimeMarkerProps {
  color: string;
  needleHeight?: number;
  isSeated?: boolean; // For arrived/seated reservations - reduced opacity & dashed line
}

const TimeMarker: React.FC<TimeMarkerProps> = ({ color, needleHeight = 80, isSeated = false }) => {
  // If color starts with 'bg-', it's a Tailwind class, otherwise it's a hex color
  const colorMap: { [key: string]: string } = {
    'bg-orange-500': '#f97316',
    'bg-green-500': '#22c55e',
    'bg-blue-500': '#3b82f6',
    'bg-red-500': '#ef4444',
    'bg-gray-500': '#6b7280',
    'bg-blue-400': '#60a5fa'
  };
  
  const actualColor = color.startsWith('bg-') ? (colorMap[color] || '#f97316') : color;
  const markerOpacity = isSeated ? 0.4 : 1;
  
  return (
    <div 
      className="absolute -top-1.5 left-1/2 transform -translate-x-1/2"
      style={{ height: `${needleHeight + 6}px`, opacity: markerOpacity }}
    >
      {/* Circle at top */}
      <div 
        className="absolute top-0 left-1/2 transform -translate-x-1/2"
        style={{
          width: '12px',
          height: '12px',
          backgroundColor: actualColor,
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 10
        }}
      />
      {/* Vertical needle line - dashed for seated reservations */}
      {isSeated ? (
        <svg
          className="absolute top-1.5 left-1/2 transform -translate-x-1/2"
          width="2"
          height={needleHeight}
          style={{ zIndex: 0 }}
        >
          <line
            x1="1"
            y1="0"
            x2="1"
            y2={needleHeight}
            stroke={actualColor}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        </svg>
      ) : (
        <div 
          className="absolute top-1.5 left-1/2 transform -translate-x-1/2"
          style={{
            width: '2px',
            height: `${needleHeight}px`,
            backgroundColor: actualColor,
            zIndex: 0
          }}
        />
      )}
    </div>
  );
};

// Shared marker wrapper to ensure consistent positioning
interface MarkerWrapperProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const MarkerWrapper: React.FC<MarkerWrapperProps> = ({ children, className = '', style }) => {
  return (
    <div className={`relative ${className}`} style={style}>
      {children}
    </div>
  );
};

const TimelineBar: React.FC<TimelineBarProps> = ({ selectedDate }) => {
  const { t, currentLanguage } = useLanguage();
  const { reservations } = useContext(ReservationContext);
  const { eventReservations } = useContext(EventContext);
  const { currentZone } = useContext(ZoneContext);
  const { zoneLayouts } = useContext(LayoutContext);
  const timelineRef = React.useRef<HTMLDivElement>(null);
  const [tooltipTick, setTooltipTick] = useState(0);

  // Tick every second so tooltip countdown text stays current
  useEffect(() => {
    const id = window.setInterval(() => setTooltipTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const estimateSeatedDurationMinutes = useCallback((numGuests?: number) => {
    const g = typeof numGuests === 'number' ? numGuests : 2;
    if (g <= 2) return 60;
    if (g <= 4) return 120;
    return 150;
  }, []);

  const formatRemaining = useCallback((diffMs: number) => {
    try {
      const safe = Math.max(0, Math.floor(diffMs));
      const totalSeconds = Math.floor(safe / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);
      const days = Math.floor(totalHours / 24);
      if (days > 0) return `${days}d`;
      if (totalHours > 0) return `${totalHours}h`;
      if (totalMinutes > 0) return `${totalMinutes}m`;
      return `${Math.max(0, totalSeconds)}s`;
    } catch {
      return '0s';
    }
  }, []);

  const getWaitingRemaining = useCallback((reservation: any) => {
    try {
      void tooltipTick;
      const target = new Date(`${reservation.date}T${reservation.time}`);
      const now = new Date();
      return formatRemaining(target.getTime() - now.getTime());
    } catch {
      return '0s';
    }
  }, [formatRemaining, tooltipTick]);

  const getSeatedRemaining = useCallback((reservation: any) => {
    try {
      void tooltipTick;
      const start = new Date(`${reservation.date}T${reservation.time}`);
      let end = new Date(start.getTime() + estimateSeatedDurationMinutes(reservation.numberOfGuests) * 60 * 1000);

      // override from local adjustments if present
      try {
        const key = `respoint-duration-adjustments:${reservation.date}`;
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : {};
        const adj = parsed?.[reservation.id];
        if (adj && typeof adj.end === 'number') {
          const midnight = new Date(`${reservation.date}T00:00:00`);
          end = new Date(midnight.getTime() + Math.max(0, Math.min(2880, adj.end)) * 60 * 1000);
        }
      } catch {}

      const now = new Date();
      return formatRemaining(end.getTime() - now.getTime());
    } catch {
      return '0s';
    }
  }, [estimateSeatedDurationMinutes, formatRemaining, tooltipTick]);

  // Format date to local YYYY-MM-DD to avoid timezone issues
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Combine regular and event reservations for timeline display
  const combinedReservations = useMemo(() => {
    const reservationDate = formatDate(selectedDate || new Date());
    
    // Filter regular reservations (include arrived/seated)
    const filteredRegular = reservations
      .filter(r => {
        const dateMatches = r.date === reservationDate;
        const statusMatches =
          r.status === 'waiting' ||
          r.status === 'confirmed' ||
          r.status === 'arrived';
        const notCleared = !(r as any).cleared;
        return dateMatches && statusMatches && notCleared;
      })
      .map(r => ({ ...r, isEventReservation: false }));

    // Filter and map event reservations
    const filteredEvent = eventReservations
      .filter(r => {
        const dateMatches = r.date === reservationDate;
        // 'booked' is equivalent to 'waiting'/'confirmed' for events
        const statusMatches = r.status === 'booked' || r.status === 'arrived';
        const notCleared = !(r as any).cleared;
        return dateMatches && statusMatches && notCleared;
      })
      .map(r => ({
      id: r.id,
      date: r.date,
      time: r.time,
      numberOfGuests: r.numberOfGuests,
      guestName: r.guestName,
      phone: r.phone || '',
      notes: r.notes || '',
      status: r.status === 'booked' ? 'waiting' : r.status,
      tableIds: r.tableIds || [],
      color: r.color,
      isVip: r.isVip || false,
      isEventReservation: true,
      reservationCode: r.reservationCode,
    }));

    return [...filteredRegular, ...filteredEvent];
  }, [reservations, eventReservations, selectedDate]);

  // Use the combined reservations
  const todaysReservations = combinedReservations;

  // Convert time string to total minutes since midnight
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert time to hour number for positioning
  const timeToHour = (time: string) => {
    const [hours] = time.split(':');
    return parseInt(hours, 10);
  };

  // Get reservation color - now returns the actual reservation color
  const getReservationColor = (reservation: any) => {
    // Use the reservation's color property if it exists
    if (reservation.color) {
      return reservation.color;
    }
    
    // Fallback to status-based colors if no color is set
    if (reservation.status === 'cancelled') {
      return '#6b7280'; // Gray for cancelled
    }
    
    if (reservation.status === 'arrived') {
      return '#22c55e'; // Green for arrived
    }
    
    if (reservation.status === 'confirmed') {
      return '#3b82f6'; // Blue for confirmed
    }
    
    if (reservation.status === 'not_arrived') {
      return '#ef4444'; // Red for not arrived
    }
    
    // Default to orange for waiting
    return '#f97316'; // Orange for waiting
  };

  // Calculate position percentage as if full 24h track (00:00 → 24:00) exists.
  // We render labels only for 01h..23h, which leaves equal one-hour margins on both sides.
  const getMarkerPosition = (hour: number, minute: number = 0) => {
    const totalMinutes = Math.max(0, Math.min(24 * 60, Math.floor(hour) * 60 + Math.floor(minute)));
    return (totalMinutes / (24 * 60)) * 100;
  };

  // Generate hours array to display: 01h..23h (hide 00h)
  const hours = Array.from({ length: 23 }, (_, i) => i + 1);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#000814] border-t border-[#1E2A34] h-full z-[10060] overflow-visible">
      <div ref={timelineRef} className="relative w-full h-full flex items-center">
        
        {/* Hour marks */}
        <div className="absolute inset-x-0 inset-y-0 flex items-center">
          {hours.map((hour) => {
            // Position each hour label based on its actual hour index (01..23)
            const leftPosition = `${getMarkerPosition(hour, 0)}%`;
            
            return (
              <div 
                key={hour} 
                className="absolute flex flex-col items-center"
                style={{ 
                  left: leftPosition, 
                  transform: 'translateX(-50%)'
                }}
              >
                {/* Hour label - shortened format */}
                <div className="text-xs text-gray-400 mb-1">
                  {hour.toString().padStart(2, '0')}h
                </div>
                
                {/* Vertical line */}
                <div className="w-px h-6 bg-gray-600" />
              </div>
            );
          })}
        </div>

        {/* Current time indicator - match TimelineOverlay (blue line + label) */}
        {selectedDate && formatDate(selectedDate) === formatDate(new Date()) && (() => {
          const hoursNow = new Date().getHours();
          const minutesNow = new Date().getMinutes();
          const leftPosition = `${getMarkerPosition(hoursNow, minutesNow)}%`;
          const nowLabel = `${hoursNow.toString().padStart(2, '0')}:${minutesNow.toString().padStart(2, '0')}`;
          return (
            <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none">
              <div 
                className="absolute top-0 bottom-0 z-50"
                style={{ left: leftPosition, transform: 'translateX(-50%)' }}
              >
                <div className="w-[2px] h-full bg-blue-400/60" />
                <div className="absolute top-9" style={{ left: 0, transform: 'translateX(-50%)' }}>
                  <div className="px-2 py-0.5 rounded border text-[11px] select-none"
                       style={{
                         backgroundColor: '#3b82f6', // blue-500
                         borderColor: '#60a5fa',      // blue-400
                         color: '#ffffff',
                         boxShadow: '0 1px 2px rgba(0,0,0,0.25)'
                       }}>
                    {nowLabel}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Reservation markers - positioned by exact time within the padded area */}
        {todaysReservations.map((reservation) => {
          const [hours, minutes] = reservation.time.split(':').map(Number);
          // Use same positioning logic as hour marks
          const leftPositionPercent = getMarkerPosition(hours, minutes);
          const leftPosition = `${leftPositionPercent}%`;
          const tooltipWidth = 180;
          const paddingPx = 12;
          const containerWidth = timelineRef.current?.offsetWidth || 0;
          let tooltipOffsetPx = 0;
          if (containerWidth > 0) {
            const markerPx = (leftPositionPercent / 100) * containerWidth;
            const leftEdge = markerPx - tooltipWidth / 2;
            const rightEdge = markerPx + tooltipWidth / 2;
            if (leftEdge < paddingPx) {
              tooltipOffsetPx = paddingPx - leftEdge;
            } else if (rightEdge > containerWidth - paddingPx) {
              tooltipOffsetPx = (containerWidth - paddingPx) - rightEdge;
            }
          }
          const tooltipPositionStyle: React.CSSProperties = {
            left: '50%',
            transform: 'translateX(-50%)',
            marginLeft: tooltipOffsetPx,
            width: tooltipWidth
          };
          
          const statusLabels: Record<string, string> = {
            waiting: t('waiting'),
            confirmed: t('confirmed'),
            arrived: t('arrived'),
            cancelled: t('cancelled'),
            not_arrived: t('notArrived')
          };
          
          return (
            <div
              key={reservation.id}
              className="absolute top-0 bottom-0 left-0 right-0"
            >
              <div 
                className="absolute"
                style={{ 
                  left: leftPosition, 
                  transform: 'translateX(-50%)'
                }}
              >
                {/* Wrapper for marker and tooltip */}
                <div className="group">
                  {/* Pin marker */}
                  <TimeMarker 
                    color={getReservationColor(reservation)} 
                    needleHeight={80}
                    isSeated={reservation.status === 'arrived'}
                  />
                  
                  {/* Tooltip */}
                  <div
                    className={`absolute bottom-full mb-3 px-3 py-2 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal break-words overflow-visible z-[10070] border pointer-events-none select-none ${
                      document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-white text-gray-900 border-gray-200' : 'bg-gray-900 text-white border-gray-700'
                    }`}
                    style={tooltipPositionStyle}
                  >
                  <div className="font-medium text-accent flex items-center gap-1 flex-wrap">
                    {reservation.guestName}
                    {reservation.isVip ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500">
                        <path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/>
                      </svg>
                    ) : null}
                    {(reservation as any).isEventReservation && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] border ${document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                        {currentLanguage === 'srb' ? 'Event' : 'Event'}
                      </span>
                    )}
                  </div>
                  <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-700 mt-1' : 'text-gray-300 mt-1'}>{reservation.time} - {reservation.numberOfGuests} {t('guests')}</div>
                  <div className={`text-xs px-2 py-1 rounded mt-1 ${
                    reservation.status === 'waiting' ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/20 text-orange-300') :
                    reservation.status === 'confirmed' ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-300') :
                    reservation.status === 'arrived' ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-300') : 
                    reservation.status === 'not_arrived' ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-red-100 text-red-700' : 'bg-red-500/20 text-red-300') :
                    (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-gray-500/20 text-gray-300')
                  }`}>
                    {reservation.status === 'waiting'
                      ? `Waiting - ${getWaitingRemaining(reservation)}`
                      : reservation.status === 'arrived'
                      ? `Seated - ${getSeatedRemaining(reservation)}`
                      : statusLabels[reservation.status] || reservation.status}
                  </div>
                  {reservation.tableIds && reservation.tableIds.length > 0 && (
                    <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-700' : 'text-gray-300'}>{t('tablesLabel')} {reservation.tableIds.map(id => {
                      const allTables = Object.values(zoneLayouts || {}).flatMap(l => l.tables || []);
                      const table = allTables.find(t => t.id === id);
                      return table?.name || table?.number?.toString() || id;
                    }).join(', ')}</div>
                  )}
                  {reservation.phone && (
                    <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-700' : 'text-gray-300'}>{t('telLabel')} {reservation.phone}</div>
                  )}
                  {reservation.notes && (
                    <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-500 italic mt-1' : 'text-gray-300 italic mt-1'}>"{reservation.notes}"</div>
                  )}
                  
                  {/* Tooltip arrow (border outline) */}
                  <div
                    className={`absolute top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent z-[10070] ${
                      document.documentElement.getAttribute('data-theme') === 'light' ? 'border-t-gray-200' : 'border-t-gray-700'
                    }`}
                    style={{
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginLeft: Math.max(Math.min(-tooltipOffsetPx, tooltipWidth / 2 - 11), -(tooltipWidth / 2 - 8))
                    }}
                  />
                  {/* Tooltip arrow (fill) */}
                  <div
                    className={`absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                      document.documentElement.getAttribute('data-theme') === 'light' ? 'border-t-white' : 'border-t-gray-900'
                    }`}
                    style={{
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginLeft: Math.max(Math.min(-tooltipOffsetPx, tooltipWidth / 2 - 11), -(tooltipWidth / 2 - 8))
                    }}
                  />
                </div>
                </div>
              </div>
            </div>
          );
        })}

        
      </div>
    </div>
  );
};

export default TimelineBar;