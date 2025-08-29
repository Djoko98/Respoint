import React, { useContext } from 'react';
import { ReservationContext } from '../../context/ReservationContext';
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
}

const TimeMarker: React.FC<TimeMarkerProps> = ({ color, needleHeight = 80 }) => {
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
  
  return (
    <div 
      className="absolute -top-1.5 left-1/2 transform -translate-x-1/2"
      style={{ height: `${needleHeight + 6}px` }}
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
      {/* Vertical needle line */}
      <div 
        className="absolute top-1.5 left-1/2 transform -translate-x-1/2"
        style={{
          width: '2px',
          height: `${needleHeight}px`,
          backgroundColor: actualColor,
          zIndex: 0
        }}
      />
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
  const { t } = useLanguage();
  const { reservations } = useContext(ReservationContext);
  const { currentZone } = useContext(ZoneContext);
  const { zoneLayouts } = useContext(LayoutContext);

  // Format date to local YYYY-MM-DD to avoid timezone issues
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Filter reservations for current date and zone
  const todaysReservations = reservations.filter(reservation => {
    const reservationDate = formatDate(selectedDate || new Date());
    
    // Check date match first
    const dateMatches = reservation.date === reservationDate;

    // Only show markers for 'waiting' or 'confirmed' reservations
    const statusMatches = reservation.status === 'waiting' || reservation.status === 'confirmed';
    
    // If no current zone is selected, show all reservations for the date
    // If current zone is selected, only show reservations for that zone
    const zoneMatches = true; // show markers regardless of zone
    
    return dateMatches && zoneMatches && statusMatches;
  });

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

  // Calculate position percentage to match the new hour distribution
  const getMarkerPosition = (hour: number, minute: number = 0) => {
    // Convert to time index (0-23 with decimal for minutes)
    let timeIndex = hour + minute / 60;

    // Handle wrap-around for times after 23:30
    if (timeIndex >= 23.5) {
      timeIndex = timeIndex - 24;
    }

    // Map time from [-0.5, 23.5) to [0, 100]
    // The range is 24 hours total.
    const position = ((timeIndex + 0.5) / 24) * 100;
    
    return Math.max(0, Math.min(100, position)); // Clamp between 0% and 100%
  };

  // Generate hours array to display
  const hours = Array.from({ length: 24 }, (_, i) => (i + 23) % 24); // Start from 23:00 for display
  hours[0] = 23;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#000814] border-t border-[#1E2A34] h-full shadow-lg z-30 overflow-visible">
      <div className="relative w-full h-full flex items-center px-4">
        
        {/* Hour marks */}
        <div className="absolute inset-x-4 inset-y-0 flex items-center">
          {hours.map((hour, index) => {
            // Calculate position for even distribution across available width
            // We are displaying 24 hours starting from 23:00
            const displayHour = (23 + index) % 24;
            let timeIndex = displayHour;

            // Adjust for wrap-around visualization
            if (timeIndex >= 23.5) {
                timeIndex -= 24;
            }
            
            const leftPosition = `${getMarkerPosition(displayHour, 0)}%`;
            
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

        {/* Current time indicator - precise to the minute within padded area */}
        {selectedDate && formatDate(selectedDate) === formatDate(new Date()) && (
          <div className="absolute top-0 bottom-0 left-4 right-4">
            <div 
              className="absolute top-0 bottom-0"
              style={{
                left: `${getMarkerPosition(new Date().getHours(), new Date().getMinutes())}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <TimeMarker color="#6b7280" needleHeight={80} />
            </div>
          </div>
        )}

        {/* Reservation markers - positioned by exact time within the padded area */}
        {todaysReservations.map((reservation) => {
          const [hours, minutes] = reservation.time.split(':').map(Number);
          // Use same positioning logic as hour marks
          const leftPosition = `${getMarkerPosition(hours, minutes)}%`;
          
          const statusLabels = {
            waiting: t('waiting'),
            confirmed: t('confirmed'),
            arrived: t('arrived'),
            cancelled: t('cancelled'),
            not_arrived: t('notArrived')
          };
          
          return (
            <div
              key={reservation.id}
              className="absolute top-0 bottom-0 left-4 right-4"
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
                  />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 border border-gray-700 pointer-events-none select-none">
                  <div className="font-medium text-accent">{reservation.guestName}</div>
                  <div className="text-gray-300 mt-1">{reservation.time} - {reservation.numberOfGuests} {t('guests')}</div>
                  <div className={`text-xs px-2 py-1 rounded mt-1 ${
                    reservation.status === 'waiting' ? 'bg-orange-500/20 text-orange-300' :
                    reservation.status === 'confirmed' ? 'bg-blue-500/20 text-blue-300' :
                    reservation.status === 'arrived' ? 'bg-green-500/20 text-green-300' : 
                    reservation.status === 'not_arrived' ? 'bg-red-500/20 text-red-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {statusLabels[reservation.status] || reservation.status}
                  </div>
                  {reservation.tableIds && reservation.tableIds.length > 0 && (
                    <div className="text-gray-300">{t('tablesLabel')} {reservation.tableIds.map(id => {
                      const allTables = Object.values(zoneLayouts || {}).flatMap(l => l.tables || []);
                      const table = allTables.find(t => t.id === id);
                      return table?.name || table?.number?.toString() || id;
                    }).join(', ')}</div>
                  )}
                  {reservation.phone && (
                    <div className="text-gray-300">{t('telLabel')} {reservation.phone}</div>
                  )}
                  {reservation.notes && (
                    <div className="text-gray-300 italic mt-1">"{reservation.notes}"</div>
                  )}
                  
                  {/* Tooltip arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
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