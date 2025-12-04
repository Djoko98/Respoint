import React, { useState, useRef, useEffect, useContext } from "react";
import { ZoneContext } from "../../context/ZoneContext";
import { UserContext } from "../../context/UserContext";
import { ReservationContext } from "../../context/ReservationContext";
import { useLanguage } from "../../context/LanguageContext";
import UserMenuTrigger from "../UserMenu/UserMenuTrigger";
import RoleUnlockModal from "../Auth/RoleUnlockModal";
import LoginModal from "../Auth/LoginModal";
import SignupModal from "../Auth/SignupModal";
import logoImage from "../../assets/logo.png";
import { ThemeContext } from "../../context/ThemeContext";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";

interface HeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const Header: React.FC<HeaderProps> = ({ selectedDate, onDateChange }) => {
  const { zones, currentZone, setCurrentZone } = useContext(ZoneContext);
  const { isAuthenticated, user } = useContext(UserContext);
  const { reservations } = useContext(ReservationContext);
  const { t, getMonthNames, getDayNames, currentLanguage } = useLanguage();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [centerDate, setCenterDate] = useState(selectedDate);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [logoKey, setLogoKey] = useState(Date.now()); // For cache-busting
  const [logoRetryAttempted, setLogoRetryAttempted] = useState(false);
  const label = (en: string, sr: string) => (currentLanguage === 'srb' ? sr : en);
  
  // Auth modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showRoleUnlock, setShowRoleUnlock] = useState(false);
  const [showRolesInfo, setShowRolesInfo] = useState(false);
  const [showMonthCalendar, setShowMonthCalendar] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(selectedDate);

  // Update logoKey when user logo or theme changes to force refresh
  useEffect(() => {
    if (user?.logo || user?.logoLightUrl) {
      setLogoKey(Date.now());
      setLogoRetryAttempted(false); // reset retry when logo changes
    }
  }, [user?.logo, user?.logoLightUrl, theme]);

  // Update centerDate when selectedDate changes
  useEffect(() => {
    setCenterDate(selectedDate);
  }, [selectedDate]);

