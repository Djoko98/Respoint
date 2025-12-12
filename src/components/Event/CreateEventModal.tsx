import React, { useContext, useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { useLanguage } from '../../context/LanguageContext';
import { ZoneContext } from '../../context/ZoneContext';
import { EventContext } from '../../context/EventContext';
import { ThemeContext } from '../../context/ThemeContext';
import type { Event } from '../../types/event';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date;
  initialEvent?: Event | null;
}

const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialEvent,
}) => {
  const { t, currentLanguage } = useLanguage();
  const { zones } = useContext(ZoneContext);
  const { createEvent, updateEvent, deleteEvent } = useContext(EventContext);
  const { theme } = useContext(ThemeContext);
  const isLight = theme === 'light';

  const initialDateKey = useMemo(() => formatDateKey(initialDate), [initialDate]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDateKey);
  const [endDate, setEndDate] = useState<string | null>(null); // For multi-day events
  const [endsNextDay, setEndsNextDay] = useState(false); // Toggle for multi-day
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('23:00');
  const [capacity, setCapacity] = useState<string>('');
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [enableDeposit, setEnableDeposit] = useState(false);
  const [depositType, setDepositType] = useState<'fixed' | 'per_person'>('fixed');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [enableTicket, setEnableTicket] = useState(false);
  const [ticketPrice, setTicketPrice] = useState<string>('');
  // UI-only ticket type toggle – mirrors depositType options for consistent UX
  const [ticketType, setTicketType] = useState<'fixed' | 'per_person'>('per_person');

  // Localised month labels for custom date picker
  const months = useMemo(() => {
    if (currentLanguage === 'srb') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];
    }
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [currentLanguage]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const resetState = () => {
    if (initialEvent) {
      setName(initialEvent.name || '');
      setDescription(initialEvent.description || '');
      setDate(initialEvent.date);
      setEndDate(initialEvent.endDate || null);
      setEndsNextDay(!!initialEvent.endDate);
      setStartTime(initialEvent.startTime);
      setEndTime(initialEvent.endTime);
      setCapacity(
        typeof initialEvent.capacityTotal === 'number' && !Number.isNaN(initialEvent.capacityTotal)
          ? String(initialEvent.capacityTotal)
          : ''
      );
      setSelectedZoneIds(Array.isArray(initialEvent.zoneIds) ? initialEvent.zoneIds : []);
      setEnableDeposit(initialEvent.enableDeposit);
      setDepositType(initialEvent.depositType);
      setDepositAmount(
        typeof initialEvent.depositAmount === 'number' && !Number.isNaN(initialEvent.depositAmount)
          ? String(initialEvent.depositAmount)
          : ''
      );
      setEnableTicket(initialEvent.enableTicket);
      setTicketPrice(
        typeof initialEvent.ticketPrice === 'number' && !Number.isNaN(initialEvent.ticketPrice)
          ? String(initialEvent.ticketPrice)
          : ''
      );
    } else {
      setName('');
      setDescription('');
      setDate(initialDateKey);
      setEndDate(null);
      setEndsNextDay(false);
      setStartTime('20:00');
      setEndTime('23:00');
      setCapacity('');
      setSelectedZoneIds([]);
      setEnableDeposit(false);
      setDepositType('fixed');
      setDepositAmount('');
      setEnableTicket(false);
      setTicketPrice('');
      setTicketType('per_person');
    }
    setSubmitting(false);
    setError(null);
  };

  // Helpers for custom date/time controls
  const parseDateSafe = React.useCallback(
    (value?: string) => {
      if (!value) return new Date(initialDateKey);
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return new Date(initialDateKey);
      return d;
    },
    [initialDateKey]
  );

  const eventDateObj = useMemo(() => parseDateSafe(date), [parseDateSafe, date]);

  const adjustEventDate = (field: 'month' | 'day', delta: number) => {
    setDate(prev => {
      const base = parseDateSafe(prev);
      if (field === 'month') {
        base.setMonth(base.getMonth() + delta);
      } else {
        base.setDate(base.getDate() + delta);
      }
      return formatDateKey(base);
    });
  };

  const parseTimeSafe = React.useCallback((value: string | undefined, fallback: string) => {
    const [fh, fm] = fallback.split(':').map((v) => parseInt(v || '0', 10));
    if (!value) {
      return { h: fh || 0, m: fm || 0 };
    }
    const parts = value.split(':');
    let h = parseInt(parts[0] || '', 10);
    let m = parseInt(parts[1] || '', 10);
    if (!Number.isFinite(h)) h = fh || 0;
    if (!Number.isFinite(m)) m = fm || 0;
    h = Math.max(0, Math.min(23, h));
    m = Math.max(0, Math.min(59, m));
    return { h, m };
  }, []);

  const startTimeParts = useMemo(() => parseTimeSafe(startTime, '20:00'), [startTime, parseTimeSafe]);
  const endTimeParts = useMemo(() => parseTimeSafe(endTime, '23:00'), [endTime, parseTimeSafe]);

  const adjustEventTime = (which: 'start' | 'end', field: 'hour' | 'minute', delta: number) => {
    const setter = which === 'start' ? setStartTime : setEndTime;
    const fallback = which === 'start' ? '20:00' : '23:00';
    setter(prev => {
      const { h: baseH, m: baseM } = parseTimeSafe(prev, fallback);
      let h = baseH;
      let m = baseM;
      if (field === 'hour') {
        h = (h + delta + 24) % 24;
      } else {
        m += delta; // 1-minute increments
        while (m < 0) {
          m += 60;
          h = (h + 23) % 24;
        }
        while (m > 59) {
          m -= 60;
          h = (h + 1) % 24;
        }
      }
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      return `${hh}:${mm}`;
    });
  };

  // Handlers for manual hour/minute input
  const handleTimeInputChange = (which: 'start' | 'end', field: 'hour' | 'minute', value: string) => {
    const setter = which === 'start' ? setStartTime : setEndTime;
    const fallback = which === 'start' ? '20:00' : '23:00';
    setter(prev => {
      const { h: baseH, m: baseM } = parseTimeSafe(prev, fallback);
      let h = baseH;
      let m = baseM;
      const numVal = parseInt(value, 10);
      if (field === 'hour') {
        if (!Number.isNaN(numVal) && numVal >= 0 && numVal <= 23) {
          h = numVal;
        }
      } else {
        if (!Number.isNaN(numVal) && numVal >= 0 && numVal <= 59) {
          m = numVal;
        }
      }
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      return `${hh}:${mm}`;
    });
  };

  const handleClose = () => {
    if (submitting) return;
    resetState();
    onClose();
  };

  // When opening, sync state with initialEvent/initialDate
  useEffect(() => {
    if (!isOpen) return;
    resetState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialDateKey, initialEvent?.id]);

  const toggleZone = (zoneId: string) => {
    setSelectedZoneIds((prev) =>
      prev.includes(zoneId) ? prev.filter((z) => z !== zoneId) : [...prev, zoneId]
    );
  };

  const validate = () => {
    if (!name.trim()) {
      return currentLanguage === 'srb'
        ? 'Naziv eventa je obavezan.'
        : 'Event name is required.';
    }
    if (!date) {
      return currentLanguage === 'srb'
        ? 'Datum eventa je obavezan.'
        : 'Event date is required.';
    }
    if (!startTime || !endTime) {
      return currentLanguage === 'srb'
        ? 'Vreme početka i završetka je obavezno.'
        : 'Start and end time are required.';
    }
    
    // Prevent creating events in the past (only for new events, not edits)
    if (!initialEvent) {
      const now = new Date();
      const [sh, sm] = startTime.split(':').map(Number);
      const eventStartDate = new Date(date);
      eventStartDate.setHours(sh, sm, 0, 0);
      
      if (eventStartDate < now) {
        return currentLanguage === 'srb'
          ? 'Ne možeš kreirati event u prošlosti.'
          : 'Cannot create an event in the past.';
      }
    }
    
    if (!selectedZoneIds.length) {
      return currentLanguage === 'srb'
        ? 'Izaberi bar jednu zonu u kojoj važi event.'
        : 'Select at least one zone where the event is active.';
    }
    // Only validate time order if event ends on the same day
    if (!endsNextDay) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      if (Number.isFinite(startMinutes) && Number.isFinite(endMinutes) && endMinutes <= startMinutes) {
        return currentLanguage === 'srb'
          ? 'Vreme završetka mora biti posle vremena početka.'
          : 'End time must be after start time.';
      }
    }
    if (enableDeposit && !depositAmount.trim()) {
      return currentLanguage === 'srb'
        ? 'Unesi iznos depozita ili isključi depozit.'
        : 'Enter deposit amount or disable deposit.';
    }
    if (enableTicket && !ticketPrice.trim()) {
      return currentLanguage === 'srb'
        ? 'Unesi cenu karte ili isključi karte.'
        : 'Enter ticket price or disable tickets.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const capacityNumber =
        capacity.trim() === '' ? null : Number.isNaN(Number(capacity)) ? null : Number(capacity);
      const depositNumber =
        depositAmount.trim() === '' ? null : Number.isNaN(Number(depositAmount)) ? null : Number(depositAmount);
      const ticketNumber =
        ticketPrice.trim() === '' ? null : Number.isNaN(Number(ticketPrice)) ? null : Number(ticketPrice);

      // Calculate endDate for multi-day events
      let computedEndDate: string | null = null;
      if (endsNextDay) {
        const startDateObj = parseDateSafe(date);
        startDateObj.setDate(startDateObj.getDate() + 1);
        computedEndDate = formatDateKey(startDateObj);
      }

      // Common payload used for both create and update.
      // We intentionally do NOT send id/userId/createdAt/updatedAt here so that:
      // - createEvent will attach the correct userId internally
      // - updateEvent will only patch the editable fields, leaving metadata intact.
      const payload: Partial<Event> = {
        name: name.trim(),
        description: description.trim() || null,
        date,
        endDate: computedEndDate,
        startTime,
        endTime,
        capacityTotal: capacityNumber ?? undefined,
        zoneIds: selectedZoneIds.length ? selectedZoneIds : null,
        enableDeposit,
        depositType,
        depositAmount: depositNumber ?? undefined,
        enableTicket,
        ticketPrice: ticketNumber ?? undefined,
      };

      if (initialEvent) {
        await updateEvent(initialEvent.id, payload);
      } else {
        await createEvent(payload);
      }

      resetState();
      onClose();
    } catch (err: any) {
      console.error('❌ Failed to save event:', err);
      setError(
        currentLanguage === 'srb'
          ? 'Nije moguće sačuvati event. Pokušaj ponovo.'
          : 'Unable to save event. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    currentLanguage === 'srb'
      ? initialEvent
        ? 'Izmena Eventa'
        : 'Novi Event'
      : initialEvent
      ? 'Edit Event'
      : 'Create Event';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
      contentScrollable
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Basic info */}
        <div className="space-y-4">
          <div>
            <label className={`block text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
              {currentLanguage === 'srb' ? 'Naziv eventa' : 'Event name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500"
              placeholder={currentLanguage === 'srb' ? 'Večera uz muziku, Žurka...' : 'Dinner, Party...'}
            />
          </div>

          <div>
            <label className={`block text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
              {currentLanguage === 'srb' ? 'Kratak opis (opciono)' : 'Short description (optional)'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none resize-none transition-colors placeholder-gray-500"
              placeholder={currentLanguage === 'srb' ? 'Tip eventa, izvođač, povod...' : 'Type of event, performer, occasion...'}
            />
          </div>
        </div>

        {/* Date & time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Custom date picker (month/day) */}
          <div>
            <label className={`block text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
              {currentLanguage === 'srb' ? 'Datum' : 'Date'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Month */}
              <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => adjustEventDate('month', -1)}
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 18l-6-6 6-6v12z" />
                  </svg>
                </button>
                <span className="text-white font-medium text-xs min-w-[40px] text-center">
                  {months[eventDateObj.getMonth()]}
                </span>
                <button
                  type="button"
                  onClick={() => adjustEventDate('month', 1)}
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6v12z" />
                  </svg>
                </button>
              </div>

              {/* Day */}
              <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => adjustEventDate('day', -1)}
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 18l-6-6 6-6v12z" />
                  </svg>
                </button>
                <span className="text-white font-medium text-xs min-w-[30px] text-center">
                  {currentLanguage === 'srb'
                    ? `${eventDateObj.getDate()}.`
                    : `${eventDateObj.getDate()}th`}
                </span>
                <button
                  type="button"
                  onClick={() => adjustEventDate('day', 1)}
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6v12z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Custom start time (hour/minute) */}
          <div>
            <label className={`block text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
              {currentLanguage === 'srb' ? 'Početak' : 'Start time'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Hour */}
              <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => adjustEventTime('start', 'hour', -1)}
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 18l-6-6 6-6v12z" />
                  </svg>
                </button>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={String(startTimeParts.h).padStart(2, '0')}
                  onChange={(e) => handleTimeInputChange('start', 'hour', e.target.value)}
                  className="text-white font-medium text-xs min-w-[30px] w-full text-center bg-transparent border-none outline-none hide-number-arrows"
                />
                <button
                  type="button"
                  onClick={() => adjustEventTime('start', 'hour', 1)}
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6v12z" />
                  </svg>
                </button>
              </div>

              {/* Minute */}
              <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => adjustEventTime('start', 'minute', -1)}
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 18l-6-6 6-6v12z" />
                  </svg>
                </button>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={String(startTimeParts.m).padStart(2, '0')}
                  onChange={(e) => handleTimeInputChange('start', 'minute', e.target.value)}
                  className="text-white font-medium text-xs min-w-[30px] w-full text-center bg-transparent border-none outline-none hide-number-arrows"
                />
                <button
                  type="button"
                  onClick={() => adjustEventTime('start', 'minute', 1)}
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6v12z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Custom end time (hour/minute) */}
          <div>
            <label className={`block text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
              {currentLanguage === 'srb' ? 'Završetak' : 'End time'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Hour */}
              <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => adjustEventTime('end', 'hour', -1)}
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 18l-6-6 6-6v12z" />
                  </svg>
                </button>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={String(endTimeParts.h).padStart(2, '0')}
                  onChange={(e) => handleTimeInputChange('end', 'hour', e.target.value)}
                  className="text-white font-medium text-xs min-w-[30px] w-full text-center bg-transparent border-none outline-none hide-number-arrows"
                />
                <button
                  type="button"
                  onClick={() => adjustEventTime('end', 'hour', 1)}
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6v12z" />
                  </svg>
                </button>
              </div>

              {/* Minute */}
              <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => adjustEventTime('end', 'minute', -1)}
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 18l-6-6 6-6v12z" />
                  </svg>
                </button>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={String(endTimeParts.m).padStart(2, '0')}
                  onChange={(e) => handleTimeInputChange('end', 'minute', e.target.value)}
                  className="text-white font-medium text-xs min-w-[30px] w-full text-center bg-transparent border-none outline-none hide-number-arrows"
                />
                <button
                  type="button"
                  onClick={() => adjustEventTime('end', 'minute', 1)}
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6v12z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-day event toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEndsNextDay((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-colors ${
              endsNextDay
                ? 'border-[#FFB800] bg-[#FFB800]/10 text-[#FFB800]'
                : isLight
                  ? 'border-gray-300 text-gray-600 hover:border-gray-400'
                  : 'border-gray-700 text-gray-300 hover:border-gray-600'
            }`}
          >
            <span
              className={
                'flex items-center justify-center h-3 w-3 rounded-full border transition-colors ' +
                (endsNextDay
                  ? 'bg-[#FFB800] border-[#FFB800] text-[#0A1929]'
                  : isLight
                    ? 'border-gray-400 text-transparent'
                    : 'border-gray-500 text-transparent')
              }
            >
              {endsNextDay && (
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span>
              {currentLanguage === 'srb'
                ? 'Event završava sutradan'
                : 'Event ends next day'}
            </span>
          </button>
          {endsNextDay && (
            <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              {(() => {
                const nextDay = parseDateSafe(date);
                nextDay.setDate(nextDay.getDate() + 1);
                const dayNum = nextDay.getDate();
                const monthIdx = nextDay.getMonth();
                return currentLanguage === 'srb'
                  ? `(Završava ${dayNum}. ${months[monthIdx]})`
                  : `(Ends ${months[monthIdx]} ${dayNum})`;
              })()}
            </span>
          )}
        </div>

        {/* Capacity & zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
              {currentLanguage === 'srb' ? 'Ukupni kapacitet (mesta)' : 'Total capacity (seats)'}
            </label>
            <input
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500 hide-number-arrows"
              placeholder={currentLanguage === 'srb' ? 'npr. 80' : 'e.g. 80'}
            />
          </div>
          <div>
            <label className={`block text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
              {currentLanguage === 'srb' ? 'Zone u kojima važi event' : 'Zones included in event'}
            </label>
            {zones.length === 0 ? (
              <p className={isLight ? 'text-gray-400' : 'text-gray-500'}>
                {currentLanguage === 'srb'
                  ? 'Nema definisanih zona.'
                  : 'No zones configured.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 text-xs">
                {zones.map((zone) => {
                  const isSelected = selectedZoneIds.includes(zone.id);
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => toggleZone(zone.id)}
                      className={
                        'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition-colors ' +
                        (isSelected
                          ? 'border-[#FFB800] bg-[#FFB800]/10 text-[#FFB800]'
                          : isLight
                            ? 'border-gray-300 text-gray-700 hover:border-gray-400'
                            : 'border-gray-700 text-gray-300 hover:border-gray-600')
                      }
                    >
                      <span
                        className={
                          'flex items-center justify-center w-4 h-4 rounded-full border transition-colors ' +
                          (isSelected
                            ? 'bg-[#FFB800] border-[#FFB800] text-[#0A1929]'
                            : isLight
                              ? 'border-gray-400 text-transparent'
                              : 'border-gray-500 text-transparent')
                        }
                      >
                        {isSelected && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="truncate">{zone.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Payments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={`block text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
              {currentLanguage === 'srb' ? 'Depozit' : 'Deposit'}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEnableDeposit((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-colors ${
                  enableDeposit
                    ? 'border-[#FFB800] bg-[#FFB800]/10 text-[#FFB800]'
                    : isLight
                      ? 'border-gray-300 text-gray-600 hover:border-gray-400'
                      : 'border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                <span
                  className={
                    'flex items-center justify-center h-3 w-3 rounded-full border transition-colors ' +
                    (enableDeposit
                      ? 'bg-[#FFB800] border-[#FFB800] text-[#0A1929]'
                      : isLight
                        ? 'border-gray-400 text-transparent'
                        : 'border-gray-500 text-transparent')
                  }
                >
                  {enableDeposit && (
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span>
                  {enableDeposit
                    ? currentLanguage === 'srb'
                      ? 'Uključeno'
                      : 'Enabled'
                    : currentLanguage === 'srb'
                      ? 'Isključeno'
                      : 'Disabled'}
                </span>
              </button>
            </div>
            {enableDeposit && (
              <div className="space-y-2 mt-2">
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDepositType('fixed')}
                    className={`flex-1 rounded-full border px-2 py-1 transition-colors ${
                      depositType === 'fixed'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : isLight
                          ? 'border-gray-300 text-gray-600 hover:border-gray-400'
                          : 'border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {currentLanguage === 'srb' ? 'Fiksni iznos po rezervaciji' : 'Fixed per reservation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositType('per_person')}
                    className={`flex-1 rounded-full border px-2 py-1 transition-colors ${
                      depositType === 'per_person'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : isLight
                          ? 'border-gray-300 text-gray-600 hover:border-gray-400'
                          : 'border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {currentLanguage === 'srb' ? 'Po osobi' : 'Per guest'}
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500 hide-number-arrows"
                  placeholder={currentLanguage === 'srb' ? 'Iznos depozita' : 'Deposit amount'}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className={`block text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
              {currentLanguage === 'srb' ? 'Ulaznica / karta' : 'Ticket'}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEnableTicket((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-colors ${
                  enableTicket
                    ? 'border-[#FFB800] bg-[#FFB800]/10 text-[#FFB800]'
                    : isLight
                      ? 'border-gray-300 text-gray-600 hover:border-gray-400'
                      : 'border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                <span
                  className={
                    'flex items-center justify-center h-3 w-3 rounded-full border transition-colors ' +
                    (enableTicket
                      ? 'bg-[#FFB800] border-[#FFB800] text-[#0A1929]'
                      : isLight
                        ? 'border-gray-400 text-transparent'
                        : 'border-gray-500 text-transparent')
                  }
                >
                  {enableTicket && (
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span>
                  {enableTicket
                    ? currentLanguage === 'srb'
                      ? 'Uključeno'
                      : 'Enabled'
                    : currentLanguage === 'srb'
                      ? 'Isključeno'
                      : 'Disabled'}
                </span>
              </button>
            </div>
            {enableTicket && (
              <div className="space-y-2 mt-2">
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTicketType('fixed')}
                    className={`flex-1 rounded-full border px-2 py-1 transition-colors ${
                      ticketType === 'fixed'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : isLight
                          ? 'border-gray-300 text-gray-600 hover:border-gray-400'
                          : 'border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {currentLanguage === 'srb' ? 'Fiksni iznos po rezervaciji' : 'Fixed per reservation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketType('per_person')}
                    className={`flex-1 rounded-full border px-2 py-1 transition-colors ${
                      ticketType === 'per_person'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : isLight
                          ? 'border-gray-300 text-gray-600 hover:border-gray-400'
                          : 'border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {currentLanguage === 'srb' ? 'Po osobi' : 'Per guest'}
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500 hide-number-arrows"
                  placeholder={
                    currentLanguage === 'srb'
                      ? ticketType === 'fixed'
                        ? 'Ukupna cena karata'
                        : 'Cena karte po osobi'
                      : ticketType === 'fixed'
                        ? 'Total ticket amount'
                        : 'Ticket price per guest'
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions - create mode */}
        {!initialEvent && (
          <div className={`flex justify-end gap-3 pt-4 border-t mt-2 ${isLight ? 'border-gray-200' : 'border-gray-800'}`}>
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors"
            >
              {currentLanguage === 'srb' ? 'Otkaži' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="relative h-8 rounded-[15px] overflow-hidden group px-6 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transform transition-transform shadow-sm hover:shadow-lg hover:-translate-y-0.5"
            >
              <div
                className="absolute inset-0 opacity-90 group-hover:opacity-100 transition-opacity"
                style={{
                  background:
                    'linear-gradient(90deg,#8066D7 0%,#D759BE 28%,#3773EA 73%,#8137EA 100%)',
                }}
              />
              <div className="absolute inset-[1px] rounded-[14px] border border-white/25" />
              <span className="relative z-10 text-xs tracking-wide" style={{ color: '#FFFFFF' }}>
                {submitting
                  ? currentLanguage === 'srb'
                    ? 'Čuvanje...'
                    : 'Saving...'
                  : currentLanguage === 'srb'
                    ? 'Dodaj event'
                    : 'Add event'}
              </span>
            </button>
          </div>
        )}

        {/* Actions - edit mode */}
        {initialEvent && (
          <div className={`flex justify-between items-center pt-4 border-t mt-2 ${isLight ? 'border-gray-200' : 'border-gray-800'}`}>
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="px-3 py-1.5 text-sm rounded text-red-500 hover:bg-red-500/10 transition-colors"
            >
              {currentLanguage === 'srb' ? 'Izbriši event' : 'Delete event'}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors"
              >
                {currentLanguage === 'srb' ? 'Otkaži' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="relative h-8 rounded-[15px] overflow-hidden group px-6 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transform transition-transform shadow-sm hover:shadow-lg hover:-translate-y-0.5"
              >
                <div
                  className="absolute inset-0 opacity-90 group-hover:opacity-100 transition-opacity"
                  style={{
                    background:
                      'linear-gradient(90deg,#8066D7 0%,#D759BE 28%,#3773EA 73%,#8137EA 100%)',
                  }}
                />
                <div className="absolute inset-[1px] rounded-[14px] border border-white/25" />
                <span className="relative z-10 text-xs tracking-wide" style={{ color: '#FFFFFF' }}>
                  {submitting
                    ? currentLanguage === 'srb'
                      ? 'Čuvanje...'
                      : 'Saving...'
                    : currentLanguage === 'srb'
                      ? 'Sačuvaj izmene'
                      : 'Save changes'}
                </span>
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Delete confirmation modal for edit mode */}
      {initialEvent && (
        <DeleteConfirmationModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={async () => {
            if (!initialEvent || submitting) return;
            try {
              setSubmitting(true);
              await deleteEvent(initialEvent.id);
              setIsDeleteConfirmOpen(false);
              onClose();
            } catch (err) {
              console.error('❌ Failed to delete event:', err);
            } finally {
              setSubmitting(false);
            }
          }}
          title={currentLanguage === 'srb' ? 'Brisanje eventa' : 'Delete event'}
          message={
            currentLanguage === 'srb'
              ? `Da li ste sigurni da želite da obrišete event "${initialEvent.name}" i sve njegove rezervacije?`
              : `Are you sure you want to delete the event "${initialEvent.name}" and all its reservations?`
          }
          confirmText={currentLanguage === 'srb' ? 'Obriši event' : 'Delete event'}
          type="delete"
        />
      )}
    </Modal>
  );
};

export default CreateEventModal;


