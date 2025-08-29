import React, { useState, useContext, useCallback, useMemo } from 'react';
import { UserContext } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { User } from '../../types/user';
import { saveToStorage, loadFromStorage } from '../../utils/storage';
import { storageService } from '../../services/storageService';
import { authService } from '../../services/authService';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';
import RestaurantInfoSection from './RestaurantInfoSection';
import OwnerInfoSection from './OwnerInfoSection';
import ContactInfoSection from './ContactInfoSection';
import PreferencesSection from './PreferencesSection';
import AdvancedOptionsSection from './AdvancedOptionsSection';
import PrinterSettingsSection from './PrinterSettingsSection';
import RolePasswordsSection from './RolePasswordsSection';

interface AccountSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = React.memo(({ isOpen, onClose }) => {
  const { user, setUser } = useContext(UserContext);
  const { t, setLanguage } = useLanguage();

  // Initialize form state with user data
  const [formData, setFormData] = useState({
    restaurantName: user?.restaurantName || '',
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    logo: user?.logo || '',
    printLogoUrl: user?.printLogoUrl || '', // Print logo URL
    timezone: user?.timezone || 'Europe/Belgrade',
    language: user?.language || 'eng',
    autoArchive: user?.autoArchive ?? true,
    adminPin: '',
    managerPin: '',
    waiterPin: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isPrintLogoUploading, setIsPrintLogoUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
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
        timezone: user?.timezone || 'Europe/Belgrade',
        language: user?.language || 'eng',
        autoArchive: user?.autoArchive ?? true
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
      
      // Update profile in Supabase database
      const result = await authService.updateProfile(user.id, {
        restaurant_name: formData.restaurantName,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        logo: cleanLogoUrl, // Save clean URL without timestamp
        print_logo_url: cleanPrintLogoUrl, // Save clean print logo URL
        timezone: formData.timezone,
        language: formData.language,
        auto_archive: formData.autoArchive,
        // These are optional and saved only if user set them; hashing handled inside section and stored in formData as hashes
        ...(formData as any).admin_pin_hash ? { admin_pin_hash: (formData as any).admin_pin_hash } : {},
        ...(formData as any).manager_pin_hash ? { manager_pin_hash: (formData as any).manager_pin_hash } : {},
        ...(formData as any).waiter_pin_hash ? { waiter_pin_hash: (formData as any).waiter_pin_hash } : {}
      });

      if (result.success) {
        // Force logo refresh by adding version parameter for immediate UI update
        const logoWithVersion = cleanLogoUrl ? `${cleanLogoUrl}?v=${Date.now()}` : '';
        const printLogoWithVersion = cleanPrintLogoUrl ? `${cleanPrintLogoUrl}?v=${Date.now()}` : '';
        
        const updatedUser: User = {
          ...user,
          ...formData,
          logo: logoWithVersion, // Use versioned URL for immediate refresh, but save clean URL to DB
          printLogoUrl: printLogoWithVersion, // Use versioned print logo URL for immediate refresh
          hasAdminPin: Boolean((formData as any).admin_pin_hash) || user.hasAdminPin,
          hasManagerPin: Boolean((formData as any).manager_pin_hash) || user.hasManagerPin,
          hasWaiterPin: Boolean((formData as any).waiter_pin_hash) || user.hasWaiterPin,
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
          users[userIndex] = { ...users[userIndex], ...formData, logo: cleanLogoUrl, printLogoUrl: cleanPrintLogoUrl };
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
      timezone: user?.timezone || 'Europe/Belgrade',
      language: user?.language || 'eng',
      autoArchive: user?.autoArchive ?? true
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

  if (!isOpen || !showModalContent) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm backdrop-brightness-75 z-[200] flex items-center justify-center p-4">
      <div className="bg-[#000814] rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
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
        <div className="flex-1 overflow-y-auto p-6 statistics-scrollbar">
          <div className="space-y-6">
            {/* Restaurant Information Section */}
            <RestaurantInfoSection
              formData={{
                restaurantName: formData.restaurantName,
                logo: formData.logo,
                printLogoUrl: formData.printLogoUrl
              }}
              onInputChange={handleInputChange}
              onLogoUpload={handleLogoUpload}
              onRemoveLogo={handleRemoveLogo}
              onPrintLogoUpload={handlePrintLogoUpload}
              onRemovePrintLogo={handleRemovePrintLogo}
              isUploading={isUploading}
              isPrintLogoUploading={isPrintLogoUploading}
            />

            {/* Owner Information Section */}
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

            {/* Contact Information Section */}
            <ContactInfoSection
              formData={{
                phone: formData.phone,
                address: formData.address,
                timezone: formData.timezone
              }}
              onInputChange={handleInputChange}
              timezones={timezones}
            />

            {/* Preferences Section */}
            <PreferencesSection
              formData={{
                language: formData.language,
                autoArchive: formData.autoArchive
              }}
              onInputChange={handleInputChange}
            />

            {/* POS Printer Settings */}
            <PrinterSettingsSection />

            {/* Role PINs Section */}
            <RolePasswordsSection
              onSetHashes={(hashes) => {
                setFormData(prev => ({ ...prev, ...(hashes as any) }));
                setHasChanges(true);
              }}
              hasAdminPin={!!user?.hasAdminPin}
              hasManagerPin={!!user?.hasManagerPin}
              hasWaiterPin={!!user?.hasWaiterPin}
              isAdmin={user?.role === 'admin'}
            />

            {/* Advanced Options Section */}
            <AdvancedOptionsSection
              onExportData={handleExportData}
              onDeactivateAccount={handleDeactivateAccount}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-4 py-2 text-sm rounded transition-colors font-medium ${
              hasChanges
                ? 'text-blue-400 hover:bg-blue-500/10'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
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