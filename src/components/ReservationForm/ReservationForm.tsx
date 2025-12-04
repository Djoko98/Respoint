import React, { useState, useContext, useEffect, useRef, useCallback, useMemo } from "react";
import { ReservationContext } from "../../context/ReservationContext";
import { ZoneContext } from "../../context/ZoneContext";
import { LayoutContext } from "../../context/LayoutContext";
import { UserContext } from "../../context/UserContext";
import { reservationsService } from "../../services/reservationsService";
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
  const { layout, zoneLayouts } = useContext(LayoutContext);
  const { user } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
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
    minute: 0,
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

  const isArrived = !!editReservation && editReservation.status === 'arrived';
  const isFinalized = editReservation && (editReservation.status === 'not_arrived' || editReservation.status === 'cancelled');
  const isTimeLocked = isArrived;
  const isDateLocked = isArrived;
  const isNameLocked = isArrived;

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
        // Find table numbers from table IDs - search in all zones
        const allTables = Object.values(zoneLayouts || {}).flatMap(l => l.tables || []);
        const tableNumbers: string[] = editReservation.tableIds?.map((tableId: string) => {
          const table = allTables.find(t => t.id === tableId);
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

  // Re-populate form when switching between "add" and "edit" without closing the modal
  useEffect(() => {
    if (!isOpen) return;
    const currentId = (editReservation && (editReservation as any).id) ? String((editReservation as any).id) : null;
    if (lastEditIdRef.current === currentId) return;
    lastEditIdRef.current = currentId;
    try {
      if (editReservation) {
        const allTables = Object.values(zoneLayouts || {}).flatMap(l => (l as any)?.tables || []) as Array<any>;
        const tableNumbers: string[] = editReservation.tableIds?.map((tableId: string) => {
          const table = allTables.find(t => t.id === tableId);
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
    // Prefer phone match (>=5 digits), else exact normalized name match
    const byPhone =
      phoneQuery && phoneQuery.length >= 5
        ? guestbookEntries.find(e => normalizePhone(e.phone) === phoneQuery)
        : null;
    if (byPhone) return byPhone;
    if (!guestNameQuery) return null;
    const byName = guestbookEntries.find(e => normalizeText(e.name || '') === guestNameQuery);
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
      for (const [zoneId, layout] of Object.entries(zoneLayouts || {})) {
        const tables = Array.isArray((layout as any)?.tables) ? (layout as any).tables : [];
        const found = tables.some((t: any) => (t?.name === target) || (String(t?.number ?? '') === target));
        if (found) return zoneId;
      }
    } catch {}
    return null;
  }, [zoneLayouts]);

  // Auto-select zones based on entered table numbers
  const autoSelectedZoneIds = useMemo(() => {
    const result = new Set<string>();
    try {
      const nums = (formData.tableNumbers || []).map(n => String(n || '').trim()).filter(Boolean);
      if (nums.length === 0) return result;
      Object.entries(zoneLayouts || {}).forEach(([zoneId, layout]) => {
        const tables = Array.isArray((layout as any)?.tables) ? (layout as any).tables : [];
        const matches = nums.some(num => tables.some((t: any) => (t?.name === num) || (String(t?.number ?? '') === num)));
        if (matches) result.add(zoneId);
      });
    } catch {}
    return result;
  }, [formData.tableNumbers, zoneLayouts]);

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
    const allTables = Object.values(zoneLayouts || {}).flatMap(l => (l as any)?.tables || []) as Array<any>;
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
        mobileNumber: prev.mobileNumber || entry.phone || '',
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
    return Object.keys(errors).length === 0;
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
        showAlert(
          t('invalidDateTime'),
          t('invalidDateTimeMessage'),
          'error'
        );
        return;
      }
    }
    
    // Find tables by numbers across ALL zones to allow multi-zone reservations
    const allTables = Object.values(zoneLayouts || {}).flatMap(l => l.tables || []) as Array<any>;
    const tableIds = formData.tableNumbers
      .map(tableNumber => {
        const table = allTables.find(t => t.name === tableNumber || t.number?.toString() === tableNumber);
        return table ? table.id : null;
      })
      .filter(id => id !== null) as string[];
      
    console.log('🏷️ Selected table IDs:', tableIds);
      
    // VALIDATION: Check for double booking
    const otherReservations = reservations.filter(
      r => activeStatuses.has(r.status) && !(editReservation && r.id === editReservation.id)
    );

    const adjustmentsForDate = getAdjustmentsForDate(date);
    const newStartMin = timeStringToMinutes(time);
    const newEndMin = Math.min(1440, newStartMin + estimateDurationMinutes(formData.numberOfGuests));

    for (const tableId of tableIds) {
      const conflictingReservation = otherReservations.find(r => {
        if (r.date !== date) return false;
        if (!Array.isArray(r.tableIds) || !r.tableIds.includes(tableId)) return false;
        const range = getReservationRange(r, adjustmentsForDate);
        return newStartMin < range.endMin && range.startMin < newEndMin;
      });

      if (conflictingReservation) {
        const conflictingRange = getReservationRange(conflictingReservation, adjustmentsForDate);
        const conflictingTable = allTables.find(t => t.id === tableId);
        const message = `${t('tableUnavailableMessage')
          .replace('{table}', String(conflictingTable?.name || conflictingTable?.number || ''))
          .replace('{time}', `${formatMinutesToTime(conflictingRange.startMin)}-${formatMinutesToTime(conflictingRange.endMin)}`)
          .replace('{guest}', conflictingReservation.guestName)}`;
        showAlert(
          t('tableUnavailable'),
          message,
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
      await updateReservation(editReservation.id, { status: 'cancelled', cleared: true } as any);
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
    
    if (editReservation) {
      // For editing mode, use existing reservation data
      reservationData = {
        guestName: editReservation.guestName,
        date: editReservation.date,
        time: editReservation.time,
        numberOfGuests: editReservation.numberOfGuests,
        tableNumber: editReservation.tableIds?.map((tableId: string) => {
          const allTables = Object.values(zoneLayouts || {}).flatMap(l => l.tables || []);
          const table = allTables.find(t => t.id === tableId);
          return table ? (table.name || table.number?.toString() || "") : "";
        }).join(', ') || "",
        serviceType: localizeServiceType(editReservation.notes),
        additionalRequirements: editReservation.email,
        restaurantName: user?.restaurantName,
        restaurantAddress: user?.address,
        logoUrl: user?.printLogoUrl || user?.logo
      };
    } else {
      // For new reservation, use form data
      const date = `${new Date().getFullYear()}-${(formData.month + 1).toString().padStart(2, '0')}-${formData.day.toString().padStart(2, '0')}`;
      const time = `${Number(formData.hour).toString().padStart(2, '0')}:${Number(formData.minute).toString().padStart(2, '0')}`;
      
      reservationData = {
        guestName: formData.guestName,
        date: date,
        time: time,
        numberOfGuests: formData.numberOfGuests,
        tableNumber: formData.tableNumbers.join(', '),
        serviceType: localizeServiceType(formData.serviceType),
        additionalRequirements: formData.additionalRequirements,
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

    const allTables = Object.values(zoneLayouts || {}).flatMap(l => l.tables || []);
    const tableExists = allTables.some(t => t.name === newTableNumber || t.number?.toString() === newTableNumber);

    if (tableExists) {
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
                {editReservation.email && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('notes')}</label>
                      <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white min-h-[200px]">
                        {editReservation.email || t('noAdditionalNotes')}
                      </div>
                    </div>
                  )}

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400">
                        <path d="m21,5l-3,16l-6,-3l-6,3l3,-16z"/>
                      </svg>
                      <span className="text-yellow-400 font-medium">{t('finalizedReservation')}</span>
                    </div>
                    <p className="text-yellow-500/80 text-sm">
                      {t('finalizedReservationDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons - Clear for arrived, Delete otherwise */}
            <div className="px-6 py-3 border-t border-gray-800 flex-shrink-0">
              <div className="flex gap-3 justify-between">
                <div className="flex gap-3">
                  {editReservation.status === 'arrived' ? (
                    <button
                      type="button"
                      onClick={handleClearNow}
                      className="px-3 py-1.5 text-red-400 text-sm rounded hover:bg-red-500/10 transition-colors"
                    >
                      Clear
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-3 py-1.5 text-red-400 text-sm rounded hover:bg-red-500/10 transition-colors"
                    >
                      {t('deleteReservation')}
                    </button>
                  )}
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
                          {formData.day}th
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
                    title={existingGuest ? 'View Guest Profile' : 'Add to Guestbook'}
                  >
                    <BookOpen size={14} strokeWidth={2} />
                    <span>{existingGuest ? 'View Guest Profile' : 'Add to Guestbook'}</span>
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
