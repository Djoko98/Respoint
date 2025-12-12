import React, { useContext, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ZoneContext } from '../../context/ZoneContext';
import { LayoutContext } from '../../context/LayoutContext';
import { EventContext } from '../../context/EventContext';
import { ReservationContext } from '../../context/ReservationContext';
import { ThemeContext } from '../../context/ThemeContext';
import { UserContext } from '../../context/UserContext';
import type { Event, EventReservation, EventPaymentStatus } from '../../types/event';
import { SERVICE_TYPE_DEFINITIONS } from '../../constants/serviceTypes';
import { Eye, BookOpen } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import '../ReservationForm/ColorPicker.css';
import { guestbookService } from '../../services/guestbookService';
import type { GuestbookEntry } from '../../types/guestbook';
import PrintPreviewModal from '../ReservationForm/PrintPreviewModal';
import { generateEventReservationCode } from '../../utils/eventCode';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';
import { reservationAdjustmentsService } from '../../services/reservationAdjustmentsService';

interface EventReservationFormProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  existingReservation?: EventReservation | null;
}

const EventReservationForm: React.FC<EventReservationFormProps> = ({
  isOpen,
  onClose,
  event,
  existingReservation,
}) => {
  const { currentLanguage } = useLanguage();
  const { zones } = useContext(ZoneContext);
  const { theme } = useContext(ThemeContext);
  const { addEventReservation, updateEventReservation, softDeleteEventReservation, eventReservations } = useContext(EventContext);
  const { reservations } = useContext(ReservationContext);
  const { user } = useContext(UserContext);
  const isLight = theme === 'light';

  const isEdit = Boolean(existingReservation);
  // Treat cancelled, not_arrived, and arrived+cleared event reservations as finalized (details-only view)
  const isFinalized =
    !!existingReservation &&
    (existingReservation.status === 'cancelled' || existingReservation.status === 'not_arrived' || (existingReservation.status === 'arrived' && existingReservation.cleared));

  // Peek functionality (same as regular reservation form)
  const [seeThrough, setSeeThrough] = useState(false);
  const handlePeekDown = useCallback(() => {
    setSeeThrough(true);
    const onUp = () => {
      setSeeThrough(false);
      window.removeEventListener('mouseup', onUp as any);
      window.removeEventListener('touchend', onUp as any);
      window.removeEventListener('touchcancel', onUp as any);
      window.removeEventListener('blur', onUp as any);
    };
    window.addEventListener('mouseup', onUp as any, { once: true });
    window.addEventListener('touchend', onUp as any, { once: true });
    window.addEventListener('touchcancel', onUp as any, { once: true });
    window.addEventListener('blur', onUp as any, { once: true });
  }, []);
  const handlePeekUp = useCallback(() => setSeeThrough(false), []);
  useEffect(() => {
    if (seeThrough) {
      try {
        const el = document.activeElement as HTMLElement | null;
        if (el && typeof el.blur === 'function') el.blur();
      } catch {}
    }
  }, [seeThrough]);

  // Form state
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(20);
  const [minute, setMinute] = useState(0);
  const [numberOfGuests, setNumberOfGuests] = useState<number>(2);
  const [zoneId, setZoneId] = useState<string>(event.zoneIds?.[0] || '');
  const [tableNumbers, setTableNumbers] = useState<string[]>([]);
  const [currentTableInput, setCurrentTableInput] = useState('');
  const [tableColor, setTableColor] = useState('#8B5CF6');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<EventPaymentStatus>('unpaid');
  const [depositRequired, setDepositRequired] = useState<number | undefined>(undefined);
  const [ticketTotal, setTicketTotal] = useState<number | undefined>(undefined);
  const [reservationCode, setReservationCode] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedServiceKeys, setSelectedServiceKeys] = useState<string[]>([]);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  
  // Guestbook integration states
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntry[]>([]);
  const [selectedGuestbookId, setSelectedGuestbookId] = useState<string | null>(null);
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);
  const [guestSuggestionIndex, setGuestSuggestionIndex] = useState(-1);
  const [isVipGuest, setIsVipGuest] = useState(false);
  const [isGuestbookBusy, setIsGuestbookBusy] = useState(false);
  
  // Print preview states
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [previewReservationData, setPreviewReservationData] = useState<any>(null);
  
  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Delete modal state (for finalized reservations)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Spillover state - for extending event reservations into the next day
  const [extendToNextDay, setExtendToNextDay] = useState(false);
  const [spilloverEndHour, setSpilloverEndHour] = useState(1); // Default 01:00 next day
  const [spilloverEndMinute, setSpilloverEndMinute] = useState(0);

  const { zoneLayouts, savedLayouts } = useContext(LayoutContext);

  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const paymentDropdownRef = useRef<HTMLDivElement>(null);

  // Month names for display
  const months = useMemo(() => {
    if (currentLanguage === 'srb') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];
    }
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [currentLanguage]);

  // Parse time from event.startTime and date from event.date
  useEffect(() => {
    if (!isOpen) return;
    
    const parseTime = (timeStr?: string) => {
      if (!timeStr) return { h: 20, m: 0 };
      const parts = timeStr.split(':');
      return {
        h: parseInt(parts[0] || '20', 10),
        m: parseInt(parts[1] || '0', 10)
      };
    };

    const parseDate = (dateStr?: string) => {
      if (!dateStr) {
        const now = new Date();
        return { m: now.getMonth(), d: now.getDate() };
      }
      const date = new Date(dateStr);
      return { m: date.getMonth(), d: date.getDate() };
    };

    // Parse event date for display (always from event, not editable)
    const eventDateParsed = parseDate(event.date);
    setMonth(eventDateParsed.m);
    setDay(eventDateParsed.d);

    if (existingReservation) {
      setGuestName(existingReservation.guestName || '');
      setPhone(existingReservation.phone || '');
      
      // Parse service types from notes and extract the "pure" additional requirements
      // Notes format: "ServiceLabel1, ServiceLabel2, actual user notes"
      const rawNotes = existingReservation.notes || '';
      const langKey = currentLanguage === 'srb' ? 'srb' : 'eng';
      const foundServiceKeys: string[] = [];
      
      // Split notes by comma separator (matching parseServiceTypeTokens)
      const parts = rawNotes.split(',').map(p => p.trim()).filter(Boolean);
      const nonServiceParts: string[] = [];
      
      // Build a set of known service labels for quick lookup
      const serviceLabelsMap = new Map<string, string>();
      SERVICE_TYPE_DEFINITIONS.forEach(def => {
        serviceLabelsMap.set(def.label[langKey as 'srb' | 'eng'].toLowerCase(), def.key);
      });
      
      parts.forEach(part => {
        const matchedKey = serviceLabelsMap.get(part.toLowerCase());
        if (matchedKey) {
          foundServiceKeys.push(matchedKey);
        } else {
          // This is actual additional requirements text
          nonServiceParts.push(part);
        }
      });
      
      const pureNotes = nonServiceParts.join(', ');
      
      setNotes(pureNotes);
      setSelectedServiceKeys(foundServiceKeys);
      
      const t = parseTime(existingReservation.time);
      setHour(t.h);
      setMinute(t.m);
      setNumberOfGuests(existingReservation.numberOfGuests || 2);
      setZoneId(existingReservation.zoneId || event.zoneIds?.[0] || '');
      setTableNumbers(Array.isArray(existingReservation.tableIds) ? existingReservation.tableIds.map(String) : []);
      setCurrentTableInput('');
      setTableColor(existingReservation.color || '#8B5CF6');
      setIsVipGuest(existingReservation.isVip || false);
      setPaymentStatus(existingReservation.paymentStatus || 'unpaid');
      setDepositRequired(existingReservation.depositRequired);
      setTicketTotal(existingReservation.ticketPrice);
      setReservationCode(existingReservation.reservationCode || '');
    } else {
      setGuestName('');
      setPhone('');
      setNotes('');

      const t = parseTime(event.startTime);

      // Default time: event start time, unless event has already started today,
      // in which case use current time as a better starting point.
      let initialHour = t.h;
      let initialMinute = t.m;
      try {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        if (todayStr === event.date) {
          const eventStart = new Date(event.date);
          eventStart.setHours(t.h, t.m, 0, 0);

          if (now >= eventStart) {
            initialHour = now.getHours();
            initialMinute = now.getMinutes();
          }
        }
      } catch {
        // Fallback silently to event start time
      }

      setHour(initialHour);
      setMinute(initialMinute);
      setNumberOfGuests(2);
      setZoneId(event.zoneIds?.[0] || '');
      setTableNumbers([]);
      setCurrentTableInput('');
      setTableColor('#8B5CF6');
      setIsVipGuest(false);
      setPaymentStatus('unpaid');
      setDepositRequired(undefined);
      setTicketTotal(undefined);
      setReservationCode(generateEventReservationCode(event.date));
      setSelectedServiceKeys([]);
    }
    setShowColorPicker(false);
    setSubmitting(false);
    setError(null);
    
    // Reset spillover state
    setExtendToNextDay(false);
    setSpilloverEndHour(1);
    setSpilloverEndMinute(0);
  }, [isOpen, event, existingReservation, currentLanguage]);

  // Load existing spillover adjustment when editing (only if event is multi-day)
  useEffect(() => {
    if (!isOpen || !existingReservation) return;
    // Only load spillover if event is multi-day (has endDate)
    if (!event.endDate) return;
    
    const loadSpilloverAdjustment = async () => {
      try {
        const dateKey = existingReservation.date;
        // Try DB first
        const fromDb = await reservationAdjustmentsService.getByDate(dateKey);
        const adj = fromDb?.[existingReservation.id];
        
        if (adj && typeof adj.end === 'number' && adj.end > 1440) {
          // Has spillover adjustment
          setExtendToNextDay(true);
          const spilloverMinutes = adj.end - 1440;
          setSpilloverEndHour(Math.floor(spilloverMinutes / 60));
          setSpilloverEndMinute(spilloverMinutes % 60);
          return;
        }
        
        // Fallback to localStorage
        const key = `respoint-duration-adjustments:${dateKey}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const localAdj = parsed?.[existingReservation.id];
          if (localAdj && typeof localAdj.end === 'number' && localAdj.end > 1440) {
            setExtendToNextDay(true);
            const spilloverMinutes = localAdj.end - 1440;
            setSpilloverEndHour(Math.floor(spilloverMinutes / 60));
            setSpilloverEndMinute(spilloverMinutes % 60);
          }
        }
      } catch (err) {
        console.error('Error loading spillover adjustment:', err);
      }
    };
    
    loadSpilloverAdjustment();
  }, [isOpen, existingReservation, event.endDate]);

  // Recalculate default financial amounts when number of guests changes (only for new reservations)
  useEffect(() => {
    if (!isOpen || existingReservation) return;

    if (event.enableDeposit && event.depositAmount != null) {
      if (event.depositType === 'per_person') {
        setDepositRequired(event.depositAmount * numberOfGuests);
      } else {
        setDepositRequired(event.depositAmount);
      }
    } else {
      setDepositRequired(undefined);
    }

    if (event.enableTicket && event.ticketPrice != null) {
      setTicketTotal(event.ticketPrice * numberOfGuests);
    } else {
      setTicketTotal(undefined);
    }
  }, [isOpen, event, existingReservation, numberOfGuests]);

  // Ensure Service Type dropdown is visible when opened
  useEffect(() => {
    if (!serviceDropdownOpen) return;
    const id = requestAnimationFrame(() => {
      try {
        const target = serviceDropdownRef.current;
        if (!target) return;
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, [serviceDropdownOpen]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Close service dropdown if clicking outside
      if (serviceDropdownOpen && serviceDropdownRef.current && !serviceDropdownRef.current.contains(target)) {
        setServiceDropdownOpen(false);
      }
      
      // Close payment dropdown if clicking outside
      if (paymentDropdownOpen && paymentDropdownRef.current && !paymentDropdownRef.current.contains(target)) {
        setPaymentDropdownOpen(false);
      }
      
      // Close color picker if clicking outside
      if (showColorPicker && colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setShowColorPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [serviceDropdownOpen, paymentDropdownOpen, showColorPicker]);

  // Load guestbook entries when modal opens
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const list = await guestbookService.list();
        setGuestbookEntries(list);
      } catch {
        setGuestbookEntries([]);
      }
    })();
  }, [isOpen]);

  // Guestbook helper functions
  const normalizeText = (s?: string) => (s || '').toLowerCase().trim();
  const normalizePhone = (s?: string) => (s || '').replace(/\D+/g, '');
  const guestNameQuery = normalizeText(guestName);
  const phoneQuery = normalizePhone(phone);

  // Guest suggestions based on name input
  const guestSuggestions = useMemo(() => {
    if (!guestNameQuery) return [];
    const seen = new Set<string>();
    const list = guestbookEntries.filter(e => {
      const n = normalizeText(e.name || '');
      if (!n) return false;
      let match = false;
      if (guestNameQuery.length === 1) {
        const words = n.split(/\s+/).filter(Boolean);
        match = words.some(w => w.startsWith(guestNameQuery));
      } else {
        match = n.includes(guestNameQuery);
      }
      if (match && !seen.has(n)) { seen.add(n); return true; }
      return false;
    });
    return list.slice(0, 10);
  }, [guestbookEntries, guestNameQuery]);

  // Detect VIP (loyalty) guest
  const isVipByName = useMemo(() => {
    if (!guestNameQuery) return false;
    return guestbookEntries.some(e => !!e.isVip && normalizeText(e.name || '') === guestNameQuery);
  }, [guestbookEntries, guestNameQuery]);
  
  const showLoyaltyBadge = isVipGuest || (!isEdit && isVipByName);

  // Find existing guest in guestbook
  const existingGuest = useMemo(() => {
    // Find guest by phone and name separately
    const byPhone = phoneQuery && phoneQuery.length >= 5
      ? guestbookEntries.find(e => normalizePhone(e.phone) === phoneQuery)
      : null;
    const byName = guestNameQuery
      ? guestbookEntries.find(e => normalizeText(e.name || '') === guestNameQuery)
      : null;
    
    // If both phone and name are provided, they must match the same guest
    if (byPhone && guestNameQuery) {
      // Only return phone match if the name also matches this guest
      if (normalizeText(byPhone.name || '') === guestNameQuery) {
        return byPhone;
      }
      // Phone matches different guest than name - user is typing new guest
      return null;
    }
    
    // If only phone matches (no name entered)
    if (byPhone && !guestNameQuery) return byPhone;
    
    // If only name matches
    return byName || null;
  }, [guestbookEntries, guestNameQuery, phoneQuery]);

  // Handle guestbook action (View profile or Add to guestbook)
  const handleGuestbookAction = async () => {
    if (existingGuest) {
      try { localStorage.setItem('respoint_selected_guestbook_id', existingGuest.id); } catch {}
      try { window.dispatchEvent(new CustomEvent('respoint-open-guestbook')); } catch {}
      return;
    }
    const name = guestName.trim();
    if (!name) return;
    setIsGuestbookBusy(true);
    try {
      const created = await guestbookService.create({ name, phone: phone || '' } as any);
      setGuestbookEntries(prev => {
        const exists = prev.some(e => e.id === created.id);
        return exists ? prev : [created, ...prev];
      });
      try { localStorage.setItem('respoint_selected_guestbook_id', created.id); } catch {}
    } catch {
      // Silent fail
    } finally {
      setIsGuestbookBusy(false);
    }
  };

  // Select a guest from suggestions
  const handleSelectGuest = (entry: GuestbookEntry) => {
    setGuestName(entry.name || '');
    setPhone(entry.phone || ''); // Always use guestbook phone when selecting guest
    setIsVipGuest(!!entry.isVip);
    setSelectedGuestbookId(entry.id);
    try { localStorage.setItem('respoint_selected_guestbook_id', entry.id); } catch {}
    setShowGuestSuggestions(false);
    setGuestSuggestionIndex(-1);

    // Auto-populate table numbers from preferred seating
    if (entry.preferredSeating) {
      const preferredTables = entry.preferredSeating
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      
      if (preferredTables.length > 0) {
        setTableNumbers((prev) => {
          const combined = new Set([...prev, ...preferredTables]);
          const finalNumbers = Array.from(combined);

          // Auto-select zone based on table numbers
          const zonesForAll = new Set<string>();
          finalNumbers.forEach(n => {
            const z = findZoneIdForTableNumber(n);
            if (z) zonesForAll.add(z);
          });
          const onlyZone = zonesForAll.size === 1 ? Array.from(zonesForAll)[0] : null;
          if (onlyZone) {
            setZoneId(onlyZone);
          }

          return finalNumbers;
        });
      }
    }
  };

  // Handle print preview
  const handlePrint = () => {
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // Detect multi-zone for print
    let zoneName: string | undefined;
    if (autoSelectedZoneIds.size > 1) {
      zoneName = currentLanguage === 'srb' ? 'Spojene zone' : 'Merged Zones';
    } else if (autoSelectedZoneIds.size === 1) {
      const zId = Array.from(autoSelectedZoneIds)[0];
      zoneName = zones.find(z => z.id === zId)?.name;
    } else if (zoneId) {
      zoneName = zones.find(z => z.id === zoneId)?.name;
    }
    
    const reservationData = {
      guestName: guestName.trim(),
      date: event.date,
      time: timeStr,
      numberOfGuests,
      zoneName,
      tableNumbers,
      phone,
      // Service type label (only), without additional requirements
      serviceType: selectedServiceValue,
      // Full combined notes still stored separately if ever needed
      notes: buildCombinedNotes(),
      // Pure additional requirements for "Napomene" sekciju
      additionalRequirements: notes.trim(),
      reservationCode: reservationCode || (existingReservation?.reservationCode || ''),
      paymentStatus,
      depositRequired,
      ticketPrice: ticketTotal,
      isEventReservation: true, // Flag for print preview to show reservation code
      // Restaurant info for print preview (same as regular reservation)
      restaurantName: user?.restaurantName,
      restaurantAddress: user?.address,
      logoUrl: user?.printLogoUrl || user?.logo,
    };
    
    setPreviewReservationData(reservationData);
    setShowPrintPreview(true);
  };

  // Handle cancel reservation (show confirmation modal)
  const handleCancel = () => {
    if (existingReservation) {
      setShowCancelModal(true);
    }
  };

  // Confirm cancel - update status to 'cancelled'
  const confirmCancel = async () => {
    if (!existingReservation) return;
    
    try {
      await updateEventReservation(existingReservation.id, {
        status: 'cancelled'
      });
      setShowCancelModal(false);
      onClose();
    } catch (error) {
      console.error('Error cancelling event reservation:', error);
      setError(currentLanguage === 'srb' ? 'Greška pri otkazivanju rezervacije.' : 'Error cancelling reservation.');
    }
  };

  // Confirm delete - soft delete to keep in statistics
  const confirmDelete = async () => {
    if (!existingReservation) return;
    
    try {
      await softDeleteEventReservation(existingReservation.id);
      setShowDeleteModal(false);
      onClose();
    } catch (error) {
      console.error('Error deleting event reservation:', error);
      setError(currentLanguage === 'srb' ? 'Greška pri brisanju rezervacije.' : 'Error deleting reservation.');
    }
  };

  // Handle clear now - for seated (arrived) reservations that guests left early
  const handleClearNow = async () => {
    if (!existingReservation) return;
    try {
      await updateEventReservation(existingReservation.id, { status: 'arrived', cleared: true } as any);
      onClose();
    } catch (error) {
      console.error('Error clearing event reservation:', error);
      setError(currentLanguage === 'srb' ? 'Greška pri označavanju rezervacije.' : 'Error clearing reservation.');
    }
  };

  // Check if reservation is seated (arrived but not cleared)
  const isArrived = !!existingReservation && existingReservation.status === 'arrived' && !existingReservation.cleared;

  const title = currentLanguage === 'srb'
    ? isEdit ? 'Izmena event rezervacije' : 'Nova event rezervacija'
    : isEdit ? 'Edit event reservation' : 'New event reservation';

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const placeholders = useMemo(() => {
    if (currentLanguage === 'srb') {
      return {
        guestName: 'Ime gosta (obavezno)',
        tableNumber: 'Broj stola (neobavezno)',
        mobileNumber: 'Kontakt telefon...',
        additionalRequirements: 'Alergeni, posebni zahtevi, povod događaja...',
        addMore: 'Dodaj još...'
      };
    }
    return {
      guestName: 'Guest name (required)',
      tableNumber: 'Table number (optional)',
      mobileNumber: 'Contact phone number...',
      additionalRequirements: 'Allergens, special requests, occasion of event...',
      addMore: 'Add more...'
    };
  }, [currentLanguage]);

  const serviceTypeSuggestions = useMemo(() => {
    const languageKey = currentLanguage === 'srb' ? 'srb' : 'eng';
    return SERVICE_TYPE_DEFINITIONS.map((definition) => ({
      key: definition.key,
      icon: definition.icon,
      iconBg: definition.iconBg,
      iconColor: definition.iconColor,
      ringColor: definition.ringColor,
      label: definition.label[languageKey as 'eng' | 'srb'],
      description: definition.description[languageKey as 'eng' | 'srb'],
    }));
  }, [currentLanguage]);

  // Helper: find zoneId for a given table number/name (mirrors ReservationForm)
  const findZoneIdForTableNumber = useCallback(
    (tableNumberOrName: string): string | null => {
      try {
        const target = String(tableNumberOrName || '').trim();
        if (!target) return null;

        // 1) Prefer working layouts from zoneLayouts
        for (const [zoneId, layout] of Object.entries(zoneLayouts || {})) {
          const tables = Array.isArray((layout as any)?.tables) ? (layout as any).tables : [];
          const found = tables.some(
            (t: any) => t?.name === target || String(t?.number ?? '') === target
          );
          if (found) return zoneId;
        }

        // 2) Fallback: search through all saved layouts
        for (const [zoneId, list] of Object.entries((savedLayouts as any) || {})) {
          const layoutsForZone = Array.isArray(list) ? list : [];
          for (const sl of layoutsForZone) {
            const tables = Array.isArray(sl?.layout?.tables) ? sl.layout.tables : [];
            const found = tables.some(
              (t: any) => t?.name === target || String(t?.number ?? '') === target
            );
            if (found) return zoneId;
          }
        }
      } catch {
        // ignore
      }
      return null;
    },
    [zoneLayouts, savedLayouts]
  );

  // Auto-selected zones from entered table numbers (for header highlighting)
  const autoSelectedZoneIds = useMemo(() => {
    const result = new Set<string>();
    try {
      const nums = (tableNumbers || []).map((n) => String(n || '').trim()).filter(Boolean);
      if (nums.length === 0) return result;
      nums.forEach((num) => {
        const z = findZoneIdForTableNumber(num);
        if (z) result.add(z);
      });
    } catch {}
    return result;
  }, [tableNumbers, findZoneIdForTableNumber]);

  const suggestionButtonBase = isLight
    ? "flex items-center gap-2 rounded-lg bg-transparent text-gray-900 hover:bg-gray-50"
    : "flex items-center gap-2 rounded-lg bg-transparent text-white hover:bg-[#0B1D33]";
  const suggestionButtonSelected = isLight
    ? "bg-blue-50 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]"
    : "bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.4)]";
  const suggestionDescriptionClass = isLight ? "text-gray-500" : "text-gray-400";

  const toggleServiceKey = (key: string) => {
    setSelectedServiceKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleRemoveServiceTag = (index: number) => {
    setSelectedServiceKeys((prev) => prev.filter((_, i) => i !== index));
  };

  const findSuggestionMeta = useCallback(
    (key?: string) => serviceTypeSuggestions.find((s) => s.key === key),
    [serviceTypeSuggestions]
  );

  const selectedServiceValue = useMemo(
    () => selectedServiceKeys.map((key) => {
      const meta = findSuggestionMeta(key);
      return meta?.label || key;
    }).join(', '),
    [selectedServiceKeys, findSuggestionMeta]
  );

  const buildCombinedNotes = () => {
    const selectedLabels = serviceTypeSuggestions
      .filter((def) => selectedServiceKeys.includes(def.key))
      .map((def) => def.label);
    const baseNote = notes.trim();
    const parts = [...selectedLabels, baseNote].filter(Boolean);
    // Use comma separator to match parseServiceTypeTokens which splits by comma
    return parts.join(', ');
  };

  const handleAddTableNumber = () => {
    const raw = currentTableInput.trim();
    if (!raw) return;

    const pieces = raw
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (!pieces.length) return;

    setTableNumbers((prev) => {
      const set = new Set(prev);
      pieces.forEach((p) => set.add(p));
      return Array.from(set);
    });

    // After adding tables, derive zones from all table numbers
    setZoneId((prevZoneId) => {
      const allNumbers = Array.from(new Set([...tableNumbers, ...pieces]));
      const zonesForAll = new Set<string>();
      allNumbers.forEach((n) => {
        const z = findZoneIdForTableNumber(n);
        if (z) zonesForAll.add(z);
      });

      // If all tables belong to a single zone, auto-select it
      if (zonesForAll.size === 1) {
        return Array.from(zonesForAll)[0];
      }

      // If multiple zones or none, keep existing explicit selection
      return prevZoneId;
    });

    setCurrentTableInput('');
  };

  const handleRemoveTableNumber = (table: string) => {
    setTableNumbers((prev) => prev.filter((t) => t !== table));

    // Re-evaluate zones after removal
    setZoneId((prevZoneId) => {
      const nextTables = tableNumbers.filter((t) => t !== table);
      const zonesForAll = new Set<string>();
      nextTables.forEach((n) => {
        const z = findZoneIdForTableNumber(n);
        if (z) zonesForAll.add(z);
      });

      if (zonesForAll.size === 1) {
        return Array.from(zonesForAll)[0];
      }

      if (zonesForAll.size === 0) {
        // Fallback: first event zone or keep previous
        return prevZoneId || event.zoneIds?.[0] || '';
      }

      // Multiple zones → keep existing explicit selection
      return prevZoneId;
    });
  };

  const handleTableInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTableNumber();
    }
  };

  // Time adjustment functions (matching regular reservation form)
  const adjustValue = (field: 'hour' | 'minute' | 'numberOfGuests', delta: number) => {
    if (field === 'hour') {
      setHour((prev) => Math.max(0, Math.min(23, prev + delta)));
    } else if (field === 'minute') {
      setMinute((prev) => {
        const next = prev + delta; // 1-minute increments
        if (next < 0) return 0;
        if (next > 59) return 59;
        return next;
      });
    } else if (field === 'numberOfGuests') {
      setNumberOfGuests((prev) => Math.max(1, Math.min(200, prev + delta)));
    }
  };

  const canDecrease = (field: 'hour' | 'minute' | 'numberOfGuests') => {
    if (field === 'hour') return hour > 0;
    if (field === 'minute') return true;
    if (field === 'numberOfGuests') return numberOfGuests > 1;
    return true;
  };

  const handleHourInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setHour(0);
      return;
    }
    let num = parseInt(raw, 10);
    if (Number.isNaN(num)) num = 0;
    num = Math.max(0, Math.min(23, num));
    setHour(num);
  };

  const handleMinuteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setMinute(0);
      return;
    }
    let num = parseInt(raw, 10);
    if (Number.isNaN(num)) num = 0;
    num = Math.max(0, Math.min(59, num));
    setMinute(num);
  };

  // Capacity validation helpers
  const eventCapacity = event.capacityTotal ?? null;

  const usedSeatsExcludingCurrent = useMemo(() => {
    if (!eventCapacity) return 0;
    return eventReservations
      .filter(r => r.eventId === event.id && r.status !== 'cancelled')
      .reduce((sum, r) => {
        if (existingReservation && r.id === existingReservation.id) return sum;
        return sum + (r.numberOfGuests || 0);
      }, 0);
  }, [eventCapacity, event.id, eventReservations, existingReservation]);

  const handleShuffleCode = () => {
    try {
      const next = generateEventReservationCode(event.date);
      setReservationCode(next);
    } catch {
      const fallback = generateEventReservationCode(new Date().toISOString().slice(0, 10));
      setReservationCode(fallback);
    }
  };

  // Helper functions for time overlap validation
  const timeStringToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h % 24) * 60 + (m % 60);
  };

  const formatMinutesToTime = (minutes: number) => {
    const normalized = Math.max(0, Math.min(1439, Math.round(minutes)));
    const h = Math.floor(normalized / 60).toString().padStart(2, '0');
    const m = (normalized % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const estimateDurationMinutes = (numGuests?: number) => {
    const guests = typeof numGuests === 'number' ? numGuests : 2;
    if (guests <= 2) return 60;
    if (guests <= 4) return 120;
    return 150;
  };

  const validate = (): string | null => {
    if (!guestName.trim()) {
      return currentLanguage === 'srb' ? 'Ime gosta je obavezno.' : 'Guest name is required.';
    }
    if (!Number.isFinite(numberOfGuests) || numberOfGuests <= 0) {
      return currentLanguage === 'srb' ? 'Broj gostiju mora biti veći od nule.' : 'Number of guests must be greater than zero.';
    }
    if (eventCapacity && Number.isFinite(numberOfGuests) && numberOfGuests > 0) {
      const remaining = eventCapacity - usedSeatsExcludingCurrent;
      if (numberOfGuests > remaining) {
        if (currentLanguage === 'srb') {
          const remainingText = remaining > 0 ? ` Preostalo je još ${remaining} mesta.` : ' Nema više slobodnih mesta.';
          return `Maksimalni kapacitet eventa je ${eventCapacity} gostiju.${remainingText}`;
        }
        const remainingText = remaining > 0 ? ` Only ${remaining} seats remain.` : ' No seats are left.';
        return `This event is limited to ${eventCapacity} guests.${remainingText}`;
      }
    }
    
    // Prevent overlapping reservations for the same table (time range overlap per event)
    const normalizedTables = tableNumbers.map((t) => t.trim()).filter((t) => t.length > 0);
    if (normalizedTables.length > 0) {
      // Calculate new reservation time range
      const newStartMin = hour * 60 + minute;
      const newEndMin = Math.min(1440, newStartMin + estimateDurationMinutes(numberOfGuests));

      // Find conflicting reservations (same event, overlapping time, shared table)
      for (const tableNum of normalizedTables) {
        const conflictingReservation = eventReservations.find((r) => {
          if (r.eventId !== event.id) return false;
          if (existingReservation && r.id === existingReservation.id) return false;
          // Ignore deleted / finalized reservations
          if (r.isDeleted) return false;
          if (r.status === 'cancelled') return false;
          if (r.status === 'not_arrived') return false;
          if (r.status === 'arrived' && r.cleared) return false;
          // Check if this reservation uses the same table
          if (!Array.isArray(r.tableIds) || !r.tableIds.map(String).includes(tableNum)) return false;
          
          // Calculate existing reservation time range
          const existingStartMin = timeStringToMinutes(r.time);
          const existingEndMin = Math.min(1440, existingStartMin + estimateDurationMinutes(r.numberOfGuests));
          
          // Check for time overlap: newStart < existingEnd && existingStart < newEnd
          return newStartMin < existingEndMin && existingStartMin < newEndMin;
        });

        if (conflictingReservation) {
          const existingStartMin = timeStringToMinutes(conflictingReservation.time);
          const existingEndMin = Math.min(1440, existingStartMin + estimateDurationMinutes(conflictingReservation.numberOfGuests));
          
          if (currentLanguage === 'srb') {
            return `Sto "${tableNum}" je već rezervisan u ${formatMinutesToTime(existingStartMin)}-${formatMinutesToTime(existingEndMin)} na ovaj dan za gosta "${conflictingReservation.guestName}".`;
          }
          return `Table "${tableNum}" is already booked at ${formatMinutesToTime(existingStartMin)}-${formatMinutesToTime(existingEndMin)} on this day for guest "${conflictingReservation.guestName}".`;
        }
      }
    }

    // Validate that reservation time is before event ends
    if (event.endTime) {
      const [endH, endM] = event.endTime.split(':').map(Number);
      const reservationMinutes = hour * 60 + minute;
      
      // For multi-day events (endDate is set), we need different logic
      if (event.endDate) {
        // Event spans multiple days - reservation on start date must be >= startTime
        // For now, just check if reservation is on start date that it's after start time
        const [startH, startM] = (event.startTime || '20:00').split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        
        // Check if reservation date is the start date
        const reservationDateStr = `${new Date().getFullYear()}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (reservationDateStr === event.date && reservationMinutes < startMinutes) {
          return currentLanguage === 'srb'
            ? `Vreme dolaska ne može biti pre početka eventa (${event.startTime}).`
            : `Arrival time cannot be before event starts (${event.startTime}).`;
        }
      } else {
        // Single day event - reservation time must be before end time
        const endMinutes = endH * 60 + endM;
        if (reservationMinutes >= endMinutes) {
          return currentLanguage === 'srb'
            ? `Vreme dolaska ne može biti nakon završetka eventa (${event.endTime}).`
            : `Arrival time cannot be after event ends (${event.endTime}).`;
        }
      }
    }
    
    if (!reservationCode.trim()) {
      return currentLanguage === 'srb'
        ? 'Kod rezervacije nije generisan. Pritisni dugme za nasumičan kod.'
        : 'Reservation code is missing. Please use the shuffle button to generate one.';
    }
    return null;
  };

  // Get adjustments from localStorage
  const getAdjustmentsForDate = (dateStr: string) => {
    try {
      const raw = localStorage.getItem(`respoint-duration-adjustments:${dateStr}`);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Get all tables across zones for table ID resolution
    const allTables = Object.values(zoneLayouts || {}).flatMap((layout: any) => layout?.tables || []);
    const normalizedTables = tableNumbers.map((t) => t.trim()).filter((t) => t.length > 0);
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const date = event.date;

    // VALIDATION: Check for conflicts with seated reservations
    const adjustmentsForDate = getAdjustmentsForDate(date);
    const newStartMin = timeStringToMinutes(timeStr);
    const newEndMin = Math.min(1440, newStartMin + estimateDurationMinutes(numberOfGuests));
    const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
      aStart < bEnd && bStart < aEnd;

    // Also block against spillover regular reservations from previous day into this date (endMin > 1440)
    const prevDateKey = (() => {
      try {
        const d = new Date(`${date}T00:00:00`);
        d.setDate(d.getDate() - 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      } catch {
        return null;
      }
    })();
    const adjustmentsForPrev = prevDateKey ? getAdjustmentsForDate(prevDateKey) : {};

    // Seated regular reservations (arrived, not cleared)
    const seatedRegularReservations = (reservations || []).filter(
      r => r.status === 'arrived' && !(r as any).cleared
    );

    // Seated event reservations (arrived, not cleared), excluding current reservation if editing
    const seatedEventReservations = (eventReservations || []).filter(
      er => er.status === 'arrived' && !er.cleared && !(isEdit && existingReservation && er.id === existingReservation.id)
    );

    for (const tableNumber of normalizedTables) {
      // Find table ID
      const tableObj = allTables.find((t: any) => t.name === tableNumber || t.number?.toString() === tableNumber);
      const tableId = tableObj?.id || tableNumber;

      // Check spillover regular reservations from previous day
      if (prevDateKey) {
        const spillConflict = (reservations || []).find(r => {
          if (r.date !== prevDateKey) return false;
          if ((r as any).cleared) return false;
          if (!(r.status === 'waiting' || r.status === 'confirmed' || r.status === 'arrived')) return false;
          if (!Array.isArray(r.tableIds) || !r.tableIds.includes(tableId)) return false;
          const adj = adjustmentsForPrev?.[r.id] || {};
          const baseStart = timeStringToMinutes(r.time);
          const startMin = typeof adj.start === 'number' ? adj.start : baseStart;
          const endMin = typeof adj.end === 'number' ? adj.end : (startMin + estimateDurationMinutes(r.numberOfGuests));
          if (endMin <= 1440) return false;
          const spillStart = 0;
          const spillEnd = Math.min(1440, endMin - 1440);
          return overlaps(newStartMin, newEndMin, spillStart, spillEnd);
        });
        if (spillConflict) {
          const adj = adjustmentsForPrev?.[spillConflict.id] || {};
          const baseStart = timeStringToMinutes(spillConflict.time);
          const startMin = typeof adj.start === 'number' ? adj.start : baseStart;
          const endMin = typeof adj.end === 'number' ? adj.end : (startMin + estimateDurationMinutes(spillConflict.numberOfGuests));
          const spillEnd = Math.min(1440, endMin - 1440);
          const message = currentLanguage === 'srb'
            ? `Sto ${tableNumber} je zauzet (rezervacija iz prethodnog dana) od 00:00 do ${formatMinutesToTime(spillEnd)} - ${spillConflict.guestName}`
            : `Table ${tableNumber} is occupied (spillover reservation) from 00:00 to ${formatMinutesToTime(spillEnd)} - ${spillConflict.guestName}`;
          setError(message);
          return;
        }
      }

      // Check seated regular reservations
      const conflictingRegular = seatedRegularReservations.find(r => {
        if (r.date !== date) return false;
        if (!Array.isArray(r.tableIds) || !r.tableIds.includes(tableId)) return false;
        const adj = adjustmentsForDate?.[r.id] || {};
        const baseStart = timeStringToMinutes(r.time);
        const startMin = typeof adj.start === 'number' ? adj.start : baseStart;
        const endMin = typeof adj.end === 'number' ? adj.end : Math.min(1440, startMin + estimateDurationMinutes(r.numberOfGuests));
        return overlaps(newStartMin, newEndMin, startMin, endMin);
      });

      if (conflictingRegular) {
        const adj = adjustmentsForDate?.[conflictingRegular.id] || {};
        const baseStart = timeStringToMinutes(conflictingRegular.time);
        const startMin = typeof adj.start === 'number' ? adj.start : baseStart;
        const endMin = typeof adj.end === 'number' ? adj.end : Math.min(1440, startMin + estimateDurationMinutes(conflictingRegular.numberOfGuests));
        const message = currentLanguage === 'srb'
          ? `Sto ${tableNumber} je zauzet od ${formatMinutesToTime(startMin)} do ${formatMinutesToTime(endMin)} - ${conflictingRegular.guestName}`
          : `Table ${tableNumber} is occupied from ${formatMinutesToTime(startMin)} to ${formatMinutesToTime(endMin)} - ${conflictingRegular.guestName}`;
        setError(message);
        return;
      }

      // Check seated event reservations
      const conflictingEvent = seatedEventReservations.find(er => {
        if (er.date !== date) return false;
        if (!Array.isArray(er.tableIds) || !er.tableIds.includes(tableId)) return false;
        const adj = adjustmentsForDate?.[er.id] || {};
        const baseStart = timeStringToMinutes(er.time);
        const startMin = typeof adj.start === 'number' ? adj.start : baseStart;
        const endMin = typeof adj.end === 'number' ? adj.end : Math.min(1440, startMin + estimateDurationMinutes(er.numberOfGuests));
        return overlaps(newStartMin, newEndMin, startMin, endMin);
      });

      if (conflictingEvent) {
        const adj = adjustmentsForDate?.[conflictingEvent.id] || {};
        const baseStart = timeStringToMinutes(conflictingEvent.time);
        const startMin = typeof adj.start === 'number' ? adj.start : baseStart;
        const endMin = typeof adj.end === 'number' ? adj.end : Math.min(1440, startMin + estimateDurationMinutes(conflictingEvent.numberOfGuests));
        const message = currentLanguage === 'srb'
          ? `Sto ${tableNumber} je zauzet (event rezervacija) od ${formatMinutesToTime(startMin)} do ${formatMinutesToTime(endMin)} - ${conflictingEvent.guestName}`
          : `Table ${tableNumber} is occupied (event reservation) from ${formatMinutesToTime(startMin)} to ${formatMinutesToTime(endMin)} - ${conflictingEvent.guestName}`;
        setError(message);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const combinedNotes = buildCombinedNotes();

      if (isEdit && existingReservation) {
        await updateEventReservation(existingReservation.id, {
          guestName: guestName.trim(),
          phone: phone.trim() || '',
          time: timeStr,
          numberOfGuests,
          zoneId: zoneId || '',
          tableIds: normalizedTables,
          color: tableColor,
          isVip: isVipGuest,
          paymentStatus,
          depositRequired,
          ticketPrice: ticketTotal,
          notes: combinedNotes || '',
          reservationCode: reservationCode.trim() || existingReservation.reservationCode,
        });
        
        // Save or remove spillover adjustment
        const startMin = timeStringToMinutes(timeStr);
        if (extendToNextDay) {
          const spilloverEndMin = 1440 + (spilloverEndHour * 60) + spilloverEndMinute;
          try {
            await reservationAdjustmentsService.upsertAdjustment(date, existingReservation.id, {
              start: startMin,
              end: spilloverEndMin
            });
            // Also update localStorage for immediate effect
            const key = `respoint-duration-adjustments:${date}`;
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : {};
            parsed[existingReservation.id] = { start: startMin, end: spilloverEndMin };
            localStorage.setItem(key, JSON.stringify(parsed));
            window.dispatchEvent(new CustomEvent('respoint-duration-adjustments-changed', { detail: { date } }));
          } catch (adjErr) {
            console.error('Error saving spillover adjustment:', adjErr);
          }
        } else {
          // Remove spillover if unchecked
          try {
            const key = `respoint-duration-adjustments:${date}`;
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : {};
            if (parsed[existingReservation.id] && parsed[existingReservation.id].end > 1440) {
              // Reset to default duration (no spillover)
              const defaultEnd = startMin + estimateDurationMinutes(numberOfGuests);
              parsed[existingReservation.id] = { start: startMin, end: Math.min(1440, defaultEnd) };
              localStorage.setItem(key, JSON.stringify(parsed));
              await reservationAdjustmentsService.upsertAdjustment(date, existingReservation.id, {
                start: startMin,
                end: Math.min(1440, defaultEnd)
              });
              window.dispatchEvent(new CustomEvent('respoint-duration-adjustments-changed', { detail: { date } }));
            }
          } catch (adjErr) {
            console.error('Error removing spillover adjustment:', adjErr);
          }
        }
        
        onClose();
        return;
      }

      const newReservation = await addEventReservation({
        eventId: event.id,
        guestName: guestName.trim(),
        date: event.date,
        time: timeStr,
        numberOfGuests,
        zoneId: zoneId || undefined,
        tableIds: normalizedTables.length ? normalizedTables : undefined,
        color: tableColor,
        isVip: isVipGuest,
        notes: combinedNotes || undefined,
        phone: phone.trim() || undefined,
        paymentStatus,
        depositRequired,
        ticketPrice: ticketTotal,
        reservationCode: reservationCode.trim(),
      });
      
      // Save spillover adjustment for new reservation
      if (extendToNextDay && newReservation?.id) {
        const startMin = timeStringToMinutes(timeStr);
        const spilloverEndMin = 1440 + (spilloverEndHour * 60) + spilloverEndMinute;
        try {
          await reservationAdjustmentsService.upsertAdjustment(event.date, newReservation.id, {
            start: startMin,
            end: spilloverEndMin
          });
          // Also update localStorage for immediate effect
          const key = `respoint-duration-adjustments:${event.date}`;
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : {};
          parsed[newReservation.id] = { start: startMin, end: spilloverEndMin };
          localStorage.setItem(key, JSON.stringify(parsed));
          window.dispatchEvent(new CustomEvent('respoint-duration-adjustments-changed', { detail: { date: event.date } }));
        } catch (adjErr) {
          console.error('Error saving spillover adjustment:', adjErr);
        }
      }

      onClose();
    } catch (err: any) {
      console.error('❌ Failed to save event reservation:', err);
      setError(
        currentLanguage === 'srb'
          ? 'Nije moguće sačuvati rezervaciju. Pokušaj ponovo.'
          : 'Unable to save reservation. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const paymentStatusLabel = (status: EventPaymentStatus) => {
    if (currentLanguage === 'srb') {
      switch (status) {
        case 'unpaid': return 'Neplaćeno';
        case 'partial': return 'Delimično plaćeno';
        case 'paid': return 'Plaćeno';
        case 'not_required': default: return 'Nije potrebno';
      }
    }
    switch (status) {
      case 'unpaid': return 'Unpaid';
      case 'partial': return 'Partial';
      case 'paid': return 'Paid';
      case 'not_required': default: return 'No payment';
    }
  };

  const t = useCallback((key: string) => {
    const translations: Record<string, Record<string, string>> = {
      nameOfReservation: { srb: 'Ime rezervacije', eng: 'Name of reservation' },
      reservationTime: { srb: 'Vreme rezervacije', eng: 'Reservation time' },
      numberOfGuests: { srb: 'Broj gostiju', eng: 'Number of guests' },
      zone: { srb: 'Zona', eng: 'Zone' },
      tableNumber: { srb: 'Broj stola', eng: 'Table number' },
      tableColor: { srb: 'Boja stola', eng: 'Table color' },
      chooseTableColor: { srb: 'Izaberi boju stola', eng: 'Choose table color' },
      serviceType: { srb: 'Tip usluge', eng: 'Service type' },
      mobileNumber: { srb: 'Broj mobilnog', eng: 'Mobile number' },
      additionalRequirements: { srb: 'Dodatni zahtevi', eng: 'Additional requirements' },
      popularServiceTypes: { srb: 'Popularni tipovi usluga', eng: 'Popular service types' },
      cancel: { srb: 'Otkaži', eng: 'Cancel' },
      addReservation: { srb: 'Dodaj rezervaciju', eng: 'Add reservation' },
      updateReservation: { srb: 'Ažuriraj rezervaciju', eng: 'Update reservation' },
      cancelReservation: { srb: 'Otkaži rezervaciju', eng: 'Cancel Reservation' },
      deleteReservation: { srb: 'Obriši rezervaciju', eng: 'Delete Reservation' },
      cancelReservationMessage: { srb: 'Da li ste sigurni da želite da otkažete rezervaciju za "{name}"? Rezervacija će biti označena kao otkazana.', eng: 'Are you sure you want to cancel the reservation for "{name}"? The reservation will be marked as cancelled.' },
      deleteReservationMessage: { srb: 'Da li ste sigurni da želite da obrišete rezervaciju za "{name}"? Ova radnja se ne može poništiti.', eng: 'Are you sure you want to delete the reservation for "{name}"? This action cannot be undone.' },
      cleared: { srb: 'Oslobođeno', eng: 'Cleared' },
    };
    const lang = currentLanguage === 'srb' ? 'srb' : 'eng';
    return translations[key]?.[lang] || key;
  }, [currentLanguage]);

  if (!isOpen) return null;

  // Render finalized (cancelled / not_arrived / cleared) view
  if (isFinalized && existingReservation) {
    const isNotArrivedFinal = existingReservation.status === 'not_arrived';
    const isCancelledFinal = existingReservation.status === 'cancelled' && !existingReservation.cleared;
    const isArrivedFinal = existingReservation.status === 'arrived' || (existingReservation.status === 'cancelled' && existingReservation.cleared === true);
    const serviceLabels = serviceTypeSuggestions
      .filter((def) => selectedServiceKeys.includes(def.key))
      .map((def) => def.label)
      .join(', ');

    return (
      <div className={`absolute inset-0 ${seeThrough ? 'bg-transparent' : 'bg-[#0A1929]'} overflow-hidden z-[1200]`}>
        <div className="w-full h-full flex flex-col p-0">
          <div
            className="bg-[#000814] overflow-hidden flex flex-col min-h-0 h-full rounded-none shadow-none transition-opacity duration-800 ease-in-out"
            style={{ opacity: seeThrough ? 0.5 : 1 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 flex-shrink-0">
              <h2 className="text-lg font-light text-white tracking-wide">
                {currentLanguage === 'srb' ? 'Detalji rezervacije (Finalizovana rezervacija)' : 'Reservation Details (Finalized Reservation)'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={handlePeekDown}
                  onMouseUp={handlePeekUp}
                  onMouseLeave={handlePeekUp}
                  onTouchStart={handlePeekDown}
                  onTouchEnd={handlePeekUp}
                  onTouchCancel={handlePeekUp}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded focus:outline-none"
                  title="Hold to peek tables"
                  aria-label="Hold to peek tables"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={handleClose}
                  className="text-gray-500 hover:text-white transition-colors p-1"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 statistics-scrollbar stable-scrollbar" style={seeThrough ? { pointerEvents: 'none', filter: 'blur(2px)' } : undefined}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Left Column */}
                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('nameOfReservation')}</label>
                    <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                      {existingReservation.guestName}
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{currentLanguage === 'srb' ? 'Datum i vreme' : 'Date & Time'}</label>
                    <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                      {new Date(existingReservation.date).toLocaleDateString(currentLanguage === 'srb' ? 'sr-RS' : 'en-GB')} at {existingReservation.time || '--:--'}
                    </div>
                  </div>

                  {/* Number of Guests */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('numberOfGuests')}</label>
                    <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                      {existingReservation.numberOfGuests}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {currentLanguage === 'srb' ? 'Status' : 'Status'}
                    </label>
                    <div className={`px-3 py-2 border rounded text-sm flex items-center gap-2 ${
                      isArrivedFinal
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : isNotArrivedFinal
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                    }`}>
                      {isArrivedFinal ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      )}
                      {isArrivedFinal
                        ? (currentLanguage === 'srb' ? 'Stigli' : 'Arrived')
                        : isNotArrivedFinal
                          ? (currentLanguage === 'srb' ? 'Nisu stigli' : 'Not Arrived')
                          : (currentLanguage === 'srb' ? 'Otkazano' : 'Cancelled')}
                    </div>
                  </div>

                  {/* Tables */}
                  {existingReservation.tableIds && existingReservation.tableIds.length > 0 && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('tableNumber')}</label>
                      <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                        {existingReservation.tableIds.join(', ')}
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  {existingReservation.phone && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('mobileNumber')}</label>
                      <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                        {existingReservation.phone}
                      </div>
                    </div>
                  )}

                  {/* Service type */}
                  {serviceLabels && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('serviceType')}</label>
                      <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                        {serviceLabels}
                      </div>
                    </div>
                  )}

                  {/* Reservation Code */}
                  {existingReservation.reservationCode && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{currentLanguage === 'srb' ? 'Kod rezervacije' : 'Reservation Code'}</label>
                      <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white font-mono">
                        {existingReservation.reservationCode}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  {/* Finalized/Completed info box */}
                  {isArrivedFinal ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        <span className="text-green-400 font-medium">
                          {currentLanguage === 'srb' ? 'Završena rezervacija' : 'Completed Reservation'}
                        </span>
                      </div>
                      <p className="text-green-500/80 text-sm">
                        {currentLanguage === 'srb'
                          ? 'Gost je stigao i uspešno napustio restoran. Rezervacija je završena.'
                          : 'Guest arrived and successfully left the restaurant. Reservation is completed.'}
                      </p>
                    </div>
                  ) : isNotArrivedFinal ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                        <span className="text-red-400 font-medium">
                          {currentLanguage === 'srb' ? 'Gost nije stigao' : 'Guest Did Not Arrive'}
                        </span>
                      </div>
                      <p className="text-red-500/80 text-sm">
                        {currentLanguage === 'srb'
                          ? 'Gost nije stigao na rezervaciju u dogovoreno vreme.'
                          : 'Guest did not arrive for the reservation at the scheduled time.'}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-500/10 border border-gray-500/20 rounded p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                        <span className="text-gray-400 font-medium">
                          {currentLanguage === 'srb' ? 'Otkazana rezervacija' : 'Cancelled Reservation'}
                        </span>
                      </div>
                      <p className="text-gray-500/80 text-sm">
                        {currentLanguage === 'srb'
                          ? 'Ova rezervacija je otkazana i ne može se menjati.'
                          : 'This reservation has been cancelled and cannot be modified.'}
                      </p>
                    </div>
                  )}

                  {/* Additional notes */}
                  {notes && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('additionalRequirements')}</label>
                      <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white whitespace-pre-wrap">
                        {notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-800 flex-shrink-0">
              <div className="flex gap-3 justify-between">
                <div className="flex gap-3">
                  {/* Delete button - for finalized event reservations */}
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="px-3 py-1.5 text-red-400 text-sm rounded hover:bg-red-500/10 transition-colors"
                  >
                    {t('deleteReservation')}
                  </button>
                  {/* Print button */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3 py-1.5 text-blue-400 text-sm rounded hover:bg-blue-500/10 transition-colors flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                    </svg>
                    {currentLanguage === 'srb' ? 'Štampaj' : 'Print'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors"
                >
                  {currentLanguage === 'srb' ? 'Zatvori' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Print Preview Modal */}
        {previewReservationData && (
          <PrintPreviewModal
            isOpen={showPrintPreview}
            onClose={() => {
              setShowPrintPreview(false);
              setPreviewReservationData(null);
            }}
            reservationData={previewReservationData}
          />
        )}

        {/* Delete Confirmation Modal - for finalized reservations */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title={t('deleteReservation')}
          message={t('deleteReservationMessage').replace('{name}', existingReservation?.guestName || '')}
          confirmText={t('deleteReservation')}
          type="delete"
        />
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 ${seeThrough ? 'bg-transparent' : 'bg-[#0A1929]'} overflow-hidden z-[1200]`}>
      <div className="w-full h-full flex flex-col p-0">
        <div
          className="bg-[#000814] overflow-hidden flex flex-col min-h-0 h-full rounded-none shadow-none transition-opacity duration-800 ease-in-out"
          style={{ opacity: seeThrough ? 0.5 : 1 }}
        >
          {/* Header - identical to regular reservation form */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 flex-shrink-0">
            <h2 className="text-lg font-light text-white tracking-wide">{title}</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onMouseDown={handlePeekDown}
                onMouseUp={handlePeekUp}
                onMouseLeave={handlePeekUp}
                onTouchStart={handlePeekDown}
                onTouchEnd={handlePeekUp}
                onTouchCancel={handlePeekUp}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded focus:outline-none"
                title="Hold to peek tables"
                aria-label="Hold to peek tables"
              >
                <Eye size={18} />
              </button>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-white transition-colors p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 min-h-0 overflow-hidden transition-all duration-800 ease-in-out"
            style={seeThrough ? { pointerEvents: 'none', filter: 'blur(2px)' } : undefined}
          >
            <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 statistics-scrollbar stable-scrollbar transition-all duration-800 ease-in-out">
              {error && (
                <div className="mb-4 rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ==================== LEFT COLUMN ==================== */}
                <div className="space-y-3 min-w-0">
                  {/* Name of reservation with guestbook suggestions */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('nameOfReservation')}</label>
                    <div className="relative">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={guestName}
                        onChange={(e) => {
                          if (isArrived) return; // Disable editing for seated reservations
                          const wasLinked = !!selectedGuestbookId;
                          setGuestName(e.target.value);
                          setIsVipGuest(false);
                          if (wasLinked) {
                            setSelectedGuestbookId(null);
                            setPhone(''); // Clear phone when changing name after guestbook selection
                            try { localStorage.removeItem('respoint_selected_guestbook_id'); } catch {}
                          }
                          setShowGuestSuggestions(true);
                        }}
                        onFocus={() => !isArrived && setShowGuestSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowGuestSuggestions(false), 150)}
                        onKeyDown={(e) => {
                          if (isArrived) return;
                          if (!showGuestSuggestions || guestSuggestions.length === 0) return;
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setGuestSuggestionIndex(i => Math.min(i + 1, guestSuggestions.length - 1));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setGuestSuggestionIndex(i => Math.max(i - 1, 0));
                          } else if (e.key === 'Enter' && guestSuggestionIndex >= 0) {
                            e.preventDefault();
                            handleSelectGuest(guestSuggestions[guestSuggestionIndex]);
                          } else if (e.key === 'Escape') {
                            setShowGuestSuggestions(false);
                          }
                        }}
                        disabled={isArrived}
                        placeholder={placeholders.guestName}
                        className={`w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:outline-none focus:border-gray-600 transition-colors placeholder-gray-500 ${isArrived ? 'opacity-60 cursor-not-allowed' : ''}`}
                      />
                      {/* Guest suggestions dropdown */}
                      {showGuestSuggestions && guestSuggestions.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full bg-[#0A1929] border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {guestSuggestions.map((g, idx) => (
                            <button
                              key={g.id}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); handleSelectGuest(g); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                                idx === guestSuggestionIndex
                                  ? 'bg-gray-700 text-white'
                                  : 'text-gray-300 hover:bg-gray-800'
                              }`}
                            >
                              {/* Profile picture or fallback initial */}
                              {g.avatarUrl ? (
                                <img
                                  src={g.avatarUrl}
                                  alt={g.name || ''}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                                  style={{ backgroundColor: '#374151', color: '#fff' }}
                                >
                                  {(g.name || '?')[0]?.toUpperCase()}
                                </div>
                              )}
                              <span className="truncate">{g.name}</span>
                              {g.isVip && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500 flex-shrink-0">
                                  <path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/>
                                </svg>
                              )}
                              {g.phone && <span className="ml-auto text-xs text-gray-400">{g.phone}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Loyalty guest badge */}
                    {showLoyaltyBadge && (
                      <p className="text-yellow-500 text-xs mt-1">
                        {currentLanguage === 'srb' ? 'Loyalty gost' : 'Loyalty guest'}
                      </p>
                    )}
                  </div>

                  {/* Time of reservation - matching regular form style with 4 columns */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('reservationTime')}</label>
                    <div className="grid grid-cols-4 gap-2">
                      {/* Month - disabled, from event date */}
                      <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between opacity-60">
                        <button
                          type="button"
                          disabled
                          className="p-1 text-gray-600 cursor-not-allowed"
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15 18l-6-6 6-6v12z"/>
                          </svg>
                        </button>
                        <span className="text-white font-medium text-xs min-w-[40px] text-center">
                          {months[month]}
                        </span>
                        <button
                          type="button"
                          disabled
                          className="p-1 text-gray-600 cursor-not-allowed"
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 18l6-6-6-6v12z"/>
                          </svg>
                        </button>
                      </div>

                      {/* Day - disabled, from event date */}
                      <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between opacity-60">
                        <button
                          type="button"
                          disabled
                          className="p-1 text-gray-600 cursor-not-allowed"
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15 18l-6-6 6-6v12z"/>
                          </svg>
                        </button>
                        <span className="text-white font-medium text-xs min-w-[30px] text-center">
                          {day}{currentLanguage === 'srb' ? '.' : 'th'}
                        </span>
                        <button
                          type="button"
                          disabled
                          className="p-1 text-gray-600 cursor-not-allowed"
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 18l6-6-6-6v12z"/>
                          </svg>
                        </button>
                      </div>

                      {/* Hour */}
                      <div className={`bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between ${isArrived ? 'opacity-60' : ''}`}>
                        <button
                          type="button"
                          onClick={() => adjustValue('hour', -1)}
                          disabled={!canDecrease('hour') || isArrived}
                          className={`p-1 transition ${(!canDecrease('hour') || isArrived) ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15 18l-6-6 6-6v12z"/>
                          </svg>
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={hour.toString().padStart(2, '0')}
                          onChange={handleHourInputChange}
                          disabled={isArrived}
                          className={`text-white font-medium text-xs min-w-[30px] w-full text-center bg-transparent border-none outline-none hide-number-arrows ${isArrived ? 'cursor-not-allowed' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => adjustValue('hour', 1)}
                          disabled={isArrived}
                          className={`p-1 transition ${isArrived ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 18l6-6-6-6v12z"/>
                          </svg>
                        </button>
                      </div>

                      {/* Minute */}
                      <div className={`bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between ${isArrived ? 'opacity-60' : ''}`}>
                        <button
                          type="button"
                          onClick={() => adjustValue('minute', -1)}
                          disabled={isArrived}
                          className={`p-1 transition ${isArrived ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15 18l-6-6 6-6v12z"/>
                          </svg>
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={minute.toString().padStart(2, '0')}
                          onChange={handleMinuteInputChange}
                          disabled={isArrived}
                          className={`text-white font-medium text-xs min-w-[30px] w-full text-center bg-transparent border-none outline-none hide-number-arrows ${isArrived ? 'cursor-not-allowed' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => adjustValue('minute', 1)}
                          disabled={isArrived}
                          className={`p-1 transition ${isArrived ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 18l6-6-6-6v12z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Extend into next day - only available if event is multi-day (has endDate) */}
                  {event.endDate && (
                    <div className={`p-3 rounded-lg border ${extendToNextDay ? 'bg-blue-500/10 border-blue-500/30' : isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-900/50 border-gray-800'}`}>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={extendToNextDay}
                            onChange={(e) => {
                              setExtendToNextDay(e.target.checked);
                              if (!e.target.checked) {
                                setSpilloverEndHour(1);
                                setSpilloverEndMinute(0);
                              }
                            }}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            extendToNextDay
                              ? 'bg-blue-500 border-blue-500'
                              : isLight ? 'border-gray-400 bg-white' : 'border-gray-600 bg-gray-900'
                          }`}>
                            {extendToNextDay && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${extendToNextDay ? 'text-blue-300' : isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                            {currentLanguage === 'srb' 
                              ? 'Produži rezervaciju u sutrašnji dan' 
                              : 'Extend reservation into next day'}
                          </p>
                          <p className={`mt-0.5 text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                            {currentLanguage === 'srb'
                              ? 'Rezervacija će trajati preko ponoći'
                              : 'Reservation will extend past midnight'}
                          </p>
                          
                          {extendToNextDay && (
                            <div className="mt-3 flex items-center gap-2">
                              <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                {currentLanguage === 'srb' ? 'Završava u' : 'Ends at'}:
                              </span>
                              <div className="flex items-center gap-1">
                                <select
                                  value={spilloverEndHour}
                                  onChange={(e) => setSpilloverEndHour(Number(e.target.value))}
                                  className={`px-2 py-1 text-sm rounded border ${
                                    isLight 
                                      ? 'bg-white border-gray-300 text-gray-700' 
                                      : 'bg-gray-900 border-gray-600 text-white'
                                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                >
                                  {[0, 1, 2, 3, 4, 5, 6].map(h => (
                                    <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                                  ))}
                                </select>
                                <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>:</span>
                                <select
                                  value={spilloverEndMinute}
                                  onChange={(e) => setSpilloverEndMinute(Number(e.target.value))}
                                  className={`px-2 py-1 text-sm rounded border ${
                                    isLight 
                                      ? 'bg-white border-gray-300 text-gray-700' 
                                      : 'bg-gray-900 border-gray-600 text-white'
                                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                >
                                  {[0, 15, 30, 45].map(m => (
                                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                  ))}
                                </select>
                              </div>
                              <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                                ({currentLanguage === 'srb' ? 'sutrašnji dan' : 'next day'})
                              </span>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Number of Guests */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('numberOfGuests')}</label>
                    <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between w-[calc(25%-0.375rem)]">
                      <button
                        type="button"
                        onClick={() => adjustValue('numberOfGuests', -1)}
                        disabled={numberOfGuests <= 1}
                        className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
                      >
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M15 18l-6-6 6-6v12z"/>
                        </svg>
                      </button>
                      <span className="text-white font-medium text-xs min-w-[30px] text-center">
                        {numberOfGuests}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustValue('numberOfGuests', 1)}
                        disabled={numberOfGuests >= 200}
                        className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
                      >
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 18l6-6-6-6v12z"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Zone - behaves like regular reservation form (auto-highlight from tables) */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('zone')}</label>
                    <div className="flex items-center gap-0 overflow-x-auto table-number-scrollbar flex-nowrap whitespace-nowrap max-w-full">
                      {zones.map((zone) => (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => setZoneId(zone.id)}
                          className={`px-6 py-3 font-medium text-sm transition-colors flex-none whitespace-nowrap ${
                            zoneId === zone.id || autoSelectedZoneIds.has(zone.id)
                              ? 'text-[#FFB800] border-b-2 border-[#FFB800]'
                              : 'text-gray-500 border-b-2 border-transparent hover:text-gray-300'
                          }`}
                        >
                          {zone.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table number */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('tableNumber')}</label>
                    <div className="space-y-2">
                      {/* Table tags */}
                      {tableNumbers.length > 0 && (
                        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto table-number-scrollbar pb-2 flex-nowrap whitespace-nowrap max-w-full">
                          {tableNumbers.map((tableNumber, index) => (
                            <div
                              key={index}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-800 rounded-md text-white text-sm flex-shrink-0"
                            >
                              <span>{tableNumber}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTableNumber(tableNumber)}
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18,6 6,18"/>
                                  <path d="M6,6 18,18"/>
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Table input with color selector */}
                      <div className="flex items-center gap-0 bg-[#0A1929] border border-gray-800 rounded overflow-visible">
                        <input
                          type="text"
                          value={currentTableInput}
                          onChange={(e) => setCurrentTableInput(e.target.value)}
                          onKeyPress={handleTableInputKeyPress}
                          onBlur={handleAddTableNumber}
                          placeholder={tableNumbers.length > 0 ? placeholders.addMore : placeholders.tableNumber}
                          className="flex-1 px-3 py-2 bg-transparent text-white text-sm focus:outline-none placeholder-gray-500"
                        />
                        
                        {/* Table color selector */}
                        <div className="relative" ref={colorPickerRef}>
                          <button
                            ref={colorButtonRef}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowColorPicker(!showColorPicker);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-[#000814] hover:bg-gray-900 transition-colors cursor-pointer h-full border-l border-gray-800"
                          >
                            <span className="text-gray-400 text-xs whitespace-nowrap select-none">{t('tableColor')}</span>
                            <div 
                              className="w-6 h-6 rounded-md shadow-inner border-2 border-gray-700 hover:border-gray-600 transition-all cursor-pointer"
                              style={{ backgroundColor: tableColor }}
                            />
                          </button>
                        
                          {/* Color picker dropdown with dynamic positioning */}
                          <div className={`absolute bottom-full mb-2 right-0 lg:right-auto lg:left-0 transition-all duration-200 ease-out transform origin-bottom-right lg:origin-bottom-left z-[9999] ${
                            showColorPicker 
                              ? 'opacity-100 scale-100 visible' 
                              : 'opacity-0 scale-95 invisible'
                          }`}>
                            <div className="color-picker-container">
                              <div className="w-full">
                                <span className="text-gray-400 text-sm font-medium">{t('chooseTableColor')}</span>
                              </div>
                              <div className="w-full">
                                <HexColorPicker 
                                  color={tableColor} 
                                  onChange={(color) => setTableColor(color)}
                                  style={{ width: '100%' }}
                                />
                              </div>
                              <div className="hex-input-container">
                                <div 
                                  className="hex-color-preview"
                                  style={{ backgroundColor: tableColor }}
                                />
                                <input
                                  type="text"
                                  value={tableColor}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                      setTableColor(value);
                                    }
                                  }}
                                  className="hex-input"
                                  placeholder="#000000"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Type of service */}
                  <div ref={serviceDropdownRef}>
                    <label className="block text-xs text-gray-500 mb-1">{t('serviceType')}</label>
                    {selectedServiceKeys.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedServiceKeys.map((key, index) => {
                          const meta = findSuggestionMeta(key);
                          const fallbackBg = isLight ? '#E5E7EB' : '#1F2937';
                          const fallbackColor = isLight ? '#111827' : '#F3F4F6';
                          return (
                            <span
                              key={`${key}-${index}`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] ${
                                isLight ? 'border-gray-200 bg-gray-50 text-gray-900' : 'border-gray-700/60 bg-[#0A1929] text-white'
                              }`}
                            >
                              <span
                                className="flex items-center justify-center w-4 h-4 rounded-full text-[11px] shrink-0"
                                style={{
                                  backgroundColor: meta?.iconBg ?? fallbackBg,
                                  color: meta?.iconColor ?? fallbackColor,
                                  boxShadow: meta?.ringColor ? `0 0 0 2px ${meta.ringColor}` : undefined,
                                }}
                              >
                                {meta?.icon ?? '✦'}
                              </span>
                              <span className="font-medium">{meta?.label ?? key}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveServiceTag(index)}
                                className="text-gray-400 hover:text-white transition"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                                  <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                                  <line x1="6" y1="18" x2="18" y2="6" strokeLinecap="round" />
                                </svg>
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={selectedServiceValue}
                          onClick={() => setServiceDropdownOpen((prev) => !prev)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setServiceDropdownOpen((prev) => !prev);
                            } else if (e.key === 'Escape') {
                              setServiceDropdownOpen(false);
                            }
                          }}
                          aria-haspopup="listbox"
                          aria-expanded={serviceDropdownOpen}
                          className={`w-full pr-9 px-3 py-2 bg-[#0A1929] border rounded text-sm text-white transition-colors cursor-pointer placeholder-gray-500 focus:outline-none ${
                            serviceDropdownOpen ? 'border-gray-600' : 'border-gray-800 focus:border-gray-600'
                          }`}
                          placeholder={currentLanguage === 'srb' ? 'Ručak, večera, kafa…' : 'Lunch, dinner, coffee…'}
                        />
                        <button
                          type="button"
                          onClick={() => setServiceDropdownOpen((prev) => !prev)}
                          tabIndex={0}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors z-20 focus:outline-none ${
                            serviceDropdownOpen ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-white'
                          }`}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`transition-transform ${serviceDropdownOpen ? 'rotate-180' : ''}`}
                          >
                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                      {serviceDropdownOpen && (
                        <div className={`relative z-10 w-full rounded-lg border ${isLight ? 'border-gray-300 bg-[#0A1929]' : 'border-gray-800 bg-[#0A1929]'}`}>
                          <div className={`px-3 py-2 border-b ${isLight ? 'border-gray-200 text-gray-500' : 'border-gray-800 text-gray-400'}`}>
                            <p className="text-[11px] uppercase tracking-wide">{t('popularServiceTypes')}</p>
                          </div>
                          <div className="max-h-72 overflow-y-auto pl-1 pr-3 py-2 space-y-2 statistics-scrollbar stable-scrollbar">
                            {serviceTypeSuggestions.map((suggestion) => {
                              const isSelected = selectedServiceKeys.includes(suggestion.key);
                              return (
                                <button
                                  key={suggestion.key}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  onClick={() => toggleServiceKey(suggestion.key)}
                                  className={`${suggestionButtonBase} ${isSelected ? suggestionButtonSelected : ''} w-full text-left pl-2.5 pr-2 py-1 transition-colors cursor-pointer`}
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <span
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-base font-medium shrink-0"
                                      style={{
                                        backgroundColor: suggestion.iconBg,
                                        color: suggestion.iconColor,
                                        boxShadow: `0 0 0 2px ${suggestion.ringColor}`,
                                      }}
                                    >
                                      {suggestion.icon}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{suggestion.label}</p>
                                      <p className={`text-[10px] ${suggestionDescriptionClass} truncate`}>
                                        {suggestion.description}
                                      </p>
                                    </div>
                                    <span
                                      className={`ml-auto flex items-center justify-center w-5 h-5 rounded-full border text-[10px] transition ${
                                        isSelected
                                          ? 'border-blue-400 text-blue-400 bg-blue-500/10'
                                          : isLight
                                            ? 'border-gray-300 text-transparent bg-transparent'
                                            : 'border-gray-700 text-transparent bg-transparent'
                                      }`}
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile number */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('mobileNumber')}</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500"
                      placeholder={placeholders.mobileNumber}
                    />
                  </div>
                </div>

                {/* ==================== RIGHT COLUMN ==================== */}
                <div className="space-y-3 min-w-0">
                  {/* Additional requirements - REDUCED HEIGHT with max-height and scroll */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('additionalRequirements')}</label>
                    <textarea
                      rows={6}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors resize-none placeholder-gray-500"
                      style={{ maxHeight: '160px', overflowY: 'auto' }}
                      placeholder={placeholders.additionalRequirements}
                    />
                  </div>

                  {/* ========== EVENT-SPECIFIC FIELDS ========== */}

                  {/* Payment Status - Custom Dropdown */}
                  <div ref={paymentDropdownRef}>
                    <label className="block text-xs text-gray-500 mb-1">
                      {currentLanguage === 'srb' ? 'Status plaćanja' : 'Payment status'}
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setPaymentDropdownOpen((prev) => !prev)}
                        className={`w-full px-3 py-2 bg-[#0A1929] border rounded text-sm text-white transition-colors text-left flex items-center justify-between ${
                          paymentDropdownOpen ? 'border-gray-600' : 'border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              paymentStatus === 'paid'
                                ? 'bg-green-500'
                                : paymentStatus === 'partial'
                                ? 'bg-yellow-500'
                                : paymentStatus === 'not_required'
                                ? 'bg-gray-400'
                                : 'bg-red-500'
                            }`}
                          />
                          {paymentStatusLabel(paymentStatus)}
                        </span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`text-gray-400 transition-transform ${paymentDropdownOpen ? 'rotate-180' : ''}`}
                        >
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {paymentDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-800 bg-[#0A1929] shadow-lg overflow-hidden">
                          {(['unpaid', 'partial', 'paid', 'not_required'] as EventPaymentStatus[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => {
                                setPaymentStatus(status);
                                setPaymentDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors ${
                                paymentStatus === status
                                  ? 'bg-gray-800 text-white'
                                  : 'text-gray-300 hover:bg-gray-800/50'
                              }`}
                            >
                              <span
                                className={`inline-block w-2 h-2 rounded-full ${
                                  status === 'paid'
                                    ? 'bg-green-500'
                                    : status === 'partial'
                                    ? 'bg-yellow-500'
                                    : status === 'not_required'
                                    ? 'bg-gray-400'
                                    : 'bg-red-500'
                                }`}
                              />
                              {paymentStatusLabel(status)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deposit (total) */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {currentLanguage === 'srb' ? 'Depozit (ukupno)' : 'Deposit (total)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={depositRequired ?? ''}
                      onChange={(e) => setDepositRequired(e.target.value === '' ? undefined : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Tickets (total) */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {currentLanguage === 'srb' ? 'Karte (ukupno)' : 'Tickets (total)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={ticketTotal ?? ''}
                      onChange={(e) => setTicketTotal(e.target.value === '' ? undefined : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Unique Reservation Code with shuffle (read-only text) */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {currentLanguage === 'srb' ? 'Unikatni kod rezervacije' : 'Unique reservation key'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={reservationCode}
                        readOnly
                        className="flex-1 px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-gray-300 focus:outline-none cursor-default font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleShuffleCode}
                        disabled={isArrived}
                        className={
                          'px-2.5 py-1.5 text-[11px] rounded border transition-colors ' +
                          (isArrived
                            ? 'border-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                            : isLight
                              ? 'border-gray-300 text-gray-700 hover:bg-gray-100'
                              : 'border-gray-700 text-gray-200 hover:bg-gray-800')
                        }
                      >
                        {currentLanguage === 'srb' ? 'Nasumično' : 'Shuffle'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons - matching regular form */}
            <div className="px-6 py-3 border-t border-gray-800 flex-shrink-0">
              <div className="flex gap-3 justify-between">
                <div className="flex gap-3">
                  {isEdit && existingReservation?.status !== 'cancelled' && (
                    isArrived ? (
                      <button
                        type="button"
                        onClick={handleClearNow}
                        className="px-3 py-1.5 text-red-400 text-sm rounded hover:bg-red-500/10 transition-colors"
                      >
                        {t('cleared')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-3 py-1.5 text-red-400 text-sm rounded hover:bg-red-500/10 transition-colors"
                      >
                        {t('cancelReservation')}
                      </button>
                    )
                  )}
                  {/* Print button - same style as regular reservation form */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3 py-1.5 text-blue-400 text-sm rounded hover:bg-blue-500/10 transition-colors flex items-center gap-2"
                    title={currentLanguage === 'srb' ? 'Štampaj' : 'Print'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                    </svg>
                    <span>{currentLanguage === 'srb' ? 'Štampaj' : 'Print'}</span>
                  </button>
                  {/* Guestbook action button */}
                  <button
                    type="button"
                    onClick={handleGuestbookAction}
                    disabled={isGuestbookBusy || (!existingGuest && !guestName.trim())}
                    className="px-3 py-1.5 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={existingGuest 
                      ? (currentLanguage === 'srb' ? 'Pogledaj profil gosta' : 'View Guest Profile')
                      : (currentLanguage === 'srb' ? 'Dodaj u knjigu gostiju' : 'Add to Guestbook')
                    }
                  >
                    <BookOpen size={14} strokeWidth={2} />
                    <span>
                      {existingGuest 
                        ? (currentLanguage === 'srb' ? 'Profil gosta' : 'View Guest Profile')
                        : (currentLanguage === 'srb' ? 'Dodaj u knjigu gostiju' : 'Add to Guestbook')
                      }
                    </span>
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 text-[#FFB800] text-sm rounded hover:bg-[#FFB800]/10 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting
                      ? (currentLanguage === 'srb' ? 'Čuvanje...' : 'Saving...')
                      : isEdit
                        ? t('updateReservation')
                        : t('addReservation')}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Print Preview Modal */}
          {previewReservationData && (
            <PrintPreviewModal
              isOpen={showPrintPreview}
              onClose={() => {
                setShowPrintPreview(false);
                setPreviewReservationData(null);
              }}
              reservationData={previewReservationData}
            />
          )}

          {/* Cancel Confirmation Modal */}
          <DeleteConfirmationModal
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            onConfirm={confirmCancel}
            title={t('cancelReservation')}
            message={t('cancelReservationMessage').replace('{name}', existingReservation?.guestName || '')}
            confirmText={t('cancelReservation')}
            type="danger"
          />
        </div>
      </div>
    </div>
  );
};

export default EventReservationForm;
