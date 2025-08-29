import React, { useState, useRef, useEffect, useContext } from "react";
import { ZoneContext } from "../../context/ZoneContext";
import { UserContext } from "../../context/UserContext";
import { ReservationContext } from "../../context/ReservationContext";
import { useLanguage } from "../../context/LanguageContext";
import UserMenuTrigger from "../UserMenu/UserMenuTrigger";
import LoginModal from "../Auth/LoginModal";
import SignupModal from "../Auth/SignupModal";
import logoImage from "../../assets/logo.png";

interface HeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const Header: React.FC<HeaderProps> = ({ selectedDate, onDateChange }) => {
  const { zones, currentZone, setCurrentZone } = useContext(ZoneContext);
  const { isAuthenticated, user } = useContext(UserContext);
  const { reservations } = useContext(ReservationContext);
  const { t, getMonthNames, getDayNames } = useLanguage();
  const [centerDate, setCenterDate] = useState(selectedDate);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [logoKey, setLogoKey] = useState(Date.now()); // For cache-busting
  
  // Auth modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Update logoKey when user logo changes to force refresh
  useEffect(() => {
    if (user?.logo) {
      setLogoKey(Date.now());
    }
  }, [user?.logo]);

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

  // Generate logo URL with cache-busting
  const getLogoUrl = () => {
    if (!user?.logo) return logoImage;
    
    // Add cache-busting parameter to force refresh
    const separator = user.logo.includes('?') ? '&' : '?';
    return `${user.logo}${separator}v=${logoKey}`;
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
                console.error('Logo failed to load, falling back to default:', getLogoUrl());
                // Fallback to default logo on error
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
                
                // Calculate opacity for fadeout effect
                const getOpacity = (index: number) => {
                  if (index === 0 || index === 6) return 0.15; // First and last - much more faded
                  if (index === 1 || index === 5) return 0.4; // Second and second-to-last - more faded
                  if (index === 2 || index === 4) return 0.7; // Third and third-to-last - moderately faded
                  return 1; // Center (index 3)
                };
                
                return (
                  <div
                    key={idx}
                    onClick={() => handleDateClick(date)}
                    className={`
                      flex flex-col items-center justify-center rounded-2xl cursor-pointer
                      transition-all duration-300 relative flex-shrink-0
                      ${isCenter
                        ? "min-w-[48px] h-[68px] scale-110" // Larger only for selected/center
                        : "min-w-[42px] h-[58px]" // Normal size for all others
                      }
                      hover:opacity-90
                      ${hasReservations && !isCenter && !isToday ? 'border-2 border-orange-500' : ''}
                    `}
                    style={{
                      background: isToday
                        ? hasReservations
                          ? "linear-gradient(to bottom, #1E2A34 0%, #87331C 60%, #BB621A 100%)"
                          : "linear-gradient(to bottom, #1E2A34 0%, #345AA6 60%, #7EA0E3 100%)"
                        : isCenter
                        ? hasReservations
                          ? "linear-gradient(to bottom, #1E2A34 0%, #87331C 60%, #BB621A 100%)"
                          : "#1E2A34"
                        : "#1E2A34", // Non-center, non-today dates always have basic background
                      opacity: getOpacity(idx)
                    }}
                  >
                    <span className={`uppercase text-[#8891A7] ${isCenter ? "text-[10px]" : "text-[9px]"}`}>
                      {dayOfWeek}
                    </span>
                    <span className={`text-white ${isCenter ? "text-[24px]" : "text-[20px]"} font-normal leading-tight mt-0.5`}>
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

        {/* Right: Auth and User Icon */}
        <div className="flex items-center gap-3">
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
    </header>
  );
};

export default Header;
