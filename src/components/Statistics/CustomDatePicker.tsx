import React, { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  type: 'date' | 'month';
  label: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, type, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(value));
  const dropdownRef = useRef<HTMLDivElement>(null);

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

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    const selectedDate = new Date(value);

    return (
      <div className="bg-[#1E2A34] border border-gray-600 rounded-lg shadow-xl p-4 min-w-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setViewDate(subMonths(viewDate, 1))}
            className="p-1 hover:bg-gray-600 rounded transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
              <polyline points="15,18 9,12 15,6"></polyline>
            </svg>
          </button>
          
          <h3 className="text-white font-medium">
            {format(viewDate, 'MMMM yyyy')}
          </h3>
          
          <button
            onClick={() => setViewDate(addMonths(viewDate, 1))}
            className="p-1 hover:bg-gray-600 rounded transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
        </div>

        {type === 'date' && (
          <>
            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                <div key={day} className="text-xs text-gray-400 text-center py-1 font-medium">
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
                      text-sm p-2 rounded transition-colors
                      ${!isCurrentMonth ? 'text-gray-500' : 'text-white'}
                      ${isSelected 
                        ? 'bg-[#FFB800] text-[#0A1929] font-medium' 
                        : isToday 
                        ? 'bg-gray-600 text-white'
                        : 'hover:bg-gray-600'
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
                      : 'text-white hover:bg-gray-600'
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
            className="text-xs text-[#FFB800] hover:text-[#FFB800]/80 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-xs text-gray-300 hover:text-white transition-colors"
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
        <label className="text-xs text-gray-500">{label}:</label>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#1E2A34] border border-[#2A3B4F] rounded text-white text-xs px-3 py-2 focus:border-[#FFB800] outline-none hover:border-[#FFB800]/50 transition-colors flex items-center gap-2 min-w-[120px] justify-between"
        >
          <span>{getDisplayValue()}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-[80]">
          {renderCalendar()}
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker; 