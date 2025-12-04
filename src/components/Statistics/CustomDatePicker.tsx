import React, { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  type: 'date' | 'month';
  label: string;
  // Optional: hide inline label (useful when parent renders its own label above)
  hideInlineLabel?: boolean;
  // Smaller visual scale for tight UIs
  size?: 'md' | 'sm';
  // Fixed dropdown width in pixels (ensures consistent width across screens)
  dropdownWidth?: number;
  // For embedding in forms: make trigger button match standard input height
  matchInputHeight?: boolean;
  // Where to show the dropdown relative to the trigger
  placement?: 'bottom' | 'top';
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, type, label, hideInlineLabel = false, size = 'md', dropdownWidth, matchInputHeight = false, placement = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(value));
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSmall = size === 'sm';
  const computedDropdownWidth = dropdownWidth ?? (isSmall ? 220 : 280);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateSelect = (date: Date) => {
    if (type === 'date') {
      onChange(format(date, 'yyyy-MM-dd'));
    } else {
      onChange(format(date, 'yyyy-MM'));
    }
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const iconSize = isSmall ? 12 : 16;

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    const selectedDate = new Date(value);

    return (
      <div className={`bg-[#1E2A34] border border-gray-600 rounded-lg shadow-xl ${isSmall ? 'p-2' : 'p-4'}`} style={{ width: computedDropdownWidth }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setViewDate(subMonths(viewDate, 1))}
            className={`${isSmall ? 'p-0.5' : 'p-1'} hover:bg-gray-300 rounded transition-colors`}
          >
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
              <polyline points="15,18 9,12 15,6"></polyline>
            </svg>
          </button>
          
          <h3 className={`text-white font-medium ${isSmall ? 'text-sm' : ''}`}>
            {format(viewDate, 'MMMM yyyy')}
          </h3>
          
          <button
            onClick={() => setViewDate(addMonths(viewDate, 1))}
            className={`${isSmall ? 'p-0.5' : 'p-1'} hover:bg-gray-300 rounded transition-colors`}
          >
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
        </div>

        {type === 'date' && (
          <>
            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
                <div key={day} className={`${isSmall ? 'text-[10px]' : 'text-xs'} text-gray-400 text-center py-1 font-medium`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const isCurrentMonth = isSameMonth(day, viewDate);
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(day)}
                    className={`
                      ${isSmall ? 'text-xs p-1' : 'text-sm p-2'} rounded transition-colors
                      ${!isCurrentMonth ? 'text-gray-500' : 'text-white'}
                      ${isSelected 
                        ? 'bg-[#FFB800] text-[#0A1929] font-medium' 
                        : isToday 
                        ? 'bg-gray-300 text-white'
                        : 'hover:bg-gray-300'
                      }
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {type === 'month' && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const monthDate = new Date(viewDate.getFullYear(), i, 1);
              const isSelected = format(monthDate, 'yyyy-MM') === value;
              
              return (
                <button
                  key={i}
                  onClick={() => handleDateSelect(monthDate)}
                  className={`
                    text-sm p-2 rounded transition-colors
                    ${isSelected 
                      ? 'bg-[#FFB800] text-[#0A1929] font-medium' 
                      : 'text-white hover:bg-gray-300'
                    }
                  `}
                >
                  {format(monthDate, 'MMM')}
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between mt-4 pt-3 border-t border-gray-600">
          <button
            onClick={() => {
              onChange(format(new Date(), type === 'date' ? 'yyyy-MM-dd' : 'yyyy-MM'));
              setIsOpen(false);
            }}
            className={`${isSmall ? 'text-[10px]' : 'text-xs'} text-[#FFB800] hover:text-[#FFB800]/80 transition-colors`}
          >
            Today
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className={`${isSmall ? 'text-[10px]' : 'text-xs'} text-gray-300 hover:text-white transition-colors`}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const getDisplayValue = () => {
    if (type === 'date') {
      return format(new Date(value), 'dd/MM/yyyy');
    } else {
      return format(new Date(value + '-01'), 'MMMM yyyy');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        {!hideInlineLabel && <label className="text-xs text-gray-500">{label}:</label>}
        {(() => {
          const triggerSizing = matchInputHeight
            ? 'text-sm px-3 py-2 min-w-[120px] min-h-[42px]'
            : (isSmall ? 'text-[10px] px-2 py-1 min-w-[90px]' : 'text-xs px-3 py-2 min-w-[120px]');
          return (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-[#1E2A34] border border-[#2A3B4F] rounded text-white ${triggerSizing} focus:border-[#FFB800] outline-none hover:border-[#FFB800]/50 transition-colors flex items-center gap-2 justify-between`}
        >
          <span>{getDisplayValue()}</span>
          <svg width={isSmall ? 12 : 14} height={isSmall ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
          );
        })()}
      </div>

      {isOpen && (
        <div className={`absolute ${placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 z-[80]`}>
          {renderCalendar()}
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker; 