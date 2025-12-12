import React, { useState, useContext, useEffect, useRef, useCallback, useMemo } from "react";
import { ReservationContext } from "../../context/ReservationContext";
import { ZoneContext } from "../../context/ZoneContext";
import { LayoutContext } from "../../context/LayoutContext";
import { UserContext } from "../../context/UserContext";
import { reservationsService } from "../../services/reservationsService";
import { reservationAdjustmentsService } from "../../services/reservationAdjustmentsService";
import { HexColorPicker } from "react-colorful";
import DirectPrintService from "../../services/directPrintService";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import PrintPreviewModal from "./PrintPreviewModal";
import { formatTableNames } from "../../utils/tableHelper";
import { useLanguage } from "../../context/LanguageContext";
import "./ColorPicker.css";
import { guestbookService } from "../../services/guestbookService";
import type { GuestbookEntry } from "../../types/guestbook";
import type { Reservation } from "../../types/reservation";
import { ThemeContext } from "../../context/ThemeContext";
import { EventContext } from "../../context/EventContext";
import { SERVICE_TYPE_DEFINITIONS, matchServiceTypeDefinition, parseServiceTypeTokens } from "../../constants/serviceTypes";
import { BookOpen, Eye, EyeOff } from "lucide-react";

interface ServiceSelection {
  key?: string;
  label: string;
}

const areServiceSelectionsEqual = (a: ServiceSelection[], b: ServiceSelection[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].key !== b[i].key || a[i].label !== b[i].label) {
      return false;
    }
  }
  return true;
};

interface ReservationFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  editReservation?: any;
}