  // Generate dates for scrollable calendar (show more dates for smooth scrolling)
  const generateCalendarDates = (): Date[] => {
    const dates: Date[] = [];
    // Generate only 7 days centered around centerDate
    for (let i = -3; i <= 3; i++) {
      const date = new Date(centerDate);
      date.setDate(centerDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateCalendarDates();
  const today = new Date();
  const monthNames = getMonthNames();
  const dayNames = getDayNames();
  // Monday-first labels for modal header
  const dayNamesMondayFirst = React.useMemo(() => {
    const arr = Array.isArray(dayNames) ? [...dayNames] : [];
    return arr.length === 7 ? [...arr.slice(1), arr[0]] : arr;
  }, [dayNames]);

  // Check which dates have reservations
  const hasReservationsForDate = (date: Date): boolean => {
    // Use local date format instead of ISO string to avoid timezone issues
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Only mark dates with OPEN reservations (waiting or confirmed)
    // Exclude closed reservations (arrived, not_arrived, cancelled)
    return reservations.some(res => 
      res.date === dateString && 
      (res.status === 'waiting' || res.status === 'confirmed')
    );
  };

  // Navigate by day
  const navigateDay = (direction: number) => {
    const newDate = new Date(centerDate);
    newDate.setDate(centerDate.getDate() + direction);
    setCenterDate(newDate);
    onDateChange(newDate);
  };

  // Navigate by month
  const navigateMonth = (direction: number) => {
    const newDate = new Date(centerDate);
    newDate.setMonth(centerDate.getMonth() + direction);
    setCenterDate(newDate);
    onDateChange(newDate);
  };
  // Navigate calendar modal month
  const navigateCalendarMonth = (direction: number) => {
    const d = new Date(calendarViewDate);
    d.setMonth(calendarViewDate.getMonth() + direction);
    setCalendarViewDate(d);
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    setCenterDate(date);
    onDateChange(date);
  };

  // Scroll to center date
  useEffect(() => {
    if (calendarRef.current) {
      // Since we only have 7 dates, no need to scroll - they all fit
      calendarRef.current.scrollLeft = 0;
    }
  }, [centerDate]);

  // Mouse drag scrolling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - calendarRef.current!.offsetLeft);
    setScrollLeft(calendarRef.current!.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - calendarRef.current!.offsetLeft;
    const walk = (x - startX) * 2;
    calendarRef.current!.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Update center date based on scroll position
  const handleScroll = () => {
    // Disabled for 7-day view since all dates are visible
  };

  // Generate logo URL with cache-busting and theme-aware selection
  const getLogoUrl = () => {
    const preferred = theme === 'light'
      ? (user?.logoLightUrl || user?.logo)
      : (user?.logo || user?.logoLightUrl);

    if (!preferred) return logoImage;

    const separator = preferred.includes('?') ? '&' : '?';
    return `${preferred}${separator}v=${logoKey}`;
  };

  return (
    <header className="bg-[#000814] border-b border-gray-800">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Logo and Restaurant Name */}
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 flex items-center justify-center">
            <img 
              key={logoKey} // Force re-render when logo changes
              src={getLogoUrl()} 
              alt={user?.restaurantName || "Logo"} 
              className="w-20 h-20 object-contain rounded-lg"
              onError={(e) => {
                console.error('Logo failed to load:', getLogoUrl());
                // One retry with cache-busting before falling back to default
                if (user?.logo && !logoRetryAttempted) {
                  setLogoRetryAttempted(true);
                  setLogoKey(Date.now()); // trigger re-render with new query param
                  return; // let React re-render the img with new src
                }
                // Fallback to default logo after retry
                e.currentTarget.src = logoImage;
              }}
            />
          </div>
          <span className="text-white font-medium text-lg">
            {user?.restaurantName || "Welcome to Your Venue"}
          </span>
        </div>

        {/* Center: Month/Year and Calendar */}
        <div className="flex items-center gap-6 flex-1 justify-center">
          {/* Month/Year Display */}
          <div className="flex items-center gap-2">
            {/* Open month calendar modal */}
            <button
              onClick={() => {
                setCalendarViewDate(centerDate);
                setShowMonthCalendar(true);
                try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
              }}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title={label('Open calendar', 'Otvori kalendar')}
              aria-label="Open calendar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </button>
            <button 
              onClick={() => navigateMonth(-1)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div className="text-white font-medium min-w-[140px] text-center">
              <span className="uppercase text-sm">{monthNames[centerDate.getMonth()]}</span>
              <span className="text-sm ml-2 text-gray-400">{centerDate.getFullYear()}</span>
            </div>
            <button 
              onClick={() => navigateMonth(1)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          {/* Calendar with navigation arrows */}
          <div className="flex items-center gap-3">
            {/* Previous day arrow */}
            <button 
              onClick={() => navigateDay(-1)}
              className="w-8 h-8 rounded-full border-2 border-white/40 flex items-center justify-center text-white/70 hover:border-white hover:text-white hover:bg-white/10 transition-all duration-200"
              title="Previous day"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            {/* Calendar dates */}
            <div className="flex gap-2 items-center">
              {dates.map((date, idx) => {
                const isToday = date.toDateString() === today.toDateString();
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const isCenter = idx === 3; // Center is always at index 3
                const hasReservations = hasReservationsForDate(date);
                const dayOfWeek = dayNames[date.getDay()];
                const dateKeyStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
                
                // Calculate opacity for fadeout effect
                const getOpacity = (index: number) => {
                  if (index === 0 || index === 6) return 0.15; // First and last - much more faded
                  if (index === 1 || index === 5) return 0.4; // Second and second-to-last - more faded
                  if (index === 2 || index === 4) return 0.7; // Third and third-to-last - moderately faded
                  return 1; // Center (index 3)
                };
                const getBackground = (): string => {
                  const isLight = theme === 'light';
                  if (isToday) {
                    if (hasReservations) {
                      return isLight
                        ? 'linear-gradient(to bottom, #ffffff 0%, #fde68a 60%, #f59e0b 100%)'
                        : 'linear-gradient(to bottom, #1E2A34 0%, #87331C 60%, #BB621A 100%)';
                    }
                    return isLight
                      ? 'linear-gradient(to bottom, #ffffff 0%, #bfdbfe 60%, #93c5fd 100%)'
                      : 'linear-gradient(to bottom, #1E2A34 0%, #345AA6 60%, #7EA0E3 100%)';
                  }
                  if (isCenter) {
                    if (hasReservations) {
                      return isLight
                        ? 'linear-gradient(to bottom, #ffffff 0%, #fde68a 60%, #f59e0b 100%)'
                        : 'linear-gradient(to bottom, #1E2A34 0%, #87331C 60%, #BB621A 100%)';
                    }
                    return isLight ? '#f1f5f9' : '#1E2A34';
                  }
                  return isLight ? '#f8fafc' : '#1E2A34';
                };
                
                return (
                  <div
                    key={dateKeyStr}
                    onClick={() => handleDateClick(date)}
                    className={`
                      flex flex-col items-center justify-center rounded-2xl cursor-pointer overflow-hidden
                      transition-all duration-300 relative flex-shrink-0
                      ${isCenter
                        ? "min-w-[48px] h-[68px] scale-110" // Larger only for selected/center
                        : "min-w-[42px] h-[58px]" // Normal size for all others
                      }
                      hover:opacity-90
                      ${hasReservations && !isCenter && !isToday ? 'border-2 border-orange-500' : ''}
                    `}
                    style={{
                      background: getBackground(),
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center top',
                      backgroundClip: 'padding-box',
                      opacity: getOpacity(idx)
                    }}
                  >
                    <span className={`uppercase ${isCenter ? "text-[10px]" : "text-[9px]"}`} style={{ color: theme === 'light' ? '#64748b' : '#8891A7' }}>
                      {dayOfWeek}
                    </span>
                    <span className={`${isCenter ? "text-[24px]" : "text-[20px]"} font-normal leading-tight mt-0.5`} style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Next day arrow */}
            <button 
              onClick={() => navigateDay(1)}
              className="w-8 h-8 rounded-full border-2 border-white/40 flex items-center justify-center text-white/70 hover:border-white hover:text-white hover:bg-white/10 transition-all duration-200"
              title="Next day"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          {/* Today button */}
          <button
            onClick={() => {
              const today = new Date();
              setCenterDate(today);
              onDateChange(today);
            }}
            className="text-gray-400 hover:text-white transition-colors px-4 py-1.5 text-sm rounded-lg hover:bg-gray-800"
          >
            {t('today')}
          </button>
        </div>

        {/* Right: Theme toggle, Auth and User Icon */}
        <div className="flex items-center gap-3">
          {/* Theme switch (icon-only) */}
          <button
            onClick={toggleTheme}
            className="relative inline-flex items-center w-12 h-6 rounded-full border border-[#F29809] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFB800]/40"
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            aria-label="Toggle theme"
          >
            {/* Track - gold accent, always visible */}
            <span className="absolute inset-0 rounded-full bg-[#FFB800]" />
            {/* Icons (always visible) */}
            <span className="absolute inset-y-0 left-1.5 z-10 text-[#0A1929] flex items-center">
              {/* Sun icon */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-90 drop-shadow">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.64 5.64l-1.41-1.41M19.78 19.78l-1.41-1.41M5.64 18.36l-1.41 1.41M19.78 4.22l-1.41 1.41" />
              </svg>
            </span>
            <span className="absolute inset-y-0 right-1.5 z-10 text-[#0A1929] flex items-center">
              {/* Moon icon */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-90 drop-shadow">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </span>
            {/* Knob */}
            <span
              className={`absolute top-1 left-1.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                theme === 'dark'
                  ? 'translate-x-[20px] -translate-y-[1px]'
                  : '-translate-x-[2px] -translate-y-[1px]'
              }`}
            />
          </button>
          {/* Role switch button */}
          <button
            onClick={() => {
              const hasAnyPin = Boolean(user?.hasAdminPin || user?.hasManagerPin || user?.hasWaiterPin);
              if (!hasAnyPin) {
                setShowRolesInfo(true);
                return;
              }
              setShowRoleUnlock(true);
            }}
            className={`${
              theme === 'light'
                ? 'w-8 h-8 flex items-center justify-center rounded-full bg-gray-0 text-gray-900 hover:bg-gray-100 border border-gray-200 transition'
                : 'w-8 h-8 flex items-center justify-center rounded-full border border-gray-800 text-white/80 hover:text-white hover:bg-white/10 transition'
            }`}
            title="Change role"
            aria-label="Change role"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5z" />
              <path d="M2 22a10 10 0 0 1 20 0" />
            </svg>
          </button>

          {!isAuthenticated && (
            <button
              onClick={() => setShowLoginModal(true)}
              className="text-gray-400 hover:text-gray-300 transition-colors text-sm opacity-70 hover:opacity-100"
            >
              Log In / Sign Up
            </button>
          )}
          <UserMenuTrigger />
        </div>
      </div>

      {/* Auth Modals */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToSignup={() => {
          setShowLoginModal(false);
          setShowSignupModal(true);
        }}
      />
      
      <SignupModal 
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSwitchToLogin={() => {
          setShowSignupModal(false);
          setShowLoginModal(true);
        }}
      />

      {/* Role Unlock Modal */}
      <RoleUnlockModal
        isOpen={showRoleUnlock}
        onClose={() => setShowRoleUnlock(false)}
      />

      {/* Month Calendar Modal */}
      {showMonthCalendar && (
        <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] z-[220]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              setShowMonthCalendar(false);
              try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {}
            }}
          />
          {/* Panel */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#000814] border border-[#1E2A34] rounded-lg shadow-2xl w-[540px] max-w-[90vw]">
            {/* Modal header with month nav - mirrors header styles */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2A34]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateCalendarMonth(-1)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  title={label('Previous month', 'Prethodni mesec')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <div className="text-white font-medium min-w-[140px] text-center">
                  <span className="uppercase text-sm">{monthNames[calendarViewDate.getMonth()]}</span>
                  <span className="text-sm ml-2 text-gray-400">{calendarViewDate.getFullYear()}</span>
                </div>
                <button
                  onClick={() => navigateCalendarMonth(1)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  title={label('Next month', 'Sledeći mesec')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
              <button
                onClick={() => {
                  setShowMonthCalendar(false);
                  try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {}
                }}
                className="text-gray-400 hover:text-white transition-colors p-1"
                aria-label={label('Close', 'Zatvori')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18,6 6,18" />
                  <path d="M6,6 18,18" />
                </svg>
              </button>
            </div>
            {/* Month grid */}
            <div className="p-4">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNamesMondayFirst.map((dn, i) => (
                  <div key={`dn-${i}`} className="text-[10px] uppercase text-center text-gray-500">{dn}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const start = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
                  const end = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0);
                  const startDay = start.getDay(); // 0-6 (Sun..Sat)
                  const mondayFirstOffset = (startDay + 6) % 7; // 0 if Monday, 6 if Sunday
                  const daysInMonth = end.getDate();
                  // Build 5 weeks by default; expand to 6 weeks only when needed
                  const cells: Array<Date> = [];
                  const firstCell = new Date(start);
                  firstCell.setDate(start.getDate() - mondayFirstOffset);
                  const totalCells = mondayFirstOffset + daysInMonth;
                  const weeks = totalCells <= 35 ? 5 : 6;
                  const cellsCount = weeks * 7;
                  for (let i = 0; i < cellsCount; i++) {
                    const d = new Date(firstCell);
                    d.setDate(firstCell.getDate() + i);
                    cells.push(d);
                  }
                  return cells.map((d, idx) => {
                    const isThisMonth = d.getMonth() === calendarViewDate.getMonth();
                    const isToday = d.toDateString() === today.toDateString();
                    const isSelected = d.toDateString() === selectedDate.toDateString();
                    const hasRes = hasReservationsForDate(d);
                    const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    // Match header day tile design
                    const getBackground = (): string => {
                      const isLight = theme === 'light';
                      if (isToday) {
                        if (hasRes) {
                          return isLight
                            ? 'linear-gradient(to bottom, #ffffff 0%, #fde68a 60%, #f59e0b 100%)'
                            : 'linear-gradient(to bottom, #1E2A34 0%, #87331C 60%, #BB621A 100%)';
                        }
                        return isLight
                          ? 'linear-gradient(to bottom, #ffffff 0%, #bfdbfe 60%, #93c5fd 100%)'
                          : 'linear-gradient(to bottom, #1E2A34 0%, #345AA6 60%, #7EA0E3 100%)';
                      }
                      if (isSelected) {
                        if (hasRes) {
                          return theme === 'light'
                            ? 'linear-gradient(to bottom, #ffffff 0%, #fde68a 60%, #f59e0b 100%)'
                            : 'linear-gradient(to bottom, #1E2A34 0%, #87331C 60%, #BB621A 100%)';
                        }
                        return theme === 'light' ? '#f1f5f9' : '#1E2A34';
                      }
                      return theme === 'light' ? '#f8fafc' : '#1E2A34';
                    };
                    return (
                      <button
                        key={`c-${dKey}`}
                        onClick={() => {
                          setCenterDate(d);
                          onDateChange(d);
                          setShowMonthCalendar(false);
                          try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {}
                        }}
                        className={`flex flex-col items-center justify-center rounded-2xl overflow-hidden transition-all duration-200 border justify-self-center w-[42px] h-[58px] ${hasRes && !isSelected && !isToday ? 'border-orange-500' : 'border-transparent'}`}
                        style={{
                          background: getBackground(),
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '100% 100%',
                          backgroundPosition: 'center top',
                          backgroundClip: 'padding-box',
                          opacity: isThisMonth ? 1 : 0.45
                        }}
                        title={d.toLocaleDateString()}
                      >
                        <span className="text-[10px] uppercase" style={{ color: theme === 'light' ? '#64748b' : '#8891A7' }}>
                          {dayNames[d.getDay()]}
                        </span>
                        <span className="text-[18px] font-normal leading-tight mt-0.5" style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                          {d.getDate()}
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>
              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={() => {
                    const t = new Date();
                    setCalendarViewDate(t);
                    setCenterDate(t);
                    onDateChange(t);
                    setShowMonthCalendar(false);
                    try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {}
                  }}
                  className="text-gray-300 hover:text-white transition-colors px-3 py-1.5 text-sm rounded hover:bg-gray-800"
                >
                  {t('today')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info when roles are not configured */}
      <DeleteConfirmationModal
        isOpen={showRolesInfo}
        onClose={() => setShowRolesInfo(false)}
        title={label('Select Role', 'Izaberite ulogu')}
        message={label(
          'No roles are configured yet. Open Settings to add roles and optional PINs.',
          'Uloge još nisu podešene. Otvorite Podešavanja i dodajte uloge i (opciono) PIN‑ove.'
        )}
        type="info"
        confirmText={label('OK', 'U redu')}
      />
    </header>
  );
};

export default Header;
