import React, { useState, useContext, useEffect, useRef, useCallback } from "react";
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
  const { t } = useLanguage();
  const { addReservation, updateReservation, deleteReservation, reservations, fetchReservations } = useContext(ReservationContext);
  const { zones, currentZone } = useContext(ZoneContext);
  const { layout, zoneLayouts } = useContext(LayoutContext);
  const { user } = useContext(UserContext);
  
  // Refs for DOM ready checks
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const tableInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);
  const domReadyRef = useRef(false);

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
    status: 'waiting' as const
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
  
  // Form validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

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
          status: editReservation.status || 'waiting'
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
          status: 'waiting' as const
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
  }, []);

  // Buffer for prefill payload until form ready (must persist across renders)
  const pendingPrefillRef = useRef<any | null>(null);

  useEffect(() => {
    const onPrefill = (e: any) => {
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
        serviceType: prev.serviceType
      }));
    };
    window.addEventListener('prefill-reservation', onPrefill as any);
    return () => window.removeEventListener('prefill-reservation', onPrefill as any);
  }, [isFormReady]);

  // Apply buffered prefill once form becomes ready
  useEffect(() => {
    if (isFormReady && pendingPrefillRef.current) {
      const d = pendingPrefillRef.current;
      pendingPrefillRef.current = null;
      setFormData(prev => ({
        ...prev,
        guestName: d.guestName || prev.guestName,
        mobileNumber: d.phone || prev.mobileNumber
      }));
    }
  }, [isFormReady]);

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

  // Separate effect for focus management with proper cleanup
  useEffect(() => {
    if (!isFormReady || !nameInputRef.current) return;
    
    const timeout = setTimeout(() => {
      if (nameInputRef.current && nameInputRef.current.isConnected) {
        try {
          console.log('🎯 Attempting to focus guest name input (setTimeout)');
          nameInputRef.current.focus();
          console.log('✅ Focus successful, active element:', document.activeElement);
        } catch (error) {
          console.warn('❌ Focus failed:', error);
        }
      }
    }, 0);
    
    return () => clearTimeout(timeout);
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

  // Check if reservation is finalized (arrived, not_arrived, or cancelled)
  const isFinalized = editReservation && (editReservation.status === 'arrived' || editReservation.status === 'not_arrived' || editReservation.status === 'cancelled');

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
    const date = `${year}-${monthString}-${dayString}`;

    // Format time  
    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    console.log('📅 Formatted date:', date);
    console.log('⏰ Formatted time:', time);
    
    // Validate that the reservation is in the future
    const [resHour, resMinute] = time.split(":").map(Number);
    const reservationDateTime = new Date(year, formData.month, formData.day, resHour, resMinute, 0, 0);
    const now = new Date();
    
    if (reservationDateTime <= now) {
      showAlert(
        t('invalidDateTime'),
        t('invalidDateTimeMessage'),
        'error'
      );
      return;
    }
    
    // Find tables by numbers and get their IDs
    const allTables = Object.values(zoneLayouts || {}).flatMap(l => l.tables || []);
    const tableIds = formData.tableNumbers
      .map(tableNumber => {
        const table = allTables.find(t => t.name === tableNumber || t.number?.toString() === tableNumber);
        return table ? table.id : null;
      })
      .filter(id => id !== null) as string[];
      
    console.log('🏷️ Selected table IDs:', tableIds);
      
    // VALIDATION: Check for double booking
    const otherReservations = reservations.filter(
      r => r.status !== 'cancelled' && !(editReservation && r.id === editReservation.id)
    );

    for (const tableId of tableIds) {
      const conflictingReservation = otherReservations.find(r => 
        r.tableIds?.includes(tableId) && r.date === date && r.time === time
      );

      if (conflictingReservation) {
        const conflictingTable = allTables.find(t => t.id === tableId);
        const message = String(t('tableUnavailableMessage'))
          .replace('{table}', String(conflictingTable?.name || conflictingTable?.number || ''))
          .replace('{time}', time)
          .replace('{guest}', conflictingReservation.guestName);
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
        serviceType: editReservation.notes,
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
        serviceType: formData.serviceType,
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
      setFormData(prev => ({
        ...prev,
        tableNumbers: [...prev.tableNumbers, newTableNumber]
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
    
    setFormData(prev => ({
      ...prev,
      tableNumbers: prev.tableNumbers.filter(num => num !== tableNumber)
    }));
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
      <div className="w-full h-full bg-[#0A1929] overflow-hidden">
        <div className="w-full h-full max-w-4xl mx-auto flex flex-col p-4">
          <div className="bg-[#000814] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 flex-shrink-0">
              <h2 className="text-lg font-light text-white tracking-wide">
                {t('reservationDetails')} ({t('finalizedReservation')})
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 statistics-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                {/* Left Column */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('nameOfReservation')}</label>
                    <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                      {editReservation.guestName}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('dateAndTime')}</label>
                    <div className="px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white">
                      {new Date(editReservation.date).toLocaleDateString()} at {editReservation.time}
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
                    <div className={`px-3 py-2 border rounded text-sm flex items-center gap-2 ${
                      editReservation.status === 'arrived' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : editReservation.status === 'cancelled'
                        ? 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {editReservation.status === 'arrived' ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                          {t('arrived')}
                        </>
                      ) : editReservation.status === 'cancelled' ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 9L15 15"/>
                            <path d="M15 9L9 15"/>
                          </svg>
                          {t('cancelled')}
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18,6 6,18"/>
                            <path d="M6,6 18,18"/>
                          </svg>
                          {t('notArrived')}
                        </>
                      )}
                    </div>
                  </div>

                                  {editReservation.tableIds && editReservation.tableIds.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('tables')}</label>
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
                </div>

                              {/* Right Column */}
              <div className="space-y-3">
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
                    <p className="text-yellow-300/80 text-sm">
                      {t('finalizedReservationDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons - Only Delete */}
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
    <div className="w-full h-full bg-[#0A1929] overflow-hidden">
      <div className="w-full h-full max-w-4xl mx-auto flex flex-col p-4">
        <div className="bg-[#000814] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 flex-shrink-0">
            <h2 className="text-lg font-light text-white tracking-wide">
              {editReservation ? t('editReservation') : t('addNewReservation')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 statistics-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-3">
                  {/* Name of reservation */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('nameOfReservation')}</label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={formData.guestName}
                      onChange={(e) => {
                        if (isFormReady) {
                          setFormData({...formData, guestName: e.target.value});
                          if (validationErrors.guestName) {
                            setValidationErrors(prev => ({ ...prev, guestName: '' }));
                          }
                        }
                      }}
                      disabled={!isFormReady}
                      className={`w-full px-3 py-2 bg-[#0A1929] border rounded text-sm text-white focus:outline-none transition-colors disabled:opacity-50 ${
                        validationErrors.guestName 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-gray-800 focus:border-gray-600'
                      }`}
                    />
                    {validationErrors.guestName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.guestName}</p>
                    )}
                  </div>

                  {/* Time of reservation */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('reservationTime')}</label>
                    <div className="grid grid-cols-4 gap-2">
                      {/* Month */}
                      <div className="bg-[#0A1929] border border-gray-800 rounded p-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => adjustValue('month', -1)}
                          disabled={!canDecrease('month', -1)}
                          className={`p-1 transition ${
                            !canDecrease('month', -1) 
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
                          className="p-1 text-gray-400 hover:text-white"
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
                          disabled={!canDecrease('day', -1)}
                          className={`p-1 transition ${
                            !canDecrease('day', -1) 
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
                          className="p-1 text-gray-400 hover:text-white"
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
                          disabled={!canDecrease('hour', -1)}
                          className={`p-1 transition ${
                            !canDecrease('hour', -1) 
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
                          className="text-white font-medium text-xs text-center bg-transparent border-none outline-none w-[30px] appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                        <button
                          type="button"
                          onClick={() => adjustValue('hour', 1)}
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
                          disabled={!canDecrease('minute', -1)}
                          className={`p-1 transition ${
                            !canDecrease('minute', -1) 
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
                          className="text-white font-medium text-xs text-center bg-transparent border-none outline-none w-[35px] appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                        <button
                          type="button"
                          onClick={() => adjustValue('minute', 1)}
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
                    <div className="flex">
                      {zones.map(zone => (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => isFormReady && setFormData({...formData, zone: zone.id})}
                          disabled={!isFormReady}
                          className={`flex-1 py-3 font-medium text-sm transition-colors disabled:opacity-50 ${
                            formData.zone === zone.id
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
                        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto table-number-scrollbar pb-2">
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
                          placeholder={formData.tableNumbers.length > 0 ? t('addTable') + "..." : t('tableNumber') + "..."}
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
                            <span className="text-gray-400 text-xs whitespace-nowrap select-none">Boja stola</span>
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
                                <span className="text-gray-400 text-sm font-medium">Izaberi boju stola</span>
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
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('serviceType')}</label>
                    <input
                      type="text"
                      value={formData.serviceType}
                      onChange={(e) => isFormReady && setFormData({...formData, serviceType: e.target.value})}
                      disabled={!isFormReady}
                      className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors disabled:opacity-50"
                    />
                  </div>

                  {/* Mobile number */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('mobileNumber')}</label>
                    <input
                      type="tel"
                      value={formData.mobileNumber}
                      onChange={(e) => isFormReady && setFormData({...formData, mobileNumber: e.target.value})}
                      disabled={!isFormReady}
                      className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  {/* Additional requirements */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('additionalRequirements')}</label>
                    <textarea
                      rows={14}
                      value={formData.additionalRequirements}
                      onChange={(e) => isFormReady && setFormData({...formData, additionalRequirements: e.target.value})}
                      disabled={!isFormReady}
                      className="w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors resize-none disabled:opacity-50"
                      placeholder={t('additionalRequirements')}
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
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={!isFormReady}
                      className="px-3 py-1.5 text-red-400 text-sm rounded hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('cancelReservation')}
                    </button>
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