const ReservationForm: React.FC<ReservationFormProps> = ({ 
  isOpen, 
  onClose, 
  selectedDate,
  editReservation 
}) => {
  const MODAL_VOFFSET = 140; // approx header+bottom paddings in this layout
  const FULL_VH = 70;        // keep 70vh when viewport is tall (full-res)
  const [compactView, setCompactView] = useState(false);
  const rootWrapRef = useRef<HTMLDivElement>(null);
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
  // When entering peek mode, drop focus from any active input to avoid caret/outline
  useEffect(() => {
    if (seeThrough) {
      try {
        const el = document.activeElement as HTMLElement | null;
        if (el && typeof el.blur === 'function') el.blur();
      } catch {}
    }
  }, [seeThrough]);

  // Switch between “full-res” (keep 70vh) and “compact” (fill available height)
  useEffect(() => {
    const update = () => {
      // Treat viewports shorter than 900px as compact (e.g. 1366x768, 1280x800, windowed)
      setCompactView(window.innerHeight < 900);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const modalHeightStyle = useMemo<React.CSSProperties>(() => {
    // Full-canvas height (fill the tables canvas area)
    return { height: '100%' };
  }, []);
  const { t, currentLanguage } = useLanguage();
  const { addReservation, updateReservation, deleteReservation, reservations, fetchReservations } = useContext(ReservationContext);
  const { zones, currentZone } = useContext(ZoneContext);
  const { layout, zoneLayouts, savedLayouts } = useContext(LayoutContext);
  const { user } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
  const { events, eventReservations, addEventReservation, updateEventReservation } = useContext(EventContext);
  const isLight = theme === 'light';
  const activeStatuses = useMemo(() => new Set(['waiting', 'confirmed', 'arrived']), []);
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
  // Collect all tables across ALL zones, using both working layouts (zoneLayouts)
  // and saved layouts as a fallback. This ensures we can always match table numbers
  // even if a zone hasn't been loaded in the current session.
  const allTablesAcrossZones = useMemo(() => {
    const tables: any[] = [];
    const seenIds = new Set<string>();
    try {
      // 1) Working/default layouts from zoneLayouts
      Object.values(zoneLayouts || {}).forEach((l: any) => {
        const arr = Array.isArray(l?.tables) ? l.tables : [];
        arr.forEach((t: any) => {
          if (t && typeof t.id === 'string' && !seenIds.has(t.id)) {
            seenIds.add(t.id);
            tables.push(t);
          }
        });
      });
      // 2) Fallback to all saved layouts (for zones without default/loaded layouts)
      Object.values((savedLayouts as any) || {}).forEach((list: any) => {
        (list || []).forEach((sl: any) => {
          const layout = sl?.layout;
          const arr = Array.isArray(layout?.tables) ? layout.tables : [];
          arr.forEach((t: any) => {
            if (t && typeof t.id === 'string' && !seenIds.has(t.id)) {
              seenIds.add(t.id);
              tables.push(t);
            }
          });
        });
      });
    } catch {
      // In case of any unexpected shape, just return what we have so far
    }
    return tables;
  }, [zoneLayouts, savedLayouts]);

  const suggestionButtonBase = isLight
    ? "flex items-center gap-2 rounded-lg bg-transparent text-gray-900 hover:bg-gray-50"
    : "flex items-center gap-2 rounded-lg bg-transparent text-white hover:bg-[#0B1D33]";
  const suggestionButtonSelected = isLight
    ? "bg-blue-50 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]"
    : "bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.4)]";
  const suggestionDescriptionClass = isLight ? "text-gray-500" : "text-gray-400";
  const placeholders = useMemo(() => {
    if (currentLanguage === 'srb') {
      return {
        guestName: 'Ime gosta (obavezno)',
        tableNumber: 'Broj stola (neobavezno)',
        serviceType: 'Ručak, večera, kafa…',
        mobileNumber: 'Kontakt telefon...',
        additionalRequirements: 'Alergeni, posebni zahtevi, povod događaja...',
        addMore: 'Dodaj još...'
      };
    }
    return {
      guestName: 'Guest name (required)',
      tableNumber: 'Table number (optional)',
      serviceType: 'Lunch, dinner, coffee…',
      mobileNumber: 'Contact phone number...',
      additionalRequirements: 'Allergens, special requests, occasion of event...',
      addMore: 'Add more...'
    };
  }, [currentLanguage]);
  // Localize service type string to current language by mapping known tokens via definitions
  const localizeServiceType = React.useCallback((raw?: string) => {
    const tokens = parseServiceTypeTokens(raw);
    if (!tokens.length) return '';
    const langKey = currentLanguage === 'srb' ? 'srb' : 'eng';
    return tokens
      .map((token) => {
        const def = matchServiceTypeDefinition(token);
        return def ? def.label[langKey as 'eng' | 'srb'] : token;
      })
      .join(', ');
  }, [currentLanguage]);
  const estimateDurationMinutes = (numGuests?: number) => {
    const guests = typeof numGuests === 'number' ? numGuests : 2;
    if (guests <= 2) return 60;
    if (guests <= 4) return 120;
    return 150;
  };

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

  const getReservationRange = (reservation: Reservation, adjustments: Record<string, { start?: number; end?: number }>) => {
    const baseStart = timeStringToMinutes(reservation.time);
    const adj = adjustments?.[reservation.id] || {};
    const startMin = typeof adj.start === 'number' ? adj.start : baseStart;
    const estimatedDuration = estimateDurationMinutes(reservation.numberOfGuests);
    const endMin = typeof adj.end === 'number' ? adj.end : Math.min(1440, startMin + estimatedDuration);
    return { startMin, endMin };
  };
  
  // Refs for DOM ready checks
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const tableInputRef = useRef<HTMLInputElement>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const suppressNameFocusOpenRef = useRef(false);
  const mountedRef = useRef(false);
  const domReadyRef = useRef(false);
  const lastEditIdRef = useRef<string | null>(null);
  // Scroll container for the form content (nearest scrollable ancestor)
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // State for DOM readiness
  const [isDomReady, setIsDomReady] = useState(false);
  const [isFormReady, setIsFormReady] = useState(false);

  // Form state - initialize with simple defaults first
  const [formData, setFormData] = useState({
    guestName: "",
    month: new Date().getMonth(),
    day: new Date().getDate(), 
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
    numberOfGuests: 2,
    zone: '',
    tableNumbers: [] as string[],
    tableColor: "#8B5CF6",
    serviceType: "",
    mobileNumber: "",
    additionalRequirements: "",
    status: 'waiting' as const,
    // Track VIP flag when selecting from guestbook
    isVipGuest: false
  });

  // Other state
  const [isEditingTime, setIsEditingTime] = useState({ hour: false, minute: false });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<'bottom' | 'top'>('bottom');
  const [currentTableInput, setCurrentTableInput] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [previewReservationData, setPreviewReservationData] = useState<any>(null);
  
  // Alert modals state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success'
  });
  // After successful add-to-guestbook, open the created guest profile after alert is dismissed
  const [guestbookOpenAfterAlertId, setGuestbookOpenAfterAlertId] = useState<string | null>(null);
  
  // Form validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Event transfer state - for transferring regular reservation to event
  const [transferToEvent, setTransferToEvent] = useState(false);

  // Spillover state - for extending seated reservations into the next day
  const [extendToNextDay, setExtendToNextDay] = useState(false);
  const [spilloverEndHour, setSpilloverEndHour] = useState(1); // Default 01:00 next day
  const [spilloverEndMinute, setSpilloverEndMinute] = useState(0);

  // Guestbook suggestions
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntry[]>([]);
  const [selectedGuestbookId, setSelectedGuestbookId] = useState<string | null>(null);
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);
  const [guestSuggestionIndex, setGuestSuggestionIndex] = useState(-1);
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<ServiceSelection[]>([]);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const selectedServiceValue = useMemo(
    () => selectedServiceTypes.map((item) => item.label).join(', '),
    [selectedServiceTypes]
  );
  const findSuggestionMeta = useCallback(
    (key?: string) => serviceTypeSuggestions.find((suggestion) => suggestion.key === key),
    [serviceTypeSuggestions]
  );
  const syncServiceTypeField = useCallback(
    (nextSelections: ServiceSelection[]) => {
      setFormData(prev => {
        const normalized = nextSelections.map((item) => item.label).join(', ');
        if (prev.serviceType === normalized) return prev;
        return { ...prev, serviceType: normalized };
      });
    },
    [setFormData]
  );

  // Ensure the Service Type dropdown is fully visible when opened by scrolling the form container
  useEffect(() => {
    if (!serviceDropdownOpen) return;
    // Wait a frame to ensure dropdown content is laid out
    const id = requestAnimationFrame(() => {
      try {
        const target = serviceDropdownRef.current;
        if (!target) return;
        // Scroll the nearest scrollable ancestor (our scroll container) to reveal the dropdown
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, [serviceDropdownOpen]);

  const isArrived = !!editReservation && editReservation.status === 'arrived' && !editReservation.cleared;
  const isFinalized = editReservation && (editReservation.status === 'not_arrived' || editReservation.status === 'cancelled' || (editReservation.status === 'arrived' && editReservation.cleared));
  const isTimeLocked = isArrived;
  const isDateLocked = isArrived;
  const isNameLocked = isArrived;

  // Detect overlapping event for current form date/time
  // For seated (arrived) reservations, also allow if event exists on same date (even if reservation started before event)
  const overlappingEvent = useMemo(() => {
    try {
      const year = (selectedDate || new Date()).getFullYear();
      const monthString = (formData.month + 1).toString().padStart(2, '0');
      const dayString = formData.day.toString().padStart(2, '0');
      const date = `${year}-${monthString}-${dayString}`;
      
      const hour = typeof formData.hour === 'number' ? formData.hour : 0;
      const minute = typeof formData.minute === 'number' ? formData.minute : 0;
      const resStartMin = hour * 60 + minute;
      const resEndMin = Math.min(1440, resStartMin + estimateDurationMinutes(formData.numberOfGuests));
      
      const zoneForReservation = formData.zone || currentZone?.id || (zones.length > 0 ? zones[0].id : '');
      const sameDayEvents = (events || []).filter((ev) => ev.date === date);
      
      // For seated (arrived) reservations, find any event on the same date/zone
      // since they might have started before the event but are still ongoing
      if (editReservation?.status === 'arrived' && !editReservation?.cleared) {
        const foundEvent = sameDayEvents.find((ev) => {
          // If event is limited to zones and reservation zone isn't included, skip
          if (Array.isArray(ev.zoneIds) && ev.zoneIds.length > 0) {
            if (!ev.zoneIds.includes(zoneForReservation)) return false;
          }
          return true; // Any event on same date/zone is eligible for seated reservations
        });
        return foundEvent || null;
      }
      
      // For non-seated reservations, check time overlap
      const foundEvent = sameDayEvents.find((ev) => {
        // If event is limited to zones and reservation zone isn't included, skip
        if (Array.isArray(ev.zoneIds) && ev.zoneIds.length > 0) {
          if (!ev.zoneIds.includes(zoneForReservation)) return false;
        }
        const [ehStart, emStart] = String(ev.startTime || '00:00').split(':').map(Number);
        const [ehEnd, emEnd] = String(ev.endTime || '23:59').split(':').map(Number);
        const evStartMin = (ehStart % 24) * 60 + (emStart % 60);
        const evEndMin = (ehEnd % 24) * 60 + (emEnd % 60);
        // Overlap if either start or end of reservation block intersects event window
        return resStartMin < evEndMin && evStartMin < resEndMin;
      });
      
      return foundEvent || null;
    } catch {
      return null;
    }
  }, [formData.month, formData.day, formData.hour, formData.minute, formData.numberOfGuests, formData.zone, selectedDate, events, currentZone, zones, editReservation?.status, editReservation?.cleared]);

  // Reset transferToEvent when overlapping event changes
  useEffect(() => {
    if (!overlappingEvent) {
      setTransferToEvent(false);
    }
  }, [overlappingEvent]);

  // Helper function to show alert modal
  const showAlert = useCallback((title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setAlertConfig({ title, message, type });
    setShowAlertModal(true);
  }, []);

  // DOM ready check function
  const checkDomReady = useCallback(() => {
    if (!isOpen || !mountedRef.current) return false;
    
    const requiredRefs = [formRef, nameInputRef];
    const allRefsReady = requiredRefs.every(ref => ref.current && ref.current.isConnected);
    
    if (allRefsReady && !domReadyRef.current) {
      domReadyRef.current = true;
      setIsDomReady(true);
      return true;
    }
    
    return domReadyRef.current;
  }, [isOpen]);

  // Initialize form data ONLY after DOM is ready
  const initializeFormData = useCallback(() => {
    if (isFormReady) return; // Skip if already ready

    try {
      if (editReservation) {
        // Find table numbers from table IDs - search across ALL zones/layouts
        const tableNumbers: string[] = editReservation.tableIds?.map((tableId: string) => {
          const table = allTablesAcrossZones.find(t => t.id === tableId);
          return table ? (table.name || table.number?.toString() || "") : "";
        }).filter((num: string) => num !== "") || [];
        
        setFormData({
          guestName: editReservation.guestName || "",
          month: new Date(editReservation.date).getMonth(),
          day: new Date(editReservation.date).getDate(),
          hour: parseInt(editReservation.time?.split(':')[0] || "12"),
          minute: parseInt(editReservation.time?.split(':')[1] || "0"),
          numberOfGuests: editReservation.numberOfGuests || 2,
          zone: editReservation.zoneId || currentZone?.id || (zones.length > 0 ? zones[0].id : ''),
          tableNumbers: tableNumbers,
          tableColor: editReservation.color || "#8B5CF6",
          serviceType: editReservation.notes || "",
          mobileNumber: editReservation.phone || "",
          additionalRequirements: editReservation.email || "",
          status: editReservation.status || 'waiting',
          isVipGuest: !!editReservation.isVip
        });
      } else {
        const today = selectedDate || new Date();
        const currentTime = new Date();
        setFormData({
          guestName: "",
          month: today.getMonth(),
          day: today.getDate(), 
          hour: currentTime.getHours(),
          minute: currentTime.getMinutes(),
          numberOfGuests: 2,
          zone: currentZone?.id || (zones.length > 0 ? zones[0].id : ''),
          tableNumbers: [],
          tableColor: "#8B5CF6",
          serviceType: "",
          mobileNumber: "",
          additionalRequirements: "",
          status: 'waiting' as const,
          isVipGuest: false
        });
      }
      
      setIsFormReady(true);
    } catch (error) {
      console.error('Error initializing form data:', error);
      // Set form ready anyway to prevent permanent disabled state
      setIsFormReady(true);
    }
  }, [isFormReady, editReservation, selectedDate, currentZone, zones, zoneLayouts]);

  // Reset form state when modal closes
  const resetForm = useCallback(() => {
    setIsFormReady(false);
    setIsDomReady(false);
    domReadyRef.current = false;
    setShowColorPicker(false);
    setCurrentTableInput("");
    setIsEditingTime({ hour: false, minute: false });
    setValidationErrors({});
    setFormError(null);
    // Also clear any linked VIP/guestbook state so badge doesn't persist on next open
    setSelectedGuestbookId(null);
    setFormData(prev => ({ ...prev, isVipGuest: false }));
    try { localStorage.removeItem('respoint_selected_guestbook_id'); } catch {}
  }, []);

  // Buffer for prefill payload until form ready (must persist across renders)
  const pendingPrefillRef = useRef<any | null>(null);

  useEffect(() => {
    const onPrefill = (e: any) => {
      if (editReservation) return; // ignore prefill in edit mode
      const d = e?.detail || {};
      // If form not mounted yet, buffer reliably via ref
      if (!isFormReady) {
        pendingPrefillRef.current = d;
        return;
      }
      setFormData(prev => ({
        ...prev,
        guestName: d.guestName || prev.guestName,
        mobileNumber: d.phone || prev.mobileNumber,
        additionalRequirements: prev.additionalRequirements,
        serviceType: prev.serviceType,
        tableNumbers: Array.isArray(d.tableNumbers)
          ? Array.from(new Set([...(prev.tableNumbers || []), ...d.tableNumbers.filter((x: any) => typeof x === 'string' && x.trim() !== '')]))
          : prev.tableNumbers
      }));
      // Try link VIP flag via stored guestbook ID
      try {
        const gbId = localStorage.getItem('respoint_selected_guestbook_id');
        if (gbId) {
          setSelectedGuestbookId(gbId);
          const entry = guestbookEntries.find(e => e.id === gbId);
          if (entry) {
            setFormData(prev => ({ ...prev, isVipGuest: !!entry.isVip }));
          }
        }
      } catch {}
    };
    window.addEventListener('prefill-reservation', onPrefill as any);
    return () => window.removeEventListener('prefill-reservation', onPrefill as any);
  }, [isFormReady]);

  // Apply buffered prefill once form becomes ready
  useEffect(() => {
    if (editReservation) return; // skip buffer handling for edit mode
    if (isFormReady && pendingPrefillRef.current) {
      const d = pendingPrefillRef.current;
      pendingPrefillRef.current = null;
      setFormData(prev => ({
        ...prev,
        guestName: d.guestName || prev.guestName,
        mobileNumber: d.phone || prev.mobileNumber,
        tableNumbers: Array.isArray(d.tableNumbers)
          ? Array.from(new Set([...(prev.tableNumbers || []), ...d.tableNumbers.filter((x: any) => typeof x === 'string' && x.trim() !== '')]))
          : prev.tableNumbers
      }));
      // Try link VIP flag via stored guestbook ID after buffer applied
      try {
        const gbId = localStorage.getItem('respoint_selected_guestbook_id');
        if (gbId) {
          setSelectedGuestbookId(gbId);
          const entry = guestbookEntries.find(e => e.id === gbId);
          if (entry) {
            setFormData(prev => ({ ...prev, isVipGuest: !!entry.isVip }));
          }
        }
      } catch {}
    }
  }, [isFormReady, guestbookEntries]);

  // Debug effect for active element tracking
  useEffect(() => {
    if (isFormReady) {
      console.log('📍 Form ready! Active element:', document.activeElement);
      console.log('📍 Form mounted refs status:', {
        formRef: !!formRef.current,
        nameInputRef: !!nameInputRef.current,
        tableInputRef: !!tableInputRef.current
      });
    }
  }, [isFormReady]);

  // Main effect - handle modal opening/closing
  useEffect(() => {
    if (isOpen) {
      console.log('🚀 Modal opening...');
      mountedRef.current = true;
      
      // Initialize form data immediately
      setTimeout(() => {
        console.log('✅ Initializing form data');
        initializeFormData();
      }, 100); // Small delay to ensure DOM is rendered
    } else {
      console.log('🔒 Modal closing, resetting form');
      mountedRef.current = false;
      resetForm();
    }

    return () => {
      if (!isOpen) {
        mountedRef.current = false;
      }
    };
  }, [isOpen, initializeFormData, resetForm]);

  // Listen for event to close this form when event reservation form is opening
  useEffect(() => {
    const handleCloseForm = () => {
      if (isOpen) {
        console.log('📩 Received close event from event reservation form');
        onClose();
      }
    };
    window.addEventListener('respoint-close-regular-reservation-form', handleCloseForm as any);
    return () => window.removeEventListener('respoint-close-regular-reservation-form', handleCloseForm as any);
  }, [isOpen, onClose]);

  // Re-populate form when switching between "add" and "edit" without closing the modal
  useEffect(() => {
    if (!isOpen) return;
    const currentId = (editReservation && (editReservation as any).id) ? String((editReservation as any).id) : null;
    if (lastEditIdRef.current === currentId) return;
    lastEditIdRef.current = currentId;
    try {
      if (editReservation) {
        const tableNumbers: string[] = editReservation.tableIds?.map((tableId: string) => {
          const table = allTablesAcrossZones.find(t => t.id === tableId);
          return table ? (table.name || table.number?.toString() || "") : "";
        }).filter((num: string) => num !== "") || [];
        setFormData({
          guestName: editReservation.guestName || "",
          month: new Date(editReservation.date).getMonth(),
          day: new Date(editReservation.date).getDate(),
          hour: parseInt(editReservation.time?.split(':')[0] || "12"),
          minute: parseInt(editReservation.time?.split(':')[1] || "0"),
          numberOfGuests: editReservation.numberOfGuests || 2,
          zone: editReservation.zoneId || currentZone?.id || (zones.length > 0 ? zones[0].id : ''),
          tableNumbers,
          tableColor: editReservation.color || "#8B5CF6",
          serviceType: editReservation.notes || "",
          mobileNumber: editReservation.phone || "",
          additionalRequirements: editReservation.email || "",
          status: editReservation.status || 'waiting',
          isVipGuest: !!editReservation.isVip
        });
        
        // Check if reservation already has spillover adjustment
        try {
          const resDate = editReservation.date;
          const adjKey = `respoint-duration-adjustments:${resDate}`;
          const adjRaw = localStorage.getItem(adjKey);
          const adjParsed = adjRaw ? JSON.parse(adjRaw) : {};
          const adj = adjParsed[editReservation.id];
          if (adj && typeof adj.end === 'number' && adj.end > 1440) {
            // Reservation spills into next day
            const spillMinutes = adj.end - 1440;
            setExtendToNextDay(true);
            setSpilloverEndHour(Math.floor(spillMinutes / 60));
            setSpilloverEndMinute(spillMinutes % 60);
          } else {
            setExtendToNextDay(false);
            setSpilloverEndHour(1);
            setSpilloverEndMinute(0);
          }
        } catch {
          setExtendToNextDay(false);
          setSpilloverEndHour(1);
          setSpilloverEndMinute(0);
        }
        
        setIsFormReady(true);
      } else {
        const today = selectedDate || new Date();
        const currentTime = new Date();
        setFormData({
          guestName: "",
          month: today.getMonth(),
          day: today.getDate(),
          hour: currentTime.getHours(),
          minute: 0,
          numberOfGuests: 2,
          zone: currentZone?.id || (zones.length > 0 ? zones[0].id : ''),
          tableNumbers: [],
          tableColor: "#8B5CF6",
          serviceType: "",
          mobileNumber: "",
          additionalRequirements: "",
          status: 'waiting' as const,
          isVipGuest: false
        });
        // Reset spillover state for new reservations
        setExtendToNextDay(false);
        setSpilloverEndHour(1);
        setSpilloverEndMinute(0);
        setIsFormReady(true);
      }
    } catch {}
  }, [editReservation, isOpen, selectedDate, currentZone, zones, zoneLayouts]);

  // Load guestbook entries when modal opens
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const list = await guestbookService.list();
        setGuestbookEntries(Array.isArray(list) ? list : []);
      } catch {
        setGuestbookEntries([]);
      }
    })();
  }, [isOpen]);

  // When guestbook entries load or modal opens, adopt selected guestbook id (if any) and set VIP flag
  // Only apply when there is a non-empty guest name to avoid showing badge with empty field
  useEffect(() => {
    if (!isOpen) return;
    if (editReservation) return; // don't adopt guestbook VIP link in edit mode
    if (!formData.guestName || !formData.guestName.trim()) return;
    try {
      const gbId = localStorage.getItem('respoint_selected_guestbook_id');
      if (gbId) {
        setSelectedGuestbookId(gbId);
        const entry = guestbookEntries.find(e => e.id === gbId);
        if (entry) {
          setFormData(prev => ({ ...prev, isVipGuest: !!entry.isVip }));
        }
      }
    } catch {}
  }, [isOpen, guestbookEntries, formData.guestName]);

  useEffect(() => {
    if (!isFormReady) {
      setServiceDropdownOpen(false);
    }
  }, [isFormReady]);

  useEffect(() => {
    if (!serviceDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!serviceDropdownRef.current) return;
      if (event.target instanceof Node && !serviceDropdownRef.current.contains(event.target)) {
        setServiceDropdownOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setServiceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [serviceDropdownOpen]);

  useEffect(() => {
    const tokens = parseServiceTypeTokens(formData.serviceType);
    setSelectedServiceTypes((prev) => {
      const nextSelections = tokens.map((token) => {
        const match = matchServiceTypeDefinition(token);
        if (match) {
          return {
            key: match.key,
            label: match.label[currentLanguage === 'srb' ? 'srb' : 'eng'],
          };
        }
        return { label: token };
      });
      return areServiceSelectionsEqual(prev, nextSelections) ? prev : nextSelections;
    });
  }, [formData.serviceType, currentLanguage]);

  // Normalize avatar URL (handles bare domains and data URLs)
  const normalizeAvatarUrl = (url?: string) => {
    const u = (url || '').trim();
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
    return `https://${u}`;
  };

  // Filter guest suggestions by typed name (substring, case-insensitive, accent-insensitive)
  const normalizeText = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const guestNameQuery = normalizeText((formData.guestName || '').trim());
  const filteredGuestSuggestions = React.useMemo(() => {
    if (!guestNameQuery) return [];
    const seen = new Set<string>();
    const list = guestbookEntries.filter(e => {
      const n = normalizeText(e.name || '');
      if (!n) return false;
      let match = false;
      if (guestNameQuery.length === 1) {
        // For single-letter queries, only match if it is the first letter of any word
        const words = n.split(/\s+/).filter(Boolean);
        match = words.some(w => w.startsWith(guestNameQuery));
      } else {
        // For longer queries, allow substring match anywhere
        match = n.includes(guestNameQuery);
      }
      if (match && !seen.has(n)) { seen.add(n); return true; }
      return false;
    });
    return list.slice(0, 10);
  }, [guestbookEntries, guestNameQuery]);

  // Detect VIP (loyalty) guest by typed exact name (normalized) or already selected VIP state
  const isVipByName = React.useMemo(() => {
    if (!guestNameQuery) return false;
    return guestbookEntries.some(e => !!e.isVip && normalizeText(e.name || '') === guestNameQuery);
  }, [guestbookEntries, guestNameQuery]);
  // In edit mode, don't infer VIP status purely by name; rely on reservation/link
  const showLoyaltyBadge = formData.isVipGuest || (!editReservation && isVipByName);

  // Guestbook integration: detect existing guest by name or phone; handle actions
  const [isGuestbookBusy, setIsGuestbookBusy] = useState(false);
  const normalizePhone = (s?: string) => (s || '').replace(/\D+/g, '');
  const phoneQuery = normalizePhone(formData.mobileNumber);
  const existingGuest = React.useMemo(() => {
    // Find guest by phone and name separately
    const byPhone =
      phoneQuery && phoneQuery.length >= 5
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
  const handleGuestbookAction = async () => {
    if (!isFormReady || isNameLocked) return;
    // If guest exists -> open in guestbook
    if (existingGuest) {
      try { localStorage.setItem('respoint_selected_guestbook_id', existingGuest.id); } catch {}
      try { window.dispatchEvent(new CustomEvent('respoint-open-guestbook')); } catch {}
      return;
    }
    // Else create new entry from reservation form
    const name = String(formData.guestName || '').trim();
    if (!name) {
      showAlert('Guestbook', currentLanguage === 'srb' ? 'Unesite ime gosta.' : 'Please enter guest name.', 'info');
      return;
    }
    setIsGuestbookBusy(true);
    try {
      const created = await guestbookService.create({
        name,
        phone: formData.mobileNumber || ''
      } as any);
      // Update local list so label flips to "Open in Guestbook"
      setGuestbookEntries(prev => {
        const exists = prev.some(e => e.id === created.id);
        return exists ? prev : [created, ...prev];
      });
      // Remember which guest to open after the success alert is dismissed
      try { localStorage.setItem('respoint_selected_guestbook_id', created.id); } catch {}
      setGuestbookOpenAfterAlertId(created.id);
      showAlert('Guestbook', currentLanguage === 'srb' ? 'Gost je dodat u knjigu gostiju.' : 'Guest added to guestbook.', 'success');
    } catch {
      showAlert('Guestbook', currentLanguage === 'srb' ? 'Greška pri dodavanju gosta.' : 'Failed to add guest.', 'error');
    } finally {
      setIsGuestbookBusy(false);
    }
  };

  // When success alert is closed, open the guestbook on the newly created guest profile
  useEffect(() => {
    if (!showAlertModal && guestbookOpenAfterAlertId) {
      try { localStorage.setItem('respoint_selected_guestbook_id', guestbookOpenAfterAlertId); } catch {}
      try { window.dispatchEvent(new CustomEvent('respoint-open-guestbook')); } catch {}
      setGuestbookOpenAfterAlertId(null);
    }
  }, [showAlertModal, guestbookOpenAfterAlertId]);
  // Helper: find zoneId for a given table number/name
  const findZoneIdForTableNumber = useCallback((tableNumberOrName: string): string | null => {
    try {
      const target = String(tableNumberOrName || '').trim();
      if (!target) return null;

      // 1) Prefer working/default layouts from zoneLayouts
      for (const [zoneId, layout] of Object.entries(zoneLayouts || {})) {
        const tables = Array.isArray((layout as any)?.tables) ? (layout as any).tables : [];
        const found = tables.some((t: any) => (t?.name === target) || (String(t?.number ?? '') === target));
        if (found) return zoneId;
      }

      // 2) Fallback: search through all saved layouts
      for (const [zoneId, list] of Object.entries((savedLayouts as any) || {})) {
        const layoutsForZone = Array.isArray(list) ? list : [];
        for (const sl of layoutsForZone) {
          const tables = Array.isArray(sl?.layout?.tables) ? sl.layout.tables : [];
          const found = tables.some((t: any) => (t?.name === target) || (String(t?.number ?? '') === target));
          if (found) return zoneId;
        }
      }
    } catch {}
    return null;
  }, [zoneLayouts, savedLayouts]);

  // Auto-select zones based on entered table numbers.
  // We derive this purely from the numbers → zone mapping so it stays consistent
  // with validation and with saved multi-zone reservations.
  const autoSelectedZoneIds = useMemo(() => {
    const result = new Set<string>();
    try {
      const nums = (formData.tableNumbers || []).map(n => String(n || '').trim()).filter(Boolean);
      if (nums.length === 0) return result;
      nums.forEach(num => {
        const z = findZoneIdForTableNumber(num);
        if (z) result.add(z);
      });
    } catch {}
    return result;
  }, [formData.tableNumbers, findZoneIdForTableNumber]);

  // If only one zone matches the entered tables and we're creating a new reservation,
  // auto-select that zone in the form
  useEffect(() => {
    if (!isOpen) return;
    if (editReservation) return; // only for new reservations
    if (autoSelectedZoneIds.size === 1) {
      const onlyZoneId = Array.from(autoSelectedZoneIds)[0];
      if (onlyZoneId && formData.zone !== onlyZoneId) {
        setFormData(prev => ({ ...prev, zone: onlyZoneId }));
      }
    }
  }, [autoSelectedZoneIds, isOpen, editReservation]); 

  const applyGuestSuggestion = (entry: GuestbookEntry) => {
    if (isNameLocked) return;
    // Parse preferred seating numbers from guestbook entry
    const tokens = String(entry.preferredSeating || '')
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(s => /^\d+$/.test(s));
    const dedup = Array.from(new Set(tokens));

    // Validate against existing tables across all zones
    const allTables = allTablesAcrossZones as Array<any>;
    const validNumbers = dedup.filter(n => allTables.some(t => t?.name === n || String(t?.number) === n));

    // Decide zone from suggested tables
    const zonesForSuggested = new Set<string>();
    validNumbers.forEach(n => {
      const z = findZoneIdForTableNumber(n);
      if (z) zonesForSuggested.add(z);
    });

    setFormData(prev => {
      const nextTables = validNumbers.length > 0 ? validNumbers : prev.tableNumbers;
      let nextZone = prev.zone;
      if (zonesForSuggested.size === 1) {
        nextZone = Array.from(zonesForSuggested)[0];
      }
      return {
        ...prev,
        guestName: entry.name || '',
        mobileNumber: entry.phone || '', // Always use guestbook phone when selecting guest
        tableNumbers: nextTables,
        isVipGuest: !!entry.isVip,
        zone: nextZone
      };
    });
    setSelectedGuestbookId(entry.id);
    try { localStorage.setItem('respoint_selected_guestbook_id', entry.id); } catch {}
    setShowGuestSuggestions(false);
    setGuestSuggestionIndex(-1);
    if (validationErrors.guestName) {
      setValidationErrors(prev => ({ ...prev, guestName: '' }));
    }
  };

  // Do not auto-focus the name input on modal open
  useEffect(() => {
    // intentionally left blank
  }, [isFormReady]);

  // Color picker positioning - only when DOM is ready and refs are valid
  useEffect(() => {
    if (!isDomReady || !showColorPicker) {
      return;
    }

    // Strict ref validation
    if (!colorButtonRef.current || !colorPickerRef.current) {
      console.warn('❌ Color picker refs not ready');
      return;
    }

    try {
      const buttonRect = colorButtonRef.current.getBoundingClientRect();
      const pickerHeight = 280;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      // Find the modal container
      const modalContainer = colorButtonRef.current.closest('.bg-\\[\\#1A2332\\]');
      if (modalContainer) {
        const modalRect = modalContainer.getBoundingClientRect();
        const spaceInModalBelow = modalRect.bottom - buttonRect.bottom;
        const spaceInModalAbove = buttonRect.top - modalRect.top;
        
        const effectiveSpaceBelow = Math.min(spaceBelow, spaceInModalBelow);
        const effectiveSpaceAbove = Math.min(spaceAbove, spaceInModalAbove);
        
        if (effectiveSpaceBelow < pickerHeight && effectiveSpaceAbove > pickerHeight) {
          setPickerPosition('top');
        } else {
          setPickerPosition('bottom');
        }
      } else {
        if (spaceBelow < pickerHeight && spaceAbove > pickerHeight) {
          setPickerPosition('top');
        } else {
          setPickerPosition('bottom');
        }
      }
    } catch (error) {
      console.warn('Color picker positioning failed:', error);
    }
  }, [isDomReady, showColorPicker]);

  // Color picker outside click handler
  useEffect(() => {
    if (!showColorPicker) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      if (!target) return;
      
      // Don't close if clicking on the color picker itself or the color button
      const isInsideColorPicker = colorPickerRef.current && colorPickerRef.current.contains(target);
      const isColorButton = colorButtonRef.current && colorButtonRef.current.contains(target);
      
      // Also check if clicking on any child of the color picker container
      const isColorPickerChild = target.closest('.color-picker-container');
      
      if (!isInsideColorPicker && !isColorButton && !isColorPickerChild) {
        setShowColorPicker(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowColorPicker(false);
      }
    };

    // Add event listeners without delay and capture
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showColorPicker]);

  if (!isOpen) return null;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.guestName.trim()) {
      errors.guestName = t('guestNameRequired');
    }
    
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      // Show first validation error in a banner (similar to event reservation form)
      const firstKey = Object.keys(errors)[0];
      setFormError(errors[firstKey]);
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormReady) {
      console.warn('Form not ready for submission');
      return;
    }
    
    // Custom field validation
    if (!validateForm()) {
      return;
    }
    
    console.log('🎯 ReservationForm: Submit clicked!');
    console.log('📝 Form data before processing:', formData);
    
    // Ensure hour and minute are numbers
    const hour = typeof formData.hour === 'string' ? 0 : formData.hour;
    const minute = typeof formData.minute === 'string' ? 0 : formData.minute;
    
    // Format date using values currently shown in the form
    const year = (selectedDate || new Date()).getFullYear();
    const monthString = (formData.month + 1).toString().padStart(2, '0');
    const dayString = formData.day.toString().padStart(2, '0');
    let date = `${year}-${monthString}-${dayString}`;
    if (editReservation && isDateLocked) {
      // keep original date for arrived reservations
      date = editReservation.date;
    }

    // Format time
    // If editing an arrived reservation, keep original time (locked)
    let time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    if (editReservation && editReservation.status === 'arrived') {
      time = editReservation.time;
    }
    
    console.log('📅 Formatted date:', date);
    console.log('⏰ Formatted time:', time);
    
    // Validate that the reservation is in the future
    const [resHour, resMinute] = time.split(":").map(Number);
    const reservationDateTime = new Date(year, formData.month, formData.day, resHour, resMinute, 0, 0);
    const now = new Date();
    
    // Validate that the reservation is in the future only for NEW reservations
    // or when editing non-arrived reservations. For 'arrived', allow editing other fields.
    if (!editReservation || (editReservation && editReservation.status !== 'arrived')) {
      if (reservationDateTime <= now) {
        setFormError(t('invalidDateTimeMessage'));
        return;
      }
    }
    
    // Find tables by numbers across ALL zones to allow multi-zone reservations
    const allTables = allTablesAcrossZones as Array<any>;
    const tableIds = formData.tableNumbers
      .map(tableNumber => {
        const table = allTables.find(t => t.name === tableNumber || t.number?.toString() === tableNumber);
        return table ? table.id : null;
      })
      .filter(id => id !== null) as string[];
      
    console.log('🏷️ Selected table IDs:', tableIds);
      
    // VALIDATION: Check for double booking
    // Exclude cleared reservations (guest has left)
    const otherReservations = reservations.filter(
      r => activeStatuses.has(r.status) && 
           !(r.status === 'arrived' && (r as any).cleared === true) &&
           !(editReservation && r.id === editReservation.id)
    );

    // Also check seated event reservations (arrived, not cleared)
    const seatedEventReservations = (eventReservations || []).filter(
      er => er.status === 'arrived' && !er.cleared
    );

    const adjustmentsForDate = getAdjustmentsForDate(date);
    const newStartMin = timeStringToMinutes(time);
    const newEndMin = Math.min(1440, newStartMin + estimateDurationMinutes(formData.numberOfGuests));
    const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
      aStart < bEnd && bStart < aEnd;

    // Also block against spillover from previous day into this date (endMin > 1440)
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

    // When editing an existing reservation, allow saving even if it already overlaps
    // with a conflicting reservation (e.g. seated), as long as that overlap existed before.
    const prevEditDate = editReservation?.date;
    const prevAdjustmentsForDate = prevEditDate ? getAdjustmentsForDate(prevEditDate) : {};
    const prevEditRange = editReservation
      ? getReservationRange(editReservation as Reservation, prevAdjustmentsForDate)
      : null;
    const prevEditTableIds: string[] = Array.isArray(editReservation?.tableIds) ? editReservation.tableIds : [];

    for (const tableId of tableIds) {
      // Check spillover regular reservations from previous day
      if (prevDateKey) {
        const spillConflict = (reservations || []).find(r => {
          if (r.date !== prevDateKey) return false;
          if ((r as any).cleared) return false;
          if (!(r.status === 'waiting' || r.status === 'confirmed' || r.status === 'arrived')) return false;
          if (editReservation && r.id === editReservation.id) return false;
          if (!Array.isArray(r.tableIds) || !r.tableIds.includes(tableId)) return false;
          const rangePrev = getReservationRange(r, adjustmentsForPrev);
          if (rangePrev.endMin <= 1440) return false;
          const spillStart = 0;
          const spillEnd = Math.min(1440, rangePrev.endMin - 1440);
          return overlaps(newStartMin, newEndMin, spillStart, spillEnd);
        });
        if (spillConflict) {
          const conflictingTable = allTables.find(t => t.id === tableId);
          const message = currentLanguage === 'srb'
            ? `Sto ${conflictingTable?.name || conflictingTable?.number || ''} je zauzet (rezervacija iz prethodnog dana) od 00:00 do ${formatMinutesToTime(Math.min(1440, (getReservationRange(spillConflict, adjustmentsForPrev).endMin - 1440)))} - ${spillConflict.guestName}`
            : `Table ${conflictingTable?.name || conflictingTable?.number || ''} is occupied (spillover reservation) from 00:00 to ${formatMinutesToTime(Math.min(1440, (getReservationRange(spillConflict, adjustmentsForPrev).endMin - 1440)))} - ${spillConflict.guestName}`;
          setFormError(message);
          return;
        }
      }

      // Check regular reservations
      const conflictingReservation = otherReservations.find(r => {
        if (r.date !== date) return false;
        if (!Array.isArray(r.tableIds) || !r.tableIds.includes(tableId)) return false;
        const range = getReservationRange(r, adjustmentsForDate);
        return overlaps(newStartMin, newEndMin, range.startMin, range.endMin);
      });

      if (conflictingReservation) {
        const conflictingRange = getReservationRange(conflictingReservation, adjustmentsForDate);

        // Editing exception: if this reservation already overlapped this conflict before, allow updates.
        if (
          editReservation &&
          prevEditRange &&
          prevEditDate === date &&
          prevEditTableIds.includes(tableId) &&
          overlaps(prevEditRange.startMin, prevEditRange.endMin, conflictingRange.startMin, conflictingRange.endMin)
        ) {
          // Keep checking other tables for new conflicts
        } else {
        const conflictingTable = allTables.find(t => t.id === tableId);
        const message = `${t('tableUnavailableMessage')
          .replace('{table}', String(conflictingTable?.name || conflictingTable?.number || ''))
          .replace('{time}', `${formatMinutesToTime(conflictingRange.startMin)}-${formatMinutesToTime(conflictingRange.endMin)}`)
          .replace('{guest}', conflictingReservation.guestName)}`;
        setFormError(message);
        return;
        }
      }

      // Check seated event reservations
      const conflictingEventReservation = seatedEventReservations.find(er => {
        if (er.date !== date) return false;
        if (!Array.isArray(er.tableIds) || !er.tableIds.includes(tableId)) return false;
        // Get event reservation range from adjustments
        const adj = adjustmentsForDate?.[er.id] || {};
        const baseStart = timeStringToMinutes(er.time);
        const startMin = typeof adj.start === 'number' ? adj.start : baseStart;
        const endMin = typeof adj.end === 'number' ? adj.end : Math.min(1440, startMin + estimateDurationMinutes(er.numberOfGuests));
        return overlaps(newStartMin, newEndMin, startMin, endMin);
      });

      if (conflictingEventReservation) {
        const adj = adjustmentsForDate?.[conflictingEventReservation.id] || {};
        const baseStart = timeStringToMinutes(conflictingEventReservation.time);
        const startMin = typeof adj.start === 'number' ? adj.start : baseStart;
        const endMin = typeof adj.end === 'number' ? adj.end : Math.min(1440, startMin + estimateDurationMinutes(conflictingEventReservation.numberOfGuests));

        // Editing exception: if this reservation already overlapped this event seated reservation before, allow updates.
        if (
          editReservation &&
          prevEditRange &&
          prevEditDate === date &&
          prevEditTableIds.includes(tableId) &&
          overlaps(prevEditRange.startMin, prevEditRange.endMin, startMin, endMin)
        ) {
          // allow
        } else {
        const conflictingTable = allTables.find(t => t.id === tableId);
        const message = currentLanguage === 'srb'
          ? `Sto ${conflictingTable?.name || conflictingTable?.number || ''} je zauzet (event rezervacija) od ${formatMinutesToTime(startMin)} do ${formatMinutesToTime(endMin)} - ${conflictingEventReservation.guestName}`
          : `Table ${conflictingTable?.name || conflictingTable?.number || ''} is occupied (event reservation) from ${formatMinutesToTime(startMin)} to ${formatMinutesToTime(endMin)} - ${conflictingEventReservation.guestName}`;
        setFormError(message);
        return;
        }
      }
    }

    // HANDLE: Transfer to event OR block if overlapping event without transfer
    if (overlappingEvent && !transferToEvent) {
      // Block regular reservations during events if not transferring
      const msg =
        currentLanguage === 'srb'
          ? `U ovom terminu postoji aktivan event "${overlappingEvent.name}". Označite opciju za prebacivanje u event ili izaberite drugi termin.`
          : `There is an active event "${overlappingEvent.name}" during this time. Check the transfer option or choose a different time.`;
      setFormError(msg);
      return;
    }

    // If transferring to event, create event reservation instead
    if (transferToEvent && overlappingEvent) {
      try {
        console.log('🎪 Transferring reservation to event:', overlappingEvent.name);
        
        // Dispatch event to trigger slide-out animation on the reservation box
        if (editReservation?.id) {
          window.dispatchEvent(new CustomEvent('respoint-reservation-transferring', {
            detail: { reservationId: editReservation.id }
          }));
          // Wait for animation (300ms)
          await new Promise(resolve => setTimeout(resolve, 350));
        }
        
        // Determine if reservation was seated (arrived)
        const wasSeated = formData.status === 'arrived' || editReservation?.status === 'arrived';
        
        // Create event reservation with proper table IDs (not names)
        const createdEventReservation = await addEventReservation({
          eventId: overlappingEvent.id,
          guestName: formData.guestName,
          date: date,
          time: time,
          numberOfGuests: formData.numberOfGuests,
          zoneId: formData.zone || currentZone?.id || (zones.length > 0 ? zones[0].id : ''),
          tableIds: tableIds, // These are already table IDs (not names)
          color: formData.tableColor,
          isVip: formData.isVipGuest,
          notes: formData.serviceType + (formData.additionalRequirements ? '\n' + formData.additionalRequirements : ''),
          phone: formData.mobileNumber,
          paymentStatus: 'not_required',
        });
        
        // If the original was seated (arrived), update the event reservation status to 'arrived'
        if (wasSeated && createdEventReservation?.id) {
          console.log('🪑 Updating event reservation status to arrived (seated)');
          await updateEventReservation(createdEventReservation.id, { status: 'arrived' });
        }
        
        // If editing an existing regular reservation, delete it
        if (editReservation) {
          console.log('🗑️ Deleting original regular reservation:', editReservation.id);
          await deleteReservation(editReservation.id);
        }
        
        // Dispatch complete event to clear animation state
        window.dispatchEvent(new CustomEvent('respoint-reservation-transfer-complete'));
        
        console.log('✅ Reservation transferred to event successfully');
        onClose();
        return;
      } catch (error) {
        console.error('❌ Error transferring reservation to event:', error);
        // Dispatch complete event to clear animation state even on error
        window.dispatchEvent(new CustomEvent('respoint-reservation-transfer-complete'));
        showAlert(
          currentLanguage === 'srb' ? 'Greška' : 'Error',
          currentLanguage === 'srb' 
            ? 'Greška pri prebacivanju rezervacije u event.'
            : 'Error transferring reservation to event.',
          'error'
        );
        return;
      }
    }
    
    const reservationData = {
      guestName: formData.guestName,
      isVip: formData.isVipGuest,
      date: date,
      time: time,
      numberOfGuests: formData.numberOfGuests,
      zoneId: formData.zone || currentZone?.id || (zones.length > 0 ? zones[0].id : ''),
      tableIds: tableIds,
      phone: formData.mobileNumber,
      email: formData.additionalRequirements,
      notes: formData.serviceType,
      color: formData.tableColor,
      status: formData.status
    };
    
    console.log('🚀 Final reservation data to submit:', reservationData);
    
    try {
      if (editReservation) {
        console.log('✏️ Updating existing reservation:', editReservation.id);
        await updateReservation(editReservation.id, reservationData);
        console.log('✅ Reservation updated successfully');

        // If extending seated reservation into next day, save the spillover adjustment
        if (isArrived && extendToNextDay) {
          const startMin = timeStringToMinutes(editReservation.time);
          // End time is in the next day: 1440 + (hours * 60 + minutes)
          const spilloverEndMin = 1440 + (spilloverEndHour * 60) + spilloverEndMinute;
          
          try {
            await reservationAdjustmentsService.upsertAdjustment(date, editReservation.id, {
              start: startMin,
              end: spilloverEndMin
            });
            // Also update localStorage for immediate effect
            const key = `respoint-duration-adjustments:${date}`;
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : {};
            parsed[editReservation.id] = { start: startMin, end: spilloverEndMin };
            localStorage.setItem(key, JSON.stringify(parsed));
            window.dispatchEvent(new CustomEvent('respoint-duration-adjustments-changed', { detail: { date } }));
            console.log('✅ Spillover adjustment saved:', { start: startMin, end: spilloverEndMin });
          } catch (adjErr) {
            console.error('❌ Error saving spillover adjustment:', adjErr);
          }
        }
      } else {
        console.log('➕ Creating new reservation');
        await addReservation(reservationData);
        console.log('✅ Reservation created successfully');
      }
      
      console.log('🎉 Closing form after successful submission');
      onClose();
    } catch (error) {
      console.error('❌ Error submitting reservation:', error);
      showAlert(
        t('saveFailed'),
        t('saveFailedMessage'),
        'error'
      );
    }
  };

  const handleCancel = () => {
    if (editReservation) {
      setShowDeleteModal(true);
    }
  };

  const handleDelete = () => {
    if (editReservation) {
      setShowDeleteModal(true);
    }
  };

  const confirmCancel = async () => {
    if (!editReservation) return;
    
    console.log('❌ ReservationForm: Cancel confirmed for reservation:', editReservation.id);
    
    try {
      // Update reservation status to 'cancelled' instead of deleting
      await updateReservation(editReservation.id, { 
        ...editReservation, 
        status: 'cancelled' 
      });
      console.log('✅ Reservation cancelled successfully from form');
      
      // Refresh reservations list to reflect changes immediately
      await fetchReservations();
      
      onClose();
    } catch (error) {
      console.error('❌ Error cancelling reservation:', error);
      showAlert(
        t('cancelFailed'),
        t('cancelFailedMessage'),
        'error'
      );
    }
  };

  const confirmDelete = async () => {
    if (!editReservation || !user?.id) return;
    
    console.log('🗑️ ReservationForm: Delete confirmed for finalized reservation:', editReservation.id);
    
    try {
      // For finalized reservations, use soft delete to keep them in statistics
      await reservationsService.softDeleteReservation(editReservation.id, user.id);
      console.log('✅ Reservation soft deleted successfully from form');
      
      // Refresh reservations list to reflect changes immediately
      await fetchReservations();
      
      onClose();
    } catch (error) {
      console.error('❌ Error deleting reservation:', error);
      showAlert(
        t('deleteFailed'),
        t('deleteFailedMessage'),
        'error'
      );
    }
  };

  // Clear now: finish seated reservation immediately (arrived -> closed as cleared)
  const handleClearNow = async () => {
    if (!editReservation) return;
    try {
      await updateReservation(editReservation.id, { status: 'arrived', cleared: true } as any);
      await fetchReservations();
      onClose();
    } catch (error) {
      console.error('❌ Error clearing reservation:', error);
      showAlert(
        t('saveFailed'),
        t('saveFailedMessage'),
        'error'
      );
    }
  };

  // Direct printing function for POS printers
  const handleDirectPrint = async () => {
    if (!isFormReady) return;
    
    let reservationData;
    
    // Helper to get zone name or "Merged Zones" for print
    const getZoneNameForPrint = (tableIds: string[]): string | undefined => {
      if (!tableIds || tableIds.length === 0) return undefined;
      const zoneIdsSet = new Set<string>();
      tableIds.forEach((tableId) => {
        const zId = findZoneIdForTableNumber(tableId);
        if (zId) zoneIdsSet.add(zId);
      });
      if (zoneIdsSet.size > 1) {
        return currentLanguage === 'srb' ? 'Spojene zone' : 'Merged Zones';
      }
      if (zoneIdsSet.size === 1) {
        const zoneId = Array.from(zoneIdsSet)[0];
        return zones.find(z => z.id === zoneId)?.name;
      }
      return undefined;
    };
    
    if (editReservation) {
      // For editing mode, use existing reservation data
      const tableNames = editReservation.tableIds?.map((tableId: string) => {
        const table = allTablesAcrossZones.find(t => t.id === tableId);
        return table ? (table.name || table.number?.toString() || "") : "";
      }) || [];
      // Detect multi-zone from table names
      const zoneName = getZoneNameForPrint(tableNames) || zones.find(z => z.id === editReservation.zoneId)?.name;
      
      reservationData = {
        guestName: editReservation.guestName,
        date: editReservation.date,
        time: editReservation.time,
        numberOfGuests: editReservation.numberOfGuests,
        tableNumber: tableNames.join(', ') || "",
        serviceType: localizeServiceType(editReservation.notes),
        additionalRequirements: editReservation.email,
        zoneName,
        restaurantName: user?.restaurantName,
        restaurantAddress: user?.address,
        logoUrl: user?.printLogoUrl || user?.logo
      };
    } else {
      // For new reservation, use form data
      const date = `${new Date().getFullYear()}-${(formData.month + 1).toString().padStart(2, '0')}-${formData.day.toString().padStart(2, '0')}`;
      const time = `${Number(formData.hour).toString().padStart(2, '0')}:${Number(formData.minute).toString().padStart(2, '0')}`;
      
      // Detect multi-zone from table numbers
      let zoneName: string | undefined;
      if (autoSelectedZoneIds.size > 1) {
        zoneName = currentLanguage === 'srb' ? 'Spojene zone' : 'Merged Zones';
      } else if (autoSelectedZoneIds.size === 1) {
        const zoneId = Array.from(autoSelectedZoneIds)[0];
        zoneName = zones.find(z => z.id === zoneId)?.name;
      } else {
        const newZone = zones.find(z => z.id === (formData.zone || currentZone?.id));
        zoneName = newZone?.name;
      }
      
      reservationData = {
        guestName: formData.guestName,
        date: date,
        time: time,
        numberOfGuests: formData.numberOfGuests,
        tableNumber: formData.tableNumbers.join(', '),
        serviceType: localizeServiceType(formData.serviceType),
        additionalRequirements: formData.additionalRequirements,
        zoneName,
        restaurantName: user?.restaurantName,
        restaurantAddress: user?.address,
        logoUrl: user?.printLogoUrl || user?.logo
      };
    }
    
    setPreviewReservationData(reservationData);
    setShowPrintPreview(true);
  };

  // Helper function to check if a date/time combination is in the past
  const isDateTimeInPast = (month: number, day: number, hour: number, minute: number) => {
    const year = new Date().getFullYear();
    const selectedDateTime = new Date(year, month, day, hour, minute);
    return selectedDateTime <= new Date();
  };

  // Helper function to check if we can decrease a value
  const canDecrease = (field: string, delta: number) => {
    // Allow all time adjustments, validation will happen on form submit
    // Only check basic bounds
    if (field === 'numberOfGuests' && formData.numberOfGuests <= 1) return false;
    if (field === 'month' && formData.month + delta < 0) return false;
    if (field === 'day' && formData.day + delta < 1) return false;
    if (field === 'hour' && formData.hour + delta < 0) return false;
    if (field === 'minute' && formData.minute + delta < 0) return false;
    
    return true;
  };

  const adjustValue = (field: string, delta: number) => {
    if (!isFormReady) return;
    
    // Check if we can decrease based on bounds
    if (delta < 0 && !canDecrease(field, delta)) {
      return;
    }
    
    setFormData(prev => {
      const currentValue = prev[field as keyof typeof prev];
      let newValue = (typeof currentValue === 'number' ? currentValue : 0) + delta;

      // Apply field-specific constraints
      if (field === 'numberOfGuests') {
        newValue = Math.max(1, Math.min(200, newValue));
      } else if (field === 'hour') {
        newValue = Math.max(0, Math.min(23, newValue));
      } else if (field === 'minute') {
        newValue = Math.max(0, Math.min(59, newValue));
      } else if (field === 'month') {
        newValue = Math.max(0, Math.min(11, newValue));
      } else if (field === 'day') {
        const daysInMonth = new Date(new Date().getFullYear(), prev.month + 1, 0).getDate();
        newValue = Math.max(1, Math.min(daysInMonth, newValue));
      }
      
      return { ...prev, [field]: newValue };
    });
  };

  const handleInputChange = (field: string, value: string) => {
    if (!isFormReady) return;
    
    if (value === '') {
      setFormData(prev => ({ ...prev, [field]: '' }));
      return;
    }
    
    const cleanValue = value.replace(/^0+/, '') || '0';
    const numValue = parseInt(cleanValue, 10);
    
    if (isNaN(numValue)) return;
    
    setFormData(prev => {
      let newValue = numValue;
      
      if (field === 'hour') {
        newValue = Math.max(0, Math.min(23, newValue));
      } else if (field === 'minute') {
        newValue = Math.max(0, Math.min(59, newValue));
      } else if (field === 'numberOfGuests') {
        newValue = Math.max(1, Math.min(200, newValue));
      }
      
      return { ...prev, [field]: newValue };
    });
  };

  const handleServiceSuggestionToggle = (key: string) => {
    if (!isFormReady) return;
    const suggestion = serviceTypeSuggestions.find((item) => item.key === key);
    if (!suggestion) return;
    setSelectedServiceTypes((prev) => {
      const exists = prev.some((item) => item.key === key);
      const next = exists ? prev.filter((item) => item.key !== key) : [...prev, { key: suggestion.key, label: suggestion.label }];
      syncServiceTypeField(next);
      return next;
    });
  };

  const handleRemoveServiceTag = (index: number) => {
    if (!isFormReady) return;
    setSelectedServiceTypes((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = prev.filter((_, idx) => idx !== index);
      syncServiceTypeField(next);
      return next;
    });
  };

  const handleTimeFocus = (field: string, event: React.FocusEvent<HTMLInputElement>) => {
    if (!isFormReady) return;
    
    setIsEditingTime(prev => ({ ...prev, [field]: true }));
    
    const currentValue = formData[field as keyof typeof formData];
    if (currentValue === 0 || currentValue === '0') {
      event.target.select();
    }
  };

  const handleTimeBlur = (field: string) => {
    if (!isFormReady) return;
    
    setIsEditingTime(prev => ({ ...prev, [field]: false }));
    
    if (formData[field as keyof typeof formData] === '') {
      setFormData(prev => ({ ...prev, [field]: 0 }));
    }
    
    // Remove automatic time correction - validation will happen on form submit
  };

  const handleAddTableNumber = () => {
    if (!isFormReady) return;
    
    const newTableNumber = currentTableInput.trim();
    if (!newTableNumber) return;

    if (formData.tableNumbers.includes(newTableNumber)) {
      setCurrentTableInput("");
      return; 
    }

    const allTables = allTablesAcrossZones as Array<any>;
    const tableObj = allTables.find(t => t.name === newTableNumber || t.number?.toString() === newTableNumber);
    const tableExists = !!tableObj;

    if (tableExists) {
      // For seated (arrived) reservations, check if this table has upcoming reservations
      if (isArrived && editReservation) {
        const tableId = tableObj.id;
        const reservationDate = editReservation.date;
        
        // Get current seated reservation's end time from adjustments
        const adjustmentsKey = `respoint-duration-adjustments:${reservationDate}`;
        let currentAdjustments: Record<string, { start?: number; end?: number }> = {};
        try {
          const raw = localStorage.getItem(adjustmentsKey);
          if (raw) currentAdjustments = JSON.parse(raw);
        } catch {}
        
        const currentReservationAdj = currentAdjustments[editReservation.id] || {};
        const currentStartMin = currentReservationAdj.start ?? timeStringToMinutes(editReservation.time);
        const currentEndMin = currentReservationAdj.end ?? Math.min(1440, currentStartMin + estimateDurationMinutes(editReservation.numberOfGuests));
        
        // Find reservations on this table that would conflict
        const conflictingReservation = reservations.find(r => {
          if (r.id === editReservation.id) return false; // Skip self
          if (r.date !== reservationDate) return false;
          if (!(r.status === 'waiting' || r.status === 'confirmed')) return false;
          if (!Array.isArray(r.tableIds) || !r.tableIds.includes(tableId)) return false;
          
          // Check if this reservation starts before our current end
          const adj = currentAdjustments[r.id] || {};
          const rStartMin = adj.start ?? timeStringToMinutes(r.time);
          return rStartMin < currentEndMin && rStartMin > currentStartMin;
        });
        
        // Also check event reservations
        const conflictingEventReservation = !conflictingReservation ? eventReservations.find(er => {
          if (er.date !== reservationDate) return false;
          if (!(er.status === 'booked')) return false;
          if (!Array.isArray(er.tableIds) || !er.tableIds.includes(tableId)) return false;
          
          const adj = currentAdjustments[er.id] || {};
          const erStartMin = adj.start ?? timeStringToMinutes(er.time);
          return erStartMin < currentEndMin && erStartMin > currentStartMin;
        }) : null;
        
        const conflict = conflictingReservation || conflictingEventReservation;
        
        if (conflict) {
          const conflictAdj = currentAdjustments[conflict.id] || {};
          const conflictStartMin = conflictAdj.start ?? timeStringToMinutes(conflict.time);
          const conflictStartTime = formatMinutesToTime(conflictStartMin);
          
          // Store table-specific limit
          const tableLimitsKey = `respoint-table-limits:${reservationDate}`;
          let tableLimits: Record<string, Record<string, number>> = {};
          try {
            const raw = localStorage.getItem(tableLimitsKey);
            if (raw) tableLimits = JSON.parse(raw);
          } catch {}
          
          if (!tableLimits[editReservation.id]) tableLimits[editReservation.id] = {};
          tableLimits[editReservation.id][tableId] = conflictStartMin;
          
          try {
            localStorage.setItem(tableLimitsKey, JSON.stringify(tableLimits));
            // Notify other components
            window.dispatchEvent(new CustomEvent('respoint-table-limits-changed', {
              detail: { date: reservationDate, reservationId: editReservation.id, tableId, endMin: conflictStartMin }
            }));
          } catch {}
          
          // Show info message
          showAlert(
            currentLanguage === 'srb' ? 'Sto dodat sa ograničenjem' : 'Table added with limit',
            currentLanguage === 'srb' 
              ? `Sto ${newTableNumber} je dodat, ali će biti seated samo do ${conflictStartTime} jer je tada rezervisan za "${conflict.guestName}".`
              : `Table ${newTableNumber} has been added, but will only be seated until ${conflictStartTime} as it's reserved for "${conflict.guestName}" then.`,
            'info'
          );
        }
      }
      
      // Determine zone for this table and for the full set after adding
      const zoneForNew = findZoneIdForTableNumber(newTableNumber);
      const finalNumbers = [...formData.tableNumbers, newTableNumber];
      const zonesForAll = new Set<string>();
      finalNumbers.forEach(n => {
        const z = findZoneIdForTableNumber(n);
        if (z) zonesForAll.add(z);
      });
      const onlyZone = zonesForAll.size === 1 ? Array.from(zonesForAll)[0] : null;
      setFormData(prev => ({
        ...prev,
        tableNumbers: finalNumbers,
        zone: (onlyZone || zoneForNew || prev.zone)
      }));
    } else {
      showAlert(
        t('tableNotFound'),
        t('tableNotFoundMessage').replace('{table}', newTableNumber),
        'error'
      );
    }
    setCurrentTableInput("");
  };

  const handleRemoveTableNumber = (tableNumber: string) => {
    if (!isFormReady) return;
    
    setFormData(prev => {
      const nextTables = prev.tableNumbers.filter(num => num !== tableNumber);
      // Re-evaluate zones after removal
      const zonesForAll = new Set<string>();
      nextTables.forEach(n => {
        const z = findZoneIdForTableNumber(n);
        if (z) zonesForAll.add(z);
      });
      let nextZone = prev.zone;
      if (zonesForAll.size === 1) {
        nextZone = Array.from(zonesForAll)[0];
      } else if (zonesForAll.size === 0) {
        // fallback when no tables selected
        nextZone = currentZone?.id || nextZone;
      }
      return {
        ...prev,
        tableNumbers: nextTables,
        zone: nextZone
      };
    });
  };

  const handleTableInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTableNumber();
    }
  };

  // Render read-only view for finalized reservations
  if (isFinalized) {
  return (
    <div ref={rootWrapRef} className={`absolute inset-0 ${seeThrough ? 'bg-transparent' : 'bg-[#0A1929]'} overflow-hidden z-[1200]`}>
      <div className="w-full h-full flex flex-col p-0">
	        <div
            className="bg-[#000814] overflow-hidden flex flex-col w-full min-h-0 h-full rounded-none shadow-none transition-opacity duration-800 ease-in-out"
            style={{ ...modalHeightStyle, opacity: seeThrough ? 0.5 : 1 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 flex-shrink-0">
              <h2 className="text-lg font-light text-white tracking-wide">
                {t('reservationDetails')} ({t('finalizedReservation')})
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
                  onClick={onClose}
                  className="text-gray-500 hover:text-white transition-colors p-1"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

	           <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 statistics-scrollbar stable-scrollbar transition-all duration-800 ease-in-out" style={seeThrough ? { pointerEvents: 'none', filter: 'blur(2px)' } : undefined}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Left Column */}
                <div className="space-y-3 min-w-0">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('nameOfReservation')}</label>
                    <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                      {editReservation.guestName}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('dateAndTime')}</label>
                    <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                      {new Date(editReservation.date).toLocaleDateString('en-GB')} at {editReservation.time}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('numberOfGuests')}</label>
                    <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                      {editReservation.numberOfGuests}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('status')}</label>
                    {(() => {
                      const showAsArrived =
                        editReservation.status === 'arrived' ||
                        (editReservation.status === 'cancelled' && editReservation.cleared === true);
                      return (
                        <div
                          className={`px-3 py-2 border rounded text-sm flex items-center gap-2 ${
                            showAsArrived
                              ? 'bg-green-500/10 border-green-500/20 text-green-400'
                              : editReservation.status === 'cancelled'
                              ? 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}
                        >
                          {showAsArrived ? (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20,6 9,17 4,12" />
                              </svg>
                              {t('arrived')}
                            </>
                          ) : editReservation.status === 'cancelled' ? (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 9L15 15" />
                                <path d="M15 9L9 15" />
                              </svg>
                              {t('cancelled')}
                            </>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18,6 6,18" />
                                <path d="M6,6 18,18" />
                              </svg>
                              {t('notArrived')}
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {editReservation.tableIds && editReservation.tableIds.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('tablesLabel').replace(':', '')}</label>
                      <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                        {formatTableNames(editReservation.tableIds, zoneLayouts)}
                      </div>
                    </div>
                  )}

                                  {editReservation.phone && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('phoneNumber')}</label>
                      <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                        {editReservation.phone}
                      </div>
                    </div>
                  )}

                  {editReservation.notes && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('serviceType')}</label>
                      <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                        {editReservation.notes}
                      </div>
                    </div>
                  )}
                </div>

                              {/* Right Column */}
              <div className="space-y-3 min-w-0">
                {/* Status details box – mirror Event Reservation finalized view */}
                {(() => {
                  const isNotArrivedFinal = editReservation.status === 'not_arrived';
                  const isCancelledFinal =
                    editReservation.status === 'cancelled' && !editReservation.cleared;
                  const isArrivedFinal =
                    editReservation.status === 'arrived' ||
                    (editReservation.status === 'cancelled' && editReservation.cleared === true);

                  if (isArrivedFinal) {
                    return (
                      <div className="bg-green-500/10 border border-green-500/20 rounded p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-green-400"
                          >
                            <polyline points="20,6 9,17 4,12" />
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
                    );
                  }

                  if (isNotArrivedFinal) {
                    return (
                      <div className="bg-red-500/10 border border-red-500/20 rounded p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-red-400"
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
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
                    );
                  }

                  if (isCancelledFinal) {
                    return (
                      <div className="bg-gray-500/10 border border-gray-500/20 rounded p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-gray-400"
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
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
                    );
                  }

                  return null;
                })()}

                {editReservation.email && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('notes')}</label>
                    <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white min-h-[200px]">
                      {editReservation.email || t('noAdditionalNotes')}
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>

            {/* Action buttons - Delete for all finalized reservations */}
            <div className="px-6 py-3 border-t border-gray-800 flex-shrink-0">
              <div className="flex gap-3 justify-between">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-red-400 text-sm rounded hover:bg-red-500/10 transition-colors"
                  >
                    {t('deleteReservation')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDirectPrint}
                    disabled={!isFormReady}
                    className="px-3 py-1.5 text-blue-400 text-sm rounded hover:bg-blue-500/10 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                    </svg>
                    {t('print')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>



        {/* Delete Confirmation Modal - FINALIZED VIEW */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title={t('deleteReservation')}
          message={t('deleteReservationMessage').replace('{name}', editReservation?.guestName || '')}
          confirmText={t('deleteReservation')}
          type="delete"
        />

        {/* Alert Modal - ALSO IN FINALIZED VIEW */}
        <DeleteConfirmationModal
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
        />

        {/* Print Preview Modal - FINALIZED VIEW */}
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
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 ${seeThrough ? 'bg-transparent' : 'bg-[#0A1929]'} overflow-hidden z-[1200]`}>
      <div className="w-full h-full flex flex-col p-0">
	        <div
            className="bg-[#000814] overflow-hidden flex flex-col min-h-0 h-full rounded-none shadow-none transition-opacity duration-800 ease-in-out"
            style={{ ...modalHeightStyle, opacity: seeThrough ? 0.5 : 1 }}
          >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 flex-shrink-0">
            <h2 className="text-lg font-light text-white tracking-wide">
              {editReservation ? t('editReservation') : t('addNewReservation')}
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
                onClick={onClose}
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
              {formError && (
                <div className="mb-3 rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {formError}
                </div>
              )}
              
              {/* Event transfer option - shown when reservation time overlaps with an event */}
              {overlappingEvent && !isFinalized && (
                <div 
                  className={`mb-4 rounded-lg border p-3 transition-all duration-300 ${
                    transferToEvent 
                      ? 'border-purple-500/60 bg-gradient-to-r from-purple-500/10 to-pink-500/10' 
                      : 'border-blue-500/40 bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <label className="relative flex items-center cursor-pointer mt-0.5">
                      <input
                        type="checkbox"
                        checked={transferToEvent}
                        onChange={(e) => {
                          setTransferToEvent(e.target.checked);
                          if (e.target.checked) setFormError(null);
                        }}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        transferToEvent 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-500' 
                          : isLight ? 'border-gray-400 bg-white' : 'border-gray-600 bg-gray-900'
                      }`}>
                        {transferToEvent && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </label>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${transferToEvent ? 'text-purple-300' : isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                        {currentLanguage === 'srb' 
                          ? 'Prebaci rezervaciju u Event tab' 
                          : 'Transfer reservation to Event tab'}
                      </p>
                      <div className={`mt-1 text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
                              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="font-medium text-purple-400">{overlappingEvent.name}</span>
                          </span>
                          <span className="text-gray-500">•</span>
                          <span>{overlappingEvent.startTime} - {overlappingEvent.endTime}</span>
                        </div>
                      </div>
                      {transferToEvent && (
                        <p className={`mt-2 text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                          {currentLanguage === 'srb'
                            ? '✨ Rezervacija će biti prebačena u event nakon čuvanja'
                            : '✨ Reservation will be transferred to event after saving'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Spillover option - shown for seated (arrived) reservations */}
              {isArrived && !isFinalized && (
                <div 
                  className={`mb-4 rounded-lg border p-3 transition-all duration-300 ${
                    extendToNextDay 
                      ? 'border-blue-500/60 bg-gradient-to-r from-blue-500/10 to-cyan-500/10' 
                      : isLight ? 'border-gray-300 bg-gray-50' : 'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <label className="relative flex items-center cursor-pointer mt-0.5">
                      <input
                        type="checkbox"
                        checked={extendToNextDay}
                        onChange={(e) => setExtendToNextDay(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        extendToNextDay 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 border-blue-500' 
                          : isLight ? 'border-gray-400 bg-white' : 'border-gray-600 bg-gray-900'
                      }`}>
                        {extendToNextDay && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </label>
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
                            ({currentLanguage === 'srb' ? 'sutra' : 'tomorrow'})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-3 min-w-0">
                  {/* Name of reservation */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('nameOfReservation')}</label>
                    <div className="relative">
                    <div className="relative">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={formData.guestName}
                        onChange={(e) => {
                          if (isFormReady && !isNameLocked) {
                            const wasLinked = !!selectedGuestbookId || (() => { try { return !!localStorage.getItem('respoint_selected_guestbook_id'); } catch { return false; } })();
                            setFormData({
                              ...formData,
                              guestName: e.target.value,
                              isVipGuest: false,
                              ...(wasLinked ? { mobileNumber: '', tableNumbers: [] } : {})
                            });
                            if (wasLinked) {
                            setSelectedGuestbookId(null);
                            try { localStorage.removeItem('respoint_selected_guestbook_id'); } catch {}
                            }
                            if (validationErrors.guestName) {
                              setValidationErrors(prev => ({ ...prev, guestName: '' }));
                            }
                            // Show guest suggestions when typing
                            setShowGuestSuggestions(true);
                          }
                        }}
                        onFocus={() => {
                          if (isNameLocked) return;
                          if (!suppressNameFocusOpenRef.current) setShowGuestSuggestions(true);
                          suppressNameFocusOpenRef.current = false;
                        }}
                        onBlur={() => setTimeout(() => setShowGuestSuggestions(false), 150)}
                        onKeyDown={(e) => {
                          if (!filteredGuestSuggestions.length || isNameLocked) return;
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setGuestSuggestionIndex(i => (i + 1) % filteredGuestSuggestions.length);
                            setShowGuestSuggestions(true);
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setGuestSuggestionIndex(i => (i <= 0 ? filteredGuestSuggestions.length - 1 : i - 1));
                            setShowGuestSuggestions(true);
                          } else if (e.key === 'Enter' && guestSuggestionIndex >= 0) {
                            e.preventDefault();
                            applyGuestSuggestion(filteredGuestSuggestions[guestSuggestionIndex]);
                          } else if (e.key === 'Escape') {
                            setShowGuestSuggestions(false);
                          }
                        }}
                        disabled={!isFormReady || isNameLocked}
                        placeholder={placeholders.guestName}
                        className={`w-full px-3 py-2 bg-[#0A1929] border rounded text-sm text-white focus:outline-none transition-colors placeholder-gray-500 disabled:opacity-50 ${
                          validationErrors.guestName 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-gray-800 focus:border-gray-600'
                        }`}
                      />
                      {showGuestSuggestions && filteredGuestSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-[#0A1929] border border-gray-800 rounded shadow-lg max-h-60 overflow-auto z-[9999]">
                          {filteredGuestSuggestions.map((g, idx) => (
                            <button
                              key={g.id}
                              type="button"
                              className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${
                                idx === guestSuggestionIndex ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-900'
                              }`}
                              onMouseDown={(e) => { e.preventDefault(); applyGuestSuggestion(g); }}
                              onMouseEnter={() => setGuestSuggestionIndex(idx)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-6 h-6 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${isLight ? 'bg-gray-300 text-gray-700' : 'bg-gray-700'}`}>
                                  {normalizeAvatarUrl(g.avatarUrl) ? (
                                    <img src={normalizeAvatarUrl(g.avatarUrl)} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className={`text-[10px] ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{(g.name || '?').slice(0,1)}</span>
                                  )}
                                </div>
                                <span className="truncate">{g.name}</span>
                                {g.isVip ? (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500 flex-shrink-0">
                                    <path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/>
                                  </svg>
                                ) : null}
                              </div>
                              {g.phone ? <span className="ml-2 text-xs text-gray-400">{g.phone}</span> : null}
                            </button>
                          ))}
                        </div>
                      )}
                      </div>
                      {showLoyaltyBadge && (
                        <p className="text-yellow-500 text-xs mt-1">
                          {currentLanguage === 'srb' ? 'Loyalty gost' : 'Loyalty guest'}
                        </p>
                      )}
                    </div>
                    {validationErrors.guestName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.guestName}</p>
                    )}
                  </div>

                  {/* Time of reservation */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('reservationTime')}</label>
                    <div className={`grid grid-cols-4 gap-2 ${isArrived ? 'opacity-60' : ''}`}>
                      {/* Month */}
                      <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => adjustValue('month', -1)}
                          disabled={isDateLocked || !canDecrease('month', -1)}
                          className={`p-1 transition ${
                            isDateLocked || !canDecrease('month', -1) 
                              ? 'text-gray-600 cursor-not-allowed' 
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15 18l-6-6 6-6v12z"/>
                          </svg>
                        </button>
                        <span className="text-white font-medium text-xs min-w-[40px] text-center">
                          {months[formData.month].slice(0, 3)}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustValue('month', 1)}
                          disabled={isDateLocked}
                          className={`p-1 transition ${isDateLocked ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 18l6-6-6-6v12z"/>
                          </svg>
                        </button>
                      </div>

                      {/* Day */}
                      <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => adjustValue('day', -1)}
                          disabled={isDateLocked || !canDecrease('day', -1)}
                          className={`p-1 transition ${
                            isDateLocked || !canDecrease('day', -1) 
                              ? 'text-gray-600 cursor-not-allowed' 
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15 18l-6-6 6-6v12z"/>
                          </svg>
                        </button>
                        <span className="text-white font-medium text-xs min-w-[30px] text-center">
                          {currentLanguage === 'srb' ? `${formData.day}.` : `${formData.day}th`}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustValue('day', 1)}
                          disabled={isDateLocked}
                          className={`p-1 transition ${isDateLocked ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 18l6-6-6-6v12z"/>
                          </svg>
                        </button>
                      </div>

                      {/* Hour */}
                      <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => adjustValue('hour', -1)}
                          disabled={isTimeLocked || !canDecrease('hour', -1)}
                          className={`p-1 transition ${
                            isTimeLocked || !canDecrease('hour', -1) 
                              ? 'text-gray-600 cursor-not-allowed' 
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15 18l-6-6 6-6v12z"/>
                          </svg>
                        </button>
                        <input
                          type="number"
                          value={Number(formData.hour).toString().padStart(2, '0')}
                          onChange={(e) => handleInputChange('hour', e.target.value)}
                          onFocus={(e) => handleTimeFocus('hour', e)}
                          onBlur={(e) => handleTimeBlur('hour')}
                          min="0"
                          max="23"
                          disabled={isTimeLocked}
                          className="text-white font-medium text-xs text-center bg-transparent border-none outline-none w-[30px] appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                        <button
                          type="button"
                          onClick={() => adjustValue('hour', 1)}
                          disabled={isTimeLocked}
                          className="p-1 text-gray-400 hover:text-white"
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 18l6-6-6-6v12z"/>
                          </svg>
                        </button>
                      </div>

                      {/* Minute */}
                      <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => adjustValue('minute', -1)}
                          disabled={isTimeLocked || !canDecrease('minute', -1)}
                          className={`p-1 transition ${
                            isTimeLocked || !canDecrease('minute', -1) 
                              ? 'text-gray-600 cursor-not-allowed' 
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15 18l-6-6 6-6v12z"/>
                          </svg>
                        </button>
                        <input
                          type="number"
                          value={Number(formData.minute).toString().padStart(2, '0')}
                          onChange={(e) => handleInputChange('minute', e.target.value)}
                          onFocus={(e) => handleTimeFocus('minute', e)}
                          onBlur={(e) => handleTimeBlur('minute')}
                          min="0"
                          max="59"
                          disabled={isTimeLocked}
                          className="text-white font-medium text-xs text-center bg-transparent border-none outline-none w-[35px] appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                        <button
                          type="button"
                          onClick={() => adjustValue('minute', 1)}
                          disabled={isTimeLocked}
                          className="p-1 text-gray-400 hover:text-white"
                        >
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 18l6-6-6-6v12z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Number of Guests */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('numberOfGuests')}</label>
                    <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between w-[calc(25%-0.375rem)]">
                      <button
                        type="button"
                        onClick={() => adjustValue('numberOfGuests', -1)}
                        disabled={isFinalized || formData.numberOfGuests <= 1}
                        className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
                      >
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M15 18l-6-6 6-6v12z"/>
                        </svg>
                      </button>
                      <input
                        type="number"
                        value={formData.numberOfGuests}
                        onChange={(e) => handleInputChange('numberOfGuests', e.target.value)}
                        className="text-white font-medium text-xs text-center bg-transparent border-none outline-none w-[30px] appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        disabled={isFinalized}
                      />
                      <button
                        type="button"
                        onClick={() => adjustValue('numberOfGuests', 1)}
                        disabled={isFinalized || formData.numberOfGuests >= 200}
                        className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
                      >
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 18l6-6-6-6v12z"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Zone */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('zone')}</label>
	                  <div className="flex items-center gap-0 overflow-x-auto table-number-scrollbar flex-nowrap whitespace-nowrap max-w-full">
                      {zones.map(zone => (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => isFormReady && setFormData({...formData, zone: zone.id})}
                          disabled={!isFormReady}
                          className={`px-6 py-3 font-medium text-sm transition-colors disabled:opacity-50 flex-none whitespace-nowrap ${
                            (formData.zone === zone.id) || (autoSelectedZoneIds.size > 1 && autoSelectedZoneIds.has(zone.id))
                              ? 'text-[#FFB800] border-b-2 border-[#FFB800]'
                              : 'text-gray-500 border-b-2 border-transparent hover:text-gray-300'
                          }`}
                        >
                          {zone.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table number and color */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('tableNumber')}</label>
                    <div className="space-y-2">
                      {/* Table tags */}
	                      {formData.tableNumbers.length > 0 && (
	                        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto table-number-scrollbar pb-2 flex-nowrap whitespace-nowrap max-w-full">
                          {formData.tableNumbers.map((tableNumber, index) => (
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
                          ref={tableInputRef}
                          type="text"
                          value={currentTableInput}
                          onChange={(e) => isFormReady && setCurrentTableInput(e.target.value)}
                          onKeyPress={handleTableInputKeyPress}
                          onBlur={handleAddTableNumber}
                          disabled={!isFormReady}
                          placeholder={formData.tableNumbers.length > 0 ? placeholders.addMore : placeholders.tableNumber}
                          className="flex-1 px-3 py-2 bg-transparent text-white text-sm focus:outline-none placeholder-gray-500 disabled:opacity-50"
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
                              style={{ backgroundColor: formData.tableColor }}
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
                                  color={formData.tableColor} 
                                  onChange={(color) => setFormData({...formData, tableColor: color})}
                                  style={{ width: '100%' }}
                                />
                              </div>
                              <div className="hex-input-container">
                                <div 
                                  className="hex-color-preview"
                                  style={{ backgroundColor: formData.tableColor }}
                                />
                                <input
                                  type="text"
                                  value={formData.tableColor}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                      setFormData({...formData, tableColor: value});
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
                    {selectedServiceTypes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedServiceTypes.map((selection, index) => {
                          const meta = findSuggestionMeta(selection.key);
                          const fallbackBg = isLight ? '#E5E7EB' : '#1F2937';
                          const fallbackColor = isLight ? '#111827' : '#F3F4F6';
                          return (
                            <span
                              key={`${selection.label}-${index}`}
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
                              <span className="font-medium">{selection.label}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveServiceTag(index)}
                                disabled={!isFormReady}
                                className="text-gray-400 hover:text-white transition disabled:cursor-not-allowed disabled:opacity-50"
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
                          onClick={() => {
                            if (!isFormReady) return;
                            setServiceDropdownOpen((prev) => !prev);
                          }}
                          onKeyDown={(e) => {
                            if (!isFormReady) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setServiceDropdownOpen((prev) => !prev);
                            } else if (e.key === 'Escape') {
                              setServiceDropdownOpen(false);
                            }
                          }}
                          disabled={!isFormReady}
                          aria-haspopup="listbox"
                          aria-expanded={serviceDropdownOpen}
                          className={`w-full pr-9 px-3 py-2 bg-[#0A1929] border rounded text-sm text-white transition-colors cursor-pointer placeholder-gray-500 focus:outline-none ${
                            serviceDropdownOpen ? 'border-gray-600' : 'border-gray-800 focus:border-gray-600'
                          } disabled:opacity-50`}
                          placeholder={placeholders.serviceType}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!isFormReady) return;
                            setServiceDropdownOpen((prev) => !prev);
                          }}
                          onKeyDown={(e) => {
                            if (!isFormReady) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setServiceDropdownOpen((prev) => !prev);
                            }
                          }}
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
                        <div
                          className={`relative z-10 w-full rounded-lg border ${
                             isLight ? 'border-gray-300 bg-[#0A1929]' : 'border-gray-800 bg-[#0A1929]'
                          }`}
                        >
                          <div
                            className={`px-3 py-2 border-b ${isLight ? 'border-gray-200 text-gray-500' : 'border-gray-800 text-gray-400'}`}
                          >
                            <p className="text-[11px] uppercase tracking-wide">{t('popularServiceTypes')}</p>
                          </div>
                          <div className="max-h-72 overflow-y-auto pl-1 pr-3 py-2 space-y-2 statistics-scrollbar stable-scrollbar">
                            {serviceTypeSuggestions.map((suggestion) => {
                              const isSelected = selectedServiceTypes.some((item) => item.key === suggestion.key);
                              return (
                                <button
                                  key={suggestion.key}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  disabled={!isFormReady}
                                  onClick={() => handleServiceSuggestionToggle(suggestion.key)}
                                  className={`${suggestionButtonBase} ${isSelected ? suggestionButtonSelected : ''} ${
                                    !isFormReady ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                  } w-full text-left pl-2.5 pr-2 py-1 transition-colors`}
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
                      value={formData.mobileNumber}
                      onChange={(e) => isFormReady && setFormData({...formData, mobileNumber: e.target.value})}
                      disabled={!isFormReady}
                      className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors disabled:opacity-50 placeholder-gray-500"
                      placeholder={placeholders.mobileNumber}
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3 min-w-0">
                  {/* Additional requirements */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('additionalRequirements')}</label>
                    <textarea
                      rows={14}
                      value={formData.additionalRequirements}
                      onChange={(e) => isFormReady && setFormData({...formData, additionalRequirements: e.target.value})}
                      disabled={!isFormReady}
                      className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors resize-none disabled:opacity-50 placeholder-gray-500"
                      placeholder={placeholders.additionalRequirements}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-6 py-3 border-t border-gray-800 flex-shrink-0">
              <div className="flex gap-3 justify-between">
                <div className="flex gap-3">
                  {editReservation && (
                    isArrived ? (
                      <button
                        type="button"
                        onClick={handleClearNow}
                        disabled={!isFormReady}
                        className="px-3 py-1.5 text-red-400 text-sm rounded hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cleared
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={!isFormReady}
                        className="px-3 py-1.5 text-red-400 text-sm rounded hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('cancelReservation')}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => isFormReady && handleDirectPrint()}
                    disabled={!isFormReady}
                    className="px-3 py-1.5 text-blue-400 text-sm rounded hover:bg-blue-500/10 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                    </svg>
                    {t('print')}
                  </button>
                  <button
                    type="button"
                    onClick={handleGuestbookAction}
                    disabled={
                      !isFormReady ||
                      isGuestbookBusy ||
                      (!existingGuest && (isNameLocked || !String(formData.guestName || '').trim()))
                    }
                    className="px-3 py-1.5 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      existingGuest
                        ? (currentLanguage === 'srb' ? 'Profil gosta' : 'View Guest Profile')
                        : (currentLanguage === 'srb' ? 'Dodaj u knjigu gostiju' : 'Add to Guestbook')
                    }
                  >
                    <BookOpen size={14} strokeWidth={2} />
                    <span>
                      {existingGuest
                        ? (currentLanguage === 'srb' ? 'Profil gosta' : 'View Guest Profile')
                        : (currentLanguage === 'srb' ? 'Dodaj u knjigu gostiju' : 'Add to Guestbook')}
                    </span>
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={!isFormReady}
                    className="px-4 py-1.5 text-[#FFB800] text-sm rounded hover:bg-[#FFB800]/10 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editReservation ? t('updateReservation') : t('addReservation')}
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
        </div>



        {/* Cancel Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmCancel}
          title={t('cancelReservation')}
          message={t('cancelReservationMessage').replace('{name}', editReservation?.guestName || '')}
          confirmText={t('cancelReservation')}
          type="danger"
        />

        {/* Alert Modal */}
        <DeleteConfirmationModal
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
        />

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
      </div>
    </div>
  );
};

export default ReservationForm;
