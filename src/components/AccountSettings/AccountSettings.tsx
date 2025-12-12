import React, { useState, useContext, useCallback, useMemo } from 'react';
import { UserContext } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { User, RoleConfigEntry } from '../../types/user';
import { saveToStorage, loadFromStorage } from '../../utils/storage';
import { storageService } from '../../services/storageService';
import { authService } from '../../services/authService';
import { updaterService } from '../../services/updaterService';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';
import RestaurantInfoSection from './RestaurantInfoSection';
import OwnerInfoSection from './OwnerInfoSection';
import ContactInfoSection from './ContactInfoSection';
import PreferencesSection from './PreferencesSection';
import AdvancedOptionsSection from './AdvancedOptionsSection';
import PrinterSettingsSection from './PrinterSettingsSection';
import RolePasswordsSection from './RolePasswordsSection';
import { ThemeContext } from '../../context/ThemeContext';

interface AccountSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const cloneRoleConfig = (roles?: RoleConfigEntry[]) =>
  roles ? roles.map(role => ({ ...role, permissions: [...role.permissions] })) : [];

const AccountSettings: React.FC<AccountSettingsProps> = React.memo(({ isOpen, onClose }) => {
  const { user, setUser } = useContext(UserContext);
  const { t, setLanguage } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const isLight = theme === 'light';

  // Initialize form state with user data
  const [formData, setFormData] = useState({
    restaurantName: user?.restaurantName || '',
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    logo: user?.logo || '',
    printLogoUrl: user?.printLogoUrl || '', // Print logo URL
    logoLightUrl: user?.logoLightUrl || '',
    timezone: user?.timezone || 'Europe/Belgrade',
    language: user?.language || 'eng',
    autoArchive: user?.autoArchive ?? true,
    adminPin: '',
    managerPin: '',
    waiterPin: '',
    roleConfig: cloneRoleConfig(user?.roleConfig),
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isPrintLogoUploading, setIsPrintLogoUploading] = useState(false);
  const [isLightLogoUploading, setIsLightLogoUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'none' | 'error'>('idle');
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>('restaurant');
  const [suppressScrollSpy, setSuppressScrollSpy] = useState(false);

  // Refs for section anchors (GitHub-style layout)
  const restaurantRef = React.useRef<HTMLDivElement | null>(null);
  const ownerRef = React.useRef<HTMLDivElement | null>(null);
  const contactRef = React.useRef<HTMLDivElement | null>(null);
  const preferencesRef = React.useRef<HTMLDivElement | null>(null);
  const printerRef = React.useRef<HTMLDivElement | null>(null);
  const rolesRef = React.useRef<HTMLDivElement | null>(null);
  const advancedRef = React.useRef<HTMLDivElement | null>(null);
  const contentScrollRef = React.useRef<HTMLDivElement | null>(null);
  const scrollSpyTimeoutRef = React.useRef<number | null>(null);
  const ignoreNextScrollRef = React.useRef<boolean>(false);
  
  // GLOBAL MODAL INPUT LOCK FIX: Delayed modal content rendering
  const [showModalContent, setShowModalContent] = useState(false);
  
  // Confirmation modals
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  
  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'error' as 'info' | 'error' | 'success'
  });
  
  // Add useEffect at the top of the component
  React.useEffect(() => {
    if (isOpen) {
      console.log('🚀 AccountSettings opening with delayed content rendering...');
      console.log('📍 Active element on modal open:', document.activeElement);
      const timeout = setTimeout(() => setShowModalContent(true), 0);
      return () => clearTimeout(timeout);
    } else {
      setShowModalContent(false);
    }
  }, [isOpen]);

  // When modal opens, reset active section and scroll to top
  React.useEffect(() => {
    if (!isOpen) return;
    setActiveSectionId('restaurant');
    try {
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTop = 0;
      }
    } catch {
      // ignore scroll errors
    }
  }, [isOpen]);

  // Load user data including logo when modal opens
  React.useEffect(() => {
    if (isOpen && user) {
      console.log('📂 Loading Account Settings with user logo:', user.logo);
      
      setFormData({
        restaurantName: user?.restaurantName || '',
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
        logo: user?.logo || '', // Logo URL se učitava iz user objekta (iz logo kolone)
        printLogoUrl: user?.printLogoUrl || '', // Print logo URL za štampanje
        logoLightUrl: user?.logoLightUrl || '',
        timezone: user?.timezone || 'Europe/Belgrade',
        language: user?.language || 'eng',
        autoArchive: user?.autoArchive ?? true,
        roleConfig: cloneRoleConfig(user?.roleConfig),
      });
      setHasChanges(false);
    }
  }, [isOpen, user]);

  // Dispatch global modal open/close events so other layers (e.g., timeline) react properly
  React.useEffect(() => {
    if (!isOpen) return;
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    return () => { try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {} };
  }, [isOpen]);

  // Memoized timezone options
  const timezones = useMemo(() => [
    { value: 'Europe/Belgrade', label: 'Europe/Belgrade (CET)' },
    { value: 'Europe/London', label: 'Europe/London (GMT)' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
    { value: 'America/New_York', label: 'America/New York (EST)' },
    { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  ], []);

  // Helper function to show alert modal - memoized with useCallback
  const showAlert = useCallback((title: string, message: string, type: 'info' | 'error' | 'success' = 'error') => {
    setAlertConfig({ title, message, type });
    setShowAlertModal(true);
  }, []);

  // React to external section changes (e.g., POS footer saved) to enable Save Changes
  React.useEffect(() => {
    const onExternalChange = () => setHasChanges(true);
    try {
      window.addEventListener('account-settings-changed', onExternalChange as any);
    } catch {}
    return () => {
      try {
        window.removeEventListener('account-settings-changed', onExternalChange as any);
      } catch {}
    };
  }, []);

  // Optimized input change handler
  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  }, []);

  // Optimized password change handler  
  const handlePasswordChange = useCallback((field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Optimized logo upload handler
  const handleLogoUpload = useCallback(async (file: File) => {
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      showAlert(
        'Invalid File Type',
        'Please upload an image file (PNG or JPG)',
        'error'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showAlert(
        'File Too Large',
        'File size must be less than 5MB',
        'error'
      );
      return;
    }

    setIsUploading(true);
    
    try {
      // Upload file to Supabase Storage
      const logoUrl = await storageService.uploadLogo(user.id, file);
      
      if (logoUrl) {
        console.log('✅ Logo uploaded successfully to URL:', logoUrl);
        
        // Update form data with new logo URL + timestamp to avoid cache issues
        const timestampedUrl = `${logoUrl}?v=${Date.now()}`;
        setFormData(prev => ({
          ...prev,
          logo: timestampedUrl
        }));
        setHasChanges(true);
        
        console.log('📝 Form data updated with logo URL:', timestampedUrl);
        
        showAlert(
          'Upload Successful',
          'Logo uploaded and saved successfully',
          'success'
        );
      } else {
        showAlert(
          'Upload Error',
          'Error uploading logo. Please try again.',
          'error'
        );
      }
    } catch (error) {
      console.error('Upload error:', error);
      showAlert(
        'Upload Error',
        'Error uploading file',
        'error'
      );
    } finally {
      setIsUploading(false);
    }
  }, [user?.id, showAlert]);

  // Optimized remove logo handler
  const handleRemoveLogo = useCallback(async () => {
    console.log('🗑️ Remove logo requested, current logo:', formData.logo);
    
    // If there's a Supabase Storage URL, delete the file
    if (formData.logo && formData.logo.includes('restaurant-logos')) {
      try {
        console.log('🗑️ Deleting logo file from storage...');
        // Remove timestamp params from URL before deletion
        const cleanUrl = formData.logo.split('?')[0];
        const deleteSuccess = await storageService.deleteLogo(cleanUrl);
        
        if (!deleteSuccess) {
          console.error('❌ Failed to delete logo from storage');
          showAlert(
            'Delete Error',
            'Failed to remove logo file from storage',
            'error'
          );
          return;
        }
        
        console.log('✅ Logo file deleted from storage successfully');
      } catch (error) {
        console.error('❌ Error deleting logo:', error);
        showAlert(
          'Delete Error',
          'Error removing logo file',
          'error'
        );
        return;
      }
    }
    
    // Update form data to remove logo URL
    setFormData(prev => ({
      ...prev,
      logo: ''
    }));
    setHasChanges(true);
    
    console.log('✅ Logo removed from form data');
    
    showAlert(
      'Logo Removed',
      'Logo removed successfully',
      'success'
    );
  }, [formData.logo, showAlert]);

  // Upload light theme logo handler
  const handleLightLogoUpload = useCallback(async (file: File) => {
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      showAlert(
        'Invalid File Type',
        'Please upload an image file (PNG or JPG)',
        'error'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showAlert(
        'File Too Large',
        'File size must be less than 5MB',
        'error'
      );
      return;
    }

    setIsLightLogoUploading(true);
    try {
      const lightUrl = await storageService.uploadLightLogo(user.id, file);
      if (lightUrl) {
        const timestampedUrl = `${lightUrl}?v=${Date.now()}`;
        setFormData(prev => ({ ...prev, logoLightUrl: timestampedUrl }));
        setHasChanges(true);
        showAlert('Upload Successful', 'Logo uploaded and saved successfully', 'success');
      } else {
        showAlert('Upload Error', 'Error uploading logo. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Light logo upload error:', error);
      showAlert('Upload Error', 'Error uploading file', 'error');
    } finally {
      setIsLightLogoUploading(false);
    }
  }, [user?.id, showAlert]);

  // Remove light theme logo handler
  const handleRemoveLightLogo = useCallback(async () => {
    console.log('🗑️ Remove light theme logo requested, current:', formData.logoLightUrl);
    if (formData.logoLightUrl && formData.logoLightUrl.includes('restaurant-logos')) {
      try {
        const cleanUrl = formData.logoLightUrl.split('?')[0];
        const ok = await storageService.deleteLightLogo(cleanUrl);
        if (!ok) {
          showAlert('Delete Error', 'Failed to remove logo file from storage', 'error');
          return;
        }
      } catch (e) {
        console.error('❌ Error deleting light logo:', e);
        showAlert('Delete Error', 'Error removing logo file', 'error');
        return;
      }
    }
    setFormData(prev => ({ ...prev, logoLightUrl: '' }));
    setHasChanges(true);
    showAlert('Logo Removed', 'Logo removed successfully', 'success');
  }, [formData.logoLightUrl, showAlert]);

  // Optimized change password handler
  const handleChangePassword = useCallback(async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showAlert(
        'Password Mismatch',
        'New passwords do not match',
        'error'
      );
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showAlert(
        'Password Too Short',
        'Password must be at least 6 characters long',
        'error'
      );
      return;
    }

    try {
      const result = await authService.updatePassword(passwordData.newPassword);
      
      if (result.success) {
        showAlert(
          'Password Updated',
          'Password changed successfully',
          'success'
        );
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        showAlert(
          'Password Error',
          result.error || 'Error changing password',
          'error'
        );
      }
    } catch (error) {
      console.error('Password change error:', error);
      showAlert(
        'Password Error',
        'Error changing password',
        'error'
      );
    }
  }, [passwordData, showAlert]);

  // Optimized save handler
  const handleSave = useCallback(async () => {
    if (!user) return;

    try {
      console.log('💾 Saving profile with logo URL:', formData.logo);
      
      // Clean logo URL from timestamp parameters before saving
      const cleanLogoUrl = formData.logo ? formData.logo.split('?')[0] : '';
      const cleanPrintLogoUrl = formData.printLogoUrl ? formData.printLogoUrl.split('?')[0] : '';
      const cleanLogoLightUrl = formData.logoLightUrl ? formData.logoLightUrl.split('?')[0] : '';
      const normalizedRoleConfig = (formData.roleConfig || []).map(role => ({
        id: role.id,
        name: role.name.trim(),
        permissions: [...(role.permissions || [])],
        pinHash: role.pinHash || null
      }));
      
      // Build update payload, allowing explicit nulls to clear PINs
      const updatePayload: any = {
        restaurant_name: formData.restaurantName,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        logo: cleanLogoUrl, // Save clean URL without timestamp
        print_logo_url: cleanPrintLogoUrl, // Save clean print logo URL
        logo_light_url: cleanLogoLightUrl,
        timezone: formData.timezone,
        language: formData.language,
        auto_archive: formData.autoArchive,
        role_config: normalizedRoleConfig
      };

      // Include pin fields if they were provided, even if null (to clear)
      if (Object.prototype.hasOwnProperty.call(formData as any, 'admin_pin_hash')) {
        (updatePayload as any).admin_pin_hash = (formData as any).admin_pin_hash;
      }
      if (Object.prototype.hasOwnProperty.call(formData as any, 'manager_pin_hash')) {
        (updatePayload as any).manager_pin_hash = (formData as any).manager_pin_hash;
      }
      if (Object.prototype.hasOwnProperty.call(formData as any, 'waiter_pin_hash')) {
        (updatePayload as any).waiter_pin_hash = (formData as any).waiter_pin_hash;
      }

      // Update profile in Supabase database
      const result = await authService.updateProfile(user.id, updatePayload);

      if (result.success) {
        // Force logo refresh by adding version parameter for immediate UI update
        const logoWithVersion = cleanLogoUrl ? `${cleanLogoUrl}?v=${Date.now()}` : '';
        const printLogoWithVersion = cleanPrintLogoUrl ? `${cleanPrintLogoUrl}?v=${Date.now()}` : '';
        const logoLightWithVersion = cleanLogoLightUrl ? `${cleanLogoLightUrl}?v=${Date.now()}` : '';
        
        // Determine updated PIN flags; only change flags for fields that were provided
        const adminPinSet = Object.prototype.hasOwnProperty.call(formData as any, 'admin_pin_hash')
          ? Boolean((formData as any).admin_pin_hash)
          : user.hasAdminPin;
        const managerPinSet = Object.prototype.hasOwnProperty.call(formData as any, 'manager_pin_hash')
          ? Boolean((formData as any).manager_pin_hash)
          : user.hasManagerPin;
        const waiterPinSet = Object.prototype.hasOwnProperty.call(formData as any, 'waiter_pin_hash')
          ? Boolean((formData as any).waiter_pin_hash)
          : user.hasWaiterPin;

        const updatedUser: User = {
          ...user,
          ...formData,
          logo: logoWithVersion, // Use versioned URL for immediate refresh, but save clean URL to DB
          printLogoUrl: printLogoWithVersion, // Use versioned print logo URL for immediate refresh
          logoLightUrl: logoLightWithVersion,
          hasAdminPin: adminPinSet,
          hasManagerPin: managerPinSet,
          hasWaiterPin: waiterPinSet,
          roleConfig: normalizedRoleConfig,
        };
        setUser(updatedUser);

        // Update language immediately if it changed
        if (formData.language !== user.language) {
          setLanguage(formData.language);
        }

        // Still maintain local storage for compatibility
        const users = loadFromStorage<any[]>('restaurant-users', []);
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          users[userIndex] = { ...users[userIndex], ...formData, logo: cleanLogoUrl, printLogoUrl: cleanPrintLogoUrl, logoLightUrl: cleanLogoLightUrl };
          saveToStorage('restaurant-users', users);
        }

        setHasChanges(false);
        
        // Close modal immediately after saving
          onClose();
      } else {
        showAlert(
          'Save Error',
          result.error || 'Error saving changes. Please try again.',
          'error'
        );
      }
    } catch (error) {
      console.error('Save error:', error);
      showAlert(
        'Save Error',
        'Error saving changes',
        'error'
      );
    }
  }, [user, formData, setUser, onClose, showAlert]);

  // Optimized cancel handler
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedChangesModal(true);
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // Optimized confirm discard changes
  const confirmDiscardChanges = useCallback(() => {
    if (!user) return;
    
    setFormData({
      restaurantName: user?.restaurantName || '',
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      logo: user?.logo || '',
      printLogoUrl: user?.printLogoUrl || '', // Print logo URL za štampanje
      logoLightUrl: user?.logoLightUrl || '',
      timezone: user?.timezone || 'Europe/Belgrade',
      language: user?.language || 'eng',
      autoArchive: user?.autoArchive ?? true,
      roleConfig: cloneRoleConfig(user?.roleConfig),
    });
    setHasChanges(false);
    onClose();
  }, [user, onClose]);

  // Optimized deactivate account handler
  const handleDeactivateAccount = useCallback(() => {
    setShowDeactivateModal(true);
  }, []);

  const confirmDeactivateAccount = useCallback(() => {
    console.log('Account deactivation requested');
    // Add actual deactivation logic here
  }, []);

  // Optimized export data handler
  const handleExportData = useCallback(() => {
    const exportData = {
      user: user,
      exportDate: new Date().toISOString(),
      // Add other relevant data here
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `respoint_data_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [user]);

  // Manual "Check for updates" handler (inline status in Advanced Options)
  const handleCheckForUpdates = useCallback(async () => {
    try {
      setUpdateStatus('checking');
      setUpdateVersion(null);

      const handle = await updaterService.checkForUpdate();

      if (handle) {
        setUpdateStatus('available');
        setUpdateVersion(handle.version || null);
      } else {
        setUpdateStatus('none');
        setUpdateVersion(null);
      }
    } catch (err) {
      console.error('Update check failed:', err);
      setUpdateStatus('error');
      setUpdateVersion(null);
    }
  }, []);

  // Optimized print logo upload handler
  const handlePrintLogoUpload = useCallback(async (file: File) => {
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      showAlert(
        'Invalid File Type',
        'Please upload an image file (PNG or JPG)',
        'error'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showAlert(
        'File Too Large',
        'File size must be less than 5MB',
        'error'
      );
      return;
    }

    setIsPrintLogoUploading(true);
    
    try {
      // Upload file to Supabase Storage
      const printLogoUrl = await storageService.uploadPrintLogo(user.id, file);
      
      if (printLogoUrl) {
        console.log('✅ Print logo uploaded successfully to URL:', printLogoUrl);
        
        // Update form data with new print logo URL + timestamp to avoid cache issues
        const timestampedUrl = `${printLogoUrl}?v=${Date.now()}`;
        setFormData(prev => ({
          ...prev,
          printLogoUrl: timestampedUrl
        }));
        setHasChanges(true);
        
        console.log('📝 Form data updated with print logo URL:', timestampedUrl);
        
        showAlert(
          'Upload Successful',
          'Print logo uploaded and saved successfully',
          'success'
        );
      } else {
        showAlert(
          'Upload Error',
          'Error uploading print logo. Please try again.',
          'error'
        );
      }
    } catch (error) {
      console.error('Print logo upload error:', error);
      showAlert(
        'Upload Error',
        'Error uploading print logo file',
        'error'
      );
    } finally {
      setIsPrintLogoUploading(false);
    }
  }, [user?.id, showAlert]);

  // Optimized remove print logo handler
  const handleRemovePrintLogo = useCallback(async () => {
    console.log('🗑️ Remove print logo requested, current print logo:', formData.printLogoUrl);
    
    // If there's a Supabase Storage URL, delete the file
    if (formData.printLogoUrl && formData.printLogoUrl.includes('restaurant-logos')) {
      try {
        console.log('🗑️ Deleting print logo file from storage...');
        // Remove timestamp params from URL before deletion
        const cleanUrl = formData.printLogoUrl.split('?')[0];
        const deleteSuccess = await storageService.deletePrintLogo(cleanUrl);
        
        if (!deleteSuccess) {
          console.error('❌ Failed to delete print logo from storage');
          showAlert(
            'Delete Error',
            'Failed to remove print logo file from storage',
            'error'
          );
          return;
        }
        
        console.log('✅ Print logo file deleted from storage successfully');
      } catch (error) {
        console.error('❌ Error deleting print logo:', error);
        showAlert(
          'Delete Error',
          'Error removing print logo file',
          'error'
        );
        return;
      }
    }
    
    // Update form data to remove print logo URL
    setFormData(prev => ({
      ...prev,
      printLogoUrl: ''
    }));
    setHasChanges(true);
    
    console.log('✅ Print logo removed from form data');
    
    showAlert(
      'Print Logo Removed',
      'Print logo removed successfully',
      'success'
    );
  }, [formData.printLogoUrl, showAlert]);

  const sections = [
    { id: 'restaurant', label: t('restaurantInformation'), ref: restaurantRef },
    { id: 'owner', label: t('ownerInformation'), ref: ownerRef },
    { id: 'contact', label: t('contactInformation'), ref: contactRef },
    { id: 'preferences', label: t('preferences'), ref: preferencesRef },
    { id: 'printer', label: t('posPrinterTitle'), ref: printerRef },
    { id: 'roles', label: 'Role permissions', ref: rolesRef },
    { id: 'advanced', label: t('advancedOptions'), ref: advancedRef },
  ];

  const handleContentScroll = useCallback(() => {
    const container = contentScrollRef.current;
    if (!container || suppressScrollSpy) return;

    // Skip the first scroll event right after programmatic scroll finishes
    if (ignoreNextScrollRef.current) {
      ignoreNextScrollRef.current = false;
      return;
    }

    // If user is na samom dnu, uvek aktiviraj poslednju sekciju
    const bottomThreshold = container.scrollHeight - container.clientHeight - 10;
    if (container.scrollTop >= bottomThreshold) {
      if (activeSectionId !== 'advanced') {
        setActiveSectionId('advanced');
      }
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const anchorY = containerRect.top + 250; // reference line inside scroll area

    let bestId = sections[0]?.id;
    let bestDistance = Number.POSITIVE_INFINITY;

    sections.forEach((section) => {
      const el = section.ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const distance = Math.abs(rect.top - anchorY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestId = section.id;
      }
    });

    if (bestId && bestId !== activeSectionId) {
      setActiveSectionId(bestId);
    }
  }, [activeSectionId, sections, suppressScrollSpy]);

  if (!isOpen || !showModalContent) return null;

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    const container = contentScrollRef.current;
    const el = ref.current;
    if (!container || !el) return;

    const targetTop = el.offsetTop - 250; // align section near anchor line
    const maxScroll = container.scrollHeight - container.clientHeight;
    const clamped = Math.max(0, Math.min(maxScroll, targetTop));

    try {
      container.scrollTo({ top: clamped, behavior: 'smooth' });
    } catch {
      container.scrollTop = clamped;
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-sm backdrop-brightness-75 z-[12050] flex items-stretch justify-center p-0">
      <div className="bg-[#000814] w-full h-full max-w-none max-h-none rounded-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-xl font-light text-white tracking-wide">{t('accountSettingsTitle')}</h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left sidebar navigation */}
          <nav
            className={
              `w-64 px-4 py-6 space-y-1 overflow-y-auto statistics-scrollbar ` +
              (isLight ? 'bg-white' : 'bg-[#020817]')
            }
          >
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setActiveSectionId(section.id);
                  // Privremeno ugasi scroll spy dok traje programatsko skrolovanje
                  if (scrollSpyTimeoutRef.current) {
                    window.clearTimeout(scrollSpyTimeoutRef.current);
                  }
                  setSuppressScrollSpy(true);
                  scrollToSection(section.ref);
                  scrollSpyTimeoutRef.current = window.setTimeout(() => {
                    ignoreNextScrollRef.current = true;
                    setSuppressScrollSpy(false);
                    scrollSpyTimeoutRef.current = null;
                  }, 900);
                }}
                className={
                  `w-full text-left py-2 rounded-md text-sm transition-colors flex items-center ` +
                  (activeSectionId === section.id
                    ? (isLight
                        ? 'bg-gray-100 text-gray-900 border-l-2 border-blue-500 pl-2 shadow-sm'
                        : 'bg-[#111827] text-white border-l-2 border-blue-500 pl-2')
                    : (isLight
                        ? 'text-gray-700 hover:text-gray-900 hover:bg-white pl-3'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800 pl-3'))
                }
              >
                {section.label}
              </button>
            ))}
          </nav>

          {/* Right content area */}
          <div
            ref={contentScrollRef}
            className="flex-1 overflow-y-auto p-6 statistics-scrollbar"
            onScroll={handleContentScroll}
          >
            <div className="space-y-8">
              {/* Restaurant Information Section */}
              <div ref={restaurantRef}>
                <RestaurantInfoSection
                  formData={{
                    restaurantName: formData.restaurantName,
                    logo: formData.logo,
                    logoLightUrl: formData.logoLightUrl
                  }}
                  onInputChange={handleInputChange}
                  onLogoUpload={handleLogoUpload}
                  onRemoveLogo={handleRemoveLogo}
                  isUploading={isUploading}
                  onLightLogoUpload={handleLightLogoUpload}
                  onRemoveLightLogo={handleRemoveLightLogo}
                  isLightLogoUploading={isLightLogoUploading}
                />
              </div>

              {/* Owner Information Section */}
              <div ref={ownerRef}>
                <OwnerInfoSection
                  formData={{
                    name: formData.name,
                    email: formData.email
                  }}
                  passwordData={passwordData}
                  onInputChange={handleInputChange}
                  onPasswordChange={handlePasswordChange}
                  onChangePassword={handleChangePassword}
                />
              </div>

              {/* Contact Information Section */}
              <div ref={contactRef}>
                <ContactInfoSection
                  formData={{
                    phone: formData.phone,
                    address: formData.address,
                    timezone: formData.timezone
                  }}
                  onInputChange={handleInputChange}
                  timezones={timezones}
                />
              </div>

              {/* Preferences Section */}
              <div ref={preferencesRef}>
                <PreferencesSection
                  formData={{
                    language: formData.language,
                    autoArchive: formData.autoArchive
                  }}
                  onInputChange={handleInputChange}
                />
              </div>

              {/* POS Printer Settings */}
              <div ref={printerRef}>
                <PrinterSettingsSection
                  printLogoUrl={formData.printLogoUrl}
                  onPrintLogoUpload={handlePrintLogoUpload}
                  onRemovePrintLogo={handleRemovePrintLogo}
                  isPrintLogoUploading={isPrintLogoUploading}
                />
              </div>

              {/* Role PINs Section */}
              <div ref={rolesRef}>
                <RolePasswordsSection
                  roles={formData.roleConfig || []}
                  onRolesChange={(roles) => {
                    setFormData(prev => ({ ...prev, roleConfig: roles }));
                    setHasChanges(true);
                  }}
                  isAdmin={user?.role === 'admin'}
                  isOpen={isOpen}
                />
              </div>

              {/* Advanced Options Section */}
              <div ref={advancedRef}>
                <AdvancedOptionsSection
                  onExportData={handleExportData}
                  onDeactivateAccount={handleDeactivateAccount}
                  updateStatus={updateStatus}
                  updateVersion={updateVersion}
                  onCheckForUpdates={handleCheckForUpdates}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-4 py-2 text-sm rounded transition-colors font-medium text-blue-400 hover:bg-blue-500/10 disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {t('saveChanges')}
          </button>
        </div>
      </div>
      
      {/* Unsaved Changes Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showUnsavedChangesModal}
        onClose={() => setShowUnsavedChangesModal(false)}
        onConfirm={confirmDiscardChanges}
        title={t('discardChanges')}
        message={t('discardChangesMessage')}
        confirmText={t('discardChanges')}
        cancelText={t('keepEditing')}
        type="danger"
      />

      {/* Deactivate Account Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={confirmDeactivateAccount}
        title="Deactivate Account"
        message="Are you sure you want to deactivate your account? This action will permanently disable your account and cannot be undone. You will lose access to all your data and reservations."
        confirmText="Deactivate Account"
        cancelText="Keep Account Active"
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
    </div>
  );
});

export default AccountSettings; 